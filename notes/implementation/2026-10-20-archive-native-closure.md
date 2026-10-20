# Native archive admission and dependency closure

Request `4fb21172`; builder promise `f75c6922`. Planner decision
`08e261c4` defines this prerequisite of demo archive slice 9. The worktree
starts at Main `2a77bc5fe4458d219f2eca1d25ac2ff709ff30b2`.

This work is in progress. It has no complete gate, review, landing or
offline replay acceptance yet. Decisions `3e2761e6` and `bd3ace9f` answered
the original Membership copy and root anchor findings. Decision `74a99989`
answered the native-domain finding. Decision `5a642337` now replaces the
single-anchor rule with an explicit list of admitted Register and Membership
copies taken on the caller's word. The builder adopted it as `53576fd6`.
The old single-anchor failures below remain evidence of the old contract.

The new list contains Register positions 1, 2 and 3 and Membership positions
0 and 5 in the native Grow fixture. All five journals export. Without the
Register-1 anchor, replay reports that missing fact; a wrong hash reports
`mismatch`. Complete replay now reaches Membership position 4 at Rules
entry 2: this is an observation head, not one of the exported copies.
Four target journals stop there; Destination alone replays `consistent`.
No observation anchor, private journal or copied-body proof was added.
The new finding must go back to planner under point 6 of `5a642337`.

Read-only discovery finds Room, Site, Directory@16, Rules@10 and
Destination@12 from the actual creator chain and bound Directory records.
All five use the same recorded repository. Its five births and two item
queries reserve 1,837,568 metadata bytes and 12,588,032 input-work bytes.
Four existing target cases pass, including an incorrect Rules incarnation,
the refused legacy cohort, excluded Membership history and no RPC after an
exhausted budget. This is discovery, not automatic scheduled publication.

Owning attempts retain complete physical inputs, source modes and lock
stamps, with zero installs. Discovery attempt 1 stopped on a test-only
implicit-array TypeScript error (1.073908042 wall / 4.080377 child CPU
seconds). After correction, attempt 2 passed both Scope compilers and four
target cases, then failed the old Grow single-anchor assertion
(8.888451959 / 13.190751). The new anchor-list attempt passed both compilers,
all five export checks, two domain refusals, three credential refusals,
the ordinary-producer exclusion and both anchor negatives. Its final
complete-replay assertion failed at Membership-4 (7.228675875 / 11.486929).
These are separate attempts, not one passing pipeline. Measurements use
the shared macOS arm64 host and owned dependency files; OS caches are
uncontrolled, and each input receipt records the observed load.

F1 is now commissioned as `dea67816`, promised as `33d11d65`, beside 9a.
Neither the incremental writer nor deployed demo wiring is complete.

The preserved pre-decision work is commit `61123d2b`. Its changes were
carried as `edd17d37` into a separate worktree on published P1 Main
`be63c49b03324639d3e7623a24ec7a48a3a95860`. Before execution, preparation
verified 2,612 source files, 5,499 distinct regular dependency copies and
32 contained relative links, with exact bytes and modes and zero installs.
The first preparation stopped while checking a link before its chained
target link existed. The corrected preparation verified all files again
and checked the complete link set together, in 1.862291416 wall seconds.

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

Before decision `3e2761e6`, Directory@16 export stopped at
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

The verifier proves an exact source position and hash. A caller
anchor for act 1 does not cover source 2. Planner decision `08e261c4` names
hosted Register entry 1. Request `0dcfdc62` asks planner to check the hosted
Directory's actual genesis source and clarify the sole allowed anchor.
The local probe does not read or contradict the hosted bytes. No anchor
was added or substituted, and Register export remains refused.

Decision `bd3ace9f` replaces the entry-1 instruction. The sole anchor is
the exact fact named by Directory genesis `input.source`. Planner's hosted
read identifies Register entry 2, hash
`sha256:8682b3bb6c0dc2cc04a2e1ef65bb3e518657e6d20aa490b2c09b2d6ba9c97c5d`.
Fixture references stay fixture references; the hosted hash is not inserted
into the test graph. At that stage A2 remained unreached because of the
domain refusal. The new offline result appears below. No additional
anchor or Register journal is admitted.

## Public Membership copy proposal and historical domain refusal

The proposed code list contains only two entry kinds:

| Entry kind | Exact declaration and effects |
| --- | --- |
| Genesis `establish` | `membership.ts`, `membership.acts.establish`: founder and recovery public keys, founder handle and Directory reference; effects retain those values and the role table. `invitation-key.ts` and `application-install-grants.ts` inherit this act unchanged. |
| Delivery `request/tell/application-grants` | `application-install-grants.ts`, `membership7.receives.application-grants`: `installGrantFields` from `application-install-wire.ts` plus the Rules reference. `membershipRules7` unions action names and returns the public install context and result. |

No other kind is listed. In particular, join, enrol and invitation kinds
remain refused. The list applies only to copies inside the three admitted
native consumer pins, after exact native pin/data admission. Membership@8
journals remain refused. Existing source identity, policy, owner and
inline checks still apply.

