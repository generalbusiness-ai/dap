"""Prepared project and private process boundaries; no real store or deployment."""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import deploy
from kit import Refusal


class DeploymentSafety(unittest.TestCase):
    def test_scripted_bucket_creation_or_verified_existing_ownership(self):
        # Scripted S3 replies show this adapter's decision, not a real store.
        prefix = Path("/TEST-owned-installation")
        owned = b"<Error><Code>BucketAlreadyOwnedByYou</Code><Message>TEST</Message></Error>"
        with patch.object(deploy, "aws_request", return_value=(200, b"")) as request:
            deploy.ensure_bucket(prefix)
            self.assertEqual(request.call_args_list, [unittest.mock.call(prefix, "PUT", "")])
        with patch.object(deploy, "aws_request", side_effect=[(409, owned), (200, b"")]) as request:
            deploy.ensure_bucket(prefix)
            self.assertEqual(request.call_args_list, [unittest.mock.call(prefix, "PUT", ""), unittest.mock.call(prefix, "HEAD", "")])
        for status, body in (
                (409, owned.replace(b"BucketAlreadyOwnedByYou", b"BucketAlreadyExists")),
                (409, b"<Error><Code>BucketAlreadyOwnedByYou"),
                (409, b"<Other><Code>BucketAlreadyOwnedByYou</Code></Other>"),
                (409, b'<!DOCTYPE Error [<!ENTITY code "BucketAlreadyOwnedByYou">]><Error><Code>&code;</Code></Error>'),
                (500, owned)):
            with self.subTest(status=status, body=body), patch.object(deploy, "aws_request", side_effect=[(status, body), (200, b"")]) as request:
                with self.assertRaises(Refusal):
                    deploy.ensure_bucket(prefix)
                self.assertEqual(request.call_args_list, [unittest.mock.call(prefix, "PUT", "")])
        with patch.object(deploy, "aws_request", side_effect=[(409, owned), (403, b"")]) as request:
            with self.assertRaises(Refusal):
                deploy.ensure_bucket(prefix)
            self.assertEqual(request.call_args_list, [unittest.mock.call(prefix, "PUT", ""), unittest.mock.call(prefix, "HEAD", "")])

    def project(self, root):
        project = root / "project"
        project.mkdir(mode=0o700)
        config = json.loads((deploy.HERE.parent / "wrangler.json").read_text())
        config["vars"].update({"REGISTER_SCOPE": "sc_" + "a" * 52,
                               "PUBLIC_ORIGIN": "https://test.local", "MCP_ENABLED": "true",
                               "MCP_TOOL_ADDITIONS": "[]", "SESSION_SECRET": "TEST" + "x" * 39})
        path = project / "wrangler.json"
        path.write_text(json.dumps(config))
        path.chmod(0o600)
        entry = json.dumps(str(deploy.ROOT / "apps/room/worker.ts"), ensure_ascii=False)
        path = project / "worker.ts"
        path.write_text("export * from " + entry + ";\nexport { default } from " + entry + ";\n")
        path.chmod(0o600)
        return project

    def test_only_private_maintained_project_can_reach_deployment(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
            project = self.project(Path(scratch))
            self.assertEqual(deploy.prepared_project(project), project)
            source = project / "worker.ts"
            source.write_text("export default { fetch() { return new Response('SCRIPTED'); } };\n")
            with self.assertRaises(Refusal):
                deploy.prepared_project(project)
            source.chmod(0o644)
            with self.assertRaises(Refusal):
                deploy.prepared_project(project)

    def application_project(self, root, raw="[]"):
        project = self.project(root)
        path = project / "wrangler.json"
        config = json.loads(path.read_text())
        config["r2_buckets"] = [{"binding": "APPLICATION_CONTENT", "bucket_name": "application-content"}]
        config["vars"]["APPLICATION_TRUST"] = raw
        path.write_text(json.dumps(config))
        return project, path, config

    def application_row(self, **changed):
        # Public TEST syntax only. The production key parser checks canonical bytes, not curve membership.
        return {"release": "sha256:" + "a" * 64, "publisher": "key_" + "A" * 43,
                "host": "git.example", **changed}

    def test_legacy_project_starts_no_application_validator(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
            project = self.project(Path(scratch))
            with patch.object(deploy.subprocess, "run", side_effect=AssertionError("legacy project starts no child")):
                self.assertEqual(deploy.prepared_project(project), project)

    def test_exact_application_pair_uses_production_trust_without_rewriting_private_project(self):
        # Real offline parser; no store, provider, Git operation or deployment process.
        rows = [self.application_row(release="sha256:" + f"{index:064x}") for index in range(128)]
        settings = ["[]", " [\n] ", json.dumps(rows)]
        settings.extend(json.dumps([self.application_row(host=host)]) for host in (
            "git.example", "localhost", "git.example.", "127.0.0.1", "[::1]", "xn--fa-hia.example"))
        for raw in settings:
            with self.subTest(setting=raw[:120]), tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
                project, path, _ = self.application_project(Path(scratch), raw)
                before = {name: (project / name).read_bytes() for name in ("worker.ts", "wrangler.json")}
                self.assertEqual(deploy.prepared_project(project), project)
                self.assertEqual({name: (project / name).read_bytes() for name in before}, before)
                self.assertEqual(json.loads(path.read_text())["vars"]["APPLICATION_TRUST"], raw)

    def test_application_pair_and_closed_project_shape_refuse_before_any_child(self):
        def without_trust(config):
            del config["vars"]["APPLICATION_TRUST"]

        def without_bucket(config):
            del config["r2_buckets"]

        def unrelated_setting(config):
            config["vars"]["UNREVIEWED_SETTING"] = "TEST"

        def unrelated_field(config):
            config["UNREVIEWED_FIELD"] = "TEST"

        changes = [without_trust, without_bucket, unrelated_setting, unrelated_field]
        for buckets in ([], {},
                        [{"binding": "OTHER_CONTENT", "bucket_name": "application-content"}],
                        [{"binding": "APPLICATION_CONTENT", "bucket_name": "another-bucket"}],
                        [{"binding": "APPLICATION_CONTENT", "bucket_name": "application-content", "preview_bucket_name": "extra"}],
                        [{"binding": "APPLICATION_CONTENT", "bucket_name": "application-content"},
                         {"binding": "OTHER_CONTENT", "bucket_name": "another-bucket"}]):
            changes.append(lambda config, value=buckets: config.update({"r2_buckets": value}))
        for change in changes:
            with self.subTest(change=change), tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
                project, path, config = self.application_project(Path(scratch))
                change(config)
                path.write_text(json.dumps(config))
                before = path.read_bytes()
                with patch.object(deploy.subprocess, "run", side_effect=AssertionError("closed shape starts no child")):
                    with self.assertRaises(Refusal):
                        deploy.prepared_project(project)
                self.assertEqual(path.read_bytes(), before)

    def test_unrelated_application_variable_cannot_reach_private_inputs_or_deployment(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
            project, path, config = self.application_project(Path(scratch))
            config["vars"]["UNREVIEWED_SETTING"] = "TEST"
            path.write_text(json.dumps(config))
            # The installation record is a scripted identity. No installed record or credential file is read.
            with patch.object(deploy, "read_installation", return_value={"uid": os.getuid()}), \
                    patch.object(deploy, "private_credentials") as credentials, \
                    patch.object(deploy, "ensure_bucket") as bucket, \
                    patch.object(deploy, "run_deployment") as command, \
                    patch.object(deploy.subprocess, "run", side_effect=AssertionError("invalid project starts no child")):
                with self.assertRaisesRegex(Refusal, "project variables differ"):
                    deploy.deploy(Path("/TEST-owned-installation"), project, "/TEST-unused-esbuild")
                credentials.assert_not_called()
                bucket.assert_not_called()
                command.assert_not_called()

    def test_application_trust_refuses_ambiguous_noncanonical_and_extra_authority(self):
        row = self.application_row()
        settings = ["not-json", "{}", "null", "[null]", json.dumps([row, row]),
                    json.dumps([{**row, "permission": "write"}]),
                    '[{"release":"' + row["release"] + '","publisher":"' + row["publisher"]
                    + '","host":"git.example","host":"other.example"}]',
                    json.dumps([self.application_row(release="sha256:" + f"{index:064x}") for index in range(129)])]
        for release in ("sha256:" + "A" * 64, "sha256:" + "a" * 63, "sha1:" + "a" * 40, None):
            settings.append(json.dumps([self.application_row(release=release)]))
        for publisher in ("key_" + "A" * 42 + "B", "key_" + "A" * 43 + "=", "key_" + "A" * 42, None):
            settings.append(json.dumps([self.application_row(publisher=publisher)]))
        for host in ("GIT.example", "git.example:443", "user@git.example", "git.example/path",
                     "git.example?x", "git.example#x", "%67it.example", "faß.example", "xn--",
                     "127.1", "0177.0.0.1", "[0:0:0:0:0:0:0:1]", "[::A]", None):
            settings.append(json.dumps([self.application_row(host=host)]))
        for raw in settings:
            with self.subTest(setting=raw[:120]), tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
                project, path, _ = self.application_project(Path(scratch), raw)
                before = path.read_bytes()
                with self.assertRaises(Refusal):
                    deploy.prepared_project(project)
                self.assertEqual(path.read_bytes(), before)

    def test_application_parser_child_is_bounded_private_and_fails_closed(self):
        raw = " [\n] "
        completed = deploy.subprocess.CompletedProcess(["TEST-node"], 0)
        with patch.object(deploy.shutil, "which", return_value="/TEST/node"), \
                patch.object(deploy.subprocess, "run", return_value=completed) as run:
            deploy.check_application_trust(raw)
            run.assert_called_once_with(["/TEST/node", str(deploy.HERE / "application-settings.mjs"), "--check-trust"],
                                        input=raw, text=True, encoding="utf-8", errors="strict",
                                        stdout=deploy.subprocess.DEVNULL, stderr=deploy.subprocess.DEVNULL,
                                        timeout=10, check=False)
        with patch.object(deploy.shutil, "which", return_value=None), patch.object(deploy.subprocess, "run") as run:
            with self.assertRaisesRegex(Refusal, "validator unavailable"):
                deploy.check_application_trust(raw)
            run.assert_not_called()
        for failure in (FileNotFoundError("TEST-private-detail"), UnicodeError("TEST-private-detail"),
                        deploy.subprocess.TimeoutExpired("TEST-node", 10), deploy.subprocess.SubprocessError("TEST-private-detail")):
            with self.subTest(failure=type(failure).__name__), patch.object(deploy.shutil, "which", return_value="/TEST/node"), \
                    patch.object(deploy.subprocess, "run", side_effect=failure):
                with self.assertRaisesRegex(Refusal, "^application trust validator unavailable$"):
                    deploy.check_application_trust(raw)
        with patch.object(deploy.shutil, "which", return_value="/TEST/node"), \
                patch.object(deploy.subprocess, "run", return_value=deploy.subprocess.CompletedProcess(["TEST-node"], 1)):
            with self.assertRaisesRegex(Refusal, "^invalid application trust$"):
                deploy.check_application_trust(raw)
        for invalid in (None, " " * (65536 + 1), "é" * 32769, "\ud800"):
            with self.subTest(bound=repr(invalid)[:80]), patch.object(deploy.subprocess, "run") as run:
                with self.assertRaisesRegex(Refusal, "^invalid application trust$"):
                    deploy.check_application_trust(invalid)
                run.assert_not_called()

    def test_actual_child_output_stays_private_and_failed_deploy_is_not_success(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
            project = self.project(Path(scratch))
            # This child stands in for the deployment CLI, not the Worker or store.
            marker = "TEST-ONLY-private-provider-output"
            command = [sys.executable, "-c", "import sys; print(sys.argv[1]); sys.exit(7)", marker]
            with self.assertRaises(Refusal):
                deploy.run_deployment(command, {"PATH": "/usr/bin:/bin"}, project)
            attempt = next(project.glob("deployment-*"))
            self.assertEqual(attempt.stat().st_mode & 0o777, 0o700)
            self.assertEqual((attempt / "stdout.log").read_text().strip() == marker, True)
            for name in ("stdout.log", "stderr.log", "result.json"):
                self.assertEqual((attempt / name).stat().st_mode & 0o777, 0o600)
            result = json.loads((attempt / "result.json").read_text())
            self.assertEqual(result["exit"], 7)
            self.assertTrue(result["ownedProcessGroupClosed"])

    def test_installed_roots_keep_the_project_variable_allowlist_closed(self):
        with tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
            project = self.project(Path(scratch))
            path = project / "wrangler.json"
            config = json.loads(path.read_text())
            alphabet = "abcdefghijklmnopqrstuvwxyz234567"
            roots = ["sc_" + letter + "a" * 51 for letter in alphabet]
            raw = " [\n" + json.dumps(roots)[1:-1] + "\n] "
            config["vars"]["INSTALLED_REGISTER_SCOPES"] = raw
            path.write_text(json.dumps(config))
            before = path.read_bytes()
            self.assertEqual(deploy.prepared_project(project), project)
            self.assertEqual(path.read_bytes(), before)
            self.assertEqual(json.loads(path.read_text())["vars"]["INSTALLED_REGISTER_SCOPES"], raw)
            config["vars"]["UNREVIEWED_SETTING"] = "TEST"
            path.write_text(json.dumps(config))
            with self.assertRaisesRegex(Refusal, "project variables differ"):
                deploy.prepared_project(project)
            del config["vars"]["UNREVIEWED_SETTING"]
            config["vars"]["INSTALLED_REGISTER_SCOPES"] = json.dumps(roots + ["sc_" + "ba" + "a" * 49 + "q"])
            path.write_text(json.dumps(config))
            with self.assertRaisesRegex(Refusal, "invalid installed registers"):
                deploy.prepared_project(project)

    def test_staged_github_authority_matches_the_register_and_private_reads(self):
        # These are structural TEST settings, not an App or provider witness.
        with tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
            project = self.project(Path(scratch))
            path = project / "wrangler.json"
            config = json.loads(path.read_text())
            github = {"issuer": "TEST-issuer", "installationId": 23,
                      "account": {"id": 17, "login": "test-account", "type": "Organization"},
                      "maxBytes": 10485760, "registerScope": config["vars"]["REGISTER_SCOPE"],
                      "privateRepositories": True, "publicReads": False,
                      "credentialIdentity": "adapter-attempt"}
            config["vars"].update({"GITHUB_APP_CONFIG": json.dumps(github),
                                  "GITHUB_APP_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\nVEVTVA==\n-----END PRIVATE KEY-----\n",
                                  "GITHUB_READ_TOKEN": "TEST.private.read.token"})
            binding = {"destination": {"scope": "sc_" + "a" * 52, "genesis": "sha256:" + "a" * 64},
                       "repository": {"host": "github.com", "namespace": "test-account", "name": "TEST-repo", "id": "71"},
                       "branch": "main"}
            config["vars"]["GITHUB_REPOSITORY_BINDINGS"] = json.dumps([binding])
            path.write_text(json.dumps(config))
            before = path.read_bytes()
            self.assertEqual(deploy.prepared_project(project), project)
            self.assertEqual(path.read_bytes(), before)
            for rows in ([binding, binding],
                         [{**binding, "repository": {**binding["repository"], "namespace": "another-account"}}],
                         [{**binding, "destination": {**binding["destination"], "genesis": "sha256:invalid"}}],
                         [{**binding, "branch": "../main"}]):
                config["vars"]["GITHUB_REPOSITORY_BINDINGS"] = json.dumps(rows)
                path.write_text(json.dumps(config))
                with self.assertRaises(Refusal):
                    deploy.prepared_project(project)
            config["vars"]["GITHUB_REPOSITORY_BINDINGS"] = json.dumps([binding])
            config["vars"]["GITHUB_APP_CONFIG"] = json.dumps({**github, "registerScope": "sc_" + "b" * 51 + "a"})
            path.write_text(json.dumps(config))
            with self.assertRaises(Refusal):
                deploy.prepared_project(project)
            config["vars"]["GITHUB_APP_CONFIG"] = json.dumps(github)
            del config["vars"]["GITHUB_READ_TOKEN"]
            path.write_text(json.dumps(config))
            with self.assertRaises(Refusal):
                deploy.prepared_project(project)

            config["vars"]["GITHUB_APP_CONFIG"] = json.dumps({**github, "installationReads": True})
            path.write_text(json.dumps(config))
            self.assertEqual(deploy.prepared_project(project), project)
            for changed in ({"installationReads": False}, {"installationReads": "true"},
                            {"publicReads": True}, {"privateRepositories": False}):
                config["vars"]["GITHUB_APP_CONFIG"] = json.dumps({**github, "installationReads": True, **changed})
                path.write_text(json.dumps(config))
                with self.assertRaises(Refusal):
                    deploy.prepared_project(project)
            config["vars"]["GITHUB_APP_CONFIG"] = json.dumps({**github, "installationReads": True})
            config["vars"]["GITHUB_READ_TOKEN"] = "TEST.ambiguous.read.token"
            path.write_text(json.dumps(config))
            with self.assertRaises(Refusal):
                deploy.prepared_project(project)

    def test_scripted_cleanup_error_retains_an_unproved_group_without_provider_details(self):
        class ScriptedProcess:
            pid = 12345
            returncode = 7

            def wait(self, timeout):
                return self.returncode

        with tempfile.TemporaryDirectory(dir="/private/tmp") as scratch:
            project = self.project(Path(scratch))
            # No child or signal is real in this failure control.
            private_detail = "TEST-ONLY-private-cleanup-detail"
            with patch.object(deploy.subprocess, "Popen", return_value=ScriptedProcess()), \
                    patch.object(deploy.os, "killpg", side_effect=PermissionError(private_detail)):
                with self.assertRaises(PermissionError):
                    deploy.run_deployment(["TEST-provider"], {}, project)
            attempt = next(project.glob("deployment-*"))
            receipt = (attempt / "result.json").read_text()
            result = json.loads(receipt)
            self.assertFalse(result["ownedProcessGroupClosed"])
            self.assertEqual(result["cleanupFailure"], "PermissionError")
            self.assertNotIn(private_detail, receipt)
            self.assertEqual(result["exit"], 7)


if __name__ == "__main__":
    unittest.main()
