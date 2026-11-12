/** Finite durable request counts. These rows never consume operation custody. */
import { utf8 } from "@generalbusiness/dap-bytes";
import type { Sql } from "./sqlite-custody.ts";

export const MCP_REQUEST_WINDOW_MS = 60_000;
export const MCP_REQUEST_WINDOW_CALLS = 120;
export const MCP_REQUEST_WINDOW_IDENTITIES = 4096;
type Purpose = "control" | "cleanup" | "context";
export type RequestAdmission = "allowed" | "limited" | "unavailable";

/** One fixed-cap table per object. No live identity is displaced at capacity. */
export class McpRequestWindows {
  constructor(private readonly sql: Sql) {
    sql.exec(`CREATE TABLE IF NOT EXISTS mcp_request_window (purpose TEXT NOT NULL CHECK (purpose IN ('control','cleanup','context')), identity TEXT NOT NULL, since INTEGER NOT NULL, calls INTEGER NOT NULL, PRIMARY KEY (purpose, identity))`);
    sql.exec(`CREATE TABLE IF NOT EXISTS mcp_request_clock (id INTEGER PRIMARY KEY CHECK (id = 1), seen INTEGER NOT NULL)`);
  }
  admit(purpose: Purpose, identity: string, now: number): RequestAdmission {
    if (!["control", "cleanup", "context"].includes(purpose) || typeof identity !== "string" || utf8(identity).length > 256
      || !Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(now + MCP_REQUEST_WINDOW_MS)) return "unavailable";
    return this.sql.transaction<RequestAdmission>(() => {
      const clock = this.sql.exec(`SELECT seen FROM mcp_request_clock WHERE id = 1`).toArray()[0]?.["seen"];
      if (clock !== undefined && (typeof clock !== "number" || !Number.isSafeInteger(clock) || clock < 0 || clock > now)) return "unavailable";
      this.sql.exec(`DELETE FROM mcp_request_window WHERE since <= ?`, now - MCP_REQUEST_WINDOW_MS);
      const own = "identity:" + identity;
      let key = own;
      let row = this.sql.exec(`SELECT since, calls FROM mcp_request_window WHERE purpose = ? AND identity = ?`, purpose, key).toArray()[0];
      if (!row) {
        const count = Number(this.sql.exec(`SELECT count(*) AS n FROM mcp_request_window WHERE purpose = ? AND identity <> ''`, purpose).toArray()[0]!["n"]);
        if (!Number.isSafeInteger(count) || count < 0 || count > MCP_REQUEST_WINDOW_IDENTITIES) return "unavailable";
        if (count === MCP_REQUEST_WINDOW_IDENTITIES) {
          key = ""; // One shared overflow counter. Caller identities always have the prefix above.
          row = this.sql.exec(`SELECT since, calls FROM mcp_request_window WHERE purpose = ? AND identity = ''`, purpose).toArray()[0];
        }
      }
      if (row && (typeof row["since"] !== "number" || !Number.isSafeInteger(row["since"]) || row["since"] < 0 || row["since"] > now
        || typeof row["calls"] !== "number" || !Number.isSafeInteger(row["calls"]) || row["calls"] < 1 || row["calls"] > MCP_REQUEST_WINDOW_CALLS)) return "unavailable";
      this.sql.exec(`INSERT INTO mcp_request_clock (id, seen) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET seen = excluded.seen`, now);
      if (row && Number(row["calls"]) >= MCP_REQUEST_WINDOW_CALLS) return "limited";
      if (row) this.sql.exec(`UPDATE mcp_request_window SET calls = calls + 1 WHERE purpose = ? AND identity = ?`, purpose, key);
      else this.sql.exec(`INSERT INTO mcp_request_window (purpose, identity, since, calls) VALUES (?, ?, ?, 1)`, purpose, key, now);
      return "allowed";
    });
  }
}
