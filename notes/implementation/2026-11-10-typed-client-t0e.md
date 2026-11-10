# Prepare typed acts from declared data

Request d5fa31c9, promise 230f5474. E adds typed act preparation, shared
forms, declared slot groups, state candidates, and a rule-string tag.
Planner ruling 0be8be71 fixes their public contracts. The source starts
from landed B main a5b82ee0. C has also landed; D proceeds independently.
The first compiler check below names the source checkpoint `5cf4209c`.

## Prepare, then submit

`declaredHandle(scope, definition)` keeps its existing digest check.
The returned handle adds one own `intents.<kind>` method per non-genesis
act. Each method accepts a `Signer`, typed input, and optional `Signing`
controls. It returns a signed packet with the summary head or the read
failure that stopped preparation. It sends nothing.

```ts
const opened = await declaredHandle(scope, lending);
if (!opened.ok) throw new Error(opened.reason);
const packet = await opened.handle.intents.borrow(signer, {
  on: thing,
  fields: { content: pageText },
});
if (!packet.ok) throw new Error(packet.reason);
const answer = await opened.handle.submit(
  packet.signed, [], packet.beside,
);
```

Preparation snapshots the declared data, input, and signing controls.
It shapes fields through the existing declared-field checker and reads
one fresh summary. It checks the published digest even when the caller
supplies `expected`. Captured revisions remain unchanged. Otherwise,
the shared `expectedOf` derives revisions from the summary. Missing final
subjects selected through `via` use the existing bounded item query.
A refused or incomplete read stops preparation before the signer runs.
No failed read supplies an empty fallback.

The generic `intent` and `submit` methods retain their bodies and
contracts. Preparation checks no grant, state, or guard. The scope judges
the submitted intent at its own head.

Client now owns the pure `effectiveFields` and `finalStates` helpers.
Their runtime algorithms move unchanged from MCP; MCP forwards them.
Local fact normalization, defaults, own-property lookup, `expectedOf`,
and `viaLeft` keep their existing behavior. These helpers depend only on
Contract and Bytes.

## Reuse declaration descriptions

`formFor(definition, kind, context)` retains the act's typed field
declarations. It wraps B's bound sentence, field-line, guard, and input
schema functions. Its context supplies the explicit description binding,
setting, caller wording, and target policy. It adds no schema or wording
rules. MCP takes its input schema from this wrapper; its tool identity,
description, listing policy, and output schema retain their owners.

`slotsFor(definition, item)` returns the declared `parties`, `values`,
and `refs` groups. It adds no labels, live values, or nullability policy.
`actsOn(definition, item, state)` returns sorted act-kind strings for
transitions and item-bound comments. Only an unconditional top-level
primary-subject state guard can exclude a candidate. Candidates grant
nothing and establish no availability. They do not hide handle methods
or MCP tools.

These production helpers replace the first spike's client prototypes.
The retained spike stays historical. B already replaced the duplicate
CLI renderer with a direct Client forward. E preserves that compatibility
export and adds no second description implementation.

## Compose ordinary rule strings

`expression(ctx)` returns a tag. Its holes accept the enclosing act's
existing `f.<name>`, `on.slot(name)`, and `also.<alias>.slot(name)` refs.
No duplicate field or slot constructor enters the API. Ctx-bound slot
refs now retain their subject and slot names in their TypeScript types;
the general range/operand API retains its existing types and runtime.

```ts
const e = expression(ctx);
const source = e`${ctx.f.minimum} <= ${ctx.on.slot("level")}`;
return { guards: [rule("minimum-level", source)] };
```

The tag finds the slot's declared group and quotes complete path members,
including dotted sibling aliases. It refuses a name containing a literal
backtick because the pinned tokenizer has no escape for that character.
It returns a string to the existing `rule` helper. TypeScript checks
interpolated names; the unchanged compiler and restricted profile check
raw text. No expression tree, evaluator, profile, hoisting, or pin changes.

## Compiler check and reviewed source seals

The [compiler check](evidence/2026-11-10-t0e-compiler-first.manifest.json)
passed at `5cf4209c`. All 31 unique compiler contexts returned zero,
including the Define test context with the three wrong-name directives.
All 62 compiler logs are empty. The inner and outer drivers returned zero,
and the owned process groups closed. The 65 boundary observations retain
identical source, tool, input, runtime, and dependency identities.
The inner interval was 81.556853791 seconds; the outer interval was
83.89673825 seconds. This run executed no runtime cases.

The [maintained seal producer](evidence/2026-11-10-t0e-source-seal-producer.manifest.json)
reproduced the two old reviewed syntax-tree seals from retained main
`a5b82ee0` source. It then calculated replacement seals for Client
`expected.ts` and MCP `catalogue.ts`. The patch changes exactly those two
existing hash literals. Every other byte in the route and gate assertions
stays identical. The producer extracts the maintained `sourceSeal`
function and invokes the pinned syntax parser without importing application
setup. Both actual producer and launcher exits are zero.

| Check | Command | Actual result | Output/log SHA-256 |
| --- | --- | --- | --- |
| Compiler contexts | [31 exact Node/TSC commands](evidence/2026-11-10-t0e-compiler-first.manifest.json) | 31 exits zero | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Reviewed seal values | [Maintained parser argv](evidence/2026-11-10-t0e-source-seal-producer.manifest.json) | Exit zero | `dc8e0130be984d9d47a51c0482b2ca62d63cc4310cda9c4ef808b219a88eda16` |

The compiler digest names each empty compiler stdout and stderr file.
The seal digest names actual Node stdout. Full argv, timings, source
identities, and retained output paths appear in the manifests. These checks
establish no runtime, authority, deployment, or acceptance result.

## Runtime and final validation owed

The existing Native Lending scenario now prepares its lending acts
through `handle.intents` over the real Scope binding. It retains the
membership, factory, SQLite, replay, refusal, final-item, and capacity
assertions. Normal acts derive revisions; explicit captured revisions
still reach the scope unchanged. This strengthens an existing case.
The only added runtime case checks a failed fresh read before the signer,
including an input with captured revisions. Three compiler-only lines
check wrong field, slot, and sibling names in tag holes.

Before source edits, the builder retained the complete prior files in
private custody. Their SHA-256 values are:

| Original | SHA-256 |
| --- | --- |
| Lanes reference | `1b1272ba17778b79cac8e351196e206e6473594fb8da36d064ccde11a2a79b04` |
| MCP tools | `4e18d71826d10cd3d8ab64f507ee59e5a69dc740185348988143488098659b64` |
| Lending catalogue, default/generic/add | `7f4bd447c30a078dd68ce1f2ed57decdf3652ccbb1caf9efacd950bc0969f468` |

The retained baseline index has SHA-256
`243848e5fabb5e78d1a679d7a57715225df90b1d1c2e7a7dc6c2440e36089377`.
These hashes identify original bytes; they do not claim an E capture.
The remaining checks are the read-failure guard control, existing owning
tests, the complete Lending catalogue comparison, the maintained Page build,
applicable browser witnesses, and the final gate. No test, build, capture,
control, application import, install, or gate has run for E. No acceptance
or deployment claim follows from this checkpoint.
