# Keep a page's signed request where a person's other device can settle it

Status: source implementation. The gate passed at `5ad1b308`. No Worker runs this code yet. The planner deploys it in a later deployment.

Request `7d6ce0f63b9db0f726bd65ed474e411af7d699c2` and promise `3649cf4ac25e995f657730259cbc8b1b415812d9` own this head. The design is [the signed-requests note](../2026-10-31-signed-requests-across-devices.md), and the checker approved it in `30f424c3`.

## What changed

A person who loses a reply on one device can now get the scope's answer from another device, with no new signature.

- **The copy.** `packages/scope/src/originals.ts` keeps the exact body of a member's `POST .../acts` request in the membership object. Four `/originals` routes in `packages/scope/src/worker.ts` keep, list, read and end a copy. Only a session of the same member reaches a row.
- **The writer.** `act` in `apps/room/page/src/data.ts` keeps a copy before it sends, and ends the copy on the scope's answer. `retained-editor-data.ts` does the same. If the room keeps no copy, the page sends nothing and says so. Anything that stops the send after the keep ends the row.
- **The button.** `apps/room/page/src/original-check.ts` holds **Check original request**. One press settles the request. If the scope holds no entry, the page sends the same bytes once, and only past the margin. Before the margin, it says when to check again. Only `landed` and `refused` lift the page's fence, and only when the fence holds that row's digest.
- **The lock.** A key's own open copy locks that scope on that page until the margin passes. Other keys keep their acts.
- **A second key.** `packages/client/src/device-key-invitation.ts` adds a closed link format, and the page's new Devices screen issues a link through `issueDeviceKey`.
- **A full object.** `keep` refuses `full` at a member's own caps and `room-full` at the object's cap, each with its own page text. Before `room-full`, it drops the rows of members who are no longer active or who hold no active key, one bounded quantum at a time.
- **A failed read or renewal.** A failed read of the open copies keeps the last rows, with the lock and the button, and the page says so. A page that held a session and failed to renew it stops the send and says why. The page remembers each service, membership and key under which it held a session, so closing a room forgets nothing, and only a new page load does.
- **The time bound.** A row with no answer goes seven days past its `notAfter`, through the object's one alarm. `Wakes` in `packages/scope/src/outbox.ts` gains the `originals` cause.
- **Reference.** `docs/security/entry-points.md` and `scripts/security-entry-points.mjs` state the four routes. `packages/scope/README.md` and `packages/client/README.md` add their rows.

Hosted code changes. `apps/room/page/assets.ts` is the rebuilt bundle.

## Decisions

- **The planner's ruling `d64edebe` holds the scope.** J1's head closes plan 032's condition for the room page, and the condition stays open for other writers. The builder owns the `dap mcp` writer, under request `6db548f00356714d766da2242da4e39ba004c440`, after this landing. The CLI stays with its private device storage. A hosted agent's custody stays separate, because a hosted agent holds its own keys.
- **The object's cap does not refuse a request to this membership scope.** A full room must still let an admin remove a member. Only the member's own caps bound those rows, so a large room can pass 1 GiB. The checker ruled in `cfe5f76e` that this bound is good enough and that a second cap would bring the lockout back. Cloudflare's limits page states 10 GB per Durable Object, as the provider's statement and no measurement here. That takes about 600 active members who each fill 16 MiB on purpose, and only an admin admits members.
- **A missing row lifts no fence.** `gone` does not show that no act was sent, and a replacement would make a second entry. `mismatch` and `archived` are fences on the send path too. When no row remains to press, the fence stays until a reload, as it did before this head.
- **Stop a send when a held session is lost.** A person who had a session relies on the copy. A page that opened on signed reads keeps no copy and sends as before.
- **No kernel change.** The diff under `packages/contract` is one comment in `session.ts`. It corrects the statement that a session controls nothing. `node scripts/check-kernel-boundary.mjs` reports 127 production sources and 0 refusals at this head.
- **Correct the design note where the build disagreed.** The page's key store signs 32 random bytes with no domain on a redraw (`browser-key-store.ts:43`), and this predates J1. So the witness closes its signature window at the scope's reply and reports that check apart. "Never arrived" uses a third context in the first context's place. The phone presses again by hand, with no timer.

## Evidence

