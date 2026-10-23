/** A safe read of this Directory's own recorded child result. Its native
 * outcome sends the final install notice. No network or storage write here. */
import { canonicalize } from "@generalbusiness/dap-bytes";
import { APPLICATION_ANNOUNCEMENT_OWNER, DECLARED_APPLICATION_COHORT, ARCHIVE_APPLICATION_COHORT as AC, ARCHIVE_DECLARED_APPLICATION_COHORT as AC2, applicationAnnouncement, DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import type { OutsideGiven } from "../object.ts";
import type { EffectRequest, Outside } from "../operations.ts";
export function applicationAnnouncementOutside(given: Pick<OutsideGiven, "state" | "own" | "scope">): Outside {
  const accepts: Outside["accepts"] = (owner, kind) => (owner === APPLICATION_ANNOUNCEMENT_OWNER || owner === DECLARED_APPLICATION_COHORT.directory || owner === DEVICE_APPLICATION_COHORT.directory || owner === AC.directory || owner === AC2.directory || owner === ARCHIVE_DEVICE_APPLICATION_COHORT.directory) && kind === "announce-application";
  const read = async (request: EffectRequest) => {
    const current = given.scope();
    if (!current || !accepts(request.owner, request.kind) || request.attempt !== 1 || request.operation !== `${request.origin.entry.seq}:0`
      || canonicalize(current.at) !== canonicalize(request.scope)) return null;
    const body = applicationAnnouncement(given.state, given.own, request.operation);
    return body ? { result: "confirmed" as const, evidence: { basis: "read" as const, body } } : null;
  };
  return { accepts, send: read, recovery: { accepts, read } };
}
