# Kind checks dropped at the identifier cutover (C+D)

A scope reference names a scope ID and a genesis hash. It names no kind. The
C+D source head drops every comparison of a reference's `kind`. Ruling 7 of
97583e65 keeps those drops on one condition: this table names each one and
what replaces it.

Each row has one of these replacements:

- **The place fixes the kind.** The field, slot or position that holds the
  reference admits one kind only.
- **Reads sourceKind.** The check reads the sender kind that the entry records.
- **Reads the kind of the admitted genesis.** The check reads the kind from the
  genesis bytes that `admitSequenceGenesis` admitted.
- **Reads the definition the summary names.** The check reads the platform name
  of the definition that the scope pins.
- **Compares with a held reference.** The check compares the reference with a
  full reference, or a scope ID, that the caller already holds.

The table covers commits from `c6c836b5` to the head. A script read each
commit's diff and listed each removed line that compares `.kind` with a
quoted word. The line is the first line of the hunk in the new file.

| File | Line | Kind dropped | What replaces it | Commit |
|---|---|---|---|---|
| `packages/platform/src/application-install-creation.ts` | 49 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/application-install-reader.ts` | 20 | `directory` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/application-install-reader.ts` | 23 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/application-install-reader.ts` | 28 | `directory` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/application-install-reader.ts` | 33 | `membership` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/application-install-reader.ts` | 33 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/application-install-reader.ts` | 33 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/application.ts` | 134 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/commons-cohort-data.ts` | 16 | `directory` | reads sourceKind | `c6c836b52d` |
| `packages/platform/src/commons.ts` | 37 | `directory` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/destination-evidence-capacity-v17.ts` | 30 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/destination-evidence-capacity-v17.ts` | 32 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/destination-evidence-v17.ts` | 78 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/destination-evidence-v17.ts` | 97 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/destination-evidence-v17.ts` | 101 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/destination-evidence-v17.ts` | 121 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/destination.ts` | 785 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-batch-v17.ts` | 82 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-batch-v17.ts` | 97 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-batch-v17.ts` | 97 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-holds-v17.ts` | 16 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-holds-v17.ts` | 46 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-holds-v17.ts` | 46 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-holds-v17.ts` | 64 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-holds-v17.ts` | 140 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-holds-v17.ts` | 140 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-holds-v17.ts` | 243 | `membership` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-holds-v17.ts` | 259 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-holds-v17.ts` | 261 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-holds-v17.ts` | 265 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-holds-v17.ts` | 273 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence-index-v17.ts` | 49 | `lane` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence.ts` | 64 | `membership` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/evidence.ts` | 68 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/own-agent-cohort-data.ts` | 13 | `directory` | reads sourceKind | `c6c836b52d` |
| `packages/platform/src/repository-binding-cohort-data.ts` | 20 | `directory` | reads sourceKind | `c6c836b52d` |
| `packages/platform/src/reservation-v14.ts` | 49 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/reservation-v14.ts` | 49 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/reservation-v15.ts` | 49 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/reservation-v15.ts` | 49 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/reservation-v17.ts` | 86 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/reservation-v17.ts` | 86 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/rules-certificate-v15.ts` | 120 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/rules-certificate-v17.ts` | 122 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/rules-policy-tree.ts` | 54 | `rules` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/rules-policy-tree.ts` | 54 | `destination` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/rules-policy-v13.ts` | 61 | `membership` | the place fixes the kind | `c6c836b52d` |
| `packages/platform/src/unpublished-register.ts` | 37 | `directory` | reads sourceKind | `c6c836b52d` |
| `packages/cli/src/claim.ts` | 42 | `register` | the place fixes the kind | `3bc0af5906` |
| `packages/cli/src/claim.ts` | 63 | `directory` | the place fixes the kind | `3bc0af5906` |
| `packages/cli/src/claim.ts` | 63 | `membership` | the place fixes the kind | `3bc0af5906` |
| `packages/cli/src/claim.ts` | 278 | `register` | compares with a held reference | `3bc0af5906` |
| `packages/cli/src/claim.ts` | 330 | `directory` | the place fixes the kind | `3bc0af5906` |
| `packages/client/src/agent-key-invitation.ts` | 29 | `directory` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/agent-key-invitation.ts` | 29 | `membership` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/answers.ts` | 48 | `register` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/application-install.ts` | 36 | `rules` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/browser-joining.ts` | 39 | `directory` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/browser-joining.ts` | 39 | `membership` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/checker-key-invitation.ts` | 29 | `directory` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/checker-key-invitation.ts` | 29 | `membership` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/creation-offer.ts` | 46 | `register` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/creation-offer.ts` | 64 | `register` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/device-key-invitation.ts` | 24 | `directory` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/device-key-invitation.ts` | 24 | `membership` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/directory.ts` | 100 | `directory` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/directory.ts` | 122 | `directory` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/invitation.ts` | 47 | `directory` | the place fixes the kind | `32a91db6e2` |
| `packages/client/src/invitation.ts` | 47 | `membership` | the place fixes the kind | `32a91db6e2` |
| `packages/scope/src/demo-creation.ts` | 20 | `register` | the place fixes the kind | `b28b977e26` |
| `packages/scope/src/object.ts` | 1114 | `directory` | the place fixes the kind | `b28b977e26` |
| `packages/mcp/src/service.ts` | 806 | `membership` | reads the definition the summary names | `b81e295c20` |
| `packages/mcp/src/service.ts` | 1050 | `commons` | the place fixes the kind | `b81e295c20` |
| `packages/mcp/src/service.ts` | 1418 | `rules` | the place fixes the kind | `b81e295c20` |
| `packages/mcp/src/service.ts` | 1418 | `destination` | the place fixes the kind | `b81e295c20` |
| `packages/mcp/src/service.ts` | 1435 | `lane` | the place fixes the kind | `b81e295c20` |
| `packages/mcp/src/service.ts` | 1707 | `destination` | the place fixes the kind | `b81e295c20` |
| `packages/mcp/src/service.ts` | 1711 | `directory` | the place fixes the kind | `b81e295c20` |
| `packages/cli/src/scope-index-applications.ts` | 98 | `lane` | the place fixes the kind | `5e9a122200` |
| `packages/cli/src/scope-index-applications.ts` | 98 | `membership` | the place fixes the kind | `5e9a122200` |
| `packages/cli/src/scope-index-applications.ts` | 98 | `destination` | the place fixes the kind | `5e9a122200` |
| `packages/cli/src/scope-index-manifest.ts` | 28 | `directory` | the place fixes the kind | `5e9a122200` |
| `packages/cli/src/scope-index-manifest.ts` | 70 | `directory` | the place fixes the kind | `5e9a122200` |
| `packages/cli/src/scope-index-manifest.ts` | 79 | `register` | the place fixes the kind | `5e9a122200` |
| `packages/cli/src/application-list.ts` | 21 | `lane` | the place fixes the kind | `f04b8ecbc9` |
| `packages/cli/src/clone-proof.ts` | 10 | `destination` | the place fixes the kind | `f04b8ecbc9` |
| `packages/cli/src/command-install.ts` | 282 | `register` | the place fixes the kind | `f04b8ecbc9` |
| `packages/cli/src/command-repository.ts` | 48 | `destination` | the place fixes the kind | `f04b8ecbc9` |
| `packages/cli/src/command-scope.ts` | 111 | `register` | reads the definition the summary names | `f04b8ecbc9` |
| `packages/cli/src/command-verify.ts` | 24 | `directory` | the place fixes the kind | `f04b8ecbc9` |
| `packages/cli/src/command-verify.ts` | 57 | `register` | compares with a held reference: the configured register (`95231387b4`); see question V1 | `f04b8ecbc9` |
| `packages/cli/src/command-verify.ts` | 67 | `directory` | reads sourceKind | `f04b8ecbc9` |
| `packages/cli/src/invitations.ts` | 81 | `destination` | the place fixes the kind | `f04b8ecbc9` |
| `packages/cli/src/invitations.ts` | 81 | `rules` | the place fixes the kind | `f04b8ecbc9` |
| `packages/cli/src/invitations.ts` | 92 | `directory` | the place fixes the kind | `f04b8ecbc9` |
| `packages/cli/src/invitations.ts` | 92 | `membership` | the place fixes the kind | `f04b8ecbc9` |
| `packages/cli/src/invitations.ts` | 203 | `inbox` | the place fixes the kind | `f04b8ecbc9` |
| `packages/cli/src/mcp.ts` | 62 | `membership` | the place fixes the kind | `f04b8ecbc9` |
| `packages/client/src/commons.ts` | 22 | `commons` | the place fixes the kind | `f04b8ecbc9` |
| `packages/mcp/src/views/member-reads.ts` | 10 | `membership` | the place fixes the kind | `f04b8ecbc9` |
| `packages/mcp/src/views/session.ts` | 112 | `directory` | the place fixes the kind | `f04b8ecbc9` |
| `packages/platform/src/application-codec/application-projection-wire.ts` | 15 | `directory` | the place fixes the kind | `ccb1fec584` |
| `packages/platform/src/application-install-creation.ts` | 76 | `lane` | the place fixes the kind | `ccb1fec584` |
| `packages/platform/src/application-install.ts` | 236 | `lane` | the place fixes the kind | `ccb1fec584` |
| `packages/platform/src/commons-cohort-data.ts` | 53 | `commons` | the place fixes the kind | `ccb1fec584` |
| `apps/room/page/src/claim.ts` | 71 | `register` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/claim.ts` | 170 | `register` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/claim.ts` | 225 | `register` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 294 | `directory` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 294 | `membership` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 307 | `directory` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 307 | `membership` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 317 | `membership` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 411 | `commons` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 742 | `rules` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 1037 | `directory` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 1037 | `rules` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 1099 | `rules` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 1291 | `lane` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/join-custody.ts` | 35 | `membership` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/list-context.ts` | 28 | `membership` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/main.ts` | 93 | `register` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/main.ts` | 923 | `register` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/oauth-context.ts` | 47 | `membership` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/rules-summary-v11.ts` | 23 | `destination` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/start-custody.ts` | 30 | `register` | the place fixes the kind | `842968a8a4` |
| `apps/room/page/src/data.ts` | 280 | `string` | the place fixes the kind | `fb13755c78` |
| `packages/bytes/src/invitation-proof.ts` | 14 | `membership` | the place fixes the kind | `1947b852b9` |
| `packages/derive/src/device-command-grant.ts` | 21 | `membership` | the place fixes the kind | `7b7d232905` |
| `packages/derive/src/grant.ts` | 124 | `membership` | the place fixes the kind | `7b7d232905` |
| `packages/scope/src/applications/projection-source.ts` | 38 | `rules` | the place fixes the kind | `f17b1e4779` |
| `packages/scope/src/github-repository-bindings.ts` | 27 | `destination` | the place fixes the kind | `f17b1e4779` |
| `apps/room/page/src/open-requests.ts` | 36 | `directory` | compares with a held reference | `6aae2109ab` |
| `apps/room/page/src/open-requests.ts` | 48 | `directory` | compares with a held reference | `6aae2109ab` |
| `apps/room/page/src/original-check.ts` | 72 | `directory` | compares with a held reference | `6aae2109ab` |
| `apps/room/page/src/original-check.ts` | 141 | `directory` | compares with a held reference | `6aae2109ab` |

