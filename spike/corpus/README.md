# Corpus

Shrunk failing series (spike plan §4.4: every failing series is shrunk
and committed). One directory per model and checker run,
`corpus/<model>/<run>/`, holding:

- `model.ts`: the model as it was at that run's snapshot, kept so the
  failure is replayable after the model is repaired. Its import paths
  differ from the original file's, so its module hash and package id
  differ from the ids the ledger cites for the snapshot; the function
  text is identical.
- `seed-<n>.json`: a deletion-minimal script (`src/corpus.ts`) that
  failed under that model, with the seed, the manifest revision the run
  used, the package id of the kept model, the run name, and the first
  violation as the checker described it. Attach steps name packages by
  name, resolved by the test.

`test/<model>-corpus.test.ts` replays every entry against the kept model
and asserts the recorded failure kind still occurs, then replays it
against the current model and reports the outcome as a diagnostic.
`scripts/<model>-shrink.ts` produces the entries from a run's failing
seeds.
