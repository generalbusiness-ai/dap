# DX-TR implementation evidence

The five typed definitions now use the eight authoring helpers. Their
canonical data stays fixed. The design record explains the reading,
measurements, and rejected alternatives:
[Typed authoring readability](../2026-10-29-typed-surface-readability.md).
The generated vocabulary page and rewritten witness directory accompany it.
No kernel, deployed Worker, or published package changes here.

Request `addbe5b484b2955d87347d05ac1a7b4e8832f36c` and promise
`5b703598435541ecef0efb861b23e074e7e904ed` govern this head.

## Decisions and source identity

`require(condition, reason)` states the acceptance condition. Explicit
initial states and first-use comments explain inputs inferred by `by`.
`take` retains effect order. Typed sibling references use a two-stage
callback rather than unsound circular inference. Forward and foreign
references keep strings when the named value does not yet exist.

`compile` runs findings and the actual whole-definition validator. It
returns refusal metadata outside canonical data and reports failures with
the act, form, and offending data. Guard traversal visits declared guard
positions; literal records with `rule` or `reason` keys remain data.
The definitions retain strict index checks. Modules take explicit
arguments, and operands stay plain data.

Three checkpoints bind the captures:

- **B, immutable baseline:**
  `26837f826ddfea2e054c7e24b18aca990c646d2f`, tree
  `a217ac7b44dd4d18099e27d54d30b4287ebe30f1`.
- **A, implementation and focused checks:**
  `e3cd24a808acf19bfe8159d0dc4e89f880784032`, tree
  `bcc7271a354368ed9856fcd775522aabd74a4b74`.
- **G, final design and ordinary gate:**
  `029a62a2c09e3281e5f947fa03ecf580e57aaafc`, tree
  `3b4628254bafa2a7f946e471ce074d0bb15e0d83`.

Base Main is `41da9810f0c2d8727b07c129b2d47149107993e7`.
The retained baseline copies all 15 original spike files byte for byte
from `f77e454a84fca21e22eec7fe6d7eed16d7cf08e1`. The after directory's
`baseline.json` records sizes, SHA-256 values, and original Git blobs.
This lets a fresh clone verify provenance without that foreign Git object.

A to G changes only the design note, this record, and the spike REPORT.
The final reporting tail changes only this record and its new manifest.
Source and tests stay unchanged after G. The artifact report records the
reviewed tree beside G's tree under the documents-only follow-up rule in
`docs/testing.md`; no second gate is claimed or needed.

## Final evidence

The durable collection is
`/Users/hughpyle/play/artroom-evidence/2026-10-29-dxtr-readability`.
[The manifest](evidence/2026-10-29-dxtr-readability.manifest.json) binds its
checkpoint, complete root index, cited files, and directory units.
The collection is read-only after final hash and mode readback. Retain it
for at least 30 days after landing; removal needs a planner act naming
this manifest.

Each label below cites its `command.json`, `process.json`, `receipt.json`,
`source-index.json`, `stdout.log`, and `stderr.log`. The command record
contains exact argv and a full commit and tree. Output SHA-256 names the
stream shown. The two exits mean actual child and capture, respectively.
Every formal capture closed completely with unchanged committed source.

| Check and command record | Checkpoint | Command | Child/capture exit | Output stream SHA-256 |
|---|---|---|---|---|
| `baseline-types-1/command.json` | B | TypeScript over `typed-surface-before/tsconfig.json` | 0/0 | `stdout.log` `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `baseline-witnesses-1/command.json` | B | Vitest with `typed-surface-before/vitest.config.ts` | 0/0 | `stdout.log` `0c386018c63ecde99440ca5b547a2440db5647e60334489a748a49aca696ac18` |
| `surface-types-1/command.json` | A | TypeScript over `typed-surface/tsconfig.json` | 0/0 | `stdout.log` `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `surface-witnesses-1/command.json` | A | Vitest with `typed-surface/vitest.config.ts` | 0/0 | `stdout.log` `1b6e539ef1db152c3ce62b4044f105f6f49995bc7ead44ad7c51ca4351218cb0` |
| `metrics-1/command.json` | A | `node spikes/typed-surface/measure.mjs` | 0/0 | `stdout.log` `26e781821d2a416761a3d7103ba5e5aca7d7fe165598cac7051338022e3783c3` |
| `diagnostics-1/command.json` | A | `node spikes/typed-surface/diagnose.mjs --out <new retained runs directory>` | 0/0 | `stdout.log` `93e01770c3fbabed51742db7654cc38401ea6c42daeaf05b6ab20376076af7c5` |
| `vocabulary-1/command.json` | A | `node spikes/typed-surface/vocabulary.mjs --check` | 0/0 | `stdout.log` `9dedb9e407f21d338903845ff1f229c1abada106beec9e0957a5398dfb1c4473` |
| `control-compile-1/command.json` | A | `node scripts/control.mjs`: bypass diagnostic refusal; select incomplete-definition witness | 0/0 | `stderr.log` `2000f7be020ca3df7d16b74b5f352a465ed641ba7be8b64c43ca21bf6e29e7e5` |
| `control-take-1/command.json` | A | `node scripts/control.mjs`: reverse copying order; select ordered-copy witness | 0/0 | `stderr.log` `fd3a7ce01a28109b7769be008c033e94d94762b505eaae2172a348cdf72a2dcb` |
| `host-1/command.json` | A | `node --input-type=module -e <public host inventory>` | 0/0 | `stdout.log` `092e11cfb5e2fa84bd77c5385660c0c598d060403ed3d71fa961a39e9fc8a36d` |
| `gate-1/command.json` | G | `npm run gate` | 0/0 | `stdout.log` `0e4dbbbc78a70ec89fd9a8ec0eecbee4f9152d848de68cbd594a55e9a511452b` |
| `finalization/audit-terminal.json` | G | Pinned stdlib receipt auditor, called by evidence preparation | 0 | `receipt-audit.json` `62ba3a6d53a02788f5f18746b9f5527d3959b5e3a71db6e16a304b1c760cab28` |

