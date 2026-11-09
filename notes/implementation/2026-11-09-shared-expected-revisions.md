# Share the expected-revision derivation

Request `b9f85b9a`, promise `eb5df2be`. This is head A of coverage report
`b8b6248d`, under DX-T0 `6f87a4e3`. Source preparation starts from main
`86179b0c`. Placement `176190ba` permits source work beside R3a's gate.

## What changed

`packages/client/src/expected.ts` now owns the expected-revision
derivation that MCP's `shape.ts` held. It resolves the target and the
`one`, `by` and chained `via` subjects over the items the caller holds.
It omits subjects that code selects and subjects the supplied items do
not resolve. The scope still checks every signed revision at its own head.

The same module owns `viaLeft` and their private subject resolver. MCP
forwards both public functions. CLI browser helpers forward `expectedOf`.
The client package exports the two functions through its existing entry.
The module imports only contract types and adds no dependency.

The Counter browser model calls `expectedOf`. Its existing missing-target
and missing-subject messages now inspect the returned keys. They do not
resolve the same subjects again. Existing Counter, CLI and MCP test
assertions remain unchanged.

The new client owner covers subject resolution, cycles, omitted code and
missing subjects, lawful prototype-like aliases, inherited fields, and
the shared resolution used by `viaLeft`. Its fixtures are plain item
records. They prove no read, signature, authority or Native outcome.

## Decisions and why

The portable module keeps MCP's own-property checks and enumerable own
output fields. A lawful alias such as `__proto__` remains in the expected
map and in its serialized form. A missing alias or input field does not
take a value from its prototype.

MCP still owns `effectiveFields`, which applies defaults and turns a
local fact into its position before resolving subjects. A fact from
another scope or incarnation stays a fact. This head changes neither
that normalization boundary nor the fields a caller signs.

`viaLeft` moves with `expectedOf` because both use the same resolver.
Keeping one in MCP would leave two implementations of subject selection.
The shared module remains a convenience over supplied records. It reads
no server, checks no grant and writes no signed input.

The following explicit revision maps stay, for these reasons. Each row
names every remaining site in the requested file or scenario.

| Site | Reason to keep it explicit |
|---|---|
| `examples/lending/browser/model.ts`, `expectedLibrary` used by `donate` and the ordinary item acts | The projection supplies captured library and item revisions, including historical gone items, rather than a complete summary for generic subject reads. |
| `examples/lending/browser/model.ts`, `publish` expected map | Publishing a gone thing keeps its captured historical revision even after the thing leaves the live summary. |
| `examples/lending/browser/model.ts`, final return for `borrow`, `return` and `cancel` | These proposals preserve the captured item and library revisions from the displayed projection until the typed-model head replaces the proposal model. |
| `examples/lending/test-support.ts`, `donation` | This fixture states the Lending opening's exact library dependency independently of the convenience derivation. |
| `examples/lending/test-support.ts`, `over` | This fixture states the target and library revision keys that the real judge must require. |
| `examples/grow/test-support.ts`, `on` | This target-only fixture helper has no act kind and intentionally leaves any additional subject revisions to the scenario. |
| `apps/counter/scenarios/application.json`, every `$revision` | The scenario authors the expected subject keys and resolves their current revisions from the fold. |
| `examples/lending/scenarios/application.json`, every `$revision` | The scenario independently states each expected dependency, including the historical publication target. |
| `examples/grow/check/fault-scenario.json`, every `$revision` | The scenario names each device and zone dependency explicitly so a missing expected subject remains observable. |
| `examples/grow/check/site-scenario.json`, every `$revision` | The scenario keeps its authored expected subject keys through creation and room-state transitions. |
| `packages/mcp/test/support/grow-owned-fault-scenario.json`, every `$revision` | This owned-room fixture retains its authored expected subject coverage rather than deriving it from the code under test. |
| `skills/dap-application/assets/starter/scenarios/basic.json`, every `$revision` | The starter demonstrates the retained scenario format whose expected subject keys the author supplies. |

These are captured-view inputs or explicit fixture maps. None retains a
second generic `one`, `by` or `via` algorithm. The scenario resolver and
all six JSON files remain unchanged. DX-T0's typed-model head and DX-T4's
story builder retain their separate obligations.

The MCP catalogue implementation, description derivations, Lending
definition, pins and `docs/mcp-tools.json` remain unchanged. Their required
before-and-after byte comparison has not run. This head must not accept
regenerated output that differs.

## Final evidence

The first focused run used source `061bca1a`, tree
`01c4ac29ebbe8b0f911efcdb0528f7959ef1e974`. Its actual launcher, driver
and pipeline exits were 1. The complete security owner passed all 12
Node cases. All 26 declared compiler contexts returned 0. The plain
body returned 1 after one passed case, one failed case and ten unrun
cases. Counting and the catalogue captures did not run.

The failed client case constructed its input with `Object.assign`.
That operation invoked an inherited `__proto__` setter and removed the
own alias the test intended to supply. The fixture now uses
`Object.create` with own property descriptors and checks that the alias
exists before calling `expectedOf`. Every previous assertion, test title
and case count remains. This correction changes no production source
or source seal. Its validation remains pending.

Commit `061bca1a` records the maintained parser's changed CLI helper seal
and the new whole `packages/client/src/expected.ts` seal. The new owner
protects the derivation that moved from the CLI helper. All route and
gate assertions remain.

Raw first-run evidence lives under
`/Users/hughpyle/play/artroom-evidence/2026-11-09-t0a-focused` and its
`-launch` sibling. The launcher measured 26.005 seconds elapsed and
62.503 seconds of CPU through the failed result. Those observations
include the outer guards and children. They are not summed case times.

| Check | Command or boundary | Exit | Output digest |
|---|---|---|---|
| Initial compatibility | `scripts/cloudflare-pool-compat.mjs` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` (`compatibility.exit`) |
| Initial security owner | `scripts/security-entry-points.test.mjs`, all 12 Node cases | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` (`owner.exit`) |
| Initial affected compiler closure | All 26 frozen contexts | All 0 | Pending manifest |
| Initial plain body | Four complete owners, 12 obligations | 1. One passed, one failed, ten unrun | `0ea3af979b5fde8e6bdb7e226f0172e607b483848c6b67cf8b7bc40baf3a12c8` (`focused/coverage-ledger.json`) |
| Fixture repair and complete plain owners | Client test compiler, then the same four owners | Not run | Pending |
| Counter proposal and browser behavior | Maintained four-owner Counting runner, 56 cases | Not run | Pending |
| Lending catalogue and MCP tool-document bytes | Exact baseline and candidate outputs | Not run | Pending |
| Final gate | `npm run gate` after merging current main | Not run | Pending |

## Open limits

Request `b9f85b9a` owns validation, the byte-identity witnesses and this
head's landing. The focused continuation retains its named source checkpoint. Merge
current main before the final gate so R3a, R3b and any BR-13 seal changes
remain. The focused result does not validate that later merge automatically. No package installation in
the checkout is needed for source preparation.

Request `260991d8` owns the shared descriptions and starts from this
head's frozen source only after its review request. The DX-T0 parent
`6f87a4e3` stays open for that head and the later typed browser models.
The initial focused failure and pending continuation make no gate,
deployment or live acceptance claim.