## Checks against a variable

The script finds only comparisons with a quoted word. These drops compare a
kind with a variable or a declared type:

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

## Comparisons that chose a behaviour

Ruling 7 (ii) excludes a comparison that chose between two code paths for one
slot. Two sites did:

- `apps/room/page/src/open-requests.ts` and `original-check.ts`: a row to the
  directory also locks, stops or settles the directory. Ruling 10 (b) covers
  them: the page compares the row's reference with the directory reference it
  holds and with the partition references that its directory read returns
  (`partitionIndexes`), so a row to a partition locks the directory and reads
  "in this room".
- `packages/cli/src/command-verify.ts:57`: the verify source reads create
  results only from a register's pages. The check compares the page's full
  reference with the configured register. Ruling 190b31f4 confirms it (V1).

## The retired-room reader commit

`RETIRED_ROOM_READER_COMMIT` lives in `packages/bytes/src/retired-room.ts`.
Ruling 190b31f4 (Q-S4) keeps it out of `contract`. `bytes` is the lowest
package that `scope` and `mcp` both depend on. Its value is 40 zeros until
the landing, marked `// FILLED AT LANDING`.

## Re-pinned platform digests

The dropped kind checks change the declaration bytes of three platform
versions. `packages/platform/scripts/pin-native-declarations.mjs` wrote the
new pins into `native-declarations.generated.ts`. Ruling 862eb586, item 6,
asks for this list. No other pin changed.

