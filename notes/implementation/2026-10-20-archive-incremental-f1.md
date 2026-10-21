# Incremental archive passes

Request `dea67816`; builder promise `33d11d65`. The source is the landed
floor design at Main `d92cd85e`, section 2 and witnesses 1 to 4. This work
starts from that Main in an isolated checkout. It contains no 9a admission
changes and no floor entry or deployment configuration.

This is work in progress. There is no full gate, review, landing or complete
F1 acceptance. Test-host confirmation and replay below use explicit TEST
host, policy and authority.

## Implemented boundary

The new v2 paths include three groups of three digits and a twelve-digit
position. A pass owns its manifest, segments and newly written retained
files. An earlier file cannot be replaced; only `head.json` changes.
The tree writer reads and rewrites the paths it changes, retaining other
edges by object ID. It does not inspect old pass manifests or payloads.

The v2 selection decoder keeps the original per-pass ceilings. It adds an
explicit previous receipt and each retained key's original pass. The v1
decoder remains separate and refuses these extensions. The v2 writer
checks the parent's head against the receipt and checks the first new
entry against that receipt's hash. It reads only its new entry interval
and the retained bodies that it writes in this pass. The common entry
and retained-byte checks also serve the original v1 writer.

## Checks so far

All attempts preserve full physical input snapshots, modes, original
logs and process exits. Dependencies are owned physical files with 32
contained relative links; preparation copied 5,499 files, verified 2,618
Main source files and installed nothing. The shared macOS arm64 host and
OS caches are uncontrolled; each receipt records its observed load.

- Tree attempt 1 passed both Git compilers, then stopped because a legal
  1,000-name tree exceeded the new helper's initial 40 KiB read bound:
  4.572434916 wall seconds, 4.843787 child CPU seconds. The byte calculation
  now covers 1,000 maximal legal names and SHA-256 IDs. The native pass
  budgets and 1,000-name directory bound remain unchanged.
- Tree attempt 2 passed both compilers and one mechanical witness after
  10,000 passes and 4,608 retained files: 31.648205167 wall seconds,
  34.196295 child CPU seconds. It reads only tree objects, keeps the earlier
  retained path and refuses a replacement. It uses stand-in file bodies,
  not native confirmations.
- The layout attempt passed both compilers, the new 10,000-entry witness
  and one existing v1 layout witness: 3.320016750 wall seconds, 4.767645
  child CPU seconds. Three v2 commits cover intervals 0–4095, 4096–8191 and
  8192–9999. Each reads only its new entries, preserves every earlier file
  except the head and passes real Git `fsck`. Selections and judgments are
  synthetic; this is not offline replay acceptance.
- One receipt-chain control passed the fixed witness, removed that one
  comparison and failed by assertion, then restored all source bytes,
  modes and the lock stamp: 6.485900916 wall seconds, 7.348134 child CPU
  seconds. The original verbose failing log is preserved at 7,621,186
  bytes. No mutation sweep or whole-suite repeat was run.

## Work remaining

Replace the writer's whole-parent provider read with bounded object reads
and verify unchanged parent edges at send. Implement v1 conversion, then
run the commissioned native witnesses and the gate once before review.
The large-history driver and density-aware cutoff remain to be connected.
Planner decision `066e49b3` now answers the separate 9a observation-head
finding; that branch still needs its positive replay check.

## Complete clone reader

The v2 reader checks the complete pass tiling, canonical segment boundaries,
the chain across passes and the original pass of every retained file. Each
pass must carry its own foreign-source basis. Every file must be listed;
extra or misplaced files refuse the clone. Its default total limit is
1,000,000 entries. The reader's tree counters follow that explicit total
limit, while native writers keep their original per-pass limits. All reads
still spend the caller's one budget and deadline.

The `gitSource` router resolves the ref once, inspects two bounded trees and
pins that immutable commit for its selected reader. It makes no fallback
between layout versions. The original v1 reader's checks are unchanged.

- Reader attempt 1 passed both Git compilers and the 10,000-entry portable
  reader/A2 integrity witness: 4.954823458 wall seconds, 5.729255 child CPU.
- Attempt 2 passed four Git and Replay compiler configurations and eight
  cases over the v2 writer/reader and existing disconnected v1 clone file:
  17.305623666 wall seconds, 22.587915 child CPU. The actual local
  `gitSource` reads all 10,000 entries and A2 integrity reports `consistent`.
  A configured 9,999-entry reader limit refuses that archive.
