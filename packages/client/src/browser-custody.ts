/**
 * Browser custody: whole records, bounded outcome-position reads and Web Locks.
 * Older terminal records move to an archive; reads still find them.
 * BroadcastChannel supplies optional invalidation hints, never write authority.
 * Version 2 is the first released layout (planner ruling 14609eb8).
 */
import { canonicalize, digestBytes, isRecord, utf8 } from "@generalbusiness/dap-bytes";
import { CustodyError, TERMINAL, identityId, readStoredCustodyRecord, readStoredOutcome,
  type ClientCustodyStore, type Identity, type Phase, type StoredCustodyRecord, type StoredOutcome } from "./custody.ts";

export const BROWSER_TERMINAL_LIVE = 64;
type Handler = (() => void) | null;
type Key = string | (string | number)[];
interface Range { readonly lower: unknown; readonly upper: unknown; readonly lowerOpen: boolean; readonly upperOpen: boolean }
interface Request<T> { result: T; onsuccess: Handler; onerror: Handler }
interface Cursor { key: unknown; value: unknown; continue(): void }
interface Store {
  readonly keyPath: unknown;
  readonly autoIncrement: boolean;
  get(key: Key): Request<unknown>;
  getKey(key: Key): Request<unknown>;
  openCursor(range?: Range): Request<Cursor | null>;
  put(value: unknown, key: Key): unknown;
  delete(key: Key | Range): unknown;
}
interface Transaction { objectStore(name: string): Store; oncomplete: Handler; onabort: Handler; onerror: Handler; abort(): void }
interface Database {
  readonly version: number;
  objectStoreNames: { readonly length: number; contains(name: string): boolean };
  createObjectStore(name: string): unknown;
  transaction(names: string[], mode: "readonly" | "readwrite"): Transaction;
  close(): void;
  onversionchange: Handler;
  onclose: Handler;
}
interface OpenRequest extends Request<Database> { transaction: Transaction | null; onblocked: Handler; onupgradeneeded: ((event: { oldVersion: number }) => void) | null }
interface Locks { request<T>(name: string, options: { ifAvailable?: boolean }, work: (lock: unknown) => Promise<T>): Promise<T> }
interface Channel { postMessage(value: unknown): void; onmessage: ((event: { data: unknown }) => void) | null; close(): void }
/** Browser capabilities only. Stand-ins cannot prove native transaction atomicity. */
export interface BrowserCustodyPlatform {
  indexedDB?: { open(name: string, version: number): OpenRequest };
  IDBKeyRange?: { bound(lower: Key, upper: Key, lowerOpen?: boolean, upperOpen?: boolean): Range };
  locks?: Locks;
  BroadcastChannel?: new (name: string) => Channel;
}
interface Row { id: string; who: string; phase: Phase; created: string; updated: string; text: string }
export interface BrowserCustodyOptions {
  database: string;
  lock: string;
  terminalLive?: number;
  unresolvedMost?: number;
  platform?: BrowserCustodyPlatform;
}
const RECORDS = "records", ARCHIVE = "archive", OUTCOMES = "outcomes", LENGTHS = "lengths";
const STORES = [RECORDS, ARCHIVE, OUTCOMES, LENGTHS];
const unavailable = (): CustodyError => new CustodyError({ held: "unreadable" });
const whoOf = (identity: Omit<Identity, "key">): string => digestBytes(utf8(canonicalize({ service: identity.service, membership: identity.membership, signer: identity.signer, target: identity.target })));
const natural = (n: unknown): n is number => Number.isSafeInteger(n) && !Object.is(n, -0) && (n as number) >= 0;
const byUpdated = (a: Row, b: Row): number => a.updated < b.updated ? -1 : a.updated > b.updated ? 1 : a.id.localeCompare(b.id);

