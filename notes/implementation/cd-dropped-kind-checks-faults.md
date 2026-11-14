# Faults found after the composed head

This section moved here from
[Kind checks dropped at the identifier cutover](cd-dropped-kind-checks.md)
at main `57e893c0`, unchanged. The CDF-1 results (request 27cb5f60) follow
the table.

Each fault below had a failing test before its fix. "Behaviour fault" means
production code did the wrong thing. "Fixture shape" means a test built input
in the old shape. "Vector" means a measured number moved with the new bytes.

| Fault | Where | What was wrong | Fix |
|---|---|---|---|
| B1 | `scope/src/archive-adaptive.ts` | The adaptive planner dropped the replay context, so every published adaptive pass stopped `unavailable`. | It passes the context through. |
| B2 | test fixture driver | The fixture driver had no replay context. | It reads its own genesis with `archiveOwnReplayContext` (`archive-publication.ts`), charged at 128 metadata and `entryBytes` of `inputWork`. |
| B3 | `scope/src/read-preparation.ts` | Read preparation charged a call where it reads a candidate. | It charges each candidate (`c5997cbd91`). |
| B4 | `scope/src/archive-restart.ts:23` | The restart parser required the fields `inc,kind,scope`, so no new-shape row parsed. | It requires `genesis,scope`. |
| B5 | `scope/src/archive-anchors.ts` | Each birth was added as a published anchor. Replay admits a birth by genesis and never reads it as an anchor, so it reported the birth under `unusedPublishedAnchors`. | A birth records its pin and adds no anchor. |
| B6 | `scope/src/applications/act-admission.ts` | The sibling check compared `seed.creator` with the Directory's full reference. The Directory creates Rules and Membership in its genesis, so those seeds name `{ scope, genesis: null }`, and every installed application act answered `dependency-unavailable`. | It compares `resolveGenesisSelf(seed.creator, { at: parent, seq: 0, hash: parent.genesis })`. |
| B7 | `scope/src/applications/act-admission.ts` | The ancestor walk took `born.seed.creator` as it stands and refused a creator named by the genesis self reference. | It resolves the creator against `born.source`. |
| B8 | `replay/src/verify.ts` `#birth` | A kind contradiction between an admitted genesis and a use's recorded kind read "incomplete: not the one named". | It reads "mismatch: the recorded source kind contradicts its verified genesis", as `#recordedKind` does. |
| B9 | `platform/src/partition-provenance.ts` | The cutover adds one frame to the partition proof, 8 to 9. The application-lane branch of `partitionReceiverPolicy` called `origin` under the 8-fact base bound and returned null. `rawFacts` already holds the frames to the 16-fact identity bound, as `partitionPublicationOrigin` does. | The branch passes the identity bound (`ee1b72b96a`). The witness is `directory-partition-factory.test.ts:97`, which passes on main. |
| B10 | `scope/test/archive-one-entry-scale.test.ts` (fixture shape) | The test anchored the Directory facts that the lane's genesis takes as its source. Under 5a642337 and 066e49b3 a Directory fact may not be an anchor, so `#privateCopy` refused the copy of Directory entry 5 at the lane's entry 0: "an anchored private source lacks matching recorded kind and finite exporter alias metadata". The test passes on main. | `archiveAuthorityReplay` (`scope/test/support/archive-authority-replay.ts`) serves the Directory, Rules and Destination journals and anchors only Register and Membership facts. The scale test and the two archive-driver resume tests share it. The scale test passes, 1/1. |
| B11 | `git/src/journal-v2-tree.ts` `#emit` | `#emit` built child trees in the order that `prepare` first named them. The adaptive scout prepares paths step by step, and a resumed build reaches the birth, definition and entry directories in other steps. The rebuild after a restart sent the same commit in a pack with three trees in another order, and `archive-installed.test.ts` ("export genesis zero after a late native membership directory binding") requires the same bytes. | `#emit` builds child trees in name order. This changes only the order of objects in the pack. Each tree sorts its own rows, so no tree ID, commit ID or git vector changes. The fault needs the `birth` directory, which this head adds; main has no `birth` path. The witness in `journal-v2-tree.test.ts` prepares the same paths in two orders and expects the same object list. The git suite passes, 239/239. |
| B12 | `examples/lending/test-support.ts` (fixture shape) | The fixture built the destination as `{ ...directory, kind: "destination" }`. The ref check refused the extra field, so the lending genesis was sealed refused, item 0 never opened, and 8 tests read null. `packages/mcp/test/support/views-host.ts` built its scripted installation refs with the same spread. | Both fixtures pass the plain refs. Lending passes, 18/18. A follow-up for another head: `created()` in `derive/test/fixtures.ts` accepts a refused genesis. A check for `decision === "applied"` there would name this fault. |
| B13 | `scope/src/applications/projection-ownership.ts` | The root check compared the root's `seed.creator` with the Directory's full reference. The Directory creates the Grow Site in its own genesis, so that seed names the creator by the genesis self reference, and every declared projection read answered "not owned". | It resolves the creator against the birth's source fact with `resolveGenesisSelf`, at the selected root and at a root reached by the ancestor walk, as B7 does for act admission. |
| B14 | `client/src/handle.ts` `log` | An entry with no `input` threw a `TypeError` in place of the handle's `TransportError`. | The check reads `input` only when it is an object, so such an entry is "not this scope's entry at that seq" (`handle-log.test`). |
| B15 | `client/src/application-route.ts` | A screen context that named one scope in two fields, such as the Directory in the `scope` field, passed once the kind checks went. | The five fields must name five different scope IDs (`application-route.test`). |
| B16 | `cli/src/clone-proof.ts` `readTokenReceipt` | The proof admitted only a Destination definition that `platform()` resolves, so a read token from another Destination version proved nothing. Main's kind check admitted every version. | It admits any `platform:destination@` definition (`clone-proof.test`). |
| B17 | `cli/src/command-verify.ts` `replaySource` | The register scan required the configured register. A member's home holds none, so the scan read no create results. | The scan compares the page with the configured register only when the configuration holds one (V1). The loop already keeps only a Directory genesis's result for a create the page's scope sent (`verify.test`, "only an actual Session-forbidden Directory genesis…"). |
| B18 | `replay/src/verify.ts` anchored sources | A copy for a fact that `#otherRoomResult` proves had no raw-copy context, so replay stopped `incomplete`. | Replay admits that copy when its entry checks against its own birth, and adds it to the facts (the second-room test in `verify.test`). The planner accepted this repair in act 0f76cac1. |
| B19 | `client/src/store-format.ts` publish | The initializer created the format file empty and then wrote the word, so a second process could read an empty word and refuse the store as retired. The file came in with cutover commit 28ca945c; main has no store-format file. | The initializer writes the whole word to a `.dap-store-format.publishing-*.tmp` file, links it into place and removes the temporary name. The emptiness check ignores those temporary names, and a reader admits two links only when a temporary name holds the same file. A partial word still refuses, with no retry. A temporary file that a stopped initializer leaves behind does not block a later initializer. The custody test "two processes archive distinct identities concurrently" passes ten runs out of ten. |
| B20 | `replay/src/verify.ts` anchored sources | A recorded delivery that named an anchored source, but held no use of that source, stopped `incomplete` ("an anchored source lacks its original retained copy") before replay compared anything. Main reached the delivery judgment and answered `mismatch`. | Under ruling 0f76cac1, a mismatch that replay can establish outranks a missing copy. Every derived delivery records a use of its own source first (`derive/src/delivery.ts` `write` and `confirmation`), so replay answers `mismatch` for a recorded delivery without that use, before it requires the copy. A genesis source without a copy still stops `incomplete`. The change moves no ruled check: `#recordedKind` (5a642337), the anchored genesis copy (1cf42f3b) and the copies in judgments (3bf7e5aa) run as before. The relabel case "the source and the request" in `cli/test/verify.test.ts` reads `mismatch`, as on main. |
| B21 | `examples/lending/browser/join.ts:54` `lendingScopes` | The filter kept a Directory reference only when it held `inc`. A cutover reference is `{ scope, genesis }`, so the filter dropped every lending scope, and `findLending` answered "This room has no lending library". Main 64112e45 has the same line; the inc-to-genesis rename missed it. | The filter uses `isScopeRef` from `@generalbusiness/dap-bytes` (`records.ts:101`). No `"inc" in` check remains in the tree. The native lane found the fault with `packages/scope/test/lending.test.ts` (project scope-lending), which failed at :457. |
| B22 | `platform/src/commons-cohort-data.ts:58` `create-commons` | The rule built the Commons seed with `seedDigest(root)` as its cause. The cutover makes the cause of a genesis creation the digest of the whole genesis input (23e0c92d changed `directory.ts` `sibling` to `genesisInputDigest(input)`, but not this rule). The judge refused the create at `derive/src/sends.ts:208` with a `RuleFault`, the delivery answered retry, and the Commons was never born. The membership ID in the create's fields came from the same wrong cause. The line came from main (07f25df9, an ancestor of 64112e45), where `seedDigest` was the right cause. | The rule takes `genesisInputDigest(given.input)` as its cause, as `sibling` does, so the Commons seed and the membership ID in its fields both match the scopes that the genesis creates. `commons.test.ts` now expects the creator in the self form `{ scope, genesis: null }`, because a genesis cannot name its own genesis hash. Witnesses in native scope: commons, commons-bill, commons-install, application-publication and session-reference-native pass, 39/39. Platform passes 773/773. |
| B23 | `scope/src/workspace-lineage.ts:100`, `platform/src/rules-certificate-v17.ts:67`, `rules-certificate-v15.ts:65`, `rules-certificate.ts:82` | A Directory creates its Rules and Destination in its own genesis. Under the cutover a genesis cannot name its own genesis hash, so each create writes the field `directory` in the self form `{ scope, genesis: null }`. These readers compared that field with the full reference `directory.fact.at`, and the comparison always failed: the workspace lineage was lost, and the guard `rules-certificate-request-v17` refused with `rules-certificate-unavailable`. All four files came from main (40230449, 624b5ce2, 691029e1 and c78ef1cb, each an ancestor of 64112e45). On main a genesis wrote its full reference, so the comparison held there. | Each reader resolves the field with `resolveGenesisSelf(field, directory.fact)` before it compares. `directory.fact` is the Directory's entry 0, so the self form resolves only against that genesis. The audit found no other site that reads a field written in a Directory's genesis: `evidence-incident-origin-v17.ts:121` reads an `open-pr` act's create, and `:161` a lane delivery's create. `publishing-provenance.ts:50` reads an `open` act's create, `:92` and `:98` a lane's create, `:159` an `establish-application` act's create, and `:203` a create from a Rules delivery. `partition-provenance.ts:147` reads an `open-partition` act's create or a `seal` delivery's create, `:203` a partition act's create, `:268`, `:269` and `:282` creates from lane or partition acts, and `:358` and `:462` an Inbox create, which holds no `directory` field. `partition-provenance.ts:162` and `:316` already resolve the self form. All of these sites stay unchanged. Witnesses in native scope, each file run alone: workspace-credential 3/3, workspace-setup-credential 4/4, workspace-lineage 8/9 (5/9 failed before), evidence-rules-real 7/8 (8/8 failed before). evidence-parent-spelling 0/1 now stops at "the genesis does not bind this sequence". That failure, the workspace-lineage forged-claim case (one read instead of four) and the evidence-rules-real TIME case have other causes, which the native scope lane owns. The workspace-lineage seal moves to `1813da13…`. |

