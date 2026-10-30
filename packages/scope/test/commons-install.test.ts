/** Actual Rules14, Directory22, Membership9 and application judgments in
 * SQLite. Package HTTP, Git fetch, clock and setup inspector are TEST fixtures.
 * No hosted service, provider credentials or deployment runs here. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { isSeed, scopeIdOf } from "@generalbusiness/dap-bytes";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, COMMONS_COHORT as C } from "@generalbusiness/dap-platform";
import { packApplication2 } from "@generalbusiness/dap-platform/application-v2";
import { secretSigner, signedDeviceApplicationInstall } from "@generalbusiness/dap-client";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { fixedSigner } from "./fixtures-core.ts";
import { rita } from "./repository.ts";
import { reader } from "./support.ts";
import { deviceApplicationPacket, applicationResolverFixture, applicationHttpPeer, applicationWorkerBindings,
  sessionRoom, dispatchFixture, driveFixture, effectFixture, drainScheduledFixture } from "./fixtures-native.ts";

async function packetFor(required: boolean) {
    const ordinary = await deviceApplicationPacket();
    const { creates: _creates, ...semantic } = ordinary.package.semantic;
    const { semantic: _semantic, ...presentation } = ordinary.package.presentation;
    return required ? await packApplication2({ name: "test.commons-native", version: "1",
      semantic: { ...semantic, host: { ...ordinary.package.semantic.host, requires: ["commons"] } },
      presentation,
    }, fixedSigner(81)) : ordinary;
}
for (const required of [false, true]) for (const present of [false, true]) {
  test(`native Commons install requirement ${required}, Directory ref present ${present}`, async () => {
    const packet = await packetFor(required);
    const room = await sessionRoom(C.register, undefined, { host: "none", namespace: "" }, {
      finish: "external", capture: life => life.setHold(envelope => !present && isSeed(envelope.to) && envelope.to.kind === "commons"),
    });
    const { life, R, D, children } = room, [M, A, G] = children;
    if (!M || !A || !G) { life.release(); return expect.fail("Actual native siblings required"); }
    const nodes = [R, D, ...children];
    try {
      expect((await A.summary()).value).toMatchObject({ definition: C.rules });
      // The absent case withholds only the actual Commons create delivery.
      // Its Directory keeps a genuine pending send; no native state is edited.
      if (!present) expect((await D.item(0)).refs["commons"]).toBeNull();
      if (present) {
        const send = (await D.entries())[0]!.sends.find(send => isSeed(send.to) && send.to.kind === "commons");
        if (!send || !isSeed(send.to)) return expect.fail("Native Commons creation send required");
        const Q = life.platform(scopeIdOf(send.to)); nodes.push(Q);
        await dispatchFixture(nodes, life.wait);
        expect((await D.item(0)).refs["commons"]).toEqual(await Q.at());
      }
      const member = await M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) });
      await M.did(rita, "first-key", { fields: { member }, expected: await M.expected({ roster: 0, member }) });
      const fetched = await applicationResolverFixture("sha1", undefined, {}, undefined, packet);
      const peer = applicationHttpPeer(fetched);
      const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(fetched.trust), env.SCOPE_INDEX);
      life.applicationTrust(() => bindings.APPLICATION_TRUST);
      for (const node of [D, A]) {
        life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch));
        await life.wait(() => node.restart());
      }
      const owner = { membership: await M.at(), member: "@rita" as const };
      const envelope = await signedDeviceApplicationInstall(secretSigner(rita.secret), packet.bytes,
        { rules: await A.at(), uri: fetched.uri, release: packet.ids.release, roles: ["admin"], values: {}, owner },
        { now: life.now(), idempotencyKey: `TEST-commons-${required}-${present}` });
      const submitted = await A.stub.submit(envelope.signed, [], envelope.beside);
      expect(submitted).toMatchObject({ answer: "accepted" });
      if (submitted.answer !== "accepted") return expect.fail("Signed Rules14 install required");
      const job = submitted.receipt.fact.seq;
      expect((await A.item(job)).values["requirements"]).toEqual({ destination: false, archive: false, commons: required });
      await effectFixture([A], life.wait); await dispatchFixture(nodes, life.wait);
      const staging = (await A.entries()).flatMap(entry => entry.sends).find(send => send.message.class === "request"
        && (send.message.body as { message?: string }).message === "application-stage");
      expect(staging?.message).toMatchObject({ body: { fields: { needsArchive: false, needsCommons: required } } });
      const catalog = (await D.summary()).value.items.filter(item => item.type === "application-catalog");
      if (required && !present) {
        expect(await (A.object as unknown as { items(reader: string, type: string): Promise<unknown> }).items(reader, "installation")).toMatchObject({ ok: true, value: [{ id: job, state: "refused" }] });
        expect(catalog).toEqual([]);
        expect((await D.entries()).some(entry => entry.input.type === "delivery" && "decision" in entry.input && entry.input.decision === "refused"
          && entry.input.reason?.name === "commons-missing")).toBe(true);
        return;
      }
      expect(catalog).toMatchObject([{ values: { definition: packet.package.semantic.entry } }]);
      const create = (await D.entries()).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.kind === "lane");
      if (!create || !isSeed(create.to)) return expect.fail("Native application creation required");
      const app = life.platform(scopeIdOf(create.to)); nodes.push(app);
      await driveFixture(nodes, life.wait);
      expect(await A.item(job)).toMatchObject({ state: "active", refs: { scope: await app.at() } });
      const installation = await (A.stub as unknown as { applicationInstallation(directory: ScopeRef, item: number): Promise<unknown> }).applicationInstallation(await D.at(), job);
      expect(installation).toMatchObject({ membershipDefinition: C.membership });
      const device = await app.did(rita, "commission", { fields: { kind: "heater" } });
      expect(await app.item(device)).toMatchObject({ type: "device", values: { kind: "heater" } });
    } finally {
      life.setHold(() => false);
      await drainScheduledFixture(() => life.platforms(), life.wait);
      life.release();
    }
  });
}

test("Rules10 still refuses a Commons requirement after the shared package codec recognizes it", async () => {
  const packet = await packetFor(true), room = await sessionRoom(ARCHIVE_DEVICE_APPLICATION_COHORT.register);
  const { life } = room;
  const [M, A] = room.children;
  if (!M || !A) { life.release(); return expect.fail("Actual legacy siblings required"); }
  try {
    const member = await M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) });
    await M.did(rita, "first-key", { fields: { member }, expected: await M.expected({ roster: 0, member }) });
    const before = (await A.summary()).at;
    const envelope = await signedDeviceApplicationInstall(secretSigner(rita.secret), packet.bytes,
      { rules: await A.at(), uri: `git+https://git.example/test.git/@${"a".repeat(40)}/application.dap.json`,
        release: packet.ids.release, roles: ["admin"], values: {}, owner: { membership: await M.at(), member: "@rita" } },
      { now: life.now(), idempotencyKey: "TEST-old-rules10-commons-refusal" });
    expect(await A.stub.submit(envelope.signed, [], envelope.beside)).toMatchObject({ answer: "refused", reason: "bad-field", name: "invalid-application-package" });
    expect((await A.summary()).at).toEqual(before);
  } finally {
    await drainScheduledFixture(() => life.platforms(), life.wait);
    life.release();
  }
});
