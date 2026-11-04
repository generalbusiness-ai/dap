# Testing strategies from dap's repair history

Reviewed source: bf3bceb667e99876d2edc4880c3c337f944f5fbe, tree 0db11883ddfbc7d6435ba5d921a4fd375aab494e.
Date: 2026-11-03. Request: 17cc2a55. Performer: checker.
Scope: history-led test strategy, with current source and witnesses checked. No source or tests changed. This review does not claim new defects in the repaired paths.

## Recommendation

Start with three separate implementation requests: independent MCP Apps contract checks, generated Git framing variants, and an independent settlement-obligation model. The first two offer bounded, relatively cheap protection against real interoperability failures. The third addresses a larger family of semantic failures that runtime/replay agreement cannot independently detect.

Property-based tests vary inputs while preserving a stated property. Model-based tests vary command histories against a smaller explicit state machine. An independent oracle decides the expected result without calling the production algorithm. These techniques solve different problems here. Random inputs alone would not have exposed the caller/fixture agreement on the wrong MCP contract.

The counterfactual judgments below are engineering inferences from actual repairs, not proof that a historical generated suite would certainly have found each defect. Existing regression tests now cover the named failures. Extend those witnesses and retain their named examples.

## 1. Validate MCP Apps messages against an independent contract

Priority P1. Effort S–M. Risk LOW. Confidence HIGH.

Historical case: 9961714716 changed ui/message.content from one object to an array. Both packages/mcp/browser/main.ts and its scripted host had accepted the object shape. Their agreement concealed the interoperability error. The new caller is at packages/mcp/browser/main.ts:249. The strict fixture is at packages/mcp/test/support/views-host.ts:193. The current production-browser witness at packages/mcp/test/views-browser.mjs:246 asserts the exact message and one explicit model turn.

Why this would have mattered: an independently sourced wire-contract check could have rejected the old shape before the actual host encountered it. More tests against the same permissive fixture would not have helped.

Implementation scope:
- Preserve the exact existing handoff regression.
- Add a test-only, versioned contract oracle for the outbound methods the browser actually uses. Source the admitted contract from the relevant pinned upstream schema or SDK, record its version and provenance, and check its supported revision. Do not derive the oracle from dap's own types or fixture handlers.
- Capture the generated production card's outbound messages. Generate bounded text and card identities, supported protocol revisions, absent optional capabilities, malformed replies, and teardown schedules. Validate each method against its own contract.
- Assert that explicit handoff preserves item and revision, and that only the explicit handoff requests a model turn.
- First cover ui/message, then the other existing outbound methods. Do not attempt a complete MCP conformance framework.

Distinguishing control: restore the object content shape at the caller. The unchanged oracle must fail by assertion. Keep the current strict-host browser check as an integration witness.

Verification owners: packages/mcp/test/views-browser.mjs and .github/workflows/views-browser.yml. Run the maintained browser command through its existing pinned scratch-tool setup: node --import tsx packages/mcp/test/views-browser.mjs. Do not install browser tools into the checkout.

Done when: the old object fails independently, supported production messages pass, and the browser witness still records exactly one correct explicit handoff. If the upstream revision does not provide an executable schema for a method, report that boundary and pin a narrowly quoted contract fixture rather than inventing a permissive validator.

## 2. Generate Git framing variants around the real-Git oracles

Priority P1. Effort M. Risk LOW. Confidence HIGH.

Historical cases: 485e785c4d accepted optional LF endings in upload-pack text packets; a03d3153db accepted an HTTP service preamble before protocol v2; 920029d52c accepted one additional terminal receive-pack flush. The last repair changed an otherwise valid push reply from unknown to the reported result.

Current boundaries: packages/git/src/http-read.ts:512 and :580; packages/git/src/http.ts:229. Existing independent checks already use real local Git and Node zlib. packages/git/test/http-read.test.ts:403 exercises actual Git v2. packages/git/test/http.test.ts:30 and :40 cover the observed double flush and malformed near-neighbours. This is an extension of good oracles, not an absent-oracle finding.