Before body selection, one native SQL query checks the kind and uses
`json_tree` to find any decoded object key named `secret`, including nested
and escaped keys. It returns scalar metadata only. Sixteen additional
full-entry JSON work equivalents are reserved before the query; existing per-pass
budgets are unchanged. Failure refuses the whole export, without skipping,
redacting or rewriting an entry.

Before the domain decision, the native witness separately scanned all three retained
copies and confirmed each was selected by the new metadata checks. It then
tried the five-journal export. Site and Room exports passed, but Directory
export refused `unsupported-custom-domain`. The bounded source-lookup
trace ends with Membership@8, then Rules@10. The copied Rules declaration
names `artroom-check-configuration-1`, `dap-application-release-2` and
`dap-application-semantics-2`, outside the current `DOMAINS` allowlist.
Destination@12 also declares `artroom-rules-extents-1`; its `judge` owner
declares `artroom-changed-set-1`. These are source findings, not newly
allowed domains. No domain policy has changed.

Constructed enrol and listed-kind secret-field whole-export assertions are
present but have not reached their required boundary. The first attempt
ran them before the positive export; all three encountered the earlier
custom-domain refusal. They now follow successful whole exports. The
offline A2 stage is also unreached. No minimum closure or replay claim is
made.

New original owning attempts use full physical source inputs and the
separate dependency copies. Shared OS caches and other host work remain
uncontrolled; there are no installs or gate runs.

| Attempt | Outcome | Wall seconds | Child CPU seconds |
| --- | --- | ---: | ---: |
| `54639`, v1 | Compatibility and source/test compilers pass; Vitest cannot open its local listener in the sandbox, `EPERM`; no case runs | 2.708933083 | 4.989966 |
| `46683`, v2 | One Grow case fails at the earlier custom-domain refusal instead of the expected credential refusal; one filter skip | 6.990134417 | 7.271817 |
| `50724`, v3 | Test compiler passes; three actual copy metadata assertions pass; Directory whole export fails at custom-domain refusal; one filter skip | 6.128335417 | 9.221428 |
| `80357`, v4 | Test compiler passes; same three actual copies pass; bounded trace identifies Rules@10 as the last lookup before the domain refusal; one filter skip | 6.111554417 | 9.414246 |

Each attempt verifies unchanged source bytes/modes and the lock stamp after
natural completion. A small bundled native-data diagnostic confirms the
domain names above. Its first bundle failed because the diagnostic named
the wrong rule-module path; the corrected bundle and run exit 0. Those
diagnostic wall and CPU times were not captured. Separate runs are not one
passing pipeline.

The follow-up increases the extra JSON reservation from six to sixteen
full-entry equivalents to cover the repeated type, byte-length and value
expressions of each scalar projection. The new domain attempts below run
with sixteen; v1–v4 above used six and remain historical.

## Native domains and the first offline cutoff

Decision `74a99989`, adopted as `453c2012`, permits five additional native
value domains at exact places. The code table includes the exact pin,
native data digest, domain, place and byte bound, with a source citation
for each row:

| Pin | Domain | Place |
| --- | --- | --- |
| Rules@10 | `artroom-check-configuration-1` | `acts.keep-configuration.fields.digest.value` |
| Rules@10 | `dap-application-release-2` | `acts.install-application.fields.release.value` |
| Rules@10 | `dap-application-semantics-2` | `acts.install-application.fields.semantic.value` |
| Destination@12 | `artroom-rules-extents-1` | `outcomes.judge.observes[0].retains[0]` |
| Destination@12 | `artroom-changed-set-1` | Native Destination `judge` owner `valueDomains` |

The whole-prefix classifier checks each custom-domain occurrence and owner
place. A domain in a TEST policy table supplies no permission. The
retained-value reader and Git selection format also understand these five
strings as a mechanical vocabulary; those mechanisms require prior
whole-prefix privacy admission. Vocabulary is not an export certificate.
The checker must review that every row is public platform configuration
readable by every repository reader, without member-private values, a
narrower audience or credentials. This is not yet an approval.

Both new attempts export all five complete fixture journals from position
zero, open their object-only archives, and compare exact journal bytes and
heads. Actual Rules@10 and Destination@12 exports pass the domain checks.
A listed domain at an unlisted Rules owner place, and an unlisted domain
under Rules@10, each refuse the whole export `unsupported-custom-domain`.
All three actual Membership copies pass. A constructed enrol without a
secret, a listed delivery with a nested secret field, and that field with
an escaped JSON key each refuse the whole export
`unsupported-credential-cohort`. No entry is skipped or rewritten.

| Original attempt | Outcome | Wall seconds | Child CPU seconds |
| --- | --- | ---: | ---: |
| `49014`, domain v1 | Compatibility, Git and Scope source/test compilers pass; exports and all five refusal variants pass; first offline Site replay reports missing Register entry 1 | 7.515348958 | 12.345082 |
| `46625`, domain v2 | Test compiler passes; same exports and negatives pass; all five offline attempts report the same first missing Register entry 1 | 6.611659125 | 9.792300 |

