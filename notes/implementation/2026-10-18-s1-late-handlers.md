# S1: late handlers — development checkpoint

This is unfinished work under request `4353d842ce797515e7a369ceae6515c9efaa547b`,
promise `6201d371095659784d6c68f4e5dfbeb5c4c5eac6`, and parent S1 request
`b42d3b741986eb8f171e353ad3cb3704f202be9b`. It has no final gate, review,
landing, publication or deployment. The initial base is `b44a8e255`, the
earlier source-order candidate; its F1 correction must be incorporated.
The source-order review checkouts and evidence remain frozen.

The behavior follows planner decision `a692fd0d` (ratified `5a8f1709`):
the source entry's verified time plus the declared integer seconds is the
deadline. Equality is fresh. A late request either records a refused
decision with reason `{code: "late", name: <declared reason>}` and one
authenticated result, or executes the replacement body. Every such time
judgment checks clock-behind before writing. Exact repeat returns the
existing decision. The branch marker belongs only to an applied delivery;
replay and result clauses reconstruct the actual selected branch from it.
Acts have no late form. S3–S5 sequencing and allocation are outside S1.

The replacement shares fields, opens and also selectors. Its effects,
sends and attention replace the normal lists; omitted lists are empty.
It evaluates no normal guards. Validation gives it a separate context,
so it cannot borrow a normal guard's proof or omit required values in a
newly opened record. Static creation closure, result-clause retention,
timed-kind validation and both ordinary and trusted platform request
capacity include the replacement sends. Folded request reservations select
the recorded branch's send path. This does not scan journal history or run
two handler bodies.

`late` is currently rejected on advisory and native item-bound handlers.
Advisories have no request decision/result. Native item-bound settlement
composition is not implemented. Decision request `df405e9433acbfde95b792e63c3fd5c71b2fd5ea`
asks the planner to confirm request-only support and the proposed narrower
restriction on replacement branches of native reserved receiver handlers.
That latter restriction is **not implemented in this checkpoint**: an
empty late replacement on an export-license handler could still omit the
normal license effect and leave its numbered pin undecided. Do not ship
this checkpoint. No-then late refusal already uses the native refusal
record effect; its witness checks pin debit and unchanged exact repeat.

## Witnesses and their limits

`derive/test/late.test.ts` has twelve cases. They cover normal/boundary/late
decisions and effects, one authenticated result, actual sender consumption
of refused and applied results, exact repeat, clock-behind with no entry,
negative apparent latency, normal-guard exclusion and rule preparation,
separate validation and required openings, actual normal/late result-clause
reconstruction under whole-scope capacity, the native item-bound refusal,
trusted platform replacement request capacity, and native receiver-pin
debit on late refusal. These are real validator/judge/fold/MemoryState
interfaces. Fixture grants and the task source for the pin case are
scripted; they prove no native authority, provider or storage behavior.

`replay/test/late.test.ts` replays both outcomes around the exact boundary
and rejects a rehashed journal whose branch marker or refusal reason is
changed. `scope/test/late.test.ts` runs the six branch/time combinations
against actual NET Durable Objects and SQLite, consumes the authentic
late refusal at the sender, evicts before exact repeat, checks a later
clock-behind attempt adds no entry, and replays the actual journals.
Its clock, grants, reads and transport are explicit stand-ins; it makes no
live provider or production authority claim.

The native creation-edge witness now includes a digest reachable only
from a late replacement. The package closure witness uses the shared
declaration reader through the v1 codec: missing child bytes refuse before
signing; the complete signed package includes the edge and reads back.
It is no native install or v2 projection-binding witness.

## Checks so far

The initial derive run passed four cases; branch reconstruction increased
it to seven. The initial combined native/replay run passed three files /
nine cases in `/tmp/artroom-s1-late-native-replay-initial-20261018.log`.
Rule preparation and opening checks passed nine derive cases in
`/tmp/artroom-s1-late-rule-opening-context-20261018.log`. Whole-scope sends
and native item binding passed ten; native pin refusal then passed eleven.
The current twelve pass in
`/tmp/artroom-s1-late-platform-capacity-slot-20261018.log`.

The strict-time paired control changes `<` to `<=`: eleven cases pass
before the change; both boundary witnesses fail by assertion with it;
the source is restored. Log
`/tmp/artroom-s1-late-strict-time-control-20261018.log`. The later platform
capacity case does not change that witness or guard. A second control
removes replacement bodies from trusted reservation planning: twelve pass
before; the platform capacity assertion fails; the source is restored.
Log `/tmp/artroom-s1-late-platform-capacity-control-20261018.log`.

The original combined typecheck command ended 0 because its final replay
compiler passed, but Scope failed for a missing `late` metric table entry.
That failure is retained in
`/tmp/artroom-s1-late-scope-type-witnesses-20261018.log`. A subsequent
compiler caught the branch union narrowing and missing MCP reason tables
in `/tmp/artroom-s1-late-scope-type-metrics-20261018.log`; those were fixed,
and Scope source compilation passes in
`/tmp/artroom-s1-late-scope-type-closed-reasons-20261018.log`.
Derive test compilation passes in
`/tmp/artroom-s1-late-derive-type-capacity-slot-20261018.log`.

The package-closure fixture initially failed because copied role metadata
named an absent action, then because v2 requires bound projections for
every definition, then because empty projections are invalid. Those
attempts are retained in the `artroom-s1-late-create-closure-*` logs. The
fixture now deliberately uses the shared reader through v1; all three
package cases pass in
`/tmp/artroom-s1-late-shared-create-closure-20261018.log`. The platform
capacity fixture initially used an unsupported direct sender target;
it now sets and reads a typed peer slot. Both failed diagnostic logs and
compiler errors remain, alongside the corrected pass.

Dependencies are a private APFS COW view, 106 versions / 13 internal
workspace links, no installs and unchanged lock SHA-256
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.
Audit `/tmp/artroom-s1-late-dependency-view-20261018.json`, SHA-256
`4d7e4de0d5e65175578733b3717ea4c78f2e2e4c6ffacbbb4ed6567e924dd94f`.
These are focused checks, not a complete gate or measured total edit cost.
Page assets must be regenerated after the shared validator is final.
