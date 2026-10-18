# Bound the generated Counting witness

Request `833d1cab`, promise `a39aa4f8`. This work bounds the generated
Counting Node test process. It does not identify the original intermittent
stall or resolve the broader gate-stability request `1d3a13e3`.

## Original observation

The [standing-entry note](2026-10-16-standing-entry-reservations.md#corrected-gate-and-bounded-counting-completion)
records the failed gate at `7b62ad2d`. Its generated client child waited
for more than five minutes with negligible CPU use and no sockets. All
nine cases in that exact generated client passed in a separate bounded
diagnostic. The original gate remains failed; that diagnostic is no
replacement for its missing completion.

The requested first check used `pmset -g log`. No Sleep, Wake or DarkWake
transition was recorded between the wrapper file's observed creation at
09:19:00.642150 and last write at 09:28:59.357824 Eastern on 16 October.
Those are filesystem timestamps, not independently captured process
start and end times. The absence of those power records establishes no
root cause. Only transition records were selected; assertion and
input-device logs were excluded.

## Changed behavior

`test-browser.mjs` keeps its four generated entry points, current-source
checks, locked dependency checks and retained build inventory. It now
uses `node-witness.mjs` instead of waiting synchronously without a bound.
No package or lockfile changes are needed for the helper.

The child runs the current Node executable with `--test` and a 30-second
per-test timeout. A separate 120-second deadline bounds the child from
spawn through close, including module loading and teardown. These limits
are test-harness limits, not application response-time guarantees.

An ordinary child exit preserves its code. Spawn failure returns 1. A
whole-child deadline returns 124 and names the generated files and limit.
SIGINT and SIGTERM stop the owned child and return 130 or 143. Cleanup
precedes diagnostic reporting; a failed reporting callback cannot skip
cleanup. Production output continues to stream. Focused subprocess
probes can capture a bounded tail of output.

On POSIX, the child starts a separate process group. Deadline and
interruption kill that owned group, including Node's test worker. On
Windows, the helper kills only the direct child; descendant cleanup has
not been established there, and the process-group probe is skipped.
No claim of Windows process-tree cleanup is made.

The child receives a fresh runner environment without `NODE_OPTIONS`,
`NODE_PATH` or `NODE_TEST_CONTEXT`. It receives no new package, provider
access or deployment configuration.

## Evidence and limits

Four focused subprocess probes pass. They distinguish a named per-test
timeout from a whole-child deadline, a module that never starts a case,
a completed body whose teardown still holds the process, and interruption
that must release the test worker's owned loopback listener. The module
probe also makes diagnostic reporting throw after cleanup.

The real four generated files then passed all 55 Counting cases through
this runner, with no failures, skips or cancellations. The Node test
report took 1697.19 milliseconds. This shows ordinary completion through
the changed runner, not reproduction or diagnosis of the original stall.

One isolated negative control replaced process-group cleanup with
direct-parent cleanup. The interruption probe failed because its owned
worker listener was still reachable. Test cleanup stopped that group.
The helper was restored byte for byte; the same probe then passed.
No source-dependent process was live when the source was restored.

An initial development probe exposed an incorrect `basename` callback
and cleanup ordering in the unreviewed helper. Both were repaired before
the four-probe pass. The two identified leftover groups from that first
run were stopped. Those failed development results remain failed.

Focused evidence is retained in `/tmp/artroom-counting-bounded-focused3.log`,
`/tmp/artroom-counting-bounded-real-20261018.log`,
`/tmp/artroom-counting-parent-only-control-20261018.log` and
`/tmp/artroom-counting-cleanup-restored-20261018.log`. Power evidence is
`/tmp/artroom-counting-stall-power-evidence-20261018.json`.
Exact-head gate, review and landing outcomes belong to Gitseq. None is
claimed by this preparation checkpoint. In particular, this helper does
not bound Vitest, esbuild, installation or the complete gate.
