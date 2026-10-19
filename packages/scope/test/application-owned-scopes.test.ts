/** Real native install and declared creation, SQLite and issued read session.
 * Git/package peer, clock, scheduler and setup inspector are TEST fixtures.
 * No provider, external host or browser runs. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { canonicalize, isSeed, scopeIdOf } from "@generalbusiness/artroom-bytes";
import { DECLARED_APPLICATION_COHORT as C } from "@generalbusiness/dap-platform";
import { ScopeHandle, httpTransport, requestSession, secretSigner, sessionRequest } from "@generalbusiness/artroom-client";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import nativeWorker from "../../../apps/room/worker.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationOwnedScopesPacket } from "./support/application-owned-scopes-fixture.ts";
import { applicationResolverFixture } from "./support/application-fixture.ts";
import { applicationHttpPeer } from "./support/application-http-peer.ts";
import { sessionRoom } from "./support/session-room.ts";
import { dispatchFixture, driveFixture, effectFixture } from "./support/native-fixture-lifetime.ts";
import { rita, routed } from "./repository.ts";
import { soon } from "./net.ts";

test("one native install creates and confirms the declared root and child with inherited session membership", async () => {
  const { packet, rootId, childId } = await applicationOwnedScopesPacket();
  const room = await sessionRoom(C.register), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("The declared cohort needs its three siblings.");
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = { SCOPES: env.PLATFORM, APPLICATION_CONTENT: env.APPLICATION_CONTENT, APPLICATION_TRUST: JSON.stringify(f.trust) };
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use the native installation."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)) };
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
    expect(canonicalize(packet.package.semantic.creates)).toBe(canonicalize([{ from: rootId, to: childId }]));
  } finally { life.release(); }
});
