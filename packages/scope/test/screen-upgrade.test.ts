/** U3: after an in-place upgrade of installation N, the screen host for N serves N's current presentation, with the
 * descriptor that named N's first presentation. Genuine native Register 29, Directory 28, Membership 14, Rules 16 and
 * Destination 21, the MCP install, a real `upgrade-application` act with its host fetch, the production sandbox Worker,
 * the room's `ApplicationScreenService` and the browser client's screen context load. Repository creation, Git/package
 * HTTP, the clock and setup reads are TEST fixtures, as in act-admission-upgrade.test.ts. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { isSeed, scopeIdOf, signIntent, unb64url } from "@generalbusiness/dap-bytes";
import { UPGRADE_COHORT as C } from "@generalbusiness/dap-platform";
import { loadApplicationScreenContext, memoryStore, secretSigner, signedApplicationInstall2 } from "@generalbusiness/dap-client";
import { applicationScreenPath, readApplicationScreenHost } from "@generalbusiness/dap-client/application";
import { McpService, type ServerPort } from "@generalbusiness/dap-mcp";
import sandbox, { type SandboxEnv } from "../../../apps/sandbox/worker.ts";
import { ApplicationScreenService, outsideOf as hostOutside } from "../src/worker.ts";
import { applicationOwnedScopesPacket, applicationWorkerBindings, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture } from "./fixtures-native.ts";
import { rita, routed } from "./repository.ts";
import { soon } from "./net.ts";

type Fixture = Awaited<ReturnType<typeof applicationResolverFixture>>;

test("after an in-place upgrade the screen host serves N's new presentation under its first descriptor, and no longer the old one", async () => {
  const first = await applicationOwnedScopesPacket("test-u3-screen", "1"), moved = await applicationOwnedScopesPacket("test-u3-screen", "2", "TkVYVA");
  expect(moved.packet.ids.semantic).toBe(first.packet.ids.semantic);
  expect(moved.packet.ids.presentation).not.toBe(first.packet.ids.presentation);
  const room = await sessionRoom(C.register), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("The upgrade family needs its three siblings.");
  const f1: Fixture = await applicationResolverFixture("sha1", undefined, {}, undefined, first.packet);
  const f2: Fixture = await applicationResolverFixture("sha1", undefined, {}, undefined, moved.packet);
  let packageFetch = applicationHttpPeer(f1).fetch;
  const fetchPackage = (request: Request) => packageFetch(request);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify([...f1.trust, ...f2.trust]), env.SCOPE_INDEX);
  life.applicationTrust(() => bindings.APPLICATION_TRUST);
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, fetchPackage)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at()), rules = await life.wait(() => A.at());
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use the native installation."); } },
      applicationFetch: fetchPackage, applicationTrust: bindings.APPLICATION_TRUST, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const installed = await life.wait(() => new McpService(port).call("install_application", { uri: f1.uri, release: first.packet.ids.release, roles: ["admin"], values: {}, idempotencyKey: "TEST-u3-install" }));
    const job = Number(installed.structuredContent["item"]);
    const nodes = [R, D, M, A, G];
    await effectFixture([A], life.wait); await dispatchFixture(nodes, life.wait);
    const rootSend = await life.wait(async () => (await D.entries()).flatMap(entry => entry.sends).filter(one => isSeed(one.to) && one.to.definition === first.rootId).at(-1));
    if (!rootSend || !isSeed(rootSend.to)) throw Error("The native Directory must create the root.");
    nodes.push(life.platform(scopeIdOf(rootSend.to))); await driveFixture(nodes, life.wait);
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", values: { presentation: first.packet.ids.presentation } });

    // The descriptor names N at its first presentation; the room and the sandbox both hold it.
    const host = readApplicationScreenHost({ v: 1, screenOrigin: "https://u3-screen.inguz.space", roomOrigin: "https://u3-room.test", directory: directory.scope, item: job, presentation: first.packet.ids.presentation });
    const background: Promise<unknown>[] = [], execution = { waitUntil: (work: Promise<unknown>) => { background.push(work); } }; // ExecutionContext STAND-IN.
    const service = new ApplicationScreenService(execution as never, { ...bindings, get APPLICATION_TRUST() { return bindings.APPLICATION_TRUST; },
      PUBLIC_ORIGIN: host.roomOrigin, APPLICATION_SCREEN_HOSTS: JSON.stringify([host]) } as never);
    const screens: SandboxEnv = { SCREEN_HOSTS: JSON.stringify([{ host, service: "ROOM" }]), ROOM: service as never };
    const send = (url: string) => sandbox.fetch(new Request(url), screens, execution);
    const page = (presentation: string) => host.screenOrigin + applicationScreenPath(directory.scope, job, presentation as never) + "index.html";
    const asset = (packet: typeof first.packet) => unb64url(packet.package.presentation.assets.find(one => one.path === "index.html")!.bytes);
    const before = await send(page(first.packet.ids.presentation));
    expect(before.status).toBe(200); expect(new Uint8Array(await before.arrayBuffer())).toEqual(asset(first.packet));

    // One in-place upgrade-application act, signed as the client signs it, and its host fetch.
    const prepared = await signedApplicationInstall2(secretSigner(rita.secret), moved.packet.bytes, { rules, uri: f2.uri, release: moved.packet.ids.release, roles: ["admin"], values: {} });
    const { roles: _roles, values: _values, ...fields } = prepared.signed.intent.fields;
    const signed = signIntent({ v: 1, to: rules, actor: rita.key, kind: "upgrade-application", on: job, expected: await A.expected({ on: job }), fields, idempotencyKey: "TEST-u3-in-place", notAfter: soon(60) }, rita.secret);
    packageFetch = applicationHttpPeer(f2).fetch;
    expect(await life.wait(() => A.stub.submit(signed, [], prepared.beside))).toMatchObject({ answer: "accepted" });
    await effectFixture([A], life.wait); await driveFixture(nodes, life.wait);
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", values: { presentation: moved.packet.ids.presentation } });

    // The same hostname now serves the new presentation, and the old presentation's path answers 404.
    const after = await send(page(moved.packet.ids.presentation));
    expect(after.status, "a screen read after an in-place upgrade serves the new presentation").toBe(200);
    expect(new Uint8Array(await after.arrayBuffer())).toEqual(asset(moved.packet));
    expect((await send(page(first.packet.ids.presentation))).status).toBe(404);
    // The browser client binds the new presentation's context to the same descriptor.
    const context = await loadApplicationScreenContext(page(moved.packet.ids.presentation), { fetch: async url => await send(url) as never });
    expect(context).toMatchObject({ item: job, ids: { presentation: moved.packet.ids.presentation } });
    await Promise.all(background);
  } finally { life.release(); }
});
