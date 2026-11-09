# Format JSON source while preserving protocol bytes

Request `c6e29874`; promise `197ace07`; scope rulings `85784814` and `794ef517`.
This head includes main `29926a3a`. Authoring, focused checks and the
packet-exclusion control are complete. The single final gate failed; its
unchanged source and complete original outcomes remain sealed. Planner
ruling `794ef517` authorizes the two source-size exceptions, one focused
follow-up and one new final gate. The follow-up and the new gate passed. The new gate includes all six
selected Scale cases under the original local deadlines.

## What changes

The root adds exact Prettier `3.9.10`, a tracked-JSON `format:check`, and
a formatting step before typechecking in the gate. The formatter selects
no TypeScript, JavaScript, Markdown or `.jsonc` files. JSON configurations
that contain comments keep the `.json` selection and the formatter's
normal parser. The command uses the pinned executable and default options.

The selector excludes lockfiles, dependency directories, the published
canonical packet `examples/grow/demo/application.dap.json`, and all retained
files under `notes/implementation/evidence/`. It also excludes
`examples/grow/check/dap.application.json` and
`examples/grow/check/fault-scenario.json`: the CLI reads each under
`LIMITS.metadataBytes` (65,536 bytes), and default formatting exceeds that
limit. Both files retain main `29926a3a` bytes. The Node owner checks
the actual tracked packet exclusion and ordinary source selection. Its
future-manifest specimen checks the whole evidence-directory exclusion.

Lane, Counting and Lending pin writers produce readable JSON. Their tests
compare the parsed canonical values and retain every existing digest. The
MCP inventory writer also produces readable JSON. Its owner and the Views S4
golden owner compare parsed canonical values. The
reservation fixture owner reconstructs the original canonical producer
artifact before checking its exact hash and byte count. Authoring guides
canonicalize readable declaration files before the byte-preserving
`--value` submission.

## Decisions

Ruling `85784814` amends the original all-JSON requirement. The published
Grow package reader compares its input byte for byte with canonical package
JSON. Formatting that packet would make admission refuse it. Historical
evidence manifests also have file digests in exact-head notes and reviews.
The formatter leaves both kinds intact. No release signing, publication or
packet admission changes.

The dependency metadata comes from the preserved preparation at
`d4fd8b47`. The current lock adds only the root Prettier dependency and its
matching package row; every other parsed field and package row stays equal
to main. No package installation has occurred in this checkout.

Before running any producer, the source preparation compares all 11 lane,
platform, Counting and Lending pin modules with main and requires identical
bytes. The canonical Grow packet retains SHA-256
`b1563c946435c2aad7173b5ae8a32da52c33d2a03b90faee80784c79ebcd96e9`.
Any digest change stops this task for a planner report.

## Evidence before the gate

| Check | Actual result | Manifest file |
|---|---|---|
| Formatter, explicit pin writers and final formatter check | All eleven commands exit 0 | Authoring `receipt.json`, `pipeline.exit` |
| Selection baseline | One complete Node case passes | Authoring `selection-owner.stdout`, `selection-owner.exit` |
| Packet-exclusion control | Owner exits 1 at the intended assertion; verifier exits 0 | Pre-gate `packet-control--result.json`, `packet-control--control.exit`, `packet-control--verifier.exit` |
| Views adapter owner | 26 Node cases pass | Pre-gate `focused--result.json`, `focused--owner.exit` |
| Affected compiler contexts and complete owners | Five compiler contexts and 29 Plain cases across twelve owners pass | Pre-gate `focused--focused--result.json`, `focused--focused--coverage-ledger.json`, `focused--pipeline.exit` |
| Final gate at `3a1632b5` | Exit 1: six Plain failures; Native and Scale unreached | Failed-gate `gate.exit`, `classification.json`, `summary.json` |

