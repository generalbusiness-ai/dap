/** Keys whose revisions an act expects, in caller-supplied subject order. */
import type { ActType } from "@generalbusiness/dap-contract";

/** The caller supplies unmarked also names: resolved names, or its stricter completeness set. */
export function expectedKeys(act: Pick<ActType, "step">, bound: Iterable<string>): string[] {
  return act.step === "transition" ? ["on", ...bound] : [...bound];
}
