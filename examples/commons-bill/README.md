# Witness the bill table in a provisioned Commons room

This operator example implements the text-domain W1 boundary adopted by
request `41f77a01` and ruling `d0523c9f`. It supplies synthetic documents
and a finite note sequence. It creates no room, identity, package, server
or repository. A prepared script is not an executed hosted witness.

The three source documents are UTF-8 text, carried by three signed notes
with media type `text/plain`. Their actual `textDigest` values identify
the retained text. This proves no `artroom-file-1` retention, file upload,
Capture provenance or PDF interpretation.

## Provision the room separately

The planner must first deploy the reviewed source and provision an exact
Commons cohort room: Register23, Directory22, Membership9, Rules14,
Destination16, Inbox1 and Commons1. Ruling `33f95e72` adds Rules14.
Provision an actual person member and an active agent member whose
controller is that person. The person may be the founding admin member.
Do not substitute a person whose role happens to be agent.

Use the maintained CLI's selected install plan, retained claim and
agent-key invitation/enrollment paths. Keep each original private request
and inspect its actual outcome before continuing. This example consumes
the resulting existing homes and never implements a second setup engine.

The current hosted Register17 cannot create Directory22. Deployment of
code alone does not change that Register's sends. The new root must match
the Worker's exact configured `REGISTER_SCOPE`. If `ARTIFACTS_CONFIG`
remains present, its `registerScope` must agree, even for this host-none
room. A mismatched pair refuses as misconfigured. Child creation also
checks the actual creator chain back to that configured root.
The planner owns the provisioning disposition in question `20941961`.
This example changes no deployed setting and enables no open-creation
escape. Existing rooms keep their historical pins.

## Review the public input

The input has exactly these members:

- `v`: 1.
- `service`: the exact HTTPS origin.
- `source`: the reviewed `head` and `tree`, each a full Git SHA1.
- `deployment`: the expected `name` (`dap-commons`) and Worker `version`.
- `room`: the full references named `register`, `directory`, `membership`,
  `rules`, `destination` and `commons`. Each includes scope, kind and
  incarnation.
- `member` and `agent`: each actor's public `key` and `handle`.
- `fixture`: `witnessDescription.fixture` from this exact reviewed source.

The source association comes from the operator's pinned input and outer
source-qualified capture. A matching health version is not independent
proof of deployed Git source. No private key, invitation, session, signed
request body or credential belongs in this public input or public result.

Every invocation checks the actual health, exact room pins and genesis
parents, Directory sibling references, active member/key rows, the agent's
native kind, role and controller, and each actor's Commons read access.
An unavailable or refused read stops. A local assertion creates no native
authority.

## Run one fixed step

Run the source with the repository's locked TypeScript loader. Supply
explicit existing homes, a reviewed public input and a new result path
inside an existing owner-only public directory:

```sh
node --import ./node_modules/tsx/dist/loader.mjs \
  examples/commons-bill/run.mjs \
  --input /absolute/public/input.json \
  --member-home /absolute/private/member \
  --agent-home /absolute/private/agent \
  --step preflight --mode check \
  --out /absolute/public/results/preflight.json
```

Use `witnessDescription.steps` in its fixed order. It lists three carriers,
fourteen rows, one list, four person marks and one agent question note:
23 notes in total. Each invocation writes at most its one named note.
Every preceding note must have an accepted private original, a matching
actual receipt entry and exact retained-body readback. Later references
come only from those full accepted facts, never guessed sequence numbers.

The row table uses JSON object notes. The list is a JSON array, so it does
not become a fifteenth table row. Marks remain the person's prose. The
question note cites the retained question and the four marked rows.

For the synthetic LF documents, header occupies line zero. Row N cites
`line=N,N+1`. RFC 5147 sections 2.1.1, 2.1.2 and 2.2.4 define zero-based
positions between lines: `line=0,1` selects the first line with its ending;
`line=N` alone selects no lines. These are text fragments, not PDF pages.
See the [primary RFC](https://www.rfc-editor.org/rfc/rfc5147.html).

## Keep the original when an answer is uncertain

`new` refuses any existing identity. It calls the maintained MCP generic
act with the raw text body. MCP hashes the detached field, signs once and
keeps the exact envelope and beside text in its real file store before
dispatch. A narrow adapter reads the written record back and flushes the
live file and parent before every dispatch, including explicit Continue.
The raw maintained store alone does not promise that flush, and this
example claims no hardware power-loss result.

`check` only settles the retained original. It calls no act and prepares
no replacement. An explicit `continue` first settles, then may resend the
same original through maintained custody if it remains unresolved. It
never changes that original's key, deadline, bytes, actor or incarnation.
Refused, mismatched and archived outcomes stop. Unknown stays unknown.
The next step cannot pass while a previous note lacks verified acceptance.
Never run a batch that ignores these individual results.

After the final note, run `--step verify --mode check` with another fresh
public result path. This checks the complete 23-note reading, every actual
signer and author, all retained bodies, and each bill document's citation
graph, including marks and question references through row facts.
It does not prove browser rendering. The hosted table and both document
views need a separate retained browser observation under the same room.

## Bounds and evidence limits

Each invocation admits at most 128 same-origin requests with a logical
120-second abort deadline. Maintained HTTP readers retain their own
per-response byte/time bounds; health reads stop at 64 KiB. The driver
starts no watchers or child processes. Abort is no physical network-drain
proof. The separately reviewed outer capture owns finite process closure.

The Node owner uses the actual MCP engine, file store, shaping and flush
adapter against the maintained scripted HTTP stand-in. It distinguishes
pre-wire flush failure and a lost accepted reply. It proves no native
judgment, Membership authority, hosted room or browser result.

Root registers this example's standalone TypeScript configuration and
`test/witness.test.mjs` in the maintained checks. The example has no package
and no Vitest project. Neither compiling it nor running its local owner
grants permission for any hosted operation.
