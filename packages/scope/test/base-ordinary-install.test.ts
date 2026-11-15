/** CF-1 (rulings 68356c6c, point 6, and 710a5d76): an ordinary version 2 package on the base family, through the MCP
 * install path a member uses. Genuine native Register 28, Directory 27, Membership 14, Rules 15 and Destination 21,
 * SQLite and replay. Repository creation, Git/package HTTP, clock and setup reads are TEST fixtures. */
import { env, runInDurableObject } from "cloudflare:test";
import type { Intent } from "@generalbusiness/dap-contract";
import { expect, inject, test } from "vitest";
import { b64url, canonicalize, definitionDigest, intentDigest, isRecord, isScopeRef, isSeed, same, scopeIdOf, signIntent, textDigest, unb64url } from "@generalbusiness/dap-bytes";
import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
import { memoryStore } from "@generalbusiness/dap-client";
import { McpService, type ServerPort } from "@generalbusiness/dap-mcp";
import { BASE_COHORT as C, PUBLICATION_PATHS, applicationPublicationPrefixes, fileReceiptRef, platform } from "@generalbusiness/dap-platform";
import { packApplication2, readApplicationProjection, readPublishedApplicationPackage2 } from "@generalbusiness/dap-platform/application-v2";
import { secretSigner } from "@generalbusiness/dap-client";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { fixedSigner, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture, drainScheduledFixture, nativeFixtureLifetime, reader, applicationWorkerBindings } from "./fixtures-native.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { rita, routed, sam } from "./repository.ts";
import { ownHost, readerOf } from "./hosts.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { soon } from "./net.ts";
import type {} from "./support/maintained-applications.ts";

/** One signed Counter package that declares the prefix `shelf/`. */
async function counterPacket(version: string) {
  const id = definitionDigest(countingCommitments);
  return packApplication2({ name: "test.base-counter", version, semantic: {
    ...emptyPackageComposition(), v: 2 as const, entry: id, definitions: [{ id, bytes: canonicalize(countingCommitments) }],
    host: { execution: "recorded-do" as const, profiles: ["restricted@1"] },
    capabilities: [{ name: PUBLICATION_PATHS, bounds: { prefixes: ["shelf/"] } }],
    roles: { member: ["counting.fulfill"], setup: ["counting.activity", "counting.commit", "counting.control", "counting.establish", "counting.fail", "counting.participate"] },
    predecessor: null,
    projections: { board: readApplicationProjection({ v: 1, definition: id, revision: "revision", sources: {
      board: { item: "board", read: "one", states: ["finished", "open", "paused"], limit: 1, fields: {
        lastNumber: { from: { kind: "value", name: "lastNumber" }, of: { type: "int", min: 0, max: 100 }, nullable: false },
      } },
    } }) },
  }, presentation: { v: 2 as const, entry: "index.html", assets: [{ path: "index.html", mediaType: "text/html", bytes: "VEVTVA" }], descriptions: {}, views: {}, resources: {} } },
  fixedSigner(81));
}

