#!/usr/bin/env python3
"""Render or install one owned macOS host. Never replace an existing path."""
import argparse
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import plistlib
import pwd
import re
import stat
import selectors
import subprocess
import sys
import tempfile
import time
import urllib.parse

HERE = Path(__file__).resolve().parent
LABELS = {name: "org.generalbusiness.dap." + name for name in ("seaweedfs", "celld", "caddy")}
BUCKET = "celld-fleet"
ENDPOINT = "http://127.0.0.1:28133"
CONFIG_KEYS = {"user", "prefix", "celld", "weed", "caddy", "node", "volumeMax", "hosts", "certificate", "privateKey"}
MAX_CONFIG = 16 * 1024


class Refusal(Exception):
    pass


def require(condition, message):
    if not condition:
        raise Refusal(message)


def absolute(value):
    require(isinstance(value, str) and 1 <= len(value.encode()) <= 4096, "invalid absolute path")
    require(not any(ord(c) < 32 or ord(c) == 127 for c in value), "control character in path")
    path = Path(value)
    require(path.is_absolute() and not value.startswith("//") and str(path) == value and ".." not in path.parts, "invalid absolute path")
    return path


def no_links(path):
    for at in (path, *path.parents):
        require(not at.is_symlink(), "symlink in path")


def install_parent(prefix):
    """Keep a sudo install below directories that its service user cannot rename."""
    no_links(prefix)
    for path in prefix.parents:
        info = path.lstat()
        require(stat.S_ISDIR(info.st_mode) and info.st_uid == 0 and not info.st_mode & 0o022,
                "install parent must be root-owned and not group/world-writable")


def regular(path, limit=None):
    no_links(path)
    info = path.lstat()
    require(stat.S_ISREG(info.st_mode), "expected regular file")
    require(limit is None or info.st_size <= limit, "file exceeds input bound")
    return info


def parse_json(text):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, "duplicate configuration key")
            result[key] = value
        return result
    try:
        return json.loads(text, object_pairs_hook=unique)
    except (ValueError, UnicodeError):
        raise Refusal("invalid JSON input") from None


def read_json(path, limit=MAX_CONFIG):
    regular(path, limit)
    return parse_json(path.read_text())


def encoded(value):
    return (json.dumps(value, sort_keys=True, indent=2) + "\n").encode()


