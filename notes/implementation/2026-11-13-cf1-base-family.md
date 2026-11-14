# The base creation family

CF-1 is plan `69fed843` v2, with the rulings `bccd8dd1` (Q1 to Q5), `68356c6c` (the seven choices), `7505fa96` (point 1), `710a5d76` (the ordinary version 2 package) and `96676b22` (celld, Commons and the archive rows). The head is cut from the cutover review head `9b583eb2`. The reviewed branch includes main `a200cd0a`. Gate attempt 3 ran at source checkpoint `4369fddf`; the later merge changes documents only.

New rooms on every host now use one family, `base`:

| Scope | Pin | Declaration digest |
|---|---|---|
| Register | `platform:register@28` | `sha256:cc5fadbde47db6dc9a833af1a15536d22ecbf33c69faeaf0aa3acc8aa349ce12` |
| Directory | `platform:directory@27` | `sha256:3bcc3fef39c145c2de415debf0d45b4d9873df689aae898209835487f1044a23` |
| Membership | `platform:membership@14` | `sha256:c909fd58a24433568f5cca3db0890de379b8456f403596fa8a8971cba19c1400` |
| Rules | `platform:rules@15` | `sha256:de1f83120e304f4970e3d81504a1c888d512bcf037e66774df4e324cd73eeb0c` |
| Destination | `platform:destination@21` | `sha256:6c6bb1a919e3eeef6d8c486a6fca6b7d8e690090b54f17225944ed8e3c69fe6d` |
| Inbox | `platform:inbox@1` | unchanged |

`packages/platform/src/base-cohort.ts` names the six pins as `BASE_COHORT`. `NEWEST` and `deploymentCreationDefaults()` select it. `dap install` selects `--cohort base` when the command names no cohort, for every host, `none` included. `unpublished` stays an explicit choice. The family pins no Commons.

## Kernel count

Each of the five pins is a new version of an existing platform name. Under `docs/kernel.md` section 7.1 a new version adds one to K1's count, so CF-1 adds five to K1's count (ruling `bccd8dd1`, Q4). CF-1 adds no member to `RefusalReason` and no platform name. The refusal names `not-own-key`, `not-own-member`, `publication-prefix-in-use` and `publication-path-not-declared` are guard and grant names in Native rules.

`packages/derive/src/creation-context.ts` gains the closed version 3 marker under kernel review. Ruling `bccd8dd1` permits the change: the genesis judge reads the marker, so runtime and replay must admit the same genesis. The declared prefixes fix finding R16 (ruling `d92b5f66`), and section 7.1 lets a fix for R1 to R16 go on with no K item.

## What each scope does

**Membership 14** (`base-membership.ts`) is Membership 12 with the own-agent acts of Membership 13, and five changes. An active key retires itself or marks itself compromised through `revoke-key`. Another key refuses `not-own-key`. A new act, `leave`, removes the member of the signing key, of any kind. Another member refuses `not-own-member`. An active person who holds `membership.own-agent` removes an agent that they control. An active person may also revoke a key of an agent they control without holding that action. `last-admin-kept` skips its check only when the recovery key signed the act (`signedByRecovery` in `membership.ts`). A null grant no longer skips it. An own agent holds at most four invited or active keys (`OWN_AGENT_KEYS`).

**Rules 15** (`base-rules.ts`) is the archive device Rules with an optional `owner`. It admits four capability sets: none, `publication-paths@1`, `device-command@1`, and both (`applicationCapabilities` in `publication-paths.ts`). An ordinary package names no owner. A device package names an active owner, as under Rules 10. The installation genesis keeps the prefixes, and the creation request carries them. Reference fields stay refused, by the name check in `requireReferenceInstall`.

**Directory 27** (`base-directory.ts`) is Directory 26 with optional `deviceGrant` and `publication` fields on `application-create`. A prefix that overlaps a prefix of a creating or created application refuses `publication-prefix-in-use`. A refused or conflicting creation releases its claim. The root's marker is `{ v: 1 }`, `{ v: 2, deviceCommand, delegate }`, `{ v: 3, publication }` or `{ v: 3, delegate, deviceCommand, publication }`. In the same entry, the Directory tells its Destination the application's scope ID and prefixes, or an empty list. Directory 20 and its successors read `has-repository` from the item whose ID equals the new entry's seq, so `bind-archive` always refuses `no-repository` there. Directory 27 reads the act's own repository item, and a hosted base room binds its archive.

**Destination 21** (`base-destination.ts`) is Destination 20 with the fixed one-hour read token of Destination 19. It keeps one `application-paths` row for each application. `publish-file` refuses a path outside the sender's prefixes as `publication-path-not-declared`, and holds while no row has arrived. `baseApplicationPublicationOrigin` proves that the root's marker carries exactly the requested grant and prefixes. The host function `publicationRefusal` checks every touched path and link target against the prefixes after the reserved-path check, before the push. One version question, `scopePublicationPrefixesDestination`, selects that host check.

