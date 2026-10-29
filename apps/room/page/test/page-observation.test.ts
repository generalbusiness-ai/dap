import { expect, test, vi } from "vitest";
import { base32, keyIdOfSecret, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { Session, type CompleteSnapshot } from "@generalbusiness/dap-client";
import type { Head, ScopeRef, Summary } from "@generalbusiness/dap-contract";
import { PageObservation, pollingInterval, type PageObservationSource } from "../src/page-observation.ts";
import { workbenchFixtures } from "./workbench-fixture.ts";

// Scripted authenticated data and stream ports. No Native scope or browser runs.
const scope: ScopeRef = { scope: `sc_${base32(new Uint8Array(32))}`, inc: `in_${base32(new Uint8Array(16))}`, kind: "lane" };
const membership: ScopeRef = { ...scope, scope: `sc_${base32(new Uint8Array(32).fill(1))}`, kind: "membership" };
const key = keyIdOfSecret(new Uint8Array(32));
const definition = `sha256:${"1".repeat(64)}` as const;
const head = (seq: number): Head => ({ seq, hash: `sha256:${String(seq).padStart(64, "0")}` });
const snapshot = (seq: number): CompleteSnapshot<Summary> => ({ scope, definition, at: head(seq), value: { scope, definition, status: "active", time: timeOf(Date.now()), items: [], counts: [] } });
const session = () => new Session("scripted-private-token", { v: 1, deployment: "scripted", membership, member: "@member", key, reads: ["summary"], ends: timeOf(Date.now() + 60_000) });
const context = { origin: "https://page.test", scope, definition, membership, member: "@member" as const, key, deployment: "scripted" };
const gate = <T = void>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const drain = async () => { for (let n = 0; n < 40; n++) await Promise.resolve(); };
const closed = () => new ReadableStream<Uint8Array>({ start(controller) { controller.close(); } });

test("Main renders a later comment within two fallback intervals after empty EOF, and retires its polling owner", ({ onTestFinished }) => workbenchFixtures.run(onTestFinished, async fixture => {
  vi.resetModules(); vi.useFakeTimers();
  let seq = 0, polls = 0, loads = 0;
  const heldBackoff = gate(); fixture.release(() => heldBackoff.resolve());
  class Element {
    attrs: Record<string, string> = {}; children: (Element | string)[] = [];
    constructor(readonly tag: string) {}
    setAttribute(name: string, value: string) { this.attrs[name] = value; }
    getAttribute(name: string) { return this.attrs[name] ?? null; }
    hasAttribute(name: string) { return Object.hasOwn(this.attrs, name); }
    removeAttribute(name: string) { delete this.attrs[name]; }
    append(...children: (Element | string)[]) { this.children.push(...children); }
    prepend(...children: (Element | string)[]) { this.children.unshift(...children); }
    replaceChildren(...children: (Element | string)[]) { this.children = children; }
    addEventListener() {} focus() {}
    all(): Element[] { return [this, ...this.children.flatMap(child => typeof child === "string" ? [] : child.all())]; }
    querySelectorAll() { return []; }
    querySelector(selector: string) { const slot = /^\[data-action-slot="([^"]+)"\]$/.exec(selector)?.[1]; return slot ? this.all().find(element => element.attrs["data-action-slot"] === slot) ?? null : null; }
    get textContent(): string { return this.children.map(child => typeof child === "string" ? child : child.textContent).join(" "); }
  }
  const root = new Element("div"), place = { directory: `sc_${base32(new Uint8Array(32).fill(2))}`, membership };
  const location = { origin: context.origin, hash: `#/issue/${scope.scope}` };
  let redraw!: () => void;
  const room = { session: { service: context.origin, signer: { key, sign: vi.fn() } }, ...place, rules: place.directory, destination: place.directory, key, me: { handle: "@member", role: "member", actions: [] }, reader: session() };
  vi.doMock("../src/browser-key-store.ts", () => ({ pageKeyStore: () => ({ load: async () => room.session.signer }) }));
  vi.doMock("../src/page-key-migration.ts", () => ({ migratePageOperations: async () => {} }));
  vi.doMock("../src/data.ts", async () => ({ ...await vi.importActual<typeof import("../src/data.ts")>("../src/data.ts"),
    openRoom: async () => room, roomInitialization: async () => ({ state: "configured" }), initializationStillCurrent: async () => true,
    actsOn: async () => ({ acts: [], hidden: 0 }),
    loadIssue: async () => ({ scope: scope.scope, ref: scope, definition, head: head(seq), number: 1, title: "Scripted issue", body: null, state: "open", closeReason: null, createdAt: null, modifiedAt: null, requesterRef: null, requester: null, assignees: [], conditions: [], comments: seq ? [{ id: 1, author: "@other", state: "visible", body: "Later participant comment" }] : [] }),
    pageObservationSource: async (): Promise<PageObservationSource> => {
      loads++;
      return { initial: snapshot(seq), poll: async () => { polls++; return snapshot(seq); }, options: {
        context, authenticate: async () => ({ ok: true, session: session() }), open: async () => ({ ok: true, body: closed() }),
        snapshot: async () => { throw Error("Empty EOF must not read a stream snapshot"); }, reconnectDelay: () => heldBackoff.promise,
      } };
    },
  }));
  vi.stubGlobal("document", { title: "", activeElement: null, getElementById: () => root, createElement: (tag: string) => new Element(tag), createElementNS: (_namespace: string, tag: string) => new Element(tag) });
  vi.stubGlobal("location", location);
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ place, publicKey: key, pollIntervalMs: 1_000 }), setItem: vi.fn() });
  vi.stubGlobal("window", { addEventListener: (_name: string, listener: () => void) => { redraw = listener; } });
  try {
    const main = await fixture.load(() => import("../src/main.ts"));
    await fixture.wait(() => main.workbenchLifecycle.idle()); await drain();
    expect(root.textContent).toContain("Live updates unavailable. Checking every 1 second.");
    expect(polls).toBe(0); seq = 1;
    await vi.advanceTimersByTimeAsync(1_000); await fixture.wait(() => main.workbenchLifecycle.idle());
    expect(root.textContent).toContain("Later participant comment"); expect(polls).toBe(1); expect(loads).toBe(1);
    location.hash = "#/join"; redraw(); await fixture.wait(() => main.workbenchLifecycle.idle());
    await vi.advanceTimersByTimeAsync(2_000); expect(polls).toBe(1);
    await main.workbenchLifecycle.retire(); await vi.advanceTimersByTimeAsync(2_000); expect(polls).toBe(1);
  } finally {
    await fixture.retire(); vi.useRealTimers(); vi.unstubAllGlobals();
    vi.doUnmock("../src/data.ts"); vi.doUnmock("../src/browser-key-store.ts"); vi.doUnmock("../src/page-key-migration.ts"); vi.resetModules();
  }
}));