The checkpoint is `5ad1b308ab108a6266637146a0aadf07c7220a96`, tree `98dbeafb`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-10-31-j1-build-3/`, `SHA256SUMS` `4871fd2514fe3c2d1238fa5ffcc0f6c96ca57cab2429e358c763f82e322b7b80`. The reviewed head adds only this note and its manifest.

The gate, the witness and the controls all ran at the checkpoint, and each directory's `head.txt` records that commit.

**A failed gate at the same commit.** `gate-finding-stop/` keeps the first gate at the checkpoint, which failed in one test: `apps/room/lanes/test/finding.scope.test.ts:107`, expected `intended` to be `aborted`. Other runs on the machine added load during that gate. This head changes no file under `apps/room/lanes`, and the test passed 3 of 3 runs alone at this commit. The second gate, with no source change, is the one that the table cites. Request `c5f0cff95ec5bc192e4cba520400596015bfbd8e` owns the cause, which nobody has named yet.

Two earlier units hold the earlier heads' runs. `~/play/artroom-evidence/2026-10-31-j1-build-2/`, `SHA256SUMS` `4867110dd07f3964f1f95f549c2de6401ee40ac7480c3eb297343a7e4c47ca35`, holds the run at `48511905` and the gate before this repair. `~/play/artroom-evidence/2026-10-31-j1-build/`, `SHA256SUMS` `3630da9c764718d78bb6cb686cb30b2a556b2aea9d339484b3db3db07b79df05`, holds the first witness, the first 24 controls, the two passing gates before that repair, and the earlier failed runs.

**The witness.** `apps/room/page/test/two-devices.mjs` ran in Chromium against a local Worker from a pinned `wrangler`, and it exited 0 with no failures. Each row is read from `witness/report.json`.

| Observed | Note: reply lost, never arrived | Witness: reply lost, never arrived |
|---|---|---|
| First device's `/acts` that reached the Worker | 1, 0 | 1, 0 |
| Second device's `/acts` | 0, 1 with the same SHA-256 | 0, 1 with the same SHA-256 |
| Second device's `artroom-intent-1` signatures | 0, 0 | 0, 0 |
| Signatures of any domain, button to answer | 0, 0 | 0, 0 |
| Entries under that idempotency key | 1 with the first bytes, 0 | 1 with the first bytes, 0 |

The witness also checks that a failed read keeps the line, the button and the lock, that a stopped keep sends no `/acts`, and that a press on the sending page clears "outcome unknown". The answers read "The request landed: entry 2." and "The scope refused the request: expired. No entry exists for it." The early press sent nothing and said when to check again. The refused case waited 363 seconds past signing. A reloaded first key shows "from this device" and the button, with 0 enabled comment forms and 0 status buttons.

**The cases and the controls.** The test is `apps/room/page/test/original-copy.scope.test.ts`, except the retained editor's case, in `retained-editor.scope.test.ts`. Each control below turned its case red by an assertion.

- **At the checkpoint, 45.** `controls/summary.jsonl` holds 36: the 14 earlier controls that the checker asked to run, 9 from the send and session cases that the repair changed, and 13 for the fence, the older row and the memory. `controls-page/summary.jsonl` holds the 9 earlier controls whose source files the fence repair changed. All 45 turned their case red by an assertion.
- **Last red at `48511905`, 18.** These break a line in `packages/scope/src/originals.ts` or `packages/scope/src/worker.ts`, and their rows are in the earlier unit's `controls/first-run/summary.jsonl`. From there to the checkpoint, `packages/scope` changes only a comment, and their cases do not change. `controls-page/not-rerun.txt` shows that each break's line still occurs once. This rests on reading the diff, not on a run.

| Section 8 case | Controls |
|---|---|
| `a second key of one member settles a lost reply` | `kept-after-send`, `button-signing`, `landed-keeps-copy` |
| `an act that never arrived ends refused expired` | `send-before-margin`, `refused-keeps-copy` |
| `another member and a revoked key read nothing` | `member-compare`, `standing-unchecked`, `delete-any-member` |
| `a copy lands nowhere else` | `actor-unchecked`, `signature-unchecked` |
| `a full cap sends nothing` | `row-cap-off`, `member-bytes-off`, `object-bytes-off`, `page-sends-when-full` |
| `a repeat with other bytes keeps the first` | `other-bytes-pass`, `repeat-charges`, `any-scope-kind` |
| `an open copy locks only its own key` | `lock-any-key`, `lock-past-margin`, `no-lock` |
| `an idle object drops a row at seven days` | `no-wake-cause`, `alarm-keeps-rows`, `row-goes-at-not-after`, `row-cause-clears-others` |
| `a long kind keeps no row, and 64 rows fit the list's reply` | `kind-unbounded` |
| `a failed read keeps the last rows and the lock` | `failed-read-empty`, `failed-read-silent`, `refused-read-empty` |
| `a full object drops the rows of a member who left or holds no key` | `sweep-off`, `sweep-active-members`, `sweep-keeps-keyless`, `sweep-keeps-removed`, `status-of-full` |
| `a full object frees a bounded quantum at each keep` | `sweep-rows-unbounded`, `sweep-members-unbounded`, `sweep-restarts` |
| `a full object still takes a request to membership, under the member's own caps` | `no-exception`, `exception-any-scope`, `exception-any-incarnation`, `exception-past-own-caps` |
| `a full object and a full member say different things` | `room-says-full`, `member-says-room` |
| `a stop around the keep leaves no row` | `check-after-keep-only`, `row-stays-after-stop`, `silent-when-row-stays` |
| `a room change after the editor's keep ends the copy and sends nothing` | `retained-no-second-check` |
| `a page that held a session and failed to renew it stops the send` | `renewal-sends-anyway`, `signed-reads-stopped`, `renewal-not-retried`, `lost-session-reads-empty` |
| `an answer lifts only this page's own fence` | `fence-lifts-any-key`, `fence-lifts-no-answer`, `gone-lifts`, `mismatch-lifts`, `archived-lifts`, `refused-lifts-nothing` |
| `an older row lifts no newer request's fence` | `older-row-lifts-answer`, `older-row-lifts-send`, `matching-row-lifts-nothing`, `send-hands-no-digest`, `answer-holds-no-digest` |
| `a page that clears its opened rooms still stops the send` | `memory-by-session-object`, `memory-ignores-key` |

