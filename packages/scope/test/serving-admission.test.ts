/** Real bounded signature/counter/ingress code. Where a transport below
 * returns a written answer it is a named stand-in, not a native judgment. */
import { env, evictDurableObject, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { Intent, ItemQuery, SignedIntent } from "@generalbusiness/dap-contract";
import { encodeItemQueryParameter, itemQueryArgument, keyIdOfSecret, newIncarnation, scopeIdOf, signIntent, textDigest } from "@generalbusiness/dap-bytes";
import { httpTransport, secretSigner, signedReader } from "@generalbusiness/dap-client";
import { SERVING_CREATION_BYTES, ServingAdmission, type ServingDecision, type ServingRequest } from "../src/serving-admission.ts";
import { SCOPE_INDEX_NAME } from "../src/scope-index.ts";
import { api, route, type Api } from "../src/worker.ts";
import type { Binding } from "../src/namespace.ts";
import { StartupReadTrace, startupScopes } from "./support/serving-startup.ts";
import { SCREEN_TEST_HOST } from "./worker.ts";
import sandbox, { type SandboxEnv } from "../../../apps/sandbox/worker.ts";

const small = { SERVING_CREATION_KEY_PER_HOUR: "2", SERVING_CREATION_ADDRESS_PER_HOUR: "3",
  SERVING_READ_KEY_PER_MINUTE: "2", SERVING_READ_ADDRESS_PER_MINUTE: "3" };
const secret = (n: number) => new Uint8Array(32).fill(n);
const creation = (seed: Uint8Array, key = "one"): SignedIntent => {
  const intent: Intent = { v: 1, to: null, actor: keyIdOfSecret(seed), kind: "install", on: null,
    expected: {}, fields: {}, idempotencyKey: key, notAfter: "2030-01-01T00:00:00Z" };
  return signIntent(intent, seed);
};
const target = scopeIdOf({ v: 1, kind: "register", definition: "platform:register@17", creator: null,
  cause: textDigest("R12 unknown target; no genesis asserted"), ordinal: 0 });

function fixed(settings = small) {
  const serving = new ServingAdmission(settings), calls: ServingRequest[] = [];
  const binding: Binding<string> = { idFromName(name) { expect(name).toBe(SCOPE_INDEX_NAME); return name; },
    get() { return { admitServing: async (request: ServingRequest, address: string | null) => {
      calls.push(request); return serving.admit(request, address, 0);
    }, creationAddress: async (address: string) => serving.creationAddress(address, 0) }; } };
  return { environment: { SCOPE_INDEX: binding }, calls, serving };
}

test("a forged actor signature never drains a victim's key; valid and address-only attempts reach their own exact limits", async () => {
  const serving = new ServingAdmission(small), victim = creation(secret(1)), other = creation(secret(2));
  for (let n = 0; n < 10; n++) expect(serving.admit({ kind: "creation", signed: { ...victim, sig: other.sig } }, null, 0)).toBe("invalid");
  expect([serving.admit({ kind: "creation", signed: victim }, null, 0),
    serving.admit({ kind: "creation", signed: victim }, null, 0),
    serving.admit({ kind: "creation", signed: victim }, null, 0)]).toEqual(["admitted", "admitted", "rate-limited"]);
  const signer = secretSigner(secret(3)), reader = await signedReader(signer, target, "summary", "summary", { now: () => 0 });
  expect([serving.admit({ kind: "signed-read", reader }, null, 0), serving.admit({ kind: "signed-read", reader }, null, 0),
    serving.admit({ kind: "signed-read", reader }, null, 0)]).toEqual(["admitted", "admitted", "rate-limited"]);
  const address = new ServingAdmission(small);
  for (let n = 0; n < 3; n++) expect(address.admit({ kind: "creation", signed: { ...victim, sig: other.sig } }, "192.0.2.1", 0)).toBe("invalid");
  expect(address.admit({ kind: "creation", signed: other }, "::ffff:192.0.2.1", 0)).toBe("rate-limited");
  expect(address.admit({ kind: "creation", signed: victim }, null, 0)).toBe("admitted");
});

test("shared ingress accounts once before target addressing, without turning valid custody into authority", async () => {
  const owner = fixed(), addressed: string[] = [];
  const transport: Binding<string> = { idFromName(name) { addressed.push(name); return name; },
    // Stand-in target answer, not a native judgment.
    get() { return { create: async () => ({ answer: "unavailable", reason: "unavailable" }),
      summary: async () => ({ ok: false, reason: "forbidden" }) }; } };
  const scopes = api(transport, null, { ...owner.environment, ALLOW_OPEN_CREATION: "true" });
  const signed = creation(secret(4));
  expect((await scopes.create(signed, "platform:register@17")).answer).toBe("unavailable");
  expect((await scopes.create(signed, "platform:register@17")).answer).toBe("unavailable");
  expect(await scopes.create(signed, "platform:register@17")).toEqual({ answer: "unavailable", reason: "rate-limited" });
  expect([owner.calls.length, addressed.length]).toEqual([3, 2]);
  const reader = await signedReader(secretSigner(secret(5)), target, "summary", "summary", { now: () => 0 });
  expect(await scopes.summary(target, reader)).toEqual({ ok: false, reason: "forbidden" });
  expect(await scopes.summary(target, reader)).toEqual({ ok: false, reason: "forbidden" });
  const before = addressed.length;
  expect(await scopes.summary(target, reader)).toEqual({ ok: false, reason: "rate-limited" });
  expect([owner.calls.length, addressed.length]).toEqual([6, before]);
  const closed = api(transport);
  expect(await closed.create(signed, "platform:register@17")).toEqual({ answer: "unavailable", reason: "unavailable" });
  expect(await closed.summary(target, reader)).toEqual({ ok: false, reason: "unavailable" });
  // The sandbox exchange shares the same session-only opening as stream().
  // Neither Signed route may select a target or spend a signed-read window.
  expect(await scopes.stream(target, reader)).toEqual({ ok: false, reason: "forbidden" });
  expect(await scopes.streamExchange(target, reader)).toEqual({ ok: false, reason: "forbidden" });
  expect([addressed.length, owner.calls.length]).toEqual([before, 6]);
  expect(addressed.length).toBe(before);
});

test("synthetic HTTP ignores forwarded edge headers; only an explicit trusted transport address participates", async () => {
  const owner = fixed({ ...small, SERVING_READ_KEY_PER_MINUTE: "10", SERVING_READ_ADDRESS_PER_MINUTE: "1" });
  const binding: Binding<string> = { idFromName: name => name, get: () => ({ summary: async () => ({ ok: false, reason: "forbidden" }) }) };
  const reader = await signedReader(secretSigner(secret(6)), target, "summary", "summary", { now: () => 0 });
  const request = () => new Request(`https://serving.test/v1/scopes/${target}`, { headers: { authorization: reader, "cf-connecting-ip": "192.0.2.10" } });
  // Same synthetic header is not a trusted address and does not fill its window.
  expect((await route(request(), binding, owner.environment)).status).toBe(403);
  expect((await route(request(), binding, owner.environment)).status).toBe(403);
  expect((await route(request(), binding, owner.environment, "192.0.2.10")).status).toBe(403);
  const limited = await route(request(), binding, owner.environment, "192.0.2.10");
  expect([limited.status, await limited.json()]).toEqual([429, { ok: false, reason: "rate-limited" }]);
  const client = httpTransport("https://serving.test", { fetch: async (url, init) => {
    const response = await route(new Request(url, init), binding, owner.environment, "192.0.2.10");
    return { status: response.status, body: response.body };
  } });
  // The ordinary bounded client must accept the new typed wire reason,
  // rather than losing it as malformed JSON or reporting native forbidden.
  expect(await client.summary(target, reader)).toEqual({ ok: false, reason: "rate-limited" });
});

test("the direct HTTP item-query shortcut and in-process API each charge a signed attempt exactly once", async () => {
  const owner = fixed(), query: ItemQuery = { v: 1,
    scope: { scope: target, inc: newIncarnation(new Uint8Array(16).fill(9)), kind: "register" },
    type: "claim", states: ["open"], ids: null, limit: 1, cursor: null };
  const encoded = encodeItemQueryParameter(query), argument = itemQueryArgument(query);
  if (!encoded || !argument) throw Error("Valid bounded query required");
  const reader = await signedReader(secretSigner(secret(7)), target, "query-items", argument, { now: () => 0 });
  let targetReads = 0;
  const binding: Binding<string> = { idFromName: name => name, get: () => ({ queryItems: async () => {
    targetReads++; return { ok: false, reason: "forbidden" };
  } }) };
  const request = () => new Request(`https://serving.test/v1/scopes/${target}/query-items?q=${encoded}`, { headers: { authorization: reader } });
  expect((await route(request(), binding, owner.environment)).status).toBe(403);
  expect([owner.calls.length, targetReads]).toEqual([1, 1]);
  const scopes = api(binding, null, owner.environment);
  expect(await scopes.queryItems(target, reader, encoded)).toEqual({ ok: false, reason: "forbidden" });
  expect([owner.calls.length, targetReads]).toEqual([2, 2]);
  const response = await route(request(), binding, owner.environment);
  expect([response.status, await response.json(), owner.calls.length, targetReads])
    .toEqual([429, { ok: false, reason: "rate-limited" }, 3, 2]);
});

test("the real fixed object's memory survives calls without SQLite writes and resets only on actual eviction", async () => {
  const object = env.SERVING_INDEX.get(env.SERVING_INDEX.idFromName(SCOPE_INDEX_NAME));
  const port = object as unknown as { admitServing(request: ServingRequest, address: string | null): Promise<ServingDecision> };
  const signed = creation(crypto.getRandomValues(new Uint8Array(32))), request: ServingRequest = { kind: "creation", signed };
  const tables = () => runInDurableObject(object, (_instance, state) => state.storage.sql.exec("SELECT name FROM sqlite_master ORDER BY name").toArray());
  const before = await tables();
  expect([await port.admitServing(request, null), await port.admitServing(request, null), await port.admitServing(request, null)])
    .toEqual(["admitted", "admitted", "rate-limited"]);
  expect(await tables()).toEqual(before);
  // Separate stubs/ingress callers reach the same fixed owner, not fresh
  // per-request environment counters. Site reads do not spend key windows.
  const other = env.SERVING_INDEX.get(env.SERVING_INDEX.idFromName(SCOPE_INDEX_NAME)) as unknown as typeof port;
  for (let n = 0; n < 240; n++) expect(await (n % 2 ? port : other).admitServing({ kind: "site-read" }, "192.0.2.241")).toBe("admitted");
  expect(await other.admitServing({ kind: "site-read" }, "192.0.2.241")).toBe("rate-limited");
  expect(await tables()).toEqual(before);
  await evictDurableObject(object);
  expect(await port.admitServing(request, null)).toBe("admitted");
  expect(await port.admitServing({ kind: "site-read" }, "192.0.2.241")).toBe("admitted");
  expect(await tables()).toEqual(before);
});

test("the test service binding and HTTP share the same addressless key window on the fixed serving object", async () => {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const reader = await signedReader(secretSigner(seed), target, "summary", "summary", { now: () => 0 });
  const actual = env.SERVING_API as unknown as Api;
  expect(await actual.summary(target, reader)).toEqual({ ok: false, reason: "not-found" });
  const binding: Binding<string> = { idFromName() { return expect.fail("Unknown indexed target must not be addressed"); }, get() { return expect.fail("No target storage"); } };
  // Unknown target refusal through the actual test binding already consumed one
  // eligible request; no proof/result is cached by that serving decision.
  expect(await actual.summary(target, reader)).toEqual({ ok: false, reason: "not-found" });
  const response = await route(new Request(`https://serving.test/v1/scopes/${target}`, { headers: { authorization: reader } }), binding, { SCOPE_INDEX: env.SERVING_INDEX });
  expect([response.status, await response.json()]).toEqual([429, { ok: false, reason: "rate-limited" }]);
});


test("startup reader observer counts direct and operational envelopes once and preserves the original RPC arguments, result and error", () => {
  // Pure observer boundary: written target answers prove no native authority.
  const trace = new StartupReadTrace(), delivered: { method: string; args: unknown[] }[] = [];
  const value = {}, fault = new Error("observer target fault"), identity = { request: null, trace: null };
  const original = {
    summary: (...args: unknown[]) => { delivered.push({ method: "summary", args }); return value; },
    queryItems: (...args: unknown[]) => { delivered.push({ method: "queryItems", args }); return value; },
    observed: (...args: unknown[]) => { delivered.push({ method: "observed", args }); if (args[0] === "history") throw fault; return value; },
  };
  const binding: Binding<string> = { idFromName: name => name, get: () => original };
  const remote = startupScopes(binding, trace).get("observer") as typeof original;
  const summaryArgs = ["Session observer fixture"], queryArgs = ["encoded query fixture", "Signed observer fixture"];
  expect(remote.summary(...summaryArgs)).toBe(value);
  expect(remote.observed("summary", summaryArgs, identity, false)).toBe(value);
  expect(remote.queryItems(...queryArgs)).toBe(value);
  expect(remote.observed("queryItems", queryArgs, identity, false)).toBe(value);
  let received: unknown;
  try { remote.observed("history", ["Signed observer fixture"], identity, false); } catch (error) { received = error; }
  expect(received).toBe(fault);
  expect(delivered).toHaveLength(5);
  expect(delivered[1]!.args[1]).toBe(summaryArgs);
  expect(delivered[1]!.args[2]).toBe(identity);
  expect(delivered[3]!.args[1]).toBe(queryArgs);
  expect(trace.snapshot()).toEqual({ calls: 5, complete: true,
    counts: [["session:summary", 2], ["signed:history", 1], ["signed:queryItems", 2]] });
  const malformed = new StartupReadTrace();
  malformed.record("observed", ["observed", ["summary", summaryArgs], identity, false]);
  malformed.record("observed", ["summary", new Array(9), identity, false]);
  malformed.record("observed", ["summary", summaryArgs]);
  expect(malformed.snapshot()).toEqual({ calls: 0, complete: false, counts: [] });
});


test("the named sandbox service shares indexed signed-read accounting and ignores forwarded address headers", async () => {
  const screen = env.SERVING_SCREEN_API as unknown as {
    native(screenOrigin: string, request: Request): Promise<Response>;
  };
  const reader = await signedReader(secretSigner(crypto.getRandomValues(new Uint8Array(32))), target, "summary", "summary", { now: () => 0 });
  const address = "198.51.100.77";
  const request = () => new Request(`${SCREEN_TEST_HOST.roomOrigin}/v1/scopes/${target}`, {
    headers: { authorization: reader, "cf-connecting-ip": address },
  });
  // Real named WorkerEntrypoint and fixed owner, but no native target exists.
  // Custody admission does not grant authority or permit an unknown lookup.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await screen.native(SCREEN_TEST_HOST.screenOrigin, request()).catch(() =>
      expect.fail("Sandbox native RPC rejected before returning the expected indexed refusal"));
    expect([response.status, await response.json()]).toEqual([404, { ok: false, reason: "not-found" }]);
  }
  const regular = env.SERVING_API as unknown as Api;
  expect(await regular.summary(target, reader)).toEqual({ ok: false, reason: "rate-limited" });

  // Each distinct actual key spends one explicit address attempt. If native()
  // trusted the forwarded header, the second of these three would be limited.
  const object = env.SERVING_INDEX.get(env.SERVING_INDEX.idFromName(SCOPE_INDEX_NAME));
  const serving = object as unknown as { admitServing(request: ServingRequest, address: string | null): Promise<ServingDecision> };
  for (let attempt = 0; attempt < 3; attempt++) {
    const separate = await signedReader(secretSigner(crypto.getRandomValues(new Uint8Array(32))), target, "summary", "summary", { now: () => 0 });
    expect(await serving.admitServing({ kind: "signed-read", reader: separate }, address)).toBe("admitted");
  }
  const extra = await signedReader(secretSigner(crypto.getRandomValues(new Uint8Array(32))), target, "summary", "summary", { now: () => 0 });
  expect(await serving.admitServing({ kind: "signed-read", reader: extra }, address)).toBe("rate-limited");
});

