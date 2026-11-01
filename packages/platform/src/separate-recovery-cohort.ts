/** Explicit cohort whose creation keeps the founder key and the recovery key apart.
 * Existing pins, defaults and deployed creation policy stay fixed. */
export const SEPARATE_RECOVERY_COHORT = Object.freeze({
  register: "platform:register@24", directory: "platform:directory@23", membership: "platform:membership@10",
  rules: "platform:rules@10", destination: "platform:destination@13", inbox: "platform:inbox@1",
} as const);
