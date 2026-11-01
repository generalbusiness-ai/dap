# Keep a dap mcp request where a person's other device can settle it

Status: source implementation. The gate passed at `fd165884`. No deployed Worker or real room ran this writer. Hosted behaviour does not change, and the Worker bundle's bytes do.

Request `6db548f00356714d766da2242da4e39ba004c440` and promise `8c3989ce64531ec4b8cd5cc268af14e41296ee07` own this head, under planner ruling `d64edebe`. The design is J1's, in [the signed-requests note](../2026-10-31-signed-requests-across-devices.md).

## What changed

A person who signs through a local `dap mcp` and loses the reply can now settle the request from the room page on another device, with no new signature.

- **The writer.** `#sendAct` in `packages/mcp/src/service.ts` keeps a copy on J1's routes before it sends, and ends the copy on the scope's answer. `#settle` and `install_application` use the same path. If the room keeps no copy, nothing goes out, and the error is `original` in `errors.ts`.
- **Who keeps.** `serve()` in `packages/mcp/src/node.ts` sets a new `originals` port, and `hosted.ts` passes none, so a hosted agent takes the plain send. A key whose member kind is `agent` or `checker` keeps no copy. `inventory.ts` and `catalogue.ts` carry that `kind`.
- **The record first.** `#sendAct` reads the custody record before any session work. A kept answer takes the plain path to that answer and needs no session.
- **A lost session.** `reads.ts` remembers which sessions this process held. A server that held a session and cannot renew it stops the send, and it renews on the next send. A server that never held one sends as it does today. This is J1's rule.
- **What a stop says.** `#sentBefore` gives every stop the same two facts: `earlier`, for a send with no known outcome, and `stepped`, for a preparation step that went ahead of the request. A record with no known outcome reads "This call sent nothing, and an earlier send under this key has no known outcome." A person who called "Nothing was sent" true at the earlier head could send again under a new key, which is the second entry that J1 prevents. A `prepared` record and a new key still read "Nothing was sent.", because custody writes `sent` before it delivers.
- **Documents.** `docs/mcp.md` and sections 2 and 9 of the design note state the writer. The seals of four sources in `scripts/security-entry-points.test.mjs` move to the owner's values.

## Decisions

- **The order is `custody.keep`, then the copy's keep, then `custody.send`.** This needs no change to custody. A stopped keep leaves the record `prepared`, so nothing locks.
- **The row's bytes come from the stored record.** A store read can give another key order, and the first in-memory form could then conflict on a retry.
- **`expired` from the keep does not stop the send.** Those bytes cannot make a second entry. They can answer with the first entry, a refusal, `unavailable`, `archived` or `mismatch`, or lose the reply. At the boundary they can land as a first entry, because the keep reads membership's clock and the act reads the target's. Stopping would leave the record `unknown` forever. A press past the margin on the page does the same.
- **A stop after the keep ends the row only if this call owns it.** That means a `prepared` record or a resubmitted refusal. A stop leaves the row of an earlier send with an unknown outcome, and it leaves the row when another call holds the lock.
- **`settle` and retained answers also end the row.** This covers a crash or a failed `DELETE`, at the cost of one `DELETE` per such call.
- **A person's server keeps the room's membership after a failed read.** `#membershipOf` returns `s.repository` when the read of the room fails and the service has an `originals` port. Without this, the failed read changed the custody identity, `find` saw no record, and a second intent under the same key got `mismatch`. A hosted agent keeps today's path, and that drift stays there.
- **`apps/views` is not wired.** The ruling names `dap mcp`, and no test witnessed that wiring. A person's acts through that service get no copy.
- **No copy for these.** `join`, `create`, preparation steps, and the card's resend past `notAfter`.

## A restart with a custody row and an open copy

`dap mcp` does nothing at start. The row stays until a call reaches the record.