| Version | Old digest | New digest |
|---|---|---|
| `platform:inbox@1` | `sha256:2d4fb56155ddc0cf02bfc75ac89a261c35aeb3069771e4a51429319ccd204748` | `sha256:1110d86e954737e3b9412887f0f357ac9374a60e43570ef2e28fe79c64c0cfe0` |
| `platform:destination@5` | `sha256:aed97f875f0331aeb249deff7a35b45378decfae43a3efedb5eac8ca43433f96` | `sha256:40d9aae597c18d7507edc096c699e7e9730b2cb918b8375edb2cc36938539209` |
| `platform:destination@6` | `sha256:aed97f875f0331aeb249deff7a35b45378decfae43a3efedb5eac8ca43433f96` | `sha256:40d9aae597c18d7507edc096c699e7e9730b2cb918b8375edb2cc36938539209` |

`packages/platform/test/versions.test.ts` states the new pins. The I5 note,
`notes/implementation/2026-10-07-i5-definition-versions-delivery.md`, keeps
the old inbox digest as the record of its time.

## Held test assertions

These test assertions read a reference's kind, or a reason that names the
incarnation, and no row above covers them. Each site has a `// HELD` comment.
A ruling decides what replaces each one.

| File | Assertion | Question |
|---|---|---|
| `packages/replay/test/verify.test.ts` | a reference to another genesis fails with `wrong incarnation` | which reason the replay now gives |
| `packages/checkers/test/reservation-origin.test.ts`, `reservation-record.test.ts` | the frozen `fixtures/reservation-record.json` names `at` and `inc` in its entries | a new recording from the Scope recorder |
| `packages/cli/test/scope-index-applications.test.ts` | the recorded `fixtures/application-release-listing.json` names `inc` and `kind` in its references | a new recording of the listing |

## Browser store list (rulings e7787de0 items 5 and 6, 4393b366 P1)

