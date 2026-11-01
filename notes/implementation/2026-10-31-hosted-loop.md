# Run the work-on loop as a hosted agent, one command per phase

Status: source implementation, and it ran live. The gate passed at `f6c6ef9c`. A script drove one hosted agent to a proposal on the deployed dap-demo Worker, in all 29 phases. No model read the prompt or chose a step, so no later claim that a model can work the loop can rest on this run. No hosted code changes.

Request `7ba98c197212a430af021794603bf4a042c8ee49` and promise `d119a5b5f2d732210266a7af507eca2b6fbd3cd0` own this head.

## What changed

An operator can now run one hosted agent through the work-on loop in a new scratch room, with `examples/repo-in-ai/hosted-loop/runbook.md` and one command per phase. The operator ran it once on dap-demo, and the section on the live run below states what that showed.

- **The loop.** The agent accepts naming terms, asks, requests approval and blocks. A person approves and decides from a separate session, then revises and offers new terms. The agent resumes, accepts the new terms, releases the block, links a change and proposes one file through `change.propose-file`.
- **The script is the agent.** A script drives every session, and no model chooses a step. No later claim about a model can rest on this run. Every agent line prints `driver` as `script`, and `agent-verify` prints `modelChoseStep` as `false`. `agent-tools` fetches the prompt through `prompts/get` and prints its digest.
- **The modules.** `examples/repo-in-ai/hosted-loop/` holds `loop.mjs`, `main.ts`, `agent.ts`, `person.ts`, `control.ts`, `hosted-session.ts`, `hosted-client.ts`, `tool-list.ts`, `plan.ts`, `public.ts` and `words.ts`. `local-run.mjs` drives a local Worker, and the gate does not run it.
- **Shared files.** `initializeOwner` in `identities.ts` takes `{ loopback }`, and S1 still refuses HTTP. The receipt in `diagnostics.ts` gains `stop`. `tsconfig.json` includes the new directory.

## How the script holds each rule

- **The tool list.** Every agent phase calls the real `tools/list` first, and `checkToolList` compares it with `hostedMcpTools({ MCP_ENABLED: "true" })`, less `actions` and `act`. The generic names must match exactly. Other names must have the act tool form, and none may be a person's act. The room's definitions and role decide the act tools, so the check holds those by form and by the person-only list.
- **Every fact through hosted tools.** `HostedSession` refuses any argument leaf that this session's replies did not supply and the phase did not declare as a literal. The stop is `unsourced-fact`, before the call leaves. Only `idempotencyKey` is exempt, and nine phases use fixed words for it, such as `hosted-loop-accept`. Those words are the script's memory and not the record's. A model in a new session would have to choose or find its own key. A new session starts with an empty ledger. `agentFetch` stops at `bypass-read` for any address but `<service>/mcp`. A test fixes the imports of `agent.ts`, so it can reach no home, input or network.
- **A fresh session.** The client keeps the service origin, from the public input, and the `bearer` file. A phase stops at `agent-home-differs` if the home holds anything else. Each phase makes a new client, a new `initialize` and a new session ID, and sends `DELETE` at close. `agent-resume` rebuilds the block, the commitment, the decided question, the decision, the new offer and the terms, and signs nothing.
- **The public output.** `publicLine` is a closed projection, and `scanPublic` then reads the bytes for exact private values and token shapes. `privateValues` now holds the person's link, so an agent phase's process reads that file for its scan after the phase ends. No phase receives the link, and `agent.ts`'s imports do not change.
- **The base.** `agent-verify` reads the manifest's `base` and the branch's `head` through its session, and prints both with `baseIsHead` and `standIn`. A 40-hex commit fits `publicLine` only in those two fields. Any other format stops at `commit-format`, and an HTTPS room with no head stops at `no-published-head`. `propose-file`'s guards do not read the base, so this line is what shows a real base.
- **A home with no plan.** `person()` stops at `no-retained-plan` outside `owner`, and writes nothing.
- **A person's decision.** `decide` (`issue.decide`) records the decision. Its guard needs an approve verdict and no open approval request, so `approve` comes first. A decided question does not change the terms, so new terms need `revise` and a new `offer`. The agent's list holds neither `issue.approve` nor `issue.decide`.

