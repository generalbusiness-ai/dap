# Create and seed repo-in-ai

This script creates the room for MVP slices S2 to S9, labeled **repo-in-ai**
in the input. It creates a new owner identity, two agents controlled by that
owner, and a checker. Each identity has its own private home. The script does
not use a previous room's signing key.

The home directory binds a run to its room. `name` is a local label: the
service does not hold it, and the repository's name comes from the mint reply.
A run with a new home creates another room. The owner's private `s1-room-refs`
holds the room's references, and S2 to S9 take them from that run.

The source is the S1 implementation tracked by gitseq request `449c58c7`.
The adopted compatibility ruling is `2a9ec821`. Run this script against a
Worker at `112eff12` or later, because earlier Workers cannot resolve a
real room's repository lineage and every head operation ends unknown. Before
running this script, the planner records the actual Worker version. Source
landing alone does not establish a live deployment or a completed witness.

## Prepare the inputs

Use a clean checkout at the reviewed commit, with its locked dependencies.
Keep that checkout unchanged until `verify-seed` exits. `build-seed` reads
`task-list/` from the working tree, and `verify-seed` compares the clone with
the retained candidate. So an uncommitted edit made before `build-seed` still
ends with every phase at exit 0. Read
[the test policy](../../docs/testing.md) before changing the script. Do
not install a tool into the checkout to probe it.

Copy [input.example.json](input.example.json) outside the checkout. Replace
`deploymentVersion` with the exact version in the reviewed dap-demo
deployment receipt. Fill both `register.scope` and `register.genesis`
from that receipt or its verified creation offer. Check the service and
Artifacts origin against the same receipt. The template has no usable
version or register reference. The script checks `/health` before each
phase.

Check `providerOrigin` against the receipt before the first phase. A wrong
origin shows only after the workspace's one-time credential is spent, and
that stop is permanent.

Deploy no Worker between the first phase and the last. Every invocation,
including `check`, requires `deploymentVersion` to equal the live version.
The owner's home retains the input, and a changed input stops with
"different setup plan". So a deployment in that window leaves no `check` or
`continue` path for the run.

Use these identity homes for the real room:

| Identity | Home below `~/.config/generalbusiness/repo-in-ai` |
|---|---|
| Owner | `owner` |
| First coding agent | `agent-a` |
| Second coding agent | `agent-b` |
| Checker | `checker` |

Keep the explicit `@` in each handle. Handles are unique within the room.
The owner is a new person with role `admin`. The coding agents have kind
and role `agent`, with the owner's exact membership reference as
controller. The checker has kind and role `checker`, with no controller;
it uses the separate `artroom-checker-key:` invitation format.

First rehearse with a scratch copy of the input. Change both `name` and
`home`, for example to `repo-in-ai-s1-scratch-20261030` and a sibling home
with that name. Keep the namespace `dap-demo`. Never reuse a scratch
identity home for the real room.

## Run the setup

Run one command per phase, in the order of `setupPhases` in
[setup.ts](setup.ts). The script has 42 phases, from `owner` to `released`.
This is the route the third scratch room closed. From the checkout root, run
the first phase:

```sh
node examples/repo-in-ai/setup.mjs --input /absolute/path/to/s1-input.json --phase owner --mode new --diagnostics /absolute/public/NEW-owner-diagnostics
```

Then run each later phase the same way, with its name and a new diagnostics
directory. `--phase all --mode new` runs every phase in one command. No `all`
run has closed. The script uses the existing register. It does not install
another register or change Worker settings.

The script prints only a phase, its status and any accepted native fact.
Invitation links, signing material, credentials and full SDK answers stay
in the private identity homes. Do not copy those files into the workroom,
a source commit, a review comment or a public evidence bundle.

