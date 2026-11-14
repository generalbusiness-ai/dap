/** Exact relations between native pins. Each named consumer keeps its own
 * rows, ordering and defaults from the pre-edit BR13 inventory. */
import type { PlatformDefinition } from "@generalbusiness/dap-contract";
import { BASE_COHORT as BC } from "./base-cohort.ts";
import { FAILED_CLAIM_COHORT as FC } from "./failed-claim-cohort.ts";
import { OWN_AGENT_COHORT as OA } from "./own-agent-cohort.ts";
import { REPOSITORY_BINDING_COHORT as RB } from "./repository-binding-cohort.ts";
import { SEPARATE_RECOVERY_COHORT as SR } from "./separate-recovery-cohort.ts";
import { COMMONS_COHORT as CC } from "./commons-cohort.ts";
import { APPLICATION_COHORT, FILE_PUBLICATION_COHORT } from "./application.ts";
import { INVITATION_KEY_COHORT } from "./invitation-key.ts";
import { TRUSTED_APPLICATION_COHORT as TR } from "./application-install-wire.ts";
import { DECLARED_APPLICATION_COHORT as DA } from "./application-install-v2-wire.ts";
import { DEVICE_APPLICATION_COHORT as DV } from "./device-application-wire.ts";
import { ARCHIVE_APPLICATION_COHORT as AC, ARCHIVE_DECLARED_APPLICATION_COHORT as AC2,
  ARCHIVE_DEVICE_APPLICATION_COHORT as ADC, ARCHIVE_DEVICE_PUBLICATION_COHORT as ADP,
  ARCHIVE_CERTIFIED_RULES_COHORT as ACR, HARDENED_CERTIFIED_RULES_COHORT as HCR,
  UNPUBLISHED_COHORT as UN } from "./archive-binding-wire.ts";
import { DIRECTORY_OF } from "./register.ts";
import { SIBLINGS_OF } from "./directory.ts";
import { platform } from "./native-catalog.ts";
import { answersVersionQuestion } from "./version-questions.ts";

const CLIINVITATIONDIRECTORIESFORMEMBERSHIP_ROWS: Readonly<Record<string, readonly PlatformDefinition[]>> = {
  "platform:membership@2": ["platform:directory@3", "platform:directory@7"],
  "platform:membership@4": ["platform:directory@5", "platform:directory@8"],
  "platform:membership@5": ["platform:directory@6"],
  "platform:membership@6": ["platform:directory@9"],
  "platform:membership@7": ["platform:directory@11", "platform:directory@12", "platform:directory@15"],
  "platform:membership@8": ["platform:directory@13", "platform:directory@14", "platform:directory@16", "platform:directory@17", "platform:directory@18", "platform:directory@19", "platform:directory@20"],
  "platform:membership@9": ["platform:directory@22"],
  "platform:membership@10": ["platform:directory@23"],
  "platform:membership@11": ["platform:directory@24"],
  "platform:membership@12": ["platform:directory@25"],
  "platform:membership@13": ["platform:directory@26"],
  "platform:membership@14": ["platform:directory@27"],
};
export function cliInvitationDirectoriesForMembership(membership: unknown): readonly PlatformDefinition[] {
  return typeof membership === "string" && Object.hasOwn(CLIINVITATIONDIRECTORIESFORMEMBERSHIP_ROWS, membership) ? CLIINVITATIONDIRECTORIESFORMEMBERSHIP_ROWS[membership]! : [];
}

const VIEWSEVIDENCEDIRECTORYFORMEMBERSHIP_ROWS: Readonly<Record<string, readonly PlatformDefinition[]>> = {
  "platform:membership@8": ["platform:directory@16"],
  "platform:membership@9": ["platform:directory@22"],
  "platform:membership@12": ["platform:directory@25"],
  "platform:membership@14": ["platform:directory@27"],
};
export function viewsEvidenceDirectoryForMembership(membership: unknown): readonly PlatformDefinition[] {
  return typeof membership === "string" && Object.hasOwn(VIEWSEVIDENCEDIRECTORYFORMEMBERSHIP_ROWS, membership) ? VIEWSEVIDENCEDIRECTORYFORMEMBERSHIP_ROWS[membership]! : [];
}

const RELATION_TUPLES = {
  pageOpeningPartitionPair: [["platform:directory@10", "platform:directory-partition@1"]],
  pageRetainedOpeningPartitionPair: [["platform:directory@10", "platform:directory-partition@1"]],
  clientPartitionDirectoryPair: [["platform:directory@10", "platform:directory-partition@1"]],
  counterImportedCountingCohort: [["platform:directory@6", "platform:membership@5", "platform:rules@3", "platform:destination@2"]],
} as const satisfies Readonly<Record<string, readonly (readonly string[])[]>>;
export type BooleanVersionRelation = keyof typeof RELATION_TUPLES;
export function answersVersionRelation(question: BooleanVersionRelation, ...pins: readonly unknown[]): boolean {
  return (RELATION_TUPLES[question] as readonly (readonly string[])[]).some(row => row.length === pins.length && row.every((pin, index) => pin === pins[index]));
}

/** The retained Page factory asks for this exact declaration after root admission. */
export const pagePartitionOpeningDeclaration = (): "platform:directory-partition@1" => "platform:directory-partition@1";