**Register 28** (`base-register.ts`) composes the host choice of Register 21, `founder-not-recovery` of Register 24, and the failed claim of Register 26. Its claims prove Directory 27.

## Version question choices

Each new pin answers each question by an explicit choice. The frozen fixture `version-questions-86179b0c.json` is unchanged. `CUTOVER_FAMILY_ANSWERS` in `packages/platform/test/version-questions.test.ts` lists every yes. These pins answer no to every other question.

- Destination 21: `authoritySessionBirthUnpublishedBranch`, `checkerReservationOriginDestination`, `cliFixedReadTokenLifetimeDestination`, `cliManifestListDestination`, `cliOneFileDestination`, `cliScopeIndexDefaultCoveragePin`, `cliScopeIndexSupportedLineagePin`, `cliStatusUnpublishedDestination`, `cliUnpublishedDestination`, `mcpReadTokenFixedHourDestination`, `mcpVerifyEmptyDestination`, `nativeFilePublication`, `nativeStagedPublication`, `nativeTimedOperationOpen`, `pageRetainedManifestListDestination`, `pageRetainedOneFileDestination`, `scopeArchiveHostDestination`, `scopeCredentialUnpublishedBranch`, `scopeDeliveryNativeApplicationOrigin`, `scopeDeliveryUnpublishedBranch`, `scopeOperationNativeApplicationOrigin`, `scopePublicationPrefixesDestination`, `scopeReadTokenFixedHourDestination`, `scopeSessionPreparationOwnScope`, `scopeSessionPreparationUnpublishedPage`.
- Directory 27: `cliScopeIndexDefaultCoveragePin`, `cliScopeIndexSupportedLineagePin`, `pageUnpublishedDirectory`, `scopeApplicationAnnouncementDirectory`, `scopeArchiveHostDirectory`, `scopeCreationDeclarationDirectory`, `scopeSiteRepositoryOptionalDirectory`.
- Membership 14: `applicationProjectionMembership`, `applicationScreenMembership`, `archiveMembershipForeignCopy`, `cliOwnAgentInvitationMembership`, `cliScopeIndexDefaultCoveragePin`, `cliScopeIndexSupportedLineagePin`, `clientAgentKeyInvitationMembership`, `clientCheckerKeyInvitationMembership`, `clientInvitationSignatureCredential`, `clientPersonInvitationMembership`, `scopeInvitationProofMembership`, `scopeOwnStandingMembership`, `scopeSessionMembership`, `viewsEvidenceMembership`.
- Register 28: `archiveRegisterForeignCopy`, `cliFailedClaimRegister`, `cliImplicitSelectedPlanRegister`, `cliNewInstallRegister`, `cliNoHostInstallRegister`, `cliOpenPolicyExplicitRegister`, `cliRetainedInstallRegister`, `cliRetainedUnpublishedSelectionRegister`, `cliScopeIndexDefaultCoveragePin`, `cliScopeIndexSupportedLineagePin`, `clientCreationOfferRegister`, `clientSettlementClaimProjectionRegister`, `pageRetainedCreationRegister`, `scopeDemoCreationRegister`, `scopeHostNoneCreationRegister`, `scopeSettlementClaimRegister`.
- Rules 15: `applicationOutsideWorkerRules`, `cliApplicationInstallationRules`, `cliScopeIndexDefaultCoveragePin`, `cliScopeIndexSupportedLineagePin`, `mcpDeviceInstallOptionsRules`, `mcpOwnerFieldRules`, `mcpSemanticInstallRoomRules`, `pageInitializationRules`, `pageReviewPolicyRules`, `scopeApplicationOutsideRules`.

The deliberate no answers:

- `celldPreparedNoHostRegister`, `celldPreparedBindingPolicyRegister` and `celldSmokeOwnedPlanRegister`: celld stays on Register 21 and Register 25.
- `cliRetainedBindingFounderRegister`, `cliRetainedUnpublishedNamespaceRegister` and `cliLegacyOpenPolicyRegister`: these answer for retained plans of older registers.
- `mcpSemanticInstallSignatureRules`, `pageInitialOwnerMayReviewRules` and `pageCertifiedRulesReadOnly`: these answer for older Rules lines.

## Paths that still create rooms on a present family

`PLATFORM_CREATION_PINS` holds more than one family, so the grow, lending, demo and connect Workers admit the base family beside their present family. Commons keeps its file. `readPlatformCreationPolicy` unions every setting with `deploymentCreationDefaults()`, so the Commons Worker also admits the base family (ruling `96676b22`, point 2). A test in `packages/cli/test/demo-config.test.ts` reads `wrangler.commons.jsonc` and checks that its policy admits each base pin and each Commons pin, and that its demo start still names Register 23. These paths still create rooms on a present family:

