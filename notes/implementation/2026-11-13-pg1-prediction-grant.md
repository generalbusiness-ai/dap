# PG-1: a typed stand-in grant for prediction

Planner request `cb07b59b` builds the work of request `944f9cad`. A replica
outside the runtime predicts an act with `judgeAct`. The judge takes a
`Grant`, and a replica holds no `issued` fact and no freshness proof. Each
client that predicted built `fresh` with the cast
`null as unknown as ObservationUse`. This head moves that cast into one
function in `packages/derive`.

## The function

`predictionGrant(definition, actor, scope)` in
`packages/derive/src/grant.ts` returns a `Presented` value, marked current.
Its grant holds these members:

| Member | Value |
|---|---|
| `actions` | Each distinct action that `actionOf(act, definition)` gives over the definition's acts. Check 9 of the judge reads the same function. |
| `subject`, `key`, `principal` | The actor's. |
| `within` | The scope. |
| `notAfter` | `null`. |
| `issued` | Sequence 0 of the actor's membership, with a digest of zeros. It names no fact. |
| `fresh` | `null`, through one named cast inside the function. |

The doc comment states the limits of a prediction with this grant:

- It never answers `unauthorized` for an act whose `grant` states an action.
  A mark at `grant` that states no action runs its rule, and that rule can
  still refuse.
- It serves no row of `observes`. Under a definition that states such rows,
  a prediction can answer `authority-unavailable` where the scope writes.
- The judge checks the intent's `notAfter` against the caller's clock. A
  clock far from the scope's predicts `expired` wrongly.

## No type changes

`Grant.fresh` stays `FreshnessProof`. The function does not need `fresh` to
be optional. A `fresh: null` grant type in `Presented` would widen
`JudgeContext.grants` and the type of an entry's `authority`, and the
request forbids a change to an entry. No judge rule, entry or wire form
changes.

No runtime path presents this grant. `packages/scope/src/authority.ts:341`
and `:397` present only the grant that `judgeGrant` answers `current`, and
that grant is `grantFrom(use)`, which holds the proof. A replay with
`grants: "proven"`, the default and the command's setting
(`packages/replay/src/verify.ts:193-202`), reports a grant with no proof as
a `mismatch`.

These sites build the same stand-in by hand today. This head does not
change them:

- `packages/cli/src/application-local.ts:52`, the local developer adapter.
- `packages/define/src/story.ts:133`.
- `packages/checkers/test/support.ts:64`.
- `packages/contract/test/shapes.ts:23`.

## The fixtures

`grantOf` in `packages/derive/test/fixtures.ts` took `fresh` from the cast
at line 69. It now takes the grant from `predictionGrant` and sets its own
`issued`, `actions` and `notAfter`. The canonical form sorts keys, so every
fixture grant keeps its bytes, and no digest moves. Its callers in
`apps/counter`, `apps/room/lanes`, `examples/grow` and
`docs/build-a-lending-library.md` keep the same signature. No other cast in
`packages/derive/test` builds a grant.

## The witness

`packages/derive/test/prediction-grant.test.ts` holds three cases:

1. A lane scope judges rita on a grant that an observation gives, so
   `agrees` holds for it. For an `offer` and an `assign`, the prediction
   with `predictionGrant` on the same state and signed bytes writes, with
   the scope's effects and sends. Its sealed entry has the bytes of the
   scope's entry in every member except `input.authority`. The scope's
   entry records the proven grant, and the prediction records the
   stand-in. A refused act gives the scope's reason.
2. A reading 120 seconds after the scope's predicts `expired`, and the
   scope writes the same bytes.
3. Under a definition whose act `own` states a row for the signer's own
   member, the scope writes on its grant's proof, and the prediction
   answers `authority-unavailable`.

## Kernel review

`docs/kernel.md` section 7 counts a new export of `packages/derive` as an
addition to the kernel. This head adds two: `predictionGrant` and its type
`PredictionActor`.

- **Why the kernel.** The stand-in is correct only while it matches how
  the judge reads `Grant` and `fresh` (`packages/derive/src/judge.ts:345`,
  `:375` and `:379`). In `derive`, a change to either breaks the witness and
  the type check of this package. In a client, the same change broke only
  at run time. A platform service or an application cannot hold that
  coupling, because the judge it predicts is kernel.
- **K items.** It closes none and adds none. It adds no scope kind,
  platform name, capability, field type, reason code, entry kind or level,
  so section 7.1 does not hold it.
- **Boundary.** It imports only `derive` modules and `contract` types. It
  names no platform definition, lane, action or application vocabulary.
