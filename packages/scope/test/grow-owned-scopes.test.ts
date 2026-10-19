/** Maintained Grow package on real native install, create/confirm, SQLite,
 * issued sessions, generic views and replay. TEST package peer, scheduler,
 * clock and setup inspector; no browser, device/provider or deployment. */
import { env } from "cloudflare:test";
import { expect, inject, test } from "vitest";
import { canonicalize, isScopeRef, isSeed, scopeIdOf, unb64url } from "@generalbusiness/artroom-bytes";
import { readApplicationPackage2 } from "@generalbusiness/artroom-bytes/application-v2";
import { DECLARED_APPLICATION_COHORT as C, platform } from "@generalbusiness/dap-platform";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { ScopeHandle, httpTransport, requestSession, secretSigner, sessionRequest } from "@generalbusiness/artroom-client";
import { httpSource, verify } from "@generalbusiness/artroom-replay";
import nativeWorker from "../../../apps/room/worker.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationResolverFixture } from "./support/application-fixture.ts";
import { applicationHttpPeer } from "./support/application-http-peer.ts";
import { sessionRoom } from "./support/session-room.ts";
import { dispatchFixture, driveFixture, effectFixture } from "./support/native-fixture-lifetime.ts";
import { rita, routed } from "./repository.ts";
import { soon } from "./net.ts";
import type {} from "./support/maintained-applications.ts";

// Invariant: one installed Site owns its genuinely created Room and selected
// Room projections/views; Site and Room retain their distinct native records.
test("maintained Grow Site creates a native Room and opens its owned grid through the same installation", async () => {
  const captured = inject("maintainedApplications").grow, bytes = unb64url(captured.bytes);
  if (!bytes) throw Error("The maintained Grow packet must be captured.");
  const packet = readApplicationPackage2(bytes, captured.release), siteId = packet.package.semantic.entry;
  const roomId = packet.package.semantic.projections["grid"]!.definition;
  const { life, R, D, children } = await sessionRoom(C.register), [M, A, G] = children;
  if (!M || !A || !G) throw Error("The declared cohort needs its three siblings.");
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = { SCOPES: env.PLATFORM, APPLICATION_CONTENT: env.APPLICATION_CONTENT, APPLICATION_TRUST: JSON.stringify(f.trust) };
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const port: ServerPort = { mode: "generic", service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use the installed Site."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const mcp = new McpService(port);
    const installed = await life.wait(() => mcp.call("install_application", { uri: f.uri, release: packet.ids.release, roles: ["admin"], values: { label: "Native grow site" }, idempotencyKey: "TEST-grow-site-install" }));
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
    const job = Number(installed.structuredContent["item"]);
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const siteCreate = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === siteId);
    if (!siteCreate || !isSeed(siteCreate.to)) throw Error("The native installation must create Site.");
    const site = life.platform(scopeIdOf(siteCreate.to)); await driveFixture([R, D, M, A, G, site], life.wait);
    const siteAt = await life.wait(() => site.at()); expect(siteAt.kind).toBe("lane");
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", refs: { scope: siteAt } });
    const created = await life.wait(() => mcp.call("act", { target: site.name, kind: "create-room", digest: siteId, fields: { label: "Room A" }, idempotencyKey: "TEST-grow-create-room" }));
    expect(created.structuredContent).toMatchObject({ answer: "accepted" });
    await dispatchFixture([R, D, M, A, G, site], life.wait);
    const roomCreate = (await life.wait(() => site.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === roomId);
    if (!roomCreate || !isSeed(roomCreate.to)) throw Error("Site must create Room through its maintained declaration.");
    const room = life.platform(scopeIdOf(roomCreate.to)); await driveFixture([R, D, M, A, G, site, room], life.wait);
    const roomAt = await life.wait(() => room.at()); expect(roomAt.kind).toBe("lane");
    const siteRows = (await life.wait(() => site.summary())).value.items.filter(item => item.type === "room");
    expect(siteRows).toHaveLength(1); expect(siteRows[0]).toMatchObject({ state: "active", refs: { scope: roomAt } });
    expect(await life.wait(() => room.item(0))).toMatchObject({ refs: { site: siteAt, siteRoom: { at: siteAt, seq: siteRows[0]!.id } }, values: { label: "Room A" } });
    const issued = await life.owner.required(() => requestSession(port.service, M.name, sessionRequest(membership, rita.secret, soon(60), crypto.randomUUID()), { fetch: routed }));
    if (!issued.ok) throw Error("Native membership must issue a session.");
    const handle = new ScopeHandle(httpTransport(port.service, { fetch: (url, init) => nativeWorker.fetch(new Request(url, init), bindings) }), room.name, issued.session.reader());
    const query = { v: 1 as const, scope: roomAt, directory, install: job, projection: "grid", items: {} };
    expect(await life.owner.required(() => handle.applicationProjection(query))).toMatchObject({ ok: true, value: { scope: roomAt, sources: { bench: [], zone: [], device: [], samples: [] } } });
    const zone = await life.wait(() => room.did(rita, "commission-zone", { fields: { label: "Zone A", setpoint: 2200, band: 100 } }));
    const bench = await life.wait(() => room.did(rita, "commission-bench", { expected: { zone: 1 }, fields: { zone, label: "A1", row: "A", column: 1 } }));
    const projected = await life.owner.required(() => handle.applicationProjection(query));
    expect(projected).toMatchObject({ ok: true, value: { scope: roomAt, sources: { bench: [{ id: bench, state: "stale", fields: { label: "A1", row: "A", column: 1 } }], zone: [{ id: zone }] } } });
    const views = new McpService({ ...port, custody: memoryStore(), declaredViews: { bytes: packet.bytes, release: packet.ids.release, item: job } });
    expect((await life.wait(() => views.call("view_grid", { view: "room-grid", scope: roomAt }))).structuredContent).toMatchObject({ status: "ready" });
    expect((await life.wait(() => views.call("view_read", { view: "room-grid" }))).structuredContent).toMatchObject({ display: { query: { scope: roomAt }, card: { declared: { kind: "surface", data: projected.ok ? projected.value : null, surface: { opens: { bench: "bench-record" } } } } } });
    expect((await life.wait(() => views.call("view_grid", { view: "wrong-site", scope: siteAt }))).structuredContent).toMatchObject({ status: "unavailable" });
    expect((await life.wait(() => A.entries())).filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "install-application")).toHaveLength(1);
    for (const node of [site, room]) {
      const summary = await life.wait(() => node.summary());
      expect(isScopeRef(summary.value.scope)).toBe(true);
      const replay = await life.wait(() => verify(httpSource(port.service, { fetch: routed, reader: issued.session.reader() }), { mode: "replay", platform, grants: "proven", scope: node.name, head: summary.at }));
      expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    }
    expect(canonicalize(packet.package.semantic.creates)).toBe(canonicalize([{ from: siteId, to: roomId }]));
  } finally { life.release(); }
}, 30_000);
