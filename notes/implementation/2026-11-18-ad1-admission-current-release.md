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
  and the item number (`act-admission.ts:254`). It records them only under a
  Rules pin in `UPGRADABLE_RULES` (`installation-state.ts:13`), which names
  Rules 16. Under every other Rules pin, N never leaves `active` and never
  changes its release, so admission reads nothing more and behaves as
  before.
- Under Rules 16, admission reads N's state and release from Rules
  (`act-admission.ts:153`). The new Rules method
  `applicationInstallationState` (`object.ts:885`) answers with
  `storedInstallationState` (`installation-state.ts:26`). It answers only as
  the named Rules incarnation, for an installation item of its current
  Directory. The reply is closed: `{ state: "replaced" }` or
  `{ state, release }` for `pending`, `active` and `refused`. The caller
  checks its shape (`namespace.ts:446`).
- A `replaced` N refuses each new act with `application-replaced`
  (`act-admission.ts:126`). Otherwise admission checks trust for N's
  current release (`act-admission.ts:127`).
- `core.ts:696` returns `application-replaced` as a refusal at both
  admission checks, before the dependency reads and before the write. No
  entry is written.
- A failed or unanswered read of N makes no view, and the act returns
  `unavailable` with `dependency-unavailable`, as incomplete provenance
  does.

The new reason is in the contract (`RefusalReason`), the refusal tables of
`packages/bytes/src/records.ts` (class `head`, as `application-revoked`: deployment admission, not a judgment of the scope; the RC-1 witnesses of class `never` are scope judgments), both
metric tables, the MCP error text, `docs/scopes.md`,
`docs/architecture.md`, `docs/security/settings.md` and
`docs/security/entry-points.md`.

U2's archive proof also reads N, but AD-1 does not reuse it. The proof
carries the signed semantic and release values, up to
`APPLICATION_ARCHIVE_PROOF_BYTES`, and the archive authenticates the Rules
birth first. Admission needs one state and one digest. It already holds
the Rules scope reference from its own walk of the Directory's sends.

## The refresh signal

N changes only by an `upgrade-application` act at Rules. Neither form
sends anything to the old scope: the in-place outcome writes N's slots,
and the successor's creation entry ends N. So no message reaches
admission when N changes. AD-1 uses a bounded age instead:

- A view of N answers for `APPLICATION_ACT_ADMISSION_REFRESH_MS`, 60
  seconds, on the scope's clock (`act-admission.ts:42`, `#fresh` at
  `:106`).
- The first act after that interval starts one flight, which reads N again
  and nothing else. The proved provenance stays cached. Concurrent acts
  share the flight.
- `replaced` is final, so that view never expires and the scope reads N no
  more.
- A new scope incarnation reads N at its first act.

**Limit.** For up to 60 seconds after N changes, an incarnation can answer
from its earlier view:

- After a replace, it can admit an act. If U2's archive stopped in that
  window, the act reaches no archive.
- After an in-place upgrade and an immediate retirement of the old release,
  it can refuse an act as `application-revoked`. A retry after the
  interval succeeds.

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
- Replace: the successor is active and N ends `replaced`. After the refresh
  interval, an act in the old scope refuses `application-replaced`, judged
  at its head, and the scope writes no entry. Later acts and a restarted
  incarnation refuse at once. The successor's own scope accepts an act.

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
| (r1) a replaced N refuses new acts | `storedInstallationState` answers a `replaced` item as `active` with its release, as if admission never read N's end | `a fresh act in the scope of a replaced N refuses: expected { answer: 'accepted', … } to deeply equal { answer: 'refused', … }` | `r1.txt` | `d95b40f213718c83868143a43d3396b6ee0452441853e527a96748435f366835` |
| (r2) after an in-place upgrade, admission checks N's current release | `const release = provenance.release`, the birth release as before AD-1 | `an act under N's current trusted release is admitted after the birth release leaves trust: expected 'refused' to be 'accepted'` | `r2.txt` | `dfdc8ad7ee3f8ac926c4c32fc2bb3ddfdf06acbc70d43164c259f466bfc5e68f` |
| (r3) the cached view refreshes after N changes | `#fresh` answers `true` for every view, so admission never reads N again | `an act under N's current trusted release is admitted after the birth release leaves trust: expected 'refused' to be 'accepted'` | `r3.txt` | `d54a6e9fda62deff5c2d6179d480661d6837d5cbb1d7c390ce498dddd27fa3a4` |
| (c) a Rules 15 install reads nothing more | the walk records N under every Rules pin (`item: true ? …`) | `native installed roots and children keep exact release ownership after trust withdrawal`: `expected { result, display } to match object { result: { … } }` (the Rules 15 scope answers unavailable, so its card act fails) | `c1.txt` | `2435d81d540fe6f116226756115a7ca2ec178f7e2b6e3729de39b7b388c1b023` |

