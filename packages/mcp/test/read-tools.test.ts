import { expect, test } from "vitest";
import { b64url, canonicalize, digestBytes, domainBytes, utf8 } from "@generalbusiness/dap-bytes";
import { DOMAINS, type SignedIntent } from "@generalbusiness/dap-contract";
import { TransportError } from "@generalbusiness/dap-client";
import { issueDemo } from "@generalbusiness/dap-lanes";
import { LEGACY, MODERN, McpService, Wire, memoryStore, newSession, type ApplicationReadCatalogue, type CallResult, type Display, type Tool, type ViewSource } from "../src/index.ts";
import { fixedSigner } from "./fixtures.ts";
import { SERVICE, StandIn } from "./support/standin.ts";

const result = (name: string): CallResult => ({ content: [{ type: "text", text: name }], structuredContent: { name }, isError: false });
const descriptor = (name: string): Tool => ({ name, description: `Bounded ${name} read.`, inputSchema: { type: "object", additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false } });
const names = ["needs_you", "work", "context", "since"];
const catalogue = (run: (name: string) => Promise<CallResult> = async name => result(name)): ApplicationReadCatalogue => ({ revision: digestBytes(utf8("adapter-1")), tools: names.map(name => ({ tool: descriptor(name), run: () => run(name) })) });

// Invariant: static application catalogue operations and reads never acquire the generic room inventory.
// The handlers are explicit local stand-ins; this is not a native authorization or eight-scope budget witness.
test("application list, calls and both subscription paths avoid inventory", async () => {
  let configReads = 0, requests = 0, timers = 0;
  const called: string[] = [];
  const service = new McpService({ service: "https://scopes.test", signer: fixedSigner(31), custody: memoryStore(),
    config: { read: async () => { configReads++; throw Error("Inventory must not be collected."); }, addRoot: async () => {} },
    fetch: async () => { requests++; throw Error("No application handler uses the native transport."); },
    every: () => { timers++; throw Error("A static catalogue needs no poll."); },
    applicationReads: catalogue(async name => { called.push(name); return result(name); }),
    views: { read: async () => ({ status: "empty", position: 0, count: 0, fallback: "Empty fixture." }) },
  });
  const page = await service.page();
  expect(page.tools.filter(tool => !tool.name.startsWith("view_")).map(tool => tool.name)).toEqual(names);
  for (const name of names) expect((await service.call(name, {})).structuredContent).toEqual({ name });
  expect((await service.call("view_needs_you", { view: "fixture" })).isError).toBe(false);
  expect((await service.call("room", {})).structuredContent["error"]).toBe("unknown-tool");
  expect((await service.call("not-listed", {})).structuredContent["error"]).toBe("unknown-tool");
  expect(called).toEqual(names);
  const wire = new Wire(service), session = newSession(null);
  const send = () => {};
  await wire.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: LEGACY } }, session, send);
  await wire.handle({ jsonrpc: "2.0", method: "notifications/initialized" }, session, send);
  expect((await wire.handle({ jsonrpc: "2.0", id: 2, method: "tools/list" }, session, send))?.error).toBeUndefined();
  await wire.handle({ jsonrpc: "2.0", id: 3, method: "subscriptions/listen", params: {
    notifications: { toolsListChanged: true }, _meta: { "io.modelcontextprotocol/protocolVersion": MODERN, "io.modelcontextprotocol/clientCapabilities": {} },
  } }, null, send);
  expect(wire.listening).toBe(1);
  await service.check();
  expect(await service.catalogueGeneration()).toBe(page.generation);
  expect({ configReads, requests, timers }).toEqual({ configReads: 0, requests: 0, timers: 0 });
  expect(service.watching).toBe(false);
  wire.endLegacy(session); wire.closeAll();
});

// Invariant: immutable descriptors and resource-aware generations prevent cross-catalogue cursor reuse.
test("read descriptors are copied and cursors bind catalogue and Brief bytes", async () => {
  const reads = catalogue();
  const make = (applicationReads: ApplicationReadCatalogue, text = "Brief A") => new McpService({ service: "https://scopes.test", signer: fixedSigner(32),
    config: { read: async () => { throw Error("No inventory."); }, addRoot: async () => {} }, custody: memoryStore(),
    applicationReads, listPageBytes: 350, packageBrief: { bytes: utf8(text), digest: digestBytes(utf8(text)) } });
  const service = make(reads), first = await service.page();
  expect(first.nextCursor).toBeTruthy();
  reads.tools[0]!.tool.description = "Caller mutation";
  first.tools[0]!.description = "Response mutation";
  expect((await service.page()).tools[0]!.description).toBe("Bounded needs_you read.");
  const other = make(catalogue(), "Brief B");
  await expect(other.page(first.nextCursor)).rejects.toThrow("list changed");
  const revision = make({ ...catalogue(), revision: digestBytes(utf8("adapter-2")) });
  await expect(revision.page(first.nextCursor)).rejects.toThrow("list changed");
});

