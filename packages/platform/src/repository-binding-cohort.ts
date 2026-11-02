/** Opt-in later repository binding. Historical cohorts and defaults stay fixed. */
export const REPOSITORY_BINDING_COHORT = Object.freeze({
  register: "platform:register@25", directory: "platform:directory@24", membership: "platform:membership@11",
  rules: "platform:rules@10", destination: "platform:destination@18", inbox: "platform:inbox@1",
} as const);
