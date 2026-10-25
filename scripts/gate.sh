#!/bin/bash
# The complete gate, once at the head sent for review. See docs/testing.md.
cd "$(dirname "$0")/.." || exit 2
force=${1:-}
out=$(mktemp -d) || exit 2
test_evidence="$out/test-evidence"
failed=0

finish() {
  local status=$? summary_code
  trap - EXIT INT TERM
  if [ "$status" = 0 ] && [ "$failed" != 0 ]; then status=$failed; fi
  # This also reports five unreached stages when a pre-test check failed.
  node scripts/test-summary.mjs "$test_evidence"
  summary_code=$?
  if [ "$summary_code" != 0 ]; then
    echo "test summary failed: exit $summary_code" >&2
    if [ "$status" = 0 ]; then status=$summary_code; fi
  fi
  if [ "$status" = 0 ]; then
    echo "gate passed; logs in $out"
  else
    echo "gate FAILED; logs in $out"
  fi
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

step() { # name command...
  local name=$1; shift
  /usr/bin/time -p -o "$out/$name.time" "$@" > "$out/$name.log" 2>&1; local code=$?
  local real user sys
  real=$(awk '/^real/{print $2}' "$out/$name.time"); user=$(awk '/^user/{print $2}' "$out/$name.time"); sys=$(awk '/^sys/{print $2}' "$out/$name.time")
  printf "%-10s exit %s  elapsed %6.1f s  cpu %6.1f s\n" "$name" "$code" "$real" "$(echo "$user + $sys" | bc)"
  if [ "$code" != 0 ]; then
    if [ "$failed" = 0 ]; then failed=$code; fi
    echo "--- last lines of $out/$name.log"; tail -40 "$out/$name.log"
  fi
  return "$code"
}

lock=$(shasum -a 256 package-lock.json | cut -d' ' -f1)
stamp=node_modules/.artroom-lock-sha256
echo "head $(git rev-parse HEAD)  tree $(git rev-parse 'HEAD^{tree}')  changed files $(git status --porcelain | wc -l | tr -d ' ')"
if [ "$force" = "--ci" ] || [ ! -f "$stamp" ] || [ "$(cat "$stamp")" != "$lock" ]; then
  step install npm ci && echo "$lock" > "$stamp"
else
  echo "install    skipped: dependency view was verified against this package-lock.json"
fi
base=$(git merge-base HEAD origin/main 2>/dev/null)
if [ "$failed" = 0 ] && [ -n "$base" ]; then step whitespace git diff --check -B "$base"; fi
[ "$failed" = 0 ] && step commit-messages node scripts/check-commit-messages.mjs "$base" HEAD
[ "$failed" = 0 ] && step commit-test node --test scripts/check-commit-messages.test.mjs
[ "$failed" = 0 ] && step helpers node scripts/check-shared-helpers.mjs
[ "$failed" = 0 ] && step citations node scripts/check-section-citations.mjs --report "$out/section-citations.json"
[ "$failed" = 0 ] && step cite-test node --test scripts/check-section-citations.test.mjs
[ "$failed" = 0 ] && step doc-links node scripts/check-doc-links.mjs
[ "$failed" = 0 ] && step typecheck npm run typecheck
# npm's unchanged pretest hook prepares compatibility once. The fixed test
# owner defers its summary to this gate's unconditional EXIT finalizer.
[ "$failed" = 0 ] && step test npm test -- --defer-summary --evidence "$test_evidence"
if [ -f "$out/test.log" ]; then
  grep -h "Tests \|ℹ pass\|Test evidence:\|plain timing:\|native timing:\|plain progress:\|native progress:" "$out/test.log" | sed 's/^ */  /'
fi
exit "$failed"
