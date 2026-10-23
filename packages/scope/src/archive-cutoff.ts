/** Choose a contiguous new interval from scalar size metadata only.
 * This is scheduling, not privacy admission or a prepaid body read. */
import { natural, isDigest, isHead } from "@generalbusiness/dap-bytes";
import type { Bounds, Head } from "@generalbusiness/dap-contract";
import { JOURNAL_V2_LAST_POSITION } from "@generalbusiness/dap-git/journal";
import { ArchiveBudget } from "./archive-budget.ts";
import type { Sql } from "./sqlite.ts";

// Leave the original allowance for inventory, retained probes, parent
// transport, layout and at-send validation. 4096 remains an upper bound,
// never a promise that every dense interval fits one finite pass.
const ENTRIES = 128;
const BODY_BYTES = 128 * 1024;
export function archiveCutoff(sql: Pick<Sql, "exec">, head: Head, after: Head | null, bounds: Pick<Bounds, "entryBytes">, budget: ArchiveBudget): Head {
  if (!isHead(head) || after !== null && !isHead(after) || !natural(bounds.entryBytes) || bounds.entryBytes === 0) return budget.stop("unavailable");
  const first = after ? after.seq + 1 : 0;
  if (head.seq > JOURNAL_V2_LAST_POSITION) return budget.stop("limit");
  if (first > head.seq) return budget.stop("unavailable");
  const limit = Math.min(ENTRIES, head.seq - first + 1);
  const rows = budget.native(sql, () => ({ metadata: limit * 192, inputWork: 0 })).exec(
    "SELECT seq, CASE WHEN typeof(hash) = 'text' AND octet_length(hash) = 71 THEN hash ELSE NULL END AS hash, CASE WHEN typeof(size) = 'integer' THEN size ELSE NULL END AS size, octet_length(bytes) AS actual, typeof(bytes) AS type FROM entry WHERE seq >= ? AND seq <= ? ORDER BY seq LIMIT ?", first, head.seq, limit).toArray();
  if (rows.length !== limit) return budget.stop("unavailable");
  let selected: Head | null = null, bytes = 0;
  for (const [offset, row] of rows.entries()) {
    if (row["seq"] !== first + offset || !isDigest(row["hash"]) || row["type"] !== "text" || !natural(row["size"])
      || row["size"] === 0 || row["size"] > bounds.entryBytes || row["actual"] !== row["size"]) return budget.stop("unavailable");
    if (row["seq"] === head.seq && row["hash"] !== head.hash) return budget.stop("unavailable");
    if (selected && row["size"] > BODY_BYTES - bytes) break;
    bytes += row["size"]; selected = { seq: first + offset, hash: row["hash"] };
  }
  return selected ?? budget.stop("unavailable");
}