Implementation scope:
- Extend http-read.test.ts and http.test.ts with a small test-only protocol grammar generator. Keep upload-pack and receive-pack grammar rules separate.
- Generate valid messages with permitted text endings, optional preamble, capability order, sideband payload segmentation, and the admitted terminal flush count.
- Require equivalent valid messages to return the same exact object bytes/IDs or push classification. Keep the real Git/zlib checks as the independent source of object truth.
- Apply one invalid edit at a time: bad packet length, missing delimiter, duplicate required capability, wrong ref, extra status, extra flush, or trailing garbage. Require bounded refusal or an unknown send classification, as the boundary specifies.
- For sends, assert at most one POST and preserve unknown outcomes. A later matching ref cannot by itself prove that this send succeeded.

Distinguishing seeds: LF-free version 2; service marker then flush then version 2; unpack ok then exact own-ref status then two terminal flushes. Revert one corresponding historical check and require the intended seed to fail. Shrink by removing optional packets and capabilities while preserving the relevant grammar.

Proposed budget: roughly 100 small pure wire variants and a small fixed set backed by real Git. Do not start a Git process for every random packet variant.

Verify after compatibility preparation: npx vitest run --project git http-read.test.ts http.test.ts.
Done when: the three historical forms pass, nearby malformed forms retain their refusal semantics, and generated successes preserve independently known bytes and send counts.

## 3. Model settlement obligations independently of the fold

Priority P1. Effort L. Risk MED. Confidence HIGH.

Historical cases:
- 1cb86204dd bound settlement to the subject selected before the same entry changed its reference.
- 8608356175 kept a holder's reserved room through an ordinary final transition until its own final settlement.
- d76ad703a2 funded each request from its actual originating send.

Current boundaries: packages/derive/src/item-duties.ts:33, packages/derive/src/fold.ts:169, packages/derive/src/request-duties.ts:14. Existing named witnesses at packages/derive/test/forms-settles.test.ts:59 and :99 and forms-final-holder.test.ts:20 already cover these cases. Runtime and replay share the fold and reservation code; their agreement is valuable but cannot independently establish the intended accounting.

Implementation scope:
- Extend the tiny existing marker/Works fixtures, not arbitrary generated definitions.
- Keep a literal test ledger keyed by item identity, mark or state duty, originating send, and identified settlement. Give the fixture explicit known entry and pending-request allowances.
- Generate legal histories over two or three items: open, point, retarget while settling, ordinary mark/final change, actual mark/final settlement, send, refusal, duplicate result, unknown outcome, and later confirmed outcome.
- After each command, compare production obligations to the literal ledger. Ordinary changes retain obligations; a settlement releases only the pre-entry selected subject's identified duty; each request keeps its own allowance; repeats consume no second resource.
- At small configured capacity limits, show that an admitted opening retains enough room for the fixture's known remaining completion. Check equality and one-unit-over boundaries.
- Do not call reserved, heldReserved, requestReservation, updateItemDuties, or the production fold to compute expected values. Start with entries and requests; add byte dimensions only when the fixture can supply an independent allowance.

Distinguishing history: open primary A and targets B/C; point A at B; settle B's mark while retargeting A to C. Only B's corresponding obligation disappears. Separately, ordinary final transition then late outcome must retain the holder's debt.

Proposed budget: 100 deterministic in-memory histories of at most 20 commands; select 4–8 minimized histories for real SQLite eviction and replay. These are initial caps to measure, not measured runtimes.

Verify: npx vitest run --project derive forms-settles forms-final-holder, plus the new owning model file. Run selected native histories through the existing turn/compose witnesses.
Done when: the model detects the pre-entry binding and premature-holder-release controls, preserves the named regressions, and produces reproducible short traces without sharing expected-value logic with production.

## 4. Check fixed-slot indexes against a direct scan through storage lifecycles

Priority P2. Effort M. Risk LOW–MED. Confidence HIGH.

Historical cases: e7a70e9c88 repaired genesis initialization, fe9fefb9e0 ordered dependency reads by their primary key, and 73528f2d5e bound readiness to the actual head after an older writer advanced authoritative items without updating the derived index.

