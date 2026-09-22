# T1 repair ledger

Boundary: main `9c4e04e52ca9f16d3014c9d7d79a148bd039123e`, unchanged foundation
`7051486e`. The first draft is committed before any layer compile, checker run,
test execution or output inspection. The root separately verified unchanged
main: 517 tests, 513 passing, four existing TODOs, zero failures, plus typecheck.
That baseline run is not evidence about the declaration layer.

The first draft includes Sale, Booking, Discussion, compiler/runtime, diagnosed
shapes and exact historical witness tests. The builder read the historical
fixtures and ledgers; this is A1/A2, not the separately gated fresh author trial.

Predictions: the declarations pass the frozen manifests under their derived
client policies; all diagnosed shapes are refused; complete private aggregates
are refused; the private reference rule also closes Booking's changed-admin
hole. Source-line prediction and campaigns will be measured without changing
any acceptance expectation.

## Runs

1. `node lang/emit.ts`: refused Sale, incorrectly treating `payload.offer_id`
   used to select an authoritative offer as a payload-derived recipient. Log:
   `first-emit.log`. No checker run occurred.
2. Strict typecheck initially could not locate Node declarations in this
   isolated worktree. A local symlink to the repository's existing node_modules
   restored the same dependencies. Typecheck then found two array-inference
   issues and three missing nonce properties in synthetic evaluator events.
   These type-only corrections do not change the emitted fold semantics.
3. All three declarations emitted after correction 1. Layer tests: 22/23;
   the refused self-asserted reference carried the wrong historical witness
   link. Ten aggregate/absence tests covered all five expression sites, plus
   the sibling-expression counterexample; all those checks passed.
4. Historical witnesses: 11/11 on first run, no repairs; exact historical
   evidence is in `witnesses-run-1.json` and `.txt`.


## Corrections after the first draft

1. Audience provenance traversal now distinguishes a payload lookup key from
   a recipient supplied by payload. Found by the compiler; audience class;
   compile-caught; layer/fold defect. It still refuses supplied reference
   recipients and validates all lookup dependency expressions.
2. The diagnostic witness selector now gives self-asserted-reference evidence
   its V3-F2 link instead of matching `offers` to the late-joiner witness.
   Found by the layer test; diagnostic/evidence class (outside the seven
   semantic classes); compile-side; no fold or client semantic change.

The emitter additionally exposes the conventional package/model/namespace
exports and generated budget/invariant callbacks for existing manifest-loader
compatibility. A loader hook selects only the two candidate fixture modules;
no manifest, test body, corpus model or harness is rewritten.

