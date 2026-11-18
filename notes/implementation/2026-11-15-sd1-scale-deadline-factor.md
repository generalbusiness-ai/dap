# Scale deadline factors and the fixed-case list

SD1 request `905e4ecd6383309959f4bcc9fed9f50361f19da7` and promise
`8a788b09f6ca1cd618358742fea89fee9319141c` cover this change. Planner ruling
`9b5caaebfdb15f90b18ce8dca5986cf1fca99c2b` supplies the hosted measurements
and approves the partition. Builder source plan
`63c3dc9a84e80b69beb734e65c2e480f63c7278b` records the complete arithmetic.
This source starts at NF6/NF8/FH2 head
`b0928331e8d27252c3cce357166eb7e4dc0e0da7`, tree
`5d1e0ec58baafc9a1cc91ed25077240b63a29942`.
All changed code and tests were **UNCOMPILED and UNRUN** at that source-only checkpoint. Current development and local gate results appear below; hosted validation remains owed.

## Four deadlines use the existing factor

The hosted Scale workflow sets `ARTROOM_SCALE_DEADLINE_FACTOR=3`.
`scaleDeadline` in
[archive-scale-deadline.ts](../../packages/scope/test/support/archive-scale-deadline.ts)
uses that compile-time factor in the Scale project. With no factor, it
returns the original base. The ordinary Native project does not define the
factor. No helper, configuration, workflow, Worker count, or deadline base
changes.

| Case | Original base, ms | Hosted observation | Deadline with factor 3, ms |
| --- | ---: | --- | ---: |
| Installed Grow production producer | 30,000 | 30.7 s in run 43698774458 | 90,000 |
| Installed Grow production command follower | 100,000 | 14.0 s in run 43685015257; the request explicitly requires its conversion | 300,000 |
| G15 maximum constructed capture | 275,000 | 192.3 s, above the 137.5 s half threshold | 825,000 |
| Raw proof residency, thirty-two dense frames | 162,000 | 128.7 s, above the 81 s half threshold | 486,000 |

The producer, G15, and raw-proof observations come from workflow run
43698774458 at main `d1585bda`. Each figure is one planner-reported hosted
observation, not a new measurement by this lane. The producer's last eight
hosted observations cross the old deadline both before and after E1. The
request expressly rejects an E1 regression inference from that spread.
The later command failure in the failed run followed the producer's absent
handoff; this change preserves that dependency and every assertion.

The two archive cases register in
[archive-installed.fixture.ts](../../packages/scope/test/archive-installed.fixture.ts).
That shared factory also registers eight ordinary producer scenarios. Their
Native deadline stays 30,000 ms, and the Native command deadline stays
100,000 ms. The internal archive budgets, replay-child allowance, cleanup,
clock, timers, and work bounds stay unchanged. The G15 and raw-proof bodies
also keep their exact assertions and geometry.

## Twelve fixed cases remain explicit exceptions

The initial source audit at `b0928331` found 16 fixed cases at 14 registration
sites. Four conversions leave **12 fixed cases at 10 sites**. Six cases
already used the helper, so the full Scale inventory remains
`6 + 4 + 12 = 22` cases in 13 complete owners. The word “eleven” in the
planner's prose does not match its enumerated rows; source plan `63c3dc9a`
records the corrected count without changing case selection.

In the following source paths, `S` means `packages/scope/test`, `L` means
`apps/room/lanes/test`, and `C` means `packages/cli/test`. Hosted times come
from ruling `9b5caaeb`. Its grouped figures do not bind each member to an
individual duration, so grouped rows retain the reported pair or range.

