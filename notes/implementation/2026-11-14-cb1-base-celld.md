# CB-1: base-family preparation for celld

## What changed

CB-1 source follows request `b5f200f2`, accepted pre-code act `fd0f709e`,
rulings `4ce94d7e` and `4d03ff1d`, and source promise `9b083032`.
The original branch `builder/cb1-base-celld-20261114` starts at reviewed main
`5b342ee9c484c0c653dc1a363b852be83ef1d77b`.
The source-only composition `builder/cb1-on-combined-source-20261114`
starts at combined head `0eb5a1aaf4174b728745d331507900f759f64e00`.
It carries the single CB-1 feature commit without dependency merges or
conflict resolutions. The integration below takes the later main.

## Current source integration and attestation

Branch `builder/cb1-main-attestation-20261114` preserves source head
`efdb4c874a9664414fae7d51c5cb5cfbc9cc7280` and merges main
`336dd74e990f057834ac8b2edc92a4287315ec8c` without conflicts.
Merge `ef399092a50447e2ca6734534f06d6bce58cdc53` has tree
`30d8309bc1c7a9930b1be5d1d445d3564021f577`.
The original branch, dependency view, and development outputs remain intact.

The only test expectation change adopts the reviewed AST seal
`e13a31cfa361891571369a4b976abe053189285547b9238d2a80bfabb19fc2f0`
for `packages/platform/src/version-questions.ts`.
Ruling `4d03ff1dda006ad8ff50a29ea471001ff46218ae` approved its two Register 28
additions. The source has Git blob `912e80776291071449ddb7eea59db78e4c247612`,
identical to the source reviewed for AE-1 adoption commit
`5e8d4a63284854eabd9c86bdb9e0645f22e6e727`.
The maintained parser, `scripts/security-entry-points.mjs`, has identical
blob `0fe3f77ad139a4e4402b15ad26bc6c9473d1df83` in both lanes.
The existing whole-module selector calls `sourceSeal`, which hashes the
normalized TypeScript AST from `rolldown/parseAst`. This is not a raw-file hash.
This follow-up reuses the reviewed result without recalculating the AST,
changing the selector, or updating any other expectation.

The earlier AE-1 owner failed with actual `e13a31cf` against retained `069eaf4c`.
Its 12 cases ended with 11 passes and one failure. The output remains at
`/Users/hughpyle/play/artroom-evidence/2026-11-14-ae1-development-attempt2/security-entry-points.stdout.log`
with SHA-256 `d4f167e73793c6053324281d0cda925e8247ee6f2dba3a4218978381ebf91c29`.
That failed run supplies the adopted result. The whole security-entry-point
owner then passed all 12 cases at `20609219271fc127f76ef61d30c6a0171eeff8f0`,
tree `abb82b3b024f828ac079fff5226d5882a42df7dd`, with no skipped or cancelled
case. Its process exited 0 in 4.404171417 seconds. END `81308e427d2fd279d7fa37663527c2f4be9788e9`
records that result. This note-only follow-up preserves the checked source.
The other development results below retain their original scope. Actual
post-C2 main integration, the gate, fleet and CB-2 obligations remain open.

## LS-1 source continuation, 15 November

Branch `builder/cb1-ls1-source-20261115` preserves this branch at
`8a5880b6716dab2691a2115498125d06f347d15b` and merges actual main
`4b198d0fc980327d87347b05a3817106974bf8d7` without conflicts.
The new [LS-1 note](2026-11-15-ls1-current-smoke-reference.md) describes
its separate request `3bacbc5e` and promise `630a37a0`.
CB-1's promise remains `9b083032`. The later lifecycle ruling below moves
the fleet witness to a distinct request and preserves the Security review
and CB-2 boundary.
All results above and below retain their dated source boundaries.
The merged CB-1 and LS-1 runtime checks and gate remain UNRUN.

Lifecycle amendment `3f739d53d5f1aebf98bfd37c2afd5f6c66f37c06` closes
LS-1 at normal joint landing with CB-1: one verdict names both promises,
and the receipt closes them. No real local Worker run stands behind this
head. The LS-1 note records only the bounded binary search. After publication,
the planner checks the actual main branch's **Local Worker smoke** workflow;
a red run opens a new repair request and reopens neither promise.
Later ruling `841b79030689a4b6d3c9d8f4092905c790dbc7ce` removes the fleet
witness as a joint landing condition. The planner files its distinct
request at CB-1 landing; it waits for Hugh's machine and privileged-step
operator selection. CB-1 and LS-1 may land after a passing gate and a review
with the Security conclusion on the closed application settings. The future
gate START answer is: no CB-1 fleet obligation blocks landing after that
passing gate and Security review. This changes none of the UNRUN results.

