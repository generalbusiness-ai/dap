import type { SequenceRef } from "@generalbusiness/dap-contract";
import { canonicalize, isSequenceRef } from "@generalbusiness/dap-bytes";

/** Store selection only. Current Native Membership reads still decide authority. */
export function hostedRegistryName(at: SequenceRef): string {
  if (!isSequenceRef(at)) throw new Error("A hosted registry needs a full Membership reference.");
  return "hosted-registry-2:" + canonicalize({ scope: at.scope, genesis: at.genesis });
}