- The corruption fixture's first two attempts passed the valid two-pass
  archive but stopped on bare-repository index commands before reaching
  malformed inputs. Their natural failures remain preserved. Direct Git
  tree-object edits replace those index commands.
- The corrected fixture passed all nine commissioned structural variants:
  gap, overlap, unlisted retained file, future retained pass, absent file in
  the named pass, missing copied-fact source basis, wrong directory, position
  overflow and broken cross-pass chain. It took 8.895107709 wall seconds,
  8.455574 child CPU.
- An additional malformed-entry-JSON witness failed by assertion on the
  pre-fix reader: it reported `unavailable`, where corrupt bytes require
  `mismatch`. After correction, that witness and all nine structural
  variants pass: 9.737741291 wall seconds, 9.115754 child CPU. The baseline
  and fixed attempts each preserve all inputs and their original exits.

These are integrity and corruption checks over synthetic entry judgments
and real Git objects. They do not establish native replay or confirmation,
production export permission, provider behavior or deployment readiness.

## Native interval and confirmation

The native inventory now has a separate v2 interval mode. After a confirmed
receipt it uses the stored append-derived pin and scope metadata, starts at
the next position and checks the first new entry's previous hash against the
receipt. It does not query the old genesis entry. V1 still starts at genesis.
Reconstruction decodes the marked interval and retained-pass references;
it does not inventory today's entries or retained set.

Both retained tables gain a nullable `pass` column. Existing schemas migrate
without changing folded state. Each lookup uses the exact primary key and a
fixed metadata reservation. Confirmation updates only the new pass's keys,
in the same native transaction as the archive receipt. A reused key keeps
its original pass. V2 receipts cannot return to v1. The bookkeeping permits
the same-cutoff v1-to-v2 confirmation, but the actual conversion builder is
not implemented yet.

The Git object reader also has an explicit bounded-body port for isolated
transports that cannot probe metadata alone. It reserves the full maximum
before the one read, validates the returned size/type/hash and owns its
bytes. The existing metadata-first port is unchanged.

- The bounded-body owning check passed both Git compilers and the existing
  strengthened budget witness: 1.243210292 wall seconds, 2.111053 child CPU.
  A single removed-reservation control passed fixed code, failed by
  assertion and restored all bytes, modes and the lock stamp: 2.339820042
  wall seconds, 3.117805 child CPU. The later native owning check also
  verifies the witness after its assertion was narrowed to the required
  reservation lower bound.
- Native bookkeeping passed four Git/Scope compilers and four focused
  cases: 6.611932875 wall seconds, 10.207228 child CPU. The existing row
  witness now simulates old schemas, checks unchanged folded state, forces
  a receipt-save failure after key updates and proves atomic rollback.
- The strengthened confirmation witness also checks reused and new keys,
  repository conflict, restart persistence and refusal to return to v1.
  Removing the confirmation updates fails by assertion; fixed code passes
  and the control restores all inputs: 9.117292542 wall seconds, 14.399880
  child CPU.
- Native interval inventory and exact reconstruction pass alongside one
  existing v1 reconstruction case: 5.401619416 wall seconds, 9.815736 child
  CPU. A later turn and eviction do not alter the marked commit. Its query
  port refuses every old entry read, including a genesis-hash lookup.
  Forcing that old lookup fails by assertion, with fixed and mutant inputs
  preserved and restored: 9.004768083 wall seconds, 14.505001 child CPU.

The SQLite storage, turns, transaction and restart are real. The policy,
authority, component confirmations and conversion metadata in these small
witnesses are explicit TEST stand-ins. No provider runs, no actual v1
conversion is built, and the commissioned 10,000-entry and 10,000-confirmed-
pass native scenarios remain unrun. Every attempt used zero installs and
kept source, modes and lock stamp exact after execution.

## V1 conversion and the 512-key witness boundary

`convertJournalArchiveV1` now re-admits the bounded local prefix of a
confirmed v1 receipt. It reads only the old commit object. It regenerates
the complete canonical v1 tree, including the original manifest parent,
omissions and S2b basis, and requires its ID to equal that commit's tree.
This binds every old file and byte without fetching old payloads or Git
ancestry. It then writes exactly those segment and retained bytes under
v2 paths, with the old commit as parent and the same cutoff. Conversion
adds no native journal entry. Both constructions spend the original budget.

Native `planArchiveConversion` refuses an outstanding v1 attempt. A marked
conversion rebuilds from its stored selection after eviction and later
native turns. Its confirmation sets the written keys' pass to zero in the
same native transaction as the v2 receipt. A later v2 pass uses that receipt
and those original retained paths. This is a tested component boundary;
the asynchronous driver and actual provider are still not wired to it.

