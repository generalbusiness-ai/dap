# Create and seed repo-in-ai

This script creates the room named **repo-in-ai** for MVP slices S2 to S9.
It creates a new owner identity, two agents controlled by that owner, and a
checker. Each identity has its own private home. The script does not use a
previous room's signing key.

The source is the S1 implementation tracked by gitseq request `449c58c7`.
The adopted compatibility ruling is `2a9ec821`. J4 source landed at
`5dc9765f`. Before running this script, the planner deploys all three
Workers from that source, waits for Durable Object turnover, and records
the actual Worker version. Source landing alone does not establish a live
deployment or a completed witness.

## Prepare the inputs

Use the reviewed checkout and its locked dependencies. Read
[the test policy](../../docs/testing.md) before changing the script. Do
not install a tool into the checkout to probe it.

Copy [input.example.json](input.example.json) outside the checkout. Replace
`deploymentVersion` with the exact version in the reviewed dap-demo
deployment receipt. Check the service, Artifacts origin and full register
reference against that receipt. The template deliberately has no usable
version. The script checks `/health` before running a phase.

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

From the checkout root, run:

```sh
node examples/repo-in-ai/setup.mjs --input /absolute/path/to/s1-input.json --phase all --mode new
```

This is the one setup script. It runs creation through first-key in one
CLI invocation, within the founding window. It uses the existing register;
it does not install another register or change Worker settings.

The script prints only a phase, its status and any accepted native fact.
Invitation links, signing material, credentials and full SDK answers stay
in the private identity homes. Do not copy those files into the workroom,
a source commit, a review comment or a public evidence bundle.

The script stops when a native delivery or outside outcome is unresolved.
For an outside operation that is still pending, rerun its read phase. For
an uncertain write, first check the exact phase named by the stop:

```sh
node examples/repo-in-ai/setup.mjs --input /absolute/path/to/s1-input.json --phase manifest-stage --mode check
```

`check` signs and submits no new act or preparation. Native settlement may
use a read-only HTTP POST. If that original still needs delivery, explicitly
continue that phase:

```sh
node examples/repo-in-ai/setup.mjs --input /absolute/path/to/s1-input.json --phase manifest-stage --mode continue
```

`continue` uses the same retained envelope and deadline. It never replaces
a missing key or original. A missing original, changed scope incarnation,
or uncertain one-time credential handoff stops recovery. A consumed clone
credential is not fetched again, and a replacement token is not minted.
Keep the private custody for diagnosis; do not delete it to restart a phase.

After resolving the stopped phase, run `all` in `new` mode again. Completed
phases use their retained receipts. The script does not create another room
or identity when those receipts already exist.

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
