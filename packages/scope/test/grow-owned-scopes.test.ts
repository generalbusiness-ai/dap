/** Maintained Grow package on real native install, create/confirm, SQLite,
 * issued sessions, generic views and replay. TEST package peer, scheduler,
 * clock and setup inspector; no browser, device/provider or deployment. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, inject, test } from "vitest";
import { canonicalize, isScopeRef, isSeed, scopeIdOf, textDigest, unb64url } from "@generalbusiness/dap-bytes";
import { isApplicationJournalSource, readPublishedApplicationPackage2 } from "@generalbusiness/dap-bytes/application-v2";
import { DEVICE_APPLICATION_COHORT as C, platform } from "@generalbusiness/dap-platform";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { DEVICE_COMMAND, PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { ownerReservations, validateDefinition } from "@generalbusiness/dap-derive";
import { SqliteStore, type SqlValue } from "../src/sqlite.ts";
import { applicationProjectionData } from "../src/applications/projection-data.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { command as dapCommand, memoryStore as cliStore } from "../../cli/src/index.ts";
import { ScopeHandle, httpTransport, requestSession, secretSigner, sessionRequest } from "@generalbusiness/dap-client";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import nativeWorker from "../../../apps/room/worker.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture, applicationWorkerBindings } from "./fixtures-native.ts";
import { rita, routed } from "./repository.ts";
import { soon } from "./net.ts";
import type {} from "./support/maintained-applications.ts";

// Invariant: one installed Site owns its genuinely created Room and selected
// Room projections/views; Site and Room retain their distinct native records.
test("maintained Grow Site creates a native Room and opens its owned grid through the same installation", async () => {
  const captured = inject("maintainedApplications").grow, bytes = unb64url(captured.bytes);
  if (!bytes) throw Error("The maintained Grow packet must be captured.");
  const packet = readPublishedApplicationPackage2(bytes, captured.release), siteId = packet.package.semantic.entry;
  const roomId = packet.package.semantic.projections["grid"]!.definition;
  const { life, R, D, children } = await sessionRoom(C.register), [M, A, G] = children;
  if (!M || !A || !G) throw Error("The declared cohort needs its three siblings.");
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const controller = { membership, member: "@rita" as const };
    const port: ServerPort = { mode: "generic", service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use the installed Site."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const mcp = new McpService(port);
    const installed = await life.wait(() => mcp.call("install_application", { uri: f.uri, release: packet.ids.release, roles: ["admin"], values: { label: "Native grow site" }, owner: { membership, member: "@rita" }, idempotencyKey: "TEST-grow-site-install" }));
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
    const job = Number(installed.structuredContent["item"]);
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const siteCreate = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === siteId);
    if (!siteCreate || !isSeed(siteCreate.to)) throw Error("The native installation must create Site.");
    expect(siteCreate.message).toMatchObject({ body: { creationContext: { v: 2, delegate: true, deviceCommand: { owner: { membership, member: "@rita" }, root: siteId, definitions: [roomId] } } } });
    const site = life.platform(scopeIdOf(siteCreate.to)); await driveFixture([R, D, M, A, G, site], life.wait);
    const siteAt = await life.wait(() => site.at()); expect(siteAt.kind).toBe("lane");
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", refs: { scope: siteAt } });
    const created = await life.wait(() => mcp.call("act", { target: site.name, kind: "create-room", digest: siteId, fields: { label: "Room A" }, idempotencyKey: "TEST-grow-create-room" }));
    expect(created.structuredContent).toMatchObject({ answer: "accepted" });
    await dispatchFixture([R, D, M, A, G, site], life.wait);
    const roomCreate = (await life.wait(() => site.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === roomId);
    if (!roomCreate || !isSeed(roomCreate.to)) throw Error("Site must create Room through its maintained declaration.");
    expect(roomCreate.message).toMatchObject({ body: { creationContext: { v: 2, delegate: false, deviceCommand: { owner: { membership, member: "@rita" }, root: siteId, definitions: [roomId] } } } });
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
    // The G2 surface selects its separate layers declaration. Keep the
    // original grid read above and compare the view to the SDK's same read.
    const layered = await life.owner.required(() => handle.applicationProjection({ ...query, projection: "layers" }));
    expect(layered).toMatchObject({ ok: true, value: { scope: roomAt, sources: { bench: [{ id: bench, fields: { moistureTime: null, noteTime: null, insectsTime: null } }] } } });
    const views = new McpService({ ...port, custody: memoryStore(), declaredViews: { bytes: packet.bytes, release: packet.ids.release, item: job } });
    expect((await life.wait(() => views.call("view_site", { view: "site" }))).structuredContent).toMatchObject({ status: "ready", identity: { subject: { scope: site.name } } });
    expect((await life.wait(() => views.call("view_grid", { view: "room-grid", scope: roomAt }))).structuredContent).toMatchObject({ status: "ready" });
    expect((await life.wait(() => views.call("view_read", { view: "room-grid" }))).structuredContent).toMatchObject({ display: { query: { scope: roomAt }, card: { declared: { kind: "surface", data: layered.ok ? layered.value : null, surface: { opens: { bench: "bench-record" }, backScope: siteAt } } } } });
    // The exact probe entry supplies its recorded person, through the real
    // native owner and issued session. Default package/roster grants stay.
    const probe = await life.wait(async () => room.did(rita, "probe", { on: bench, fields: { moisture: 31 }, expected: await room.expected({ on: bench }) }));
    expect(await life.owner.required(() => handle.applicationProjection({ ...query, projection: "layers" })))
      .toMatchObject({ ok: true, value: { sources: { bench: [{ fields: { lastProber: controller } }] } } });
    // A plain read retains the opened snapshot. Open after the new fact to
    // capture its head rather than treating the earlier card as refreshed.
    expect((await life.wait(() => views.call("view_grid", { view: "native-person-prober", scope: roomAt }))).structuredContent).toMatchObject({ status: "ready" });
    const memberView = (await life.wait(() => views.call("view_read", { view: "native-person-prober" }))).structuredContent;
    expect(memberView).toMatchObject({ display: { members: { records: {
      [canonicalize(controller)]: { identity: { handle: "@rita", kind: "person" } },
    } } } });
    // Exact native owner boundary over the actual maintained bench. Select
    // only its declared signer field: unrelated journal/time completeness
    // remains a separate obligation of a full Grow grid read.
    await life.wait(() => runInDurableObject(room.object, (_instance, state) => {
      const sql = { exec: (query: string, ...args: SqlValue[]) => state.storage.sql.exec(query, ...args), transaction: <T>(work: () => T) => state.storage.transactionSync(work) };
      const store = new SqliteStore(sql), declared = packet.package.semantic.projections["layers"]!, source = declared.sources["bench"]!;
      if (isApplicationJournalSource(source)) throw Error("The maintained bench source must be an item.");
      const checked = validateDefinition(JSON.parse(packet.package.semantic.definitions.find(part => part.id === roomId)!.bytes), PROPOSED_BOUNDS);
      if (!checked.ok) throw Error("The maintained Room must validate.");
      const frame = { scope: store.scope()!, pinned: { definition: checked.definition } } as Parameters<typeof applicationProjectionData>[1];
      const projection = { ...declared, sources: { bench: { ...source, fields: { lastProber: source.fields["lastProber"]! } } } };
      const read = () => applicationProjectionData(sql, frame, projection, {}, () => true);
      const before = read();
      expect(before).toMatchObject({ ok: true, value: { sources: { bench: [{ fields: { lastProber: controller } }] } } });
      const record = state.storage.sql.exec("SELECT record FROM item WHERE id=?", bench).one()["record"] as string;
      for (const fault of ["hash", "retained", "legacy"]) {
        const rollback = new Error("TEST rollback of signer evidence fault");
        try { state.storage.transactionSync(() => {
          if (fault === "hash") {
            const item = JSON.parse(record); item.refs.lastProbe = { at: roomAt, seq: probe, hash: textDigest("PUBLIC TEST mismatched retained bench fact") };
            state.storage.sql.exec("UPDATE item SET record=? WHERE id=?", canonicalize(item), bench).toArray();
          } else if (fault === "retained") {
            state.storage.sql.exec("DELETE FROM entry WHERE seq=?", probe).toArray();
            expect(state.storage.sql.exec("SELECT seq FROM entry_fact_signer WHERE seq=?", probe).toArray()).toEqual([]);
          } else state.storage.sql.exec("DELETE FROM entry_fact_signer WHERE seq=?", probe).toArray();
          expect(read(), fault).toMatchObject({ ok: true, value: { sources: { bench: [{ fields: { lastProber: null } }] } } });
          throw rollback;
        }); } catch (error) { if (error !== rollback) throw error; }
        expect(read()).toEqual(before);
        expect(state.storage.sql.exec("SELECT record FROM item WHERE id=?", bench).one()["record"]).toBe(record);
      }
    }));
    // Exercise the production viewer adapter with an issued native session,
    // current membership grants and both declared related Site reads. There
    // is no task yet: no presence inference or synthetic task is needed.
    expect((await life.wait(() => views.call("view_tasks", { view: "native-member-tasks", scope: roomAt }))).structuredContent).toMatchObject({ status: "empty" });
    const tasks = await life.wait(() => views.call("view_read", { view: "native-member-tasks" }));
    const siteHead = (await life.wait(() => site.summary())).at;
    expect(tasks.structuredContent).toMatchObject({ display: { status: "empty", count: 0, scope: roomAt, refresh: 2000,
      back: { screen: "grid", scope: roomAt }, context: { projection: expect.arrayContaining([{ scope: site.name, ...siteHead }]) } } });
    expect((tasks.structuredContent["display"] as { data?: unknown }).data).toBeUndefined();
    expect((await life.wait(() => views.call("view_alerts", { view: "native-member-alerts", scope: roomAt }))).structuredContent).toMatchObject({ status: "empty" });
    expect((await life.wait(() => views.call("view_grid", { view: "wrong-site", scope: siteAt }))).structuredContent).toMatchObject({ status: "unavailable" });
    expect((await life.wait(() => A.entries())).filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "install-application")).toHaveLength(1);
    // Real installed Site -> Room delegation. Native answers close the
    // command they name; intervening reports and newer targets stay distinct.
    const heater = await life.wait(async () => room.did(rita, "commission-device", { expected: await room.expected({ zone }), fields: { zone, kind: "heater", label: "Heater A", minLevel: 0, maxLevel: 100, target: "off", level: 0 } }));
    const command = async (target: "on" | "off") => life.wait(async () => room.did(rita, "set-heater", { on: heater, expected: await room.expected({ on: heater }), fields: { target, level: target === "on" ? 100 : 0 } }));
    const checked = validateDefinition(JSON.parse(packet.package.semantic.definitions.find(part => part.id === roomId)!.bytes), PROPOSED_BOUNDS);
    if (!checked.ok) throw Error("The maintained Room must validate.");
    const pending = (position: number) => life.wait(() => runInDurableObject(room.object, (_instance, state) => {
      const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
      return { record: store.record(DEVICE_COMMAND, "command", [position]), answers: ownerReservations(CAPABILITY_CODE, store, checked.definition).entries };
    }));
    const oldCommand = await command("on"), currentCommand = await command("off");
    expect(await pending(currentCommand)).toMatchObject({ answers: 2, record: { state: "open", values: { device: heater, targetAt: currentCommand, decided: 0 } } });
    await life.wait(async () => room.did(rita, "report-device", { on: heater, expected: await room.expected({ on: heater }), fields: { reported: "on", level: 100, description: "" } }));
    const answer = async (position: number, outcome: "confirmed" | "refused") => {
      const sealed = (await life.wait(() => room.sealed())).find(entry => entry.entry.seq === position)!;
      return life.wait(() => mcp.call("prepare", { resource: room.name, capability: DEVICE_COMMAND, step: "answer", fields: { command: { at: roomAt, seq: position, hash: sealed.hash }, outcome, description: "TEST installed owner answer" }, idempotencyKey: `TEST-grow-answer-${position}` }));
    };
    expect((await answer(oldCommand, "confirmed")).structuredContent).toMatchObject({ step: { answer: { answer: "accepted" } } });
    expect(await life.wait(() => room.item(heater))).toMatchObject({ values: { target: "off", reported: "on", outcome: null }, refs: { targetAt: currentCommand, outcomeAt: null } });
    expect((await answer(currentCommand, "refused")).structuredContent).toMatchObject({ step: { answer: { answer: "accepted" } } });
    expect(await life.wait(() => room.item(heater))).toMatchObject({ values: { target: "off", reported: "on", outcome: "refused" }, refs: { targetAt: currentCommand, outcomeAt: (await life.wait(() => room.last())).seq } });
    expect(await pending(currentCommand)).toMatchObject({ answers: 0, record: { state: "refused", values: { decided: 1 } } });
    const devices: Record<string, number> = { heater };
    for (const kind of ["vent", "fan"] as const) devices[kind] = await life.wait(async () => room.did(rita, "commission-device", { expected: await room.expected({ zone }), fields: { zone, kind, label: `${kind} A`, minLevel: 0, maxLevel: 100, target: kind === "vent" ? "open" : "on", level: 100 } }));
    await life.wait(async () => room.did(rita, "bind-zone-devices", { on: zone, expected: await room.expected({ on: zone, ...devices }), fields: devices }));
    const sampledAt = new Date(life.now()).toISOString().replace(".000Z", "Z"), zones = [{ zone, min: 2300, max: 2740, mean: 2650, inBand: 10 }];
    const observed = await life.wait(() => room.did(rita, "observe", { fields: { sampledAt, zones } }));
    const observedFact = (await life.wait(() => room.sealed())).find(entry => entry.entry.seq === observed)!;
    await life.wait(async () => room.did(rita, "report-zone", { on: zone, expected: await room.expected({ on: zone }), fields: { summary: { at: roomAt, seq: observed, hash: observedFact.hash }, sampledAt, zones, min: 2300, max: 2740, mean: 2650, inBand: 10 } }));
    const alert = await life.wait(async () => room.did(rita, "raise-alert", { expected: await room.expected({ zone, ...devices }), fields: { zone, text: "TEST hot zone", proposal: "TEST restore heater", target: "on", level: 100 } }));
    const authorized = await life.wait(async () => room.did(rita, "authorize", { on: alert, expected: await room.expected({ on: alert, heater }), fields: {} }));
    expect(await pending(authorized)).toMatchObject({ answers: 1, record: { state: "open", values: { device: heater, targetAt: authorized, target: "on", level: 100, decided: 0 } } });
    expect((await answer(authorized, "confirmed")).structuredContent).toMatchObject({ step: { answer: { answer: "accepted" } } });
    expect(await pending(authorized)).toMatchObject({ answers: 0, record: { state: "confirmed", values: { decided: 1 } } });
    expect(await life.wait(() => room.item(heater))).toMatchObject({ values: { target: "on", reported: "on", outcome: "confirmed" }, refs: { targetAt: authorized } });
    expect(await life.owner.required(() => handle.applicationProjection({ ...query, projection: "device", items: { device: heater } })))
      .toMatchObject({ ok: true, value: { sources: { device: [{ id: heater, fields: { target: "on", reported: "on", outcome: "confirmed", outcomeAt: (await life.wait(() => room.last())).seq } }] } } });
    for (const node of [site, room]) {
      const summary = await life.wait(() => node.summary());
      expect(isScopeRef(summary.value.scope)).toBe(true);
      const replay = await life.wait(() => verify(httpSource(port.service, { fetch: routed, reader: issued.session.reader() }), { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: node.name, head: summary.at }));
      expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
    }
    // The actual member command must replay the installed device-command
    // history too. No copied capability table is passed by this witness.
    const local = cliStore();
    await local.keep("native-member", rita.secret);
    await local.save({ v: 1, service: port.service, key: "native-member", repository: { directory, membership, rules: A.name, destination: G.name } });
    const verified = await life.wait(() => dapCommand({ store: local, now: life.now, fetch: (url, init) => life.wait(() => routed(url, init)) }, ["verify", room.name]));
    expect(verified.code, verified.lines.join("\n")).toBe(0);
    expect(verified.lines).toContain("Result: consistent, for the mode, target, coverage and trusts stated below.");
    expect(canonicalize(packet.package.semantic.creates)).toBe(canonicalize([{ from: siteId, to: roomId }]));
  } finally { life.release(); }
}, 30_000);