| Original attempt | Actual result | Wall seconds | Child CPU seconds |
| --- | --- | ---: | ---: |
| `53607`, Git conversion v1 | Compilers pass; positive conversion passes; corrupt-parent negative used an unreserved test budget and fails with `input` | 2.893891709 | 3.372054 |
| `18701`, Git conversion v2 | Compilers and conversion/append/integrity case pass after fixing the test budget | 3.711792875 | 4.113436 |
| `32388`, native conversion | Both Scope compilers and two native cases pass: conversion/restart/confirmation and existing marked-interval reconstruction | 5.203660292 | 8.525980 |
| `98143`, one tree-binding control | Outer 0; fixed 0; missing-comparison mutant fails at direct corrupt-parent assertion; all source restored | 7.610860833 | 9.441573 |
| `83744`, 512-key diagnostic | Outer 0; expected child 1, direct acceptance assertion fails with `limit`; all original source restored | 2.154997791 | 3.150489 |

Each ordinary/control phase captures 2,631 complete source files with modes.
The temporary 512-key diagnostic captures 2,632, including its diagnostic
test, and then removes that temporary test. All original source bytes and
modes and the dependency lock stamp remain exact, with zero installs.
Each input receipt records machine, tools and load; OS caches are uncontrolled.
The measurements are separate attempts, not one gate. The Git conversion
case uses actual local Git, strict fsck and the v2 reader, with synthetic
admitted selections. The native cases use actual SQLite, native turns and
eviction, with TEST policy/authority/manual confirmation. No real provider,
10,000 confirmed native passes, deployed closure or complete F1 acceptance
is claimed.

The 512-key diagnostic exposes a contract conflict before any accounting
change. The unchanged original allowance is 512 attempts for the whole pass.
Inventory's retained reader spends one attempt per key, including cache
hits and probes. `archiveInput.entry` also spends an attempt per native
entry; layout spends another per selected retained input, and the native
retained port spends an attempt again. Therefore a pass cannot write 512
new keys inside that allowance. The diagnostic understates the full native
cost: one synthetic genesis, 512 small valid rule bodies, only the inventory's
512 minimum debits reserved, and a synthetic input port charging no native
read attempts. `buildJournalPass` still refuses `limit` at its first retained
attempt. Its measured used counters are attempts 512, entries 1, calls 1,
nodes 0, metadata 898,133 and input-work 9,123,801. The temporary test's
expectation remains acceptance, and its direct assertion is preserved as a
failure, not recast as a passing witness. No original cap or cache debit
was changed. Witness 2 needs a planner decision; other integration can
continue within the existing counters.

## Driver, exact transport and append validation

The driver now writes v2 from its first pass. It selects a contiguous new
interval from scalar size metadata, with no entry JSON or old-prefix read.
Its current conservative cutoff is at most 128 entries or 128 KiB of body
bytes, with a single larger first entry left to normal admission. These are
lower scheduling limits inside the unchanged 4,096-entry and original work
ceilings. Inventory still performs full privacy admission; cutoff sizing is
no permission or prepaid body read. A position above the twelve-digit
layout bound reports `limit`.

After a confirmed v2 receipt, both pin loading and inventory avoid entry
zero. Pending attempts rebuild from their exact stored selection. A pending
v1 attempt follows its original rules first. Its confirmation schedules a
separate same-cutoff v1 conversion even if no new entry arrived. Only after
that v2 receipt does a new incremental interval follow. All receipt, retry,
ref read-back, credential and native-turn fences remain in place.

The parent port reads exact objects rather than a complete old closure.
Actual fixture adapters use explicit isolated upload-pack negotiation with
no closure fallback. The original pass allowance reserves bounded wire work
before identity/HTTP I/O. Fixed root tree paths now reserve their finite
name grammar, rather than a thousand maximal names; larger tree paths keep
their legal bounds. No archive cap or whole-pass attempt debit increased.

A v2 append's send validator compares hash-checked old and new tree edges.
An old edge may remain unread only at the same path, mode and ID. Every
changed edge needs its supplied, hash-checked object. No old file except
head.json may change, and no old edge may disappear. It takes no arbitrary
caller stop set or complete-closure certificate. Initial v2 and conversion
sends still use the generic full-new-closure send. Generic destination
sends keep their original rule. Credential/ref/incarnation binding and the
final smart-HTTP send fence apply to both paths.

