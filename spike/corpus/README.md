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

## Club baseline recovery

Club's run-1 files were not saved at the time. Validation run 3 recovers
seeds 81, 107 and 182 from the committed baseline and preserves them under
`club/run1/`. The exact baseline source is at `fixtures/club-baseline.ts`,
not copied with altered import paths: its bytes and package id match
commit `8557249`. These records are reconstructions, not historical run
artifacts; see the Club ledger's protocol gap.

Club records use `club/replay.ts`. Each step keeps source event ids as
link labels. Replay preserves the seeded genesis nonce, remaps an
application reference to the corresponding freshly committed event, and
remaps disclosures to that event's current position. Deleting a producer
omits its uses. This prevents deletion or a changed package id from
turning a valid application reference into an unrelated missing id.
`scripts/club-shrink.ts` verifies that linking preserves the original
complete series before shrinking. `test/club-corpus.test.ts` verifies
single-deletion minimality, the recorded baseline failure and a clean
repaired replay, including privacy and manifest invariants.
