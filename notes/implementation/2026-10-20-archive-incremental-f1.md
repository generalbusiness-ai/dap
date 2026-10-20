# Incremental archive passes

Request `dea67816`; builder promise `33d11d65`. The source is the landed
floor design at Main `d92cd85e`, section 2 and witnesses 1 to 4. This work
starts from that Main in an isolated checkout. It contains no 9a admission
changes and no floor entry or deployment configuration.

This is work in progress. There is no full gate, review, landing, native
confirmation or native offline replay acceptance yet.

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
