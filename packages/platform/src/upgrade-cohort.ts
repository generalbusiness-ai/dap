/** The `upgrade` creation family of U1 (ruling D5 of 2026-11-17): the `base`
 * family with Rules 16, whose `upgrade-application` act moves an installation
 * to a new signed release. Register 29 creates Directory 28, and Directory 28
 * creates Rules 16. Membership 14, Destination 21 and Inbox 1 stay as in the
 * `base` family. The family is no creation default. */
export const UPGRADE_COHORT = Object.freeze({
  register: "platform:register@29", directory: "platform:directory@28", membership: "platform:membership@14",
  rules: "platform:rules@16", destination: "platform:destination@21", inbox: "platform:inbox@1",
} as const);