As of 15 November 2026, no persistent fleet run stands behind the `base`
family yet.

## Base-family source changes

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

Ruling `4d03ff1d` originally split source and fleet evidence in time, when
no public Counter packet existed. Counter `0.2.0` is now signed and on main
since `863ca6b2`. This head selects no operator release. The distinct fleet
witness must use the exact approved public release and publisher; neither
a TEST packet nor Grow can substitute for it.
Hugh has selected no machine or operator, and no fleet exists for the
witness. The previously recorded Mac mini remains unavailable. This
source lane makes no fleet connection, reads no private key or credential,
runs no privileged step, and sends Hugh no prompt.

## Development checks and evidence still owed

The source supplies owning tests for the default base plan, both Register 28
version questions, retained old-family preparation, the exact paired
application settings, and refusal of another added field. Filesystem
staging tests use synthetic retained plans and public TEST trust rows.
The drafted cases cover helper boundaries, not an installed room or object
store.

| Check | Current state | Gate evidence |
|---|---|---|
| Changed version-question and smoke tests | DEV passed: 328 Vitest cases and 5 Node cases | Owed |
| Mac preparation and deployment-boundary tests | DEV passed: 6 project-preparation, 9 GitHub-preparation, and 12 Python cases | Owed |
| Platform compilers and helper syntax | DEV passed: both platform contexts and four production MJS syntax checks | Owed |
| Whole security-entry-point owner at `20609219` | 12 passed; exit 0; process wall 4.404171417 s | DEV only; raw `2026-11-14-cb1-attestation-development-attempt1/stdout.log`; SHA-256 `6aa8b99c86f2aa241fe307c043ca0d5a31cccea19bd3f4267b5c2527c9a56de4` |
| Documentation checks | UNRUN | Owed |
| Gate before source review | UNRUN | Owed |
| Persistent-fleet Counter witness | Moved to a distinct request by `841b7903` | Planner files it at CB-1 landing; Hugh's machine/operator choice remains owed; this head selects no release |

The security-owner path above resolves under
`/Users/hughpyle/play/artroom-evidence/`. Its `command.json` and `result.json`
retain the actual command, source worktree, UTC interval, exit, process wall,
and stream hashes. The command was
`/opt/homebrew/bin/node --test scripts/security-entry-points.test.mjs`.
Its stderr stream was empty. No AST calculation, control, compiler, build,
gate, deployment or fleet action accompanied that run.

The first Python run completed 12 tests with one failed subtest: the
negative hostname table expected the production parser to refuse `xn--`.
One bounded probe through `application-settings.mjs --check-trust`
accepted the exact public TEST row. The production grammar checks a
canonical URL spelling; it does not add a DNS-label validity rule.
The fixture now includes that row in positive acceptance and byte-preservation
coverage. Its specimen indices identify rows even when diagnostic text
truncates. No production parser changed.

The whole Python owner then passed once, followed by the compatibility
prerequisite and the whole version-question owner. Compatibility left its
already patched bundle unchanged. The successful compilers, syntax checks
and 20 Node cases did not rerun. These are ordinary development results,
not gate evidence. The original failed output and separate successful
outputs remain in scratch. No control, build, deployment or fleet check
ran. Source review must assess the Security boundary and state the distinct
fleet witness's remaining scope.

## Open limits

Ruling `841b7903` replaces the earlier condition that kept CB-1 open until
the fleet witness. The distinct request needs an approved public Counter
release and Hugh's actual machine and privileged-step operator selection.
It uses normal helpers and CLI to prepare and deploy the base plan, finish
installation, create a room,
join a member, and record an active Counter installation with a verified
application journal. A fleet restart must load the stored package bytes
again. The witness also checks declared-prefix reservation and the two
`no-repository` refusals.

The retained old-family preparation check belongs to the source tests.
CB-2 owns the archive-provider design and the later room-to-repository
archive scene. The fleet witness and CB-2 remain distinct from joint source
landing. The planner's post-publication Local Worker smoke check stays as
defined above.
