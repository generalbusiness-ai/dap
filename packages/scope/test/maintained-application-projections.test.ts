/** Complete maintained packages installed on the real declared cohort, with
 * issued sessions, native ownership, SQLite and the production browser read
 * adapters. Git/package HTTP host, clock, scheduler and private browser stores
 * are explicit fixtures. No browser, provider effect or deployment runs. */
import { env } from "cloudflare:test";
import { expect, inject, onTestFinished, test, vi } from "vitest";
import { canonicalize, factRefOf, isRecord, isScopeRef, isSeed, same, scopeIdOf, unb64url } from "@generalbusiness/dap-bytes";
import { readPublishedApplicationPackage2 } from "@generalbusiness/dap-bytes/application-v2";
import { DECLARED_APPLICATION_COHORT as C } from "@generalbusiness/dap-platform";
import { McpService, memoryStore, type ServerPort } from "@generalbusiness/dap-mcp";
import { ScopeHandle, httpTransport, requestSession, secretSigner, sessionRequest, type Fetch, type Observation } from "@generalbusiness/dap-client";
import nativeWorker from "../../../apps/room/worker.ts";
import { nativeGateway, type CommandStore } from "../../../apps/counter/browser/client.ts";
import { lendingGateway } from "../../../examples/lending/browser/client.ts";
import type { Kept } from "../../../examples/lending/browser/custody.ts";
import { outsideOf as hostOutside } from "../src/worker.ts";
import { applicationResolverFixture, applicationHttpPeer, sessionRoom, dispatchFixture, driveFixture, effectFixture, applicationWorkerBindings } from "./fixtures-native.ts";
import { rita, routed } from "./repository.ts";
import { soon } from "./net.ts";
import { TEST_DEPLOYMENT } from "./worker.ts";
import type {} from "./support/maintained-applications.ts";

/** Permanent assertion context: public state only, no view, credentials or raw reply. */
const readContext = (phase: string, state: { status: string; reason?: string }): string => JSON.stringify({
  phase, status: state.status,
  ...(state.status === "behind" && typeof state.reason === "string"
    ? { reason: state.reason.slice(0, 512), reasonTruncated: state.reason.length > 512 } : {}),
});

