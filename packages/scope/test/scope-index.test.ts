import { expect, test } from "vitest";
import { env } from "cloudflare:workers";
import type { ControlRequest, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, newIncarnation, signControl, utf8 } from "@generalbusiness/artroom-bytes";
import { applicationScreenPath } from "@generalbusiness/artroom-client/application";
import { indexedScopes, ScopeIndexRows, SCOPE_INDEX_NAME, type ScopeIndexPort, type ScopeRegistration } from "../src/scope-index.ts";
import scopeWorker, { api, mcpRoute } from "../src/worker.ts";
import { applicationSandboxPage } from "../src/applications/route.ts";
import { namespace, membershipIn, type Binding } from "../src/namespace.ts";
import { controls } from "../src/testing.ts";
import { at, create, creation, definition, reader, rita, START } from "./fixtures-native.ts";
import { scopeRegistrationWiring } from "./worker.ts";

test("index lookup writes no schema and registration on real SQLite is idempotent and conflict closed", async () => {
  const holder = await create(), proof = { at: holder.at, genesis: holder.genesis.fact.hash };
  const result = await holder.inside(state => {
    const queries: string[] = [];
    const rows = new ScopeIndexRows({ exec: (query, ...args) => { queries.push(query); return state.storage.sql.exec(query, ...args); } });
    const before = rows.has(proof.at.scope), reads = [...queries]; queries.length = 0;
    const first = rows.register(proof), again = rows.register(proof);
    const conflict = rows.register({ ...proof, genesis: `sha256:${"0".repeat(64)}` });
    queries.length = 0;
    const after = rows.has(proof.at.scope), wrongKind = rows.has(proof.at.scope, "membership"), listed = rows.list();
    return { before, reads, first, again, conflict, after, wrongKind, listed, lookups: queries };
  });
  expect(result).toMatchObject({ before: false, first: true, again: true, conflict: false, after: true, wrongKind: false, listed: [proof] });
  expect(result.reads).toHaveLength(1);
  expect([...result.reads, ...result.lookups].every(query => query.startsWith("SELECT "))).toBe(true);
});

test("unknown foreign facts, site and application lookups and hosted registry reach no target", async () => {
  const born = creation();
  const atRef: ScopeRef = { scope: born.name, inc: newIncarnation(crypto.getRandomValues(new Uint8Array(16))), kind: "membership" };
  const fact = { at: atRef, seq: 0, hash: digestBytes(utf8("unknown")) };
  let targetCalls = 0, registryCalls = 0, bodyReads = 0, indexReads = 0;
  const targets: Binding = { idFromName() { targetCalls++; throw Error("unknown target namespace touched"); }, get() { targetCalls++; throw Error("unknown target instantiated"); } };
  const index: ScopeIndexPort = { async has() { indexReads++; return false; }, async register() { throw Error("lookup wrote index"); } };
  const settings = { SCOPE_INDEX: { idFromName: (name: string) => name, get: () => index } };
  const gated = indexedScopes(targets, settings), ports = namespace(gated);
  expect(await ports.resolver.read(fact, 1)).toEqual({ absent: true });
  expect(await ports.proofs.read(fact, 1024, 1000)).toBeNull();
  expect(await ports.births.read(atRef, 1000, 1024)).toBeNull();
  expect(await ports.definitions.read(fact.hash, atRef)).toEqual({ ok: false, reason: "absent" });
  expect(await ports.texts.read(fact, fact.hash)).toEqual({ ok: false, reason: "absent" });
  expect(await membershipIn(gated).observe({ of: atRef, key: rita.key }, 1)).toBeNull();
  // Production outer dispatch, with trap namespaces instead of any DO/storage.
  const routeEnv = { ...env, ...settings, SCOPES: targets as unknown as DurableObjectNamespace };
  const beforeSite = indexReads;
  expect((await scopeWorker.fetch(new Request(`https://scope.test/site/${born.name}/HEAD/`), routeEnv)).status).toBe(404);
  expect(indexReads).toBe(beforeSite + 1);
  const screenRequest = () => new Request(`https://scope.test${applicationScreenPath(born.name, 0, fact.hash)}`);
  expect((await scopeWorker.fetch(screenRequest(), routeEnv)).status).toBe(404);
  // The public route refuses before index, native target or package access.
  expect(indexReads).toBe(beforeSite + 1);
  // Only the private renderer retains the indexed native metadata boundary.
  expect((await applicationSandboxPage(screenRequest(), { ...routeEnv, SCOPES: gated }))?.status).toBe(404);
  expect(indexReads).toBe(beforeSite + 2);
  const request: ControlRequest = { v: 1, action: "create", service: "https://scope.test", membership: atRef, agent: null,
    actor: rita.key, body: digestBytes(utf8("{}")), op: "unknown-membership", notAfter: at(60) };
  const signed = signControl(request, rita.secret);
  const http = new Request("https://scope.test/mcp/agents", { method: "POST", headers: { authorization: `Control ${b64url(utf8(canonicalize(request)))}.${signed.sig}` }, body: "{}" });
  const trapped = new Proxy(http, { get(target, key) {
    if (key === "body") { bodyReads++; throw Error("unknown membership body consumed"); }
    const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value;
  } });
  const registries = { idFromName() { registryCalls++; throw Error("registry addressed"); }, get() { registryCalls++; throw Error("registry instantiated"); } };
  const reply = await mcpRoute(trapped, { ...settings, SCOPES: targets as unknown as DurableObjectNamespace, REGISTRIES: registries as unknown as DurableObjectNamespace, AGENTS: env.AGENTS });
  expect(reply?.status).toBe(404);
  expect(indexReads).toBe(beforeSite + 3);
  const otherKindIndex: ScopeIndexPort = { async has(_scope, kind) { return kind === undefined; }, async register() { throw Error("lookup wrote index"); } };
  const otherKind = await mcpRoute(trapped, { SCOPE_INDEX: { idFromName: name => name, get: () => otherKindIndex },
    SCOPES: targets as unknown as DurableObjectNamespace, REGISTRIES: registries as unknown as DurableObjectNamespace, AGENTS: env.AGENTS });
  expect(otherKind?.status).toBe(404); // a known Directory ID is not a known Membership
  expect({ targetCalls, registryCalls, bodyReads }).toEqual({ targetCalls: 0, registryCalls: 0, bodyReads: 0 });
});

