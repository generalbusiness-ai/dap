import { answersVersionQuestion, READ_TOKEN_HOURS, isOf } from "@generalbusiness/dap-platform";
/** Private admission reservations, not provider revocation or recorded rules. */
import type { Entry, Input, OperationId, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { LAST_MS, timeMs, type Draft } from "@generalbusiness/dap-derive";

import type { Sql } from "./sqlite.ts";

/** Destination 19 fixes one hour; the older definitions retain their hours field. */
export function readTokenHours(owner: string, input: Input): number | null {
  if (input.type !== "act" || input.signed.intent.kind !== "read-token") return null;
  if (answersVersionQuestion(owner, "scopeReadTokenFixedHourDestination")) return Object.keys(input.signed.intent.fields).length === 0 ? 1 : null;
  const hours = input.signed.intent.fields["hours"];
  return typeof hours === "number" && Number.isSafeInteger(hours) && hours >= READ_TOKEN_HOURS.min && hours <= READ_TOKEN_HOURS.max ? hours : null;
}

export interface ReadTokenAdmission {
  check(scope: ScopeRef, draft: Draft, now: Timestamp): "allowed" | "limit" | "unavailable";
  /** The accepted entry and this reservation share the scope's transaction. */
  sealed(entry: Entry): void;
}

function mintOf(value: Pick<Draft, "input" | "effects">) {
  const mints = value.effects.filter(e => e.effect === "operation" && isOf(e.owner, "platform:destination") && e.kind === "mint-read");
  if (mints.length === 0) return null;
  const mint = mints[0]!;
  if (mints.length !== 1 || mint.effect !== "operation" || value.input.type !== "act" || value.input.authority.length !== 1) throw new Error("read-token reservation requires its judged member grant");
  const hours = readTokenHours(mint.owner, value.input);
  if (hours === null) throw new Error("read-token reservation requires its pinned lifetime");
  // The subject came from held authenticated membership authority. Keys and
  // principals do not define this member's bucket.
  return { bucket: canonicalize(value.input.authority[0]!.subject), hours, k: mint.k };
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS private_read_quota_start (
  scope TEXT PRIMARY KEY, first_seq INTEGER NOT NULL
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS private_read_quota (
  scope TEXT NOT NULL, mint TEXT NOT NULL, bucket TEXT NOT NULL, ends_ms INTEGER NOT NULL, handle TEXT,
  PRIMARY KEY (scope, mint)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS private_read_quota_bucket ON private_read_quota(scope,bucket,ends_ms,mint);
CREATE INDEX IF NOT EXISTS private_read_quota_due ON private_read_quota(ends_ms,scope,mint);
`;

export class ReadTokenQuota implements ReadTokenAdmission {
  readonly #sql: Pick<Sql, "exec">;
  readonly #current: () => ScopeRef | null;
  constructor(sql: Pick<Sql, "exec">, current: () => ScopeRef | null) {
    this.#sql = sql; this.#current = current;
    sql.exec(SCHEMA).toArray();
  }

  check(scope: ScopeRef, draft: Draft, now: Timestamp): "allowed" | "limit" | "unavailable" {
    const mint = mintOf(draft);
    if (!mint) return "allowed";
    const at = timeMs(now);
    if (at === null) return "unavailable";
    const open = this.#sql.exec("SELECT mint FROM private_read_quota WHERE scope=? AND bucket=? AND ends_ms>? ORDER BY ends_ms,mint LIMIT 8", canonicalize(scope), mint.bucket, at).toArray();
    return open.length < 8 ? "allowed" : "limit";
  }

  sealed(entry: Entry): void {
    const mint = mintOf(entry);
    if (!mint) return;
    // A sealed entry names no scope: it is an entry of this scope.
    const own = this.#current();
    if (!own) throw new Error("read-token reservation requires the current scope");
    const scope = canonicalize(own), at = timeMs(entry.time);
    if (at === null) throw new Error("read-token reservation requires the sealed time");
    // The bucket index bounds this deletion to its eight prior slots.
    this.#sql.exec("DELETE FROM private_read_quota WHERE scope=? AND bucket=? AND ends_ms<=?", scope, mint.bucket, at).toArray();
    this.#sql.exec("INSERT OR IGNORE INTO private_read_quota_start(scope,first_seq) VALUES(?,?)", scope, entry.seq).toArray();
    this.#sql.exec("INSERT INTO private_read_quota(scope,mint,bucket,ends_ms) VALUES(?,?,?,?)", scope, `${entry.seq}:${mint.k}`, mint.bucket, at + (mint.hours * 60 + 10) * 60_000).toArray();
  }

  #scope(): string | null { const at = this.#current(); return at ? canonicalize(at) : null; }

  /** Bind before the provider await. An interrupted bound call is unknown,
   * never an invitation to repeat a mint. Pre-upgrade operations stay legacy. */
  bind(mint: OperationId, handle: string, now: Timestamp): "bound" | "legacy" | "closed" {
    const scope = this.#scope(), at = timeMs(now);
    if (scope === null || at === null) return "closed";
    const first = this.#sql.exec("SELECT first_seq FROM private_read_quota_start WHERE scope=?", scope).toArray()[0]?.["first_seq"];
    if (typeof first !== "number" || Number(mint.split(":")[0]) < first) return "legacy";
    return this.#sql.exec("UPDATE private_read_quota SET handle=? WHERE scope=? AND mint=? AND handle IS NULL AND ends_ms>? RETURNING mint", handle, scope, mint, at).toArray().length === 1 ? "bound" : "closed";
  }

  refused(mint: OperationId, handle: string): void {
    const scope = this.#scope();
    if (scope !== null) this.#sql.exec("DELETE FROM private_read_quota WHERE scope=? AND mint=? AND handle=?", scope, mint, handle).toArray();
  }

  /** A late reply cannot revive an expired reservation or disclose plaintext. */
  minted(mint: OperationId, handle: string, ends: Timestamp, now: Timestamp): boolean {
    const scope = this.#scope(), end = timeMs(ends), at = timeMs(now);
    if (scope === null || end === null || at === null) return false;
    const changed = this.#sql.exec("UPDATE private_read_quota SET ends_ms=? WHERE scope=? AND mint=? AND handle=? AND ends_ms>? RETURNING mint", end, scope, mint, handle, at).toArray().length === 1;
    return changed;
  }

  nextExpiry(): number | null {
    const next = this.#sql.exec("SELECT ends_ms FROM private_read_quota ORDER BY ends_ms,scope,mint LIMIT 1").toArray()[0]?.["ends_ms"];
    // A fallback past the last representable clock remains open. There is
    // no valid instant at which it expires, and no valid alarm for that end.
    return typeof next === "number" && next <= LAST_MS ? next : null;
  }

  /** A fixed quantum across incarnations, including slots whose plaintext left custody. */
  expire(now: Timestamp): void {
    const at = timeMs(now);
    if (at === null) throw new Error("read-token expiry requires a valid clock");
    this.#sql.exec("DELETE FROM private_read_quota WHERE (scope,mint) IN (SELECT scope,mint FROM private_read_quota WHERE ends_ms<=? ORDER BY ends_ms,scope,mint LIMIT 64)", at).toArray();
  }
}
