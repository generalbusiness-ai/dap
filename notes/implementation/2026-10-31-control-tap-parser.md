# Keep assertion evidence through long TAP diagnostics

This change serves request `0bcf9984a08c175522c784852a38fd2623104bde`
under promise `ad69910f30dd35e103eaecf1fd2d20138f174b19`.

`scripts/control.mjs` now reads each Node TAP diagnostic through its own
closing indentation. A nested ellipsis in a long Buffer diff no longer
ends the diagnostic. Only fields at the diagnostic's own indentation
supply `failureType` and `code`. Message text cannot supply assertion
metadata or nested TAP results. An incomplete diagnostic stops at the
next outer record and cannot borrow its fields.

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

Focused verification and the one old-parser control are pending at this
initial implementation checkpoint. No test, gate or control result is
claimed here. Root owns the one final gate and review after focused work.

## Limits

S4's first control remains inconclusive. Its raw child TAP was discarded,
so this repair does not prove that this parser defect caused that old
result. A new reproduction can establish the defect without reconstructing
missing historical bytes. This task changes neither timeout policy nor
the authority of a test result. Raw evidence may still need separate
durable retention under docs/testing.md before review.
