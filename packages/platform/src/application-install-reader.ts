/** Bounded native metadata for the trusted-package route. No application
 * item data, member credential, turn, outside call or inferred authority. */
import type { Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isScopeRef } from "@generalbusiness/artroom-bytes";
import type { StateView } from "@generalbusiness/dap-derive";
import type { ApplicationInstallation, ApplicationRoom } from "@generalbusiness/artroom-bytes/application";
import { TRUSTED_APPLICATION_COHORT as C } from "./application-install-wire.ts";
export function applicationRoom(state: StateView, named: string): ApplicationRoom | null {
  const scope = state.scope();
  if (named !== C.directory || scope?.status !== "active" || scope.at.kind !== "directory") return null;
  const rules = state.page("repository", ["open"], null, 1).items[0]?.refs["rules"];
  return isScopeRef(rules) && rules.kind === "rules" ? { directory: scope.at, rules } : null;
}
export function applicationInstallation(state: StateView, named: string, directory: ScopeRef, item: number): ApplicationInstallation | null {
  const scope = state.scope();
  if (named !== C.rules || scope?.status !== "active" || scope.at.kind !== "rules" || !isScopeRef(directory) || directory.kind !== "directory"
    || !Number.isSafeInteger(item) || item < 0 || item > scope.head.seq) return null;
  const room = state.page("rules", ["current"], null, 1).items[0], job = state.item(item);
  if (!room || canonicalize(room.refs["directory"]) !== canonicalize(directory) || job?.type !== "installation" || job.state !== "active") return null;
  const membership = job.refs["membership"], destination = job.refs["destination"], application = job.refs["scope"];
  if (!isScopeRef(membership) || membership.kind !== "membership" || membership.scope !== room.values["membership"] || !isScopeRef(destination)
    || destination.kind !== "destination" || !isScopeRef(application) || application.kind !== "lane"
    || !["definition", "release", "semantic", "presentation"].every(key => isDigest(job.values[key]))) return null;
  return { directory, rules: scope.at, membership, destination, scope: application, item, definition: job.values["definition"] as Digest,
    ids: { release: job.values["release"] as Digest, semantic: job.values["semantic"] as Digest, presentation: job.values["presentation"] as Digest } };
}
