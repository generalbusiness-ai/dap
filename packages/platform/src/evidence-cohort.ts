/** Explicit evidence-rules cohort; historical families and defaults stay fixed. */
export const EVIDENCE_RULES_COHORT = Object.freeze({
  register: "platform:register@22", directory: "platform:directory@21",
  membership: "platform:membership@8", rules: "platform:rules@13",
  destination: "platform:destination@17", inbox: "platform:inbox@1",
} as const);
