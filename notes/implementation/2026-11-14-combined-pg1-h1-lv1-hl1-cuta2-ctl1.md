# Combined PG-1, H1, LV1, HL-1, CUT-A2, and CTL-1

This note describes the current combined source and its remaining review
obligations. The source checkpoint is
`b6b746ef5c9b2190e6b9edf6bdf0637ce144d432`, tree
`d0abc05189c9a5c6dde2e8832d87d7e8d04e7eae`, on
`builder/combined-pg1-h1-lv1-hl1-cuta2-ctl1-20261114`.
The combined head starts from landed R2 main
`189cf7b64a1501b307b9c73e96ee83641c3bd2de`.

The integration carries 20 feature commits and excludes nine dependency
merges from the part branches. Two later integration commits regenerate
page assets and update unsigned presentation identifiers. This note adds
documentation only. Formal validation of the combined source remains
UNRUN. Development runs and scratch comparisons supply no evidence here.

## Requests and promises

The five parts retain their existing workroom requests and promises.
Combining their source does not close a request or supply checker approval.

- **PG-1:** placed request
  `cb07b59b35cb307d29f2a4eb87b903a056aa3ef5`, continuing the work of
  `944f9cad`, with continuation promise
  `924c4078b35db4bc2f0d8e36173b39a063ef17e0`.
- **H1 and LV1:** H1 request
  `71bb8559224dc820915d5846612915930bcadf99`, with continuation promise
  `e45399eaf2953ddb26e0b8dc1528d3270120deb0`; LV1 request
  `36496b5c80c7ec17bb333d7c27999882f0a605b6`, with promise
  `bee88bfad4d213ce47e3bb2784a4379bdf3b0f27`.
- **HL-1 and its follow-ups:** original request
  `6506bc1e37b2e50c673251edea8df25c5ada8fce`, with continuation promise
  `06fadb8995795cd9176c90a3287f7b2050ec3115`. Follow-up request
  `8fd9ffe095d85d0afe634d2cfc66583b3eee633c` has promise
  `cbfd7a38dc9848f4678a040f9d0d440fe570f939`; request
  `37aabf145c906784d87353197f62d415949dbd86` has promise
  `e834dbb7ad64c7b3023056ab91fe266c81f6c2ba`; request
  `4734b15ae684470e0909f7bb6569a30444a1df9e` has promise
  `63bc8f36f95ac1a09918403ac9845f010e80870c`.
- **CUT-A2:** request
  `cfdd7ffc358d29f0c81dcc1e2f91ff6c3fec47c1`, with promise
  `454d23eb978fdf2a088daa4e3ad2a5c3f4bd4f0b`.
- **CTL-1:** request
  `9aaabce50a8eab3afdec19dd36892ef890303ecb`, with promise
  `72f5ba887269ed42cafc8096c5de445f8307d3ff`.

## PG-1: a grant for local prediction

`predictionGrant(definition, actor, scope)` in
`packages/derive/src/grant.ts` centralizes the stand-in grant that local
prediction needs. The result is a current `Presented` value. Its actions
are the distinct actions that `actionOf` finds in the definition. Its
subject, key, and principal come from the actor. Its `within` is the exact
scope reference, including genesis, and its `notAfter` is null.

The helper's issued reference uses sequence zero and a zero digest. It
names no issued fact. One named cast supplies null freshness inside the
helper. `Grant.fresh` remains `FreshnessProof`; neither the entry nor the
wire form changes.

The never-unauthorized claim has two conditions: the actor key matches the
signed intent, and the full scope reference matches the judged scope.
Under those conditions, prediction does not answer `unauthorized` for an
act whose grant states an action. A grant mark without an action still
runs its rule, which can refuse. This grant supplies no observation proof.
An act with `observes` can therefore predict `authority-unavailable` even
when the scope writes. The caller's clock also governs the intent's
expiry, so clock skew can produce a different expiry answer.

The deployed entry paths continue to present proven authority through
`judgeGrant` and `grantFrom(use)`. Replay's default proven-grant mode
rejects proofless authority as a mismatch. The helper does not add custody,
revocation, recovery, or a freshness lifetime to runtime authority.

