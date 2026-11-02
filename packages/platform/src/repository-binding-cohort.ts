/** Opt-in later repository binding. Historical cohorts and defaults stay fixed. */
export const REPOSITORY_BINDING_COHORT = Object.freeze({
  register: "platform:register@25", directory: "platform:directory@24", membership: "platform:membership@11",
  rules: "platform:rules@10", destination: "platform:destination@18", inbox: "platform:inbox@1",
} as const);

/** Native branch syntax, before the host adapter builds refs/heads/<branch>. */
export function repositoryBindingBranch(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 244
    && /^[A-Za-z0-9._/-]+$/.test(value) && !value.includes("..") && !value.endsWith(".")
    && value.split("/").every(part => part !== "" && !part.startsWith(".") && !part.startsWith("-") && !part.endsWith(".lock"));
}
