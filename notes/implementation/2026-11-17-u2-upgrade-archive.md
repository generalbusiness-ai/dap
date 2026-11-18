# U2: the archive after an application upgrade

U2 builds step 2 of
[the application upgrade note](../2026-11-17-application-upgrade.md) for both
forms of U1's `upgrade-application` act. It follows Hugh's decision 2
(`c69cb559`) and ruling D3 (`8f26aa9b`): item N ends in the successor's
creation entry, and U2 owns the archive's stop. U2 deploys nothing. The
deployment carries U1 and U2 together.

## What the archive did before

An application scope's archive asks Rules for a proof of its installation
item in each pass (`apps/room/archive-packages.ts`).

- In place: the room compared the item's `release`, `semantic` and
  `presentation` with the scope's birth values. After an in-place upgrade,
  `release` and `presentation` differ, so the proof never matched. Each pass
  threw `ArchivePolicyPending`, and the driver retried with the AR-1
  backoff: 60 seconds, doubling to one hour, for ever. The room also refused
  the scope when the birth release left `APPLICATION_TRUST`, although the
  item no longer names that release.
- Replace: Rules refused a `replaced` item as `malformed-or-unsupported`
  (`packages/scope/src/applications/archive-proof.ts`). The archive stopped
  at once with `application-policy-unavailable`, before it published the
  entries that the scope sealed before the replacement.

## What the archive does now

**In place.** The room compares the item's `semantic` identifier and root
`definition` with the birth values, not `release` and `presentation`
(`archive-packages.ts:135`). The semantic identifier names the root
definition and the archive policies, so equal values keep the same policy.
The room checks `APPLICATION_TRUST` for the item's current release only, in
`add`, as before. It no longer checks the birth release. The archive
continues on the new release, and the old release can leave the trust list.

**Replace.** Rules proves a `replaced` item with the proof that it had while
active, and wraps it as `{ replaced: <proof> }` (`archive-proof.ts:82`,
`:98`). A replaced item keeps every slot it held when it ended. The room
accepts the proof and adds its policies as for an active item. For the
archived scope itself, `prepare` then answers `{ final:
"application-replaced" }` (`archive-packages.ts:152`). A replay source or a
Directory candidate that names a replaced item uses its policies and does
not stop.

The driver takes `final` as "publish through the head, then stop"
(`packages/scope/src/archive-driver.ts:243`):

- A pass that confirms an append through the scope's current head writes the
  terminal (`archive-driver.ts:343`, `:532`, `#final` at `:600`).
- A pass that finds the archive already through the head writes the terminal
  at once and sends nothing (`archive-driver.ts:353`).

A partial append continues in the next pass, as before. The terminal write
is the existing `prepareHalt`: it stores the reason and the wake index
`{ pending: false, stopped: true, next: null }`. A later pass reads the
terminal first and calls no port. `committed(false)` at activation and
`committed(true)` after a sealed commit leave a stopped wake index alone
(`ArchiveRows.signal`), so `wake()` stays null.

### The stop position

N ends in the successor's creation entry at Rules (D3). Rules positions and
the old scope's positions have no common order. The archive first reads
"replaced" after N ended, so every entry that the old scope sealed before N
ended is at or below the head of that pass. The archive publishes through
the head of the pass that reaches it, then stops. Members who still hold the
old scope can act there (note section 2.6); an entry that they seal after
the archive reached the head is not published.

## Wake floor and request rate

These figures come from the code and the AR-1 and AR-4 measurements, not
from a run on a Worker. One archive pass costs one alarm on the scope and up
to about six calls on the Directory scope, so up to about 7 Durable Object
requests (`notes/implementation/2026-11-16-ar1-archive-wake-rate.md`).

| Upgraded scope | Before U2 | After U2 |
| --- | --- | --- |
| In place, archive caught up | 1 retry pass an hour at the AR-1 cap, for ever: about 7 requests an hour, up to about 42 in the first hour | 0 wakes an hour; idle as before the upgrade |
| Replaced, archive caught up | 1 pass, then stopped (`application-policy-unavailable`) | 1 pass, then stopped (`application-replaced`): about 7 requests once |
| Replaced, entries not yet published | stopped with the entries unpublished | the passes that publish them, then stopped: 0 wakes an hour after |

The wake floor of a scope that is idle, or stopped, is zero archive wakes an
hour, before and after U2. U2 adds no alarm, no new wake cadence and no
retry. It removes the hourly retry that an in-place upgrade would otherwise
start. Other owners' alarms in a stopped scope still run an archive pass,
which reads the terminal from local SQLite and makes no Durable Object
request.

## Tests

