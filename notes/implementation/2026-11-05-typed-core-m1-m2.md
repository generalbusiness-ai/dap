# Execute and inspect the first typed derivation slice

## What changed

Gitseq source request `1d235b6afb9d435e2d26a334bf08b01da7c7f499`, under
`e99550e9bfedcde3bed05bae1d345fcbfe5f7c9a`, delivers M1–M2 of
[plan 035](../plans/035-2026-11-04-typed-derivation-core.md).
The internal `program/*` modules lower the supported act body into closed data,
execute it, explain a captured refusal, and collect conservative dependencies.
The existing judges keep their production route.

The source starts from retained experiment
`27d0e2687687dce9cd242717d0d4b34eee11ce3b` on landed main
`2883992093b5b2ea54a220dea7f81da0f34cee44`. The Destination 19 timed-opening
fix remains byte-identical to the approved cohort candidate and that main.
Its actual `judge.ts` SHA256 is
`86222a9f4c1ff665232b470384bc82c095c0e1e175636eb8fae7859277f54959`.

The first slice covers Grow `water`, state and strict time guards, prepared
Booleans, implicit opening, ordinary assignments, conditional tells with empty
result clauses, and the existing finality, required-slot, and live-item checks.
The lowerer reports unsupported paths before any execution. The representation
has no public export, new package, wire format, or callback for application logic.

## Decisions and reasons

Expressions keep invariant descriptor and phase parameters. Resolved handles
belong to one admitted definition and act. The program builder checks nominal
`self` types against that act and definition. It freezes children even when a
caller already froze their parent container. These two checks close gaps in the
retained experiment's manual construction path.

Concrete execution shares the existing prepared-rule matcher, value
normalization, item mutations, and reference encoding. The small `preparedRule`
and `sendValue` extractions retain the production callers and their behavior.
No node calls a whole legacy guard, effect, send, or body interpreter.

Each evaluation allocates its own collectors and working subjects. The witnesses
compare the complete `Ran`, consumed preparation, and collected rule inputs
against the legacy body. They also assert literal results. Conditions read the
before state, payloads read the working state, and omitted tells consume no
ordinal. Optional absence leaves a slot unchanged; explicit clear records null.

Explanation observes one concrete evaluation. Exhausting its budget stops trace
collection and leaves execution and primitive counts unchanged. For example,
the captured Grow refusal says:

```text
acts.water.guards.1: after failed (subject="also.policy", deadline="2026-10-04T12:01:40Z", clock="2026-10-04T12:01:40Z").
```

This command-line display uses scripted resolved state. It shows the source path,
actual deadline, and supplied time beyond the current selected guard. It does
not claim a live card integration. Prepared rule bodies remain explicitly opaque.

The dependency visitor walks skipped alternatives and records implicit inputs,
including finality, counts, reference encoding, and whole prepared inputs.
The unused optional-field witness holds the other inputs fixed. These bounded
witnesses establish no general independence theorem or reevaluation policy.

The useful replacement begins at M3: cover every structural clock form, switch
both production callers, then delete `readsClock`, `conditionsReadClock`, and
`timesEffect`. M4–M7 replace each complete family's caller set and dispatcher;
M8 replaces body orchestration and removes the whole-body fallback. Shared
normalization, scans, faults, and item mutations retain their domain meaning.
The [coverage inventory](../2026-11-04-typed-core/coverage.md) fixes those later
boundaries. No first-slice execution replaces them in this delivery.

Hugh's scheduling decision overrides the deletion-size gate. The earlier
[stop record](2026-11-04-typed-core-stop.md) preserves its 15.9% estimate as
history. This delivery claims no measured speedup or net deletion. The planner
requires a new estimate after M3 and owns deployment of that first production
cutover. M1–M2 needs no deployment.

## Evidence

The [focused manifest](evidence/2026-11-05-typed-core-m1-m2-focused.manifest.json)
seals the structured results and indexes every retained raw attempt. Its SHA256
is `711b60b5df1a746529b1fd679eaff4f877873436209c8efd5f19fb601941f493`.
The final runtime and test bytes match checkpoint
`1b8454bb17f9b62ec4b3ba9bf992d6c35ebff19d`.

The records contain 48 distinct passing cases across seven whole test owners,
from three focused invocations. The later 18-case program owner replaces its
earlier 17-case run in that distinct-case count. Four single-fault controls
produce assertion failures for the intended invariant and restore source.
The controls cover nominal `self`, strict time, a skipped dependency, and a
frozen parent with mutable children. Filtered cases are not passes.

