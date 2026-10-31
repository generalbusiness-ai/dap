export { COMMONS_COHORT } from "./commons-cohort.ts";
export { commons, commonsDirectory, commonsMembership } from "./commons.ts";
import { NATIVE_DECLARATION_PINS, NATIVE_DECLARATION_TEXT } from "./native-declarations.generated.ts";
import { VERSIONS } from "./native-catalog.ts";
import { ARCHIVE_DEVICE_PUBLICATION_COHORT } from "./archive-binding-wire.ts";
export { VERSIONS, platform, type Platform } from "./native-catalog.ts";
export { applicationRoom, applicationInstallation } from "./application-install-reader.ts";
export { applicationProjectionDeclaration } from "./application-projection-reader.ts";
export { applicationAnnouncement, APPLICATION_ANNOUNCEMENT_OWNER } from "./application-install-creation.ts";
export { TRUSTED_APPLICATION_COHORT, INSTALL_DEFINITION_BYTES, INSTALL_SEMANTIC_BYTES } from "./application-install-wire.ts";
export { DECLARED_APPLICATION_RULES } from "./application-install-v2.ts";
export { DECLARED_APPLICATION_COHORT } from "./application-install-v2-wire.ts";
export { ARCHIVE_REPLAY_CODE } from "./archive-replay-code.ts";
export { ARCHIVE_APPLICATION_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_PUBLICATION_COHORT, ARCHIVE_CERTIFIED_RULES_COHORT, HARDENED_CERTIFIED_RULES_COHORT, UNPUBLISHED_COHORT } from "./archive-binding-wire.ts";
export { DEVICE_APPLICATION_COHORT } from "./device-application-wire.ts";
export { deviceApplicationRequirement } from "./device-application-package.ts";
export { INVITATION_KEY_COHORT, directory9, directoryRules9, membership6, membershipRules6 } from "./invitation-key.ts";
/**
 * Artroom's platform definitions (authority note, section 12.1): the data of
 * each, as a `PlatformData` whose name is the platform name without its
 * version, and the table of the rules that no form can say. The data holds
 * a mark at each place where a rule is run. This package reads no clock, no
 * storage and no network. It holds no lane.
 *
 * Only the data of this package is validated with the platform option of
 * the validator. A definition that came from an input is validated without
 * it.
 */

export { APPLICATION_COHORT, FILE_PUBLICATION_COHORT, APPLICATION_VALUES_BYTES, applicationValues, applicationPublicationValues, directory5, directory8, directoryRules5, directoryRules8 } from "./application.ts";
export { COUNTING_COHORT, directory6, directoryRules6 } from "./counting-cohort.ts";
/** Explicit partition cohort. Exports and catalog support do not move default
 * pins or select a receiver's identity policy. Lineage admission is separate. */
export { PARTITION_COHORT, directory10, directoryRules10, directoryPartition1, directoryPartitionRules1 } from "./directory-partitions.ts";
export { PARTITION_IDENTITY_POLICY, PARTITION_IDENTITY_BOUNDS, partitionReceiverPolicy, partitionSourceName, partitionCreationPolicy, partitionDeclaredCreationPolicy, partitionNativeCreationPolicy, partitionPublicationOrigin, partitionProducerName, type PartitionCreationSelection, type PartitionCreation, type PartitionCreationPolicy, type PartitionNativeFrame, type PartitionReceiverLineage, type PartitionReceiverPolicy } from "./partition-provenance.ts";

import type { PlatformData, PlatformDefinition } from "@generalbusiness/dap-contract";
import { destination, destination2, destination4, destination5, destination6, destinationRules4, destinationRules5, destinationRules6 } from "./destination.ts";
import { inbox } from "./inbox.ts";
import { membership, membership5 } from "./membership.ts";
export { DEMO_REGISTER, DEMO_PURPOSE, WEB_DEMO_COHORT, WEB_DEMO_REGISTER, demoRegister, demoRegisterRules, webDemoRegister } from "./demo-register.ts";
import { register } from "./register.ts";
import { directory, directory2, directory7 } from "./directory.ts";
import { RULES } from "./rules.ts";
import { rulesScope, rulesScope4 } from "./rules-scope.ts";

