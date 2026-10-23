import { lineageDeviceRoot, lineageBudgetDefinitions } from "./definition-corpus-data.ts";
/** Real applied cohort histories and native child deliveries. Git/package
 * providers, clock and the index transport are labelled TEST stand-ins.
 * No deployment, provider or operator reconciliation is exercised. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { DEVICE_COMMAND, type Entry, type Intent, type PlatformDefinition, type ScopeRef, type Seed } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, digestBytes, factRefOf, intentDigest, isSeed, newIncarnation, parseStrict, scopeIdOf, seedDigest, signIntent, utf8 } from "@generalbusiness/artroom-bytes";
import { packApplication2, readApplicationProjection } from "@generalbusiness/artroom-bytes/application-v2";
import { emptyPackageComposition } from "@generalbusiness/artroom-package-graph";
import type { Delivered } from "@generalbusiness/dap-derive";
import { APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, TRUSTED_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { secretSigner } from "@generalbusiness/artroom-client";
import { admitChildCreation, type CreationTimer } from "../src/creation-lineage.ts";
import { namespace, type Binding, type Peer } from "../src/namespace.ts";
import { indexedScopes, type ScopeIndexPort } from "../src/scope-index.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationOwnedScopesPacket, applicationResolverFixture, applicationHttpPeer, applicationWorkerBindings, sessionRoom, sessionRepository, dispatchFixture, driveFixture, effectFixture } from "./fixtures-native.ts";
import { rita, routed, type Platform } from "./repository.ts";
import { fixedSigner } from "./fixtures-core.ts";
import { soon } from "./net.ts";

const config = (register: string) => ({ DEPLOYMENT: "TEST-lineage", ARTIFACTS_CONFIG: JSON.stringify({ registerScope: register, namespace: "lineage", host: "git.example", maxBytes: 1024, credentialIdentity: "adapter-attempt" }) });
const envelopeOf = (entry: Entry, n: number): Delivered => {
  const send = entry.sends.find(send => send.n === n);
  if (!send) throw Error("genuine retained create required");
  return { to: send.to, from: factRefOf(entry), n, message: send.message };
};
async function declarationsFor(register: PlatformDefinition) {
  const ordinary = await applicationOwnedScopesPacket();
  if (register === APPLICATION_COHORT.register) return ordinary;
  // The17-cohort genuinely requires a device package and an existing owner.
  // Keep the real command schema, add a normal static child, and sign only a
  // public TEST release. No old native definition or publisher key changes.
  const root = lineageDeviceRoot(ordinary);
  const rootId = definitionDigest(root);
  const rootProjection = readApplicationProjection({ v: 1, definition: rootId, revision: "revision", sources: {
    row: { read: "one", item: "root", states: ["ready"], limit: 1, fields: {
      child: { from: { kind: "ref", name: "child" }, of: { type: "scope", kind: "lane" }, nullable: true },
    } },
  } });
  const packet = await packApplication2({ name: "test.lineage-device", version: "1", semantic: {
    ...emptyPackageComposition(), v: 2, entry: rootId, definitions: [{ id: rootId, bytes: canonicalize(root) }, { id: ordinary.childId, bytes: canonicalize(ordinary.child) }],
    connections: [{ from: rootId, item: "root", slot: "child", to: ordinary.childId }], host: { execution: "recorded-do", profiles: ["restricted@1"] },
    capabilities: [{ name: DEVICE_COMMAND, bounds: { kinds: ["heater"], owners: 1 } }], roles: { admin: ["start", "command", "fixture.configure"] },
    projections: { root: rootProjection, child: ordinary.packet.package.semantic.projections["child"]! }, predecessor: null,
  }, presentation: { v: 2, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, views: {}, resources: {} } }, fixedSigner(81));
  return { ...ordinary, packet, root, rootId };
}
function recorded(nodes: readonly Platform[], target: string, overrides: (peer: Peer, name: string) => Peer = peer => peer) {
  const known = new Set<string>(nodes.map(node => node.name));
  let targetNames = 0, targetGets = 0, forbidden = 0;
  const binding: Binding<string> = {
    idFromName(name) { if (!known.has(name)) { forbidden++; throw Error("unindexed namespace touched"); } if (name === target) targetNames++; return name; },
    get(name) { if (name === target) targetGets++; return overrides(env.PLATFORM.get(env.PLATFORM.idFromName(name)) as unknown as Peer, name); },
  };
  const index: ScopeIndexPort = { async has(name) { return known.has(name); }, async register() { throw Error("lineage lookup registered an ancestor"); } };
  return { binding, index, env: { SCOPE_INDEX: { idFromName: (name: string) => name, get: () => index } }, counts: () => ({ targetNames, targetGets, forbidden }) };
}

test("both approved native cohorts admit their exact child chain and refuse another configured register before child lookup", async () => {
  for (const cohort of [ARCHIVE_DEVICE_APPLICATION_COHORT, APPLICATION_COHORT]) {
    const room = await sessionRoom(cohort.register);
    const { life, R, D, children } = room;
    try {
      const directoryBirth = (await life.wait(() => D.entries()))[0]!;
      const nativeChild = directoryBirth.sends.find(send => isSeed(send.to) && send.to.kind === "membership")!;
      const child = children[0]!;
      const delivered = envelopeOf(directoryBirth, nativeChild.n);
      const f = recorded([R, D, ...children], child.name), settings = { ...f.env, ...config(R.name) };
      const before = await life.wait(() => child.entries());
      const ports = namespace(indexedScopes(f.binding, settings));
      expect(await life.wait(() => ports.transport.send(delivered))).toMatchObject({ answer: "recorded" });
      expect(await life.wait(() => child.entries())).toEqual(before); // exact real repeat, no extra journal input
      expect(f.counts()).toEqual({ targetNames: 1, targetGets: 1, forbidden: 0 });

      const other = await sessionRepository(life, cohort.register);
      const wrong = recorded([R, D, ...children], child.name);
      expect(await life.wait(() => namespace(indexedScopes(wrong.binding, { ...wrong.env, ...config(other.R.name) })).transport.send(delivered)))
        .toEqual({ answer: "routing", reason: "not-found" });
      expect(wrong.counts()).toEqual({ targetNames: 0, targetGets: 0, forbidden: 0 });

      // A forged unknown ancestor must not reach even idFromName in register
      // mode. The index is a stand-in; every actual native answer above is not.
      const unknown: ScopeRef = { ...await D.at(), scope: scopeIdOf({ ...(nativeChild.to as Seed), ordinal: 77 }), inc: newIncarnation(crypto.getRandomValues(new Uint8Array(16))) };
      const unknownTo = { ...(nativeChild.to as Seed), creator: unknown };
      const trap = recorded([R, D], scopeIdOf(unknownTo));
      expect(await namespace(indexedScopes(trap.binding, { ...trap.env, ...config(R.name), SCOPE_INDEX_MODE: "register" })).transport.send({ ...delivered, to: unknownTo, from: { ...delivered.from, at: unknown } }))
        .toEqual({ answer: "retry", reason: "dependency-unavailable" });
      expect(trap.counts()).toEqual({ targetNames: 0, targetGets: 0, forbidden: 0 });

      // Direct/instrumented callers cannot use malformed create addresses to
      // select the register-mode legacy-read exception. A seed-addressed
      // non-create is not a valid legacy scope-reference delivery either.
      for (const malformed of [
        { ...delivered, to: { ...(delivered.to as Seed), scope: child.name } },
        { ...delivered, to: await child.at() },
        { ...delivered, message: { class: "request", type: "tell", body: {} } },
      ]) {
        const closed = recorded([R, D], child.name);
        const target = indexedScopes(closed.binding, { ...closed.env, ...config(R.name), SCOPE_INDEX_MODE: "register" }).get(child.name) as {
          deliver(value: unknown): Promise<unknown>;
          observed(method: string, args: unknown[]): Promise<unknown>;
        };
        expect(await target.deliver(malformed)).toEqual({ answer: "routing", reason: "not-found" });
        expect(await target.observed("deliver", [malformed])).toEqual({ value: { answer: "routing", reason: "not-found" }, turn: false });
        expect(closed.counts()).toEqual({ targetNames: 0, targetGets: 0, forbidden: 0 });
      }

      // Readable source bytes disprove the changed ordinal/message. A changed
      // sender incarnation also contradicts the unchanged seed.creator before
      // any birth read. Only the unavailable exact hash needs a retry answer.
      // No answer may reach the child's constructor boundary.
      for (const [label, altered, expected] of [
        ["ordinal contradicted by source", { ...delivered, n: delivered.n + 99 }, { answer: "routing", reason: "not-found" }],
        ["exact source hash unavailable", { ...delivered, from: { ...delivered.from, hash: digestBytes(utf8("wrong fact")) } }, { answer: "retry", reason: "dependency-unavailable" }],
        ["creator incarnation mismatch", { ...delivered, from: { ...delivered.from, at: { ...delivered.from.at, inc: newIncarnation(crypto.getRandomValues(new Uint8Array(16))) } } }, { answer: "routing", reason: "not-found" }],
        ["message contradicted by source", { ...delivered, message: { ...delivered.message, body: { fields: {} } } } as Delivered, { answer: "routing", reason: "not-found" }],
      ] as const) {
        const denied = recorded([R, D, ...children], scopeIdOf(altered.to as Seed));
        expect(await namespace(indexedScopes(denied.binding, { ...denied.env, ...config(R.name) })).transport.send(altered), label)
          .toEqual(expected);
        expect(denied.counts(), label).toEqual({ targetNames: 0, targetGets: 0, forbidden: 0 });
      }
      // The Directory's source IS its genesis, already in the birth proof.
      // Remove the register's non-genesis create to model archived own bytes.
      const missing = recorded([R, D], child.name, (peer, name) => name !== R.name ? peer : new Proxy(peer, { get(target, key) {
        if (key === "proofSource") return async () => null;
        if (key === "source") return () => { throw Error("forbidden source fallback"); };
        return Reflect.get(target, key, target);
      } }));
      expect((await admitChildCreation(missing.binding, config(R.name), missing.index, delivered)).kind).toBe("unavailable");
      expect(await namespace(indexedScopes(missing.binding, { ...missing.env, ...config(R.name) })).transport.send(delivered))
        .toEqual({ answer: "retry", reason: "dependency-unavailable" });
      expect(missing.counts()).toEqual({ targetNames: 0, targetGets: 0, forbidden: 0 });
    } finally { life.release(); }
  }
}, 30_000);

test("a late whole-lineage index result and an oversized body never activate any raw namespace", async () => {
  // This is a clock/index boundary stand-in, not an authority or SQL witness.
  const room = await sessionRoom(ARCHIVE_DEVICE_APPLICATION_COHORT.register);
  try {
    const first = (await room.D.entries())[0]!, send = first.sends.find(send => isSeed(send.to))!;
    const delivered = envelopeOf(first, send.n);
    let calls = 0, finish!: (value: boolean) => void, timeout!: () => void, now = 0;
    const binding: Binding = { idFromName() { calls++; throw Error("late target"); }, get() { calls++; throw Error("late target"); } };
    const clock: CreationTimer = { now: () => now, after(_milliseconds, work) { timeout = work; return () => {}; } };
    const pending = admitChildCreation(binding, config(room.R.name), { has: () => new Promise(resolve => { finish = resolve; }) }, delivered, clock);
    now = 10_000; timeout();
    expect(await pending).toEqual({ kind: "unavailable" });
    finish(true); await Promise.resolve(); await Promise.resolve();
    expect(calls).toBe(0);
    const tooLarge = { ...delivered, message: { class: "request", type: "create", body: "x".repeat(1024 * 1024) } };
    expect(await admitChildCreation(binding, config(room.R.name), { async has() { throw Error("oversized body reached index"); } }, tooLarge)).toEqual({ kind: "unavailable" });
    expect(calls).toBe(0);
    let getters = 0;
    const accessor = { ...delivered, message: { ...delivered.message, body: Object.defineProperty({}, "hidden", { enumerable: true, get() { getters++; throw Error("caller getter ran during serialization"); } }) } };
    expect(await admitChildCreation(binding, config(room.R.name), { async has() { throw Error("accessor input reached index"); } }, accessor)).toEqual({ kind: "unavailable" });
    expect({ calls, getters }).toEqual({ calls: 0, getters: 0 });
    expect((await admitChildCreation(binding, { ALLOW_OPEN_CREATION: "true", DEPLOYMENT: "local" }, { async has() { throw Error("local opening reached index"); } }, delivered)).kind).toBe("admitted");
  } finally { room.life.release(); }
}, 30_000);

test("an actually supported but unadmitted native cohort and a refused native birth never admit a child", async () => {
  const room = await sessionRoom(TRUSTED_APPLICATION_COHORT.register);
  try {
    const first = (await room.D.entries())[0]!, send = first.sends.find(send => isSeed(send.to) && send.to.kind === "membership")!;
    const child = room.children[0]!;
    const f = recorded([room.R, room.D, ...room.children], child.name);
    expect(await namespace(indexedScopes(f.binding, { ...f.env, ...config(room.R.name) })).transport.send(envelopeOf(first, send.n)))
      .toEqual({ answer: "routing", reason: "not-found" });
    expect(f.counts()).toEqual({ targetNames: 0, targetGets: 0, forbidden: 0 });

    // The native judge really records the missing-field genesis refusal.
    // The alleged child envelope is forged negative input, NOT a claim that
    // a refused native genesis emitted any create or granted authority.
    const intent: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {}, fields: {}, idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
    const seed: Seed = { v: 1, kind: "register", definition: ARCHIVE_DEVICE_APPLICATION_COHORT.register, creator: null, cause: intentDigest(intent), ordinal: 0 };
    const refused = room.life.platform(scopeIdOf(seed));
    expect(await room.life.wait(() => refused.stub.create(signIntent(intent, rita.secret), seed.definition))).toMatchObject({ answer: "refused" });
    const entry = await room.life.wait(() => runInDurableObject(refused.object, (_instance, state) => parseStrict(String(state.storage.sql.exec("SELECT bytes FROM entry WHERE seq=0").one()["bytes"])) as Entry));
    expect(entry.input).toMatchObject({ type: "genesis", decision: "refused" });
    const childSeed: Seed = { v: 1, kind: "directory", definition: ARCHIVE_DEVICE_APPLICATION_COHORT.directory, creator: entry.at, cause: seedDigest(seed), ordinal: 0 };
    const negative: Delivered = { to: childSeed, from: factRefOf(entry), n: 0, message: { class: "request", type: "create", body: { fields: {} } } };
    const closed = recorded([refused], scopeIdOf(childSeed));
    expect(await namespace(indexedScopes(closed.binding, { ...closed.env, ...config(refused.name) })).transport.send(negative))
      .toEqual({ answer: "routing", reason: "not-found" });
    expect(closed.counts()).toEqual({ targetNames: 0, targetGets: 0, forbidden: 0 });
  } finally { room.life.release(); }
}, 30_000);

test("the whole creation attempt admits exactly16 bodies before a genuine legacy closure needs a seventeenth", async () => {
  const room = await sessionRoom(APPLICATION_COHORT.register), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("native cohort siblings required");
  try {
    const ordinary = await applicationOwnedScopesPacket();
    const declarations = lineageBudgetDefinitions(ordinary.child);
    const root = declarations[0]!, digest = definitionDigest(root), values = declarations.map(value => canonicalize(value));
    // Every individual body and their total are well below1MiB. The actual
    // native named-definition ceiling permits this17-definition closure;
    // only the new ONE-attempt body allowance (including lineage) refuses.
    expect(values.reduce((sum, value) => sum + utf8(value).length, 0)).toBeLessThan(128 * 1024);
    const dependencies = Object.fromEntries(declarations.slice(1).map((value, i) => [`dependency${i + 1}`, definitionDigest(value)]));
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    expect(await life.wait(async () => A.stub.submit(await A.intent(rita, "activate", { fields: { digest, name: root.name, ...dependencies } }), [], { values }))).toMatchObject({ answer: "accepted" });
    life.setHold(envelope => isSeed(envelope.to) && envelope.to.kind === "lane");
    expect(await life.wait(async () => D.stub.submit(await D.intent(rita, "establish-application", { expected: await D.expected({ repository: 0 }), fields: { definition: digest, ...dependencies, values: "{}", execution: "recorded-do" } }), [], { values }))).toMatchObject({ answer: "accepted" });
    const source = (await life.wait(() => D.entries())).find(entry => entry.sends.some(send => isSeed(send.to) && send.to.definition === digest));
    if (!source) throw Error("actual admitted native Directory create required");
    const send = source.sends.find(send => isSeed(send.to) && send.to.definition === digest)!;
    const name = scopeIdOf(send.to as Seed), directory = await life.wait(() => D.at());
    const directoryPeer = D.object as unknown as Peer;
    // Independently establish all17 actual custody answers BEFORE this
    // attempt. The refusal cannot be explained by absent definition bytes.
    for (let i = 0; i < declarations.length; i++) {
      expect(await life.wait(() => directoryPeer.creationDeclaration!(directory, definitionDigest(declarations[i]!), 1024 * 1024, 10_000))).toBe(values[i]);
    }
    const directoryBirth = (await life.wait(() => D.entries()))[0]!, registerBirth = (await life.wait(() => R.entries()))[0]!;
    if (directoryBirth.input.type !== "genesis" || !directoryBirth.input.source || directoryBirth.input.source.seq === 0 || source.seq === 0) throw Error("the fixture needs two actual non-genesis native creator sends");
    const births: { fact: string; bytes: string }[] = [], proofs: { fact: string; bytes: string }[] = [];
    const attempts: string[] = [], obtained: { digest: string; bytes: string }[] = [], missing: string[] = [];
    let indexReads = 0, timers = 0, timerStops = 0;
    const f = recorded([R, D, M, A, G], name, target => new Proxy(target, { get(peer, key) {
      if (key === "nativeBirth") return async (...args: Parameters<NonNullable<Peer["nativeBirth"]>>) => {
        const value = await peer.nativeBirth!(...args);
        if (value === null) missing.push(`birth:${args[0].scope}`);
        else births.push({ fact: canonicalize(value.proof.fact), bytes: value.proof.bytes });
        return value;
      };
      if (key === "proofSource") return async (...args: Parameters<NonNullable<Peer["proofSource"]>>) => {
        const value = await peer.proofSource!(...args);
        if (value === null) missing.push(`proof:${canonicalize(args[0])}`);
        else proofs.push({ fact: canonicalize(value.fact), bytes: value.bytes });
        return value;
      };
      if (key === "creationDeclaration") return async (...args: Parameters<NonNullable<Peer["creationDeclaration"]>>) => {
        attempts.push(args[1]);
        const value = await peer.creationDeclaration!(...args);
        if (value === null) missing.push(`declaration:${args[1]}`);
        else obtained.push({ digest: args[1], bytes: value });
        return value;
      };
      const value = Reflect.get(peer, key, peer); return typeof value === "function" ? value.bind(peer) : value;
    } }));
    // Existing injected clock, not another public wrapper/API. It never
    // advances or invokes the timeout callback: only cumulative body count
    // can account for this result. Real native RPC failures still fail the
    // exact successful-reply assertions below. Wrapper ordering/retry-wire
    // semantics are covered separately by the preceding wrapper controls.
    const clock: CreationTimer = { now: () => 0, after(milliseconds, _timeout) { expect(milliseconds).toBe(10_000); timers++; return () => { timerStops++; }; } };
    const envelope = envelopeOf(source, send.n);
    expect(await life.wait(() => admitChildCreation(f.binding, config(R.name), { async has(scope, kind) { indexReads++; return f.index.has(scope, kind); } }, envelope, clock)))
      .toEqual({ kind: "unavailable" });
    expect(births.map(row => row.fact)).toEqual([canonicalize(factRefOf(directoryBirth)), canonicalize(factRefOf(registerBirth))]);
    expect(proofs.map(row => row.fact)).toEqual([canonicalize(factRefOf(source)), canonicalize(directoryBirth.input.source)]);
    // One envelope + two native births + two creator sends + eleven exact
    // declaration bodies =16. A twelfth declaration RPC must not even start.
    expect(attempts).toEqual(declarations.slice(0, 11).map(value => definitionDigest(value)));
    expect(obtained).toEqual(declarations.slice(0, 11).map((value, i) => ({ digest: definitionDigest(value), bytes: values[i] })));
    expect(1 + births.length + proofs.length + obtained.length).toBe(16);
    expect(missing).toEqual([]);
    expect({ indexReads, timers, timerStops }).toEqual({ indexReads: 15, timers: 1, timerStops: 1 }); //30index/RPC attempts, below64
    const allPossibleBytes = utf8(canonicalize(envelope)).length + [...births, ...proofs].reduce((sum, row) => sum + utf8(row.bytes).length, 0) + values.reduce((sum, value) => sum + utf8(value).length, 0);
    expect(allPossibleBytes).toBeLessThan(1024 * 1024); //including ALL17declarations, not merely those obtained
    expect(f.counts()).toEqual({ targetNames: 0, targetGets: 0, forbidden: 0 });
  } finally { life.release(); }
}, 30_000);

test.each([ARCHIVE_DEVICE_APPLICATION_COHORT, APPLICATION_COHORT])("$register authenticated Directory closure admits a second-level declared child and rejects substituted bytes before lookup", async cohort => {
  const { packet, root: rootDefinition, child: childDefinition, rootId, childId } = await declarationsFor(cohort.register);
  const room = await sessionRoom(cohort.register), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("native cohort siblings required");
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    if (cohort.register === APPLICATION_COHORT.register) {
      // Historical5/5/4/3/2 uses its original activated declaration closure;
      // no new install message or historical grant is substituted for it.
      const values = [canonicalize(rootDefinition), canonicalize(childDefinition)];
      expect(await life.wait(async () => A.stub.submit(await A.intent(rita, "activate", { fields: { digest: rootId, name: rootDefinition.name, dependency1: childId } }), [], { values }))).toMatchObject({ answer: "accepted" });
      expect(await life.wait(async () => D.stub.submit(await D.intent(rita, "establish-application", { expected: await D.expected({ repository: 0 }), fields: { definition: rootId, dependency1: childId, values: "{}", execution: "recorded-do" } }), [], { values }))).toMatchObject({ answer: "accepted" });
    } else {
      const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
      const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
      for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
      const directory = await life.wait(() => D.at()), membership = await life.wait(() => M.at());
      const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
        config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("native install only"); } },
        applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)) };
      const result = await life.wait(() => new McpService(port).call("install_application", { uri: f.uri, release: packet.ids.release, roles: ["admin"], owner: { membership, member: "@rita" }, values: {}, idempotencyKey: "TEST-lineage-install" }));
      expect(result.structuredContent).toMatchObject({ answer: "accepted" });
    }
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const rootSend = (await D.entries()).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === rootId);
    if (!rootSend || !isSeed(rootSend.to)) throw Error("native Directory must create the declared root");
    const root = life.platform(scopeIdOf(rootSend.to)); await driveFixture([R, D, M, A, G, root], life.wait);
    const rootBirth = (await root.entries())[0]!, childSend = rootBirth.sends.find(send => isSeed(send.to) && send.to.definition === childId);
    if (!childSend || !isSeed(childSend.to)) throw Error("declared root must create its child");
    const child = life.platform(scopeIdOf(childSend.to)); await driveFixture([R, D, M, A, G, root, child], life.wait);
    const envelope = envelopeOf(rootBirth, childSend.n), held = [R, D, M, A, G, root, child];
    const good = recorded(held, child.name);
    expect(await namespace(indexedScopes(good.binding, { ...good.env, ...config(R.name) })).transport.send(envelope)).toMatchObject({ answer: "recorded" });
    expect(good.counts()).toEqual({ targetNames: 1, targetGets: 1, forbidden: 0 });
    const bad = recorded(held, child.name, (target, name) => name !== D.name ? target : new Proxy(target, { get(value, key) {
      if (key === "creationDeclaration") return async (at: ScopeRef, digest: string, cap: number, milliseconds: number) => digest === childId ? canonicalize({ bad: "substitution" }) : value.creationDeclaration!(at, digest as never, cap, milliseconds);
      return Reflect.get(value, key, value);
    } }));
    expect(await namespace(indexedScopes(bad.binding, { ...bad.env, ...config(R.name) })).transport.send(envelope)).toEqual({ answer: "routing", reason: "not-found" });
    expect(bad.counts()).toEqual({ targetNames: 0, targetGets: 0, forbidden: 0 });
  } finally { life.release(); }
}, 30_000);
