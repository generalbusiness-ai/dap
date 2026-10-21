/** The owner has already reserved bounded declaration enumeration. Charge
 * derived arrays, encoded names/paths and field maps before creating them.
 * A repeat is another allocation and receives another actual debit. */
import type { ArchiveBudget } from "./archive-budget.ts";

export function reserveArchiveNames(names: readonly string[], budget: ArchiveBudget, extraChars = 0): void {
  let chars = 0;
  for (const name of names) chars += name.length;
  budget.spend({ metadata: names.length * (384 + extraChars * 4) + chars * 32,
    inputWork: names.length * 512 + (chars + names.length * extraChars) * 128 });
}
