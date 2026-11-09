# Format JSON source while preserving protocol bytes

Request `c6e29874`; promise `197ace07`; scope ruling `85784814`.
This preparation starts at main `ce0290fb`. It has run no formatter,
producer, compiler, application test, control or gate. R16 owns the local
validation slot.

## What changes

The root adds exact Prettier `3.9.10`, a tracked-JSON `format:check`, and
a formatting step before typechecking in the gate. The formatter selects
no TypeScript, JavaScript, Markdown or `.jsonc` files. JSON configurations
that contain comments keep the `.json` selection and the formatter's
normal parser. The command uses the pinned executable and default options.

The selector excludes lockfiles, dependency directories, the published
canonical packet `examples/grow/demo/application.dap.json`, and all retained
files under `notes/implementation/evidence/`. The new Node owner checks
the actual tracked packet exclusion and ordinary source selection. Its
future-manifest specimen checks the whole evidence-directory exclusion.

Lane, Counting and Lending pin writers produce readable JSON. Their tests
compare the parsed canonical values and retain every existing digest. The
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

## Evidence due

| Check | Command | Exit | Output |
|---|---|---|---|
| Formatter and generated source | Pinned formatter and pin writers | Unrun | Due |
| Selection witness and packet-exclusion control | Complete Node owner | Unrun | Due |
| Definition and reservation owners | Affected compiler contexts and complete owners | Unrun | Due |
| Final gate | `npm run gate` once | Unrun | Due |

The preparation has changed source only. JSON formatting, pin production,
private dependency setup, focused evidence and the one final gate remain
due. No earlier branch's checks establish a result for this head.

## Open limits

Request `c6e29874` owns completion and exact-head review. The head changes
no live room and needs no deployment. Ruling `85784814` keeps canonical
packets and retained evidence outside formatting permanently.
