# K1: consolidate shared helpers

Request `b1212999e370e4936b14138e381446047b18d92d`, builder promise
`1b758ab79406a126c390fca8a5e14b0b76fa9405`. This is interruptible filler
behind G5a, G5, S2a and S2b. Preparation starts at actual Main
`dba3e76237250b6ce205d511691554de3d809baf` in an isolated checkout. No
frozen demo or review view is changed. This first checkpoint is incomplete:
the other named helper families still need their semantic comparison,
consolidation or distinct names. No whole gate, Source or review is claimed.

## The first shared families

Bytes now owns `same`, `natural` and `freeze` in `src/values.ts`, alongside
its existing `isRecord` in `src/records.ts`. Identical local implementations
import these functions. `same` preserves canonical JSON equality and its
errors; `natural` preserves nonnegative safe integers with negative zero
refused; `freeze` recursively freezes already owned acyclic JSON and
returns the original value. Its prior callers either ignored the result
or returned that same value. No validation or cloning is added.

Derive's public `same`, the host-wiring export and Counter's browser model
continue to export their existing names as aliases of the one bytes
implementation. Existing tests and their assertions are unchanged. Page
assets are rebuilt from source and their existing comparison passes.

Similar names with different behavior keep that behavior:

| Name now | Meaning preserved |
|---|---|
| CLI `sameOptional` | Undefined compares only with undefined before canonical comparison. |
| Platform `sameCanonicalStanding` | Invalid canonical values compare false instead of throwing. |
| Git `sameObjectBytes` | Exact Uint8Array length and byte equality. |
| Scope `sameHealthKey` | Compare only binding and scope fields. |
| Page `hasScopeRefFields` | Existing permissive string-field check, not the strict bytes reference guard. |
| Replay `hasHeadFields` | Existing source header check accepts a string hash before replay validation. |
| CLI `verifyScopeCommand` | Public command behavior; `verify` remains its export alias. |
| Replay `verifyHistory` | History verification; `verify` remains its export alias. |
| Scope `turnDeadline` | Existing turn deadline with its own LATE symbol and catch behavior; `within` remains its export alias. |

Only identifier references and export aliases change for these variants.
Public command spellings, messages, error classes, permissions, native
rules and all pinned definition data stay unchanged.

## Before and checkpoint counts

The same command produces both inventories:

```sh
rg -n '^(export )?(const|function) (isRecord|natural|same|text|fail|record|freeze|keyOf|integer|json|ascii|stop|bytesOf)\b' packages/*/src apps examples --glob '*.ts' --glob '!*.test.ts' --glob '!**/test/**' --glob '!**/test-support.ts' --glob '!**/testing.ts'
```

The retained files are `/tmp/artroom-k1-helper-before-20261019.txt`,
`...helper-checkpoint...txt` and `...helper-counts-checkpoint...json`.
This is a count of matching top-level declarations, including the owner,
not a claim that every matching name has identical semantics. In
particular `text` includes decoder instances and domain text validators.
The planner's exact survey command was requested so differing inclusion
counts can be reconciled before the final report.

| Helper | Before | Checkpoint |
|---|---:|---:|
| isRecord | 9 | 1 |
| natural | 12 | 1 |
| same | 21 | 1 |
| freeze | 9 | 1 |
| integer | 8 | 8 |
| record | 9 | 9 |
| keyOf | 8 | 8 |
| text | 22 | 22 |
| json | 6 | 6 |
| ascii | 6 | 6 |
| fail | 14 | 14 |
| stop | 4 | 4 |
| bytesOf | 4 | 4 |

## Refuse new copies

`scripts/check-shared-helpers.mjs` parses the actual bytes runtime exports
and source declarations using the TypeScript parser already locked with
Vite/Vitest. It executes no project source and installs no package. It
follows barrel and named re-exports to the original implementation, skips
type-only exports, and includes new untracked source files. A file-local
function declaration or function expression that redefines an exported
bytes name refuses with its owning path. Imports and public aliases are
allowed; a different meaning needs a distinct name. Tests, comments and
strings containing example code are not implementations.

The gate runs it before typechecking. Its two Node cases join the existing
explicit Node list; no existing test assertion or case limit changes.
The first checkpoint's actual source check passes across 503 files and 133 exports.
A first alias-aware source check failed because it treated the forwarded
contract module as a relative path. Resolution now uses Node's existing
module resolution without importing it; the failed original is retained.

## Focused evidence and limits

All logs have prefix `/tmp/artroom-k1-` and date 20261019:

- `shared-values-owning`: eight Node files, 25 cases pass (64568 closed
  zero). Existing package/projection ownership and freezing, agent-key
  parsing, operational replies and publication-standing cases are used.
