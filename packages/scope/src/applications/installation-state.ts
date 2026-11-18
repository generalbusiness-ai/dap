/** AD-1: the current state and release of one installation item N. Act
 * admission in the scope that N owns reads it from Rules. The reply is a
 * closed record: no proof bytes, no item record and no member data. */
import type { Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { isDigest, isRecord, isScopeRef, same } from "@generalbusiness/dap-bytes";
import type { StateView } from "@generalbusiness/dap-derive";
import { UPGRADE_COHORT } from "@generalbusiness/dap-platform";

/** The Rules pins whose `upgrade-application` act changes N's release or
 * ends N as `replaced`. Under any other Rules pin, N never changes after
 * the scope's birth, so admission keeps its birth provenance and reads
 * nothing more. */
export const UPGRADABLE_RULES: readonly string[] = [UPGRADE_COHORT.rules];

export type InstallationState =
  | { readonly state: "replaced" }
  | { readonly state: "pending" | "active" | "refused"; readonly release: Digest };
export interface InstallationStateSource {
  read(rules: ScopeRef, directory: ScopeRef, item: number): Promise<InstallationState | null>;
}

const HELD = ["pending", "active", "refused"];

/** The receiver's reader. Null for any other Rules pin, incarnation,
 * Directory or item type. */
export function storedInstallationState(state: StateView, named: string | undefined, rules: unknown, directory: unknown, item: unknown): InstallationState | null {
  try {
    if (named === undefined || !UPGRADABLE_RULES.includes(named) || !isScopeRef(rules) || !isScopeRef(directory)
      || typeof item !== "number" || !Number.isSafeInteger(item) || item < 0) return null;
    const scope = state.scope();
    if (scope?.status !== "active" || scope.kind !== "rules" || !same(scope.at, rules) || item > scope.head.seq) return null;
    const room = state.page("rules", ["current"], null, 1).items[0], job = state.item(item);
    if (!room || !same(room.refs["directory"], directory) || job?.type !== "installation") return null;
    if (job.state === "replaced") return { state: "replaced" };
    const release = job.values["release"];
    return HELD.includes(job.state) && isDigest(release) ? { state: job.state as "pending" | "active" | "refused", release } : null;
  } catch { return null; }
}

/** The caller's check of the closed reply. */
export function readInstallationState(value: unknown): InstallationState | null {
  if (!isRecord(value) || typeof value["state"] !== "string") return null;
  const keys = Object.keys(value).sort().join(",");
  if (value["state"] === "replaced") return keys === "state" ? { state: "replaced" } : null;
  const release = value["release"];
  return HELD.includes(value["state"]) && keys === "release,state" && isDigest(release)
    ? { state: value["state"] as "pending" | "active" | "refused", release } : null;
}