test.each(["counter", "lending"] as const)("maintained %s package installs and its browser adapter reads native declared state", async name => {
  const captured = inject("maintainedApplications")[name], bytes = unb64url(captured.bytes);
  if (!bytes) throw Error("The maintained source packet was not captured.");
  const packet = readPublishedApplicationPackage2(bytes, captured.release);
  const room = await sessionRoom(C.register), { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) throw Error("The declared cohort needs its three siblings.");
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const bindings = applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX);
  const now = life.now(), date = vi.spyOn(Date, "now").mockReturnValue(now);
  let dispose = () => {};
  let observation: Observation | undefined;
  onTestFinished(async () => { dispose(); await observation?.done; date.mockRestore(); });
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => hostOutside(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const port: ServerPort = { service: "https://scopes.test", signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now,
      config: { read: async () => ({ service: "https://scopes.test", repository: { directory, membership, rules: A.name, destination: G.name } }), addRoot: async () => { throw Error("Discover the installed native scope."); } },
      applicationFetch: peer.fetch, fetch: (url, init) => life.wait(() => routed(url, init)) };
    const mcp = new McpService(port);
    const installed = await life.wait(() => mcp.call("install_application", { uri: f.uri, release: packet.ids.release, roles: ["admin", "member", "agent"], values: name === "counter" ? { target: 7 } : {}, idempotencyKey: `TEST-maintained-${name}` }));
    expect(installed.structuredContent).toMatchObject({ answer: "accepted", phase: "recorded" });
    const job = Number(installed.structuredContent["item"]);
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const create = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.kind === "lane");
    if (!create || !isSeed(create.to)) throw Error("The real directory must create the application lane.");
    const app = life.platform(scopeIdOf(create.to)); await driveFixture([R, D, M, A, G, app], life.wait);
    const scope = await life.wait(() => app.at());
    expect(await life.wait(() => A.item(job))).toMatchObject({ state: "active", refs: { scope } });
    const installation = { scope, directory, item: job, definition: packet.package.semantic.entry };
    const identity = { origin: "https://scopes.test", deployment: TEST_DEPLOYMENT, scope, definition: installation.definition, membership, member: { membership, member: "@rita" as const }, publicKey: rita.key };
    const paths: string[] = [];
    const fetch: Fetch = (url, init) => {
      const path = new URL(url).pathname; paths.push(path);
      if (path === `/v1/scopes/${app.name}`) throw Error("The maintained browser must not read an application Summary.");
      return nativeWorker.fetch(new Request(url, init), bindings);
    };
    const issued = await life.owner.required(() => requestSession(identity.origin, M.name, sessionRequest(membership, rita.secret, soon(60), crypto.randomUUID()), { fetch }));
    if (!issued.ok) throw Error("The actual membership must issue a read session.");
    const handle = new ScopeHandle(httpTransport(identity.origin, { fetch }), app.name, issued.session.reader());
    const query = { v: 1 as const, scope, directory, install: job, projection: "state", items: {} };
    if (name === "counter") await life.wait(() => app.did(rita, "initialize", { expected: { configuration: 1 } }));
    const first = await life.owner.required(() => handle.applicationProjection(query));
    expect(first.ok).toBe(true); if (!first.ok) throw Error(`The declared state refused: ${first.reason}`);
    const sdk = first.value;
    const views = new McpService({ ...port, custody: memoryStore(), declaredViews: { bytes: packet.bytes, release: packet.ids.release, item: job } });
    const opening = name === "counter" ? "board" : "shelf";
    expect((await life.wait(() => views.call(`view_${opening}`, { view: name }))).isError).toBe(false);
    const shown = await life.wait(() => views.call("view_read", { view: name }));
    const display = shown.structuredContent["display"] as { data?: unknown; card?: { declared?: { data?: unknown } } };
    expect(canonicalize(display.data ?? display.card?.declared?.data)).toBe(canonicalize(sdk));
    const lock = { run: <T>(work: () => Promise<T>) => work() };
    if (name === "counter") {
      let held: Awaited<ReturnType<CommandStore["load"]>> = null;
      const gateway = nativeGateway(identity, secretSigner(rita.secret), { application: installation, current: () => true, lock, fetch,
        voiceStore: { load: async () => null, save: async () => { throw Error("No media witness here."); }, clear: async () => {} },
        commandStore: { load: async () => held, save: async value => { held = value; }, clear: async () => { held = null; } },
        // The direct Worker route follows no redirect. Workerd Request accepts
        // manual, whereas the browser-facing port must request redirect:error.
        headFetch: async (url, init) => { expect(init.redirect).toBe("error"); const response = await nativeWorker.fetch(new Request(url, { ...init, redirect: "manual" }), bindings); return { status: response.status, body: response.body, headers: response.headers, url, redirected: false }; },
      });
      dispose = () => gateway.dispose();
      const current = await life.owner.required(() => new Promise<unknown>((resolve, reject) => {
        observation = gateway.observe((state, view) => { if (state.status === "current") resolve({ state, view }); else if (!["connecting", "refreshing"].includes(state.status)) reject(Error(`Counter observation: ${JSON.stringify(state)}`)); });
      }));
      expect(current).toMatchObject({ view: { board: { state: "paused", lastNumber: 0 } } });
    } else {
      // A recorded act is not the later native result of its publish-file
      // send. Complete that explicit fixture protocol before asking for one
      // current projection; do not retry a refused read or change its guard.
      const settlePublication = async (kind: "donate" | "borrow" | "cancel"): Promise<void> => {
        const acts = (await life.wait(() => app.entries())).filter(entry => entry.input.type === "act"
          && entry.input.signed.intent.kind === kind && entry.input.signed.intent.actor === rita.key
          && same(entry.input.signed.intent.to, scope));
        expect(acts.length, `${kind}: one actual application act`).toBe(1);
        const act = acts[0];
        if (!act) throw Error("The recorded Lending act is missing.");
        const requests = act.sends.filter(send => isScopeRef(send.to) && send.to.scope === G.name
          && send.message.class === "request" && send.message.type === "tell"
          && isRecord(send.message.body) && send.message.body["message"] === "publish-file");
        expect(requests.length, `${kind}: one actual publish-file request`).toBe(1);
        const request = requests[0];
        if (!request || !isScopeRef(request.to)) throw Error("The recorded publication request is missing.");
        const cause = factRefOf(act);
        // The existing finite scheduler joins real in-flight dispatches and
        // their result sends. No outside effects, clock advance or sleep.
        await dispatchFixture([app, G], life.wait);
        const results = (await life.wait(() => app.entries())).filter(entry => {
          const input = entry.input;
          return input.type === "delivery" && input.message.class === "result"
            && same(input.message.of.from, cause) && input.message.of.n === request.n
            && same(input.from.at, request.to) && "clause" in input
            && input.clause === input.message.outcome;
        });
        expect(results.length, `${kind}: native result binds the exact request fact, ordinal and target`).toBe(1);
      };
      let held: Kept | null = null;
      const gateway = lendingGateway(identity, secretSigner(rita.secret), { application: installation, current: () => true, lock, fetch, now: life.now,
        store: { load: async () => held, save: async value => { held = value; }, clear: async () => { held = null; } } });
      dispose = () => gateway.dispose();
      expect(await life.owner.required(() => gateway.look())).toMatchObject({ status: "current", view: { things: [] } });
      expect(await life.owner.required(() => gateway.act("donate", { name: "Native kettle", description: "A maintained package donation." }))).toEqual({ status: "recorded" });
      await settlePublication("donate");
      const seen = await life.owner.required(() => gateway.look());
      expect(seen, readContext("after donate", seen)).toMatchObject({ status: "current", view: { things: [{ name: "Native kettle", revision: 1, state: "available" }] }, activity: [{ kind: "donate", signer: "@rita", what: "Native kettle" }] });
      if (seen.status !== "current") throw Error("The donation needs a current native read.");
      const thing = seen.view.things[0]!;
      expect(await life.owner.required(() => gateway.act("borrow", { thing: thing.id }))).toEqual({ status: "recorded" });
      await settlePublication("borrow");
      const afterBorrow = await life.owner.required(() => gateway.look());
      expect(await life.owner.required(() => gateway.act("cancel", { thing: thing.id, reason: "Native retained final row" })), readContext("after borrow, before cancel", afterBorrow)).toEqual({ status: "recorded" });
      await settlePublication("cancel");
      const gone = await life.owner.required(() => gateway.look());
      expect(gone, readContext("after cancel", gone)).toMatchObject({ status: "current", view: { things: [{ id: thing.id, revision: 3, state: "gone", reason: "Native retained final row" }] },
        activity: [{ kind: "donate" }, { kind: "borrow", what: `Native kettle (thing ${thing.id})` }, { kind: "cancel", what: `Native kettle (thing ${thing.id}): Native retained final row` }] });
      expect(held).toBeNull();
    }
    expect(paths).toContain(`/v1/scopes/${app.name}/application-projection`);
    expect(paths).not.toContain(`/v1/scopes/${app.name}/history`);
    expect((await life.wait(() => A.entries())).filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "install-application")).toHaveLength(1);
  } finally { dispose(); await observation?.done; date.mockRestore(); life.release(); }
}, 30_000);
