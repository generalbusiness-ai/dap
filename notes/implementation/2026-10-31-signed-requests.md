# Keep a page's signed request where a person's other device can settle it

Status: source implementation. The gate passed at `6e029473`. No Worker runs this code yet. The planner deploys it in a later deployment.

Request `7d6ce0f63b9db0f726bd65ed474e411af7d699c2` and promise `3649cf4ac25e995f657730259cbc8b1b415812d9` own this head. The design is [the signed-requests note](../2026-10-31-signed-requests-across-devices.md), and the checker approved it in `30f424c3`.

## What changed

A person who loses a reply on one device can now get the scope's answer from another device, with no new signature.

- **The copy.** `packages/scope/src/originals.ts` keeps the exact body of a member's `POST .../acts` request in the membership object. Four `/originals` routes in `packages/scope/src/worker.ts` keep, list, read and end a copy. Only a session of the same member reaches a row.
- **The writer.** `act` in `apps/room/page/src/data.ts` keeps a copy before it sends, and ends the copy on the scope's answer. `retained-editor-data.ts` does the same. If the room keeps no copy, the page sends nothing and says so.
- **The button.** `apps/room/page/src/original-check.ts` holds **Check original request**. One press settles the request. If the scope holds no entry, the page sends the same bytes once, and only past the margin. Before the margin, it says when to check again.
- **The lock.** A key's own open copy locks that scope on that page until the margin passes. Other keys keep their acts.
- **A second key.** `packages/client/src/device-key-invitation.ts` adds a closed link format, and the page's new Devices screen issues a link through `issueDeviceKey`.
- **The time bound.** A row with no answer goes seven days past its `notAfter`, through the object's one alarm. `Wakes` in `packages/scope/src/outbox.ts` gains the `originals` cause.
- **Reference.** `docs/security/entry-points.md` and `scripts/security-entry-points.mjs` state the four routes. `packages/scope/README.md` and `packages/client/README.md` add their rows.

Hosted code changes. `apps/room/page/assets.ts` is the rebuilt bundle.

## Decisions

- **The planner's ruling `d64edebe` holds the scope.** J1's head closes plan 032's condition for the room page, and the condition stays open for other writers. The builder owns the `dap mcp` writer, under request `6db548f00356714d766da2242da4e39ba004c440`, after this landing. The CLI stays with its private device storage. A hosted agent's custody stays separate, because a hosted agent holds its own keys.
- **No kernel change.** The diff under `packages/contract` is one comment in `session.ts`. It corrects the statement that a session controls nothing. `node scripts/check-kernel-boundary.mjs` reports 127 production sources and 0 refusals at this head.
- **Correct the design note where the build disagreed.** The page's key store signs 32 random bytes with no domain on a redraw (`browser-key-store.ts:43`), and this predates J1. So the witness closes its signature window at the scope's reply and reports that check apart. "Never arrived" uses a third context in the first context's place. The phone presses again by hand, with no timer.

## Evidence

The checkpoint is `6e0294738166003bbe1d80c31db539615e1bb7d8`, tree `f6b804b5`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-10-31-j1-build/`, `SHA256SUMS` `3630da9c764718d78bb6cb686cb30b2a556b2aea9d339484b3db3db07b79df05`. The reviewed head adds only this note and its manifest.

The witness and the controls ran at `b1537244`. `witness/head.txt` records that commit. The controls keep no head file. They finished at 20:31 EDT, by file time, after that commit at 20:18 and before the next at 20:33. The checkpoint adds a change to the design note and two merges of main. The enrollment-stop head changes `examples/repo-in-ai` and notes. The earlier-version finding head changes `packages/mcp` and `apps/views`, and its merge moves the seal of the `service.ts` module, whose value comes from the owner's failure output. `gate-before-main-032e4f40/` keeps the passing gate before that second merge, at `c2cc75bb`, tree `43f549cb`. `witness/first-run/`, `witness/second-run/`, `controls/first-run/` and `controls/second-run/` keep the earlier runs. The first witness counted earlier acts, and its signature window ran into the key store's check. The second witness ordered its measured requests by finish time. The control runs had inconclusive results and survivors, and each led to a stronger test.

**The witness.** `apps/room/page/test/two-devices.mjs` ran in Chromium against a local Worker from a pinned `wrangler`, and it exited 0 with no failures. Each row is read from `witness/report.json`.

| Observed | Note: reply lost, never arrived | Witness: reply lost, never arrived |
|---|---|---|
| First device's `/acts` that reached the Worker | 1, 0 | 1, 0 |
| Second device's `/acts` | 0, 1 with the same SHA-256 | 0, 1 with the same SHA-256 |
| Second device's `artroom-intent-1` signatures | 0, 0 | 0, 0 |
| Signatures of any domain, button to answer | 0, 0 | 0, 0 |
| Entries under that idempotency key | 1 with the first bytes, 0 | 1 with the first bytes, 0 |

The answers read "The request landed: entry 2." and "The scope refused the request: expired. No entry exists for it." The early press sent nothing and said when to check again. The refused case waited 363 seconds past signing. A reloaded first key shows "from this device" and the button, with 0 enabled comment forms and 0 status buttons.

**The cases and the controls.** All 24 controls exited 0, each with its result `distinguishes`, in `controls/summary.jsonl`. The test is `apps/room/page/test/original-copy.scope.test.ts`.

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

**The measurement.** This is an observed run, in `witness/report.json`: 10 comments through the page in Chromium, against a local `wrangler dev` Worker on loopback, in one room. The times are Chromium's `responseEnd`. They show the Worker's own work and no real round trip.

| Request | Per comment | Median | Longest |
|---|---|---|---|
| `POST originals` | 1 | 3.853 ms | 11.835 ms |
| `DELETE originals` | 1 | 4.433 ms | 27 ms |
| `POST acts`, for comparison | 1 | 7.549 ms | 20.806 ms |
| `GET originals` | 1 on the first comment, 2 on later ones | 2.222 ms | 10.032 ms |

The page also adds one entry read at the target per act. The page kept a copy before every send.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `636a0ebc19a644f2` |
| Witness | `node apps/room/page/test/two-devices.mjs` | 0 | `dc8822ce53de5d25` |
| Controls, 24 | `controls/run-controls.mjs` | 0 | `3dcd45413f7d0a35` |

The gate reports 3242 plain and 916 native tests, 115 Node and 56 Counting.

## Open limits

- **No hosted figure.** A hosted room adds one real round trip to each added request, and nobody measured one. The run did not measure the lanes list that a draw makes while copies are open.
- **Not run.** No Worker, real room or second physical device ran this code. The witness uses browser contexts on one machine.
- **A deployment's window.** Objects run old code for some minutes after a deployment. During that time the copy route returns 404, so every page act in that room fails with "nothing was sent".
- **Lock coverage.** The scope test covers the lock at the data level, and only the browser witness covers it in the interface.
- **A forged signature stands in.** `a copy lands nowhere else` tests "present as a signed read" with a forged signature.
- **An armed time, not a due time.** `row-cause-clears-others` asserts the armed alarm time, because `runDurableObjectAlarm` fires regardless of schedule. `alarm-keeps-rows` and `row-goes-at-not-after` observe the row itself.
- **The limits in the design note's section 9.** They apply as written: a page with no session keeps no copy, a missing row does not show that no act was sent, and a copy can hold a redacted text until the copy ends.
