/** One deployment's serving action. A rate result is never native authority. */
import type { SignedIntent } from "@generalbusiness/dap-contract";
import { isSignedIntentShape, parseStrict, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { applicationJson } from "@generalbusiness/dap-platform/application";
import { signedReadForLimits } from "./signed-reads.ts";
import { SCOPE_INDEX_NAME, type ScopeIndexEnvironment } from "./scope-index.ts";
import { ServingLimits, servingLimitConfig, type ServingLimitSettings, type ServingOverflowReservation } from "./serving-limits.ts";
import { addressKey } from "./limits.ts";
import { SiteReadWindow, siteReadAddressKey } from "./site/window.ts";

export type ServingRequest = { kind: "creation" | "found"; signed: unknown; overflowReservation?: ServingOverflowReservation } | { kind: "signed-read"; reader: unknown } | { kind: "site-read" };
export type ServingDecision = "admitted" | "invalid" | "rate-limited" | "unavailable";
export interface ServingEnvironment extends ScopeIndexEnvironment, ServingLimitSettings {}
interface ServingPort { admitServing(request: ServingRequest, address: string | null): Promise<ServingDecision> }
export interface CreationAddressReservation { readonly decision: ServingDecision; readonly overflow: ServingOverflowReservation | null }
export const SERVING_CREATION_BYTES = 1024 * 1024;

/** Bound and own the RPC value before serialization or a target is addressed.
 * Plain RPC data is assumed; this is not a hostile-Proxy allocation proof. */
export function boundedParentlessIntent(supplied: unknown): SignedIntent | null {
  const value = boundedServingIntent(supplied);
  return value?.intent.to === null ? value : null;
}
export function boundedServingIntent(supplied: unknown): SignedIntent | null {
  try {
    const value: unknown = parseStrict(applicationJson(supplied, SERVING_CREATION_BYTES));
    return isSignedIntentShape(value) ? value : null;
  } catch { return null; }
}

/** Owned only by the fixed index object; the settings come from its env,
 * never from an admission caller. has()/registration do not call this code. */
export class ServingAdmission {
  readonly #limits: ServingLimits | null;
  readonly #site = new SiteReadWindow();
  constructor(settings: ServingLimitSettings) {
    const config = servingLimitConfig(settings);
    this.#limits = config ? new ServingLimits(config) : null;
  }
  creationAddress(address: string | null, now: number): CreationAddressReservation {
    if (!this.#limits) return { decision: "unavailable", overflow: null };
    if (typeof address !== "string") return { decision: "invalid", overflow: null };
    const result = this.#limits.creationAddress(address, now);
    return { decision: result.admitted ? "admitted" : "rate-limited", overflow: result.overflow };
  }
  admit(request: ServingRequest, address: string | null, now: number): ServingDecision {
    if (request?.kind === "site-read") return this.#site.admit(address, now) ? "admitted" : "rate-limited";
    if (!this.#limits) return "unavailable";
    if (typeof address !== "string" && address !== null) return "invalid";
    const hasAddress = addressKey(address) !== null;
    if (request?.kind === "creation" || request?.kind === "found") {
      const signed = request.kind === "creation" ? boundedParentlessIntent(request.signed) : boundedServingIntent(request.signed);
      if (!signed) return "invalid";
      if (request.kind === "found" && signed.intent.kind !== "found") return "invalid";
      const verified = verifySignedIntent(signed);
      const fits = this.#limits.account(request.kind, verified ? signed.intent.actor : null, address, now, request.kind === "creation" ? request.overflowReservation ?? null : null);
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

/** Reserve the address before reading a creation body. The later verified
 * creation uses a null address, so each ingress attempt charges it once. */
export async function admitCreationAddress(env: ServingEnvironment, address: string | null): Promise<CreationAddressReservation> {
  if (address === null) return { decision: "admitted", overflow: null };
  if (!env.SCOPE_INDEX) return { decision: "unavailable", overflow: null };
  try {
    const port = env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(SCOPE_INDEX_NAME)) as { creationAddress(address: string): Promise<CreationAddressReservation> };
    const result = await port.creationAddress(address);
    const overflow = result?.overflow;
    const token = (value: unknown): boolean => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
    const validOverflow = overflow === null || typeof overflow === "object" && overflow !== null
      && Object.keys(overflow).sort().join() === "owner,window" && token(overflow.owner) && token(overflow.window);
    return result && ["admitted", "invalid", "rate-limited", "unavailable"].includes(result.decision) && validOverflow
      ? result : { decision: "unavailable", overflow: null };
  } catch { return { decision: "unavailable", overflow: null }; }
}

/** Shared HTTP/service/hosted ingress. Only the fixed object's serving method
 * is addressed here, never the proposed target or a proof/index lookup. */
export async function admitServing(env: ServingEnvironment, request: ServingRequest, address: string | null): Promise<ServingDecision> {
  if (request?.kind === "site-read" && siteReadAddressKey(address) === null) return "rate-limited";
  if (!env.SCOPE_INDEX) return "unavailable";
  try {
    const port = env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(SCOPE_INDEX_NAME)) as ServingPort;
    const decision = await port.admitServing(request, address);
    return ["admitted", "invalid", "rate-limited", "unavailable"].includes(decision) ? decision : "unavailable";
  } catch { return "unavailable"; }
}
