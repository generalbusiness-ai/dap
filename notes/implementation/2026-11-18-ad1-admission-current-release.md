# AD-1: act admission reads the installation's current release

AD-1 makes act admission in an application scope follow its installation
item N at Rules. It builds on U1 (`upgrade-application`, Rules 16) and U2
(the archive after an upgrade). AD-1 deploys nothing.

## Before

`ApplicationActAdmission` (`packages/scope/src/applications/act-admission.ts`)
proved the scope's birth release once per scope incarnation and cached it as
immutable. Each act then checked that birth release against
`APPLICATION_TRUST` (`act-admission.ts:98` at `7dc016cf`). Admission never
read N. So:

- After a replace, N ends `replaced`, but the old scope admitted every new
  act while its birth release stayed trusted. U2's archive stops at the
  first pass that reads `replaced`; acts sealed after that stop reach no
  archive.
- After an in-place upgrade, N names release 2. When the operator retired
  release 1 (ruling 1704aaca), the scope refused every act as
  `application-revoked`.

## After

- The ancestry walk records where N lives: the Rules scope, the Directory
  and the item number (`act-admission.ts:269`). It records them only under a
  Rules pin in `UPGRADABLE_RULES` (`installation-state.ts:13`), which names
  Rules 16. Under every other Rules pin, N never leaves `active` and never
  changes its release, so admission reads nothing more and behaves as
  before.
- Under Rules 16, admission reads N's state and release from Rules
  (`act-admission.ts:168`). The new Rules method
  `applicationInstallationState` (`object.ts:889`) answers with
  `storedInstallationState` (`installation-state.ts:26`). It answers only as
  the named Rules incarnation, for an installation item of its current
  Directory. The reply is closed: `{ state: "replaced" }` or
  `{ state, release }` for `pending`, `active` and `refused`. The caller
  checks its shape (`namespace.ts:446`).
- A `replaced` N refuses each new act with `application-replaced`
  (`act-admission.ts:141`). Otherwise admission checks trust for N's
  current release (`act-admission.ts:142`).
- `core.ts:696` returns `application-replaced` as a refusal at both
  admission checks, before the dependency reads and before the write. No
  entry is written.
- A failed or unanswered read of N makes no view, and the act returns
  `unavailable` with `dependency-unavailable`, as incomplete provenance
  does.

The new reason is in the contract (`RefusalReason`), the refusal tables of
`packages/bytes/src/records.ts`, both metric tables, the MCP error text, `docs/scopes.md`,
`docs/architecture.md`, `docs/security/settings.md` and
`docs/security/entry-points.md`.

U2's archive proof also reads N, but AD-1 does not reuse it. The proof
carries the signed semantic and release values, up to
`APPLICATION_ARCHIVE_PROOF_BYTES`, and the archive authenticates the Rules
birth first. Admission needs one state and one digest. It already holds
the Rules scope reference from its own walk of the Directory's sends.

**Question for the planner: the class of `application-replaced`.** It is
`head`, as `application-revoked` is: both are deployment admission, not a
judgment of the scope's head. A replaced N never returns to `active`, so
`never` would also describe it. But the RC-1 test
(`packages/derive/test/refusal-classes.test.ts`) gives each `never` reason
a witness that a later head refuses the same bytes, and no scope judge
decides this reason. Choose `never` and AD-1 needs that witness.

## The refresh signals

N changes only by an `upgrade-application` act at Rules. Neither form
sends anything to the old scope: the in-place outcome writes N's slots,
and the successor's creation entry ends N. So no message reaches
admission when N changes. AD-1 uses two signals.

**The archive's reading.** U2's archive pass reads N through Rules in
`preparePolicies`. For the archived scope, it answers
`{ final: "application-replaced" }` when N is replaced. The driver then
calls `finalSeen` at once (`archive-driver.ts:250`), and the object marks
its admission (`object.ts:319`, `replaced()` at `act-admission.ts:114`).
Every later check of that incarnation refuses `application-replaced`
(`act-admission.ts:136`), including the commit check of an act that passed
its first check before the mark. A marked incarnation reads no proof and
no Rules state (`act-admission.ts:75`).

