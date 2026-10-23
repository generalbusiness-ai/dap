# Native lane application test declarations

This shard registers nine contexts for five local declaration variants and
the canonical demo baseline. All use `PROPOSED_BOUNDS`, no platform option,
and the original default profile table or `RULE_PROFILES` as indicated.
Native enrollment, creation and refusal assertions remain in their owning
tests. Registration does not claim that validation has run.

| Origin | Shared raw construction | Context |
| --- | --- | --- |
| `declared-name-origin.scope.test.ts#namedApplication` | `namedChangeApplication()` renames only the arbitrary application's genesis act to `open` | Application-cohort activation and Core child, `RULE_PROFILES` |
| `declared-name-origin.scope.test.ts#definition` | `foreignDestinationChange()` adds a destination field/ref and retargets existing merge sends | Native Room helper's `valid()` and old Rulebook activation use defaults; Core child uses `RULE_PROFILES` |
| `edit.scope.test.ts#legacy` | `editChangeDefinitions().legacy` removes `propose-file` | Accepted old Rulebook activation, defaults |
| `edit.scope.test.ts#detached` | `editChangeDefinitions().detached` makes proposal content detached | Accepted old Rulebook activation, defaults |
| `edit.scope.test.ts#extended` | `editChangeDefinitions().extended` adds optional metadata and explicit `on` selectors | Accepted old Rulebook activation, defaults; actual second edit's child, `RULE_PROFILES` |
| Canonical `changeDemo` | Unchanged raw export | Edit Rulebook activation uses defaults; application-cohort activation uses `RULE_PROFILES` |

The canonical rows retain the existing `DEMO_DIGESTS.change` pin. Local
variants have no literal pin in the original tests: activation and birth
use the digest of their exact raw bytes. No digest identity was changed or
invented for a new assertion. The original pure `declaredChangeAttack`
helper remains available unchanged and is already registered by the Scope
shard; these rows name its distinct `open`-genesis application variant.

Every local variant is a positive complete declaration. The named
application's reserve is refused for its actual declared origin; the
Native extension is refused at a foreign destination. Neither refusal is
a validator failure. Canonical application creation is refused by F1's
capability restriction after activation, without making canonical bytes
invalid. Legacy and detached variants activate successfully; CLI edit
preflight then refuses their unsupported protocol before opening a lane.
The metadata extension supports the actual edit. These cases must not be
excluded because an application workflow or an intent is refused.

Entry, reply, transport, altered destination summary, path-invalid, quota
and wait-budget controls in these tests do not construct new declarations.
No validator-invalid declaration bytes are newly registered. Raw factories
preserve object spread order, clone/mutation order, original effects and
sends, including the explicit `of: "on"` extension. Both complete owning
files retain their original assertions, arguments and deadlines.

This is Source-only extraction. Compilers, corpus validation, owning
Native tests and the final gate remain root-allocated work.
