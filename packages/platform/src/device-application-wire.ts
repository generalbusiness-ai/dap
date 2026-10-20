/** Reserved G5a pins; S2a's lower unpublished reservations remain untouched. */
export const DEVICE_APPLICATION_COHORT = Object.freeze({
  register: "platform:register@16", directory: "platform:directory@15", membership: "platform:membership@7",
  rules: "platform:rules@9", destination: "platform:destination@11", inbox: "platform:inbox@1",
} as const);
export const DEVICE_GRANT_BYTES = 4096;
export const DEVICE_GENESIS_BYTES = 20 * 1024;