**A bounded age**, for the in-place form and for scopes whose archive does
not run:

- A view of N answers for `APPLICATION_ACT_ADMISSION_REFRESH_MS`, 60
  seconds, on the scope's clock (`act-admission.ts:42`, `#fresh` at
  `:106`).
- The first act after that interval starts one flight, which reads N again
  and nothing else. The proved provenance stays cached. Concurrent acts
  share the flight.
- `replaced` is final, so that view never expires and the scope reads N no
  more.
- A new scope incarnation reads N at its first act.

### Ordering: no entry seals after the archive stops

Claim: every act that the scope admits before the mark is at or below the
head that the terminal confirms, and the scope admits no act after the
mark.

1. The mark is one synchronous statement after `prepare` resolves
   (`archive-driver.ts:241`, `:250`). It precedes the row load and every
   terminal write of that pass.
2. An act seals only inside one storage transaction:
   `this.#store.transaction` (`turn.ts:416`) runs `judge` (`turn.ts:434`),
   whose commit check calls `admissionRefusal` (`core.ts:755`), and then
   writes the entry. The store's transaction is
   `ctx.storage.transactionSync` (`sqlite.ts:187`, `object.ts:219`), a
   synchronous callback. A Durable Object runs one JavaScript event at a
   time, so no other code, the mark included, runs between the commit
   check and the write. The mark therefore falls either before the whole
   transaction, and the commit check refuses, or after it, and the entry
   is already sealed. AD-1 relies on this synchronous transaction, not on
   the input gate.
3. The terminal comes only from `#ended` (`archive-driver.ts:613`). It runs
   in two places, each synchronous with a fresh read of the scope's head:
   - after a confirmation, through `#final`, only when `#confirmed` found
     no entry above the confirmed head (`archive-driver.ts:617`, `next`
     stays null);
   - in the caught-up branch, after `readArchiveScopeFrame` reads the head
     in a transaction (`archive-driver.ts:358`) and finds nothing above the
     confirmed head (`:361`).
4. Each of those head reads follows the mark. By (2), every act sealed
   before the mark is in that head, so the terminal confirms through it.
   By (2) again, no act seals after the mark. So no entry seals after the
   terminal.

The mark lives in memory. A new incarnation reads N from Rules at its
first act, before any cached view, and N is already `replaced` there, so
it refuses as well.

A pass whose cutoff head (`archive-driver.ts:212`) is older than an act
sealed while `prepare` ran does not end the archive: `#confirmed` sets
`next`, and the next pass publishes through the newer head and then ends.

**Remaining windows.**

- In place: right after an upgrade, if the operator retires the old release
  at once, an act can refuse `application-revoked` for up to 60 seconds.
  The first act after the interval reads N again and succeeds.
- Replace: once the archive has run its pass, no window remains. Before
  that pass, the old scope can admit acts for up to 60 seconds, but the
  archive has not stopped, so it publishes them. A scope whose archive
  does not run refuses after at most 60 seconds.

## Admission cost

These counts come from the code, not from a Worker run. "Requests" are
Durable Object requests.

| Scope | Before AD-1 | After AD-1 |
| --- | --- | --- |
| Rules 15 or older install, platform scope, unpackaged | birth proof once per incarnation; 0 per act | unchanged |
| Rules 16 install, first act of an incarnation | birth proof | birth proof + 1 Rules request |
| Rules 16 install, later acts | 0 per act | at most 1 Rules request per 60 seconds while acts arrive; 0 when idle |
| Rules 16 install, N replaced | 0 per act | 0 per act after the first read of `replaced` |

At the Grow simulator's rate, about one act a minute per room (AR-11), a
Rules 16 room makes at most about 60 Rules requests an hour, the same as a
read per act. At ten acts a minute, the bound stays 60 an hour, against
600 for a read per act. An idle room makes none. No Rules 16 room exists
yet: every deployed install runs Rules 15, and its cost does not change.
AD-1 adds no alarm, no wake and no retry.