Ruling e7787de0 item 5: "Page (rows 14, 15 and 18): case A. The settings
slot, the Start and enrollment originals and the tab list record take new
storage names. The new Page reads none of the old names, so the legacy key
migration has nothing to read: remove that path from the new code. The key
store holds keys and no reference, and it stays."

Ruling e7787de0 item 6: Counter and Lending (rows 20 to 22): their browser
databases take new names, no capacity is shared with an old row, and no
default or address-only slot can load one.

Ruling 4393b366 P1 adds the claim journal, the connection custody rows and the
OAuth connection rows to case A.

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

The Page reads none of the old names. The legacy key migration is removed:
`migrateStart`, `migrateOriginalStart`, `migrateOriginalJoin`,
`legacySettingsKey`, `migratePageOperations`, the claim recovery migration and
their tests. Start and enrollment rows are version 2 only and hold a public
key, never a secret.

A person who returns with an old link gets `room-retired` from the Worker. The
old browser rows stay in the browser, unread.

Release text (ruling 5f63a8f2 Q-R1; the same text goes in
`docs/operate-a-service.md` and the landing commit body):

"Rooms made before the identifier cutover are retired. An old link answers `room-retired`, or 404 on a Worker that serves only indexed scopes. The browser keeps its old rows and no longer reads them."

Kept, not a stored-row migration: the "Join with config and key" screen
(`apps/room/page/src/main.ts`) imports a pasted `device.key` through the key
store's `migrate`, and the join path imports a supplied `secret` the same way.
Neither reads a stored row, so neither is the legacy migration that item 5
removes. Ruling 5f63a8f2 keeps both on one condition: a pasted config with
`v: 1` gets the retired-home refusal of e46dd964 item 5, and the screen imports
nothing from it. `isRetiredConfig` (`apps/room/page/src/data.ts`) makes the
check before the screen reads the key. The config scene of
`apps/room/page/test/settings.test.ts` pastes a `v: 1` config and checks the
refusal, no open, no settings write and no key import.

## Grow and lending examples

The grow examples check each entry with `isEntryBodyOf` against the room's
sequence reference. The simulator host reads the room kind `lane` from the
room genesis seed, not from the binding.

## Summaries asked for their own kind (ruling 5f63a8f2 Q-L1)

The standing ruling: where code asked a summary for the kind of its own scope,
it reads the summary's `definition` instead.

| File | Check dropped | What replaces it |
|---|---|---|
| `examples/lending/browser/model.ts` (`memberForKey`) | `summary.scope.kind !== "membership"` | the summary's definition matches `platform:membership@<n>`; any other definition returns null |
| `packages/scope/test/signed-reads.test.ts` | the summary's `scope.kind` is `register` | the summary's definition matches `platform:register@<n>` |
| `apps/room/page/test/task-data.scope.test.ts` | the child summary's `scope.kind` is `lane` | the child summary's definition is the lane definition digest, which the assertion already compared |

The lending test roster names `platform:membership@13`, and a roster with a
directory definition returns null.

## Hold task field (ruling 4393b366 T3(d))

The `task` field of a hold@1 instance step holds the plain lane reference,
with no kind. `packages/mcp/test/room.scope.test.ts` sends it that way.

## Coverage kind (ruling 4393b366 T3(a))

A report coverage row keeps the kind as its own member beside the reference.
The replay reads it from the genesis of the covered sequence. Only a row that
covers entry 0 carries a kind. The `dap verify` shared coverage line states
`kind register` again. The replay tests build their expected rows with
`coverageRow`, which reads the kind from the same genesis.

## Old-format room values in tracked configuration (ruling 19a509a5)

Ruling 19a509a5 (Q-D1) removes `DEMO_START_CONFIG` from
`apps/room/wrangler.demo.jsonc`. With no start config, the demo Worker serves
no start offer: `/v1/demo/creation-offer` answers 404, and the smoke table
expects 404. The planner makes the new registers after the cutover deployment
and puts their references in its own configuration head.

The table names each tracked value that refers to a room made before the
cutover. It says what the Worker does with that value between the cutover
deployment and the planner's configuration head. Each named scope is a retired
room after the cutover, so a read or a delivery to it answers `room-retired`.
I read this behaviour from the source. No run observed it.

