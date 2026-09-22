# Declaration layer, T1

This is the A1/A2 experiment on main `9c4e04e5`. It changes no foundation,
checker, generator, manifest, historical corpus or existing test.

A declaration is data: roles, tables with recording and maximum readers,
acts with ordered guards and writes, queries, invariants and payload domains.
The expression language is closed; there are no JavaScript callbacks in a
declaration. Use the constructors in `schema.ts`; `declarations/discussion.ts`
is a worked example that splits one record's public title and private text
into linked kinds using `splitRecord`.

Run from `spike`:

```
node lang/emit.ts
node --test lang/test/*.test.ts
npx tsc -p lang/tsconfig.json
```

The compiler checks guards, effects, derived columns, queries and affordance
payload domains, plus audience expressions. Aggregates and absence require a
complete relation. A public count of a private relation is refused even if a
sibling expression reads rows. Point references into private relations require
matching reader scope; the runtime additionally requires the earlier row to
cover every current recipient. Sharing a policy name does not imply sharing
the same people. This deliberately refuses a Booking cancellation addressed
to a different admin rather than accepting the hand-written fixture's known
limitation.

`members` is the audience at recording; `max: members` permits later
client disclosure. The producer dependency closure derives the public backlog.
A later grant never rewrites the audience of an earlier event. Maximum readers
derive a client disclosure allowlist, with `authorizedOnly: true`. This is a
conforming-client policy, not a new foundation prohibition. A hostile
publication or disclosure can still violate the budget.

Every write retains its producing position. Reads select visible versions
ordered by that position, so an old disclosed assignment cannot replace a
newer visible value. `read` filters visible rows for queries; `privateValue`
marks the scope of a private output column. Absence and aggregate checks are
local to the expression that performs them.

Affordances use the very same ordered guards as the fold over declared
candidate payload domains. A candidate is offered only if its fold guards
pass. The domains are data and are part of the source identity; the layer is
not a general satisfiability solver. The report must state incomplete-domain
findings. Emitted fixture modules inline the runtime and declaration; descriptor
identity therefore covers all executable helpers, source id and layer version.

Diagnostics name the site, expression, dependency, divergent reader and reason.
Known shapes link to fixed reproducing scripts; new diagnostics without a
witness are explicitly unwitnessed. `baselines/shapes.ts` keeps the recorded bad
shapes. Club is expected to be refused for its hidden application reference.
Its omitted A1 business guard is not a visibility error and is not invented by
this layer. The original Club A1/A5 tests remain unchanged.

The first-draft commit precedes the first compiler/checker/test run. Later
semantic changes belong in `evidence/ledger.md`, classified by the authoring
plan. If A1, A2 or A3 is refuted, publish the report and stop T1. This experiment
does not establish authoring cost, comprehension or production suitability.
