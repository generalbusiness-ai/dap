# Bind validation to the definition format

Request `2e714fd7fdaa4427f3a6cf7790ee11211c2b3a86`, under promise
`0e723de43c51d88dfdac81805c26556fac74f99d`, implements K9 only. It binds
`artroom-definition-1` to its compatible validation checks. It introduces no
new format, scope kind, platform name, capability, tool family or record model.
Kernel placement follows [docs/kernel.md, section 7](../../docs/kernel.md#7-rule-for-adding-to-the-kernel).
The ordinary gate and exact-candidate review report are filed separately.
The prior head's passing gate does not cover the packaging correction below.
No hosted result is claimed here.

## Compatible validation

The public `validateDefinition` entry keeps the existing options check,
header shape check and canonical-byte bound before selecting a check set.
The format-1 continuation lives in `packages/derive/src/validate/format-1.ts`.
The existing grammar files stay in place. The public API, bounds, profiles,
owner outcome domains and derived result fields retain their roles.

The compatibility obligation includes every shared grammar and pure semantic
helper called by the format-1 check set. Moving a stricter check into a shared
helper does not bypass the obligation. A change that rejects a previously
admitted declaration needs a new authorized format or the version of the
optional form that owns the change. An admission-changing correction also
needs explicit compatibility review.

A nonempty unknown format returns `unsupported-definition` at `format`, with
the actual format in its message. Missing, empty and nonstring formats retain
the malformed-format path. Replay preserves that format message for both a
retained pinned declaration and caller-supplied platform data. The two replay
witnesses use existing in-memory fixture authority. They show refusal of
well-hashed bytes or supplied code, not native admission of an unknown format.

The generated Page asset includes the updated validator. Its embedded hashes
match the decoded bytes and maintained build output. Page source and HTML
are unchanged. The asset review found no temporary stricter-control code;
it is a Source correspondence check, not browser acceptance.

## Named positive declarations

The [coverage ledger](../../packages/derive/test/definition-corpus/coverage.md)
links the family mappings, original constructor locations, validation contexts,
aliases, pin witnesses and explicit exclusions. Each named row supplies its
raw declaration lazily and validates it inside the test. Distinct bounds,
profiles or platform options remain distinct contexts. Existing checked
fixture wrappers continue to validate their original inputs.

Shipped declaration literals, native catalogue aliases, declaration strings,
pins, retained entries and mutation order are preserved. Rows with existing
digest witnesses also check those exact digests. Valid declarations used in
refused actions, graphs or histories remain positive rows. Deliberately invalid
declarations, partial presentation schemas and corrupted history inputs stay
in their original owners rather than being relabelled as positive inputs.

The corpus import graph does not eagerly validate declarations or build
histories. One operand row needs facts and an intent from its original pure
Scope history. Its asynchronous constructor defers that history and its
prerequisite validation until the named row runs. This is an explicit
history-dependent constructor, not a claim that every constructor is pure.

Complete fixed validation contexts are registered. Bounds calculated from
actual history sizes or post-construction quotas remain in the owning history
witnesses with their source locators. The corpus neither invents those values
nor substitutes defaults for only part of a measured bound tuple. Its finite
inventory and pin checks do not prove compatibility for every possible
format-1 declaration or establish complete replay and native coverage.

## Owning checks and corrections

The first typecheck failed because moving the continuation across a function
boundary lost TypeScript's earlier narrowing of `options.outcomeValues`.
The correction asserts the non-null type at the existing `reserving` sink.
The public dispatcher still rejects null first. No property read, runtime
guard, options object or public signature was added. The corrected full
owning typecheck passed.

The first owning Node run covered 67 files: 1,836 checks passed and three
corpus rows failed. All three were original unchecked MCP multi-board
presentation fixtures. They change Counting's board to `many: true` but retain
inherited `one: true` selections, which the existing format-1 rule rejects.
Independent classification `01cafb` excluded exactly those three mistaken
positive rows. Their raw helpers, original presentation tests, assertions and
pins remain unchanged. The validator was not relaxed.

The corrected corpus then passed all 1,218 checks: 1,217 definition rows and
one registration check. The other 66 whole Node files passed 618 checks in
the original owning run. Those include all nine derive format-boundary checks
and both replay format-refusal checks. These are attributed owning results
across the original run and corrected corpus continuation, not a single
successful rerun of all 67 files. Original logs and failures remain under
`/private/tmp/artroom-k9-owning-20261023-v1`.

## One stricter-check control

The maintained paired control selected exactly the raw
`derive/shared/small` corpus row. It passed without the mutation. Adding a
six-character minimum to the existing name check made that same row fail at
the intended corpus assertion in `definition-corpus.test.ts:9`. The control
returned `DISTINGUISHES` with exit 0. Its failure was an assertion, not an
import error, thrown setup error or timeout. The other corpus rows were
filtered out in this control and are not additional control outcomes.

The validator was restored exactly to SHA-256
`2255fa070f665bb9c0062313c0538de21d638741a99501530d4b35e48e760e45`.
The original log and restoration receipt remain under
`/private/tmp/artroom-k9-control-20261023`. This single control shows that
the registered raw row can expose this stricter admission change. It does
not prove that the corpus detects every future incompatible change.

## Public testing package closure

Source review found that extracting the public testing fixture's raw data
introduced two dependencies which the SDK producer did not copy. Its output
check also admitted only the original fixture module. Finding `775f9de` and
independent finding `389b641` made head `14690284` nonfinal.

The correction gives the producer and independent checker one explicit list:
`fixtures.ts`, `definition-corpus/fixture-data.ts` and
`definition-corpus/fixture-identities.ts`. Each still reconstructs the tracked
input set. The output boundary permits only these three modules' JavaScript
and declaration files. Existing relative-reference, bare-dependency and
unexpected-testing-output refusals remain. No corpus runner is packaged.

The new owning witness passed. It checks the real fixture's relative edges,
the six permitted emitted-shaped files, refusal when either raw module's
JavaScript or declaration file is missing, and refusal of an unrelated corpus
output. It exercises the release boundary with made-up emitted files; it does
not compile or package the SDK.

The whole Node test file returned exit 1: this new case passed and the
existing module-reference case failed with `unsupported-source-manifest`
at its existing `publishManifest` call. The existing SDK manifest and plan
drift is unchanged by this correction. No guard was relaxed to pass it.
Original command, patch, output, timing and exit remain in
`/private/tmp/artroom-k9-sdk-closure-owning-20261023-v1`.

The ordinary gate at prior head `14690284` passed 3,455 tests with three
skipped, then 37 Node checks and 55 Counting Node checks. Its finite
evidence is recorded under `69bb355d`; that result belongs to the prior head.
The corrected candidate's gate and exact-head review remain external
acceptance steps. This note does not replace them or erase the initial
compiler and corpus failures, the packaging finding or the separate SDK
manifest failure.
