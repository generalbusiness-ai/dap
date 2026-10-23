/** Presentation order over one complete native source, without changing its
 * retained read data. Native IDs break ties in both directions. */
import type { ApplicationProjectionRow } from "@generalbusiness/dap-contract";
import type { ApplicationItemView } from "@generalbusiness/dap-bytes/application-v2";
import { timeMs } from "@generalbusiness/dap-bytes";
import { ViewError } from "./session.ts";

export function orderedViewRows(rows: readonly ApplicationProjectionRow[], order: NonNullable<ApplicationItemView["order"]>): ApplicationProjectionRow[] {
  const keys = new Map(rows.map(row => {
    const value = row.fields[order.field];
    if (value === null) return [row.id, null] as const;
    const key = typeof value === "number" && Number.isSafeInteger(value) ? value : timeMs(value);
    if (key === null) throw new ViewError("unavailable", "The declared carousel order needs its native integer or timestamp field.");
    return [row.id, key] as const;
  }));
  return [...rows].sort((a, b) => {
    const first = keys.get(a.id)!, second = keys.get(b.id)!;
    if (first === null && second !== null) return order.missing === "first" ? -1 : 1;
    if (second === null && first !== null) return order.missing === "first" ? 1 : -1;
    const difference = first === null || second === null ? 0 : first - second;
    return difference === 0 ? a.id - b.id : order.direction === "asc" ? difference : -difference;
  });
}
