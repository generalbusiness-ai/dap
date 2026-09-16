# K1 focused run 1

Measured clean source: `18adb0f6918c6edb0eae5b14611409f4f12e6c2d`.
Node v26.8.2. Commands from `spike/`:

```sh
DAP_O4_RECORD_DIR=/tmp/dap-o4-k1-run1/observations node --test --test-reporter=tap test/ordering-scope-participant-input.test.ts
DAP_O4_RECORD_DIR=/tmp/dap-o4-k1-run1/fault-observations node --test --test-reporter=tap --test-name-pattern='unexpected|thrown' test/ordering-scope-phase.test.ts
npm run typecheck
```

The participant regression was 0/2, exit 1. The repaired null request was
admitted and refused as malformed; immediate retry, cold state/audience/view,
and live R_sell checks passed. The next assertion incorrectly expected a
successful R_sell export before Sale acceptance. Existing export semantics
correctly throw `no_exportable_facts` at this point, even without the malformed
request. The next source corrects that test assertion to the same explicit
pre-acceptance refusal and still requires successful R_fulfil export after
acceptance, release, destination activation and both spends. This is a test
correction, not a model policy change or a passing lifecycle result.

The six existing unexpected replay/fold/audience checks passed 6/6, exit 0.
Their observations and raw output are retained. Typecheck passed, exit 0.
No full, campaign or formal O4 matrix run was performed.
