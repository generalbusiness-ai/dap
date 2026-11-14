#!/usr/bin/env python3
"""Deploy the prepared production project to this installation's store."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import pwd
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import time
import xml.etree.ElementTree as ET

from kit import (Refusal, absolute, aws_request, configuration, private_credentials,
                 parse_json, read_installation, read_json, regular, require)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def application_project_settings(config, variables):
    """Admit one application-content bucket only with its operator trust setting."""
    bucket = "r2_buckets" in config
    trust = "APPLICATION_TRUST" in variables
    if not bucket and not trust:
        return set()
    require(bucket and trust, "incomplete application settings")
    require(config["r2_buckets"] == [{"binding": "APPLICATION_CONTENT", "bucket_name": "application-content"}],
            "application content binding differs")
    return {"APPLICATION_TRUST"}


def check_application_trust(raw):
    """Use the production parser offline; no Python approximation of URL or key aliases."""
    try:
        bounded = isinstance(raw, str) and len(raw.encode("utf-8")) <= 64 * 1024
    except UnicodeError:
        bounded = False
    require(bounded, "invalid application trust")
    node = shutil.which("node")
    require(node is not None, "application trust validator unavailable")
    try:
        checked = subprocess.run([node, str(HERE / "application-settings.mjs"), "--check-trust"],
                                 input=raw, text=True, encoding="utf-8", errors="strict",
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                 timeout=10, check=False)
    except (OSError, UnicodeError, subprocess.SubprocessError):
        raise Refusal("application trust validator unavailable") from None
    require(checked.returncode == 0, "invalid application trust")


def github_repository_bindings(raw, namespace):
    """Admit only bounded, exact destination/repository/branch authorization."""
    import re
    require(isinstance(raw, str) and len(raw.encode()) <= 65536, "invalid repository bindings")
    rows = parse_json(raw)
    require(isinstance(rows, list) and len(rows) <= 64, "invalid repository bindings")
    destinations, repositories = set(), set()
    for row in rows:
        require(isinstance(row, dict) and set(row) == {"destination", "repository", "branch"},
                "invalid repository binding")
        destination, repository, branch = row["destination"], row["repository"], row["branch"]
        require(isinstance(destination, dict) and set(destination) == {"scope", "genesis"}
                and isinstance(destination["scope"], str)
                and re.fullmatch(r"sc_[a-z2-7]{51}[aq]", destination["scope"])
                and isinstance(destination["genesis"], str)
                and re.fullmatch(r"sha256:[0-9a-f]{64}", destination["genesis"]),
                "invalid repository binding destination")
        require(isinstance(repository, dict) and set(repository) == {"host", "namespace", "name", "id"}
                and repository["host"] == "github.com" and repository["namespace"] == namespace
                and isinstance(repository["name"], str)
                and re.fullmatch(r"[A-Za-z0-9_.-]{1,100}", repository["name"])
                and repository["name"] not in (".", "..") and not repository["name"].lower().endswith(".git")
                and isinstance(repository["id"], str) and re.fullmatch(r"[1-9][0-9]*", repository["id"])
                and len(repository["id"]) <= 16 and int(repository["id"]) <= 9007199254740991,
                "invalid repository binding identity")
        full = "refs/heads/" + branch if isinstance(branch, str) else ""
        require(full and len(full) <= 255 and re.fullmatch(r"[A-Za-z0-9._/-]+", full)
                and ".." not in full and not full.endswith(".")
                and all(part and not part.startswith((".", "-")) and not part.endswith(".lock")
                        for part in full.split("/")), "invalid repository binding branch")
        destination_key = (destination["scope"], destination["genesis"])
        repository_key = (repository["id"], branch)
        require(destination_key not in destinations and repository_key not in repositories,
                "ambiguous repository binding")
        destinations.add(destination_key)
        repositories.add(repository_key)


def github_project_settings(variables):
    """Check staged GitHub settings before a deployment process can start."""
    import re
    names = {"GITHUB_APP_CONFIG", "GITHUB_APP_PRIVATE_KEY", "GITHUB_READ_TOKEN", "GITHUB_REPOSITORY_BINDINGS"}
    selected = names & set(variables)
    if not selected:
        return selected
    require({"GITHUB_APP_CONFIG", "GITHUB_APP_PRIVATE_KEY"} <= selected,
            "incomplete GitHub settings")
    raw = variables["GITHUB_APP_CONFIG"]
    require(isinstance(raw, str) and len(raw.encode()) <= 4096, "invalid GitHub settings")
    value = parse_json(raw)
    fields = {"issuer", "installationId", "account", "maxBytes", "registerScope",
              "privateRepositories", "publicReads", "credentialIdentity"}
    require(isinstance(value, dict) and set(value) in (fields, fields | {"installationReads"}), "invalid GitHub settings")
    installation_reads = value.get("installationReads", False)
    require("installationReads" not in value or installation_reads is True,
            "invalid GitHub installation reads")
    account = value["account"]
    positive = lambda number: type(number) is int and 0 < number <= 9007199254740991
    require(isinstance(account, dict) and set(account) == {"id", "login", "type"}
            and positive(account["id"]) and isinstance(account["login"], str)
            and re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?", account["login"])
            and account["type"] in ("User", "Organization"), "invalid GitHub account")
    require(isinstance(value["issuer"], str) and re.fullmatch(r"[A-Za-z0-9_.-]{1,128}", value["issuer"])
            and positive(value["installationId"]) and positive(value["maxBytes"])
            and value["maxBytes"] >= 32 and value["registerScope"] == variables.get("REGISTER_SCOPE")
            and type(value["privateRepositories"]) is bool and type(value["publicReads"]) is bool
            and not (value["privateRepositories"] and value["publicReads"])
            and (not installation_reads or value["privateRepositories"] and not value["publicReads"])
            and value["credentialIdentity"] == "adapter-attempt", "invalid GitHub authority")
    key = variables["GITHUB_APP_PRIVATE_KEY"]
    require(isinstance(key, str) and len(key) <= 16384
            and re.fullmatch(r"-----BEGIN PRIVATE KEY-----\r?\n[A-Za-z0-9+/=\r\n]+\r?\n-----END PRIVATE KEY-----\s*", key),
            "invalid GitHub private key")
    token = variables.get("GITHUB_READ_TOKEN")
    require((value["publicReads"] or installation_reads or "GITHUB_READ_TOKEN" in selected)
            and (not installation_reads or "GITHUB_READ_TOKEN" not in selected)
            and ("GITHUB_READ_TOKEN" not in selected
                 or isinstance(token, str) and re.fullmatch(r"[A-Za-z0-9_.-]{1,4096}", token)),
            "invalid GitHub read authority")
    if "GITHUB_REPOSITORY_BINDINGS" in selected:
        github_repository_bindings(variables["GITHUB_REPOSITORY_BINDINGS"], account["login"])
    return selected


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
    variables = config.get("vars", {})
    require(isinstance(variables, dict), "project variables differ")
    application = application_project_settings(config, variables)
    excluded = {"vars", "r2_buckets"} if application else {"vars"}
    require({k: v for k, v in config.items() if k not in excluded}
            == {k: v for k, v in maintained.items() if k != "vars"}, "project configuration differs")
    required = {"REGISTER_SCOPE", "PUBLIC_ORIGIN", "MCP_ENABLED", "MCP_TOOL_ADDITIONS", "SESSION_SECRET"}
    if "PLATFORM_CREATION_PINS" in variables:
        policy = read_json(HERE / "repository-binding-policy.json", 4096)
        require(isinstance(variables["PLATFORM_CREATION_PINS"], str)
                and parse_json(variables["PLATFORM_CREATION_PINS"]) == policy["PLATFORM_CREATION_PINS"],
                "creation policy differs")
        required.add("PLATFORM_CREATION_PINS")
    if "INSTALLED_REGISTER_SCOPES" in variables:
        raw = variables["INSTALLED_REGISTER_SCOPES"]
        try:
            bounded = isinstance(raw, str) and len(raw.encode("utf-8")) <= 4096
        except UnicodeError:
            bounded = False
        require(bounded, "invalid installed registers")
        rows = parse_json(raw)
        import re
        require(isinstance(rows, list) and 1 <= len(rows) <= 32
                and all(isinstance(row, str) and re.fullmatch(r"sc_[a-z2-7]{51}[aq]", row) for row in rows)
                and len(set(rows)) == len(rows) and variables.get("REGISTER_SCOPE") in rows,
                "invalid installed registers")
        required.add("INSTALLED_REGISTER_SCOPES")
    github = github_project_settings(variables)
    require(set(variables) == set(maintained["vars"]) | required | github | application, "project variables differ")
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
    if application:
        # The closed project/configuration checks precede any local child process.
        check_application_trust(variables["APPLICATION_TRUST"])
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


def ensure_bucket(prefix):
    """Create the fixed bucket, or verify the same authenticated owner."""
    status, body = aws_request(prefix, "PUT", "")
    if 200 <= status < 300:
        return
    require(status == 409, "fleet bucket initialization failed")
    try:
        text = body.decode("utf-8")
        require("<!DOCTYPE" not in text.upper() and "<!ENTITY" not in text.upper(),
                "fleet bucket initialization failed")
        error = ET.fromstring(text)
    except (UnicodeDecodeError, ET.ParseError):
        raise Refusal("fleet bucket initialization failed") from None
    namespace = "{http://s3.amazonaws.com/doc/2006-03-01/}" if error.tag.startswith("{") else ""
    codes = [child for child in error if child.tag.rsplit("}", 1)[-1] == "Code"]
    require(error.tag == namespace + "Error" and len(codes) == 1
            and codes[0].tag == namespace + "Code" and not codes[0].attrib
            and len(codes[0]) == 0 and codes[0].text == "BucketAlreadyOwnedByYou",
            "fleet bucket initialization failed")
    status, _ = aws_request(prefix, "HEAD", "")
    require(200 <= status < 300, "fleet bucket ownership read failed")


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
    ensure_bucket(prefix)
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
