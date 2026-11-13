# Tables of the C+D kind-check note

This file holds the kind table, the two seal tables, the list of entry
points whose admission or refusal changed, and the other test changes of
[Kind checks dropped at the identifier cutover](cd-dropped-kind-checks.md).
They moved here unchanged from that note at main `57e893c0`, so the note
stays under the 40,960-byte limit for a note.

No script makes these tables. A script that is not in the repository read
the diffs for the File, Line, Kind dropped and Commit columns of the kind
table, and its last eleven rows come from a read of the head. The seal
values come from `sourceSeal` and `namedSourceSeals` in
`scripts/security-entry-points.test.mjs`. The columns "What replaces it",
"Change" and "Change in the file" are written by hand. Edit this file by
hand.

## Kind table

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
| `packages/scope/src/namespace.ts` | 118 | the reference's `kind` against the scope's | the genesis bytes fix the kind: routing selects the room by scope ID, the scope ID is the digest of a seed that states the kind, and the genesis must match | `aedccd9e95` |
| `packages/scope/src/namespace.ts` | 77 | `directory` | compares with a held reference: the request must name the recorded creator Directory exactly, and the receiver answers only as a Directory | `ff4ef5a97d` |
| `packages/scope/src/worker.ts` | 790 | `membership` | the place fixes the kind: the key read observes the caller's full Membership reference, in place of a reference built from a scope ID | `7c740b5255` |
| `packages/mcp/src/hosted.ts` | 125 | `membership` | the place fixes the kind: the control request's `membership` field, and the registry answers only for the Membership whose name selects it | `daf76b0512` |
| `packages/mcp/src/hosted.ts` | 202 | `membership` | the place fixes the kind: the role request's `membership` field | `daf76b0512` |
| `packages/mcp/src/hosted.ts` | 256 | `membership` | the place fixes the kind: the stored identity's `membership` field | `daf76b0512` |
| `packages/mcp/src/hosted.ts` | 298 | `membership` | compares with a held reference: the observed `of` must equal the request's Membership | `daf76b0512` |
| `packages/scope/src/sessions.ts` | 149 | `membership` | the place fixes the kind: the claims' `membership` field; acceptance compares it with the scope's own full Membership reference | `ff4ef5a97d` |
| `packages/scope/src/site/host.ts` | 62 | `destination` | the place fixes the kind: the admitted Directory's destination slot; the publication must answer under that exact reference | `6c1f06153e` |
| `packages/scope/src/site/host.ts` | 80 | `destination` | the place fixes the kind: the admitted Directory's destination slot | `6c1f06153e` |
| `packages/client/src/application-route.ts` | 34 | `directory`, `rules`, `membership`, `destination`, `lane` | the place fixes the kind: each named field of the screen context, and the five fields must name five different scopes (B15); the Directory must also match the address's scope ID | `f04b8ecbc9` |

## Plain seals