// Invariant: opt-in handlers cannot replace native/view tools or bypass bounded input/results.
test("catalogue collisions, shape and UTF-8 bounds fail before handler dispatch", async () => {
  const make = (applicationReads: ApplicationReadCatalogue) => new McpService({ service: "https://scopes.test", signer: fixedSigner(33),
    config: { read: async () => { throw Error("No inventory."); }, addRoot: async () => {} }, custody: memoryStore(), applicationReads,
    views: { read: async () => ({ status: "empty", position: 0, count: 0, fallback: "Empty." }) } });
  const one = catalogue().tools[0]!;
  for (const name of ["room", "view_read", "not a name"]) expect(() => make({ ...catalogue(), tools: [{ ...one, tool: descriptor(name) }] })).toThrow();
  expect(() => make({ ...catalogue(), tools: [one, one] })).toThrow();
  expect(() => make({ ...catalogue(), tools: Array.from({ length: 17 }, (_, i) => ({ ...one, tool: descriptor(`read${i}`) })) })).toThrow();
  expect(() => make({ ...catalogue(), tools: [{ ...one, tool: { ...descriptor("read"), annotations: { readOnlyHint: false } } }] })).toThrow();
  expect(() => make({ ...catalogue(), tools: [{ ...one, tool: { ...descriptor("read"), description: "x".repeat(17000) } }] })).toThrow();
  let calls = 0;
  const service = make(catalogue(async () => { calls++; return { ...result("large"), structuredContent: { text: "é".repeat(140000) } }; }));
  expect((await service.call("needs_you", { text: "é".repeat(9000) })).structuredContent["reason"]).toBe("bounds");
  expect((await service.call("needs_you", null)).structuredContent["reason"]).toBe("shape");
  expect(calls).toBe(0);
  expect((await service.call("needs_you", {})).structuredContent["reason"]).toBe("bounds");
  expect(calls).toBe(1);
});

// Invariant: an opt-in card can check its retained original through real MCP custody without exposing public settle or resigning.
// The projection, native HTTP answers and authority are scripted. McpService, signing, custody and settlement routing are real.
test("an application view settles its unknown original internally without another act signature", async () => {
  const base = fixedSigner(36), signedBytes: string[] = [];
  const signer = { key: base.key, sign: (bytes: Uint8Array) => { signedBytes.push(b64url(bytes)); return base.sign(bytes); } };
  const stand = new StandIn(signer.key, "admin", ["issue.comment"]), lane = stand.lane(issueDemo), store = memoryStore();
  const sent: { route: string; signed: SignedIntent }[] = [];
  let lost = false;
  const views: ViewSource = { initialPage: () => "item", read: async () => ({ status: "ready", position: 0, count: 1, fallback: "Comment fixture.", card: {
    identity: { kind: "fixture", item: "comment", revision: "0", subject: { scope: lane.scope }, at: {} },
    title: "Comment", summary: "Retained-original routing fixture", reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "Comment fixture.",
    actions: [{ id: "comment", label: "Comment", purpose: "act", kind: "comment", args: { target: lane.scope, fields: { body: "Scripted settlement witness." }, at: {} } }],
  } }) };
  const service = new McpService({ service: SERVICE, signer, custody: store, now: () => Date.parse("2099-01-01T00:00:00Z"),
    config: { read: async () => stand.config(), addRoot: async () => {} }, applicationReads: catalogue(), views,
    fetch: async (url, init) => {
      const route = new URL(url).pathname;
      if (init?.method === "POST" && (route.endsWith("/acts") || route.endsWith("/settle"))) {
        sent.push({ route, signed: (JSON.parse(String(init.body)) as { signed: SignedIntent }).signed });
      }
      const reply = await stand.fetch(url, init);
      if (!lost && init?.method === "POST" && route.endsWith("/acts")) { lost = true; throw new TransportError("scripted lost reply after the stand-in recorded the act"); }
      return reply;
    },
  });
  expect((await service.page()).tools.some(tool => tool.name === "settle")).toBe(false);
  await service.call("view_needs_you", { view: "recover" });
  const lostResult = await service.call("view_act", { view: "recover", cut: 0, action: "comment" });
  expect((lostResult.structuredContent["result"] as CallResult).structuredContent["error"]).toBe("transport");
  const unresolved = await store.unresolved();
  expect(unresolved).toHaveLength(1);
  const original = (await store.read(unresolved[0]!.id))!;
  const envelope = canonicalize(original.envelope.signed), signatureBytes = b64url(domainBytes(DOMAINS.intent, original.envelope.signed.intent));
  expect(signedBytes.filter(bytes => bytes === signatureBytes)).toHaveLength(1);
  const beforePublic = sent.length;
  expect((await service.call("settle", { target: lane.scope, idempotencyKey: original.identity.key })).structuredContent["error"]).toBe("unknown-tool");
  expect(sent).toHaveLength(beforePublic);
  const pending = lostResult.structuredContent["display"] as Display;
  expect(pending.card!.actions[0]!.purpose).toBe("check-original");
  const checked = await service.call("view_act", { view: "recover", cut: pending.cut, action: pending.card!.actions[0]!.id });
  expect((checked.structuredContent["result"] as CallResult).structuredContent["answer"]).toBe("accepted");
  expect(sent.map(row => row.route.endsWith("/acts") ? "act" : "settle")).toEqual(["act", "settle"]);
  expect(sent.map(row => canonicalize(row.signed))).toEqual([envelope, envelope]);
  expect(signedBytes.filter(bytes => bytes === signatureBytes)).toHaveLength(1);
  expect(canonicalize((await store.read(unresolved[0]!.id))!.envelope.signed)).toBe(envelope);
  expect(await store.unresolved()).toEqual([]);
});
