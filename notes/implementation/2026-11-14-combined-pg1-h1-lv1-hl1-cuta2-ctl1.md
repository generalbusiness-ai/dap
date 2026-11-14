# Combined PG-1, H1, LV1, HL-1, CUT-A2, and CTL-1

This note describes the current combined source and its remaining review
obligations. The standing focused and failed attempt-1 checkpoint is
`256673de947ae5c20dbeeb1ea388b1fc9111fe35`, tree
`3fd950edc9de8d0a8cd037267a072aa3c30f0173`, on
`builder/combined-pg1-h1-lv1-hl1-cuta2-ctl1-20261114`.
The combined head starts from landed R2 main
`189cf7b64a1501b307b9c73e96ee83641c3bd2de`.

The integration carries 20 feature commits and excludes nine dependency
merges from the part branches. Two later integration commits regenerate
page assets and update unsigned presentation identifiers. This note adds
documentation only. The combined focused interval passed once. The first
full gate failed; the repaired head passed the second gate.
Exact-head review remains UNRUN. Development runs and scratch
comparisons supply no evidence here.

The repaired source checkpoint is
`1c80cef3c7749f1c6220fbdc77ed85491b4c6502`, tree
`9ed79ccfa477eb8d706c03e8b75f6bc6563816f6`. Gate attempt 2 passed
at that clean checkpoint. The final documentation commit changes only
this note. The filing act names its final commit and tree; the outside-notes
diff from the gated checkpoint is empty. The standing focused pass and
failed first gate remain separate records at the earlier checkpoint.

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
combined focused scope includes the whole hosted-loop owner. Its focused
run passed at that checkpoint. The first full gate failed, and the
repaired combined head passed the second full gate.

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
hang. The current whole Node owner passed in the focused interval.

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
expects refusal with no tracked change. One control ran that exact
witness against baseline `0ad4aa9102fe5f75b692d3adb30c8b00a6914574`.
The control reached the old widening behavior: the helper returned 0
where the selected case required refusal exit 1. The exact baseline
produced an ERR_ASSERTION, and the current source and mode were restored.

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
current Node cases passed in the focused whole-owner run.

Ruling `f45b355a8d4f2668412c28b6d32fdf13239b70cf` ends the CTL-1
publication hold of `550d5ede`. Hugh answered, “Yes, builder can push.”
Pushes still run with hooks enabled. This permission supplies no checker
approval or landing decision.

## Integration with C1 and R2

The combined source starts from the exact landed R2 main stated above.
The security-entry-point map preserves the landed C1 and R2 entries and
carries only H1's `packages/bytes/src/records.ts` row change from these
parts. That row describes refusal of the six sequenced inputs and the
excluded page kind. A source-map entry is an attestation to review, not a
test result.

The integration resolved two generated-asset conflicts, then regenerated
once after the source settled. Commit `b255df02d8` records the output of
`node apps/room/page/scripts/assets.mjs`. The current assets owner passed
in the focused interval. Exact-head checker review remains owed. The
earlier part generators and their manifests do not establish current
correspondence.

Commit `b6b746ef5c9b2190e6b9edf6bdf0637ce144d432` changes only the
presentation identifier in each unsigned 0.2 release-identifier file:
`apps/counter/release-identifiers.json` and
`examples/lending/release-identifiers.json`. The source decision follows
the normal producer comparison. The scratch comparison is not formal
reproduction evidence. The current whole R1 reproduction owner passed
its comparison of the combined source and committed identifiers.

The current Grow subtree remains unchanged from landed R2 main. This
combined head supplies no new packet, signature, publisher, deployment,
installation, or hosted acceptance claim. Lending and Counter publication
through R2 still follows NF-5 and the planner's release order.

## Current evidence and review obligations

Ruling `f45b355a8d4f2668412c28b6d32fdf13239b70cf` preserves the
existing focused pass and replaces the filing requirements for this head.
This note cites existing focused records directly. It adds no committed
focused manifest, supervisor plan, seal, sleep supplement, or landing
record. The old part records remain unchanged.

`F` names `/Users/hughpyle/play/artroom-evidence/2026-11-14-combined-batch-focused-attempt1`.
Focused START `4004a0fd448970dfcb3f063f73dc9d10781d803d` began at
2026-11-14 15:13:54 UTC. END
`d5e931269bb3841269558200915a6682843b4036` records 15:18:55 UTC.
The five phases passed once, with the source restored after the control.
Their existing raw histories stand under the new ruling.