| Fixed case | Registration source | Base, ms | Planner-reported hosted time |
| --- | --- | ---: | --- |
| a real 2000-member room keeps handle uniqueness and verifies every actual scope under shipped defaults | C/fixed-slot-membership.scope.test.ts | 1,820,000 | 716.7 s |
| Native floor-kept refuses the 4097th live opening after an exact4096 kept set | S/floor-kept.test.ts | 120,000 | 41.2 s |
| native full root preserves three thousand standing entries through one thousand undelivered generations | L/directory-partition-capacity.scope.test.ts | 600,000 | 73.7 s |
| actual landing reuse follows the tree key and a fresh passed job still publishes after disagreement disables reuse | S/evidence-rules-real.fixture.ts | 240,000 | Four-case range: 33.2–55.3 s |
| real published holds survive newer counted passes and clear only through distinct authorized transition and override records | S/evidence-rules-real.fixture.ts | 240,000 | Same four-case range |
| literal native TIME holds at its own head, replays unchanged, and recovers one funded incident within the pending bound | S/evidence-rules-real.fixture.ts | 240,000 | Same four-case range |
| the real failure and reservation outcomes serialize atomically in both admitted-before-failure and failure-before-admission schedules | S/evidence-rules-real.fixture.ts | 240,000 | Same four-case range |
| two native partition roots keep cross-room block and restart release with one nineteen-call admission | L/directory-partition-lanes.scope.fixture.ts | 60,000 | 24.5 s |
| a manifest-list reservation records both files before the configured checker passes; no branch push occurs before that pass (real scopes, STAND-IN Git host and scheduler; file-publication creation) | L/manifest-tree.scope.fixture.ts | 120,000 | Pair: 47.4 and 51.5 s |
| Same manifest-list case, default creation | L/manifest-tree.scope.fixture.ts | 120,000 | Same pair |
| on artifacts: the optional manifest sequence follows shot 16, publishes both text files together and refuses a controlled two-file branch; Git capture is a STAND-IN | L/demo.scope.fixture.ts | 240,000 | Pair: 30.0 and 25.9 s |
| Same demo case, github.com host | L/demo.scope.fixture.ts | 240,000 | Same pair |

Every reported remaining case stays below half its current deadline. The
fixed-slot registration adds 20,000 ms to its existing 1,800,000 ms lifetime;
that separate internal lifetime stays unchanged. The manifest source uses
`test.for` for its two creation choices. The demo source registers both hosts
under its existing rehearsal suite. These are separate cases, not one row
per source call.

## The guard follows actual registration factories

The new case in
[scale-selection.test.mjs](../../scripts/scale-selection.test.mjs) starts from
`scopeScaleFiles`. The bounded
[scanner](../../scripts/scale-deadline-registrations.mjs) reads TypeScript
syntax with the already locked parser. It never imports or executes a
fixture. It follows named registration imports, literal parameter choices,
static loops and conditions, and the selected suite bodies. It skips test
callback bodies. Registration statements stand alone. Call initializers in
selected registration scopes fail for source review, including imported or
local factory calls. Imported registration, factory, and deadline bindings
cannot be shadowed by a selected local declaration, parameter, or loop
binding. Module imports and hoisted factories resolve before global values.
Other unknown registration forms also fail for source review.

The five factory owners select only their Scale registrations:
`registerArchiveInstalledCases(["Grow production"])`,
`registerEvidenceRulesScale`, `registerDirectoryPartitionLanesScale`,
`registerManifestTreeScale`, and `registerDemoScale`. Ordinary registrations
in the same modules do not enter this list. The other eight owners register
directly. The guard reconciles the expanded per-owner counts with the
existing inventory and compares every fixed case and base with the explicit
12-case list. A missing explicit timeout is also fixed, so a new inherited
default cannot disappear from the guard.

Within that same Node case, source-string witnesses add an unlisted fixed
case and require both discovery and rejection. They also require rejection
when a variable initializer contains the test or an imported or local factory
call, and when a local function value shadows the actual deadline import.
The latter previously let an identity function impersonate the factor
helper. These are two source-review findings after the initial checkpoint,
not observed runtime failures. All witnesses change only input strings and
run no Native fixture. They were **UNRUN assertions** at that checkpoint, not reported
control results. The later whole Node owner result below covers them. No mutation sweep or Native collection was added.

## Ownership and validation

NF6 keeps the complete archive fixture artifact, including its existing
`memoryStore` import migration and the two SD1 wrappers. This note names
that actual source path; final filing must cite its actual NF6 artifact
when the artifact exists. This checkpoint invents no artifact ID.
SD1 owns the G15 owner, raw-proof fixture, guard, scanner, and this distinct
report. NF8 and FH2 retain their existing paths. The waiting side head
originally carried four promises. Planner c168799e37d1052a7199d29506e57649d6c5c2bd
then adds LC2 to the same side head, opens current Lending/Counter 0.4.0 and
keeps signed 0.3.0 immutable. The five-request head takes the approved next
combined position. No result transfers from R.