| Value | File | What the Worker does with it until the planner's head |
| --- | --- | --- |
| `REGISTER_SCOPE` `sc_zm56…` | `apps/room/wrangler.demo.jsonc` | Parentless creation admits only an install whose seed hashes to this ID. That register is retired, so the Worker creates no room. |
| `INSTALLED_REGISTER_SCOPES` (`sc_b5q4…`, `sc_zm56…`) | `apps/room/wrangler.demo.jsonc` | The Artifacts host serves only rooms under these registers. Both are retired, so the host serves no live room. |
| `ARTIFACTS_CONFIG.registerScope` `sc_zm56…` | `apps/room/wrangler.demo.jsonc` | It binds the Artifacts adapter to the retired register. It also must equal `REGISTER_SCOPE`, or the adapter reports no host roots. |
| `REGISTER_SCOPE` `sc_yatk…` | `apps/room/wrangler.grow.jsonc` | As for dap-demo: the Worker creates no room. |
| `ARTIFACTS_CONFIG.registerScope` `sc_yatk…` | `apps/room/wrangler.grow.jsonc` | As for dap-demo: the adapter is bound to a retired register. |
| `APPLICATION_SCREEN_HOSTS[0].directory` `sc_rygh…` | `apps/room/wrangler.grow.jsonc` | The application route matches the Grow screen origin to this directory. The directory is retired, so the screen's room reads answer `room-retired`. |
| `GROW_ARCHIVE_CONFIG.directory` `sc_rygh…` | `apps/room/wrangler.grow.jsonc` | The archive driver archives this directory. The directory is retired, so the archive makes no progress. |
| `REGISTER_SCOPE` `sc_c67l…` | `apps/room/wrangler.lending.jsonc` | As for dap-demo: the Worker creates no room. |
| `ARTIFACTS_CONFIG.registerScope` `sc_c67l…` | `apps/room/wrangler.lending.jsonc` | As for dap-demo: the adapter is bound to a retired register. |
| `SCREEN_HOSTS[0].host.directory` `sc_rygh…` (the Grow directory) | `apps/sandbox/wrangler.rollout.jsonc` | The sandbox serves the Grow screen origin under this descriptor. The descriptor must equal the Grow room's `APPLICATION_SCREEN_HOSTS` entry. The room behind it is retired, so the screen shows no live room. |
| `register` `{ scope: sc_b5q4…, inc: in_rjfr… }` | `examples/repo-in-ai/input.example.json`, `examples/repo-in-ai/hosted-loop/input.example.json` | No Worker reads it. The example input names a retired register in the old format. |

These tracked values name no room: `REGISTER_SCOPE` and
`ARTIFACTS_CONFIG.registerScope` `unplanned` in
`apps/room/wrangler.commons.jsonc`, its `DEMO_START_CONFIG` register
`unplanned`, and `REGISTER_SCOPE` `PLANNED_O4_REGISTER_SCOPE` in
`apps/room/wrangler.connect.jsonc`. `apps/room/wrangler.artroom-scope.jsonc`
and `apps/room/wrangler.jsonc` track no room ID. Their live settings are not
in the repository. The grep covered every tracked `.jsonc`, `.json` and
`.toml` outside tests, fixtures, test vectors and notes.

## Replay and listing cases after the cutover (ruling a140a1c6 Q-V1, Q-C1)

`packages/replay/test/verify.test.ts`, the reference to another genesis: replay
refuses at I.1 with "a retained foreign body does not match its exact fact"
(T3(b)).

The genesis-kind case in replay mode uses `reseal` from
`packages/replay/test/world.ts`. The helper changes the kind of I.0, then seals
D, P and I again in the order their entries used each other, and it signs each
changed intent again with its actor's fixture key. Replay refuses at I.0 with
`genesis-kind`. The integrity-mode case changes I.0 in place, so the genesis no
longer binds the digest that names its sequence, and the result is `mismatch`.

`packages/cli/test/scope-index-applications.test.ts`: the damage that put the
membership reference in the `scope` slot depended on the kind in the
reference. The case now gives the installed scope a reference whose `genesis`
is `null`. The summary shape refuses it, so the listing reports
`malformed-summary`. A wrong genesis that is still a digest cannot be told
from the right one in the listing, and the listing gets no new rule for it.
The scope refuses such a reference when it is used: `routed` in
`packages/scope/src/namespace.ts` answers `wrong-genesis` to any delivery
addressed by a reference whose genesis differs from the scope's own.

## Births of foreign sequences (rulings 4f697a7a and ae48dd39)

Ruling 4f697a7a replaces the birth uses of ruling a140a1c6. An entry records
no birth use. Its uses list and its use count are the same as before the
cutover.

The scope keeps the first entry of each foreign sequence whose later entry it
retains. `used()` in `packages/scope/src/core.ts` stores those bytes as a
`retained_input` row of the kind `entry`. A `retained_birth` row, keyed
`(genesis, scope)`, names that row's digest (`packages/scope/src/sqlite.ts`).
The store keeps one copy for each content digest and one birth row for each
sequence, so ten entries that use one foreign sequence keep its genesis once.

Ruling ae48dd39 adds `birth` to the archive's retained kinds. An archive pass
writes a sequence's birth once, under the genesis digest. Replay reads it with
`#birth` in `packages/replay/src/verify.ts`, admits it with
`admitSequenceGenesis`, and checks each later copy of that sequence with
`isEntryOf`. A birth is no anchor: `packages/scope/src/archive-anchors.ts`
records the birth pin and adds no published anchor for it (B5 below).

### Archive caps with births (ruling 6d658a9f)