test("unknown scope gate touches no target and only the native target's applied genesis registers", async () => {
  // Namespace/index transport are labelled stand-ins; creation and the stored
  // applied/refused genesis checks run in the actual ScopeObject on SQLite.
  const born = creation(), denied = creation(at(-1));
  controls(born.name, START); controls(denied.name, START);
  const known = new Map<string, ScopeRegistration>(); let registrations = 0, targetNames = 0, targetGets = 0, indexReads = 0, failRegistration = false;
  const index: ScopeIndexPort = {
    async has(name) { indexReads++; return known.has(name); },
    async register(proof) { registrations++; if (failRegistration) throw Error("TEST PRIVATE REGISTRATION ERROR"); known.set(proof.at.scope, proof); return true; },
  };
  const target: Binding = {
    idFromName(name) { targetNames++; return env.SCOPES.idFromName(name); },
    get(id) { targetGets++; return env.SCOPES.get(id as DurableObjectId); },
  };
  const settings = { SCOPE_INDEX: { idFromName(name: string) { expect(name).toBe(SCOPE_INDEX_NAME); return name; }, get() { return index; } } };
  const scopes = api(indexedScopes(target, settings), null, { ALLOW_OPEN_CREATION: "true", SCOPE_INDEX: env.SCOPE_INDEX });
  expect(await scopes.summary(born.name, reader)).toEqual({ ok: false, reason: "not-found" });
  expect([targetNames, targetGets, indexReads]).toEqual([0, 0, 1]);
  scopeRegistrationWiring.set(born.name, proof => index.register(proof));
  scopeRegistrationWiring.set(denied.name, proof => index.register(proof));
  try {
    const answer = await scopes.create(born.signed, definition.declared);
    expect(answer.answer).toBe("accepted");
    if (answer.answer !== "accepted") return expect.fail("native applied genesis required");
    expect(known.get(born.name)).toEqual({ at: answer.receipt.fact.at, genesis: answer.receipt.fact.hash });
    expect((await scopes.summary(born.name, reader)).ok).toBe(true);
    const again = await scopes.create(born.signed, definition.declared);
    expect(again).toEqual(answer);
    expect(known.size).toBe(1);
    const refused = await scopes.create(denied.signed, definition.declared);
    expect(refused.answer).not.toBe("accepted");
    expect(known.has(denied.name)).toBe(false);
    const before = [targetNames, targetGets];
    expect(await scopes.summary(denied.name, reader)).toEqual({ ok: false, reason: "not-found" });
    expect([targetNames, targetGets]).toEqual(before);
    expect(registrations).toBe(2); // exact creation retry re-proves the same stored genesis
    // Simulate an index outage after commit: retrying creation, not a caller
    // supplied proof, restores reachability from the existing native entry.
    known.delete(born.name);
    failRegistration = true;
    expect(await scopes.create(born.signed, definition.declared)).toEqual(answer);
    expect(known.has(born.name)).toBe(false);
    expect((await scopes.summary(born.name, reader)).ok).toBe(false);
    const backfill = api(indexedScopes(target, { ...settings, SCOPE_INDEX_MODE: "register" }));
    expect((await backfill.summary(born.name, reader)).ok).toBe(false);
    failRegistration = false;
    await scopes.create(born.signed, definition.declared);
    expect(known.get(born.name)?.genesis).toBe(answer.receipt.fact.hash);
    known.delete(born.name);
    expect((await backfill.summary(born.name, reader)).ok).toBe(true);
    expect(known.get(born.name)).toEqual({ at: answer.receipt.fact.at, genesis: answer.receipt.fact.hash });
    expect((await backfill.summary(denied.name, reader)).ok).toBe(false);
    expect(known.has(denied.name)).toBe(false);

    // Fixed observations cover a real native callback failure and an empty
    // native object. Neither logs caller data nor changes a boolean answer.
    const originalInfo = console.info, observed: unknown[][] = [];
    const missing = creation(); controls(missing.name, START);
    scopeRegistrationWiring.set(missing.name, proof => index.register(proof));
    const raw = env.SCOPES.get(env.SCOPES.idFromName(born.name)) as unknown as { registerKnown(): Promise<boolean> };
    const empty = env.SCOPES.get(env.SCOPES.idFromName(missing.name)) as unknown as { registerKnown(): Promise<boolean> };
    console.info = (...args: unknown[]) => { if (args[0] === "scope-index-registration") observed.push(args); else originalInfo(...args); };
    try {
      expect(await raw.registerKnown()).toBe(true);
      expect(observed).toEqual([]); // successful registration emits no row
      failRegistration = true;
      expect(await raw.registerKnown()).toBe(false);
      expect(observed).toEqual([["scope-index-registration", { phase: "index-register", outcome: "error" }]]);
      observed.length = 0;
      expect(await empty.registerKnown()).toBe(false);
      expect(observed).toEqual([["scope-index-registration", { phase: "entry-missing", outcome: "refused" }]]);
      expect(known.has(missing.name)).toBe(false);
      expect(JSON.stringify(observed)).not.toContain(missing.name);
      expect(JSON.stringify(observed)).not.toContain("TEST PRIVATE REGISTRATION ERROR");
      console.info = () => { throw Error("TEST PRIVATE LOGGER ERROR"); };
      expect(await raw.registerKnown()).toBe(false);
      expect(await empty.registerKnown()).toBe(false);
    } finally {
      console.info = originalInfo; failRegistration = false;
      scopeRegistrationWiring.delete(missing.name);
    }

    // Explicit RPC-failure stand-in: the native method never entered. The
    // wrapper must retain its original missing answer and fixed projection.
    let rpcCalls = 0, ordinaryCalls = 0;
    const rejected: Binding<string> = { idFromName: name => name, get: () => ({
      registerKnown: async () => { rpcCalls++; throw Error("TEST PRIVATE RPC ERROR"); },
      summary: async () => { ordinaryCalls++; throw Error("unregistered summary must not run"); },
    }) };
    const absent: ScopeIndexPort = { async has() { return false; }, async register() { throw Error("wrapper registered caller data"); } };
    const broken = api(indexedScopes(rejected, { SCOPE_INDEX_MODE: "register", SCOPE_INDEX: { idFromName: name => name, get: () => absent } }));
    observed.length = 0;
    console.info = (...args: unknown[]) => { if (args[0] === "scope-index-registration") observed.push(args); else originalInfo(...args); };
    try {
      expect(await broken.summary(born.name, reader)).toEqual({ ok: false, reason: "not-found" });
      expect(observed).toEqual([["scope-index-registration", { phase: "rpc", outcome: "rejected" }]]);
      expect(JSON.stringify(observed)).not.toContain(born.name);
      expect(JSON.stringify(observed)).not.toContain("TEST PRIVATE RPC ERROR");
      console.info = () => { throw Error("TEST PRIVATE LOGGER ERROR"); };
      expect(await broken.summary(born.name, reader)).toEqual({ ok: false, reason: "not-found" });
      expect({ rpcCalls, ordinaryCalls }).toEqual({ rpcCalls: 2, ordinaryCalls: 0 });
    } finally { console.info = originalInfo; }
  } finally {
    scopeRegistrationWiring.delete(born.name); scopeRegistrationWiring.delete(denied.name);
  }
});