| Check | Command or boundary | Result |
| --- | --- | --- |
| Original affected test types and registration owner | Existing Scope/lane contexts and whole Node owner | UNRUN at the named original source checkpoint |
| Current exact-head types/helpers | Required WHOLE typecheck covers Scope and lane test contexts; no extra compiler sweep | Both exited 0: helpers in 0.596663333 s, WHOLE types in 16.459192000 s; preflight outer wall 17.551862333 s, END 7300a4c1361c600fdbc52f8da3f360b4e703bd2b. `T/helpers.stdout.log` — `af00848d1b94433533085adfecd184e68584914cce159b58ead29f4dab584502`; `T/typecheck.stdout.log` — `a9abf7e40e10fbda74447d08a5ea3b33733361ecd9ac199658065cfbc874936a` |
| Current deadline helper/registration guard | `node --test scripts/scale-selection.test.mjs`, whole seven-case owner | Exit 0; 7 passed in 0.620228666 s, END d7aa80aacaf11222cd00a70ffc8c16a0d8de9e51. `B/scale-selection.stdout.log` — `7237a1cfbdcf51b86b6ff7ce11a34c7a20bb559c53130d5a7c2bafcb625f4582`; aggregate `B/result.json` — `72873a8a8c7a59696012025889435bb2ed567f5b3486f909d9cf82eff5b10b23` |
| Native defaults and all selected real cases | Maintained Native config, naturally selected all/changed-scale-path | All 22 Scale cases passed across 13 whole owners. Final case durations: G15 77320 ms, raw proof residency 54924 ms, installed Grow producer 13711 ms and command follower 27747 ms. The local factor remains 1; original bases/defaults unchanged. Actual final records in `G/stage-logs/test-evidence/native.jsonl` |
| Full combined gate, END 9d48f8f053c936598e8de3d441ed9b5e08c2241c | One normal npm run gate at 27e01659/tree 66ccd762 | Exit 0; child wall 1620.579566916 s, outer wall 1620.829315250 s. Node 202; Counting 56; Plain 4858 passed/1 skipped; Native 1158 passed/2 skipped. `G/gate.log` — `44a9865875f439993459f0f78655acc3475b54615a65b838ec78aae452f2daf9`; `G/result.json` — `2586c1eaaf03602b6ee983d43e0ad8ff66fe8972517006125d9b266eaf0476e6` |
| Local browser interval, END 9264fbca49df5a75c004929c7e7ae18f3521be00 | Twelve local steps completed; independent review remains owed | All exited 0; outer 257.253067459 s. `D/result.json` — `a498ca9d34370a74ed4e32849a1c095d420d1604d1fbf7b236b730d100c88f66`; the [common NF6/NF8 report](2026-11-14-nf6-nf8-custody-follow-ups.md) gives all twelve commands, walls and safe output hashes. Linux workflows have not run at this head |
| Hosted follow-up | Planner reads two Scale runs on main after landing and reports the producer's time in each | OWED; no new hosted observation by this lane |

No compiler, parser, test, producer, browser, model, CI probe, dependency
setup, or hash calculation accompanies this source checkpoint. Actual later
main integration and the prior NF source-seal obligation remain separate.
This patch changes no production source, definition, pin, cap, native default,
package metadata, installed dependency, or protocol. It claims no hosted
pass, acceptance result, signing, deployment, or request closure.


## Current bounded development, 15 November

