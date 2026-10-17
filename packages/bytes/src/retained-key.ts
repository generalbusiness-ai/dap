/** Storage key for a value whose domain and digest a native consumer names.
 * This chooses a key; callers still validate the named bytes and authority. */
import { DOMAINS } from "@generalbusiness/dap-contract";
import type { Digest, RetainedInput } from "@generalbusiness/dap-contract";

/** Null is the raw SHA-256 domain of foreign entry copies and rule inputs,
 * not the tagged domain of a journal entry or a textual tag. */
export const RETAINED_BYTE_DOMAINS = {
  definition: DOMAINS.definition,
  entry: null,
  rule: null,
  text: DOMAINS.text,
  snapshot: DOMAINS.snapshot,
} as const;

/** Accounting identity only; callers still verify bytes, digest and authority. */
export function retainedByteDomain(kind: RetainedInput["kind"], domain?: string): string | null {
  if (kind === "value") {
    if (typeof domain !== "string" || domain.length === 0) throw new RangeError("a retained value states its byte domain");
    return domain;
  }
  if (!Object.hasOwn(RETAINED_BYTE_DOMAINS, kind)) throw new RangeError("unknown retained byte kind");
  return RETAINED_BYTE_DOMAINS[kind];
}

export type RetainedValueKey = { kind: "definition"; digest: Digest } | { kind: "value"; domain: string; digest: Digest };

/** Definition-domain values share the declaration store. No transport alias. */
export function retainedValueKey(domain: string, digest: Digest): RetainedValueKey {
  return domain === DOMAINS.definition ? { kind: "definition", digest } : { kind: "value", domain, digest };
}
