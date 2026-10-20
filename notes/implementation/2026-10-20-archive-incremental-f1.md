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

Connect native interval inventory,
retained-row `pass` columns, atomic confirmation and deterministic rebuild.
Replace the writer's whole-parent provider read with bounded object reads
and verify unchanged parent edges at send. Implement v1 conversion, then
run the commissioned native witnesses and the gate once before review.
The separate 9a observation-head proof decision remains with planner.

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
