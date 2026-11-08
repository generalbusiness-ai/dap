# Retained-editor stages and their evidence

Status: preparation only. Request `8ae87346` and promise `a20e0cf1` own this branch. S1 owns the active gate slot. M7 follows, then S3. Runtime source remains unchanged. Two reply-fault characterization cases are drafted and have not run.

## Current state and the intended change

`EditTask.state` currently relies on separate optional lane, proposal, source and version fields. `sendStep`, `continueEdit` and `checkEditRequest` write the tag. Each step's attempted flag, answer and receipt-verification flag add further combinations. The catch in `continueEdit` scans those flags to decide unknown versus stopped.

The refactor will make one discriminated stage carry the evidence for its next action. Waiting for a lane requires the verified opening receipt. Waiting for rules requires the lane and proposal. A collected source and a recorded version require their exact facts. Unknown work requires the attempted step, its original signed envelope and its preceding verified progress. Refused and stopped tasks keep that prior progress.

A pure transition function will own stage changes. Network helpers will read, keep, submit and follow receipts, then return their results to that function. The controller must record the attempted boundary before submission and retain a known answer before awaiting receipt verification. A failure after an attempted, unverified request must stay unknown. The stage must distinguish that uncertainty directly, rather than rescan optional flags.

The loaded Page remains the only task store. Legacy and LIST1 retain separate paths. Current user-visible messages stay unchanged. No framework or dependency is planned.

## Existing witnesses and callers

The preparation map names eight existing witness families in the retained-editor and LIST1 owners. They cover original request identity, unsent recovery, changed context/base, failed custody reads, the keep/send boundary, exact legacy proposals, LIST1 source-versus-version identity and unknown settlement.

`retained-editor.ts` reads task progress to label controls, fence unsent recovery, show step results and link a recorded proposal. Its caller adaptation must use the stage's evidence. Test fixtures that manually construct or corrupt the old task representation will need explicit stage fixtures while retaining their behavioral guarantees. `record.scope.test.ts` calls only read-only preparation. `editor-list1.scope.test.ts` must remain in the focused plan alongside the two requested retained-editor owners.

The wider Page witness search found no retained-editor case for refusal after an earlier verified step or acceptance whose receipt cannot be verified. Two drafted cases use the native editor fixture, then one explicit reply fault at the client boundary. They retain the earlier receipt and exact signed envelopes, require a stop before another send, and check original-association settlement for an unverifiable receipt. They have not run yet. The fixtures claim no native refusal policy outcome.

## Preparation evidence

The [preparation manifest](evidence/2026-11-07-s3-preparation.manifest.json), SHA-256 `c726f66045ead58b8e232351304ff2874c3f1ea75613e2e3bc6f3aa8cc0497b9`, binds 11 read-only files at `7244d884`, including six source snapshots, the effective request and promise, and the witness map. Every witness entry says source inspection only. No pass result follows from this map.

| Check | Method | Result | Retained output SHA-256 |
|---|---|---|---|
| Current guarantees and callers | Inspect the six source snapshots and resolve existing witness titles | Eight witness families found; no execution | `efc6887353e803d2b0a55259ee0cc27ec6976e3f20823ebdea0bd399e28595be` |

Implementation, focused checks, Page generation, exact-source Page workflow, one gate, independent review and audited landing remain. Builder only; the planner deploys.