No cap changes, and the attempt charges stay as they are. The caps are
`ARCHIVE_BOUNDS` in `packages/scope/src/archive-budget.ts`: 512 attempts and
64 MiB of `inputWork` for one pass.

Summed from the charge sites: an entry with base cost B and U later uses from
S foreign sequences spends B + 4U attempts before births. The four charge
sites for each use are `archive-foreign.ts:86`, `archive-inventory.ts:107`,
`archive-retained.ts:113` and `archive-inventory.ts:139`. Each birth adds 3
attempts, so the sum after births is B + 4U + 3S, with S at most U.

The worst case is 128 later uses from 128 sequences. Before births it spends
B + 512 attempts. That is over the 512-attempt cap for any B above 0, so the
entry was over the attempts cap before this head. It was over the `inputWork`
cap too: INPUTWORK FIGURE PENDING. After births it spends B + 896 attempts.
The planner files ARC-1 for the older gap.

When one entry is over a cap, the archive stops at that entry:

1. A spend over a cap throws `ArchiveStopped("limit")`
   (`archive-budget.ts:101`).
2. On the first wake the adaptive pass selects no entry, and
   `archive-adaptive.ts:179` returns `{ deferred: "capacity" }`.
   `archive-driver.ts:404-409` keeps the wake and reports state `retry`,
   reason `limit`.
3. On the next wake the driver picks the fixed one-entry strategy
   (`archive-driver.ts:374`). Its planner returns `limit` at
   `archive-adaptive.ts:218-220`.
4. `archive-driver.ts:416` calls `rows.stop("limit")` (`archive-row.ts:313`).
   The archive floor stays at the entry before.
5. An operator can restart a `limit` stop (`archive-row.ts:54-57`). The
   restart pays again and stops at the same entry.

### Retained bytes with births (ruling a4a587c9, option b)

`fieldRetainedBytes` (`packages/derive/src/field-retention.ts`) charged
`min(facts, usesPerEntry)` × `entryBytes` for an entry's foreign copies. It
now charges the same term again for births. Each copy can bring one birth:
the first entry of its sequence, which the scope keeps under ruling 4f697a7a.
No bound on a genesis is smaller than `entryBytes`. `Bounds` states none, and
`admitSequenceGenesis` admits a genesis under `entryBytes`. A birth therefore
counts `entryBytes`, and an entry with N copies reserves 2 × N × `entryBytes`
for them. `capacity.ts` and `holds.ts:409` both read the function, so the
validator and the holder reservations take the term together.

The term is an upper bound for one entry. A scope keeps one birth for each
sequence, so a later entry that uses the same sequence adds no birth bytes.
`logicalBytes` counts each retained digest once.

Capacity checks over the pinned definitions, with no cap changed:

- `definition-corpus.test.ts` validates every shipped and native corpus row
  under `PROPOSED_BOUNDS`: the lanes, Counting, Counting commitments,
  Lending, the Grow Site and Room, the source-built Grow demo, and the
  retained Grow demo packet. All validate.
- The maintained application packages pack: Counter, Lending, the Grow check
  package and the recorded Grow demo. The source-built Grow demo packs with
  the 0a5f97ba repair, which waits for the planner's digest confirmation.
- `capacity.scope.test.ts` and the Directory partition capacity stories pass.
- Seven derive vectors move by one `entryBytes` for each copy:
  `bound-records`, `forms-binding`, `forms-settles` ×2 and `receiver-pins` ×3.

At runtime, a scope whose definition opts into `whole-scope` capacity checks
its bytes inside the turn's transaction (`packages/scope/src/turn.ts`,
`#full`). The check adds the scope's logical bytes, which count each entry
and each retained input once by digest, births included, to the pending
reservation. If the sum passes `scopeBytes`, the transaction writes nothing.
An act or a delivery answers `refused` with reason `scope-full` and the name
`scopeBytes` (`core.ts`). An outcome records `unavailable` with reason
`scope-full` (`operations.ts`). A timed turn writes nothing and records the
bound on the turn. A scope without the opt-in checks only its entry count
(`fits`) and never refuses for bytes.

## Faults found after the composed head

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

## Creator comparisons (audit accepted in a5d65e58)

The genesis self reference `{ scope, genesis: null }` appears only in seeds
that a genesis judgment sends (`derive/src/sends.ts:234`). A seed's creator
that a code path compares with a full reference must go through
`resolveGenesisSelf(creator, source)` when the source is a fact. The audit
read about 20 more comparisons. Their creators are born by an act or a
delivery, or the code already resolves them, so they need no change.

| Commit | Site | Change | Test |
|---|---|---|---|
| `804310e7c3` | `act-admission.ts`, sibling check (B6) | resolves against the parent's genesis fact | installed device scopes |
| `1932465898` | `act-admission.ts`, ancestor walk (B7) | resolves against `born.source` | installed fixture scopes |
| `4be0d250a4` | `projection-ownership.ts:21`, ancestor walk | `genesis.source ? resolveGenesisSelf(creator, source) : null` | "projection ancestry resolves a parent named by the genesis self reference" |
| `093e5b47ed` | `examples/commons-bill/witness.ts`, `roomGenesisCreated` | resolves when the source is a fact and compares the raw creator otherwise | "W1 room genesis check resolves a creator named by the genesis self reference" |
| `f7c26d0b3c` | `replay/src/verify.ts:2257`, `scope/src/receiver-reads.ts:86` | checks `isFactRef(born.source)` first, then compares the resolved creator | none |

