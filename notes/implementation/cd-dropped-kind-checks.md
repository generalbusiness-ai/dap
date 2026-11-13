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

## Comparisons that chose a behaviour

Ruling 7 (ii) excludes a comparison that chose between two code paths for one
slot. Two sites did:

- `apps/room/page/src/open-requests.ts` and `original-check.ts`: a row to the
  directory also locks, stops or settles the directory. Ruling 10 (b) covers
  them: the page compares the row's reference with the directory reference it
  holds.
- `packages/cli/src/command-verify.ts:57`: the verify source reads create
  results only from a register's pages. The check now compares the page's
  scope with the configured register. Question V1 asks whether that holds.
