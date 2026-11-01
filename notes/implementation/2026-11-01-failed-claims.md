# Tell a person what a failed claim keeps and what a full register needs

Status: source implementation. The gate passed at `c88b6ea5`. The Worker bundle changes, because the page's words and the MCP server's words change. No states or counts change, and no real outage ran.

Request `c19f25da45640957d3ffb6ffca797c8591bb2cae` and promise `75a11674d2589f48117e3081707b275291bfc932` own this head, from the planner's ruling `9af818a5`: option E now, option A in the next cohort, and option D not now. This head builds E and starts neither A nor D.

## What changed

A claim whose attempts fail keeps its place in the register, and the old words hid that. The new words say what the client knows, what a rerun cannot do, and what `--again` spends.

- **The stop on the directory.** `packages/cli/src/claim.ts` no longer says that a claim "may still take effect". It says that the command cannot tell whether the claim is still being tried or has used its attempts, that a rerun cannot restart a failed claim, and that `--again` takes a new place while the old claim keeps its own.
- **The stop on the children.** The directory exists at this stop, so the sentence keeps "may still take effect". It adds that `--again` takes a new place and creates a second repository.
- **`type-full` at a register's `found`.** `REGISTER_FULL` in `packages/cli/src/command-support.ts` replaces "The request was refused." with the register's state and its way out. `dap claim` and `dap act found` both give it. `answered` formats it, and only a caller at a register's `found` passes it.
- **The page.** `dap create` and `--again` do not exist on the page, so `Context.claimSteps` lets the page give its own sentences through the same `claim()`. `apps/room/page/src/claim.ts` holds them, and `apps/room/page/assets.ts` is rebuilt.
- **The MCP server.** `room.create` at a full register told a person to "Close or finish one first", and no act of a register does that. `packages/mcp/src/errors.ts` now gives a register's `found` the meaning of `REGISTER_FULL`, in the frame of its other refusals. `McpService` passes the definition's name in `Asked`. Any other act's `type-full` keeps its words.
- **The test.** `packages/cli/test/failed-claims-close-register.defect.scope.test.ts` lands from `96212d60`. Its DEFECT cases keep their names and their states and counts, and their expected words change. Six WORDS cases join it, two of them through the real `McpService`. `apps/room/page/test/failed-claim-words.scope.test.ts` adds the page's case, and `packages/mcp/test/errors.test.ts` adds one for the condition.
- **The documents.** `docs/deploy.md` gains "What closes a register" and "Count a register's claims from its log". `docs/security/trust-boundaries.md` gains "An outage can close a register". `docs/cli.md` takes the new sentence and links to them.
- **The founder note.** The row "`pending`, all three attempts used" in `notes/2026-11-01-retiring-a-founder.md` said "No" where a late reply can still select the repository. It now says so, with the condition: an attempt is `unknown` and the object that sent it lives. The note also marks that fact as the one fact that a test ran.
- **Seals.** `scripts/security-entry-points.test.mjs` takes its new seals from the owner's failure output: four at `26a6de3d`, and `McpService` at `c88b6ea5`.

This head changes these lines of the sort that main `b0af01d2` holds, because the request needs a different sentence:

- `packages/cli/src/claim.ts`, the digest-only pending claim: "--again signs a new claim, which takes a new place in the register and can create a second repository."
- `packages/cli/test/nothing-sent.test.ts:125`, which expects that sentence.

## Decisions

- **The words state what the client can see.** A client cannot read a claim's state, so no sentence says that a claim failed or stopped. `stopped` and `failed` belong to option A.
- **The operator takes the next step.** A retry cannot clear a full register, so the sentence names the operator and a new register.
- **The longer sentence stays at one place.** `answered` still prints "The request was refused." for a `type-full` of any other act, at any other scope, and at the claim's own seat step.
- **`dap act found` gets the same sentence.** It reaches the same refusal by another command. It omits the `dap create` step, because the person did not run `dap create`.
- **The browser boundary keeps ten exports.** `packages/cli/src/browser.ts` adds a type and no value. `claim.ts` composes the words, and the page gives no step after them.
- **The definition decides MCP's words.** The kind's name is not enough, because other definitions can name an act `found`. The definition's name alone is not enough, because `install` is also a register's act. `#perform` has the name where it builds `Asked`. The `create` path does not reach a register's `found`, so it passes none. `docs/mcp.md` does not state these words, so it does not change.
- **The count uses a room's session.** The operator key gets `forbidden` from the history route 900 seconds after its last entry there, so the documents point to a session of a member of a room that the register created.
- **The DEFECT test stays a defect.** Option A turns these cases around.
- **Reopen condition for option D.** Reopen D when a register holds more than 10 pending claims, or when a real outage leaves pending claims behind.

