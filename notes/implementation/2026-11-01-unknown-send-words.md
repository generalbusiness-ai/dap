# Say what a stop knows of an earlier send under its key

Status: source implementation. The gate passed at `1726e0b1`. No deployed Worker or real room ran these words. The Worker bundle's bytes change, and hosted runs the same words.

Request `1df3a912e8cb8e81b494594885e1f42034a4678b` and promise `45ab7dadd438db6a37df67bc1457ff1283613198` own this head. The checker's approval `97b6d756` of the page's no-session words adds two items, and the checker's verdict on the writer adds a third.

## What changed

A person or a model that reads "nothing was sent" can reasonably send again under a new key. If an earlier send under the old key has no known outcome, that makes a second entry, which J1 prevents. In a real outage a person meets this more often than `session-lost`, because a failed read of the target stops the call before `#sendAct`.

- **Base words speak of the call.** They say "This call sent nothing.", not "Nothing was sent."
- **A stop reads custody.** `#earlierUnder` in `packages/mcp/src/service.ts` reads the record under the key, with no signature and no lock. `earlierSaid` in `packages/mcp/src/errors.ts` puts what it finds first, so a 2 KiB cut cannot remove it, and it adds the warning against a new key to the next step.
- **Custody's code does not change.**
- **An accepted request says so.** `join` and `install_application` read after the scope accepts. A lost read there said "Call again; nothing was submitted", and a failed check said "Before signing… Nothing was sent". Both now say "The scope accepted this request", and the next step is the same call under the same key.
- **The page's `no-reply` words.** They now read "did not give a usable answer", because that reason also covers a late or malformed reply. The bundle is rebuilt.
- **Documents and seals.** `docs/mcp.md` states the rule. Three seals of `packages/mcp/src/service.ts` move to the owner's values.

| Answer | Before | After, under an unknown earlier send |
|---|---|---|
| `transport`, a read fails | "The reply from X was lost or malformed; the outcome is unknown." Next: "Call again; nothing was submitted." | "An earlier send under this key has no known outcome. The reply from X to a read was lost or malformed. This call sent nothing." Next: same key, with the warning |
| `custody` locked | "…is locked; nothing was sent." | The prefix, then "…is locked; this call sent nothing. Another call under this key holds the record, and its send can be in flight." Next: wait, same key, with the warning |
| `custody` conflicting | "…is conflicting; nothing was sent." Next: "Use a new idempotencyKey for a new meaning." | The prefix, "this call sent nothing". Next: "Call settle with this idempotencyKey, or repeat the first call's arguments under it", with the warning |
| `custody` unreadable | "…; nothing was sent." Next: "Report it; nothing was sent." | "…; this call sent nothing. This server cannot say whether an earlier send under this key went." Next: "Report it", with the warning |
| `shape` | "…Nothing was sent." Next: correct the field | The prefix, "This call sent nothing." Next: settle first, with the warning |
| `stale-descriptor`, `target` | "…Nothing was sent." | The prefix, "This call sent nothing." The next step stays, with the warning |
| `read` | No claim | The prefix. The next step stays, with the warning |

The transport row's "before" is observed in the red run. The other "before" words come from the source at `49c2226b`, and tests hold the "after" words.

Three other cases read differently. Another key in the same outage gets no prefix and the plain transport words. A step that went ahead of an act reads "An earlier preparation step under this key went, and this request did not." A custody the server cannot read reads "This server could not read its custody, so it cannot say whether an earlier send under this key went."

## Decisions

- **Hosted's words change with the rest.** Hosted uses the same `McpService`. The one change in behaviour is one custody read on the error path: `unresolved()`, plus `read(id)` for a matching key. It adds no signature, send or lock. `hosted.scope.test.ts` passes, and no hosted test asserts the new words.
- **The founder's case keeps its words.** `97b6d756` asked whether `initializationMessage` can tell a founder to ask for an invitation link. It cannot in the create flow. `main.ts:758` opens the room only after `startRoom` returns the repository, and `claim.ts:316-317` allows that only on exit code 0, after the first key is accepted. Membership serves sessions and standing from one state, so `unauthorized` cannot follow an accepted first key unless the key is later revoked. What remains is a race: a hand-made connection used during a claim, with the key turning active between the session request and the standing read. I traced this and did not run it. A new test holds the founder's first session, and the words for `no-reply`, `rate-limited`, `clock-behind` and `sessions-unavailable`.
- **A hosted agent's identity drift stays.** A server with no `originals` port that loses a reply, moves 601 s and fails its renewal holds a null membership in its custody identity. The same key then signs a second intent, and the scope answers `mismatch` with one entry. The refusal is safe, and its words are poor. A test named "a server on the plain path…" pins this on a plain `McpService`, not the real hosted endpoint.
- **The `original` words and `catalogue.ts`'s `retained` description stay.** The first come from the record. The second holds for a terminal record, and changing it alters the tool's schema.

