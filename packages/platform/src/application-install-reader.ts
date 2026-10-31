import { EVIDENCE_RULES_COHORT as ERC } from "./evidence-cohort.ts";
import { DEVICE_APPLICATION_COHORT as D } from "./device-application-wire.ts";
/** Bounded native metadata for the trusted-package route. No application
 * item data, member credential, turn, outside call or inferred authority. */
import type { Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, isScopeRef } from "@generalbusiness/dap-bytes";
import type { StateView } from "@generalbusiness/dap-derive";
import type { ApplicationInstallation, ApplicationRoom } from "./application-codec/application.ts";
import { TRUSTED_APPLICATION_COHORT as C } from "./application-install-wire.ts";
import { DECLARED_APPLICATION_COHORT as C2 } from "./application-install-v2-wire.ts";
import { ARCHIVE_APPLICATION_COHORT as AC, ARCHIVE_DECLARED_APPLICATION_COHORT as AC2, ARCHIVE_DEVICE_APPLICATION_COHORT as ADC, ARCHIVE_DEVICE_PUBLICATION_COHORT as ADP, ARCHIVE_CERTIFIED_RULES_COHORT as ACR, HARDENED_CERTIFIED_RULES_COHORT as HCR } from "./archive-binding-wire.ts";
import { COMMONS_COHORT as CC } from "./commons-cohort.ts";
import { UNPUBLISHED_COHORT as U } from "./archive-binding-wire.ts";
export function applicationRoom(state: StateView, named: string): ApplicationRoom | null {
  const scope = state.scope();
  if ((named !== CC.directory && named !== U.directory && named !== C.directory && named !== C2.directory && named !== D.directory && named !== ADC.directory && named !== ADP.directory && named !== ERC.directory && named !== HCR.directory && named !== ACR.directory && named !== AC.directory && named !== AC2.directory) || scope?.status !== "active" || scope.at.kind !== "directory") return null;
  const rules = state.page("repository", ["open"], null, 1).items[0]?.refs["rules"];
  return isScopeRef(rules) && rules.kind === "rules" ? { directory: scope.at, rules } : null;
}
export function applicationInstallation(state: StateView, named: string, directory: ScopeRef, item: number): ApplicationInstallation | null {
  const scope = state.scope();
  if ((named !== CC.rules && named !== C.rules && named !== C2.rules && named !== D.rules && named !== ADC.rules && named !== ERC.rules && named !== HCR.rules && named !== ACR.rules && named !== AC.rules && named !== AC2.rules) || scope?.status !== "active" || scope.at.kind !== "rules" || !isScopeRef(directory) || directory.kind !== "directory"
    || !Number.isSafeInteger(item) || item < 0 || item > scope.head.seq) return null;
  const room = state.page("rules", ["current"], null, 1).items[0], job = state.item(item);
  if (!room || !isScopeRef(room.refs["directory"]) || canonicalize(room.refs["directory"]) !== canonicalize(directory) || job?.type !== "installation" || job.state !== "active") return null;
  const membership = job.refs["membership"], destination = job.refs["destination"], application = job.refs["scope"];
  if (!isScopeRef(membership) || membership.kind !== "membership" || membership.scope !== room.values["membership"] || !isScopeRef(destination)
    || destination.kind !== "destination" || !isScopeRef(application) || application.kind !== "lane"
    || !["definition", "release", "semantic", "presentation"].every(key => isDigest(job.values[key]))) return null;
  return { directory: room.refs["directory"], rules: scope.at, membership, destination, scope: application, item, definition: job.values["definition"] as Digest,
    ids: { release: job.values["release"] as Digest, semantic: job.values["semantic"] as Digest, presentation: job.values["presentation"] as Digest },
    membershipDefinition: named === CC.rules ? CC.membership : named === AC.rules || named === AC2.rules || named === ADC.rules || named === ACR.rules || named === HCR.rules || named === ERC.rules ? AC.membership : C.membership };
}