**The measurement.** This is an observed run, in `witness/report.json`: 10 comments through the page in Chromium, against a local `wrangler dev` Worker on loopback, in one room. The times are Chromium's `responseEnd`. They show the Worker's own work and no real round trip.

| Request | Per comment | Median | Longest |
|---|---|---|---|
| `POST originals` | 1 | 3.712 ms | 4.203 ms |
| `DELETE originals` | 1 | 4.36 ms | 13.858 ms |
| `POST acts`, for comparison | 1 | 7.624 ms | 8.387 ms |
| `GET originals` | 1 or 2, one per draw | 3.882 ms | 4.304 ms |

The design note's Cost line gives the figures of the run at `48511905`, kept in the earlier unit's `witness/first-run/`.

The page also adds one entry read at the target per act. The page kept a copy before every send.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `bd7c65c5d7cb4ee8` |
| Witness | `node apps/room/page/test/two-devices.mjs` | 0 | `90b4093455704ba4` |
| Controls, 36 | `controls/run-controls.mjs` | 0 | `ac1870b8141bc9cd` |
| Controls, the 9 page rows | `controls-page/run-controls.mjs` | 0 | `05a0447a4234501e` |

The gate reports 3242 plain and 928 native tests, 115 Node and 56 Counting.

## Open limits

- **No hosted figure.** A hosted room adds one real round trip to each added request, and nobody measured one. The run did not measure the lanes list that a draw makes while copies are open.
- **Not run.** No Worker, real room or second physical device ran this code. The witness uses browser contexts on one machine.
- **A deployment's window.** Objects run old code for some minutes after a deployment. During that time the copy route returns 404, so every page act in that room fails with "nothing was sent".
- **Lock coverage.** The scope test covers the lock at the data level, and only the browser witness covers it in the interface.
- **A room's total can pass 1 GiB.** Requests to membership pass the object's cap, and only each member's 16 MiB bounds them. Cloudflare's limits page says that writes fail with `SQLITE_FULL` at 10 GB and that `DELETE` still succeeds. It also states 1 GB in one section for the Free plan, and nobody checked which plan applies. Nobody tested whether the alarm finishes its work at that point.
- **Removal frees rows late.** Removing a member frees their rows only when a later `keep` finds the object full.
- **A full room can lose rows.** A member with no active key loses rows on a full object that a new device could otherwise settle.
- **A reload during a failed renewal.** A new page load forgets that it held a session, so that page opens on signed reads and sends with no copy. The checker accepted this in `cfe5f76e`.
- **A fence can outlast its request.** If the row ends on another device and this page has no row left to press, its fence stays until a reload.
- **A simulated page load.** `vi.resetModules()` breaks the Durable Objects in this test pool, so the renewal case's signed-reads step uses a room with a key that this module never held. The act takes the real path, and no real reload ran in that case.
- **A refusal, traced later.** While building that step, a newly enrolled third key with no session got `forbidden` on its signed read of the directory, even after a pause. The build dropped that approach. [The signed-read note](2026-11-01-signed-read-refusal.md) names the cause: the key signed nothing at the directory. A session or a signature at the directory ends the refusal. The witness's second device holds a session, so it does not meet this.
- **The repair's path is not reproduced in a browser.** The checker read the `gone` path from the code. The scope test and its controls hold the lift, and the witness shows only that a press on the sending page clears "outcome unknown".
- **A first read that fails.** A page with no earlier read shows the failure but holds no lock.
- **Coverage below a browser.** The scope test alone covers renewal stopping, the `room-full` words and the retained editor's stop, with no DOM.
- **Filler rows.** The full-object cases use SQL filler rows that state a size and hold no real bytes.
- **Stored unsigned parts.** The extended `a copy lands nowhere else` shows the scope refusing other unsigned parts. Nobody traced the scope's verification of `texts`, `presented` and `values` beyond that case.
- **A forged signature stands in.** `a copy lands nowhere else` tests "present as a signed read" with a forged signature.
- **An armed time, not a due time.** `row-cause-clears-others` asserts the armed alarm time, because `runDurableObjectAlarm` fires regardless of schedule. `alarm-keeps-rows` and `row-goes-at-not-after` observe the row itself.
- **The limits in the design note's section 9.** They apply as written: a page with no session keeps no copy, a missing row does not show that no act was sent, and a copy can hold a redacted text until the copy ends.