| Original attempt | Actual result | Wall seconds | Child CPU seconds |
| --- | --- | ---: | ---: |
| `53734`, append edges | Both Git compilers and one exact-parent-edge case pass, including missing new body and overwritten old manifest refusals | 2.988090917 | 3.393511 |
| `63423`, bounded provider | Four compilers, two Git cases (including changed path maxima after 10,000 mechanical passes) and two native adapter read cases pass | 36.307991917 | 43.611017 |
| `54446`, append adapters | Both Scope compilers and all twelve owning adapter cases pass, including native-body append send and expiry fence | 4.975032083 | 8.544444 |
| `21371`, native driver | Both Scope compilers and eleven driver cases pass, including 10,000 actual checkpoint entries and replay | 11.421463500 | 15.200512 |
| `77230`, v1 handoff | Test compiler and the new pending-v1/confirmation/conversion/v2 case pass | 4.567422166 | 7.502227 |
| `30461`, old-path control | Fixed 0; omitted old-file guard causes the direct overwritten-manifest assertion to fail; original source restored | 6.882776084 | 8.650130 |
| `59647`, wire-work control | Fixed 0; zeroed work reservation makes the direct pre-I/O limit assertion fail; original source restored | 10.747915541 | 18.534680 |
| `80089`, final classification | Source compiler passes after classifying an overlarge cutoff position as `limit`; compiler only | 0.613076458 | 1.133638 |

Timing qualification for this section: the helper's elapsed window starts
after its initial source snapshot. It includes command-boundary unchanged
checks, commands and final checks, but excludes initial snapshot creation.
Its child CPU counter excludes the Python helper's own work. These are
phase-window elapsed and child CPU figures; full outer elapsed and total CPU
were not measured. The conversion-section helper figures have the same
boundary. Future acceptance runs must measure the complete outer invocation.
The closed data view predates this clarification; its original receipts
remain unchanged and this paragraph corrects their interpretation.

These independent attempts preserve full physical source snapshots, source
modes and lock stamps, with zero installs. Counts grow from 2,633 to 2,635
files. Each control phase has its own full snapshot. Measurements use the
shared macOS arm64 host and uncontrolled OS caches, with actual tools and
load recorded in each input receipt. The adapter read fixture's text-body
console warnings in `63423` are retained; the fixture now decodes protocol
bytes explicitly and the later owning adapter log has no such warning.

The native large-history case creates 9,999 checkpoints through the real
Scope object, yielding 10,000 entries. Multiple original bounded passes
confirm through its head, including an eviction after the thirtieth pass.
A SQL guard refuses any entry query at or before the confirmed receipt.
The host records zero complete-parent-closure reads. The v2 reader and
Replay reach `consistent` through the actual final head. This uses a TEST
object repository, credentials, policy and authority, with grants explicitly
`as-recorded`. Its raw report confirms the case passed; console forwarding
did not retain the proposed detailed receipt line, so no exact measured
pass count or receipt list is claimed. The separate adapter cases use real
transport/send/pack code with TEST HTTP replies; they do not establish that
the entire large-history driver used that adapter or one combined measured
network budget. A real Git clone of the native closure is still outstanding.

The current remaining boundaries include a full-budget driver run through
the actual adapter, 10,000 confirmed native one-entry passes, the 512-new-key
witness decision (`03faada8`), later reuse of key 3,700 across restart,
9a integration and its omitted-text decision (`d072cb9b`), and complete F1
acceptance followed by one gate and review. Neither planner request has
been answered at this checkpoint. No deployed or provider acceptance is
claimed. No formal Source, review request, landing or push is filed here.

## One original budget through the native driver and actual adapter

The new owning case connects the real native driver to the Artifacts
adapter with TEST binding identity, credentials and a scripted HTTP peer.
Its exact-object read and incremental send observers require the identical
ArchiveBudget instance allocated for that driver pass. Every counter stays
inside the original ceiling. The peer decodes actual incoming packs,
checks complete Git closure including stored parent ancestry, and uses
one CAS ref. All repository bytes come from actual native turns. Offline
Replay reads the assembled v2 archive and reaches `consistent` with the
fixture's explicit as-recorded authority. An eviction does not change the
receipt or cause a new budget within an outstanding pass.

