/** Transport fixtures test byte/request ownership, not native authorization. */
import { expect, test, vi } from "vitest";
import { APPLICATION_PROJECTION_WIRE_BOUNDS as B, type ApplicationProjectionQuery, type ApplicationProjectionRead, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, textDigest } from "@generalbusiness/dap-bytes";
import { applicationProjectionId, applicationProjectionQueryDigest, encodeApplicationProjectionQuery, readApplicationProjection } from "@generalbusiness/dap-bytes/application-v2";
import { ScopeHandle, TransportError, applicationItemSnapshot, completeApplicationItems, completeApplicationProjection, bindingTransport, httpTransport, signedReads, type Fetch, type ServiceBinding, type Transport } from "../src/index.ts";

const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "lane" };
const query: ApplicationProjectionQuery = { v: 1, scope, directory: { ...scope, kind: "directory" }, install: 7, projection: "board", items: { board: 2 } };
const good: Extract<ApplicationProjectionRead, { ok: true }> = { ok: true, query: applicationProjectionQueryDigest(query)!, value: {
  v: 1, scope, projection: `sha256:${"b".repeat(64)}`, at: { seq: 3, hash: `sha256:${"c".repeat(64)}` },
  sources: { board: [{ id: 2, type: "board", state: "open", revision: 1, fields: { number: 4 } }] },
} };
const encoded = encodeApplicationProjectionQuery(query)!;
const binding = (read: ServiceBinding["applicationProjection"]) => bindingTransport({ applicationProjection: read } as ServiceBinding);

test("HTTP and binding retain canonical bytes, bind the whole request and use only the supplied session", async () => {
  const sent: { url: string; reader: string | undefined }[] = [];
  let raw = canonicalize(good);
  const fetch: Fetch = async (url, init) => { sent.push({ url, reader: init?.headers?.["authorization"] }); return { status: 409, body: new Response(raw).body }; };
  const http = httpTransport("https://scopes.test", { fetch }), rpc = binding(async () => raw);
  expect(await http.applicationProjection(scope.scope, "Session fixture", encoded)).toBe(raw);
  expect(await rpc.applicationProjection(scope.scope, "Session fixture", encoded)).toBe(raw);
  for (const transport of [http, rpc]) {
    const value = await new ScopeHandle(transport, scope.scope, "Session fixture").applicationProjection(query);
    expect(value).toEqual(good); if (!value.ok) throw Error("Expected projection.");
    expect(Object.isFrozen(value.value.sources["board"]![0]!.fields)).toBe(true);
    for (const changed of [
      { ...query, install: query.install + 1 }, { ...query, items: { board: 3 } },
      { ...query, scope: { ...scope, inc: `in_${"b".repeat(26)}` as const } },
      { ...query, directory: { ...query.directory, inc: `in_${"b".repeat(26)}` as const } },
    ]) await expect(new ScopeHandle(transport, scope.scope, "Session fixture").applicationProjection(changed)).rejects.toThrow(TransportError);
  }
  expect(sent[0]).toEqual({ url: `https://scopes.test/v1/scopes/${scope.scope}/application-projection?p=${encoded}`, reader: "Session fixture" });
  raw = canonicalize({ ok: false, reason: "forbidden" });
  const decorated = signedReads(http, { key: `key_${"a".repeat(52)}`, sign: async () => { throw Error("Projection must not be signed."); } });
  expect(await new ScopeHandle(decorated, scope.scope).applicationProjection(query)).toEqual({ ok: false, reason: "forbidden" });
  expect(sent.at(-1)?.reader).toBeUndefined();
  expect(await new ScopeHandle(decorated, scope.scope, "Session fixture").applicationProjection(query)).toEqual({ ok: false, reason: "forbidden" });
  expect(sent.at(-1)?.reader).toBe("Session fixture");
  expect(await new ScopeHandle(rpc, scope.scope).applicationProjection(query)).toEqual({ ok: false, reason: "forbidden" });
});

test("projection consumers cap reply bytes before parsing, refuse noncanonical text and omit transport secrets", async () => {
  let cancelled = 0;
  const oversized = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(B.resultBytes + 1)); }, cancel() { cancelled++; } });
  const http = httpTransport("https://scopes.test", { bytes: 4 * B.resultBytes, fetch: async () => ({ status: 200, body: oversized }) });
  await expect(http.applicationProjection(scope.scope, null, encoded)).rejects.toThrow(`longer than ${B.resultBytes} bytes`);
  expect(cancelled).toBe(1);
  for (const raw of [canonicalize(good) + " ", "\ufeff" + canonicalize(good), "ü".repeat(B.resultBytes), "x".repeat(B.resultBytes + 1)]) {
    await expect(binding(async () => raw).applicationProjection(scope.scope, null, encoded)).rejects.toThrow(TransportError);
  }
  const secret = "private session URL";
  const failed = [binding(async () => { throw Error(secret); }), httpTransport("https://scopes.test", { fetch: async () => { throw Error(secret); } })];
  for (const transport of failed) {
    const error = await transport.applicationProjection(scope.scope, null, encoded).catch(error => error);
    expect(error).toBeInstanceOf(TransportError); expect(error.message).not.toContain(secret);
  }
});