## Tests

`packages/scope/test/act-admission-upgrade.test.ts` (native) runs the
genuine `upgrade` family: Register 29, Directory 28, Membership 14, Rules 16
and Destination 21. The MCP install creates the root. Real
`upgrade-application` acts, signed as the client signs an install, run their
host fetches and pipeline. The real Worker admits or refuses each act.
Repository creation, Git/package HTTP, the clock and setup reads are TEST
fixtures. The test shows:

- In place: N moves to release 2, the trust list drops release 1, and after
  the refresh interval an act is accepted. Without release 2 in trust, the
  act refuses `application-revoked`.
- Replace: the successor is active and N ends `replaced`. An act in the old
  scope then refuses `application-replaced`, judged at its head, and the
  scope writes no entry. Later acts and a restarted incarnation refuse at
  once. The successor's own scope accepts an act.

The test runs twice. Without an archive, the replace check follows the
refresh interval. With `archive: true`, the old root runs the production
`archive` wiring with U2's real policy owner, `roomArchivePackages`, which
reads N's proof from the real Rules. Its target and provider are TEST
stand-ins; the pass ends before any provider work. Inside the refresh
interval, one archive alarm reads N as replaced, and the next act refuses.

The control for Rules 15 is
`packages/scope/test/application-owned-scopes.test.ts`. It installs under
Rules 15 and shows that withdrawing the exact release refuses
`application-revoked`, across a restart. It passes unchanged.

## Reds

`scripts/control.mjs` changed one line, ran the named file, and restored it.
Each test passed before the change and failed by an assertion with it. The
outputs are in `artroom-evidence/2026-11-18-ad1-red/`.

| Red | Line changed | Failing assertion with the change | Output | SHA-256 |
| --- | --- | --- | --- | --- |
| (r1) a replaced N refuses new acts | `storedInstallationState` answers a `replaced` item as `active` with its release, as if admission never read N's end | `a fresh act in the scope of a replaced N refuses: expected { answer: 'accepted', … } to deeply equal { answer: 'refused', … }` (`archive: false`); with the archive, the restarted incarnation reads N as active and admits | `r1.txt` | `1fd38ca1f95806946db7cd3fabf39ba175cca65d2afb91b97330ad6ecd5825f4` |
| (r2) after an in-place upgrade, admission checks N's current release | `const release = provenance.release`, the birth release as before AD-1 | `an act under N's current trusted release is admitted after the birth release leaves trust: expected 'refused' to be 'accepted'` | `r2.txt` | `4d76f96428dd0e24bfa1544aea096d723affde8da53c6bfcf491fbfd417eecfd` |
| (r3) the cached view refreshes after N changes | `#fresh` answers `true` for every view, so admission never reads N again | `an act under N's current trusted release is admitted after the birth release leaves trust: expected 'refused' to be 'accepted'` | `r3.txt` | `b5c10a848ecd2cd400e60f5f42257167e3b9eff17a9a3d6216d4c8d5da5affbf` |
| (r4) the archive's reading of `replaced` refuses the next act inside the refresh interval | `finalSeen` not called (`void final;`) | `AD-1 (archive: true) …: a fresh act in the scope of a replaced N refuses: expected { answer: 'accepted', … } to deeply equal { answer: 'refused', … }`; the `archive: false` case passes | `r4.txt` | `83dd9e71ba11b8492ef0c448eed53512c7e0eb1cbdf090309faa7d93266af101` |
| (c) a Rules 15 install reads nothing more | the walk records N under every Rules pin (`item: true ? …`) | `native installed roots and children keep exact release ownership after trust withdrawal`: `expected { result, display } to match object { result: { … } }` (the Rules 15 scope answers unavailable, so its card act fails) | `c1.txt` | `0cd76b55591b3182137d9debb3065b4c032a1b3f59694459475bcefb4a2b47e1` |

## Pinned values that moved

