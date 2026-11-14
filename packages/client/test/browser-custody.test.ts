/**
 * The browser custody store (NF-5) under `Custody`. IndexedDB, Web Locks and BroadcastChannel are STAND-INs in memory: a
 * transaction applies each write at once and an abort rolls nothing back. They show what the store reads, writes, lists and
 * signals. The real browser path is the witness of request c288c917.
 */
import { expect, test } from "vitest";
import type { SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, textDigest, timeOf } from "@generalbusiness/dap-bytes";
import { scriptedSequence } from "@generalbusiness/dap-derive/scripted";
import { BROWSER_TERMINAL_LIVE, Custody, Lost, browserCustodyStore, identityId, meaningOf, signedIntent, type BrowserCustodyPlatform, type StoredCustodyRecord } from "../src/index.ts";
import { T0, build as fixtureBuild, identity as fixtureIdentity, notAfter, receiptOf as fixtureReceipt, refused, signer } from "./support/custody.ts";

// Browser storage admits wire shapes. Use real sequence references here; generic trusted-store fixtures keep their old bytes.
const reference = (ordinal: number) => scriptedSequence({ v: 1, kind: "lane", definition: "platform:inbox@1", creator: null, cause: textDigest("TEST browser custody"), ordinal }, timeOf(T0), 1).at;
const lane = reference(0), elsewhere = reference(1);
const identity = (key: string) => ({ ...fixtureIdentity(key), target: lane });
const build = (key: string) => async () => {
  const fixture = await fixtureBuild(key)(), { intent } = fixture.envelope.signed;
  return { ...fixture, envelope: { ...fixture.envelope, signed: await signedIntent(signer, { to: lane, kind: intent.kind, fields: intent.fields, expected: intent.expected }, { now: T0, idempotencyKey: key }) } };
};
const receiptOf = (signed: SignedIntent, seq: number) => ({ ...fixtureReceipt(signed, seq), fact: { ...fixtureReceipt(signed, seq).fact, at: lane } });
const accepted = (signed: SignedIntent) => ({ answer: "accepted" as const, receipt: receiptOf(signed, 3) });

type Handler = (() => void) | null;
/** One origin: its databases, its locks and its channels, shared by each tab that `tab()` opens. */
function origin(channelFailure?: "construct" | "post") {
  type Key = string | (string | number)[];
  type Range = { lower: Key; upper: Key; lowerOpen: boolean; upperOpen: boolean };
  const databases = new Map<string, Map<string, Map<string, unknown>>>();
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
      const r = { result: undefined as never, transaction: null, onsuccess: null as Handler, onerror: null as Handler, onblocked: null as Handler,
        onupgradeneeded: null as ((event: { oldVersion: number }) => void) | null };
      later(() => {
        const fresh = !databases.has(name);
        const db = databases.get(name) ?? new Map<string, Map<string, unknown>>();
        databases.set(name, db);
        r.result = { version, close() {}, onversionchange: null, onclose: null,
          objectStoreNames: { get length() { return db.size; }, contains: (n: string) => db.has(n) },
          createObjectStore: (n: string) => db.set(n, new Map()), transaction: () => transaction(db) } as never;
        if (fresh) r.onupgradeneeded?.({ oldVersion: 0 });
        r.onsuccess?.();
      });
      return r;
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
  return { tab, raw, key };
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
  await custody.send({ ...identity("elsewhere"), target: elsewhere }, meaningOf("x"), build("elsewhere"), async (e) => accepted(e.signed), { notAfter });
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

test("malformed existing rows stay unreadable in direct reads and capacity or target lists; no replacement is signed", async () => {
  const originStorage = origin(), store = originStorage.tab(), custody = new Custody(store, () => timeOf(T0));
  const who = identity("bad"), id = identityId(who);
  await custody.keep(who, meaningOf("bad"), build("bad"), notAfter);
  const records = originStorage.raw("records"), key = originStorage.key(id), original = records.get(key) as Record<string, unknown>;
  let builds = 0, posts = 0;
  for (const malformed of [undefined, { ...original, text: "null" }, { ...original, phase: "accepted", who: "hidden" }]) {
    records.set(key, malformed);
    await expect(custody.find(who)).rejects.toMatchObject({ why: { held: "unreadable" } });
    await expect(store.unresolved()).rejects.toMatchObject({ why: { held: "unreadable" } });
    await expect(store.byTarget(who)).rejects.toMatchObject({ why: { held: "unreadable" } });
    await expect(custody.send(who, meaningOf("bad"), async () => { builds++; return build("bad")(); }, async e => { posts++; return accepted(e.signed); }, { notAfter })).rejects.toMatchObject({ why: { held: "unreadable" } });
    expect(records.get(key)).toBe(malformed);
  }
  expect([builds, posts]).toEqual([0, 0]);
  records.set(key, original);
});

test("bounded position reads preserve history and a repeated append truncates its interrupted tail", async () => {
  const o = origin(), store = o.tab();
  const outcome = (n: number) => ({ at: timeOf(T0 + n), attempt: 1, signing: 0, lost: true as const });
  const all = Array.from({ length: 140 }, (_, n) => outcome(n));
  await store.segment("segment", 0, all);
  expect(await store.segmented("segment", 129, 3)).toEqual(all.slice(129, 132));
  await store.segment("segment", 130, [outcome(999)]);
  expect(await store.segmented("segment", 129, 5)).toEqual([outcome(129), outcome(999)]);
  o.raw("outcomes").delete(o.key(["segment", 129]));
  await expect(store.segmented("segment", 129, 2)).rejects.toMatchObject({ why: { held: "unreadable" } });
  o.raw("lengths").delete(o.key("segment"));
  await expect(store.segmented("segment", 0, 2)).rejects.toMatchObject({ why: { held: "unreadable" } });
  await expect(store.segment("segment", 0, [outcome(1000)])).rejects.toMatchObject({ why: { held: "unreadable" } });
  o.raw("lengths").set(o.key("bad-length"), undefined);
  await expect(store.segmented("bad-length", 0, 2)).rejects.toMatchObject({ why: { held: "unreadable" } });
  await expect(store.read("segment")).rejects.toMatchObject({ why: { held: "unreadable" } });
});

test("optional channel failures leave committed custody and local observations intact", async () => {
  for (const failure of ["construct", "post"] as const) {
    const store = origin(failure).tab(), custody = new Custody(store, () => timeOf(T0));
    let observed = 0;
    store.observe(() => { observed++; });
    const record = await custody.keep(identity(failure), meaningOf(failure), build(failure), notAfter);
    expect([record.phase, observed]).toEqual(["prepared", 1]);
    expect(await custody.find(identity(failure))).toEqual(record);
  }
});

test("close refuses new and queued work using the existing unreadable storage answer", async () => {
  const o = origin(), first = o.tab(), second = o.tab();
  let unblock!: () => void, entered!: () => void;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const blocked = first.exclusive(async () => { entered(); await new Promise<void>(resolve => { unblock = resolve; }); });
  await enteredPromise;
  let ran = false;
  const queued = second.exclusive(async () => { ran = true; });
  second.close(); second.close();
  const rejected = expect(queued).rejects.toMatchObject({ why: { held: "unreadable" } });
  unblock(); await blocked; await rejected;
  expect(ran).toBe(false);
  await expect(second.read("new")).rejects.toMatchObject({ why: { held: "unreadable" } });
});
