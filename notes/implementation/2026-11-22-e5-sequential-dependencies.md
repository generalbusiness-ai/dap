# E5 sequential act dependencies

The focused rehearsal used E2 candidate `b71362c1`. E5 replayed
the same fifteen commits on published E2 `42d35b88`.

## What changed

Each dependent authorization names its sources by key and version. A
named pending source makes the dependent wait without signing. An
observed subject with unrelated pending work still returns `busy`. When
another version records under the same source key, the client returns
the dependent input for revision. The saved authorization keeps the
authored act, and the signing uses the recorded item and revision.

A private composition retains an ordered list in one store transaction.
Each step waits for the preceding step to record, even when the two acts
use different subjects. A composition can use a pending source already
in custody. The client checks its projected chain and rechecks the
captured rows and proofs before retaining the new steps.

## Decisions and why

Ruling `3154b533` uses E2’s checked standing for the hypothetical prefix.
The private replica bridge uses the same held read session and stops
when its checked cut moves or expires. An unchecked `also.via` stops
before custody, following `63f034d9`. The normal path can proceed once
the source records.

Ruling `f364097e` places public composition in the later ActEnvironment.
The private path uses the existing batch transaction. `ClientView`
represents a pending unsigned request with the authorization position,
authored act and `waits` or `source` status. E3 supplies its own public
request reference.

## Evidence

All paths in the table are relative to
`~/play/artroom-evidence/2026-11-22-e5-sequential-focused/`. Each test
command ran from `packages/client` after the tracked compatibility step.
The tests use in-memory journals and gates on scripted transport. The
authorization store witnesses also exercise both custody stores.

| Check | Command | Exit | Output and SHA-256 |
| --- | --- | --- | --- |
| Ordered composition with independent steps and a recorded source | `VITEST_MAX_WORKERS=1 node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/e5-replica-chain.test.ts -t 'a recorded predecessor supplies\|a checked composition orders independent acts'` | 0 | `composition-recorded-reviewed/selectors.log` · `215888fff0a575e201a225bde3d93f45412412d45eefa4fb6d0bbf33726a8dd6` |
| Invariant 11, six generated schedules | `VITEST_MAX_WORKERS=1 node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/scope-client-generated.test.ts -t 'generated dependent signings require'` | 0 | `generated-sequential/selector-initial.log` · `5e89595954d92de419c297c859c70baf94c409c061a907353e321b708588e80d` |
| Four composition and via cases, including a pending external source and a same-key version refusal | `VITEST_MAX_WORKERS=1 node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/e5-replica-chain.test.ts -t 'a recorded predecessor supplies\|a checked composition orders independent acts\|a local client waits unsigned\|an external pending source feeds'` | 0 | `composition-pending-reviewed/selectors.log` · `570347ae1e59402871b4433db66a51aa67bf2533ad0e1f33f907ff7907b8ff94` |
| Client production TypeScript | `node ../../node_modules/typescript/bin/tsc -p tsconfig.json` | 0 | `composition-pending-reviewed/production.log` · `71b4ef8c069a6728a494465e04cd4db46d77d6064a92ce5f03a3111890bc64a2` |
| Client test TypeScript | `node ../../node_modules/typescript/bin/tsc -p tsconfig.test.json` | 0 | `composition-pending-reviewed/test-tsc.log` · `83d3ed952f5b6d4b8977a732508e5d07c2f3c67b503a537c1116b3e0478cbe73` |

The case 3 witness returns the input after an earlier version records.
Case 5 holds the third step until the middle step records. Case 9 stops
when a pending projection cannot supply the entry-valued slot. The
generated invariant checks the exact source and materialized meaning at
the dependent signer across matching and earlier-version outcomes.
