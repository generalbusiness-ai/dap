/** Exact local append-time signer metadata. No entry body, history window,
 * legacy backfill, current key lookup, peer or retry is part of this read. */
import type { MemberRef } from "@generalbusiness/dap-contract";
import { isDigest, isMemberRef, parseStrict } from "@generalbusiness/dap-bytes";
import type { ApplicationFactSignerRead, ApplicationProjectionFactRef } from "@generalbusiness/dap-bytes/application-v2";
import type { PreparedRead } from "../read-preparation.ts";
import type { Sql, SqlValue } from "../sqlite.ts";
import type { ItemQueryBudget } from "../item-query-budget.ts";

export function applicationProjectionFactSigners(sql: Pick<Sql, "exec">, frame: Pick<PreparedRead, "scope">, refs: readonly ApplicationProjectionFactRef[], budget: ItemQueryBudget): ApplicationFactSignerRead | null {
  const entries: ApplicationFactSignerRead["entries"][number][] = [], reader = budget.sql("page", sql);
  for (let offset = 0; offset < refs.length; offset += 100) {
    const chunk = refs.slice(offset, offset + 100);
    if (!budget.available || chunk.some(ref => ref.seq > frame.scope.head.seq)) return null;
    // One indexed entry key and one indexed signer key per fact. Reserve
    // the bounded output before SQL; full entry bytes are never selected.
    budget.spend("page", { candidates: chunk.length, metadata: chunk.length * 768 });
    const rows: Record<string, SqlValue>[] = [];
    // Native SQLite allows 100 bindings, including the captured head.
    // Reserve the whole chunk above before either of its indexed reads.
    for (let start = 0; start < chunk.length; start += 99) {
      const keys = chunk.slice(start, start + 99);
      rows.push(...reader.exec(`SELECT e.seq,e.hash,CASE WHEN s.hash=e.hash AND octet_length(s.member)<=512 THEN s.member ELSE NULL END AS signer FROM entry e LEFT JOIN entry_fact_signer s ON s.seq=e.seq WHERE e.seq IN (${keys.map(() => "?").join(",")}) AND e.seq<=? ORDER BY e.seq`, ...keys.map(ref => ref.seq), frame.scope.head.seq).toArray());
    }
    const found = new Map(rows.map(row => [row["seq"], row]));
    if (found.size !== rows.length) return null;
    for (const ref of chunk) {
      const row = found.get(ref.seq);
      if (!row) { entries.push({ seq: ref.seq, hash: null, signer: null }); continue; }
      if (!isDigest(row["hash"])) return null;
      let signer: MemberRef | null = null;
      if (typeof row["signer"] === "string") {
        const value: unknown = parseStrict(row["signer"]);
        if (!isMemberRef(value)) return null;
        signer = value;
      } else if (row["signer"] !== null) return null;
      entries.push({ seq: ref.seq, hash: row["hash"], signer });
    }
  }
  return budget.available ? { scope: frame.scope.at, at: frame.scope.head, entries } : null;
}
