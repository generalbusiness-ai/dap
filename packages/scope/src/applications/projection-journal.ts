/** One fixed recent journal window. Metadata/aggregate bytes precede every
 * body. No continuation, scan outside the window, peer or retry exists. */
import { ITEM_QUERY_BOUNDS as B } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest, utf8 } from "@generalbusiness/dap-bytes";
import type { ApplicationJournalProjectionSource, ApplicationJournalRead } from "@generalbusiness/dap-bytes/application-v2";
import type { PreparedRead } from "../read-preparation.ts";
import type { Sql } from "../sqlite.ts";
import type { ItemQueryBudget } from "../item-query-budget.ts";
export function applicationProjectionJournal(sql: Pick<Sql, "exec">, frame: Pick<PreparedRead, "scope">, source: ApplicationJournalProjectionSource, budget: ItemQueryBudget):
  { ok: true; value: ApplicationJournalRead } | { ok: false; reason: "unavailable" | "too-large" } {
  const from = Math.max(0, frame.scope.head.seq - source.window + 1), to = frame.scope.head.seq, reader = budget.sql("page", sql);
  if (!budget.available) return { ok: false, reason: "unavailable" };
  const metadata = reader.exec("SELECT seq,hash,time,size FROM entry WHERE seq>=? AND seq<=? ORDER BY seq LIMIT ?", from, to, source.window).toArray();
  budget.spend("page", { candidates: metadata.length, metadata: utf8(canonicalize(metadata)).length });
  if (metadata.length !== to - from + 1) return { ok: false, reason: "unavailable" };
  let total = 0;
  for (let i = 0; i < metadata.length; i++) {
    const row = metadata[i]!, size = row["size"];
    if (row["seq"] !== from + i || !isDigest(row["hash"]) || typeof row["time"] !== "string" || typeof size !== "number" || !Number.isSafeInteger(size) || size < 0) return { ok: false, reason: "unavailable" };
    if (size > B.payloadBytes - total) return { ok: false, reason: "too-large" };
    total += size;
  }
  budget.spend("page", { bodies: metadata.length, payloadBytes: total });
  const entries: { seq: number; hash: ApplicationJournalRead["at"]["hash"]; bytes: string }[] = [];
  for (const row of metadata) {
    if (!budget.available) return { ok: false, reason: "unavailable" };
    const rows = reader.exec("SELECT bytes FROM entry WHERE seq=? AND hash=? AND time=? AND size=? AND octet_length(bytes)=?", row["seq"]!, row["hash"]!, row["time"]!, row["size"]!, row["size"]!).toArray();
    const bytes = rows[0]?.["bytes"];
    if (rows.length !== 1 || typeof bytes !== "string" || utf8(bytes).length !== row["size"]) return { ok: false, reason: "unavailable" };
    entries.push({ seq: row["seq"] as number, hash: row["hash"] as ApplicationJournalRead["at"]["hash"], bytes });
  }
  return budget.available ? { ok: true, value: { scope: frame.scope.at, at: frame.scope.head, entries } } : { ok: false, reason: "unavailable" };
}
