# Prepare typed acts from declared data

Request d5fa31c9, promise 230f5474. E adds typed act preparation, shared
forms, declared slot groups, state candidates, and a rule-string tag.
Planner ruling 0be8be71 fixes their public contracts. The source starts
from landed B main a5b82ee0 and now includes landed D and the identifiers
notes. The first compiler check below names `5cf4209c`; the generated
Page asset enters at `01337382`.

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

## Compiler checks and reviewed source seals

The [first compiler check][compiler-first] passed at `5cf4209c`.
All 31 compiler contexts returned zero, including the Define test context
with the three wrong-name directives. The [post-D check][compiler-d]
passed four affected contexts at `3d345cfa`. The later fixture repair
passed the MCP test compiler at `721ea5db`. These runs cover overlapping
compiler contexts.

The [maintained seal producer][seals] reproduced the old syntax-tree
seals from retained main source and calculated replacements for Client
`expected.ts` and MCP `catalogue.ts`. The patch changes exactly those two
existing hash literals. Every route and gate assertion remains identical.
The producer extracts the maintained `sourceSeal` function and invokes
the pinned syntax parser without importing application setup. Both actual
producer and launcher exits are zero.

## Focused checks preserve each failure

The [read-failure baseline][baseline] passed all three existing cases.
Its original controller stopped with exit two on reporter metadata.
A separate metadata reconciliation returned zero and retained the actual
baseline exit zero. The [mutant-only control][mutant] then produced two
passes and the intended assertion failure in the signer-order witness.
The control restored the production source and closed its process groups.
The earlier startup failure remains a failed attempt in that evidence.

The [Node owner][node] passed all 12 cases at `3d345cfa`. Its original
analyzer expected a null test identifier for an unknown reporter wrapper.
The actual wrapper had `entryFile: null` and `testId: 1`, so the controller
refused that metadata and returned two. The corrected metadata analyzer
returned zero without repeating the owner. Three wrapper observations
remain unknown and do not count as cases.

The first Plain continuation recorded 32 passes and one failure. Two
cases remained pending when bail stopped the run. Native Lending
remained unrun. The failure exposed a
stale MCP fixture: it replaced only the bound act while keeping the old
whole definition and inventory. The repair constructs the complete
required-presentation definition, derives its digest and fresh inventory,
and selects its real `bindingsOf` result. The existing optional,
standing, capability, and required-presentation assertions remain intact.

The [repaired focused evidence][focused] preserves that failed attempt
and passes the complete eight-case MCP owner and the existing Native
Lending scenario at `721ea5db`. The Native scenario prepares acts through
`handle.intents` over the real Scope binding. It retains membership,
SQLite, replay, refusal, final-item, and capacity assertions. Captured
revisions still reach the scope unchanged.

The combined evidence contains 51 distinct positive cases across nine
whole owners: the three-case control baseline, 12 Node cases, 27 retained
Plain cases, eight repaired MCP cases, and one Native Lending case.
The retained 27 cases come from five completed owners whose source
remains unchanged across the one-file fixture repair. The mutant's
intended failure and the original controller failures remain separate
from those positive results.

E adds one runtime case: a failed fresh read must stop preparation before
the signer, including when the caller supplies captured revisions.
The three wrong-name tag examples remain compiler-only checks.

## Page build and final validation

The [maintained Page build][page] passed at `fffbfee4`. Build, runner,
outer driver, and launcher each returned zero. The evidence retains the
four served/dist byte comparisons and the unchanged source and tool
fences. The generated asset enters the candidate at `01337382`; this
adoption does not relabel the build's actual source checkpoint.

The retained original Lanes reference, MCP tool listing, and
three Lending catalogue forms supply the three strict comparison
inputs. Their original bytes remain separate from the actual E outputs.

- The [strict three-output comparison][capture] passed at `01337382`.
  The Lanes reference, MCP tool listing, and combined Lending catalogue
  exactly match their three retained original byte outputs.
- The [three final static checks][static] passed at `c370fcbb`.
  Whitespace, commit messages, and selected JSON formatting returned zero.
  The commit check examined seven messages and flagged none. All six
  actual command, driver, and launcher exit files record zero.
- The [full gate][gate] passed at `c370fcbb`. Gate, driver, launcher,
  and analyzer returned zero. The complete reconciliation accepts all
  5,842 distinct obligations: 5,839 passes and three skips. It covers
  45 compiler contexts and 16 typecheck scripts. The 111 reporter wrappers
  remain unknown. The unchanged source selector omits all six Scale
  obligations. The terminal reports contain no unexpected cases,
  reconciliation issues, unhandled errors, or deadline diagnostics.

  The first analyzer launcher stopped on a syntax error before starting
  the analyzer. A corrected launcher ran the unchanged analyzer once and
  returned zero. The wholly skipped Page recorder module has no duration;
  that duration remains unknown. Six evidence-size warnings remain in
  the retained logs.

  The inner interval was 979.9855555 seconds. The outer interval was
  982.248283542 seconds. Across 99 passive samples, the largest sampled
  single-process RSS was 2,650,912 KiB for Node and 3,148,480 KiB for
  workerd. These values describe sampled RSS, not heap, a process sum,
  or an instantaneous maximum. Source and tool fences match, the accepted
  scope remains fixed, and the owned process groups closed.
- [Automatic Page CI][browser-ci] passed at `01337382`. Run
  `42846059399`, attempt one, completed all 12 steps successfully.
  Root read the run, jobs, and step metadata with three GET exits zero.
- Card CI: **NOT APPLICABLE**. The [workflow filter proof][ci-filters]
  finds no changed Card path. Only the generated asset matches Page.

The final gate passed at `c370fcbb`. Automatic Page CI passed at
`01337382`. The planner owns deployment and live acceptance.

[compiler-first]: evidence/2026-11-10-t0e-compiler-first.manifest.json
[seals]: evidence/2026-11-10-t0e-source-seal-producer.manifest.json
[compiler-d]: evidence/2026-11-10-t0e-post-d-four-compilers.manifest.json
[baseline]: evidence/2026-11-10-t0e-control2-baseline-reconciled.manifest.json
[mutant]: evidence/2026-11-10-t0e-mutant-only-control.manifest.json
[node]: evidence/2026-11-10-t0e-node-positive-reconciled.manifest.json
[focused]: evidence/2026-11-10-t0e-repaired-focus.manifest.json
[page]: evidence/2026-11-10-t0e-page-build.manifest.json
[ci-filters]: evidence/2026-11-10-t0e-browser-ci.manifest.json
[capture]: evidence/2026-11-10-t0e-strict-three-output.manifest.json
[browser-ci]: evidence/2026-11-10-t0e-browser-ci.manifest.json
[static]: evidence/2026-11-10-t0e-static-preflight.manifest.json
[gate]: evidence/2026-11-10-t0e-final-gate.manifest.json
