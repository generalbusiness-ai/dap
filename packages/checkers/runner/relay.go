// The immutable PID1 relay has no credential or execution/report RPC. Only its
// own stdio reaches the trusted host. Job processes use a different UID.
package main

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

const frameBytes = 512 * 1024
const requestBytes = 256 * 1024

// A separately exec'd static process, never a PID1/stdin RPC. Dynamic loader
// variables must be absent before the first trusted Git/id/mkdir instruction.
func trustedExec() {
	if os.Geteuid() != 65532 || len(os.Args) < 5 {
		os.Exit(2)
	}
	count, err := strconv.Atoi(os.Args[2])
	if err != nil || count < 1 || count > 16 || len(os.Args) < count+5 || os.Args[count+3] != "--" {
		os.Exit(2)
	}
	program := os.Args[count+4]
	if program != "/usr/bin/git" && program != "/usr/bin/id" && program != "/bin/mkdir" {
		os.Exit(2)
	}
	allowed := map[string]string{
		"PATH":                "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
		"GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null",
		"GIT_ATTR_NOSYSTEM": "1", "GIT_NO_REPLACE_OBJECTS": "1",
		"GIT_NO_LAZY_FETCH": "1", "GIT_TERMINAL_PROMPT": "0",
		"GIT_ASKPASS": "/bin/false", "HOME": "/nonexistent", "LC_ALL": "C",
	}
	seen := make(map[string]bool)
	env := os.Args[3 : count+3]
	for _, entry := range env {
		name, value, found := strings.Cut(entry, "=")
		want, ok := allowed[name]
		if !found || !ok || value != want || seen[name] {
			os.Exit(2)
		}
		seen[name] = true
	}
	if !seen["PATH"] {
		os.Exit(2)
	}
	if syscall.Exec(program, os.Args[count+4:], env) != nil {
		os.Exit(2)
	}
}

type frame struct {
	Kind    string            `json:"kind"`
	ID      uint64            `json:"id,omitempty"`
	Method  string            `json:"method,omitempty"`
	Target  string            `json:"target,omitempty"`
	Headers map[string]string `json:"headers,omitempty"`
	Body    string            `json:"body,omitempty"`
	Status  int               `json:"status,omitempty"`
	Data    string            `json:"data,omitempty"`
	Env     []string          `json:"env,omitempty"`
	Metrics map[string]string `json:"metrics,omitempty"`
}

func main() {
	if len(os.Args) > 1 && os.Args[1] == "exec" {
		trustedExec()
		return
	}
	if len(os.Args) != 2 || os.Geteuid() != 65533 {
		os.Exit(2)
	}
	seconds, err := strconv.Atoi(os.Args[1])
	if err != nil || seconds < 1 || seconds > 86520 {
		os.Exit(2)
	}
	// This independent ceiling also ends orphaned execs after supervisor loss.
	go func() { time.Sleep(time.Duration(seconds) * time.Second); os.Exit(124) }()
	listener, err := net.Listen("tcp4", "127.0.0.1:18080")
	if err != nil {
		os.Exit(2)
	}
	var sendMu, requestMu sync.Mutex
	var active atomic.Uint64
	var serial uint64
	replies := make(chan frame, 1)
	send := func(value frame) {
		sendMu.Lock()
		defer sendMu.Unlock()
		if json.NewEncoder(os.Stdout).Encode(value) != nil {
			os.Exit(2)
		}
	}
	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		scanner.Buffer(make([]byte, 4096), frameBytes)
		for scanner.Scan() {
			var value frame
			decoder := json.NewDecoder(bytes.NewReader(scanner.Bytes()))
			decoder.DisallowUnknownFields()
			if decoder.Decode(&value) != nil || value.ID == 0 {
				os.Exit(2)
			}
			if value.Kind == "state" {
				metrics := make(map[string]string)
				for _, name := range []string{"memory.max", "pids.max", "cpu.max", "memory.events"} {
					file, err := os.Open("/sys/fs/cgroup/" + name)
					if err != nil {
						os.Exit(2)
					}
					data, err := io.ReadAll(io.LimitReader(file, 4097))
					file.Close()
					if err != nil || len(data) > 4096 {
						os.Exit(2)
					}
					metrics[name] = string(data)
				}
				send(frame{Kind: "state", ID: value.ID, Metrics: metrics})
				continue
			}
			if value.ID != active.Load() || (value.Kind != "head" && value.Kind != "chunk" && value.Kind != "end") {
				os.Exit(2)
			}
			replies <- value
		}
		// EOF is not a job result. Exiting PID1 ends this container's processes.
		os.Exit(2)
	}()
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestMu.Lock()
		defer requestMu.Unlock()
		if len(r.RequestURI) > 8192 || (r.Method != "GET" && r.Method != "POST") {
			http.Error(w, "request refused", 403)
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, requestBytes+1))
		if err != nil || len(body) > requestBytes {
			http.Error(w, "request refused", 413)
			return
		}
		headers := make(map[string]string)
		for _, name := range []string{"Content-Type", "Accept", "Git-Protocol"} {
			if value := r.Header.Get(name); value != "" {
				headers[name] = value
			}
		}
		serial++
		id := serial
		active.Store(id)
		defer active.Store(0)
		send(frame{Kind: "request", ID: id, Method: r.Method, Target: r.RequestURI, Headers: headers, Body: base64.StdEncoding.EncodeToString(body)})
		head := false
		for {
			value := <-replies
			if value.ID != id {
				os.Exit(2)
			}
			switch value.Kind {
			case "head":
				if head || value.Status < 100 || value.Status > 599 {
					os.Exit(2)
				}
				head = true
				for name, v := range value.Headers {
					w.Header().Set(name, v)
				}
				w.WriteHeader(value.Status)
			case "chunk":
				if !head || len(value.Data) > 48*1024 {
					os.Exit(2)
				}
				data, err := base64.StdEncoding.DecodeString(value.Data)
				if err != nil || len(data) > 32*1024 {
					os.Exit(2)
				}
				// An abandoned reader is drained only within the independent ceiling.
				_, _ = w.Write(data)
			case "end":
				if !head {
					os.Exit(2)
				}
				return
			}
		}
	})
	server := &http.Server{Handler: handler, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 5 * time.Second, MaxHeaderBytes: 16 * 1024}
	send(frame{Kind: "ready", Env: os.Environ()})
	if server.Serve(listener) != nil {
		os.Exit(2)
	}
}