Current source: packages/scope/src/sqlite.ts:180 and :232. The strong existing rollforward witness is packages/scope/test/fixed-index.test.ts:112. Strengthen it rather than replacing it.

Use a small authoritative test item array and an independent equality predicate as the count oracle. Generate create, transition, repeated absolute row write, transaction rollback, restart, clear/rebuild, and legacy append commands. Query present, absent, optional, and final-state values after each committed command. Counts must equal a direct scan; rebuild must preserve the semantic checkpoint; rollback must preserve both items and answers; a marker for an old head cannot establish current readiness.

Start with strings, booleans, and missing values. Do not compute expectations with fixedRowsOf, fixedValueOf, fixedCount, or MemoryState's index. Add structural references only with an explicit test-side reference table.

Distinguishing history: establish readiness; append through the base writer without fixed writes; restart; query the appended duplicate. Omit the marker/head comparison as the control and fail on the behavioral count.

Proposed budget: 12 histories of 12–20 commands with small item sets. Keep the existing 34,000-row witness separate.
Verify: npx vitest run --project derive fixed-slot-index; npx vitest run --project scope fixed-index.
Done when: indexed answers match the scan after each committed command and after rebuild/eviction, and the head-binding control fails by assertion. Preserve the distinction between direct storage specimens and admitted acts.

## 5. Model card histories around unknown outcomes and retained reads

Priority P2. Effort M. Risk MED. Confidence HIGH.

Historical cases: 8ea69d4355 reopened cards on the process their calls reached; ee6e7d1fb6 repaired a universal ten-second wait that expired during an observed 11.6-second signed read; ebc1e608e2 stopped treating a truncated retained result as a complete exact-read answer.

Current boundaries: packages/mcp/src/views/session.ts:267 and :423; packages/mcp/browser/bridge.ts:37 and :125. view-sessions.test.ts and views-browser.mjs now cover the individual delayed, truncated, stale, and two-process histories.

Generate open, read, press, timeout, late reply, process switch, refresh, supersede, explicit retry, and teardown. Maintain a separate ledger of the active view, displayed cut, pending original request, signature count, and complete/truncated result state. Keep the model smaller than ViewSessions.

Properties: uncertainty never triggers an implicit repeat of a write; pre-admission stale/superseded requests sign nothing; complete retained answers replay without signing; an explicit retry of a truncated read signs one new read; bridge close settles pending requests once; the receiving process opens a missing view before dispatch.

Distinguishing histories: start read, timeout, return late, check original; retain truncated read, retry explicitly, complete; open on process A, dispatch through process B. Use gates and fake timers, never elapsed sleeps. Keep most cases plain and a few browser witnesses for visible recovery controls.

Proposed budget: 100 short plain histories and four fixed browser histories. Verify with npx vitest run --project mcp view-sessions and the maintained browser workflow. Done when signature/dispatch counts match the model and the existing recovery scenarios still pass.

## 6. Model retained payload visibility independently of complete history

Priority P2. Effort M–L. Risk MED. Confidence HIGH.

Historical case: 732ab3b372 prevented a later live item reference from resurrecting an already archived final item's payload. Related replay repair 1d5297fe79 preserved size-refusal semantics after detached-text redaction.

Current boundaries: packages/derive/src/floor.ts:43 distinguishes identity from payload and masks complete history. packages/scope/test/floor-monotonic.test.ts:19 already runs the exact counterexample through Native SQLite, restart, and replay of the same saved complete journal.

Generate a tiny definition's legal open, finish, item-reference, fact-reference, keep, floor, checkpoint, read, and restart histories. Maintain separate independent sets for item identities and visible payload positions. A surviving item identity cannot restore an archived opening. A later fact requiring unavailable payload must remain unavailable. Compare direct reads, archived refusals, and checkpoints.

Do not use stateKept or floorOwn to compute expected visibility. Native/replay agreement alone shares the relevant derive logic. Keep real floor windows and valid clock/checkpoint conditions; do not fabricate unreachable histories to shorten the test.