The prediction owner uses an in-memory Scope and scripted authority. Its
comparison substitutes the real fixture's proven authority before
comparing canonical entry bytes. That witness does not claim Native
execution or identical entry hashes. Existing grant and judge owners
retain the wrong-actor and wrong-genesis boundaries. Other hand-built
stand-ins outside the changed fixture remain outside PG-1.

The kernel review must account for the two exports, `predictionGrant` and
`PredictionActor`. PG-1 adds no scope kind, platform name, capability,
field type, reason, input kind, or level.

## H1 and LV1: admitted forms with runtime boundaries

H1 adds sequenced version 1 to the contract, validator, definition corpus,
and `define` builders. The contract includes the sequenced act mark, up to
four declared reads per act, `Entry.position`, `Entry.reads`, and
`GroupReadUse`. The read operand lists `each`, `has`, `distinct`, or
`sameSet`; it has no `part` member. H1 also declares the six input kinds
`prepare`, `commit`, `abandon`, `allocation`, `resolution`, and `hole`, the
retained kind `page`, the `at` read and answers, the `order` scope kind,
and `platform:order`.

Sequenced definitions remain non-derivable. The runtime does not pin or
create them in this head. Entry-byte handling refuses the six new inputs,
and replay stops at an unsupported definition. No service writes those
inputs before the later runtime head. H1 adds no contract refusal reason.
The sequenced note assigns the reason work to later heads under ruling
`09d80b57`.

LV1 admits live version 1 through the existing recorded grammar for
items, acts, guards, rules, effects, and timed rules. The validator refuses
handlers, declared sends, capabilities, holds, preparations, presents,
recursive fact types, and notifications. The implicit genesis result can
still leave the child during creation.

After confirmation makes a live scope active, `applyEntry` refuses every
later entry before mutation. The fold witness uses actual judged creation
and confirmation, then presents a third checkpoint. The recorded
counterpart can fold that checkpoint. The Native creation witness compares
an otherwise valid live definition with its recorded counterpart. It
expects `unsupported-definition` for live, with unchanged SQL rows,
key-value state, and alarm after constructor schema setup.

Ruling `a1fe9aaf` keeps live non-derivable until LV2. Ruling `d1bd34fb`
forbids a platform declaration from using live version 1. The validator
reports `live-platform` at `level`, and the separate outcome-send parser
keeps its live no-send guard. These limits prevent the admitted grammar
from implying an implemented live turn.

The carried H1 fixture correction, originally
`44b0dbd4680324ae3b4ee48d3c360263c81587a3` and now
`6383a6303c84083c5e316efe02d1a5ba4c185bef`, tests unsupported live
version 2 at runtime. Live version 1 now belongs among admitted forms, so
it no longer serves as the unsupported-version fixture.

The kernel review must cover H1 ruling `08c5ff25`, LV1 ruling `4b5e0ec2`,
and the amendments to the sequenced and live notes. H1 expands the kernel
vocabulary, including the K4 kind list with `order`; it does not establish
a rule-count bound for the future `platform:order@1`. LV1 adds no creation
family, scope kind, platform name, capability, input kind, field type, or
reference. The later live turn remains a platform service. This head
changes neither Operations nor `markSent`, and advances no model result
or formal coverage hash.

Numbered corpus labels distinguish rows when Vitest truncates long names.
They change no case, assertion, or deadline. The maintained driver stays
unchanged.

## HL-1: selected owners and bounded fixture cleanup

`vitest.projects.mjs` names the plain project `repo-in-ai` and extends
`examples/repo-in-ai/vitest.config.ts`. That configuration selects
`test/*.test.ts`, including the whole hosted-loop owner. The original
timing and selection decision belong to the historical HL-1 record. The
combined focused scope includes the whole hosted-loop owner; its current
formal run and the gate remain UNRUN.

The Node inventory in `scripts/test.mjs` adds
`apps/views/test/j5.test.mjs`, `apps/views/test/two-process.test.mjs`, and
`scripts/test-selection.test.mjs`. The combined focused scope includes
the whole newly enrolled Node `j5` owner. The selection owner compares
tracked test files with the maintained plain, Native, Node, counting, and
gate selections. An unselected test file needs an explicit reason. Manual
browser recorders remain explicit exclusions; the inventory does not
pretend to run them. The integration preserves R1's
`scripts/register-values.test.mjs` selection while adding the HL-1 owners.

