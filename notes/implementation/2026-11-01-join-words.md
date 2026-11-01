# Say what a mismatch and an accepted join's failed read know

Status: source implementation. The gate passed at `ececd0bd`. No deployed Worker or real room ran these words. The Worker bundle's bytes change, and hosted changes the words of one answer. Hosted MCP stays closed on all three deployed Workers.

Request `a87fb3f16a056dc6cdb7be9c3db650570e8ea5ed` and promise `84b02c1963ab0dd63ca4c8539e57914d15a6b2e5` own this head. The request comes from the checker's `ab13907a`.

## What changed

A person who read either answer could make a second entry. Both now say what the server knows, and both put the step that makes no second entry first.

- **An accepted join whose read gives no entry.** `#join` in `packages/mcp/src/service.ts` now stops with the `target` finding and `sent: "read"`, as `install_application` does on the same stop. The `error` field moves from `read` to `target`.
- **A mismatch.** `answered` in `packages/mcp/src/errors.ts` now says that the scope accepted an earlier request, that this request made no entry, and that this server cannot compare the two.
- **Documents and seals.** `docs/mcp.md` states both. The seal of `McpService` moves to the owner's value, taken from the failure output of `scripts/security-entry-points.test.mjs`.

| Answer | Words before, observed in `red/run.log` | Words now |
|---|---|---|
| `join`, read gives no entry | "M did not answer the read: unavailable (the scope is unavailable)." Next: "Try later." | "The scope accepted this request, and the server could not check it: the read of entry M:4 gave no entry (unavailable), so this server has not recorded the room yet." Next: "Call again with the same idempotencyKey: nothing goes twice. If the call stops here again, report this message and the key. Do not use a new key, because a new key can make a second entry." |
| `mismatch` | "Your key already signed another intent under this idempotency key on S (idempotency-mismatch)." Next: "Use a new idempotencyKey for a new meaning." | "S already accepted another request that your key signed under this idempotency key (idempotency-mismatch), and this request made no entry. This server finds no record of the earlier request, so it cannot say whether the two ask for the same thing. The earlier request can come from another custody home or another device." Next: "Read the scope first with inspect or steps, or call settle on the server that signed the earlier request. If the scope holds what you asked for, you need nothing more, and a new key would make a second entry. If you mean another request, use a new idempotencyKey." |

The `forbidden` reason read worse at main. Its next step said to call `room`, and `room` shows no room, because `#join` records the room only after this read. This comes from a reading of the code. The run used `unavailable`.

## Decisions

- **The join stop uses the `target` finding.** `sent: "read"` already holds the words for a read after acceptance, and a repeat can pass. The test runs the repeat: two calls stop with these words, the third returns the kept `accepted`, and one join goes across all three. The sentence adds that the room is not recorded, because a person who calls `room` next sees no room and can conclude that the join failed.
- **What a mismatch can state.** `actJudged` in `packages/derive/src/judge.ts` answers `mismatch` only when `view.accepted` holds an entry under this actor and key with another digest, and it writes nothing for this request. So the server can say that the scope accepted an earlier request and that this request made no entry. A retry of the same request from another home signs at another time, gets another digest, and meets this answer, so the old next step told that person to make a second entry.
- **"Finds no record" stays true.** Custody names a record by its identity. A record under the same identity with another meaning stops as `conflicting` before signing, and one with the same meaning sends the same bytes, which the scope answers as `accepted`. So `mismatch` means that custody found no earlier request under this identity. The sentence says "finds", because a store can hold a record under another identity after an identity drift. The earlier request can also come from a command or a page with the same key, which writes no record here, so the sentence does not say that a home holds it.
- **A new meaning keeps a way forward.** The last sentence of the next step still says to use a new key for another request. The test sends one, and the scope accepts it.
- **`conflicting` keeps its words.** `errors.ts` still says "Use a new idempotencyKey for a new meaning." where this server holds the record and has compared the meanings. The test holds those words, and the `conflicting-loses-new-key` control turns it red.
- **The next step names three tools.** `inspect` shows state, and it can leave out a comment. `steps` shows each entry's kind and signer. `settle` on the signing server gives the answer and the entry. The test calls all three, and they send nothing. All three stay on the hosted list.
- **`errors.ts:60` and the other packages stay as they are.** Another head owns the `type-full` sentence and the phrases in `packages/cli/src`, `apps/room/page/src`, `packages/client/src` and `apps/counter`.

### What hosted does differently

Hosted uses the same `McpService`, so a hosted act that meets `mismatch` gets the new sentence and next step. No route, tool, schema, custody record, signature or send changes. `join` is in `HOSTED_TOOL_OMISSIONS`, so its new words reach hosted only through `MCP_TOOL_ADDITIONS`.