- `shared-values-native`: four files, 11 cases pass (7993 closed zero):
  actual native archive privacy/prefix, session preparation and application
  projection ownership. Their existing TEST boundaries remain unchanged.
- `distinct-helpers-owning`: four files, 11 cases pass (41722 closed zero):
  CLI verification and retained invitations, Git application blob reading
  and replay source ordering. Existing stand-in labels remain unchanged.
- `shared-values-{bytes,client}-types` and
  `shared-values-corrected-{derive,git,mcp,platform,replay,scope}-types`
  pass all eight package compiler commands. The first six downstream
  commands failed for five newly unused canonicalize imports; those
  imports were removed and the failed originals retained.
- `distinct-helper-{cli,platform,replay,scope,page}-types` and
  `shared-counter-types` pass after the semantic names/export aliases.
- `duplicate-guard-resolved-owning` passes both Node guard cases;
  `duplicate-guard-resolved-source` passes the actual source check.
- `duplicate-guard-control`: baseline passes both cases. Removing only
  the refusal produces one unchanged new-source assertion failure, with
  no timeout. The script restores exact source in `finally`, SHA-256
  `3582e12cbb86eb2e7076059d2f8b6463249044ef4b998efd3d435a95f0730350`.
  Its script and separate baseline/without-refusal logs are retained.
- `page-assets-build` succeeds and `page-assets-owning` passes the existing
  asset comparison. No package assets are published.

All originals have terminated. No source changes occurred during any
related compiler, focused test or control. Private copy-on-write
dependencies contain 5,498 regular files with distinct source inodes and
31 contained links across seven installed module roots; the copied lock
stamp matches SHA-256
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.
An initial copy probe encountered an ignored legacy packages/lanes folder
that is absent from Main; selecting actual workspaces from the new
checkout fixed that setup. No dependency install or manifest/lock dependency
change occurred. The root test script alone adds the new Node witness.

The remaining families, final same-command count comparison, integrated
gate and exact-head review are still required. Demo/cohort work preempts
this checkpoint. Nothing here authorizes landing, publishing or deployment.

## Second checkpoint: wire text, record meanings and replies

Five copies of Git's byte-to-code-unit conversion now import `ascii` from
`packages/git/src/ascii.ts`. The loop preserves every byte's numeric code
unit, including values above ASCII. Destination's existing latin1 decoder
has a different decoding policy and is named `latin1Decoder`; its behavior
is unchanged. The bounded SQL JSON text expression now lives in
`sqlite.ts` as `sqlJsonText` and Archive privacy imports it. Its SQL string
and internal path arguments stay exact. The local inventory found one
such declaration; other matches named text include distinct validators,
decoder objects and constructors. The requested survey command remains
needed to reconcile the planner's description of fourteen SQL helpers.

Three nonnegative safe-integer checks import bytes `isLocalId` under the
existing local alias integer. These checks continue to accept negative
zero. The metrics checks retain their stricter negative-zero refusal and
31-bit bound by using shared `natural` plus that unchanged bound, under
the name `metricInteger`. Projection's throwing range validator is
`projectionInteger`, the MCP argument reader is `integerArgument`, and
Counter's declaration factory is `integerField`. The latter constructs
exactly the same pinned data; its existing definition witness passes.

