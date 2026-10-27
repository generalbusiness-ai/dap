# BR6 named declaration seals — preparation

Five large-module tripwires now use one record per named runtime declaration
plus one module-shell record. All 150 runtime declarations are selected, with
five module records. There is no body exemption: `commands.ts:entryLine` is
included among its 74 declarations. New, missing, duplicate, destructured, or
unsupported runtime coverage is refused. The ordinary gate has not run.
Gate analysis, final seal, exact-head review, and landing remain pending.

Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:aac5502169c50bc2d4460044c177817069a2e9d0` (BR6 request), `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:9b0a4edc877eda9b00b209caf14f6ada05046d05` (agreement-first promise),
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:5e61fd636812118c535662c3884165c6ad310c06` (standing queue release), and `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:15b1ed7e930c207058f5538b7b6060df8b40a307` (fresh checker agreement).
The original `b483916a` agreement
became stale when its basis question was retired. The fresh agreement restores
that basis with the same corrections and no source exclusions. Authority and
invocation records are retained as `checker-agreement-live.json` and `preparation-invocations.json`.
The agreement was ratified at `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:a00ae38899bdaffb4a5bf743d1264302a32c3cad`. It does not
constitute checker review of this implementation head.

Each explicit key is `file:declaration`, with its hash on its own line.
The module record comes first, followed by declarations in original source
order. This lets unrelated declaration edits update separate expected lines.
The counts are object 1, Worker 28, CLI commands 74, MCP service 30, and core 17.
`object.ts` gains no declaration granularity: its whole `ScopeObject` class is
one record. Edits within `ScopeObject`, `Scope`, or `McpService` still update
one class record each. Both object review categories reference the same record.

`namedSourceSeals(file, names, source)` uses the existing maintained rolldown
parser and metadata cleaning. Named functions and whole classes retain their
original AST bodies. Variable records keep the original const, let, or var
kind and declarator. The module record retains ordered runtime imports and
bindings, exports, executable statements, declaration identities, and variable
initializers. Every runtime declaration must be selected or the selector
refuses. A mismatch names the file, declaration, actual hash, and source-review
rule on one finite message line, without printing source.
Variable initializer edits update both their named record and the module record.

No production code moves or runtime behavior changes. The existing helper
source is preserved as an exact prefix. `declaration`, `load`, `servedInventory`,
`assertInventory`, `sourceSeal`, and the reviewed route document are unchanged.
The source probe compared all 74 old table entries across 73 unique owners.
All 68 nonconverted owner seals remain equal, including the three BR8 moved
owners. Imported implementation behavior remains outside declaration-seal
proof unless independently covered by its existing seal or runtime witness.

The source probe ran before adoption, against the explicit PENDING table.
Root then adopted exactly the 155 reported parser values. Before and after
test sources, adoption code, receipt, and parser provenance are retained.
Setup and adoption outer Python stdout existed only in the tool transcript;
the corresponding table rows hash receipts, not reconstructed stdout.
Retained empty setup stream files establish no richer process transcript.

The owning Node file passed eight cases: the four existing inventory controls
and four grouped declaration/module/coverage/class controls. The latter mutate
actual current sources for router and helper isolation, import source and
binding changes, initializers and declaration kinds, selection refusals, and
class construction, fields, and a private method through both object categories.
Three external controls separately break declaration content, module content,
and complete selection. Each has one healthy baseline pass and one mutant
assertion failure with child exit 1. Their parent exit 0 means distinction,
not mutant acceptance. Exact original and mutant source bytes, TAP, snapshots,
and restoration evidence remain retained. Control-helper edits add observation
only; they do not change its pass/fail decision.

All table paths are relative to `/Users/hughpyle/play/artroom-evidence/2026-10-27-br6-declaration-seals`. Command references retain argv and cwd.
Receipt hashes are explicitly distinguished from process streams.

