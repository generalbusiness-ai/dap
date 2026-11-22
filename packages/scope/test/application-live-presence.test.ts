/** Real native package installation, SQLite, issued session, Worker route and live turn.
 * The package peer, clock and scheduler are test fixtures. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { canonicalize, isSeed, scopeIdOf } from "@generalbusiness/dap-bytes";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { declaredHandle, httpTransport, memoryStore, requestSession, ScopeHandle, secretSigner, sessionRequest } from "@generalbusiness/dap-client";
import { encodeApplicationProjectionQuery } from "@generalbusiness/dap-platform/application-v2";
import { DECLARED_APPLICATION_COHORT as C } from "@generalbusiness/dap-platform";
import { McpService, type ServerPort } from "@generalbusiness/dap-mcp";
import nativeWorker from "../../../apps/room/worker.ts";
import sandbox, { type SandboxEnv } from "../../../apps/sandbox/worker.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { liveTurnsOf, type LiveTurns } from "../src/live.ts";
import { applicationWorkerBindings, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture } from "./fixtures-native.ts";
import { applicationPresencePacket } from "./support/application-presence-fixture.ts";
import { rita, routed } from "./repository.ts";
import { soon } from "./net.ts";
import { SCREEN_TEST_HOST } from "./worker.ts";

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

    // The installed child and issued session cross both real gateway checks.
    const host = SCREEN_TEST_HOST, original = env.SCREEN_API as unknown as NonNullable<SandboxEnv["ROOM"]>;
    const internal = (request: Request) => {
      const url = new URL(request.url);
      return new Request("http://127.0.0.1:9876" + url.pathname + url.search,
        { method: request.method, headers: request.headers, body: request.body, redirect: "manual" });
    };
    const service: NonNullable<SandboxEnv["ROOM"]> = {
      screenHost: (...args) => Reflect.apply(original.screenHost, original, args),
      screen: (...args) => Reflect.apply(original.screen, original, args),
      native: (origin, request, address) => original.native(origin, internal(request), address),
      nativeStream: (origin, request, address) => original.nativeStream(origin, internal(request), address),
    };
    const gateway: SandboxEnv = { SCREEN_HOSTS: JSON.stringify([{ host, service: "ROOM" }]), ROOM: service };
    const pending: Promise<unknown>[] = [], execution = { waitUntil: (work: Promise<unknown>) => { pending.push(work); } };
    const path = `/v1/scopes/${child.name}`;
    const sendGateway = (suffix: string, init?: RequestInit) => sandbox.fetch(new Request(host.screenOrigin + path + suffix, init), gateway, execution);
    const auth = { authorization: issued.session.reader() };
    await life.owner.required(async () => {
      try {
        for (const [suffix, method] of [["/live?", "GET"], ["/live-act?", "POST"], ["/live-stream?", "GET"]] as const) {
          expect((await life.wait(() => sendGateway(suffix, { method, headers: auth }))).status, suffix).toBe(404);
        }
        expect((await life.wait(() => sendGateway("/live"))).status).toBe(403);
        expect((await life.wait(() => sendGateway("/live-stream"))).status).toBe(403);
        const summary = await life.wait(() => sendGateway("/live", { headers: auth }));
        expect(summary.status).toBe(200);
        expect(await summary.json()).toMatchObject({ ok: true, generation: reset.generation });
        const nonLive = await life.wait(() => sandbox.fetch(new Request(`${host.screenOrigin}/v1/scopes/${M.name}/live`, { headers: auth }), gateway, execution));
        expect(nonLive.status).not.toBe(200);
        const counts = () => (child.object as unknown as { serving(): Promise<{ streams: { open: number; released: number } }> }).serving();
        const beforeWatch = (await life.wait(counts)).streams;
        const stream = await life.wait(() => sendGateway("/live-stream", { headers: auth }));
        expect(stream.status).toBe(200);
        const watch = stream.body!.getReader();
        try {
          expect((await life.wait(() => watch.read())).done).toBe(false);
          const enteredAgain = await typed.handle.intent(signer, "enter", { on: null, fields: {}, expected: {} } as never, { now: life.now() });
          const body = JSON.stringify({ signed: enteredAgain.signed, grants: [], generation: reset.generation, binding: encodeApplicationProjectionQuery(query) });
          const denied = await life.wait(() => sendGateway("/live-act", { method: "POST", headers: { "content-type": "application/json" }, body }));
          expect(denied.status).not.toBe(200);
          const stale = await life.wait(() => sendGateway("/live-act", { method: "POST", headers: { ...auth, "content-type": "application/json" },
            body: JSON.stringify({ signed: enteredAgain.signed, grants: [], generation: "old", binding: encodeApplicationProjectionQuery(query) }) }));
          expect(stale.status).toBe(409);
          const applied = await life.wait(() => sendGateway("/live-act", { method: "POST", headers: { ...auth, "content-type": "application/json" }, body }));
          expect([applied.status, await applied.json()]).toMatchObject([200, { answer: "applied", generation: reset.generation }]);
          expect((await life.wait(() => watch.read())).done).toBe(false);
        } finally { await watch.cancel(); }
        expect((await life.wait(counts)).streams).toEqual({ open: beforeWatch.open, released: beforeWatch.released + 1 });
      } finally { await Promise.all(pending); }
    });
  } finally { life.release(); }
});

test("the opt-in presence package carries a native member, focus and expiring lease", async () => {
  const { packet, child } = await applicationPresencePacket("lease", true);
  expect(packet.ids.release).toBeTruthy();
  await expect(applicationPresencePacket("unsafe-cadence", true, 15_001)).rejects.toThrow();
  expect(child.items["card"]?.parties["member"]?.required).toBe(true);
  expect(child.items["card"]?.refs["focus"]?.to).toEqual({ type: "scope", kind: "lane" });
  expect(child.timed["expire"]).toMatchObject({ on: "card", deadline: "expires", states: ["here"], effects: [{ state: "left" }] });
});

test("an installed opted-in presence enters, renews, leaves and expires on its live clock", async () => {
  const { packet, rootId, childId } = await applicationPresencePacket("lease-installed", true);
  const { life, R, D, children } = await sessionRoom(C.register), [M, A, G] = children;
  if (!M || !A || !G) throw Error("The declared cohort needs its three siblings.");
  const fixture = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(fixture);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(fixture.trust), env.SCOPE_INDEX);
  life.applicationTrust(() => bindings.APPLICATION_TRUST);
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use native installation."); } },
      applicationFetch: peer.fetch, applicationTrust: bindings.APPLICATION_TRUST, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const installed = await life.wait(() => new McpService(port).call("install_application", { uri: fixture.uri, release: packet.ids.release, roles: ["admin"], values: {}, idempotencyKey: "TEST-presence-lease" }));
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "accepted" });
    const job = Number(installed.structuredContent["item"]);
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const rootSend = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === rootId);
    if (!rootSend || !isSeed(rootSend.to)) throw Error("The directory must create the installed root.");
    const root = life.platform(scopeIdOf(rootSend.to)); await driveFixture([R, D, M, A, G, root], life.wait);
    const childSend = (await life.wait(() => root.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === childId);
    if (!childSend || !isSeed(childSend.to)) throw Error("The installed root must create the live child.");
    const child = life.platform(scopeIdOf(childSend.to));
    const timer: { current: { milliseconds: number; fire: () => void } | null } = { current: null };
    life.wire(child.name, () => ({ liveTimer: { set: (milliseconds, fire) => {
      timer.current = milliseconds === null ? null : { milliseconds, fire };
    } } }));
    await life.wait(() => child.restart());
    await driveFixture([R, D, M, A, G, root, child], life.wait);
    const childAt = await life.wait(() => child.at());
    const views = new McpService({ ...port, declaredViews: { bytes: packet.bytes, release: packet.ids.release, item: job },
      fetch: (url, init) => new URL(url).pathname.startsWith(`/v1/scopes/${child.name}/`)
        ? nativeWorker.fetch(new Request(url, init), bindings) : port.fetch!(url, init) });
    const opened = await life.wait(() => views.call("view_cards", { view: "presence", scope: childAt }));
    expect(opened.structuredContent).toMatchObject({ status: "empty" });
    const read = async (cut: number) => (await life.wait(() => views.call("view_read", { view: "presence", cut, refresh: true }))).structuredContent["display"] as {
      cut: number; card?: unknown; members?: { records: Record<string, unknown> }; presence: { viewer: unknown; rows: { member: unknown; focus: unknown; expires: string }[]; enter?: string; renew?: string; leave?: string };
    };
    const act = async (cut: number, action: string) => (await life.wait(() => views.call("view_live_act", { view: "presence", cut, action }))).structuredContent;
    const initial = await read(0);
    const member = { membership, member: rita.member.member };
    expect(initial.presence).toMatchObject({ viewer: member, rows: [], enter: "presence-enter" });
    expect(initial.card).toBeUndefined();
    expect(await act(initial.cut, "presence-enter")).toMatchObject({ result: { structuredContent: { answer: "applied" } } });
    const entered = await read(initial.cut);
    expect(entered.presence).toMatchObject({ viewer: member, rows: [{ member, focus: childAt }], renew: "presence-renew", leave: "presence-leave" });
    expect(entered.card).toBeUndefined();
    expect(entered.members?.records[canonicalize(member)]).toMatchObject({ ref: member, identity: { handle: "@rita", kind: "person" } });
    expect(Object.keys(entered.presence.rows[0]!).sort()).toEqual(["expires", "focus", "member"]);
    const firstExpiry = Date.parse(entered.presence.rows[0]!.expires);
    expect(firstExpiry).toBe(life.now() + 30_000);
    life.advance(5_000);
    expect(await act(entered.cut, "presence-renew")).toMatchObject({ result: { structuredContent: { answer: "applied" } } });
    const renewed = await read(entered.cut);
    expect(Date.parse(renewed.presence.rows[0]!.expires)).toBe(firstExpiry + 5_000);
    expect(await act(renewed.cut, "presence-leave")).toMatchObject({ result: { structuredContent: { answer: "applied" } } });
    const left = await read(renewed.cut);
    expect(left.presence).toMatchObject({ rows: [], enter: "presence-enter" });
    expect(await act(left.cut, "presence-enter")).toMatchObject({ result: { structuredContent: { answer: "applied" } } });
    const abandoned = await read(left.cut);
    expect(abandoned.presence.rows).toHaveLength(1);
    expect(timer.current?.milliseconds).toBe(30_000);
    const liveState = () => runInDurableObject(child.object, instance => {
      const current = (instance as unknown as { [liveTurnsOf](): LiveTurns | null })[liveTurnsOf]()?.current();
      return current ? { tick: current.tick, items: current.view.all().items } : null;
    });
    const beforeTimer = await life.wait(liveState);
    const activeLease = beforeTimer?.items.find(item => item.type === "card" && item.state === "here");
    if (!beforeTimer || !activeLease) throw Error("The abandoned lease must be live before the timer.");
    life.advance(30_001);
    await life.wait(() => runInDurableObject(child.object, () => {
      if (!timer.current) throw Error("The live timer must hold the lease deadline.");
      timer.current.fire();
    }));
    expect(timer.current).toBeNull();
    const afterTimer = await life.wait(liveState);
    expect(afterTimer?.tick).toBe(beforeTimer.tick + 1);
    expect(afterTimer?.items.find(item => item.id === activeLease.id)).toMatchObject({ state: "left" });
    const expired = await read(abandoned.cut);
    expect(expired.presence).toMatchObject({ rows: [], enter: "presence-enter" });
    const entries = await life.wait(() => child.entries());
    expect(entries).toHaveLength(2);
  } finally { life.release(); }
});
