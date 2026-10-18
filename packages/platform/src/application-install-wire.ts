/** Exact pins and bounded messages of the M1 install cohort. */
import { canonicalize, isRecord, parseStrict, utf8 } from "@generalbusiness/artroom-bytes";
import { isActions, type Role } from "./membership.ts";
export const APPLICATION_INSTALL_RULES = "platform:rules@5" as const;
export const TRUSTED_APPLICATION_COHORT = {
  register: "platform:register@12", directory: "platform:directory@11", membership: "platform:membership@7",
  rules: APPLICATION_INSTALL_RULES, destination: "platform:destination@4", inbox: "platform:inbox@1",
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
  release: { type: "digest", required: true }, semantic: { type: "digest", required: true },
  additions: { type: "text", max: INSTALL_ADDITIONS_BYTES, required: true },
} as const;