## Scope-typed fields: no read site trusts a slot's kind

CDF-1 item 1 (results 85fed53d, ruling 1064d0de item 1). `fitsFieldType`
(`packages/bytes/src/field-value.ts`) no longer compares the kind of a
reference (ruling 429c1be7), so a typed slot can hold a reference of
another kind. Main `57e893c0` has 45 declaration sites of scope-typed
fields in `packages/platform/src`, not 36:
`directory-partitions.ts:73` and `:81` each declare four slots through a
map, and `destination.ts:2807` is a record member.

Each slot gets its kind from its writer. Each writer is in one of six
classes:

| Class | Writer | Check |
|---|---|---|
| W1 | A `create` result `{ sender: true }` | `derive/src/delivery.ts:346` compares `judged.sourceKind` with `request.to.kind` (site a). |
| W2 | `input.from.at` in a handler with `from: { kind }` | Dispatch checks the sender kind. |
| W3 | A genesis field that the verified parent writes | The parent source check (site b). A partition also checks `partition-birth` (`directory-partitions.ts:166-172`). |
| W4 | A delivery field that a sender checked at site a copies from its own W1 slot | Site a, at the sender. |
| W5 | The `.at` of a fact | The fact check (site c). |
| S | An act field that the signer chooses | None. |

Every `tell` or `relate` target and every slot that a sender-equality guard
reads is in W1 to W5. One slot is in class S: Directory `task.lane` and
`open-task.lane` (`directory.ts:238` and `:307`), which `:316` writes from
the act field. No code reads the `lane` of a task row, and the tree holds no
definition for `platform:task@1`.

