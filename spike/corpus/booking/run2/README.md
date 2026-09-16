# Booking run 2: recovered privacy counterexamples

Run 2 (`7b24e86`) recorded 139 failing seeds but did not save their
scripts. Checker run 5 closes that evidence gap. `model.ts` and
`generate.ts` are the run-2 sources with only import paths changed.
The kept model's package id consequently differs from the original
`sha256:2377b1c0dff725e4cd599cf8680729fb066d81d395d1fb6b608b1ff397964790`.
The manifest is unchanged:
`sha256:771a9cb82aff7b03bf50b55b490e35710da3e3072bd8877a7b79a13100bfc3f7`.

`scripts/booking-shrink.ts` regenerates all 200 seeds using that model
and generator with the current replay boundary. This recovers the
historical choices and the same 139 failing seeds. It does not recreate
the exact original event bytes: run 2 used random nonces, and its
generated request ids did not survive replay (ledger run 4). The privacy
failure depends on readable parties and disclosed positions, not those
request ids. No recovery is claimed for the original bytes.

Each JSON file is deletion-minimal for a readable request or cancel
outside its booker-and-admin audience. `seeds.txt` lists every failing
seed. The corpus test checks all records against the kept model,
confirms that no one-step deletion preserves that privacy failure, and
replays them against the current model. Literal disclosure of private
events still violates the current model's budget: fix 1 restricts the
fixture's disclosing client, not the foundation's disclosure operation.
The repaired generator's 200-seed campaign separately tests that policy.
