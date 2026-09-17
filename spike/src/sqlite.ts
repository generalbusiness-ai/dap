// Storage only: append.ts owns admission, construction and retry ordering.
import { DatabaseSync } from 'node:sqlite';
import { deepFreeze, type Backend, type RetryRecord } from './append.ts';
import type { Entry } from './types.ts';
export const CRASH_POINTS = ['before-write', 'after-entry', 'after-head', 'after-retry', 'after-consumption', 'after-outbox', 'before-commit', 'after-commit'] as const;
export type CrashPoint = typeof CRASH_POINTS[number];
export interface OutboxRecord { readonly position: number; readonly headerHash: string; readonly entry: Entry }
export interface SQLiteOptions { writer: string; profile: string; fault?: (point: CrashPoint) => void }
export class SQLiteBackend implements Backend {
  readonly writer: string;
  readonly profile: string;
  private readonly db: DatabaseSync;
  private readonly fault?: SQLiteOptions['fault'];
  private busy = false;
  private closed = false;
  constructor(path: string, opts: SQLiteOptions) {
    this.writer = opts.writer;
    this.profile = opts.profile;
    this.db = new DatabaseSync(path);
    this.fault = opts.fault;
    try {
      this.db.exec('PRAGMA busy_timeout=0; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA locking_mode=EXCLUSIVE; BEGIN EXCLUSIVE;');
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS metadata (name TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS entries (position INTEGER PRIMARY KEY, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS head (slot INTEGER PRIMARY KEY CHECK(slot=1), position INTEGER NOT NULL, hash TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS retries (action_id TEXT PRIMARY KEY, body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS consumed (token_id TEXT PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS outbox (position INTEGER PRIMARY KEY, header_hash TEXT UNIQUE NOT NULL, delivered INTEGER NOT NULL DEFAULT 0 CHECK(delivered IN (0,1)));
      `);
      for (const [name, value] of Object.entries({ schema: 'dap-o1-sqlite/1', writer: opts.writer, profile: opts.profile })) {
        const old = this.db.prepare('SELECT value FROM metadata WHERE name=?').get(name);
        if (old && old.value !== value) throw new Error('SQLiteBackend: ' + name + ' mismatch');
        this.db.prepare('INSERT INTO metadata(name,value) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value').run(name, value);
      }
      this.db.exec('COMMIT');
      this.checkIndexes();
    } catch (error) {
      // A secondary rollback/close failure must not replace the operation's
      // original exception. Closing is attempted even when rollback fails.
      try { if (this.db.isTransaction) this.db.exec('ROLLBACK'); }
      finally { try { this.db.close(); } finally { throw error; } }
    }
  }
  private checkIndexes(): void {
    const rows = this.db.prepare('SELECT position,body FROM entries ORDER BY position').all();
    const entries = rows.map(r => JSON.parse(String(r.body)) as Entry);
    if (rows.some((r, i) => r.position !== i || entries[i]?.position !== i)) throw new Error('SQLiteBackend: SQL position disagrees with entry');
    if (entries.some((e, i) => e.position !== i)) throw new Error('SQLiteBackend: non-dense journal');
    const stored = this.db.prepare('SELECT position,hash FROM head WHERE slot=1').get();
    const head = entries.at(-1);
    if (head ? stored?.position !== head.position || stored.hash !== head.headerHash : stored !== undefined) throw new Error('SQLiteBackend: inconsistent head');
    const byAction = new Map(entries.filter(e => e.event.action_id).map(e => [e.event.action_id!, e]));
    const retries = this.db.prepare('SELECT action_id,body FROM retries').all();
    if (retries.length !== byAction.size) throw new Error('SQLiteBackend: retry index count');
    for (const r of retries) {
      const record = JSON.parse(String(r.body)) as RetryRecord;
      const entry = byAction.get(String(r.action_id));
      if (!entry || record.actionId !== r.action_id || record.contentId !== entry.id || record.receipt.headerHash !== entry.headerHash || JSON.stringify(record.receipt.header) !== JSON.stringify(entry.header) || record.receipt.replay !== false) throw new Error('SQLiteBackend: corrupt retry index');
    }
    const outbox = this.db.prepare('SELECT position,header_hash FROM outbox ORDER BY position').all();
    if (outbox.length !== entries.length || outbox.some((r, i) => r.position !== i || r.header_hash !== entries[i]!.headerHash)) throw new Error('SQLiteBackend: corrupt outbox');
  }
  serialized<T>(fn: () => T): T {
    if (this.busy || this.closed) throw new Error('SQLiteBackend: unavailable or re-entrant transaction');
    this.busy = true;
    try {
      this.db.exec('BEGIN IMMEDIATE');
      const result = fn();
      if (result && typeof (result as { then?: unknown }).then === 'function') throw new Error('SQLiteBackend: transaction callback must be synchronous');
      this.fault?.('before-commit');
      this.db.exec('COMMIT');
      this.fault?.('after-commit');
      return result;
    } catch (error) {
      try { if (this.db.isTransaction) this.db.exec('ROLLBACK'); }
      finally { throw error; }
    }
    finally { this.busy = false; }
  }
  get(position: number): Entry | undefined {
    const row = this.db.prepare('SELECT body FROM entries WHERE position=?').get(position);
    return row ? deepFreeze(JSON.parse(String(row.body)) as Entry) : undefined;
  }
  entries(): readonly Entry[] { return Object.freeze(this.db.prepare('SELECT body FROM entries ORDER BY position').all().map(r => deepFreeze(JSON.parse(String(r.body)) as Entry))); }
  head(): Entry | undefined {
    const row = this.db.prepare('SELECT position FROM head WHERE slot=1').get();
    return row ? this.get(Number(row.position)) : undefined;
  }
  retry(actionId: string): RetryRecord | undefined {
    const row = this.db.prepare('SELECT body FROM retries WHERE action_id=?').get(actionId);
    return row ? deepFreeze(JSON.parse(String(row.body)) as RetryRecord) : undefined;
  }
  isConsumed(tokenId: string): boolean { return !!this.db.prepare('SELECT token_id FROM consumed WHERE token_id=?').get(tokenId); }
  consumedTokens(): string[] { return this.db.prepare('SELECT token_id FROM consumed ORDER BY token_id').all().map(r => String(r.token_id)); }
  commit(entry: Entry, retry: RetryRecord | undefined, consume: string | undefined): void {
    if (!this.busy || !this.db.isTransaction) throw new Error('SQLiteBackend: commit outside transaction');
    const head = this.head();
    if (entry.position !== (head?.position ?? -1) + 1 || (head && entry.header.prev !== head.headerHash)) throw new Error('SQLiteBackend: entry is not head+1');
    if (!Object.isFrozen(entry) || !Object.isFrozen(entry.event)) throw new Error('SQLiteBackend: unfrozen entry');
    this.fault?.('before-write');
    this.db.prepare('INSERT INTO entries(position,body) VALUES(?,?)').run(entry.position, JSON.stringify(entry));
    this.fault?.('after-entry');
    this.db.prepare('INSERT INTO head(slot,position,hash) VALUES(1,?,?) ON CONFLICT(slot) DO UPDATE SET position=excluded.position,hash=excluded.hash').run(entry.position, entry.headerHash);
    this.fault?.('after-head');
    if (retry) this.db.prepare('INSERT INTO retries(action_id,body) VALUES(?,?)').run(retry.actionId, JSON.stringify(retry));
    this.fault?.('after-retry');
    if (consume) this.db.prepare('INSERT INTO consumed(token_id) VALUES(?)').run(consume);
    this.fault?.('after-consumption');
    this.db.prepare('INSERT INTO outbox(position,header_hash) VALUES(?,?)').run(entry.position, entry.headerHash);
    this.fault?.('after-outbox');
  }
  pending(): OutboxRecord[] { return this.db.prepare('SELECT position,header_hash FROM outbox WHERE delivered=0 ORDER BY position').all().map(r => deepFreeze({ position: Number(r.position), headerHash: String(r.header_hash), entry: this.get(Number(r.position))! })); }
  /** At-least-once: acknowledge only after callback success. Consumers dedupe by headerHash. */
  async drain(deliver: (record: OutboxRecord) => void | Promise<void>): Promise<void> {
    for (const record of this.pending()) {
      await deliver(record);
      this.serialized(() => { this.db.prepare('UPDATE outbox SET delivered=1 WHERE position=? AND header_hash=?').run(record.position, record.headerHash); });
    }
  }
  close(): void { if (!this.closed) { this.db.close(); this.closed = true; } }
}
