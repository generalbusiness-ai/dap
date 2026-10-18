/** Private browser slots. These are trusted-host primitives, not an origin
 * isolation boundary. Callers admit identity/values and hold the lock around
 * read/compare/write sequences. No session or credential is inferred here. */
import type { CustodyLock } from "./request-custody.ts";
type Handler = (() => void) | null;
interface Request<T> { result: T; onsuccess: Handler; onerror: Handler }
interface Store { get(key: string): Request<unknown>; put(value: unknown, key: string): unknown; delete(key: string): unknown }
interface Transaction { objectStore(name: string): Store; oncomplete: Handler; onabort: Handler; onerror: Handler; abort(): void }
interface Database { objectStoreNames: { contains(name: string): boolean }; createObjectStore(name: string): unknown; transaction(name: string, mode: "readonly" | "readwrite"): Transaction }
interface OpenRequest extends Request<Database> { onblocked: Handler; onupgradeneeded: Handler }
interface Platform {
  indexedDB?: { open(name: string, version: number): OpenRequest };
  navigator?: { locks?: { request<T>(name: string, work: () => Promise<T>): Promise<T> } };
  structuredClone<T>(value: T): T;
}
export interface BrowserPrivateSlots extends CustodyLock {
  load(key: string): Promise<unknown | null>;
  save(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}
/** Names are owned once. Choose a host-owned namespace. A save owns its
 * structured-cloneable value before waiting for the database to open. */
export function browserPrivateSlots(options: { database: string; store: string; lock: string; version?: number }): BrowserPrivateSlots {
  const { database: name, store: storeName, lock, version = 1 } = options;
  if ([name, storeName, lock].some(value => typeof value !== "string" || value.length < 1 || value.length > 128) || !Number.isSafeInteger(version) || version < 1 || version > 2147483647) throw new Error("Choose bounded private browser storage names and version.");
  const platform = globalThis as unknown as Platform;
  let opened: Promise<Database> | undefined;
  const database = (): Promise<Database> => {
    if (!platform.indexedDB) return Promise.reject(new Error("This browser has no private storage."));
    return opened ??= new Promise<Database>((resolve, reject) => {
      const request = platform.indexedDB!.open(name, version);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = request.onblocked = () => { opened = undefined; reject(new Error("Private storage could not be opened.")); };
    });
  };
  const keyOf = (key: string) => {
    if (typeof key !== "string" || key.length < 1 || key.length > 1024) throw new Error("Choose a bounded private storage slot.");
    return key;
  };
  async function transaction<T>(mode: "readonly" | "readwrite", work: (store: Store, done: (value: T) => void) => void): Promise<T> {
    const db = await database();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode); let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onerror = tx.onabort = () => reject(new Error("Private storage did not commit."));
      try { work(tx.objectStore(storeName), next => { value = next; }); }
      catch { try { tx.abort(); } catch { /* Already terminal. */ } reject(new Error("Private storage did not commit.")); }
    });
  }
  return {
    load(key) { const slot = keyOf(key); return transaction<unknown | null>("readonly", (store, done) => { const read = store.get(slot); read.onsuccess = () => done(read.result ?? null); }); },
    save(key, value) { const slot = keyOf(key), owned = platform.structuredClone(value); return transaction<void>("readwrite", (store, done) => { store.put(owned, slot); done(undefined); }); },
    remove(key) { const slot = keyOf(key); return transaction<void>("readwrite", (store, done) => { store.delete(slot); done(undefined); }); },
    run: work => platform.navigator?.locks ? platform.navigator.locks.request(lock, work) : Promise.reject(new Error("This browser cannot keep a request safely: it has no Web Locks.")),
  };
}
