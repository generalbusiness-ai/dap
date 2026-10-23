# Definition-format validation

Request `2e714fd7`, promise `0e723de4`. This head addresses K9, under the
kernel admission rule in [docs/kernel.md, section 7](../../docs/kernel.md#7-rule-for-adding-to-the-kernel).
It changes no scope kind, platform name, capability, tool family or record model.

## Format selects the check set

The public `validateDefinition` entry keeps its existing bounded header,
canonical-size check, caller bounds, profiles and owner options. It selects
`validate/format-1.ts` for `artroom-definition-1`. The extracted compatible
checks and their shared semantic helpers belong to that format. A stricter
check needs an authorized new format or a new version of its owning optional
part. Moving a check into a shared helper does not escape that rule.

An unknown nonempty string format refuses as `unsupported-definition` and
names the actual format. Malformed or missing formats keep their existing
shape diagnostics. Replay uses this same entry for retained declarations
and supplied platform data; both unsupported-format reasons retain the name.
The focused replay fixtures are synthetic journals and supplied fixture code,
not native founding evidence. Their authority qualifications remain in the tests.

The declaration object, canonical bytes, digest domain and existing pins are
unchanged. The normal Page build regenerates its bundled validator. No
generated module was edited by hand.

## Corpus and original callers

The corpus registers shipped applications, examples, pinned JSON and retained
packet declarations, native catalogue versions, complete fixture variants and
recorded-history declarations. A row retains its exact bounds, profiles,
owner options, existing pin when available, and original caller labels.
Equal bytes in distinct validation contexts remain separate rows.

Raw declarations and mutation helpers are shared with their original callers.
The callers keep their validation wrappers and assertions. Corpus thunks defer
construction until a named test runs. This lets a stricter check fail a named
declaration assertion instead of stopping the whole corpus at import time.
The [registration guide](../../packages/derive/test/definition-corpus/README.md)
and [coverage ledger](../../packages/derive/test/definition-corpus/coverage.md)
describe how new definitions join, exact aliases, exclusions and measured
runtime-bound contexts that remain with their owning history witnesses.

The first selected Node run passed 1,836 cases and failed three corpus rows.
Those three original MCP multi-board fixtures change a singleton board to
`many: true` while retaining four inherited `one: true` selections. The
original fixtures test presentation/routing ports and never established
positive native declaration admission. Their unchanged source, validator
refusals and exact exclusion reasons are recorded in the MCP family ledger.
Only those mistaken positive registrations were removed. No validator rule,
original fixture, assertion or pinned bytes changed to obtain a pass.

## Validation so far

The corrected corpus passed all 1,218 cases: 1,217 named registrations and
one registry-integrity case. The earlier selected Node run covered 67 files;
the three failed registrations remain failed evidence of that earlier source.
All workspace and example typechecks passed after the recorded extraction
type corrections. These results do not constitute a full gate pass.

The single paired control selected `derive/shared/small`. Its original case
passed. A temporary format-1 minimum-name-length check then made that same
case fail by an assertion naming the declaration and its origins. The helper
returned `DISTINGUISHES`, and the before/after source hashes match. The
control is not committed. No mutation sweep ran.

The full final gate and independent exact-head review remain owed. Existing
runtime history witnesses, including native Scope fixtures, remain required;
the corpus alone does not prove those judgments or every possible format-1
input. No deployment or K9 completion is claimed at this checkpoint.
