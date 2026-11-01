# Keep the custody identity through a failed room read

Status: source implementation. The gate passed at `7d055e12`. No deployed Worker or real room ran this head. The Worker bundle's bytes change, and hosted behaviour changes as "What hosted does differently" lists. Hosted MCP stays closed on all three deployed Workers.

Request `db537dcef844934414f65de44025309f29d13942` and promise `178c5f097ff111595f1e41b8b65f3f042cf58e07` own this head. The request adds the next-edit items of the checker's `64c8fd05`.

## What the endpoint does at main

The request says that a repeat signs a second intent and the scope answers `mismatch`. That holds on a plain `McpService` in generic mode, and the hosted endpoint answers differently. I ran the scene through `/mcp` on a local Worker in the `scope` test project at `991129fc`. A bot's `issue.comment` on a lane lost its reply. The clock then moved 601 s, and the session request failed. `probe/probe2.log` holds the observed run:

| Call | Answer at `991129fc` |
|---|---|
| The first `issue.comment` | `transport`, "the outcome is unknown" |
| The same `issue.comment` under the same key | `unknown-tool`, "No tool is named issue.comment in this list.", next "Call tools/list." |
| `settle` under the same key | `not-found`, "This server keeps no record under key drift-1 for that target." |
| Custody and the scope | One record in phase `unknown`. One entry at the scope. |

Hosted's default mode does not admit `act`. The failed reads take the lanes from the bindings, so the named tool stops first and the second intent never forms. The worse fault is the `settle` answer, because the record exists and `settle` cannot find it. `probe/probe1.log` shows that an act on the directory drifts less easily: the directory's signed read still passes at 601 s, so the room stays known. Drift needs a lane target and a refused directory read.

The `mismatch` that the request names still reaches a generic-mode `McpService` with no `originals` port, such as `examples/repo-in-ai/session.ts`, `examples/commons-bill/witness.ts`, and the plain test.

## What changed

- **The identity holds.** `#membershipOf` in `packages/mcp/src/service.ts` returns the configured repository's membership when the room read fails, with or without the `originals` port. `settle` and a repeat now find the record.
- **`unknown-tool` says what custody holds.** A named tool that stops under a key with an earlier send now reads "An earlier send under this key has no known outcome. No tool is named issue.comment in this list." Its next step points at `settle` and warns against a new key.
- **A stop after acceptance gives the next step.** `sent` on the `target` finding is now `"report"` or `"read"`. The table below lists each path.
- **`install_application`'s catch reads the record.** A record past `prepared` means that a request under this key left, and the call now says so.
- **`earlierSaid` guards its sentence.** The sentence appears once however many layers state it, and the next step stays the same.
- **The hosted store takes its terminal phases from custody.** `packages/mcp/src/sqlite-custody.ts` builds both queries from `TERMINAL`. An `archived` record no longer reads as unresolved, no longer counts toward the 256, and moves to the archive past the bound.
- **Documents and seals.** `docs/mcp.md` states the failed read, the changed target and the repeat that stops. The seal of `McpService` moves to the owner's value.

| Stop after the scope accepted | Words before | Next step now | What a repeat does |
|---|---|---|---|
| The install's acknowledgement does not match | "Call again… the kept answer returns" | Report the message and the key. Do not use a new key. | Stops at the same check, sends nothing |
| The read of the install's entry gives no entry | The same | Call again under the same key. If it stops again, report it. | Can pass, because a later read can give the entry |
| The install's entry does not hold the request | The same | Report | Stops at the same check |
| The join's entry does not hold the kept join | The same | Report | Stops at the same check |
| The join's entry creates no inbox | The same | Report | Stops at the same check |

A lost read after acceptance is the `transport` finding with `accepted`, and it keeps "the kept answer returns", which holds there.

### What hosted does differently

1. `settle` and a repeat find the record after a failed room read, where `settle` answered `not-found`.
2. `unknown-tool` under a key with an earlier send names that send and points at `settle`. An `unknown-tool` with an `idempotencyKey` reads `unresolved()` once, and `read` for a matching key.
3. An `archived` record leaves the unresolved list and moves to the archive past the bound.
4. The stops after acceptance and the install's catch read differently. `join` and `install_application` are in `HOSTED_TOOL_OMISSIONS`, so these words reach hosted only through `MCP_TOOL_ADDITIONS`.

