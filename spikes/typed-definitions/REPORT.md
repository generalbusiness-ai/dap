# Spike: definitions written as TypeScript

28 October 2026, against main `0881c1bc`. Hugh asked whether a typed
TypeScript form of a declared definition is shorter or more expressive than
the hand-written data, before any package is built. This directory is the
spike. Nothing in it changes the kernel: the builders produce the same data
the scope pins, and the tests prove it byte for byte.

## What was built

| File | What it is |
|---|---|
| `lib.ts` | The builders: field types, slots, `item`, `open`, `transition`, `comment`, `timed`, `define`, guards and effects typed by item, `range`, `tell`, `when`, `compile` with findings |
| `lending.ts` | The lending library, with two combinators: `unique` and `publishes` |
| `counter.ts` | The Counter, with its turn-taking helpers rewritten as typed combinators: `joined`, `roster`, `clear`, `issue`, `leave` |
| `room.ts` | A room handle typed from the definition value, over the in-memory judges: one method per act; `expected` revisions derived from the `also` rules; `formFor` and `actsOn` for an interface |
| `typecheck.ts` | Nine mistakes the compiler now refuses, each under `@ts-expect-error`, and one the hand-written form accepts |
| `spike.test.ts`, `extension.test.ts` | The witnesses below |

Run from the worktree root:

```
node_modules/.bin/tsc -p spikes/typed-definitions/tsconfig.json
node_modules/.bin/vitest run --config spikes/typed-definitions/vitest.config.ts
```

## Results

Observed runs on 2026-10-28, both commands above.

| Witness | Result |
|---|---|
| `compile(lending)` deep-equals `examples/lending/definition.ts`, its canonical bytes equal `definition.json`, its digest is the pin `0c43dd56…` | passes |
| `compile(counting)` deep-equals `apps/counter/definition.ts`, bytes equal `definition.json`, digest is the pin `435d9f57…` | passes |
| Both compiled definitions pass `validateDefinition` with `PROPOSED_BOUNDS` | passes |
| `tsc` over the spike, with the nine `@ts-expect-error` lines in `typecheck.ts` | exit 0 |
| The Nasruddin story through the typed room, replay snapshot equal | passes |
| The builder's findings on a rule that reads a missing field and a missing slot | two findings, as expected |
| A lending variant with a due date: one slot, one effect, one timed rule; the real judges fire the return at day 14 and not at day 13 | passes |

So the answer to "same thing?" is yes, exactly. Every form the kernel pins
is produced by the builders, for both existing applications, with no
change to the bytes.

## Shorter?

Taken with `wc -l` and `wc -c` at this head; code lines by `grep -v` of
blank and comment lines. The lending original is pretty-printed JSON, so
its line count is not comparable; bytes are the fairer measure. The
Counter original is already a program of local helper functions written
very densely, so it is the fairer comparison of the two.

| Source | Lines | Code lines | Bytes |
|---|---|---|---|
| `examples/lending/definition.ts` (hand-written) | 505 | 501 | 10,409 |
| `spikes/typed-definitions/lending.ts` (rewrite) | 71 | 56 | 4,216 |
| `apps/counter/definition.ts` (hand-written, with helpers) | 118 | 115 | 9,440 |
| `spikes/typed-definitions/counter.ts` (rewrite) | 116 | 99 | 9,274 |
| `spikes/typed-definitions/lib.ts` (the builders, shared) | 243 | 168 | 14,521 |

The lending rewrite is about forty percent of the original by bytes. The
Counter rewrite is the same size as the original. That is the honest
result: where an author already wrote helpers, the typed form is no
shorter. Where the author wrote the data out, it is less than half.

The compiled data has these forms, counted by a script over the JSON:
lending 6 acts, 5 guards, 13 effects, 5 sends; Counter 9 acts, 33 guards,
65 effects. In the rewrites, `publishes` produces all 5 lending sends,
`unique` the one scanning guard, and the five Counter combinators produce
most of its 65 effects.

## More expressive?

Four things the hand-written form cannot do, each witnessed.

**Names are checked in the editor.** A state the item does not declare, a
party or value slot it does not have, a field the act does not declare, a
range over another item's states, a misspelt field in a client call: each
is a compile error in `typecheck.ts`. In the hand-written form every one of
these passes the type checker, because the value is declared as
`DeclaredDefinition` and every name is `string`. The validator catches some
at run time, with a JSON path; the typed room's call with a misspelt field
would reach the scope and be refused `bad-field`.

**The client is typed from the definition's value.** `AskedOf<typeof
lending, "borrow">` is `{ on: number; fields: { content: string } }`. From
the hand-written value it accepts any field names. This is the same
`declaredHandle` machinery that already exists in the client package; the
builders make it work by keeping literal types.

**The handle derives what the client computed by hand.** The lending test
support computes `expected: { on, library }` with two helper functions. The
typed room reads the act's `also` rules and fills `expected` for the item,
for each `one` item and for each `by` item, so the story in `spike.test.ts`
has no helper for it. The browser model repeats three byte limits and the
act list as constants; `formFor` and the literal types give both from the
definition.

**A change is a few lines.** The due-date variant adds one value slot, one
effect in `borrow`, and one timed rule, by composing the same builders and
the lending combinators. The real judges run it. Writing the same change in
the hand-written form means editing three places in a 500-line JSON value
with no check that the names agree.

## Limits of this spike

- The rule expressions stay strings. `findings` checks only direct
  `fields.<name>` and `.values.<name>` references; a reference through a
  bound variable, as the Counter's rules use, is not followed. A typed
  expression builder is a separate piece of work.
- `room.ts` wraps the test ledger, not the real `ScopeHandle`. The real
  handle needs the same per-act methods and the same `expected` derivation
  from a summary read.
- The Counter's bytes carry `except: []` on every range because its helper
  wrote one. The builders omit an empty `except` unless asked. Both are
  valid; the rewrite asks, to keep the digest.
- There is no scenario harness here; request `736ca2bb` covers it, and the
  typed room is the shape its `when` step would take.
- The builders are shallow by design: `const` type parameters and `keyof`.
  Compile time for the spike directory is under a second.

## Recommendation

Back the implementation. The typed form is exactly the pinned data, it is
materially shorter for a definition written as data, it is no longer for
one written with helpers, and it adds four things the data form cannot
give: names checked in the editor, a client typed from the value, a handle
that derives revisions and forms, and changes by composition.

The package should hold `lib.ts` as its core, the per-act methods on the
real client handle, `formFor` and `actsOn` or their equivalents for
interfaces and for the MCP tool catalogue, and a typed rule-expression
builder. The two applications should be re-expressed with it and their
pins must not change.