The first combined run sent genesis, then retried its first 128-entry
append with `limit`. The counter diagnostic records input-work 67,077,929
of the original 67,108,864-byte allowance, before send. Its exact parent
reads had conservatively allowed an additional 64 KiB for every object's
advertisement/framing. Stage counters show this fixed allowance dominates
much of the pass. The current transport instead allows 8 KiB beyond the
requested object maximum. Larger wire replies refuse; there is still no
closure fallback. The same factor of 32 reserves work for each byte of
that smaller actual allowance before I/O. No archive cap, original debit
coefficient, key/entry debit, reset, top-up or cache bypass changed. The
128-entry/128-KiB scheduling cutoff did not need to change.

| Original attempt | Actual result | Full outer elapsed seconds | Full outer CPU seconds |
| --- | --- | ---: | ---: |
| `36051` | Test compiler passes; first combined append retries; result lacked detailed counters | 5.80 | 8.56 |
| `73977` | Test compiler passes; counter diagnostic identifies original input-work limit | 5.25 | 8.53 |
| `78871` | Test compiler passes; stage diagnostic identifies reserved transport and bookkeeping costs | 5.18 | 8.17 |
| `43553` | Both Scope compilers, combined 301-entry case and two exact-object adapter cases pass with the smaller actual reply bound | 6.33 | 10.29 |
| `25712` | Test compiler and combined 10,000-entry case pass under its unchanged original 30-second deadline | 16.05 | 19.56 |

These figures come from each original `/usr/bin/time -p` invocation around
the whole helper, including initial source capture, guards, commands and
artifact work. CPU is that command's user plus system time, including its
children. Internal receipts also distinguish Python self and child CPU.
Each attempt captures 2,636 complete physical source files, exact modes and
lock stamps, with zero installs. All failed attempts and original tool
completions remain evidence; they were not overwritten or replayed.

The final case creates 9,999 native checkpoints after genesis, then archives
through actual position 9,999 in multiple original bounded passes. All
adapter reads and sends use their driver pass's one original budget. It
checks an eviction and complete offline replay. The HTTP peer and binding
identity remain TEST stand-ins: this is no hosted read, remote repository,
real Git CLI clone, production token or deployment acceptance. The smaller
advertisement allowance may refuse a repository with many refs; no actual
host compatibility was probed by the builder.

The large-history same-budget adapter gap listed in the preceding section
is now closed on the test host. Still outstanding: 10,000 confirmed native
one-entry passes, the 512-new-key decision, key 3,700 reuse after restart,
9a integration and its omitted-text decision, a real Git clone of the
native closure, complete acceptance, one gate and review.

## Planner decisions adopted after the full-budget checkpoint

Planner decision `18ef695b`, adopted as `4150b218`, resolves the 512-key
conflict without changing any budget or debit. Witness 2 now fills past
4,608 retained files through native passes, each adding as many whole
entries and inputs as its unchanged budget admits, then adds one more.
Each cutoff must reflect the full entry, retained-read and tree cost, and
the next pass starts at the following entry. A single entry that cannot
fit reports `limit`. The current scalar scheduling bound is conservative;
it is not yet that complete adaptive cutoff. The amended native witness
and Grow throughput measurement remain implementation work. Slice 9 must
use the measured entries per pass to choose a cadence at least three times
Room A's 4,800-entry daily rate and state catch-up time from position zero.

Planner decision `d61549b0`, adopted as `341abe1e`, answers the detached-text
gap. Text bodies remain unexported and no separate caller text set is
accepted. Each pass will record omitted digest, UTF-8 byte count and first
naming entry. Replay takes that omission metadata on explicit trust,
checks any journal-recorded size agreement, and still refuses unreferenced
rows or reports `incomplete` for an unexplained missing text. This is a
new implementation boundary for 9a integration, not work already done.
The original incomplete replay and resource findings remain evidence.

## Integrated omission metadata, first boundary

Local integration merges the F1 checkpoint `dae5549e` with 9a `7c70f19f`
as `3a20501c`. The two conflicts combine incremental positions and actual
native-pin admission. Fresh preparation physically copied 5,499 dependency
files and 32 contained relative links, verified all 2,640 source files and
workspace bindings, and installed nothing. Original preparation `25824`
exits zero, full outer 2.71 seconds / 2.19 CPU seconds. Baseline `19150`
passes six compiler closures and three selected existing replay/conversion
cases, full outer 9.98 / 14.81, with exact source modes and lock stamp.

The v2 inventory now records the UTF-8 length of the native canonical
retained JSON string for a detached text, using only SQLite scalar size
metadata. This is the existing native retainedSize/ByteUsage measure.
It is not the decoded field's length, and must not be used to pretend its
field bound was derived. The new omission trust will state that limit.
A missing retained row invents no count; its actual journal tombstone or
an incomplete result must answer for it. Every metadata request spends
an original attempt and fixed metadata work.