def host(value):
    require(isinstance(value, str) and 1 <= len(value) <= 253, "invalid host")
    try:
        address = ipaddress.ip_address(value)
        require(str(address) == value and "%" not in value, "noncanonical address")
        return "[" + value + "]" if address.version == 6 else value
    except ValueError:
        require(not re.fullmatch(r"[0-9.]+", value), "invalid address")
        require(value == value.lower() and not value.endswith("."), "noncanonical host")
        require(all(re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", part) for part in value.split(".")), "invalid host")
        return value


def configuration(value):
    require(isinstance(value, dict) and set(value) == CONFIG_KEYS, "configuration keys differ")
    require(isinstance(value["user"], str) and re.fullmatch(r"[a-z_][a-z0-9_-]{0,31}", value["user"]), "invalid service user")
    try:
        user = pwd.getpwnam(value["user"])
    except KeyError:
        raise Refusal("service user is absent") from None
    require(user.pw_uid != 0, "service user must not be root")
    for name in ("prefix", "celld", "weed", "caddy", "certificate", "privateKey"):
        absolute(value[name])
    require(value["prefix"] != "/", "invalid installation prefix")
    require(isinstance(value["node"], str) and re.fullmatch(r"[A-Za-z0-9_.-]{1,128}", value["node"]) and value["node"] not in (".", ".."), "invalid node name")
    require(type(value["volumeMax"]) is int and 1 <= value["volumeMax"] <= 1024, "volumeMax must be an explicit positive bound")
    require(isinstance(value["hosts"], list) and 1 <= len(value["hosts"]) <= 16 and all(isinstance(x, str) for x in value["hosts"]), "invalid hosts")
    require(len(set(value["hosts"])) == len(value["hosts"]), "duplicate host")
    for name in value["hosts"]:
        host(name)
    try:
        ipaddress.ip_address(value["hosts"][0])
    except ValueError:
        pass
    else:
        raise Refusal("first host must be a DNS name")
    return dict(value), user


def rendered(config):
    prefix = config["prefix"]
    result = {}
    for name in LABELS:
        source = plistlib.loads((HERE / "templates" / (name + ".plist")).read_bytes())
        def replace(value):
            if isinstance(value, str):
                values = {"@PREFIX@": prefix, "@USER@": config["user"]}
                return re.sub(r"@(?:PREFIX|USER)@", lambda match: values[match.group()], value)
            if isinstance(value, list):
                return [replace(x) for x in value]
            if isinstance(value, dict):
                return {key: replace(item) for key, item in value.items()}
            return value
        result["plists/" + LABELS[name] + ".plist"] = plistlib.dumps(replace(source), sort_keys=False)
    caddy = (HERE / "templates/Caddyfile").read_text()
    values = {"@PRIMARY_HOST@": json.dumps(config["hosts"][0]),
              "@HOSTS@": ", ".join(json.dumps(host(x)) for x in config["hosts"]),
              "@CERTIFICATE@": json.dumps(config["certificate"]),
              "@PRIVATE_KEY@": json.dumps(config["privateKey"])}
    caddy = re.sub(r"@(?:PRIMARY_HOST|HOSTS|CERTIFICATE|PRIVATE_KEY)@", lambda match: values[match.group()], caddy)
    result["config/Caddyfile"] = caddy.encode()
    result["config/fsync.txt"] = (HERE / "templates/fsync.txt").read_bytes()
    result["config/host.json"] = encoded(config)
    # This installed copy follows the single maintained pin. No second version literal lives in the kit.
    pin = (HERE.parent / "celld.version").read_bytes()
    require(re.fullmatch(rb"v[0-9]+\.[0-9]+\.[0-9]+\n?", pin), "invalid maintained celld pin")
    result["config/celld.version"] = pin
    for name in ("kit.py", "service.py", "seaweedfs.sh", "celld.sh", "caddy.sh", "down", "shutdown.py"):
        result["bin/" + name] = (HERE / name).read_bytes()
    return result


def write_new(path, data, mode=0o644, owner=None):
    no_links(path.parent)
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, mode)
    try:
        os.fchmod(fd, mode)
        if owner is not None:
            os.fchown(fd, owner.pw_uid, owner.pw_gid)
        with os.fdopen(fd, "wb", closefd=False) as out:
            out.write(data)
            out.flush()
            os.fsync(out.fileno())
    finally:
        os.close(fd)


def new_tree(destination, files):
    no_links(destination)
    destination.mkdir(mode=0o755)
    destination.chmod(0o755)
    for name, data in files.items():
        target = destination / name
        target.parent.mkdir(mode=0o755, exist_ok=True)
        target.parent.chmod(0o755)
        write_new(target, data, 0o755 if name.startswith("bin/") else 0o644)


def private_credentials(path, uid):
    no_links(path.parent)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        require(stat.S_ISREG(info.st_mode) and info.st_uid == uid and stat.S_IMODE(info.st_mode) == 0o600,
                "credentials must be a regular file owned by the service user with mode 0600")
        require(info.st_size <= 4096, "credentials exceed input bound")
        with os.fdopen(fd, "rb", closefd=False) as stream:
            data = stream.read(4097)
        require(len(data) <= 4096, "credentials exceed input bound")
        try:
            value = parse_json(data.decode("utf-8"))
        except UnicodeError:
            raise Refusal("invalid credential encoding") from None
    finally:
        os.close(fd)
    require(isinstance(value, dict) and set(value) == {"AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"}, "credential keys differ")
    require(all(isinstance(x, str) and 1 <= len(x.encode()) <= 512 and all(32 < ord(c) < 127 for c in x) for x in value.values()), "invalid credentials")
    return value


def launchctl(*args):
    return subprocess.run(["/bin/launchctl", *args], stdin=subprocess.DEVNULL,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90, check=False).returncode


def job_state(label):
    require(label in LABELS.values(), "unknown launchd label")
    result = subprocess.run(["/bin/launchctl", "print", "system/" + label], stdin=subprocess.DEVNULL,
                            capture_output=True, timeout=5, check=False)
    if result.returncode == 0:
        return "loaded"
    missing = ('Could not find service "' + label + '"').encode()
    return "absent" if result.returncode == 113 and missing in result.stderr else "unavailable"


def read_installation(prefix):
    prefix = absolute(str(prefix))
    no_links(prefix)
    for path in (prefix, prefix / "installation.json"):
        info = path.stat()
        require(info.st_uid == 0 and not info.st_mode & 0o022, "installation owner or mode differs")
    record = read_json(prefix / "installation.json", 64 * 1024)
    require(record.get("schema") == "dap-mac-host@1" and record.get("prefix") == str(prefix) and record.get("labels") == LABELS, "unknown installation")
    require(isinstance(record.get("files"), dict), "invalid installation inventory")
    require(record.get("bucket") == BUCKET and record.get("endpoint") == ENDPOINT, "unknown store address")
    return record


def aws_request(prefix, method, key, body=b""):
    """One curl SigV4 request. Credentials travel through stdin, never argv or output."""
    prefix = absolute(str(prefix))
    record = read_installation(prefix)
    require(method in ("GET", "HEAD", "PUT", "DELETE"), "unsupported store method")
    require(isinstance(key, str) and len(key.encode()) <= 2048 and not any(ord(c) < 32 or ord(c) == 127 for c in key), "invalid store key")
    require(not key.startswith("/") and not any(part in (".", "..") for part in key.split("/")), "store key escapes bucket")
    require(isinstance(body, bytes) and len(body) <= 1024 * 1024, "store input exceeds bound")
    require(method == "PUT" or not body, "body requires PUT")
    credentials = private_credentials(prefix / "private/aws.json", record["uid"])
    path = "/" + BUCKET + ("/" + urllib.parse.quote(key, safe="/-_.~") if key else "")
    with tempfile.TemporaryFile(dir=prefix / "private") as payload:
        payload.write(body)
        payload.flush()
        payload.seek(0)
        options = {"url": ENDPOINT + path, "request": method, "aws-sigv4": "aws:amz:us-east-1:s3",
                   "user": credentials["AWS_ACCESS_KEY_ID"] + ":" + credentials["AWS_SECRET_ACCESS_KEY"],
                   "proxy": "", "noproxy": "*", "proto": "=http", "max-time": "5", "connect-timeout": "2",
                   "max-filesize": "1048576", "retry": "0", "write-out": "\n%{http_code}"}
        if method == "PUT":
            options["data-binary"] = "@/dev/fd/" + str(payload.fileno())
        config = "silent\n" + "".join(name + " = " + json.dumps(value) + "\n" for name, value in options.items())
        # -q comes first so no private user curlrc can enable tracing, redirects, or another endpoint.
        process = subprocess.Popen(["/usr/bin/curl", "-q", "--config", "-"], stdin=subprocess.PIPE,
                                   stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                   pass_fds=(payload.fileno(),),
                                   env={"PATH": "/usr/bin:/bin", "LANG": "C"})
        result = bytearray()
        deadline = time.monotonic() + 7
        try:
            process.stdin.write(config.encode())
            process.stdin.close()
            with selectors.DefaultSelector() as selector:
                selector.register(process.stdout, selectors.EVENT_READ)
                while selector.get_map():
                    remaining = deadline - time.monotonic()
                    require(remaining > 0, "store request deadline elapsed")
                    for event, _ in selector.select(remaining):
                        block = os.read(event.fileobj.fileno(), 65536)
                        if not block:
                            selector.unregister(event.fileobj)
                        else:
                            result.extend(block)
                            require(len(result) <= 1024 * 1024 + 4, "store response exceeds bound")
            require(process.wait(timeout=max(0.01, deadline - time.monotonic())) == 0, "store request failed")
            content, separator, status = bytes(result).rpartition(b"\n")
            require(separator and re.fullmatch(rb"[1-5][0-9]{2}", status), "invalid store response status")
            return int(status), content
        finally:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=2)
            process.stdout.close()
            if not process.stdin.closed:
                process.stdin.close()