The last row has no test. Both sites check a refused sibling genesis under
`partition-v1`, and no partition fixture builds a refused creation.
`partition-proof.test.ts` and `directory-partition-factory.test.ts` build
only applied ones.

Commit `093e5b47ed` also fixed two checks in the commons-bill witness that
still read the old reference. `inputOf` read `input.room[kind].kind`, and
`preflight` read `entry.at`. The witness now binds each room reference by
its genesis hash and seed scope ID, and reads the kind from the seed. The
two existing W1 tests had failed with `input-room`.

## Anchors and genesis copies

Behaviour change: main's verify accepted a caller anchor of any kind; this head limits anchors to the register and membership kinds under 5a642337 and 066e49b3.

A Directory fact that main took on an anchor is now proved by replay: the
archive source serves the Directory journal.

Ruling 1cf42f3b: `anchoredCopy` in `packages/replay/src/verify.ts` accepts a
genesis copy on four conditions:

- `fact.seq` is 0.
- `fact.hash` equals `fact.at.genesis`.
- `admitSequenceGenesis(bytes, fact.at)` admits the bytes.
- The admitted sequence's kind equals the kind the using entry records.

The anchor stays required. The report lists the genesis with the other
anchored facts. The test is "an anchored genesis copy admits only at its own
address with its recorded kind" in `packages/replay/test/genesis-bodies.test.ts`.
Request RV-1 (`c6276dec`) holds the self-proving genesis for after the
cutover.

## Anchored copies in judgments (ruling 3bf7e5aa, option b)

Every checked copy enters the judge's `facts`, as on main. `#replay` in
`packages/replay/src/verify.ts` checks a copy by one of two paths before the
judge reads it:

- A copy of a sequence that Replay runs must match that checked sequence.
- A copy of a sequence that Replay does not run must pass the `#privateCopy`
  context check, and it must match the sequence's checked first entry. That
  entry is the retained birth, or the copy itself at entry 0.

The copy enters `facts` with that checked sequence and with the definition
name that `#privateCopy` admitted. `#prove` still proves every fact by replay
or by an anchor. A judge now takes no assumed copy, so the head removes
`assumedCopies` and the three stops that read it: "anchored raw copies cannot
enter Native uses", "caller copies cannot supply a Native capability" and "the
pinned sender requires genuine genesis evidence, not an anchored copy".

A copy that fails its check stops the replay before any judge runs. The test
is "an anchored source copy with no retained definition name stops the replay
before the judge reads it" in `packages/replay/test/decisions.test.ts`. Its
guard counter stays at 1.

The nine tests that waited on this ruling pass: `decisions.test.ts` ×4,
`verify.test.ts` 18.46 and 18.52, the two archive-driver resume tests, and
the `archive-installed.test.ts` publication and failed-claim cases. The resume
tests now serve the Rules and Destination journals as well as the Directory
journal. The "Other test changes" table gives the reason.

## The Grow archive binding (ruling e4b72290)

Q1: `growArchivePolicies` (`apps/room/archive-policy.ts`) takes the trusted
release as a `GrowArchiveRelease` of three parts: the release digest, its
publisher and its entry definition. The function reads the packet under that
release and builds a policy for the entry, for every other definition the
packet declares, and for the native room places. `growArchiveConfiguration`
and `growArchiveDriver` (`apps/room/archive.ts`) take the release digest, and
the config check compares the configured release with it.

`apps/room/worker.grow.ts` passes today's three constants: `DEMO_RELEASE`,
`DEMO_PUBLISHER` and `GROW_ARCHIVE_DEFINITIONS[0]`. The recorded packet
declares exactly the two `GROW_ARCHIVE_DEFINITIONS`, so production builds the
same policies as before. Tests that use the recorded packet pass
`RECORDED_GROW_RELEASE` (`packages/scope/test/support/recorded-grow-release.ts`).

## Pending rulings

- **e4b72290 Q2: Room A shape.** RULING IN WORK. See "The Grow archive
  binding".
- **0a5f97ba: the demo Site receiver.** RULING PENDING. `demoDefinitions`
  points the Site's `create-room` send at the demo Room
  (`examples/grow/demo-definitions.ts:75-77`). The Site's
  `receives.room-summary` handler still pins the maintained Room, so the
  package check refuses the demo built from source with `wrong-peer`.

## The kept Grow refusal test (ruling a7c8072a)

`archive-installed.test.ts`, "installed Grow scopes export genesis zero after
a late native membership directory binding", installs the recorded
old-spelling package: the retained Site `69424c1b…` and Room `5e2d34fa…`. The
install answers `refused`, phase `refused`, reason `bad-field`, name
`invalid-application-package`.