The baseline has nine passing witnesses. The after directory has 18:
nine pin, package, and story witnesses plus nine helper invariants. All
five canonical comparisons are equal. Lending, Counter, and Site retain
their exact pins. Room and Change compare in canonical spelling. The
Change witness overlays the selected rows onto the complete pin, validates
the whole, and compares it with the complete normalized original. Slice
metrics alone do not claim whole-definition validation.

Both diagnostic calibrations reach an accepted write using labelled
in-memory derive test authority, not Native authority. After the rewrite,
all five seeded mistakes produce the expected TypeScript cause. Before it,
three fail in TypeScript, an unheld grant fails in the application builder,
and an undeclared reason survives through the accepted judgment. Unexpected
compiler or runtime failures cannot count as detected mistakes.
`diagnostics-1` is a cited directory unit: its index retains the generated
sources, configs, argv, launch and close records, streams, and result as
one complete payload. No editor measurement was made.

Each control first passes the unchanged selected test, then breaks one
line and gets an assertion failure. Disabling `CompileError` makes the
incomplete-definition witness fail to observe the required throw. Reversing
`take` makes its ordered-effect comparison fail. Each control restores
the source file exactly. No sweep or whole-suite rerun follows those controls.

The ordinary gate passes every stage, including its actual `npm ci`.
Terminal counts are Node 78 passed, Counting 55 passed, plain Vitest
3,099 passed and one skipped, and native Vitest 836 passed and two skipped.
The spike's 18 focused tests remain a separate run. Raw ledger records can
contain repeated observations and must not be counted as distinct tests.
The summary marks some timing observations partial or unknown; it reports
no contradictory records. All five stage terminals pass with exit 0.

`gate-1` is a cited directory unit. Its `inner-logs` keeps the 29 original
closed gate files, including every step's log and timing, the section
citation report, all case ledgers, and the stage ledger. The copy record
binds 44,647,738 bytes and verifies readback after the gate closed.
This preserves the full terminal evidence, including ordinary tool warnings.

The gate's observed wall time is 1,250.111 seconds. Collector host-child
CPU is 2,570.970 seconds; command-only host-child CPU is 2,570.854 seconds.
Guest CPU is unknown. These are one whole gate's observations, not sums
of separate runs or concurrent case durations. The host is an Apple M5
Max, 18 logical CPUs, 64 GiB, Darwin 27.2.0 arm64, Node 26.13.0,
TypeScript 7.0.2, and tsx 4.21.0. Caches and shared-host load are
uncontrolled. Fresh diagnostic processes include startup and imports in
their first-observed times. Metrics overlap part of that capture, and
the two initial baseline captures overlap. No combined edit-time total
is inferred from these runs.

The `operator-inputs` directory unit retains 20 closed debug and calibration
directories: 453 original regular files, 3,789,989 bytes, plus its copy
review record and index. These records may describe changing source or
older, incorrect harness behavior. They include initial compiler and
calibration failures, missing vocabulary patterns, the in-progress rename
failure, and an intentional interruption with actual SIGTERM and SIGKILL
records. None supplies frozen acceptance. No private custody entered this
collection. The formal run sources and their guard receipts determine the
acceptance checkpoints.

The `finalization` unit retains the reviewed collector, closure, auditor,
plan, copy receipts, audit streams and terminal, receipt table, and the
exact note citation model. The audit verifies all 11 formal labels,
source snapshot bytes, Git blobs, modes, stream accounting, and process
closure. It finds no incomplete, inconclusive, timed-out, unclosed, or
integrity-failing formal label. The final root index covers all retained
files, including failed debug context. Byte custody does not itself prove
product behavior; the results above do.

## Open limits and owners

DX-T1 request `00c50371` owns cutting the library. DX-T3 `f682cbc4` owns
forms absent from the pinned witnesses. DX-T4 `d49269fd` owns the broader
manifest and story surface. This spike does not publish a package.
DX-A1 `c9d4e517` takes the generated six-pattern page as its first teaching
artifact; the reader assessment here is one expert-agent reading, not a
human usability study.

K-spell request `2ad35350` owns kernel canonical spelling and pin migration.
The Room and Change comparisons here do not migrate either pin. Site
continues to name the original Room digest. DX-B1 `8a1bc098` owns the
refusal-list wire format; this witness returns metadata separately.

The known attribution fallback discrepancy remains in the I2 contract's
DG26 record in `notes/2026-10-04-scope-and-replay-contract.md`. This task
preserves the pinned behavior and makes no claim to repair that runtime
boundary. Lending's README path wording and Counter timer ordering remain
reference limits described in the design record. They do not change the
canonical witnesses.

Source metrics count selected grant, reason, subject, and item-type
positions, with declarations and uses separate. They exclude field, state,
slot, and fact names and names inside JSONata. Reachable Grow source rows
overlap; only the unique authoring union removes shared files. The note
makes no all-strings, editor-latency, or physical Native-authority claim.
