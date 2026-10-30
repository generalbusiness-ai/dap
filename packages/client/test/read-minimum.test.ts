/** Transport stand-ins own request shape and dispatch count only. */
import { expect, test } from "vitest";
import type { ReadMinimum, ApplicationProjectionQuery, BehindRead, Entry, Receipt, ScopeRef, SignedRead } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, parseStrict, readMinimumParameter, unb64url, verifySignedRead } from "@generalbusiness/dap-bytes";
import { applicationProjectionQueryDigest } from "@generalbusiness/dap-platform/application-v2";
import { ScopeHandle, bindingTransport, httpTransport, secretSigner, signedReads, TransportError, type Fetch, type ServiceBinding } from "../src/index.ts";
const at: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };
const fact = { at, seq: 8, hash: `sha256:${"b".repeat(64)}` as const };
const receipt: Receipt = { fact, definition: `sha256:${"c".repeat(64)}`, intent: null, effects: [], sends: [], epoch: 0 };
const minimum = { at, head: { seq: fact.seq, hash: fact.hash } };
const behind: BehindRead = { ok: false, reason: "behind", current: { ...fact, seq: 2 } };
const query: ApplicationProjectionQuery = { v: 1, scope: at, directory: { ...at, kind: "directory" }, install: 7, projection: "board", items: {} };

test("all five handle reads carry the complete receipt minimum in one HTTP request and preserve behind metadata", async () => {
  const urls: URL[] = [];
  const fetch: Fetch = async (url, init) => {
    urls.push(new URL(url)); expect(init?.headers?.["authorization"]).toBe("Session fixture");
    return { status: 503, body: new Response(canonicalize(behind)).body };
  };
  const h = new ScopeHandle(httpTransport("https://scopes.test", { fetch }), at.scope, "Session fixture");
  expect(await h.summary(receipt)).toEqual(behind);
  expect(await h.items("note", "4", receipt)).toEqual(behind);
  expect(await h.history("3", receipt)).toEqual(behind);
  expect(await h.entry(8, receipt)).toEqual(behind);
  expect(await h.applicationProjection(query, receipt)).toEqual(behind);
  expect(urls).toHaveLength(5);
  for (const url of urls) expect(readMinimumParameter(url.searchParams.get("atLeast"))).toEqual(minimum);
  expect(urls[1]!.searchParams.get("cursor")).toBe("4");
  expect(urls[4]!.searchParams.has("p")).toBe(true);
  expect(await h.summary({ at, head: 0 })).toEqual(behind);
  expect(readMinimumParameter(urls[5]!.searchParams.get("atLeast"))).toEqual({ at, head: 0 });
});

test("binding and signed-read adapters forward the barrier while preserving signed selectors", async () => {
  const calls: unknown[][] = [];
  const capture = (...args: unknown[]) => { calls.push(args); return Promise.resolve(behind); };
  const transport = bindingTransport({ summary: capture, items: capture, history: capture, entry: capture,
    applicationProjection: (...args: unknown[]) => { calls.push(args); return Promise.resolve(canonicalize(behind)); },
  } as unknown as ServiceBinding);
  const signed = signedReads(transport, secretSigner(new Uint8Array(32).fill(7)), { now: () => Date.parse("2026-10-30T17:00:00Z") });
  const h = new ScopeHandle(signed, at.scope);
  expect(await h.summary(receipt)).toEqual(behind);
  expect(await h.history("4", receipt)).toEqual(behind);
  expect(await h.entry(8, receipt)).toEqual(behind);
  for (const [index, selector] of [[0, ["summary", "summary"]], [1, ["history", "4"]], [2, ["entry", "8"]]] as const) {
    const call = calls[index]!, header = call[1] as string;
    const opened = parseStrict(new TextDecoder().decode(unb64url(header.slice(7))!)) as SignedRead;
    expect(verifySignedRead(opened)).toBe(true);
    expect([opened.request.read, opened.request.arg]).toEqual(selector);
    expect(call.at(-1)).toEqual(minimum);
  }
  const session = new ScopeHandle(signed, at.scope, "Session fixture");
  await session.items("note", undefined, receipt); await session.applicationProjection(query, receipt);
  expect(calls[3]!.at(-1)).toEqual(minimum); expect(calls[4]!.at(-1)).toEqual(minimum);
  expect(calls[4]![1]).toBe("Session fixture");
});

test("followReceipt performs one sequence-qualified entry read and returns behind without fallback", async () => {
  const calls: unknown[][] = [];
  const t = bindingTransport({ entry: async (...args: unknown[]) => { calls.push(args); return behind; } } as unknown as ServiceBinding);
  expect(await new ScopeHandle(t, at.scope).followReceipt(receipt)).toEqual(behind);
  expect(calls).toEqual([[at.scope, null, fact.seq, { at, head: fact.seq }]]);
});

const entry: Entry = { v: 1, at, seq: fact.seq, prev: fact.hash, time: "2026-10-30T17:00:00Z", clamped: false,
  epoch: 0, input: { type: "checkpoint", through: fact.seq - 1, state: fact.hash }, uses: [], prepared: [], effects: [], sends: [] };
const exact: Receipt = { ...receipt, fact: { ...fact, hash: entryHash(entry) } };
const sealed = { entry, hash: exact.fact.hash };

