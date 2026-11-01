# Refuse read tokens to a key that a compromised notice named

Status: source implementation. The gate passed at `fdfc1564`. No Worker runs this code yet. The planner deploys it after it lands.

Request `9beb1933863a539afc4681f9919a7e234a35f83e` and promise `c004795751b14d4f198644fec200106ab7198440` own this head.

## What changed

Before this head, a revoked key could sign `read-token` for up to 300 s, because the destination kept an observation that showed the key active. The session that the key held could then read the new token, which lasts up to 24 hours. A `compromised` notice changed neither route.

A destination now keeps each key that an applied `compromised` notice names, and two routes ask for it.

- **The record.** `private_named_key` is a new table in `packages/scope/src/credential-store.ts`. The notice's delivery adds the row inside its own transaction, through the new port `sealedDelivery`, so the row and the entry commit together. `compromisedKey` in `packages/platform/src/destination.ts` decides which entry names a key.
- **`read-token`.** `observing` in `packages/scope/src/authority.ts` answers `unauthorized` in the commit, whatever the held observation says. The scope writes nothing.
- **The credential route.** `DestinationHost.credential` answers `forbidden` to the named key. The route refuses both a token minted before the notice and a token whose mint finishes after it.

The existing words reach a person. `dap clone` prints `Refused: unauthorized, judged at entry <scope>:<seq>. The request was refused.` for the act, and `Cannot read the read token <handle>: forbidden.` for the credential route.

Hosted code changes. `apps/room/page/assets.ts` is the rebuilt bundle, 4 bytes longer. `native-declarations.generated.ts` does not change, so this head adds no Destination pin and moves no pin. Four seals moved, each from the owner's failure output: `object.ts:$module`, `object.ts:ScopeObject`, `authority.ts`, and `destination-host.ts`.

`read-token.test.ts` now holds the notice back in its stolen-key case, because that case shows the time before the notice arrives. `2026-11-01-signed-read-refusal.md` gains one sentence that says so.

## Decisions

- **Private custody, and no new definition.** A pin is fixed at genesis, so a new Destination pin protects only new rooms. Custody protects every room on the Worker when the planner deploys this head, at every destination pin and on both hosts. A definition adds little here: a refused act writes no entry for replay to read, and the credential route writes no entry at all. The cost is that replay cannot check the refusal, and the docs say so.
- **A new table, and no read of the journal.** The journal already holds each notice, but the `entry` table has no index on a message or a key. A scan reads up to 100,000 rows for each act and each credential read. A floor can also remove the entry. So a row beside the journal is the smallest record that answers one key in one lookup.
- **The row commits with the notice.** A failure in `sealedDelivery` aborts the delivery, and the sender keeps the task. No state exists where the entry stands and the refusal is missing, and a restart loses nothing.
- **The bound comes from membership.** The table holds one row for each named key, and a key never returns (`key-in-use`). A row needs a key that membership enrolled and then revoked, which takes at least three entries of its journal, apart from the first key. `archive-inventory.ts` excludes membership journals from the archive, so I read that membership takes no floor, and I did not run that. So `scopeEntries` limits a room to about 33,000 rows of under 256 bytes each. The contract states that bound. No definition states it, and the table evicts nothing, because evicting a row reopens a refusal.
- **The commit asks.** A check before the read of membership misses a notice that lands during that read. The case in `authority.test.ts` and `c7` show the difference.
- **`read-token` only.** The request names this act and the credential route. The key's other acts at the destination keep the 300-second limit, and the docs list them as open. `evidence-recover-timeout` holds the same grant, so the check reads the act's kind and not its grant.
- **Only an applied notice names a key.** The row's guard refuses a notice from another directory, and the entry still records that refusal. Without this check, a stranger could close any key's route.
- **No membership read at the credential route.** A live read there closes the time before the notice, a retired key, and possibly the lane's route too. It also adds a call to every credential read, and it fails closed when membership does not answer. The request asks for the notice, so I built the notice. The planner can weigh this as a later change.
- **A mint in flight still mints.** The host mints the token, and the plaintext stays in custody until the expiry queue drops it. Nobody can take it, so a check before the mint adds nothing to the refusal. The token stays live at the host until its end.
- **No Durable Object migration.** The table is `CREATE TABLE IF NOT EXISTS`, and older code ignores it, so a rollback works. Rows written before a rollback stay unread until the code returns.

## Evidence

