# Scale deadline factors and the fixed-case list

SD1 request `905e4ecd6383309959f4bcc9fed9f50361f19da7` and promise
`8a788b09f6ca1cd618358742fea89fee9319141c` cover this change. Planner ruling
`9b5caaebfdb15f90b18ce8dca5986cf1fca99c2b` supplies the hosted measurements
and approves the partition. Builder source plan
`63c3dc9a84e80b69beb734e65c2e480f63c7278b` records the complete arithmetic.
This source starts at NF6/NF8/FH2 head
`b0928331e8d27252c3cce357166eb7e4dc0e0da7`, tree
`5d1e0ec58baafc9a1cc91ed25077240b63a29942`.
All changed code and tests remain **UNCOMPILED and UNRUN**.

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
callback bodies. Unknown registration forms fail for source review.

The five factory owners select only their Scale registrations:
`registerArchiveInstalledCases(["Grow production"])`,
`registerEvidenceRulesScale`, `registerDirectoryPartitionLanesScale`,
`registerManifestTreeScale`, and `registerDemoScale`. Ordinary registrations
in the same modules do not enter this list. The other eight owners register
directly. The guard reconciles the expanded per-owner counts with the
existing inventory and compares every fixed case and base with the explicit
12-case list. A missing explicit timeout is also fixed, so a new inherited
default cannot disappear from the guard.

Within that same Node case, a source-string fault adds one fixed test inside
the imported evidence registration factory. The scanner must report that
case, and the exception comparison must reject it. This changes no checkout
file and runs no Native fixture. It remains an **UNRUN assertion**, not a
reported control result. No mutation sweep or Native collection was added.

## Ownership and validation

NF6 keeps the complete archive fixture artifact, including its existing
`memoryStore` import migration and the two SD1 wrappers. This note names
that actual source path; final filing must cite its actual NF6 artifact
when the artifact exists. This checkpoint invents no artifact ID.
SD1 owns the G15 owner, raw-proof fixture, guard, scanner, and this distinct
report. NF8 and FH2 retain their existing paths. The waiting side head
carries four original promises and one later gate after R, under the approved
combined route. No gate priority or earlier result transfers from R.

| Check | Command or boundary | Result |
| --- | --- | --- |
| Affected test types | Existing Scope and lane Worker test compiler contexts, at root's later granted slot | UNRUN |
| Deadline helper and registration guard | `node --test scripts/scale-selection.test.mjs`, whole existing owner | UNRUN |
| Native defaults and full selected cases | Existing unchanged Native and natural Scale selection in the eventual combined gate | UNRUN |
| Exact-head preflight, gate, and checker review | Existing shared-helper, whole-typecheck, conditional pre-START owners, then `npm run gate` | UNRUN |
| Hosted follow-up | Planner reads two Scale runs on main after landing and reports the producer's time in each | OWED; no observation by this lane |

No compiler, parser, test, producer, browser, model, CI probe, dependency
setup, or hash calculation accompanies this source checkpoint. Actual later
main integration and the prior NF source-seal obligation remain separate.
This patch changes no production source, definition, pin, cap, native default,
package metadata, installed dependency, or protocol. It claims no hosted
pass, acceptance result, signing, deployment, or request closure.
