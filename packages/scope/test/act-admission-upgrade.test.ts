/** AD-1: act admission in an application scope reads its installation item N's current state and release.
 * Genuine native Register 29, Directory 28, Membership 14, Rules 16 and Destination 21, the MCP install, real
 * `upgrade-application` acts with their host fetches, and the real Worker's act admission. Repository creation,
 * Git/package HTTP, clock and setup reads are TEST fixtures. */
import { env, runDurableObjectAlarm } from "cloudflare:test";
import { expect, test } from "vitest";
import { isSeed, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { UPGRADE_COHORT as C } from "@generalbusiness/dap-platform";
import { memoryStore, secretSigner, signedApplicationInstall2 } from "@generalbusiness/dap-client";
import { McpService, type ServerPort } from "@generalbusiness/dap-mcp";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { APPLICATION_ACT_ADMISSION_REFRESH_MS } from "../src/applications/act-admission.ts";
import { applicationOwnedScopesPacket, applicationWorkerBindings, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture } from "./fixtures-native.ts";
import { rita, routed } from "./repository.ts";
import { soon } from "./net.ts";
import { roomArchiveWiring } from "./worker.ts";
import { ScriptedHost } from "./support/archive-driver.ts";
import { roomArchivePackages } from "../../../apps/room/archive-packages.ts";
import { nativeArchivePolicies } from "../../../apps/room/archive-policy.ts";

type Fixture = Awaited<ReturnType<typeof applicationResolverFixture>>;

// `archive`: the old root runs the production archive wiring with U2's real policy owner, `roomArchivePackages`, which reads
// N's proof from the real Rules. Its target and provider are TEST stand-ins: the pass ends before any provider work.
test.each([{ archive: false }, { archive: true }])("AD-1 (archive: $archive): after an in-place upgrade the scope acts under N's current release; after a replace it refuses application-replaced", async ({ archive }) => {
  const first = await applicationOwnedScopesPacket("test-ad1-root", "1"), moved = await applicationOwnedScopesPacket("test-ad1-root", "2");
  const other = await applicationOwnedScopesPacket("test-ad1-other", "1");
  // The in-place release keeps the semantic identifier; the replacing release changes it.
  expect(moved.packet.ids.semantic).toBe(first.packet.ids.semantic);
  expect(moved.packet.ids.release).not.toBe(first.packet.ids.release);
  expect(other.packet.ids.semantic).not.toBe(first.packet.ids.semantic);
  const room = await sessionRoom(C.register), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("The upgrade family needs its three siblings.");
  const fixtures: Fixture[] = [];
  for (const one of [first, moved, other]) fixtures.push(await applicationResolverFixture("sha1", undefined, {}, undefined, one.packet));
  const [f1, f2, f3] = fixtures as [Fixture, Fixture, Fixture];
  let packageFetch = applicationHttpPeer(f1).fetch;
  const fetchPackage = (request: Request) => packageFetch(request);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify([...f1.trust, ...f2.trust, ...f3.trust]), env.SCOPE_INDEX);
  life.applicationTrust(() => bindings.APPLICATION_TRUST);
  let wired: string | null = null;
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, fetchPackage)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at()), rules = await life.wait(() => A.at());
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use the native installation."); } },
      applicationFetch: fetchPackage, applicationTrust: bindings.APPLICATION_TRUST, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const installed = await life.wait(() => new McpService(port).call("install_application", { uri: f1.uri, release: first.packet.ids.release, roles: ["admin"], values: {}, idempotencyKey: "TEST-ad1-install" }));
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "accepted" });
    const job = Number(installed.structuredContent["item"]);
    const nodes = [R, D, M, A, G];
    await effectFixture([A], life.wait); await dispatchFixture(nodes, life.wait);
    const created = async (rootId: string) => (await D.entries()).flatMap(entry => entry.sends).filter(one => isSeed(one.to) && one.to.definition === rootId).at(-1);
    const rootSend = await life.wait(() => created(first.rootId));
    if (!rootSend || !isSeed(rootSend.to)) throw Error("The native Directory must create the root.");
    const rootName = scopeIdOf(rootSend.to);
    if (archive) {
      wired = rootName;
      roomArchiveWiring.set(rootName, (given, sql, bounds) => {
        const policies = new Map(nativeArchivePolicies()), owner = roomArchivePackages(given, sql, env.PLATFORM, bindings, policies, bounds);
        return { production: "room-binding", provider: new ScriptedHost("sha1"), policies: { registry: policies }, admit: () => true,
          preparePolicies: owner.prepare, policyCurrent: owner.current, target: { resolve: async () => null } };
      });
    }
    const root = life.platform(rootName); nodes.push(root); await driveFixture(nodes, life.wait);
    // The Directory's creation delivery constructed the root object; a new object reads the archive wiring.
    if (archive) await life.wait(() => root.restart());
    const childSend = (await life.wait(() => root.entries())).flatMap(entry => entry.sends).find(one => isSeed(one.to));
    if (childSend && isSeed(childSend.to)) { nodes.push(life.platform(scopeIdOf(childSend.to))); await driveFixture(nodes, life.wait); }
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", values: { release: first.packet.ids.release } });
    const bump = async () => life.wait(async () => root.act(rita, "bump", { on: 0, expected: await root.expected({ on: 0 }) }));
    expect((await bump()).answer).toBe("accepted");

    // One upgrade-application act, signed as the client signs an install, and its host fetch and pipeline.
    const upgrade = async (packet: typeof first.packet, f: Fixture, inPlace: boolean, key: string) => {
      const prepared = await signedApplicationInstall2(secretSigner(rita.secret), packet.bytes, { rules, uri: f.uri, release: packet.ids.release, roles: ["admin"], values: {} });
      const { roles: _roles, values: _values, ...kept } = prepared.signed.intent.fields;
      const signed = signIntent({ v: 1, to: rules, actor: rita.key, kind: "upgrade-application", on: job, expected: await A.expected({ on: job }),
        fields: inPlace ? kept : prepared.signed.intent.fields, idempotencyKey: key, notAfter: soon(60) }, rita.secret);
      packageFetch = applicationHttpPeer(f).fetch;
      expect(await life.wait(() => A.stub.submit(signed, [], prepared.beside))).toMatchObject({ answer: "accepted" });
      await effectFixture([A], life.wait); await driveFixture(nodes, life.wait);
    };

    // r2: in place. N moves to release 2, and the trust list then drops release 1.
    await upgrade(moved.packet, f2, true, "TEST-ad1-in-place");
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", values: { release: moved.packet.ids.release } });
    bindings.APPLICATION_TRUST = JSON.stringify([...f2.trust, ...f3.trust]);
    life.advance(APPLICATION_ACT_ADMISSION_REFRESH_MS);
    expect((await bump()).answer, "an act under N's current trusted release is admitted after the birth release leaves trust").toBe("accepted");
    // Control: without N's current release in trust, the scope refuses as revoked.
    bindings.APPLICATION_TRUST = JSON.stringify([...f1.trust, ...f3.trust]);
    expect(await bump()).toMatchObject({ answer: "refused", reason: "application-revoked" });
    bindings.APPLICATION_TRUST = JSON.stringify([...f2.trust, ...f3.trust]);
    expect((await bump()).answer).toBe("accepted");

    // r1: replace. The successor becomes active and N ends replaced.
    const viewed = life.now();
    await upgrade(other.packet, f3, false, "TEST-ad1-replace");
    const successorSend = await life.wait(() => created(other.rootId));
    if (!successorSend || !isSeed(successorSend.to)) throw Error("The native Directory must create the successor root.");
    const successor = life.platform(scopeIdOf(successorSend.to)); nodes.push(successor); await driveFixture(nodes, life.wait);
    // A final item leaves the summary's live items; its end is the state effect.
    expect((await life.wait(() => A.entries())).flatMap(entry => entry.effects)).toContainEqual(expect.objectContaining({ effect: "state", item: job, state: "replaced" }));
    if (archive) {
      // r4: inside the refresh interval the cached view still says active. The archive pass reads N as replaced, and the
      // same object then refuses every new act at once.
      expect(life.now() - viewed).toBeLessThan(APPLICATION_ACT_ADMISSION_REFRESH_MS);
      await life.wait(() => runDurableObjectAlarm(root.object));
    } else {
      // Without an archive, the cached view answers until the refresh interval ends; then the old scope refuses every new act.
      life.advance(APPLICATION_ACT_ADMISSION_REFRESH_MS);
    }
    const before = await life.wait(() => root.sealed());
    const refused = await bump();
    expect(refused, "a fresh act in the scope of a replaced N refuses").toEqual({ answer: "refused", reason: "application-replaced",
      judgedAt: { seq: before.at(-1)!.entry.seq, hash: before.at(-1)!.hash } });
    expect(await life.wait(() => root.sealed())).toHaveLength(before.length);
    // `replaced` is final: a later act and a new incarnation refuse at once, with no clock step.
    expect(await bump()).toMatchObject({ answer: "refused", reason: "application-replaced" });
    await life.wait(() => root.restart());
    expect(await bump()).toMatchObject({ answer: "refused", reason: "application-replaced" });
    // Control: the successor's own scope acts under its active installation.
    expect((await life.wait(async () => successor.act(rita, "bump", { on: 0, expected: await successor.expected({ on: 0 }) }))).answer).toBe("accepted");
  } finally { if (wired) roomArchiveWiring.delete(wired); life.release(); }
});
