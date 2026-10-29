# Spike 2: one surface for a definition and its application

28 October 2026, against main `0881c1bc`, after `spikes/typed-definitions`.
That spike proved that typed builders compile to the exact bytes two small
definitions pin. Hugh's concern for this one: does the typed form present a
unified surface, with consistent patterns and simple readability, once it
has to carry the hard definitions and the two things beside a definition
(the application manifest and the scenario file)? This directory is the
spike. Nothing in it changes the kernel.

## What was built

| File | What it is |
|---|---|
| `lib.ts` | The v2 vocabulary: 85 builders in six patterns (below), `compile`, and `normalize`, which puts the data in one spelling |
| `lending.ts` | The lending library |
| `commitments.ts` | The live Counter (counting commitments, Draft 4), with combinators `pledgedBy`, `boardClear`, `resolving`, `unlink` |
| `grow-forms.ts`, `grow-room.ts`, `grow-site.ts` | The grow room and site, with the zone, device, work, watering and presence modules as functions of what the room passes down |
| `lanes.ts` | A slice of the change lane: seven items, five acts including `propose-manifest`, two handlers including `publication` |
| `package.ts`, `lending-package.ts` | Manifest builders: projections, views and the manifest derived from the definition value |
| `story.ts`, `lending-story.ts` | A scenario written as a story over the real judges, which writes the scenario file the CLI runs |
| `surface.test.ts` | The nine witnesses below |

Run from the worktree root:

```
node_modules/.bin/tsc -p spikes/typed-surface/tsconfig.json
node_modules/.bin/vitest run --config spikes/typed-surface/vitest.config.ts
```

## The six patterns

Every form in the contract is written with one of these.

**Subjects.** The act's item is `on`; its other items are `also.x`; the item
a range scans is the callback's argument; the sender of a message is
`sender`. Every subject has the same verbs: `in`, `signer`, `set`, `unset`,
`before`, `after`, `slot`, `id`; `to`, `party`, `value`, `ref`, `hold`,
`capability`, `attribute`, `notify`, `settles`.

```ts
guards: [on.in("open"), also.heater.in("active"), equals(also.heater.slot("kind"), constant("heater"))],
effects: [on.to("authorized"), also.heater.value("target", on.slot("target"))],
```

**Quantifiers.** One range form, `range(item, states, { where, except })`,
under `none`, `some`, `count` and `sameSet`; one list form under `each`,
`has` and `distinct`, which bind a named element whose members are typed
from the act's field.

```ts
refuse("hold-held", none(range(hold, ["held"], { where: (h) => [equals(h.slot("under"), also.commitment.id)] }))),
each(f.selected, "s", (s) => ({ guards: [isFact(s.accepted), equals(part(s.report, "scope"), part(s.accepted, "scope"))] })),
```

**Conditions.** `when(form, { if, unless })` on an effect or a message;
`anyOf(...)`, `ifPresent(g)` and `refuse(reason, g)` on a guard.

**Messages.** `tell`, `create`, `relate` and `index` take the same shape:
an address, a name, fields, an optional condition, result clauses written
as effects on `on`.

```ts
create({ kind: "lane", definition: roomPin, fields: { label: f.label, site: theScope, siteRoom: on.id },
  result: { applied: [on.to("active"), on.ref("scope", sender)], refused: [on.to("failed")], conflict: [on.to("conflicted")], undelivered: [] } }),
```

**Handlers are acts.** `receive` takes what `open` takes, plus the message
and its source; its body reads `sender` and `source(part)`.

**One value flows down.** A module is a function of what its definition
gives it: the name its facts are under, the items it refers to, a digest.
`zoneItem(ROOM, { vent, fan, heater })` adds the room's references;
`workForms(ROOM, { zone, device, alert })` names the room's items;
`growSite(roomPin)` creates lanes pinned to the room.

## Results

