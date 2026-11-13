/** The coverage row that a report states for one sequence: the reference, the
 * kind that its genesis names when the row covers entry 0, and the entries. */
import type { Entry, Report, ScopeRef } from "@generalbusiness/dap-contract";

export function coverageRow(scope: ScopeRef, born: Entry | undefined, through: number, from = 0): Report["coverage"][number] {
  return { scope, ...(from === 0 && born?.input.type === "genesis" ? { kind: born.input.seed.kind } : {}), from, through };
}
