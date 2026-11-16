# CV1 source correspondence for Editor and Effects

## What changes

This change refreshes three source hashes and the Editor and Effects sync commits after a source-history review through `6728059211cee75dc0f6fdd104ef52a44c5f7da0`. It clarifies the correspondence map and both project skills, adds a built-in-Node raw hash guard to pins, and adds its single scratch owner to the maintained Node list. It changes no product source, TLA+ model, model configuration, view, invariant, diagram, control, package input, or existing test assertion. Root has reviewed the source and completed the focused raw guard, maintained Editor and Effects checks, statecharts, and ordered pins comparison below. Final preflight and the full gate remain UNRUN.

The original audited cuts are main `e09addf0815c288b5902f5a1799dada970453756` and E4 `0cd97bd438975cdafac141bf2746805b8196b089`. The exported main cut is `6728059211cee75dc0f6fdd104ef52a44c5f7da0`; the exported AE1 cut is `7808c06482d61e27e1bda07f195d85f55da1ac16`. All four export the same three changed-file hashes and the same corresponding history sets. The separate Editor reducer supplement supplies sync plus all four cuts; all five reducer files match.

The reviewed hashes, taken from the immutable export rather than a new production computation, are:

- `packages/scope/src/operations.ts`: `b33908e9a65901298d6d6ca3b11c3dadb0888891591874ccd369a9011e19cf3b`.
- `packages/scope/src/sqlite.ts`: `c012365221f0695050a8f891fc40f95942753ad199173c30af4e9f6da8c299b6`.
- `apps/room/page/src/retained-editor-data.ts`: `6e620c3377e6041a9cf935b0f7bc4f733bd6ebf1738c1585a4b751be26cc0498`.

The unchanged reducer hash remains `159a82608a78b04f3849d10bcb5a5f2f8a7c6c0dcae69f932636cf3e0b688141`. Transport, Observation, and Voice keep their existing metadata. A matching hash detects drift; it does not establish refinement or source authenticity.

## Decisions and history

The export contains 41 file/commit records and 77 parent/file comparisons: ten operations records, twelve SQLite records, and nineteen Editor records. A commit shared across files has a separate record for each file. The lists below include every parent, including empty patches. Category labels carry the exact before/after source anchors. Full commit IDs, parent IDs, blobs, and individual patch paths remain in the export manifest. No first-parent shortcut or merge-subject inference replaces those comparisons.

The immutable input is `/private/tmp/artroom-cv1-history-export-20261116/manifest.json`, SHA-256 `785a9588410fceae6563a466446b3f05834a911fe3ff55cb21e604270fa83532`. The detailed Effects review is `/private/tmp/artroom-cv1-effects-source-history-audit-revision2-20261116.md`, SHA-256 `90f02846f10e1be95fae222d9d74396c7e6a359a41ff3314a3b5fac9f05c570f`. The Editor review is `/private/tmp/artroom-cv1-editor-source-history-audit-20261116/README.md`, SHA-256 `3efc45361824902a3f10e15250f3712ead66859336cdeb3854ec7ee82feea9d2`. Reducer supplement metadata is `/private/tmp/artroom-cv1-editor-state-supplement-20261116/metadata.json`, SHA-256 `34eb936d05b8c4eebb9b62a4184113d17f03bd98f8ea327f48031164562e2db9`. Root retained these originals byte- and mode-exact under `G/retained-inputs/` using each original basename. The original paths and provenance above remain unchanged. `G/retention-manifest.json` binds the actual copies.

### Effects categories preserve the known sync premises

**O0 / S0:** the entire file equals that parent; the patch is empty.

**O1:** operations sync blob `8816e805` to current `ed8e794f`, `#record:810→810` adds scope-full/name result detail for unavailable retention. The result remains unavailable. `#offer` and all modeled bodies retain their branches and order. No modeled action, guard, or state variable changes.

**O2:** older operations `8c8ef60f` to known sync `8816e805`. `#pass` changes the pre-Mark `beforeSend` Own input at `513→516`. `#publicationReady:395–415→396–418`, `#unknown:645–654→648–659`, and `#record:754–791→762–809` adopt admitted sequence/origin-classified evidence. These changes touch pre-Mark eligibility and the trusted decisive-answer premise. The merge restores the already-covered sync source. It does not introduce a new difference beyond that baseline. `#send`, `#answer`, and `#offer` remain exact.

