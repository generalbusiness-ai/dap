# Run the work-on loop as a hosted agent

This script runs one hosted agent through the work-on loop in a scratch room.
The agent accepts naming terms, asks a question, requests approval and blocks
its work. A person decides from a separate session. The agent then accepts the
new terms, releases the block and proposes one file.

Each phase is one command and one process. Each agent phase opens a new MCP
session on the Worker's `/mcp`. The script is the agent, so no model reads the
work-on prompt. `agent-tools` fetches the prompt and prints its digest.

A script drives every session, and no model chooses a step. The run shows that
the hosted tools and the record carry the whole loop. No later claim that a
model can work the loop can rest on this run, because that claim needs its own
run. Every agent line prints `driver` as `script`, and `agent-verify` also prints
`modelChoseStep` as `false`. Say the same in any result or note about the run.
The operator runs the person's commands, and the person's words are the script's
fixed `TEST` texts.

The script creates a new room. It never touches the real repo-in-ai room.

## Prepare the Worker

The hosted endpoint is closed unless the deployment sets `MCP_ENABLED` to the
exact string `true`. The planner owns that deployment.

1. Set `MCP_ENABLED` to `true` on the target Worker, in a reviewed deployment.
2. Leave `MCP_TOOL_ADDITIONS` unset. Any addition makes the list differ from the
   hosted default, and every agent phase stops at `tool-list-differs`.
3. Record the Worker version from the deployment receipt.
4. Compare the tool policy with the deployed commit, and keep the result in the
   run's evidence. `hostedDefaultTools` reads the policy from this checkout, not
   from the Worker.

   ```sh
   git diff --exit-code <deployed commit> HEAD -- packages/mcp/src/hosted-tools.ts
   ```

   If the file differs, compare the generic names in the `names` of
   `agent-tools` with `hostedMcpTools` at the deployed commit by hand. Record
   that comparison in the evidence.

