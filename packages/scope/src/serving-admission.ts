/** One deployment's serving action. A rate result is never native authority. */
import type { SignedIntent } from "@generalbusiness/dap-contract";
import { isSignedIntentShape, parseStrict, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { applicationJson } from "@generalbusiness/dap-bytes/application";
import { signedReadForLimits } from "./signed-reads.ts";
import { SCOPE_INDEX_NAME, type ScopeIndexEnvironment } from "./scope-index.ts";
import { ServingLimits, servingLimitConfig, type ServingLimitSettings } from "./serving-limits.ts";
import { addressKey } from "./limits.ts";

export type ServingRequest = { kind: "creation"; signed: unknown } | { kind: "signed-read"; reader: unknown };
export type ServingDecision = "admitted" | "invalid" | "rate-limited" | "unavailable";
export interface ServingEnvironment extends ScopeIndexEnvironment, ServingLimitSettings {}
interface ServingPort { admitServing(request: ServingRequest, address: string | null): Promise<ServingDecision> }
export const SERVING_CREATION_BYTES = 1024 * 1024;

/** Bound and own the RPC value before serialization or a target is addressed.
 * Plain RPC data is assumed; this is not a hostile-Proxy allocation proof. */
export function boundedParentlessIntent(supplied: unknown): SignedIntent | null {
  try {
    const value: unknown = parseStrict(applicationJson(supplied, SERVING_CREATION_BYTES));
    return isSignedIntentShape(value) && value.intent.to === null ? value : null;
  } catch { return null; }
}

/** Owned only by the fixed index object; the settings come from its env,
 * never from an admission caller. has()/registration do not call this code. */
export class ServingAdmission {
  readonly #limits: ServingLimits | null;
  constructor(settings: ServingLimitSettings) {
    const config = servingLimitConfig(settings);
    this.#limits = config ? new ServingLimits(config) : null;
  }
  admit(request: ServingRequest, address: string | null, now: number): ServingDecision {
    if (!this.#limits) return "unavailable";
    if (typeof address !== "string" && address !== null) return "invalid";
    const hasAddress = addressKey(address) !== null;
    if (request?.kind === "creation") {
      const signed = boundedParentlessIntent(request.signed);
      if (!signed) return "invalid";
      const verified = verifySignedIntent(signed);
      const fits = this.#limits.account("creation", verified ? signed.intent.actor : null, address, now);
      return !fits && (verified || hasAddress) ? "rate-limited" : verified ? "admitted" : "invalid";
    }
    if (request?.kind === "signed-read") {
      const signed = signedReadForLimits(request.reader);
      if (!signed) return "invalid";
      const fits = this.#limits.account("signed-read", signed.verified ? signed.actor : null, address, now);
      return !fits && (signed.verified || hasAddress) ? "rate-limited" : signed.verified ? "admitted" : "invalid";
    }
    return "invalid";
  }
}

/** Shared HTTP/service/hosted ingress. Only the fixed object's serving method
 * is addressed here, never the proposed target or a proof/index lookup. */
export async function admitServing(env: ServingEnvironment, request: ServingRequest, address: string | null): Promise<ServingDecision> {
  if (!env.SCOPE_INDEX) return "unavailable";
  try {
    const port = env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(SCOPE_INDEX_NAME)) as ServingPort;
    const decision = await port.admitServing(request, address);
    return ["admitted", "invalid", "rate-limited", "unavailable"].includes(decision) ? decision : "unavailable";
  } catch { return "unavailable"; }
}
