package main

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"testing"
)

// This subprocess enters the descriptor/exec helper below its production UID
// gate. The physical witness owns UID, namespaces and container isolation.
func TestStepExecProcess(t *testing.T) {
	if os.Getenv("ARTROOM_TEST_STEP_EXEC") != "1" {
		t.Skip("subprocess entry only")
	}
	for index, arg := range os.Args {
		if arg == "--" {
			os.Exit(runStep(os.Args[index+1:]))
		}
	}
	os.Exit(125)
}

func TestStepStreamsAndSetup(t *testing.T) {
	call := func(argv ...string) (int, string, string, *os.ProcessState) {
		child := exec.Command(os.Args[0], append([]string{"-test.run=^TestStepExecProcess$", "--"}, argv...)...)
		child.Env = append(os.Environ(), "ARTROOM_TEST_STEP_EXEC=1")
		var output, diagnostic bytes.Buffer
		child.Stdout, child.Stderr = &output, &diagnostic
		if err := child.Run(); err != nil {
			if _, exited := err.(*exec.ExitError); !exited {
				t.Fatal(err)
			}
		}
		return child.ProcessState.ExitCode(), output.String(), diagnostic.String(), child.ProcessState
	}
	literal := `literal ; $(not-a-command) ' " \`
	status, output, diagnostic, _ := call("/bin/sh", "-c", `printf 'first\n'; printf '%s\n' "$1" >&2; exit 17`, "TEST-step", literal)
	if status != 17 || output != "first\n"+literal+"\n" || diagnostic != "" {
		t.Fatalf("job streams/status differ: status=%d output=%q diagnostic=%q", status, output, diagnostic)
	}
	directory := t.TempDir()
	loaderFailure := filepath.Join(directory, "missing-loader")
	if err := os.WriteFile(loaderFailure, []byte("#!"+filepath.Join(directory, "missing-interpreter")+"\n"), 0700); err != nil {
		t.Fatal(err)
	}
	for _, program := range []string{filepath.Join(directory, "missing-executable"), loaderFailure} {
		status, output, diagnostic, _ = call(program)
		if status != 125 || output != "" || diagnostic != "artroom checker step setup failed\n" {
			t.Fatalf("exec failure became job output: status=%d output=%q diagnostic=%q", status, output, diagnostic)
		}
	}
	status, output, diagnostic, _ = call("/bin/sh", "-c", `printf 'bad\n' >&2; exit 255`)
	if status != 255 || output != "bad\n" || diagnostic != "" {
		t.Fatalf("reserved status was rewritten: status=%d output=%q diagnostic=%q", status, output, diagnostic)
	}
	_, _, diagnostic, state := call("/bin/sh", "-c", `kill -KILL $$`)
	wait, ok := state.Sys().(syscall.WaitStatus)
	if !ok || !wait.Signaled() || wait.Signal() != syscall.SIGKILL || diagnostic != "" {
		t.Fatalf("job signal became a helper exit: state=%v diagnostic=%q", state, diagnostic)
	}
}
