/** Classify only this object's format before constructing a store or helper. */
import type { Sql } from "./sqlite.ts";

export type RoomFormatStart =
  | { kind: "fresh" }
  | { kind: "current" }
  | { kind: "retired" }
  | { kind: "unavailable"; stage: "catalog" };

/** One catalog read, followed by at most one two-row format-word read. */
export function classifyRoomFormat(sql: Pick<Sql, "exec">): RoomFormatStart {
  try {
    const rows = sql.exec(`SELECT
      EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table') AS any_table,
      EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'room_record_format') AS format_table`).toArray();
    if (rows.length !== 1) return { kind: "unavailable", stage: "catalog" };
    const row = rows[0]!;
    if (Object.keys(row).sort().join(",") !== "any_table,format_table"
      || row["any_table"] !== 0 && row["any_table"] !== 1
      || row["format_table"] !== 0 && row["format_table"] !== 1
      || row["format_table"] === 1 && row["any_table"] !== 1)
      return { kind: "unavailable", stage: "catalog" };
    if (row["format_table"] === 0) return { kind: row["any_table"] === 0 ? "fresh" : "retired" };
  } catch { return { kind: "unavailable", stage: "catalog" }; }
  try {
    const rows = sql.exec(`SELECT CASE
      WHEN id = 1 AND typeof(id) = 'integer' AND typeof(v) = 'integer' AND v = 2 THEN 2 ELSE 0
      END AS word FROM room_record_format LIMIT 2`).toArray();
    return rows.length === 1 && Object.keys(rows[0]!).join(",") === "word" && rows[0]!["word"] === 2
      ? { kind: "current" } : { kind: "retired" };
  } catch { return { kind: "retired" }; }
}

/** Fresh setup only, inside the caller's synchronous schema transaction. */
export function writeRoomFormat2(sql: Pick<Sql, "exec">): void {
  sql.exec(`CREATE TABLE room_record_format (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    v INTEGER NOT NULL CHECK (typeof(v) = 'integer' AND v = 2))`);
  sql.exec("INSERT INTO room_record_format (id, v) VALUES (1, 2)");
}