| Owner | Old | New |
| --- | --- | --- |
| Seal of `packages/scope/src/object.ts` `$module` | `61e64e92aebf2a3c602365b09d982b68ab0d7a348a1bc2b6232455b2bbf2079e` | `5e2a6838a478fc03bebba25aaa6d6d3ff7b3b3dda01249ef7ed0980a87047fde` |
| Seal of `object.ts` `ScopeObject` | `0c29878ad81078430c2f8470a06d9cf27d8d20205a5d136cc1329f155ab5e69d` | `293c011fd6e01a1c46d3d19e213d917c01e3fc6e07e9e240c9e9c1abc03ae307` |
| Seal of `packages/scope/src/scope-index.ts` | `b51b990281e2763f6ed73b094ff75883ae6905d5cc8e26efa1582b22ec4f2057` | `a81743f771c39157153dedcd2fb5a410ba4d5fa02487e45aa658ef4e01e60dbc` |
| Seal of `packages/scope/src/namespace.ts` | `d69ee16321e6cbc2d5bf56e003bb635b3bd2b18808241ed390059f4944aa4e2d` | `ad0f9dd3e83f8890552c7ba8828a8310935f34fef7456534bdea630dc89329f2` |
| Seal of `packages/scope/src/core.ts` `Scope` | `731b5a55a1b6cac490f61d20559600cc63b39a73d09976c6e190871c582fe2e5` | `c8242aeb84e2578de49ad02a02fe48ea3ecaa15ff86b27cb747fa446bae497a2` |
| Seal of `packages/scope/src/applications/act-admission.ts` | `bd0aba219f02c47c143e8a86b4204e1923d7c48d10cd4a873c93a40987f2eea9` | `75eacce9d74db3cb8600ae7ea322508f22bdc8c96703dfcd233a9e577665c92a` |
| Seal of `packages/scope/src/archive-driver.ts` | `b658e0fc6f2fc5ce9699f0e01f5ae231d34b67bd24b740fb4862884fa7242a66` | `61c0e3a0bff6fbed11661c3ff627932967c84d52708fe24b2ab3435035e653fa` |
| Seal of `packages/scope/src/object-archive.ts` `$module` | `7d7c0da57c8b69bc953c19a59e3bd6af25a5f02863bac10ef6fd839fc9dd5adc` | `e7430b7ed51040dd00253653d928b5a829912472cff2f5139f56478c2565f3e7` |
| Seal of `object-archive.ts` `archiveDriver` | `d7d94f8700e5c3fc868896b85272d2ca555dfaef9b7a5f7abab38d86be0fdf67` | `4d9919217465d16a43156dcf952537768c028d673fb2415d3e5d88d16888c1e6` |
| Seal of `packages/bytes/src/records.ts` | `9808419e86a06b15da0a12e5a36841bc7a2387a1c7c12074e4a2fc50cdaeeaf6` | `5bfb14e93dab8d1489c29b7e3327891a18cfe3ab0fcecf6d4396451a05efefd7` |
| Open Lending 0.6.0 presentation | `sha256:b69ff12dc9dde27ee2620cc3a0c3c534836d1e15ba60a767d7a12778d5570dd1` | `sha256:f127d30a7db0bbc241a22d881387eca38719c5bd64e533b5bf5d7523a06bb880` |
| Open Counter 0.7.0 presentation | `sha256:3d5b065e9af8ac35a3ede715028064cc3435d4ac97cffb23b1ab41913c4c0cf1` | `sha256:ec1ea5c6ca72a2fff8e0bd2bcbc595ef4f025d14d3e23fbecae5d081b13d0b14` |
| Page module `apps/room/page/assets.ts` | 2500268 bytes | 2500324 bytes |
| Card module `packages/mcp/src/views/generated.ts` | regenerated by `packages/mcp/scripts/views.mjs` | |

Each seal is the value that `scripts/security-entry-points.test.mjs` prints
for the reviewed source. The new refusal reason reaches the bundled refusal
tables, so the open screens, the room page and the MCP cards move. No
signed release changes.