V2 selection and pass schemas carry the count and first naming position.
Their v1 equivalents retain their closed original shape. A conversion
re-admits the complete legacy omission set to match the original v1 tree,
then adds available count metadata; tombstones already in the converted
journal remove the corresponding new omission rows. No text body is read
for that operation. Native test `archive-text.test.ts` writes an actual
detached text beside a signed native act, verifies encoded and decoded
byte counts differ, guards every SQL result against returning either text
body, checks fresh v2 metadata and unchanged v1 omission, and checks exact
legacy conversion. Policy and authority are TEST stand-ins.

The first metadata attempt `77330` stopped at the Git compiler's callback
narrowing error before any native test (full outer 1.29 / 1.19 CPU).
After fixing it and preserving conversion's legacy set, `85927` passes four
Git/Scope compiler closures and the native metadata case (6.27 / 10.95).
Each captures all 2,642 source files, exact modes and lock stamp, zero
installs. These are complete outer time measurements, not phase sums.
No omission-aware reader, Replay trust, completed Grow closure or adaptive
cutoff is claimed at this boundary; those remain implementation work.

## Integrated omission reader and Replay checkpoint

The next boundary implements decision `d61549b0`. The v2 reader checks the
omission's scope, pass position and explicit digest claim in that entry's
input. An unrelated claim refuses the archive read. The producer's shared
typed dependency selector still discovers text dependencies; the reader's
claim check does not discover new dependencies. Conflicting counts for a
digest are a mismatch. Old unmeasured omission rows supply no new trust.

Replay obtains count metadata through a bounded optional source port. A
measured omission cannot call the legacy external-text hook. Its canonical
retained byte count supplies logical capacity accounting; the decoded
field size stays unknown. It supplies neither a body nor evidence of the
digest or field bound. The report lists digest, count and the full first
naming fact, with the planner's exact omission trust. A missing body with
no count or tombstone remains incomplete. A report with no omissions keeps
its old shape.

Native `archive-text.test.ts` now opts into whole-scope capacity. Its actual
signed act retains an escaped, multiline, non-ASCII text. The native v2
export replays consistently without incomplete byte spans and never calls
the supplied external-text trap. Removing the count row yields incomplete
at entry 1 with an incomplete byte span. Adding an unrelated row refuses
the archive read. The same case preserves v1's original omission shape
and checks conversion against the actual v1 tree.

V2 planning and conversion also collect the private-source anchors from
the entry bytes actually read by the builder. This uses the same original
budget as inventory and layout. Legacy planning uses the same collector.
No private source journal, observed live head or body-as-proof is added.

`archive-installed.test.ts` exports the five native Grow journals through
`planArchivePass` and reads them through the v1/v2 router. Room, Site,
Directory, Rules and Destination all replay consistently. The four targets
that previously lacked text now report digest
`sha256:9e0a5a28346594dcd3a95794d1d66951691e6de65adc1582e788ba5ef3085530`.
Every reported omission matches the native exported metadata, whose count
is also checked against independent scalar SQLite size reads. The union
of reports covers every omission. No report has incomplete byte spans.
The seven export-derived private anchors and all four missing/wrong-anchor
controls remain in place. Removing the Directory row from a clone of the
native export yields incomplete at Directory entry 5; adding an unrelated
row refuses the archive read. Only clone metadata changes for these two
negatives; the native entry and input bytes remain unchanged.

Focused original attempts, on the shared macOS arm64 host with uncontrolled
OS caches, are recorded below. CPU is user plus system over the full outer
command; these are separate runs, not a sum presented as one run.

| Original process | Result | Outer elapsed seconds | Outer CPU seconds |
|---|---|---:|---:|
| `44891` | Seven compilers, recovered-byte cases and native text case pass | See qualification below | See qualification below |
| `24146` | Scope compiler rejects the collector's overly narrow selection type; native tests do not start | 2.57 | 5.21 |
| `83155` | Source compilers pass; test compiler rejects a union of callback promises; native tests do not start | 3.24 | 8.32 |
| `11788` | All compilers pass; sandbox refuses the localhost listener before native tests start | 3.95 | 9.15 |
| `46013` | All compilers and the three native text/installed cases pass | 10.97 | 17.29 |
| `96495` | Stronger omission counts, capacity and native Grow metadata negatives pass | 11.19 | 17.53 |
| `43124` | Compiling omission guard control fails the consistent-replay assertion as intended | 4.81 | 5.93 |
| `13036` | Compiling reference guard control fails the refused-read assertion as intended | 5.13 | 5.88 |