test("HTTP and binding follow one normal receipt read and use only one unavailable fallback for exact identity checks", async () => {
  for (const mode of ["http", "binding"] as const) {
    const calls: (ReadMinimum | undefined)[] = [];
    let stale = false;
    const reply = (required?: ReadMinimum) => {
      calls.push(required);
      if (required && required.at.kind !== at.kind) return { ok: false, reason: "unavailable" };
      return { ok: true, at: { seq: stale ? fact.seq - 1 : fact.seq, hash: exact.fact.hash }, value: sealed, complete: true };
    };
    const transport = mode === "http" ? httpTransport("https://scopes.test", { fetch: async url => {
      const value = new URL(url).searchParams.get("atLeast"), required = value === null ? undefined : readMinimumParameter(value)!;
      return { status: 200, body: new Response(canonicalize(reply(required))).body };
    } }) : bindingTransport({ entry: async (_scope: string, _reader: unknown, _seq: number, required?: ReadMinimum) => reply(required) } as unknown as ServiceBinding);
    const handle = new ScopeHandle(transport, at.scope, "Session fixture");
    expect(await handle.followReceipt(exact)).toMatchObject({ ok: true, entry });
    expect(calls.splice(0)).toEqual([{ at, head: fact.seq }]);
    expect(await handle.followReceipt(receipt)).toEqual({ ok: false, reason: "hash-mismatch" });
    expect(calls.splice(0)).toEqual([{ at, head: fact.seq }]);
    const other = { ...at, kind: "rules" as const }, wrong = { ...exact, fact: { ...exact.fact, at: other } };
    expect(await handle.followReceipt(wrong)).toEqual({ ok: false, reason: "reference-mismatch" });
    expect(calls.splice(0)).toEqual([{ at: other, head: fact.seq }, undefined]);
    stale = true;
    expect(await handle.followReceipt(wrong)).toEqual({ ok: false, reason: "unavailable" });
    expect(calls).toEqual([{ at: other, head: fact.seq }, undefined]);
  }
});

test("a handle rejects stale successful HTTP and binding replies for every minimum-qualified read", async () => {
  const head = { seq: fact.seq - 1, hash: fact.hash };
  const summary = { scope: at, status: "active", definition: receipt.definition, time: entry.time, items: [], counts: [] };
  const read = (value: unknown) => ({ ok: true, at: head, value, complete: true });
  const projection = canonicalize({ ok: true, query: applicationProjectionQueryDigest(query), value: {
    v: 1, scope: at, projection: receipt.definition, at: head, sources: { board: [] },
  } });
  const rpc = bindingTransport({ summary: async () => read(summary), items: async () => read([]),
    history: async () => read([sealed]), entry: async () => read(sealed), applicationProjection: async () => projection,
  } as unknown as ServiceBinding);
  const http = httpTransport("https://scopes.test", { fetch: async url => {
    const path = new URL(url).pathname;
    const body = path.endsWith("/application-projection") ? projection : canonicalize(read(
      path.includes("/entries/") ? sealed : path.endsWith("/history") ? [sealed] : path.includes("/items/") ? [] : summary));
    return { status: 200, body: new Response(body).body };
  } });
  for (const transport of [http, rpc]) {
    const handle = new ScopeHandle(transport, at.scope, "Session fixture");
    for (const perform of [() => handle.summary(receipt), () => handle.items("note", undefined, receipt),
      () => handle.history(undefined, receipt), () => handle.entry(fact.seq, receipt), () => handle.applicationProjection(query, receipt)])
      await expect(perform()).rejects.toThrow("the reply does not reach the read minimum");
    expect(await handle.summary()).toMatchObject({ ok: true, at: head });
  }
});

test("malformed or foreign-scope minima fail before HTTP or binding dispatch", async () => {
  let sent = 0;
  const h = httpTransport("https://scopes.test", { fetch: async () => { sent++; return { status: 503, body: new Response(canonicalize(behind)).body }; } });
  const b = bindingTransport({ summary: async () => { sent++; return behind; } } as unknown as ServiceBinding);
  for (const transport of [h, b]) for (const value of [{ at, head: -1 }, { at: { ...at, scope: `sc_${"b".repeat(52)}` }, head: 1 }]) {
    await expect(Promise.resolve().then(() => transport.summary(at.scope, null, value as never))).rejects.toBeInstanceOf(TransportError);
  }
  expect(sent).toBe(0);
});

test("a signed read owns its minimum before asynchronous signing", async () => {
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const signing = new Promise<void>(resolve => { entered = resolve; });
  const signer = secretSigner(new Uint8Array(32).fill(8));
  let received: unknown;
  const transport = bindingTransport({ summary: async (_scope: string, _reader: unknown, minimum?: ReadMinimum) => { received = minimum; return behind; } } as unknown as ServiceBinding);
  const reads = signedReads(transport, { key: signer.key, sign: async bytes => { entered(); await gate; return signer.sign(bytes); } });
  const mutable = structuredClone(minimum), original = structuredClone(mutable);
  const pending = reads.summary(at.scope, null, mutable);
  await signing; mutable.head.seq = 99; release();
  expect(await pending).toEqual(behind);
  expect(received).toEqual(original);
});