The two-process fixture removes the invalid, unused `sc_test` register
setting that blocked configuration parsing and stdio startup. Its three
cases still use two actual Node views processes, a shared file store, and
a loopback scripted service. The service does not provide Native judgment.
The fixture keeps its expected answers and its existing deadlines.

Each child creates its close promise at startup, so an early exit cannot
escape cleanup. Pipe failure or early exit rejects pending requests,
clears their timers, and retains bounded stderr diagnostics. The shared
cleanup awaits both child closes before it closes HTTP or removes the
home. This is a source change, not a claim that a run observed a leak or
hang. The current whole Node owner remains UNRUN.

Ruling `47c57403` chooses deletion of the unsupported demo Git host path.
The head removes `scripts/demo-git-host.mjs`, its test, and its exclusion.
The supported CLI installation path remains `--plan`, `--planned`, then
creation. HL-1 adds no replacement host command or loader path.

The head also removes the unused Counter and Lending
`storage.browser.test.ts` witness modules, their exclusions, and the stale
Lending README row. Neither module supplied a test case or had a committed
caller. The frozen platform version-questions fixture remains unchanged.
If its current owner refuses the deleted Counter path, the result needs a
planner ruling before any fixture update. HL-1 changes no production MCP,
session, or custody answer.

## CUT-A2: an explicit register-root choice

`scripts/register-values.mjs` requires exactly one CLI flag: `--only` or
`--keep`. It refuses neither, both, or a repeated choice before reading the
target. The exported `registerValuesSource` helper takes one explicit
`mode`, either `only` or `keep`. It rejects an absent or invalid mode and
legacy `only` or `keep` fields, so a direct caller cannot recover the old
default.

`only` writes the new root alone. `keep` preserves the installed roots in
order and adds the new root once. When a file has no explicit list, `keep`
retains the existing primary root. The production parser still limits the
list to 32 roots. This choice matters because a listed root admits
creation under that root.

The script validates the complete candidate with the production settings
parsers before writing. It stages a candidate beside the selected file,
applies the observed permission bits, and rechecks the target's bytes,
identity, and mode before atomic rename. The selected file must remain
idle: rename does not provide compare-and-swap against another writer.
`docs/deploy.md` records both flags, the authority consequence, and cleanup
of one abandoned pending directory. The script neither installs a root
nor deploys a Worker.

The owner covers missing, contradictory, repeated, and helper-only invalid
choices; both modes with and without an installed list; file modes; and
the existing validation and race refusals. The decisive old-default
witness uses valid ordinary rotation arguments without either flag and
expects refusal with no tracked change. One control must run that exact
witness against baseline `0ad4aa9102fe5f75b692d3adb30c8b00a6914574`.
Its expected failure must reach the old widening behavior, rather than an
import, compiler, or fixture error. That control remains UNRUN.

## CTL-1: promise assertions before display truncation

`scripts/control.mjs` classifies the pinned Vitest promise assertion from
the complete constructor headline before truncating the displayed
message. It recognizes the exact rejected-`resolves` and
resolved-`rejects` forms when Vitest's JSON report omits the error name.
Ordinary thrown errors remain inconclusive. Timeout, unload, case-count,
named-witness, and source-restoration rules still apply.

The owner uses the real pinned Vitest runner for each promise direction.
Its payload pushes the constructor suffix beyond the 300-character
display limit. The owner also covers an ordinary thrown error, exact
retention of inconclusive child output, Node assertion diagnostics, and a
malformed diagnostic that cannot borrow the next failure's fields.
These are helper-boundary witnesses, not Native evidence. All eight
current Node cases remain formal obligations.

Ruling `550d5ede05a0e33cc00f35e95fa167ce1e4662bf` holds CTL-1
publication pending Hugh's permission. Local focused validation and the
combined gate may proceed. No lane push may disable hooks, and this note
does not authorize a retry or another route around the publication hold.

## Integration with C1 and R2

The combined source starts from the exact landed R2 main stated above.
The security-entry-point map preserves the landed C1 and R2 entries and
carries only H1's `packages/bytes/src/records.ts` row change from these
parts. That row describes refusal of the six sequenced inputs and the
excluded page kind. A source-map entry is an attestation to review, not a
test result.