- `packages/scope/test/archive-upgrade.test.ts` (native): a driver over a
  real lane with a policy owner that answers `final`. It shows the publish
  then stop, a later act that the archive does not publish, and a driver
  constructed again whose `committed(false)` and `committed(true)` leave
  `wake()` null. A second case stops a caught-up archive at its first pass.
  A third case runs `storedApplicationArchiveProof` under Rules 16 on the
  labelled stand-in store of `archive-application-proof.test.ts`.
- `packages/scope/test/archive-installed.fixture.ts`, shared Base case: the
  real identity walk, `roomArchivePackages`, `roomArchiveDriver` and the
  Artifacts peer. A proxy rewrites the Rules reply. In place, the reply
  names release 2 of the same package, with a new presentation
  (`applicationOwnedScopesPacket` takes a `page`). The pass is idle with
  both releases trusted, and again with release 1 removed from trust. For
  the replace form, the reply for the second installation is wrapped as
  `{ replaced }`. That scope was never archived; its passes publish through
  its head into a separate peer and then stop, and a later pass makes no
  provider call.

## Reds

`scripts/control.mjs` changed one line, ran the named file, and restored it.
Each test passed before the change and failed by an assertion with it. The
outputs are in `artroom-evidence/2026-11-17-u2-red/`.

| Red | Line changed | Failing assertion with the change | Output | SHA-256 |
| --- | --- | --- | --- | --- |
| (1) an in-place upgrade makes no hourly retry | the semantic comparison in `installed`, back to `!same(checked.installation.ids, identity.ids)` | `an in-place upgrade makes no retry: expected { state: 'retry', next: '…00:01:00Z', reason: 'unavailable' } to deeply equal { state: 'idle', next: null }` | `1.txt` | `28ed48fa8986dde5c729751ab2f125c2ed853b397b5c5a08101d82de20c1f0d3` |
| (1) the archive continues on the new release | the birth-release trust check restored before the proof | `expected { state: 'stopped', … } to deeply equal { state: 'idle', next: null }` | `1b.txt` | `3620ce05178f1659caaeae3d141659a211f192ef910a0dfea62b3f7b2a8b0691` |
| (2) a replaced scope publishes through its head, then stops | `#final` returns the confirmed pass unchanged | `expected { state: 'confirmed', next: null } to deeply equal { state: 'stopped', … }` | `2.txt` | `01f9e0eb89d4865e415bc34e6f0b36f556b3699b3049518bc5638aeb25bf4f69` |
| (2) a published replaced scope stops at its first pass | the caught-up `final` branch removed | `expected { state: 'idle', next: null } to deeply equal { state: 'stopped', … }` | `2b.txt` | `cd5175603e84e4b0d3768ede54cf96665a9b35744ce381c1deded1ff97df069d` |
| (2) Rules proves a replaced item | `const replaced = false` in `storedApplicationArchiveProof` | `expected false to be true` (no `{ replaced }` answer) | `2c.txt` | `18e1694eb3d085c159e902135c55c6c8df56179079f0855e30b4555a170ab576` |
| (2) the room ends a replaced scope | `prepare` returns nothing for a replaced item | `[confirmed, idle]: expected { state: 'idle', next: null } to deeply equal { state: 'stopped', … }` | `2d.txt` | `494b971788a1ffbda0a85bb891ed42414f492e99c996ca9a8600616d718ded79` |

## Pinned values that moved

| Seal in `scripts/security-entry-points.test.mjs` | Old | New |
| --- | --- | --- |
| `apps/room/archive-packages.ts` | `f4155b32056fef2ae38ac64b553b83a0de5427d97a7b30fceef76347c80edc9b` | `498af8abfd2a1f156246e9a61c992534cffb5accaca14705716a4f89db2797f7` |
| `packages/scope/src/applications/archive-proof.ts` | `163a8b2f7710752ee09e24d4b81704bc2fe8ce1484ad4a58b42edb9a89d5004b` | `656367117f636c22f17a23fe4c5c7482673170daf50c501f3c287ff726cc1cba` |
| `packages/scope/src/archive-driver.ts` | `b62a1a7da449452b95b44a2124692021023ab1f1ffe8e7020c28580b3c77b345` | `b658e0fc6f2fc5ce9699f0e01f5ae231d34b67bd24b740fb4862884fa7242a66` |
| `apps/room/archive.ts` | `b024fdfc2c69cfe3b835e02dadf6a9aab822ebb1b66885244642c817a5342ae0` | `46c55978ad31bbabc4a414d2f1ee1d9f8f432b447fb303109634367c2025e30f` |

No generated module, signed release or presentation moves.
