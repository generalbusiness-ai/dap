/** Classify only this object's format before constructing a store or helper. */
import type { Sql } from "./sqlite.ts";

export type RoomFormatStart =
  | { kind: "fresh" }
  | { kind: "current" }
  | { kind: "retired" }
  | { kind: "unavailable"; stage: "catalog" };

/** Fixed names owned by earlier Scope and MCP room schemas through 5784e23d.
 * Host tables do not establish room history. Keep historical names when a
 * defining schema retires them; the source-correspondence test pins this set. */
const ROOM_TABLES = [
  "accepted_key",
  "agent",
  "agent_retirement",
  "agents",
  "archive",
  "archive_chunk",
  "attempt",
  "budget",
  "chunk",
  "control",
  "control_budget",
  "entry",
  "entry_fact_signer",
  "fixed_control",
  "fixed_count",
  "fixed_dependency",
  "fixed_slot",
  "folded",
  "identity",
  "inbox",
  "item",
  "item_count",
  "item_key",
  "item_slot",
  "journal_kept",
  "latest_local_signer",
  "local_signer_control",
  "mcp_request_clock",
  "mcp_request_window",
  "meta",
  "oauth_agent",
  "oauth_client",
  "oauth_client_cache",
  "oauth_client_invalid",
  "oauth_grant",
  "oauth_issuer",
  "oauth_refresh_used",
  "oauth_session",
  "operation",
  "operator_mark",
  "operator_record",
  "original_copy",
  "outbox",
  "prepared",
  "private_creation_credential",
  "private_credential",
  "private_credential_expiry",
  "private_credential_expiry_backfill",
  "private_credential_revocation",
  "private_named_key",
  "private_read_credential",
  "private_read_quota",
  "private_read_quota_start",
  "private_workspace_token",
  "record",
  "request_index",
  "retained_birth",
  "retained_input",
  "retained_value",
  "room_record_format",
  "segment",
  "segment_index",
  "session",
  "session_request",
  "size_proof",
  "source_order",
] as const;
const ROOM_TABLE_NAMES = ROOM_TABLES.map(name => "'" + name + "'").join(", ");

/** One catalog read, followed by at most one two-row format-word read. */
export function classifyRoomFormat(sql: Pick<Sql, "exec">): RoomFormatStart {
  try {
    const rows = sql.exec(`SELECT
      EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name IN (${ROOM_TABLE_NAMES})) AS any_table,
      EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'room_record_format') AS format_table`).toArray();
    if (rows.length !== 1) return { kind: "unavailable", stage: "catalog" };
    const row = rows[0]!;
    // any_table counts recognized room-owned tables, not host storage.
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