test("HTTP, binding and custom handle projections have finite deadlines and never accept late bytes", async () => {
  vi.useFakeTimers();
  try {
    let abort: { aborted: boolean } | undefined;
    const http = httpTransport("https://scopes.test", { seconds: 100, fetch: async (_url, init) => { abort = init?.signal; return { status: 200, body: new ReadableStream({ pull: () => new Promise(() => {}) }) }; } });
    let finish!: (text: string) => void;
    const late = new Promise<string>(resolve => { finish = resolve; });
    const rpc = binding(() => late);
    const custom = { applicationProjection: () => late } as unknown as Transport;
    const pending = [http.applicationProjection(scope.scope, null, encoded), rpc.applicationProjection(scope.scope, null, encoded), new ScopeHandle(custom, scope.scope).applicationProjection(query)];
    const refused = pending.map(promise => expect(promise).rejects.toThrow(/within 10 seconds/));
    await vi.advanceTimersByTimeAsync(10_000); await Promise.all(refused);
    expect(abort?.aborted).toBe(true);
    finish(canonicalize(good)); await vi.advanceTimersByTimeAsync(0);
  } finally { vi.useRealTimers(); }
});

// Invariant: model/custody adapters retain only selected native slot fields
// and exact revisions, with no fabricated full Item or Summary read.
test("declared item observations resolve aliases and merge identical subjects without inventing read fields", () => {
  const fields = {
    number: { from: { kind: "value", name: "lastNumber" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
    writer: { from: { kind: "party", name: "controller" }, of: { type: "member" }, nullable: false },
    linked: { from: { kind: "ref", name: "pledge" }, of: { type: "item", of: "promise" }, nullable: true },
    seenTime: { from: { kind: "fact-time", name: "seen" }, of: { type: "time" }, nullable: true },
    seenBy: { from: { kind: "fact-signer", name: "seen" }, of: { type: "member" }, nullable: true },
  };
  const declaration = readApplicationProjection({ v: 1, definition: textDigest("PUBLIC TEST selected definition"), revision: "revision", sources: {
    board: { item: "board", read: "many", states: ["open"], limit: 1, fields },
    selected: { item: "board", read: "item", states: ["open"], limit: 1, fields: { number: fields.number } },
  } });
  const writer = { membership: { ...scope, kind: "membership" as const }, member: "@ada" as const };
  const data = { ...good.value, projection: applicationProjectionId(declaration), sources: {
    board: [{ id: 2, type: "board", state: "open", revision: 1, fields: { number: 4, writer, linked: null, seenTime: "2026-10-16T08:00:00Z", seenBy: writer } }],
    selected: [{ id: 2, type: "board", state: "open", revision: 1, fields: { number: 4 } }],
  } };
  const snapshot = applicationItemSnapshot(declaration, data);
  expect(snapshot.items).toEqual([{ id: 2, type: "board", state: "open", revision: 1, values: { lastNumber: 4 }, refs: { pledge: null }, parties: { controller: writer } }]);
  expect(snapshot).not.toHaveProperty("status"); expect(snapshot).not.toHaveProperty("time"); expect(snapshot).not.toHaveProperty("counts");
  expect(snapshot.items[0]).not.toHaveProperty("opened"); expect(snapshot.items[0]).not.toHaveProperty("attributed");
  expect(completeApplicationItems({ ...good, value: data }, declaration)).toEqual({ ok: true, at: data.at, complete: true,
    value: { scope, definition: declaration.definition, at: data.at, value: snapshot } });
  expect(completeApplicationItems({ ok: false, reason: "incomplete" }, declaration)).toEqual({ ok: false, reason: "unavailable" });
  expect(completeApplicationItems({ ok: false, reason: "forbidden" }, declaration)).toEqual({ ok: false, reason: "forbidden" });
  const raw = completeApplicationProjection({ ...good, value: data }, declaration);
  expect(raw.ok && raw.value.value).toBe(data);
  expect(completeApplicationProjection({ ok: false, reason: "incomplete" }, declaration)).toEqual({ ok: false, reason: "unavailable" });
  expect(() => applicationItemSnapshot(declaration, { ...data, projection: textDigest("another declaration") })).toThrow("does not match");
  const changed = structuredClone(data); changed.sources.selected[0]!.revision = 2;
  expect(() => applicationItemSnapshot(declaration, changed)).toThrow("does not match");
  const absent = structuredClone(data); delete (absent.sources.board[0]!.fields as Partial<typeof data.sources.board[0]["fields"]>).writer;
  expect(() => applicationItemSnapshot(declaration, absent)).toThrow("does not match");
});