def install(args):
    config, user = configuration(read_json(absolute(args.config)))
    files = rendered(config)
    if args.render:
        require(args.credentials is None, "render takes no private input")
        new_tree(absolute(args.render), files)
        print(json.dumps({"rendered": True, "files": len(files)}))
        return
    require(sys.platform == "darwin" and os.geteuid() == 0, "install requires sudo on macOS")
    prefix = absolute(config["prefix"])
    install_parent(prefix)
    require(args.credentials is not None, "private credentials file is required")
    credentials = private_credentials(absolute(args.credentials), user.pw_uid)
    no_links(prefix)
    require(not prefix.exists(), "installation prefix already exists; preserve its data")
    for name in ("celld", "weed", "caddy"):
        binary = absolute(config[name])
        regular(binary)
        require(os.access(binary, os.X_OK), "service binary is not executable")
    curl = subprocess.run(["/usr/bin/curl", "-q", "--help", "all"], capture_output=True, timeout=5, check=False)
    require(curl.returncode == 0 and len(curl.stdout) <= 256 * 1024 and b"--aws-sigv4" in curl.stdout, "system curl needs AWS SigV4 support")
    version = subprocess.run(["/usr/bin/sudo", "-n", "-u", user.pw_name, "--", config["celld"], "--version"],
                             env={"HOME": user.pw_dir, "PATH": "/usr/bin:/bin", "LANG": "C"}, capture_output=True, timeout=10, check=False)
    pin = files["config/celld.version"].decode().strip()
    require(version.returncode == 0 and len(version.stdout) <= 4096 and any(token in (pin, pin[1:]) for token in version.stdout.decode().split()), "celld does not match maintained pin")
    regular(absolute(config["certificate"]))
    key = regular(absolute(config["privateKey"]))
    require(key.st_uid == user.pw_uid and stat.S_IMODE(key.st_mode) == 0o600, "TLS key must be owned by the service user with mode 0600")
    for label in LABELS.values():
        path = Path("/Library/LaunchDaemons") / (label + ".plist")
        require(not path.exists() and not path.is_symlink(), "launchd destination already exists")
        require(job_state(label) == "absent", "launchd label is loaded or unavailable")
    new_tree(prefix, files)
    for name in ("logs", "data", "data/seaweedfs", "data/celld", "data/caddy", "data/caddy-config", "private"):
        path = prefix / name
        path.mkdir(mode=0o700)
        os.chown(path, user.pw_uid, user.pw_gid)
    write_new(prefix / "private/aws.json", encoded(credentials), 0o600, user)
    s3 = {"identities": [{"name": "dap-host", "credentials": [{"accessKey": credentials["AWS_ACCESS_KEY_ID"], "secretKey": credentials["AWS_SECRET_ACCESS_KEY"]}], "actions": ["Admin", "Read", "Write", "List", "Tagging"]}]}
    write_new(prefix / "private/seaweed-s3.json", encoded(s3), 0o600, user)
    installed = {}
    for name, data in files.items():
        path = prefix / name
        installed[str(path)] = hashlib.sha256(data).hexdigest()
        if name.startswith("plists/"):
            path = Path("/Library/LaunchDaemons") / Path(name).name
            write_new(path, data)
            installed[str(path)] = hashlib.sha256(data).hexdigest()
    record = {"schema": "dap-mac-host@1", "user": user.pw_name, "uid": user.pw_uid,
              "prefix": str(prefix), "node": config["node"], "labels": LABELS,
              "bucket": BUCKET, "endpoint": ENDPOINT, "listen": "127.0.0.1:28900",
              "internalListen": "127.0.0.1:28901", "operatorUrl": "http://127.0.0.1:28901",
              "logs": {name: {"stdout": str(prefix / "logs" / (name + ".stdout.log")), "stderr": str(prefix / "logs" / (name + ".stderr.log"))} for name in LABELS},
              "files": installed}
    write_new(prefix / "installation.json", encoded(record))
    # A partial start retains every installed file and all private custody for inspection.
    for name in ("seaweedfs", "celld", "caddy"):
        require(launchctl("bootstrap", "system", "/Library/LaunchDaemons/" + LABELS[name] + ".plist") == 0, "launchd bootstrap failed; preserve installation")
    print(json.dumps({"installed": True, "prefix": str(prefix), "labels": LABELS}))