| Check | Command or receipt reference | Exit | Artifact and SHA-256 |
|---|---|---:|---|
| Dependency preparation | `setup.json; retained setup driver` | 0 | `setup.json`: `45c460954f3c7f91656586d15c0baaeb4ca77527b839b00787e00ecfd9ee3649` (receipt; outer stdout transcript-only) |
| Actual parser probe: 155 records | `source-probe/result.json` | 0 | `source-probe/stdout.log`: `00be026dc89dcd056754849d61f0e92b5e4236b923c84cab6f0f9148c0fc79d1` (actual stdout) |
| Root adoption of actual parser hashes | `seal-adoption/result.json; adopt.py` | 0 | `seal-adoption/result.json`: `c7b0d916744564a93fbd37290d54406cd3be8b1a96358943c48666de76b3d2bb` (receipt; outer stdout transcript-only) |
| Owning Node file: eight passed | `owning-node/result.json` | 0 | `owning-node/stdout.log`: `7f7608fe6822e91d0f673ca49589831bdcfd7481386c62062c1d102a12a1eaf3` (actual stdout) |
| declaration-content control: parent pass, mutant assertion failure | `control-declaration-content/result.json` | 0; child 1 expected | `control-declaration-content/stderr.log`: `9cc30f178499be494ff8c57785b78e56ec49bf28198785186631adde77a095cb` (actual baseline and mutant TAP) |
| module-content control: parent pass, mutant assertion failure | `control-module-content/result.json` | 0; child 1 expected | `control-module-content/stderr.log`: `12fe6394333c399eda7e488f7525e859b699f54a3f595b7699b7511541759de6` (actual baseline and mutant TAP) |
| runtime-completeness control: parent pass, mutant assertion failure | `control-runtime-completeness/result.json` | 0; child 1 expected | `control-runtime-completeness/stderr.log`: `3908d54a7bfc029f785d24a762b14312d6a7194df8bbd5363203fb3975c4a106` (actual baseline and mutant TAP) |
| All three controls restored exactly | `control-verification/result.json` | 0 | `control-verification/stdout.log`: `2f2737f3e2357f81cbd12cb421ab4a6513674a9fc6b1d792e81d7a93b57f157d` (actual verifier stdout; source snapshots and original/mutant bytes checked) |
| Whitespace check | `whitespace/result.json` | 0 | `whitespace/stdout.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (actual output) |

The owning run observed Node `v26.12.1` on
`{"architecture": "arm64", "cpus": 18, "release": "27.2.0", "system": "Darwin"}`, load
`[2.1689453125, 1.8056640625, 1.92578125]`. Wall time was 1.632072708
seconds and child CPU 2.060470000 seconds. These are measured
observations, not performance claims. Dependency comparisons cover recorded
parser JavaScript, package metadata, native bindings, and the exact-lock stamp;
they do not assert equality of every `node_modules` file. No package installed.

This is local tripwire evidence, not Native authorization, provider, deployment,
or browser UI proof. The OPEN manifest indexes the current raw snapshot and
does not seal it. The base is `4419008a8723ccb283c8784a843aa170790bd11e`, tree `8ff173724b0efb9dc59535b056888e7145a147c3`; working sources are bound
by individual receipts and their before/after hashes. The helper SHA-256 is
`ec69658635b9c204147655e01c3b2800e6e6736c58c578a3ee0348cd7d609cf3` and adopted test SHA-256 is `72e4c1b10ceecfceca6c8ca9a00e830520962fdef98ac3f650fd58a5fcd581f9`. Gate, analysis, final evidence
index and seal, exact-head review, and landing remain due. Archive readiness
under `0f0eeab7` retains priority.

Before the gate, the branch was fast-forwarded to Main
`bb23e50fd1228019e1ac803447f08bce004b397e`. Its only upstream change was the
separately reviewed demo trust-row configuration. `latest-base-check.json`
records identical BR6 helper and test hashes before and after that update.
The preparation receipts above keep their original base; focused tests were
not repeated. The gate will bind its own clean source checkpoint.
