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

## Design work before the freeze

Before `6a82d61c`, review prompted three design corrections: add actual
expression-bearing derived columns; replace refusal of mixed readers with a
linked record-splitting builder; and make completeness exemptions local to
individual row reads, so a sibling aggregate is still checked. These consumed
design effort and are not counted as free merely because they preceded the
first commit. They are separate from the post-baseline correction accounting;
A4 and its fresh-author repair budget were not commissioned.

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

5. After the diagnostic correction, all 23 layer checks pass and strict
   language typechecking passes. Generated candidates committed as
   `22444f8536a8932fc758d77bb614a1424635fec3` before campaigns.
6. Both original manifest test files were run through the two-module candidate
   loader. Booking: all six predeclared cases and 200 seeds clean (12,000
   entries). Sale: all four predeclared cases clean, but the campaign fails
   seeds 35, 56, 105, 110 and 135 (11,069 entries; 81 budget findings across
   participant/frontier checks). V3-F1 also fails the private projection's
   expected null after hostile disclosure. Combined: 34 tests, 32 pass, two
   fail, 392.7 seconds. The failure log is preserved without changing its
   assertions. Historical ledger totals printed by those tests are not T1's.
7. During the campaign run, a six-step witness isolated the refused-terms
   audience error. It is accepted by the compiler and generated budget, while
   the unchanged manifest budget flags Bob at 7. This triggered the stop;
   runtime/declaration/compiler files stayed byte-for-byte at `22444f85`.
8. Evidence-only follow-up: 8/8 stop/control/regression tests and 5/5 retained
   campaign script replays pass; every single-step deletion removes the small
   witness. All five full generated failures are retained with exact nonces
   and all findings, without shrinking their original series. An unchanged
   Club negative run has three passes and four executing TODO failures.
   Final strict language typecheck passes.

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


## Stop and uncorrected findings

A1 and A3 are counterexamples for candidate `22444f85`; A2 remains unresolved
as a complete claim. No checker-caught semantic correction was made. The
accepted reader policy confuses a refused terms actor with a referenced offer
party, and the generated projection does not enforce the original party mask
after hostile disclosure. The first is an audience/maximum-readership defect,
the second a derived-projection defect. Both belong to the layer/declaration,
not to a foundation change. Their witnesses and report are the exit.

Evidence log normalization after capture: trailing spaces and tabs were removed
from `club-negative-confirmation.log` and `derived-manifests-run-1.log`.
Their text, observations and results are otherwise unchanged; no checks were
rerun and no candidate semantics changed.
