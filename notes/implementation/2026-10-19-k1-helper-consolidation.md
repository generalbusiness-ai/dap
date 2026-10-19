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
The current actual source check passes across 503 files and 133 exports.
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