Each attempt captures all 2,642 source files, exact modes and dependency
lock stamp, with zero installs. Actual machine, load and cache statements
are in its input receipt. Controls restore all source bytes and modes and
the dependency stamp exactly. The control runs use the original passing
baseline rather than repeating it. These are two focused faults, not a
mutation sweep. Earlier control `91502` observed the intended assertion,
but its removed local use would fail the unused-local compiler setting;
it is not counted as a compiling control. `43124` retains that local use,
compiles, and observes the same intended assertion.

The full external completion output for `44891` was lost after truncation.
Its original closure and log record natural zero and all selected passes.
Its internal window starts before source capture: 8.356146 seconds elapsed,
1.502777 Python CPU seconds and 13.541061 child CPU seconds. Those figures
are not full external timing. The original command is not replayed to
repair that gap.

This is a local implementation checkpoint. The complete adaptive full-cost
cutoff, amended native retained-file witness, 10,000 confirmed one-entry
passes, key-3,700 restart, measured Grow cadence, actual Git clone and Slice
9 coordinator/publication wiring remain work. No full gate, formal Source
review, approval, landing, push or deployment is claimed.

The native Grow case now emits a test annotation for a retained JSON
receipt. Its first two annotation-only attempts stop at the test compiler:
`38086` uses the wrong `each` context signature (1.77 outer seconds, 3.80
CPU seconds), and `54652` retains the old positional timeout with `for`
(1.58 / 3.83). With the context and unchanged 30-second timeout passed in
the supported form, `22214` passes the test compiler and selected native
Grow case (9.90 / 13.37). It captures the same 2,642 source files exactly,
with zero installs. The fixture case is deliberately outside this receipt
selection; it already passed in `96495`. The annotation changes no protocol
or test assertion.

The actual native receipt is
`/private/tmp/archive-native-incremental-grow-text-native-receipt-v3-20261020.json`.
It contains all five consistent results and seven private-source anchors.
These are its four omission rows; each count is canonical retained JSON
UTF-8 bytes, with the full scope, incarnation and hash in the receipt.

| Digest | Bytes | First naming entry |
|---|---:|---|
| `sha256:6d4a86ea2640f5364515eaa7803ea4ba47c7636027e62e490d2be18b4d2e9110` | 4,998 | Directory 5 |
| `sha256:9e0a5a28346594dcd3a95794d1d66951691e6de65adc1582e788ba5ef3085530` | 45,750 | Directory 5 |
| `sha256:6d4a86ea2640f5364515eaa7803ea4ba47c7636027e62e490d2be18b4d2e9110` | 4,998 | Rules 2 |
| `sha256:9e0a5a28346594dcd3a95794d1d66951691e6de65adc1582e788ba5ef3085530` | 45,750 | Rules 2 |

## Real local Git clone of the native Grow archive

The native Grow witness now round-trips its exact exported objects through
the real Git program. The existing nonce-protected local test bridge
materializes a temporary SHA-1 bare repository, checks every object with
Git, installs the five journal refs, and runs strict full `fsck`. The
independent Node SHA-1 must also agree with every exported object ID.
`git clone --mirror --no-local` then transfers the repository through
upload-pack. A second strict full `fsck` checks the clone. The bridge reads
the clone's reachable objects with binary `cat-file --batch`; it returns
those bytes and refs, with no original-map lookup.

The Worker empties the original object map before replaying the clone.
All five native targets must produce exactly their earlier verification
reports, including coverage, anchors, omission rows and trust. Only then
does the test restore its local map for the existing metadata negatives.
No journal entry is fabricated, and no external text set is supplied.
Temporary repositories are removed by the test bridge's teardown.

Original `75387` passes the Scope source, test and Node-support compilers
and the selected native Grow case. Its receipt records Git
`2.54.0 (Apple Git-157)`, 140 source objects, 140 cloned reachable objects,
the same five journal refs, strict `fsck` success and five equal offline
reports. Full outer cost is 11.68 seconds elapsed, 14.24 user plus 2.19
system seconds, or 16.43 CPU seconds. The unchanged 30-second case deadline
remains in place. The receipt is
`/private/tmp/archive-native-git-clone-native-receipt-v4-20261020.json`.