Observed run of both commands above, 2026-10-28 16:39 EDT. Every witness is
a file the repository already pins; nothing is compared to a value this
directory wrote.

| Witness | Result |
|---|---|
| `compile(lending)` deep-equals `examples/lending/definition.ts`; digest is the pin | passes |
| `compile(countingCommitments)` deep-equals `apps/counter/commitments.ts`; digest is the pin `b5582434…` | passes |
| `compile(room)` deep-equals the grow room in canonical spelling; passes `validateDefinition` | passes |
| The pinned grow room differs from canonical spelling in exactly 12 places, each an `of: "on"` on a guard whose subject is the act's item | passes |
| `compile(growSite(roomPin))` deep-equals `examples/grow/site.ts`; digest is the site's | passes |
| Seven items, five acts and two handlers of the change lane deep-equal their `change.json` rows in canonical spelling | passes |
| The pinned change lane differs from canonical spelling in exactly 5 places, each a subject named twice | passes |
| `lendingPackage` deep-equals `examples/lending/dap.application.json` | passes |
| `lendingStory()` deep-equals `examples/lending/scenarios/application.json`, and every step was judged as the file expects | passes |
| `tsc` over the directory | exit 0, 0.18 s real |

The grow room and the change lane are the exceptions to byte identity, and
the reason is a finding, not a gap: see "One spelling" below. The site is
byte-identical because the room's pinned digest is passed in, not rebuilt.

## Readable?

The `propose-manifest` act is the hardest row in the repository: 13 fields,
24 guards, 16 effects, 2 sends, 10,424 bytes of JSON; its guards hold 40
`equals`, 15 `has`, 13 `none`, 9 `anyOf`, 8 `each` and 1 `distinct`. In
`lanes.ts` it is 65 lines, and the guard that decides completeness reads as
a sentence per clause, through six named combinators (`performing`,
`pinCarries`, `planHas`, `inPlan`, `acceptedAsDelivered`, `published`):

```ts
each(f.decisions, "d", (d) => ({ guards: [
  equals(part(d.self, "scope"), part(f.plan, "scope")),
  inPlan(f.plan, "item", part(d.self, { field: "concern" })),
  anyOf([differs(part(d.self, { field: "kind" }), constant("replaced"))], [inPlan(f.plan, "item", part(d.self, { field: "replacedBy" }))]),
] })),
```

The `take-hold` act, side by side with its row in `docs/lanes-reference.md`
("open on `hold`; `change.work`; `commitment` by the field `commitment`,
`proposal` the one item of its type; `commitment`: item of type `commitment`,
`extent?`: text, at most 1024 bytes; 4, 4, 0, 0"), 837 bytes of JSON:

```ts
"take-hold": open(hold, "change.work", { fields: { commitment: required(itemOf("commitment")), extent: optional(text(1024)) }, also: { commitment: by(commitment, "commitment"), proposal: one(proposal) } }, ({ f, on, also }) => ({
  guards: [also.proposal.in("draft", "open"), ...performing(also.commitment), refuse("hold-held", none(range(hold, ["held"], { where: (h) => [equals(h.slot("under"), also.commitment.id)] })))],
  effects: [on.hold("open", f.extent), on.ref("under", also.commitment.id), on.value("extent", f.extent), on.value("ends", plusSeconds(3600))],
})),
```

The reference row and the typed act say the same things in the same order:
step and item, grant, subjects, fields, then guards and effects. A reader of
one can read the other.

## Shorter?

Taken with `wc` at this head; code lines by `grep -v` of blank and
comment-only lines. The grow originals are already written with local
helpers, so they are the fair comparison.

| Source | Code lines | Bytes |
|---|---|---|
| `examples/lending/definition.ts` | 501 | 10,409 |
| `lending.ts` (rewrite) | 55 | 3,988 |
| `apps/counter/commitments.ts` | 474 | 17,963 |
| `commitments.ts` (rewrite) | 115 | 9,492 |
| `examples/grow/{zone,device,work,watering,presence,room,site}.ts` | 384 | 43,074 |
| `grow-forms.ts` + `grow-room.ts` + `grow-site.ts` (rewrite) | 377 | 34,454 |
| `lib.ts` (shared) | 383 | 38,822 |

Written as data, a definition is a third to a half of its size in the typed
form. Written with helpers, it is the same number of lines and four fifths
of the bytes. The typed form's gain over hand-written helpers is not length;
it is that the helpers are shared, named for what they mean, and checked.

## Findings

**One spelling.** The contract admits two spellings for a subject that is
already implied: a guard on `on` may say `of: "on"` or not; an operand may
repeat the subject of its own form or not; a range may carry `where: []` or
not. The kernel reads them alike; only the bytes differ. The pinned grow
room carries the redundant spelling in 12 places and the change lane in 5,
by author habit (`live("on", …)` and `deviceNotFailed("on")` in grow, two
`tell` addresses and three `also.earlier` operands in change); lending, the
Counter and the site carry none. The builders write every subject
explicitly and `normalize` leaves it only where it differs from the
enclosing form's. Consequence: re-expressing the grow room or the change
lane with the typed form changes their digests unless the compiler
reproduces author habit, which it should not. Recommendation: make
canonical spelling part of the kernel's definition validation (refuse the
redundant spelling, or normalize before the digest), and migrate the two
deployed definitions once; the grow room runs on `dap-grow`, so that is the
planner's call with its deploy consequences.

