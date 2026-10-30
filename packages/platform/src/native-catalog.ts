import { commonsRulesScope, commonsRules } from "./commons-rules.ts";
import { COMMONS_COHORT as CC } from "./commons-cohort.ts";
import { commons, commonsMembership } from "./commons.ts";
import { commonsRegister, commonsRegisterRules, commonsDirectoryData, commonsDirectoryRules, commonsMembershipData, commonsMembershipRules } from "./commons-cohort-data.ts";
import { EVIDENCE_RULES_COHORT as ERC } from "./evidence-cohort.ts";
import { evidenceRulesRegister, evidenceRulesDirectory, evidenceRulesDirectoryRules } from "./evidence-cohort-data.ts";
import { rulesScopeV13, rulesScopeRulesV13, rulesAnswerV13, rulesObservedValuesV13 } from "./rules-scope-v13.ts";
import { destinationV17, destinationRulesV17, evidenceFloorReferencesV17 } from "./destination-v17.ts";
import { evidenceRulesPublicationOrigin } from "./publishing-provenance.ts";
/** Native registry source; independent of generated declaration bytes. */
import { platformFloorReferences } from "./floor.ts";
import { TRUSTED_APPLICATION_COHORT, installDefinitionText } from "./application-install-wire.ts";
import { membership7, membershipRules7 } from "./application-install-grants.ts";
import { directory11, directoryRules11 } from "./application-install-creation.ts";
import { APPLICATION_INSTALL_RULES, applicationInstallRulesScope, applicationInstallRules } from "./application-install.ts";
import { DECLARED_APPLICATION_RULES, applicationInstallRulesScope2, applicationInstallRules2 } from "./application-install-v2.ts";
import { DECLARED_APPLICATION_COHORT } from "./application-install-v2-wire.ts";
import { ARCHIVE_APPLICATION_COHORT as AC, ARCHIVE_DECLARED_APPLICATION_COHORT as AC2, ARCHIVE_DEVICE_APPLICATION_COHORT as ADC, ARCHIVE_DEVICE_PUBLICATION_COHORT as ADP, ARCHIVE_CERTIFIED_RULES_COHORT as ACR, HARDENED_CERTIFIED_RULES_COHORT as HCR } from "./archive-binding-wire.ts";
import { archiveRegister, archiveDirectory, archiveDeclaredDirectory, archiveRulesScope, archiveDeclaredRulesScope, archiveDeviceDirectory, archiveDeviceRulesScope, archiveDeviceRules, archiveCertifiedRulesDirectory, archiveCertifiedRulesDirectoryRules, hardenedCertifiedRulesDirectory, hardenedCertifiedRulesDirectoryRules } from "./archive-binding.ts";
import { DEVICE_APPLICATION_COHORT } from "./device-application-wire.ts";
import { deviceApplicationRulesScope, deviceApplicationRules } from "./device-application-rules.ts";
import { deviceApplicationDirectory, deviceApplicationDirectoryRules } from "./device-application-directory.ts";
import { INVITATION_KEY_COHORT, directory9, directoryRules9, membership6, membershipRules6 } from "./invitation-key.ts";
import { APPLICATION_COHORT, FILE_PUBLICATION_COHORT, directory5, directory8, directoryRules5, directoryRules8 } from "./application.ts";
import { COUNTING_COHORT, directory6, directoryRules6 } from "./counting-cohort.ts";
import { PARTITION_COHORT, directory10, directoryRules10, directoryPartition1, directoryPartitionRules1 } from "./directory-partitions.ts";
import { PARTITION_IDENTITY_POLICY } from "./partition-provenance.ts";
import type { Digest, ObservationRequest, PlatformData } from "@generalbusiness/dap-contract";
import { sourceName, applicationPublicationOrigin, installedApplicationPublicationOrigin, declaredApplicationPublicationOrigin, archiveApplicationPublicationOrigin, archiveDeclaredApplicationPublicationOrigin, deviceApplicationPublicationOrigin, archiveDeviceApplicationPublicationOrigin, archiveDevicePublicationOrigin, archiveCertifiedRulesPublicationOrigin, hardenedCertifiedRulesPublicationOrigin } from "./publishing-provenance.ts";
import { destination, destination2, destination3, destination4, destination5, destination6, destinationMembership, destinationRules, destinationRules2, destinationRules3, destinationRules4, destinationRules5, destinationRules6, destinationRulesScope } from "./destination.ts";
import { destinationV14, destinationRulesV14 } from "./destination-v14.ts";
import { destinationV15, destinationRulesV15 } from "./destination-v15.ts";
import { rulesScopeV12, rulesScopeRulesV12, rulesAnswerV12, rulesObservedValuesV12 } from "./rules-scope-v12.ts";
import { rulesScopeV11, rulesScopeRulesV11, rulesAnswerV11, rulesObservedValuesV11 } from "./rules-scope-v11.ts";
import { inbox, inboxRules } from "./inbox.ts";
import { MEMBERSHIP, MEMBERSHIP_1, membership, membership5, membershipRules, standingOf } from "./membership.ts";
import { DEMO_REGISTER, WEB_DEMO_COHORT, WEB_DEMO_REGISTER, demoRegister, demoRegisterRules, webDemoRegister } from "./demo-register.ts";
import { register, registerRules } from "./register.ts";
import { directory, directory2, directory3, directory7, directoryMembership, directoryRules, directoryRulesScope } from "./directory.ts";
import { UNPUBLISHED_COHORT } from "./archive-binding-wire.ts";
import { unpublishedRegister, unpublishedRegisterRules } from "./unpublished-register.ts";
import { unpublishedDirectory, unpublishedDirectoryRules } from "./unpublished-directory.ts";
import { unpublishedDestination, unpublishedDestinationMembership, unpublishedDestinationRules, unpublishedDestinationRulesScope } from "./unpublished-destination.ts";
import { unpublishedApplicationPublicationOrigin } from "./publishing-provenance.ts";
import type { RecordedRef, Rules, StateView } from "@generalbusiness/dap-derive";

