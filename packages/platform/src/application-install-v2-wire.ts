/** Explicit opt-in cohort for declared projections. Old cohorts and default
 * founding retain their pins; no version is selected by numeric comparison. */
export const DECLARED_APPLICATION_RULES = "platform:rules@6" as const;
export const DECLARED_APPLICATION_COHORT = Object.freeze({
  register: "platform:register@13", directory: "platform:directory@12", membership: "platform:membership@7",
  rules: DECLARED_APPLICATION_RULES, destination: "platform:destination@8", inbox: "platform:inbox@1",
} as const);
