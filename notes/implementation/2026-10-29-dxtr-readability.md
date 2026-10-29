# DX-TR implementation evidence

Request `addbe5b4`; promise `5b703598`. The design and witness rewrite five
definitions with the typed authoring helpers, preserving canonical data.
[The design record](../2026-10-29-typed-surface-readability.md) contains
the measurements and reading decisions.

Implementation checkpoint
`e3cd24a808acf19bfe8159d0dc4e89f880784032`, tree
`bcc7271a354368ed9856fcd775522aabd74a4b74`,
carries the frozen focused checks.
The immutable baseline checkpoint is
`26837f826ddfea2e054c7e24b18aca990c646d2f`, tree
`a217ac7b44dd4d18099e27d54d30b4287ebe30f1`.
Base Main is `41da9810f0c2d8727b07c129b2d47149107993e7`.

Frozen checks pass: baseline TypeScript and nine pin witnesses; after
TypeScript and 18 tests; measurements; all five isolated after diagnostics;
generated vocabulary check. Both diagnostic calibrations reach an accepted
judgment on labelled in-memory derive authority.

Two focused controls distinguish wrong behavior by assertion. Bypassing
the compiler diagnostic throw makes the incomplete-definition test fail.
Reversing `take` order makes its ordered-copy test fail. Both restore source.
These are two targeted controls, not a mutation sweep.

The ordinary gate, exact checkpoint, sealed manifest, and receipt table
will complete this record before review. No gate result is claimed here.
