# V6 planted faults

`run2/` preserves the four deletion-minimal traces measured at
`742e64a06d06226b456f489eb53deacc1bc9f5db`. Each JSON record contains
the original package and manifest identities, the mutant package identity
where applicable, the genesis nonce and linked script steps.

At the historical snapshot, `node --test test/v6.test.ts` regenerated
these traces; it did not read the committed JSON. The evidence follow-up
adds direct reads of all four retained files to that same test module.
Run the command from `spike/` to verify their package/manifest/mutant ids,
recorded outcomes, every single deletion, and clean unmutated controls.
`expected.json` is a retrospective companion derived from the recorded
results and checker #1805, not an original manifest predeclaration.
The recorded steps use `corpus/club/replay.ts`'s general link-preserving
format. Every `steps[].entries[].id` is an **unmutated control id**, used
as a link label. Replay computes the mutant's own ids and remaps application
references; the follow-up also verifies every stored id against the control.

| Record | Deliberate fault | Original/minimal steps |
| --- | --- | --- |
| `v6-sale.json` | `offer` audience becomes actor-only | 4 / 4 |
| `v6-booking.json` | `occupancy` audience becomes actor-only | 4 / 4 |
| `v6-club.json` | `standing` audience becomes actor-only | 7 / 7 |
| `v6-hidden-revocation.json` | Serve a spine revocation only to Alice | 4 / 3 |

For the first three, use the mutation already defined in
`test/v6.test.ts`: its exact rule text is
`(_ctx, event) => named(event.actor)` with audience id `v6-actor-only`.
The test reuses that value and asserts its id equals the retained id.
An equivalent rule with different source text, or a different descriptor
module setting, has a different identity. `withAudience` removes the
source package's pinned module while retaining its model functions and
other kind declarations. Recreating the rule elsewhere by following its
behavior alone is therefore not an exact-identity replay. The revocation record
uses the original Sale package: the test changes only the in-memory
serving audience after recording the history. It is a deliberately
noncompliant serving contract, not a new legal revocation policy.
Its minimum shows an affordance mismatch; the complete test also shows
the unauthorized offer that follows being accepted in Bob's view.

Full outputs, seven mutation/binding case summaries and campaign results
are in `evidence/v6/`; `manifests/v6.ledger.md` separates the run snapshots
and the retained Club plan failure.

These are hand-built mutation traces. Narrowing a rule is detected here
because an affected reader later sees an event depending on the missing
fact; the checker has no independent minimum-readable-set requirement.
