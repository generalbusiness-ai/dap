#!/usr/bin/env python3
"""Prepare a same-node restart, then stop the store after celld closes."""
import argparse
import ctypes
from dataclasses import dataclass, field
import errno
import http.client
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import time

from kit import LABELS, Refusal, absolute, aws_request, job_state, no_links, read_installation, require

MAX_LOG_SEGMENT = 1024 * 1024
UNAVAILABLE = (Refusal, OSError, ValueError, subprocess.SubprocessError, http.client.HTTPException)


@dataclass(frozen=True)
class ProcessIdentity:
    pid: int
    # UID authorizes the initial owner; a UID change does not end a lifetime.
    uid: int = field(compare=False)
    seconds: int
    microseconds: int


class BsdInfo(ctypes.Structure):
    # macOS sys/proc_info.h, PROC_PIDTBSDINFO: no argv or environment read.
    _fields_ = [(name, ctypes.c_uint32) for name in (
        "flags", "status", "xstatus", "pid", "ppid", "uid", "gid", "ruid", "rgid", "svuid", "svgid", "reserved")]
    _fields_ += [("comm", ctypes.c_char * 16), ("name", ctypes.c_char * 32)]
    _fields_ += [(name, ctypes.c_uint32) for name in ("nfiles", "pgid", "pjobc", "tdev", "tpgid")]
    _fields_ += [("nice", ctypes.c_int32), ("seconds", ctypes.c_uint64), ("microseconds", ctypes.c_uint64)]


@dataclass(frozen=True)
class LogCursor:
    path: Path
    device: int
    inode: int
    offset: int
    boundary: bool


def log_file(path):
    no_links(path)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        require(stat.S_ISREG(os.fstat(fd).st_mode), "log is not regular")
    except BaseException:
        os.close(fd)
        raise
    return fd


def log_cursor(path):
    fd = log_file(path)
    try:
        info = os.fstat(fd)
        if info.st_size:
            os.lseek(fd, info.st_size - 1, os.SEEK_SET)
        boundary = not info.st_size or os.read(fd, 1) == b"\n"
        return LogCursor(path, info.st_dev, info.st_ino, info.st_size, boundary)
    finally:
        os.close(fd)


def log_completion(cursors):
    prepared = False
    adverse = False
    for cursor in cursors:
        fd = log_file(cursor.path)
        try:
            info = os.fstat(fd)
            require((info.st_dev, info.st_ino) == (cursor.device, cursor.inode), "log identity changed")
            length = info.st_size - cursor.offset
            require(0 <= length <= MAX_LOG_SEGMENT, "log segment unavailable")
            os.lseek(fd, cursor.offset, os.SEEK_SET)
            segment = os.read(fd, length)
            require(len(segment) == length, "log segment changed")
            # A partial old line cannot become evidence for this invocation.
            if not cursor.boundary:
                segment = segment.partition(b"\n")[2]
            lines = segment.splitlines(keepends=True)
            for line in lines:
                if not line.endswith(b"\n"):
                    continue
                if re.search(rb'\bevent\s*=\s*"?clean_reload_prepared"?\b', line):
                    prepared = True
                if any(marker in line for marker in (
                    b"clean_reload_abandoned", b"shutdown_handoff_stalled", b"shutdown_handoff_not_started",
                    b"celld preserve drain reached", b"celld durability quiesce exceeded",
                    b"celld local durability shutdown exceeded")):
                    adverse = True
        finally:
            os.close(fd)
    return prepared and not adverse


def validate_record(record):
    prefix = absolute(record["prefix"])
    require(record["labels"] == LABELS and type(record["uid"]) is int and record["uid"] > 0, "installation identity differs")
    require(isinstance(record["node"], str) and re.fullmatch(r"[A-Za-z0-9_.-]{1,128}", record["node"]) and record["node"] not in (".", ".."), "node differs")
    require(record["operatorUrl"] == "http://127.0.0.1:28901" and record["internalListen"] == "127.0.0.1:28901", "operator address differs")
    expected = {stream: str(prefix / "logs" / ("celld." + stream + ".log")) for stream in ("stdout", "stderr")}
    require(record["logs"]["celld"] == expected, "log paths differ")
    return prefix


