"""Scratch-only installer boundaries. No sudo, launchd, service, or network calls."""
import io
import json
import os
from pathlib import Path
import plistlib
import pwd
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import kit
from service import fsync_enabled


class InstallerSafety(unittest.TestCase):
    def config(self, prefix):
        return {"user": pwd.getpwuid(os.getuid()).pw_name, "prefix": str(prefix),
                "celld": "/TEST/bin/celld", "weed": "/TEST/bin/weed", "caddy": "/TEST/bin/caddy",
                "node": "TEST-mac", "volumeMax": 8, "hosts": ["test.local", "127.0.0.1", "::1"],
                "certificate": '/TEST/tls/quoted " @PRIVATE_KEY@.pem', "privateKey": "/TEST/tls/key.pem"}

    def test_render_keeps_user_and_path_as_data_and_preserves_service_bounds(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
            prefix = Path(scratch) / 'TEST space & " @USER@ $(touch NEVER)'
            config, user = kit.configuration(self.config(prefix))
            files = kit.rendered(config)
            for service, label in kit.LABELS.items():
                plist = plistlib.loads(files["plists/" + label + ".plist"])
                self.assertEqual(plist["ProgramArguments"], [str(prefix / "bin" / (service + ".sh"))])
                self.assertEqual(plist["UserName"], user.pw_name)
                self.assertTrue(plist["KeepAlive"])
                self.assertEqual(plist["ExitTimeOut"], 60)
            self.assertEqual(plistlib.loads(files["plists/" + kit.LABELS["celld"] + ".plist"])["ThrottleInterval"], 70)
            caddy = files["config/Caddyfile"].decode()
            self.assertIn('tls ' + json.dumps(config["certificate"]) + ' ' + json.dumps(config["privateKey"]), caddy)
            self.assertIn("header_up CF-Connecting-IP {remote_host}", caddy)
            self.assertIn("grace_period 10s", caddy)
            self.assertEqual(files["config/celld.version"], (kit.HERE.parent / "celld.version").read_bytes())
            for maintenance in ("down", "shutdown.py"):
                self.assertEqual(files["bin/" + maintenance], (kit.HERE / maintenance).read_bytes())
            kit.new_tree(Path(scratch) / "rendered", files)
            self.assertFalse((Path(scratch) / "NEVER").exists())

    def test_render_refuses_existing_paths_and_symlink_parents_without_touching_them(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
            root = Path(scratch)
            occupied = root / "occupied"
            occupied.mkdir()
            sentinel = occupied / "KEEP"
            sentinel.write_bytes(b"TEST existing data")
            # This actual user-owned scratch parent is valid for rendering, never for sudo installation.
            with self.assertRaises(kit.Refusal):
                kit.install_parent(root / "must-not-install")
            self.assertFalse((root / "must-not-install").exists())
            with self.assertRaises(FileExistsError):
                kit.new_tree(occupied, {"config/new": b"must not write"})
            self.assertEqual(list(occupied.iterdir()), [sentinel])
            link = root / "link"
            link.symlink_to(occupied, target_is_directory=True)
            with self.assertRaises(kit.Refusal):
                kit.new_tree(link / "nested", {"config/new": b"must not write"})
            self.assertEqual(sentinel.read_bytes(), b"TEST existing data")
            label = kit.LABELS["celld"]
            for code, stderr, expected in ((0, b"", "loaded"), (113, b"another failure", "unavailable"),
                                           (113, ('Could not find service "' + label + '"').encode(), "absent")):
                with patch.object(kit.subprocess, "run", return_value=subprocess.CompletedProcess([], code, b"", stderr)):
                    self.assertEqual(kit.job_state(label), expected)

    def test_config_closes_injection_and_ambiguous_inputs_before_render(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
            original = self.config(Path(scratch) / "host")
            for name, value in (("hosts", ['test.local {\n reverse_proxy attacker.invalid']),
                                ("hosts", ["fd00::1"]), ("hosts", ["test.local", "test.local"]),
                                ("prefix", str(Path(scratch) / ".." / "escape")),
                                ("user", original["user"] + ";id"), ("node", "../other"),
                                ("volumeMax", True), ("volumeMax", 0)):
                with self.subTest(name=name, value=value), self.assertRaises(kit.Refusal):
                    kit.configuration({**original, name: value})
            with self.assertRaises(kit.Refusal):
                kit.configuration({**original, "unknown": "value"})

    def test_fsync_requires_exact_true_readback_and_rejects_missing_or_false_overrides(self):
        # Scripted fs.configure JSON, not a claim that a real store has applied it.
        exact = {"locationPrefix": "/buckets/celld-fleet/", "fsync": True}
        self.assertTrue(fsync_enabled(json.dumps({"locations": [exact]}).encode()))
        for locations in ([], [{**exact, "fsync": False}], [{**exact, "locationPrefix": "/buckets/other/"}],
                          [exact, {"locationPrefix": "/buckets/celld-fleet/probe/", "fsync": False}]):
            self.assertFalse(fsync_enabled(json.dumps({"locations": locations}).encode()))
        self.assertFalse(fsync_enabled(b"not a configuration"))

    def test_store_request_keeps_synthetic_credentials_out_of_argv_and_output(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
            prefix = Path(scratch)
            (prefix / "private").mkdir(mode=0o700)
            credentials = {"AWS_ACCESS_KEY_ID": "TEST-ONLY-ID", "AWS_SECRET_ACCESS_KEY": 'TEST-ONLY-SECRET-"-\\'}
            credential_file = prefix / "private/aws.json"
            credential_file.write_text(json.dumps(credentials))
            credential_file.chmod(0o600)
            actual_popen = subprocess.Popen
            commands = []
            def scripted_curl(argv, **options):
                # Only the curl transport stands in. The real helper still reads private input,
                # builds stdin config, bounds the reply, and closes an actual child process.
                self.assertEqual(argv, ["/usr/bin/curl", "-q", "--config", "-"])
                commands.append(argv)
                script = 'import sys; s=sys.stdin.buffer.read(); assert b"TEST-ONLY-ID" in s and b"TEST-ONLY-SECRET" in s; sys.stdout.buffer.write(b"TEST reply\\n200")'
                return actual_popen([sys.executable, "-c", script], **options)
            output = io.StringIO()
            with patch.object(kit, "read_installation", return_value={"uid": os.getuid()}), patch.object(kit.subprocess, "Popen", scripted_curl), patch("sys.stdout", output):
                self.assertEqual(kit.aws_request(prefix, "PUT", "probe/TEST", b"TEST payload"), (200, b"TEST reply"))
            self.assertEqual(len(commands), 1)
            self.assertEqual(output.getvalue(), "")
            self.assertEqual(set((prefix / "private").iterdir()), {credential_file})
            with self.assertRaises(kit.Refusal):
                kit.private_credentials(credential_file, os.getuid() + 1)
            alias = prefix / "private/alias.json"
            alias.symlink_to(credential_file)
            with self.assertRaises(OSError):
                kit.private_credentials(alias, os.getuid())
            alias.unlink()
            replacement = prefix / "private/replacement.json"
            replacement.write_text(json.dumps({**credentials, "AWS_SECRET_ACCESS_KEY": "TEST-ONLY-REPLACEMENT"}))
            replacement.chmod(0o600)
            actual_open = os.open
            def swap_after_open(path, flags):
                fd = actual_open(path, flags)
                os.replace(replacement, credential_file)
                return fd
            # Rename the path after opening it: validation and JSON must still use the original descriptor.
            with patch.object(kit.os, "open", swap_after_open):
                self.assertEqual(kit.private_credentials(credential_file, os.getuid()), credentials)
            credential_file.write_text('{"AWS_ACCESS_KEY_ID":"TEST-A","AWS_ACCESS_KEY_ID":"TEST-B","AWS_SECRET_ACCESS_KEY":"TEST-S"}')
            with self.assertRaises(kit.Refusal):
                kit.private_credentials(credential_file, os.getuid())


if __name__ == "__main__":
    unittest.main()