export { inbox, membership, membership5, register, directory, directory2, directory7, destination, destination2, destination4, destination5, destination6, destinationRules4, destinationRules5, destinationRules6 };
export { isOf, isStandingDestination, pinnedBy, pinnedOf, usesFilePublicationProtocol, usesStagedPublicationProtocol, versionOf } from "./versions.ts";
export { ACTIONS_MOST, FIRST_ACTIONS, FIRST_ACTIONS_OF, MEMBERSHIP, MEMBERSHIP_1, NO_MEMBER, ROLE_LISTS, ROLE_TABLE, ROLE_TABLE_OF, actionsIn, isActions, isHandle, standingOf, type Role } from "./membership.ts";
export { CREATION_ATTEMPTS, DIRECTORY_OF, REGISTER, REPOSITORY, directoryIdOf, directorySeed, registerRules, repositoryName } from "./register.ts";
export { DEFINITION_DOMAIN, DIRECTORY, IMPORT_ATTEMPTS, SEEN, SIBLINGS_OF, directoryMembership, directoryRules, directoryRulesScope } from "./directory.ts";
export { COLLECT_MOST, DESTINATION, DESTINATION_1, DESTINATION_5, DESTINATION_ATTEMPTS, DESTINATION_KINDS, READ_TOKEN_HOURS, destinationEvidenceValues, destinationMembership, destinationRulesScope, destinationReceipt, firstHeadCommit, initialCommitOf, revokedToken } from "./destination.ts";
export { unpublishedDestinationBranch } from "./unpublished-destination.ts";
export { initialCommitObjects, readmeText, receiptObjects, receiptRef, importRef, type Readme, type DestinationObject, type DestinationCommit, type ObjectFormat } from "./destination-objects.ts";
export { EDIT_PATH_BYTES, editCommit, editObjects, editPath, editTree, manifestCommit } from "./destination-objects.ts";
export { PROPOSE_FILE, fileOf, sourcesOf, manifestFiles } from "./destination-reading.ts";
export { sourceName, installedApplicationPublicationOrigin, archiveDevicePublicationOrigin, applicationPublicationOrigin, publishingLaneOrigin, publishingLaneAffiliation, PUBLISHING_LANE_DIGESTS, ISSUE_LANE_DIGESTS } from "./publishing-provenance.ts";
export { filePublicationCause, filePublicationCurrent, newestFilePublication, fileSupersededOutcome, destinationPublicationAt } from "./destination.ts";
export { filePublicationCommit, fileReceiptObjects, fileReceiptRef, type FilePublicationCause } from "./destination-objects.ts";
export type { LaneRead } from "./destination.ts";
/** Internal versioned metadata reader shared by native host and rules. */
export { publicationStandingRecord } from "./publication-standing.ts";
export { certifiedPublicationState } from "./destination.ts";
// The host port reads the same recorded operation context as the rules.
export { branchOf as destinationBranch, mintOf as destinationMint, servedBy as destinationWrite, statementOf as destinationStatement, targetOf as destinationTarget, writeSends as destinationSends, readFor as destinationRead } from "./destination.ts";
export { mintRevoked as destinationRevokedMint } from "./destination.ts";
export { DESTINATION_CHANGED_SET, NOT_RESERVED, fileSound, isJudgeChanges, isJudgeEvidence, isRecordedJudgeEvidence, judgeReservation, type EditFile } from "./reservation.ts";
export type { JudgeChanges, JudgeEvidence, RecordedJudgeEvidence, Reservation, ReservationAsked, ReservationRead, Statement } from "./reservation.ts";
export { RULES };
export { rulesScope, rulesScope4 };
export { CONFIGURATION_BYTES, CONFIGURATION_DOMAIN, PUBLISH, RULES_EXTENTS_VALUE, RULES_SCOPE, RULES_SCOPE_1, extentsOf, membershipId, referenceOf, revisionOf, rulesAnswer, rulesMembership, rulesObservedValues } from "./rules-scope.ts";
export type { PlatformName, RuleTable } from "./rules.ts";
export { CONTROLLER, EXTENTS_MOST, EXTENT_CLASSES, LANDING, RULES_EXTENT, RULES_PATTERNS, classify, firstExtents, holdsRulesExtent, isExtents, judgeExtents, matches } from "./extents.ts";
export type { Extent, ExtentClass, ExtentJudged, ExtentsAsked, ExtentsJudged, Holder, Lack, Review, Touched, TreeLink } from "./extents.ts";

/**
 * One version of a platform definition, as a runtime or a verifier is
 * supplied it: its data, and its rules by the name that a mark states (the
 * contract's revision 15, section 6.1). Both parts belong to the one name
 * and version.
 */

/** New creation defaults only. Existing scopes and explicit cohort pins stay fixed. */
export const NEWEST: Readonly<Record<string, PlatformDefinition>> = {
  "platform:inbox": ARCHIVE_DEVICE_PUBLICATION_COHORT.inbox, "platform:membership": ARCHIVE_DEVICE_PUBLICATION_COHORT.membership, "platform:register": ARCHIVE_DEVICE_PUBLICATION_COHORT.register, "platform:directory": ARCHIVE_DEVICE_PUBLICATION_COHORT.directory, "platform:rules": ARCHIVE_DEVICE_PUBLICATION_COHORT.rules, "platform:destination": ARCHIVE_DEVICE_PUBLICATION_COHORT.destination,
};

