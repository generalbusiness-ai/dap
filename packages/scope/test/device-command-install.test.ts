/** Genuine native install, Membership, Core, SQLite and pure command code.
 * Repository creation, Git/package HTTP, clock and setup read access are TEST
 * fixtures. No device/provider write or production installation occurs. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { DEVICE_COMMAND, PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { ownerReservations, reserved, validateDefinition } from "@generalbusiness/dap-derive";
import { b64url, canonicalize, definitionDigest, isSeed, scopeIdOf, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { DEVICE_APPLICATION_COHORT as C, ARCHIVE_DEVICE_APPLICATION_COHORT as AC, platform } from "@generalbusiness/dap-platform";
import { secretSigner, applicationScreenPath, invitationIssueFields, readApplicationInvitation, readApplicationScreenAddress, readApplicationScreenContext } from "@generalbusiness/dap-client";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { net } from "../src/testing.ts";
import { SqliteStore } from "../src/sqlite.ts";
import { deviceApplicationPacket, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture, reader, applicationWorkerBindings } from "./fixtures-native.ts";
import { devicePackageFixture as deviceCommandFixture } from "../../derive/test/fixtures-device-command.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { rita, routed } from "./repository.ts";
import { applicationSandboxPage } from "../src/applications/route.ts";

test.each([["device", C, undefined, false], ["device/archive bound", AC, "journal", true], ["device/archive unbound", AC, undefined, false]] as const)("a native install checks its existing owner and preserves its command grant through SQLite restart (%s)", async (_label, C, archive, requiresArchive) => {
  const id = definitionDigest(deviceCommandFixture);
  const packet = await deviceApplicationPacket(requiresArchive, C === AC);
  const room = await sessionRoom(C.register, archive), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("The device cohort needs its exact siblings.");
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at()), owner = { membership, member: "@rita" as const };
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Native discovery only."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)),
    };
    const mcp = new McpService(port), args = { uri: f.uri, release: packet.ids.release, roles: ["admin"], values: {}, owner, idempotencyKey: "TEST-device-native-install" };
    const missing = await life.wait(() => mcp.call("install_application", { ...args, owner: { membership, member: "@missing" }, idempotencyKey: "TEST-device-owner-missing" }));
    expect(missing.structuredContent).toMatchObject({ answer: "refused", reason: "guard-failed", name: "device-owner-not-active" });
    const installed = await life.wait(() => mcp.call("install_application", args));
    expect(installed.isError, JSON.stringify(installed.structuredContent)).toBe(false);
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
    const job = Number(installed.structuredContent["item"]);
    const installEntry = (await life.wait(() => A.entries())).find(entry => entry.seq === job)!;
    // The signer's own member is served by its actual grant observation,
    // as the native observation rules specify; no second read is invented.
    expect(installEntry.input).toMatchObject({ type: "act", authority: [{ subject: owner, fresh: { observation: {
      member: "@rita", memberState: "active", keyState: "active", of: membership,
    } } }] });
    expect(installEntry.input).not.toHaveProperty("observed");
    // Learn the actual native seed before allowing its first delivery, so
    // the fixture's entry ceiling applies from this child's construction.
    life.setHold(envelope => isSeed(envelope.to) && envelope.to.kind === "lane");
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const birth = (await life.wait(() => D.sealed())).flatMap(sealed => sealed.entry.sends.map(send => ({ send,
      from: { at: sealed.entry.at, seq: sealed.entry.seq, hash: sealed.hash } }))).find(({ send }) => isSeed(send.to) && send.to.kind === "lane");
    const creation = birth?.send;
    expect(creation).toBeDefined(); if (!birth || !creation || !isSeed(creation.to)) throw Error("Native Directory did not create the device scope.");
    expect(creation.message).toMatchObject({ body: { creationContext: { v: 2, delegate: true, deviceCommand: { capability: DEVICE_COMMAND, owner, bounds: { kinds: ["heater"], owners: 1 }, root: id, definitions: [id] } } } });
    const app = life.platform(scopeIdOf(creation.to));
    const bounds = { ...PROPOSED_BOUNDS, scopeEntries: 16 };
    net.sized.set(app.name, bounds);
    life.cleanup(() => { if (net.sized.get(app.name) === bounds) net.sized.delete(app.name); });
    life.setHold(() => false);
    // Deliver that exact held native packet through the actual receiver.
    // This explicit scheduler action makes no claim about outbox retry time.
    expect(await life.wait(() => app.stub.deliver({ to: creation.to, from: birth.from, n: creation.n, message: creation.message }))).toMatchObject({ answer: "recorded" });
    await driveFixture([R, D, M, A, G, app], life.wait);
    const scope = await life.wait(() => app.at());
    const nativeRoom = await life.wait(() => (D.object as unknown as { applicationRoom(): Promise<unknown> }).applicationRoom());
    expect(nativeRoom).toEqual({ directory, rules: await life.wait(() => A.at()) });
    const projection = await life.wait(() => (A.object as unknown as { applicationProjectionDeclaration(directory: import("@generalbusiness/dap-contract").ScopeRef, item: number, name: string): Promise<unknown> }).applicationProjectionDeclaration(directory, job, "root"));
    expect(projection).toMatchObject({ projection: packet.package.semantic.projections["root"] });
    const metadata = await life.wait(() => mcp.call("application_installation", { item: job }));
    expect(metadata.isError, JSON.stringify(metadata.structuredContent)).toBe(false);
    expect(metadata.structuredContent).toMatchObject({ item: job, state: "active", scope, semantic: packet.ids.semantic, release: packet.ids.release, presentation: packet.ids.presentation });
    expect(metadata.structuredContent["screen"]).toBe("https://scopes.test" + applicationScreenPath(directory.scope, job, packet.ids.presentation));
    // Invariant: the combined cohort serves the signed declared record from
    // its actual native installation, projection and membership standing.
    if (C === AC) {
      const views = new McpService({ ...port, custody: memoryStore(), declaredViews: { bytes: packet.bytes, release: packet.ids.release, item: job } });
      const opened = await life.wait(() => views.call("view_root", { view: "TEST-combined-device" }));
      expect(opened.isError, JSON.stringify(opened.structuredContent)).toBe(false);
      const detail = await life.wait(() => views.call("view_read", { view: "TEST-combined-device" }));
      expect(detail.isError, JSON.stringify(detail.structuredContent)).toBe(false);
      expect(detail.structuredContent).toMatchObject({ display: { status: "ready", card: {
        identity: { item: "0", kind: "root", revision: "1", subject: { scope: scope.scope, item: 0 }, at: { on: 1 } },
        declared: { kind: "record", scope, data: { scope, sources: { root: [{ id: 0, type: "root", state: "ready", revision: 1 }] } } },
      } } });
    }
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", refs: { scope } });
    // Invariant: the private screen renderer names this cohort's Membership pin,
    // so its production invitation reader accepts an actually issued link.
    // Parsing a link here is not enrollment; the native CLI owns that story.
    const screen = applicationScreenPath(directory.scope, job, packet.ids.presentation);
    const response = await life.wait(async () => (await applicationSandboxPage(new Request(port.service + screen + "_/context"), bindings))!);
    expect(response.status).toBe(200);
    const context = readApplicationScreenContext(await response.json(), readApplicationScreenAddress(screen)!, port.service);
    expect(context).toMatchObject({ directory, membership, scope, membershipDefinition: C.membership });
    const secret = b64url(new Uint8Array(32).fill(79)), handle = "@screen-join";
    const invitation = await life.wait(() => M.did(rita, "invite-member", { fields: { handle, role: "member", inviteEnds: timeOf(life.now() + 3_600_000), ...invitationIssueFields(C.membership, secret) } }));
    const link = { v: 1, service: port.service, definition: C.membership, repository: { directory, membership, rules: A.name, destination: G.name }, invitation, secret, handle };
    const encoded = (value: unknown) => "artroom-invite:" + b64url(utf8(canonicalize(value)));
    expect(readApplicationInvitation(context, encoded(link))).toMatchObject({ ok: true, seat: { directory, membership, handle } });
    expect(readApplicationInvitation(context, encoded({ ...link, definition: C === AC ? "platform:membership@7" : "platform:membership@8" })).ok).toBe(false);
    const device = await life.wait(() => app.did(rita, "commission", { fields: { kind: "heater" } }));
    const command = await life.wait(async () => app.did(rita, "command", { on: device, expected: await app.expected({ on: device }), fields: { target: "on", level: 80 } }));
    const commandFact = (await life.wait(() => app.sealed())).find(sealed => sealed.entry.seq === command);
    if (!commandFact) throw Error("Exact command fact required.");
    const facts = (await Promise.all([R, D, M, A, G, app].map(node => life.wait(() => node.sealed())))).flatMap(entries => entries.map(sealed => ({
      fact: { at: sealed.entry.at, seq: sealed.entry.seq, hash: sealed.hash }, entry: sealed.entry,
      under: sealed.entry.at.kind === "lane" ? deviceCommandFixture.name : `platform:${sealed.entry.at.kind}`,
    })));
    const origin = platform(C.destination)!.applicationPublicationOrigin!;
    expect(origin({ at: scope, seq: command, hash: commandFact.hash }, directory, await life.wait(() => G.at()), facts)).toBe(true);
    expect(platform("platform:destination@8")!.applicationPublicationOrigin!({ at: scope, seq: command, hash: commandFact.hash }, directory, await life.wait(() => G.at()), facts)).toBe(false);
    if (C === AC) for (const pin of ["platform:destination@10", "platform:destination@11"] as const) {
      expect(platform(pin)!.applicationPublicationOrigin!({ at: scope, seq: command, hash: commandFact.hash }, directory, await life.wait(() => G.at()), facts)).toBe(false);
    }
    for (let n = 0; n < bounds.scopeEntries - 7; n++) await life.wait(async () => app.did(rita, "report", { on: device, expected: await app.expected({ on: device }), fields: { reported: 20 } }));
    const checked = validateDefinition(deviceCommandFixture, bounds);
    if (!checked.ok) throw Error("The native fixture declaration must validate.");
    const inspect = () => life.wait(() => runInDurableObject(app.object, (_instance, state) => {
      const store = new SqliteStore({ exec: (query, ...bindings) => state.storage.sql.exec(query, ...bindings), transaction: work => state.storage.transactionSync(work) });
      const head = store.scope()!.head, entry = JSON.parse(store.stored(head.seq)!.bytes);
      return { head, owner: ownerReservations(CAPABILITY_CODE, store, checked.definition), reserved: reserved(store, checked.definition, entry.input, CAPABILITY_CODE),
        command: store.record(DEVICE_COMMAND, "command", [command]) };
    }));
    const full = await inspect();
    expect(full.head.seq + 1 + full.reserved.entries).toBe(bounds.scopeEntries);
    expect(full.owner.entries).toBe(1);
    expect(full.command).toMatchObject({ state: "open", values: { decided: 0 } });
    expect(await life.wait(async () => app.act(rita, "report", { on: device, expected: await app.expected({ on: device }), fields: { reported: 30 } })))
      .toMatchObject({ answer: "refused", reason: "scope-full" });
    expect(await inspect()).toEqual(full);
    // Drop the target action and evict held observations. The answer still
    // needs current identity, but its authority is the installed scope grant.
    await life.wait(async () => M.did(rita, "set-actions", { on: 0, expected: await M.expected({ on: 0 }), fields: { role: "admin", actions: ["membership.manage"] } }));
    await env.APPLICATION_CONTENT.delete(f.key);
    await life.wait(() => app.restart());
    expect(await life.wait(async () => app.act(rita, "command", { on: device, expected: await app.expected({ on: device }), fields: { target: "off", level: 0 } })))
      .toMatchObject({ answer: "refused", reason: "unauthorized" });
    const answered = await life.wait(() => mcp.call("prepare", { resource: app.name, capability: DEVICE_COMMAND, step: "answer",
      fields: { command: { at: scope, seq: command, hash: commandFact.hash }, outcome: "confirmed", description: "TEST device answered" }, idempotencyKey: "TEST-device-owner-answer" }));
    expect(answered.isError, JSON.stringify(answered.structuredContent)).toBe(false);
    expect(answered.structuredContent).toMatchObject({ step: { answer: { answer: "accepted" } } });
    expect(await life.wait(() => app.item(device))).toMatchObject({ values: { target: "on", level: 80, reported: 20, outcome: "confirmed" }, refs: { targetAt: command } });
    expect((await life.wait(() => app.last())).input).toMatchObject({ type: "preparation", authority: [{ actions: ["membership.manage"] }] });
    const closed = await inspect();
    expect(closed.head.seq).toBe(full.head.seq + 1);
    expect(closed.head.seq + 1 + closed.reserved.entries).toBe(bounds.scopeEntries);
    expect(closed.owner.entries).toBe(0);
    expect(closed.command).toMatchObject({ state: "confirmed", values: { decided: 1 } });
    const source = httpSource("https://scopes.test", { reader, fetch: (url, init) => life.wait(() => routed(url, init)) });
    // The actual SQLite counters above prove this child's 16-entry edge.
    // Replay has one bounds value for all dependencies, so use the native
    // defaults that Register and Destination ran with. This verifies facts,
    // code and proven authority, not the child's smaller fixture ceiling.
    for (const node of [A, D, app, M]) {
      const head = (await life.wait(() => node.summary())).at;
      const replay = await life.wait(() => verify(source, { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: node.name, head }));
      expect([replay.report.result, replay.why], JSON.stringify({ target: node.name, bounded: node === app, report: replay.report })).toEqual(["consistent", null]);
    }
  } finally { life.release(); }
});
