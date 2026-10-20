# K1: shared owning helpers

K1 replaces identical local helpers with imports from their owning modules.
Different validation, rendering, storage and error policies retain distinct
names. It includes a source check that refuses new local definitions of
bytes exports. No existing assertion, case, limit, deadline, grant, pin or
default changes. The original two Node guard cases are its only shipped
test addition.

Request `b1212999e370e4936b14138e381446047b18d92d`.
Builder promise `1b758ab79406a126c390fca8a5e14b0b76fa9405`.
This remains interruptible filler behind the demo work. The current code
head is `61a644573d1d20d0d2e5c8cd5aa87aec4f97d616`, tree
`fe905d762efa59c78c43e38e355de22a36080d7a`, on published Main `8aad37bb`.
That Main is the notes-only D1 landing over published Grow Main `7594822`.
Original approval `c79f05e9`, adopted by `c82bdbab`, belongs to the older
`5706ac22` candidate. A fresh exact-head review is required for this
integration. Its ordinary gate passes; review remains pending.

## Owning modules and distinct meanings

| Owner | Shared decision |
| --- | --- |
| bytes `records.ts` | `isRecord`; existing `isLocalId` for nonnegative safe integers including negative zero |
| bytes `values.ts` | strict canonical `same`, negative-zero-refusing `natural`, `stringOrNull`, in-place owned-JSON `freeze` |
| Scope `sqlite.ts` | `sqlJsonText`, the unchanged bounded SQL text expression |
| Scope `response.ts` | JSON response serialization, status and no-store headers |
| Git `ascii.ts` | numeric byte-to-code-unit conversion, including bytes above ASCII |
| Git journal/HTTP owners | strict `decodeGitText` and nonthrowing `unreadableGit` construction |
| Projection/archive owners | shared constructors beside the original error classes |

Canonical equality retains canonicalize's refusal. False-on-invalid and
optional-member policies keep their separate adapters. Freeze retains
in-place recursion over already owned acyclic JSON; callers retain their
copy/ownership responsibilities. `natural` excludes negative zero;
`isLocalId` accepts it. The imports preserve each caller's original choice.
Metrics keep their extra negative-zero and 31-bit bounds as `metricInteger`.
Throwing projection ranges are `projectionInteger`; MCP arguments are
`integerArgument`; Counter's declaration factory is `integerField`.
The simulator's separate min/max check is `simulationIntegerInRange`.

Different record operations are `recordShape`, `projectionRecord`,
`matchesRecordMembers`, `githubRecord`, `holdRecord` and `recordOrNull`.
No optional-member, nullable or error rule is forced into a boolean guard.
Jam's musical `record` and `keyOf` remain at their original public names
and exact source/assets. Destination's unrelated local record variable
also stays local and unchanged.

Worker/Room replies share `jsonReply`. Application replies retain their
extra nosniff header through `applicationJsonReply`. MCP retains its
separate `rpcJsonReply` caller-header policy and `describeJson` formatting;
SQLite's parser is `rowJson`. Serialization, headers, status and body
remain the caller's values. Projection uses `projectionFailure` beside its
error class; fact-time keeps `unavailableProjection`. Archive callers
share `stopArchivePrefix` beside the same error class. Other scenario,
package, view, view-parameter, GitHub, blob, content and admission errors
keep explicit names and their original classes, reasons and defaults.
`stopCall` and `stopCommand` retain their different result types.

Storage keys remain byte-exact under `jobStorageKey`, `attemptStorageKey`,
`bindingKey`, `attemptKey`, `identityStorageKey`, `startStorageKey` and
`listStorageKey`. Derive's `keyOf` remains a public alias of `bindingKey`.
Byte operations retain distinct policies as `envelopeBytes`, `replyBytes`,
`sqlBytes` and `objectIdBytes`; paging's `bytesOf` remains a public alias.
Package validation's `fail` and the CLI's `verify` aliases stay available.