def uninstall(args):
    require(sys.platform == "darwin" and os.geteuid() == 0, "uninstall requires sudo on macOS")
    prefix = absolute(args.prefix)
    record = read_installation(prefix)
    plists = {Path("/Library/LaunchDaemons") / (label + ".plist") for label in LABELS.values()}
    for name, digest in record["files"].items():
        path = absolute(name)
        require(path.is_relative_to(prefix) or path in plists, "unknown installed path")
        regular(path)
        require(hashlib.sha256(path.read_bytes()).hexdigest() == digest, "installed file changed; refusing removal")
    require(all(str(path) in record["files"] for path in plists), "installation omits launchd files")
    for label in LABELS.values():
        require(job_state(label) == "absent", "run the reviewed down procedure before uninstall")
    for label in LABELS.values():
        (Path("/Library/LaunchDaemons") / (label + ".plist")).unlink()
    print(json.dumps({"removedLaunchDaemons": True, "retainedPrefix": str(prefix), "dataDeleted": False}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("install")
    create.add_argument("--config", required=True)
    create.add_argument("--credentials")
    create.add_argument("--render")
    remove = commands.add_parser("uninstall")
    remove.add_argument("--prefix", required=True)
    args = parser.parse_args()
    try:
        (install if args.command == "install" else uninstall)(args)
    except Refusal as error:
        # Refusal messages are fixed local descriptions, never provider bodies or input values.
        print("Host kit refused: " + str(error) + ". Preserve existing files.", file=sys.stderr)
        return 1
    except (OSError, subprocess.SubprocessError):
        # Do not print input JSON, private paths, provider output, or exception details.
        print("Host kit refused the operation; preserve existing files and inspect the inputs.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
