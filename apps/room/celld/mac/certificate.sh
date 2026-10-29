#!/bin/bash
# Generate local TLS material without changing any trust store.
set -e
umask 077

usage() {
  cat <<'USAGE'
Usage: certificate.sh --cert /absolute/cert.pem --key /absolute/key.pem
                      [--name host.local ...] [--ip 192.168.1.52 ...]
                      [--days 825]

Create a self-signed EC P-256 certificate with serverAuth and SAN entries.
Give at least one DNS name or IP address. The lifetime is 1 to 825 days.
DNS names must use ASCII labels; IPv6 addresses must use hexadecimal groups.
Both parent directories must exist. Existing outputs are never overwritten.
This command does not install or trust the certificate.
USAGE
}

fail() { printf 'certificate.sh: %s\n' "$*" >&2; exit 1; }

valid_name() {
  local name=$1 label
  local labels=()
  [[ ${#name} -le 253 && "$name" =~ ^[A-Za-z0-9.-]+$ && "$name" != .* && "$name" != *. ]] || return 1
  IFS=. read -r -a labels <<< "$name"
  for label in "${labels[@]}"; do
    [[ ${#label} -ge 1 && ${#label} -le 63 && "$label" =~ ^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$ ]] || return 1
  done
  [[ ${#labels[@]} -gt 0 ]]
}

valid_ipv4() {
  local address=$1 octet
  local octets=()
  [[ "$address" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || return 1
  IFS=. read -r -a octets <<< "$address"
  for octet in "${octets[@]}"; do
    [[ ${#octet} -le 3 && ( "$octet" == 0 || "$octet" != 0* ) ]] || return 1
    [[ $((10#$octet)) -le 255 ]] || return 1
  done
}

valid_ip() {
  local address=$1 before after side group count=0 compressed=false
  local groups=()
  if [[ "$address" != *:* ]]; then valid_ipv4 "$address"; return; fi
  [[ "$address" =~ ^[0-9A-Fa-f:]+$ && "$address" != *:::* ]] || return 1
  if [[ "$address" == *::* ]]; then
    compressed=true
    before=${address%%::*}; after=${address#*::}
    [[ "$after" != *::* ]] || return 1
  else
    before=$address; after=
  fi
  for side in "$before" "$after"; do
    [[ -n "$side" ]] || continue
    [[ "$side" != :* && "$side" != *: ]] || return 1
    IFS=: read -r -a groups <<< "$side"
    for group in "${groups[@]}"; do
      [[ ${#group} -ge 1 && ${#group} -le 4 ]] || return 1
      count=$((count + 1))
    done
  done
  if [[ "$compressed" == true ]]; then [[ $count -lt 8 ]]; else [[ $count -eq 8 ]]; fi
}

output_path() {
  local path=$1 parent name
  [[ "$path" == /* && "$path" != *$'\n'* && "$path" != *$'\r'* ]] || fail 'output paths must be absolute and on one line'
  parent=${path%/*}; name=${path##*/}; parent=${parent:-/}
  [[ -n "$name" && "$name" != . && "$name" != .. ]] || fail 'each output needs a filename'
  [[ -d "$parent" ]] || fail "output parent does not exist: $parent"
  parent=$(CDPATH= cd "$parent" && pwd -P) || fail 'cannot resolve output parent'
  printf '%s/%s\n' "${parent%/}" "$name"
}

cert= key= days=825 days_set=false cert_set=false key_set=false
names=(); addresses=()
if [[ $# -eq 1 && "$1" == --help ]]; then usage; exit 0; fi
while [[ $# -gt 0 ]]; do
  [[ $# -ge 2 && "$2" != --* ]] || fail "missing value for $1"
  case "$1" in
    --cert) [[ "$cert_set" == false ]] || fail '--cert was given twice'; cert=$2; cert_set=true ;;
    --key) [[ "$key_set" == false ]] || fail '--key was given twice'; key=$2; key_set=true ;;
    --days) [[ "$days_set" == false ]] || fail '--days was given twice'; days=$2; days_set=true ;;
    --name) names+=("$2") ;;
    --ip) addresses+=("$2") ;;
    *) fail "unknown option: $1" ;;
  esac
  shift 2
done

# Complete argument checks before creating staging files or output files.
[[ -n "$cert" && -n "$key" ]] || fail '--cert and --key are required'
[[ "$days" =~ ^[1-9][0-9]{0,2}$ && "$days" -le 825 ]] || fail '--days must be an integer from 1 to 825'
[[ $((${#names[@]} + ${#addresses[@]})) -gt 0 ]] || fail 'at least one --name or --ip is required'
for name in "${names[@]}"; do valid_name "$name" || fail "invalid DNS name: $name"; done
for address in "${addresses[@]}"; do valid_ip "$address" || fail "invalid IP address: $address"; done
cert=$(output_path "$cert"); key=$(output_path "$key")
[[ "$cert" != "$key" ]] || fail 'certificate and key paths must differ'
[[ ! -e "$cert" && ! -L "$cert" && ! -e "$key" && ! -L "$key" ]] || fail 'certificate or key already exists'
openssl_bin=$(command -v openssl) || fail 'openssl is required'

stage= cert_stage= key_open=false cert_open=false complete=false
cleanup() {
  local result=$?
  trap - EXIT
  if [[ "$complete" != true ]]; then
    # Retain another creator's file if either pathname changed after creation.
    if [[ "$cert_open" == true && "$cert_stage/cert.pem" -ef "$cert" ]]; then rm -f "$cert"; fi
    if [[ "$key_open" == true && "$stage/key.pem" -ef "$key" ]]; then rm -f "$key"; fi
  fi
  [[ -z "$stage" ]] || rm -rf "$stage"
  [[ -z "$cert_stage" ]] || rm -rf "$cert_stage"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
stage=$(mktemp -d "${key%/*}/.dap-certificate.XXXXXXXX")
cert_stage=$(mktemp -d "${cert%/*}/.dap-certificate.XXXXXXXX")
if [[ ${#names[@]} -gt 0 ]]; then common_name=${names[0]}; else common_name=${addresses[0]}; fi
# A valid DNS SAN may exceed the subject common-name limit.
if [[ ${#common_name} -gt 64 ]]; then common_name='dap local TLS'; fi
{
  printf '[req]\nprompt = no\ndistinguished_name = subject\nx509_extensions = server\n'
  printf '[subject]\nCN = %s\n' "$common_name"
  printf '[server]\nbasicConstraints = critical,CA:FALSE\n'
  printf 'keyUsage = critical,digitalSignature\n'
  printf 'extendedKeyUsage = serverAuth\nsubjectAltName = @names\n[names]\n'
  n=0; for name in "${names[@]}"; do n=$((n + 1)); printf 'DNS.%s = %s\n' "$n" "$name"; done
  n=0; for address in "${addresses[@]}"; do n=$((n + 1)); printf 'IP.%s = %s\n' "$n" "$address"; done
} > "$stage/request.cnf"
"$openssl_bin" ecparam -name prime256v1 -genkey -noout -out "$stage/key.pem"
"$openssl_bin" req -new -x509 -sha256 -days "$days" -key "$stage/key.pem" -config "$stage/request.cnf" -out "$cert_stage/cert.pem"

# POSIX link uses an exact destination; unlike ln, it never places the
# source inside a raced destination directory. Staging is on the same FS.
if ! /bin/link "$stage/key.pem" "$key"; then fail 'key output was created by another writer'; fi
key_open=true
if ! /bin/link "$cert_stage/cert.pem" "$cert"; then fail 'certificate output was created by another writer'; fi
cert_open=true
complete=true
printf 'Certificate: %s\nPrivate key: %s\n' "$cert" "$key"