Earlier original attempts are preserved. `49704` stops at the test compiler
over binary-buffer types (2.12 seconds elapsed, 4.98 CPU seconds). `62399`
passes all compilers but the bridge returns its generic failure (9.97 /
14.75). A specific fixture diagnostic in `43021` identifies strict Git's
`badHeadTarget`: the fixture's HEAD symbolically names a journal ref rather
than a branch (10.14 / 15.04). Giving the temporary repository a detached
HEAD fixes that fixture error without adding a fabricated branch or
changing the native object closure.

One compiling control, original `50754`, directs clone Replay to the
emptied original map instead of the clone. The unchanged native Grow case
fails its verification assertion with `archive-failure`, as intended. Its
full outer cost is 9.03 elapsed and 10.85 user plus 1.57 system seconds, or
12.42 CPU seconds. It uses the original passing clone baseline rather than
repeating it and restores source bytes, modes and the lock stamp exactly.

Each owning attempt and control captures all 2,643 source files exactly,
with zero installs. These are separate runs on the shared macOS arm64
host; machine, load and uncontrolled OS-cache statements are in the input
receipts. Helpers and the annotation reporter were copied from explicit
verified rows of the closed omission grant into distinct regular files,
then all matching aliases were retargeted before execution. Frozen
originals remain unchanged.

This proves a local SHA-1 Git clone of the actual native Grow closure and
offline Replay of its returned bytes. Host identity, package/owner policy,
scheduler and the local bridge remain TEST fixtures. It supplies no hosted
transport, provider, credential, deployment or full F1 acceptance claim.
The adaptive cutoff, amended large native pass witnesses and throughput
work remain open. No full gate or formal Source review has run.

## Scalar lookahead for full-cost planning

The next local foundation adds a non-stopping `ArchiveBudget.canSpend`
check and a scalar `ArchiveWindow`. A forecast compares against the same
original limits and used counters; it is not spent, prepaid, refunded or a
second allowance. Actual work still calls `spend`. Its insufficient-cost
behavior remains stopping, with every original limit and debit unchanged.

The window advances through keyed native positions without returning entry
JSON or retained bodies. Before each query it checks that the metadata work
will leave the forecast available. Before admitting another entry's JSON
work it checks that unchanged debit too. A limited step keeps the original
budget usable for finishing the chosen whole prefix. Work spent examining
a candidate is never refunded when an earlier boundary is chosen.

Opening a window uses the prefix reader's new internal `next` mode. Pin
admission happens before its first-position lookup; the existing explicit
Head path keeps its original query and debit sequence. The first entry's
JSON reservation is already paid by that prefix read. Its hash and size
must still match when the window reads it, so drift cannot borrow the
earlier reservation. Later entries pay the same 64-pass JSON-work debit.

Native tests select actual entries 0 and 1, leave room for the next scalar
read but no next entry's JSON work, and retain the complete forecast. The
same original budget then spends that forecast to its exact ceiling; it
cannot spend one byte more. All entry reads in the window are scalar. A
corrupt size change after initial metadata admission refuses before JSON.
An unadmitted pin also refuses a new interval after an actual supplied
predecessor without reading any entry. The predecessor is fixture context,
not a claimed confirmed archive receipt.

| Original | Result | Outer elapsed seconds | Outer CPU seconds |
|---|---|---:|---:|
| `97276` | First foundation: both Scope compilers and ten budget/prefix cases pass | 6.38 | 9.95 |
| `30669` | Stronger whole-prefix selection and headroom case pass | 5.98 | 10.03 |
| `56120` | Compilers pass; overstrict test disallows the pin's legitimate genesis-hash lookup | 6.23 | 9.88 |
| `7403` | Corrected predecessor-specific ordering witness and all ten cases pass | 5.69 | 9.74 |
| `38415` | Compiling control ignores the finishing forecast: limited-step assertion fails | 5.14 | 8.25 |
| `98211` | Compiling control ignores the first size change: refusal assertion fails | 4.81 | 7.99 |
| `56163` | Compiling control moves lookup before pin refusal: the final refusal stays correct, but the no-entry-read assertion fails | 5.07 | 8.20 |

Each original captures all 2,644 source files and exact modes and lock
stamp, with zero installs. The controls restore them exactly and use the
original passing baseline without repeating it. The first two controls
precede the pin-ordering refactor; their target guards and test cases stay
unchanged. Machine, load and uncontrolled OS-cache statements are in each
input receipt. These are separate complete outer measurements.

This foundation does not choose a production pass. The driver still uses
the conservative 128-entry/128-KiB cap. The next boundary must account for
retained-input discovery, probes, declarations, layout, tree and finishing
work while keeping whole-prefix privacy admission before body reads. No
complete adaptive cutoff, new acceptance, gate or formal review is claimed.
