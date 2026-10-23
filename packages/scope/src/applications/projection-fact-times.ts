/** Exact same-scope entry metadata, charged to the selected source's existing
 * page allowance. No entry bodies, recent-window scan, peers or retries. */
import type { Digest } from "@generalbusiness/dap-contract";
import { isDigest, timeMs } from "@generalbusiness/dap-bytes";
import type { ApplicationFactTimeRead, ApplicationProjectionFactRef } from "@generalbusiness/dap-bytes/application-v2";
import type { PreparedRead } from "../read-preparation.ts";
import type { Sql } from "../sqlite.ts";
import type { ItemQueryBudget } from "../item-query-budget.ts";

export function applicationProjectionFactTimes(sql: Pick<Sql, "exec">, frame: Pick<PreparedRead, "scope">, refs: readonly ApplicationProjectionFactRef[], budget: ItemQueryBudget): ApplicationFactTimeRead | null {
  const entries: { seq: number; hash: Digest; time: string }[] = [];
  const reader = budget.sql("page", sql);
  for (let offset = 0; offset < refs.length; offset += 100) {
    const chunk = refs.slice(offset, offset + 100);
    if (!budget.available || chunk.some(ref => ref.seq > frame.scope.head.seq)) return null;
    // Native seq/hash/canonical-time metadata fits 160 bytes per row. Admit
    // this conservative bound before the indexed, at-most-100-key lookup.
    budget.spend("page", { candidates: chunk.length, metadata: chunk.length * 160 });
    const rows = reader.exec(`SELECT seq,hash,time FROM entry WHERE seq IN (${chunk.map(() => "?").join(",")}) AND seq<=? ORDER BY seq`, ...chunk.map(ref => ref.seq), frame.scope.head.seq).toArray();
    if (rows.length !== chunk.length) return null;
    for (let i = 0; i < chunk.length; i++) {
      const row = rows[i]!, ref = chunk[i]!;
      if (row["seq"] !== ref.seq || ref.hash !== null && row["hash"] !== ref.hash || !isDigest(row["hash"]) || timeMs(row["time"]) === null) return null;
      entries.push({ seq: ref.seq, hash: row["hash"], time: row["time"] as string });
    }
  }
  return budget.available ? { scope: frame.scope.at, at: frame.scope.head, entries } : null;
}
