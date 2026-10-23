/** Native Membership, Rules, Directory, application, command and SQLite.
 * Host/Git/package HTTP, clock and setup reads are TEST fixtures. Manual
 * read tokens prove no production admission, export or provider action. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import type { PlatformDefinition } from "@generalbusiness/dap-contract";
import { DEVICE_COMMAND } from "@generalbusiness/dap-contract";
import { isSeed, scopeIdOf } from "@generalbusiness/dap-bytes";
import { DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_APPLICATION_COHORT, platform } from "@generalbusiness/dap-platform";
import { secretSigner, signedDeviceApplicationInstall } from "@generalbusiness/dap-client";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { httpSource, verify } from "@generalbusiness/dap-replay";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { CAPABILITY_CODE } from "../src/ports.ts";
import { ArchiveBudget } from "../src/archive-budget.ts";
import { fixtureArchiveTargetIn } from "../src/archive-target.ts";
import { mintSession, readerOf } from "../src/sessions.ts";
import { deviceApplicationPacket, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture, reader, applicationWorkerBindings } from "./fixtures-native.ts";
import { rita, routed } from "./repository.ts";

async function fixture(register: PlatformDefinition) {
  const packet = await deviceApplicationPacket(true), room = await sessionRoom(register);
  const { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) { life.release(); throw Error("Exact native application siblings required."); }
  try {
    const seat = await life.wait(async () => M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
    const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const owner = { membership, member: "@rita" as const }, signer = secretSigner(rita.secret);
    const prepare = async (key: string) => signedDeviceApplicationInstall(signer, packet.bytes,
      { rules: await A.at(), uri: f.uri, release: packet.ids.release, roles: ["admin"], values: {}, owner },
      { now: life.now(), idempotencyKey: key });
    const port: ServerPort = { service: "https://scopes.test", signer, custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Native discovery only."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)),
    };
    const installations = () => life.wait(() => (A.object as unknown as { items(reader: unknown, type: string): Promise<unknown> }).items(reader, "installation"));
    return { room, life, R, D, M, A, G, owner, directory, prepare, installations, mcp: new McpService(port) };
  } catch (error) { life.release(); throw error; }
}

test("the shipped Device-only cohort refuses a signed archive requirement before recording an install", async () => {
  const f = await fixture(DEVICE_APPLICATION_COHORT.register), { life, A, M, D } = f;
  try {
    const actions = (await life.wait(() => M.item(0))).values["memberActions"];
    const envelope = await f.prepare("TEST-device-only-archive-required");
    expect(await life.wait(() => A.stub.submit(envelope.signed, [], envelope.beside)))
      .toMatchObject({ answer: "refused", reason: "bad-field", name: "invalid-application-package" });
    expect(await f.installations())
      .toMatchObject({ ok: true, value: [] });
    expect((await life.wait(() => M.item(0))).values["memberActions"]).toEqual(actions);
    expect((await life.wait(() => D.entries())).flatMap(entry => entry.sends).filter(send => isSeed(send.to) && send.to.kind === "lane")).toHaveLength(0);
  } finally { life.release(); }
});

test("one combined room refuses before archive binding, keeps the exact retry refused, then installs and answers a device command after binding", async () => {
  const f = await fixture(ARCHIVE_DEVICE_APPLICATION_COHORT.register), { life, R, D, M, A, G } = f;
  try {
    const actions = (await life.wait(() => M.item(0))).values["memberActions"];
    const first = await f.prepare("TEST-combined-archive-unbound");
    const submitted = await life.wait(() => A.stub.submit(first.signed, [], first.beside));
    expect(submitted).toMatchObject({ answer: "accepted" });
    if (submitted.answer !== "accepted") return expect.fail("The signed install request must be recorded.");
    const refused = submitted.receipt.fact.seq;
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    expect(await f.installations()).toMatchObject({ ok: true, value: [{ id: refused, state: "refused", values: {
      reason: "archive-unavailable", requirements: { destination: false, archive: true },
    } }] });
    expect((await life.wait(() => M.item(0))).values["memberActions"]).toEqual(actions);
    const creations = async () => (await life.wait(() => D.entries())).flatMap(entry => entry.sends).filter(send => isSeed(send.to) && send.to.kind === "lane");
    expect(await creations()).toHaveLength(0);
    await life.wait(async () => D.did(rita, "bind-archive", { on: 0, expected: await D.expected({ on: 0 }), fields: { archive: "journal" } }));
    expect(await life.wait(() => D.item(0))).toMatchObject({ values: { archive: "journal" } });
    const head = (await life.wait(() => A.summary())).at;
    expect(await life.wait(() => A.stub.submit(first.signed, [], first.beside)))
      .toMatchObject({ answer: "accepted", receipt: { fact: { seq: refused } } });
    expect((await life.wait(() => A.summary())).at).toEqual(head);
    expect(await f.installations()).toMatchObject({ ok: true, value: [{ id: refused, state: "refused", values: { reason: "archive-unavailable" } }] });
    const next = await f.prepare("TEST-combined-archive-bound");
    const installed = await life.wait(() => A.stub.submit(next.signed, [], next.beside));
    expect(installed).toMatchObject({ answer: "accepted" });
    if (installed.answer !== "accepted") return expect.fail("The new bound request must be recorded.");
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const made = await creations(); expect(made).toHaveLength(1);
    const birth = made[0]!;
    if (!isSeed(birth.to)) return expect.fail("The application needs its actual native creation seed.");
    expect(birth.message).toMatchObject({ body: { creationContext: { v: 2, delegate: true, deviceCommand: { owner: f.owner } } } });
    const seed = birth.to;
    const app = life.platform(scopeIdOf(seed));
    await driveFixture([R, D, M, A, G, app], life.wait);
    expect(await life.wait(() => A.item(installed.receipt.fact.seq))).toMatchObject({ state: "active" });
    const scope = await life.wait(() => app.at());
    const device = await life.wait(() => app.did(rita, "commission", { fields: { kind: "heater" } }));
    const command = await life.wait(async () => app.did(rita, "command", { on: device, expected: await app.expected({ on: device }), fields: { target: "on", level: 80 } }));
    const sealed = (await life.wait(() => app.sealed())).find(row => row.entry.seq === command)!;
    expect(sealed).toBeDefined();
    const answer = await life.wait(() => f.mcp.call("prepare", { resource: app.name, capability: DEVICE_COMMAND, step: "answer",
      fields: { command: { at: scope, seq: command, hash: sealed.hash }, outcome: "confirmed", description: "TEST combined room answer" }, idempotencyKey: "TEST-combined-device-answer" }));
    expect(answer.isError, JSON.stringify(answer.structuredContent)).toBe(false);
    expect(answer.structuredContent).toMatchObject({ step: { answer: { answer: "accepted" } } });
    expect(await life.wait(() => app.item(device))).toMatchObject({ values: { target: "on", level: 80, outcome: "confirmed" }, refs: { targetAt: command } });
    const read = readerOf(mintSession(f.room.sessions, { ...f.room.claims, reads: ["summary", "items"] }));
    const target = fixtureArchiveTargetIn(env.PLATFORM, { fixture: "archive-target-reader", value: read });
    expect(await life.wait(() => target.resolve(scope, seed, new ArchiveBudget())))
      .toEqual((await life.wait(() => D.item(0))).values["repository"]);
    const source = httpSource("https://scopes.test", { reader, fetch: (url, init) => life.wait(() => routed(url, init)) });
    for (const node of [A, D, M, app]) {
      const head = (await life.wait(() => node.summary())).at;
      const replay = await life.wait(() => verify(source, { mode: "replay", platform, capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE, grants: "proven", scope: node.name, head }));
      expect([replay.report.result, replay.why], JSON.stringify(replay.report)).toEqual(["consistent", null]);
    }
  } finally { life.release(); }
});