Distinguishing history: open and finish item 1; floor past its opening without keeping it; reference identity 1 from a live item; advance floor again; restart. Identity remains, opening stays archived. Add a separate required-fact refusal.

Run most graph properties at stateKept's pure boundary and only 4–8 valid histories through Native. Verify with npx vitest run --project derive floor and npx vitest run --project scope floor-monotonic, plus the selected replay owners. Done when the independent visibility set catches resurrection without weakening actual floor admission.

## 7. Model archive reservation receipts and completion order

Priority P2. Effort M. Risk LOW. Confidence HIGH.

Historical cases: fb52d1bce7 settled completed archive reads from checked byte receipts while keeping failed/outstanding reads fully charged. 340af95709 extended settlement to migration reply buffers.

Current boundary: packages/scope/src/archive-budget.ts:93, :106, and :119. archive-budget.test.ts already covers completed, outstanding, foreign, reused, and late receipts. Existing journal-append-cost.test.ts:60 and journal-pass-cost.test.ts:50 compare actual debit deltas with forecasts. Preserve those independent measurements.

Generate spend, reserve, settle, failed read, lookahead, asynchronous completion, clock advance/reversal, and terminal stop commands. The small oracle keeps original ceilings, opaque ownership, one-use settlement, fixed charges, and the original deadline. Calculate proportional work with independent integer arithmetic. Settling B cannot release A's allowance; failure/abandonment retains its ceiling; terminal stop admits no later credit or continuation.

Distinguishing histories: reserve A/B, complete B, attempt new work while A remains pending; settle a handle twice; submit a foreign handle; deliver receipt after deadline; catch a lookahead shortage and return a value. Use tiny configured limits and exact/one-unit-over boundaries.

Proposed budget: 100 plain ledger traces, few gated async traces. Verify: npx vitest run --project scope archive-budget. Later, vary archive shape in existing forecast/actual witnesses rather than inventing a second forecast implementation.

## 8. Pair stream ownership schedules with a real resource-count oracle

Priority P2, coordinated with the already open stream follow-up. Effort M. Risk LOW–MED. Confidence HIGH.

Historical evidence: notes/implementation/2026-11-02-stream-cause.md:7 records 64 open directory streams, zero releases, and twenty unavailable HTTP503 bodies. Its final samples still held streams after tabs closed. Direct JavaScript cancellation tests could not establish that HTTP disconnects reached the Native cleanup boundary.

b6d8a38eae added retained cleanup for runtime-reported disconnects. packages/scope/src/http-stream.ts:4 handles an already-aborted opening. packages/scope/test/sessions.test.ts:83 now verifies an actual Native release through the route with an ExecutionContext stand-in.

Generate gated opening-pending, observed abort, opening-return, body cancellation, release acknowledgement, repeated close, and EOF schedules. Independently count allocated/returned handles, close work, completed releases, and pending retained cleanup. A returned live handle closes once even when several signals race. Retained cleanup remains pending until its acknowledgement. Early abort may prevent a delivered opening, so do not require a release RPC for a handle that never exists.

Pair the model with a real runtime/browser native-count check after abort and another opening. Keep a failing boundary visible: notes/implementation/2026-11-03-stream-http-close.md:3 explicitly records that local Chromium abort and active page close still leave subscriptions open because request.signal does not fire. A pure model cannot prove that the runtime reports an event.

Related harness repair 03102b56c3 joined actual callbacks before teardown. native-fixture-lifetime.ts:121 and session-ownership.test.ts:100 already cover that join; add schedule variants there only when that ownership code changes.

Verify the scoped schedules with npx vitest run --project scope routes.test.ts sessions.test.ts session-ownership, and use the existing pinned browser fixture for the actual runtime boundary. Do not infer deployed-host behavior from the local fixture.

## Additional bounded follow-up: source order and receiver pins

8c117af37d introduced source-order suppression; b34a9f38f4 repaired suppression's receiver-pin settlement. Current code is packages/derive/src/delivery.ts:198 and fold.ts:215. source-order-reserved.test.ts:9 already covers higher then lower and repeat.

