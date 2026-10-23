/** Exact pins and bounded messages of the M1 install cohort. */
import { canonicalize, isRecord, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { isActions, type Role } from "./membership.ts";
export const APPLICATION_INSTALL_RULES = "platform:rules@5" as const;
export const TRUSTED_APPLICATION_COHORT = {
  register: "platform:register@12", directory: "platform:directory@11", membership: "platform:membership@7",
  rules: APPLICATION_INSTALL_RULES, destination: "platform:destination@7", inbox: "platform:inbox@1",
} as const;
export const INSTALL_ADDITIONS_BYTES = 48 * 1024;
export const INSTALL_ROLE_NAMES = ["admin", "maintainer", "member", "agent", "checker"] as const;
export type InstallAdditions = Readonly<Partial<Record<Role, readonly string[]>>>;
export function readInstallAdditions(raw: unknown): InstallAdditions | null {
  if (typeof raw !== "string" || raw.length > INSTALL_ADDITIONS_BYTES || utf8(raw).length > INSTALL_ADDITIONS_BYTES) return null;
  try {
    const parsed = parseStrict(raw);
    if (!isRecord(parsed) || canonicalize(parsed) !== raw || Object.keys(parsed).length > 5) return null;
    for (const [role, actions] of Object.entries(parsed)) {
      if (!(INSTALL_ROLE_NAMES as readonly string[]).includes(role) || !isActions(actions) || new Set(actions).size !== actions.length) return null;
    }
    return parsed as InstallAdditions;
  } catch { return null; }
}
export const installGrantFields = {
  job: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER, required: true },
  definition: { type: "digest", required: true }, release: { type: "digest", required: true }, semantic: { type: "digest", required: true },
  additions: { type: "text", max: INSTALL_ADDITIONS_BYTES, required: true },
} as const;

/** Existing detached-text inputs hold each declaration in native custody.
 * The host profile lowers individual declarations to the native text bound. */
export const INSTALL_DEFINITIONS = 17;
export const INSTALL_DEFINITION_BYTES = 64 * 1024;
export const INSTALL_SEMANTIC_BYTES = 256 * 1024;
export const installDefinitionTextFields = Object.fromEntries(Array.from({ length: INSTALL_DEFINITIONS }, (_, index) => [
  `definitionText${index}`, { type: "text" as const, max: INSTALL_DEFINITION_BYTES, detached: true as const, required: false },
]));
export const installDeclarationsType = { type: "list", max: INSTALL_DEFINITIONS, of: { type: "record", of: {
  name: { type: "text", max: 64, required: true }, digest: { type: "digest", required: true }, text: { type: "digest", required: true },
} } } as const;

/** Pure, bounded locator for declaration texts retained by a new native
 * install version. Historical versions expose no such locator. */
export function installDefinitionText(state: Pick<import("@generalbusiness/dap-derive").StateView, "page">, digest: import("@generalbusiness/dap-contract").Digest,
  itemType: "definition" | "application-catalog"): import("@generalbusiness/dap-contract").Digest | null {
  const states = itemType === "definition" ? ["active"] : ["retained"];
  for (const item of state.page(itemType, states, null, 16).items) {
    const list = item.values["declarations"];
    if (!Array.isArray(list) || list.length > INSTALL_DEFINITIONS) continue;
    for (const part of list) if (isRecord(part) && part["digest"] === digest && typeof part["text"] === "string" && /^sha256:[0-9a-f]{64}$/.test(part["text"])) return part["text"] as import("@generalbusiness/dap-contract").Digest;
  }
  return null;
}