Git journal decoding retains fatal UTF-8 refusal and the leading BOM.
Destination's different latin1 policy remains `latin1Decoder`; replacement
and BOM policies in other decoders stay distinct. Text policies retain
names including `queryText`, `configurationText`, `wellFormedText`,
`callResultText`, `displayText`, `outcomeText`, `viewText`, `packageText`,
`registerText`, `destinationText`, `textNode` and `shelfText`. Their empty
string, byte/character bound, NUL, surrogate, fallback and error rules
remain unchanged. Tick's own string and error policies are `tickText` and
`tickFailure`.

## Source guard

`scripts/check-shared-helpers.mjs` uses the already pinned parser to read
actual bytes runtime entry points, including application/application-v2.
It follows named/barrel re-exports and actual module resolution, ignores
type-only exports, and checks new untracked source files. It imports no
project source. A local function declaration or expression redefining a
bytes export refuses with the owner path. Imports and public aliases are
allowed; distinct meanings require distinct names. Tests, comments and
string examples are excluded.

The gate runs the guard before type checking. The current guard passes
528 source files against 174 exports. Its original two Node cases remain
in the explicit Node list. Earlier controls show the missing-refusal
variant fails an unchanged assertion, and an actual new untracked
`projectionFailure` copy, exported only through application-v2, is refused.
Both controls restore exact source and retain their original failures.
The guard is source hygiene, not a hostile-code boundary.

## Current Main integration and preservation

The original approved source, dependencies and tools remain permanently
frozen. The new owned worktree is
`/tmp/artroom-builder-k1-main-integration-20261020`. Exactly 5,499 granted
dependency regular leaves and 31 contained relative links are copied into
distinct inodes, with all bytes/hashes checked and current physical modes
preserved. Only owned-copy output caches are removed. Lock/stamp match;
no package is installed. The older grant does not encode historical modes,
so no unrecorded mode history is inferred.

Main changed 18 original K1 Source paths. The owned merge naturally stops
at eight conflicts; all 24 stages are retained before resolution under
`/tmp/builder-k1-main-conflict-stages-20261020/`. Seven source files keep
Main's feature code with the reviewed helper aliases/imports; Page's asset
is rebuilt from the combined source. Its current bytes/hash are in the
closed build receipt, and the existing asset witness passes.

Main's archive requirement, Device owner, capability fact kinds, principal
and creation context, supported cohorts and public refusals remain present.
Source-only comparison covers eleven Main bodies: seven conflicted source
files and four Grow consumers. Remaining AST nodes and literals match after
explicit helper/import/export-wrapper normalization. It is not a runtime
or complete API proof. Removed older helper declarations match the
previously reviewed base; the four owning implementation files match
approved K1. The newer Grow declarations receive their separate proofs.

The two newer Grow `same` copies use identical strict canonical equality.
Tick's local integer matches `isLocalId`; command-journal's equivalent
predicate is checked on 24 values, including a proxy that must not coerce.
Negative zero distinguishes the wrong `natural` substitution. The bounded
simulation predicate retains its range body under its distinct name.
All 429 pre-existing tracked `.test.ts`/`.test.mjs` files remain completely
byte-exact to actual Main; source mapping is not a runtime count proof.

Mappings, original stages, pure probes and failed/corrected tools use
`/tmp/builder-k1-*20261020*`. The final body mapping is
`builder-k1-main-body-preservation-v5-20261020.json`; exact test comparison
is `builder-k1-main-existing-test-preservation-20261020.json`.
The original code/gate note remains as an exact historical Git snapshot
in the review evidence, including all earlier preparation records.

## Repeatable counts

Both columns use the same disclosed command on published Main `8aad37bb`
and this integration:

```sh
rg -n '^(export )?(const|function) (isRecord|natural|same|text|fail|record|freeze|keyOf|integer|json|ascii|stop|bytesOf)\b' packages/*/src apps examples --glob '*.ts' --glob '!*.test.ts' --glob '!**/test/**' --glob '!**/test-support.ts' --glob '!**/testing.ts'
```

| Name | Main | K1 |
| --- | ---: | ---: |
| isRecord | 9 | 1 |
| natural | 12 | 1 |
| same | 23 | 1 |
| text | 23 | 0 |
| fail | 15 | 0 |
| record | 9 | 1 |
| freeze | 9 | 1 |
| keyOf | 8 | 1 |
| integer | 11 | 0 |
| json | 6 | 0 |
| ascii | 6 | 1 |
| stop | 4 | 0 |
| bytesOf | 4 | 0 |
| Total | 139 | 7 |

