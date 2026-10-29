# dap-git

The public SDK exposes two subpaths:

| Subpath | Contents |
| --- | --- |
| `@generalbusiness/dap-git/tree-proof` | Git object IDs, commit and tree parsers, their data types, and parse refusals. |
| `@generalbusiness/dap-git/checkout-types` | The `OwnedCheckoutSnapshot` interface. |

The root package specifier is not exported. The caller supplies object
bytes. `idOf` computes their Git object ID; `parseCommit` and `parseTree`
read their structure. These modules use no repository or host transport.

The repository checkout also contains internal adapters. The public release
includes only the five pure modules needed by the two subpaths above.
