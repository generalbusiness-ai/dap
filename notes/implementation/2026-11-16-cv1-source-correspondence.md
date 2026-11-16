# CV1 source correspondence for Editor and Effects

## What changes

This change refreshes three source hashes and the Editor and Effects sync commits after a source-history review through `6728059211cee75dc0f6fdd104ef52a44c5f7da0`. It clarifies the correspondence map and both project skills, adds a built-in-Node raw hash guard to pins, and adds its single scratch owner to the maintained Node list. It changes no product source, TLA+ model, model configuration, view, invariant, diagram, control, package input, or existing test assertion. Root has reviewed the source and has not run its checks.

The original audited cuts are main `e09addf0815c288b5902f5a1799dada970453756` and E4 `0cd97bd438975cdafac141bf2746805b8196b089`. The exported main cut is `6728059211cee75dc0f6fdd104ef52a44c5f7da0`; the exported AE1 cut is `7808c06482d61e27e1bda07f195d85f55da1ac16`. All four export the same three changed-file hashes and the same corresponding history sets. The separate Editor reducer supplement supplies sync plus all four cuts; all five reducer files match.

The reviewed hashes, taken from the immutable export rather than a new production computation, are:

- `packages/scope/src/operations.ts`: `b33908e9a65901298d6d6ca3b11c3dadb0888891591874ccd369a9011e19cf3b`.
- `packages/scope/src/sqlite.ts`: `c012365221f0695050a8f891fc40f95942753ad199173c30af4e9f6da8c299b6`.
- `apps/room/page/src/retained-editor-data.ts`: `6e620c3377e6041a9cf935b0f7bc4f733bd6ebf1738c1585a4b751be26cc0498`.

The unchanged reducer hash remains `159a82608a78b04f3849d10bcb5a5f2f8a7c6c0dcae69f932636cf3e0b688141`. Transport, Observation, and Voice keep their existing metadata. A matching hash detects drift; it does not establish refinement or source authenticity.

## Decisions and history

The export contains 41 file/commit records and 77 parent/file comparisons: ten operations records, twelve SQLite records, and nineteen Editor records. A commit shared across files has a separate record for each file. The lists below include every parent, including empty patches. Category labels carry the exact before/after source anchors. Full commit IDs, parent IDs, blobs, and individual patch paths remain in the export manifest. No first-parent shortcut or merge-subject inference replaces those comparisons.

The immutable input is `/private/tmp/artroom-cv1-history-export-20261116/manifest.json`, SHA-256 `785a9588410fceae6563a466446b3f05834a911fe3ff55cb21e604270fa83532`. The detailed Effects review is `/private/tmp/artroom-cv1-effects-source-history-audit-revision2-20261116.md`, SHA-256 `90f02846f10e1be95fae222d9d74396c7e6a359a41ff3314a3b5fac9f05c570f`. The Editor review is `/private/tmp/artroom-cv1-editor-source-history-audit-20261116/README.md`, SHA-256 `3efc45361824902a3f10e15250f3712ead66859336cdeb3854ec7ee82feea9d2`. Reducer supplement metadata is `/private/tmp/artroom-cv1-editor-state-supplement-20261116/metadata.json`, SHA-256 `34eb936d05b8c4eebb9b62a4184113d17f03bd98f8ea327f48031164562e2db9`. Root plans durable retention under `G`; the source reviews already exist at these external paths. Durable copies and their final locations remain owed.

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

The new whole Node owner has one scratch case and one mapped-file drift. Its baseline works before a Git repository exists. Drift must fail without changing coverage. An uncommitted refresh must refuse without a write. After a premise-stated commit, explicit refresh must bind the selected model's hashes to that commit and leave all other records exact. The case imports no mapped source or model. It remains unrun.

`formal-sources` becomes the first pins step. All existing pins argv and their order remain exact after that addition. The new Node owner is the only addition to `scripts/test.mjs`; existing owner bodies, settings, and deadlines remain untouched. Normal `check.mjs Model --source` still exits to the source witness before its hash guard. CV1 will run the maintained Editor and Effects checks once at the reviewed side head. It records no such result yet.

Root will measure normal pins with this guard and a reviewed external control copy with only this step absent and the root path bound to the same candidate. No alternate owner, worker, deadline, or package input changes for that comparison. The guard's own measured wall and both complete pins walls remain owed. Both pins intervals must stay below the existing total 60-second budget. No timing guarantee or result is inferred from this source plan.

## Evidence and remaining checks

`G` means `/Users/hughpyle/play/artroom-evidence/2026-11-16-cv1-source-correspondence`. It is the planned durable destination, not a claim that these files already exist there. The source-review paths above are actual. The rows below keep future checks unrun until root records their real argv, result, duration, source head/tree, and output digest.

| Check | Command or source record | Result | Output and SHA-256 |
| --- | --- | --- | --- |
| Editor history and reducer correspondence | Filesystem source review; 19 commits, 37 parent edges, five reducer cuts. | Source-reviewed; no runtime exit. | External Editor README `3efc45361824902a3f10e15250f3712ead66859336cdeb3854ec7ee82feea9d2`; export manifest `785a9588410fceae6563a466446b3f05834a911fe3ff55cb21e604270fa83532`. Durable copy owed. |
| Effects history and protected-body correspondence | Filesystem source review; 22 file/commit records, 40 parent edges. | Source-reviewed; no runtime exit. | External revision-2 audit `90f02846f10e1be95fae222d9d74396c7e6a359a41ff3314a3b5fac9f05c570f`. Durable copy owed. |
| Metadata application and current source binding | Root's reviewed application/source record. | UNRUN; proposal only. | Actual head/tree, argv record, and digest owed under `G`. |
| Maintained Editor and Effects checks | Once each at the adopted side head: `node verification/state-machines/check.mjs Editor` and `node verification/state-machines/check.mjs Effects`, with the pinned external tools. | UNRUN. Earlier model/control results retain their original cuts. | Actual commands, exits, walls, and output digests owed under `G`. |
| Raw guard whole owner | `node --test scripts/check-formal-source-hashes.test.mjs`. One scratch drift, rejected mismatched refresh, and explicit reviewed refresh. | UNRUN. | Actual argv, exit, wall, stdout/stderr, and digest owed under `G`. |
| All-eight raw hash guard and pins cost | `node scripts/check-formal-source-hashes.mjs`; normal pins with the guard; reviewed same-root external pins copy without that one step. | UNRUN; root owns both measured intervals. | Guard wall and both full pins walls/exits/output digests owed under `G`; each pins total must remain below 60 seconds. |
| Final gate | Ordinary `npm run gate` at the eventual reviewed source head, only under root authority. | UNRUN. | Actual head/tree, exit, wall, terminal counts, log path, and SHA-256 owed under `G`. |

CV1 owns the adopted source binding, the raw pins guard, and its measured cost under the two planner decisions. The original formal request and earlier delivery notes retain their historical checks, failed attempts, controls, and limits. This change adds no new model or control definition. The maintained Editor and Effects checks remain owed once each. Source review supplies no fresh model/control result or product acceptance claim. Review and landing remain owed. C4's separate private-shape extraction stays frozen.