## Evidence

The checkpoint is `c88b6ea5aa40791737b6c2ac0c3373d7a28a634c`, tree `fe00e40e`. It includes main `b0af01d2`, which holds the sort of the nothing-sent lines. Raw gate evidence is in `~/play/artroom-evidence/2026-11-01-failed-claims-words-2/`, `SHA256SUMS` `b82d4b306fa6671ed334cdf5388b4ec8560a94968716cb7687d5f1c9e226bff4`. The reviewed head adds only this note and its manifest.

Three units hold the runs:

- `~/play/artroom-evidence/2026-11-01-failed-claims/` keeps the earlier run of `96212d60`, which recorded the old words.
- `~/play/artroom-evidence/2026-11-01-failed-claims-words/`, `SHA256SUMS` `5347dc79695ad4d57b06a15a79621e38427ca7bfd70cd8acd7123056b20a3b5b`, is sealed and holds the command and page words. Its runs ran at commit `26a6de3d`, before merge `bd4a4843`. Unit 1 in the table below is this unit.
- `~/play/artroom-evidence/2026-11-01-failed-claims-words-2/` holds the MCP words. Its runs ran at commit `c88b6ea5`, which rests on merge `bd4a4843`. Unit 2 in the table below is this unit.

The red runs of unit 1 put the six source and asset files from merge commit `062ed6fd70` under the tests of `26a6de3d`. The red runs of unit 2 put `errors.ts` and `service.ts` from `bd4a4843` under the tests of `c88b6ea5`. Each failure is an assertion on the words. The cases "a type-full of another act" and "MCP's member.invite" pass at those bases, as guards should, and their controls turn them red.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `14bcd6709ef7be2f` |
| Unit 1, red: three WORDS cases, page case, public-route DEFECT case | `vitest --project scope`, three files, `-t "WORDS\|DEFECT\|directory"` | 1, 5 failed of 16 run | `9a690b8300977650` |
| Unit 1, red: digest-only pending claim | `vitest --project cli nothing-sent` | 1, 1 failed | `2a1d93bfa4555c73` |
| Unit 1, red: existing claim case with the new sentence | `vitest --project scope cli/test/claim.scope` | 1, 1 failed | `512a546475986a64` |
| Unit 1, control: old directory sentence, WORDS "gave up on the directory" | `drive.py controls` | 1 | `2baed5abfdd82ec0` |
| Unit 1, control: old children sentence, WORDS "whose directory exists" | `drive.py controls` | 1 | `429687021b8bda03` |
| Unit 1, control: bare `type-full` at `dap claim`, WORDS "a full register's" | `drive.py controls` | 1 | `ae376149d0dc11ec` |
| Unit 1, control: bare `type-full` at `dap act found`, WORDS "a full register's" | `drive.py controls` | 1 | `6dd4b0840464210f` |
| Unit 1, control: long words at every `type-full`, WORDS "another act" | `drive.py controls` | 1 | `7969c0c93426ceea` |
| Unit 1, control: long words at any `dap act`, WORDS "another act" | `drive.py controls` | 1 | `50b0f9ffdc42b858` |
| Unit 1, control: long words at the seat step, WORDS "another act" | `drive.py controls` | 1 | `17d09578170cfd09` |
| Unit 1, control: command words on the page, WORDS "the page's stop" | `drive.py controls` | 1 | `bf045a723fd4a06f` |
| Unit 1, control: old digest-only sentence, "a stop over a pending claim" | `drive.py controls` | 1 | `8e63746bab917ae5` |
| Unit 1, green, scope, 22 tests | `drive.py green` | 0 | `2db9c34fc3c7e14a` |
| Unit 1, green, cli, 9 tests | `drive.py green` | 0 | `f7ce03e91e0d1b81` |
| Unit 1, green, page, 4 tests | `drive.py green` | 0 | `213ab8e9c1f470e6` |
| Unit 1, Worker bundle, observed by dry run, nothing deployed: 6,705,206 bytes at the base sources, 6,707,124 at `26a6de3d` | `wrangler deploy --dry-run --config wrangler.demo.jsonc` | 0 | `d09f8b50cae45d10` |
| Unit 2, red: "MCP's room.create" | `vitest --project scope failed-claims-close-register -t "MCP's"` | 1, 1 failed, 1 passed | `ef58bcc664d326ba` |
| Unit 2, red: "a type-full names the operator" | `vitest --project mcp errors` | 1, 1 failed | `b357dca191959cdc` |
| Unit 2, control, words removed: old next step at a register, "MCP's room.create" | `drive2.py` | 1 | `ed6465d5c71a5dda` |
| Unit 2, control, words removed: `#perform` names no definition, "MCP's room.create" | `drive2.py` | 1 | `8abed032547c74bf` |
| Unit 2, control, words spread: register words at every `type-full`, "MCP's member.invite" | `drive2.py` | 1 | `064c86bbf88c03ed` |
| Unit 2, control, words spread: the kind alone decides, "a type-full names the operator" | `drive2.py` | 1 | `000b63deae5b3407` |
| Unit 2, control, words spread: the definition alone decides, "a type-full names the operator" | `drive2.py` | 1 | `924e8a598583affd` |
| Unit 2, green, scope, 24 tests | `drive2.py` | 0 | `8d3fe679efefd9a3` |
| Unit 2, green, mcp, 23 tests | `drive2.py` | 0 | `b9df92f7fbf1cd4a` |
| Unit 2, green, cli, 9 tests | `drive2.py` | 0 | `a2935d3d154f1299` |
| Unit 2, Worker bundle, observed by dry run, nothing deployed: 6,710,415 bytes at the sources of `bd4a4843`, 6,710,894 at `c88b6ea5`. `apps/room/page/assets.ts` rebuilds to the same bytes | `wrangler deploy --dry-run --config wrangler.demo.jsonc` | 0 | `d8cb05e41085453f` |