Enumerate all 24 orders of four sends before adding a random generator. Use two handlers and sender incarnations, a refused higher pair, and exact duplicates. An independent model tracks the greatest applied (seq, ordinal), exact decided identities, and each reserved decision. Refused higher pairs do not advance the frontier; superseded terminal deliveries still settle their own pin; repeats debit nothing. Do not assert identical journals for every permutation: increasing deliveries can apply before a higher one arrives.

This can follow the settlement model. Run npx vitest run --project derive source-order, then 4–8 selected native schedules through --project scope source-order.

## Implementation discipline and acceptance

- Keep existing named historical witnesses. Each generated failure prints its seed or enumeration index, the command trace, expected and actual state, and the minimized valid counterexample. Promote new counterexamples to named regressions.
- Start with bounded enumeration for finite schedules. For larger domains, use one pinned shrinking library if it improves replay and minimization. Any package/lock change belongs in a reviewed dependency commit. Never install a probe tool into a checkout.
- Put shared test mechanics only where two implemented tests actually need them. Do not build a repository-wide generator framework or generate every definition form.
- Keep most execution at pure or plain boundaries. A small selected native set proves transaction, restart, and alarm behavior. A small browser set proves the real caller and controls.
- Model only reachable commands. Keep intentionally malformed protocol inputs in the grammar tests; do not count unreachable state combinations as application coverage.
- Retain one or two meaningful fault controls per invariant. Run scripts/control.mjs only on the owning test file, with the intended assertion. No mutation sweep.
- Run node scripts/cloudflare-pool-compat.mjs before direct Vitest calls. During implementation, run only owning files. Run npm run gate once at the final candidate, following docs/testing.md evidence rules.
- The counts above are proposed initial caps. Measure added runtime and tune case counts after checking that every named historical seed still runs. If a failure only produces a timeout or setup error, report it as inconclusive.
- Separate requests 1, 2, and 3. None requires a broad production refactor. Request 5 benefits from the contract oracle in 1; source-order accounting benefits from 3. Coordinate request 8 with the existing stream owner.

## Considered and deferred

Canonical JSON and restricted JSONata deserve future generated coverage, but current RFC vectors, adversarial cases, pinned evaluator fingerprint, and historical evidence here do not justify prioritizing them over the concrete failure clusters above. A round trip alone would not give either codec an independent oracle.

OAuth has rich state histories, but I did not audit the complete issuer/grant lifecycle in this review. Do not treat this report as an OAuth or security audit. I also did not audit every application, native macOS code, deployment, or remote host.

This report makes no claim that the project lacks good tests. Its strongest existing practices—real Git/zlib, genuine Native histories, exact historical regressions, and forecast-vs-actual charges—provide the starting points.

## Verification of this review's baseline

Ran npm run gate exactly once at the unchanged source head and tree above. Exit 1 at doc-links. The checker scanned ignored nested .builder-worktrees and reported 198733 local links checked, 18654 broken. Typecheck and all test phases were unreached; this is no test-pass evidence. The dependency stamp matched and installation skipped. No mutation control or additional suite ran.

scripts/check-doc-links.mjs:31 excludes node_modules, .git, and test but not nested worktrees; :38 applies the notes exclusion only to the top-level relative path. git check-ignore confirms .builder-worktrees/views-browser-20261101 is ignored. This is an additional concrete oracle opportunity: for an explicitly defined repository-doc scope, adding an ignored nested checkout must not change the selected document set or result. Planner should settle that scan scope before implementing the metamorphic fixture. Do not hide real tracked broken links or delete worktrees to force a green result.

Retained raw gate files and checksums, read-only, at /Users/hughpyle/play/artroom-evidence/2026-11-03-test-strategy-bf3bceb667-c96kWH. Manifest: manifest.json, SHA256 fa179b746078caecd75c5bfd565fd1020eefca5c9f77428c81fa77e1144dd393. The external manifest records head, tree, failed stage, exit, and each raw file's byte count and digest. No implementation manifest or note was committed because this review changes no source or tracked file.