Current development results bind clean source
`27e0165938ec563420c1fecce6364d11c14f4afb`, tree
`66ccd762db65d34a8f9e95f59071984a32c2c7be`. Main and origin were
`c6711b53a368d24c1fad2830ea5634c045999ce1`.
The full gate passed under END `9d48f8f053c936598e8de3d441ed9b5e08c2241c`.
The local Page/Card browser interval passed all twelve steps under START
`1487c651e724953c67149527286eea494bb3ca68` and END
`9264fbca49df5a75c004929c7e7ae18f3521be00`. All steps exited 0 with no error or
unreached step. The 26 source guards matched the same clean head, tree and main;
all children terminated and root reaped session 89290. The outer wall was
257.253067459 s. `D=E/2026-11-15-nf-browser-27e0165938ec-attempt1` retains the
safe outputs and actual argv in `D/result.json` — `a498ca9d34370a74ed4e32849a1c095d420d1604d1fbf7b236b730d100c88f66`.
Browser scripts ran locally on macOS at this head. The Linux workflows have
not run at this head.

`E=artroom-evidence`;
`B=E/2026-11-15-nf-lc2-bounded-owners-attempt1`,
`T=E/2026-11-15-nf-lc2-exact-head-preflight-attempt1` and
`G=E/2026-11-15-nf6-nf8-fh2-sd1-lc2-full-gate-attempt1`.
The result files retain exact argv, cwd, PIDs, intervals and walls. All seven
bounded commands passed once; their outer wall was 38.901086833 s. No failure,
pending/skip or todo occurred and every stderr stream is empty. Root reaped
all children and verified the unchanged clean source.

The whole seven-case Node owner passes the deadline-factor checks, exact
12-case fixed-exception inventory and 22-case/13-owner reconciliation. Its
input-string assertions find/reject an unlisted fixed case and reject hidden
initializer registrations and helper shadowing. They parse only registration
syntax; they import no Native fixture and execute no case callback. This is
not an external Native fault control or runtime proof for the scanner's future
unsupported syntax. Both earlier findings remain source-review findings, not
runtime failures that this result rewrites.

Exact-head preflight covers the changed Scope and lane test contexts through
the existing whole typecheck. No separate compiler-context sweep ran. The later local gate passes all 22 selected real Scale cases. The planner's
two hosted follow-up observations remain owed. Existing reported times and unchanged default
budgets retain their original scope; no saving, E1 regression or hosted pass
follows from this local Node result.

Planner 8228f48165d0f0cdb09dcfde3316a19b60cb402d confirms NF6's carrier
ownership of the six version/identifier consequences of c168799e. The exact
partition is 62/6/6/5/9 for NF6/NF8/FH2/SD1/LC2. This note remains SD1's
distinct report, and the whole shared archive fixture remains only NF6's
artifact at `packages/scope/test/archive-installed.fixture.ts`. SD1's report
will cite the actual NF6 artifact through `--text` and `--rests-on` when filing.
Local gate and browser routes passed; independent review remains owed.
The planner owns the two post-landing hosted observations.

The full gate's Native wall is 1282098.070041 ms and includes Scale. No
independent Scale-only wall was recorded. Its concurrent module-duration sum,
1528492 ms, is not elapsed wall or CPU. All four test-stage terminal records
are complete; scope-stories module timing remains partial, with 129
unknown/suite observations and zero contradictory records. No missing timing
was reconstructed. Kernel and all pre-test checks passed, notes reported zero
warnings, and installation skipped on the matching stamp. Source stayed clean
and unchanged at the frozen head; all processes terminated/reaped.

These are local macOS case observations with factor 1, not the two requested
hosted measurements or evidence of a timing saving. The hosted factor 3 stays
configured; the local deadline defaults and case assertions stay unchanged.
The producer/follower pair retained its order and shared handoff. Planner still
owes the two post-landing Scale observations and each producer time.

The [common NF6/NF8 report](2026-11-14-nf6-nf8-custody-follow-ups.md) records all twelve local browser steps, safe output
hashes and fixture limits. Browser results do not supply the planner's two
hosted Scale measurements. `D/safe-export.json` —
`13b72f5ddc27ba877be22239d2e4ead1cc293b1725b2b1607bccf65035e27e08` — indexes the retained safe outputs.

The final documentation successor changes only the four existing NF6/NF8,
FH2, SD1 and LC2 implementation notes. Its source, tests, identifiers, packets,
configs and dependency metadata remain those of gated
`27e0165938ec563420c1fecce6364d11c14f4afb`, tree
`66ccd762db65d34a8f9e95f59071984a32c2c7be`. Root's later source checkpoint
names the final commit and tree.