/** The data of the newest version of each platform definition, by name without the version. */
export const definitions: Readonly<Record<string, PlatformData>> = Object.fromEntries(Object.entries(NEWEST).map(([name, named]) => [name, VERSIONS[named]!.data]));

/** Static byte projection only. A caller must independently validate the
 * declaration and bind its current reviewed native data before consumption. */
export function nativeDeclarationText(named: string): Readonly<{ digest: string; text: string }> | null {
  if (!Object.hasOwn(VERSIONS, named) || !Object.hasOwn(NATIVE_DECLARATION_PINS, named)) return null;
  const digest = NATIVE_DECLARATION_PINS[named]!;
  if (!Object.hasOwn(NATIVE_DECLARATION_TEXT, digest)) return null;
  return { digest, text: NATIVE_DECLARATION_TEXT[digest]! };
}

// Prospective certified-rules helpers consumed by the bounded Scope host.
export { RULES_CERTIFICATE_KIND, RULES_POLICY_VALUE_V11, rulesCertificateOpening, rulesCertificateBranchMatches } from "./rules-certificate.ts";
export { rulesPolicyProposalV11, rulesPolicyPatternsV11, type RulesPolicyV11 } from "./rules-policy-v11.ts";
export { RULES_TREE_PROOF, RULES_TREE_BOUNDS, verifyRulesTree, type RulesTreeBinding } from "./rules-policy-tree.ts";

export { rulesCertificateEvidenceValues } from "./destination-v14.ts";

export { rulesScopeV12, rulesScopeRulesV12, rulesAnswerV12, rulesObservedValuesV12 } from "./rules-scope-v12.ts";
export { rulesCertificateFamilyV15, rulesCertificateOpeningV15, rulesPublishedCertificateV15, rulesCertificateDeclineV15, rulesCertificateInterveningFactV15, readRulesCertificateDeclinedV15, RULES_CERTIFICATE_DECLINED_V15_MAX, type RulesCertificateDeclinedV15 } from "./rules-certificate-v15.ts";
export { certifiedPublicationStateV15, certifiedReservationSnapshotV15, certifiedPublicationBudgetV15, certifiedCaptureBudgetV15, certifiedFutureEnvelopeBytesV15, type CertifiedPublicationStateV15, type CertifiedReservationSnapshotV15, type CertifiedGenerationV15 } from "./destination-budget-v15.ts";

/** Explicit opt-in evidence cohort; global NEWEST remains unchanged. */
export { EVIDENCE_RULES_COHORT } from "./evidence-cohort.ts";
export { evidenceRulesRegister, evidenceRulesDirectory, evidenceRulesDirectoryRules } from "./evidence-cohort-data.ts";
export { rulesScopeV13, rulesScopeRulesV13, rulesAnswerV13, rulesObservedValuesV13 } from "./rules-scope-v13.ts";
export { RULES_POLICY_VALUE_V13, RULES_EXTENTS_VALUE_V13, RULES_POLICY_V13_DOMAIN, readRulesPolicyV13, rulesPolicyProposalV13, rulesPolicyPatternsV13, rulesPolicyCheckersV13 } from "./rules-policy-v13.ts";
export type { RulesCheckV13, RulesPolicyV13 } from "./rules-policy-v13.ts";
export { readRulesPolicyReplyV17 } from "./reservation-v17.ts";
export * from "./evidence.ts";
export { destinationV17, destinationRulesV17, destinationEvidenceJob, destinationEvidenceAdmissionCurrent, destinationEvidencePending, destinationEvidenceResultPending, destinationEvidenceNoticePending, destinationEvidenceProgressPending, evidenceFloorReferencesV17, WORK_COMMIT_PROOF_V17, EVIDENCE_ADMIT_V17 } from "./destination-v17.ts";
export type { EvidenceJobAdmissionV17 } from "./destination-v17.ts";
export { rulesCertificateFamilyV17, rulesCertificateOpeningV17, rulesPublishedCertificateV17, rulesCertificateDeclineV17, rulesCertificateInterveningFactV17, readRulesCertificateDeclinedV17, RULES_CERTIFICATE_DECLINED_V17_MAX } from "./rules-certificate-v17.ts";
export type { RulesCertificateDeclinedV17, RulesCertificateProvenanceV17 } from "./rules-certificate-v17.ts";

export { destinationPublishedChecksPending, destinationEvidenceFundingPending, destinationEvidencePlanPending } from "./destination-evidence-funding-v17.ts";
export { destinationEvidenceAuditPending } from "./destination-evidence-v17.ts";
export { evidenceIncidentAdmissionPositionV17, EVIDENCE_INCIDENT_PINS_V17 } from "./evidence-incident-origin-v17.ts";
export { readEvidenceBatchWireV17, type EvidenceBatchRecordV17 } from "./evidence-batch-v17.ts";