**S1:** SQLite sync `7ff7c5d5` to current `d4e9779e`. Metadata and constructor accounting change at `147,176–177`; `retain:672–680→681–695`, `retainBirth:682–685→697–701`, `retainedBytes:702–705`, and `forget:691→711–714` account for every stored payload kind. `markSent:759–764→782–787` stays exact. Payload bytes are not the modeled durable sent mark.

**S2:** older SQLite `91f9d6d9` to known sync `7ff7c5d5`. Identity/relation keys adopt genesis at `107→114` and `decidedReceipt:348–351→356–359`; retained-birth helpers appear at `682–721`. This touches the source identity/evidence premise. It restores sync; `markSent:730–735→759–764` stays exact.

**S3:** sync `7ff7c5d5` to intermediate `555e6af9` adds the first retained-entry byte counter at `147,177`, `retain:672–680→681–694`, `retainedEntryBytes:701–704`, and `forget:710–713`. `markSent:759–764→781–786` stays exact.

**S4:** intermediate `555e6af9` to `8d4a5de0` counts all retained payload kinds at `147–178`, `retain:681–694→681–692`, `retainedBytes:699–702`, and `forget:708–711`. `markSent:781–786→779–784` stays exact.

**S5:** intermediate `8d4a5de0` to current `d4e9779e`, `retain:681–692→681–695` makes value-domain narrowing explicit inside its existing branch. Runtime row selection and counter update remain unchanged by source inspection. `markSent:779–784→782–787` stays exact.

S1, S3, S4, and S5 change no modeled action, guard, or state variable. Current `#pass:447–541`, `#send:622–624`, `#answer:627–641`, and `#offer:666–677` exactly match sync. Every exported SQLite version retains the `markSent` body, attempt table, and `attempt_due` index. The one-attempt model preserves mark→readback→queued original call, restart without dispatch permission, and held decisive-answer handling. CDF payload accounting and quota availability remain outside that model.

### Editor categories preserve receipt-before-progress

**E:** the entire file equals that parent; the patch is empty.

**F:** older blob `47cccc62` to sync `40b988bb`, `supports:78→78–80` accepts the additional reviewed rulesScope spelling. It changes preparation support, not an await, modeled action, modeled guard, or state variable. Fourteen parent edges import the same already-covered sync bytes.

**I:** sync `40b988bb` to current `edf92245` replaces `entryHash` with `isEntryBodyOf` at import line 4 and identity guards `43,59,137`. `verifiedCollectedSource:137` lies on the real continuation path: `continueEdit:259` awaits it before manifest preparation at `260`, and `keepStep:173` repeats it before retention at `174`. This can change source-authentication acceptance. It is not merely a rename, and this review proves no equivalence between the old and new predicates. Bytes documents body integrity, not independent scope-address authentication. Source-content authentication remains outside `EvidenceBeforeProgress`.

`continueEdit`, `keepStep`, `runStep`, `verifyStep`, and `checkEditRequest` retain their exact bodies across all three data versions. Older ranges `228–263`, `168–174`, `181–205`, `177–180`, and `266–286` become `230–265`, `170–176`, `183–207`, `179–182`, and `268–288` after F's two-line insertion. `runStep:202` awaits verification before `receipt-verified:203`, cleanup at `204`, and progress at `205`. Recovery repeats that order at `279–282`. The five equal reducer surfaces retain the accepted/verified guards at state lines `78–108`.

The executed source probe at `source-probes.mjs:13–19` exercises `transitionEdit` only. It cannot establish that `continueEdit`, the network executor, or changed source identity checks satisfy a full workflow proof. The maintained Editor fault removes the reducer's verified guard at line 91. No reviewed transition, modeled guard, or modeled state variable requires a model/config/view repair. Historical model and control results remain historical.

### Every file/commit and parent

For each line, `pN parent: category` names the exported parent order. The export directory is the base for `diffs/<lane>/<full-commit>-parentN.patch`. The manifest resolves every abbreviated commit and category to that exact raw file and source blob.

**`packages/scope/src/operations.ts`**

