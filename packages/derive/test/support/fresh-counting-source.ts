/** Fresh test authors copy only the retained Counter's five empty exceptions.
 * The identifiers cutover deletes this helper and the two corpus exclusions. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { isRecord } from "@generalbusiness/dap-bytes";

export const RETAINED_COUNTING_EMPTY_EXCEPT_PATHS = [
  "/acts/join/guards/0/count/except",
  "/acts/join/guards/1/none/except",
  "/acts/spoken/guards/2/some/except",
  "/acts/spoken/guards/4/sameSet/items/except",
  "/acts/start/guards/3/sameSet/items/except",
] as const;

export function freshCountingSource<D extends DeclaredDefinition>(declared: D): D {
  const copy = structuredClone(declared);
  for (const path of RETAINED_COUNTING_EMPTY_EXCEPT_PATHS) {
    let range: unknown = copy;
    for (const part of path.slice(1).split("/").slice(0, -1)) {
      if (Array.isArray(range)) range = range[Number(part)];
      else if (isRecord(range)) range = range[part];
      else throw Error(`The retained Counting range is missing: ${path}`);
    }
    if (!isRecord(range) || !Array.isArray(range["except"]) || range["except"].length !== 0) {
      throw Error(`The retained Counting exception must be empty: ${path}`);
    }
    delete range["except"];
  }
  return copy;
}
