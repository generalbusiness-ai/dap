# Enumerate a definition's histories with the judges that the scope runs

Status: draft for Hugh's review, 23 November 2026, under request
`8b418656`. Nothing is built.

A scope judges each signed act against its pinned definition. It keeps
one entry for each act that takes effect. The judges and the fold are
pure functions in `packages/derive`. The runtime, the replay verifier and
Explore call the same functions
([kernel promise 9](../docs/kernel.md#6-kernel-promises)).

This note adds one more caller, the **history search**. The history
search takes a definition and a small cast of actors. It enumerates every
history that the cast can make, up to a stated length. Three other notes
read its results:
[declared properties](2026-11-23-declared-properties.md),
[guards that refuse nothing](2026-11-23-guards-that-refuse-nothing.md)
and [the authority table](2026-11-23-authority-table.md).

**Guarantee.** Each answer in an enumerated history is the answer that a
scope gives for the same state, actor, clock and grants.

The guarantee holds because the history search has no judge and no fold
of its own. A separate model of the definition can differ from the
source. The five models in
[verification/state-machines](../verification/state-machines/README.md)
state that limit: they "do not establish refinement of the
implementation". The history search has no second text to differ.

Each name in a code block is a sketch.

## 1. The author states a model

A **model** has three parts: a cast, choices and a length.

```ts
const model = {
	cast: { ada: "admin", ben: "member", cy: "member" },
	choices: {
		donate: () => [{ name: "pot", description: "", content: "", page: "shelf/pot.md" }],
		reserve: view => view.things.map(t => ({ tool: t.id, day: "2026-12-01", until: "2026-12-02T00:00:00Z" })),
	},
	length: 6,
};
```

- **The cast** gives each actor a role of the package. Each actor gets
  the actions that the package's `roles` give that role, as scripted
  grants. `dap check` uses scripted grants in the same way today. It
  prints "Local authority: explicit scripted TEST grants".
- **The choices** give candidate fields for an act. An act with no fields
  needs none. The search fills an item field with each live item of its
  type, and a member field with each actor of the cast. For every other
  field the author writes a function from the current view to a list.
- **The length** is the largest number of entries after genesis.

## 2. One step asks the judge

From a state, the search makes one candidate for each actor, each act,
each item that the act can be on and each choice. It judges the candidate
with `judgeActBody` (`packages/derive/src/judge.ts:239`).

- If the judge refuses, the search keeps the answer and the state does
  not change. The answer has the reason, the declared name and the place
  of the deciding guard (`detail: guards.<n>`).
- If the judge admits, the search signs the intent, judges it with
  `judgeAct`, seals the entry with `entryOf` and applies it with
  `applyEntry` to a copy of the state. `tell` in
  `packages/define/src/story.ts` takes the same path today.

The two judgments must agree, because the contract of Explore says that
they derive equal consequences
([act environment note](2026-11-14-act-environment.md), section 5.1). A
difference stops the search with an error.

`judgeActBody` answers `unavailable` when a guard or an effect reads the
signed intent. The search then signs the candidate and asks `judgeAct`
alone.

Time adds one candidate. If `nextDue` names a deadline, the search moves
the clock to that deadline and `judgeTimed` records the timed entry.

The search enumerates shorter histories first. So the first history that
shows a fault is a shortest one, and the search needs no shrinking
library.

## 3. What a result claims

A result covers every history of at most `length` entries, by this cast,
with these choices. It covers nothing else. The lending definition allows
64 things. A model with two things proves nothing about the 64th.

The first version covers one scope. It does not cover:

- Another scope. The search records a send and does not deliver it.
  Membership and destination are stand-ins, as in `story.ts`.
- A capability, a live scope or a platform definition. Platform rules
  are code ([K1](../docs/kernel.md#k1)).
- The capacity of the scope. The turn decides `scope-full` with the bytes
  of the real entry.
- The host. A host can omit or reorder inputs. The search assumes that
  each input is judged once and in order.

## 4. Cost is not known

No measurement exists. The 16 histories of the
[Counting test](2026-11-21-property-based-testing.md) take 1.2 seconds.
A search to length 8 judges many more candidates, and most of them are
refused.

The first version does not merge equal states. An item's ID is the
number of the entry that opened it, so two histories that reach the same
items give them different IDs. A merge needs IDs that do not depend on
entry numbers. That work waits for the numbers.

## 5. Kernel placement

No file and no export enters `packages/contract`, `packages/derive` or
`packages/bytes`. The search uses the exports that `story.ts` imports
today, and `judgeActBody`. Ruling `12dff549` permitted that export for
"the runtime, replay and exploration". The module sits beside `story.ts`
in `packages/define`. It adds no CLI command and no MCP tool.

## 6. Steps

1. **Measure.** A scratch script enumerates Counting Commitments and
   Lending with a cast of three at lengths 4, 6 and 8. It reports the
   candidates judged, the entries applied and the wall time of each
   observed run.
2. **Hugh reads the numbers** and decides whether a search runs in
   `npm run gate`, in `dap check` only, or not at all.
3. **Build the module with one witness.** The control of the 21 November
   note writes zero to `lastNumber` in the `fail` effect. The search must
   find that fault and print the history `fulfill`, then `fail`.

## 7. What Hugh decides

1. Whether the measurement of step 1 starts.
2. Whether the module's home is `packages/define`, beside `story.ts`.