Deploy no Worker between the first phase and the last. Every command compares
the input's version with the live version, and a new version stops the run at
`target-version`. A stopped run has no way forward on a new version. Start
again with a new home, which makes a new room. The section
[what the script leaves behind](#know-what-the-script-leaves-behind) says what
happens to the old room's agent.

The run needs no provider credential and no hold. `change.propose-file` carries
the file in the signed intent, so the agent pushes nothing to a workspace.

## Prepare the input

Copy [input.example.json](input.example.json) outside the checkout, and replace
these fields:

| Field | Value |
| --- | --- |
| `deploymentVersion` | The exact version in the deployment receipt. |
| `deployment` | The deployment name in the same receipt. |
| `register.scope` | The register scope ID in the reviewed receipt or its verified creation offer. |
| `register.genesis` | The genesis digest of that same register reference. |
| `home` | A new absolute path. No part of the path is `repo-in-ai`. |
| `name` | A label that starts with `hosted-loop-`. |

Check `service` and the full `register` reference against the receipt. A
register with the `open` policy lets the new person's key claim a room. The
example's version and register reference are placeholders, so the example
stops at `input`.

The script keeps two homes under `home`:

- `person` holds the person's key, configuration and retained originals.
- `agent` holds one file, `bearer`. An agent phase stops at `agent-home-differs`
  if that directory holds anything else.

The agent's key, configuration and custody stay in its object on the Worker.

## Run the phases

Use a clean checkout at the reviewed commit with its locked dependencies. Run
each phase in this form, with a new diagnostics directory each time:

```sh
node examples/repo-in-ai/hosted-loop/loop.mjs --input <file> --phase <phase> --mode new --diagnostics <NEW-directory>
```

Run the phases in this order. **Person** means the person's home and session,
and **agent** means a new hosted session that holds only the bearer.

| Phase | Actor | What it does | Signed act |
| --- | --- | --- | --- |
| `preflight` | Operator | Checks the Worker's version and that `/mcp` answers. | None |
| `owner` | Person | Makes the person's new key and home. | None |
| `create` | Person | Creates the room. | `found` |
| `roles` | Person | Adds `issue.approve` and `issue.decide` to the admin role if it lacks them. | `set-actions` |
| `rules` | Person | Publishes the room's rules. | `publish` |
| `activate-issue` | Person | Activates the issue definition with questions. | `activate` |
| `activate-change` | Person | Activates the change definition. | `activate` |
| `invite-agent` | Person | Adds the agent as a member and keeps its one-time link privately. | `add-member`, `invite-key` |
| `create-agent` | Person | Creates the hosted agent, which enrols its key, and writes its bearer to the agent's home. | The agent's `enrol` |
| `open-issue` | Person | Opens the issue with the first terms. | `open-issue` |
| `offer` | Person | Offers the commitment to the agent. | `offer` |
| `agent-tools` | Agent | Reads `tools/list` and `work-on`, and prints their digests and the names. | None |
| `agent-accept` | Agent | Accepts the offer on its terms. | `accept` |
| `agent-ask` | Agent | Asks the question. | `ask` |
| `agent-request` | Agent | Requests its controller's approval. | `request-approval` |
| `agent-block` | Agent | Blocks the commitment on the question. | `block` |
| `agent-wait-open` | Agent | Waits one second, and shows that the wait changed nothing. | None |
| `agent-wait` | Agent | Waits until the question is decided. Run this phase in a second terminal. | None |
| `approve` | Person | Answers the approval request, with a comment. | `approve` |
| `decide` | Person | Closes the question. `agent-wait` then exits. | `decide` |
| `revise` | Person | Writes the new terms. | `revise` |
| `offer-new` | Person | Offers a commitment on the new terms. | `offer` |
| `agent-resume` | Agent | Rebuilds the block, the decision and the new offer from the record alone. | None |
| `agent-accept-new` | Agent | Accepts the new terms. | `accept` |
| `agent-release` | Agent | Releases the block, citing the decision. | `release-block` |
| `agent-open-change` | Agent | Opens the change lane. | `open-pr` |
| `agent-link` | Agent | Links the issue to the change. | `link-own` |
| `agent-propose` | Agent | Proposes the one file. | `propose-file` |
| `agent-verify` | Agent | Reads both lanes back, checks their order and their signers, and prints the proposal's base beside the branch's head. | None |

Start `agent-wait` before `approve`, and leave it running. It waits up to 30
minutes. If it stops or dies, start it again. A new session waits on the same
question, and no state is lost.

## Read the public result

A phase prints one JSON line on stdout and nothing else. The line holds fixed
words, references (scope IDs, seqs and digests) and small numbers. An accepted
phase holds the fact that the scope recorded for its act. Every agent phase
holds `tools`, the digest of its list, and `session`, the digest of its session
ID. Keep these lines as the run's evidence.

`agent-verify` prints `base`, the commit the proposal signed, and `head`, the
branch's head now. Both come from this session's hosted tools. `baseIsHead` says
whether they are equal. `propose-file`'s guards do not check the base, so this
comparison is the run's evidence of a real base. `standIn` is `true` only on a
loopback input with `standInBase`, where `base` is a stand-in and no real base.

`publicLine` refuses any other value before it writes a byte, and `scanPublic`
reads the line again. No bearer, token, link, body, question, comment or file
content can print. The diagnostics directory holds fixed stages and causes.

## Recover from a stop

A stop prints its word on stderr and exits 1. The mode says what the phase may
do next:

| Mode | What it does |
| --- | --- |
| `new` | Signs a new act, or reuses the fact if the phase's original is accepted. |
| `check` | Reads the original and signs nothing. |
| `continue` | Resends the same retained original. Another meaning is refused. |

An agent phase finds its original on the agent's object, by its fixed
`idempotencyKey`. To learn what happened to a lost reply, run `check` first.
Those fixed keys are the script's memory, not the record's. A model in a new
session would have to choose or find its own key.

This table lists the common stops:

| Stop | Meaning | Next step |
| --- | --- | --- |
| `target-unavailable` | The Worker did not answer, or its first `/health` after idle reports that it is not ready. | Run the phase again. |
| `endpoint-closed` | `/mcp` answers 404. | Ask the planner to open the endpoint. |
| `target-version` | The Worker's deployment or version differs from the input. | Start again with a new home. |
| `tool-list-differs` | The session's list is not the hosted default. | Stop the run, and read the Worker's settings. |
| `unsourced-fact` | A phase's argument came from no reply of its session. | Report a script defect. |
| `bypass-read` | The client tried an address other than `/mcp`. | Report a script defect. |
| `no-person-home` | The person's home does not exist. | Run `owner`. |
| `no-retained-plan` | The person's home holds no plan of this script, so it is not this run's home. | Use a new home. If `owner` began this home and stopped, run `owner` with `continue`. |
| `no-published-head` | The destination's branch has no head at `agent-propose`. The phase signed nothing. | Run `agent-propose` again. If the branch stays empty, stop the run and report it. |
| `commit-format` | The base or the head is not a 40-hex commit. `agent-verify` signed nothing. | Report it. The script needs an edit for this format, and the phase can then run again. |
| `no-bearer`, `agent-home-differs` | The agent's home does not hold exactly its bearer. | Run `create-agent`, or restore the home. |
| `no-offer`, `no-commitment`, `no-question`, `no-approval-request`, `no-block`, `no-decision`, `no-new-offer`, `no-change-lane`, `no-issue-lane` | An earlier phase has not run. | Run the earlier phase. |
| `no-original` | `check` or `continue` found no original. | Run the phase with `new`. |
| `act-refused`, `act-unresolved` | The scope refused the act, or its result is unknown. | Run `check`. |

If `create-agent` lost its first reply, the Worker shows the bearer no second
time. Run `create-agent` with `continue`. It rotates the bearer and writes the
new one.

## Run the script locally first

To run every phase against a local Worker, supply a pinned wrangler from a
directory outside this checkout. The run uses a port on loopback, and it reaches
no deployed Worker.

```sh
WRANGLER=<wrangler's bin file> WITNESS_DIR=<new private directory> node examples/repo-in-ai/hosted-loop/local-run.mjs
```

The run writes `public/summary.json`, `public/transcript.jsonl` and each
command's output under `WITNESS_DIR`, and it scans those bytes. `private` holds
the homes and the Worker's state, so keep it out of any evidence.

A local run differs from a live run in three ways:

- wrangler's local workerd stands in for the deployment.
- The room has no Git host, and `standInBase` stands in for the published head.
  An HTTPS input refuses that field. `agent-verify` prints `standIn` as `true`,
  `head` as `null` and `baseIsHead` as `false`.
- A local register has no public creation offer, so the key that planned the
  register creates the room. A live run makes a new key, and that key claims the
  room through the Worker's offer.

## Know what the script leaves behind

The scratch room, its agent and its proposal stay in place after the run. The
script deletes nothing on the Worker, revokes no key and merges nothing.

The bearer stays valid after the run, because the agent's object keeps the
agent's key. Closing the endpoint does not end the bearer. A later deployment
that reopens the endpoint makes it work again. So after you seal the evidence,
delete the whole private home that `home` names. The sealed evidence holds only
public lines, so nothing in it depends on that home. The home holds the only copy
of the bearer and the person's key, so nobody can then use or rotate the bearer.

A stop after `create` can cost a new home and a new room. The old room stays on
the Worker, and its agent stays enrolled there. That agent signs nothing unless
someone presents its bearer, and the new run never reads the old home. The new
home makes a new person's key, a new room and a new agent. Keep the old home until
you seal the evidence, then delete it with the new one.

Read [the test policy](../../../docs/testing.md) before you change the script.
