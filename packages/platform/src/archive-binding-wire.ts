/** Explicit archive cohorts. Existing pins keep their shipped meaning. */
export const ARCHIVE_APPLICATION_COHORT = Object.freeze({
  register: "platform:register@14", directory: "platform:directory@13", membership: "platform:membership@8",
  rules: "platform:rules@7", destination: "platform:destination@9", inbox: "platform:inbox@1",
} as const);
export const ARCHIVE_DECLARED_APPLICATION_COHORT = Object.freeze({
  register: "platform:register@15", directory: "platform:directory@14", membership: "platform:membership@8",
  rules: "platform:rules@8", destination: "platform:destination@10", inbox: "platform:inbox@1",
} as const);
/** Device grants and archive binding share this explicit new cohort only. */
export const ARCHIVE_DEVICE_APPLICATION_COHORT = Object.freeze({
  register: "platform:register@17", directory: "platform:directory@16", membership: "platform:membership@8",
  rules: "platform:rules@10", destination: "platform:destination@12", inbox: "platform:inbox@1",
} as const);
/** Corrected publication protocol in a separate draft cohort. Old pins keep
 * their original evaluators; version assignment and rollout require review. */
export const ARCHIVE_DEVICE_PUBLICATION_COHORT = Object.freeze({
  register: "platform:register@18", directory: "platform:directory@17", membership: "platform:membership@8",
  rules: "platform:rules@10", destination: "platform:destination@13", inbox: "platform:inbox@1",
} as const);
/** Certified rules are an explicit scheduled family, never an implicit default. */
export const ARCHIVE_CERTIFIED_RULES_COHORT = Object.freeze({
  register: "platform:register@19", directory: "platform:directory@18", membership: "platform:membership@8",
  rules: "platform:rules@11", destination: "platform:destination@14", inbox: "platform:inbox@1",
} as const);
/** Explicit hardened successor. Defaults and deployed creation policy stay fixed. */
export const HARDENED_CERTIFIED_RULES_COHORT = Object.freeze({
  register: "platform:register@20", directory: "platform:directory@19", membership: "platform:membership@8",
  rules: "platform:rules@12", destination: "platform:destination@15", inbox: "platform:inbox@1",
} as const);
/** Rooms may omit publication; historical cohorts retain their exact data. */
export const UNPUBLISHED_COHORT = Object.freeze({
  register: "platform:register@21", directory: "platform:directory@20", membership: "platform:membership@8",
  rules: "platform:rules@10", destination: "platform:destination@16", inbox: "platform:inbox@1",
} as const);
export const archiveInstallPin = (pin: string): boolean => pin === ARCHIVE_APPLICATION_COHORT.rules || pin === ARCHIVE_DECLARED_APPLICATION_COHORT.rules || pin === ARCHIVE_DEVICE_APPLICATION_COHORT.rules || pin === ARCHIVE_CERTIFIED_RULES_COHORT.rules || pin === HARDENED_CERTIFIED_RULES_COHORT.rules;