| Check | Command | Exit | Manifest output and SHA256 |
|---|---|---|---|
| Owned setup and frozen baseline | `node notes/2026-11-04-typed-core/check-baseline.mjs` before prototype integration | 0 | `source-identity.json` (`7dc3b275a8504a5872476588d57a5da46211900ed5f5761297779aa6efe9ce93`), `private-retention.json` |
| Derive source and test types, Grow types | `node node_modules/typescript/bin/tsc -p <recorded config>` | 0 | `commands.json` (`48bf46e08990a0525c8baad208a8f7694b7ff7fd244481cc4203ba988707290f`) |
| Full affected guard, effect, send, handler, program, and Grow owners | Recorded Vitest command with six explicit file paths | 0, 44 cases before the final immutable-graph witness | `commands.json` (`48bf46e08990a0525c8baad208a8f7694b7ff7fd244481cc4203ba988707290f`), `cases.json` |
| Final whole program owner | `node node_modules/vitest/vitest.mjs run --project derive packages/derive/test/program.test.ts` | 0, 18 cases | `commands.json` (`48bf46e08990a0525c8baad208a8f7694b7ff7fd244481cc4203ba988707290f`), `cases.json` |
| Prepared-rule owner | `node node_modules/vitest/vitest.mjs run --project derive packages/derive/test/rule.test.ts` | 0, 3 cases | `commands.json` (`48bf46e08990a0525c8baad208a8f7694b7ff7fd244481cc4203ba988707290f`), `cases.json` |
| Four restored-source controls | Retained `control.mjs`, one fault per invocation | 0, distinguishes | `controls.json` (`4ff4348db18629d65b60aa73fe1c0ee332db1b18c3b6613bcb5c38a195c3f5e0`) |
| Grow refusal display | Recorded Node command with the existing pinned `tsx` loader | 0 | `consumer.txt` (`f119082a69ebc3007ca6a9cd79d0ee651502711ee757c0bf4f0546b95ace40ab`) |
| Complete gate | `npm run gate` | 0 | Gate manifest, `result.json` (`0df62b264be169deff86e80f429f974d8c0c7f935e8f279e9c008fa73aa3ac3b`) |

`commands.json` retains exact commands, actual exits, and per-command wall and
child CPU measurements. Those sums are not a pipeline measurement. The consumer
retains Node's loader deprecation warning. The first test compiler attempt
failed on the new witness's invariant generic annotation; its body never ran.
The corrected compiler and later whole owner pass. The setup recovery also
retains its rejected relative-link guard and a whole-file guard that mistook a
source-seal digest for a file hash.
Neither guard changed source before stopping. No package installation occurred.

The [gate manifest](evidence/2026-11-05-typed-core-m1-m2-gate.manifest.json)
has SHA256 `da627ed4df01ecb967a8d383f268bf9d0c62714df987f88bd19fa4eca1876bcf`. Its 13 public files index 2,283 private originals.
The actual `gate.exit` reads `exit 0` at head
`1ccf37e021e21ef4f119cc969468dbc7fe1f0fd3`, tree
`9b9d523126eecde6955c9032a8f64f206cbdc087`. All five terminal stages pass:
kernel; 135 Node cases; 56 Counting cases; 3,943 plain passes with one skip;
and 1,103 Native passes with two skips. Both Vitest ends report zero unhandled
errors. The summary reports complete terminal coverage and no contradictions.
Its 99 extra Node events describe 33 entry-file wrappers outside the case count.
The only missing final module duration belongs to the skipped Page record owner.

The gate records UTC 05:14:30.125262–05:40:49.715631 on 5 November.
Its Python monotonic measurement is 1,579.596911 seconds; the retained outer
`time` reports 1,579.50 seconds. Keep these measurements distinct. The source
and dependency identity stay unchanged, and the owned process group closes.
An idle-sleep assertion applies only during that actual gate command. This
passing run establishes no cause for the earlier cohort failures, which remain
failed. The 10,001-entry archive owner passes in 250,360 ms; request
`64552d409314e82829b263a430cb8ec04c06ab84` still owns its earlier unexplained stop.

An adapted finalizer first wrote the new manifest to a historical scratch
pathname. The builder retained the verified new bytes at the correct path and
restored the old scratch file from its committed manifest. No durable original
or committed historical manifest changed. A note-update attempt stopped before
changes when the expected new scratch path was absent.

Only notes change after the gate. The final review record will name that
documentation tree; production source and tests retain the exact gate bytes.

## Open limits

- Parent `e99550e9bfedcde3bed05bae1d345fcbfe5f7c9a` owns M3–M8, full vocabulary
  coverage, every production cutover, and deletion of the remaining dispatchers.
- This source request still requires independent review and landing.
  Earlier cohort failures and passing diagnostics do not excuse a new failure.
  The next gate that reaches Native must pass on its own.
- Request `64552d409314e82829b263a430cb8ec04c06ab84` retains the separate archive
  cause investigation. This delivery closes none of its findings.
- O4 request `c7a090dcf0816675808ba081dc04fc8cc702e224` retains the host tests.
  Browser control still reports an unavailable host; the invite remains unread.
- Cohort parent `8a8902f3e9ad526371cb0a73db4117bc0197cd60` retains deployment and
  real post-token-hour clone refusal. Landing source does not meet that acceptance.