test("an ordinary package installs on the base family without an owner, its root carries the declared prefixes, and a second claim of the prefix refuses", async () => {
  const packet = await counterPacket("2");
  const room = await sessionRoom(C.register), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("The base family needs its exact siblings.");
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
  life.applicationTrust(() => bindings.APPLICATION_TRUST);
  try {
    for (const [node, pin] of [[R, C.register], [D, C.directory], [M, C.membership], [A, C.rules], [G, C.destination]] as const)
      expect((await life.wait(() => node.summary())).value.definition).toBe(pin);
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Native discovery only."); } },
      applicationFetch: peer.fetch, applicationTrust: JSON.stringify(f.trust), fetch: (url, init) => life.wait(() => routed(url, init)),
    };
    const mcp = new McpService(port), args = { uri: f.uri, release: packet.ids.release, roles: ["member"], values: { target: 7 } };
    const installed = await life.wait(() => mcp.call("install_application", { ...args, idempotencyKey: "TEST-base-ordinary-install" }));
    expect(installed.isError, JSON.stringify(installed.structuredContent)).toBe(false);
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "accepted" });
    const job = Number(installed.structuredContent["item"]);
    expect((await life.wait(() => A.entries())).find(entry => entry.seq === job)!.input).toMatchObject({ type: "act", signed: { intent: { fields: { roles: ["member"] } } } });
    expect(JSON.stringify((await life.wait(() => A.entries())).find(entry => entry.seq === job)!.input)).not.toContain("\"owner\"");

    life.setHold(envelope => isSeed(envelope.to) && envelope.to.kind === "lane");
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const birth = (await life.wait(() => D.sealed())).flatMap(sealed => sealed.entry.sends.map(send => ({ send,
      from: { at: directory, seq: sealed.entry.seq, hash: sealed.hash } }))).find(({ send }) => isSeed(send.to) && send.to.kind === "lane");
    if (!birth || !isSeed(birth.send.to)) throw Error("Native Directory did not create the application root.");
    expect(birth.send.message).toMatchObject({ body: { creationContext: { v: 3, publication: ["shelf/"] } } });
    expect(birth.send.message).not.toMatchObject({ body: { creationContext: { deviceCommand: expect.anything() } } });
    const app = life.platform(scopeIdOf(birth.send.to));
    life.setHold(() => false);
    expect(await life.wait(() => app.stub.deliver({ to: birth.send.to, from: birth.from, n: birth.send.n, message: birth.send.message }))).toMatchObject({ answer: "recorded" });
    await driveFixture([R, D, M, A, G, app], life.wait);
    const scope = await life.wait(() => app.at());
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", refs: { scope } });

    // The Destination keeps the application's row from the same Directory entry that created the root.
    const prefixes = await life.wait(() => runInDurableObject(G.object, (_object, storage) => {
      const store = new SqliteStore({ exec: (sql, ...rest) => storage.storage.sql.exec(sql, ...rest), transaction: run => storage.storage.transactionSync(run) });
      return applicationPublicationPrefixes(store, scope.scope);
    }));
    expect(prefixes).toEqual(["shelf/"]);

    // A second package that claims the same prefix installs at Rules, and the Directory refuses its root.
    const second = await life.wait(() => mcp.call("install_application", { ...args, idempotencyKey: "TEST-base-ordinary-second" }));
    expect(second.isError, JSON.stringify(second.structuredContent)).toBe(false);
    await effectFixture([A], life.wait); await driveFixture([R, D, M, A, G, app], life.wait);
    expect(canonicalize((await life.wait(() => D.sealed())).map(sealed => sealed.entry))).toContain("publication-prefix-in-use");

    const source = httpSource("https://scopes.test", { reader, fetch: (url, init) => life.wait(() => routed(url, init)) });
    for (const node of [A, D, G, app, M]) {
      const head = (await life.wait(() => node.summary())).at;
      const replay = await life.wait(() => verify(source, { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: node.name, head }));
      expect([replay.report.result, replay.why], JSON.stringify({ target: node.name, report: replay.report })).toEqual(["consistent", null]);
    }
  } finally { life.release(); }
});

// The plan's gate proof: apps/counter, packed by prepareApplicationDirectory (the function behind `dap pack`, run in
// Node by maintained-applications-child.ts), installs in a new base room, takes one act and replays.
test("apps/counter, packed as dap pack packs it, installs in a new base room, takes one act and replays consistent", async () => {
  const captured = inject("maintainedApplications").counter, bytes = unb64url(captured.bytes);
  if (!bytes) throw Error("The maintained TEST Counter packet must be captured.");
  const packet = readPublishedApplicationPackage2(bytes, captured.release);
  expect(packet.package.semantic.capabilities).toEqual([]);
  const room = await sessionRoom(C.register), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("The base family needs its exact siblings.");
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
  life.applicationTrust(() => bindings.APPLICATION_TRUST);
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Native discovery only."); } },
      applicationFetch: peer.fetch, applicationTrust: JSON.stringify(f.trust), fetch: (url, init) => life.wait(() => routed(url, init)),
    };
    const mcp = new McpService(port);
    const installed = await life.wait(() => mcp.call("install_application", { uri: f.uri, release: packet.ids.release, roles: ["admin"], values: { target: 7 }, idempotencyKey: "TEST-base-counter-install" }));
    expect(installed.isError, JSON.stringify(installed.structuredContent)).toBe(false);
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "accepted" });
    const job = Number(installed.structuredContent["item"]);

    life.setHold(envelope => isSeed(envelope.to) && envelope.to.kind === "lane");
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const birth = (await life.wait(() => D.sealed())).flatMap(sealed => sealed.entry.sends.map(send => ({ send,
      from: { at: directory, seq: sealed.entry.seq, hash: sealed.hash } }))).find(({ send }) => isSeed(send.to) && send.to.kind === "lane");
    if (!birth || !isSeed(birth.send.to)) throw Error("Native Directory did not create the Counter root.");
    // A package without a declaration gets the version 1 marker, and the Destination keeps an empty row.
    expect(birth.send.message).toMatchObject({ body: { creationContext: { v: 1 } } });
    const app = life.platform(scopeIdOf(birth.send.to));
    life.setHold(() => false);
    expect(await life.wait(() => app.stub.deliver({ to: birth.send.to, from: birth.from, n: birth.send.n, message: birth.send.message }))).toMatchObject({ answer: "recorded" });
    await driveFixture([R, D, M, A, G, app], life.wait);
    const scope = await life.wait(() => app.at());
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", refs: { scope } });
    expect((await life.wait(() => app.summary())).value.definition).toBe(packet.package.semantic.entry);

    // One act on the installed Counter root, signed by the installer and judged with its application grant.
    const before = (await life.wait(() => app.summary())).at.seq;
    const participant = await life.wait(() => app.did(rita, "participate", { fields: {} }));
    expect(participant).toBeGreaterThan(before);
    expect((await life.wait(() => app.entries()))[participant]!.input).toMatchObject({ type: "act", signed: { intent: { kind: "participate" } } });

    const source = httpSource("https://scopes.test", { reader, fetch: (url, init) => life.wait(() => routed(url, init)) });
    for (const node of [A, D, G, app, M]) {
      const head = (await life.wait(() => node.summary())).at;
      const replay = await life.wait(() => verify(source, { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: node.name, head }));
      expect([replay.report.result, replay.why], JSON.stringify({ target: node.name, report: replay.report })).toEqual(["consistent", null]);
    }
  } finally { life.release(); }
});

