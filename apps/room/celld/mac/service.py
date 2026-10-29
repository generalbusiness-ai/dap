#!/usr/bin/env python3
"""Launch one service as the designated user, without inherited credentials."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time

from kit import Refusal, aws_request, configuration, private_credentials, read_installation, read_json, require


def fsync_enabled(output):
    """Require the bucket rule in an actual fs.configure readback, not its apply exit code."""
    try:
        text = output.decode()
        start = text.index("{")
        value, _ = json.JSONDecoder().raw_decode(text[start:])
        locations = value["locations"]
        exact = [row for row in locations if row.get("locationPrefix") == "/buckets/celld-fleet/"]
        return len(exact) == 1 and exact[0].get("fsync") is True and not any(
            row.get("locationPrefix", "").startswith("/buckets/celld-fleet/") and row.get("fsync") is False for row in locations)
    except (ValueError, KeyError, TypeError, AttributeError):
        return False


def environment(user):
    return {"HOME": user.pw_dir, "USER": user.pw_name, "LOGNAME": user.pw_name,
            "PATH": "/usr/bin:/bin:/usr/sbin:/sbin", "LANG": "en_US.UTF-8"}


def main():
    require(len(sys.argv) == 2 and sys.argv[1] in ("seaweedfs", "celld", "caddy"), "unknown service")
    name = sys.argv[1]
    prefix = Path(__file__).resolve().parent.parent
    installation = read_installation(prefix)
    require(os.getuid() == installation["uid"] and os.getuid() != 0, "wrong service user")
    config, user = configuration(read_json(prefix / "config/host.json"))
    require(config["prefix"] == str(prefix) and user.pw_uid == installation["uid"] and config["node"] == installation["node"], "installation configuration differs")
    env = environment(user)
    os.umask(0o077)
    if name == "seaweedfs":
        # No inherited AWS variables: SeaweedFS can promote them to another admin identity.
        args = [config["weed"], "-logdir=" + str(prefix / "logs"), "server",
                "-dir=" + str(prefix / "data/seaweedfs"), "-ip=127.0.0.1", "-ip.bind=127.0.0.1",
                "-master.port=27100", "-master.port.grpc=37100", "-master.telemetry=false", "-master.electionTimeout=1s",
                "-master.volumeSizeLimitMB=1024", "-volume.port=27180", "-volume.port.grpc=37180", "-volume.max=" + str(config["volumeMax"]),
                "-filer", "-filer.port=27188", "-filer.port.grpc=37188", "-s3", "-s3.port=28133", "-s3.port.grpc=37133",
                "-s3.port.iceberg=0", "-s3.port.lance=0", "-s3.config=" + str(prefix / "private/seaweed-s3.json"),
                "-metricsPort=27190", "-metricsIp=127.0.0.1"]
        os.chdir(prefix / "data/seaweedfs")
    elif name == "caddy":
        env.update({"XDG_DATA_HOME": str(prefix / "data/caddy"), "XDG_CONFIG_HOME": str(prefix / "data/caddy-config")})
        args = [config["caddy"], "run", "--config", str(prefix / "config/Caddyfile"), "--adapter", "caddyfile"]
    else:
        # Check the installed copy of the single maintained pin as the unprivileged service user.
        pin = (prefix / "config/celld.version").read_text().strip()
        version = subprocess.run([config["celld"], "--version"], env=env, capture_output=True, timeout=10, check=False)
        require(version.returncode == 0 and len(version.stdout) <= 4096 and any(token in (pin, pin[1:]) for token in version.stdout.decode().split()), "celld does not match the maintained pin")
        env.update(private_credentials(prefix / "private/aws.json", user.pw_uid))
        env.update({"AWS_REGION": "us-east-1", "CELLD_TTL_MS": "60000", "CELLD_NODE": config["node"], "CELLD_WATCH": str(prefix / "data/celld")})
        deadline = time.monotonic() + 60
        while True:
            try:
                # Apply the retained filer rule before the first readiness write.
                applied = subprocess.run([config["weed"], "shell", "-master=127.0.0.1:27100"],
                                         input=(prefix / "config/fsync.txt").read_bytes(), env=environment(user),
                                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5, check=False)
                require(applied.returncode == 0, "store fsync rule unavailable")
                readback = subprocess.run([config["weed"], "shell", "-master=127.0.0.1:27100"], input=b"fs.configure\n",
                                          env=environment(user), capture_output=True, timeout=5, check=False)
                require(readback.returncode == 0 and len(readback.stdout) <= 65536 and fsync_enabled(readback.stdout), "store fsync readback failed")
                status, _ = aws_request(prefix, "PUT", "probe/mac-host-ready/" + config["node"], b"dap host readiness\n")
                require(200 <= status < 300, "store PUT readiness failed")
                break
            except (Refusal, OSError, subprocess.SubprocessError):
                require(time.monotonic() < deadline, "store readiness deadline elapsed")
                time.sleep(2)
        args = [config["celld"], "--bucket", "s3://" + installation["bucket"], "--endpoint", installation["endpoint"],
                "--region", "us-east-1", "--listen", installation["listen"], "--internal-listen", installation["internalListen"],
                "--advertise", installation["internalListen"]]
    os.execve(args[0], args, env)


if __name__ == "__main__":
    try:
        main()
    except Refusal as error:
        print("Host service refused startup: " + str(error) + ".", file=sys.stderr)
        raise SystemExit(1)
    except (OSError, ValueError, subprocess.SubprocessError):
        print("Host service refused startup; preserve its data and inspect the private configuration.", file=sys.stderr)
        raise SystemExit(1)
