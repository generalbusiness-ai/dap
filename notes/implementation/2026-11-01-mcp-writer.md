# Keep a dap mcp request where a person's other device can settle it

Status: source implementation. The gate passed at `1e782610`. No deployed Worker or real room ran this writer. Hosted behaviour does not change, and the Worker bundle's bytes do.

Request `6db548f00356714d766da2242da4e39ba004c440` and promise `8c3989ce64531ec4b8cd5cc268af14e41296ee07` own this head, under planner ruling `d64edebe`. The design is J1's, in [the signed-requests note](../2026-10-31-signed-requests-across-devices.md).

## What changed

A person who signs through a local `dap mcp` and loses the reply can now settle the request from the room page on another device, with no new signature.

- **The writer.** `#sendAct` in `packages/mcp/src/service.ts` keeps a copy on J1's routes before it sends, and ends the copy on the scope's answer. `#settle` and `install_application` use the same path. If the room keeps no copy, nothing goes out, and the error is `original` in `errors.ts`.
- **Who keeps.** `serve()` in `packages/mcp/src/node.ts` sets a new `originals` port, and `hosted.ts` passes none, so a hosted agent takes the plain send. A key whose member kind is `agent` or `checker` keeps no copy. `inventory.ts` and `catalogue.ts` carry that `kind`.
- **A lost session.** `reads.ts` remembers which sessions this process held. A server that held a session and cannot renew it stops the send, and it renews on the next send. A server that never held one sends as it does today. This is J1's rule.
- **Documents.** `docs/mcp.md` and sections 2 and 9 of the design note state the writer. The seals of four sources in `scripts/security-entry-points.test.mjs` move to the owner's values.

## Decisions

- **The order is `custody.keep`, then the copy's keep, then `custody.send`.** This needs no change to custody. A stopped keep leaves the record `prepared`, so nothing locks.
- **The row's bytes come from the stored record.** A store read can give another key order, and the first in-memory form could then conflict on a retry.
- **`expired` from the keep does not stop the send.** Those bytes can only return the first entry or a refusal. Stopping would leave the record `unknown` forever. A press past the margin on the page does the same.
- **A stop after the keep ends the row only if this call owns it.** That means a `prepared` record or a resubmitted refusal. A stop leaves the row of an earlier send with an unknown outcome, and it leaves the row when another call holds the lock.
- **`settle` and retained answers also end the row.** This covers a crash or a failed `DELETE`, at the cost of one `DELETE` per such call.
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

## Evidence

The checkpoint is `1e7826108ea3406ed10f59dcb6ea8b9e18fc92a8`, tree `f25cca4f`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-11-01-mcp-writer/`, `SHA256SUMS` `873e731aced1792232e192359d16775566923a58c3e8133b5fd352a365799a74`. The reviewed head adds only this note and its manifest. The controls and the witness ran at `c81afb6f`. The checkpoint merges main into that commit. The merges carry the invitation engine's wait and the hosted loop script, and they change no file of the writer. `packages/mcp/test/hosted-loop.scope.test.ts` arrived with the second merge and runs this `service.ts`, and it passes in the gate. `gate-stopped-for-main/` holds a gate at `6b80b760` that I stopped when main moved, and it reached no result.

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

**The controls.** All 32 ran at `c81afb6f`, in `controls/summary.jsonl`, and each turned its case red by an assertion. The cases are in `apps/room/page/test/mcp-original.scope.test.ts`, with new assertions in `lost-reply`, `hosted.scope` H6, `application-install-custody` and `errors`. A trial run before that commit found four breaks that survived and one that could not run, and the tests gained assertions for them.

| Rule | Controls |
|---|---|
| Keep before the send, no copy and no send | `no-keep`, `keep-after-send`, `refusal-sends`, `no-reply-sends`, `keep-reply-keeps-row`, `room-full-words` |
| `expired` goes on | `expired-stops` |
| A stop after the keep | `stop-keeps-row`, `stay-unsaid`, `stop-ends-earlier-row`, `lock-ends-row` |
| The scope's answer ends the row | `answer-keeps-row`, `lost-ends-row`, `unavailable-ends-row`, `acceptance-not-followed`, `settle-keeps-row`, `settle-any-server` |
| The bytes, and nothing twice | `row-from-first-memory`, `terminal-keeps-again`, `resubmit-no-row` |
| Who keeps | `every-server-keeps`, `port-ignored`, `agent-keeps`, `kind-unread`, `agent-forgotten`, `serve-without-port`, `install-skips-writer` |
| A held session | `never-held-stops`, `held-rule-off`, `held-unrecorded`, `no-room-fallback`, `no-second-ask` |

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `38b844d1ab505493` |
| Witness | `node apps/room/page/test/mcp-second-device.mjs` | 0 | `28fe022c4bb42470` |
| Controls, 32 | `controls/run-controls.mjs` | 0 | `79cc6fa6b4ad4d16` |

The gate reports 3466 plain and 940 native tests, 116 Node and 56 Counting.

## Open limits

- **A Worker with no J1 routes stops every send.** A `dap mcp` of this head against such a Worker gets `not-found` on the keep. All three Workers carry J1 since `de53d89a`, so this applies only to an older or self-hosted Worker.
- **Not run.** No deployed Worker, real room or second physical device ran this writer. The scope tests alone cover a request that never arrived.
- **A restart during a failed renewal.** The server then sends with no copy, as J1's page does after a reload.
- **A kill between the keep and the send.** This leaves an open row and a `prepared` record. A press past the margin returns `refused expired`, unless a clock runs ahead.
- **Custody's capacity.** `prepared` records from stopped keeps count toward custody's 256 until they are retried.
- **An agent whose first read fails.** That key is treated as a person and can keep one row.
- **A long `kind`.** A `kind` over 256 bytes cannot send through this writer, as on the page.
- **Metrics.** The allowed reasons in `metrics.ts` do not list `original`, so a local `dap mcp` drops that one point from its stderr metrics. Hosted never reaches it.