| File | Old | New | Change |
|---|---|---|---|
| `apps/room/archive-policy.ts` | `ed3b746b5a26` | `d22a58a95319` | trusted release (e4b72290) |
| `apps/room/archive.ts` | `9547f8b9a4a1` | `f48d094c318f` | trusted release (e4b72290); replay context; seed kind |
| `apps/room/demo-creation.ts` | `91d9ac8a8fa3` | `18124da145e9` | ref shape {scope,genesis}; retired-room stop |
| `apps/room/page/src/oauth-context.ts` | `15e8f1a89a49` | `ebf66f2c85eb` | store key dap-page-settings-2; ref shape |
| `apps/room/page/src/oauth-custody.ts` | `cedf10f00ac0` | `4ccc5fa0e3c1` | browser store v2, new prefixes | |
| `apps/room/worker.grow.ts` | `0cc4c1c63f79` | `af224660bab6` | trusted release; symbol hooks |
| `examples/grow/simulator-host.ts` | `26a8521b9873` | `a503e2868ee7` | ref shape; entry body check |
| `packages/bytes/src/index.ts` | `7c8c95148c4a` | `7a8a620d0a93` | exports sequence.ts, retired-room.ts | |
| `packages/bytes/src/read-minimum.ts` | `5ead3e9579b2` | `13e8cbbcaf4c` | ref shape | |
| `packages/bytes/src/records.ts` | `05bf74f714d8` | `d180789cec24` | entry and ref shapes: genesis entry, sequence entry, FactUse kind, delivery sourceKind |
| `packages/checkers/src/stage-origin.ts` | `6311b4c69f7d` | `73ef787bb9db` | facts matched by isAt; genesis by hash |
| `packages/cli/src/claim.ts` | `ea9e90d5e2d6` | `e5799b13266b` | sibling seeds from directory genesis |
| `packages/cli/src/command-support.ts` | `53798996a3c1` | `d583fdc07738` | ref shape (message) | |
| `packages/cli/src/files.ts` | `7d0d64f35278` | `692ad5257d94` | home format v2; RetiredHomeError |
| `packages/cli/src/invitations.ts` | `f9ce8e94410e` | `45d96db128f5` | ref shape; inbox genesis check; v2 |
| `packages/cli/src/scope-index-applications-command.ts` | `e72f729f4232` | `5af0f495fb9a` | kind from manifest row | |
| `packages/cli/src/scope-index-manifest.ts` | `a01740e192ab` | `4bd67e5543b0` | manifest rows {at, kind}; creator via source |
| `packages/cli/src/status-report.ts` | `4df678cff2b3` | `6167375d4e69` | kind from slot name | |
| `packages/cli/src/store.ts` | `9b185a206c41` | `e710dc929252` | home format v2 | |
| `packages/cli/src/verification.ts` | `3fb0f354c0d0` | `4875139168f4` | entry framed by genesis |
| `packages/client/src/application-install.ts` | `4046c6792d46` | `08bae1b1393d` | drop ref kind check | |
| `packages/client/src/application-route.ts` | `3ba8c4d9e680` | `62660d1d37d6` | drop ref kind checks; the five context scopes must differ |
| `packages/client/src/describe.ts` | `43c62d2cfd70` | `5fd433d592d3` | ref shape (text) | |
| `packages/client/src/expected.ts` | `bdbfca234539` | `914ab6dab7f0` | ref shape | |
| `packages/client/src/session.ts` | `3e4dfcbab9c9` | `0199b1f70200` | ref shape |
| `packages/derive/src/genesis.ts` | `15a4adb0e86d` | `d2a6165d4243` | genesis nonce; genesis-self refs; replay judge (3bf7e5aa) |
| `packages/derive/src/judge.ts` | `7bafa496e7f0` | `f1f34a923034` | entry body by genesis; replay judge (3bf7e5aa) |
| `packages/mcp/src/act-result.ts` | `be9a341b24ee` | `1af469f7a77c` | ref shape (schema) | |
| `packages/mcp/src/hosted.ts` | `0d49c3519ec2` | `93456b882e04` | isSequenceRef membership; retired-store stop |
| `packages/mcp/src/index.ts` | `57b6af93a246` | `4b7c10621b87` | export hosted-store-stop | |
| `packages/mcp/src/input-schema.ts` | `c86a7a0bd03d` | `592587b6ecfa` | ref shape (schema) | |
| `packages/mcp/src/inventory.ts` | `a567a96acf07` | `9f5492ea706e` | ref shape | |
| `packages/platform/src/evidence-incident-origin-v17.ts` | `bbafa17fca7c` | `6d6e6af68976` | source copies with sequences; genesisInputDigest |
| `packages/platform/src/evidence.ts` | `e3f0fa91c32d` | `77da4fdc1cf2` | ref shape; drop kind checks | |
| `packages/platform/src/own-agent-cohort-data.ts` | `5e018d8d4fa1` | `71f7fb488af0` | kind from sourceKind | |
| `packages/platform/src/reservation-v17.ts` | `e00aa0f08f9b` | `ab6816b23c9e` | drop ref kind checks | |
| `packages/scope/src/applications/act-admission.ts` | `adb58ae723ac` | `bd0aba219f02` | birth under checked sequence; creator via source (B6/B7) |
| `packages/scope/src/applications/projection-source.ts` | `800626b52a79` | `4045ccd66ccc` | retired-room stop; drop kind check |
| `packages/scope/src/applications/projection.ts` | `8576f78bb688` | `c2a55ac89621` | refusal wrong-incarnation -> wrong-genesis | |
| `packages/scope/src/applications/route.ts` | `be263fc237b3` | `1b36c95f39b8` | retired-room stop |
| `packages/scope/src/archive-build.ts` | `b20a6d3c3572` | `bf1c79debbe0` | public copies by checked sequence kind; replay context |
| `packages/scope/src/archive-driver.ts` | `7007cc64415a` | `a8115888e3f2` | SequenceRef; replay context (B1/B2) | |
| `packages/scope/src/archive-host-item.ts` | `066484f4ec1f` | `b5e7e6554261` | kind from folded scope; creator via source |
| `packages/scope/src/archive-operator.ts` | `422376afb07d` | `28890e3e3034` | ref shape; row kind field | |
| `packages/scope/src/archive-outcome-values.ts` | `f31f598d3163` | `d142fa0fb776` | ref shape (SQL) | |
| `packages/scope/src/archive-publication.ts` | `d8c39d220bc7` | `6c13c9f864b5` | replay roots need checked sequences |
| `packages/scope/src/archive-restart.ts` | `1ef6109fa2fc` | `bb8ff18338ff` | ref shape | |
| `packages/scope/src/archive-row.ts` | `02f01270071d` | `5def61284f02` | SequenceRef; ref shape | |
| `packages/scope/src/archive-source-window.ts` | `4db3f5885e75` | `300e4a3f51f2` | ref shape (SQL); pin filter |
| `packages/scope/src/archive-target.ts` | `e64f4fd91068` | `0b96dfe16e0d` | dependency plan from checked sequences; retired-room stop |
| `packages/scope/src/artifacts-wiring.ts` | `c056b6f4a2f2` | `addcb51aef7f` | kind from folded scope | |
| `packages/scope/src/authority.ts` | `b396cf4e526f` | `8072e369fa87` | kind from folded scope; observedOf; pending refs |
| `packages/scope/src/creation-declaration.ts` | `dabb9a1b4050` | `0aca81538bf8` | kind from folded scope |
| `packages/scope/src/creation-lineage.ts` | `05c6dfe2ee8f` | `12f2ab7d81f2` | lineage births admitted by sequence; retired-room stop |
| `packages/scope/src/credential-store.ts` | `e1dacade2330` | `cfe657393ded` | entry body check under current scope | |
| `packages/scope/src/demo-creation.ts` | `15e2638cfdc1` | `5a714af20132` | ref shape | |
| `packages/scope/src/destination-host.ts` | `290e90f6432b` | `79aaf545b733` | own entries under local sequence; ObservedScope key reads |
| `packages/scope/src/health.ts` | `1fc701231daa` | `fab90430e09a` | retired-room stop |
| `packages/scope/src/host-wiring.ts` | `1fd252906b38` | `6cbde3017c21` | creator via source; kind from folded scope |
| `packages/scope/src/namespace.ts` | `e15f6bc3794c` | `d69ee16321e6` | source reads admitted by genesis; retired-room stop; wrong-genesis |
| `packages/scope/src/native-birth.ts` | `ab9ecd331850` | `f8b131dd7da7` | admitSequenceGenesis; debit before admission |
| `packages/scope/src/oauth-routes.ts` | `2696e4f28843` | `941be3f30ad7` | retired-store stop |
| `packages/scope/src/originals.ts` | `c8a5185ad8a5` | `f6091ac370a3` | genesis column for inc |
| `packages/scope/src/publication-policy.ts` | `e2594477a011` | `36748c6b762b` | observedOf recorded ref | |
| `packages/scope/src/read-token-quota.ts` | `5e2ad59fab74` | `54020db49341` | own scope for sealed entry | |
| `packages/scope/src/read-wait.ts` | `0bf31ae0c529` | `d1f3f58f089f` | refusal wrong-genesis | |
| `packages/scope/src/reads.ts` | `1fbb2ae6de25` | `27fb18acf08a` | birth readable (ae48dd39); sourceKind |
| `packages/scope/src/scope-index-census.ts` | `1892fba9c476` | `f405bfcf12db` | known_scope genesis,kind; admitSequenceGenesis |
| `packages/scope/src/scope-index.ts` | `69c37e61623d` | `030ff3f211ac` | index v2 rows {at, kind}; retired-room stop |
| `packages/scope/src/session-preparation.ts` | `73d24f725ed5` | `49b091ff2910` | observedOf recorded membership |
| `packages/scope/src/sessions.ts` | `bb65eb7c3670` | `d701c671e110` | observedOf; kind from folded scope |
| `packages/scope/src/signed-reads.ts` | `3204207ea73d` | `3beb23ca30b3` | root walk carries scope; genesisInputDigest |
| `packages/scope/src/site/host.ts` | `7c5352e51ef3` | `7ba177e4cf69` | admitSequenceGenesis for Directory; retired-room stop |
| `packages/scope/src/site/route.ts` | `f4bbcdd1f532` | `a0dd2fc19f24` | retired-room stop |
| `packages/scope/src/stage-snapshot.ts` | `1c4a9890a6e3` | `6f6538d1da1d` | sources checked against their sequence |
| `packages/scope/src/turn.ts` | `480fd9b6ace0` | `7edfc6d15a8b` | seal admits own genesis; births retained (a4a587c9); bounded source reads |
| `packages/scope/src/workspace-host.ts` | `537ed96759a3` | `2d2040debfd2` | entry body check; ref shape | |
| `packages/scope/src/workspace-lineage.ts` | `dbb0409a8ab6` | `1813da1335de` | lineage under checked sequences; the Directory field resolves its genesis-self form (B23) |

