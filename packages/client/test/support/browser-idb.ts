/**
 * STAND-INs for the browser custody store: IndexedDB, Web Locks and BroadcastChannel in memory. A transaction applies each
 * write at once and an abort rolls nothing back; an aborted version upgrade does roll back its new stores and its version.
 * They show what the store reads, writes, lists and signals. The real browser path is the witness of request c288c917.
 */
import { browserCustodyStore, type BrowserCustodyPlatform } from "../../src/index.ts";

type Handler = (() => void) | null;
/** One origin: its databases, its locks and its channels, shared by each tab that `tab()` opens. */
export function origin(channelFailure?: "construct" | "post") {
  type Key = string | (string | number)[];
  type Range = { lower: Key; upper: Key; lowerOpen: boolean; upperOpen: boolean };
  const databases = new Map<string, Map<string, Map<string, unknown>>>(), versions = new Map<string, number>();
  type Connection = { closed: boolean; onversionchange: Handler };
  const connections = new Map<string, Set<Connection>>();
  const key = (value: Key): string => JSON.stringify(value);
  const compare = (a: Key, b: Key): number => {
    if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
    if (!Array.isArray(a) || !Array.isArray(b)) throw Error("TEST incomparable key");
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i]! < b[i]! ? -1 : 1;
    return a.length - b.length;
  };
  const held = new Set<string>(), waiting = new Map<string, (() => void)[]>();
  const channels = new Map<string, Set<{ onmessage: ((event: { data: unknown }) => void) | null }>>();
  const later = (work: () => void) => { setTimeout(work, 0); };
  const transaction = (db: Map<string, Map<string, unknown>>) => {
    let pending = 0, ended = false;
    const tx = { oncomplete: null as Handler, onabort: null as Handler, onerror: null as Handler,
      abort() { ended = true; later(() => tx.onabort?.()); },
      objectStore(name: string) {
        const store = db.get(name)!;
        const request = <T>(run: () => T) => {
          const r = { result: undefined as T, onsuccess: null as Handler, onerror: null as Handler };
          pending++;
          queueMicrotask(() => { r.result = run(); r.onsuccess?.(); pending--; settle(); });
          return r;
        };
        return {
          keyPath: null, autoIncrement: false,
          get: (value: Key) => request(() => structuredClone(store.get(key(value)))),
          getKey: (value: Key) => request(() => store.has(key(value)) ? value : undefined),
          openCursor: (range?: Range) => {
            const entries = [...store.entries()].map(([encoded, value]) => ({ key: JSON.parse(encoded) as Key, value }))
              .filter(({ key: value }) => !range || (compare(value, range.lower) >= (range.lowerOpen ? 1 : 0) && compare(value, range.upper) <= (range.upperOpen ? -1 : 0)))
              .sort((a, b) => compare(a.key, b.key));
            let index = 0;
            type Cursor = { key: Key; value: unknown; continue(): void } | null;
            const r = { result: null as Cursor, onsuccess: null as Handler, onerror: null as Handler };
            const next = () => {
              pending++;
              queueMicrotask(() => {
                const entry = entries[index++];
                r.result = entry ? { key: entry.key, value: structuredClone(entry.value), continue: next } : null;
                r.onsuccess?.(); pending--; settle();
              });
            };
            next();
            return r;
          },
          put: (value: unknown, at: Key) => { store.set(key(at), structuredClone(value)); return {}; },
          delete: (at: Key | Range) => {
            if (typeof at === "string" || Array.isArray(at)) store.delete(key(at));
            else for (const encoded of store.keys()) {
              const value = JSON.parse(encoded) as Key;
              if (compare(value, at.lower) >= (at.lowerOpen ? 1 : 0) && compare(value, at.upper) <= (at.upperOpen ? -1 : 0)) store.delete(encoded);
            }
            return {};
          },
        };
      },
    };
    const settle = () => later(() => { if (pending === 0 && !ended) { ended = true; tx.oncomplete?.(); } });
    later(() => settle());
    return tx;
  };
  const platform = (): BrowserCustodyPlatform => ({
    indexedDB: { open(name: string, version: number) {
      type Upgrade = { abort(): void; objectStore(name: string): { keyPath: null; autoIncrement: false } };
      const r = { result: undefined as never, transaction: null as Upgrade | null, onsuccess: null as Handler, onerror: null as Handler, onblocked: null as Handler,
        onupgradeneeded: null as ((event: { oldVersion: number }) => void) | null };
      later(() => {
        const oldVersion = versions.get(name) ?? 0;
        // A request for an older version than the database holds fails, as VersionError does.
        if (version < oldVersion) { r.onerror?.(); return; }
        // A newer version first asks every open connection to close. One that stays open blocks the upgrade.
        if (oldVersion < version) {
          const open = connections.get(name) ?? new Set();
          for (const other of [...open]) other.onversionchange?.();
          if ([...open].some(other => !other.closed)) { r.onblocked?.(); return; }
        }
        const db = databases.get(name) ?? new Map<string, Map<string, unknown>>();
        databases.set(name, db);
        const own = connections.get(name) ?? new Set<Connection>();
        connections.set(name, own);
        const connection: Connection & Record<string, unknown> = { version, closed: false, close() { this.closed = true; own.delete(this); }, onversionchange: null, onclose: null,
          objectStoreNames: { get length() { return db.size; }, contains: (n: string) => db.has(n) },
          createObjectStore: (n: string) => db.set(n, new Map()), transaction: () => transaction(db) };
        r.result = connection as never;
        if (oldVersion < version) {
          // The upgrade transaction: an abort removes the stores it created and keeps the earlier version.
          const before = new Set(db.keys());
          let aborted = false;
          r.transaction = { abort() { aborted = true; }, objectStore(n: string) {
            if (!db.has(n)) throw Error("TEST no such store");
            return { keyPath: null, autoIncrement: false };
          } };
          r.onupgradeneeded?.({ oldVersion });
          r.transaction = null;
          if (aborted) {
            for (const n of [...db.keys()]) if (!before.has(n)) db.delete(n);
            if (oldVersion === 0) databases.delete(name);
            r.onerror?.();
            return;
          }
          versions.set(name, version);
        }
        own.add(r.result as Connection);
        r.onsuccess?.();
      });
      // The stand-in models only the upgrade transaction's abort and store schema.
      return r as unknown as ReturnType<NonNullable<BrowserCustodyPlatform["indexedDB"]>["open"]>;
    } },
    IDBKeyRange: { bound: (lower, upper, lowerOpen = false, upperOpen = false) => ({ lower, upper, lowerOpen, upperOpen }) },
    locks: { async request<T>(name: string, options: { ifAvailable?: boolean }, work: (lock: unknown) => Promise<T>): Promise<T> {
      if (held.has(name)) {
        if (options.ifAvailable) return work(null);
        await new Promise<void>((resolve) => { waiting.set(name, [...(waiting.get(name) ?? []), resolve]); });
      }
      held.add(name);
      try { return await work({ name }); } finally {
        const next = waiting.get(name)?.shift();
        if (next) next(); else held.delete(name);
      }
    } },
    BroadcastChannel: class {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      constructor(readonly name: string) { if (channelFailure === "construct") throw Error("TEST channel"); channels.set(name, (channels.get(name) ?? new Set()).add(this)); }
      postMessage(data: unknown) { if (channelFailure === "post") throw Error("TEST channel"); for (const other of channels.get(this.name) ?? []) if (other !== this) later(() => other.onmessage?.({ data })); }
      close() { channels.get(this.name)?.delete(this); }
    } as never,
  });
  const tab = (more: { terminalLive?: number } = {}) => browserCustodyStore({ database: "TEST custody", lock: "TEST custody", platform: platform(), ...more });
  const raw = (store: string) => databases.get("TEST custody")!.get(store)!;
  /** The database as its stand-in holds it: its version and its store names. */
  const layout = () => ({ version: versions.get("TEST custody") ?? 0, stores: [...databases.get("TEST custody")?.keys() ?? []].sort() });
  /**
   * Make this origin's database a version 2 database: the version 3 layout without the authorization store. Version 3 changes
   * no custody row, so the rows that remain are exactly what a version 2 store writes. `without` removes more stores.
   */
  const released = (...without: string[]) => {
    const db = databases.get("TEST custody")!;
    for (const store of ["authorizations", ...without]) db.delete(store);
    versions.set("TEST custody", 2);
  };
  /** Another page opens this origin's database at a newer version, with no new store. */
  const upgrade = (version: number) => new Promise<"upgraded" | "blocked" | "failed">(resolve => {
    const r = platform().indexedDB!.open("TEST custody", version);
    r.onsuccess = () => { (r.result as { close(): void }).close(); resolve("upgraded"); };
    r.onblocked = () => resolve("blocked");
    r.onerror = () => resolve("failed");
  });
  return { tab, raw, key, layout, released, upgrade };
}
