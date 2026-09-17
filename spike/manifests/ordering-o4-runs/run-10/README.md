# Combined O4 M1 run 10

Measured source: `79cd00029504deb92c121dbf12859680dfe78358`.

One noncampaign invocation passed 508 of 512 tests, with the four retained
executing Club negatives marked TODO and no failures. All 187 O4 checks are
included in that invocation. Node, typecheck and the recording wrapper each
exited zero. No campaign or repeat full invocation was run.

`runner.py` saves each actual child exit before interpreting TAP diagnostics.
`result.json` was created by that successful runner. It retains 45 parsed JSON
diagnostics and one TAP-escaped diagnostic verbatim; `noncampaign.txt` is the
complete raw output. No repair or recovery of this run was needed. The separate
parser-only check uses historical run 9 output and synthetic input and runs no
repository tests. Run 9's missing child status remains unknown at its source.

`source.json` pins 98 source, fixture, test, contract and configuration blobs;
this broader measurement is distinct from the explicit 16-file runtime id.
All 106 observation files were captured by the tests. `summary.mjs` reads them
without executing a lifecycle or test, reproducing `actual.json` byte for byte.
The preservation indexes retain original evidence boundaries and permit only
explicit append-only Markdown corrections. `record-files.json` hashes this
directory except itself. The adjacent `run-10.json` is a derived index.

M1 catch coverage samples every converting try body on both stores, not every
operation within each body. Nominal SyntaxError, typed Scope errors and the
exact wire-message allowlist remain declared conversion limits. SQLite-only
cleanup cases are not memory cases; a failed rollback or native close is not
guaranteed to release resources. Main approval and landing remain separate.