Duty: a definition for `platform:task` checks the kind of the lane where it
reads the lane. Until such a definition exists, nothing reads the slot.

Four runtime reads of a kind remain: `archive-target.ts:142`
(`target.sequence.kind === "destination"`), `authority.ts:476` and
`host-wiring.ts:31` (`sourceKind === "directory"`), and
`publishing-provenance.ts:150-154`, which reads the kind of the Directory
genesis. The comment at `directory.ts:431` said that "the commit checked"
the membership kind. CDF-1 changes it to name the create-result admission
in `derive/src/delivery.ts`, which checks that kind now. No source change
follows from item 1.

## Timed turns use no foreign entry

CDF-1 item 2 (results 85fed53d, ruling 1064d0de item 2). `#timed`
(`scope/src/turn.ts`) calls `judgeTimed` and then `#seal` with no fetched
facts, so a timed entry retains no birth. `judgeTimed`
(`derive/src/judge.ts:417-441`) builds its judgment with empty facts,
prepared and used lists. Its only subject is the local item, and the draft
sets `uses: []`, `prepared: []` and `sends: []`. The timed input names no
fact, and `withinCounts` (`derive/src/draws.ts:179-190`) adds no use.
`bornOf` (`scope/src/core.ts:92-102`) keeps a birth only for a use of a
later foreign entry. Replay runs the same `judgeTimed`
(`replay/src/verify.ts:2487`), asks for births only for `entry.uses`, and
refuses a timed entry that records uses. A timed draft cannot use an entry
of another sequence. No source change follows from item 2.

