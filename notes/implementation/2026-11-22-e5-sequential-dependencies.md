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

## Full gate and scheduler repair

The full gate on `b93aa01dd7e8537b5cc9376ead777bfe85ac2a1c`, tree
`5a886553425ef91e6b5669478890de7a84894e1e`, exited 1 in 817.44
seconds. Static checks, typecheck, pins, kernel, Node (246 cases) and
Counting (60 cases) passed. Plain reported 5,106 passes, one skip and
one failure. The existing 400-seed client test reached its 600-second
deadline. Native remained unreached. Scale selected omit.

The bounded trace reaches seed 1, step 3. The request retains an
authorization for a subject with pending work and waits for its
source before it reaches custody. The test had armed a store-write
fault. The fault never runs because the test awaits this request
before it performs the next delivery or clock action.

Ruling `33a3ecda` keeps the production wait and changes the generated
scheduler. It keeps a call pending after observing the exact unsigned
authorization, runs the scripted feed, delivery and clock changes,
and checks the same invariants after the final drain. The existing
request oracle still compares custody status and predictions.
A separate oracle checks the unsigned authorization rows against
the retained source, checked replica evidence and clock. The test
keeps 400 seeds, 80 steps, and its 600-second deadline.

The files below are relative to
`~/play/artroom-evidence/2026-11-22-b93aa01-e5-gate/`.

| Check | Result and SHA-256 |
| --- | --- |
| Original full gate | Exit 1 in 817.44 seconds. `gate.txt`, `53c9a9c14ab3cab1858273ab6f2955662c9f2a1fd05e846411233a59753afc84`. |
| Bounded request trace | The last foreground marker completed the retained preview. The request never reached custody send. `diagnosis/logs/phases.log`, `751eca1133e06b727785f723b8ded9e248f359159eabd0041a3afc4d79b8d335`. |
| Whole generated owner before the final drain assertion | Four passed, including 32,000 steps, in 458.28 seconds. `scheduler-focused/owner-reviewed.log`, `cd72eaf3bb0ad02c258c2dc855abf67080af10f5e3e716d1366e466499abb868`. |
| Final drain smoke | One selected case passed with four seeds in the scratch copy. `scheduler-focused/sample-final-drain.log`, `3862dadcf70928c8c9a3ea2750f8529f70219ee91eb7faab3dbe8b3eb57960e4`. |
| Final client test compiler context | Exit 0 in 0.466 seconds. `scheduler-focused/tsc-final-drain.log`, `a0b01579e98cf2c1383d3fe0001bb34fa46bc6ac1eed585e6648f7f6556e2be2`. |
