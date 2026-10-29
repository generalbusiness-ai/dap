#!/bin/sh
set -eu
HERE=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
exec /usr/bin/python3 "$HERE/service.py" caddy
