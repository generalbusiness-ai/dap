#!/usr/bin/env python3
"""Deploy the prepared production project to this installation's store."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import pwd
import signal
import stat
import subprocess
import sys
import tempfile
import time

from kit import (Refusal, absolute, aws_request, configuration, private_credentials,
                 read_installation, read_json, regular, require)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def prepared_project(directory):
    directory = absolute(str(directory))
    info = directory.lstat()
    require(stat.S_ISDIR(info.st_mode) and info.st_uid == os.getuid()
            and stat.S_IMODE(info.st_mode) == 0o700, "project must be an owned private directory")
    for name in ("wrangler.json", "worker.ts"):
        info = regular(directory / name, 64 * 1024)
        require(info.st_uid == os.getuid() and stat.S_IMODE(info.st_mode) == 0o600,
                "project files must be owned with mode 0600")
    config = read_json(directory / "wrangler.json", 64 * 1024)
    maintained = read_json(HERE.parent / "wrangler.json", 64 * 1024)
    require({k: v for k, v in config.items() if k != "vars"}
            == {k: v for k, v in maintained.items() if k != "vars"}, "project configuration differs")
    variables = config.get("vars", {})
    required = {"REGISTER_SCOPE", "PUBLIC_ORIGIN", "MCP_ENABLED", "MCP_TOOL_ADDITIONS", "SESSION_SECRET"}
    require(set(variables) == set(maintained["vars"]) | required, "project variables differ")
    require(all(variables.get(k) == v for k, v in maintained["vars"].items()), "maintained variable differs")
    require(variables.get("MCP_ENABLED") == "true" and variables.get("MCP_TOOL_ADDITIONS") == "[]",
            "MCP configuration differs")
    import re
    from urllib.parse import urlsplit
    require(isinstance(variables.get("REGISTER_SCOPE"), str)
            and re.fullmatch(r"sc_[a-z2-7]{52}", variables["REGISTER_SCOPE"]), "invalid register")
    origin = variables.get("PUBLIC_ORIGIN")
    require(isinstance(origin, str) and len(origin) <= 2048 and origin.isascii(), "invalid public origin")
    url = urlsplit(origin)
    require(url.scheme == "https" and url.hostname and not url.username and not url.password
            and not url.path and not url.query and not url.fragment
            and origin == "https://" + url.netloc, "invalid public origin")
    secret = variables.get("SESSION_SECRET")
    require(isinstance(secret, str) and re.fullmatch(r"[A-Za-z0-9_-]{43}", secret), "invalid session secret")
    entry = json.dumps(str(ROOT / "apps/room/worker.ts"), ensure_ascii=False)
    expected = "export * from " + entry + ";\nexport { default } from " + entry + ";\n"
    require((directory / "worker.ts").read_text() == expected, "project does not name the production entry")
    return directory


def run_deployment(argv, env, directory):
    """Retain private tool output and close the owned process group on timeout."""
    attempt = Path(tempfile.mkdtemp(prefix="deployment-", dir=directory))
    outputs = []
    for name in ("stdout.log", "stderr.log"):
        fd = os.open(attempt / name, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        outputs.append(os.fdopen(fd, "wb"))
    process = None
    timed_out = False
    group_closed = None
    cleanup_failure = None

    def group_exists():
        try:
            os.killpg(process.pid, 0)
            return True
        except ProcessLookupError:
            return False

    def close_group():
        # The group also owns a compiler that may outlive its parent.
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=5)
        for action in (None, signal.SIGKILL):
            if action is not None and group_exists():
                os.killpg(process.pid, action)
            until = time.monotonic() + 5
            while group_exists() and time.monotonic() < until:
                time.sleep(0.05)
            if not group_exists():
                break
        return not group_exists()

    try:
        process = subprocess.Popen(argv, cwd=directory, env=env, stdin=subprocess.DEVNULL,
                                   stdout=outputs[0], stderr=outputs[1], start_new_session=True)
        group_closed = False
        try:
            process.wait(timeout=180)
        except subprocess.TimeoutExpired:
            timed_out = True
        finally:
            try:
                group_closed = close_group()
            except BaseException as error:
                cleanup_failure = type(error).__name__
                raise
    finally:
        for output in outputs:
            output.close()
        receipt = {"qualification": "Private deployment logs; not application readiness or journal evidence",
                   "exit": process.returncode if process is not None else None, "timeout": timed_out,
                   "ownedProcessGroupClosed": group_closed,
                   "cleanupFailure": cleanup_failure,
                   "outputs": [{"path": name, "bytes": (attempt / name).stat().st_size,
                                "sha256": hashlib.sha256((attempt / name).read_bytes()).hexdigest()}
                               for name in ("stdout.log", "stderr.log")]}
        with (attempt / "result.json").open("x") as output:
            json.dump(receipt, output)
            output.write("\n")
        (attempt / "result.json").chmod(0o600)
    require(not timed_out and group_closed and process.returncode == 0,
            "deployment failed; retain private project logs")


def deploy(prefix, project, esbuild):
    record = read_installation(prefix)
    require(os.getuid() == record["uid"] and os.getuid() != 0, "deploy as the service user")
    project = prepared_project(project)
    esbuild = Path(esbuild).resolve(strict=True)
    regular(esbuild)
    require(os.access(esbuild, os.X_OK), "esbuild must be executable")
    config, user = configuration(read_json(Path(prefix) / "config/host.json"))
    require(user.pw_uid == record["uid"] and config["prefix"] == str(prefix), "installation differs")
    credentials = private_credentials(Path(prefix) / "private/aws.json", user.pw_uid)
    pin = (Path(prefix) / "config/celld.version").read_text().strip()
    env = {"HOME": pwd.getpwuid(os.getuid()).pw_dir, "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
           "LANG": "en_US.UTF-8", "AWS_REGION": "us-east-1", "CELLD_ESBUILD": str(esbuild), **credentials}
    version = subprocess.run([config["celld"], "--version"], env=env, capture_output=True, timeout=10)
    require(version.returncode == 0 and len(version.stdout) <= 4096
            and any(v in (pin, pin[1:]) for v in version.stdout.decode().split()), "runtime does not match pin")
    # The installer owns a new store directory. PUT creates or opens its own
    # fixed bucket; it does not clear an existing bucket or change node data.
    status, _ = aws_request(prefix, "PUT", "")
    require(200 <= status < 300, "fleet bucket initialization failed")
    run_deployment([config["celld"], "deploy", str(project), "--bucket", "s3://" + record["bucket"],
                    "--endpoint", record["endpoint"], "--region", "us-east-1", "--json"], env, project)
    return {"version": 1, "deploymentCommandSucceeded": True,
            "qualification": "Run the retained CLI plan to verify actual Worker readiness"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--esbuild", required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(deploy(absolute(args.prefix), args.project, args.esbuild)))
    except Refusal as error:
        print("Deployment refused: " + str(error) + ". Retain the private project logs.", file=sys.stderr)
        return 1
    except (OSError, ValueError, subprocess.SubprocessError):
        print("Deployment refused; retain the private project and inspect its inputs and logs.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
