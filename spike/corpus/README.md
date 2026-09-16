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

Sale's `run1/` keeps its 17 original failures under the historical
projection-only budget. Its test and shrink script pass an empty view
intentionally for that historical check. `run6/` keeps all nine series
with newly exposed counter misdeliveries under the corrected
readable-events budget. Its test asserts the exact recorded finding,
checks every single-step deletion, and requires the repaired model to
have no violation. The model copy differs from its snapshot only in the
two import paths; the ledger cites both the experiment and the measured
package, and each JSON entry pins the kept copy's package identity.

The V4 foundation repair makes unauthorized application attempts
actor-only. Sale run 6's complete historical failure set and its original
deletion-minimality checks therefore require the earlier foundation:
at `009b5226bd77b9f9d5e7ccad70b39867ef3d1a41`, run
`node --test test/sale-corpus.test.ts`. With the current foundation, six
unauthorized counter failures are clean even under the kept model;
the three authorized counter failures (172, 181, 200) still reproduce
under that model. All nine are clean under the current Sale model and
foundation. V3's ledger and literal corpus records retain their original
identities and findings; V4 records this change of foundation explicitly.

Booking run 7 also depends on the old foundation. Its README and
`boundary.txt` pin exact snapshot `7ffa50814ec558781feeeae09b36ff8f089c2fb4`
for reproducing all 99 failures. The full scripts retain original
request-id links in addition to their minimized privacy failures.

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

The three literal Club descriptions, including their event-id previews,
reproduce at V5 evidence snapshot `772a514a08c2fac72fe534c8490c8d33a3e1c2d1`:
run `node --test spike/test/club-corpus.test.ts` from that checkout's root.
V6 incorporates V3's audience-read binding contract, changing bindings
and event ids without changing the Club package. The integrated test
checks the same recorded description with only the linked application's
id remapped, verifies its full id in both the vote and projection, and
rechecks minimality and the repaired outcome. The JSON records remain
unchanged.
