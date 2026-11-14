# Measure one widest admitted entry

ARC-1 request 53e13060 requires a measurement and a proposed rule before
implementation. This head adds one measurement fixture. Production,
configuration, dependencies and every archive cap match main `4cef11d2`.
No implementation or cap change follows from this result without a
planner ruling.

The real receiver Scope accepted entry 1 with 128 distinct foreign uses.
Each copied source entry and the receiver entry contains exactly 262,144
canonical UTF-8 bytes, the shipped `entryBytes` ceiling. Judge-only
previews chose inline text padding before genuine admission and sealing.
No raw retained-row insert built the fixture. Native SQLite then held 129
retained entry rows: 128 later copies and one 1,404-byte source genesis,
33,555,836 bytes total, with one `retained_birth` association.

One genuine derive fixture source ledger supplies all 128 later entries.
This measures the maximum use count and body size, not 128 distinct
source sequences. `FixtureArchiveSourcePins` has a separate 64-source map
cap. The receiver, native SQLite, original ArchiveDriver and floor
functions are real. Source authority, grants, inline archive policy,
clock and Git host are explicit stand-ins; this fixture proves no
deployed custody or native foreign-source authority.

A separate setup budget prepared the two fixture source identities. A
normal original-budget pass then confirmed the receiver's genuine
genesis-only prefix through 0, with layout 2 and `anchorsPublished: true`.
Only after that confirmation did the receiver admit the wide entry.
Exactly one further pass used every original `ARCHIVE_BOUNDS` value and
its original 30-second budget deadline. The new test's 120-second outer
allowance covers fixture construction and floor observations too.

| Observation | Setup pins | Genesis pass | Wide-entry pass |
|---|---:|---:|---:|
| Entries charged | 0 | 2 | 1 |
| Attempts | 0 | 17 | 32 |
| Nodes | 0 | 23 | 24 |
| Calls | 0 | 107 | 69 |
| Metadata bytes | 1,024 | 875,980 | 227,639 |
| Input-work units | 1,253,760 | 27,898,306 | 52,395,102 |

The measured pass returned `retry` with reason `limit`. The first capacity
refusal was a debit at `scout-next`: it requested 16,777,216 input-work
units after 52,394,590 used, exceeding the 67,108,864 limit by 2,062,942.
The 512-attempt cap did not decide this run. The final costs above include
the pass's remaining bookkeeping. Its reservation record reports 332,773
metadata bytes reserved, 227,639 settled, none unsettled and no settlement
refusal. The preserved diagnostic gives no selected prefix or finish quote.
Its optional detailed attribution is unavailable for this custom budget;
the direct budget totals and capacity refusal remain in the record.

The archive row stayed byte-for-byte equal to its pre-pass value:
confirmed through 0, no pending prefix, no permanent `stopped` reason,
row attempts 0 and row `next: null`. The result and separate archive wake
request a retry at fixture time `2099-01-01T00:00:02Z`. Row attempts are
not the budget's 32 charged attempts. This run confirmed no part of entry
1 and made no later retry.

For the floor observation, 100 genuine checkpoints extended the journal
to 101. Only the fixture clock advanced past the 900-second intent
lifetime. With the actual confirmed receipt and explicit fixture floor
policy `{ margin: 100, minimum: 1 }`, `offerFloor` returned floor 1 with
keep `[0]`. It could not cross wide entry 1. `judgeFloor` refused a
candidate at 2 with `floor-ahead`: the receipt did not cover it. The
current floor stayed absent and entry 1 stayed held. No floor executed,
no receipt was fabricated, and no deployed floor policy was enabled.

The [sealed measurement manifest](evidence/2026-11-14-arc1-widest-entry-attempt1.manifest.json)
records checkpoint `3a4d824ad38d48fd619c033c4309c36e2c48468f`, tree
`7f722091f34db57ed3911f911c40505d34e4b322`. The compiler and single native
case passed once; there was no sweep or retry. All 37 sampled actual
power readings and both endpoints showed AC and powermode 0, from
2026-11-14T05:27:12.128750+00:00 to 2026-11-14T05:28:26.618380+00:00.
The fixture took 64.54 seconds; the native command took 73.12 seconds.
These observed durations include setup and do not measure one archive
pass or promise a completion time. The verified locked dependency view
came from an APFS clone, with no package installation. The sealed record
holds the exact fixture, tracked input hashes, dependency correspondence,
commands, results, diagnostics, power readings and an offline extractor.
This follow-up changes only this note and its manifest.

| Check | Command | Exit | Output sha256 |
|---|---|---|---|
| Scope test compiler | `node_modules/.bin/tsc -p packages/scope/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| One native measurement case | `ARTROOM_TEST_PHASE=native node_modules/.bin/vitest run --config vitest.native.config.ts --project scope packages/scope/test/archive-widest-entry.measurement.test.ts --reporter=verbose --reporter=json --outputFile /Users/hughpyle/play/artroom-evidence/2026-11-14-arc1-widest-entry-attempt1/native-results.json` | 0 | `9b9cc195cf9dad1f944e0c022a76df89120fae6b6077776bf7702ee01c6a3e18` |
| Offline extraction and result/power checks | `python3 /private/tmp/artroom-arc1-extract.py` (preserved as `extract.py`) | 0 | `529da1dac29b4faafdd16a72d3bde988d6df26821a63ccc51e934589f4e71c39` (`analysis.json`) |

Proposed rule for ARC-1 step 2: prepare and copy one entry through
persisted, bounded stages across passes, while every pass keeps its
current caps. Bind progress to the exact scope, entry position and hash;
each stage pays its actual reads and validation. Resume inventory and
source preparation as well as payload copies, so the same preflight does
not exhaust each fresh budget before progress. Publish the entry and
advance its confirmed receipt only after its complete proof set is
verified. A floor must continue to use the confirmed receipt. This rule
keeps already admitted history eligible without treating partial proof
staging as archive coverage.

ARC-1 owns that design and its widest-entry regression witness. The
one-source measurement does not settle the distinct-source preparation
limit or prove all finish costs fit. A complete design must cover those
boundaries and restart integrity. Builder stops here for the planner's
ruling before production work, cap changes or further execution. No gate
or review request belongs to this measurement-only proposal.