- A register that already exists. A claim creates its Directory from `DIRECTORY_OF` of the register's own pin. A deployment's existing Register 26, 27 or 23 creates rooms of its family until the deployment founds a Register 28.
- `dap install --cohort <family>` with any present family that `CREATION_INSTALL_COHORTS` lists, and `dap install --planned` with a retained plan.
- celld (ruling `96676b22`, point 1). celld keeps its present families, and a later request moves it to base. `apps/room/celld/mac/prepare-project.mjs` admits only Register 21 and Register 25, and its `cohort` refusal tells the operator to plan with `--host none` and `--cohort unpublished` or `--cohort repository-binding`. `scripts/celld-smoke.mjs` plans its first room with `--host none --cohort unpublished`. `apps/room/celld/mac/repository-binding-policy.json` pins the repository-binding family. `docs/self-host-mac.md` plans `--cohort repository-binding` and names each base-family change that a celld room lacks.
- The demo start offer. `DEMO_START_CONFIG` names its register definition, and `scopeDemoCreationRegister` admits Register 17, 26 and 28.
- The Commons Worker's own Commons cohort, Register 23.

## Archive

`ARCHIVE_NATIVE_DATA` in `packages/git/src/archive-policy.ts` gains rows for Directory 27, Destination 21 and Rules 15, and value-place rows for Rules 15 and Destination 21 (ruling `96676b22`, point 3). Destination 21 keeps the `certify-rules-tree` act of Destination 14, so it also has that act's three value places. Directory 20 and its successors read `has-repository` from the item whose ID equals the new entry's seq, so a room of the unpublished, repository-binding or own-agent family refuses `bind-archive` with `no-repository`. CF-1 changes no historical pin, and a celld room has no archive until celld runs the base family (ruling `9658ed88`). The test "bind-archive reads the room's own repository item" in `packages/platform/test/base-family.test.ts` witnesses both answers. The default family includes the archive binding, so the `Grow base` case of `packages/scope/test/archive-installed.test.ts` exports and replays a base room.

## Native witnesses

- `packages/scope/test/base-ordinary-install.test.ts` installs an ordinary Counter package through MCP `install_application`, checks the version 3 marker and the Destination row, refuses a second claim of the prefix, and replays Rules, Directory, Destination, Membership and the root.
- The same file installs `apps/counter`, packed by `prepareApplicationDirectory` (the function behind `dap pack`), in a new base room. The root gets the version 1 marker, takes one `participate` act, and replays consistent with Rules, Directory, Destination and Membership.
- `packages/scope/test/application-publication.test.ts` runs its device publication case on the base family, with the prefix `device/`.
- `packages/scope/test/creation-versions.test.ts` checks the default policy with the base pins first.

## Decisions after the source checkpoint

TM-1 is the separate commit `51e88288e8`, carried from `e5ea09e2`. Planner ruling `67cafb4d` accepts list `59ea2b72` and three individual deadlines: residency 162 s, one thousand births `scaleDeadline(990000)`, and G15 capture 275 s. Shared timeouts and retry counts stay unchanged. The residency case needs 33 dense native births to fill 32 retained frames above 4 MiB, keep one physical read in flight, and reject the 33rd without more I/O. The thousand-birth case proves that a full Root funds all 1,000 native birth/seal handoffs across restarts and returns the final exhaustion refusal without creating child 1,001. A shorter successful sequence could retain the generic handoff invariant alongside the existing reservation and exhaustion witnesses, but would give up this exact production-cap claim. Any cut belongs to a separate request (`20d687fb`).

Commit `3b3eb286` adopts twelve maintained parser seals: catalog vocabulary, version questions, version relations, scope demo creation, destination host, publication policy, client application install, CLI line, and command install's module, creation cohorts, selected register, and install selection.

NF-7 ruling `bc826726` moves the Counter browser witness to NF-5 after CF-1 lands. CF-1 carries no NF-5 code or NF-7 witness. NF-5 must implement the Counter half, use the normal package installation path, and run all five NF-7 facts before its review.

## Final evidence

Gate attempt 3 passed at commit `4369fddf0d07f680c61a9dff12f557967545a3ce`, tree `da0bdbb8b4fe5721fe73a60dd314e6d7f7644501` (END `b5632597`). The [manifest](evidence/2026-11-13-cf1-base-family.manifest.json) lists all 43 sealed files in `~/play/artroom-evidence/2026-11-13-cf1-base-family-gate-attempt3`. `SHA256SUMS` has digest `cf8c9f21a96d7f006d407e88eec9f29f4c8bcc34f099ffc5a72c56ccea748e0a`. All 81 power samples report AC Power. START and END report power mode 0; the battery charges at END. No lane validation or landing overlaps the gate.