export function browserCustodyStore(options: BrowserCustodyOptions): ClientCustodyStore & { close(): void } {
  const { database: name, lock: prefix } = options;
  const terminalLive = options.terminalLive ?? BROWSER_TERMINAL_LIVE;
  if ([name, prefix].some(value => typeof value !== "string" || value.length < 1 || value.length > 128) || !Number.isSafeInteger(terminalLive) || terminalLive < 1) throw new Error("Choose bounded browser custody names.");
  const platform = options.platform ?? {
    indexedDB: (globalThis as BrowserCustodyPlatform).indexedDB,
    IDBKeyRange: (globalThis as BrowserCustodyPlatform).IDBKeyRange,
    locks: (globalThis as { navigator?: { locks?: Locks } }).navigator?.locks,
    BroadcastChannel: (globalThis as BrowserCustodyPlatform).BroadcastChannel,
  };
  let retired = false, connection: Database | undefined, opened: Promise<Database> | undefined, channel: Channel | undefined, abandonOpen: (() => void) | undefined;
  const observers = new Set<() => void>();
  const current = (): void => { if (retired) throw unavailable(); };
  const retire = (): void => {
    retired = true;
    abandonOpen?.();
    observers.clear();
    try { channel?.close(); } catch { /* notification cleanup never owns custody */ }
    channel = undefined;
    connection?.close();
    connection = undefined;
  };
  const signal = (): void => { for (const changed of [...observers]) { if (retired) return; try { changed(); } catch { /* an observer never owns a write */ } } };
  const openChannel = (): Channel | undefined => {
    if (retired || channel || !platform.BroadcastChannel) return channel;
    try { channel = new platform.BroadcastChannel(prefix); channel.onmessage = signal; } catch { channel = undefined; }
    return channel;
  };
  const notify = (id: string): void => {
    signal();
    if (!retired) try { openChannel()?.postMessage({ changed: id }); } catch { /* a committed write does not depend on notification */ }
  };
  const locks = (): Locks => { current(); if (!platform.locks) throw unavailable(); return platform.locks; };
  const open = (): Promise<Database> => {
    current();
    if (!platform.indexedDB) return Promise.reject(unavailable());
    return opened ??= new Promise<Database>((resolve, reject) => {
      const request = platform.indexedDB!.open(name, 2);
      let abandoned = false;
      const fail = (): void => { abandoned = true; reject(unavailable()); };
      abandonOpen = fail;
      request.onupgradeneeded = event => {
        // There is no released predecessor. Never clear, convert or upgrade an unexpected database.
        if (retired || abandoned || event.oldVersion !== 0) { request.transaction?.abort(); fail(); return; }
        for (const store of STORES) request.result.createObjectStore(store);
      };
      request.onblocked = request.onerror = fail;
      request.onsuccess = () => {
        const db = request.result;
        if (retired || abandoned || db.version !== 2 || db.objectStoreNames.length !== STORES.length || STORES.some(store => !db.objectStoreNames.contains(store))) { db.close(); fail(); return; }
        try {
          const schema = db.transaction(STORES, "readonly");
          if (STORES.some(name => schema.objectStore(name).keyPath !== null || schema.objectStore(name).autoIncrement)) { db.close(); fail(); return; }
        } catch { db.close(); fail(); return; }
        connection = db;
        abandonOpen = undefined;
        db.onversionchange = retire;
        db.onclose = retire;
        resolve(db);
      };
    });
  };
  /** A transaction already created finishes by its own commit or abort, even if the instance retires meanwhile. */
  async function transaction<T>(names: string[], mode: "readonly" | "readwrite", work: (store: (name: string) => Store, done: (value: T) => void, fail: (error: Error) => void) => void): Promise<T> {
    const db = await open();
    current();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(names, mode);
      let value: T, failed: Error | undefined;
      tx.oncomplete = () => failed ? reject(failed) : resolve(value);
      tx.onerror = tx.onabort = () => reject(failed ?? unavailable());
      const fail = (error: Error): void => { failed = error; try { tx.abort(); } catch { reject(error); } };
      try { work(store => tx.objectStore(store), next => { value = next; }, fail); } catch (error) { fail(error instanceof Error ? error : unavailable()); }
    });
  }
  // A validation exception in an IDB event handler must settle our promise, not escape the callback.
  const got = <T>(request: Request<T>, next: (value: T) => void, fail: (error: Error) => void): void => {
    request.onsuccess = () => { try { next(request.result); } catch (error) { fail(error instanceof Error ? error : unavailable()); } };
  };
  const rowOf = (key: unknown, value: unknown): { row: Row; record: StoredCustodyRecord } => {
    if (!isRecord(value) || typeof value["text"] !== "string") throw unavailable();
    let record: StoredCustodyRecord;
    try { record = readStoredCustodyRecord(JSON.parse(value["text"])); } catch { throw unavailable(); }
    if (record.v !== 2) throw unavailable();
    if (typeof key !== "string" || value["id"] !== key || identityId(record.identity) !== key || value["who"] !== whoOf(record.identity) ||
      value["phase"] !== record.phase || value["created"] !== record.created || value["updated"] !== record.updated) throw unavailable();
    return { row: value as unknown as Row, record };
  };
  const collect = (store: Store, done: (rows: Row[]) => void, fail: (error: Error) => void): void => {
    const rows: Row[] = [];
    got(store.openCursor(), cursor => {
      if (!cursor) { done(rows); return; }
      rows.push(rowOf(cursor.key, cursor.value).row);
      cursor.continue();
    }, fail);
  };
  const rows = (): Promise<Row[]> => transaction([RECORDS], "readonly", (store, done, fail) => collect(store(RECORDS), done, fail));
  const segmentLength = (store: Store, id: string, next: (length: number, exists: boolean) => void, fail: (error: Error) => void): void => {
    got(store.getKey(id), key => {
      if (key === undefined) { next(0, false); return; }
      got(store.get(id), held => { if (!natural(held)) throw unavailable(); next(held, true); }, fail);
    }, fail);
  };
  const emptyPositions = (store: Store, id: string, empty: () => void, fail: (error: Error) => void): void => {
    if (!platform.IDBKeyRange) throw unavailable();
    // Appending NUL is the immediate string successor. This prefix includes every second-key type, even malformed ones.
    const prefix = platform.IDBKeyRange.bound([id], [id + "\u0000"], false, true);
    got(store.getKey(id), plainKey => {
      if (plainKey !== undefined) throw unavailable();
      got(store.openCursor(prefix), cursor => { if (cursor) throw unavailable(); empty(); }, fail);
    }, fail);
  };
  const read = (id: string): Promise<StoredCustodyRecord | null> => transaction([RECORDS, ARCHIVE, LENGTHS, OUTCOMES], "readonly", (store, done, fail) => {
    const absent = (): void => {
      segmentLength(store(LENGTHS), id, (_length, exists) => {
        if (exists) throw unavailable();
        emptyPositions(store(OUTCOMES), id, () => done(null), fail);
      }, fail);
    };
    const found = (value: unknown): void => {
      const record = rowOf(id, value).record;
      segmentLength(store(LENGTHS), id, (length, exists) => {
        if (length < record.count - record.outcomes.length) throw unavailable();
        if (!exists) emptyPositions(store(OUTCOMES), id, () => done(record), fail);
        else done(record);
      }, fail);
    };
    got(store(RECORDS).getKey(id), liveKey => {
      if (liveKey !== undefined) { got(store(RECORDS).get(id), found, fail); return; }
      got(store(ARCHIVE).getKey(id), archivedKey => {
        if (archivedKey === undefined) absent();
        else got(store(ARCHIVE).get(id), found, fail);
      }, fail);
    }, fail);
  });
  const range = (id: string, from: number, to: number): Range => {
    if (!platform.IDBKeyRange) throw unavailable();
    return platform.IDBKeyRange.bound([id, from], [id, to], false, true);
  };
  return {
    ...(options.unresolvedMost === undefined ? {} : { unresolvedMost: options.unresolvedMost }),
    lock: id => new Promise((resolve, reject) => {
      let release!: () => void;
      const held = new Promise<void>(done => { release = done; });
      let request: Promise<void>;
      try {
        request = locks().request(`${prefix}:record:${id}`, { ifAvailable: true }, async lock => {
          current();
          if (!lock) { resolve(null); return; }
          resolve(async () => { release(); await request; });
          await held;
        });
        request.catch(reject);
      } catch (error) { reject(error); }
    }),
    exclusive: async work => locks().request(`${prefix}:exclusive`, {}, async () => { current(); return work(); }),
    admit: async () => { current(); },
    read,
    write: async (id, value, _options) => {
      current();
      const record = readStoredCustodyRecord(value), text = canonicalize(record);
      if (record.v !== 2 || identityId(record.identity) !== id) throw unavailable();
      const row: Row = { id, who: whoOf(record.identity), phase: record.phase, created: record.created, updated: record.updated, text };
      await transaction<void>([RECORDS, ARCHIVE], "readwrite", (store, done, fail) => {
        // Validate before replacing: malformed phase/target projections cannot disappear from admission or archive selection.
        collect(store(RECORDS), existing => {
          store(RECORDS).put(row, id);
          store(ARCHIVE).delete(id);
          const after = [...existing.filter(old => old.id !== id), row];
          if (TERMINAL.has(record.phase)) {
            const terminal = after.filter(old => TERMINAL.has(old.phase)).sort(byUpdated);
            for (const old of terminal.slice(0, Math.max(0, terminal.length - terminalLive))) { store(ARCHIVE).put(old, old.id); store(RECORDS).delete(old.id); }
          }
          // Verify the put's bytes in this transaction, then await complete. Notification cannot change its outcome.
          got(store(RECORDS).get(id), live => {
            if (live !== undefined) { if (rowOf(id, live).row.text !== text) throw unavailable(); done(undefined); return; }
            got(store(ARCHIVE).get(id), archived => { if (archived === undefined || rowOf(id, archived).row.text !== text) throw unavailable(); done(undefined); }, fail);
          }, fail);
        }, fail);
      });
      notify(id);
    },
    unresolved: async () => (await rows()).filter(row => !TERMINAL.has(row.phase)).sort((a, b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id))
      .map(row => ({ id: row.id, key: readStoredCustodyRecord(JSON.parse(row.text)).identity.key, created: row.created })),
    segment: async (id, at, outcomes) => {
      current();
      if (!natural(at) || !Number.isSafeInteger(at + outcomes.length)) throw unavailable();
      const owned = JSON.parse(canonicalize(outcomes as never)) as unknown[];
      for (const outcome of owned) readStoredOutcome(outcome);
      await transaction<void>([LENGTHS, OUTCOMES], "readwrite", (store, done, fail) => {
        segmentLength(store(LENGTHS), id, (length, exists) => {
          if (at > length) throw unavailable();
          const append = (): void => {
            if (at < length) store(OUTCOMES).delete(range(id, at, length));
            for (let index = 0; index < owned.length; index++) store(OUTCOMES).put(owned[index], [id, at + index]);
            store(LENGTHS).put(at + owned.length, id);
            done(undefined);
          };
          if (!exists) emptyPositions(store(OUTCOMES), id, append, fail);
          else append();
        }, fail);
      });
    },
    segmented: async (id, from, limit) => {
      current();
      if (!natural(from) || !natural(limit) || !Number.isSafeInteger(from + limit)) return Promise.reject(unavailable());
      return transaction<StoredOutcome[]>([LENGTHS, OUTCOMES], "readonly", (store, done, fail) => {
        segmentLength(store(LENGTHS), id, (length, exists) => {
          const end = Math.min(length, from + limit);
          if (!exists) {
            emptyPositions(store(OUTCOMES), id, () => done([]), fail);
            return;
          }
          if (from >= end) { done([]); return; }
          const out: StoredOutcome[] = [];
          got(store(OUTCOMES).openCursor(range(id, from, end)), cursor => {
            if (!cursor) { if (out.length !== end - from) throw unavailable(); done(out); return; }
            if (!Array.isArray(cursor.key) || cursor.key.length !== 2 || cursor.key[0] !== id || cursor.key[1] !== from + out.length) throw unavailable();
            out.push(readStoredOutcome(cursor.value));
            cursor.continue();
          }, fail);
        }, fail);
      });
    },
    byTarget: async who => (await rows()).filter(row => row.who === whoOf(who)).sort((a, b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id))
      .map(row => ({ id: row.id, key: readStoredCustodyRecord(JSON.parse(row.text)).identity.key, phase: row.phase, created: row.created })),
    observe: changed => { current(); openChannel(); const own = () => changed(); observers.add(own); return () => { observers.delete(own); }; },
    close: retire,
  };
}
