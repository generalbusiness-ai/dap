# Native archive admission and dependency closure

Request `4fb21172`; builder promise `f75c6922`. Planner decision
`08e261c4` defines this prerequisite of demo archive slice 9. The worktree
starts at Main `2a77bc5fe4458d219f2eca1d25ac2ff709ff30b2`.

This work is in progress. It has no complete gate, review, landing or
offline replay acceptance yet. Two findings need planner decisions:
`3c5f3a9b` on retained Membership@8 copies and `0dcfdc62` on the exact root
register anchor. Source registration or a passing policy case does not
satisfy the commissioned closure witness.

## Admission implemented so far

The export pin policy admits these three native pins only when the caller
also supplies the matching digest of the installed `VERSION_DATA` data.
The digest uses the existing definition domain tag and canonical bytes.

| Pin | Data digest |
| --- | --- |
| `platform:directory@16` | `sha256:c8c40477f369a19213439eaa1a3263dad1ce16038e5df605b6f7322737380b55` |
| `platform:rules@10` | `sha256:e10d8861dd5a80168437187a84d5bb3efe70d73825faa0c61ecc368da359a854` |
| `platform:destination@12` | `sha256:f29353b2ca1f551ab6a7d622bbd57aa6dfc7fc3748358ce709ccee728e4c15df` |

The native prefix reader reserves work before reading the native code data
and deriving that digest. Caller input and a TEST owner table cannot add a
native pin. An absent or wrong digest refuses before privacy inventory.
Directory@14 and Register@17 still refuse `unsupported-archive-cohort`.
Membership@8 still refuses `unsupported-credential-cohort`. Existing
Membership@6 and certified declaration behavior is unchanged. The whole
privacy inventory remains required after pin admission.

The existing policy witness now pairs exact admission with absent and
wrong data, the excluded native pins and the unchanged privacy refusal.
One targeted control changes the data comparison to `true`: the fixed case
passes, the changed case fails by assertion, and every tracked source byte
and executable mode and the dependency lock stamp are restored exactly.
This is one control, with no mutation sweep or whole-suite rerun.

## Retained membership copies

The actual native Grow fixture installs in
`ARCHIVE_DEVICE_APPLICATION_COHORT`, creates its Site and Room, performs a
device command and binds the archive later. Native creation, SQLite and
issued session reads run on the test host. Package content, device owner
answers, scheduler and policy coverage remain explicit TEST fixtures.

After the new exact pin admission, Directory@16 export stops at
`unsupported-credential-cohort`. The recorded five-journal candidate has
three direct Membership@8 retained copies in three consumer entries:

| Consumer | Position | Copied Membership position |
| --- | ---: | ---: |
| Directory delivery | 2 | 0 |
| Directory delivery | 9 | 5 |
| Rules delivery | 7 | 5 |

These are two distinct Membership facts. Site, Room and Destination have
no such direct copies in this witness. Exact full references, hashes,
content digests and counts are in the finding receipt. No Membership
journal or body was exported. A2 over the five archived journals was not
reached, so this does not establish minimum replay cutoffs or all later
dependencies.

The separate nondevice fixture was temporarily moved from its original
cohort to the device cohort. It failed installation before archive
planning, first for shape and then for refusal after supplying an owner.
It does not witness native closure. Its original cohort, conditional owner
and issued-session source reads have since been restored. That fixture's
two-journal archive assertions pass independently; the Grow closure remains
unresolved.

## Exact root anchor

An independent probe ran the existing native `installGraph` with the
device/archive cohort. Its actual rules and judges run in memory; child
lifecycle and authority are scripted. Register act 1 creates no Directory.
Register outcome 2, `create-repository`, sends the Directory creation, and
Directory genesis names that outcome as its source.

The current verifier proves an exact source position and hash. A caller
anchor for act 1 does not cover source 2. Planner decision `08e261c4` names
hosted Register entry 1. Request `0dcfdc62` asks planner to check the hosted
Directory's actual genesis source and clarify the sole allowed anchor.
The local probe does not read or contradict the hosted bytes. No anchor
was added or substituted, and Register export remains refused.