class MacPorts:
    """The fixed launchd labels and loopback operator of one installed kit."""
    def command(self, *args):
        process = subprocess.run(["/bin/launchctl", *args], stdin=subprocess.DEVNULL,
                                 capture_output=True, timeout=90, check=False,
                                 env={"PATH": "/usr/bin:/bin", "LANG": "C"})
        require(len(process.stdout) <= 65536 and len(process.stderr) <= 65536, "supervisor output exceeds bound")
        return process

    def job(self, label):
        state = job_state(label)
        if state != "loaded":
            return state, None
        result = self.command("print", "system/" + label)
        require(result.returncode == 0, "supervisor became unavailable")
        pids = re.findall(rb"(?m)^\s*pid = ([1-9][0-9]*)\s*$", result.stdout)
        require(len(pids) <= 1, "ambiguous supervisor PID")
        return "loaded", int(pids[0]) if pids else None

    def identity(self, pid):
        library = ctypes.CDLL("/usr/lib/libproc.dylib", use_errno=True)
        library.proc_pidinfo.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_uint64, ctypes.c_void_p, ctypes.c_int]
        library.proc_pidinfo.restype = ctypes.c_int
        info = BsdInfo()
        count = library.proc_pidinfo(pid, 3, 0, ctypes.byref(info), ctypes.sizeof(info))
        if count == 0 and ctypes.get_errno() == errno.ESRCH:
            return None
        require(count == ctypes.sizeof(info) and info.pid == pid and info.seconds > 0 and info.microseconds < 1000000, "process identity unavailable")
        return ProcessIdentity(pid, info.uid, info.seconds, info.microseconds)

    def disable(self, label):
        require(self.command("disable", "system/" + label).returncode == 0, "cannot disable supervisor")
        result = self.command("print-disabled", "system")
        entries = re.findall(rb'(?m)^[ \t]*"' + re.escape(label.encode()) + rb'"([^\r\n]*)\r?$', result.stdout)
        require(result.returncode == 0 and len(entries) == 1
                and re.fullmatch(rb'[ \t]*=>[ \t]*(?:true|disabled)[ \t]*', entries[0]) is not None,
                "disabled state unavailable")

    def preserve(self, url):
        require(url == "http://127.0.0.1:28901", "operator address differs")
        connection = http.client.HTTPConnection("127.0.0.1", 28901, timeout=5)
        try:
            connection.request("POST", "/shutdown?handoff=preserve", body=b"", headers={"Connection": "close"})
            response = connection.getresponse()
            require(len(response.read(4097)) <= 4096, "operator response exceeds bound")
            return response.status
        finally:
            connection.close()

    def node_ready(self, prefix, node):
        status, body = aws_request(prefix, "GET", "nodes/" + node + ".json")
        require(status == 200, "node record unavailable")
        value = json.loads(body)
        return isinstance(value, dict) and value.get("draining") is False

    def bootout(self, label, timeout, uid, known=None):
        state, pid = self.job(label)
        require(state in ("loaded", "absent"), "supervisor unavailable")
        original = self.identity(pid) if pid is not None else known
        require(original is not None and original.uid == uid, "service process identity unavailable")
        if pid is None:
            require(self.identity(original.pid) != original, "service process remains live")
        else:
            require(known is None or original == known, "service process identity differs")
        if state == "loaded":
            self.command("bootout", "system/" + label)
        deadline = self.now() + timeout
        while True:
            state, current = self.job(label)
            require(state != "unavailable", "supervisor unavailable")
            identity = self.identity(original.pid)
            require(current is None or current == original.pid and identity == original, "replacement service process appeared")
            # Removing the label is not proof that its old process has exited.
            if state == "absent" and identity != original:
                return {"supervisor": "absent", "process": "closed", "pid": original.pid,
                        "startSeconds": original.seconds, "startMicroseconds": original.microseconds}
            require(self.now() < deadline, "service process closure unavailable")
            self.sleep(min(0.25, deadline - self.now()))

    now = staticmethod(time.monotonic)
    sleep = staticmethod(time.sleep)