The integration resolved two generated-asset conflicts, then regenerated
once after the source settled. Commit `b255df02d8` records the output of
`node apps/room/page/scripts/assets.mjs`. The checker still owes the
current generated-assets comparison. The earlier part generators and
their manifests do not establish current correspondence.

Commit `b6b746ef5c9b2190e6b9edf6bdf0637ce144d432` changes only the
presentation identifier in each unsigned 0.2 release-identifier file:
`apps/counter/release-identifiers.json` and
`examples/lending/release-identifiers.json`. The source decision follows
the normal producer comparison. The scratch comparison is not formal
reproduction evidence. The current R1 reproduction owner still owes an
exact comparison of the combined source and committed identifiers.

The current Grow subtree remains unchanged from landed R2 main. This
combined head supplies no new packet, signature, publisher, deployment,
installation, or hosted acceptance claim. Lending and Counter publication
through R2 still follows NF-5 and the planner's release order.

## Current evidence and review obligations

All rows below concern the current combined source. Earlier part notes
and manifests remain historical at their named checkpoints. They do not
turn any row here into a pass. This note records formal evidence once,
after the combined interval, using actual commands, outputs, exits,
source correspondence, and retained records. No current manifest or
output digest exists in this note yet.

| Obligation | Required boundary | Current result |
|---|---|---|
| Compiler closure | All 21 declared compiler contexts for the combined changes | UNRUN |
| Plain owners | PG-1 prediction, H1 and LV1 forms and corpus, define builders, fold and replay, and other declared affected owners | UNRUN |
| R1 reproduction | Whole normal reproduction owner against current combined source and the committed release identifiers | UNRUN |
| HL-1 plain and inventory owners | Whole hosted-loop and selection owners, including the frozen version-questions boundary | UNRUN |
| Native live creation | Whole live-creation owner, including live refusal without retained writes and the recorded comparison | UNRUN |
| Node owners | Whole declared Node owners, including the newly enrolled views `j5`, views startup and awaited cleanup, register values, security entry points, and all eight CTL-1 cases | UNRUN |
| CUT-A2 control | One missing-choice witness on exact baseline `0ad4aa9102fe5f75b692d3adb30c8b00a6914574`, with an actual invariant failure and preserved current source | UNRUN |
| Generated assets | Current generator comparison against the combined tracked output | UNRUN |
| Full gate | One maintained `npm run gate` on the frozen combined head, under the current workroom power and interval rules | UNRUN |
| Exact-head review | Architecture, Security, Simplification, and the PG-1, H1, and LV1 kernel amendments, with gated-to-final source correspondence | UNRUN |

## Open limits

The combined source does not implement H2 sequenced derivation, H4 runtime
sequenced inputs, or LV2 live runtime behavior. The later live reads,
watching, packaging, and replay work retain their own requests. The
validator admits a contract form only within the runtime boundaries
described above.

The PG-1 witness does not establish Native prediction parity, identical
entry hashes, clock agreement, or observation authority. The HL-1 Node
fixture does not establish Native service judgments. The register-file
rename requires an idle file and does not establish deployment. The
control helper's classification does not by itself establish that any
product test distinguishes its fault.

Formal focused checks, the one baseline control, the full gate, generated
asset correspondence, and exact-head checker review remain owed. A
development checkpoint supplies none of those results. CTL-1 publication
still needs Hugh's permission under `550d5ede`. Landing and any later
deployment remain planner decisions.

## Historical part records

The earlier records retain their original source and evidence limits:

- [PG-1 prediction grant](2026-11-13-pg1-prediction-grant.md).
- [H1 sequenced contract](2026-11-13-h1-sequenced-contract.md).
- [H1 and LV1 progress](2026-11-14-h1-lv1-progress.md), including the
  historical focused and progress manifests linked there.
- [HL-1 selection](2026-11-13-hl1-unrun-tests.md).
- [HL-1 follow-ups](2026-11-14-hl1-followups.md).

Those files remain unchanged. Their counts, timing, source checkpoints,
and pass claims describe their own histories, not this combined head.
