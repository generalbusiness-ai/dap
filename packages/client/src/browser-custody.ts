/**
 * A custody store in the browser (NF-5, ruling 0767a3f9 R5). IndexedDB keeps
 * each record whole, Web Locks give the identity lock and the exclusive
 * admission, and a BroadcastChannel tells the other tabs of this origin that a
 * record changed.
 *
 * - **Live records**: each unresolved record, and the newest
 *   `BROWSER_TERMINAL_LIVE` terminal records by their `updated` time.
 * - **Archive**: a terminal record leaves the live records when a terminal
 *   write makes more than that many live. It moves to the archive. `read`
 *   still finds an archived record, so `settle` still works on it.
 *   `byTarget` and `unresolved` list live records only. No record leaves the
 *   archive. A write of an archived record makes it live again.
 * - **Change signal**: `observe` hears each write of this store, and each write
 *   of another tab through the channel. A browser without BroadcastChannel
 *   signals the writes of this tab only.
 *
 * A browser with no IndexedDB or no Web Locks keeps no record: each call
 * rejects, and nothing is signed.
 */
import { canonicalize, digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { TERMINAL, type ClientCustodyStore, type Identity, type StoredCustodyRecord, type StoredOutcome } from "./custody.ts";

/** The most terminal records the browser store keeps live. Older terminal records move to the archive. */
export const BROWSER_TERMINAL_LIVE = 64;

type Handler = (() => void) | null;
interface Request<T> { result: T; onsuccess: Handler; onerror: Handler }
interface Store {
  get(key: string): Request<unknown>;
  getAll(): Request<unknown[]>;
  put(value: unknown, key: string): unknown;
  delete(key: string): unknown;
}
interface Transaction { objectStore(name: string): Store; oncomplete: Handler; onabort: Handler; onerror: Handler; abort(): void }
interface Database { objectStoreNames: { contains(name: string): boolean }; createObjectStore(name: string): unknown; transaction(names: string[], mode: "readonly" | "readwrite"): Transaction }
interface OpenRequest extends Request<Database> { onblocked: Handler; onupgradeneeded: Handler }
interface Locks { request<T>(name: string, options: { ifAvailable?: boolean }, work: (lock: unknown) => Promise<T>): Promise<T> }
interface Channel { postMessage(value: unknown): void; onmessage: ((event: { data: unknown }) => void) | null; close(): void }
/** What the store takes from the browser. A test passes a stand-in. */
export interface BrowserCustodyPlatform {
  indexedDB?: { open(name: string, version: number): OpenRequest };
  locks?: Locks;
  BroadcastChannel?: new (name: string) => Channel;
}

/** One live or archived record as the database holds it: the canonical text, and the fields the lists read. */
interface Row { id: string; who: string; phase: string; created: string; updated: string; text: string }

export interface BrowserCustodyOptions {
  /** The IndexedDB database. Choose a name that this application owns. */
  database: string;
  /** The prefix of each Web Lock and the BroadcastChannel name. */
  lock: string;
  /** A smaller bound of live terminal records, for a test. */
  terminalLive?: number;
  /** A smaller bound of unresolved records, for a test. */
  unresolvedMost?: number;
  platform?: BrowserCustodyPlatform;
}

const RECORDS = "records", ARCHIVE = "archive", SEGMENTS = "segments";
/** The service, membership, signer and target of an identity, as one digest: what `byTarget` matches. */
const whoOf = (identity: Omit<Identity, "key">): string =>
  digestBytes(utf8(canonicalize({ service: identity.service, membership: identity.membership, signer: identity.signer, target: identity.target })));

export function browserCustodyStore(options: BrowserCustodyOptions): ClientCustodyStore & { close(): void } {
  const { database: name, lock: prefix } = options;
  const terminalLive = options.terminalLive ?? BROWSER_TERMINAL_LIVE;
  if ([name, prefix].some((value) => typeof value !== "string" || value.length < 1 || value.length > 128) || !Number.isSafeInteger(terminalLive) || terminalLive < 1)
    throw new Error("Choose bounded browser custody names.");
  const platform = options.platform ?? {
    indexedDB: (globalThis as BrowserCustodyPlatform).indexedDB,
    locks: (globalThis as { navigator?: { locks?: Locks } }).navigator?.locks,
    BroadcastChannel: (globalThis as BrowserCustodyPlatform).BroadcastChannel,
  };
  const observers = new Set<() => void>();
  let channel: Channel | undefined;
  const openChannel = (): Channel | undefined => {
    if (channel || !platform.BroadcastChannel) return channel;
    channel = new platform.BroadcastChannel(prefix);
    channel.onmessage = () => { signal(); };
    return channel;
  };
  const signal = (): void => { for (const changed of [...observers]) { try { changed(); } catch { /* an observer never owns a write */ } } };
  const locks = (): Locks => { if (!platform.locks) throw new Error("This browser cannot keep a request safely: it has no Web Locks."); return platform.locks; };

  let opened: Promise<Database> | undefined;
  const open = (): Promise<Database> => {
    const idb = platform.indexedDB;
    if (!idb) return Promise.reject(new Error("This browser has no private storage."));
    return opened ??= new Promise<Database>((resolve, reject) => {
      const request = idb.open(name, 1);
      request.onupgradeneeded = () => { for (const store of [RECORDS, ARCHIVE, SEGMENTS]) if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = request.onblocked = () => { opened = undefined; reject(new Error("Private storage could not be opened.")); };
    });
  };
  /** One transaction. `work` reads with `get` and sets the value; the promise settles when the transaction commits. */
  async function transaction<T>(stores: string[], mode: "readonly" | "readwrite", work: (store: (name: string) => Store, done: (value: T) => void, fail: (error: Error) => void) => void): Promise<T> {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let value: T, failed: Error | null = null;
      tx.oncomplete = () => { if (failed) reject(failed); else resolve(value); };
      tx.onerror = tx.onabort = () => reject(failed ?? new Error("Private storage did not commit."));
      const fail = (error: Error) => { failed = error; try { tx.abort(); } catch { /* already terminal */ } };
      try { work((store) => tx.objectStore(store), (next) => { value = next; }, fail); } catch (error) { fail(error instanceof Error ? error : new Error("Private storage did not commit.")); }
    });
  }
  const got = <T>(request: Request<T>, then: (value: T) => void) => { request.onsuccess = () => then(request.result); };
  const rows = async (): Promise<Row[]> => transaction<Row[]>([RECORDS], "readonly", (store, done) => { got(store(RECORDS).getAll(), (all) => done(all as Row[])); });
  const textOf = (row: unknown): string | null => (row && typeof row === "object" && typeof (row as Row).text === "string" ? (row as Row).text : null);
  const readText = (id: string): Promise<string | null> => transaction<string | null>([RECORDS, ARCHIVE], "readonly", (store, done) => {
    got(store(RECORDS).get(id), (live) => {
      if (live !== undefined) { done(textOf(live)); return; }
      got(store(ARCHIVE).get(id), (archived) => done(archived === undefined ? null : textOf(archived)));
    });
  });
  const byUpdated = (a: Row, b: Row): number => (a.updated < b.updated ? -1 : a.updated > b.updated ? 1 : a.id < b.id ? -1 : 1);

  return {
    ...(options.unresolvedMost === undefined ? {} : { unresolvedMost: options.unresolvedMost }),
    lock: (id) => new Promise((resolve, reject) => {
      let release!: () => void;
      const held = new Promise<void>((done) => { release = done; });
      // The request settles after the browser releases the lock, so the release waits for it: a call that follows can take it.
      const request: Promise<void> = locks().request(`${prefix}:record:${id}`, { ifAvailable: true }, async (lock) => {
        if (!lock) { resolve(null); return; }
        resolve(async () => { release(); await request; });
        await held;
      });
      request.catch(reject);
    }),
    exclusive: (work) => locks().request(`${prefix}:exclusive`, {}, () => work()),
    read: async (id) => { const text = await readText(id); return text === null ? null : JSON.parse(text) as StoredCustodyRecord; },
    write: async (id, record) => {
      const text = canonicalize(record);
      const row: Row = { id, who: whoOf(record.identity), phase: record.phase, created: record.created, updated: record.updated, text };
      await transaction<void>([RECORDS, ARCHIVE], "readwrite", (store, done) => {
        store(RECORDS).put(row, id);
        store(ARCHIVE).delete(id);
        if (!TERMINAL.has(record.phase)) { done(undefined); return; }
        // A terminal write: past the bound, the oldest terminal records move to the archive in this transaction.
        got(store(RECORDS).getAll(), (all) => {
          const terminal = (all as Row[]).filter((r) => TERMINAL.has(r.phase as never)).sort(byUpdated);
          for (const old of terminal.slice(0, Math.max(0, terminal.length - terminalLive))) { store(ARCHIVE).put(old, old.id); store(RECORDS).delete(old.id); }
          done(undefined);
        });
      });
      if (await readText(id) !== text) throw new Error("read back differs");
      signal();
      openChannel()?.postMessage({ changed: id });
    },
    unresolved: async () => (await rows()).filter((r) => !TERMINAL.has(r.phase as never)).sort((a, b) => (a.created < b.created ? -1 : 1))
      .map((r) => ({ id: r.id, key: (JSON.parse(r.text) as StoredCustodyRecord).identity.key, created: r.created })),
    segment: async (id, at, outcomes) => {
      await transaction<void>([SEGMENTS], "readwrite", (store, done, fail) => {
        got(store(SEGMENTS).get(id), (held) => {
          const kept = (held as StoredOutcome[] | undefined) ?? [];
          if (kept.length < at) { fail(new Error(`the segment of ${id} holds fewer outcomes than its record counts`)); return; }
          store(SEGMENTS).put([...kept.slice(0, at), ...JSON.parse(canonicalize(outcomes as never)) as StoredOutcome[]], id);
          done(undefined);
        });
      });
    },
    segmented: (id, from, limit) => transaction<StoredOutcome[]>([SEGMENTS], "readonly", (store, done) => {
      got(store(SEGMENTS).get(id), (held) => done(((held as StoredOutcome[] | undefined) ?? []).slice(from, from + limit)));
    }),
    byTarget: async (who) => {
      const wanted = whoOf(who);
      return (await rows()).filter((r) => r.who === wanted).sort((a, b) => (a.created < b.created ? -1 : 1))
        .map((r) => ({ id: r.id, key: (JSON.parse(r.text) as StoredCustodyRecord).identity.key, phase: r.phase as never, created: r.created }));
    },
    observe: (changed) => { openChannel(); const own = () => changed(); observers.add(own); return () => { observers.delete(own); }; },
    close: () => { observers.clear(); channel?.close(); channel = undefined; },
  };
}
