/** Transport stand-ins own request shape and dispatch count only. */
import { expect, test } from "vitest";
import type { ReadMinimum, ApplicationProjectionQuery, BehindRead, Receipt, ScopeRef, SignedRead } from "@generalbusiness/dap-contract";
import { canonicalize, parseStrict, readMinimumParameter, unb64url, verifySignedRead } from "@generalbusiness/dap-bytes";
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

test("followReceipt performs one exact minimum-qualified entry read and returns behind without retry", async () => {
  const calls: unknown[][] = [];
  const t = bindingTransport({ entry: async (...args: unknown[]) => { calls.push(args); return behind; } } as unknown as ServiceBinding);
  expect(await new ScopeHandle(t, at.scope).followReceipt(receipt)).toEqual(behind);
  expect(calls).toEqual([[at.scope, null, fact.seq, minimum]]);
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