## Decisions

- **The planner opens the endpoint.** Hosted MCP is closed on dap-demo under `10f45efc`. In `b328327d` the planner opens it on dap-demo only, at the first deployment that carries J1 after the checker approves this script, and closes it after the run's evidence is sealed. `MCP_TOOL_ADDITIONS` stays unset. If the endpoint stays closed, `preflight` and `owner` stop at `endpoint-closed` before any key or room exists.
- **No other credential.** `owner` makes a new key and a new room through dap-demo's public creation offer. `change.propose-file` carries the file in the signed intent, so the run needs no provider credential, hold or workspace push. `propose-manifest` would need `prepare` and `credential`, and the hosted default omits both.
- **Keep it under `examples/repo-in-ai`.** The subdirectory reuses S1's modules, Vitest project and typecheck, and forks nothing.
- **Use `issueQuestions` as `issue`.** S1's `issueJ4` has no questions.
- **Land with the run.** The head stayed on its branch until the run's evidence joined it, so the request closes on a real proposal.
- **Ask for a new approval before the run.** The checker approved `f25b44a3` for the run. The script then gained the checker's items, a fix to the scan and the base line, so the run waited for `9821f0e4` at `bed1c8be`.
- **Keep `invite-agent`'s own recheck for now.** The engine now waits, so that recheck adds nothing. The run used the script as approved, so this head leaves it.
- **The version's shape.** At `f25b44a3`, `scanPublic` read a deployed Worker's version UUID as an `unexplained-token`, so `preflight` would have stopped at `public-output` on the first live phase. A local Worker answers `unknown`, so no earlier run could show this. `EXPLAINED` in `public.ts` now holds the UUID's shape, and control V1 holds the fix.

## The live run

This is an observed run, on 1 November 2026. The script at `bed1c8be` ran on dap-demo, version `de8427ec-7a38-466d-8b3d-ed5a0cac18ca`, deployed from `de53d89a` under receipt `2894b43a`. The planner opened the endpoint for this run under `b328327d`, and closed it after the evidence was sealed. `POST /mcp` answers 404 again.

- **All 29 phases exited 0, each on its first attempt.** They started at 00:38:41 EDT, and the last started at 00:40:21. The phases' own times sum to 110.8 s. `run/transcript.jsonl` holds them.
- **The proposal.** `agent-propose` was accepted at `sc_efkizv2eq5xygy2kdoxdfz72jeudoommtjoe42h2klq3renvz2bq`, seq 4, with a fact that `agent-verify` reads back. `agent-verify` reports 19 entries and these orders. Issue: `offer, accept, ask, request-approval, block, approve, decide, revise, offer, accept, release-block`. Change: `link-own, propose-file`.
- **The base.** `base` and `head` are both `f07f4647e08b5c8760c4a77bafe1d5d0b7edac88`, with `baseIsHead` `true` and `standIn` `false`. This shows that the record held a head and that the proposal signed it. It does not show that the host holds that commit. On a live room the head comes from the `first-head` outcome, so the host's outcome set it, and this run shows no more than that.
- **The wait.** `agent-wait` started before `approve` and ran 16.6 s. It ended in state `decided`, with one round, on fact seq 8, the same seq and hash as the person's `decide`.
- **Sessions.** The 14 agent phases print 14 different session digests, and each opens a new session.
- **The version.** Only `preflight`'s line prints the version, and it matches the receipt. Every phase compares the input's version with the live one and stops at `target-version` if they differ, and none stopped. `/health` answered the same version at 00:38:31, before the first phase, and at 00:41:10, after the last. Each line does not print its own version, so this rests on that check, which T1 and T2 hold.
- **The tools.** `agent-tools` listed 57 tools, 11 of them generic, and printed the prompt's digest. Later phases' `tools` digest moved from `ecba05c0` to `a943e842` at `agent-link`. A read-only `agent-tools` after the last phase, in `run/after/`, shows why: the same 57 plus 14 `change.*` act tools, 71 in all, with the same 11 generic tools and the same prompt digest. The room's change lane opened at `agent-open-change`, and each phase's check still passed. `run/hosted-tools-compare.txt` shows that the deployed commit and the script's head hold one `packages/mcp/src/hosted-tools.ts`.
- **A separate person.** The person's phases ran from a separate home with a separate key and session. `agent-verify` checks the signers.
- **The public output.** Each line passed `publicLine` and `scanPublic`, which holds the bearer, its secret and the person's link. `run/scan.json` is a second scan of the unit, for the bearer, its secret, the `TEST ` texts and two token shapes, and it found nothing in 128 files. That second scan looked for the link at a path where the script does not keep it, so it covers the link only through each line's own scan.
- **After sealing.** The operator deleted the private home at 00:41:29, after sealing the run's unit. That home held the only copy of the bearer and of the person's key. The scratch room, its agent and its proposal stay on the Worker. The bearer stays valid on the Worker, and nobody holds it.

