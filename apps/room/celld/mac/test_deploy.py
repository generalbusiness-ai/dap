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