## Decisions

- **Keep the identity, and change one set of words.** The brief prefers the identity if the condition can drop without new risk. `#membershipOf` has one caller, `#scope`, and I read each user of the membership it returns. The failed-read path now behaves as the path with a good room read already does:
  - `#sendAct` stays plain, because `#keepsOriginals` is false with no port.
  - `reads.read(M)` adds at most one session request behind the 60 s gate, and no new authority.
  - `@handle` shaping works where it was refused.
  - `whoOf` can answer "lacks" when the membership reads and the directory does not. A good room read gives the same local fence.
  - A server with no configured repository stays at null.

  The other servers with no port change the same way: `apps/views/src/node.ts` and the examples. `packages/cli/src/application-install-runtime.ts` uses `room.membership` directly, so its install does not change.
- **Words as well as identity.** Keeping the identity alone leaves `unknown-tool` saying "Call tools/list", which tells a person nothing about the send. `settle` is listed in the same answer, so the words point at it.
- **A hidden tool's stop reads the unresolved list.** `packages/mcp/test/hosted-tools.test.ts` fenced custody entirely for a tool hidden from a caller. I narrowed that fence: `unresolved` now returns an empty list, and `lock`, `exclusive`, `read`, `write`, `segment`, `segmented`, `admit` and `unadmit` stay blocked. The read holds no lock and writes nothing. Every other early stop already makes it. A caller learns nothing that `settle` does not say, and the list holds at most 256 records. The alternative is a stop that says "Call tools/list" over an unknown send. I chose the read, and the checker can overrule that choice.
- **Item 4 needs no fix of its own.** The prefix does not double through `#viewPerform` at `991129fc`, by a reading of the code. View tools return `{result, display}` or `{error: "view"}`, so `#call`'s `#stoppedEarly` finds no listed top-level `error`. Their arguments carry no `idempotencyKey`. `#viewPerform`'s catch states once. The guard covers any later nesting, and `card-actions.scope.test.ts` asserts that a card's stop says it once.
- **Item 2, by branch.** `ApplicationPackageError` is thrown only inside the build, with no record and nothing sent, so "This call sent nothing" holds. The catch-all can follow a delivery: `#locked`'s release can throw after the send and the kept outcome. There the words were false. The brief quotes "This call submitted nothing", and at this head the base sentence reads "This call sent nothing". Only `commons-missing` says "submitted nothing". The `what` no longer repeats "; nothing was submitted".

## Evidence

The checkpoint is `7d055e1262a942bda0fd4235ef563fbb4a645ae6`, tree `70eb2c00`. It merges main `76c67b3f`, which adds notes and documents and touches no file of the source commit `3df54c5b`. The red run and the controls ran at `3df54c5b`, on main `991129fc`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-identity-drift/`, `SHA256SUMS` ``dad5489946857e90e8aa907ac954034e662e61da543d7db1acddd4dcf411a35c``.

**The red run.** `red/run.log` ran the head's tests in six files against `packages/mcp/src/service.ts`, `errors.ts` and `sqlite-custody.ts` from `991129fc`. Fifteen tests failed, each by an assertion, and 64 passed. The endpoint test failed on the message "No tool is named issue.comment in this list.", and the plain test failed on `mismatch`. `hosted-tools.test.ts` and `card-actions.scope.test.ts` passed at `991129fc`. The first holds there because main reads no custody on that stop, and the second is the observed run behind item 4: a card's stop says the sentence once at main.

**The endpoint test.** `H6 through the endpoint: a lost reply, 601 seconds and a failed session renewal keep the custody record, and the scope holds one entry` runs the real `/mcp` route on a local Worker with the real scope, and observes the scene above. `hostedTest.lose` stands in for the lost reply and the failed session request. The repeat answers `unknown-tool` with the earlier send named, `settle` answers `accepted` with the same intent, and the scope holds one comment. After 61 s the repeat returns the kept answer. A changed target under the same key then makes a second record and a second entry, which witnesses the limit below.

**The controls.** All 18 turned their case red by an assertion, each with `scripts/control.mjs`, and the source was clean afterwards. `controls/summary.jsonl` lists them.

| Rule | Controls |
|---|---|
| The identity holds through a failed room read | `originals-condition-endpoint`, `originals-condition-plain` |
| `unknown-tool` says what custody holds, and takes no lock | `unknown-tool-unstated`, `unknown-tool-next`, `hidden-tool-locks` |
| The sentence appears once | `guard-off` |
| Custody's terminal list decides both queries | `archived-unresolved-record`, `archived-unresolved-stop`, `archived-stays-live` |
| A stop after acceptance gives the next step | `report-says-kept-answer`, `read-says-report`, `ack-call-again`, `entry-read-report`, `entry-mismatch-call-again`, `no-inbox-call-again` |
| `install_application`'s stop says what this call did | `catch-ignores-record`, `catch-always-left`, `stopped-words-off` |

| Check | How taken | Command | Exit | Digest |
|---|---|---|---|---|
| Gate | Observed run | `npm run gate` | 0 | ``14e052766ab13ce1`` |
| Red run | Observed run | `red/run.log`, source of `packages/mcp/src` at `991129fc` | 1 | `d9a8eb8dbc26d666` |
| Controls, 18 | Observed run | `controls/run-controls.mjs` | 0 | `3492ebfe2ea8032f` |
| Endpoint at main | Observed run | `probe/probe2.log` | 0 | `15402f58b2c3b7f6` |
| Worker bundle at main | Observed dry run, offline | `wrangler deploy --dry-run --outdir`, `apps/room/wrangler.jsonc` | 0 | 6704356 bytes, `bc426047a9256e8b` |
| Worker bundle at this head | Observed dry run, offline | The same | 0 | 6705459 bytes, `655ec9018bd9016f` |
| Each user of `#membershipOf` | Reading of the code | | | |
| Item 4, `#viewPerform` | Reading of the code | | | |