The count method ran once in the public-route DEFECT case, on real scopes with a scripted host. It read 66 `found` rows, 194 outcome rows and 2 result rows with 3 effects. 64 `found` rows have no result row, and the inspector's 64 pending claims are the same IDs. In that run the operator's history read answered `forbidden`, and a room member's `dap log register` exited 0. The operator's refusal came a day past the operator's last entry, on the test's scripted clock.

The gate reports 3512 plain and 1002 native tests, 116 Node and 56 Counting.

## Open limits

- **A register still closes.** This head changes words only. A full register stays full until option A or a new register.
- **No real outage ran.** The host is scripted, and the count method has not run on a deployed Worker.
- **MCP reaches these words only with a key that can read the register.** A key with no entry at the register in its read window reads `forbidden`, and its list holds no `room.create`. `room` reports the register as unread. The test uses a key with entries, and this head leaves that list as it is.
- **The guard's refusal is scripted.** No membership in the MCP guard case is full, so the `/acts` reply for `invite-member` is a stand-in. The register's case is a real full register.
- **The acts panel keeps the bare line.** `nonacceptedAnswerText` in `apps/room/page/src/view.ts` does not take `REGISTER_FULL`. The page's creation path does not use that panel.
- **A rerun after `type-full` reads `expired` in time.** The saved refused claim is unchanged, so `dap claim` can later print `Refused: expired`. The `type-full` sentence directs a person at a command to `--again`.
- **The page blocks a second creation after `type-full`.** A saved refused claim keeps "A creation is already in progress" on that page. So the page's next step is the operator, and the sentence says so.
- **A legacy record on the page can show `--again`.** The digest-only stop names `--again`, and the page has no such control. Only a saved claim that holds a digest alone can reach it.
