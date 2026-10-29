package main

import "syscall"

// Linux Runner: atomically replace a distinct descriptor and keep it open on exec.
func dupDescriptor(old, next int) error {
	return syscall.Dup3(old, next, 0)
}
