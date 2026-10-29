"""Offline shutdown controls. Launchd, process, HTTP and bucket ports are scripted.

Only scratch log files are real; these tests establish no daemon shutdown or
runtime durability. The physical preserve and journal witnesses run separately.
"""
from pathlib import Path
import contextlib
import io
import json
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import call, patch

from kit import LABELS, Refusal
from shutdown import MacPorts, ProcessIdentity, log_completion, log_cursor, main, stop


class ScriptedPorts:
    def __init__(self, record, close=True, replacement=False, unavailable=False, draining=False, prepared=True):
        self.record = record
        self.close = close
        self.replacement = replacement
        self.unavailable = unavailable
        self.draining = draining
        self.prepared = prepared
        self.started = False
        self.time = 0
        self.calls = []
        self.absent = set()
        self.original = ProcessIdentity(123, record["uid"], 1000, 123456)

    def closed(self):
        return self.started and self.close and self.time >= 0.5

    def job(self, label):
        if label in self.absent:
            return "absent", None
        if label == LABELS["celld"]:
            if self.started and self.unavailable:
                return "unavailable", None
            if self.closed():
                return "loaded", 456 if self.replacement else None
            return "loaded", self.original.pid
        return "loaded", 789

    def identity(self, pid):
        assert pid == self.original.pid
        return None if self.closed() else self.original

    def disable(self, label):
        self.calls.append(("disable", label))

    def preserve(self, url):
        self.calls.append(("preserve", url))
        self.started = True
        if self.prepared:
            with Path(self.record["logs"]["celld"]["stdout"]).open("ab") as out:
                out.write(b"TEST event=clean_reload_prepared prepared local cells\n")
        return 200

    def node_ready(self, prefix, node):
        self.calls.append(("node", node))
        assert self.closed()
        return not self.draining

    def bootout(self, label, timeout, uid, known=None):
        assert self.closed()
        assert uid == self.record["uid"] and 1 <= timeout <= 300
        assert known == self.original if label == LABELS["celld"] else known is None
        if label == LABELS["seaweedfs"]:
            assert LABELS["celld"] in self.absent and LABELS["caddy"] in self.absent
        self.calls.append(("bootout", label))
        self.absent.add(label)
        return {"supervisor": "absent", "process": "closed"}

    def now(self):
        return self.time

    def sleep(self, seconds):
        self.time += seconds


