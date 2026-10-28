// TEST helper for the explicit J3 witness image; never part of the relay.
package main

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"time"
)

func fail() { fmt.Println("bad"); os.Exit(1) }
func main() {
	if len(os.Args) < 2 {
		fail()
	}
	args := os.Args[2:]
	switch os.Args[1] {
	case "custody":
		if len(args) != 1 || os.Getenv("DAP_HOME") != "" {
			fail()
		}
		if _, err := os.Lstat(args[0]); !os.IsNotExist(err) {
			fail()
		}
		for _, path := range []string{"/var/run/docker.sock", "/run/containerd/containerd.sock"} {
			if _, err := os.Stat(path); err == nil {
				fail()
			}
		}
	case "put-marker":
		if err := os.WriteFile("/tmp/j3-private-marker", []byte("TEST predecessor job\n"), 0600); err != nil {
			fail()
		}
	case "no-marker":
		path := "/tmp/j3-private-marker"
		if len(args) == 1 {
			path = args[0]
		} else if len(args) != 0 {
			fail()
		}
		if _, err := os.ReadFile(path); !os.IsNotExist(err) {
			fail()
		}
	case "canary":
		if len(args) != 1 {
			fail()
		}
		listener, err := net.Listen("tcp4", args[0])
		if err != nil {
			fail()
		}
		defer listener.Close()
		timer := time.AfterFunc(10*time.Minute, func() { listener.Close() })
		defer timer.Stop()
		for {
			conn, err := listener.Accept()
			if err != nil {
				fail()
			}
			conn.Close()
		}
	case "dial":
		if len(args) != 1 {
			fail()
		}
		connected := false
		for i := 0; i < 30; i++ {
			conn, err := net.DialTimeout("tcp4", args[0], 200*time.Millisecond)
			if err == nil {
				conn.Close()
				connected = true
				break
			}
			time.Sleep(100 * time.Millisecond)
		}
		if !connected {
			fail()
		}
	case "network":
		if len(args) != 2 {
			fail()
		}
		client := &http.Client{Timeout: 3 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }}
		response, err := client.Get(args[0] + "/info/refs?service=git-upload-pack")
		if err != nil {
			fail()
		}
		body, err := io.ReadAll(io.LimitReader(response.Body, 65537))
		response.Body.Close()
		if err != nil || response.StatusCode != 200 || len(body) > 65536 || !strings.Contains(string(body), "git-upload-pack") {
			fail()
		}
		refused, err := client.Post(args[0]+"/git-receive-pack", "application/x-git-receive-pack-request", strings.NewReader("0000"))
		if err != nil {
			fail()
		}
		refused.Body.Close()
		if refused.StatusCode != 403 {
			fail()
		}
		conn, err := net.DialTimeout("tcp4", args[1], 1*time.Second)
		if err == nil {
			conn.Close()
			fail()
		}
	default:
		fail()
	}
	fmt.Println("ok")
}
