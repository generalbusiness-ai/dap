/** Native archive cohorts, MCP install/custody, creation, sessions and screen
 * metadata. Package/Git peer, clock, scheduler, hosting trust and setup
 * inspector are TEST fixtures. No deployment or archive export is claimed. */
import { env } from "cloudflare:test";
import { expect, test } from "vitest";
import { isScopeRef, isSeed, scopeIdOf } from "@generalbusiness/dap-bytes";
import { ARCHIVE_APPLICATION_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT } from "@generalbusiness/dap-platform";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { applicationScreenPath, readApplicationScreenAddress, readApplicationScreenContext, secretSigner } from "@generalbusiness/dap-client";
import { applicationSandboxPage } from "../src/applications/route.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationOwnedScopesPacket, applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture, applicationWorkerBindings } from "./fixtures-native.ts";
import { rita, routed } from "./repository.ts";

test.each([ARCHIVE_APPLICATION_COHORT, ARCHIVE_DECLARED_APPLICATION_COHORT])("native %s MCP install and screen retain Membership8, then bind the running application later", async cohort => {
  const declared = cohort.rules === ARCHIVE_DECLARED_APPLICATION_COHORT.rules;
  const v2 = declared ? await applicationOwnedScopesPacket() : null;
  const { life, R, D, children } = await sessionRoom(cohort.register), [M, A, G] = children;
  if (!M || !A || !G) throw Error("The native archive siblings are required.");
  const f = await applicationResolverFixture("sha1", undefined, { admin: ["counting.control"] }, undefined, v2?.packet), peer = applicationHttpPeer(f);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Use the native installation."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const mcp = new McpService(port);
    const installed = await life.wait(() => mcp.call("install_application", { uri: f.uri, release: f.packet.ids.release, roles: ["admin"], values: declared ? {} : { target: 7 }, idempotencyKey: "TEST-archive-mcp-install" }));
    expect(installed.structuredContent, JSON.stringify(installed.structuredContent)).toMatchObject({ answer: "accepted", phase: "recorded" });
    const job = Number(installed.structuredContent["item"]);
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const send = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.definition === f.packet.package.semantic.entry);
    if (!send || !isSeed(send.to)) throw Error("MCP install must cause a genuine native application birth.");
    const application = life.platform(scopeIdOf(send.to)); await driveFixture([R, D, M, A, G, application], life.wait);
    if (declared) {
      const childSend = (await life.wait(() => application.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.kind === "lane");
      if (!childSend || !isSeed(childSend.to)) throw Error("The installed declared root must create its child.");
      await driveFixture([R, D, M, A, G, application, life.platform(scopeIdOf(childSend.to))], life.wait);
    }
    const current = await life.wait(() => mcp.call("application_installation", { item: job }));
    expect(current.structuredContent).toMatchObject({ state: "active", scope: await application.at() });
    const base = applicationScreenPath(D.name, job, f.packet.ids.presentation);
    const response = await life.wait(async () => (await applicationSandboxPage(new Request(port.service + base + "_/context"), bindings))!);
    expect(response.status).toBe(200);
    const context = readApplicationScreenContext(await response.json(), readApplicationScreenAddress(base + "_/context")!, port.service);
    expect(context.membershipDefinition).toBe(cohort.membership); expect(context.membership).toEqual(membership);
    expect(context.rules).toEqual(await A.at()); expect(context.scope).toEqual(await application.at());
    if (declared) {
      const views = new McpService({ ...port, custody: memoryStore(), declaredViews: { bytes: f.packet.bytes, release: f.packet.ids.release, item: job } });
      expect((await life.wait(() => views.call("view_root", { view: "root" }))).structuredContent).toMatchObject({ status: "ready" });
    }
    const before = (await life.wait(() => application.summary())).at;
    expect((await life.wait(() => application.entries()))[0]!.input.type).toBe("genesis");
    await life.wait(async () => D.did(rita, "bind-archive", { on: 0, fields: { archive: "journal" }, expected: await D.expected({ on: 0 }) }));
    expect((await life.wait(() => D.item(0))).values["archive"]).toBe("journal");
    expect((await life.wait(() => application.summary())).at).toEqual(before);
    expect(isScopeRef(context.directory)).toBe(true);
  } finally { life.release(); }
}, 30_000);