Identical boolean record checks now import bytes `isRecord` under their
existing caller alias record, including Page's nested check. Different
record operations are named `recordShape` (bytes guard constructor),
`projectionRecord` (bounded throwing projection dictionary),
`matchesRecordMembers` (Destination's own optional-member policy),
`githubRecord` (GitHub response admission), `holdRecord` (capability state
lookup) and `recordOrNull` (Site host's nullable result). No differing
optional-member or error policy is merged.

Jam's `record(log, entry)` is a musical log writer, with no shared JSON
guard semantics. It stays at its original public name and exact source
bytes: the managed deployment recipe binds seventeen source modules and
nineteen public bodies. A proposed internal rename was restored before
this checkpoint; neither the historical record nor its assertions is
rewritten. Both existing managed-asset cases pass. The same constraint
applies to Jam's distinct musical keyOf operation in the remaining survey.

The Scope Worker and Room dispatch now import one `jsonReply` from
`scope/src/response.ts`. The application route calls it through
`applicationJsonReply`, retaining its extra nosniff header. Content type,
no-store policy, status, serialization and body remain the callers' exact
values. MCP's RPC-specific reply remains `rpcJsonReply` with its existing
caller-header policy; its descriptive formatter is `describeJson`.
SQLite's parser is `rowJson`. These have different inputs/results and
are not forced into the Worker helper.

Projection errors use one `projectionFailure` constructor path beside
their existing error class. The fact-time adapter retains its fixed
unavailable reason through `unavailableProjection`. Archive prefix,
inventory and privacy share `stopArchivePrefix` beside the original
error class. The error classes, reasons, defaults and throw behavior stay
unchanged; remaining different error families still need their own names.

The guard now reads all runtime entry points from bytes package.json,
including application and application-v2, and follows their actual
re-exports. It passes 505 source files against 173 exports. It correctly
refused the proposed HTTP helper name applicationJson, already owned by
the bytes validator; applicationJsonReply states its different meaning.
The guard's two Node cases pass after the entry-point expansion.

An actual gate counterexample creates one owned, untracked source file
that redefines projectionFailure, exported only through application-v2.
The baseline passes; the gate refuses that file and names its actual
bytes owner without executing it. The script deletes the probe in
`finally` and verifies that the guard is unchanged, SHA-256
`6b5146974b1b8b66f54f0e883cb877ab2d5e62554b661685dcbb3dfffb2da28d`.
Script and baseline/refusal/summary logs have prefix
`/tmp/artroom-k1-public-entry-new-file-` and date 20261019.

Further focused logs, with the same K1 prefix/date:

- `wire-record-integer-owning`: seven files, 26 cases pass (15813 closed
  zero); actual local Git tests retain their confstr temporary-directory
  warnings. No assertion or timeout limit changes.
- `wire-record-integer-native`: five files, 24 cases pass (83219 closed
  zero), covering native SQL privacy, metrics, proof bytes, signer evidence
  and demo creation. Existing native/TEST boundaries stay unchanged.
- `shared-error-reply-owning`: the three bytes files pass seven cases.
  MCP's local HTTP beforeAll could not listen on 127.0.0.1 in the sandbox
  (EPERM); it then hit its original ten-second hook bound and an afterAll
  close of an uninitialized server. All nine HTTP cases skipped. Original
  49268 closed nonzero and remains failed evidence.
- `shared-reply-http-loopback`: only that HTTP file reruns with loopback
  access; all nine cases pass (47701 closed zero). No source or deadline
  change, and no rerun of the three already passing bytes files.
- `shared-error-reply-native`: three files, ten cases pass (13244 closed
  zero), including actual archive refusals and application HTTP routes.
- `wire-sql-{git,scope}-types`, `record-page-types`,
  `record-integer-{bytes,derive,git,mcp,platform,scope}-types`,
  `shared-reply-{mcp,scope}-types` and `shared-errors-{bytes,scope}-types`
  all pass. Every original is closed.
- `preserved-jam-assets` passes both existing Node cases with exact source
  and deployed bodies. `record-page-assets-build` and
  `record-page-assets-owning` rebuild and verify Page's maintained asset.

The same grep is retained as `helper-second-checkpoint...txt` and
`helper-counts-second-checkpoint...json`. Relative to the original:
ascii 6 to 1; record 9 to 1 (Jam's separate operation); integer 8 to 0
and json 6 to 0 after imports or distinct names; fail 14 to 9; stop 4
to 2; text 22 to 21. The four first-checkpoint families stay at one each.
keyOf remains eight and bytesOf four. These and the remaining text/error
families still need completion. No existing test assertion changed. No
whole gate or Source review has run, and demo work still takes priority.

## Implementation ready for its gate

The remaining families now have shared implementations or explicit names
for their different meanings. Storage-key formats stay exact:
jobStorageKey, attemptStorageKey, bindingKey, attemptKey,
identityStorageKey, startStorageKey and listStorageKey name their separate
inputs and records. Derive's existing keyOf export remains an alias of
bindingKey. Jam's unrelated musical keyOf stays at its recorded source.

Byte operations are envelopeBytes (canonical custody JSON size),
replyBytes (ordinary reply JSON size), sqlBytes (SQLite buffer conversion)
and objectIdBytes (Git object-ID decoding). Paging's bytesOf export remains
an alias of replyBytes. None exchanges its serialization or copy policy
for another's. Scenario, package, view, view-parameter, GitHub, blob,
content and admission failures have distinct names and retain their
existing error classes and arguments. The package validator's fail export
remains an alias. Git's HTTP readers now share the nonthrowing
unreadableGit error constructor; their caller still chooses throw or
rejection. stopCall and stopCommand keep their different result types.

Bytes owns stringOrNull for the two identical optional-string readers.
Git's three strict journal decoders share decodeGitText, preserving fatal
UTF-8 refusal and the retained leading byte order mark; Git operations use
bytes utf8 for encoding. Default process and Site decoders keep their
different replacement/BOM behavior under explicit names. queryText,
configurationText, wellFormedText, callResultText, displayText,
outcomeText, viewText, packageText, registerText, destinationText,
textNode and shelfText name different validation, rendering or construction
policies. Their empty-string, byte/character limit, NUL, surrogate,
fallback and error rules are unchanged. Nullable Site and throwing GitHub
record adapters now call the shared isRecord decision too.

A draft identifier-only rename had also renamed Destination's unrelated
local record variable. The scope-aware audit restores that local binding
and its references while keeping the actual helper named
matchesRecordMembers. The same audit of every earlier helper rename found
no other such change. It handles parameters, block/loop/catch bindings,
property keys and public aliases separately. Its first text pass exposed
a type-annotation span in the parser's binding node: all six compilers
stopped at the resulting implicit-any parameter in wellFormedText. The
original Check annotation is restored, and identifier replacements now
preserve that span. These failed originals remain in
`shared-text-{bytes,platform,git,mcp,scope,checkers}-types` logs. Corrected
commands all pass. The scoped tool, mapping files and repair log are
retained under `/tmp/artroom-k1-` for review; they execute no project code.

Final inventories repeat exactly the command above, retained as
`/tmp/artroom-k1-helper-final-20261019.txt` and
`...helper-counts-final...json`:

| Helper | Before | After |
|---|---:|---:|
| isRecord | 9 | 1 |
| natural | 12 | 1 |
| same | 21 | 1 |
| freeze | 9 | 1 |
| ascii | 6 | 1 |
| integer | 8 | 0 |
| json | 6 | 0 |
| text | 22 | 0 |
| fail | 14 | 0 |
| stop | 4 | 0 |
| bytesOf | 4 | 0 |
| record | 9 | 1 |
| keyOf | 8 | 1 |

The last two are Jam's distinct recorded domain operations. This is a
reduction from 132 to seven matching declarations, achieved by imports
and by naming different meanings. It is not a claim that 125 identical
function bodies were removed. The SQL helper has one original declaration
and now one owning declaration in SQLite. No exact alternative planner
grep arrived during preparation; this explicit repeatable baseline is the
comparison used, rather than an unexplained different count.

The guard passes 506 source files against 174 runtime exports across all
public bytes entry points. Existing test files and their assertions remain
unchanged; its two Node cases are the only new cases. No case deadline,
Vitest worker setting, pinned definition body, default cohort, storage key
or wire schema changes. The final Page asset is rebuilt and its existing
comparison passes; Jam's source, asset record and nineteen bodies are exact.

Further owning evidence, with the same K1 prefix/date:

- `distinct-errors-keys-{bytes,derive,git,mcp,scope,cli,checkers}-types`
  pass. `shared-text-corrected-{bytes,platform,git,mcp,scope,checkers}-types`
  and `shared-text-page-types` pass after the annotation correction.
- `complete-helper-types` passes the full project typecheck after the
  scoped correction and final shared helpers (83527 closed zero), including
  all workspace and root script, browser and Grow targets.
- `text-storage-errors-owning`: fifteen files, 95 cases pass and one
  existing case skips (85211 closed zero). These are the unchanged owning
  view/parameter, journal/object/GitHub/snapshot/read, SQLite custody/budget/
  resource, Page custody/list/member, checker runner and Lending shelf cases.
- `text-storage-errors-native`: five files, 37 cases pass (1929 closed
  zero), covering actual operations, register/destination hosts and Site
  routes/host. Their existing TEST provider/transport boundaries stay
  labelled; no live provider or deployment result follows.
- `final-page-assets-build` and `final-page-assets-owning` pass after the
  final Page changes. `git diff` confirms no existing test file changed.

All originals have terminated, with source stable during each related
process. The required gate, its natural terminal result and exact-head
Source/review are next. This checkpoint is not that gate or an approval.

Before that gate, the existing Main pretest compatibility script adopted
the owned Cloudflare pool package view: version 0.22.0, copied false,
bundle SHA-256
`8d3d115037c749cce1e8cb26bc70ba08e215aaaa357e4eae9f0c1577277c5855`
to `cd50d18adce92adb54a3f00410d646b2fe09b3f12c5b833c492bcf5857621b39`.
The earlier focused runs precede this dependency adoption. A second
verification reports the same cd50 hash before and after, so the required
gate will use that stable adopted view. Both logs are retained as
`pre-gate-pool-compat` and `pre-gate-pool-verified`. No package was installed
and no lock or dependency manifest changed; the patch is to the private
copy, outside any original process and before its gate snapshot.
