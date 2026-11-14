# CB-1: base-family preparation for celld

## What changed

CB-1 source follows request `b5f200f2`, accepted pre-code act `fd0f709e`,
rulings `4ce94d7e` and `4d03ff1d`, and source promise `9b083032`.
Branch `builder/cb1-base-celld-20261114` starts at reviewed main
`5b342ee9c484c0c653dc1a363b852be83ef1d77b`.
This checkpoint contains source and unexecuted owning tests. Validation
evidence remains owed.

The normal celld smoke plan now uses the CLI's `base` default.
`celldPreparedNoHostRegister` admits Register 28 beside retained Registers
21 and 25. `celldSmokeOwnedPlanRegister` admits Register 28 beside retained
Register 21. Preparation still consumes an existing retained plan offline.
It does not replace an uncertain plan or change its recorded pins.

Mac preparation adds an optional `--application-trust-file` input.
Its nonsecret JSON names the exact release, publisher and canonical Git
host that the operator trusts. A project with that input stages exactly
one `APPLICATION_CONTENT` R2 binding and the `APPLICATION_TRUST` variable.
GitHub staging preserves and checks the pair before reading its private
key. Deployment validates the same pair before it can deploy a project.
The maintained template stays unchanged, so existing projects may still
omit both settings.

The guides describe `base`, retained plans, persistent package storage,
and the separate archive-provider limit. They no longer claim that celld
must use an older family or lacks the base-family features.

## Decisions and why

The staging change is the Security scope of CB-1. The only additional
non-variable field is `r2_buckets`, with exactly this single row:

```json
[{"binding":"APPLICATION_CONTENT","bucket_name":"application-content"}]
```

The only additional variable is `APPLICATION_TRUST`. It is a string of at
most 64 KiB of UTF-8 JSON, containing at most 128 exact
`release`, `publisher`, and `host` rows. Releases are unique canonical
SHA-256 digests. Publishers and hosts use the production canonical forms.
An empty array trusts no release. A partial binding/trust pair, another
bucket, an extra row field, malformed trust or an unrelated added setting
refuses the project. Existing Worker, variable, GitHub and installed-root
checks retain their scope.

Both JavaScript helpers use the production trust parser. The Python
deployment guard first checks the closed project shape, then gives only
the bounded nonsecret trust string to the same parser through a local
Node helper's stdin. The helper has no network or private-key input and
prints no trust data. A missing Node/parser, timeout or rejected input
refuses deployment. This uses the guide's existing Node and locked
dependencies; it installs no tool. Legacy projects start no helper.
GitHub staging also rejects duplicate project keys before it reads a key,
so staging cannot normalize away ambiguous trust settings.

These settings do not grant membership, produce a packet, change package
admission, or add a host port. The existing `ApplicationContentStore`,
signature checks and exact release trust still decide installation.
celld maps `application-content` objects to `r2/application-content/` in
its fleet object-store bucket. Without a fleet bucket, R2 methods fail.
`celld dev` therefore supplies no package-installation witness.

Ruling `4ce94d7e` moves archive-provider work and the later archive scene
to CB-2. A CB-1 room has no repository. Its Directory reserves declared
prefixes, but publication and `bind-archive` refuse `no-repository`.
A repository binding alone would supply no celld archive provider.
CB-1 introduces no GitHub archive mint or replacement provider.

Ruling `4d03ff1d` splits source and fleet evidence in time. No public
Counter packet exists yet. The later witness must install the exact
planner-signed release and publisher that CUT-R records in R2 after
publication. Neither a TEST packet nor Grow can substitute for it.
Hugh has selected no machine or operator, and no fleet exists for the
witness. The previously recorded Mac mini remains unavailable. This
source lane makes no fleet connection, reads no private key or credential,
runs no privileged step, and sends Hugh no prompt.

## Evidence still owed

The source drafts owning tests for the default base plan, both Register 28
version questions, retained old-family preparation, the exact paired
application settings, and refusal of another added field. Filesystem
staging tests use synthetic retained plans and public TEST trust rows.
The drafted cases cover helper boundaries, not an installed room or object
store.

| Check | State | Evidence |
|---|---|---|
| Changed version-question and smoke tests | Drafted, unexecuted | No run claimed |
| Mac preparation and deployment-boundary tests | Drafted, unexecuted | No run claimed |
| Compiler and documentation checks | Owed after root grants a slot | No run claimed |
| Gate before source review | Owed after root grants a slot | No run claimed |
| Persistent-fleet Counter witness | Deferred by `4d03ff1d` | No machine or public release selected yet |

No test, compiler, build, install, deployment or fleet check ran for this
source checkpoint. The source review must assess the Security boundary
and state that the fleet witness remains owed.

## Open limits

CB-1 stays open until its later fleet witness runs. That witness needs
the public Counter release recorded by CUT-R R2 and Hugh's actual machine
and privileged-step operator selection. It uses normal helpers and CLI
to prepare and deploy the base plan, finish installation, create a room,
join a member, and record an active Counter installation with a verified
application journal. A fleet restart must load the stored package bytes
again. The witness also checks declared-prefix reservation and the two
`no-repository` refusals.

The retained old-family preparation check belongs to the source tests.
CB-2 owns the archive-provider design and the later room-to-repository
archive scene. Source approval does not close either deferred witness.
