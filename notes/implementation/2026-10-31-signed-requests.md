# Keep a page's signed request where a person's other device can settle it

Status: source implementation. The gate passed at `57269b5b`. No Worker runs this code yet. The planner deploys it in a later deployment.

Request `7d6ce0f63b9db0f726bd65ed474e411af7d699c2` and promise `3649cf4ac25e995f657730259cbc8b1b415812d9` own this head. The design is [the signed-requests note](../2026-10-31-signed-requests-across-devices.md), and the checker approved it in `30f424c3`.

## What changed

A person who loses a reply on one device can now get the scope's answer from another device, with no new signature.

- **The copy.** `packages/scope/src/originals.ts` keeps the exact body of a member's `POST .../acts` request in the membership object. Four `/originals` routes in `packages/scope/src/worker.ts` keep, list, read and end a copy. Only a session of the same member reaches a row.
- **The writer.** `act` in `apps/room/page/src/data.ts` keeps a copy before it sends, and ends the copy on the scope's answer. `retained-editor-data.ts` does the same. If the room keeps no copy, the page sends nothing and says so. Anything that stops the send after the keep ends the row.
- **The button.** `apps/room/page/src/original-check.ts` holds **Check original request**. One press settles the request. If the scope holds no entry, the page sends the same bytes once, and only past the margin. Before the margin, it says when to check again.
- **The lock.** A key's own open copy locks that scope on that page until the margin passes. Other keys keep their acts.
- **A second key.** `packages/client/src/device-key-invitation.ts` adds a closed link format, and the page's new Devices screen issues a link through `issueDeviceKey`.
- **A full object.** `keep` refuses `full` at a member's own caps and `room-full` at the object's cap, each with its own page text. Before `room-full`, it drops the rows of members who are no longer active or who hold no active key, one bounded quantum at a time.
- **A failed read or renewal.** A failed read of the open copies keeps the last rows, with the lock and the button, and the page says so. A page that held a session and failed to renew it stops the send and says why.
- **The time bound.** A row with no answer goes seven days past its `notAfter`, through the object's one alarm. `Wakes` in `packages/scope/src/outbox.ts` gains the `originals` cause.
- **Reference.** `docs/security/entry-points.md` and `scripts/security-entry-points.mjs` state the four routes. `packages/scope/README.md` and `packages/client/README.md` add their rows.

Hosted code changes. `apps/room/page/assets.ts` is the rebuilt bundle.

## Decisions

- **The planner's ruling `d64edebe` holds the scope.** J1's head closes plan 032's condition for the room page, and the condition stays open for other writers. The builder owns the `dap mcp` writer, under request `6db548f00356714d766da2242da4e39ba004c440`, after this landing. The CLI stays with its private device storage. A hosted agent's custody stays separate, because a hosted agent holds its own keys.
- **The object's cap does not refuse a request to this membership scope.** A full room must still let an admin remove a member. Only the member's own caps bound those rows, so a large room can pass 1 GiB. I accept that: it takes many active members who each fill 16 MiB on purpose, and each member must be admitted first. The limits below state it.
- **Stop a send when a held session is lost.** A person who had a session relies on the copy. A page that opened on signed reads keeps no copy and sends as before.
- **No kernel change.** The diff under `packages/contract` is one comment in `session.ts`. It corrects the statement that a session controls nothing. `node scripts/check-kernel-boundary.mjs` reports 127 production sources and 0 refusals at this head.
- **Correct the design note where the build disagreed.** The page's key store signs 32 random bytes with no domain on a redraw (`browser-key-store.ts:43`), and this predates J1. So the witness closes its signature window at the scope's reply and reports that check apart. "Never arrived" uses a third context in the first context's place. The phone presses again by hand, with no timer.

## Evidence

