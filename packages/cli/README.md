# @generalbusiness/dap-cli

The `artroom` command for the new model: thin functions over a scope
service's HTTP routes and a signing key. [docs/cli.md](../../docs/cli.md)
says what each command does, what it prints and what it does not do yet.

The JavaScript launcher uses the package's pinned `tsx` 4.21.0 runtime
under Node 22.0.0 or later. It resolves the installed loader from the CLI,
not the current directory, and installs or downloads nothing at launch.

The room page imports its ten runtime values through
`@generalbusiness/dap-cli/browser`. That entry uses portable helpers, claim
recovery and invitation custody without the command dispatcher or Node
adapters. The package root keeps its existing exports.

| Module | Holds |
|---|---|
| `commands` | The command functions and compatibility re-exports, over a `Context`: a store, and optionally a `fetch`, a clock and a pause for waiting. Commands return an exit code and its lines. |
| `browser` | The page-facing runtime exports and types. |
| `browser-helpers` | Descriptions, expected revisions, values, held acts and invitation-link parsing. |
| `claim` | Room creation and exact retained claim recovery. |
| `command-support` | Shared outcomes, signing, reads and waits, with one stop identity. |
| `line` | `command(ctx, argv)`: a command line, read into one of those functions. |
| `store` | The config and the keys, and `memoryStore()` for a test. |
| `files` | The store on disk under Node, owner-only. Not exported. |
| `main` | The command under Node. `bin/dap.js` runs it. Not exported. |

## How to test

Repository checks that import TypeScript directly, and the full gate,
need Node 22.18 or later in the 22 series, or Node 23.6 or later. This is
Replay's existing engine range. The launcher's Node 22.0 minimum uses its
installed loader and does not state the runtime for the repository gate.

```
npx vitest run --project cli            # the key files, in Node
npx vitest run --project scope story    # the story on real scopes, in workerd
npm run typecheck --workspace @generalbusiness/dap-cli
```
