/** Bounded local expiry of provider-issued workspace token plaintext. */
import type { Timestamp } from "@generalbusiness/dap-contract";
import { timeMs, timeOf } from "@generalbusiness/dap-derive";
import type { Sql } from "./sqlite.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS private_workspace_expiry (scope TEXT NOT NULL, token INTEGER NOT NULL, ends_ms INTEGER NOT NULL, PRIMARY KEY(scope,token)) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS private_workspace_expiry_due ON private_workspace_expiry(ends_ms,scope,token);
CREATE TABLE IF NOT EXISTS private_workspace_expiry_backfill (singleton INTEGER PRIMARY KEY CHECK(singleton=1), last_scope TEXT, last_token INTEGER, done INTEGER NOT NULL);
INSERT OR IGNORE INTO private_workspace_expiry_backfill VALUES (1,NULL,NULL,CASE WHEN EXISTS (SELECT 1 FROM private_workspace_token LIMIT 1) THEN 0 ELSE 1 END);
CREATE TRIGGER IF NOT EXISTS private_workspace_expiry_insert AFTER INSERT ON private_workspace_token WHEN NEW.plaintext IS NOT NULL BEGIN
 INSERT OR REPLACE INTO private_workspace_expiry(scope,token,ends_ms) VALUES (NEW.scope,NEW.token,CAST(strftime('%s',substr(NEW.ends,1,19)||'Z') AS INTEGER)*1000 + CASE WHEN length(NEW.ends)=24 THEN CAST(substr(NEW.ends,21,3) AS INTEGER) ELSE 0 END);
END;
CREATE TRIGGER IF NOT EXISTS private_workspace_expiry_drop AFTER UPDATE OF plaintext ON private_workspace_token WHEN NEW.plaintext IS NULL BEGIN
 DELETE FROM private_workspace_expiry WHERE scope=NEW.scope AND token=NEW.token;
END;
CREATE TRIGGER IF NOT EXISTS private_workspace_expiry_delete AFTER DELETE ON private_workspace_token BEGIN
 DELETE FROM private_workspace_expiry WHERE scope=OLD.scope AND token=OLD.token;
END;`;

export class WorkspaceExpiry {
  readonly #sql: Pick<Sql, "exec">;
  #ready = false;
  constructor(sql: Pick<Sql, "exec">) { this.#sql = sql; }
  /** Install only after workspace custody exists. */
  prepare(): boolean {
    if (this.#ready) return true;
    if (!this.#sql.exec("SELECT 1 FROM sqlite_master WHERE type='table' AND name='private_workspace_token'").toArray().length) return false;
    this.#sql.exec(SCHEMA).toArray();
    this.#ready = true;
    return true;
  }
  wake(now: () => Timestamp): Timestamp | null {
    if (!this.prepare()) return null;
    const control = this.#sql.exec("SELECT done FROM private_workspace_expiry_backfill WHERE singleton=1").toArray()[0];
    const next = this.#sql.exec("SELECT ends_ms FROM private_workspace_expiry ORDER BY ends_ms,scope,token LIMIT 1").toArray()[0]?.["ends_ms"];
    if (control?.["done"] === 1 && typeof next !== "number") return null;
    const reading = now(), at = timeMs(reading);
    if (at === null) throw new Error("workspace expiry requires a valid clock");
    if (control?.["done"] !== 1) return reading;
    return timeOf(Math.max(at, next as number));
  }
  expire(now: Timestamp): void {
    const at = timeMs(now);
    if (at === null) throw new Error("workspace expiry requires a valid clock");
    if (!this.prepare()) return;
    const control = this.#sql.exec("SELECT last_scope,last_token,done FROM private_workspace_expiry_backfill WHERE singleton=1").toArray()[0]!;
    try {
      if (control["done"] !== 1) {
        const fields = "SELECT scope,token,ends FROM private_workspace_token";
        const rows = control["last_scope"] === null
          ? this.#sql.exec(`${fields} ORDER BY scope,token LIMIT 64`).toArray()
          : this.#sql.exec(`${fields} WHERE (scope,token)>(?,?) ORDER BY scope,token LIMIT 64`, control["last_scope"]!, control["last_token"]!).toArray();
        for (const row of rows) {
          const scope = row["scope"], token = row["token"], end = timeMs(row["ends"]);
          if (typeof scope !== "string" || typeof token !== "number") throw new Error("invalid workspace custody key");
          if (end !== null) this.#sql.exec("INSERT OR IGNORE INTO private_workspace_expiry(scope,token,ends_ms) SELECT scope,token,? FROM private_workspace_token WHERE scope=? AND token=? AND plaintext IS NOT NULL", end, scope, token).toArray();
          this.#sql.exec("UPDATE private_workspace_expiry_backfill SET last_scope=?,last_token=? WHERE singleton=1", scope, token).toArray();
        }
        if (rows.length < 64) this.#sql.exec("UPDATE private_workspace_expiry_backfill SET done=1 WHERE singleton=1").toArray();
      }
    } finally {
      this.#sql.exec("UPDATE private_workspace_token SET plaintext=NULL WHERE (scope,token) IN (SELECT scope,token FROM private_workspace_expiry WHERE ends_ms<=? ORDER BY ends_ms,scope,token LIMIT 64)", at).toArray();
    }
  }
}