def stop(record, ports, timeout):
    """Observe closure; never waitpid, signal, delete data, or infer an exit code."""
    prefix = validate_record(record)
    require(type(timeout) is int and 1 <= timeout <= 300, "timeout must be 1 to 300 seconds")
    result = {"preservePreparation": "unknown", "celldProcess": "unknown", "storeStopped": False,
              "dataRetained": True, "recoveryVerified": False, "processExitCode": None}
    label = record["labels"]["celld"]
    try:
        state, pid = ports.job(label)
        require(state == "loaded" and pid is not None, "running celld unavailable")
        original = ports.identity(pid)
        require(original is not None and original.uid == record["uid"], "process owner differs")
        cursors = [log_cursor(Path(record["logs"]["celld"][stream])) for stream in ("stdout", "stderr")]
        ports.disable(label)
        require(ports.job(label) == ("loaded", pid) and ports.identity(pid) == original, "process changed before preserve")
        result["processIdentity"] = {"pid": pid, "startSeconds": original.seconds, "startMicroseconds": original.microseconds}
        try:
            result["operatorStatus"] = ports.preserve(record["operatorUrl"])
        except UNAVAILABLE:
            # An ambiguous reply can still have initiated this same shutdown.
            result["operatorStatus"] = None
        deadline = ports.now() + timeout
        while True:
            identity = ports.identity(pid)
            state, current = ports.job(label)
            require(state != "unavailable", "supervisor unavailable")
            if identity != original:
                require(current is None, "replacement process appeared")
                break
            require(current in (None, pid), "replacement process appeared")
            require(ports.now() < deadline, "process remains live")
            ports.sleep(min(0.25, deadline - ports.now()))
        result["celldProcess"] = "closed"
    except UNAVAILABLE:
        result["reason"] = "celld-closure-unproved-store-kept"
        return result

    try:
        result["freshPrepared"] = log_completion(cursors)
    except UNAVAILABLE:
        result["freshPrepared"] = False
    try:
        result["nodeNotDraining"] = ports.node_ready(prefix, record["node"])
    except UNAVAILABLE:
        result["nodeNotDraining"] = False
    completed = result["freshPrepared"] and result["nodeNotDraining"] and result["operatorStatus"] in (None, 200)
    result["preservePreparation"] = "complete" if completed else "unknown"
    try:
        result["closures"] = {}
        result["closures"]["celld"] = ports.bootout(label, timeout, record["uid"], original)
        ports.disable(record["labels"]["caddy"])
        result["closures"]["caddy"] = ports.bootout(record["labels"]["caddy"], timeout, record["uid"])
        # Recheck both the original identity and the label just before the store stop.
        require(ports.identity(pid) != original and ports.job(label) == ("absent", None), "celld closure changed")
        ports.disable(record["labels"]["seaweedfs"])
        result["closures"]["seaweedfs"] = ports.bootout(record["labels"]["seaweedfs"], timeout, record["uid"])
        result["storeStopped"] = True
    except UNAVAILABLE:
        result["reason"] = "supervisor-stop-unproved"
        return result
    result["reason"] = "prepared-recovery-not-yet-verified" if completed else "preserve-terminal-unproved-data-kept"
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--timeout", type=int, default=90, help="celld closure wait, 1 to 300 seconds (default 90)")
    args = parser.parse_args()
    try:
        require(sys.platform == "darwin" and os.geteuid() == 0, "down requires sudo on macOS")
        record = read_installation(absolute(args.prefix))
        result = stop(record, MacPorts(), args.timeout)
        print(json.dumps(result, sort_keys=True))
        return 0 if result["preservePreparation"] == "complete" and result["storeStopped"] else 2
    except (KeyError, TypeError, *UNAVAILABLE):
        print("Host shutdown unavailable; retain the installation, data and node name.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
