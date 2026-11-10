import { answersVersionQuestion, applicationAnnouncement } from "@generalbusiness/dap-platform";

/** A safe read of this Directory's own recorded child result. Its native
 * outcome sends the final install notice. No network or storage write here. */
import { canonicalize } from "@generalbusiness/dap-bytes";

import type { OutsideGiven } from "../object.ts";
import type { EffectRequest, Outside } from "../operations.ts";
export function applicationAnnouncementOutside(given: Pick<OutsideGiven, "state" | "own" | "scope">): Outside {
  const accepts: Outside["accepts"] = (owner, kind) => (answersVersionQuestion(owner, "scopeApplicationAnnouncementDirectory")) && kind === "announce-application";

  const read = async (request: EffectRequest) => {
    const current = given.scope();
    if (!current || !accepts(request.owner, request.kind) || request.attempt !== 1 || request.operation !== `${request.origin.entry.seq}:0`
      || canonicalize(current.at) !== canonicalize(request.scope)) return null;
    const body = applicationAnnouncement(given.state, given.own, request.operation);
    return body ? { result: "confirmed" as const, evidence: { basis: "read" as const, body } } : null;
  };
  return { accepts, send: read, recovery: { accepts, read } };
}