export const CLI_INSTALL_REGISTERS = {
  base: BC.register, "failed-claim": FC.register, "repository-binding": RB.register, "own-agent": OA.register,
  "separate-recovery": SR.register, commons: CC.register, unpublished: UN.register,
  "invitation-key": INVITATION_KEY_COHORT.register, "file-publication": "platform:register@3",
  application: APPLICATION_COHORT.register, "application-publication": FILE_PUBLICATION_COHORT.register,
  "trusted-application": TR.register, "declared-application": DA.register,
  "archive-application": AC.register, "archive-declared-application": AC2.register,
  "archive-device-application": ADC.register, "archive-device-publication": ADP.register,
  "archive-certified-rules": ACR.register, "hardened-certified-rules": HCR.register,
  "device-application": DV.register,
} as const satisfies Readonly<Record<string, PlatformDefinition>>;
export const cliScopeIndexCreationCohorts = () => [
  { name: "base", pins: BC }, { name: "failed-claim", pins: FC }, { name: "archive-device-publication", pins: ADP },
  { name: "archive-device-application", pins: ADC }, { name: "application", pins: APPLICATION_COHORT },
  { name: "archive-certified-rules", pins: ACR }, { name: "hardened-certified-rules", pins: HCR },
  { name: "commons", pins: CC }, { name: "separate-recovery", pins: SR },
  { name: "repository-binding", pins: RB }, { name: "own-agent", pins: OA },
] as const;

/** Retain the existing platform-owned public tables and their object-key order. */
export const claimDirectoryDefinitionForRegister = (named: string): PlatformDefinition | undefined => DIRECTORY_OF[named];
export const claimSiblingDefinitionsForDirectory = (named: string): typeof SIBLINGS_OF[string] | undefined => SIBLINGS_OF[named];

const MEMBERSHIP_COPY_CONSUMERS: Readonly<Record<string, readonly string[]>> = {
  "platform:membership@8": ["platform:directory@16", "platform:directory@17", "platform:directory@18", "platform:directory@19", "platform:destination@12", "platform:destination@13", "platform:destination@14", "platform:destination@15", "platform:rules@10", "platform:rules@11", "platform:rules@12", "platform:register@20"],
  "platform:membership@12": ["platform:directory@25", "platform:rules@10", "platform:destination@19"],
  "platform:membership@14": ["platform:directory@27", "platform:rules@15", "platform:destination@21"],
};
export const allowsArchiveMembershipCopy = (source: string, consumer: string | undefined): boolean => consumer !== undefined
  && Object.hasOwn(MEMBERSHIP_COPY_CONSUMERS, source) && MEMBERSHIP_COPY_CONSUMERS[source]!.includes(consumer);

/** Lookup order and original cohort objects stay fixed for each purpose. */
const ARCHIVE_TARGET_COHORTS = [BC, FC, ADC, ADP, ACR, HCR] as const;
export const archiveTargetCohort = (directory: string) => ARCHIVE_TARGET_COHORTS.find(cohort => cohort.directory === directory) ?? null;
export const CREATION_LINEAGE_COHORTS = [BC, OA, FC, RB, SR, ADP, ADC, APPLICATION_COHORT, ACR, HCR, UN, CC] as const;
export const creationLineageCohort = (register: string) => CREATION_LINEAGE_COHORTS.find(cohort => cohort.register === register) ?? null;
const APPLICATION_ADMISSION_COHORTS = [BC, FC, SR, CC, TR, DA, DV, AC, AC2, ADC, OA, RB, ADP, ACR, HCR, UN] as const;
export const applicationAdmissionCohort = (directory: string) => APPLICATION_ADMISSION_COHORTS.find(cohort => cohort.directory === directory) ?? null;
const MCP_APPLICATION_ROOM_COHORTS = [BC, FC, SR, TR, DA, DV, AC, AC2, ADC, ADP, UN, RB, OA, CC] as const;
export const mcpApplicationRoomCohort = (directory: string) => MCP_APPLICATION_ROOM_COHORTS.find(cohort => cohort.directory === directory) ?? null;

const PARTITION_ROLES = {
  "platform:directory@10": "directory",
  "platform:directory-partition@1": "partition",
  "platform:membership@6": "membership",
  "platform:rules@3": "rules",
  "platform:destination@6": "destination",
  "platform:inbox@1": "inbox",
} as const;
export function partitionRole(pin: string): typeof PARTITION_ROLES[keyof typeof PARTITION_ROLES] | null {
  return Object.hasOwn(PARTITION_ROLES, pin) ? PARTITION_ROLES[pin as keyof typeof PARTITION_ROLES] : null;
}

/** Legacy anchors admit their pin without a kind check; newer anchors require it. */
export function scopeArchiveAnchorForeignSource(pin: string | undefined, kind: string): boolean {
  return pin === "platform:register@17" || pin === "platform:register@18" || pin === "platform:membership@8"
    || (pin === "platform:membership@12" || pin === "platform:membership@14") && kind === "membership"
    || (pin === "platform:register@19" || pin === "platform:register@20" || pin === "platform:register@26" || pin === "platform:register@28") && kind === "register";
}

/** Deployment policy retains its current ordered union and injection semantics. */
export const deploymentCreationDefaults = (): readonly PlatformDefinition[] => [...new Set([
  ...Object.values(BC), ...Object.values(FC), ...Object.values(ADP), ...Object.values(UN), ...Object.values(CC),
])];

/** Session birth lookup preserves SIBLINGS_OF order and shared child pins. */
export function authoritySessionBirthDirectories(kind: string, pin: string | undefined): readonly PlatformDefinition[] {
  if (kind === "commons" && answersVersionQuestion(pin, "authoritySessionBirthCommons")) return [CC.directory];
  if (kind !== "destination" && kind !== "rules") return [];
  return Object.keys(SIBLINGS_OF).filter(named => platform(named) && SIBLINGS_OF[named]![kind] === pin) as PlatformDefinition[];
}