The [authoring manifest](evidence/2026-11-09-json-authoring.manifest.json)
has SHA-256 `f561471f1db6574f97c8565b6b0d9aa59b5120e17fbb1e712c74a6e602a3a393`.
The [pre-gate manifest](evidence/2026-11-09-json-pre-gate.manifest.json)
has SHA-256 `7f1c1a23358bb770d58ebbcd120be3573c97e12a730ce849d81c146e5b1352e9`.
Both manifests name immutable output directories and complete private inventories.

The authoring pipeline at `0bc5eb42` checked all 185 selected JSON paths
and changed 65. Every parsed JSON value and comment remained equal after
every command. Every nonselected byte stayed exact, including all eleven pin
modules, the lock, canonical packet and retained evidence. All explicit lane
writer modes, Counting, commitments and Lending writers exited 0. No
producer or saved baseline repeated after that run.

The focused pipeline at `92d7193a` used owned dependencies with fourteen
workspace bindings and 48 source aliases. The Views adapter runs over its
labelled stand-ins. The definition owners validate pinned declarations and
judge scenarios in memory. The reservation owner uses its labelled local Git
stand-in. These checks establish no live room, provider or browser result.
All selected compiler contexts and complete case ledgers passed without a
retry. Source hashes stayed fixed and both process groups closed.

The packet control reused the unchanged saved one-case baseline. It removed
only the canonical packet exclusion, then ran the same complete Node owner.
The real tracked packet wrongly entered the selected set. The assertion at
`scripts/format-json.test.mjs:13` failed with actual `true` and expected
`false`. The driver restored all tracked source bytes and checked group
closure. The original owner exit remains 1; the control verifier exits 0.

## Failed gate and approved size exceptions

The single gate at `3a1632b54ebbafc8d613711bac5a364db5130422`, tree
`071df937cf8c2bdecff7883e43c0f301c72fc826`, ended naturally with actual
`gate.exit` equal to `exit 1`. Formatting, typechecking, Node 143 and
Counting 56 passed. Plain reports 4,022 passed, six failed and one skipped
across 372 files. No unhandled error or contradictory report occurred.
The source stayed byte-identical and the owned group closed.

All six failures, in five complete owners, reach the same unchanged
pre-read allowance in `packages/cli/src/application-files.ts`. Default
formatting grows `examples/grow/check/dap.application.json` from 64,776
to 108,311 bytes, beyond `LIMITS.metadataBytes` at 65,536 bytes. The parsed
value is unchanged. A later static audit found
`examples/grow/check/fault-scenario.json` grows from 63,337 to 106,670 bytes
and uses that same allowance. The failed configuration load masks that
later scenario read; no run is claimed for the second failure.

The [failed-gate manifest](evidence/2026-11-09-json-failed-gate.manifest.json)
has SHA-256 `fe93b406f686c623eba569b05dc689079d178593324ccc93a7fccd2403e74392`.
It seals sixteen public files and the complete private inventory of 2,371
files. Native and all six selected Scale cases remained unreached.
The unchanged selection rules include Scale because this head changes the
root package, test runner and gate script. No selection or deadline changed.

Planner ruling `794ef517`, answering `68f6934d` and `2b3f7f31`, excludes
both inputs and preserves every source-read and portable package limit.
The repair restores their exact main bytes and adds both to the existing
selector witness. No production reader or allowance changes. The current
selector covers 183 JSON paths; 63 formatted source files remain changed
against main. The original authoring run's 185 selected and 65 changed
counts remain its actual observations.

The ruling requires one healthy selector owner and the five complete failed
owners, then one new full gate at the final head. This is an explicit
exception to the ordinary single-gate rule. At `dc344d58`, the selector's
one case and all eight cases in the five complete failed owners pass.
No TypeScript source or compiler input changes in this repair, so the
follow-up repeats no compiler context. Every source hash remains fixed and
the owned groups close.

