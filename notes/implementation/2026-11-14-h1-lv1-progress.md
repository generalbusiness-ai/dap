# H1 and LV1: sequenced forms and the live creation boundary

## What changed

H1 and LV1 share branch `builder/h1-sequenced-level-20261113`, with H1
first, as ruling `02309bae` requires. H1's CF-1 main merge is
`2ca131acee5aa12e6d33537b29e3149adf6dbf65`, tree
`914fe9b0f4652d5e02efcdaea47ca4c19bb2e265`. LV1's final source checkpoint
is `1d1f54b378dea3a8dc9005ab8bccde50cfd591ec`, tree
`e637c3de179cade0ee305e8ed40882b96453bd98`. Focused checks pass.
The combined gate and kernel/checker review remain due.

[The H1 note](2026-11-13-h1-sequenced-contract.md) states the sequenced
contract and validator changes. LV1 request `36496b5c` and promise
`bee88bfa` add live version 1 to `validateFormat1`. Ordinary live
declarations use the recorded grammar for items, acts, guards, rules,
effects and timed rules. Existing grammar owners refuse handlers,
declared sends, capabilities, holds, preparations, presents, recursive
fact types and notifications. The implicit genesis result still leaves
the child during creation.

`applyEntry` refuses every entry after a live scope becomes active through
confirmation, before changing state. The paired fold witness uses actual
judged child creation and confirmation, then presents a third checkpoint.
The live fold refuses it with an unchanged snapshot; its recorded
counterpart folds that checkpoint.

## Decisions and why

Ruling `4b5e0ec2` permits the first live version under kernel sections 7
and 7.1. LV1 adds no scope kind, platform name, capability, entry kind,
field type, reference or creation family. Its kernel work stays in
validation and folding. The later live turn remains a platform service.

Two rulings amend the live note and must appear in the review request:

- `a1fe9aaf`: live stays non-derivable until LV2 supplies platform live
  mode. The `derivable` comment names LV2, and the LV1 row in section 8
  states the temporary runtime refusal. The native witness keeps that
  boundary: an otherwise valid live creation answers
  `unsupported-definition` with no retained state change. Its recorded
  counterpart creates. LV2 retains this witness and changes the expected
  live answer to admission.
- `d1bd34fb`: section 3.2 now says, "A platform declaration cannot be live
  in version 1." With `platform: true`, the validator returns one named
  validation problem, `live-platform`, at `level`. This is a validation
  code, not a new contract refusal reason or wire answer. A corpus pair
  admits the recorded platform declaration and refuses its live form.
  The separate outcome-send parser retains its live no-send guard.

Ruling `696d226c` resolves H1's generated-asset conflict through its
repository generator. I retained the existing LV1 tracked patch and
exact copies of all 13 changed and added files, with hashes, before
restoring H1 to a clean checkout. The main merge conflicted only in
`apps/room/page/assets.ts`. I selected one side, ran
`node apps/room/page/scripts/assets.mjs` on combined H1 and CF-1 source,
and committed its generated output in the merge commit itself. The
review request must name this command; the checker reruns it and compares
bytes. I then reapplied all 13 LV1 files and verified their hashes.
After LV1 source settled, the same generator refreshed assets for LV1.

Read-only peer review found and closed the separate outcome-send path,
a transition relate selector that incorrectly used self, and a
preparation witness that inspected hold instead of git-read. Recursive
fact checks cover fields, ref slots, value slots and nested records and
lists. Recorded/live pairs change only the level. The old unsupported-live
corpus row now admits the same fixture after removing its fact and send acts.

The native case snapshots all application SQL rows, key-value contents
and the alarm after the runtime constructor creates its schema. The
refused creation leaves that retained state identical. The early
validation guard supplies refusal before the creation transaction. The case covers refusal and retained state in the native harness. Live
turns, package installation and deployment remain outside this case. The outside-effects model covers
Operations and markSent, which this head does not change. No formal
coverage hash or model result advances.

## Focused evidence