// LP1: current maintained package, real base installation, Native Destination
// answer, Git page and receipt. OwnGit/package HTTP, clock and setup inspector
// are explicit TEST fixtures; no browser, deployed provider or installation
// in an operator room runs.
test("the current Lending package in a base room publishes a donated shelf page and its exact receipt", async () => {
  const captured = inject("maintainedApplications").lending, bytes = unb64url(captured.bytes);
  if (!bytes) throw Error("The maintained TEST Lending packet must be captured.");
  const packet = readPublishedApplicationPackage2(bytes, captured.release);
  const owner = beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: true, inspector: reader });
  const life = nativeFixtureLifetime(owner, { required: false }), host = ownHost();
  const nodes: ReturnType<typeof life.platform>[] = [];
  const settle = () => drainScheduledFixture(() => nodes, life.wait);
  try {
    const install: Intent = { v: 1, to: null, actor: rita.key, kind: "install", on: null, expected: {},
      fields: { host: host.host, namespace: host.namespace, policy: "keys", founders: [rita.key] },
      idempotencyKey: crypto.randomUUID(), notAfter: soon(60) };
    const R = life.platform(scopeIdOf({ v: 1, kind: "register", definition: C.register, creator: null, cause: intentDigest(install), ordinal: 0 }));
    nodes.push(R);
    const hostBindings = host.bindings(R.name);
    life.outside(R.name, (given, sql) => host.outside(given, sql, hostBindings));
    expect(await life.wait(() => R.stub.create(signIntent(install, rita.secret), C.register))).toMatchObject({ answer: "accepted" });
    const found = await life.wait(async () => R.intent(rita, "found", { expected: await R.expected({ register: 0 }),
      fields: { branch: "main", founderHandle: "@rita", recoveryKey: sam.key } }));
    const D = life.platform(scopeIdOf({ v: 1, kind: "directory", definition: C.directory,
      creator: await life.wait(() => R.at()), cause: intentDigest(found.intent), ordinal: 0 }));
    nodes.push(D);
    expect(await life.wait(() => R.stub.submit(found, []))).toMatchObject({ answer: "accepted" });
    await settle();
    const initial = (await life.wait(() => D.entries()))[0];
    if (!initial) return expect.fail("The real Directory must record its genesis.");
    const sibling = (kind: "membership" | "rules" | "destination") => {
      const send = initial.sends.find(send => isSeed(send.to) && send.to.kind === kind);
      if (!send || !isSeed(send.to)) throw Error(`The real Directory must create ${kind}.`);
      return life.platform(scopeIdOf(send.to));
    };
    const M = sibling("membership"), A = sibling("rules"), G = sibling("destination");
    nodes.push(M, A, G);
    life.outside(G.name, (given, sql) => host.outside(given, sql, hostBindings));
    await life.wait(() => G.restart()); await settle();
    for (const [node, pin] of [[R, C.register], [D, C.directory], [M, C.membership], [A, C.rules], [G, C.destination]] as const)
      expect((await life.wait(() => node.summary())).value.definition).toBe(pin);
    const seat = await life.wait(async () => M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    const fixture = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(fixture);
    const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(fixture.trust), env.SCOPE_INDEX);
    life.applicationTrust(() => bindings.APPLICATION_TRUST);
    for (const node of [D, A]) {
      life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch));
      await life.wait(() => node.restart());
    }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const mcp = new McpService({ service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }),
        addRoot: async () => { throw Error("Native discovery only."); } },
      applicationFetch: peer.fetch, applicationTrust: JSON.stringify(fixture.trust), fetch: (url, init) => life.wait(() => routed(url, init)) });
    const installed = await life.wait(() => mcp.call("install_application", { uri: fixture.uri, release: packet.ids.release,
      roles: ["admin", "member"], values: {}, idempotencyKey: "TEST-LP1-current-Lending" }));
    expect(installed.isError, JSON.stringify(installed.structuredContent)).toBe(false);
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "accepted" });
    const job = Number(installed.structuredContent["item"]);
    await settle();
    const creation = (await life.wait(() => D.entries())).flatMap(entry => entry.sends)
      .find(send => isSeed(send.to) && send.to.kind === "lane" && send.to.definition === packet.package.semantic.entry);
    if (!creation || !isSeed(creation.to)) return expect.fail("The maintained Lending package must create its real Library.");
    const app = life.platform(scopeIdOf(creation.to)); nodes.push(app); await settle();
    const scope = await life.wait(() => app.at());
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", refs: { scope } });
    expect((await life.wait(() => app.summary())).value.definition).toBe(packet.package.semantic.entry);

    const path = "shelf/lp1.md", content = "# LP1 kettle\nA donated tool.\n";
    // Keep the actual request for one explicit delivery and its full answer.
    // All other setup, proof, result and receipt messages retain normal wiring.
    life.setHold(envelope => isScopeRef(envelope.to) && envelope.to.scope === G.name && envelope.from.at.scope === app.name
      && envelope.message.class === "request" && envelope.message.type === "tell" && isRecord(envelope.message.body)
      && envelope.message.body["message"] === "publish-file");
    const donated = await life.wait(async () => app.did(rita, "donate", { expected: await app.expected({ library: 0 }),
      fields: { name: "LP1 kettle", description: "A donated tool.", page: path, content } }));
    const act = (await life.wait(() => app.entries()))[donated];
    if (!act) return expect.fail("The installed Library must retain the actual donation.");
    const send = act.sends[0], cause = await life.wait(() => app.fact(donated));
    if (!send || !isScopeRef(send.to)) return expect.fail("The donation must send to the real Destination.");
    expect(send).toMatchObject({ to: await life.wait(() => G.at()), message: { class: "request", type: "tell",
      body: { message: "publish-file", fields: { path, content } } } });
    expect(act.sends).toHaveLength(1);
    const answer = await life.wait(() => G.stub.deliver({ to: send.to, from: cause, n: send.n, message: send.message }));
    expect(answer, `Destination delivery acknowledgment: ${JSON.stringify(answer)}`).toMatchObject({ answer: "recorded" });
    if (answer.answer !== "recorded") return expect.fail("The real Destination must record its deciding entry.");
    const decided = (await life.wait(() => G.entries()))[answer.fact.seq];
    if (!decided) return expect.fail("The acknowledged Destination entry must exist.");
    expect(decided.input).toMatchObject({ type: "delivery", from: cause, n: send.n, message: send.message });
    const results = decided.sends.filter(result => result.message.class === "result"
      && result.message.of.n === send.n && same(result.message.of.from, cause));
    expect(results).toHaveLength(1);
    const result = results[0];
    expect(result, `Actual Destination publish-file Result: ${JSON.stringify(result?.message)}`)
      .toMatchObject({ to: scope, message: { class: "result", of: { from: cause, n: send.n }, outcome: "applied" } });
    life.setHold(() => false); await settle();
    const state = await life.wait(() => runInDurableObject(G.object, (_object, storage) => {
      const store = new SqliteStore({ exec: (sql, ...args) => storage.storage.sql.exec(sql, ...args), transaction: run => storage.storage.transactionSync(run) });
      return store.all();
    }));
    expect(state.items.find(item => item.type === "file-publication" && item.values["sourceSeq"] === donated))
      .toMatchObject({ state: "published", refs: { sender: scope }, values: { path } });
    const git = readerOf(host.stand), main = await git.ref("refs/heads/main");
    expect(main).not.toBeNull(); if (!main) return expect.fail("The actual published branch must exist.");
    const top = await git.tree((await git.linked(main)).tree), shelf = top.find(file => new TextDecoder().decode(file.name) === "shelf");
    if (!shelf) return expect.fail("The actual published branch must contain shelf/.");
    const page = (await git.tree(shelf.id)).find(file => new TextDecoder().decode(file.name) === "lp1.md");
    if (!page) return expect.fail("The donation must publish its actual page.");
    expect(new TextDecoder().decode(await git.blob(page.id))).toBe(content);
    const receipt = await git.ref(fileReceiptRef({ from: cause, n: send.n }));
    expect(receipt).not.toBeNull(); if (!receipt) return expect.fail("The exact donation send must have its public receipt.");
    const receiptTree = await git.tree((await git.linked(receipt)).tree);
    const file = receiptTree.find(row => new TextDecoder().decode(row.name) === "receipt.json");
    if (!file) return expect.fail("The actual receipt commit must contain receipt.json.");
    expect(JSON.parse(new TextDecoder().decode(await git.blob(file.id))))
      .toMatchObject({ cause: { from: cause, n: send.n }, path, contentDigest: textDigest(content) });
  } finally { life.release(); }
});
