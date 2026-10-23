/** Real native install and declared creation, SQLite and issued read session.
 * Git/package peer, clock, scheduler and setup inspector are TEST fixtures.
 * No provider, external host or browser runs. */
import { DOMAINS } from "@generalbusiness/dap-contract";
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { canonicalize, isSeed, newIncarnation, scopeIdOf } from "@generalbusiness/dap-bytes";
import { DECLARED_APPLICATION_COHORT as C, platform } from "@generalbusiness/dap-platform";
import { ScopeHandle, httpTransport, requestSession, secretSigner, sessionRequest } from "@generalbusiness/dap-client";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import nativeWorker from "../../../apps/room/worker.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationOwnedScopesPacket, applicationWorkerBindings, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture } from "./fixtures-native.ts";
import { rita, routed } from "./repository.ts";
import { soon } from "./net.ts";

test("one native install creates and confirms the declared root and child with inherited session membership", async () => {
  const { packet, rootId, childId } = await applicationOwnedScopesPacket();
  const foreign = await applicationOwnedScopesPacket("test-owned-root", "2");
  expect(foreign.childId).toBe(childId);
  expect(foreign.rootId).toBe(rootId);
  const room = await sessionRoom(C.register), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("The declared cohort needs its three siblings.");
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const other = await applicationResolverFixture("sha1", undefined, {}, undefined, foreign.packet), otherPeer = applicationHttpPeer(other);
  let packageFetch = peer.fetch;
  const fetchPackage = (request: Request) => packageFetch(request);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify([...f.trust, ...other.trust]), env.SCOPE_INDEX);
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, fetchPackage)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use the native installation."); } },
      applicationFetch: fetchPackage, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const mcp = new McpService(port);
    const installed = await life.wait(() => mcp.call("install_application", { uri: f.uri, release: packet.ids.release, roles: ["admin"], values: {}, idempotencyKey: "TEST-owned-scopes-install" }));
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
    const job = Number(installed.structuredContent["item"]);
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const rootCreate = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === rootId);
    if (!rootCreate || !isSeed(rootCreate.to)) throw Error("The native directory must create the root.");
    const root = life.platform(scopeIdOf(rootCreate.to)); await driveFixture([R, D, M, A, G, root], life.wait);
    const childCreate = (await life.wait(() => root.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === childId);
    if (!childCreate || !isSeed(childCreate.to)) throw Error("The declared root genesis must create the child.");
    const child = life.platform(scopeIdOf(childCreate.to)); await driveFixture([R, D, M, A, G, root, child], life.wait);
    const rootAt = await life.wait(() => root.at()), childAt = await life.wait(() => child.at());
    expect(rootAt.kind).toBe("lane"); expect(childAt.kind).toBe("lane");
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", refs: { scope: rootAt } });
    expect((await life.wait(() => root.summary())).value).toMatchObject({ status: "active", definition: rootId, items: [{ refs: { child: childAt } }] });
    expect((await life.wait(() => child.summary())).value).toMatchObject({ status: "active", definition: childId });
    expect((await life.wait(() => child.entries()))[0]!.input).toMatchObject({ type: "genesis", seed: { creator: rootAt, definition: childId }, founding: null, decision: "applied",
      message: { body: { membership, creationContext: { v: 1 } } } });
    expect((await life.wait(() => A.entries())).filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "install-application")).toHaveLength(1);
    const issued = await life.owner.required(() => requestSession(port.service, M.name, sessionRequest(membership, rita.secret, soon(60), crypto.randomUUID()), { fetch: routed }));
    if (!issued.ok) throw Error("The actual native membership must issue the read session.");
    const handle = new ScopeHandle(httpTransport(port.service, { fetch: (url, init) => nativeWorker.fetch(new Request(url, init), bindings) }), child.name, issued.session.reader());
    const read = await life.owner.required(() => handle.queryItems({ v: 1, scope: childAt, type: "root", states: ["open"], ids: null, limit: 1, cursor: null }));
    expect(read).toMatchObject({ ok: true, complete: true, value: { scope: childAt, items: [{ id: 0, revision: 1, values: { count: 0 } }] } });
    const query = { v: 1 as const, scope: childAt, directory, install: job, projection: "child", items: {} };
    const projected = await life.owner.required(() => handle.applicationProjection(query));
    expect(projected).toMatchObject({ ok: true, value: { scope: childAt, at: read.ok ? read.at : null, sources: { row: [{ id: 0, revision: 1, fields: { count: 0 } }] } } });
    expect(await life.owner.required(() => handle.applicationProjection({ ...query, scope: { ...childAt, inc: newIncarnation(new Uint8Array(16).fill(91)) } })))
      .toEqual({ ok: false, reason: "wrong-scope" });
    expect(await life.owner.required(() => handle.applicationProjection({ ...query, projection: "root" }))).toEqual({ ok: false, reason: "query-not-ready" });

    // A different native installation shares both exact definitions. Its
    // genuine child is not owned by the first install merely for that reason.
    packageFetch = otherPeer.fetch;
    const installedOther = await life.wait(() => mcp.call("install_application", { uri: other.uri, release: foreign.packet.ids.release, roles: ["admin"], values: {}, idempotencyKey: "TEST-foreign-scopes-install" }));
    expect(installedOther.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
    const otherJob = Number(installedOther.structuredContent["item"]);
    expect(otherJob).not.toBe(job);
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G, root, child], life.wait);
    const otherRootCreate = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).filter(send => isSeed(send.to) && send.to.definition === foreign.rootId).at(-1);
    if (!otherRootCreate || !isSeed(otherRootCreate.to)) throw Error("The second native root must be genuinely created.");
    const otherRoot = life.platform(scopeIdOf(otherRootCreate.to)); await driveFixture([R, D, M, A, G, root, child, otherRoot], life.wait);
    const otherChildCreate = (await life.wait(() => otherRoot.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === childId);
    if (!otherChildCreate || !isSeed(otherChildCreate.to)) throw Error("The second native root must create its own child.");
    const otherChild = life.platform(scopeIdOf(otherChildCreate.to)); await driveFixture([R, D, M, A, G, root, child, otherRoot, otherChild], life.wait);
    const otherChildAt = await life.wait(() => otherChild.at());
    const otherHandle = new ScopeHandle(httpTransport(port.service, { fetch: (url, init) => nativeWorker.fetch(new Request(url, init), bindings) }), otherChild.name, issued.session.reader());
    expect(await life.owner.required(() => otherHandle.applicationProjection({ ...query, scope: otherChildAt }))).toEqual({ ok: false, reason: "query-not-ready" });
    expect(await life.owner.required(() => otherHandle.applicationProjection({ ...query, scope: otherChildAt, install: otherJob })))
      .toMatchObject({ ok: true, value: { scope: otherChildAt, sources: { row: [{ revision: 1, fields: { count: 0 } }] } } });
    expect(await life.owner.required(() => handle.applicationProjection({ ...query, install: otherJob }))).toEqual({ ok: false, reason: "query-not-ready" });
    // The generic tools retain the full child scope, use its definition for
    // custody, and repeat native ownership/revision checks before signing.
    let signatures = 0;
    const signer = secretSigner(rita.secret);
    const viewPort = { ...port, signer: { key: signer.key, sign: (bytes: Uint8Array) => {
      if (new TextDecoder().decode(bytes).startsWith(`${DOMAINS.intent}\n`)) signatures++;
      return signer.sign(bytes);
    } }, declaredViews: { bytes: packet.bytes, release: packet.ids.release, item: job } };
    const views = new McpService({ ...viewPort, custody: memoryStore() });
    const oldViews = new McpService({ ...viewPort, custody: memoryStore() });
    expect((await life.wait(() => views.call("view_child", { view: "foreign-child", scope: otherChildAt }))).structuredContent).toMatchObject({ status: "unavailable" });
    expect((await life.wait(() => views.call("view_act", { view: "foreign-child", cut: 0, action: "bump" }))).structuredContent).toMatchObject({ error: "view", reason: "shape" });
    expect(signatures).toBe(0);
    for (const service of [views, oldViews]) {
      expect((await life.wait(() => service.call("view_child", { view: "child", scope: childAt }))).structuredContent)
        .toMatchObject({ status: "ready", identity: { subject: { scope: child.name, item: 0 } } });
      expect((await life.wait(() => service.call("view_read", { view: "child", cut: 0, page: "item" }))).structuredContent)
        .toMatchObject({ display: { cut: 1, query: { scope: childAt }, card: { actions: [{ id: "bump" }], declared: { data: { scope: childAt } } } } });
    }
    expect((await life.wait(() => views.call("view_child", { view: "child", scope: otherChildAt }))).structuredContent).toMatchObject({ error: "view", reason: "shape" });
    const acted = await life.wait(() => views.call("view_act", { view: "child", cut: 1, action: "bump" }));
    expect(acted.structuredContent).toMatchObject({ result: { structuredContent: { answer: "accepted" } } });
    expect(signatures).toBe(1);
    expect((await life.wait(() => child.entries())).at(-1)?.input).toMatchObject({ type: "act", signed: { intent: { kind: "bump", to: childAt } } });
    expect(await life.wait(() => child.item(0))).toMatchObject({ revision: 2, values: { count: 1 } });
    expect(await life.wait(() => root.item(0))).toMatchObject({ values: { count: 0 } });
    expect((await life.wait(() => oldViews.call("view_act", { view: "child", cut: 1, action: "bump" }))).structuredContent).toMatchObject({ error: "view", reason: "stale" });
    expect(signatures).toBe(1);
    for (const node of [root, child]) {
      const summary = await life.wait(() => node.summary());
      if (!summary.ok) throw Error("The native journal must have a current head.");
      const replay = await life.wait(() => verify(httpSource(port.service, { fetch: routed, reader: issued.session.reader() }),
        { mode: "replay", platform, grants: "proven", scope: node.name, head: summary.at }));
      expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    }
    expect(canonicalize(packet.package.semantic.creates)).toBe(canonicalize([{ from: rootId, to: childId }]));
  } finally { life.release(); }
});
