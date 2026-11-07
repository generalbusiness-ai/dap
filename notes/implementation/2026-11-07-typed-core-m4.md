# M4 guard and list migration

M4 remains in progress under request `7a36b673` and promise `393c4f98`.
The branch captures typed guard instructions and their admitted lexical
bindings. Production callers still use the legacy guard and list dispatch.
The full gate, independent review, and landing remain due.

## Shared ranges keep their semantic use

A form may reuse one range object for two capability arguments. Range lookup
now requires the argument name beside the admitted body, owning form, and
source object. The validator also records distinct uses for attribution
sources, send fields, fan-out ranges, and same-set ranges. Diagnostic paths
and digests do not select a plan. Owned copies retain their original source
identity.

The structural witness shares one range between two admitted capability
arguments. Each argument resolves its own plan. An unknown argument, a
foreign owner, and a copied body cannot borrow that plan.

| Evidence | Result |
| --- | --- |
| [Range-use manifest](evidence/2026-11-07-m4-range-uses.manifest.json), SHA-256 `f0ee3590d6ee6df980884529cf4cb3e51cf6edb6cc3d471218cc36bfa0af6c94` | Both derive compilers pass. All 43 selected cases pass; source hashes stay unchanged. |
| Same manifest, control unit | Ignoring the use key fails the alias witness by assertion: 10 pass, 1 fail. After exact source restoration, all 11 structural cases pass. |

These focused checks cover the selected owners. They do not establish the
production caller cutover or replace the final gate.
