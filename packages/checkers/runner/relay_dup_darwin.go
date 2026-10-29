package main

import "syscall"

// Darwin host witness: the same atomic replacement, selected by Go's OS suffix.
func dupDescriptor(old, next int) error {
	return syscall.Dup2(old, next)
}