test("sandbox Site exhaustion follows the explicit visitor address through the real service binding", async () => {
  // The request edge header and ExecutionContext are stand-ins. Gateway,
  // named service RPC and fixed Site counter are the maintained real path.
  const backgrounds: Promise<unknown>[] = [];
  const execution = { waitUntil: (work: Promise<unknown>) => { backgrounds.push(work); } };
  const bindings: SandboxEnv = {
    SCREEN_HOSTS: JSON.stringify([{ host: SCREEN_TEST_HOST, service: "ROOM" }]),
    ROOM: env.SERVING_SCREEN_API as unknown as NonNullable<SandboxEnv["ROOM"]>,
  };
  const visit = async (address: string) => {
    const response = await sandbox.fetch(new Request(`${SCREEN_TEST_HOST.screenOrigin}/site/${SCREEN_TEST_HOST.directory}/HEAD/README.md`, {
      headers: { "cf-connecting-ip": address },
    }), bindings, execution);
    await response.text(); return response.status;
  };
  // Other addressless callers may already have used the old shared bucket.
  // The exact minute bound belongs to the pure Site counter witness; this
  // witness distinguishes visitors after the real gateway reports exhaustion.
  let exhausted = false;
  for (let n = 0; n <= 240; n++) {
    const status = await visit("198.51.100.201");
    if (status === 429) { exhausted = true; break; }
    expect(status).toBe(404);
  }
  expect(exhausted).toBe(true);
  expect(await visit("198.51.100.202")).toBe(404);
  await Promise.all(backgrounds);
});