Every invocation requires a new absolute diagnostics directory outside the
private homes. Its parent must already exist, and the script refuses a path
that holds `.config`. The script creates the directory exclusively with
owner-only modes.
It flushes and reads back the helper's exit status and exact safe stderr
line before exit. Enrollment metadata records only a fixed stage, coded
cause, inbox recheck count, read method/category and HTTP status when known.
It records no
response body, header, key, link, signed original, stack or arbitrary
exception message. The outer command receipt still owns actual process
status and loader stderr. Preserve a partial diagnostics unit on I/O
failure; never reuse it or write into sealed evidence.

The script stops when a native delivery or outside outcome is unresolved.
For an outside operation that is still pending, rerun its read phase. For
an uncertain write, first check the exact phase named by the stop. A stop
under `all` prints "Use check" and names the phase. The script refuses
`--phase all --mode check`, so pass that phase's name:

```sh
node examples/repo-in-ai/setup.mjs --input /absolute/path/to/s1-input.json --phase manifest-stage --mode check --diagnostics /absolute/public/NEW-check-diagnostics
```

`check` signs and submits no new act or preparation. Native settlement may
use a read-only HTTP POST. If that original still needs delivery, explicitly
continue that phase:

```sh
node examples/repo-in-ai/setup.mjs --input /absolute/path/to/s1-input.json --phase manifest-stage --mode continue --diagnostics /absolute/public/NEW-continue-diagnostics
```

`stage-ready` and `published` read outcomes that arrive after the act before
them, so a first read can find an outcome still pending. In `new` or
`continue` mode, each of these phases rechecks a pending read up to 15 times,
2 seconds apart. The bound is 30 seconds of pauses, plus the time of the 16
reads. A recheck signs and submits no act. It uses the existing read session,
or opens one if that session has ended. `check` reads once and does not wait.
A failed read stops the phase at once.

If the read is still pending after the last recheck, the phase stops with
exit 1. Run `check` on that phase, which completes the phase once the read
settles. Then run the next phase in `new` mode.
If `check` still reports the outcome as not ready after a few minutes, read the
lane's stage outcome, because the room may have refused the stage.

A new member's inbox stays provisional until its creator's confirmation
arrives, and the invitation engine accepts only an active inbox. In `new` and
`continue` modes the engine waits for that inbox. It reads the inbox one second
apart for at most 20 seconds, and it also waits through `not-found` and
`forbidden`, which a read answers before the inbox is created. `check` reads
once and does not wait.

The wait signs and submits no act. It uses the existing read session, and it
signs a read-session request only when that session has 30 seconds left or
fails a read check.

If the inbox is not active at the end of the wait, the enrollment stops at stage
`invitation-result`. Any other failed inbox read stops there at once. Its `cause`
is one of these fixed words:

| Cause | Condition |
|---|---|
| `inbox-not-confirmed` | The inbox reads answered 200, and the engine refused the inbox. |
| `inbox-not-readable` | An inbox read was refused. `read` holds the last status. |
| `opening-unresolved` | The member opening has no verified receipt. |
| `invitation-act-unresolved` | The invitation act has no verified receipt. |
| `invitation-unverified` | The membership summary does not show the invitation. |
| `directory-unverified` | The Directory does not show this room's repository. |
| `binding-unverified` | The member, role or controller does not match. |
| `successor-pending` | A retained successor waits for an explicit `continue`. |
| `unknown` | The engine gave a reason that this script does not list. |

To recover, run `check` on the phase. If the invitation now verifies, `check`
retains the handoff and stops at stage `receiver`, because `check` never starts
a receiver. Then run `continue`, which completes the enrollment from the
retained handoff.

`continue` uses the same retained envelope and deadline. It never replaces
a missing key or original. A missing original, changed scope incarnation,
or uncertain one-time credential handoff stops recovery. A consumed clone
credential is not fetched again, and a replacement token is not minted.
Keep the private custody for diagnosis; do not delete it to restart a phase.

