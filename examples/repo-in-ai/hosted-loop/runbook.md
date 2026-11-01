# Run the work-on loop as a hosted agent

This script runs one hosted agent through the work-on loop in a scratch room.
The agent accepts naming terms, asks a question, requests approval and blocks
its work. A person decides from a separate session. The agent then accepts the
new terms, releases the block and proposes one file.

Each phase is one command and one process. Each agent phase opens a new MCP
session on the Worker's `/mcp`. The script is the agent, so no model reads the
work-on prompt. `agent-tools` fetches the prompt and prints its digest.

The script creates a new room. It never touches the real repo-in-ai room.

## Prepare the Worker

The hosted endpoint is closed unless the deployment sets `MCP_ENABLED` to the
exact string `true`. The planner owns that deployment.

1. Set `MCP_ENABLED` to `true` on the target Worker, in a reviewed deployment.
2. Leave `MCP_TOOL_ADDITIONS` unset. Any addition makes the list differ from the
   hosted default, and every agent phase stops at `tool-list-differs`.
3. Record the Worker version from the deployment receipt.

Deploy no Worker between the first phase and the last. Every command compares
the input's version with the live version, and a new version stops the run at
`target-version`. A stopped run has no way forward on a new version. Start
again with a new home, which makes a new room.

The run needs no provider credential and no hold. `change.propose-file` carries
the file in the signed intent, so the agent pushes nothing to a workspace.

## Prepare the input

Copy [input.example.json](input.example.json) outside the checkout, and replace
these fields:

| Field | Value |
| --- | --- |
| `deploymentVersion` | The exact version in the deployment receipt. |
| `deployment` | The deployment name in the same receipt. |
| `home` | A new absolute path. No part of the path is `repo-in-ai`. |
| `name` | A label that starts with `hosted-loop-`. |

Check `service` and the full `register` reference against the receipt. A
register with the `open` policy lets the new person's key claim a room. The
example's version is a placeholder, so the example stops at `input`.

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
| `agent-verify` | Agent | Reads both lanes back, and checks their order and their signers. | None |

Start `agent-wait` before `approve`, and leave it running. It waits up to 30
minutes. If it stops or dies, start it again. A new session waits on the same
question, and no state is lost.

## Read the public result

A phase prints one JSON line on stdout and nothing else. The line holds fixed
words, references (scope IDs, seqs and digests) and small numbers. An accepted
phase holds the fact that the scope recorded for its act. Every agent phase
holds `tools`, the digest of its list, and `session`, the digest of its session
ID. Keep these lines as the run's evidence.

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

This table lists the common stops:

| Stop | Meaning | Next step |
| --- | --- | --- |
| `target-unavailable` | The Worker did not answer, or its first `/health` after idle reports that it is not ready. | Run the phase again. |
| `endpoint-closed` | `/mcp` answers 404. | Ask the planner to open the endpoint. |
| `target-version` | The Worker's deployment or version differs from the input. | Start again with a new home. |
| `tool-list-differs` | The session's list is not the hosted default. | Stop the run, and read the Worker's settings. |
| `unsourced-fact` | A phase's argument came from no reply of its session. | Report a script defect. |
| `bypass-read` | The client tried an address other than `/mcp`. | Report a script defect. |
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
  An HTTPS input refuses that field.
- A local register has no public creation offer, so the key that planned the
  register creates the room. A live run makes a new key, and that key claims the
  room through the Worker's offer.

## Know what the script leaves behind

The scratch room, its agent and its bearer stay in place after the run. The
script deletes nothing on the Worker. The proposal stays open, and no phase
merges it.

Read [the test policy](../../../docs/testing.md) before you change the script.