test("found custody windows stop one key across addresses and one address across keys before target work", async () => {
  const owner = fixed(); let submits = 0;
  // Target stand-in: proves serving admission, never native founding authority.
  const binding: Binding<string> = { idFromName: name => name, get: () => ({
    submit: async () => { submits++; return { answer: "unavailable", reason: "unavailable" }; },
  }) };
  const found = (n: number) => signIntent({ ...creation(secret(n)).intent, to: { scope: target, inc: newIncarnation(new Uint8Array(16).fill(9)), kind: "register" }, kind: "found" }, secret(n));
  const attempt = (n: number, address: string) => api(binding, address, owner.environment).submit(target, found(n), []);
  expect(await attempt(21, "192.0.2.1")).toEqual({ answer: "unavailable", reason: "unavailable" });
  expect(await attempt(21, "192.0.2.2")).toEqual({ answer: "unavailable", reason: "unavailable" });
  expect(await attempt(21, "192.0.2.3")).toEqual({ answer: "unavailable", reason: "rate-limited" });
  expect(await attempt(22, "192.0.2.1")).toEqual({ answer: "unavailable", reason: "unavailable" });
  expect(await attempt(23, "192.0.2.1")).toEqual({ answer: "unavailable", reason: "unavailable" });
  expect(await attempt(24, "192.0.2.1")).toEqual({ answer: "unavailable", reason: "rate-limited" });
  expect(submits).toBe(4);
  // Native authority has not changed, and founding consumes no read window.
  const reader = await signedReader(secretSigner(secret(21)), target, "summary", "summary", { now: () => 0 });
  expect(owner.serving.admit({ kind: "signed-read", reader }, "192.0.2.1", 0)).toBe("admitted");
});