The first direct gate ran at the same clean source checkpoint under START
`b904b1d1a1f69200a5973a7e423253d989aea02f`. END
`b2128c8c9e004e8f46ac544de18b3b25f5fcf7d0` records exit 1 and
250.89 seconds wall time. Its unchanged log is
`/Users/hughpyle/play/artroom-evidence/2026-11-14-combined-batch-gate-attempt1/gate.log`.
It records Node 197 pass, counting 56 pass, plain 2 fail with 4,713 pass
and 1 skip, and Native unreached. The failed gate does not change the
standing focused result or supply a full-gate pass.

The failures are replay's unsupported-durability fixture and MCP's
generated-module freshness comparison. LV1 intentionally admits the
fixture's live version 1, so replay reaches `acts.tell.sends.0` instead of
the old level refusal. H1's added order and input vocabulary also changes
the MCP presentation generator's output.

Rulings `a7e9e523b0cab38c85e713d5b0b59eb9d2a1eeda` and
`0e2a40569856819d39c8d0dad66f8f8cbc0592d9` retain H1 and LV1 in
the combined head. They authorize version 2 for both live and sequenced
in the replay fixture, with the same title, case count, and exact genesis
refusal assertions. They also authorize one run of `node packages/mcp/scripts/views.mjs` and its
`packages/mcp/src/views/generated.ts` output. Commit
`1c80cef3c7749f1c6220fbdc77ed85491b4c6502` contains exactly those
two source changes. Four affected compiler contexts and both whole
failed owners passed in development: 59 cases across two files. This
development result supplies no full-gate verdict. START
`f5f84996ac28ef3a768df047a115f78ff3f2b93e` began attempt 2 at
2026-11-14 15:53:50 UTC. END
`7460ab2208249b39c79debc60b78d6e611b31125` records actual exit 0
and measured wall time 1,800.26 seconds. The shell returned timing
separately, so the log ends with the actual gate-passed verdict. Attempt 2
uses a new directory and does not overwrite or relabel attempt 1.

`G` names `/Users/hughpyle/play/artroom-evidence/2026-11-14-combined-batch-gate-attempt2`.
Its 7,156-byte `gate.log` starts with the tested head and tree and zero
changed files. Kernel passed; Node passed 197; counting passed 56; plain
passed 4,715 with 1 skip; Native passed 1,156 with 2 skips. The Native
stage includes the existing scale tier. Its observed wall time was
1,539,874.44 ms. All four terminal evidence states are complete and
observed; the summary reports 129 unknown/suite observations and zero
contradictory records. Each cited control output below is an exact copy
of the standing focused output beside this gate log; the originals remain
unchanged. No control was rerun for filing.

Power is no condition of the gate or later runs under `f45b355a`.