import { PUBLISH, RULES_SCOPE, RULES_SCOPE_1, rulesAnswer, rulesMembership, rulesObservedValues, rulesScope, rulesScope2, rulesScope3, rulesScope4, rulesScopeRules, rulesScopeRules3 } from "./rules-scope.ts";

export interface Platform {
  readonly data: PlatformData;
  readonly floorReferences?: import("@generalbusiness/dap-derive").PlatformRules["floorReferences"];
  /** Host-owned idempotent preparation; never generic mutation recovery. */
  readonly hostPreparationKinds?: readonly string[];
  /** This exact version locates a declaration in its retained native texts. */
  readonly declaredText?: (state: Pick<StateView, "page">, digest: Digest) => Digest | null;
  readonly rules: Rules;
  readonly sourceName?: typeof sourceName;
  readonly receiverIdentity?: typeof PARTITION_IDENTITY_POLICY;
  /** New destination admission/replay policy; old platform versions retain their original identities. */
  readonly applicationPublicationOrigin?: typeof applicationPublicationOrigin;
  /**
   * What a scope under this version answers to an observation read, from
   * its folded state at one head (authority note, section 3.3): a pure
   * function of the state and the request. It is code of the version, as
   * its rules are, so a replay derives the value of a retained observation
   * with it, from the observed scope's history at the recorded head (the
   * contract's section 16.1, "Replay"). Absent: a scope under this version
   * answers no observation.
   */
  readonly observed?: (state: StateView, asked: ObservationRequest) => unknown;
  /** Bounded values named by the observation, derived at the same head. The observation itself stays the replay's pure value. */
  readonly observedValues?: (state: StateView, asked: ObservationRequest) => readonly { domain: string; bytes: string }[];
  /**
   * The kind of the act whose position is the `revision` that an answer of
   * this version states (authority note, revision 28, section 12.1.4, "What
   * a replay derives"): for a rules scope, `publish`. A replay checks that
   * the revision of an answer at a head is the position of the last entry
   * of that kind at or before the head, or 0 where there is none. Absent:
   * an answer of this version states no revision.
   */
  readonly revised?: string;
  /**
   * Where a scope under this version records its membership reference,
   * when that is not its genesis entry (authority note, section 3.3, "Where
   * it records its membership reference"): a pure function of its folded
   * state. A replay reads the reference with it, as the production
   * authority does. Absent: the genesis entry holds it. A directory holds
   * it in a slot, with its incarnation. A rules scope and a destination
   * hold the scope ID, and no incarnation before their first retained
   * observation (section 12.1, decided in revision 25).
   */
  readonly membership?: (state: StateView) => RecordedRef | null;
  /**
   * Where a scope under this version records its rules reference: the
   * rules scope that it observes (the contract's section 16.1, guard 1). A
   * destination holds the scope ID in the value `branch.rules`, and no
   * incarnation before its first retained observation of the rules
   * (authority note, section 12.1, the same table). Absent: no text states
   * where a scope under this version records one.
   */
  readonly rulesScope?: (state: StateView) => RecordedRef | null;
}