**The focused runs.** These are observed runs at the source of this head, and `focused/` holds the first two logs. `--project mcp` passed 201 tests with one skipped. `--project scope packages/mcp/test/ apps/room/page/test/mcp-` passed 73. `--project repo-in-ai` passed 243, `--project cli packages/cli/test/application` passed 36, and the Node tests of the examples and views with no port passed 31. I stopped an `npm run test:changed` run by PID after 27 minutes, because it selects most of the repository. `focused/test-changed-stopped.log` holds it. It found the two `hosted-tools.test.ts` failures that the fence above answers, and three 30 s timeouts in `application-publication.test.ts` and `application-projection-native.test.ts`. Those two files passed when I ran them alone, 6 of 6, so I read the timeouts as load on this shared machine. The gate gives the full answer.

The gate reports `3491` plain and `975` native tests, `116` Node and `56` Counting.

## Open limits

- **A changed target makes a new record.** The identity names the target, so a changed target under the same key signs a new intent, and that target's scope can accept it. A key protects one request against a second send to its target.
- **Records written under a null membership stay unknown.** A record that an earlier head wrote during a failed read has a different identity, so this head does not find it. It stays `unknown` and counts toward the 256 and the budget. Hosted MCP is closed on all three Workers, so only an earlier rehearsal can hold one. This is a reading of the code.
- **The named tool stays stopped while the list is short.** The fence in `#perform` refuses a name that the current catalogue does not serve, so the repeat answers `unknown-tool` until the reads return. `settle` is the way to the answer until then.
- **`archived` on the endpoint.** The hosted store's fix ran on Node's SQLite with real custody and a stand-in room. A real archive floor on the endpoint did not run.
- **The join's "does not hold" path.** A unit assertion on the `report` flag holds the words. No call reached that path. A control on it would survive, so I did not count one.
- **Not run.** `wrangler dev`, a deployed Worker, a real room, and `tsc -p packages/mcp/tsconfig.scope.json`, because the worktree's cloned `node_modules` has no `@cloudflare/workers-types`. The gate runs that check.

## Defects outside the request

I name these and did not fix them. All come from a reading of the code, and none ran.

- A root with its own membership N whose read fails falls to the room's membership or the repository's rather than N, so its identity can still drift. This reaches a person's server too. `s.read.inventory.roots` can resolve it.
- A root with a null membership acted on before a room is joined moves its identity to M after the join.
- `#join`'s `if (!entry.ok) return failed({ error: "read", … })`, after an accepted join, gives `read` words with no word that the scope accepted.
- `#earlierUnder` matches on the key across targets, so a stop on target A can name an unresolved record on target B.
- The `mismatch` next step says "Use a new idempotencyKey for a new meaning", which stays for a key whose earlier record lives in another custody home.
