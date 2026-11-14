/** CF-1 (rulings 68356c6c, point 6, and 710a5d76): an ordinary version 2 package on the base family, through the MCP
 * install path a member uses. Genuine native Register 28, Directory 27, Membership 14, Rules 15 and Destination 21,
 * SQLite and replay. Repository creation, Git/package HTTP, clock and setup reads are TEST fixtures. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, inject, test } from "vitest";
import { canonicalize, definitionDigest, isSeed, scopeIdOf, unb64url } from "@generalbusiness/dap-bytes";
import { emptyPackageComposition } from "@generalbusiness/dap-package-graph";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { BASE_COHORT as C, PUBLICATION_PATHS, applicationPublicationPrefixes, platform } from "@generalbusiness/dap-platform";
import { packApplication2, readApplicationProjection, readPublishedApplicationPackage2 } from "@generalbusiness/dap-platform/application-v2";
import { secretSigner } from "@generalbusiness/dap-client";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { countingCommitments } from "../../../apps/counter/commitments.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { fixedSigner, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture, reader, applicationWorkerBindings } from "./fixtures-native.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { rita, routed } from "./repository.ts";
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