test("a working stream never starts polls; same-head restoration aborts an old poll and rejects its late paint", async () => {
  vi.useFakeTimers();
  const owner = new PageObservation(), backoff = gate(), late = gate<CompleteSnapshot<Summary>>();
  let controller!: ReadableStreamDefaultController<Uint8Array>, opens = 0, polls = 0, aborted = false, paints = 0, line: string | null = null;
  const body = () => new ReadableStream<Uint8Array>({ start(value) { controller = value; } });
  owner.bind({ key: "scripted-context-and-route", interval: 1_000, head: head(0), current: () => true, changed: async () => { paints++; }, polling: value => { line = value; }, load: async () => ({
    initial: snapshot(0), poll: signal => { polls++; signal.addEventListener("abort", () => { aborted = true; }); return late.promise; },
    options: { context, authenticate: async () => ({ ok: true, session: session() }), open: async () => { opens++; return { ok: true, body: body() }; },
      snapshot: async () => ({ ok: true, at: head(0), value: snapshot(0), complete: true }), reconnectDelay: () => backoff.promise },
  }) });
  try {
    await owner.idle(); await drain(); controller.enqueue(utf8(JSON.stringify({ at: head(0) }) + "\n")); await drain();
    await vi.advanceTimersByTimeAsync(3_000); expect(polls).toBe(0); expect(line).toBeNull();
    controller.close(); await drain(); expect(line).toContain("Live updates unavailable");
    await vi.advanceTimersByTimeAsync(1_000); expect(polls).toBe(1);
    backoff.resolve(); await drain(); expect(opens).toBe(2);
    controller.enqueue(utf8(JSON.stringify({ at: head(0) }) + "\n")); await drain();
    expect(aborted).toBe(true); expect(line).toBeNull(); late.resolve(snapshot(7)); await owner.idle();
    expect(paints).toBe(0); await vi.advanceTimersByTimeAsync(2_000); expect(polls).toBe(1);
    for (const invalid of [0, 999, 60_001, NaN, Infinity, "5000"]) expect(() => pollingInterval(invalid)).toThrow();
  } finally { backoff.resolve(); late.resolve(snapshot(7)); await owner.retire(); vi.useRealTimers(); }
});

