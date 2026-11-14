/** The `base` creation family of CF-1 (ruling bccd8dd1): the default for every
 * host. Historical rooms keep their recorded pins. Inbox stays at version 1,
 * and the family pins no Commons. */
export const BASE_COHORT = Object.freeze({
  register: "platform:register@28", directory: "platform:directory@27", membership: "platform:membership@14",
  rules: "platform:rules@15", destination: "platform:destination@21", inbox: "platform:inbox@1",
} as const);