The current diagnostic test collects the Directory genesis source as a
candidate anchor. Its A2 stage remains unreached because of the credential
refusal; it is not acceptance of the decision's entry-1 anchor.

## Original checks

The dependency preparation verified 2,589 Git source blobs, 5,499 newly
copied regular dependency files, 31 contained relative links and the exact
lock stamp. Regular files have distinct inodes and matching bytes and
modes; originals stayed stable. There were zero installs.

The checks below used shared warm macOS 27.0.1 arm64, Node 26.12 and copied
dependencies. OS caches and other host work were uncontrolled. Each
owning attempt preserves a full 2,589-file physical input snapshot.

| Original process | Outcome | Wall seconds | Child CPU seconds |
| --- | --- | ---: | ---: |
| `81569`, owning v1 | Git source/test compilers pass; Scope compiler fails on native data versus declared definition type; no tests run | 1.084522708 | 2.192731 |
| `99730`, owning v2 | Corrected Scope source/test compilers and policy case pass; two native cases fail at the distinct boundaries above | 8.902350458 | 11.716500 |
| `55078`, owning v3 | Test compiler passes; two instrumented native cases fail, retaining exact membership-copy references and counts | 6.097490250 | 9.103194 |
| `47566`, owning v4 | Test compiler and the restored nondevice fixture pass; the unchanged Grow case is filtered out | 4.495141250 | 7.417313 |
| `94297`, targeted control fixed case | One policy case passes | 0.715950000 | 0.895649 |
| `94297`, targeted control wrong line | Same case fails by the required assertion; exact restoration succeeds | 0.692699959 | 0.881959 |

The v3 native test phase alone is 5.457189833 wall / 6.614762 child CPU
seconds. The v4 native phase is 3.841410958 wall / 4.899606 child CPU seconds,
with one pass and one filter skip. These separate attempts are not one
passing pipeline or a gate.
The control's load was recorded after execution, at 1.2783/1.3379/1.5552;
it is not an initial-load measurement.

A direct Node data probe first failed on the existing pre-P1 unsupported
TypeScript parameter-property syntax. A separate newly bundled esbuild
probe read the three actual native data digests successfully. No unrelated
source repair was made. The independent root-source probe also bundled
and ran successfully; child CPU was not captured for those probes.

## Closed evidence and remaining work

The membership finding grant is
`/private/tmp/artroom-archive-native-membership-finding-evidence-map-20261020.json`:
2,069,472 bytes, SHA-256
`e22d12821ff88557d23e84c10eb742f822d9e953c6c3acc82c913511061df85e`.
Its 7,788 regular leaves total 270,683,199 bytes. Original sealer `43539`
closed naturally with exit 0 and rechecked every row.

The root-source supplement is
`/private/tmp/artroom-archive-native-root-source-closed-grant-20261020.json`:
991 bytes, SHA-256
`da78405a8a42ca776fc192fd3aec5619a7c72b4d34f044b1315803e69af53720`.
Its three regular leaves total 1,332,228 bytes. The original inline sealing
command exited 0 and verified every row; no separate helper was captured.

All mapped original snapshots, helpers, probes, logs and metadata remain
frozen forever. They permit reading or stable copying of explicit regular
rows only. Execution requires physically distinct copies with exact
bytes, hashes and modes, stable originals and all original aliases and
matching historical inputs retargeted first. Nested maps and path prefixes
grant no adjacent or transitive rights. The current worktree and its
dependencies are excluded from both grants and remain mutable.

After the two decisions, finish bounded dependency discovery and per-scope
export to the room's recorded repository, the sole anchor rule and its
trust report, the actual clone-only replay pairs, required controls and one
ordinary gate before complete exact-head review. Slice 9 deployment still
waits for F1 and reviewed 9a. Provisioning, binding, credentials, deployment
and hosted readbacks remain with planner.
