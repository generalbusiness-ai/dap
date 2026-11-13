/**
 * The browser custody store (NF-5) under `Custody`. IndexedDB, Web Locks and BroadcastChannel are STAND-INs in memory: a
 * transaction applies each write at once and an abort rolls nothing back. They show what the store reads, writes, lists and
 * signals. The real browser path is the witness of request c288c917.
 */
import { expect, test } from "vitest";
import type { SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, timeOf } from "@generalbusiness/dap-bytes";
import { BROWSER_TERMINAL_LIVE, Custody, Lost, browserCustodyStore, identityId, meaningOf, type BrowserCustodyPlatform, type StoredCustodyRecord } from "../src/index.ts";
import { T0, accepted, build, identity, lane, notAfter, receiptOf, refused, signer } from "./support/custody.ts";

type Handler = (() => void) | null;
/** One origin: its databases, its locks and its channels, shared by each tab that `tab()` opens. */
function origin() {
  const databases = new Map<string, Map<string, Map<string, unknown>>>();
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
          get: (key: string) => request(() => structuredClone(store.get(key))),
          getAll: () => request(() => [...store.values()].map((v) => structuredClone(v))),
          put: (value: unknown, key: string) => { store.set(key, structuredClone(value)); return {}; },
          delete: (key: string) => { store.delete(key); return {}; },
        };
      },
    };
    const settle = () => later(() => { if (pending === 0 && !ended) { ended = true; tx.oncomplete?.(); } });
    later(() => settle());
    return tx;
  };
  const platform = (): BrowserCustodyPlatform => ({
    indexedDB: { open(name: string) {
      const r = { result: undefined as never, onsuccess: null as Handler, onerror: null as Handler, onblocked: null as Handler, onupgradeneeded: null as Handler };
      later(() => {
        const fresh = !databases.has(name);
        const db = databases.get(name) ?? new Map<string, Map<string, unknown>>();
        databases.set(name, db);
        r.result = { objectStoreNames: { contains: (n: string) => db.has(n) }, createObjectStore: (n: string) => db.set(n, new Map()), transaction: () => transaction(db) } as never;
        if (fresh) r.onupgradeneeded?.();
        r.onsuccess?.();
      });
      return r;
    } },
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
      constructor(readonly name: string) { channels.set(name, (channels.get(name) ?? new Set()).add(this)); }
      postMessage(data: unknown) { for (const other of channels.get(this.name) ?? []) if (other !== this) later(() => other.onmessage?.({ data })); }
      close() { channels.get(this.name)?.delete(this); }
    } as never,
  });
  const tab = (more: { terminalLive?: number } = {}) => browserCustodyStore({ database: "TEST custody", lock: "TEST custody", platform: platform(), ...more });
  return { tab };
}
const settled = () => new Promise((resolve) => { setTimeout(resolve, 5); });

// Invariant: a record that one tab kept before a lost send is read by another tab, which settles the same envelope and signs nothing.
test("a lost send kept by one tab settles in a second tab with the same envelope, and nothing is signed again", async () => {
  const o = origin(), first = o.tab(), second = o.tab();
  const sent: SignedIntent[] = [];
  let builds = 0;
  const signing = build("lost");
  const lost = await new Custody(first, () => timeOf(T0)).send(identity("lost"), meaningOf("lost"), async () => { builds++; return signing(); }, async (e) => { sent.push(e.signed); throw new Lost(); }, { notAfter });
  expect("lost" in lost).toBe(true);
  const reads: SignedIntent[] = [];
  const done = await new Custody(second, () => timeOf(T0 + 1000)).settle(identity("lost"), async (e) => { reads.push(e.signed); return receiptOf(e.signed, 3); });
  expect([done!.record.phase, builds, sent.length]).toEqual(["accepted", 1, 1]);
  expect(canonicalize(reads)).toBe(canonicalize(sent));
  // A send in the second tab gives the kept acceptance and sends nothing.
  const again = await new Custody(second, () => timeOf(T0 + 2000)).send(identity("lost"), meaningOf("lost"), async () => { throw new Error("must not sign"); }, async () => { throw new Error("must not send"); }, { notAfter });
  expect("answer" in again && again.retained && again.answer.answer).toBe("accepted");
});

// Invariant: `byTarget` lists the live records of one signer at one target. Past the bound of live terminal records, the oldest
// moves to the archive: `read` still finds it and `byTarget` no longer lists it.
test("past its bound of live terminal records the store archives the oldest, which read still finds and byTarget leaves out", async () => {
  expect(BROWSER_TERMINAL_LIVE).toBe(64);
  const store = origin().tab({ terminalLive: 2 });
  let clock = T0;
  const custody = new Custody(store, () => timeOf(clock));
  for (const key of ["a", "b", "c"]) {
    clock += 1000;
    await custody.send(identity(key), meaningOf(key), build(key), async (e) => (key === "b" ? refused : accepted(e.signed)), { notAfter });
  }
  clock += 1000;
  await custody.keep(identity("open"), meaningOf("open"), build("open"), notAfter);
  await custody.send({ ...identity("elsewhere"), target: { ...lane, scope: "sc_elsewhere" } as never }, meaningOf("x"), build("elsewhere"), async (e) => accepted(e.signed), { notAfter });
  const who = { service: identity("").service, membership: null, signer: signer.key, target: lane };
  // Four terminal records were written at this target and elsewhere; the bound keeps the newest two live.
  expect((await store.byTarget(who)).map((r) => [r.key, r.phase])).toEqual([["c", "accepted"], ["open", "prepared"]]);
  expect((await store.read(identityId(identity("a"))) as StoredCustodyRecord).phase).toBe("accepted");
  expect((await store.read(identityId(identity("b"))) as StoredCustodyRecord).phase).toBe("refused");
  expect((await store.unresolved()).map((r) => r.key)).toEqual(["open"]);
  // A resubmission of the archived refusal makes it live and unresolved again.
  await custody.send(identity("b"), meaningOf("b"), build("b"), async () => { throw new Lost(); }, { notAfter, resubmit: true });
  expect((await store.byTarget(who)).map((r) => r.key).sort()).toEqual(["b", "c", "open"]);
});

// Invariant: a write in one tab reaches the observers of another tab through the channel, and a held record lock refuses a
// second tab at once.
test("a write in one tab signals the observers of another, and a record lock held in one tab refuses the other", async () => {
  const o = origin(), first = o.tab(), second = o.tab();
  let heard = 0;
  const stop = second.observe(() => { heard++; });
  await new Custody(first, () => timeOf(T0)).keep(identity("signal"), meaningOf("signal"), build("signal"), notAfter);
  await settled();
  expect(heard).toBe(1);
  stop();
  const release = await first.lock("id", notAfter);
  expect(release).not.toBeNull();
  expect(await second.lock("id", notAfter)).toBeNull();
  await release!();
  const again = await second.lock("id", notAfter);
  expect(again).not.toBeNull();
  await again!();
});

// Invariant: a browser with no Web Locks keeps no record, so nothing is signed.
test("a browser without Web Locks refuses to keep a request and signs nothing", async () => {
  const store = browserCustodyStore({ database: "TEST none", lock: "TEST none", platform: {} });
  let builds = 0;
  await expect(new Custody(store, () => timeOf(T0)).send(identity("none"), meaningOf("none"), async () => { builds++; return build("none")(); }, async () => { throw new Error("must not send"); }, { notAfter })).rejects.toThrow();
  expect(builds).toBe(0);
});
