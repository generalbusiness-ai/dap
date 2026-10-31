/** Explicit Commons creation family; historical pins keep their meanings. */
export const COMMONS_COHORT = Object.freeze({
  register: "platform:register@23", directory: "platform:directory@22",
  membership: "platform:membership@9", rules: "platform:rules@14",
  destination: "platform:destination@16", inbox: "platform:inbox@1",
  commons: "platform:commons@1",
} as const);