## Named-owner seals

| Owner | Old | New | Change in the file |
|---|---|---|---|
| `packages/scope/src/object.ts:$module` | `f927397e3c4a` | `6316c9c49d33` | room format 2; retired-room stop; source reads bounded; symbol hooks |
| `packages/scope/src/object.ts:ScopeObject` | `519d4bbbe3a2` | `5cac901a7ab4` | room format 2; retired-room stop; source reads bounded; symbol hooks |
| `packages/scope/src/object-archive.ts:floorOffer` | `d090ac7253f7` | `439eeffe0d22` | Own needs the local sequence |
| `packages/scope/src/worker.ts:$module` | `cb9087e87840` | `9eb628cccc57` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:ScopeIndex` | `b958e6997f55` | `05a72edf2156` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:RETIRED_HTTP` | new | `5445b5b53d5b` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:ROOM_RPC_METHODS` | new | `f3d87e46eba6` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:retiredRoomAnswer` | new | `8fe669ecc7f0` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:api` | `87713d2ffe8f` | `1a91c1253cbf` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:roomApi` | new | `42bb380c60e0` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:READ_STATUS` | `8fcae0513564` | `d8b56891bb88` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:PROJECTION_STATUS` | `437dc39bac44` | `a4e03bbeb2ea` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:route` | `97d61bda3cbf` | `631ced1082ec` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:routedRequest` | `0f31c1f1c059` | `73baacbcfcce` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:outsideOf` | `085314050330` | `81fd747eaf5d` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:sessionWiring` | `cb8f4d0e2b06` | `efbb51a65f5a` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:snapshotReaderOf` | `dac91fd4e800` | `24485585bf55` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker.ts:DeployedScope` | `660756384c04` | `f1b5027752d8` | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/worker-mcp.ts:$module` | `ce4f069fd674` | `e0e50567d6e9` | registry named by full Membership; retired-store stops answer 503 |
| `packages/scope/src/worker-mcp.ts:mcpRoute` | `0a3bd1e1d904` | `d78965e7b5b9` | registry named by full Membership; retired-store stops answer 503 |
| `packages/scope/src/worker-mcp.ts:membershipControl` | new | `867e9def1d3f` | registry named by full Membership; retired-store stops answer 503 |
| `packages/scope/src/worker-mcp.ts:observeThrough` | `7e507f9bd923` | `99d333760ec3` | registry named by full Membership; retired-store stops answer 503 |
| `packages/scope/src/worker-mcp.ts:roleStandingThrough` | `669398e6a2af` | `515916248af7` | registry named by full Membership; retired-store stops answer 503 |
| `packages/scope/src/worker-mcp.ts:McpRegistry` | `507515251776` | `0acad6fae812` | registry named by full Membership; retired-store stops answer 503 |
| `packages/scope/src/worker-mcp.ts:McpAgent` | `2e25a7729f08` | `2b8949faa988` | registry named by full Membership; retired-store stops answer 503 |
| `packages/cli/src/command-install.ts:install` | `0459a25a99cd` | `22c4db3fd2f8` | config v2; founding receipt checks genesis |
| `packages/cli/src/command-install.ts:cohortPlan` | `c143bd7773ca` | `892bf505fd5d` | config v2; founding receipt checks genesis |
| `packages/cli/src/command-install.ts:planInstall` | `614a251f08f9` | `987c4910430e` | config v2; founding receipt checks genesis |
| `packages/cli/src/command-install.ts:executePlannedInstall` | `2d3ba2a6ced0` | `dfcce34c8c8b` | config v2; founding receipt checks genesis |
| `packages/cli/src/command-membership.ts:$module` | `02ddb501239e` | `20074581249d` | config v2; entry body admitted by isEntryBodyOf |
| `packages/cli/src/command-membership.ts:join` | `010369bee04f` | `9ce6dba25ee5` | config v2; entry body admitted by isEntryBodyOf |
| `packages/cli/src/command-scope.ts:$module` | `45a4a2e30983` | `c5d62d2a95b3` | register test reads the definition |
| `packages/cli/src/command-scope.ts:act` | `d6e5b20c300d` | `9dba33bc8a44` | register test reads the definition |
| `packages/cli/src/command-scope.ts:entryLine` | `61bf6dce3240` | `b33d37dabac5` | register test reads the definition |
| `packages/cli/src/command-verify.ts:$module` | `ebda9dc52241` | `08579a0e3076` | genesis in place of kind |
| `packages/cli/src/command-verify.ts:sessionDeniedDependency` | `72ee1a12a971` | `8d700dc0b3ba` | genesis in place of kind |
| `packages/cli/src/command-verify.ts:replaySource` | `e2b4cc945442` | `efa791c6df8f` | genesis in place of kind; register scan compares only a configured register (B17) |
| `packages/cli/src/command-verify.ts:sharedProofLines` | `e549a716ca1e` | `34b301124799` | genesis in place of kind |
| `packages/cli/src/command-repository.ts:destinationStateOf` | `941a3b984ed8` | `a0daccc378fc` | destination test reads the definition |
| `packages/mcp/src/service.ts:$module` | `70866d46d425` | `cbd7d615614d` | store-retired refusal; {scope, genesis} refs; kind checks rest on definitions |
| `packages/mcp/src/service.ts:scopeRefArg` | `b1d77904c4c3` | `54eb8fcb90bd` | store-retired refusal; {scope, genesis} refs; kind checks rest on definitions |
| `packages/mcp/src/service.ts:McpService` | `3a997768dc1d` | `9bf30f83a4e5` | store-retired refusal; {scope, genesis} refs; kind checks rest on definitions |
| `packages/scope/src/core.ts:$module` | `75efd9edb075` | `98b4181ddc94` | pin with checked sequence; births; retained uses |
| `packages/scope/src/core.ts:receiptOf` | `eec86b275014` | `882323565d2d` | pin with checked sequence; births; retained uses |
| `packages/scope/src/core.ts:ownOf` | `8a7bfb5faab9` | `c1beba742f13` | pin with checked sequence; births; retained uses |
| `packages/scope/src/core.ts:used` | `277fcdbfc5dc` | `7e576fcca780` | pin with checked sequence; births; retained uses |
| `packages/scope/src/core.ts:bornOf` | new | `672162a527b2` | pin with checked sequence; births; retained uses |
| `packages/scope/src/core.ts:retainedUsesOf` | new | `57dfcff7d57f` | pin with checked sequence; births; retained uses |
| `packages/scope/src/core.ts:genuineRetained` | new | `f64152033e44` | pin with checked sequence; births; retained uses |
| `packages/scope/src/core.ts:retainedOperands` | new | `33c83854ec97` | pin with checked sequence; births; retained uses |
| `packages/scope/src/core.ts:NO_GENESIS_NONCE` | new | `2ce6ab73608a` | pin with checked sequence; births; retained uses |
| `packages/scope/src/core.ts:Scope` | `09f30cd084de` | `4822b619951c` | pin with checked sequence; births; retained uses |
| `packages/scope/src/worker.ts:scopedApi` | `d8a6b3667171` | removed | retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads |
| `packages/scope/src/core.ts:retainedFacts` | `34d29abff776` | removed | pin with checked sequence; births; retained uses |
| `packages/scope/src/core.ts:NO_INCARNATION` | `8cca84634556` | removed | pin with checked sequence; births; retained uses |

## Entry points whose admission or refusal changed

- `apps/room/archive-policy.ts` (trusted release (e4b72290)). The Grow archive policies take the trusted release, publisher and entry as parameters, refuse a packet that names another publisher or entry, and cover every definition the release declares in place of the fixed demo constants (ruling e4b72290).
- `apps/room/archive.ts` (trusted release (e4b72290); replay context; seed kind). The Grow archive admits by seed kind, checks a Directory row's register and membership as SequenceRefs, carries the replay context, and stops foreign-source-mismatch when the directory Rules genesis is not a rules sequence.
- `apps/room/demo-creation.ts` (ref shape {scope,genesis}; retired-room stop). The register offer route takes `register` and `genesis` query keys in place of `inc`, and answers a retired room with the room-retired response.
- `apps/room/page/src/oauth-context.ts` (store key dap-page-settings-2; ref shape). The consent page reads settings only under the new key and no longer requires the membership ref to say kind membership.
- `apps/room/worker.grow.ts` (trusted release; symbol hooks). The Grow Worker passes its trusted release to the archive configuration, policies and driver, and overrides wiring through the scopeWiring symbol.
- `examples/grow/simulator-host.ts` (ref shape; entry body check). The simulator admits a room ref without a kind and checks the room's genesis by isEntryBodyOf and seed kind lane.
- `packages/bytes/src/records.ts` (entry and ref shapes: genesis entry, sequence entry, FactUse kind, delivery sourceKind). isScopeRef accepts only {scope, genesis}; a genesis entry has no `at` and may hold encoded self refs; a later entry names its genesis; deliveries and uses carry the source kind.
- `packages/checkers/src/stage-origin.ts` (facts matched by isAt; genesis by hash). The stage-origin checker matches each sealed source to exactly one fact by isAt and hash, and requires the destination genesis seed kind destination.
- `packages/cli/src/claim.ts` (sibling seeds from directory genesis). The claim validates saved repository refs by reading the Directory's genesis, checking its hash and seed, and deriving sibling scope IDs from that genesis input with a scope-only creator.
- `packages/cli/src/command-install.ts` (config v2; founding receipt checks genesis). The operator configuration writes version 2. A founding receipt counts only when it names the planned register at entry 0 and its hash equals the register's genesis, in place of the register kind test.
- `packages/cli/src/command-membership.ts` (config v2; entry body admitted by isEntryBodyOf). The join path writes configuration version 2 and admits a fetched entry only when isEntryBodyOf matches it to the expected fact and the hash agrees.
- `packages/cli/src/command-repository.ts` (destination test reads the definition). A destination counts when its definition is the known platform:destination; the reference kind test goes.
- `packages/cli/src/command-scope.ts` (register test reads the definition). The full-register answer applies when the room's platform definition names platform:register, in place of the reference kind. Delivery lines name the source kind that the input carries.
- `packages/cli/src/command-verify.ts` (genesis in place of kind). A denied dependency counts only at entry 0 with a hash equal to its genesis. The register create-result scan reads the configured register by its full reference when the home holds one, and the named scope's pages when it holds none. It keeps only a Directory genesis's applied result for a create that the page's own scope sent, and admits each entry with isEntryBodyOf. Proof lines print genesis in place of incarnation.
- `packages/cli/src/files.ts` (home format v2; RetiredHomeError). A v1 home now raises RetiredHomeError, and a v2 config must pass an exact shape check before any command reads it.
- `packages/cli/src/invitations.ts` (ref shape; inbox genesis check; v2). The invitation inbox check compares the birth hash with the summary's genesis and the seed's scope ID, not inc.
- `packages/cli/src/scope-index-manifest.ts` (manifest rows {at, kind}; creator via source). The manifest verifier reads rows of {at, kind}, binds a genesis by seed and hash, resolves genesis-self creators through the source fact, and reports a genesis-kind mismatch.
- `packages/cli/src/verification.ts` (entry framed by genesis). The verifier frames a genesis by its seed's scope ID and its own hash, and a later entry by the genesis it names.
- `packages/client/src/session.ts` (ref shape). The session reply check compares scope and genesis; it no longer compares kind.
- `packages/derive/src/genesis.ts` (genesis nonce; genesis-self refs; replay judge (3bf7e5aa)). The genesis judge requires a 16-byte nonce, resolves a genesis-self creator through the source fact, checks the source copy against its sequence, takes the cause from genesisInputDigest, and adds judgeGenesisForReplay.
- `packages/derive/src/judge.ts` (entry body by genesis; replay judge (3bf7e5aa)). The judge reads facts through verified judgment facts, adds judgeActForReplay with separate caller assumptions, and builds a later entry with `genesis` in place of `at`; a later entry refuses an encoded genesis self.
- `packages/mcp/src/hosted.ts` (isSequenceRef membership; retired-store stop). Control requests and agent identities require a full membership SequenceRef in place of a kind check, and a retired store answers 503 unavailable.
- `packages/mcp/src/service.ts` (store-retired refusal; {scope, genesis} refs; kind checks rest on definitions). `scopeRefArg` accepts {scope, genesis} and drops inc and kind. A call on a retired or malformed custody store answers the named StoreFormatError refusal (store-retired) before it reads a record or calls the network. The Commons read and the empty-destination check admit a target by its definition's version answer alone; the room's own definition question already decided the kind. The installation row check keeps every reference and digest comparison and drops only the lane-kind test. The text tool adds the birth kind, which reads the first entry of a sequence.
- `packages/platform/src/evidence-incident-origin-v17.ts` (source copies with sequences; genesisInputDigest). The incident-origin proof checks each copy against its own sequence and reads kinds from sequences and source kinds in place of ref kinds.
- `packages/scope/src/applications/act-admission.ts` (birth under checked sequence; creator via source (B6/B7)). Act admission checks each birth under its own checked sequence and resolves a genesis-self creator through the birth's source before the sibling and ancestor checks.
- `packages/scope/src/applications/projection-source.ts` (retired-room stop; drop kind check). A retired Directory or Rules peer now ends the projection read with the retired stop instead of null.
- `packages/scope/src/applications/route.ts` (retired-room stop). The application room and installation routes answer a retired room with the room-retired response.
- `packages/scope/src/archive-build.ts` (public copies by checked sequence kind; replay context). The archive build classifies a copied source as public by its checked sequence kind, stops when a supplied sequence disagrees, and refuses publish without a replay context.
- `packages/scope/src/archive-host-item.ts` (kind from folded scope; creator via source). The archive host-item admission checks the Destination's source kind and resolved creator instead of ref kinds; it no longer refuses archiving refs by kind.
- `packages/scope/src/archive-publication.ts` (replay roots need checked sequences). Published replay roots must each match an already checked sequence that is not register, membership or inbox; only the Directory's unread Rules slot may stand without one.
- `packages/scope/src/archive-source-window.ts` (ref shape (SQL); pin filter). The source-pin query now admits observation refs except rules subjects, since refs carry no kind.
- `packages/scope/src/archive-target.ts` (dependency plan from checked sequences; retired-room stop). Archive discovery admits each birth through readNativeBirth, selects scopes by checked sequence kind, resolves creators through sources, returns a replay context, and maps a retired-room stop to unavailable.
- `packages/scope/src/authority.ts` (kind from folded scope; observedOf; pending refs). Repository session birth reads the scope's own kind and resolves the creator through the genesis source; the membership read path selects by the genesis seed kind.
- `packages/scope/src/core.ts` (pin with checked sequence; births; retained uses). The scope resolves its pin only after admitSequenceGenesis admits its own genesis against its name and hash, and refuses a pin whose stored state names another sequence. Receipts take the full reference and the resolved effects. A retained foreign use enters judgment only as a genuine classified use. Submit and creation answer unavailable source-response-too-large for an oversized source.
- `packages/scope/src/creation-declaration.ts` (kind from folded scope). The declaration read checks the scope's own folded kind directory instead of the ref's kind.
- `packages/scope/src/creation-lineage.ts` (lineage births admitted by sequence; retired-room stop). Creation lineage admits each birth and proof under its checked sequence, charges bytes before admission, resolves genesis-self creators, and ends on a retired-room stop.
- `packages/scope/src/destination-host.ts` (own entries under local sequence; ObservedScope key reads). Destination checks match own sealed entries under the local sequence association and read key standing by an observed membership scope.
- `packages/scope/src/health.ts` (retired-room stop). Health answers unavailable for a retired room.
- `packages/scope/src/host-wiring.ts` (creator via source; kind from folded scope). The Destination binding check resolves the genesis creator through its source and requires source kind directory; a claim fact names a register scope by ID only.
- `packages/scope/src/namespace.ts` (source reads admitted by genesis; retired-room stop; wrong-genesis). A source read now carries the sequence's genesis bytes, admits them with admitSequenceGenesis before it accepts an entry, bounds every returned string, reports too-large, and treats a retired peer as unavailable; routing compares genesis and answers wrong-genesis.
- `packages/scope/src/native-birth.ts` (admitSequenceGenesis; debit before admission). readNativeBirth copies and bounds the reply, debits its bytes, admits the genesis bytes against the full reference with admitSequenceGenesis, and returns the entry and checked sequence.
- `packages/scope/src/oauth-routes.ts` (retired-store stop). Each OAuth route answers a retired store with 503 temporarily_unavailable.
- `packages/scope/src/object-archive.ts` (Own needs the local sequence). The floor offer runs only when the scope holds its local sequence.
- `packages/scope/src/object.ts` (room format 2; retired-room stop; source reads bounded; symbol hooks). The constructor classifies the room storage: a retired room builds nothing and every public method (submit, create, prepare, settle, deliver, source, reads, retained, checkpoint, observed, registerKnown) answers ROOM_RETIRED_STOP, and fresh storage writes format 2 in the same transaction. `source` takes a byte and time allowance and admits every copy under its sequence. `registerKnown` admits the own genesis with admitSequenceGenesis and registers {at, kind}. jobState and workSourceState compare the full reference. The wiring, metric, genesis-eligibility and session-eligibility hooks become symbol-keyed protected methods, and both eligibility hooks throw for a retired room.
- `packages/scope/src/originals.ts` (genesis column for inc). Original copies key by the membership's genesis hash in place of its incarnation.
- `packages/scope/src/reads.ts` (birth readable (ae48dd39); sourceKind). A reader may read a birth row when one of its entries uses a later entry of that sequence (ruling ae48dd39).
- `packages/scope/src/scope-index-census.ts` (known_scope genesis,kind; admitSequenceGenesis). The census admits a register by admitSequenceGenesis on its genesis bytes and refuses forbidden when that fails, and answers rows of {at, kind}.
- `packages/scope/src/scope-index.ts` (index v2 rows {at, kind}; retired-room stop). The scope index (renamed applied-genesis-v2) stores genesis and kind, checks registration shape exactly, and passes a retired-room stop through.
- `packages/scope/src/session-preparation.ts` (observedOf recorded membership). Session preparation compares the claimed membership with the recorded one through observedOf.
- `packages/scope/src/sessions.ts` (observedOf; kind from folded scope). Session admission compares memberships with same/observedOf and reads the scope's own folded kind.
- `packages/scope/src/signed-reads.ts` (root walk carries scope; genesisInputDigest). The signed-read root walk carries each entry's scope beside it and checks a seed's cause by genesisInputDigest.
- `packages/scope/src/site/host.ts` (admitSequenceGenesis for Directory; retired-room stop). Site reads admit the Directory by admitSequenceGenesis of kind directory and throw SiteRoomRetired for a retired room.
- `packages/scope/src/site/route.ts` (retired-room stop). Site routes answer a retired room with the room-retired response.
- `packages/scope/src/stage-snapshot.ts` (sources checked against their sequence). The stage snapshot checks each source and job entry against its own sequence, since an entry no longer names its scope.
- `packages/scope/src/turn.ts` (seal admits own genesis; births retained (a4a587c9); bounded source reads). Sealing admits a new genesis by admitSequenceGenesis before it resolves the pin, retains births, and unwinds as unfit or unavailable on PinUnavailable; fact fetches share one deadline and byte bound and report a too-large source.
- `packages/scope/src/worker-mcp.ts` (registry named by full Membership; retired-store stops answer 503). Each hosted registry now takes its name from hostedRegistryName(membership), the full Membership reference, and a registry object answers only for the Membership whose name selects its own id. Only the fixed OAuth-client registry admits control, context, client registration, retention and resolution; any other registry returns RETIRED_STORE_STOP, and the route answers 503 unavailable or temporarily_unavailable. `membershipControl` turns a retired-store stop thrown during a membership read into a 503 answer, so a transport stop never reads as an inactive key or a refused authority. A retired room on registerKnown answers the room-retired response.
- `packages/scope/src/worker.ts` (retired-room answers at the RPC proxy; index owner fixed by name; bounded peer source reads). The scope index object serves helper and store work only when its own id equals the fixed SCOPE_INDEX_NAME id, and answers unavailable otherwise. `roomApi` replaces `scopedApi`: it proxies every named room RPC method, and a ROOM_RETIRED_STOP reply becomes the method's retired answer (unavailable for writes, null for snapshots, sessions-unavailable for session methods, a thrown error for release). The HTTP route throws RETIRED_HTTP for a retired room and answers with the room-retired response. Peer source reads in the snapshot reader take the caller's byte and time allowance and admit the entry with admitSourced before use. Membership key reads address the membership by its full reference. The refusal name wrong-incarnation becomes wrong-genesis with the same 409 status.
- `packages/scope/src/workspace-lineage.ts` (lineage under checked sequences). Workspace lineage checks the lane, Directory and Register births and their sends under each sequence's checked association and reads kinds from sequences and source kinds.

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
| repo-in-ai example and tests | fixture shape | References are `{ scope, genesis }`, and home configs are version 2. An entry binds to its sequence by genesis (`isEntryBodyOf`, `sentByBody`), and a genesis binds by its seed and hash. The example drops its register kind checks, because the place fixes the kind. Fixture refs that differed only by kind now differ by genesis. `hosted-loop.test.ts` reads the example input, and with the new register the suite passes, 243/243. The gate runs that suite: the Plain project `repo-in-ai` in `vitest.projects.mjs` includes `examples/repo-in-ai/test/*.test.ts` (builder act e1844d08, ruling 7bf2c93b). |
| `archive-driver` resume, sha1 and sha256 | fixture shape | The Directory takes deliveries from the Rules and Destination geneses. Under 5a642337 and 066e49b3 neither kind may be an anchor, so the test also serves the Rules and Destination journals, and Replay proves those facts by replay. The anchors include the Membership facts of all three journals. The test compares the reported anchors as a set, because Replay reports them in the order of use. The fixture is `archiveAuthorityReplay`, which B10 shares. |
| `mcp` `wire` and `lost-reply`, `cli` `install-without-mcp` | fixture shape | The test home config is version 2. A version 1 home now raises `RetiredHomeError`. |
| `mcp` `reads` | fixture shape | The case that varied the Membership reference's `kind` goes: a reference has no `kind`, and the genesis and scope cases still vary the reference. |
| `mcp` `store-format` | merge | Main's failure shape returns `error`, `message` and `next` only, so the test no longer expects a `reason` field. |
| `client` and `mcp` custody golden (`custody-record-v1.json.txt`) | regenerated predecessor | The NF-3 capture script ran again at the cutover head `c38bf62a72`, which comes before the move and already writes `{ scope, genesis }` references. The record is 2543 bytes, sha256 `5e417c9c…`. The moved code writes the same bytes. |
| `mcp` `install-words` golden (`install-words-7ea170c9-c38bf62a.json`) | regenerated predecessor | The NF-4 words script ran again at `c38bf62a72`. That head predates main's answer words (`phase: "accepted"`, `outboxIds`, `effects`), so the golden keeps the words from main `7ea170c9` and takes only the scope references and fact hashes from `c38bf62a72`. Every other byte matches both runs. |
| `client` `observe`, `application-projection`, `session` | fixture shape | Membership references are `{ scope, genesis }`; the session case that varied the reference's `kind` goes. |
| `client` `handle-log` | fixture shape | Entry 0 is a genesis whose seed names the scope and whose hash is the genesis; later entries name the genesis. |
| `client` `read-minimum` | fixture shape | A receipt that names another genesis reads `wrong-genesis`, as `wrong-incarnation` did. The fixed projection query digest is recomputed for the new reference bytes. |
| `client` `intent` | fixture shape | The malformed entry drops `genesis`, since an entry carries no `at`. |
| `cli` `claim-selector`, `install-cohort`, `store-signer` | fixture shape | A scripted register receipt at entry 0 has `genesis` equal to its hash. |
| `cli` `clone`, `invitations` | fixture shape | References drop `kind`. |
| `cli` `invitation-link` | fixture shape | The `wellFormedInvitation` refusal case uses a malformed reference (an extra `kind`). The link check is a syntax check; join matches the Membership. |
| `cli` `scope-index-command` | fixture shape | A wrong entry reads "wrong entry identity", and the mismatch row reports the altered reference. |
| `cli` `verification`, `verify` | fixture shape | Entries after the genesis start at seq 1 and carry `prev`; the head is seq 3. |
| `cli` `verify` relabel test, "an invented source entry" | expectation | Replay now checks the invented copy against its birth (B18), so the case reads `mismatch`. The planner accepted that stronger verdict in act 0f76cac1. The "source and the request" case reads `mismatch` again, as on main (B20). |