Commit `70c3431750` cut the branches that only this case reached:

| Branch | Acceptance case it carried | Covered elsewhere |
|---|---|---|
| cross-family scan, Grow side | A public copy from the device family does not authorize the failed-claim producer. | In part. The failed-claim case still checks the other direction, and `archive-foreign.test.ts:736` and `archive-inventory.test.ts:534` test the refusal on fixtures. |
| `historicalCeilingControls` and `TESTCeilingChargeBudget` | Five whole-prefix control plans under the old charges give the recorded pass costs of the retained Site and Room and of Directory16, Rules10 and Destination12. | No. The costs belong to the retained identities, which no longer install. |
| `originalPassCosts` | The recorded whole-pass costs of those five definitions. | No, for the same reason. |
| `independentSupport` | The support metadata receipts of those five definitions, measured before shared price extraction. | No, for the same reason. |

## Other test changes

| Test | Kind | Change |
|---|---|---|
| `archive-target` | fixture shape | Anchors read source pins from the Register genesis. A wrong pin refuses `foreign-source-mismatch`, and no sources refuses `foreign-source-unavailable`. The Rules seed names its creator by the genesis self reference. |
| `archive-target` | vector | The Rules birth spends its bytes in metadata and 8 × its bytes in `inputWork` for genesis validation, on top of the settled read. |
| `archive-row` | vector | The row reference is `{ scope, genesis }`. Old row bytes 501 → 528, marked 1344 → 1371, attempted 1362 → 1389. Compact confirmation metadata 5175 → 5256, `inputWork` 12,878,491 → 12,879,544. The largest compact row is 25,112 bytes, under 32,768. |
| `archive-host` | vector | Selection bytes 3789 → 3903. First charge `inputWork` 15,156 → 15,612, last 30,312 → 31,224. Admitted metadata 22,774 → 22,936, `inputWork` 89,628 → 92,046. |
| `archive-prefix` | vector | Frame and prefix sizes [418, 1477, 418, 1557] → [464, 1416, 464, 1617]. Gross metadata 70,434 → 70,480, `inputWork` 237,938 → 234,448. |
| `archive-privacy` | classification | A changed genesis on a later entry refuses `mismatch` from `archive-entry-metadata.ts:68`. The incarnation check at `archive-privacy.ts:27` is unreachable, because the header builds its reference from the pin. |
| `archive-source-pins` | fixture shape | The redundant guard moved from the comment step `remark` to the transition `accept-report`, because validation refuses a guard on a comment step. |
| `archive-build` | vector | Plan fence metadata 43,432 → 45,804, `inputWork` 118,976 → 125,520. Entry read bytes [1551, 1552, 1876, 2296] → [1611, 1612, 1962, 2434]. |
| journal Git costs | vector | `head.json` 232 → 260 bytes. The pass, selection and forecast costs move with the entry shape. |
| publication, foreign, parent-bootstrap, installed, driver | fixture shape | A test that plans or rebuilds a published pass gives the scope's own replay context through `ownReplayContext`, which fails when the fixture lacks its genesis. |
| `archive-parent-bootstrap` | fixture shape | The support creates a Directory, so the seed kind is `directory`, not `lane`. |
| `archive-anchor-ranges` | fixture shape | The journal helper adds a birth for each foreign sequence used at a later entry. |
| `decisions` | fixture shape | `served()` serves the birth of `otherLane`. |
| `room-verification` | vector | A coverage row states its genesis kind. |
| `floor-signers` | fixture shape | The test reads the register kind from the genesis seed. An entry carries no address. |
| `mcp` inventory and `docs/mcp-tools.json` | vector | A scope reference reads `{ scope, genesis }`. The same text in `docs/roadmap.md`, `docs/use-cases.md` and `docs/deploy.md` changed. |
| Grow example tests | fixture shape | Scripted entries name their genesis. Entry 0 of the command journal is a fixture genesis. Foreign copies carry their sequence, and receipts take the scope and effects. |
| lending browser storage | fixture shape | References are `{ scope, genesis }`. |
| repo-in-ai example and tests | fixture shape | References are `{ scope, genesis }`, and home configs are version 2. An entry binds to its sequence by genesis (`isEntryBodyOf`, `sentByBody`), and a genesis binds by its seed and hash. The example drops its register kind checks, because the place fixes the kind. Fixture refs that differed only by kind now differ by genesis. |
| `archive-driver` resume, sha1 and sha256 | fixture shape | The Directory takes deliveries from the Rules and Destination geneses. Under 5a642337 and 066e49b3 neither kind may be an anchor, so the test also serves the Rules and Destination journals, and Replay proves those facts by replay. The anchors include the Membership facts of all three journals. The test compares the reported anchors as a set, because Replay reports them in the order of use. The fixture is `archiveAuthorityReplay`, which B10 shares. |