## Pinned values that moved

| Owner | Old | New |
| --- | --- | --- |
| Seal of `packages/scope/src/object.ts` `$module` | `61e64e92aebf2a3c602365b09d982b68ab0d7a348a1bc2b6232455b2bbf2079e` | `b5a75b1b796e41010438ce99353defd43169ad1dc36c5a5a5cba8a5cdb95a6e5` |
| Seal of `object.ts` `ScopeObject` | `0c29878ad81078430c2f8470a06d9cf27d8d20205a5d136cc1329f155ab5e69d` | `2fdf4ee3e46d326267dc316910535d3d882452e8fb47b96706330780a097d575` |
| Seal of `packages/scope/src/scope-index.ts` | `b51b990281e2763f6ed73b094ff75883ae6905d5cc8e26efa1582b22ec4f2057` | `a81743f771c39157153dedcd2fb5a410ba4d5fa02487e45aa658ef4e01e60dbc` |
| Seal of `packages/scope/src/namespace.ts` | `d69ee16321e6cbc2d5bf56e003bb635b3bd2b18808241ed390059f4944aa4e2d` | `ad0f9dd3e83f8890552c7ba8828a8310935f34fef7456534bdea630dc89329f2` |
| Seal of `packages/scope/src/core.ts` `Scope` | `731b5a55a1b6cac490f61d20559600cc63b39a73d09976c6e190871c582fe2e5` | `c8242aeb84e2578de49ad02a02fe48ea3ecaa15ff86b27cb747fa446bae497a2` |
| Seal of `packages/scope/src/applications/act-admission.ts` | `bd0aba219f02c47c143e8a86b4204e1923d7c48d10cd4a873c93a40987f2eea9` | `25a5f80e6cfb83bc8b268fa86051212802e228bd028370dde4ddaa2691b05652` |
| Seal of `packages/bytes/src/records.ts` | `9808419e86a06b15da0a12e5a36841bc7a2387a1c7c12074e4a2fc50cdaeeaf6` | `5bfb14e93dab8d1489c29b7e3327891a18cfe3ab0fcecf6d4396451a05efefd7` |
| Open Lending 0.6.0 presentation | `sha256:b69ff12dc9dde27ee2620cc3a0c3c534836d1e15ba60a767d7a12778d5570dd1` | `sha256:f127d30a7db0bbc241a22d881387eca38719c5bd64e533b5bf5d7523a06bb880` |
| Open Counter 0.7.0 presentation | `sha256:3d5b065e9af8ac35a3ede715028064cc3435d4ac97cffb23b1ab41913c4c0cf1` | `sha256:ec1ea5c6ca72a2fff8e0bd2bcbc595ef4f025d14d3e23fbecae5d081b13d0b14` |
| Page module `apps/room/page/assets.ts` | 2500268 bytes | 2500324 bytes |
| Card module `packages/mcp/src/views/generated.ts` | regenerated by `packages/mcp/scripts/views.mjs` | |

Each seal is the value that `scripts/security-entry-points.test.mjs` prints
for the reviewed source. The new refusal reason reaches the bundled refusal
tables, so the open screens, the room page and the MCP cards move. No
signed release changes.