- `c73542c6a397`: p1 `847d55424968`: O2; p2 `57e893c01c1a`: O0.
- `f04f1a3948ae`: p1 `759b3ce26363`: O2; p2 `57e893c01c1a`: O0.
- `d6f9be95facf`: p1 `324a067991d7`: O1.
- `82bb42da1705`: p1 `70f96419bc22`: O0; p2 `4cef11d2783e`: O1.
- `372a52f9ccad`: p1 `4cef11d2783e`: O1; p2 `9a1d85ebb7a8`: O0.
- `5b342ee9c484`: p1 `372a52f9ccad`: O0; p2 `3eda74ed8342`: O1.
- `983deef183bd`: p1 `652fe58c67b6`: O1; p2 `5b342ee9c484`: O0.
- `1b547a74ab2e`: p1 `a98edcf64dbc`: O1; p2 `5b342ee9c484`: O0.
- `c4d0a576a907`: p1 `3842c9a38a4c`: O1; p2 `5b342ee9c484`: O0.
- `2cf741387878`: p1 `699b234c8d8b`: O1; p2 `5b342ee9c484`: O0.

**`packages/scope/src/sqlite.ts`**

- `c73542c6a397`: p1 `847d55424968`: S2; p2 `57e893c01c1a`: S0.
- `f04f1a3948ae`: p1 `759b3ce26363`: S2; p2 `57e893c01c1a`: S0.
- `d6f9be95facf`: p1 `324a067991d7`: S3.
- `00de16607ebc`: p1 `fde4e92a4a2d`: S4.
- `7d9506cb7203`: p1 `00de16607ebc`: S5.
- `82bb42da1705`: p1 `70f96419bc22`: S0; p2 `4cef11d2783e`: S1.
- `372a52f9ccad`: p1 `4cef11d2783e`: S1; p2 `9a1d85ebb7a8`: S0.
- `5b342ee9c484`: p1 `372a52f9ccad`: S0; p2 `3eda74ed8342`: S1.
- `983deef183bd`: p1 `652fe58c67b6`: S1; p2 `5b342ee9c484`: S0.
- `1b547a74ab2e`: p1 `a98edcf64dbc`: S1; p2 `5b342ee9c484`: S0.
- `c4d0a576a907`: p1 `3842c9a38a4c`: S1; p2 `5b342ee9c484`: S0.
- `2cf741387878`: p1 `699b234c8d8b`: S1; p2 `5b342ee9c484`: S0.

**`apps/room/page/src/retained-editor-data.ts`**

- `0ca2b25011ef`: p1 `8dc1381c7321`: E; p2 `ca6afe2ba2f1`: F.
- `7c98aaa47cd9`: p1 `d303f793c0ad`: E; p2 `fdd1c75819e3`: F.
- `086b01b3859a`: p1 `3de5bb68b3de`: E; p2 `166150ab68fe`: F.
- `bdfe81c7b98e`: p1 `086b01b3859a`: E; p2 `6bfb6e16fd53`: F.
- `d469d3d69ff3`: p1 `9578637f6294`: E; p2 `810905c969f5`: F.
- `76dde02d2605`: p1 `d469d3d69ff3`: E; p2 `36d300026b9e`: F.
- `15852d0da847`: p1 `cf7caece7779`: F; p2 `76dde02d2605`: E.
- `e6ed73658e51`: p1 `76dde02d2605`: E; p2 `d7736fa3de1c`: F.
- `de92bf370eb3`: p1 `3d5f07d7ddee`: F; p2 `688cda1ef5b3`: E.
- `a419407ead77`: p1 `d7736fa3de1c`: F; p2 `acdb7ec23979`: E.
- `7035914d6026`: p1 `ff62c483b0a6`: F; p2 `73e306996349`: E.
- `372f5ff58482`: p1 `237876527214`: F; p2 `ab8026147478`: E.
- `1b974a44ca86`: p1 `c628ed48222d`: F; p2 `df41e59964f0`: E.
- `f3578a763bf6`: p1 `d38a3fca8075`: F; p2 `df41e59964f0`: E.
- `fb13755c78a2`: p1 `842968a8a45f`: I.
- `385788c21452`: p1 `ace8676ebee0`: E; p2 `64112e4576b4`: I.
- `57e893c01c1a`: p1 `64112e4576b4`: I; p2 `9b583eb2344a`: E.
- `c73542c6a397`: p1 `847d55424968`: I; p2 `57e893c01c1a`: E.
- `f04f1a3948ae`: p1 `759b3ce26363`: I; p2 `57e893c01c1a`: E.

## Why the former gate did not enforce the hashes

`package.json` routes the gate to `scripts/gate.sh`. Before CV1, that script ran definition pins, then `npm run pins` and the five test stages for a full selection. Pins enumerated compatibility, Security, release reproduction, Page assets, Card resources, examples, and inventory. None read `verification/state-machines/coverage.json`. The explicit Node list and Plain/Native configs did not select `source-probes.mjs` or `check.mjs`. Security's AST seals protect a different inventory. Definition pins compile authored definitions. Neither inventory is the formal source map.

