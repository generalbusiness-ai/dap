/** Production Worker route, registry, agent, membership, custody, native
 * application and local R2. Git package transport, clock and scheduling are
 * explicit fixtures. This runs no browser, deployed Worker or live provider. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { ControlRequest, DeclaredDefinition, FactRef, KeyId } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, digestBytes, isSeed, readItemQueryParameter, scopeIdOf, signControl, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { EXPIRY_MARGIN_MS, encodeAgentKeyInvitation, invitationIssueFields, secretSigner, type AgentKeyInvitation } from "@generalbusiness/dap-client";
import { DECLARED_APPLICATION_COHORT as C, REPOSITORY_BINDING_COHORT as B, ROLE_LISTS, isActions } from "@generalbusiness/dap-platform";
import { packApplication2 } from "@generalbusiness/dap-platform/application-v2";
import { CAPABILITIES_META, MODERN, PROTOCOL_META, McpService, claudeCardDomain, memoryStore, type ServerPort, type Tool } from "@generalbusiness/dap-mcp";
import type { CallResult, DispatchContext } from "../../mcp/src/results.ts";
import type { Display } from "@generalbusiness/dap-mcp";
import { sqliteStore, type Sql } from "../../mcp/src/sqlite-custody.ts";
import worker from "../../../apps/room/worker.ts";
import { outsideOf } from "../src/worker.ts";
import { applicationCounterPacket2, deviceApplicationPacket, applicationResolverFixture, applicationHttpPeer, applicationWorkerBindings, sessionRoom, effectFixture, dispatchFixture, driveFixture } from "./fixtures-native.ts";
import { fixedSigner } from "./fixtures-core.ts";
import { rita, routed } from "./repository.ts";
import { hostedRegistries, hostedTest } from "./worker.ts";

// Invariant: a hosted card press uses the exact installed declaration and the
// agent's own native key; a host without UI sees no app-only tools or card metadata.
// Ordinary writes keep their model-only descriptor on either host.
test.each([C, B])("hosted /mcp lists and reads the stdio cards, then records the hosted agent's card press ($register)", async cohort => {
  const device = cohort.register === B.register, screen = device ? "root" : "board", state = device ? "ready" : "open";
  const cardUri = `ui://dap/declared/${screen}`;
  const base = device ? await deviceApplicationPacket(false, true) : await applicationCounterPacket2();
  const { creates: _creates, ...semantic } = base.package.semantic;
  const { semantic: _semantic, ...presentation } = base.package.presentation;
  // Keep Counter's controller-only pause unchanged. This fixture adds a
  // separate role-granted acknowledgement that an enrolled agent may perform.
  const definition = JSON.parse(semantic.definitions[0]!.bytes) as DeclaredDefinition;
  definition.acts["acknowledge"] = { step: "transition", on: screen, grant: "hosted-card.acknowledge", also: {}, fields: {},
    guards: [{ state: [state] }], effects: [{ state: device ? "ready" : "paused" }], sends: [], attention: [] };
  const id = definitionDigest(definition), boardView = presentation.views[screen]!;
  if (boardView.kind === "surface") throw Error("The fixture needs an ordinary declared card.");
  const agentAdditions = [...(device ? [] : ["counting.control"]), "hosted-card.acknowledge"];
  const adminAdditions = [...new Set([...(semantic.roles["admin"] ?? []), ...agentAdditions])];
  const packet = await packApplication2({ name: "test.hosted-cards", version: "1", semantic: {
    ...semantic, entry: id, definitions: [{ id, bytes: canonicalize(definition) }],
    projections: { [screen]: { ...semantic.projections[screen]!, definition: id } },
    roles: { ...semantic.roles, admin: adminAdditions, agent: agentAdditions },
  }, presentation: { ...presentation, views: { [screen]: { ...boardView, acts: [...boardView.acts,
    { act: "acknowledge", label: "Acknowledge", needs: "hosted-card.acknowledge", when: `state = '${state}'` },
  ] } } } }, fixedSigner(67));
  const { life, R, D, children } = await sessionRoom(cohort.register), [M, A, G] = children;
  if (!M || !A || !G) throw Error("The declared cohort needs its native siblings.");
  const f = await applicationResolverFixture("sha1", undefined, {}, undefined, packet), peer = applicationHttpPeer(f);
  const service = "https://scopes.test", claudeUrl = service + "/mcp?host=claude", chatgptUrl = service + "/mcp?host=chatgpt";
  const MCP_CARD_ORIGINS = JSON.stringify([
    { host: "claude", url: claudeUrl, domain: claudeCardDomain(claudeUrl) },
    { host: "chatgpt", url: chatgptUrl, domain: "https://dap-plugin.example.com" },
  ]);
  const MCP_RESOURCE_URLS = JSON.stringify([claudeUrl, chatgptUrl]);
  hostedTest.clientRegistry = env.REGISTRIES.newUniqueId();
  const bindings = { ...env, REGISTRIES: hostedRegistries(env.REGISTRIES), ...applicationWorkerBindings(env.PLATFORM, env.APPLICATION_CONTENT, JSON.stringify(f.trust), env.SCOPE_INDEX), MCP_ENABLED: "true", MCP_CARD_ORIGINS, MCP_RESOURCE_URLS };
  life.applicationTrust(() => bindings.APPLICATION_TRUST);
  hostedTest.applicationSettings = { APPLICATION_TRUST: bindings.APPLICATION_TRUST };
  hostedTest.toolSettings = { MCP_ENABLED: "true", MCP_CARD_ORIGINS, MCP_RESOURCE_URLS };
  hostedTest.now = life.now;
  let releaseOpening = () => {};
  let opening: Promise<Response> | undefined;
  try {
    const seat = await life.wait(() => M.did(rita, "seat", { expected: { roster: 1 } }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    for (const node of [D, A]) { life.outside(node.name, (given, sql) => outsideOf(given, sql, bindings, peer.fetch)); await life.wait(() => node.restart()); }
    const membership = await life.wait(() => M.at()), directory = await life.wait(() => D.at());
    const repository = { directory, membership, rules: A.name, destination: G.name };
    const port: ServerPort = { service, signer: secretSigner(rita.secret), custody: memoryStore(), now: life.now, mode: "add",
      applicationTrust: bindings.APPLICATION_TRUST, applicationFetch: peer.fetch,
      fetch: (url, init) => life.wait(() => routed(url, init)),
      config: { read: async () => ({ service, repository }), addRoot: async () => {} } };
    const owner = new McpService(port);
    const ok = async (name: string, args: Record<string, unknown>) => {
      const answer = await life.wait(() => owner.call(name, args));
      expect(answer.isError, JSON.stringify(answer.structuredContent)).toBe(false);
      return answer.structuredContent;
    };
    const beforeRoster = (await life.wait(() => M.summary())).value.items.find(item => item.type === "roster");
    if (!beforeRoster) throw Error("The native membership needs its actual roster.");
    const beforeAdmin = beforeRoster.values[ROLE_LISTS.admin], beforeAgent = beforeRoster.values[ROLE_LISTS.agent];
    if (!isActions(beforeAdmin) || !isActions(beforeAgent)) throw Error("The native roster needs complete valid role action lists.");
    const installed = await ok("install_application", { uri: f.uri, release: packet.ids.release, roles: ["admin", "agent"], ...(cohort.rules === B.rules ? { owner: { membership, member: "@rita" } } : {}), values: device ? {} : { target: 7 }, idempotencyKey: "TEST-hosted-card-install" });
    expect(installed, JSON.stringify(installed)).toMatchObject({ answer: "accepted" });
    await effectFixture([A], life.wait); await dispatchFixture([R, D, M, A, G], life.wait);
    const created = (await life.wait(() => D.entries())).flatMap(entry => entry.sends).find(send => isSeed(send.to) && send.to.kind === "lane");
    if (!created || !isSeed(created.to)) throw Error("Native installation must create the application.");
    const app = life.platform(scopeIdOf(created.to)); await driveFixture([R, D, M, A, G, app], life.wait);
    expect(await life.wait(() => A.item(Number(installed["item"])))).toMatchObject({ state: "active" });
    if (!device) {
      await life.wait(() => app.did(rita, "initialize", { expected: { configuration: 1 } }));
      const board = (await life.wait(() => app.summary())).value.items.find(item => item.type === "board")!;
      await life.wait(() => app.did(rita, "start", { on: board.id, expected: { on: board.revision } }));
    }

    const admittedMembers = (await life.wait(() => M.summary())).value.items;
    const admittedRoster = admittedMembers.find(item => item.type === "roster");
    if (!admittedRoster) throw Error("The installed application needs the native roster.");
    const adminActions = admittedRoster.values[ROLE_LISTS.admin], agentActions = admittedRoster.values[ROLE_LISTS.agent];
    if (!isActions(adminActions) || !isActions(agentActions)) throw Error("The installed native role action lists must stay valid.");
    // Installation appends the packed release's sorted defaults to the native roster.
    expect(adminActions).toEqual([...new Set([...beforeAdmin, ...packet.package.semantic.roles["admin"]!])]);
    expect(agentActions).toEqual([...new Set([...beforeAgent, ...packet.package.semantic.roles["agent"]!])]);
    expect(agentActions.filter(action => !adminActions.includes(action))).toEqual([]);
    expect(admittedMembers.find(item => item.type === "member" && item.values["handle"] === "@rita"))
      .toMatchObject({ state: "active", values: { role: "admin" } });

    const added = await ok("member.add", { fields: { handle: "@card-agent", kind: "agent", controller: "@rita" }, idempotencyKey: "TEST-card-member" });
    expect(added).toMatchObject({ answer: "accepted" });
    const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const invited = await ok("key.invite", { fields: { member: (added["fact"] as FactRef).seq, kind: "agent", ...invitationIssueFields(cohort.membership, secret), inviteEnds: timeOf(life.now() + 3_600_000) }, idempotencyKey: "TEST-card-invite" });
    expect(invited).toMatchObject({ answer: "accepted" });
    const members = (await life.wait(() => M.summary())).value.items;
    const invitation: AgentKeyInvitation = { v: 1, kind: "agent-key", service, repository, definition: cohort.membership, handle: "@card-agent",
      controller: { membership, member: "@rita" }, member: added["fact"] as FactRef, invitation: invited["fact"] as FactRef, secret,
      expected: { on: members.find(item => item.type === "roster")!.revision, member: members.find(item => item.id === (added["fact"] as FactRef).seq)!.revision } };
    const body = JSON.stringify({ link: encodeAgentKeyInvitation(invitation) });
    const control: ControlRequest = { v: 1, action: "create", service, membership, agent: null, actor: rita.key, body: digestBytes(utf8(body)), op: "TEST-card-create", notAfter: timeOf(life.now() + 60_000) };
    const signature = signControl(control, rita.secret);
    const response = await life.wait(() => worker.fetch(new Request(service + "/mcp/agents", { method: "POST", headers: {
      "content-type": "application/json", authorization: `Control ${b64url(utf8(canonicalize(control)))}.${signature.sig}`,
    }, body }), bindings));
    const agent = await response.json() as { agent: string; key: KeyId; bearer: string; bearerExpires: string };
    expect(response.status, JSON.stringify(agent)).toBe(201);

    // Hold the first native configuration read with a gate, then rotate the
    // bearer. An old package load must not install its old expiry afterward.
    let entered!: () => void, release!: () => void;
    const atRead = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    releaseOpening = release;
    hostedTest.configHold = { then: (yes, no) => { entered(); return held.then(yes, no); } } as Promise<void>;
    const oldExpiry = Date.parse(agent.bearerExpires);
    const pending = life.wait(() => worker.fetch(new Request(claudeUrl, { method: "POST", headers: {
      authorization: `Bearer ${agent.bearer}`, "content-type": "application/json", "mcp-protocol-version": MODERN, "mcp-method": "resources/list",
    }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "resources/list", params: { _meta: { [PROTOCOL_META]: MODERN, [CAPABILITIES_META]: {} } } }) }), bindings));
    opening = pending;
    await atRead;
    life.advance(1000);
    const rotation: ControlRequest = { ...control, action: "bearer", agent: agent.agent, body: digestBytes(utf8("")), op: "TEST-card-rotate", notAfter: timeOf(life.now() + 60_000) };
    const rotatedSignature = signControl(rotation, rita.secret);
    const renewed = await life.wait(() => worker.fetch(new Request(service + `/mcp/agents/${agent.agent}/bearer`, { method: "POST", headers: {
      "content-type": "application/json", authorization: `Control ${b64url(utf8(canonicalize(rotation)))}.${rotatedSignature.sig}`,
    }, body: "" }), bindings));
    expect(renewed.status).toBe(200);
    const renewedBearer = await renewed.json() as { bearer: string; bearerExpires: string };
    agent.bearer = renewedBearer.bearer;
    release(); hostedTest.configHold = null;
    expect((await pending).status).toBe(401);

    const rpc = async (method: string, args: Record<string, unknown> = {}, ui = true, url = claudeUrl) => {
      const capabilities = ui ? { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } } } : {};
      const answer = await life.wait(() => worker.fetch(new Request(url, { method: "POST", headers: {
        authorization: `Bearer ${agent.bearer}`, "content-type": "application/json", "mcp-protocol-version": MODERN, "mcp-method": method,
        ...(method === "tools/call" ? { "mcp-name": String(args["name"]) } : {}),
      }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { ...args, _meta: { [PROTOCOL_META]: MODERN, [CAPABILITIES_META]: capabilities } } }) }), bindings));
      expect(answer.status).toBe(200);
      const result = await answer.json() as { result?: Record<string, unknown>; error?: unknown };
      expect(result.error).toBeUndefined(); return result.result!;
    };
    const local = await life.wait(() => McpService.fromInstalledApplication({ ...port, custody: memoryStore() }));
    // Real McpService, declared cards, custody and Native app; only final
    // dispatch judgments below are scripted. This is no Hosted role-loss proof.
    let stoppedSubmits = 0;
    const guarded = await life.wait(() => McpService.fromInstalledApplication({ ...port, dispatchRequired: true, custody: memoryStore(),
      fetch: (url, init) => { if (new URL(url).pathname.endsWith("/acts")) stoppedSubmits++; return port.fetch!(url, init); },
    }));
    const allow: DispatchContext = { prepare: async () => () => null };
    const unavailable: CallResult = { content: [{ type: "text", text: "TEST callback stop" }],
      structuredContent: { error: "unavailable", message: "TEST callback stop", next: "TEST check the original" }, isError: true };
    const unauthorized: CallResult = { ...unavailable, structuredContent: { ...unavailable.structuredContent, error: "unauthorized" } };
    const deny: DispatchContext = { prepare: async () => () => unauthorized };
    const denyCheck: DispatchContext = { prepare: async () => () => unavailable };
    const guardedCall = (name: string, args: Record<string, unknown>, dispatch?: DispatchContext) => life.wait(() => guarded.call(name, args, dispatch));
    const view = "TEST-stopped-declared-original";
    const missingContext = await guardedCall(`view_${screen}`, { view });
    expect(missingContext).toMatchObject({ isError: true, structuredContent: { error: "unavailable" } });
    expect(await guarded.custody.store.unresolved()).toEqual([]);
    expect(stoppedSubmits).toBe(0);
    await guardedCall(`view_${screen}`, { view }, allow);
    const stoppedOpening = await guardedCall("view_read", { view, ...(device ? {} : { cut: 0, page: "item" }) }, allow);
    const stoppedDetail = stoppedOpening.structuredContent["display"] as Display;
    expect(stoppedDetail.card!.actions.map(action => action.id)).toContain("acknowledge");
    const firstStop = await guardedCall("view_act", { view, cut: stoppedDetail.cut, action: "acknowledge" }, deny);
    expect(firstStop.structuredContent["result"]).toBe(unauthorized);
    const pendingStop = firstStop.structuredContent["display"] as Display;
    expect(pendingStop.receipt).toContain("outcome unknown; check the original request");
    expect(pendingStop.card!.actions.map(action => action.purpose)).toEqual(["check-original"]);
    expect(stoppedSubmits).toBe(0);
    const openOriginals = await guarded.custody.store.unresolved();
    expect(openOriginals).toHaveLength(1);
    const originalKey = openOriginals[0]!.key, appRef = await life.wait(() => app.at());
    const originalIdentity = { service, membership, signer: rita.key, target: appRef, key: originalKey };
    const original = (await guarded.custody.find(originalIdentity))!;
    expect(original).toMatchObject({ phase: "sent", outcomes: [], count: 0 });
    const envelope = structuredClone(original.envelope);
    // The same shared fixture clock drives both the service and actual Native
    // deciding scope. Cross the original expiry AND the resend margin once.
    life.advance(Date.parse(envelope.signed.intent.notAfter) + EXPIRY_MARGIN_MS + 1 - life.now());
    const checkStop = await guardedCall("view_act", { view, cut: pendingStop.cut, action: pendingStop.card!.actions[0]!.id }, denyCheck);
    expect(checkStop.structuredContent["result"]).toBe(unavailable);
    const stillPending = checkStop.structuredContent["display"] as Display;
    expect(stillPending.receipt).toContain("outcome unknown; check the original request");
    expect(stillPending.card!.actions.map(action => action.purpose)).toEqual(["check-original"]);
    const unchanged = (await guarded.custody.find(originalIdentity))!;
    expect(unchanged.envelope).toEqual(envelope);
    expect([unchanged.identity, unchanged.meaning, unchanged.binding, unchanged.outcomes, unchanged.count, unchanged.attempt])
      .toEqual([original.identity, original.meaning, original.binding, [], 0, original.attempt]);
    expect(stoppedSubmits).toBe(0);
    expect((await guarded.custody.store.unresolved()).map(row => [row.id, row.key])).toEqual(openOriginals.map(row => [row.id, row.key]));
    const restored = await guardedCall("view_act", { view, cut: stillPending.cut, action: stillPending.card!.actions[0]!.id }, allow);
    expect((restored.structuredContent["result"] as CallResult).structuredContent).toMatchObject({ answer: "refused", reason: "expired" });
    expect(stoppedSubmits).toBe(1);
    const settledStop = restored.structuredContent["display"] as Display;
    expect(settledStop.receipt).toContain("refused (expired)");
    expect(settledStop.card!.actions).toEqual([]);
    expect(await guarded.custody.store.unresolved()).toEqual([]);
    const finalOriginal = (await guarded.custody.find(originalIdentity))!;
    expect(finalOriginal.envelope).toEqual(envelope);
    expect(finalOriginal.phase).toBe("refused");

    // Script only this response's second active row. This selection control
    // proves no native second installation; all other reads stay native.
    let ambiguousLoads = 0;
    const ambiguous = await life.wait(() => McpService.fromInstalledApplication({ ...port, custody: memoryStore(), fetch: async (url, init) => {
      const response = await port.fetch!(url, init);
      if (!new URL(url).pathname.endsWith("/query-items")) return response;
      const query = readItemQueryParameter(new URL(url).searchParams.get("q"));
      if (!query || query.ids !== null) return response;
      if (!(response instanceof Response)) throw Error("The native query fixture needs its actual Response.");
      const value = await response.json() as { value: { items: { id: number }[] } };
      const first = value.value.items[0]!;
      value.value.items.push({ ...first, id: first.id + 100 });
      return new Response(JSON.stringify(value));
    } }, async () => { ambiguousLoads++; return packet.bytes; }));
    expect((await life.wait(() => ambiguous.page(undefined, true))).tools.some(tool => tool.name === `view_${screen}`)).toBe(false);
    expect(ambiguousLoads).toBe(0);
    const localTools = (await life.wait(() => local.page(undefined, true))).tools;
    const localCards = localTools.filter(tool => tool.name.startsWith("view_"));
    const remoteCards = ((await rpc("tools/list"))["tools"] as Tool[]).filter(tool => tool.name.startsWith("view_"));
    expect(remoteCards).toEqual(localCards); expect(remoteCards.map(tool => tool.name)).toContain(`view_${screen}`);
    const plain = (await rpc("tools/list", {}, false))["tools"] as Tool[];
    expect(plain.some(tool => tool.name === "view_read" || tool.name === "view_act")).toBe(false);
    for (const tool of plain) {
      const original = localTools.find(candidate => candidate.name === tool.name);
      expect(original, tool.name).toBeDefined();
      const visibility = (original!._meta?.["ui"] as { visibility?: string[] } | undefined)?.visibility;
      const modelOnly = visibility?.length === 1 && visibility[0] === "model";
      expect(tool._meta?.["ui"], tool.name).toEqual(modelOnly ? { visibility: ["model"] } : undefined);
    }
    const plainResources = (await rpc("resources/list", {}, false))["resources"] as { _meta?: { ui?: unknown } }[];
    expect(plainResources.every(resource => resource._meta?.ui === undefined)).toBe(true);
    const plainRead = (await rpc("resources/read", { uri: cardUri }, false))["contents"] as typeof plainResources;
    expect(plainRead[0]?._meta?.ui).toBeUndefined();
    const resources = (await rpc("resources/list"))["resources"] as { uri: string }[];
    expect(resources.map(resource => resource.uri)).toEqual(local.resources.list().resources.map(resource => resource.uri));
    const remote = (await rpc("resources/read", { uri: cardUri }))["contents"] as { text: string; _meta: { ui: { domain: string } } }[];
    expect(remote[0]!.text).toBe(local.resources.read(cardUri).contents[0]!.text);
    expect(remote[0]!._meta.ui.domain).toBe(claudeCardDomain(claudeUrl));
    const chatgpt = (await rpc("resources/read", { uri: cardUri }, true, chatgptUrl))["contents"] as typeof remote;
    expect(chatgpt[0]!._meta.ui.domain).toBe("https://dap-plugin.example.com");
    expect(local.resources.read(cardUri).contents[0]!._meta?.ui).not.toHaveProperty("domain");
    const call = (name: string, args: Record<string, unknown>) => rpc("tools/call", { name, arguments: args });
    expect((await call(`view_${screen}`, { view: "hosted-card" }))["isError"]).toBe(false);
    const shown = (await call("view_read", { view: "hosted-card", ...(device ? {} : { cut: 0, page: "item" }) }))["structuredContent"] as { display: { cut: number; card: { actions: { id: string }[] } } };
    expect(shown, JSON.stringify(shown)).toMatchObject({ display: { status: "ready", card: { actions: expect.any(Array) } } });
    expect(shown.display.card.actions.map(action => action.id)).toContain("acknowledge");
    if (!device) {
      expect(shown.display.card.actions.map(action => action.id)).toContain("pause");
      const refused = (await call("view_act", { view: "hosted-card", cut: shown.display.cut, action: "pause" }))["structuredContent"];
      expect(refused).toMatchObject({ result: { structuredContent: { answer: "refused", reason: "guard-failed" } } });
    }
    // Separate from the scripted local contexts above: this view uses
    // real Hosted HTTP admission, actual Native roles and Agent SQLite custody.
    const nativeView = "TEST-hosted-native-original", appRefForOriginal = await life.wait(() => app.at());
    await call(`view_${screen}`, { view: nativeView });
    const nativeRead = (await call("view_read", { view: nativeView, ...(device ? {} : { cut: 0, page: "item" }) }))["structuredContent"] as { display: Display };
    expect(nativeRead.display.card!.actions.map(action => action.id)).toContain("acknowledge");
    const nativePosts: string[] = [];
    hostedTest.submitted = url => { nativePosts.push(new URL(url).pathname); };
    hostedTest.drop = `/${app.name}/acts`;
    const unknownPress = (await call("view_act", { view: nativeView, cut: nativeRead.display.cut, action: "acknowledge" }))["structuredContent"] as { result: CallResult; display: Display };
    expect(hostedTest.drop).toBeNull();
    expect(unknownPress.result.structuredContent["error"]).toBe("transport");
    expect(nativePosts).toEqual([]);
    expect(unknownPress.display.card!.actions.map(action => action.purpose)).toEqual(["check-original"]);
    const keptOriginal = await runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(agent.agent)), async (_instance, state) => {
      const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
      const store = sqliteStore(sql), candidates = await store.unresolved();
      const records = await Promise.all(candidates.map(async row => ({ id: row.id, record: await store.read(row.id) })));
      const selected = records.filter(row => row.record?.identity.signer === agent.key && canonicalize(row.record.identity.target) === canonicalize(appRefForOriginal));
      expect(selected).toHaveLength(1);
      return { id: selected[0]!.id, record: selected[0]!.record! };
    });
    const readOriginal = () => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(agent.agent)), async (_instance, state) => {
      const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
      return sqliteStore(sql).read(keptOriginal.id);
    });
    const nativeEnvelope = structuredClone(keptOriginal.record.envelope), nativeOutcomes = structuredClone(keptOriginal.record.outcomes);
    expect(nativeOutcomes.some(outcome => "lost" in outcome)).toBe(true);
    expect(nativeEnvelope.signed.intent).toMatchObject({ actor: agent.key, to: appRefForOriginal, kind: "acknowledge" });
    life.advance(Date.parse(nativeEnvelope.signed.intent.notAfter) + EXPIRY_MARGIN_MS + 1 - life.now());
    expect(Date.parse(renewedBearer.bearerExpires)).toBeGreaterThan(life.now());
    expect(adminActions).not.toContain("change.check"); expect(agentActions).not.toContain("change.check");
    let atBody!: () => void, releaseBody!: () => void;
    const bodyReached = new Promise<void>(resolve => { atBody = resolve; }), bodyHeld = new Promise<void>(resolve => { releaseBody = resolve; });
    const bodyGate = { then: (yes, no) => { atBody(); return bodyHeld.then(yes, no); } } as Promise<void>;
    const admissions = { agent: "@card-agent", at: 2, calls: 0, waiting: Promise.resolve(), entered: () => { hostedTest.configHold = bodyGate; } };
    hostedTest.roleReply = admissions;
    let pendingCheck: Promise<Record<string, unknown>> | undefined;
    try {
      pendingCheck = call("view_act", { view: nativeView, cut: unknownPress.display.cut, action: unknownPress.display.card!.actions[0]!.id });
      await bodyReached; expect(admissions.calls).toBe(2);
      expect((await ok("member.actions", { on: 0, fields: { role: "agent", actions: [...agentActions, "change.check"] }, idempotencyKey: "TEST-card-final-role-wider" }))["answer"]).toBe("accepted");
      hostedTest.configHold = null; releaseBody();
      const localStop = (await pendingCheck)["structuredContent"] as { result: CallResult; display: Display };
      expect(localStop.result).toMatchObject({ isError: true, structuredContent: { error: "unauthorized" } });
      expect(localStop.result.structuredContent).not.toHaveProperty("answer");
      expect(localStop.result.structuredContent).not.toHaveProperty("submitted");
      expect(localStop.display.receipt).toContain("outcome unknown; check the original request");
      expect(localStop.display.card!.actions.map(action => action.purpose)).toEqual(["check-original"]);
      expect(nativePosts).toEqual([]);
      const afterStop = (await readOriginal())!;
      expect(afterStop.envelope).toEqual(nativeEnvelope);
      expect(afterStop.outcomes).toEqual(nativeOutcomes);
      expect(afterStop.count).toBe(keptOriginal.record.count);
      expect(afterStop.identity).toEqual(keptOriginal.record.identity);
      expect(afterStop.meaning).toEqual(keptOriginal.record.meaning);
      hostedTest.roleReply = null;
      expect((await ok("member.actions", { on: 0, fields: { role: "agent", actions: agentActions }, idempotencyKey: "TEST-card-final-role-restore" }))["answer"]).toBe("accepted");
      const nativeRefusal = (await call("view_act", { view: nativeView, cut: localStop.display.cut, action: localStop.display.card!.actions[0]!.id }))["structuredContent"] as { result: CallResult; display: Display };
      expect(nativeRefusal.result).toMatchObject({ isError: false, structuredContent: { answer: "refused", reason: "expired" } });
      expect(nativePosts.filter(path => path.endsWith("/acts"))).toHaveLength(1);
      expect(nativeRefusal.display.card!.actions).toEqual([]);
      const decidedOriginal = (await readOriginal())!;
      expect(decidedOriginal.envelope).toEqual(nativeEnvelope);
      expect(decidedOriginal.phase).toBe("refused");
      expect(decidedOriginal.outcomes.slice(0, nativeOutcomes.length)).toEqual(nativeOutcomes);
      expect(decidedOriginal.count).toBe(keptOriginal.record.count + 1);
      expect((await life.wait(() => app.summary())).value.items.find(item => item.type === screen)?.state).toBe(device ? "ready" : "open");
    } finally {
      releaseBody(); hostedTest.configHold = null; hostedTest.roleReply = null; hostedTest.submitted = null; hostedTest.drop = null;
      await pendingCheck?.catch(() => {});
      expect((await ok("member.actions", { on: 0, fields: { role: "agent", actions: agentActions }, idempotencyKey: "TEST-card-final-role-cleanup" }))["answer"]).toBe("accepted");
    }

    await call(`view_${screen}`, { view: "hosted-acknowledgement" });
    const current = (await call("view_read", { view: "hosted-acknowledgement", ...(device ? {} : { cut: 0, page: "item" }) }))["structuredContent"] as typeof shown;
    const pressed = (await call("view_act", { view: "hosted-acknowledgement", cut: current.display.cut, action: "acknowledge" }))["structuredContent"];
    expect(pressed, JSON.stringify(pressed)).toMatchObject({ result: { structuredContent: { answer: "accepted" } } });
    const fact = (pressed as { result: { structuredContent: { fact: FactRef } } }).result.structuredContent.fact;
    const entry = (await life.wait(() => app.entries())).find(entry => entry.seq === fact.seq)!;
    expect(entry.input).toMatchObject({ type: "act", signed: { intent: { actor: agent.key, kind: "acknowledge", to: await life.wait(() => app.at()) } } });
    expect((await life.wait(() => app.summary())).value.items.find(item => item.type === screen)?.state).toBe(device ? "ready" : "paused");
    life.advance(oldExpiry + 1 - life.now());
    expect(Date.parse(renewedBearer.bearerExpires)).toBeGreaterThan(life.now());
    expect((await rpc("resources/read", { uri: cardUri }))["contents"]).toBeDefined();
  } finally {
    releaseOpening();
    await opening?.catch(() => {});
    hostedTest.applicationSettings = null; hostedTest.toolSettings = null; hostedTest.now = null; hostedTest.clientRegistry = null; hostedTest.configHold = null; hostedTest.roleReply = null; hostedTest.submitted = null; hostedTest.drop = null; hostedTest.nativeSubmit = null; hostedTest.issuerRandom = null;
    life.release();
  }
}, 30000);
