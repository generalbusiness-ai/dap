# Verify generic citations against independent vectors

Request: `a30f1b67`. Promise: `5a78cc01`. Source and reason ruling: `f194f905`.
Parent identifiers request: `05d618e2`.

The tested source is `377b2adbaa48c68851de87365bd3ca0edcc0c329`, tree
`25bfe076587670c52edf172d9a1479ffacf58ee4`. The complete fa6 gate failed.
One Page build repaired its generated module, and the ruled continuation
completed with all command exits 0. The aggregate preserves each outcome and
the historical carry separately. Exact-head Page and Card CI belongs in the
external review attachment after the final note and evidence commit.

## Citation integrity stays separate from Native judgment

Bytes adds `parseSequenceIdentifier` and `parseCitation` to its existing entry.
Both consume the whole string, preserve its spelling, and check digest width
and safe decimal position. Unknown format tokens retain the generic grammar,
so verification can report `incomplete/format`.

Replay adds `verifyCitation(text, source, options)`. The source supplies raw
cited and predecessor bytes. Options select the requested level, caller anchors,
depth, and an optional trusted Git hashing operation. The result has exactly
seven protocol members. Caller option errors throw before I/O. The existing
Native verifier, reference shapes, integrity mode, and judgment Replay retain
their bodies. Identifiers (c+d) still owns the Native identity, admission,
archive, and wire cutover.

The verifier copies each byte reply and hashes it before decoding fields.
For dap1, carried genesis precedes position. Correctly hashed bytes that cannot
decode as an entry report `mismatch/position`, reached 0 for the cited event
or 1 in the predecessor walk. Missing valid predecessor syntax above position
0 also stops at reached 1. The protocol's reason table records these boundaries.

Depth counts predecessor edges, including an edge to an explicit anchor.
Genesis needs no edge. Conflicting caller anchors fail before reads, and
identical duplicates trust the anchor once. Fetched or cached bytes never
become anchors. Signature failure or an absent profile preserves a successful
level-2 anchor and its trusts.

The CLI uses the `--citation` mode:

```text
artroom-replay --citation <citation> --source <file> [--level 0|1|2|3]
artroom-replay --citation <citation> --git <clone> --level 2
```

Both forms accept `--depth <edges>` and repeated `--anchor <citation>`.
The API defaults to level 3 and unlimited depth. The CLI defaults to level 3
and 10,000 edges. It prints the exact report and exits 0 for `ok`, 1 for another
protocol result, or 2 for invalid options. Existing Native argv keeps its meaning.

The file reader accepts section 7's `event` and `source` members, with no trusted
anchor member. It checks the byte bound before allocation, accepts exact UTF-8
or padded standard base64, and rejects duplicate digest claims. Syntax and
unknown formats open no byte source.