/**
 * Every version of every platform definition that this package has
 * shipped, by its pinned name (the planner's decision of 2026-10-07: a
 * changed definition carries a new version, and a scope is judged and
 * replayed by the version that its genesis pinned, for as long as it
 * exists). Version 1 here preserves actual main1eed91aa's supported data,
 * including the definition-byte places gate1 shipped. This table does not
 * establish original historical admission/source chronology. Version 2 of
 * the register, directory, membership, rules and destination keeps the I5
 * child cohort, version-named observations, the destination's read-token
 * and its role row, and a creation commit with a README. The inbox has
 * one version. A version that is not listed here is one that this package
 * cannot run.
 */
const VERSION_DATA: Readonly<Record<string, Platform>> = {
  [CC.register]: { data: commonsRegister, rules: commonsRegisterRules },
  [CC.directory]: { data: commonsDirectoryData, rules: commonsDirectoryRules, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [CC.membership]: { data: commonsMembershipData, rules: commonsMembershipRules, observed: (state, asked) => standingOf(state, asked, CC.membership) },
  [CC.rules]: { data: commonsRulesScope, rules: commonsRules, hostPreparationKinds: ["fetch-application"], declaredText: (state, digest) => installDefinitionText(state, digest, "definition"), observed: (state, asked) => rulesAnswer(state, asked, CC.rules), observedValues: rulesObservedValues, revised: PUBLISH, membership: rulesMembership },
  [CC.commons]: { data: commons, rules: {}, membership: commonsMembership },
  [ERC.register]: { data: evidenceRulesRegister, rules: registerRules },
  [ERC.directory]: { data: evidenceRulesDirectory, rules: evidenceRulesDirectoryRules, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [ERC.rules]: { data: rulesScopeV13, rules: rulesScopeRulesV13, hostPreparationKinds: ["fetch-application"], declaredText: (state, digest) => installDefinitionText(state, digest, "definition"), observed: rulesAnswerV13, observedValues: rulesObservedValuesV13, revised: PUBLISH, membership: rulesMembership },
  [ERC.destination]: { data: destinationV17, rules: destinationRulesV17, floorReferences: evidenceFloorReferencesV17, membership: destinationMembership, rulesScope: destinationRulesScope, applicationPublicationOrigin: evidenceRulesPublicationOrigin },
  [UNPUBLISHED_COHORT.register]: { data: unpublishedRegister, rules: unpublishedRegisterRules },
  [UNPUBLISHED_COHORT.directory]: { data: unpublishedDirectory, rules: unpublishedDirectoryRules, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [UNPUBLISHED_COHORT.destination]: { data: unpublishedDestination, rules: unpublishedDestinationRules, membership: unpublishedDestinationMembership, rulesScope: unpublishedDestinationRulesScope, applicationPublicationOrigin: unpublishedApplicationPublicationOrigin },
  [HCR.register]: { data: archiveRegister, rules: registerRules },
  [HCR.directory]: { data: hardenedCertifiedRulesDirectory, rules: hardenedCertifiedRulesDirectoryRules, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [HCR.rules]: { data: rulesScopeV12, rules: rulesScopeRulesV12, hostPreparationKinds: ["fetch-application"], declaredText: (state, digest) => installDefinitionText(state, digest, "definition"), observed: rulesAnswerV12, observedValues: rulesObservedValuesV12, revised: PUBLISH, membership: rulesMembership },
  [HCR.destination]: { data: destinationV15, rules: destinationRulesV15, membership: destinationMembership, rulesScope: destinationRulesScope, applicationPublicationOrigin: hardenedCertifiedRulesPublicationOrigin },
  [ACR.register]: { data: archiveRegister, rules: registerRules },
  [ACR.directory]: { data: archiveCertifiedRulesDirectory, rules: archiveCertifiedRulesDirectoryRules, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [ACR.rules]: { data: rulesScopeV11, rules: rulesScopeRulesV11, hostPreparationKinds: ["fetch-application"], declaredText: (state, digest) => installDefinitionText(state, digest, "definition"), observed: rulesAnswerV11, observedValues: rulesObservedValuesV11, revised: PUBLISH, membership: rulesMembership },
  [ACR.destination]: { data: destinationV14, rules: destinationRulesV14, membership: destinationMembership, rulesScope: destinationRulesScope, applicationPublicationOrigin: archiveCertifiedRulesPublicationOrigin },
  [ADP.register]: { data: archiveRegister, rules: registerRules },
  [ADP.directory]: { data: archiveDeviceDirectory, rules: deviceApplicationDirectoryRules, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [ADP.destination]: { data: destination4, rules: destinationRules4, membership: destinationMembership, rulesScope: destinationRulesScope, applicationPublicationOrigin: archiveDevicePublicationOrigin },
  [AC.register]: { data: archiveRegister, rules: registerRules },
  [AC2.register]: { data: archiveRegister, rules: registerRules },
  [AC.directory]: { data: archiveDirectory, rules: directoryRules11, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [AC2.directory]: { data: archiveDeclaredDirectory, rules: directoryRules11, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [AC.membership]: { data: membership7, rules: membershipRules7, observed: (state, asked) => standingOf(state, asked, AC.membership) },
  [AC.rules]: { data: archiveRulesScope, rules: applicationInstallRules, hostPreparationKinds: ["fetch-application"], declaredText: (state, digest) => installDefinitionText(state, digest, "definition"), observed: (state, asked) => rulesAnswer(state, asked, AC.rules), observedValues: rulesObservedValues, revised: PUBLISH, membership: rulesMembership },
  [AC2.rules]: { data: archiveDeclaredRulesScope, rules: applicationInstallRules2, hostPreparationKinds: ["fetch-application"], declaredText: (state, digest) => installDefinitionText(state, digest, "definition"), observed: (state, asked) => rulesAnswer(state, asked, AC2.rules), observedValues: rulesObservedValues, revised: PUBLISH, membership: rulesMembership },
  [AC.destination]: { data: destination4, rules: destinationRules4, membership: destinationMembership, rulesScope: destinationRulesScope, applicationPublicationOrigin: archiveApplicationPublicationOrigin },
  [AC2.destination]: { data: destination4, rules: destinationRules4, membership: destinationMembership, rulesScope: destinationRulesScope, applicationPublicationOrigin: archiveDeclaredApplicationPublicationOrigin },
  [ADC.register]: { data: archiveRegister, rules: registerRules },
  [ADC.directory]: { data: archiveDeviceDirectory, rules: deviceApplicationDirectoryRules, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [ADC.rules]: { data: archiveDeviceRulesScope, rules: archiveDeviceRules, hostPreparationKinds: ["fetch-application"], declaredText: (state, digest) => installDefinitionText(state, digest, "definition"), observed: (state, asked) => rulesAnswer(state, asked, ADC.rules), observedValues: rulesObservedValues, revised: PUBLISH, membership: rulesMembership },
  [ADC.destination]: { data: destination4, rules: destinationRules4, membership: destinationMembership, rulesScope: destinationRulesScope, applicationPublicationOrigin: archiveDeviceApplicationPublicationOrigin },
  [DEVICE_APPLICATION_COHORT.register]: { data: register, rules: registerRules },
  [DEVICE_APPLICATION_COHORT.directory]: { data: deviceApplicationDirectory, rules: deviceApplicationDirectoryRules, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [DEVICE_APPLICATION_COHORT.destination]: { data: destination4, rules: destinationRules4, membership: destinationMembership, rulesScope: destinationRulesScope, applicationPublicationOrigin: deviceApplicationPublicationOrigin },
  [DEVICE_APPLICATION_COHORT.rules]: { data: deviceApplicationRulesScope, rules: deviceApplicationRules, hostPreparationKinds: ["fetch-application"], declaredText: (state, digest) => installDefinitionText(state, digest, "definition"), observed: (state, asked) => rulesAnswer(state, asked, DEVICE_APPLICATION_COHORT.rules), observedValues: rulesObservedValues, revised: PUBLISH, membership: rulesMembership },
  [DECLARED_APPLICATION_COHORT.register]: { data: register, rules: registerRules },
  [DECLARED_APPLICATION_COHORT.directory]: { data: directory11, rules: directoryRules11, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [DECLARED_APPLICATION_COHORT.destination]: { data: destination4, rules: destinationRules4, membership: destinationMembership, rulesScope: destinationRulesScope, applicationPublicationOrigin: declaredApplicationPublicationOrigin },
  [DECLARED_APPLICATION_RULES]: { data: applicationInstallRulesScope2, rules: applicationInstallRules2, hostPreparationKinds: ["fetch-application"], declaredText: (state, digest) => installDefinitionText(state, digest, "definition"), observed: (state, asked) => rulesAnswer(state, asked, DECLARED_APPLICATION_RULES), observedValues: rulesObservedValues, revised: PUBLISH, membership: rulesMembership },
  [TRUSTED_APPLICATION_COHORT.destination]: { data: destination4, rules: destinationRules4, membership: destinationMembership, rulesScope: destinationRulesScope, applicationPublicationOrigin: installedApplicationPublicationOrigin },
  [TRUSTED_APPLICATION_COHORT.register]: { data: register, rules: registerRules },
  [TRUSTED_APPLICATION_COHORT.directory]: { data: directory11, rules: directoryRules11, declaredText: (state, digest) => installDefinitionText(state, digest, "application-catalog"), membership: directoryMembership, rulesScope: directoryRulesScope },
  [TRUSTED_APPLICATION_COHORT.membership]: { data: membership7, rules: membershipRules7, observed: (state, asked) => standingOf(state, asked, TRUSTED_APPLICATION_COHORT.membership) },
  [PARTITION_COHORT.register]: { data: register, rules: registerRules },
  [PARTITION_COHORT.directory]: { data: directory10, rules: directoryRules10, membership: directoryMembership, rulesScope: directoryRulesScope },
  [PARTITION_COHORT.partition]: { data: directoryPartition1, rules: directoryPartitionRules1, membership: directoryMembership, rulesScope: directoryRulesScope },
  [PARTITION_COHORT.destination]: { data: destination6, rules: destinationRules6, membership: destinationMembership, rulesScope: destinationRulesScope },
  [INVITATION_KEY_COHORT.register]: { data: register, rules: registerRules },
  [INVITATION_KEY_COHORT.directory]: { data: directory9, rules: directoryRules9, membership: directoryMembership, rulesScope: directoryRulesScope },
  [INVITATION_KEY_COHORT.membership]: { data: membership6, rules: membershipRules6, observed: (state, asked) => standingOf(state, asked, INVITATION_KEY_COHORT.membership) },
  [DEMO_REGISTER]: { data: demoRegister, rules: demoRegisterRules },
  [WEB_DEMO_REGISTER]: { data: webDemoRegister, rules: demoRegisterRules },
  [WEB_DEMO_COHORT.directory]: { data: directory7, rules: directoryRules, membership: directoryMembership, rulesScope: directoryRulesScope },
  "platform:inbox@1": { data: inbox, rules: inboxRules },
  [FILE_PUBLICATION_COHORT.destination]: { data: destination4, rules: destinationRules4, membership: destinationMembership, rulesScope: destinationRulesScope, applicationPublicationOrigin },
  [FILE_PUBLICATION_COHORT.register]: { data: register, rules: registerRules },
  [FILE_PUBLICATION_COHORT.directory]: { data: directory8, rules: directoryRules8, membership: directoryMembership, rulesScope: directoryRulesScope },
  [APPLICATION_COHORT.register]: { data: register, rules: registerRules },
  [APPLICATION_COHORT.directory]: { data: directory5, rules: directoryRules5, membership: directoryMembership, rulesScope: directoryRulesScope },
  [APPLICATION_COHORT.membership]: { data: membership, rules: membershipRules, observed: (state, asked) => standingOf(state, asked, APPLICATION_COHORT.membership) },
  [APPLICATION_COHORT.rules]: { data: rulesScope3, rules: rulesScopeRules3, observed: (state, asked) => rulesAnswer(state, asked, APPLICATION_COHORT.rules), observedValues: rulesObservedValues, revised: PUBLISH, membership: rulesMembership },
  [COUNTING_COHORT.register]: { data: register, rules: registerRules },
  [COUNTING_COHORT.directory]: { data: directory6, rules: directoryRules6, membership: directoryMembership, rulesScope: directoryRulesScope },
  [COUNTING_COHORT.membership]: { data: membership5, rules: membershipRules, observed: (state, asked) => standingOf(state, asked, COUNTING_COHORT.membership) },
  "platform:register@1": { data: register, rules: registerRules },
  "platform:register@2": { data: register, rules: registerRules },
  "platform:register@3": { data: register, rules: registerRules },
  "platform:directory@1": { data: directory, rules: directoryRules, membership: directoryMembership, rulesScope: directoryRulesScope },
  "platform:directory@2": { data: directory2, rules: directoryRules, membership: directoryMembership, rulesScope: directoryRulesScope },
  "platform:directory@3": { data: directory3, rules: directoryRules, membership: directoryMembership, rulesScope: directoryRulesScope },
  "platform:membership@1": { data: membership, rules: membershipRules, observed: (state, asked) => standingOf(state, asked, MEMBERSHIP_1) },
  "platform:membership@2": { data: membership, rules: membershipRules, observed: (state, asked) => standingOf(state, asked, MEMBERSHIP) },
  "platform:rules@1": { data: rulesScope, rules: rulesScopeRules, observed: (state, asked) => rulesAnswer(state, asked, RULES_SCOPE_1), observedValues: rulesObservedValues, revised: PUBLISH, membership: rulesMembership },
  "platform:rules@2": { data: rulesScope2, rules: rulesScopeRules, observed: (state, asked) => rulesAnswer(state, asked, RULES_SCOPE), observedValues: rulesObservedValues, revised: PUBLISH, membership: rulesMembership },
  [APPLICATION_INSTALL_RULES]: { data: applicationInstallRulesScope, rules: applicationInstallRules, hostPreparationKinds: ["fetch-application"], declaredText: (state, digest) => installDefinitionText(state, digest, "definition"), observed: (state, asked) => rulesAnswer(state, asked, APPLICATION_INSTALL_RULES), observedValues: rulesObservedValues, revised: PUBLISH, membership: rulesMembership },
  "platform:rules@4": { data: rulesScope4, rules: rulesScopeRules3, observed: (state, asked) => rulesAnswer(state, asked, "platform:rules@4"), observedValues: rulesObservedValues, revised: PUBLISH, membership: rulesMembership },
  "platform:destination@1": { data: destination, rules: destinationRules, membership: destinationMembership, rulesScope: destinationRulesScope },
  "platform:destination@2": { data: destination2, rules: destinationRules2, membership: destinationMembership, rulesScope: destinationRulesScope },
  "platform:destination@3": { data: destination3, rules: destinationRules3, membership: destinationMembership, rulesScope: destinationRulesScope },
  "platform:destination@5": { data: destination5, rules: destinationRules5, membership: destinationMembership, rulesScope: destinationRulesScope },
};

/** Stable native code objects with the same source policy for runtime and replay. */
export const VERSIONS: Readonly<Record<string, Platform>> = Object.fromEntries(Object.entries(VERSION_DATA).map(([named, code]) => [named, { ...code, sourceName, receiverIdentity: PARTITION_IDENTITY_POLICY, floorReferences: code.floorReferences ?? platformFloorReferences }]));

/**
 * The definition that a platform name and version pin (the contract's
 * section 6.1), such as `platform:inbox@1` or `platform:destination@2`.
 * Null: this package holds no definition of that name and version.
 */
export function platform(named: string): Platform | null {
  return Object.hasOwn(VERSIONS, named) ? VERSIONS[named]! : null;
}