Before CV1, the formal hash guard existed only at `verification/state-machines/check.mjs:32–35` on the ordinary subsystem-check route. Its `--source` branch exits at line 31 before that guard. Thus a green gate or a source-only witness does not imply that the formal source hashes match. This is a call-path finding, not a claim that prior gates failed or that a fresh formal check ran.

Planner decisions `95fe45038b5de19c7662c9c09da9ca9cde532ff0` and `2f87c2dfb5cdcb351de169c2b2db5852b5b49992` authorize a raw-byte pins guard and deliberate refresh. This change adds `scripts/check-formal-source-hashes.mjs`. Normal pins check all eight mapped files: two Transport, one Observation, two Editor, two Effects, and one Voice. The guard uses only built-in Node, imports no product code, starts no subprocess, and never updates a record. A failure names the file, model, and one refresh command.

The explicit `node scripts/check-formal-source-hashes.mjs --refresh Model` route reads HEAD and each mapped file from Git. It refuses before writing if any mapped bytes differ from that commit. A successful refresh updates the selected model's hashes and syncCommit together. Other records and JSON formatting remain intact. Before refreshing, the author must confirm that the changed file still meets the model's premises. The commit that carries the refreshed record must state that confirmation. Missing prose is a review finding, not an automatic code check. A refresh is not evidence of a model/control PASS.

The new whole Node owner has one scratch case and one mapped-file drift. Its baseline works before a Git repository exists. Drift must fail without changing coverage. An uncommitted refresh must refuse without a write. After a premise-stated commit, explicit refresh must bind the selected model's hashes to that commit and leave all other records exact. The case imports no mapped source or model. Its actual whole-owner result appears below.

`formal-sources` becomes the first pins step. All existing pins argv and their order remain exact after that addition. The new Node owner is the only addition to `scripts/test.mjs`; existing owner bodies, settings, and deadlines remain untouched. Normal `check.mjs Model --source` still exits to the source witness before its hash guard. CV1 ran the maintained Editor and Effects checks once at the reviewed side head. The table records their scoped results and the separate statechart runs.

Root measured normal pins and a reviewed external copy with only the formal-sources step absent and the root path bound to the same candidate. Both exited 0 below the unchanged 60-second total budget. The direct guard took 0.077173375 seconds; normal pins reported its formal-sources leg as 0.079 seconds. The ordered sample pair took 16.683856167 seconds without the step and 17.774909250 seconds with it. Startup, cache, and order effects remain. The 1.091053083-second difference does not isolate the guard's causal cost.

## Evidence and remaining checks

The following records bind clean source head `5fd7e0907698c041d95354c12dcb6804e9bf3df5`, tree `4edefd3404e0184bf5b7a6e8139079f613a26706`, and main `6728059211cee75dc0f6fdd104ef52a44c5f7da0`. The original normal source application produced `dabb6ea8db3ffa3ce028bef8f5786185a1da44e3` / `12f5d77fad5cd23cf64aa74d7193a90a5469f00c`. A note-only amend corrected a duplicate phrase before any validation. Both application records remain intact.

The focused interval runs from START `f7fae0a0c4d74e96e2102b6841af41eafeeb7b97` to END `d08d4bd5b65386b043d8ba6e1d33222951b83dcd`. The maintained checks and statecharts run from START `9287fa339b149c5858401c247b4ad2661938deee` to END `28c755faabb3bee4d59f5b8fe89742f6372affd8`. The pins comparison runs from START `8380059f67a628be4b4f7493ac9e29b449ee0cbf` to END `96998b77a0943593adec4675945ed832ac29966f`.

Aliases below are exact path prefixes. `N` is `/opt/homebrew/bin/node`; `A` is `G/retained-inputs/artroom-cv1-reviewed-source-application-20261116`; `AO` is the original `/private/tmp/artroom-cv1-reviewed-source-application-20261116` command-input path; `F` is `G/retained-inputs/artroom-cv1-fast-checks-attempt1-20261116`; `M` is `/Users/hughpyle/play/artroom-evidence/2026-11-16-cv1-model-statechart-attempt1`; `P` is `/Users/hughpyle/play/artroom-evidence/2026-11-16-cv1-pins-comparison-attempt1`; `MP` is the matching private model directory under `/Users/hughpyle/play/artroom-private-evidence`; `SC` is `/private/tmp/artroom-cv1-statechart-preserving-tool-20261116/scripts/statechart.ts`. Except for the statecharts, command cwd is the CV1 worktree. Each chart runs in `MP/models/<Model>` with the literal model, config, view, and output paths shown. Output aliases name actual retained copies. `AO` and the tool/model aliases preserve original actual argv; retention does not relocate a command.