**`attribute` has two subjects.** The effect `{ attribute: { slot, of } }`
writes the party list `slot` of the act's item from the attribution of the
subject `of`. The JSON reads as if `of` were the receiver. The typed verb is
`on.attribute("authors", also.commitment, [...more])`, which says it.

**Typed list elements.** An element bound by `each`, `has` or `distinct`
has the members of the act's record field: `s.accepted` and `s.report` are
checked. A list that is a part of a fetched fact (the plan's `required` and
`optional` entries) is declared in another definition, so the author
states its members: `elements(part(f.plan, { field: "required" }), "item", "child")`.
The spike turns two strictness flags off in its own `tsconfig.json` for the
untyped fallback; the package should type every element or require the
declaration.

**The manifest derives most of itself.** From the definition value:
entry and definitions from the path, host profile and capabilities,
projection field types and nullability from the slots, limits from `many`,
states and act lists in sorted order, and connections from scope-typed
references. It checks that views name fields their source has and that the
roles cover every grant an act names. The author gives what the definition
cannot know: which slots a projection shows, how a view is laid out, who
holds which grants, the browser entry and the brand files.

**The story derives what the scenario format asks for.** `expected` is the
set of item ids the act's `also` rules resolve from the fold (the CLI reads
`$revision: id` as "that item's current revision"); every step is judged by
the real judges as it is written and the story is refused when the judge
disagrees with the author; projection rows are read from the fold at that
point. The author still says which sources and which fields a projection
step records, and what each step should answer.

**Built but not witnessed here.** `redact`, `every`, `notIn`, `some`,
`collect`, `authorsOf`, `settlesBy`, `withDefault`, `update`,
`resultReason`, timed `attention`, `level`, `capacity`. Other rows of the
two lanes exercise most of these; no pinned definition sets `level` or
`capacity`.

**Compile time.** 0.18 s real for the directory, observed with
`/usr/bin/time`.

## Recommendation

The surface holds. One vocabulary of six patterns carries the lending
library, the live Counter, the grow room and site, the hardest rows of the
change lane, the application manifest and the scenario file, and every
witness is a file the repository already pins. Adopt `lib.ts` here as the
package core in place of the first spike's, with three additions filed as
work: canonical spelling in the kernel's validation with a one-time
migration of the grow room and change lane; typed list elements without the
spike's relaxed flags; and the manifest and story builders as the typed
form of the two files beside a definition.