test("a list without a read head redraws its newer initial summary once even when EOF polls keep that same head", async () => {
  vi.useFakeTimers();
  const owner = new PageObservation(), backoff = gate();
  let list = "already-read list", redraws = 0, polls = 0;
  owner.bind({ key: "scripted-list-route", interval: 1_000, current: () => true,
    changed: async () => { redraws++; list = "entry added between list and observation"; }, polling: () => {}, load: async () => ({
      initial: snapshot(1), poll: async () => { polls++; return snapshot(1); },
      options: { context, authenticate: async () => ({ ok: true, session: session() }), open: async () => ({ ok: true, body: closed() }),
        snapshot: async () => { throw Error("Empty EOF must not read a stream snapshot"); }, reconnectDelay: () => backoff.promise },
    }) });
  try {
    await owner.idle(); await drain();
    expect(list).toBe("entry added between list and observation"); expect(redraws).toBe(1);
    await vi.advanceTimersByTimeAsync(2_000); await owner.idle();
    expect(polls).toBe(2); expect(redraws).toBe(1);
  } finally { backoff.resolve(); await owner.retire(); vi.useRealTimers(); }
});

test("a wrong-deployment renewal cannot replace the shared Page reader or supply a poll snapshot", async () => {
  // Actual data/client adapter over scripted HTTP answers; no Native authority.
  const { pageObservationSource } = await vi.importActual<typeof import("../src/data.ts")>("../src/data.ts");
  let now = Date.now(), summaries = 0, renewals = 0;
  const original = session();
  const room: import("../src/data.ts").Room = {
    session: { service: context.origin, secret: new Uint8Array(32), now: () => now, fetch: async url => {
      if (url.endsWith("/sessions")) {
        renewals++;
        return new Response(JSON.stringify({ ok: true, token: "scripted-renewed-token", session: { ...original.claims, deployment: "wrong-scripted-deployment", ends: timeOf(now + 60_000) } }));
      }
      expect(url).toBe(`${context.origin}/v1/scopes/${scope.scope}`); summaries++;
      return new Response(JSON.stringify({ ok: true, at: head(0), value: snapshot(0).value, complete: true }));
    } },
    directory: scope.scope, directoryIndex: null, membership, rules: scope.scope, destination: scope.scope, key,
    me: { handle: "@member", role: "member", actions: [] }, reader: original, unsessioned: null, definitions: new Map(),
  };
  const signal = new AbortController().signal;
  const source = await pageObservationSource(room, scope.scope, signal);
  now += 60_001;
  const renewal = await source.options.authenticate(signal);
  expect(renewal.ok && renewal.session.claims.deployment).toBe("wrong-scripted-deployment");
  expect(room.reader).toBe(original); expect(room.unsessioned).toBeNull();
  await expect(source.poll(signal)).rejects.toThrow("another connection");
  expect(room.reader).toBe(original); expect(summaries).toBe(1); expect(renewals).toBe(2);
});