Ruling `ee25224c` permits one narrower identity startup case. If the same
identity plan survived before any issuance root existed, explicit Continue
may create that first root through the maintained CLI engine. The helper
checks the exact global plan, identity-plan digest, operation, home, actor
and inputs; empty receiver custody; no owner invitation pointer; and no
orphan or conflicting issuance file. It recognizes old issuance files only
through completed fixed receivers' exact handoffs and hash-checked chains.
It samples at most 512 directory leaves and three chains of at most
16 files each, with 64 KiB decoded per private original, the corresponding
base64url file bound, and 4 MiB of unique encoded metadata per invocation.
The first-root row must match the same actor, inputs and repository before
any pointer or private original is published. These local samples are
not an atomic filesystem snapshot or native authority. Any uncertainty
stops. Check stays read-only and reports the missing original; it never
enters this first-root branch. Existing signatures, keys, secrets and
deadlines never change.

After resolving the stopped phase, run the next phase in `new` mode. A
completed phase uses its retained receipt, so running one again creates no
other room or identity.

## What the script witnesses

The setup activates the explicit `issueJ4` and `changeJ4` definitions. It
does not change the service defaults. It uses the maintained SDK
preparation, stage/check and manifest path on Destination12. It makes no
claim that `dap propose` supports that path; S6 owns that work.

The rules state one owner approval and `ownerMayReview: true`. No required
check runner is claimed. The maintained minimum authority extent remains
in the rules. Before replacing any role list, the script retains all five
original lists. Each replacement is their union with the required actions;
the after-read must preserve every original action. Automated roles must
not hold person-only review or merge actions. No application package is
created in S1; S8 owns packaging.

One agent authors the seed Change. It takes a native hold and writes only
to its selected workspace fork. Its instance uses the Change's scope as
the task reference, as the J4 witness does; this is not a claim that a
separate Task was created. The exact staged intent is the one submitted.
The other agent's review must be refused with `unauthorized`. The owner's
review of that same manifest must be accepted before merge.

The seed contains the six files under [task-list](task-list/index.html),
published as `task-list/*`. The generated founding `README.md` stays at
the repository root. After publication, a new retained read-token request
drives the maintained clone proof and one-time credential flow. The
comparison reads every committed Git blob and checks the whole path set,
file modes and bytes, including the founding README. A digest alone or
the working directory's contents do not satisfy this witness. A fresh clone
is the available update operation; there is no separate fetch-token act.

The final phases release the seed hold and observe confirmed native token
revocation. They do not claim deletion of the selected fork, pinned root,
private files or provider data. The room and its published seed remain for
S2 to S9.

The seed app starts empty. It supports adding tasks, toggling completion,
and local browser persistence. It intentionally leaves the later “Clear
completed” product decision for the MVP scenario.

## Close the witness

The witness closes only when every phase in `setupPhases` has exited 0 or has
completed by the `continue` route above. A final phase does not show this.
`released` needs only `release`, and `release` needs only `hold`. `verify-seed`,
`clone-verify`, `members`, `roles-after` and `rules` are prerequisites of no
final phase. A single-phase run does not enforce their order.

Read these receipts before you call the witness closed:

- Each command's `receipt.json` in its diagnostics directory, for the phase,
  the mode and the exit code. A phase with exit 1 needs a later `continue`
  with exit 0.
- The owner's private `s1-done-<phase>` receipt, one for each of the 42 phases.
- The owner's private `s1-seed-comparison`, for `matches` true at the published
  commit.

## Record the result

Keep the exact source commit and tree, gate result, reviewed input hash,
deployment receipt and the public phase transcript. Project only the
native references and witness outcomes from private custody. In the S1
implementation note, record the scratch room's directory, membership,
rules and destination references, the four membership kinds and roles,
the review refusal and acceptance, all five before/after role lists,
publication commit and tree, and the full blob-comparison outcome.

Local tests, a scratch run and the real-room run are separate evidence.
The checker approves the exact source head after its gate and scratch
witness. The planner then uses this same script to create the real room.
An unfinished phase is reported as unfinished.