`G` is the actual `/Users/hughpyle/play/artroom-evidence/2026-11-16-cv1-source-correspondence` retention directory. `G/retained-inputs/` contains 140 regular files totaling 1,492,598 bytes: history export 98, Editor audit 8, reducer supplement 6, application 22, focused checks 5, and Effects revision-2 audit 1. Root verified bytes and modes before and after copy, with no symlinks or original changes. `M` and `P` retain their existing root-reviewed safe copies and private scratch. Future preflight and gate evidence remains absent. No output was reconstructed or rerun.

| Check | Command or source record | Result | Output and SHA-256 |
| --- | --- | --- | --- |
| Editor history and reducer correspondence | Filesystem source review; 19 commits, 37 parent edges, five reducer cuts. | Source-reviewed; no runtime exit. | `G/retained-inputs/artroom-cv1-editor-source-history-audit-20261116/README.md` SHA `3efc45361824902a3f10e15250f3712ead66859336cdeb3854ec7ee82feea9d2`; `G/retained-inputs/artroom-cv1-history-export-20261116/manifest.json` SHA `785a9588410fceae6563a466446b3f05834a911fe3ff55cb21e604270fa83532`. |
| Effects history and protected-body correspondence | Filesystem source review; 22 file/commit records, 40 parent edges. | Source-reviewed; no runtime exit. | `G/retained-inputs/artroom-cv1-effects-source-history-audit-revision2-20261116.md` SHA `90f02846f10e1be95fae222d9d74396c7e6a359a41ff3314a3b5fac9f05c570f`. |
| Finite evidence retention | Filesystem copies only; no runtime validation command. | 140 regular files / 1,492,598 bytes, byte- and mode-exact; originals unchanged, no symlinks. | `G/retention-manifest.json`, 56,675 bytes, SHA `9d9a4da9b90ba40fe712159b3d74d4ebfd8db56fc7cacc03a88be1508bb67b27`. |
| Canonical interval statements | Retained data only; no additional command or run. | Six attributed START/END statements for the focused, model/chart, and pins intervals. Separate from the 140-file retention manifest. | `G/workroom-interval-statements.json`, 10,399 bytes, SHA `55551f3b02831a50c5aa01405e47d4e6d81d1f58b1378537aaf6d92a497d87a8`. |
| Metadata application and note correction | `/usr/bin/git commit --file AO/message.txt`; later `/usr/bin/git commit --amend --no-edit`. Exact staging argv remain in the records. | Both exit 0; initial commit 1.460979791 s. Note correction precedes every check. | `A/result.json` SHA `433653eb7f8dace950fd2fa791c957234dfb20f1845c7d217637b025da6dc257`; `A/amend-result.json` SHA `00336844f54b3b994b407ffbeed5f6efd9c426786e281e3950cd932e7e7dad9d`. |
| Raw guard whole owner | `N --test scripts/check-formal-source-hashes.test.mjs` | Exit 0; 1 passed, 0 failed, 0 skipped; child wall 0.691413709 s. | `F/owner.stdout.log` SHA `f1f82b99403efe24273f82bbd099b80f11a64b970c2e9dc9bc6fe3985d789e96`; empty stderr. `F/result.json` SHA `e388ffd365b595ea217b86ef8dcae1c2503bbcf145cc923a092fc82d03df390d`. |
| Direct all-eight raw guard | `N scripts/check-formal-source-hashes.mjs` | Exit 0; 8 mapped files in 5 models; child wall 0.077173375 s. Focused outer wall 0.905273625 s, clean source and no surviving owned groups. | `F/guard.stdout.log` SHA `b232ff024a7e456a7b5a0b6fed00052cc84402b0275dae1920910475dcc55893`; empty stderr; same focused result. |
| Maintained Editor check | `N verification/state-machines/check.mjs Editor` | Exit 0; wall 1.940328375 s. TLC: 10 generated, 7 distinct states, depth 5, no error; source property passed. | `M/check-Editor.stdout.log` SHA `c21337158c78716153adf1b8fb36d4f6a59baa6a670c212d02fc312502d9344f`; stderr SHA `2e8cd88ee8b459c95d47ee098c9ed5138d059e146725d91e9f4dd200e23f7a19` holds a module.register deprecation warning. |
| Maintained Effects check | `N verification/state-machines/check.mjs Effects` | Exit 0; wall 8.807051000 s. TLC: 13 generated, 7 distinct states, depth 4, no error. Its maintained source witness reports 1 passed and 10 intentionally skipped in 1 file. | `M/check-Effects.stdout.log` SHA `728e4b0486ef3074aa6c44cfdbea3c4b8105b5ef71ff62e5870f83ca738afe83`; empty stderr. |
| Editor statechart | `N SC MP/models/Editor/Editor.tla --config MP/models/Editor/Editor.cfg --view MP/models/Editor/view.mjs --out MP/charts/Editor-chart` | Exit 0; wall 1.430017542 s. 7 states / 9 steps; chart 7 states / 6 arrows, hides 3 steps. EvidenceBeforeProgress and NoDeadlock hold. | `M/chart-Editor.stdout.log` SHA `a13e11f3a98eb7299c1f46a7f2c5db1403e8f250d22e2743d17ce0a34f99f028`; `M/charts/Editor-chart/chart.mmd` SHA `c844121af3d56a51b1a2c83be635599146039578a8e89b5f9c65b0e3926af0d2`, byte-equal to tracked chart. |
| Effects statechart | `N SC MP/models/Effects/Effects.tla --config MP/models/Effects/Effects.cfg --view MP/models/Effects/view.mjs --out MP/charts/Effects-chart` | Exit 0; wall 1.387829375 s. 7 states / 12 steps; chart 5 states / 7 arrows, hides 2 steps and omits 2 within-chart-state steps. AtMostOneSend, MarkBeforeEffect, and NoDeadlock hold. | `M/chart-Effects.stdout.log` SHA `b79dc89ffe5f99359f36c142d881b22ccb749761efc5eaac4f18da8274ad3523`; `M/charts/Effects-chart/chart.mmd` SHA `304ab93ded45fbab7aa9e4079798aa9fcbde78e30345e3d51627bef6f82c117a`, byte-equal to tracked chart. |
| Model/chart interval | Retained data; no additional command. Four exact commands above. | All four exits 0; outer wall 14.638880458 s. Both chart/config/view/model inputs and the source stay unchanged. | `M/result.json` SHA `5d5c4ca3a614d9c647c745f33802765cfa676cc4f258c8040bad3156e10cf561`; root-reviewed safe copies bound by `M/manifest.json`. Full checker/chart scratch stays private. |
| Pins without formal step | `N /private/tmp/artroom-cv1-without-formal-guard-readiness-20261116/pins.without-formal.mjs` | Exit 0; measured child wall 16.683856167 s; pins reports 16.614 s. Existing whole owners: Security 13, release 1, Page 1, Card 6, examples 3, inventory 5 passed. | `P/pins-without-formal.stdout.log` SHA `ea303ed403d55a5960ef9081785e73e5b3dc2d7aac3282912437026c5ce725cc`; empty stderr. |
| Normal pins with formal step | `N scripts/pins.mjs` | Exit 0; measured child wall 17.774909250 s; pins reports 17.699 s. Same whole-owner counts; formal step 8 files / 5 models, reported 0.079 s. Both samples below 60 s; no causal cost claim. | `P/pins-with-formal.stdout.log` SHA `b11f2d23c3ab273a24250c223c97ff9341711447320101f2ec4e74ca9a97e566`; empty stderr; `P/result.json` SHA `c5ffe7b45677843d898c8eb90bb69b864933f2e4fea365b7d1b5960a2ffb11f9`. |
| Final preflight | `node scripts/check-shared-helpers.mjs`, whole `npm run typecheck`, and `npm run pins` at the eventual exact head, after root's current-main guard. | UNRUN. The dated pins comparison above is not a claim about a future head. | Actual exact head/tree, exits, walls, and outputs owed. |
| Final gate | Ordinary `npm run gate` at the eventual reviewed source head, only under root authority. | UNRUN. | Actual head/tree, exit, wall, terminal counts, log path, and SHA-256 owed under `G`. |

CV1 owns the adopted source binding, the raw pins guard, and its measured cost under the two planner decisions. The original formal request and earlier delivery notes retain their historical checks, failed attempts, controls, and limits. This change adds no new model or control definition. The maintained Editor and Effects checks and the byte-equal statecharts now have the scoped results above. They add no new control execution or product acceptance claim. The history premises, source-authentication limits, final preflight, gate, review, and landing remain separate obligations. C4's separate private-shape extraction stays frozen.
