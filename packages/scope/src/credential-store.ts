/**
 * Credential custody beside one scope's history. These rows are private
 * runtime storage: no StateView, entry, public read or RPC method includes
 * them. The caller validates the host's own reply and the scope's judgment;
 * this table records neither a judgment nor an outside effect.
 *
 * Losing a plaintext does not revoke a provider credential. Only the
 * caller's explicit `revoked` instruction records that fact here. The
 * original mint reply metadata remains, even after expiry or revocation,
 * so a restarted outside port can recover that attempt's own evidence.
 */
import type { Sql } from "./sqlite.ts";
import type { OperationId, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isEntry, isOperationId, utf8 } from "@generalbusiness/dap-bytes";
import { timeMs, timeOf } from "@generalbusiness/dap-derive";
import { isOf } from "@generalbusiness/dap-platform";
import type { Entry } from "@generalbusiness/dap-contract";

export interface CredentialReply { id: string; ends: Timestamp }
export interface CredentialPosition { mint: OperationId; attempt: number }
export interface PendingCredentialReply extends CredentialReply, CredentialPosition {}
export interface RevocationPosition { revoke: OperationId; attempt: number }
export interface ExpectedRevocation extends RevocationPosition { mint: OperationId; mintAttempt: number; id: string }
export interface MintedCredential extends CredentialReply { mint: OperationId; attempt: number; plaintext: string }
export interface ScopePrivateCredential extends Omit<MintedCredential, "plaintext"> {
  plaintext: string | null;
  /** Custody and the mint's judgment, not proof that a provider token is still usable or that expiry revoked it. */
  state: "held" | "live" | "revoked";
}
export type CredentialPut = "stored" | "repeat" | "conflict" | "no-scope";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS private_credential (
  scope TEXT NOT NULL, id TEXT NOT NULL, mint TEXT NOT NULL, attempt INTEGER NOT NULL,
  ends TEXT NOT NULL, plaintext TEXT, state TEXT NOT NULL CHECK (state IN ('held', 'live', 'revoked')),
  PRIMARY KEY (scope, id), UNIQUE (scope, mint, attempt)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS private_credential_pending ON private_credential (scope, state, mint, attempt);
CREATE TABLE IF NOT EXISTS private_read_credential (
  scope TEXT NOT NULL, id TEXT NOT NULL, mint TEXT NOT NULL, attempt INTEGER NOT NULL, ends TEXT NOT NULL,
  PRIMARY KEY (scope,id), UNIQUE (scope,mint,attempt)
) WITHOUT ROWID;
-- New empty indexed scheduling table: do not index or rewrite populated custody history.
CREATE TABLE IF NOT EXISTS private_credential_expiry (
  scope TEXT NOT NULL, id TEXT NOT NULL, ends_ms INTEGER NOT NULL,
  PRIMARY KEY (scope, id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS private_credential_expiry_due ON private_credential_expiry (ends_ms, scope, id);
CREATE TABLE IF NOT EXISTS private_credential_expiry_backfill (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1), last_scope TEXT, last_id TEXT, done INTEGER NOT NULL
);
INSERT OR IGNORE INTO private_credential_expiry_backfill VALUES (1, NULL, NULL, CASE WHEN EXISTS (SELECT 1 FROM private_credential LIMIT 1) THEN 0 ELSE 1 END);
-- New own replies have canonical timestamps, checked by put. Integer arithmetic
-- retains milliseconds; lexical order of the optional fraction is not chronological.
CREATE TRIGGER IF NOT EXISTS private_credential_expiry_insert AFTER INSERT ON private_credential
WHEN NEW.plaintext IS NOT NULL AND EXISTS (SELECT 1 FROM private_read_credential AS r WHERE r.scope=NEW.scope AND r.id=NEW.id AND r.mint=NEW.mint AND r.attempt=NEW.attempt AND r.ends=NEW.ends)
BEGIN
  INSERT OR REPLACE INTO private_credential_expiry (scope,id,ends_ms) VALUES
    (NEW.scope, NEW.id, COALESCE(CAST(strftime('%s', substr(NEW.ends,1,19) || 'Z') AS INTEGER) * 1000
      + CASE WHEN length(NEW.ends) = 24 THEN CAST(substr(NEW.ends,21,3) AS INTEGER) ELSE 0 END, 0));
END;
CREATE TRIGGER IF NOT EXISTS private_credential_expiry_drop AFTER UPDATE OF plaintext ON private_credential
WHEN NEW.plaintext IS NULL
BEGIN
  DELETE FROM private_credential_expiry WHERE scope = NEW.scope AND id = NEW.id;
END;
CREATE TRIGGER IF NOT EXISTS private_credential_expiry_delete AFTER DELETE ON private_credential
BEGIN
  DELETE FROM private_credential_expiry WHERE scope = OLD.scope AND id = OLD.id;
END;
CREATE TABLE IF NOT EXISTS private_credential_revocation (
  scope TEXT NOT NULL, revoke TEXT NOT NULL, attempt INTEGER NOT NULL,
  mint TEXT NOT NULL, mint_attempt INTEGER NOT NULL, id TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, revoke, attempt)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS private_credential_revocations ON private_credential_revocation (scope, done, revoke, attempt);
CREATE TRIGGER IF NOT EXISTS private_credential_revoked AFTER UPDATE OF state ON private_credential
WHEN NEW.state = 'revoked'
BEGIN
  UPDATE private_credential_revocation SET done = 1
  WHERE scope = NEW.scope AND mint = NEW.mint AND mint_attempt = NEW.attempt;
END;
`;

export class CredentialStore {
  readonly #sql: Pick<Sql, "exec">;
  readonly #current: () => ScopeRef | null;

  /** `sql` is the object's SQLite storage; `current` reads its current scope and incarnation. */
  constructor(sql: Pick<Sql, "exec">, current: () => ScopeRef | null) {
    this.#sql = sql;
    this.#current = current;
    sql.exec(SCHEMA).toArray();
  }


  /** Durable private scheduling, across every incarnation. No plaintext is selected. */
  expiryWake(now: Timestamp): Timestamp | null {
    const at = timeMs(now);
    if (at === null) throw new Error("credential expiry requires a valid clock");
    const control = this.#sql.exec("SELECT done FROM private_credential_expiry_backfill WHERE singleton = 1").toArray()[0];
    if (control?.["done"] !== 1) return now;
    const next = this.#sql.exec("SELECT ends_ms FROM private_credential_expiry ORDER BY ends_ms, scope, id LIMIT 1").toArray()[0]?.["ends_ms"];
    return typeof next === "number" ? timeOf(Math.max(at, next)) : null;
  }

  /** One fixed quantum, never a history drain or provider revocation. */
  expire(now: Timestamp): void {
    const at = timeMs(now);
    if (at === null) throw new Error("credential expiry requires a valid clock");
    const control = this.#sql.exec("SELECT last_scope, last_id, done FROM private_credential_expiry_backfill WHERE singleton = 1").toArray()[0]!;
    try {
      if (control["done"] !== 1) {
        // Primary-key range, not a plaintext predicate or a full-history scan.
        // Existing keys originate from validated scope/credential identities.
        const rows = control["last_scope"] === null
          ? this.#sql.exec("SELECT CASE WHEN octet_length(scope) <= 1024 THEN scope ELSE NULL END AS scope, CASE WHEN octet_length(id) <= 4096 THEN id ELSE NULL END AS id, CASE WHEN octet_length(ends) <= 32 THEN ends ELSE NULL END AS ends, CASE WHEN octet_length(mint) <= 64 THEN mint ELSE NULL END AS mint, attempt FROM private_credential AS c ORDER BY c.scope, c.id LIMIT 64").toArray()
          : this.#sql.exec("SELECT CASE WHEN octet_length(scope) <= 1024 THEN scope ELSE NULL END AS scope, CASE WHEN octet_length(id) <= 4096 THEN id ELSE NULL END AS id, CASE WHEN octet_length(ends) <= 32 THEN ends ELSE NULL END AS ends, CASE WHEN octet_length(mint) <= 64 THEN mint ELSE NULL END AS mint, attempt FROM private_credential AS c WHERE (c.scope,c.id) > (?,?) ORDER BY c.scope, c.id LIMIT 64", control["last_scope"]!, control["last_id"]!).toArray();
        for (const row of rows) {
          if (typeof row["scope"] !== "string" || typeof row["id"] !== "string") throw new Error("credential expiry legacy key exceeds metadata bound");
          const scope = row["scope"], id = row["id"], ends = timeMs(row["ends"]);
          const mint = row["mint"], attempt = row["attempt"], endText = row["ends"];
          const marker = this.#sql.exec("SELECT 1 AS eligible FROM private_read_credential WHERE scope=? AND id=? AND mint=? AND attempt=? AND ends=?", scope,id,mint!,attempt!,endText!).toArray()[0];
          const proven = marker !== undefined || this.#legacyRead(scope,id,mint,attempt,endText);
          if (proven && ends === null) this.#sql.exec("UPDATE private_credential SET plaintext = NULL WHERE scope = ? AND id = ?", scope, id).toArray();
          else if (proven) this.#sql.exec("INSERT OR IGNORE INTO private_credential_expiry (scope,id,ends_ms) SELECT scope,id,? FROM private_credential WHERE scope = ? AND id = ? AND plaintext IS NOT NULL", ends!, scope, id).toArray();
          // Crash before this write repeats an idempotent row; never skips one.
          this.#sql.exec("UPDATE private_credential_expiry_backfill SET last_scope = ?, last_id = ? WHERE singleton = 1", scope, id).toArray();
        }
        if (rows.length < 64) this.#sql.exec("UPDATE private_credential_expiry_backfill SET done = 1 WHERE singleton = 1").toArray();
      }
    } finally {
      // Independent fixed quantum still runs if malformed backfill metadata refuses.
      // No provider secret crosses the SQL boundary.
      this.#sql.exec("UPDATE private_credential SET plaintext = NULL WHERE (scope,id) IN (SELECT scope,id FROM private_credential_expiry WHERE ends_ms <= ? AND EXISTS (SELECT 1 FROM private_read_credential AS r WHERE r.scope=private_credential_expiry.scope AND r.id=private_credential_expiry.id) ORDER BY ends_ms,scope,id LIMIT 64)", at).toArray();
    }
  }


  #enrollRead(scope: string, credential: Pick<MintedCredential, "id" | "mint" | "attempt" | "ends">): boolean {
    const { id,mint,attempt,ends } = credential;
    if (utf8(scope).length > 1024 || utf8(id).length > 4096 || !isOperationId(mint) || mint.length > 64 || !Number.isSafeInteger(attempt) || attempt < 1 || timeMs(ends) === null) return false;
    const held = this.#sql.exec("SELECT id,mint,attempt,ends FROM private_read_credential WHERE scope=? AND (id=? OR (mint=? AND attempt=?))",scope,id,mint,attempt).toArray();
    if (held.length && !(held.length === 1 && held[0]!["id"] === id && held[0]!["mint"] === mint && held[0]!["attempt"] === attempt && held[0]!["ends"] === ends)) return false;
    // Marker first: a crash leaves only this nonsecret immutable tuple. A later
    // different write mint cannot match it. Credential INSERT+queue is atomic.
    this.#sql.exec("INSERT OR IGNORE INTO private_read_credential(scope,id,mint,attempt,ends) VALUES(?,?,?,?,?)",scope,id,mint,attempt,ends).toArray();
    const ms = timeMs(ends);
    if (ms !== null) this.#sql.exec("INSERT OR IGNORE INTO private_credential_expiry(scope,id,ends_ms) SELECT scope,id,? FROM private_credential WHERE scope=? AND id=? AND mint=? AND attempt=? AND ends=? AND plaintext IS NOT NULL",ms,scope,id,mint,attempt,ends).toArray();
    return true;
  }

  #legacyRead(scope: string, id: string, mint: unknown, attempt: unknown, ends: unknown): boolean {
    // Seq-keyed operations/entries cannot authenticate a different incarnation.
    if (scope !== this.#scope() || !isOperationId(mint) || !Number.isSafeInteger(attempt) || (attempt as number) < 1 || typeof ends !== "string" || timeMs(ends) === null) return false;
    try {
      const [seq,k] = mint.split(":").map(Number);
      // Fixed-key, byte-fenced reads only; no history traversal or plaintext.
      const value = this.#sql.exec("SELECT CASE WHEN octet_length(value)<=65536 THEN value ELSE NULL END AS value FROM operation WHERE seq=? AND k=?",seq!,k!).toArray()[0]?.["value"];
      if (typeof value !== "string") return false;
      const operation = JSON.parse(value) as { id?: unknown; owner?: unknown; kind?: unknown; attempts?: { attempt: number; outcomes: { result: string; seq: number }[] }[] };
      if (operation.id !== mint || typeof operation.owner !== "string" || !isOf(operation.owner,"platform:destination") || operation.kind !== "mint-read" || !Array.isArray(operation.attempts)) return false;
      const confirmed = operation.attempts.find(a => a.attempt === attempt)?.outcomes.find(o => o.result === "confirmed");
      if (!confirmed || !Number.isSafeInteger(confirmed.seq) || confirmed.seq < 0) return false;
      const entry = (n: number): Entry | null => {
        const row = this.#sql.exec("SELECT hash,CASE WHEN octet_length(bytes)<=65536 THEN bytes ELSE NULL END AS bytes FROM entry WHERE seq=?",n).toArray()[0];
        if (typeof row?.["bytes"] !== "string") return null;
        const parsed: unknown = JSON.parse(row["bytes"]);
        return isEntry(parsed) && parsed.seq === n && canonicalize(parsed.at) === scope && entryHash(parsed) === row["hash"] ? parsed : null;
      };
      const opening = entry(seq!), outcome = entry(confirmed.seq), input = outcome?.input;
      if (opening?.input.type !== "act" || opening.input.signed.intent.kind !== "read-token" || !opening.effects.some(e => e.effect === "operation" && e.k === k && e.owner === operation.owner && e.kind === "mint-read")) return false;
      if (input?.type !== "outcome" || input.operation !== mint || input.attempt !== attempt || input.owner !== operation.owner || input.kind !== "mint-read" || input.result !== "confirmed" || input.evidence.basis !== "own-answer") return false;
      const body = input.evidence.body;
      if (typeof body !== "object" || body === null || Array.isArray(body) || body["token"] !== id || body["ends"] !== ends) return false;
      return this.#enrollRead(scope,{ id,mint,attempt: attempt as number,ends: ends as Timestamp });
    } catch { return false; } // Missing/pruned/oversized/invalid proof is unknown, never write eligibility.
  }

  #scope(): string | null {
    const current = this.#current();
    return current ? canonicalize(current) : null;
  }

  #read(scope: string, mint: OperationId, attempt: number): ScopePrivateCredential | null {
    const row = this.#sql.exec("SELECT id, mint, attempt, ends, plaintext, state FROM private_credential WHERE scope = ? AND mint = ? AND attempt = ?", scope, mint, attempt).toArray()[0];
    return row ? {
      id: row["id"] as string, mint: row["mint"] as OperationId, attempt: row["attempt"] as number,
      ends: row["ends"] as Timestamp, plaintext: row["plaintext"] as string | null, state: row["state"] as ScopePrivateCredential["state"],
    } : null;
  }

  /**
   * Keep a validated own reply, initially held. An ID belongs to one mint
   * attempt, and an attempt has one ID. Conflicts change nothing. Repeating
   * an identity never restores a plaintext that was dropped or revoked.
   */
  put(credential: MintedCredential): CredentialPut { return this.#put(credential, false); }

  /** Trusted destination mint-read path only; an id prefix is not eligibility. */
  putRead(credential: MintedCredential): CredentialPut { return this.#put(credential, true); }

  #put(credential: MintedCredential, read: boolean): CredentialPut {
    const scope = this.#scope();
    if (scope === null) return "no-scope";
    if (timeMs(credential.ends) === null) return "conflict";
    const existing = this.#sql.exec("SELECT id, mint, attempt, ends, plaintext FROM private_credential WHERE scope = ? AND (id = ? OR (mint = ? AND attempt = ?))", scope, credential.id, credential.mint, credential.attempt).toArray();
    if (existing.length !== 0) {
      const row = existing[0]!;
      if (!(existing.length === 1 && row["id"] === credential.id && row["mint"] === credential.mint && row["attempt"] === credential.attempt && row["ends"] === credential.ends && (row["plaintext"] === null || row["plaintext"] === credential.plaintext))) return "conflict";
      if (read && !this.#enrollRead(scope, credential)) return "conflict";
      return "repeat";
    }
    if (read && !this.#enrollRead(scope, credential)) return "conflict";
    this.#sql.exec("INSERT INTO private_credential (scope, id, mint, attempt, ends, plaintext, state) VALUES (?, ?, ?, ?, ?, ?, 'held')", scope, credential.id, credential.mint, credential.attempt, credential.ends, credential.plaintext).toArray();
    return "stored";
  }

  /** The retained own-reply metadata of that exact attempt. This read returns no secret and does not deliver an answer. */
  reply(mint: OperationId, attempt: number): CredentialReply | null {
    const scope = this.#scope();
    if (scope === null) return null;
    const row = this.#sql.exec("SELECT id, ends FROM private_credential WHERE scope = ? AND mint = ? AND attempt = ?", scope, mint, attempt).toArray()[0];
    return row ? { id: row["id"] as string, ends: row["ends"] as Timestamp } : null;
  }

  /**
   * At most the caller's limit of held own replies after that mint attempt,
   * in mint and attempt order. The index starts at the cursor; no secret is
   * selected. Expired or dropped plaintext leaves the historical reply
   * valid. This read never offers that reply or claims a revocation.
   */
  pending(after: CredentialPosition | null, limit: number): { items: PendingCredentialReply[]; more: boolean } {
    const scope = this.#scope();
    if (scope === null || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(limit + 1)) return { items: [], more: false };
    const rows = after === null
      ? this.#sql.exec("SELECT mint, attempt, id, ends FROM private_credential WHERE scope = ? AND state = 'held' ORDER BY mint, attempt LIMIT ?", scope, limit + 1).toArray()
      : this.#sql.exec("SELECT mint, attempt, id, ends FROM private_credential WHERE scope = ? AND state = 'held' AND (mint, attempt) > (?, ?) ORDER BY mint, attempt LIMIT ?", scope, after.mint, after.attempt, limit + 1).toArray();
    return {
      items: rows.slice(0, limit).map((row) => ({ mint: row["mint"] as OperationId, attempt: row["attempt"] as number, id: row["id"] as string, ends: row["ends"] as Timestamp })),
      more: rows.length > limit,
    };
  }

  /**
   * Before DELETE leaves, bind its attempt to an exact private mint and ID.
   * A repeat is the same binding; a conflict changes nothing. This records
   * an expectation, never a host answer or proof of revocation.
   */
  expectRevoke(expected: ExpectedRevocation): boolean {
    const scope = this.#scope();
    if (scope === null) return false;
    const credential = this.#sql.exec("SELECT id FROM private_credential WHERE scope = ? AND mint = ? AND attempt = ?", scope, expected.mint, expected.mintAttempt).toArray()[0];
    if (credential?.["id"] !== expected.id) return false;
    const existing = this.#sql.exec("SELECT mint, mint_attempt, id FROM private_credential_revocation WHERE scope = ? AND revoke = ? AND attempt = ?", scope, expected.revoke, expected.attempt).toArray()[0];
    if (existing) return existing["mint"] === expected.mint && existing["mint_attempt"] === expected.mintAttempt && existing["id"] === expected.id;
    this.#sql.exec("INSERT INTO private_credential_revocation (scope, revoke, attempt, mint, mint_attempt, id) VALUES (?, ?, ?, ?, ?, ?)", scope, expected.revoke, expected.attempt, expected.mint, expected.mintAttempt, expected.id).toArray();
    return true;
  }

  /** Bounded metadata of expected revocations still awaiting the caller's verified committed answer, never plaintext or an inferred answer. */
  revocations(after: RevocationPosition | null, limit: number): { items: ExpectedRevocation[]; more: boolean } {
    const scope = this.#scope();
    if (scope === null || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(limit + 1)) return { items: [], more: false };
    const rows = after === null
      ? this.#sql.exec("SELECT revoke, attempt, mint, mint_attempt, id FROM private_credential_revocation WHERE scope = ? AND done = 0 ORDER BY revoke, attempt LIMIT ?", scope, limit + 1).toArray()
      : this.#sql.exec("SELECT revoke, attempt, mint, mint_attempt, id FROM private_credential_revocation WHERE scope = ? AND done = 0 AND (revoke, attempt) > (?, ?) ORDER BY revoke, attempt LIMIT ?", scope, after.revoke, after.attempt, limit + 1).toArray();
    return {
      items: rows.slice(0, limit).map((row) => ({ revoke: row["revoke"] as OperationId, attempt: row["attempt"] as number, mint: row["mint"] as OperationId, mintAttempt: row["mint_attempt"] as number, id: row["id"] as string })),
      more: rows.length > limit,
    };
  }

  /** An explicit private read, including the plaintext, if custody still holds it. */
  read(mint: OperationId, attempt: number): ScopePrivateCredential | null {
    const scope = this.#scope();
    return scope === null ? null : this.#read(scope, mint, attempt);
  }

  /** An explicit private read of a usable token for that exact mint attempt, strictly before its end time. */
  live(mint: OperationId, attempt: number, now: Timestamp): ScopePrivateCredential | null {
    const credential = this.read(mint, attempt);
    const at = timeMs(now);
    const ends = credential ? timeMs(credential.ends) : null;
    return credential?.state === "live" && credential.plaintext !== null && credential.plaintext !== "" && at !== null && ends !== null && at < ends ? credential : null;
  }

  /** The custody row of that credential ID, including its plaintext if custody still holds it. An explicit private read. */
  held(id: string): ScopePrivateCredential | null {
    const scope = this.#scope();
    const row = scope === null ? undefined : this.#sql.exec("SELECT mint, attempt FROM private_credential WHERE scope = ? AND id = ?", scope, id).toArray()[0];
    return row ? this.#read(scope!, row["mint"] as OperationId, row["attempt"] as number) : null;
  }

  /**
   * The one-time take of a live plaintext by its ID (a member's read token, I5): strictly before its end, the plaintext is
   * returned and dropped from custody in the same step, so no second take finds it. At or after its end it is dropped and
   * nothing is returned. A held, revoked or dropped row returns nothing and changes nothing.
   */
  take(id: string, now: Timestamp): (ScopePrivateCredential & { plaintext: string }) | null {
    const credential = this.held(id);
    const scope = this.#scope();
    if (scope === null || credential?.state !== "live" || credential.plaintext === null || credential.plaintext === "") return null;
    this.#sql.exec("UPDATE private_credential SET plaintext = NULL WHERE scope = ? AND id = ?", scope, id).toArray();
    const [at, ends] = [timeMs(now), timeMs(credential.ends)];
    return at !== null && ends !== null && at < ends ? { ...credential, plaintext: credential.plaintext } : null;
  }

  /**
   * The caller has checked a mint's judgment. Only its exact confirmed live
   * metadata makes custody live. A rejected or mismatched judgment drops
   * plaintext without claiming the provider revoked anything. Confirmed
   * metadata records `live` even if custody lost the secret; the returned
   * boolean says whether custody still has usable plaintext.
   */
  judged(mint: OperationId, attempt: number, confirmed: CredentialReply | null): boolean {
    const scope = this.#scope();
    if (scope === null) return false;
    const credential = this.#read(scope, mint, attempt);
    if (!credential) return false;
    if (confirmed === null || credential.id !== confirmed.id || credential.ends !== confirmed.ends) {
      this.#sql.exec("UPDATE private_credential SET plaintext = NULL WHERE scope = ? AND mint = ? AND attempt = ?", scope, mint, attempt).toArray();
      return false;
    }
    if (credential.state === "revoked") return false;
    this.#sql.exec("UPDATE private_credential SET state = 'live' WHERE scope = ? AND mint = ? AND attempt = ?", scope, mint, attempt).toArray();
    return credential.plaintext !== null && credential.plaintext !== "";
  }

  /**
   * The caller verified an actual committed revocation answer. The update
   * and its trigger atomically drop plaintext and complete every matching
   * expected binding. No expiry, rejection or dropped plaintext calls this.
   */
  revoked(mint: OperationId, attempt: number): boolean {
    const scope = this.#scope();
    if (scope === null || !this.#read(scope, mint, attempt)) return false;
    this.#sql.exec("UPDATE private_credential SET state = 'revoked', plaintext = NULL WHERE scope = ? AND mint = ? AND attempt = ?", scope, mint, attempt).toArray();
    return true;
  }
}