The [final manifest](evidence/2026-11-14-h1-lv1-focused.manifest.json)
binds the frozen source checkpoint above, every retained output, the
raw JSON reports and exact commands in `commands.txt`. Subsequent evidence
commits change implementation documentation and manifests only. The
[progress manifest](evidence/2026-11-14-h1-lv1-progress.manifest.json)
retains the earlier dirty source, preservation copies and dependency
failure. Rows marked progress use that manifest. Other rows use the final
manifest. Compiler commands run from the worktree root as
`node node_modules/typescript/bin/tsc -p` plus the listed context.

| Check | Command or compiler context | Exit | Output | Output SHA-256 |
|---|---|---|---|---|
| H1 merge generator (progress) | `node apps/room/page/scripts/assets.mjs` | 0 | `h1-generator.log` | `37eb474ff480c06e485c1cd6ff4146e5d5de1e9debf0d8f5c9a3c167f0482a86` |
| Initial define-test compiler (progress) | `packages/define/tsconfig.test.json` | 1 | `compiler-define-tsconfig.test.json.log` | `a8ca7071e50af85892c264f73129f84bdb23d177855e184aa7f8808c179f3c8f` |
| Final assets generator | `node apps/room/page/scripts/assets.mjs` | 0 | `final-generator.log` | `54c5491c887becaa6e6844912db34538e5528631d150b6b22d7aaf399bce369c` |
| Final compiler | `packages/contract/tsconfig.json` | 0 | `compiler-contract-tsconfig.json.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Final compiler | `packages/derive/tsconfig.json` | 0 | `compiler-derive-tsconfig.json.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Final compiler | `packages/derive/tsconfig.test.json` | 0 | `compiler-derive-tsconfig.test.json.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Final compiler | `packages/define/tsconfig.json` | 0 | `compiler-define-tsconfig.json.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Final compiler | `packages/define/tsconfig.test.json` | 0 | `compiler-define-tsconfig.test.json.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Final compiler | `packages/scope/tsconfig.json` | 0 | `compiler-scope-tsconfig.json.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Final compiler | `packages/scope/tsconfig.test.json` | 0 | `compiler-scope-tsconfig.test.json.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Pool compatibility prerequisite | `node scripts/cloudflare-pool-compat.mjs` | 0 | `compat.log` | `fd45bc2731cddc18874c8ad9f616ec69774065d0661d6ebc4ead86dd9dae2fab` |
| Narrow plain owners | `plain selection in commands.txt` | 0 | `plain.log` | `7733d5f740813cd575b285e26cff1d6a4c5a97ef53e1e1e471907b3fd00558d0` |
| Native live-creation owner | `native selection in commands.txt` | 0 | `native.log` | `e12d8858a899b1e43abaca239f95ae80307449ac2340ef1f3d0f78fbc8f2c9c8` |

The plain run passed six files and 1,524 tests in 2.81 seconds:
H1 forms 13, define builders 1, LV1 forms 29, validator cases 67,
definition corpus 1,413 and generated assets 1. The native live-creation
file passed one test in 7.17 seconds wall time, with a 30 ms case duration.
These counts and durations come from Vitest's raw output and JSON reports.
No final-source check failed or ran twice.

The initial define-test compiler lacked prettier in this old dependency
view. A local link reused CF-1's existing locked prettier 3.9.10. Its
path and package hash remain in both evidence records. No installation,
manifest or lock change occurred. The earlier failed compiler stays
failed; the final seven compiler contexts pass. Actual escalated power
reads showed AC Power and powermode 0 at both ends. No full gate ran.

## Open limits

- H1 request `71bb8559` and LV1 request `36496b5c` own one combined gate
  and kernel/checker review before landing. The branch must take any new
  main before that gate. The validation slot is released.
- LV2 owns the live turn and runtime admission. LV3–LV5 own live reads,
  the watch, package tools, replay and later documents. LV1 adds no live
  runtime API or creation family.
- The review must name the two live-note amendments and the generated
  asset command. LV1 adds nothing to K1 or K4. H1
  carries its own ruled addition of the order scope kind.
