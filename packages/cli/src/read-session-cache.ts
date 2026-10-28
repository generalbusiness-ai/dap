/** Private, disposable read credentials. No token enters public Config or an error. */
import type { KeyId, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isScopeRef, parseStrictBytes, timeMs, utf8 } from "@generalbusiness/dap-bytes";
import { isSessionAnswer, Session } from "@generalbusiness/dap-client";
import { READ_SESSION_CACHE_BYTES, type ReadSessionCache, type Store } from "./store.ts";

export class ReadSessionCacheError extends Error {
  constructor() { super("The private read-session cache could not be read or saved; no credential was printed."); }
}
export interface ReadSessionIdentity { service: string; membership: ScopeRef; key: KeyId }
export interface CachedReadSession {
  readonly session: Session;
  readonly reused: boolean;
  discard(): Promise<void>;
}
const flights = new WeakMap<Store, Map<string, Promise<CachedReadSession | null>>>();
const volatile = new WeakMap<Store, Uint8Array>();
function storageOf(store: Store): ReadSessionCache {
  return store.sessionCache ?? {
    read: async () => volatile.get(store)?.slice() ?? null,
    replace: async bytes => { volatile.set(store, bytes.slice()); },
    discard: async expected => {
      const current = volatile.get(store);
      if (current && current.length === expected.length && current.every((byte, i) => byte === expected[i])) volatile.delete(store);
    },
  };
}
function restored(bytes: Uint8Array, identity: ReadSessionIdentity): Session | null {
  if (bytes.length > READ_SESSION_CACHE_BYTES) return null;
  try {
    const record = parseStrictBytes(bytes) as Record<string, unknown>;
    if (!record || typeof record !== "object" || Array.isArray(record) || Object.keys(record).length !== 4 || record["v"] !== 1 || record["service"] !== identity.service) return null;
    const answer = { ok: true, token: record["token"], session: record["session"] };
    if (!isSessionAnswer(answer) || !answer.ok || !isScopeRef(answer.session.membership)
      || canonicalize(answer.session.membership) !== canonicalize(identity.membership) || answer.session.key !== identity.key
      || typeof answer.session.deployment !== "string" || !answer.session.deployment || utf8(answer.session.deployment).length > 128) return null;
    return new Session(answer.token, answer.session);
  } catch { return null; }
}
/** Coordination is per Store in this process, not a cross-process lease.
 * Only an in-flight issuance is shared; no Context/fetch survives its finish. */
export async function cachedReadSession(store: Store, identity: ReadSessionIdentity, now: () => number, issue: (renewal: boolean) => Promise<Session | null>): Promise<CachedReadSession | null> {
  const key = canonicalize(identity);
  let running = flights.get(store);
  if (!running) { running = new Map(); flights.set(store, running); }
  const prior = running.get(key);
  if (prior) return prior;
  const storage = storageOf(store);
  const task = (async () => {
    let bytes: Uint8Array | null;
    try { bytes = await storage.read(); } catch { throw new ReadSessionCacheError(); }
    const decoded = bytes === null ? null : restored(bytes, identity);
    const reading = now();
    const held = decoded && Number.isFinite(reading) && timeMs(decoded.claims.ends)! - reading > 30_000 ? decoded : null;
    if (bytes !== null && !held) {
      try { await storage.discard(bytes); } catch { throw new ReadSessionCacheError(); }
    }
    const session = held ?? await issue(decoded !== null);
    if (!session) return null;
    if (!held) {
      try {
        bytes = utf8(canonicalize({ v: 1, service: identity.service, token: session.reader().slice("Session ".length), session: session.claims }));
        if (bytes.length > READ_SESSION_CACHE_BYTES) throw new ReadSessionCacheError();
        await storage.replace(bytes);
      } catch { throw new ReadSessionCacheError(); }
    }
    const expected = bytes!;
    return { session, reused: held !== null, discard: async () => {
      try { await storage.discard(expected); } catch { throw new ReadSessionCacheError(); }
    } };
  })();
  running.set(key, task);
  try { return await task; } finally { if (running.get(key) === task) running.delete(key); }
}
