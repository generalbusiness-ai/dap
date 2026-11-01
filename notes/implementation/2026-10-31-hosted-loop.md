# Run the work-on loop as a hosted agent, one command per phase

Status: source implementation. The gate passed at `d1135ce1`. The script reached a proposal on a local Worker. It has not run on a deployed Worker, so no done-when item of the request is met yet. No hosted code changes.

Request `7ba98c197212a430af021794603bf4a042c8ee49` and promise `d119a5b5f2d732210266a7af507eca2b6fbd3cd0` own this head.

## What changed

An operator can now run one hosted agent through the work-on loop in a new scratch room, with `examples/repo-in-ai/hosted-loop/runbook.md` and one command per phase.

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
- **Land with the run.** This head stays on its branch until the run's evidence joins it, so the request closes on a real proposal.
- **Ask for a new approval.** The checker approved `f25b44a3` for the run. This head adds the checker's items, a fix to the scan, and the base line, so the run waits for a verdict on this head.
- **The version's shape.** At `f25b44a3`, `scanPublic` read a deployed Worker's version UUID as an `unexplained-token`, so `preflight` would have stopped at `public-output` on the first live phase. A local Worker answers `unknown`, so no earlier run could show this. `EXPLAINED` in `public.ts` now holds the UUID's shape, and control V1 holds the fix.

## Evidence

The checkpoint is `d1135ce1d5d88a136341c678fd7cf7bef2b8c484`, tree `ab699756`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-10-31-hosted-loop-2/`, `SHA256SUMS` `0a1f970cda0ce9fc5eaabb9f1254158af6ef6e16aec37f98ee82c3cde927c1f1`. The reviewed head adds only this note and its manifest.

**The local run.** `local-run/` holds an observed run of 46 commands on a local Worker, 55.9 s by clock, from wrangler 4.147.0 pinned in a scratch directory. It includes two Worker starts and the refusal cases. The setup took 9.5 s, as a sum of steps. `summary.json` holds the phases, and `problems` is empty over 185 scanned files. A separate search of the public output for the bearer, its secret and the `TEST ` texts found 0 files. The private homes stay out of the unit.

- **Stand-ins.** The local workerd stands in for the deployment. `standInBase` stands in for a published head, because the room has `--host none`. The key that planned the register creates the room, because a local register has no public creation offer, and `owner` adopts that key on loopback only. The native test uses `OwnGit`, a scripted clock and the fixture's `pause`.
- **The base on that run.** The local line prints the stand-in `1111…`, a `null` head, `baseIsHead` as `false` and `standIn` as `true`. The native test prints equal values from `OwnGit`'s head, with `standIn` as `false`, so that `true` shows the code path and no real base.
- **What it shows.** The real commands, homes and signatures reach `propose-file`. The issue order is `offer, accept, ask, request-approval, block, approve, decide, revise, offer, accept, release-block`, and the change order is `link-own, propose-file`. The agent and the person sign with separate keys. `agent-wait` waits and ends on the person's `decide`, also after the local run kills an `agent-wait` process with `SIGKILL`. `check` on all nine signed agent phases returns the same fact, and the entry count stays at 19.

**The controls.** `controls/results.json` holds one row per control. All 43 ran at the checkpoint and turned their test red by an assertion: the earlier 31, H1, P6, V1, D1, D2 and B1 to B7. Three break texts differ from the unit at `f25b44a3`, because the source they break changed: P1 and P5 now break `closedValues`, and F5 names the new import line. A precheck stopped the runner's first attempt on F5's old text, before any break applied, and `run.out` holds the second attempt. `~/play/artroom-evidence/2026-10-31-hosted-loop/` keeps the earlier unit, `SHA256SUMS` `5b598b3e`. The rule tests are in `examples/repo-in-ai/test/hosted-loop.test.ts`, and the whole loop on real scopes is `packages/mcp/test/hosted-loop.scope.test.ts`.

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
| Gate | `npm run gate` | 0 | `e00fad2e8a3f3304` |
| Controls, 43 | `controls/run-controls.mjs` | 0 | `61219ec7233cb007` |
| Local run | `node examples/repo-in-ai/hosted-loop/local-run.mjs` | 0 | `2a80a2c2463eef49` |

The gate reports 3445 plain and 908 native tests, 115 Node and 56 Counting.

## Open limits

- **No live run.** No part of this ran on a deployed Worker. The request's done-when items all need one.
- **A deployment strands the run.** A new Worker version stops the run at `target-version`, and the recovery is a new home and a new room. `SERVING_CREATION_KEY_PER_HOUR` is 10.
- **What the local run cannot show.** The endpoint's state on a deployed Worker, a deployed version's UUID on the real line, a new key's claim through dap-demo's creation offer on this script, a real base on `propose-file`, and a model following the prompt.
- **The ledger shows value equality.** Small numbers discriminate weakly. `standInBase` is a declared literal, and only a loopback input accepts it.
- **The default list is wide.** The agent's default list has 57 tools on membership@8, including `issue.offer`, `key.invite`, `key.revoke` and `member.remove`. The list does not mean the role holds them, but a model sees them.
- **Control gaps.** `agent-verify`'s signer checks have no control of their own.
- **A live base is unconfirmed.** Nothing has shown a head on a dap-demo room at `agent-propose`. The branch starts `empty`, and `first-head` sets `head` with up to 3 attempts. `no-published-head` meets the first phase that needs it, `agent-propose`, after `agent-open-change` and `agent-link` have signed. That stop signs nothing, so the phase can run again. dap-demo's commit format is also unconfirmed.
- **`baseIsHead` reads at verify time.** A publication between `agent-propose` and `agent-verify` turns it `false` with a real base. No phase publishes.
- **`scanPublic` allows any 40-hex run.** It reads text and cannot tell fields apart, so the field limit lives in `publicLine`.
- **Not run.** `create-agent --mode continue` with `rotateBearer`, the person's `check` and `continue` modes, `invite-agent`'s rechecks after an `unknown`, and a real lost reply on an agent act. The scripted tests cover those answers.
- **The native test's wait.** Its `agent-wait` runs after the decision. Only the local run waits with a real clock.