## Evidence

The checkpoint is `ececd0bde0dd90a30b15956fdf1980684bdae6c5`, tree `71b7565e`, based on main `8b2f4f76`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-join-words/`, `SHA256SUMS` `cd10393e88d0ed3c6a6c9b40e7c98866151890f13de7fcea1493b65220a474a3`. The source commit is `ececd0bd`, tree `71b7565e`. The red run, the controls, the focused runs and the bundle ran there. The reviewed head adds this note and its manifest.

**The red run.** `red/run.log` is an observed run of the head's two new cases against `service.ts` and `errors.ts` from `8b2f4f76`. Both failed by an assertion, with the words in the table above, and 17 cases of the file were skipped by the name filter.

**The two cases.** Both are in `apps/room/page/test/mcp-original.scope.test.ts`. They run the real `McpService` on real scopes through the Worker's routes. The network is the file's labelled stand-in. In the join case, it answers each read of the membership with `unavailable`. In the other case, two memory stores with one signer stand for two custody homes, the clock moves 60 s, and the real judge answers `mismatch`, with one entry under the key.

**The controls.** All six turned their case red by an assertion, each with `scripts/control.mjs`, and the source was clean afterwards.

| Control | What it puts back | Case that turns red |
|---|---|---|
| `join-read-old-words` | The old `read` stop | The join case |
| `join-read-says-report` | `sent: "report"` on the stop | The join case |
| `join-read-room-unsaid` | The sentence with no word of the room | The join case |
| `mismatch-old-sentence` | The old sentence | The custody home case |
| `mismatch-old-next` | The old next step | The custody home case |
| `conflicting-loses-new-key` | The mismatch's next step on `conflicting` | The custody home case |

| Check | How taken | Command | Exit | Digest |
|---|---|---|---|---|
| Gate | Observed run | `npm run gate` | 0 | `02d45d1c249ac063` |
| Red run | Observed run | `red/run-red.sh` | 1 | `0afad88fa768e843` |
| Controls, 6 | Observed run | `controls/run-controls.mjs` | 0 | `1ec4e66ce5f51297` |
| `--project mcp`, three files, 48 tests | Observed run | `vitest run --project mcp` on `errors`, `lost-reply` and `custody` | 0 | `1c6b90c9652ac4b1` |
| `--project scope`, two files, 40 tests | Observed run | `vitest run --project scope` on `mcp-original` and `hosted` | 0 | `22d3f8587d07d605` |
| Seals | Observed run | `node --test scripts/security-entry-points.test.mjs` | 0 | `2e8ba1160a2c7921` |
| Worker bundle at main | Observed dry run, offline | `wrangler deploy --dry-run --outdir`, `apps/room/wrangler.jsonc` | 0 | 6707471 bytes, `6aeef92d1b59fc8e` |
| Worker bundle at this head | Observed dry run, offline | The same | 0 | 6708171 bytes, `b762062a3bff8752` |

`bundle/sizes.txt` holds both full digests. "Main" is this head's tree with `service.ts` and `errors.ts` from `8b2f4f76`, and no other source file differs.

The gate reports 3492 plain and 979 native tests, 116 Node and 56 Counting.

## Open limits

- **Reasons not run.** The join case ran `unavailable`. The other read refusals take the same line, and I read them and did not run them.
- **The stand-in network.** The `unavailable` answers come from the file's stand-in, not from a real outage.
- **Two custody homes.** Two memory stores in one test stand for them. No two `dap mcp` processes or `ARTROOM_HOME` directories ran this.
- **A mismatch on `join` from an empty configuration.** The next step names `inspect`, and a server with no room reads a scope by ID with a signed read. I read this and did not run it.
- **The join's other stops.** The `sent: "report"` stops do not say that the room is unrecorded. No request owns this.
- **Not run.** A deployed Worker, a real room, `wrangler dev`, and `tsc -p apps/room/page/tsconfig.scope.json`, because the worktree's cloned `node_modules` has no `@cloudflare/workers-types`. The gate runs that check.

## Defects outside the request

I name these and did not fix them. Each comes from a reading of the code, and none ran.

- **`settle` after a mismatch.** `#settle` in `service.ts` answers "The key K is on another intent of your key at that scope." and "Nothing more is needed.", on the server whose record holds the refused request. It does not say that this request made no entry, and a person who means another request needs a new key.
- **A failed configuration write after an accepted join.** `config.joined` and `setRepository` in `#join` can throw. `#failure` rethrows an error it does not know, so the call rejects with no word that the scope accepted.