## Evidence

The checkpoint is `1726e0b103bc2dffbd0b94c0945f33e8a514df39`, tree `4f9a66b1`. It includes main `8f129cdf`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-unknown-send-words/`, `SHA256SUMS` `f30694f97ab8ef6966097b5a7eb46e7fc71268cfb0412b3d8d3ec29aeb8ff83a`. The reviewed head adds this note and its manifest, and merges main `e5069ee6`. That merge brings documents, two test files, a test support file and one comment in `packages/scope/src/sessions.ts`, so I did not run the gate again. The red run, the controls and the witnesses ran at the commits their `head.txt` files state, and the controls and witnesses ran at `e7bf4c3a`, before the merge of main.

**The red run.** `red/` ran the new tests at `49c2226b` with the repair reversed, and five files failed by assertion. The "another key" assertion in the `every answer` test came after this run, and the `other-key-counts` control covers it.

**The witnesses.** Both are observed runs. `witness/report.json` is a real `dap mcp` process over stdio, the room's page in Chromium, a local `wrangler dev` Worker, and a loopback proxy that lost the reply and then cut every `GET`. It holds the new words, and the outage sent nothing. `witness-screens/report.json` holds the browser's no-session screens with the new `no-reply` words.

**The controls.** All 28 turned their case red by an assertion, each with `scripts/control.mjs`, and the source was clean afterwards. `controls/summary.jsonl` lists them.

| Rule | Controls |
|---|---|
| A stop states the unknown send | `transport-unstated`, `custody-unstated`, `early-stop-unstated`, `read-stop-unstated`, `target-stop-unstated`, `shape-stop-unstated`, `stale-stop-unstated`, `unknown-record-ignored`, `card-check-unstated` |
| Only that key, and each kind of record | `other-key-counts`, `step-ignored`, `unreadable-claims-none` |
| The next step keeps the key | `new-key-advice-stands`, `shape-next-stands`, `no-new-key-warning`, `warning-twice`, `transport-old-next`, `unreadable-next-old` |
| The call's own words | `shape-old-words`, `stale-old-words`, `target-old-words`, `commons-old-words`, `custody-old-words`, `locked-in-flight-unsaid` |
| An accepted request | `accepted-read-says-nothing`, `accepted-check-before-signing` |
| The page | `no-reply-old-words`, `founder-told-to-ask` |

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `406b2f58683b127c` |
| Witness, `dap mcp` | `node apps/room/page/test/mcp-second-device.mjs` | 0 | `1ab2526a394b64c4` |
| Witness, screens | `node apps/room/page/test/no-session-screens.mjs` | 0 | `49cdc9d27af504c6` |
| Controls, 28 | `controls/run-controls.mjs` | 0 | `7a4de86b361b47f3` |

The gate reports 3468 plain and 954 native tests, 116 Node and 56 Counting.

## Open limits

- **The same wording elsewhere.** "Nothing was sent" and "nothing was submitted" still appear in `packages/cli/src`, `apps/room/page/src`, `packages/client/src` and `apps/counter/browser/client.ts`. The request names the MCP server's errors, so this head does not touch them, and I did not check each one for the same fault.
- **Read and not run.** Install's read after acceptance and its two `sent: true` checks. `join`'s two `sent: true` checks. `#stoppedEarly` on the card paths for `shape`, `target` and `read`.
- **Held only by the words function.** `commons-missing`, `full`, `terminal` and `too-large`. No test reached these words through a call.
- **A second cut.** A prefix on a message already cut can show two cut marks, and the prefix stays. I read this and did not run it.
- **`stepped` used a scripted record.** No real `prepare` call has run that sentence.
- **Not run.** No deployed Worker, real room or hosted endpoint ran these words.
