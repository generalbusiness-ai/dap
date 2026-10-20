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
export const archiveInstallPin = (pin: string): boolean => pin === ARCHIVE_APPLICATION_COHORT.rules || pin === ARCHIVE_DECLARED_APPLICATION_COHORT.rules || pin === ARCHIVE_DEVICE_APPLICATION_COHORT.rules;