All five test stages pass. Node: 173 passed. Counting: 56 passed. Plain: 399 files, 4,612 passed and one skipped. Native: 1,148 passed and two skipped. The raw-proof residency case takes 58.325 s, G15 capture 84.749 s, and one thousand births 251.260 s, from the final Native case records. Durations are observed case times, not worst-case guarantees.

Attempts 1 and 2 remain failed records. Attempt 2 lost AC Power and supplies no evidence about the head (`72a74ae2`). Two later launch guards refused battery before npm started (`4879aaca`, `b24d0dab`); neither ran a gate. Attempt 3 is a fresh complete run.

| Check | Command | Exit | Output and SHA256 |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `gate.stdout`: `34991ebc50abebe8e3cc2424744d14afffbf6d3a07abb5634ea1cb795956fa1b` |
| Whitespace | `git diff --check -B 6553a654` | 0 | `gate-internals/whitespace.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Commit messages | `node scripts/check-commit-messages.mjs 6553a654 HEAD` | 0 | `gate-internals/commit-messages.log`: `edec8687269239db614fab03a0ce2d5213e940359bb80591b0d8ad3835de6dcd` |
| Commit-message witness | `node --test scripts/check-commit-messages.test.mjs` | 0 | `gate-internals/commit-test.log`: `1ee3c43b9138032bbd0f79ebba7cbec88cd0ddee4f98c49bbb386686c770985f` |
| Shared helpers | `node scripts/check-shared-helpers.mjs` | 0 | `gate-internals/helpers.log`: `f8f462116d6bf13f12ca087aa4b16adf42075612a36e8aaa3439c49df97a2c37` |
| Section citations | `node scripts/check-section-citations.mjs` | 0 | `gate-internals/citations.log`: `91f6403fb854808835422ac524889f1f1a0494ffc4fb66a52f9b42781e44d9ae` |
| Citation witness | `node --test scripts/check-section-citations.test.mjs` | 0 | `gate-internals/cite-test.log`: `2ad630cb28efad8e2e2aa2103ac865d4177004fe38970be136c8626cb4e7911e` |
| Document links | `node scripts/check-doc-links.mjs` | 0 | `gate-internals/doc-links.log`: `e738f746a19fabbb74101a21ca6e83400052cd0c46d58e10823059c8c7aa818b` |
| Notes | `node scripts/check-notes.mjs 6553a654 HEAD` | 0 | `gate-internals/notes.log`: `35f5140f008ef3bf10327a6430f244281b40bdfa97fd8e95da1c9634089d74d1` |
| Format | `npm run format:check` | 0 | `gate-internals/format.log`: `6b858014bbe6926fbcfb41b3c9377ec28b3138bf83ce53de8790e5ed46af9d79` |
| TypeScript | `npm run typecheck` | 0 | `gate-internals/typecheck.log`: `a9abf7e40e10fbda74447d08a5ea3b33733361ecd9ac199658065cfbc874936a` |
| Definition pins | `node --import tsx scripts/check-definition-pins.mjs` | 0 | `gate-internals/def-pins.log`: `ea5a52da14bc57e92f814775df7b4b989b1ad5b930810625982942e19856f581` |
| All test stages | `npm test -- --gate --defer-summary --evidence <gate-evidence>` | 0 | `gate-internals/test.log`: `3e0eb72efab9e7ce2aed85d67bb60ceddf3a7fde6a31ab1d31f358ac9d23071d` |

The post-gate merge `8cd68d3e9b` has tree `bf166bf065d22f0e3c21b6e49235f7f4a333d1dd`. Its diff from the source checkpoint contains only 25 Markdown paths. It combines the base-family CLI wording with main's scope-ID and genesis corrections. Source, tests, configuration and dependencies match the gate checkpoint. The evidence commit adds only this note and its manifest. Reproduce the correspondence with `git diff --name-only 4369fddf HEAD`.

## Open limits

- NF-7 (`13ff61c7`, amended by `bc826726`) belongs to NF-5 after CF-1, including the real Counter browser witness.
- Celld keeps its existing families and their Directory 20 archive fault. Rulings `96676b22` and `9658ed88` assign its move to base to later work.
- The three extra Destination 21 archive value places remain as ruled in `9658ed88`; CF-1 rewrites no historical pin.
- CDF-1 (`27cb5f60`, ruling `bb6cf92b`) must land before the cutover deployment. RB-1 (`0ce66e16`) owns the later item and rule-row ceilings and does not hold that deployment.
