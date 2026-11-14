/** Exact pin answers frozen from the BR13 source inventory at 86179b0c.
 * Each question preserves its own old predicate, including equal pin sets.
 * A future or unknown pin acquires no answer from its version number. */
import { answersCatalogVocabularyQuestion, CATALOG_VOCABULARY_QUESTIONS, type CatalogVocabularyQuestion, type CatalogVocabularyPin } from "@generalbusiness/dap-contract/catalog-vocabulary";

const QUESTION_PINS = {
  nativeStandingDestination: ["platform:destination@5", "platform:destination@6"],
  cliManifestListDestination: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@18", "platform:destination@19", "platform:destination@20", "platform:destination@21",
    "platform:destination@3", "platform:destination@4", "platform:destination@5", "platform:destination@6",
  ],
  scopeOwnStandingMembership: [
    "platform:membership@1", "platform:membership@10", "platform:membership@11", "platform:membership@12",
    "platform:membership@13", "platform:membership@14", "platform:membership@2", "platform:membership@4",
    "platform:membership@5", "platform:membership@6", "platform:membership@7", "platform:membership@8",
    "platform:membership@9",
  ],
  scopeSessionMembership: [
    "platform:membership@1", "platform:membership@10", "platform:membership@11", "platform:membership@12",
    "platform:membership@13", "platform:membership@14", "platform:membership@2", "platform:membership@4",
    "platform:membership@5", "platform:membership@6", "platform:membership@7", "platform:membership@8",
    "platform:membership@9",
  ],
  scopeInvitationProofMembership: [
    "platform:membership@10", "platform:membership@11", "platform:membership@12", "platform:membership@13",
    "platform:membership@14", "platform:membership@6", "platform:membership@7", "platform:membership@8",
    "platform:membership@9",
  ],
  applicationProjectionMembership: [
    "platform:membership@10", "platform:membership@11", "platform:membership@12", "platform:membership@13",
    "platform:membership@14",
  ],
  viewsEvidenceMembership: [
    "platform:membership@12", "platform:membership@14", "platform:membership@8", "platform:membership@9",
  ],
  pageRetainedCreationRegister: [
    "platform:register@17", "platform:register@26", "platform:register@28", "platform:register@7",
    "platform:register@8",
  ],
  cliRetainedInstallRegister: [
    "platform:register@17", "platform:register@18", "platform:register@19", "platform:register@20",
    "platform:register@21", "platform:register@24", "platform:register@25", "platform:register@26",
    "platform:register@28", "platform:register@5",
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
  applicationOutsideWorkerRules: [
    "platform:rules@10", "platform:rules@11", "platform:rules@12", "platform:rules@13",
    "platform:rules@14", "platform:rules@15", "platform:rules@5", "platform:rules@6",
    "platform:rules@7", "platform:rules@8", "platform:rules@9",
  ],
  cliOneFileDestination: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@18", "platform:destination@19", "platform:destination@2", "platform:destination@20",
    "platform:destination@21", "platform:destination@3", "platform:destination@4", "platform:destination@5",
    "platform:destination@6",
  ],
  nativeStagedPublication: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@17", "platform:destination@18", "platform:destination@19", "platform:destination@20",
    "platform:destination@21", "platform:destination@3", "platform:destination@4", "platform:destination@5",
    "platform:destination@6", "platform:destination@7", "platform:destination@8",
  ],
  nativeFilePublication: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@17", "platform:destination@18", "platform:destination@19", "platform:destination@20",
    "platform:destination@21", "platform:destination@4", "platform:destination@5", "platform:destination@6",
    "platform:destination@7", "platform:destination@8",
  ],
  clientSettlementClaimProjectionRegister: [
    "platform:register@26", "platform:register@28",
  ],
  cliRetainedBindingFounderRegister: [
    "platform:register@25",
  ],
  cliRetainedUnpublishedNamespaceRegister: [
    "platform:register@21",
  ],
  cliFailedClaimRegister: [
    "platform:register@26", "platform:register@28",
  ],
  cliNoHostInstallRegister: [
    "platform:register@21", "platform:register@23", "platform:register@25", "platform:register@27",
    "platform:register@28",
  ],
  cliOpenPolicyExplicitRegister: [
    "platform:register@21", "platform:register@23", "platform:register@25", "platform:register@26",
    "platform:register@27", "platform:register@28",
  ],
  cliLegacyOpenPolicyRegister: [
    "platform:register@17",
  ],
  cliImplicitSelectedPlanRegister: [
    "platform:register@10", "platform:register@12", "platform:register@13", "platform:register@14",
    "platform:register@15", "platform:register@16", "platform:register@17", "platform:register@18",
    "platform:register@19", "platform:register@20", "platform:register@21", "platform:register@23",
    "platform:register@24", "platform:register@25", "platform:register@26", "platform:register@27",
    "platform:register@28", "platform:register@5", "platform:register@9",
  ],
  cliNewInstallRegister: [
    "platform:register@17", "platform:register@18", "platform:register@19", "platform:register@20",
    "platform:register@21", "platform:register@23", "platform:register@24", "platform:register@25",
    "platform:register@26", "platform:register@27", "platform:register@28", "platform:register@5",
  ],
  cliRetainedUnpublishedSelectionRegister: [
    "platform:register@21", "platform:register@25", "platform:register@27", "platform:register@28",
  ],
  cliRetiredCountingInstallRegister: [
    "platform:register@6",
  ],
  cliUnpublishedDestination: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20", "platform:destination@21",
  ],
  cliStatusUnpublishedDestination: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20", "platform:destination@21",
  ],
  cliFixedReadTokenLifetimeDestination: [
    "platform:destination@19", "platform:destination@21",
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
    "platform:membership@13", "platform:membership@14",
  ],
  cliInvitationInboxDefinition: [
    "platform:inbox@1",
  ],
  cliApplicationInstallationRules: [
    "platform:rules@10", "platform:rules@11", "platform:rules@12", "platform:rules@14",
    "platform:rules@15", "platform:rules@5", "platform:rules@6", "platform:rules@7",
    "platform:rules@8", "platform:rules@9",
  ],
  pageUnpublishedDirectory: [
    "platform:directory@20", "platform:directory@22", "platform:directory@26", "platform:directory@27",
  ],
  pagePartitionRootDirectory: [
    "platform:directory@10",
  ],
  pageReviewPolicyRules: [
    "platform:rules@1", "platform:rules@10", "platform:rules@15", "platform:rules@2",
    "platform:rules@3", "platform:rules@4",
  ],
  pageInitializationRules: [
    "platform:rules@1", "platform:rules@10", "platform:rules@15", "platform:rules@2",
    "platform:rules@3", "platform:rules@4",
  ],
  pageInitialOwnerMayReviewRules: [
    "platform:rules@4",
  ],
  pageCertifiedRulesReadOnly: [
    "platform:rules@11", "platform:rules@12",
  ],
  pageRetainedOneFileDestination: [
    "platform:destination@13", "platform:destination@19", "platform:destination@2", "platform:destination@21",
    "platform:destination@3", "platform:destination@4", "platform:destination@5", "platform:destination@6",
  ],
  pageRetainedManifestListDestination: [
    "platform:destination@13", "platform:destination@19", "platform:destination@21", "platform:destination@3",
    "platform:destination@4", "platform:destination@5", "platform:destination@6",
  ],
  cliScopeIndexDefaultCoveragePin: [
    "platform:destination@19", "platform:destination@21", "platform:directory@25", "platform:directory@27",
    "platform:inbox@1", "platform:membership@12", "platform:membership@14", "platform:register@26",
    "platform:register@28", "platform:rules@10", "platform:rules@15",
  ],
  cliScopeIndexSupportedLineagePin: [
    "platform:commons@1", "platform:destination@12", "platform:destination@13", "platform:destination@14",
    "platform:destination@15", "platform:destination@16", "platform:destination@18", "platform:destination@19",
    "platform:destination@2", "platform:destination@20", "platform:destination@21", "platform:directory@16",
    "platform:directory@17", "platform:directory@18", "platform:directory@19", "platform:directory@22",
    "platform:directory@23", "platform:directory@24", "platform:directory@25", "platform:directory@26",
    "platform:directory@27", "platform:directory@5", "platform:inbox@1", "platform:membership@10",
    "platform:membership@11", "platform:membership@12", "platform:membership@13", "platform:membership@14",
    "platform:membership@4", "platform:membership@8", "platform:membership@9", "platform:register@17",
    "platform:register@18", "platform:register@19", "platform:register@20", "platform:register@23",
    "platform:register@24", "platform:register@25", "platform:register@26", "platform:register@27",
    "platform:register@28", "platform:register@5", "platform:rules@10", "platform:rules@11",
    "platform:rules@12", "platform:rules@14", "platform:rules@15", "platform:rules@3",
  ],
  scopeApplicationAnnouncementDirectory: [
    "platform:directory@11", "platform:directory@12", "platform:directory@13", "platform:directory@14",
    "platform:directory@15", "platform:directory@16", "platform:directory@17", "platform:directory@18",
    "platform:directory@19", "platform:directory@20", "platform:directory@22", "platform:directory@23",
    "platform:directory@24", "platform:directory@25", "platform:directory@26", "platform:directory@27",
  ],
  scopeApplicationOutsideRules: [
    "platform:rules@10", "platform:rules@11", "platform:rules@12", "platform:rules@14",
    "platform:rules@15", "platform:rules@5", "platform:rules@6", "platform:rules@7",
    "platform:rules@8", "platform:rules@9",
  ],
  scopeHostNoneCreationRegister: [
    "platform:register@21", "platform:register@23", "platform:register@25", "platform:register@27",
    "platform:register@28",
  ],
  scopeCreationDeclarationDirectory: [
    "platform:directory@16", "platform:directory@17", "platform:directory@18", "platform:directory@19",
    "platform:directory@20", "platform:directory@22", "platform:directory@23", "platform:directory@24",
    "platform:directory@25", "platform:directory@26", "platform:directory@27", "platform:directory@5",
  ],
  scopeDemoCreationRegister: [
    "platform:register@17", "platform:register@26", "platform:register@28",
  ],
  scopeDeliveryUnpublishedBranch: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20", "platform:destination@21",
  ],
  scopeDeliveryNativeApplicationOrigin: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@17", "platform:destination@18", "platform:destination@19", "platform:destination@20",
    "platform:destination@21", "platform:destination@7", "platform:destination@8",
  ],
  scopeOperationNativeApplicationOrigin: [
    "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:destination@16",
    "platform:destination@17", "platform:destination@18", "platform:destination@19", "platform:destination@20",
    "platform:destination@21", "platform:destination@7", "platform:destination@8",
  ],
  scopeSessionPreparationOwnScope: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20", "platform:destination@21",
  ],
  scopeSessionPreparationUnpublishedPage: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20", "platform:destination@21",
  ],
  scopeCredentialUnpublishedBranch: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20", "platform:destination@21",
  ],
  scopeSettlementClaimRegister: [
    "platform:register@26", "platform:register@28",
  ],
  scopeSiteRepositoryOptionalDirectory: [
    "platform:directory@20", "platform:directory@22", "platform:directory@24", "platform:directory@26",
    "platform:directory@27",
  ],
  scopeReadTokenFixedHourDestination: [
    "platform:destination@19", "platform:destination@21",
  ],
  scopeArchiveHostDirectory: [
    "platform:directory@16", "platform:directory@17", "platform:directory@18", "platform:directory@19",
    "platform:directory@25", "platform:directory@27",
  ],
  scopeArchiveHostDestination: [
    "platform:destination@12", "platform:destination@13", "platform:destination@14", "platform:destination@15",
    "platform:destination@19", "platform:destination@21",
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
    "platform:destination@21", "platform:destination@3", "platform:destination@5", "platform:destination@6",
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
  scopeArchiveForeignLegacyMembership: [
    "platform:membership@6",
  ],
  authoritySessionBirthCommons: [
    "platform:commons@1",
  ],
  authoritySessionBirthUnpublishedBranch: [
    "platform:destination@16", "platform:destination@18", "platform:destination@20", "platform:destination@21",
  ],
  celldPreparedNoHostRegister: [
    "platform:register@21", "platform:register@25", "platform:register@28",
  ],
  celldPreparedBindingPolicyRegister: [
    "platform:register@25",
  ],
  celldSmokeOwnedPlanRegister: [
    "platform:register@21", "platform:register@28",
  ],
  mcpInventoryPartitionDirectory: [
    "platform:directory@10",
  ],
  mcpReadTokenFixedHourDestination: [
    "platform:destination@19", "platform:destination@21",
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
    "platform:rules@10", "platform:rules@14", "platform:rules@15", "platform:rules@6",
    "platform:rules@8", "platform:rules@9",
  ],
  mcpDeviceInstallOptionsRules: [
    "platform:rules@10", "platform:rules@14", "platform:rules@15", "platform:rules@9",
  ],
  mcpOwnerFieldRules: [
    "platform:rules@10", "platform:rules@14", "platform:rules@15", "platform:rules@9",
  ],
  mcpSemanticInstallSignatureRules: [
    "platform:rules@6", "platform:rules@8",
  ],
  mcpVerifyEmptyDestination: [
    "platform:destination@16", "platform:destination@21",
  ],
  /** CF-1: the host checks every touched path and link target against the application's declared prefixes. */
  scopePublicationPrefixesDestination: [
    "platform:destination@21",
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

type PlatformVersionQuestion = keyof typeof QUESTION_PINS;
export type VersionQuestion = PlatformVersionQuestion | CatalogVocabularyQuestion;
export type VersionQuestionPin<Q extends VersionQuestion> = Q extends CatalogVocabularyQuestion ? CatalogVocabularyPin<Q>
  : Q extends PlatformVersionQuestion ? (typeof QUESTION_PINS)[Q][number] : never;

/** Named questions stay separate even when their current answers agree. */
export const VERSION_QUESTIONS: readonly VersionQuestion[] = Object.freeze([...(Object.keys(QUESTION_PINS) as PlatformVersionQuestion[]), ...CATALOG_VOCABULARY_QUESTIONS]);

/** The exact old positive set answers this question; every other value is false. */
export function answersVersionQuestion<Q extends VersionQuestion>(named: unknown, question: Q): named is VersionQuestionPin<Q> {
  if ((CATALOG_VOCABULARY_QUESTIONS as readonly string[]).includes(question)) {
    return answersCatalogVocabularyQuestion(named, question as CatalogVocabularyQuestion);
  }
  return typeof named === "string" && (QUESTION_PINS[question as PlatformVersionQuestion] as readonly string[]).includes(named);
}
