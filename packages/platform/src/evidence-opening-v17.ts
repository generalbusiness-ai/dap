/** Correspondence with an actual sealed opening. Journal/hash/source
 * authority belongs to the caller; this creates no self or future fact. */
import type { Entry } from "@generalbusiness/dap-contract";
import { natural, isEntry, isOperationId } from "@generalbusiness/dap-bytes";
import type { Operation } from "@generalbusiness/dap-derive";

export function evidenceOperationOpeningV17(entry: Entry, operation: Operation): boolean {
  try {
    if (!isEntry(entry) || !natural(entry.seq) || !isOperationId(operation.id) || !natural(operation.most) || operation.most < 1) return false;
    const [position, ordinal] = operation.id.split(":").map(Number);
    if (position !== entry.seq) return false;
    const rows = entry.effects.filter(effect => effect.effect === "operation" && effect.k === ordinal);
    if (rows.length !== 1 || rows[0]!.effect !== "operation") return false;
    const opening = rows[0]!;
    if (!natural(opening.k) || operation.id !== `${entry.seq}:${opening.k}` || opening.owner !== operation.owner
      || opening.kind === "" || opening.kind !== operation.kind || opening.attempts !== operation.most) return false;
    const holder = opening.for === "self" ? entry.seq : opening.for;
    if (holder !== undefined && !natural(holder) || operation.for !== undefined && !natural(operation.for)) return false;
    return holder === operation.for;
  } catch { return false; }
}