The checkpoint is `57269b5b63b4b1188cbf0a9480c802e959cdb0c3`, tree `638f81e9`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-10-31-j1-build-2/`, `SHA256SUMS` `4867110dd07f3964f1f95f549c2de6401ee40ac7480c3eb297343a7e4c47ca35`. The reviewed head adds only this note and its manifest.

The witness and the last controls ran at `c50c9723`, and each directory's `head.txt` records that commit. The checkpoint adds one line to the design note. `controls/first-run/` and `witness/first-run/` keep the run at `48511905`. `c50c9723` changes no source: it makes three cases assert their outcome, and it adds the measured cost to the design note.

The earlier review's head had its own unit, `~/play/artroom-evidence/2026-10-31-j1-build/`, `SHA256SUMS` `3630da9c764718d78bb6cb686cb30b2a556b2aea9d339484b3db3db07b79df05`. It holds the first witness, the first 24 controls, the two passing gates before this repair, and the earlier failed runs.

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

- **New controls, 28.** They ran at `48511905`, in `controls/first-run/summary.jsonl`. Three came back inconclusive there, because their cases failed on a thrown error: `silent-when-row-stays`, `signed-reads-stopped` and `renewal-not-retried`. Those three and the other 4 controls of the same two cases went red by an assertion at `c50c9723`, in `controls/summary.jsonl`.
- **Earlier controls rerun, 10.** They ran at `48511905`: `kept-after-send`, `landed-keeps-copy`, `refused-keeps-copy`, `row-cap-off`, `member-bytes-off`, `object-bytes-off`, `page-sends-when-full`, `lock-any-key`, `lock-past-margin` and `no-lock`.
- **Earlier controls not rerun, 14.** Their reds are in the earlier unit, at `b1537244`. `controls/not-rerun.txt` shows that each break's source line still occurs once. The assertions they turned red did not change, and those cases now read rows through a test helper. This rests on reading the diff, not on a run.

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
| `an answer lifts only this page's own fence` | `fence-lifts-any-key`, `fence-lifts-no-answer` |

**The measurement.** This is an observed run, in `witness/report.json`: 10 comments through the page in Chromium, against a local `wrangler dev` Worker on loopback, in one room. The times are Chromium's `responseEnd`. They show the Worker's own work and no real round trip.

| Request | Per comment | Median | Longest |
|---|---|---|---|
| `POST originals` | 1 | 3.811 ms | 6.494 ms |
| `DELETE originals` | 1 | 3.612 ms | 5.927 ms |
| `POST acts`, for comparison | 1 | 7.111 ms | 7.677 ms |
| `GET originals` | 1 or 2, one per draw | 2.46 ms | 7.077 ms |

The design note's Cost line gives the figures of the run at `48511905`, kept in `witness/first-run/`.

The page also adds one entry read at the target per act. The page kept a copy before every send.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `4e3f19bef152768c` |
| Witness | `node apps/room/page/test/two-devices.mjs` | 0 | `a6d967633affcae3` |
| Controls, the last 7 | `controls/run-controls.mjs` | 0 | `53af1202ce224a08` |
| Controls, the first 38 rows | `controls/run-controls.mjs` | 3 inconclusive | `537bba0b93fb771a` |

The gate reports 3242 plain and 926 native tests, 115 Node and 56 Counting.

## Open limits

- **No hosted figure.** A hosted room adds one real round trip to each added request, and nobody measured one. The run did not measure the lanes list that a draw makes while copies are open.
- **Not run.** No Worker, real room or second physical device ran this code. The witness uses browser contexts on one machine.
- **A deployment's window.** Objects run old code for some minutes after a deployment. During that time the copy route returns 404, so every page act in that room fails with "nothing was sent".
- **Lock coverage.** The scope test covers the lock at the data level, and only the browser witness covers it in the interface.
- **A room's total can pass 1 GiB.** Requests to membership pass the object's cap, and only each member's 16 MiB bounds them. Nobody measured this against the object's storage limit.
- **Removal frees rows late.** Removing a member frees their rows only when a later `keep` finds the object full.
- **A full room can lose rows.** A member with no active key loses rows on a full object that a new device could otherwise settle.
- **A reload during a failed renewal.** The memory of a held session is lost, so that page opens on signed reads and sends with no copy.
- **A first read that fails.** A page with no earlier read shows the failure but holds no lock.
- **Coverage below a browser.** The scope test alone covers renewal stopping, the `room-full` words and the retained editor's stop, with no DOM.
- **Filler rows.** The full-object cases use SQL filler rows that state a size and hold no real bytes.
- **Stored unsigned parts.** The extended `a copy lands nowhere else` shows the scope refusing other unsigned parts. Nobody traced the scope's verification of `texts`, `presented` and `values` beyond that case.
- **A forged signature stands in.** `a copy lands nowhere else` tests "present as a signed read" with a forged signature.
- **An armed time, not a due time.** `row-cause-clears-others` asserts the armed alarm time, because `runDurableObjectAlarm` fires regardless of schedule. `alarm-keeps-rows` and `row-goes-at-not-after` observe the row itself.
- **The limits in the design note's section 9.** They apply as written: a page with no session keeps no copy, a missing row does not show that no act was sent, and a copy can hold a redacted text until the copy ends.