The checkpoint is `fdfc1564a172718ac48fc75977d2a7ee83faca3c`, tree `d6e38c43`. Raw gate evidence is in `~/play/artroom-evidence/2026-11-01-token-refusal/`, `SHA256SUMS` `a0cda48bf16b7c30c250833117d651e389a331f0416151ba0a0508ffc5151993`. The reviewed head adds this note and its manifest.

The first gate ran at `abbe2646` and failed in one test, `packages/cli/test/application-examples.test.ts:63`, which timed out at 5000 ms under load. That test does not touch this head, and it passed in about 3.1 s alone at the same head, in one observed run. `gate-failed-timeout/` keeps that run. The passing gate ran at `fdfc1564`, which merges main `76c67b3f`. That merge adds documents and notes, keeps the signed-read note's sentence from this head, and rewords the operator's REST step in `docs/security/trust-boundaries.md`, because a key can take a new token until the notice arrives.

The focused logs and the controls ran at `abbe2646ca5c880c28a3ecdc228107b8a0e09056`, tree `2ffd4cbc`, and each log names its head. That head merges main `970c701c`, which adds only a design note. Each row is an observed run.

- **The red run.** `red/run.log` ran at main `991129fc` with one untracked test file, kept as `red/token-refusal.test.ts.txt`. It fails by assertion at refusal 1. The final test adds the custody row's assertion and an `expect` in its helper, and neither changes what the run shows. `red/first-run-clock-not-advanced.log` is the first attempt. Its clock did not move, so membership refused the act on a new read. That run fails at the credential route: main answers 200 where the test asks for 403.
- **The controls.** `controls/summary.jsonl` lists each control with its failure and log digest. The row `c4-first-attempt-mutation-never-ran` shows nothing: my first `c4` sat behind a flag that nothing set. The row after it is the real `c4`.
- **The types.** The worktree's `node_modules` has no `@cloudflare/workers-types`. `tsc` ran from a scratch config that links the same version, 5.20260815.1, from another worktree. No package was installed.