The [size follow-up manifest](evidence/2026-11-09-json-size-followup.manifest.json)
has SHA-256 `af2800c889a148e23737b50e4f490b4c636cc6a275e64b0cc18a04a449ab549b`.
Its `focused--result.json` and `focused--pipeline.exit` record the passing
Node owner and body. `focused--focused--coverage-ledger.json` matches all
eight actual case names, projects and pools. The single control reuses that
healthy baseline and removes only the two-file exclusion. The unchanged
selector owner fails the bounded-input assertion with actual `true` and
expected `false`; source restoration and group closure pass. The actual
control owner exits 1 and the verifier exits 0. No healthy baseline repeats.

Two preparation commands failed before the first test invocation: a saved
Node case lacked the `project` key assumed by the plan generator, then its
dependent driver found no plan file. Both stopped before application work.
The corrected frozen v2 driver ran once. The
[preparation record](evidence/2026-11-09-json-size-preparation.manifest.json)
labels these errors separately from that passing body.

The new full gate at `8653385e250a125be02a648c3d5c779058b1d9d6`, tree
`1da5f97f7a7ba675a8326600f4916cf9ff853f77`, ended naturally with actual
`gate.exit` equal to `exit 0`. Formatting, typechecking and every test stage
passed: Node 143, Counting 56, Plain 4,028 with one skip, and Native 1,128
with two skips. The total is 5,355 passed and three skipped. All six selected
Scale cases passed without a selection, worker-limit or deadline change.
The original gate remains failed. Earlier branches establish no result for
this head.

The [repaired-gate manifest](evidence/2026-11-09-json-repaired-gate.manifest.json)
has SHA-256 `0c7f7a6f612abee4db2c067491d6fb9eca159e40614d823406dec5fbbdc27eaa`.
Its `gate.exit`, `receipt.json`, `classification.json`, `summary.json` and
`stages.json` record the passing run. It retains sixteen public files and
2,405 private files. The source stayed byte-identical, every selected phase
has a complete terminal record, and the owned process group closed. The
analysis reports no unhandled errors, contradictions or report errors.
It reconciles 105 Node file-wrapper events across 35 owners. The wholly
skipped Page recorder module has no final duration; the actual Scope timing
summary therefore remains partial.

The gate ran on this Mac from 14:59:28.303 to 15:22:31.487 UTC on
9 November. The wrapper records 1,383.182 seconds by Python's monotonic
clock. `/usr/bin/time` records 1,382.64 elapsed, 2,620.79 user and 308.81
system seconds. These are separate measurements. The gate owned the local
validation slot and used its existing dependency copy and caches. A process
snapshot found no other validation body before the run; that snapshot is
not continuous load evidence. `caffeinate -i` held an idle-sleep assertion
for this child only. No per-case causal claim follows from it.

The seal helper's final console object inherited an `actualGateExitRead: 1`
label from the first failed-gate helper. Its assertions read `exit 0`, and
its sealed classification correctly records zero. That console label is
not the gate result. No source or test ran during analysis or sealing.

## Review wording follow-up

Checker report `f9fb645a` requests five wording corrections and accepts the
code, exclusions and evidence. Checkpoint `aa19775020b7fe7a583383a48bcca3831b81fa99`,
tree `74d72d44d407948bf41cac1df00fdda55b9047f1`, corrects those statements in the lane
README, lane entry comment, pin-writer comment and Counting README. The
exported definition paths now describe readable JSON whose canonical
values determine their pinned digests.

Against the reviewed head `4564da4e`, only those four files and this note
change. Both source-file edits affect their opening comments only; their
bytes from the first import onward match that reviewed head. Every test,
configuration, dependency, digest and executable statement stays unchanged.
The passing gate tree remains `1da5f97f7a7ba675a8326600f4916cf9ff853f77`.
No compiler, test or gate repeats for this wording follow-up. All six
immutable manifests and their 142 public files retain the same digests.

## Open limits

Request `c6e29874` owns completion and exact-head review. The head changes
no live room and needs no deployment. Ruling `85784814` keeps canonical
packets and retained evidence outside formatting permanently.