test("every found submit charges its address, including one over the serving bound that the target refuses", async () => {
  const owner = fixed(), address = "192.0.2.40"; let submits = 0;
  // Target stand-in: proves serving admission, never native founding authority.
  const binding: Binding<string> = { idFromName: name => name, get: () => ({
    submit: async () => { submits++; return { answer: "refused", reason: "source-unverified" }; },
  }) };
  const found = (n: number) => signIntent({ ...creation(secret(n)).intent, to: { scope: target, inc: newIncarnation(new Uint8Array(16).fill(9)), kind: "register" }, kind: "found" }, secret(n));
  const oversized = (n: number): SignedIntent => { const signed = found(n); return { ...signed, intent: { ...signed.intent, fields: { pad: "x".repeat(SERVING_CREATION_BYTES) } } }; };
  const scopes = api(binding, address, owner.environment);
  for (let n = 41; n < 44; n++) expect(await scopes.submit(target, oversized(n), [])).toEqual({ answer: "refused", reason: "source-unverified" });
  expect(await scopes.submit(target, found(44), [])).toEqual({ answer: "unavailable", reason: "rate-limited" });
  expect(submits).toBe(3);
});

test("an exhausted creation address is refused before its HTTP body is read or parsed", async () => {
  const owner = fixed(), address = "203.0.113.90";
  for (let n = 31; n < 34; n++) expect(owner.serving.admit({ kind: "creation", signed: creation(secret(n)) }, address, 0)).toBe("admitted");
  let bodyReads = 0;
  const request = new Request("https://serving.test/v1/scopes", { method: "POST" });
  Object.defineProperty(request, "body", { get() { bodyReads++; throw Error("blocked body must remain unread"); } });
  const binding: Binding<string> = {
    idFromName() { return expect.fail("blocked creation addresses no target"); },
    get() { return expect.fail("blocked creation selects no object"); },
  };
  const response = await route(request, binding, owner.environment, address);
  expect([response.status, await response.json(), bodyReads]).toEqual([429, { answer: "unavailable", reason: "rate-limited" }, 0]);
});