| Check | Command or retained command ledger | Result | Retained record | Record SHA-256 |
|---|---|---|---|---|
| Compatibility prerequisite | Recorded argv in `F/00-compatibility/command.json` | exit 0, verification 0 | `F/00-compatibility/stdout.log` | `e3e690aaacb7bd0d83c3ad86b3c01b488e3cf41e04e210d27ff5a5bcfb578272` |
| 23 compiler contexts | Exact contexts and argv in `F/plain-owners/plan.json` and `result.json`; individual logs `compiler-00.log` through `compiler-22.log` | 23 exits 0 | `F/plain-owners/result.json` | `1db7813d4e7c04d304bec67258c16f022a9916ac9ad18d3f9369917f92f12d35` |
| 14 whole plain owners | Recorded body argv in `F/plain-owners/result.json` | 2,094 pass; exact expected and observed identities agree | `F/plain-owners/coverage-ledger.json` | `fec032a218220030b440d059e22fce05d4967588d1ff98056b111bbfbe0f03b0` |
| Native live-creation owner | Recorded body argv in `F/native-owner/result.json` | 1 pass; exact identity observed once | `F/native-owner/coverage-ledger.json` | `2aad83106d871dd27a105ae6e649bf28100d382b3b6e3d8320d645fe393e5c73` |
| 8 whole Node owners | Recorded argv in `F/03-node-owners/command.json` | 48 actual runtime identities pass | `F/03-node-owners/node-case-check.json` | `8d573a601cbce6b9f4d159363b617f4cb99ca65fb0e9375e2ba903a521e14042` |
| CUT-A2 exact-baseline control | Recorded argv in `F/04-cuta2-control/command.json` | DISTINGUISHES; helper exit 0; source and mode restored | `G/cuta2-control-result.json` | `caf84817a9b70b3875112646dc0b107a850b1a4349944844e30e31d71359a5e1` |
| Control before | Existing retained child TAP | 1 selected case passes; total 1, skips 0 | `G/cuta2-before.tap` | `c5e992a879ac03a54f1b0035a8ad6e05dab2cd336d43cb0def9ce21e90f4cfca` |
| Control exact baseline | Existing retained child TAP | 1 selected case fails by ERR_ASSERTION; actual 0, expected 1; total 1, skips 0 | `G/cuta2-baseline.tap` | `8825131554646a71a10f17907e77f6ade3c48078bb88bddc13f9647ca4146b21` |
| Control helper output | Existing retained stderr | helper reports the named control and restored source | `G/cuta2-stderr.log` | `b7638a18ff7e429f25d3d857b873c1f6bf4224de8676f382046dfa992a298895` |
| Focused outer interval | Five ordered commands and phase results in the retained record | all five actual exits 0 and verifications 0 | `F/interval-result.json` | `b09e76a05f8bc33ede264d01be2300d56765be43e109db11055ba655b1a88b6a` |
| Gate attempt 1 | Direct `npm run gate` at `256673de` | FAILED: exit 1; wall 250.89 s; Node 197 pass; counting 56 pass; plain 2 fail, 4,713 pass, 1 skip; Native unreached | `/Users/hughpyle/play/artroom-evidence/2026-11-14-combined-batch-gate-attempt1/gate.log` | `1e868d3e98b87984b2f7f00c833628ad2057767cfba1a5a68000252cb4e1e0d4` |
| Gate attempt 2 | Direct `npm run gate` at `1c80cef3` after the authorized repair | PASS: exit 0; wall 1,800.26 s; Node 197 pass; counting 56 pass; plain 4,715 pass, 1 skip; Native 1,156 pass, 2 skips | `G/gate.log` | `84a48c9147d2f004e9fbaf08e29dce94b6e3d071786ec5661c3aa2fb46ec7988` |
| Exact-head review | Architecture, Security, Simplification, kernel amendments, and final source correspondence | UNRUN | No checker verdict | No digest |

The plain whole-owner set includes R1's
`packages/cli/test/application-release-reproduction.test.ts`, HL-1's
`examples/repo-in-ai/test/hosted-loop.test.ts`, the frozen
`packages/platform/test/version-questions.test.ts` boundary, and the
current `apps/room/page/test/assets.test.ts` comparison. It also includes
the PG-1, H1, LV1, define, program-structure, validator, and replay owners
listed in the retained plan. The 2,094 count belongs to this focused set,
not to a full gate.

The Node runtime identities come from eight whole owners: views `j5` (6),
views two-process (3), control (8), register values (11), security entry
points (12), test phases (1), test selection (1), and test runner (6).
Fixture-child CLI cases remain separate from those 48 public owner
identities. All three views two-process cases and all eight CTL-1 cases
passed. The control helper's ordinary thrown-error refusal remains part
of that owning file.

The one CUT-A2 control selects “no choice refuses a valid rotation and
names both explicit choices.” The current implementation passes the
single selected case. Exact baseline
`0ad4aa9102fe5f75b692d3adb30c8b00a6914574` fails its actual assertion:
returned exit 0, expected refusal exit 1. Before and after totals are both
one, with zero skips. The retained cleanup-only helper preserves both
child TAP streams. The original script, its mode, and clean Git status
return after the comparison. This is one named control, not a sweep.

Earlier part notes and manifests remain historical at their own source
checkpoints. They supply no additional current pass claim. Development
runs and scratch identifier comparisons remain outside formal evidence.
The attempt-1 row records failure; attempt 2 records the repaired head
and its actual full-gate pass. Exact-head review remains UNRUN.

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

The focused checks and the one baseline control passed at the named
checkpoint. The first full gate failed. The narrow repair and its affected
development checks passed, then the repaired head passed the second full
gate. Exact-head checker review remains owed. The development checkpoint
supplies no full-gate or review verdict. Hugh's
push permission ends the CTL-1 publication hold. Landing and any later
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
