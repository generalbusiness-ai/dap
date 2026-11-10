/** Exact retained b8 LIST1 declarations and their current maintained successors.
 * Eligibility needs a supported exact pin and declaration bytes that hash to it;
 * a name or similar fields never select this workflow. */
import type { DeclaredDefinition, Digest } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { MANIFEST_DIGESTS } from "@generalbusiness/dap-lanes";

export const LIST1_DEFINITION_DIGESTS = {
  change: "sha256:85cec888905722a8dd051b3eb3388a1b674d82500f1df80044b298d12a285930",
  demo: "sha256:4945948396a0417aabc5bc66520036d39d179d131aaade1428da55ee96ed7b77",
} as const satisfies Record<string, Digest>;

/** Caller supplies the authenticated scope/activation pin. A parsed
 * declaration must hash to that exact known pin; altered custom rows fail. */
export function knownLIST1(declared: DeclaredDefinition, pin: string): boolean {
  try { return [...Object.values(LIST1_DEFINITION_DIGESTS), ...Object.values(MANIFEST_DIGESTS)].some((known) => known === pin) && definitionDigest(declared) === pin; }
  catch { return false; }
}
