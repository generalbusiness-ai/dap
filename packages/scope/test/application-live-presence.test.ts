/** Real native package installation, SQLite, issued session, Worker route and live turn.
 * The package peer, clock and scheduler are test fixtures. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { isSeed, scopeIdOf } from "@generalbusiness/dap-bytes";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { declaredHandle, httpTransport, memoryStore, requestSession, ScopeHandle, secretSigner, sessionRequest } from "@generalbusiness/dap-client";
import { DECLARED_APPLICATION_COHORT as C } from "@generalbusiness/dap-platform";
import { McpService, type ServerPort } from "@generalbusiness/dap-mcp";
import nativeWorker from "../../../apps/room/worker.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationWorkerBindings, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture } from "./fixtures-native.ts";
import { applicationPresencePacket } from "./support/application-presence-fixture.ts";
import { rita, routed } from "./repository.ts";
import { soon } from "./net.ts";

// One installed live child changes only its memory, and rejects a stale generation after eviction.
test("an installed live presence card enters, renews and leaves without writing storage", async () => {
  const { packet, child: definition, rootId, childId } = await applicationPresencePacket();
  const other = await applicationPresencePacket("2");
  const { life, R, D, children } = await sessionRoom(C.register), [M, A, G] = children;
  if (!M || !A || !G) throw Error("The declared cohort needs its three siblings.");
  const fixture = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(fixture);
  const otherFixture = await applicationResolverFixture("sha1", undefined, {}, undefined, other.packet), otherPeer = applicationHttpPeer(otherFixture);
  let packageFetch = peer.fetch;
  const fetchPackage = (request: Request) => packageFetch(request);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify([...fixture.trust, ...otherFixture.trust]), env.SCOPE_INDEX);
  life.applicationTrust(() => bindings.APPLICATION_TRUST);
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, fetchPackage)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use native installation."); } },
      applicationFetch: fetchPackage, applicationTrust: bindings.APPLICATION_TRUST, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const installed = await life.wait(() => new McpService(port).call("install_application", { uri: fixture.uri, release: packet.ids.release, roles: ["admin"], values: {}, idempotencyKey: "TEST-live-presence" }));
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "accepted" });
    const job = Number(installed.structuredContent["item"]);
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const rootSend = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === rootId);
    if (!rootSend || !isSeed(rootSend.to)) throw Error("The directory must create the root.");
    const root = life.platform(scopeIdOf(rootSend.to)); await driveFixture([R, D, M, A, G, root], life.wait);
    const childSend = (await life.wait(() => root.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === childId);
    if (!childSend || !isSeed(childSend.to)) throw Error("The root must create the live child.");
    const child = life.platform(scopeIdOf(childSend.to)); await driveFixture([R, D, M, A, G, root, child], life.wait);
    packageFetch = otherPeer.fetch;
    const otherInstalled = await life.wait(() => new McpService(port).call("install_application", { uri: otherFixture.uri, release: other.packet.ids.release, roles: ["admin"], values: {}, idempotencyKey: "TEST-other-live-presence" }));
    expect(otherInstalled.structuredContent).toMatchObject({ answer: "accepted", phase: "accepted" });
    const otherJob = Number(otherInstalled.structuredContent["item"]);
    expect(otherJob).not.toBe(job);
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G, root, child], life.wait);
    const otherRootSend = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).filter(send => isSeed(send.to) && send.to.definition === rootId).at(-1);
    if (!otherRootSend || !isSeed(otherRootSend.to)) throw Error("The second installation must create its root.");
    const otherRoot = life.platform(scopeIdOf(otherRootSend.to)); await driveFixture([R, D, M, A, G, root, child, otherRoot], life.wait);
    // The read selection is a stand-in. Both selected metadata replies come
    // from the real installed applications and the native declaration source.
    let redirectFinal = false, reads = 0;
    life.declarationRead(child.name, source => ({ read: (at, install, name, run) => {
      const selected = redirectFinal && ++reads === 2 ? otherJob : install;
      return source.read(at, selected, name, run);
    } }));
    await life.wait(() => child.restart());
    const childAt = await life.wait(() => child.at());
    const query = { v: 1 as const, scope: childAt, directory, install: job, projection: "cards", items: {} };
    const issued = await life.owner.required(() => requestSession(port.service, M.name, sessionRequest(membership, rita.secret, soon(60), crypto.randomUUID()), { fetch: routed }));
    if (!issued.ok) throw Error("Membership must issue a read session.");
    const handle = new ScopeHandle(httpTransport(port.service, { fetch: (url, init) => nativeWorker.fetch(new Request(url, init), bindings) }), child.name, issued.session.reader());
    const typed = await life.owner.required(() => declaredHandle(handle, definition));
    if (!typed.ok) throw Error(`The child must pin the presence definition: ${typed.reason}`);
    const storage = () => runInDurableObject(child.object, async (_instance, state) => {
      const tables = state.storage.sql.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").toArray();
      return { rows: tables.map(({ name }) => [name, state.storage.sql.exec(`SELECT * FROM "${name.replaceAll('"', '""')}"`).toArray()]), kv: [...await state.storage.list()], alarm: await state.storage.getAlarm() };
    });
    const before = await life.wait(storage), entries = await life.wait(() => child.entries());
    expect(entries).toHaveLength(2);
    const initial = await life.owner.required(() => handle.liveSummary());
    if (!initial.ok) throw Error(`The session must read live state: ${initial.reason}`);
    const projection = await life.owner.required(() => handle.applicationLiveProjection(query));
    expect(projection).toMatchObject({ ok: true, generation: initial.generation, tick: initial.tick, value: { scope: childAt, definition: childId } });
    const wrong = { ...query, install: otherJob };
    expect(await life.owner.required(() => handle.applicationLiveProjection(wrong))).toEqual({ ok: false, reason: "unavailable" });
    const generation = initial.generation, signer = secretSigner(rita.secret);
    const send = async (kind: "enter" | "renew" | "leave", on: number | null, expected: Record<string, number>, gen = generation) => {
      const { signed } = await typed.handle.intent(signer, kind, { on, fields: {}, expected } as never, { now: life.now() });
      return life.owner.required(() => handle.liveAct(signed, gen, [], query));
    };
    const denied = await typed.handle.intent(signer, "enter", { on: null, fields: {}, expected: {} } as never, { now: life.now() });
    expect(await life.owner.required(() => handle.liveAct(denied.signed, generation, [], wrong))).toEqual({ answer: "unavailable", reason: "unavailable" });
    expect(await send("enter", null, {})).toEqual({ answer: "applied", generation, tick: initial.tick + 1 });
    const entered = await life.owner.required(() => handle.applicationLiveProjection(query));
    if (!entered.ok) throw Error("The entered card must be readable.");
    const card = entered.value.sources["cards"]?.[0];
    expect(card).toMatchObject({ id: initial.tick + 1, state: "here", revision: 1, fields: { renewals: 0 } });
    if (!card) throw Error("The card must exist.");
    const renewal = await typed.handle.intent(signer, "renew", { on: card.id, fields: {}, expected: { on: card.revision } } as never, { now: life.now() });
    redirectFinal = true; reads = 0;
    expect(await life.owner.required(() => handle.liveAct(renewal.signed, generation, [], query))).toEqual({ answer: "unavailable", reason: "unavailable" });
    expect(reads).toBe(2);
    redirectFinal = false;
    const unchanged = await life.owner.required(() => handle.applicationLiveProjection(query));
    expect(unchanged).toMatchObject({ ok: true, generation, tick: initial.tick + 1, value: { sources: { cards: [expect.objectContaining({ id: card.id, revision: 1, fields: { renewals: 0 } })] } } });
    expect(await life.wait(storage)).toEqual(before);
    // The exact same signed action applies when both checks select its install.
    expect(await life.owner.required(() => handle.liveAct(renewal.signed, generation, [], query))).toEqual({ answer: "applied", generation, tick: initial.tick + 2 });
    const renewed = await life.owner.required(() => handle.applicationLiveProjection(query));
    expect(renewed).toMatchObject({ ok: true, tick: initial.tick + 2, value: { sources: { cards: [expect.objectContaining({ id: card.id, revision: 2, fields: { renewals: 1 } })] } } });
    const custody = memoryStore(), mcpSigner = secretSigner(rita.secret);
    let signatures = 0;
    const views = new McpService({ ...port, custody, declaredViews: { bytes: packet.bytes, release: packet.ids.release, item: job },
      signer: { key: mcpSigner.key, sign: bytes => { if (new TextDecoder().decode(bytes).startsWith(`${DOMAINS.intent}\n`)) signatures++; return mcpSigner.sign(bytes); } },
      fetch: (url, init) => new URL(url).pathname.startsWith(`/v1/scopes/${child.name}/`)
        ? nativeWorker.fetch(new Request(url, init), bindings) : port.fetch!(url, init),
    });
    const opened = await life.wait(() => views.call("view_cards", { view: "presence", scope: childAt }));
    expect(opened.structuredContent).toMatchObject({ status: "ready" });
    const detail = await life.wait(() => views.call("view_read", { view: "presence", cut: 0, page: "item" }));
    expect(detail.structuredContent).toMatchObject({ display: { cut: 1, card: { actions: [{ id: "renew" }, { id: "leave" }] } } });
    expect((await life.wait(() => views.call("view_live_act", { view: "presence", cut: 1, action: "enter" }))).structuredContent).toMatchObject({ error: "view", reason: "shape" });
    expect((await life.wait(() => views.call("view_live_act", { view: "presence", cut: 0, action: "renew" }))).structuredContent).toMatchObject({ error: "view", reason: "stale" });
    expect(signatures).toBe(0);
    const acted = await life.wait(() => views.call("view_live_act", { view: "presence", cut: 1, action: "renew" }));
    expect(acted.structuredContent).toMatchObject({ result: { structuredContent: { answer: "applied", generation, tick: initial.tick + 3 } } });
    expect(signatures).toBe(1);
    expect(custody.records.size).toBe(0);
    const refreshed = await life.wait(() => views.call("view_read", { view: "presence", cut: 1, refresh: true }));
    expect(refreshed.structuredContent).toMatchObject({ display: { cut: 2, card: { identity: { revision: "3" } } } });
    expect(await send("leave", card.id, { on: 3 })).toEqual({ answer: "applied", generation, tick: initial.tick + 4 });
    const left = await life.owner.required(() => handle.applicationLiveProjection(query));
    if (!left.ok) throw Error("The final live summary must be readable.");
    expect(left.tick).toBe(initial.tick + 4); expect(left.value.sources["cards"]?.some(item => item.id === card.id)).toBe(false);
    expect(await life.wait(storage)).toEqual(before);
    expect(await life.wait(() => child.entries())).toEqual(entries);
    await life.wait(() => child.restart());
    const stale = await life.wait(() => views.call("view_live_act", { view: "presence", cut: 2, action: "renew" }));
    expect(stale.structuredContent).toMatchObject({ result: { isError: true, structuredContent: { error: "stale" } } });
    expect(signatures).toBe(1);
    const reset = await send("enter", null, {}, generation);
    expect(reset).toMatchObject({ answer: "reset" });
    if (reset.answer !== "reset") throw Error("Eviction must reset the generation.");
    expect(reset.generation).not.toBe(generation);
    expect(await life.wait(storage)).toEqual(before);
    expect(await life.wait(() => child.entries())).toEqual(entries);
  } finally { life.release(); }
});
