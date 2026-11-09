/** Exact pin answers frozen from the BR13 source inventory at 86179b0c.
 * Each question preserves its own old predicate, including equal pin sets.
 * A future or unknown pin acquires no answer from its version number. */
const QUESTION_PINS = {
  cliManifestListDestination: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@18", "platform:destination@19", "platform:destination@20", "platform:destination@3",
    "platform:destination@4", "platform:destination@5", "platform:destination@6",
  ],
  scopeOwnStandingMembership: [
    "platform:membership@1", "platform:membership@10", "platform:membership@11", "platform:membership@12",
    "platform:membership@13", "platform:membership@2", "platform:membership@4", "platform:membership@5",
    "platform:membership@6", "platform:membership@7", "platform:membership@8", "platform:membership@9",
  ],
  scopeSessionMembership: [
    "platform:membership@1", "platform:membership@10", "platform:membership@11", "platform:membership@12",
    "platform:membership@13", "platform:membership@2", "platform:membership@4", "platform:membership@5",
    "platform:membership@6", "platform:membership@7", "platform:membership@8", "platform:membership@9",
  ],
  scopeInvitationProofMembership: [
    "platform:membership@10", "platform:membership@11", "platform:membership@12", "platform:membership@13",
    "platform:membership@6", "platform:membership@7", "platform:membership@8", "platform:membership@9",
  ],
  applicationScreenMembership: [
    "platform:membership@10", "platform:membership@11", "platform:membership@12", "platform:membership@13",
    "platform:membership@7", "platform:membership@8", "platform:membership@9",
  ],
  applicationProjectionMembership: [
    "platform:membership@10", "platform:membership@11", "platform:membership@12", "platform:membership@13",
  ],
  viewsEvidenceMembership: [
    "platform:membership@12", "platform:membership@8", "platform:membership@9",
  ],
  pageRetainedCreationRegister: [
    "platform:register@17", "platform:register@26", "platform:register@7", "platform:register@8",
  ],
  clientCreationOfferRegister: [
    "platform:register@17", "platform:register@26",
  ],
  cliRetainedInstallRegister: [
    "platform:register@17", "platform:register@18", "platform:register@19", "platform:register@20",
    "platform:register@21", "platform:register@24", "platform:register@25", "platform:register@26",
    "platform:register@5",
  ],
  replayReadsLegacyPublication: [
    "platform:destination@4", "platform:destination@5", "platform:destination@6", "platform:destination@7",
  ],
  replayJudgesLegacyPublication: [
    "platform:destination@4", "platform:destination@5", "platform:destination@6", "platform:destination@7",
  ],
  replayPartitionChangeOrigin: [
    "platform:destination@6",
  ],
  nativeTimedOperationOpen: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@19",
    "platform:destination@3",
  ],
  destinationCertificateDriver: [
    "platform:destination@14", "platform:destination@15", "platform:destination@17",
  ],
  evidenceStageOrigin: [
    "platform:destination@17",
  ],
  evidenceStageSnapshot: [
    "platform:destination@17",
  ],
  archiveMembershipForeignCopy: [
    "platform:membership@12", "platform:membership@8",
  ],
  archiveRegisterForeignCopy: [
    "platform:register@17", "platform:register@18", "platform:register@19", "platform:register@20",
    "platform:register@26",
  ],
  applicationOutsideWorkerRules: [
    "platform:rules@10", "platform:rules@11", "platform:rules@12", "platform:rules@13",
    "platform:rules@14", "platform:rules@5", "platform:rules@6", "platform:rules@7",
    "platform:rules@8", "platform:rules@9",
  ],
  cliOneFileDestination: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@18", "platform:destination@19", "platform:destination@2", "platform:destination@20",
    "platform:destination@3", "platform:destination@4", "platform:destination@5", "platform:destination@6",
  ],
  nativeStagedPublication: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@17", "platform:destination@18", "platform:destination@19", "platform:destination@20",
    "platform:destination@3", "platform:destination@4", "platform:destination@5", "platform:destination@6",
    "platform:destination@7", "platform:destination@8",
  ],
  nativeFilePublication: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@17", "platform:destination@18", "platform:destination@19", "platform:destination@20",
    "platform:destination@4", "platform:destination@5", "platform:destination@6", "platform:destination@7",
    "platform:destination@8",
  ],
  clientAgentKeyInvitationMembership: [
    "platform:membership@10", "platform:membership@11", "platform:membership@12", "platform:membership@13",
    "platform:membership@2", "platform:membership@4", "platform:membership@5", "platform:membership@6",
    "platform:membership@7", "platform:membership@8", "platform:membership@9",
  ],
  clientCheckerKeyInvitationMembership: [
    "platform:membership@12", "platform:membership@8",
  ],
  clientPersonInvitationMembership: [
    "platform:membership@1", "platform:membership@10", "platform:membership@11", "platform:membership@12",
    "platform:membership@13", "platform:membership@2", "platform:membership@4", "platform:membership@5",
    "platform:membership@6", "platform:membership@7", "platform:membership@8", "platform:membership@9",
  ],
  clientInvitationSignatureCredential: [
    "platform:membership@10", "platform:membership@11", "platform:membership@12", "platform:membership@13",
    "platform:membership@6", "platform:membership@7", "platform:membership@8", "platform:membership@9",
  ],
  clientSettlementClaimProjectionRegister: [
    "platform:register@26",
  ],
  clientCommonsReadDefinition: [
    "platform:commons@1",
  ],
  clientPartitionRootDirectory: [
    "platform:directory@10",
  ],
  clientPartitionChildDirectory: [
    "platform:directory-partition@1",
  ],
  cliRetainedBindingFounderRegister: [
    "platform:register@25",
  ],
  cliRetainedUnpublishedNamespaceRegister: [
    "platform:register@21",
  ],
  cliFailedClaimRegister: [
    "platform:register@26",
  ],
  cliNoHostInstallRegister: [
    "platform:register@21", "platform:register@23", "platform:register@25", "platform:register@27",
  ],
  cliOpenPolicyExplicitRegister: [
    "platform:register@21", "platform:register@23", "platform:register@25", "platform:register@26",
    "platform:register@27",
  ],
  cliLegacyOpenPolicyRegister: [
    "platform:register@17",
  ],
  cliImplicitSelectedPlanRegister: [
    "platform:register@10", "platform:register@12", "platform:register@13", "platform:register@14",
    "platform:register@15", "platform:register@16", "platform:register@17", "platform:register@18",
    "platform:register@19", "platform:register@20", "platform:register@21", "platform:register@23",
    "platform:register@24", "platform:register@25", "platform:register@26", "platform:register@27",
    "platform:register@5", "platform:register@9",
  ],
  cliNewInstallRegister: [
    "platform:register@17", "platform:register@18", "platform:register@19", "platform:register@20",
    "platform:register@21", "platform:register@23", "platform:register@24", "platform:register@25",
    "platform:register@26", "platform:register@27", "platform:register@5",
  ],
  cliRetainedUnpublishedSelectionRegister: [
    "platform:register@21", "platform:register@25", "platform:register@27",
  ],
  cliRetiredCountingInstallRegister: [
    "platform:register@6",
  ],
  cliUnpublishedDestination: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20",
  ],
  cliStatusUnpublishedDestination: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20",
  ],
  cliFixedReadTokenLifetimeDestination: [
    "platform:destination@19",
  ],
  cliIssuesPartitionRootDirectory: [
    "platform:directory@10",
  ],
  cliTargetsPartitionRootDirectory: [
    "platform:directory@10",
  ],
  cliOpeningPartitionDirectory: [
    "platform:directory-partition@1",
  ],
  cliOwnAgentInvitationMembership: [
    "platform:membership@13",
  ],
  cliInvitationInboxDefinition: [
    "platform:inbox@1",
  ],
  cliApplicationInstallationRules: [
    "platform:rules@10", "platform:rules@11", "platform:rules@12", "platform:rules@14",
    "platform:rules@5", "platform:rules@6", "platform:rules@7", "platform:rules@8",
    "platform:rules@9",
  ],
  pageUnpublishedDirectory: [
    "platform:directory@20", "platform:directory@22", "platform:directory@26",
  ],
  pagePartitionRootDirectory: [
    "platform:directory@10",
  ],
  pageReviewPolicyRules: [
    "platform:rules@1", "platform:rules@10", "platform:rules@2", "platform:rules@3",
    "platform:rules@4",
  ],
  pageInitializationRules: [
    "platform:rules@1", "platform:rules@10", "platform:rules@2", "platform:rules@3",
    "platform:rules@4",
  ],
  pageInitialOwnerMayReviewRules: [
    "platform:rules@4",
  ],
  pageCertifiedRulesReadOnly: [
    "platform:rules@11", "platform:rules@12",
  ],
  pageRetainedOneFileDestination: [
    "platform:destination@13", "platform:destination@19", "platform:destination@2", "platform:destination@3",
    "platform:destination@4", "platform:destination@5", "platform:destination@6",
  ],
  pageRetainedManifestListDestination: [
    "platform:destination@13", "platform:destination@19", "platform:destination@3", "platform:destination@4",
    "platform:destination@5", "platform:destination@6",
  ],
  cliScopeIndexDefaultCoveragePin: [
    "platform:destination@19", "platform:directory@25", "platform:inbox@1", "platform:membership@12",
    "platform:register@26", "platform:rules@10",
  ],
  cliScopeIndexSupportedLineagePin: [
    "platform:commons@1", "platform:destination@12", "platform:destination@13", "platform:destination@14",
    "platform:destination@15", "platform:destination@16", "platform:destination@18", "platform:destination@19",
    "platform:destination@2", "platform:destination@20", "platform:directory@16", "platform:directory@17",
    "platform:directory@18", "platform:directory@19", "platform:directory@22", "platform:directory@23",
    "platform:directory@24", "platform:directory@25", "platform:directory@26", "platform:directory@5",
    "platform:inbox@1", "platform:membership@10", "platform:membership@11", "platform:membership@12",
    "platform:membership@13", "platform:membership@4", "platform:membership@8", "platform:membership@9",
    "platform:register@17", "platform:register@18", "platform:register@19", "platform:register@20",
    "platform:register@23", "platform:register@24", "platform:register@25", "platform:register@26",
    "platform:register@27", "platform:register@5", "platform:rules@10", "platform:rules@11",
    "platform:rules@12", "platform:rules@14", "platform:rules@3",
  ],
  scopeApplicationAnnouncementDirectory: [
    "platform:directory@11", "platform:directory@12", "platform:directory@13", "platform:directory@14",
    "platform:directory@15", "platform:directory@16", "platform:directory@17", "platform:directory@18",
    "platform:directory@19", "platform:directory@20", "platform:directory@22", "platform:directory@23",
    "platform:directory@24", "platform:directory@25", "platform:directory@26",
  ],
  scopeApplicationOutsideRules: [
    "platform:rules@10", "platform:rules@11", "platform:rules@12", "platform:rules@14",
    "platform:rules@5", "platform:rules@6", "platform:rules@7", "platform:rules@8",
    "platform:rules@9",
  ],
  scopeHostNoneCreationRegister: [
    "platform:register@21", "platform:register@23", "platform:register@25", "platform:register@27",
  ],
  scopeCreationDeclarationDirectory: [
    "platform:directory@16", "platform:directory@17", "platform:directory@18", "platform:directory@19",
    "platform:directory@20", "platform:directory@22", "platform:directory@23", "platform:directory@24",
    "platform:directory@25", "platform:directory@26", "platform:directory@5",
  ],
  scopeDemoCreationRegister: [
    "platform:register@17", "platform:register@26",
  ],
  scopeDeliveryUnpublishedBranch: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20",
  ],
  scopeDeliveryNativeApplicationOrigin: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@17", "platform:destination@18", "platform:destination@19", "platform:destination@20",
    "platform:destination@7", "platform:destination@8",
  ],
  scopeOperationNativeApplicationOrigin: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@17", "platform:destination@18", "platform:destination@19", "platform:destination@20",
    "platform:destination@7", "platform:destination@8",
  ],
  scopeSessionPreparationOwnScope: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20",
  ],
  scopeSessionPreparationUnpublishedPage: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20",
  ],
  scopeCredentialUnpublishedBranch: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20",
  ],
  scopeSettlementClaimRegister: [
    "platform:register@26",
  ],
  scopeSiteRepositoryOptionalDirectory: [
    "platform:directory@20", "platform:directory@22", "platform:directory@24", "platform:directory@26",
  ],
  scopeReadTokenFixedHourDestination: [
    "platform:destination@19",
  ],
  scopeArchiveHostDirectory: [
    "platform:directory@16", "platform:directory@17", "platform:directory@18", "platform:directory@19",
    "platform:directory@25",
  ],
  scopeArchiveHostDestination: [
    "platform:destination@12", "platform:destination@13", "platform:destination@14", "platform:destination@15",
    "platform:destination@19",
  ],
  scopeArchiveCertificateValueDestination: [
    "platform:destination@14", "platform:destination@15",
  ],
  scopeDestinationEvidenceOperation: [
    "platform:destination@17",
  ],
  scopeArtifactEvidenceOperation: [
    "platform:destination@17",
  ],
  scopeCertificateEvidenceProfile: [
    "platform:destination@17",
  ],
  scopeCertificateHardenedProfile: [
    "platform:destination@15", "platform:destination@17",
  ],
  scopeCheckGenerationV15: [
    "platform:destination@15",
  ],
  scopeCheckGenerationV14: [
    "platform:destination@14",
  ],
  checkerReservationOriginDestination: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@19",
    "platform:destination@3", "platform:destination@5", "platform:destination@6",
  ],
  partitionReceiverCandidate: [
    "platform:destination@6", "platform:directory-partition@1", "platform:directory@10", "platform:inbox@1",
    "platform:membership@6", "platform:rules@3",
  ],
  partitionCreationProbeCandidate: [
    "platform:destination@6", "platform:directory-partition@1", "platform:directory@10", "platform:inbox@1",
    "platform:membership@6", "platform:rules@3",
  ],
  partitionCreationCandidate: [
    "platform:destination@6", "platform:directory-partition@1", "platform:directory@10", "platform:inbox@1",
    "platform:membership@6", "platform:rules@3",
  ],
  gitArchiveDirectMembership: [
    "platform:membership@6",
  ],
  scopeArchiveForeignLegacyMembership: [
    "platform:membership@6",
  ],
  authoritySessionBirthCommons: [
    "platform:commons@1",
  ],
  authoritySessionBirthUnpublishedBranch: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20",
  ],
  celldPreparedNoHostRegister: [
    "platform:register@21", "platform:register@25",
  ],
  celldPreparedBindingPolicyRegister: [
    "platform:register@25",
  ],
  celldSmokeOwnedPlanRegister: [
    "platform:register@21",
  ],
  mcpInventoryPartitionDirectory: [
    "platform:directory@10",
  ],
  mcpReadTokenFixedHourDestination: [
    "platform:destination@19",
  ],
  mcpCurrentRoomPartitionDirectory: [
    "platform:directory@10",
  ],
  mcpCommonsReadDefinition: [
    "platform:commons@1",
  ],
  mcpCommonsRoomDirectory: [
    "platform:directory@22",
  ],
  mcpSemanticInstallRoomRules: [
    "platform:rules@10", "platform:rules@14", "platform:rules@6", "platform:rules@8",
    "platform:rules@9",
  ],
  mcpDeviceInstallOptionsRules: [
    "platform:rules@10", "platform:rules@14", "platform:rules@9",
  ],
  mcpOwnerFieldRules: [
    "platform:rules@10", "platform:rules@14", "platform:rules@9",
  ],
  mcpSemanticInstallSignatureRules: [
    "platform:rules@6", "platform:rules@8",
  ],
  mcpVerifyEmptyDestination: [
    "platform:destination@16",
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export type VersionQuestion = keyof typeof QUESTION_PINS;

/** Named questions stay separate even when their current answers agree. */
export const VERSION_QUESTIONS: readonly VersionQuestion[] = Object.freeze(Object.keys(QUESTION_PINS) as VersionQuestion[]);

/** The exact old positive set answers this question; every other value is false. */
export function answersVersionQuestion(named: unknown, question: VersionQuestion): boolean {
  return typeof named === "string" && (QUESTION_PINS[question] as readonly string[]).includes(named);
}
