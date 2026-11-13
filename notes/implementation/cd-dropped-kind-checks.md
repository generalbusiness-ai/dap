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
| `packages/replay/test/verify.test.ts` | coverage rows state each scope's kind | what replaces the kind column of the coverage |
| `packages/replay/test/verify.test.ts` | a reference to another genesis fails with `wrong incarnation` | which reason the replay now gives |
| `packages/checkers/test/reservation-origin.test.ts`, `reservation-record.test.ts` | the frozen `fixtures/reservation-record.json` names `at` and `inc` in its entries | a new recording from the Scope recorder |
| `packages/mcp/test/room.scope.test.ts` | the hold `task` field value is the lane reference with `kind: "task"` | what form that field value takes |
| `packages/cli/test/scope-index-applications.test.ts` | the recorded `fixtures/application-release-listing.json` names `inc` and `kind` in its references | a new recording of the listing |
| `packages/cli/test/verify.test.ts` | the shared coverage line states `kind register` | what replaces the kind column of the coverage |

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

Release text: "Rooms made before this release are retired: an old link
answers `room-retired`, and the browser keeps its old rows but no longer
reads them."

Held: the "Join with config and key" screen (`apps/room/page/src/main.ts`)
imports a pasted `device.key` through the key store's `migrate`. It reads no
stored row, so it is not the legacy migration. The join path imports a
supplied `secret` the same way. Both stay until a ruling says otherwise.

## Grow and lending examples

The grow examples check each entry with `isEntryBodyOf` against the room's
sequence reference. The simulator host reads the room kind `lane` from the
room genesis seed, not from the binding. The lending `memberForKey` check
`summary.scope.kind !== "membership"` is HELD for a planner ruling.
