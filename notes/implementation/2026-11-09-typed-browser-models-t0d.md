# Browser models from authored definitions

Request `6f87a4e3`, item 3. Promise `00b5bef0`. Placement `176190ba`
and coverage `b8b6248d` assign this head the two browser models, their
existing witnesses, and separate annotations. Source preparation starts
from C's reviewed head `0b72dffc`, whose tree is
`a7af981d473459fe30cd9160c74dd86423b518ae`.

## What changed

Counter and Lending take their act names and field types from the exported
authored definition values. Their proposal helpers accept `AskedOf` and
`Members` inputs for the selected act. `NoInfer` prevents a field argument
from widening the selected kind. The existing shaper validates those
inputs, and `expectedOf` captures revisions from the held view.

Counter takes its failure enum, participant cap, basis cap, state names,
and numeric limits from its declaration. Lending takes its text limits
and item cap from its declaration. Lending derives the row action list
from the acts' subjects and primary state guards, in declaration order.
These offers grant no permission. Native authority and guards still judge
every submitted act.

Refusal wording now lives in each application's `annotations.ts`, keyed
by the authored act name and a reason. The wording stays unchanged.
Native reason keys remain open until DX-B1 supplies their types. Local
proposal reason keys remain literal types.

## Decisions and why

Application value selection remains in the models. Counter still selects
the active roster and exact linked pledge. Lending still prepares shelf
text for the proposed resulting state. Neither model duplicates the
generic act shape or revision algorithm.

The current acts have no presented facts, detached text, or defaulted
input. Lending fields are ordinary text and item IDs. Counter fields are
ordinary numbers, an enum, an item ID, and a list of records containing an
item ID and member reference. The shaper checks those values and copies
the list and record containers without changing their semantic values.
The local helper returns the typed selected fields and the shaper's actual
`on`. It captures revisions with the shaper's checked fields.

The signing clients stay unchanged. They shape the resulting proposal
again and retain the actual `beside` data. For today's declarations that
data is empty. This head does not add a generic client API or claim that
discarding transformed fields would work for another definition.

Lending's view already holds the library and thing revisions. Its helper
presents those exact values to `expectedOf` as the declared item types.
Today's bindings use `one` and `by`, so the view supplies no invented
reference slots. Historical gone things keep their retained revision.

The six model, annotation, and witness files received a static peer review
at source receipt `198cf208`. The existing runtime cases and assertions
remain. Compiler-only examples reject genesis commands, invalid field
types, unknown failure enum values, and unknown annotation act keys.
No runtime case was added.

## Evidence pending

The first focused run at `8292fe9a` failed in the first compiler context.
Lending's test helper could not pass the proposal fields to the fold's
wire-data input. `Members` retains an optional string index from the
authored field map, so returning that broad type added `undefined` to
the index values. The local helpers now infer a separate field parameter
and return that exact selected type. Their authored input constraints,
shape checks, and revision capture remain.

The failed unit remains at `2026-11-09-t0d-focused`. Its driver, launcher,
and first compiler exited 1. The other three compiler contexts and all
63 runtime cases remained unreached. Repair validation, both browser
scenarios, and the final gate remain pending.

The dependency view is an owned APFS copy of completed C at the same lock,
with 15 relative workspace links, 49 source aliases, and fresh Vite state.
No package manager ran.

| Check | Planned boundary | Exit | Output digest |
|---|---|---|---|
| Compiler closure | Affected and owning contexts, once each | Pending | Pending |
| Lending model | Whole existing four-case owner | Pending | Pending |
| Counter | Maintained whole Counting runner and its four owners | Pending | Pending |
| Native adapters | Whole maintained application-projection owner | Pending | Pending |
| Browser scenarios | Both actual application interfaces | Pending | Pending |
| Final gate | `npm run gate` after the required main merges | Pending | Pending |

## Open limits

The models provide convenience validation and input selection. They prove
no grant, native admission, transport, publication, or live-room outcome.
The browser and Native witnesses remain distinct obligations of
`6f87a4e3`. D lands after A, B, and C and closes the parent only after all
required evidence and review.

No kernel, definition pin, retained JSON, manifest, client API, or authoring
package changes here. The planner owns deployment.