Each attempt has a complete physical source input and unchanged source
bytes/modes and lock stamp afterward, with zero installs. The v2 native
test phase alone is 5.921612875 wall / 7.149501 child CPU seconds. These
are shared warm host measurements, not a gate or a passing replay.

| Exported journal | Entries | Through sequence |
| --- | ---: | ---: |
| Grow Site | 4 | 3 |
| Grow Room | 6 | 5 |
| Directory@16 | 14 | 13 |
| Rules@10 | 11 | 10 |
| Destination@12 | 2 | 1 |

All five replay attempts stop at Directory genesis, position 0, with
`missing-dependency` for the same Register entry 1. The caller supplies only
the actual Directory genesis source, Register entry 2. Exact fixture scope,
incarnation, anchor hash, missing hash and per-journal reports are in
`archive-native-Register1-replay-finding-20261020.json`. Fixture references
are not the hosted references.

The selected journals directly retain seven Register copies, representing
three facts: entry 1 appears five times, entry 2 once and entry 3 once.
Directory genesis retains entries 2 and 1; Directory position 1 retains
entry 3; Directory positions 2, 3 and 4 retain entry 1; Destination genesis
retains entry 1. Copies do not themselves prove their source history.
Entry 3 and later Membership proof needs have not been reached by replay,
so this is the first cutoff, not the complete missing closure. No extra
anchor, Register self-journal, copied-body proof shortcut or trust change
has been made. Planner disposition is required before changing that
contract. Automatic closure discovery and per-scope archiver wiring remain
unfinished; the witness selects the five known fixture journals explicitly.

The exact five-field row comparison is now the pure Git policy function
`admitArchiveNativeValuePlace`; the Scope classifier calls it. The existing
one-case policy witness pairs the actual Rules release place with a wrong
place, unlisted domain, wrong pin, wrong native data digest and wrong bound.
This adds no permanent case. Original control `21847` passes the Git and
Scope source/test compilers and the fixed case, then changes only the place
comparison to `true`. That same case fails by the direct wrong-place
assertion. The original source bytes, modes and stamp are restored exactly
across all 2,615 files, with zero installs. Fixed and wrong-line phases each
have complete physical inputs.

The measured owning/control interval is 3.173885833 wall / 6.614332 child
CPU seconds. The fixed case alone is 0.778738917 / 0.896579; the wrong-place
case is 0.710982458 / 0.907668. This is one targeted control, not a mutation
sweep. The full Grow witness has not been repeated after extracting this
unchanged predicate; its earlier missing-Register result is not a passing
replay for the new head. Request `b315bb35` asks planner to dispose of that
actual first cutoff before any source-proof change.

After the control, local commit `757a790c` preserves the tested predicate
and report. An ordinary local merge of published, independently approved
K3 Main `13da4cc6` exits 0, producing `3d5e6e35` in 0.416227083 wall /
0.039165 child CPU seconds. All 12 authored archive paths retain their
exact blobs and executable modes. All nine incoming K3/report paths match
Main exactly, with no overlap. The checkout is clean before and after the
merge. Earlier 2,615-file execution inputs remain historical for their
original composition; this integration is not a new test or gate result.

The commissioned anchor negatives now run on that K3 composition. With no
anchor, object-only replay reports the actual Register creation-source
entry 2 as missing. With that position but a wrong hash, it reports
`mismatch`. The verifier changes only that failed proof's classification
when the source cannot be opened. A readable source may still be replayed
despite an unused different-hash anchor. No additional fact becomes proved
or trusted. Generic multi-anchor support is unchanged; enforcing 9a's sole
root-anchor policy remains part of the unfinished source-proof integration.

Original owning attempt `12545` passes compatibility, Replay and Scope
source/test compilers and the strengthened existing Replay case: one pass,
52 filter skips. The native Grow case passes both anchor negatives, all
five exports, both domain negatives and all three credential negatives,
then every positive replay still reports first missing Register entry 1.
The whole attempt naturally exits 1: 8.995271000 wall / 14.661288 child CPU
seconds. The pure Replay phase is 1.176905208 / 1.575685; native phase
6.324433583 / 7.464104. All 2,620 prelaunch physical source inputs, modes
and lock stamp remain exact; zero installs. This is not a passing replay
or a gate.

Original pre-change baseline `91268` substitutes the actual verifier blob
from Git at `382fd7fa`, with that same strengthened case. It fails by the
direct expected-mismatch versus actual-missing-dependency assertion:
1.149829416 wall / 1.593058 child CPU seconds. Its full 2,620-file physical
input precedes execution. Every fixed source byte, mode and the stamp are
restored exactly, and the wrapper verifies the expected failure with exit
0. This separate baseline is not combined into a passing pipeline.

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

After the root-dependency disposition, finish bounded discovery and per-scope
export to the room's recorded repository, the sole anchor rule and its
trust report, the actual clone-only replay pairs, required controls and one
ordinary gate before complete exact-head review. Slice 9 deployment still
waits for F1 and reviewed 9a. Provisioning, binding, credentials, deployment
and hosted readbacks remain with planner.
