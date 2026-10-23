/** Only the UTF-8 length of the canonical retained JSON string leaves
 * SQLite. Text bodies are never selected or exported. This is the same
 * logical-byte size as native retainedSize, not a decoded field bound. */
import type { Digest } from "@generalbusiness/dap-contract";
import { natural } from "@generalbusiness/dap-bytes";
import type { Sql } from "./sqlite.ts";
import type { ArchiveBudget } from "./archive-budget.ts";
import { stopArchivePrefix } from "./archive-prefix.ts";

export function readArchiveTextBytes(sql: Pick<Sql, "exec">, digest: Digest, budget: ArchiveBudget): number | null {
  budget.spend({ attempts: 1, inputWork: 256 });
  const rows = budget.native(sql, () => ({ metadata: 96, inputWork: 0 })).exec(
    "SELECT octet_length(bytes) AS size, typeof(bytes) AS type FROM retained_input WHERE kind = 'text' AND digest = ? LIMIT 1", digest).toArray();
  // Native redaction removes this row. Its journal tombstone, rather than
  // invented size evidence, must answer for that missing body in replay.
  if (rows.length === 0) return null;
  const row = rows[0];
  if (rows.length !== 1 || row?.["type"] !== "text" || !natural(row["size"]) || row["size"] < 2) return stopArchivePrefix("mismatch");
  return row["size"];
}
