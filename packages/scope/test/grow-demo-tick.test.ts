/** Actual native install, Membership, Device owner preparation, SQLite and
 * HTTP simulator client. Package/Git peer, clock, scheduler and setup reads
 * are TEST fixtures. No hosted resource or physical device is contacted. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, inject, test } from "vitest";
import { b64url, canonicalize, isSeed, scopeIdOf, timeOf, unb64url } from "@generalbusiness/dap-bytes";
import { readPublishedApplicationPackage2 } from "@generalbusiness/dap-bytes/application-v2";
import { ARCHIVE_DEVICE_APPLICATION_COHORT as C, platform } from "@generalbusiness/dap-platform";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { invitationIssueFields, invitationRedemptionFields, requestSession, secretSigner, sessionRequest } from "@generalbusiness/dap-client";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { simulatorHost } from "../../../examples/grow/simulator-host.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture, reader, applicationWorkerBindings } from "./fixtures-native.ts";
import { rita, una, vic, routed } from "./repository.ts";
import type {} from "./support/maintained-applications.ts";
import type { TestScope } from "./worker.ts";

async function fixture() {
  const captured = inject("maintainedApplications").growDemo, bytes = unb64url(captured.bytes);
  if (!bytes) throw Error("The separate TEST demo packet must be captured.");
  const packet = readPublishedApplicationPackage2(bytes, captured.release), siteId = packet.package.semantic.entry;
  const roomId = packet.package.semantic.projections["grid"]!.definition;
  const { life, R, D, children } = await sessionRoom(C.register), [M, A, G] = children;
  if (!M || !A || !G) { life.release(); throw Error("The exact native siblings are required."); }
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
  try {
    // Start on the next whole schedule boundary before issuing invitations.
    const start = Math.ceil(life.now() / 3_600_000) * 3_600_000;
    life.advance(start - life.now());
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    for (const [node, definition] of [[D, C.directory], [M, C.membership], [A, C.rules], [G, C.destination]] as const)
      expect((await life.wait(() => node.summary())).value.definition).toBe(definition);
    const operator = { membership, member: "@rita" as const };
    for (const [actor, handle, fill] of [[una, "@demo-sensors", 92], [vic, "@demo-climate", 93]] as const) {
      const member = await life.wait(() => M.did(rita, "add-member", { fields: { handle, kind: "agent", controller: operator } }));
      const secret = b64url(new Uint8Array(32).fill(fill));
      const invitation = await life.wait(async () => M.did(rita, "invite-key", { fields: { member, kind: "agent",
        inviteEnds: timeOf(life.now() + 3_600_000), ...invitationIssueFields(C.membership, secret) }, expected: await M.expected({ member }) }));
      await life.wait(async () => M.did(actor, "enrol", { on: 0, fields: invitationRedemptionFields(C.membership, membership, invitation, actor.key, secret), expected: await M.expected({ on: 0, member }) }));
    }
    const members = { operator, sensors: { membership, member: "@demo-sensors" as const }, climate: { membership, member: "@demo-climate" as const } };
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const port: ServerPort = { mode: "generic", service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use the actual native demo installation."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const mcp = new McpService(port);
    const installed = await life.wait(() => mcp.call("install_application", { uri: f.uri, release: packet.ids.release, roles: ["admin", "agent"],
      values: { label: "TEST native demo", ...members }, owner: members.sensors, idempotencyKey: "TEST-demo-distinct-owner-install" }));
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
    const job = Number(installed.structuredContent["item"]);
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const creation = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === siteId);
    if (!creation || !isSeed(creation.to)) throw Error("The native installer must create demo Site.");
    expect(creation.message).toMatchObject({ body: { creationContext: { v: 2, delegate: true, deviceCommand: { owner: members.sensors, root: siteId, definitions: [roomId] } } } });
    const site = life.platform(scopeIdOf(creation.to)); await driveFixture([R, D, M, A, G, site], life.wait);
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active" });
    await life.wait(() => site.did(rita, "create-room", { fields: { label: "TEST four-zone Room" }, expected: { demoSite: 1 } }));
    await dispatchFixture([R, D, M, A, G, site], life.wait);
    const child = (await life.wait(() => site.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === roomId);
    if (!child || !isSeed(child.to)) throw Error("Demo Site must create its actual Room.");
    const room = life.platform(scopeIdOf(child.to)); await driveFixture([R, D, M, A, G, site, room], life.wait);
    const scope = await life.wait(() => room.at());
    expect(child.message).toMatchObject({ body: { creationContext: { v: 2, delegate: false, deviceCommand: { owner: members.sensors } } } });
    expect(await life.wait(() => room.item(0))).toMatchObject({ parties: members });
    for (const actor of [una, vic]) expect(await life.wait(() => M.stub.observe({ of: membership, key: actor.key })))
      .toMatchObject({ keyState: "active", role: "agent", actions: expect.arrayContaining(["grow.climate", "grow.sense"]) });
    let firstFan = 0;
    for (let ordinal = 1; ordinal <= 4; ordinal++) {
      const zone = await life.wait(() => room.did(rita, "commission-zone", { fields: { label: `Zone ${ordinal}`, setpoint: 2400, band: 200 } }));
      const devices: Record<string, number> = {};
      for (const kind of ["vent", "fan", "heater"] as const) {
        const device = await life.wait(async () => room.did(rita, "commission-device", { expected: await room.expected({ zone }), fields: {
          zone, kind, label: `${kind} ${ordinal}`, minLevel: 0, maxLevel: 100, target: kind === "vent" ? "closed" : kind === "heater" ? "on" : "off", level: kind === "heater" ? 100 : 0,
        } }));
        devices[kind] = device; if (!firstFan && kind === "fan") firstFan = device;
      }
      await life.wait(async () => room.did(rita, "bind-zone-devices", { on: zone, fields: devices, expected: await room.expected({ on: zone, ...devices }) }));
    }
    const host = () => simulatorHost(new TextDecoder().decode(bytes), packet.ids.release, packet.package.release.manifest.publisher);
    const settings = { GROW_BINDING: canonicalize({ service: port.service, room: scope, members }), GROW_SENSORS_SECRET: b64url(una.secret), GROW_CLIMATE_SECRET: b64url(vic.secret) };
    const sessions: { status: number; ok: boolean; reason: string | null }[] = [];
    const tick = async (minute: number) => {
      life.advance(start + minute * 60_000 - life.now());
      return life.wait(() => host().run(settings, life.now(), async (url, init) => {
        const response = await life.wait(() => routed(url, init));
        if (new URL(url).pathname.endsWith("/sessions")) {
          const value = await response.clone().json() as { ok?: boolean; reason?: unknown };
          // Diagnostic claims only; never retain or print the session token.
          sessions.push({ status: response.status, ok: value.ok === true, reason: typeof value.reason === "string" ? value.reason : null });
        }
        return response;
      }));
    };
    return { life, room, site, scope, membership, port, members, settings, host, start, firstFan, tick, sessions };
  } catch (error) { life.release(); throw error; }
}

// Invariant: a stateless tick uses the installed sensors owner's native grant,
// keeps the two actual agents separate despite their shared role, recovers
// after missed minutes/restart, and stops on the first native refusal.
test("the separately installed Grow demo runs native owner ticks under its distinct enrolled agents and fences a concurrent refusal", async () => {
  const { life, room, site, membership, port, settings, host, start, firstFan, tick, sessions } = await fixture();
  try {
    const initial = await tick(0); expect(initial, JSON.stringify({ initial, sessions })).toMatchObject({ result: "complete" });
    const unchanged = (await life.wait(() => room.summary())).at;
    expect(await tick(0)).toMatchObject({ result: "complete", accepted: [], costs: { writes: 0 } });
    // Native Site acknowledgments can still arrive after the first tick.
    // The duplicate itself submits no mutation or additional signed act.
    for (const entry of (await life.wait(() => room.entries())).filter(entry => entry.seq > unchanged.seq)) {
      expect(entry.input).toMatchObject({ type: "delivery", from: { at: await life.wait(() => site.at()) } });
    }
    const hot = await tick(10); expect(hot, JSON.stringify(hot)).toMatchObject({ result: "complete" });
    const hotRows = (await life.wait(() => room.summary())).value.items;
    const alert = hotRows.find(item => item.type === "alert")!;
    expect(alert).toMatchObject({ state: "open", values: { target: "off" } });
    const answered = await tick(11); expect(answered, JSON.stringify(answered)).toMatchObject({ result: "complete" });
    if (!("accepted" in answered)) throw Error("The host must reach its native simulator tick.");
    expect(answered.accepted.some(entry => entry.kind === "device-command@1:answer")).toBe(true);
    const entries = await life.wait(() => room.entries());
    expect(entries.filter(entry => entry.input.type === "preparation").every(entry => entry.input.type === "preparation" && entry.input.signed.intent.actor === una.key)).toBe(true);
    const observed = entries.filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "observe").at(-1)!;
    if (observed.input.type !== "act") throw Error("The actual sensor reading is required.");
    expect(await life.wait(async () => room.act(vic, "observe", { on: 0, fields: observed.input.type === "act" ? observed.input.signed.intent.fields : {}, expected: await room.expected({ on: 0 }) })))
      .toMatchObject({ answer: "refused", reason: "guard-failed", name: "not-demo-sensors" });
    expect(await life.wait(async () => room.act(una, "set-fan", { on: firstFan, fields: { target: "off", level: 0 }, expected: await room.expected({ on: firstFan }) })))
      .toMatchObject({ answer: "refused", reason: "guard-failed", name: "not-demo-climate" });
    await life.wait(() => room.restart());
    const recovered = await tick(35); expect(recovered, JSON.stringify(recovered)).toMatchObject({ result: "complete" });
    expect(await life.wait(() => (room.object as unknown as { items(reader: unknown, type: string): Promise<unknown> }).items(reader, "alert")))
      .toMatchObject({ ok: true, value: [{ id: alert.id, state: "closed" }] });
    const after = await life.wait(() => room.entries());
    expect(after.flatMap(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "observe" ? [entry.input.signed.intent.fields["sampledAt"]] : []))
      .toEqual([0, 10, 11, 35].map(minute => timeOf(start + minute * 60_000)));
    const closure = after.find(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "close-incident")!;
    expect(closure.input).toMatchObject({ type: "act", signed: { intent: { fields: { resolution: expect.stringContaining("No heater command was recorded") } } } });
    expect(after.some(entry => entry.input.type === "act" && ["authorize", "set-heater"].includes(entry.input.signed.intent.kind))).toBe(false);
    life.advance(start + 36 * 60_000 - life.now());
    let competed: number | null = null, refused = false, forwardedAfterRefusal = 0;
    const stopped = await life.wait(() => host().run(settings, life.now(), async (url, init) => {
      if (refused) { forwardedAfterRefusal++; throw Error("No later HTTP request may cross the refusal fence."); }
      const isAct = new URL(url).pathname === `/v1/scopes/${room.name}/acts` && init?.method === "POST";
      const body = isAct && typeof init.body === "string" ? JSON.parse(init.body) as { signed: import("@generalbusiness/dap-contract").SignedIntent } : null;
      if (body?.signed.intent.kind === "observe" && competed === null) {
        competed = await life.wait(async () => room.did(una, "observe", { on: 0, fields: body.signed.intent.fields, expected: await room.expected({ on: 0 }) }));
      }
      const response = await life.wait(() => routed(url, init));
      if (body?.signed.intent.kind === "observe" && competed !== null) {
        const answer = await response.clone().json() as { answer?: string; reason?: string };
        expect(answer).toMatchObject({ answer: "refused", reason: "revision-moved" });
        refused = true;
      }
      return response;
    }));
    expect(stopped).toMatchObject({ result: "stopped", phase: "observe", reason: "refused:revision-moved" });
    expect(competed).not.toBeNull(); expect(refused).toBe(true); expect(forwardedAfterRefusal).toBe(0);
    expect((await life.wait(() => room.entries())).filter(entry => entry.seq > competed! && entry.input.type === "act")).toHaveLength(0);
    const session = await life.wait(() => requestSession(port.service, membership.scope,
      sessionRequest(membership, rita.secret, timeOf(life.now() + 60_000), crypto.randomUUID()), { fetch: (url, init) => life.wait(() => routed(url, init)) }));
    if (!session.ok) throw Error("The actual operator session is required for replay.");
    const source = httpSource(port.service, { reader: session.session.reader(), fetch: (url, init) => life.wait(() => routed(url, init)) });
    for (const node of [site, room]) {
      const head = (await life.wait(() => node.summary())).at;
      const result = await life.wait(() => verify(source, { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: node.name, head }));
      expect([result.report.result, result.why], JSON.stringify(result.report)).toEqual(["consistent", null]);
    }
  } finally { life.release(); }
});

// Invariant: an installed Room with more than one bounded history window
// makes recorded forward progress without skipping an unanswered command;
// one tick answers at most eight and stays inside the public HTTP allowance.
test("a native demo tick crosses a long gap in bounded prefixes and drains its owner queue without a private cursor", async () => {
  const { life, room, firstFan, start, tick } = await fixture();
  try {
    const beforeGap = (await life.wait(() => room.summary())).at;
    // History padding crosses the 800-entry public window, not 811 sensor
    // authority rounds. One TEST callback still writes every checkpoint
    // through the actual native turn and SQLite store.
    await life.wait(() => runInDurableObject(room.object, async instance => {
      for (let n = 0; n < 811; n++) expect((await (instance as TestScope).checkpoint()).answer).toBe("written");
    }));
    const afterGap = (await life.wait(() => room.summary())).at;
    expect(afterGap.seq - beforeGap.seq).toBe(811);
    const commands: number[] = [];
    for (let n = 0; n < 12; n++) commands.push(await life.wait(async () => room.did(vic, "set-fan", { on: firstFan,
      expected: await room.expected({ on: firstFan }), fields: { target: n % 2 ? "off" : "on", level: n % 2 ? 0 : 100 } })));
    const frontier = (await life.wait(() => room.summary())).at;
    expect(commands).toEqual(Array.from({ length: 12 }, (_, n) => afterGap.seq + n + 1));
    expect(frontier.seq).toBe(afterGap.seq + 12);
    let previous = -1, bounded = false, ownerTicks = 0, answers = 0, complete = false;
    for (let minute = 0; minute < 8; minute++) {
      const result = await tick(minute);
      expect(result, JSON.stringify(result)).toMatchObject({ result: "complete" });
      if (!("accepted" in result)) throw Error("The native host must reach its tick.");
      const count = result.accepted.filter(entry => entry.kind === "device-command@1:answer").length;
      expect(count).toBeLessThanOrEqual(8);
      if (count) ownerTicks++; answers += count;
      expect(result.costs.reads).toBeLessThanOrEqual(96); expect(result.costs.writes).toBeLessThanOrEqual(48);
      expect(result.costs.requestBytes).toBeLessThanOrEqual(256 * 1024); expect(result.costs.replyBytes).toBeLessThanOrEqual(4 * 1024 * 1024);
      const root = await life.wait(() => room.item(0)), cursor = root.values["commandsAnsweredThrough"] as { seq: number; hash: string };
      expect(root.values["lastSampledAt"]).toBe(timeOf(start + minute * 60_000));
      expect(cursor.seq).toBeGreaterThan(previous); expect(cursor.seq - previous).toBeLessThanOrEqual(800);
      const retained = await life.wait(() => room.stub.entry(reader, cursor.seq));
      expect(retained).toMatchObject({ ok: true, value: { hash: cursor.hash } });
      if (!result.completeWindow) { bounded = true; expect(result.scannedThrough!.seq).toBeLessThan(frontier.seq); }
      if (result.pendingInWindow > 0) expect(cursor.seq).toBeLessThan(result.scannedThrough!.seq);
      previous = cursor.seq;
      if (result.completeWindow && result.pendingInWindow === 0) { complete = true; break; }
    }
    expect(bounded).toBe(true); expect(complete).toBe(true); expect(ownerTicks).toBeGreaterThanOrEqual(2); expect(answers).toBe(12);
    const result = await life.wait(() => room.stub.entry(reader, commands.at(-1)!));
    expect(result).toMatchObject({ ok: true, value: { entry: { seq: commands.at(-1)! } } });
  } finally { life.release(); }
});
