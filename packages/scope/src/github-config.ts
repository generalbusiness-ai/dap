/**
 * The nonsecret GitHub host configuration, `GITHUB_APP_CONFIG`. This module
 * holds only the parser, so that register selection and the CLI read the
 * same rule without the Worker's GitHub wiring.
 */
import type { ScopeId } from "@generalbusiness/dap-contract";
import { isRecord, isScopeId, parseStrict } from "@generalbusiness/dap-bytes";
import type { GitHubAccount } from "@generalbusiness/dap-git/github";
import { exact } from "./host-wiring.ts";

export interface GitHubConfiguration {
  issuer: string; installationId: number; account: GitHubAccount; maxBytes: number;
  /** Pins host authority only. Installation authorization (N5) remains unimplemented. */
  registerScope: ScopeId;
  privateRepositories: boolean; publicReads: boolean; credentialIdentity: "adapter-attempt";
  /** Opt-in private reads with one-repository, read-only installation tokens. */
  installationReads?: true;
}
export const positive = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
/** The same nonsecret host selector used by the production wiring. */
export function gitHubRegisterScope(raw: unknown): ScopeId | null {
  try { return gitHubConfiguration(raw)?.registerScope ?? null; }
  catch { return null; }
}
export function gitHubConfiguration(raw: unknown): GitHubConfiguration | null {
  if (typeof raw !== "string" || !raw || raw.length > 4096) return null;
  let value: ReturnType<typeof exact>;
  try {
    const parsed = parseStrict(raw);
    value = exact(parsed, ["issuer", "installationId", "account", "maxBytes", "registerScope", "privateRepositories", "publicReads", "credentialIdentity",
      ...(isRecord(parsed) && Object.hasOwn(parsed, "installationReads") ? ["installationReads"] : [])]);
  } catch { return null; }
  const account = exact(value?.["account"], ["id", "login", "type"]);
  if (!value || !account || typeof value["issuer"] !== "string" || !/^[A-Za-z0-9_.-]{1,128}$/.test(value["issuer"]) || !positive(value["installationId"]) || !isScopeId(value["registerScope"]) || !positive(account["id"]) || typeof account["login"] !== "string" || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(account["login"]) || (account["type"] !== "User" && account["type"] !== "Organization") || !positive(value["maxBytes"]) || value["maxBytes"] < 32 || typeof value["privateRepositories"] !== "boolean" || typeof value["publicReads"] !== "boolean" || value["credentialIdentity"] !== "adapter-attempt" || (value["privateRepositories"] && value["publicReads"])) return null;
  if (Object.hasOwn(value, "installationReads") && (value["installationReads"] !== true || value["privateRepositories"] !== true || value["publicReads"] !== false)) return null;
  return value as unknown as GitHubConfiguration;
}