The Git reader disables replace refs and lazy fetch. It reads raw commit bytes,
uses no revision walk, and follows only the first parent header. Missing objects
remain unavailable at a shallow boundary. SHA-1 uses Git's `hash-object
--literally -t commit --stdin` without `-w`, in a fresh empty directory. This
makes no claim about a particular Git build's SHA1DC selection. Git256 hashes
the exact object header and content with SHA-256. Neither Git format has a
signature profile in this head. Integrity does not establish Native authority,
current-key standing, freshness, or collision detection by a named Git build.

## Independent expected reports and production boundaries

`scripts/identifier-vectors.py` imports only Python's standard library. Its
TEST-only signer follows [RFC 8032 section 6](https://www.rfc-editor.org/rfc/rfc8032.html#section-6)
and checks section 7.1's first three signing answers before output. Fixed public
TEST seeds are not custody keys. The illustrative signer stays outside
production code, and its ASCII-key, safe-integer JSON writer claims no general
JCS implementation.

The producer ran once at `372f5ff5` and wrote six files: 30 dap1 cases and 26
each for git and git256. Dap1 includes signed founding, act, and preparation
entries, unsigned delivery, and an alternate unsigned genesis. Git includes a
second parent and literal UTF-8 content. The 82 rows are fixture comparisons,
not 82 registered cases. Tests consume the adopted files and compare complete
reports. They never run the producer or derive expected reports with dap code.

The real-Git owner retains TEST replace-ref, graft, and shallow-object stores.
Other histories keep their stated stand-in limits. The unchanged maintained
`sourceSeal` read the Bytes index once and called native `parseAst` once,
producing `7c8c95148c4af026aa1416b4f2d9ce8e53b33343a49bf27d1875a86e2d5c07b7`.
Adoption keeps every AST inventory assertion. A raw file
hash does not replace that AST value. Act `fcdf80ee` corrects an abbreviated
receipt-hash reference in END `31064c88`, without changing bytes or repeating
production.

## Actual checks and the bounded continuation

The repaired-head cheap working checks ran after the continuation; each exited 0.
The planner's disposition of ordering request `d7b0514b` belongs in the
exact-head review attachment.

The 43 affected compiler contexts completed at `372f5ff5` after resolution of
all 45 maintained contexts. Their correspondence remains historical. The fa6
focus ran zero compilers, 24 Node leaves, and 145 Plain cases across twelve
whole owners. Six Node wrappers remain UNKNOWN. Both runtime children and
enclosing commands exited 0 with no skips, retries, repeats, or unhandled errors.
Its first metadata preparation exited 1 before any runtime body. Corrected V2
metadata and the subsequent focus do not turn that first preparation into a pass.

Each citation fault ran the unchanged five-case owner with `bail=0`, verbose,
JSON, and the maintained FocusedReporter. Each child exited 1 with three named
line 22 comparison failures and two boundary passes. The predecessor-rehash
controller exited 2 because it expected a full path in verbose output. A separate
metadata-only reader exited 0 and classified the saved assertions. The later
anchor-only controller exited 0. The control continuation ran only the previously
unrun anchor fault.
Internal vector loops stop at the failed assertion, so the controls do not prove
that every one of the 82 rows ran under a fault.

The full gate and its same-run analyzer exited 1. All 45 compiler contexts and
16 typecheck scripts completed. Runtime reports contain Node 150 passes,
Counting 56 passes, and Plain 4,543 passes, one failure, and one skip. All 111
wrapper observations remain UNKNOWN, six Scale cases remain omitted, and all
1,130 Native obligations were unreached in that run. The sole failed case is Page's
unchanged build-to-module comparison. Its expected module had the same
2,435,554-byte length as the checked-in module, with different bytes.

One maintained `npm run build --workspace @generalbusiness/dap-page` exited 0
at fa6. Commit `377b2adb` adopts only `apps/room/page/assets.ts`, with its mode
unchanged. The module's SHA-256 is
`e104ec88feef46fe5a973c256873f9dc6dfcde6f62fa1282d912093f241e0530`, exactly
the output measured by the failed gate. The build alone supplies no repaired
Page-test, browser, or Native result.

Ruling `7505fa96` permits the bounded continuation instead of a second complete
gate. Its current records at `377b2adb` contain the affected helper check, five
compiler passes, one Page comparison pass, 15 Node passes, and 1,130 Native cases:
1,128 passed and two planned cases skipped. Six Node wrappers remain UNKNOWN.
The four phase children, inner runner, outer driver, launcher, external command,
and the one in-body Native analyzer exited 0. Native analysis reports no issues.
Both cleanups closed empty, and final source, tool, and dist fences accepted
unchanged inputs.

The no-read carry proof `665c0507` retains 4,735 historical runtime observations
and 40 compiler contexts at fa6. `units/bounded-continuation/files/raw-index.json`
indexes the retained proof by its full hash. `terminal-prerequisites.json` records
the original private-custody locator. The aggregate copies metadata for that
custody without duplicating its raw private payloads.
Each carried owner and program excludes `assets.ts`. Those results do not
become current compiler or runtime commands. The checker judges the failed
gate, this proof, and the separate continuation together. The same ruling
requires changed-input generators after every main integration and before a
sealed unit.

The [evidence manifest](evidence/2026-11-11-identifiers-vectors-b.manifest.json)
binds the 62 indexed public aggregate files to this source checkpoint and the
six sealed units below. Each table path names an indexed aggregate artifact.
The full aggregate manifest has SHA-256
`f632859d1a84236729b03f45784438b6e0767c1d94ab911448014f8bfdea5076`.

| Evidence and checkpoint | Actual outcome | Indexed aggregate artifact |
| --- | --- | --- |
| Independent vectors and Bytes AST seal, 372f5ff5 | Producer 0 and AST producer 0 | `units/preparation/manifest.original.json`, SHA `b5411a953860` |
| Metadata V1 and focus V2, fa6e7419 | First metadata 1. V2 focus 0: Node 24 and Plain 145 | `units/focused169/manifest.original.json`, SHA `07e7f857d5d9` |
| Two citation controls, fa6e7419 | Both children 1. First controller 2, metadata adjudication 0, anchor controller 0 | `units/citation-controls/manifest.original.json`, SHA `663033cbc8af` |
| Complete gate, fa6e7419 | Gate 1 and analyzer 1. Native 1,130 unreached | `units/failed-full-gate/manifest.original.json`, SHA `299ae5ebaa32` |
| One Page build, fa6; adoption 377b2adb | Build and enclosing exits 0. Only assets.ts changes | `units/page-build/manifest.original.json`, SHA `0b8ad987757d` |
| Ruled continuation, 377b2adb | Commands 0. Five compilers; Page 1, Node 15, Native 1,128 passed and two skipped | `units/bounded-continuation/manifest.original.json`, SHA `8487f779efdd` |
| Current case, compiler, and command identities | 1,146 current cases, including two planned skips; historical carry stays separate | `units/bounded-continuation/files/literal-case-ledger.json`, `compiler-ledger.json`, and `runtime-ledger.json` in that same directory |

The aggregate retains original unit manifests, full hashes, commands, literal
identities, and custody maps. Its 13 indexed private files contain metadata.
Original raw TEST payloads stay in their original sealed private units. The
aggregate does not copy those payloads. Archive copies use mode `0400` for
files and mode `0500` for directories; original bytes, modes, identities, and
timestamps remain unchanged. Minimum retention is 30 days after landing.
No validation body repeats during filing.

Passive RSS values remain sampled single-process observations, not heap, true
peaks, sums, or lifetime bounds. The controls and Page build retain raw observer
status `failed` with separate accepted UNKNOWN admission because the samples
contain no owned Node or workerd row. The focus sampled Node 896,304 KiB, and
the failed gate sampled Node 2,405,344 KiB with workerd UNKNOWN.

The continuation recorded 89 samples and 248 Node/workerd rows with no observer
error. Its largest sampled Node process used 2,675,712 KiB; workerd used
2,523,680 KiB. Lifetime upper bounds remain UNKNOWN. External elapsed time was
888.3013221249857 seconds. No validation or telemetry body repeated for filing.

External review attachments bind Page and Card run IDs, attempts, chosen events,
full terminal steps, and the sealed CI manifest to the exact commit containing
this note and the evidence descriptor. CI filing does not require another note
commit. Review approval, landing, cutover, and deployment remain separate.
[File test evidence](../../docs/evidence-filing.md) and the
[testing reference](../../docs/testing-reference.md) state the filing and
stand-in limits. Identifiers (c+d) remains unfinished.
