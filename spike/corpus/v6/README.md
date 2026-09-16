# V6 planted faults

`run2/` preserves the four deletion-minimal traces measured at
`742e64a06d06226b456f489eb53deacc1bc9f5db`. Each JSON record contains
the original package and manifest identities, the mutant package identity
where applicable, the genesis nonce and linked script steps.

From that snapshot's `spike/` directory, run
`node --test test/v6.test.ts` to regenerate and validate these traces.
The test verifies exact replay of each original history, every single
deletion of its minimum, and the corresponding clean unmutated control.
The recorded steps use `corpus/club/replay.ts`'s general link-preserving
format. Application references are remapped when replay changes an id.

| Record | Deliberate fault | Original/minimal steps |
| --- | --- | --- |
| `v6-sale.json` | `offer` audience becomes actor-only | 4 / 4 |
| `v6-booking.json` | `occupancy` audience becomes actor-only | 4 / 4 |
| `v6-club.json` | `standing` audience becomes actor-only | 7 / 7 |
| `v6-hidden-revocation.json` | Serve a spine revocation only to Alice | 4 / 3 |

For the first three, construct the mutant with `withAudience` using
audience id `v6-actor-only` and the event actor as sole recipient; the
model code and all other kinds stay unchanged. The revocation record
uses the original Sale package: the test changes only the in-memory
serving audience after recording the history. It is a deliberately
noncompliant serving contract, not a new legal revocation policy.
Its minimum shows an affordance mismatch; the complete test also shows
the unauthorized offer that follows being accepted in Bob's view.

Full outputs, seven mutation/binding case summaries and campaign results
are in `evidence/v6/`; `manifests/v6.ledger.md` separates the run snapshots
and the retained Club plan failure.