class ShutdownControls(unittest.TestCase):
    def test_scripted_disabled_readback_accepts_both_formats_but_refuses_ambiguity(self):
        # Actual-format and legacy output are scripted; no launchd call runs.
        label = LABELS["celld"]
        entry = b'"' + label.encode() + b'" => '
        for output, status, accepted in (
                (b"disabled services = {\n\t" + entry + b"disabled\n}\n", 0, True),
                (entry + b"true\n", 0, True),
                (entry + b"enabled\n", 0, False),
                (entry + b"false\n", 0, False),
                (b'"another.service" => disabled\n', 0, False),
                (entry + b"true\n" + entry + b"true\n", 0, False),
                (entry + b"disabled\n" + entry + b"false\n", 0, False),
                (entry.replace(b".", b"x") + b"disabled\n", 0, False),
                (entry + b"disabled trailing-text\n", 0, False),
                (entry + b"disabled\n", 1, False)):
            with self.subTest(output=output, status=status), patch.object(MacPorts, "command", side_effect=[
                    SimpleNamespace(returncode=0), SimpleNamespace(returncode=status, stdout=output)]) as command:
                if accepted:
                    MacPorts().disable(label)
                else:
                    with self.assertRaises(Refusal):
                        MacPorts().disable(label)
                self.assertEqual(command.call_args_list, [call("disable", "system/" + label), call("print-disabled", "system")])

    def record(self, directory):
        prefix = Path(directory)
        (prefix / "logs").mkdir()
        logs = {stream: str(prefix / "logs" / ("celld." + stream + ".log")) for stream in ("stdout", "stderr")}
        for path in logs.values():
            Path(path).write_bytes(b"TEST earlier runtime line\n")
        return {"prefix": str(prefix), "labels": LABELS, "uid": 501, "node": "TEST-node",
                "operatorUrl": "http://127.0.0.1:28901", "internalListen": "127.0.0.1:28901", "logs": {"celld": logs}}

    def test_scripted_preserve_then_exact_process_closure_then_store_last(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as directory:
            record = self.record(directory)
            ports = ScriptedPorts(record)
            result = stop(record, ports, 2)
            self.assertEqual(result["preservePreparation"], "complete")
            self.assertEqual(result["celldProcess"], "closed")
            self.assertTrue(result["storeStopped"])
            self.assertFalse(result["recoveryVerified"])
            self.assertIsNone(result["processExitCode"])
            self.assertEqual(result["processIdentity"], {"pid": 123, "startSeconds": 1000, "startMicroseconds": 123456})
            self.assertEqual(ports.calls, [
                ("disable", LABELS["celld"]), ("preserve", record["operatorUrl"]), ("node", "TEST-node"),
                ("bootout", LABELS["celld"]), ("disable", LABELS["caddy"]), ("bootout", LABELS["caddy"]),
                ("disable", LABELS["seaweedfs"]), ("bootout", LABELS["seaweedfs"]),
            ])

    def test_scripted_live_process_unavailable_supervisor_or_replacement_keeps_store(self):
        for options in ({"close": False}, {"unavailable": True}, {"replacement": True}):
            with self.subTest(options=options), tempfile.TemporaryDirectory(dir="/private/tmp") as directory:
                record = self.record(directory)
                ports = ScriptedPorts(record, **options)
                result = stop(record, ports, 1)
                self.assertEqual(result["preservePreparation"], "unknown")
                self.assertFalse(result["storeStopped"])
                self.assertTrue(result["dataRetained"])
                self.assertFalse(any(action == "bootout" for action, _ in ports.calls))

    def test_scripted_draining_record_is_unknown_even_after_new_signal_and_closure(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as directory:
            record = self.record(directory)
            ports = ScriptedPorts(record, draining=True)
            output = io.StringIO()
            # These CLI authority and installation inputs are stand-ins too.
            with patch("shutdown.sys.platform", "darwin"), patch("shutdown.os.geteuid", return_value=0), \
                    patch("shutdown.read_installation", return_value=record), patch("shutdown.MacPorts", return_value=ports), \
                    patch("shutdown.sys.argv", ["down", "--prefix", directory, "--timeout", "2"]), contextlib.redirect_stdout(output):
                self.assertEqual(main(), 2)
            result = json.loads(output.getvalue())
            self.assertTrue(result["freshPrepared"])
            self.assertFalse(result["nodeNotDraining"])
            self.assertEqual(result["preservePreparation"], "unknown")
            self.assertTrue(result["storeStopped"])
            self.assertEqual(ports.calls[-1], ("bootout", LABELS["seaweedfs"]))
            self.assertTrue(Path(directory).exists())

    def test_scripted_label_absence_does_not_complete_while_its_process_remains_alive(self):
        class NamespaceGoneProcessLive(MacPorts):
            def __init__(self, changed_uid):
                self.removed = False
                self.time = 0
                self.changed_uid = changed_uid

            def job(self, label):
                return ("absent", None) if self.removed else ("loaded", 789)

            def identity(self, pid):
                uid = 502 if self.removed and self.changed_uid else 501
                return ProcessIdentity(789, uid, 1000, 654321)

            def command(self, *args):
                self.removed = True

            def now(self):
                return self.time

            def sleep(self, seconds):
                self.time += seconds

        # The real bootout procedure runs against these supervisor/process stand-ins.
        for changed_uid in (False, True):
            with self.subTest(changed_uid=changed_uid):
                ports = NamespaceGoneProcessLive(changed_uid)
                with self.assertRaisesRegex(Refusal, "process closure unavailable"):
                    ports.bootout(LABELS["seaweedfs"], 1, 501)
                self.assertTrue(ports.removed)
                self.assertEqual(ports.time, 1)

    def test_real_log_cursor_rejects_old_partial_rotated_or_adverse_completion(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as directory:
            path = Path(directory) / "runtime.log"
            path.write_bytes(b"TEST event=clean_reload_prepared old invocation\n")
            cursor = log_cursor(path)
            self.assertFalse(log_completion([cursor]))
            with path.open("ab") as out:
                out.write(b"TEST event=clean_reload_prepared current invocation\n")
            self.assertTrue(log_completion([cursor]))
            with path.open("ab") as out:
                out.write(b"TEST event=clean_reload_abandoned current invocation\n")
            self.assertFalse(log_completion([cursor]))
            path.rename(path.with_suffix(".old"))
            path.write_bytes(b"TEST event=clean_reload_prepared replaced file\n")
            with self.assertRaises(Refusal):
                log_completion([cursor])
            path.write_bytes(b"TEST event=")
            partial = log_cursor(path)
            with path.open("ab") as out:
                out.write(b"clean_reload_prepared previous line\n")
            self.assertFalse(log_completion([partial]))


if __name__ == "__main__":
    unittest.main()