## Retained births have a byte cap in every scope

CDF-1 item 3 (results 85fed53d, rulings 1064d0de item 3 and 0c196f9a).

The fault at main `57e893c0`: a scope without the `whole-scope` opt-in had
no byte cap on the births and copies that it retains (`retained_input` rows
of the kind `entry`). One birth fits in `entryBytes` (262,144). An act
holds at most `usesPerEntry` (128) uses, so one act can add 32 MiB, and a
delivery adds its source too. `fits` counted entries only, so one live
window of `scopeEntries` (100,000) entries allowed about 3.05 TiB of
births. A floor resets the entry count and deletes no birth, so over a
scope's life no constant bounded the total.

The fix, in `packages/scope`:

- `SqliteStore` keeps the total size of those rows in one `meta` row,
  `retained-entry-bytes`. `retain` adds the size of an `entry` row only
  when its INSERT inserts the row. `forget` subtracts the size of an
  `entry` row that it removes. Both run in the seal transaction, so a
  refused input rolls the total back with its entry. No digest, fold or
  replay reads the row.
- The `SqliteStore` constructor fills the row with one scan when the row
  is absent. A scope made before the fix gets its true total when its
  store opens, before its first turn. The scan and the write are one SQL
  statement (`INSERT … SELECT … ON CONFLICT DO NOTHING`), so they commit
  together or not at all. So a read of an old store also writes this one
  row, the first time the store opens.