### What the run's words mean

- **A script ran.** No model read the work-on prompt or chose among the tools. `driver` and `modelChoseStep` in the lines are fixed labels and observe nothing.
- **The ledger.** `HostedSession` holds the rule "every fact comes through hosted tools" together with the script's structure. It does not prove each value's source. Literals are one list, small numbers such as `1` and `60` pass by equality, and booleans are not checked.
- **The keys.** The fixed `idempotencyKey` words are the script's memory. A model in a new session would have to choose or find its own key.
- **The tool list.** The generic names match the hosted default exactly. Act tools are held by form and by the person-only list, because the room's definitions and role decide them.

## Evidence

The checkpoint is `f6c6ef9ccce3e8715354e072d4842fded0e9f195`, tree `9c12e467`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-11-01-hosted-loop-land/`, `SHA256SUMS` `8bfd355c6117c7699ac768d733a427e173322d75d785525979ff8d4429e8d70c`. The reviewed head adds only this note and its manifest. `run/` is the live run's unit, sealed at the time with `SHA256SUMS` `1080e268bf357d4912eb3e81470d73f2ed6fa8405059c739539698073c11c53e`. The gate, the controls and the local run are at the checkpoint, which merges main into `bed1c8be` and does not change the script.

**The local run.** `local-run/` holds an observed run of 46 commands on a local Worker, 48.0 s by clock, from wrangler 4.147.0 pinned in a scratch directory. It includes two Worker starts and the refusal cases. The setup took 7.2 s, as a sum of steps. `summary.json` holds the phases, and `problems` is empty over 185 scanned files. The private homes stay out of the unit.

- **Stand-ins.** The local workerd stands in for the deployment. `standInBase` stands in for a published head, because the room has `--host none`. The key that planned the register creates the room, because a local register has no public creation offer, and `owner` adopts that key on loopback only. The native test uses `OwnGit`, a scripted clock and the fixture's `pause`.
- **The base on that run.** The local line prints the stand-in `1111…`, a `null` head, `baseIsHead` as `false` and `standIn` as `true`. The native test prints equal values from `OwnGit`'s head, with `standIn` as `false`, so that `true` shows the code path and no real base.
- **What it shows.** The real commands, homes and signatures reach `propose-file`. The issue order is `offer, accept, ask, request-approval, block, approve, decide, revise, offer, accept, release-block`, and the change order is `link-own, propose-file`. The agent and the person sign with separate keys. `agent-wait` waits and ends on the person's `decide`, also after the local run kills an `agent-wait` process with `SIGKILL`. `check` on all nine signed agent phases returns the same fact, and the entry count stays at 19.

**The controls.** `controls/results.json` holds one row per control. All 43 ran at the checkpoint and turned their test red by an assertion: the earlier 31, H1, P6, V1, D1, D2 and B1 to B7. Three break texts differ from the unit at `f25b44a3`, because the source they break changed: P1 and P5 now break `closedValues`, and F5 names the new import line. `~/play/artroom-evidence/2026-10-31-hosted-loop-2/`, `SHA256SUMS` `0a1f970c`, and `~/play/artroom-evidence/2026-10-31-hosted-loop/`, `SHA256SUMS` `5b598b3e`, keep the earlier units. The rule tests are in `examples/repo-in-ai/test/hosted-loop.test.ts`, and the whole loop on real scopes is `packages/mcp/test/hosted-loop.scope.test.ts`.

| Rule | Controls |
|---|---|
| The tool list is the hosted default, and every phase checks it | L1, L2, L3, L4 |
| Every fact comes through hosted tools | F1, F2, F3, F4, F5 |
| A fresh session resumes from the record | R1, R2, R3, R4, R5 |
| The public output holds no token or body | P1, P2, P3, P4, P5, P6, V1 |
| The proposal's base and the branch's head | B1, B2, B3, B4, B5, B6, B7 |
| The line says that a script drove the session | D1, D2 |
| The target version, the endpoint and the input | T1, T2, T3, T4, T5, T6, T7 |
| A phase stops when its input is absent or its order is wrong | I1, I2, I3, I4, I5, H1 |

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `cd62d5f96124a046` |
| Controls, 43 | `controls/run-controls.mjs` | 0 | `ffa5c3c6159ee0c9` |
| Local run | `node examples/repo-in-ai/hosted-loop/local-run.mjs` | 0 | `5e45dc9c2e803da5` |
| Live run, the transcript | `run/hl-run.py preflight` | 0 | `ac87e1fdf8d1de69` |
| Live run, `agent-verify`'s line | `loop.mjs --phase agent-verify` | 0 | `cb82134d874d789c` |

The gate reports 3466 plain and 930 native tests, 116 Node and 56 Counting.

## Open limits

- **No model.** A script is enough for this request, by the planner's reading in `c0c39aae`. Whether a model follows the prompt, or chooses among the 57 to 71 tools on its list, is unknown.
- **Later runs need the endpoint opened.** Hosted MCP stays closed on dap-demo under `10f45efc`. A new run needs a new planner decision.
- **The default list is wide.** The agent's list includes `issue.offer`, `key.invite`, `key.revoke` and `member.remove`. The list does not mean the role holds them, but a model sees them.
- **A deployment strands a run.** A new Worker version stops a run at `target-version`, and the recovery is a new home and a new room. `SERVING_CREATION_KEY_PER_HOUR` is 10.
- **`isCommit` accepts 40 hex only.** The live room answered 40 hex. A room with another commit format stops `agent-verify` at `commit-format` after the proposal has landed, and the script then needs an edit and a review.
- **`baseIsHead` reads at verify time.** A publication between `agent-propose` and `agent-verify` turns it `false` with a real base. No phase publishes.
- **`scanPublic` allows any 40-hex run and any UUID shape.** It reads text and cannot tell fields apart, so the field limit lives in `publicLine`.
- **Control gaps.** `agent-verify`'s signer checks have no control of their own.
- **Not run live.** `create-agent --mode continue` with `rotateBearer`, the person's `check` and `continue` modes, `invite-agent`'s rechecks after an `unknown`, and a real lost reply on an agent act. No stop occurred, so no recovery path ran on the Worker. The scripted tests cover those answers.
- **The native test's wait.** Its `agent-wait` runs after the decision. The local run and the live run wait with a real clock.