Counts include imports and renaming different meanings. They do not mean
132 identical implementations were removed. The planner's original
unspecified grep is not claimed. Raw commands/output/counts are in
`builder-k1-current-main-helper-counts-v2-20261020.json` and its two raw
files. The original baseline's 132-to-seven comparison belongs to its
older feature set.

## Verification and retained limits

Original process `17498` naturally exits zero at saved `61a64457`: all
owning compiler groups and both guard Node cases pass. Cost is 8.9713
seconds outer elapsed / 32.8178 child CPU. Original `13837` naturally exits
zero: twelve selected Node files pass 37 cases; five native files pass 13.
They cover package/projection validation, pins, scenarios, generated assets,
Grow predicates, actual Device installation, archive privacy, application
HTTP/projection and native demo ticks. Cost is 26.4682 seconds outer elapsed
/ 33.3150 child CPU. All 2,557 tracked source hashes stay exact before/after;
the checkout stays clean and no package is installed. Node/SCRIPTED/native
boundaries retain their original labels. No browser persistence, provider
or hosted acceptance is inferred.

Original process `23072` naturally exits zero for `npm run gate` at the
saved code head/tree above. Whitespace, helper guard and every compiler
group pass. Vitest passes 1,977 cases with three existing skips across
413 passing files and one skipped file. Node passes 33 cases and Counter
passes 55. Observed cost is 524.1319 seconds elapsed and 753.3125 seconds
child CPU; outer time including inventories is 525.6743 seconds.

The run uses macOS 27.0.1 arm64, Node 26.12.0 and npm 11.20.0. Starting
load averages are 1.8896, 1.6904 and 1.4580. Dependencies are a warm private
copy on a shared host; no exclusive-host claim applies. All 2,557 tracked
source rows and 5,530 dependency rows stay exact except Vitest's results
output cache. Lock/stamp stay exact, checkout stays clean and installs
are zero. The final report changes only this note after the passing gate;
its final tree is recorded in the review manifest, beside the gated tree.
The gate is retained without an unchanged whole-suite rerun, as required
by `docs/testing.md`.

The original phase output is retained at
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.WKasgfE0Ju`.
It includes scripted reset and retention faults, four Git advertisement
text warnings, an unclassified RPC result disposal warning and an
unclassified different-Durable-Object I/O/RefcountedCanceler diagnostic
in runner abort code. The natural zero exit and passing assertions do
not classify those diagnostics or establish stability or physical drain.

The original older gate `94836` passed 1,926 Vitest cases plus Node33 and
Counter55, with three existing skips. It belongs to `b1f611d7`, not the
current Main feature set. Its reset/retention injections, Git body warnings
and unclassified different-DO/RefcountedCanceler diagnostic stay retained;
no general stability or physical-draining claim follows.

Earlier preparation failures remain: an ignored legacy workspace copy
probe; alias module-resolution and unused-import compiler failures;
Destination's unrelated record variable temporarily renamed then restored;
a parser-span change dropping the `Check` annotation, corrected before
passing compilers; sandbox HTTP listen refusal followed by a separately
permitted unchanged HTTP-file pass. These are not silently promoted into
passing observations. The old semantic controls and independent review
remain historical evidence, not a new integrated-head approval.

Current source-only tooling failures also remain: inherited-name lookup
stopped before deferred writes; an incorrect SQL metadata path; an omitted
already-moved archive stop in normalization; and a syntax error before
Grow tool execution. A chained guard after that syntax error still saw
unchanged copies; its "after cleanup" qualification is explicitly corrected.
Fixed versions preserve exact source and do not replace any failed result.
Expected absent Grow files in the old base are recorded as newly added,
not candidate failures.

The integrated Source needs its complete new exact-head review and native
landing before publication. Actual hosted Grow acceptance remains Planner's
separate held milestone. Builder performs no Cloudflare action and no
unreviewed Source is imported from the pending K2/K3 work.