- `#full` (`scope/src/turn.ts`) applies the stop after the existing checks.
  An input that adds new `entry` bytes and leaves the total above
  `scopeBytes` writes no entry. A create or genesis, an act and a
  preparation answer `refused` `scope-full` with the name `scopeBytes`. A
  delivery answers `retry` `scope-full`, and the sender keeps the task. An
  outcome answers `unavailable` `scope-full`.
- A delivery that settles a pending request of this scope passes the stop:
  a result other than `conflict`, or the control that confirms the scope.
  The request reserved its room when the scope admitted it, as `reserved`
  in `derive/src/reserve.ts` counts it. Its bytes add to the total. Each
  definition bounds its pending requests, so the total stays bounded.
- An input that adds no new `entry` bytes passes: a read, a floor, a
  checkpoint, a timed turn, and an input that reuses retained sequences
  only. No input frees the space.
- A diagnosis entry is not exempt from the stop. Today a diagnosis
  re-retains only rows that the scope already holds, so it adds no bytes.
  A later change that lets a diagnosis retain new rows must revisit the
  stop.

The cap adds no export name, no reason code and no record form. `Store`
gains `retainedEntryBytes()`, and its `retain` and `retainBirth` return
the bytes that they add.

Witnesses, in `packages/scope/test/capacity-retained-births.test.ts`:

- A scope without the opt-in and with a small `scopeBytes` keeps its
  births across a floor, and its next new birth gets `scope-full` with
  `scopeBytes`. The same file fails at `57e893c0`: each new birth there
  is accepted.
- A scope past the cap records the result of its pending request, adds
  the bytes, and refuses a new birth.
- A scope whose storage holds no total, as a scope made before the fix,
  refuses a new birth at its first turn against the true total.

`capacity-confirmation.test.ts` asserted that a scope without the opt-in
records its creation under `scopeBytes` 0. Its case now shows that a
creation one byte over the cap gets `retry` `scope-full` and writes
nothing, and that the confirmation passes the stop at the cap.

## What bounds the other retained rows without the opt-in

Ruling 0c196f9a item b. The cap above counts only `entry` rows. For each
other kind, in a scope without the opt-in:

| Kind | Writer | Bound |
|---|---|---|
| `definition` | A genesis retains its own and its children's declarations. Ordinary acts also retain definition-domain values through `valuesOf` (`scope/src/core.ts`) and `retainedValueKey` (`bytes/src/retained-key.ts`): for example, `activate`, `open-issue`, `open-pr` and `establish`. | No retained-byte total bounds these rows. The shipped value places bound each declaration to `definitionBytes` (262,144), but later acts can add new declarations. Nothing removes a declaration row. |
| `rule` | Each entry that records a rule result retains that rule's input (`turn.ts`, `#judged`). | Not bounded. The input size check against `ruleInputBytes` runs only under the opt-in. Each entry can add new rows, and no floor removes one. |
| `snapshot` | An outcome retains each snapshot that its evidence names (`operations.ts`). | Not bounded. The turn checks the snapshot's canonical form and no size. Each outcome can add new rows, and no floor removes one. |
| `value` | An act, a delivery and an outcome retain the values that the draft names (`valuesOf`, `core.ts`), in `retained_value`. | Not bounded over a scope's life. Nothing removes a value row, and each entry can add new ones. |
| `text` | An act or a delivery with detached text retains its canonical JSON string (`Received.retain`, `scope/src/core.ts`). | No retained-byte total bounds these rows. Each text fits its field's `max`, within `textBytes`. The stored JSON includes quoting and escapes. Only a redaction removes a text row. |

CDF-2 (request b5750e6e, pre-code act ca7b18ce) covers these five kinds.
The act corrects the earlier genesis-only claim for `definition` and adds
`text`. CDF-1 changes none of their byte limits. The journal's entry count
still limits new work, but a floor can reclaim journal capacity without
removing these retained rows.