| Check | Head | Command | Exit | Output digest (sha256) |
|---|---|---|---|---|
| Red run: the key that the notice named gets `read-token` accepted | `991129fc` | `npx vitest run ... test/token-refusal.test.ts`, from `packages/scope` | 1 | `e6180e1533a6afaa1d574c23f5c3b859a9430926bc61a7eef623e0c7c484492c` |
| The scope test on real scopes | `abbe2646` | `npx vitest run --project scope packages/scope/test/token-refusal.test.ts` | 0 | `3708d8dfd2cfbfba53ae534dd1f4cd4d1f17272b93f8ca2e7b76683c85e5a1ee` |
| The case before the notice arrives | `abbe2646` | `npx vitest run --project scope packages/scope/test/read-token.test.ts` | 0 | `04d8ebd48e2eeae8c247a3667767c1f301ac7dd3ed0886fad7c5b08bc05fdbde` |
| `dap clone` words: the refused act and the refused credential read | `abbe2646` | `npx vitest run --project scope packages/cli/test/clone.scope.test.ts` | 0 | `606ae472e65e56385af646dd435a1151b5f2b2547852cfa9c482976fb0ae6e35` |
| A notice that lands during the read, with a scripted reader | `abbe2646` | `npx vitest run --project scope packages/scope/test/authority.test.ts` | 0 | `b60d58695e6d73477ff9f20553f1dc5e355782c3fe5ce554f191b16bbb0a8d16` |
| Only an applied notice names a key | `abbe2646` | `npx vitest run --project platform packages/platform/test/destination.test.ts` | 0 | `e76ec90fc78ee490e2d05d1b5aaadf70d8f1c48c7631dd6c8347f278437f792b` |
| 14 nearby scope, page and MCP files, 61 tests | `abbe2646` | `npx vitest run --project scope ...`; the log names each file | 0 | `bc33615d4930a48faafb98799b5eaa1d3974b9695984a61739533dca2b5a0228` |
| `c1`: no check at `read-token`. The refused act is accepted | `abbe2646` | `node scripts/control.mjs` | 0 | `e37f22948bfa352d5d660b5a3cab3eab03233a1d1428e8a6db0178696372edd3` |
| `c2`: no check at the credential route. The session reads the unread token | `abbe2646` | `node scripts/control.mjs` | 0 | `26262744cdf71cbf084e87fe4d5798073617e8a3f56206ae98530067b5a26000` |
| `c3`: the notice keeps no row. The custody assertion fails | `abbe2646` | `node scripts/control.mjs` | 0 | `a9987b10e1d996d362e2cd31473b3354741a3f0f790d8008c868a79696e8e5b0` |
| `c4`: an object start deletes the rows. The session reads after the restart | `abbe2646` | `node scripts/control.mjs` | 0 | `a6c5357f88583a5c49219937502c2d5121fb3318c9b115bbe7ca2660951bb31a` |
| `c5`: any row refuses every key. The second key of the member is refused | `abbe2646` | `node scripts/control.mjs` | 0 | `2e3b9d61edf781058152166061bfd9baf3715982108b7af230050f69e4437c35` |
| `c6`: a refused notice names a key. The plain case fails | `abbe2646` | `node scripts/control.mjs` | 0 | `0c2f4ca9074c6031a45e309b47a9872adaff56d74cc04cc3b4ea6ec887aa85b7` |
| `c7`: the check reads custody before the read of membership. The race case fails | `abbe2646` | `node scripts/control.mjs` | 0 | `97b0e86cbba49936a5bfcf685326259be2153ebe672ffd91253bd8a45de0994a` |
| `c8`: no check at `read-token`, under `dap clone`. The words differ | `abbe2646` | `node scripts/control.mjs` | 0 | `ca1ac448120f8505134ee73d6030df1a8de639273a1ddb7f5f3ef10afb91d39d` |
| `c9`: no check at the credential route, under `dap clone`. The clone succeeds | `abbe2646` | `node scripts/control.mjs` | 0 | `3561bc91ba4b75a426899beabfd4f4f9d114e0c22387a6db6992927f5efac682` |
| `t1`: an observation kept for 600 s. The act at 300 s is accepted | `abbe2646` | `node scripts/control.mjs` | 0 | `ec1ccfb989c52d8117881da122d8082d25756d6d51951af304a4d2f99ca92da4` |
| `t2`: an observation kept for 299 s. The act at 299 s gets no token | `abbe2646` | `node scripts/control.mjs` | 0 | `f74172ed07a3bdb05726926b68768b0fef192db71aec59c82915789cb292281f` |
| Seals | `abbe2646` | `node --test scripts/security-entry-points.test.mjs` | 0 | `cf55809e8da9de2165073a67292074e89c2041a00432664d084aa17eabcaaf30` |
| Settings inventory | `abbe2646` | `node --test scripts/security-settings.test.mjs` | 0 | `03e966f7cbc884d016bdb87ef3d8354570a9761daef3fa0796982a8f79ca87f8` |
| Generated declarations are unchanged | `abbe2646` | `node packages/platform/scripts/pin-native-declarations.mjs --check` | 0 | `79ae2d5880cd520da4865e5a73b1a41f498a125019dbc60be90fd30ce91d3e79` |
| Rebuilt bundle | `abbe2646` | `npx vitest run --project page apps/room/page/test/assets.test.ts` | 0 | `b37decb0c4c7c6be9b4ce8a8d108ae9eb0f490cc9298ed8aa987b6a3683866e6` |
| Scope, platform and CLI scope test types | `abbe2646` | `tsc`; the logs are `focused/tsc-*.log` | 0 | `4d2e65086fae5d178758907d06c9480b7a06d0544b218619ecc4eda5041d11a1` |
| Gate | `fdfc1564` | `npm run gate` | 0 | `8211677a6f05cb6b` |

The gate reports 3476 plain and 976 native tests, 116 Node and 56 Counting.

## Open limits

- **A token already read.** It stays good until its end. Design note `notes/2026-11-01-git-read-token-after-revocation.md` owns what can end it.
- **The time before the notice arrives.** A key can mint for up to 300 s after the revocation, and it can read for up to 600 s, until the notice lands. The notice waits in two outboxes. Nobody measured that delay on a deployed Worker.
- **A key revoked as `retired`, and a removed member.** Neither sends a notice. The test holds the retired case open.
- **A lane's workspace token.** The notice reaches no lane. I read that route and did not run it.
- **The key's other acts at the destination.** They keep the 300-second limit.
- **Replay.** It cannot show the refusal, because no definition states it.
- **A notice before the deploy.** It adds no row. Its key can still read a token for the rest of its session, at most 600 s after the revocation.
- **Other runs.** Only a stand-in binding answered, so no real Artifacts or GitHub token ran, and no GitHub port ran these cases. The room ran on the default register's pins. `compromisedKey` reads no pin, and I did not run older pins. The MCP tools `credential` and `diff` use the same route, and I did not run them after a notice. No deployed Worker ran this.
- **The race.** Only the scripted reader shows the order of the read and the notice. No real scope ran that order.
