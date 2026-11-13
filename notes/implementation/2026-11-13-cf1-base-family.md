# The base creation family

CF-1 is plan `69fed843` v2, with the rulings `bccd8dd1` (Q1 to Q5), `68356c6c` (the seven choices), `7505fa96` (point 1), `710a5d76` (the ordinary version 2 package) and `96676b22` (celld, Commons and the archive rows). The head is cut from the cutover review head `9b583eb2`. Main is `64112e45`.

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

**Membership 14** (`base-membership.ts`) is Membership 12 with the own-agent acts of Membership 13, and five changes. An active key retires itself or marks itself compromised through `revoke-key`. Another key refuses `not-own-key`. A new act, `leave`, removes the member of the signing key, of any kind. Another member refuses `not-own-member`. An active person who holds `membership.own-agent` removes an agent that they control, or revokes one of its keys. `last-admin-kept` skips its check only when the recovery key signed the act (`signedByRecovery` in `membership.ts`). A null grant no longer skips it. An own agent holds at most four invited or active keys (`OWN_AGENT_KEYS`).

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
