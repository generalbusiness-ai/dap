# Kind checks dropped at the identifier cutover (C+D)

A scope reference names a scope ID and a genesis hash, and no kind. The C+D
source head drops every comparison of a reference's `kind`. Ruling 7 of
97583e65 keeps those drops if the tables name each one and what replaces it.

Each row has one of these replacements:

- **The place fixes the kind:** the field, slot or position that holds the
  reference admits one kind only.
- **Reads sourceKind:** the sender kind that the entry records.
- **Reads the kind of the admitted genesis:** from the genesis bytes that
  `admitSequenceGenesis` admitted.
- **Reads the definition the summary names:** the platform name of the
  definition that the scope pins.
- **Compares with a held reference:** a full reference, or a scope ID, that
  the caller already holds.

The [kind table](cd-dropped-kind-checks-tables.md#kind-table) covers
commits from `c6c836b5` to the head. A script listed each removed line of
each commit's diff that compares `.kind` with a quoted word, at the first
line of the hunk in the new file. The last eleven rows come from a second
read of the head's admission and routing files, with head line numbers.

## Checks against a variable

These drops, which the script cannot find, compare a kind with a variable or
a declared type:

| File | Check dropped | What replaces it | Commit |
|---|---|---|---|
| `packages/client/src/declared.ts` | a `scope` field value's kind against the declared `type.kind` | the place fixes the kind | `59428282a9` |
| `packages/cli/src/status-report.ts` | a discovered reference's kind, used as its label | the slot name gives the label (`root` is the directory) | `95231387b4` |
| `packages/derive/src/device-command-grant.ts` | the grant's scope kind | the place fixes the kind | `7b7d232905` |
| `packages/derive/src/grant.ts` (`observationOf`) | `of.kind !== "membership"` | the place fixes the kind | `7b7d232905` |
| `packages/derive/src/native-capacity.ts` | the constant scope reference's kind | the reference is `"*"` | `7b7d232905` |
| `packages/platform/src/rules-certificate*.ts` | the binding's rules and destination kinds | the place fixes the kind | `f9e3f22cf0` |
| `packages/platform/src/application-install-grants.ts` | line 17, the grant scope kind | the place fixes the kind | `f9e3f22cf0` |
| `packages/scope/src/applications/projection-source.ts` | `room["rules"].kind !== "rules"` | the place fixes the kind | `f17b1e4779` |
| `packages/scope/src/github-repository-bindings.ts` | `destination.kind !== "destination"` | the place fixes the kind | `f17b1e4779` |
| `packages/checkers/src/job.ts` (`originOf`) | `lane.kind !== "lane"` | the place fixes the kind | `f71673d50c` |
| `packages/checkers/src/job.ts` (`reservationOrigin`) | `snapshot.destination.kind !== "destination"` | the place fixes the kind | `f71673d50c` |
| `packages/checkers/src/stage-origin.ts` | `snapshot.destination.kind !== "destination"` and the source genesis's `at.kind` | reads the kind of the destination genesis among the sources | `f71673d50c` |
| `packages/bytes/src/field-value.ts` (`fitsFieldType`, line 39) | a `scope` value's kind against the declared `type.kind`: `isScopeRef(v) && v.kind === type.kind` became `isScopeRef(v)` | the room checks the kind where it reads that sequence (ruling 429c1be7, sites a to d): the sender of a delivery, the parent source of a creation, the source of each named foreign fact use, and a membership that a grant or a creation context reads | `23e0c92d04` |

Each act, genesis and slot value passes through `fitsFieldType`
(`packages/derive/src/values.ts:25`, `effects.ts:93`). So a member with
`task.control` can store a Membership reference in the Directory's
`task.lane` slot through `open-task` (`packages/platform/src/directory.ts:307`),
which main refused; a read of that slot meets the kind check where it reads
the sequence.

## Comparisons that chose a behaviour

Ruling 7 (ii) excludes a comparison that chose between two code paths for one
slot. Two sites did:

- `apps/room/page/src/open-requests.ts` and `original-check.ts`: a row to the
  directory also locks, stops or settles it. Under ruling 10 (b) the page
  compares the row's reference with the directory reference it holds and the
  partition references its directory read returns (`partitionIndexes`), so a
  row to a partition locks the directory and reads "in this room".
- `packages/cli/src/command-verify.ts:57`: the verify source reads create
  results only from a register's pages. Ruling 190b31f4 (V1) compares the
  page's full reference with the configured register; a member's home holds
  none, and the check then read no results (B17). The scan now skips the
  comparison only when no register is configured, and keeps only a result that a Directory genesis delivered for a create that the
  page's own scope sent, and only a register sends that create.

## The retired-room reader commit

`RETIRED_ROOM_READER_COMMIT` lives in `packages/bytes/src/retired-room.ts`,
the lowest package that `scope` and `mcp` both use; ruling 190b31f4 (Q-S4)
keeps it out of `contract`. Its value is main
`64112e4576b4c3c8fb668389786deb6b703da417`, the last old-format main commit,
which this head integrates. The planner named it in act b6f9f350 and holds main
until the cutover lands.

## Re-pinned platform digests

The dropped kind checks change the declaration bytes of three platform
versions (listed per ruling 862eb586 item 6; no other pin changed).
`packages/platform/scripts/pin-native-declarations.mjs` wrote the new pins
into `native-declarations.generated.ts`.

| Version | Old digest | New digest |
|---|---|---|
| `platform:inbox@1` | `sha256:2d4fb56155ddc0cf02bfc75ac89a261c35aeb3069771e4a51429319ccd204748` | `sha256:1110d86e954737e3b9412887f0f357ac9374a60e43570ef2e28fe79c64c0cfe0` |
| `platform:destination@5` and `@6` (one digest) | `sha256:aed97f875f0331aeb249deff7a35b45378decfae43a3efedb5eac8ca43433f96` | `sha256:40d9aae597c18d7507edc096c699e7e9730b2cb918b8375edb2cc36938539209` |

`packages/platform/test/versions.test.ts` states the new pins. The I5 note
(`2026-10-07-i5-definition-versions-delivery.md`) keeps the old inbox digest
as the record of its time.

## The demo Site pin (rulings 0a5f97ba and dfae40ef)

`demoDefinitions` (`examples/grow/demo-definitions.ts`) points the Site's
`create-room` send at the demo Room, but the Site's `receives.room-summary`
handler pinned the maintained Room, so the package check refused the
source-built demo with `wrong-peer`. Under ruling 0a5f97ba (a) the handler
pins the demo Room; act dfae40ef confirms the digests.

| Definition | Before | After |
|---|---|---|
| demoSite | `sha256:7ca60d1e213b1d16b638e134cffa469e55d05a89a81bf1a5492b2789903527da` | `sha256:833c0702b5e301cf7cee5f4f354f55f747c5f1830a4a7623afdb94205a46bac5` |
| demoRoom | `sha256:3ea5dcacd1c7a57af0e6e28d2678bf9d159d242ae338eb4eae03c2852edd5d41` | unchanged |
| Room | `sha256:2fc33678c6a6cc291685c1c4b35accc8833b9068d9cdb68c7118f389dbb11e85` | unchanged |
| Site | `sha256:a95c1de0e3a9953831aecb35535e8b72891973e7ca8f3c61aedc69b5f0ee695d` | unchanged |

No package could hold the old demoSite `7ca60d1e`, which the package check
refused; F's identity ledger keeps it as recorded history. With the TEST
signer `fixedSigner(254)`, the source-built demo packs with semantic
`sha256:49eddfe2a06f9412ac7ba7551c06e71e1266330cc6e7df094cdd0dd71dae9883` and
presentation `sha256:2a3adecf80d11e4734d1b63fc43121e7e73197ee16c3448782cec15e586ef78c`.

## Held test assertions

These test assertions read a reference's kind, or a reason that names the
incarnation, and no row above covers them. Each has a `// HELD` comment, and a
ruling decides its replacement.

| File | Assertion | Question |
|---|---|---|
| `packages/replay/test/verify.test.ts` | a reference to another genesis fails with `wrong incarnation` | which reason the replay now gives |
| `packages/checkers/test/reservation-origin.test.ts`, `reservation-record.test.ts` | the frozen `fixtures/reservation-record.json` names `at` and `inc` | a new recording from the Scope recorder |
| `packages/cli/test/scope-index-applications.test.ts` | the recorded `fixtures/application-release-listing.json` names `inc` and `kind` | a new recording of the listing |

## Browser store list (rulings e7787de0 items 5 and 6, 4393b366 P1)

Ruling e7787de0 item 5 puts Page rows 14, 15 and 18 in case A: the settings
slot, the Start and enrollment originals and the tab list record take new
storage names, and the legacy key migration leaves the code; the key store
stays (see the table). Item 6 renames the Counter and
Lending browser databases (rows 20 to 22): no capacity is shared with an old
row, and no default or address-only slot can load one. Ruling 4393b366 P1
adds the claim journal, the connection custody rows and the OAuth connection
rows to case A.

| Row | Store | Old name | New name |
|---|---|---|---|
| 14 | Page settings slot | `artroom-page:v2` | `dap-page-settings-2` |
| 15 | Page Start original | `artroom-page-start:v2:<origin>` | `dap-page-start-2:<origin>` |
| 15 | Page enrollment original | `artroom-page-enrollment:v2:<origin>` | `dap-page-enrollment-2:<origin>` |
| 18 | Page tab list record | `artroom-page-lists:v2` | `dap-page-lists-2` |
| P1 | Page claim journal | `artroom-page-claim:<binding>` | `dap-page-claim-2:<binding>` |
| P1 | Page connection custody | `artroom-page-connections` | `dap-page-connections-2` |
| P1 | Page OAuth connection | `artroom-oauth-connection-1` | `dap-oauth-connection-2` |
| — | Page key store | `artroom-page-private-1` | unchanged: it holds keys and no reference |
| 20–22 | Counter database | `artroom-counting-private-1` | `artroom-counting-private-2` (a9c4badb23) |
| 20–22 | Lending database | `dap-lending-private-1` | `dap-lending-private-2` (a9c4badb23) |

The Page reads no old name. The head removes `migrateStart`,
`migrateOriginalStart`, `migrateOriginalJoin`, `legacySettingsKey`,
`migratePageOperations`, the claim recovery migration and their tests. Start
and enrollment rows are version 2 only and hold a public key, never a secret.
An old link gets `room-retired` from the Worker, and the old browser rows
stay unread.

Release text (ruling 5f63a8f2 Q-R1; also in `docs/operate-a-service.md` and
the landing commit body):

"Rooms made before the identifier cutover are retired. An old link answers `room-retired`, or 404 on a Worker that serves only indexed scopes. The browser keeps its old rows and no longer reads them."

Kept: the "Join with config and key" screen (`apps/room/page/src/main.ts`)
imports a pasted `device.key` through the key store's `migrate`, and the join
path imports a supplied `secret` the same way. Neither reads a stored row.
Ruling 5f63a8f2 keeps both on one condition: a pasted config with
`v: 1` gets the retired-home refusal of e46dd964 item 5, and the screen
imports nothing from it. `isRetiredConfig` (`apps/room/page/src/data.ts`)
checks before the screen reads the key; the config scene of `apps/room/page/test/settings.test.ts`
pastes a `v: 1` config and checks the refusal, no open, no settings write and
no key import.

## Grow and lending examples

The grow examples check each entry with `isEntryBodyOf` against the room's
sequence reference; the simulator host reads the room kind `lane` from the
genesis seed, not the binding.

## Summaries asked for their own kind (ruling 5f63a8f2 Q-L1)

Where code asked a summary for the kind of its own scope, it reads the
summary's `definition` instead.

| File | Check dropped | What replaces it |
|---|---|---|
| `examples/lending/browser/model.ts` (`memberForKey`) | `summary.scope.kind !== "membership"` | the definition matches `platform:membership@<n>`; any other returns null |
| `packages/scope/test/signed-reads.test.ts` | the summary's `scope.kind` is `register` | the definition matches `platform:register@<n>` |
| `apps/room/page/test/task-data.scope.test.ts` | the child summary's `scope.kind` is `lane` | the child's definition is the lane definition digest, which the assertion already compared |

The lending test roster names `platform:membership@13`; a roster with a
directory definition returns null.

## Hold task field (ruling 4393b366 T3(d))

The `task` field of a hold@1 instance step holds the plain lane reference,
with no kind, as `packages/mcp/test/room.scope.test.ts` sends it.

## Coverage kind (ruling 4393b366 T3(a))

A report coverage row keeps the kind as its own member beside the reference,
read from the genesis of the covered sequence; only a row that covers entry 0
carries one. The `dap verify` shared coverage line states
`kind register` again; the replay tests build expected rows with
`coverageRow`, which reads the kind from the same genesis.

## Old-format room values in tracked configuration (ruling 19a509a5)

Ruling 19a509a5 (Q-D1) removes `DEMO_START_CONFIG` from
`apps/room/wrangler.demo.jsonc`, so the demo Worker serves no start offer:
`/v1/demo/creation-offer` answers 404, as the smoke table expects. The planner
makes the new registers after the cutover deployment and puts their
references in its own configuration head.

The table names each tracked value that refers to a room made before the
cutover, and what the Worker does with it until the planner's configuration
head; a read or a delivery to each named scope answers `room-retired`. This behaviour is read from the source; no run
observed it.

| Value | File | What the Worker does with it until the planner's head |
| --- | --- | --- |
| `REGISTER_SCOPE` `sc_zm56…` | `apps/room/wrangler.demo.jsonc` | Parentless creation admits only an install whose seed hashes to this retired register, so the Worker creates no room. |
| `INSTALLED_REGISTER_SCOPES` (`sc_b5q4…`, `sc_zm56…`) | `apps/room/wrangler.demo.jsonc` | The Artifacts host serves only rooms under these retired registers, so it serves no live room. |
| `ARTIFACTS_CONFIG.registerScope` `sc_zm56…` | `apps/room/wrangler.demo.jsonc` | It binds the Artifacts adapter to the retired register, and must equal `REGISTER_SCOPE`, or the adapter reports no host roots. |
| `REGISTER_SCOPE` `sc_yatk…` | `apps/room/wrangler.grow.jsonc` | As for dap-demo: the Worker creates no room. |
| `ARTIFACTS_CONFIG.registerScope` `sc_yatk…` | `apps/room/wrangler.grow.jsonc` | As for dap-demo: the adapter is bound to a retired register. |
| `APPLICATION_SCREEN_HOSTS[0].directory` `sc_rygh…` | `apps/room/wrangler.grow.jsonc` | The application route matches the Grow screen origin to this retired directory, so the screen's room reads answer `room-retired`. |
| `GROW_ARCHIVE_CONFIG.directory` `sc_rygh…` | `apps/room/wrangler.grow.jsonc` | The archive driver archives this retired directory and makes no progress. |
| `REGISTER_SCOPE` `sc_c67l…` | `apps/room/wrangler.lending.jsonc` | As for dap-demo: the Worker creates no room. |
| `ARTIFACTS_CONFIG.registerScope` `sc_c67l…` | `apps/room/wrangler.lending.jsonc` | As for dap-demo: the adapter is bound to a retired register. |
| `SCREEN_HOSTS[0].host.directory` `sc_rygh…` (the Grow directory) | `apps/sandbox/wrangler.rollout.jsonc` | The sandbox serves the Grow screen origin under this descriptor, which must equal the Grow room's `APPLICATION_SCREEN_HOSTS` entry. The room behind it is retired, so the screen shows no live room. |
| `register` `{ scope: sc_b5q4…, genesis: sha256:0000… }` | `examples/repo-in-ai/input.example.json`, `examples/repo-in-ai/hosted-loop/input.example.json` | No Worker reads it. Under ruling dfae40ef (a) the example names the retired register in the new shape, with the all-zero digest as genesis; the planner's configuration head replaces both with `REGISTER_SCOPE`. |

These tracked values name no room: `REGISTER_SCOPE`,
`ARTIFACTS_CONFIG.registerScope` and the `DEMO_START_CONFIG` register, all
`unplanned`, in `apps/room/wrangler.commons.jsonc`, and `REGISTER_SCOPE`
`PLANNED_O4_REGISTER_SCOPE` in `apps/room/wrangler.connect.jsonc`.
`wrangler.artroom-scope.jsonc` and `wrangler.jsonc` track no room ID; their
live settings are not in the repository. The grep covered every tracked `.jsonc`, `.json` and
`.toml` outside tests, fixtures, test vectors and notes.

## Replay and listing cases after the cutover (ruling a140a1c6 Q-V1, Q-C1)

`packages/replay/test/verify.test.ts`, reference to another genesis: replay
refuses at I.1 with "a retained foreign body does not match its exact fact"
(T3(b)).

The genesis-kind case in replay mode uses `reseal`
(`packages/replay/test/world.ts`): it changes the kind of I.0, seals D, P and
I again in the order their entries used each other, and signs each changed
intent again with its actor's fixture key. Replay refuses at I.0 with
`genesis-kind`. The integrity-mode case changes I.0 in place, so the genesis no longer binds
the digest that names its sequence: `mismatch`.

`packages/cli/test/scope-index-applications.test.ts`: the damage that put
membership in the `scope` slot depended on the reference's kind.
The case now gives the installed scope a reference with `genesis: null`,
which the summary shape refuses, so the listing reports `malformed-summary`.
The listing cannot tell a wrong genesis digest from the right one and gets
no rule for it; the scope refuses such a reference when it is used: `routed`
(`packages/scope/src/namespace.ts`) answers `wrong-genesis` to a delivery
addressed with another genesis.

## Births of foreign sequences (rulings 4f697a7a and ae48dd39)

Ruling 4f697a7a replaces the birth uses of ruling a140a1c6: an entry records
no birth use, and its uses list and use count are as before the cutover.

The scope keeps the first entry of each foreign sequence whose later entry it
retains: `used()` (`packages/scope/src/core.ts`) stores it as a
`retained_input` row of kind `entry`, and a `retained_birth` row keyed
`(genesis, scope)` names that row's digest (`packages/scope/src/sqlite.ts`).
One copy per content digest and one birth row per sequence: ten entries that
use one foreign sequence keep its genesis once.

Ruling ae48dd39 adds `birth` to the archive's retained kinds; a pass writes a
sequence's birth once, under the genesis digest. Replay reads it with
`#birth` in `packages/replay/src/verify.ts`, admits it with
`admitSequenceGenesis`, and checks each later copy of that sequence with
`isEntryOf`. A birth is no anchor: `packages/scope/src/archive-anchors.ts`
records the birth pin and adds no published anchor for it (B5 below).

### Archive caps with births (ruling 6d658a9f)

No cap or charge changes. The caps are `ARCHIVE_BOUNDS`
(`packages/scope/src/archive-budget.ts`): 512 attempts and 64 MiB of `inputWork` per pass.

An entry with base cost B and U later uses from S foreign sequences spends
B + 4U attempts before births, from four charge sites per use
(`archive-foreign.ts:86`, `archive-inventory.ts:107`,
`archive-retained.ts:113`, `archive-inventory.ts:139`). Each birth adds 3,
so the sum is B + 4U + 3S, with S at most U. The worst case, 128 uses from
128 sequences, spent B + 512 before births: over the attempts cap for any B
above 0, and over the `inputWork` cap (INPUTWORK FIGURE PENDING); after
births, B + 896. The planner files ARC-1 for the older gap.

When one entry is over a cap, the archive stops at it. A spend over a cap
throws `ArchiveStopped("limit")` (`archive-budget.ts:101`). On the first wake
the adaptive pass selects no entry (`archive-adaptive.ts:179`,
`{ deferred: "capacity" }`), and `archive-driver.ts:404-409` keeps the wake
with state `retry`, reason `limit`. The next wake picks the fixed one-entry
strategy (`archive-driver.ts:374`), whose planner returns `limit`
(`archive-adaptive.ts:218-220`), and `archive-driver.ts:416` calls
`rows.stop("limit")` (`archive-row.ts:313`). The floor stays at the entry
before. An operator restart of a `limit` stop (`archive-row.ts:54-57`) pays
again and stops at the same entry.

### Retained bytes with births (ruling a4a587c9, option b)

`fieldRetainedBytes` (`packages/derive/src/field-retention.ts`) charged
`min(facts, usesPerEntry)` × `entryBytes` for an entry's foreign copies, and
now charges that term again for births: each copy can bring the first entry
of its sequence (ruling 4f697a7a). `Bounds` states no smaller bound on a
genesis, and `admitSequenceGenesis` admits one under `entryBytes`, so an
entry with N copies reserves 2 × N × `entryBytes`. `capacity.ts` and
`holds.ts:409` both read the function, so the validator and the holder
reservations agree. The term is an upper bound for one entry: a scope keeps
one birth per sequence, and `logicalBytes` counts each retained digest once.

Capacity checks over the pinned definitions, no cap changed:

- `definition-corpus.test.ts` validates every shipped and native corpus row
  under `PROPOSED_BOUNDS`: the lanes, Counting, Counting commitments,
  Lending, the Grow Site and Room, the source-built Grow demo and the
  retained Grow demo packet.
- The maintained application packages pack: Counter, Lending, the Grow check
  package and the recorded Grow demo. The source-built Grow demo packs with
  the 0a5f97ba repair, which waits for the planner's digest confirmation.
- `capacity.scope.test.ts` and the Directory partition capacity stories pass.
- Seven derive vectors move by one `entryBytes` for each copy:
  `bound-records`, `forms-binding`, `forms-settles` ×2, `receiver-pins` ×3.

At runtime, a scope whose definition opts into `whole-scope` capacity checks
its bytes in the turn's transaction (`packages/scope/src/turn.ts`, `#full`):
its logical bytes (each entry and retained input once by digest, births
included) plus the pending reservation. Over `scopeBytes`, the transaction
writes nothing.
An act or a delivery answers `refused`, reason `scope-full`, name
`scopeBytes` (`core.ts`); an outcome records `unavailable`, reason
`scope-full` (`operations.ts`); a timed turn writes nothing and records the
bound on the turn. A scope without the opt-in checks only its entry count
(`fits`) and never refuses for bytes.

## Faults found after the composed head

See [cd-dropped-kind-checks-faults.md](cd-dropped-kind-checks-faults.md).

## Creator comparisons (audit accepted in a5d65e58)

The genesis self reference `{ scope, genesis: null }` appears only in seeds
that a genesis judgment sends (`derive/src/sends.ts:234`). A seed's creator
compared with a full reference must go through
`resolveGenesisSelf(creator, source)` when the source is a fact. The audit
read about 20 more comparisons; their creators are born by an act or a
delivery, or the code already resolves them.

| Commit | Site | Change | Test |
|---|---|---|---|
| `804310e7c3` | `act-admission.ts`, sibling check (B6) | resolves against the parent's genesis fact | installed device scopes |
| `1932465898` | `act-admission.ts`, ancestor walk (B7) | resolves against `born.source` | installed fixture scopes |
| `4be0d250a4` | `projection-ownership.ts:21`, ancestor walk | `genesis.source ? resolveGenesisSelf(creator, source) : null` | "projection ancestry resolves a parent named by the genesis self reference" |
| `093e5b47ed` | `examples/commons-bill/witness.ts`, `roomGenesisCreated` | resolves when the source is a fact and compares the raw creator otherwise | "W1 room genesis check resolves a creator named by the genesis self reference" |
| `f7c26d0b3c` | `replay/src/verify.ts:2257`, `scope/src/receiver-reads.ts:86` | checks `isFactRef(born.source)` first, then compares the resolved creator | none |

The last row has no test: both sites check a refused sibling genesis under
`partition-v1`, and the partition fixtures (`partition-proof.test.ts`,
`directory-partition-factory.test.ts`) build only applied creations.

Commit `093e5b47ed` also fixed two commons-bill witness checks that read the
old reference (`inputOf` read `input.room[kind].kind`; `preflight` read
`entry.at`), which had failed the two W1 tests with `input-room`. The witness
binds each room reference by its genesis hash and seed scope ID, and reads
the kind from the seed.

## Anchors and genesis copies

Behaviour change, in `archive-alias` mode only: main's verify accepted a
caller anchor of any kind; this head accepts only register and membership
anchors (5a642337, 066e49b3; `privatePin` and `#anchoredPrivateName`,
`packages/replay/src/verify.ts:85-86` and `:1648-1655`). In the default
`retained-name` mode, `#anchor` (`:1603`) and `#privateCopy` (`:1662-1667`)
still accept any kind, as main did.

A Directory fact that main took on an anchor is now proved by replay from the
Directory journal that the archive source serves.

Ruling 1cf42f3b: `anchoredCopy` (`packages/replay/src/verify.ts`) accepts a
genesis copy only when `fact.seq` is 0, `fact.hash` equals `fact.at.genesis`,
`admitSequenceGenesis(bytes, fact.at)` admits the bytes, and the admitted
kind equals the kind the using entry records. The anchor stays required, and
the report lists the genesis with the other anchored facts. The test is "an anchored genesis copy admits only at its own
address with its recorded kind" in `packages/replay/test/genesis-bodies.test.ts`.
Request RV-1 (`c6276dec`) holds the self-proving genesis for after the
cutover.

## Anchored copies in judgments (ruling 3bf7e5aa, option b)

Every checked copy enters the judge's `facts`, as on main. First `#replay`
(`packages/replay/src/verify.ts`) checks each copy: a copy of a sequence that Replay runs must match that checked sequence; any other copy
must pass the `#privateCopy` context check and match the sequence's checked
first entry, which is the retained birth or the copy itself at entry 0.

The copy enters `facts` with that checked sequence and with the definition
name that `#privateCopy` admitted. `#prove` still proves every fact by replay
or by an anchor. A judge takes no assumed copy, so `assumedCopies` and its
three stops are gone: "anchored raw copies cannot enter Native uses", "caller
copies cannot supply a Native capability" and "the pinned sender requires
genuine genesis evidence, not an anchored copy".

A copy that fails its check stops the replay before any judge runs; the test
is "an anchored source copy with no retained definition name stops the replay
before the judge reads it" in `packages/replay/test/decisions.test.ts`. Its
guard counter stays at 1.

The nine tests that waited on this ruling pass: `decisions.test.ts` ×4,
`verify.test.ts` 18.46 and 18.52, the two archive-driver resume tests, and
the `archive-installed.test.ts` publication and failed-claim cases. The resume
tests now also serve the Rules and Destination journals; the
[other test changes](cd-dropped-kind-checks-entry-points.md#other-test-changes)
give the reason.

## The Grow archive binding (ruling e4b72290)

Q1: `growArchivePolicies` (`apps/room/archive-policy.ts`) takes the trusted
release as a `GrowArchiveRelease`: its digest, publisher and entry
definition. It reads the packet under that release and builds a policy
for the entry, every other declared definition and the native room places. `growArchiveConfiguration`
and `growArchiveDriver` (`apps/room/archive.ts`) take the release digest, and
the config check compares the configured release with it.

`apps/room/worker.grow.ts` passes `DEMO_RELEASE`, `DEMO_PUBLISHER` and
`GROW_ARCHIVE_DEFINITIONS[0]`. The recorded packet declares exactly the two
`GROW_ARCHIVE_DEFINITIONS`, so production builds the same policies as before. Tests that use the recorded packet pass
`RECORDED_GROW_RELEASE` (`packages/scope/test/support/recorded-grow-release.ts`).

Q2: the production cases in `archive-installed.test.ts` and Room A
(37-pass history) build the demo from source: `growDemoSource`
(`test/support/maintained-applications.ts`) prepares it with `prepareGrowDemo`
and signs it with `fixedSigner(254)`. Each case passes `{ release, publisher, entry }` from that packet, with the demo Site's
definition digest as the entry, and reads the replay context from discovery.
Room A stays a test; all nine pass.

## Security seals after the cutover

The cutover changes 78 plain seals and 55 named-owner seals in
`scripts/security-entry-points.test.mjs`, each from `sourceSeal` or
`namedSourceSeals` on the merged head. The tables file holds the
[plain seals](cd-dropped-kind-checks-tables.md#plain-seals), the
[named-owner seals](cd-dropped-kind-checks-tables.md#named-owner-seals)
(first 12 hex digits; the test file holds the full values) and a sentence
for each [entry point whose admission or refusal changed](cd-dropped-kind-checks-entry-points.md#entry-points-whose-admission-or-refusal-changed).

### Stand-ins in the route model

`scripts/security-entry-points.mjs` loads route source into a model that
enumerates routes and calls no room, so each new name the routes reference
needs a value:

- `roomApi`: the remote stand-in, as for `api`; the model reads route shapes,
  not room answers.
- `RETIRED_HTTP` and `retiredRoomAnswer`: enumeration reaches no retired
  room, so these stand-ins only satisfy the references.
- `isRetiredStoreStop`: the real predicate from
  `packages/mcp/src/hosted-store-stop.ts`, passed to the MCP and OAuth routes;
  no model reply is a retired-store stop, so every route takes its ordinary
  branch.
- `hostedRegistryName`: a fixed witness name that selects no authority; the
  model names no real Membership.

## Canonical admission at the cutover (ruling f2f2a7ea)

A new-format room admits a definition only in its one canonical spelling (no
redundant subjects, no empty optional filters), which Replay already checked.
The survey in act 8620d15b ran canonical mode over every pinned and generated
definition and found two that change: Counting and the retained Grow demo
Room.

### Counting

Counting moves from `sha256:435d9f57…` to
`sha256:3512c1e4ff01f097f06bbdd05c5897ae7d589420a92b74f10a4dbb53af6094fb`.
`apps/counter/definition.ts` exports the normalized declaration,
`apps/counter/scripts/pin-definition.mjs` rewrote `definition.json`, and
`pin.ts`, the definition README and `commitments.test.ts` name the new digest.

Before this change the canonical-spelling test in `derive` excluded Counting
(`canonicalAdmission: false`, "retained historical data until the identifiers
cutover"). The test now checks Counting like every other definition, and the
two Counting exclusions and `derive/test/support/fresh-counting-source.ts`
are gone.

### Admission sites

These three sites admit a definition into a new-format room, and each now
validates in canonical mode:

| Site | What it admits |
|---|---|
| `scope/src/core.ts:396` `validate` | The definition that a genesis or a creation pins for a new scope. |
| `platform/src/directory.ts:593` `definition-active` | A lane definition and its closure, before the Directory opens an issue or a pull request under it. |
| `platform/src/definition-input.ts:38` `definitionClosure` | A definition and its closure at Rules activation, Directory `application-ready` and the evidence `definition-active` guard. |

`directory.ts:593` and `definition-input.ts:38` are rule code of existing
platform versions, which a platform pin does not cover. The change in place is
safe only at the cutover: it starts a new creation family, so no new-format
room has recorded an activation that the change could refuse on replay.

Each of these sites already passed canonical mode before this change:
`cli/src/application-files.ts:80`, `define/src/index.ts:686`,
`platform/src/application-install.ts:103`,
`platform/src/application-install-v2.ts:40`,
`platform/src/device-application-rules.ts:51`,
`platform/src/validate-package.ts:28`, `replay/src/verify.ts:1522`, `:1550`
and `:2187`, `scope/src/applications/admission.ts:41` and
`scope/src/archive-source-pins.ts:85`.

### Reading sites

These sites read a definition that a room recorded, or that this runtime
supplies. They stay as they are:

| Site | Why it stays |
|---|---|
| `scope/src/core.ts:428` `platform` | It validates platform data from this runtime's own catalog, and no input reaches it. Every catalog version passes canonical mode. |
| `scope/src/archive-declarations.ts:68` | It re-reads recorded definition bytes in an archive and matches them to the reviewed policy byte for byte. |
| `scope/src/archive-native-root.ts:21` | It validates this runtime's platform data for an archive root against the reviewed policy. |
| `scope/src/creation-lineage.ts:180` | It proves a lane's creation edge from the Directory's recorded closure. The lane's own genesis admits the definition through `core.ts:396`. |
| `platform/src/rules-scope.ts:660` `definitionBytes` | Only `platform:rules@1` and `@2` run it; later versions use `definitionClosure`. |
| `define/src/story.ts:84` `tell` | It runs an author's story in memory and admits nothing into a room. |
| `apps/room/archive-policy.ts:32` | It builds archive policies for the retained, signed Grow packet. |

### The retained Grow demo packet

The packet `examples/grow/demo/application.dap.json` keeps its bytes and pins:
Room `b89e7f84…` and Site `d2bc830e…`. The Room is not canonical, and scope
`validate` refuses it. Until the planner's configuration head, the scheduled
Worker's demo install fails, and no Grow room exists.

### Other rulings

- The planner accepted B19, the store-format publish, in act d2e3f2cb.
- NF-5 does not gain this item, and the allowance to rerun the gate is
  withdrawn.

## Pending rulings

None.

## The kept Grow refusal test (ruling a7c8072a)

`archive-installed.test.ts`, "installed Grow scopes export genesis zero after
a late native membership directory binding", installs the recorded
old-spelling package (Site `69424c1b…`, Room `5e2d34fa…`) and gets `refused`,
phase `refused`, reason `bad-field`, name `invalid-application-package`.

Commit `70c3431750` cut the branches that only this case reached:

| Branch | Acceptance case it carried | Covered elsewhere |
|---|---|---|
| cross-family scan, Grow side | A public copy from the device family does not authorize the failed-claim producer. | In part: the failed-claim case checks the other direction, and `archive-foreign.test.ts:736` and `archive-inventory.test.ts:534` test the refusal on fixtures. |
| `historicalCeilingControls` and `TESTCeilingChargeBudget` | Five whole-prefix control plans under the old charges give the recorded pass costs of the retained Site and Room, Directory16, Rules10 and Destination12. | No: the costs belong to retained identities that no longer install. |
| `originalPassCosts` | The recorded whole-pass costs of those five definitions. | No (same reason). |
| `independentSupport` | The support metadata receipts of those five definitions, measured before shared price extraction. | No (same reason). |

## Gate and the Effects model

Gate attempt 9 passed at `f9d6fea1`, on AC power with `powermode 0` at start
and end (START `93f26f2c`, END `30577e04`): Plain 4,560 tests, Native 1,141.
Evidence:
`~/play/artroom-evidence/2026-11-13-identifiers-cutover-gate-attempt9`;
[its manifest](evidence/2026-11-13-identifiers-cutover.manifest.json) lists
its files. Attempts 1 to 8 failed; their END acts give each cause.

Attempt 8 failed on one case in `packages/scope/test/creation-versions.test.ts`
that makes the object's constructor throw once. The test pool's wrapper keeps
that workerd actor, where production discards it, and its eviction hung under
load. The case now restarts the object with `state.abort()` inside
`runInDurableObject` and keeps every assertion.

The cutover changes `packages/scope/src/operations.ts` and
`packages/scope/src/sqlite.ts`, which moves the Effects hashes in
`verification/state-machines/coverage.json`. One line of the protected
functions changed: `Operations.#pass` passes
`ownOf(store, this.#scope.localSequence()!)` to `beforeSend`. The mark, the
send, the answer and the offer keep their order, and `markSent` is
byte-identical. The coverage follows `99ed4a7e`. At `e56e5ba9`,
`check.mjs Effects` passed (TLC: 7 distinct states; real-source witness: 1
test). The recorded source control dispatched twice and failed on
`expected [ [ '1:0#1', '1:0#1' ]`; the baseline and the restored source
passed. The evidence directories are
`~/play/artroom-evidence/2026-11-13-identifiers-cutover-effects-check` and
`~/play/artroom-evidence/2026-11-13-identifiers-cutover-effects-control`.
The model, config and view are unchanged since `13e704a4`; the committed
chart stands.

## Fixes after the first review (15f2b78a)

The checker's verdict f6778205 asked for three changes at `33d1eddf`. The
browser workflows failed for four reasons:

- The Card work list showed Issue 2 first. `laneRefs`
  (`apps/views/src/needs-you.ts:34`) sorts lanes by `canonicalize(ref)`,
  whose first key was `inc` at main (rising with creation order) and is now
  the genesis digest. `packages/mcp/test/views-browser.mjs` now finds which
  issue comes first and pages to the other.
- The Page opened with no room: `scripts/demo/page-key-custody.ts` and
  `scripts/demo-captures.ts` still wrote `artroom-page:v2` and read
  `artroom-page-claim:`, which eed02514 renamed to `dap-page-settings-2` and
  `dap-page-claim-2:`.
- Every recorded demo capture stopped with `ReferenceError: __name is not
  defined`: under tsx, esbuild wraps named functions in `__name`, and the
  setup body of `initializeCapture` carried those calls into the page, which
  now defines `__name` first. CI did not show this, because the Page step
  stopped before the capture steps.
- `declared-views-browser.mjs` looked for the text `42` in model contexts,
  which a random view UUID can hold; it now looks for the JSON number 42.
  This fault exists at main too.

B19 left two races in `packages/client/src/store-format.ts`. The emptiness
listing now skips the format file, so a word that another initializer links
in after the first look meets EEXIST and is read, and `readWord` scans for
the temporary name once. `packages/client/test/store-format-race.test.ts`
forces each order; both tests fail at `33d1eddf` and pass at the fix.
