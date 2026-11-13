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
The last eleven rows come from a second read of the head's admission and
routing files; their line numbers are head lines.

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
  results only from a register's pages. Ruling 190b31f4 (V1) compares the
  page's full reference with the register where the configuration holds one. A
  member's home holds none, and the check then read no results (B17). The scan
  now skips the comparison only when the configuration holds no register. It
  keeps only a result that a Directory genesis delivered for a create that the
  page's own scope sent, and only a register sends that create.

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

## The demo Site pin (rulings 0a5f97ba and dfae40ef)

`demoDefinitions` (`examples/grow/demo-definitions.ts`) points the Site's
`create-room` send at the demo Room. The Site's `receives.room-summary`
handler pinned the maintained Room, so the package check refused the demo
built from source with `wrong-peer`. Under ruling 0a5f97ba, option (a), the
handler now pins the demo Room. Act dfae40ef confirms the digests.

| Definition | Before | After |
|---|---|---|
| demoSite | `sha256:7ca60d1e213b1d16b638e134cffa469e55d05a89a81bf1a5492b2789903527da` | `sha256:833c0702b5e301cf7cee5f4f354f55f747c5f1830a4a7623afdb94205a46bac5` |
| demoRoom | `sha256:3ea5dcacd1c7a57af0e6e28d2678bf9d159d242ae338eb4eae03c2852edd5d41` | unchanged |
| Room | `sha256:2fc33678c6a6cc291685c1c4b35accc8833b9068d9cdb68c7118f389dbb11e85` | unchanged |
| Site | `sha256:a95c1de0e3a9953831aecb35535e8b72891973e7ca8f3c61aedc69b5f0ee695d` | unchanged |

No package could hold the old demoSite `7ca60d1e`, because the package check
refused it. F's identity ledger keeps `7ca60d1e` as recorded history. With
the TEST signer `fixedSigner(254)`, the source-built demo packs with semantic
`sha256:49eddfe2a06f9412ac7ba7551c06e71e1266330cc6e7df094cdd0dd71dae9883` and
presentation `sha256:2a3adecf80d11e4734d1b63fc43121e7e73197ee16c3448782cec15e586ef78c`.

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
| `register` `{ scope: sc_b5q4…, genesis: sha256:0000… }` | `examples/repo-in-ai/input.example.json`, `examples/repo-in-ai/hosted-loop/input.example.json` | No Worker reads it. Under ruling dfae40ef, option (a), the example names the retired register in the new shape, with the all-zero digest as its genesis. The planner's configuration head replaces both registers when it replaces `REGISTER_SCOPE`. |

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

Q2: the production cases in `archive-installed.test.ts` and Room A
(thirty-seven-pass history) build the demo from source. The
`growDemoSource` capture (`test/support/maintained-applications.ts`) prepares
the demo with `prepareGrowDemo` and signs it with `fixedSigner(254)`. Each case
passes `{ release, publisher, entry }` from that packet, with the demo Site's
definition digest as the entry, and reads the replay context from discovery.
Room A stays as a test. All nine cases pass.

## Security seals after the cutover

The cutover changes 78 plain seals and 55 named-owner seals in `scripts/security-entry-points.test.mjs`. Each new value comes from `sourceSeal` or `namedSourceSeals` on the merged head. The tables show the first 12 hex digits of each seal; the test file holds the full values. A file whose change touches admission, authority or a refusal has its own sentence below the tables.

### Plain seals

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
| `packages/scope/src/workspace-lineage.ts` | `dbb0409a8ab6` | `3df9134796ed` | lineage under checked sequences |

### Named-owner seals

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

### Entry points whose admission or refusal changed

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

### Stand-ins in the route model

`scripts/security-entry-points.mjs` loads route source into a model. The model enumerates routes and calls no room, so it needs a value for each new name the routes reference.

- `roomApi`: the model returns its remote stand-in, as it does for `api`. The model reads route shapes, not room answers.
- `RETIRED_HTTP` and `retiredRoomAnswer`: route enumeration reaches no retired room, so the model never throws or calls the retired answer. The stand-ins only satisfy the references.
- `isRetiredStoreStop`: the model passes the real predicate from `packages/mcp/src/hosted-store-stop.ts` to the MCP and OAuth routes. No model reply is a retired-store stop, so every route takes its ordinary branch.
- `hostedRegistryName`: the model names no real Membership. The stand-in returns a fixed witness name that selects no authority.

## Pending rulings

None.

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
| repo-in-ai example and tests | fixture shape | References are `{ scope, genesis }`, and home configs are version 2. An entry binds to its sequence by genesis (`isEntryBodyOf`, `sentByBody`), and a genesis binds by its seed and hash. The example drops its register kind checks, because the place fixes the kind. Fixture refs that differed only by kind now differ by genesis. `hosted-loop.test.ts` reads the example input, and with the new register the suite passes, 243/243. No workflow or gate step runs that suite: it has its own `vitest.config.ts`, no `.github` workflow names repo-in-ai, and `scripts/test.mjs:33-35` runs only the three `.mjs` tests. The planner files a request to put it under a check. |
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
