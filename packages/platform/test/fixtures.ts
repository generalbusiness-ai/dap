/** Shared fixture judgments. Domain data, grants and lifetime ownership stay
 * with their labelled scenario builders. */
import { PROPOSED_BOUNDS, type PlatformData } from "@generalbusiness/dap-contract";
import { PROFILES, validateDefinition, type Judgment, type ValidDefinition } from "@generalbusiness/dap-derive";

export function checkedDefinition(result: ReturnType<typeof validateDefinition>): ValidDefinition {
  if (!result.ok) throw new Error(`a definition of test support is refused: ${JSON.stringify(result.problems)}`);
  return result.definition;
}

/** Creation validates a cloned native data object and names that data on
 * refusal; this is distinct from accepting an already computed validation. */
export function checkedPlatformData(data: PlatformData): ValidDefinition {
  const result = validateDefinition(JSON.parse(JSON.stringify(data)), PROPOSED_BOUNDS, PROFILES, { platform: true });
  if (!result.ok) throw new Error(`${data.name} is refused: ${JSON.stringify(result.problems)}`);
  return result.definition;
}

export function written(judgment: Judgment): Extract<Judgment, { result: "write" }>["draft"] {
  if (judgment.result !== "write") throw new Error(`not written: ${JSON.stringify(judgment)}`);
  return judgment.draft;
}
