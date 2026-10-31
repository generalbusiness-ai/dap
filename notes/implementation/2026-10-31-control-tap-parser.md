# Keep assertion evidence through long TAP diagnostics

This change serves request `0bcf9984a08c175522c784852a38fd2623104bde`
under promise `ad69910f30dd35e103eaecf1fd2d20138f174b19`.

`scripts/control.mjs` now reads each Node TAP diagnostic through its own
closing indentation. A nested ellipsis in a long Buffer diff no longer
ends the diagnostic. Only fields at the diagnostic's own indentation
supply `failureType` and `code`. Message text cannot supply assertion
metadata or nested TAP results. An incomplete diagnostic stops at the
next outer record and cannot borrow its fields.
Only stdout supplies TAP records. Stderr remains separate retained output
and cannot supply assertion authority.

The helper still requires a passing baseline, comparable case counts,
loaded files, no timeouts and an assertion matching `--expect` when given.
It never treats an exception message as proof of an assertion. Exit codes
remain 0 for distinguishes, 1 for survives and 2 for inconclusive.

On an inconclusive result, the helper retains the actual child's stdout
bytes and separate stderr in its existing fresh scratch directory and
prints that directory. Node stdout uses before.tap and after.tap. Vitest
stdout and JSON reports remain separate. Early usage refusals create no
scratch directory. Conclusive outcomes keep their existing cleanup.

The new three-case Node owner exercises the real control CLI. Its long
Buffer failure comes from Node's actual assertion formatter. Its thrown
message attempts to spoof fields and nested TAP. Its deliberately
incomplete scripted TAP checks the reader boundary, not native authority.
Binary markers distinguish exact retained bytes from UTF-8 replacement.
The owner prints retained synthetic-output paths for later evidence.

## Evidence

The first focused capture at 66e324d3a306fd28f4edc2d7c995c53ef91f7037,
tree dc299c401117e0bd15fcb50703071b827015e449, returned child/capture 1.
All six existing fixed-runner cases passed. All three new cases failed
before parser coverage: the synthetic launcher inherited NODE_TEST_CONTEXT,
so the observed Node emitted binary child-reporter records instead of TAP.
The fixture now removes that variable only from its new CLI environment.
This observation concerns the pinned local Node, not every Node version.

| Check | Command | Exit | Output SHA-256 | Wall seconds | Host child CPU seconds |
| --- | --- | --- | --- | --- | --- |
| Precommit message input at dirty b1069bf | Maintained checkMessage on exact message | 0 | 32a45b2a0dfc651ccd5a8355d6f4cb56b8a6b1bc10cbd8281506e37622317d19 | 0.068852 | 0.067385 |
| Combined owners at clean 66e324d | node --test scripts/test.test.mjs scripts/control.test.mjs | 1 | 9daaf65663b824413011a54cb4d6900b5d6be18d2f8d877a22cfaed080b2bf2f | 2.283410 | 2.589323 |

These provisional captures live under
`/private/tmp/artroom-control-tap-parser-checks-20261031-v1`.
The failure receipt is
c9289e4b2f91dd6fddf676c45e4bc9dd008622bdc86218904f665b933be85994.
Both runs closed completely without dropped bytes or Source changes.
Costs describe commands, excluding snapshot guards and collection work.
Host CPU excludes guest CPU. Cache and host load were not isolated.
The corrected control owner and one old-parser control remain pending.
The unchanged fixed-runner owner does not need another run. Root owns
the final gate, durable retention and review.

## Limits

S4's first control remains inconclusive. Its raw child TAP was discarded,
so this repair does not prove that this parser defect caused that old
result. A new reproduction can establish the defect without reconstructing
missing historical bytes. This task changes neither timeout policy nor
the authority of a test result. Raw evidence may still need separate
durable retention under docs/testing.md before review.
