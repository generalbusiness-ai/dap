# S1: late handlers

This implementation passed its final gate and awaits review under request `4353d842ce797515e7a369ceae6515c9efaa547b`,
promise `6201d371095659784d6c68f4e5dfbeb5c4c5eac6`, and parent S1 request
`b42d3b741986eb8f171e353ad3cb3704f202be9b`. It has no review,
landing, publication or deployment. The initial base was `b44a8e255`, the
earlier source-order candidate. Its F1 correction and audited Main
`1da3f4ca79ad034286ca4d8988bed9dee022369e` are incorporated.
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

`late` is rejected on advisory and native item-bound handlers.
Advisories have no request decision/result. Native item-bound settlement
composition is not implemented. Planner report `56398945` answers decision
request `df405e9433acbfde95b792e63c3fd5c71b2fd5ea` (ratified `54fedf44`).
Validation refuses replacement branches on the listed capability's reserved
request, identified by its declared class and message, independently of the
local handler key. This prevents an empty replacement from omitting the
license effect and leaving its numbered pin undecided. The named refusals
are `late-on-advisory`, `late-on-item-bound-handler` and
`late-then-on-reserved-handler`. No-then late refusal uses the native refusal
record effect; its witness checks pin debit and unchanged exact repeat.

## Witnesses and their limits

`derive/test/late.test.ts` has fourteen cases. They cover normal/boundary/late
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

## Incorporation and relationship check

The checkpoint `0d1c53bc7` was saved before incorporating corrected source
candidate `e44b65e35`. The validator conflict was resolved by preserving
both the source-order native-bound refusal and the independent late-body
validation. Fourteen cases across the late and source-pin files passed in
`/tmp/artroom-s1-late-source-settlement-merge-20261018.log`, then merge
`32e23df53` was recorded. Actual audited Main `1da3f4ca` was incorporated
by zero-file merge `9291e1fcd`; its tree stayed `b3791dada`.
Derive, Bytes and Scope owning typechecks pass in the respective
`/tmp/artroom-s1-late-*-type-merged-20261018.log` files.

The relationship witness adds the thirteenth late case: a refused late
update writes no copy; an applied replacement advances the actual copy.
All thirteen pass in `/tmp/artroom-s1-late-relate-copy-20261018.log`.
The time and platform-capacity control targets are unchanged by this test.
Planner amendment `9ae4eb97` confirms request-only late/spacing forms;
native reserved-receiver replacement composition remains the unanswered
part of `df405e94` at that historical checkpoint. The decision below closes
that question. No final gate or completion is claimed here.

## Reserved-handler boundary

Planner decision `56398945` is implemented. All fourteen late cases pass in
`/tmp/artroom-s1-late-reserved-validation-20261019.log`; the owning Derive
test typecheck passes in `/tmp/artroom-s1-late-reserved-type-20261019.log`.
The strengthened validator witness rejects an empty replacement after the
reserved handler is renamed, admits its no-then form, and admits an ordinary
same-message application handler without the capability. It also checks the
named advisory and item-bound refusals. The existing native hold witness
still checks the numbered debit and repeat through the actual capability,
judge and fold, with scripted task source and grants as stated above.

The focused control changes the reserved-message match to a mismatch. The
unchanged witness fails because validation wrongly admits the replacement;
the source is restored. See
`/tmp/artroom-s1-late-reserved-control-exact-20261019.log` (one selected case,
thirteen filtered cases). An earlier control used a typographic apostrophe
in its expected test-name filter; the same assertion failed, but the runner
classified it inconclusive. That diagnostic remains in
`/tmp/artroom-s1-late-reserved-control-20261019.log` and is not the control
result. Page assets were regenerated from the final validator source;
`/tmp/artroom-s1-late-page-build-20261019.log` records the build.

## Final gate

The one final gate passed at code/test head
`e82eb8ff4d62f03de6e2b5725ec1434bf13e0a2f`, tree
`d546ca65d92c091cd9e6f7025d533b5ece7f19ed`. The original process 37729
closed with exit 0. It passed 391 test files and 1,893 cases; one file and
three cases were skipped. The explicit Node checks passed 31 cases and
Counter's Node checks passed 55. Assertion `b67298cc` records this result.
Only evidence prose changes after that code/test head.

The outer gate took 491.08 elapsed seconds and 687.32 CPU seconds
(589.35 user, 97.97 system). Its typecheck step took 8.15 elapsed and
31.26 CPU seconds; the test step took 482.70 elapsed and 655.82 CPU seconds.
This was a shared warm macOS 27.0.1 arm64 machine with 18 CPUs, start load
1.97 / 1.81 / 1.81, the verified private dependency view and zero installs.
Independent P1 development ran concurrently. These are one gate's measured
costs, not exclusive-machine CPU, heap use or total edit-to-review cost.

Logs are `/tmp/artroom-s1-late-gate-20261019.log`,
`/tmp/artroom-s1-late-gate-outer-20261019.time` and
`/tmp/artroom-s1-late-gate-preparation-20261019.json`. Raw step evidence is
under `/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.ZeVdFkEggH`;
Counter's explicit evidence is under the same temporary root at
`artroom-counting-node-BDogZl`. The finite review map grants only its exact
listed owned regular files, including historical diagnostics. It grants
no adjacent or private dependency-tree access. All listed files and this
checkout's source and dependencies stay frozen during review.