| State | `settle` | The same call again |
|---|---|---|
| Record `sent` or `unknown`, row open, act landed | `accepted`, row ended | Before `notAfter`: keep answers 204 with the same bytes, first entry, row ended |
| Past `notAfter` | Reads the scope as above | Keep says `expired`, the bytes go, first entry or `refused expired`, row ended |
| The page settled first, act landed | `accepted`, same seq, `DELETE` finds no row | Retained, nothing sent. With no `settle` first, it writes the row again briefly, gets the first entry and ends it |
| The page got a refusal first | `unknown` | `refused expired`, phase `refused`, no entries |
| Reply lost, record `unknown`, row open, renewal fails | Within the key's signed-read window: `accepted`, and the row stays until a later call with a session. Past it: error `read`, nothing sent | Stops with `earlier`. No request goes, and the row stays. After the connection returns: first entry, row ended |
| Record holds an answer, renewal fails | Past the window: error `read` | Returns the kept answer with no session and no request. A later call with a session ends any row |
| A restart during that failure | Not run | Sends the same bytes with no copy and gets the first entry. The first send's row stays until a later call |

## Evidence

The checkpoint is `fd1658840393741a1eb9b1f9a3a5a36124fd51d2`, tree `3ab949b8`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-11-01-mcp-writer-2/`, `SHA256SUMS` `ebcba3b52c51eaef80c18fbf1bd16e7447b70d68085cb6a5eb171af15ac29561`. The reviewed head adds only this note and its manifest. The red run, the controls and the witness ran at the commits their `head.txt` files state, and the controls and the witness ran at `3be96040`. `~/play/artroom-evidence/2026-11-01-mcp-writer/` keeps the unit of the head that the checker sent back in `a0893fe4`. Its `gate-stopped-for-main/` holds a gate at `6b80b760` that I stopped when main moved, and it reached no result. `gate-stopped-for-main/` in this unit holds a gate at `3be96040` that I stopped when the page's no-session words landed, and it also reached no result. Those words change no file of the writer. `packages/mcp/test/hosted-loop.scope.test.ts` came from main and runs this `service.ts`, and it passes in the gate.

**The red run.** `red/run.log` ran the new tests against the source at `0385a59e`, and three cases failed by assertion. The lost reply read "Nothing was sent.", the kept answer got the `original` stop, and a `prepared` record with a step read "Nothing was sent.". `red/run-1-helper-threw.log` keeps an earlier run in which a test helper threw.

**The witness.** `apps/room/page/test/mcp-second-device.mjs` is an observed run: a real `dap mcp --generic` over stdio, the room's page in Chromium, a local `wrangler dev` Worker, and a loopback proxy that lost the reply. `witness/report.json` holds these rows.

| Observed | Value |
|---|---|
| First device's `/acts` that reached the Worker | 1, reply lost |
| Second device's `/acts` | 0 |
| Second device's `artroom-intent-1` signatures | 0 |
| Signatures of any kind, from the button to the scope's answer | 0 |
| Entries under that idempotency key | 1, the first device's bytes, seq 2 |
| Rows after | 0 |

The wire order is `POST originals`, then `POST acts`, with the same SHA-256. The page reads "You sent a comment on issue 1 from another device. It has no answer yet." and then "The request landed: entry 2." After a restart, `settle` returned `accepted` at seq 2, and the repeat returned `retained` at seq 2, with no new `POST`.

**The controls.** All 41 ran at `3be96040`, in `controls/summary.jsonl`, and each turned its case red by an assertion. The break text of the earlier 32 changed with the source. The cases are in `apps/room/page/test/mcp-original.scope.test.ts`, with new assertions in `lost-reply`, `hosted.scope` H6, `application-install-custody` and `errors`. A trial run before `c81afb6f` found four breaks that survived and one that could not run, and the tests gained assertions for them.

| Rule | Controls |
|---|---|
| Keep before the send, no copy and no send | `no-keep`, `keep-after-send`, `refusal-sends`, `no-reply-sends`, `keep-reply-keeps-row`, `room-full-words` |
| `expired` goes on | `expired-stops` |
| A stop after the keep | `stop-keeps-row`, `stay-unsaid`, `stop-ends-earlier-row`, `lock-ends-row` |
| The scope's answer ends the row | `answer-keeps-row`, `lost-ends-row`, `unavailable-ends-row`, `acceptance-not-followed`, `settle-keeps-row`, `settle-any-server` |
| The bytes, and nothing twice | `row-from-first-memory`, `terminal-keeps-again`, `resubmit-no-row` |
| Who keeps | `every-server-keeps`, `port-ignored`, `agent-keeps`, `kind-unread`, `agent-forgotten`, `serve-without-port`, `install-skips-writer` |
| A held session | `never-held-stops`, `held-rule-off`, `held-unrecorded`, `no-room-fallback`, `no-second-ask` |
| A stop states the earlier send | `lost-session-says-nothing`, `keep-stop-says-nothing`, `resubmit-says-earlier`, `prepared-says-earlier`, `step-unsaid` |
| A kept answer needs no session | `kept-answer-needs-session`, `resubmit-takes-kept-answer` |
| The record stays the same record | `identity-drifts`, `new-key-keeps-record` |

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `a9709995c2634e5f` |
| Witness | `node apps/room/page/test/mcp-second-device.mjs` | 0 | `fcb0ece4fa0d86d8` |
| Controls, 41 | `controls/run-controls.mjs` | 0 | `c48ad46e5014d856` |

The gate reports 3467 plain and 948 native tests, 116 Node and 56 Counting.

## Open limits

- **A Worker with no J1 routes stops every send.** A `dap mcp` of this head against such a Worker gets `not-found` on the keep. All three Workers carry J1 since `de53d89a`, so this applies only to an older or self-hosted Worker.
- **Not run.** No deployed Worker, real room or second physical device ran this writer. The scope tests alone cover a request that never arrived.
- **A restart during a failed renewal.** The server then sends with no copy, as J1's page does after a reload.
- **A kill between the keep and the send.** This leaves an open row and a `prepared` record. A press past the margin returns `refused expired`, unless a clock runs ahead.
- **Custody's capacity.** `prepared` records from stopped keeps count toward custody's 256 until they are retried.
- **An agent whose first read fails.** That key is treated as a person and can keep rows until a read states its kind. Each row still ends on its answer.
- **A target the inventory does not hold.** Its row and its custody record go to the configured room's membership. If the read of the target is refused, the row stays after an accepted answer until seven days past `notAfter`. The page's check reads the same way and says `unknown`, so it cannot end the row either. I read this from the code, and no run used a real second room.
- **The same false sentence elsewhere.** Custody's own errors read "is locked; nothing was sent." on a record that can hold an unknown earlier send. An outage that also stops reads fails before `#sendAct`, with `transport` and the next line "Call again; nothing was submitted." Both predate this writer, and hosted uses the first. In a real outage, a person meets `transport` more often than `session-lost`. Request `1df3a912` owns them.
- **A press on a `prepared` record's row.** After a crash or a failed end, a page press can deliver those bytes, and the answer is `refused expired` unless a clock runs ahead. "Nothing was sent" then holds only for this server. I read this and did not run it.
- **`stepped` used a scripted record.** No real `prepare` call has run that sentence.
- **Two processes with one key.** A second process can send just after this one reads `prepared`.
- **`settle` reads the target first.** Past the window it fails at that read, so a repeat of the call reaches a kept answer and `settle` may not.
- **A chat surface restarts more often than a page reloads.** A stdio server starts with each chat, so a person meets J1's reload limit more often here. Custody stays on disk, and the same machine can still `settle`. What the person loses is the other device's view of that one request.
- **A long `kind`.** A `kind` over 256 bytes cannot send through this writer, as on the page.
- **Metrics.** The allowed reasons in `metrics.ts` do not list `original`, so a local `dap mcp` drops that one point from its stderr metrics. Hosted never reaches it.
