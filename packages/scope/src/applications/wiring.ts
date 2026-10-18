/** Optional host configuration for the native M1 admission owner. No missing
 * or invalid setting becomes partial trust or an unbounded transport. */
import { PROPOSED_BOUNDS, type Bounds } from "@generalbusiness/dap-contract";
import type { Outside } from "../operations.ts";
import { readApplicationTrust } from "./admission.ts";
import type { ApplicationBindings } from "./bindings.ts";
import { ApplicationContentStore } from "./content.ts";
import { applicationHttpSource } from "./http-source.ts";
import { acceptsApplicationAdmission, applicationAdmissionRequest, applicationOutside } from "./outside.ts";
export function applicationHostOutside(env: ApplicationBindings, bounds: Bounds = PROPOSED_BOUNDS, send?: (request: Request) => Promise<Response>): Outside {
  const unavailable: Outside = { accepts: acceptsApplicationAdmission, send: async request => {
    const fields = applicationAdmissionRequest(request);
    return fields ? { result: "refused", evidence: { basis: "read", body: { ...fields, reason: "unsupported-host" } } } : null;
  } };
  unavailable.recovery = { accepts: unavailable.accepts, read: unavailable.send };
  try {
    const trust = readApplicationTrust(env.APPLICATION_TRUST);
    if (!env.APPLICATION_CONTENT) return unavailable;
    return applicationOutside({ trust, bounds, store: new ApplicationContentStore(env.APPLICATION_CONTENT, trust, bounds), open: applicationHttpSource(send) });
  } catch { return unavailable; }
}
