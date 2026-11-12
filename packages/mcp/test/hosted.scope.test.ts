/**
 * The hosted MCP endpoint on real scopes (notes/2026-10-13-hosted-mcp-endpoint.md, section 6): the registry and the agent
 * objects of the test Worker (`packages/scope/test/worker.ts`, over the namespace PLATFORM), reached through the production app
 * Worker's default fetch, with the pinned MCP client where a client is named. rita creates the room through her own MCP service
 * and performs the admin's acts; the agent is created by a control request she signs.
 */
import { env, evictDurableObject, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { expect, test } from "vitest";
import type { ControlRequest, Digest, Entry, FactRef, Item, KeyId, MemberId, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, keyIdOfSecret, newIncarnation, signControl, signIntent, textDigest, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { invitationIssueFields, encodeAgentKeyInvitation, requestSession, secretSigner, sessionRequest, signedIntent, signedLogReader, type AgentKeyInvitation } from "@generalbusiness/dap-client";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, platform, FIRST_ACTIONS_OF, ROLE_LISTS, firstExtents } from "@generalbusiness/dap-platform";
import { DEMO_DIGESTS, QUESTION_DIGESTS, changeDemo, issueDemo, issueQuestions } from "@generalbusiness/dap-lanes";
import { counting } from "../../../apps/counter/definition.ts";
import { COUNTING_DEFINITION } from "../../../apps/counter/pin.ts";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { McpService, memoryStore } from "../src/index.ts";
import worker from "../../../apps/room/worker.ts";
import { creationTest, hostedRegistries, hostedTest, platformNet, type PlatformMcpAgent, type PlatformScope } from "../../scope/test/worker.ts";
import { startupTest, StartupOwner, startupSnapshot, startupReport, type StartupServingIndex } from "../../scope/test/support/serving-startup.ts";
import { DEFAULT_SERVING_LIMITS } from "../../scope/src/serving-limits.ts";
import { SCOPE_INDEX_NAME, type ScopeIndexPort } from "../../scope/src/scope-index.ts";
import { BOUNDS, COMPLETION_BYTES, MODERN, MODERN_RESULT_EXTRA, controlOf } from "../src/index.ts";
import { INVITATION_LINK } from "@generalbusiness/dap-client";
import { mcpRoom, SERVICE, type Agent, type Room, created as createRoom } from "./fixtures-native.ts";
import { MCP_METRIC_SCHEMA, type McpMetricPoint } from "../src/metrics.ts";
import { OAUTH_STANDING_MS, type OAuthAccessGrant } from "../src/oauth-access.ts";
import { ROW_OVERHEAD, type HostedAgentIdentityRead } from "../src/hosted.ts";
import { httpSource, verify, type HistorySource } from "@generalbusiness/dap-replay";
import { sqliteStore, type Sql } from "../src/sqlite-custody.ts";

/** Production default dispatch, in this isolate. The actual native PLATFORM namespace is this fixture's Scope binding;
 * REGISTRIES and AGENTS keep their existing native subclasses, clocks, custody and control fences. */
const routed = (url: string | URL, init?: RequestInit): Promise<Response> => {
  const action = () => worker.fetch(new Request(url, init), { ...env, REGISTRIES: hostedRegistries(env.REGISTRIES), SCOPES: env.PLATFORM, ...(startupTest.index ? { SCOPE_INDEX: startupTest.index } : {}), ...(hostedTest.toolSettings ?? { MCP_ENABLED: "true", MCP_TOOL_ADDITIONS: '["create","install_application","credential","prepare","join","record","step","text"]' }) });
  return startupTest.owner ? startupTest.owner.wait(action) : action();
};
const fetchLike = ((url: string | URL | Request, init?: RequestInit) => routed(url instanceof Request ? url.url : url, init)) as unknown as typeof fetch;

/** Every step of a scope, across the steps tool's pages. */
async function allSteps(agent: Agent, scope: string): Promise<{ seq: number; kind: string | null; signer: string | null }[]> {
  const out: { seq: number; kind: string | null; signer: string | null }[] = [];
  for (let cursor: unknown = undefined, n = 0; n < 64; n++) {
    const page = await agent.ok("steps", { scope, ...(cursor !== undefined ? { cursor } : {}) });
    out.push(...(page["steps"] as typeof out));
    if (page["cursor"] === undefined) break;
    cursor = page["cursor"];
  }
  return out;
}

/** Every item of a scope, across inspect's pages. */
async function allItems(agent: Agent, scope: string): Promise<{ id: number; type: string; state: string; revision: number; values: Record<string, unknown> }[]> {
  const out: { id: number; type: string; state: string; revision: number; values: Record<string, unknown> }[] = [];
  for (let cursor: unknown = undefined, n = 0; n < 64; n++) {
    const page = await agent.ok("inspect", { scope, ...(cursor !== undefined ? { cursor } : {}) });
    out.push(...(page["items"] as typeof out));
    if (page["cursor"] === undefined) break;
    cursor = page["cursor"];
  }
  return out;
}

/** An admin's two acts, and the agent-key invitation they make, as `dap invite --kind agent-key` would encode it. */
async function invite(room: Room, rita: Agent, handle: string, definition: AgentKeyInvitation["definition"] = "platform:membership@2", controller = "@rita"): Promise<{ link: string; invitation: AgentKeyInvitation; secret: string }> {
  const M = rita.config.repository!.membership;
  const added = await rita.ok("member.add", { fields: { handle, kind: "agent", controller }, idempotencyKey: `add-${handle}` });
  expect(added["answer"], JSON.stringify(added)).toBe("accepted");
  const member = added["fact"] as FactRef;
  const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const invited = await rita.ok("key.invite", { fields: { member: member.seq, kind: "agent", ...invitationIssueFields(definition, secret), inviteEnds: timeOf(room.now() + 3_600_000) }, idempotencyKey: `invite-${handle}` });
  expect(invited["answer"], JSON.stringify(invited)).toBe("accepted");
  const items = await allItems(rita, "membership");
  const roster = items.find((i) => i.type === "roster")!;
  const memberItem = items.find((i) => i.type === "member" && i.values["handle"] === handle)!;
  const { inbox: _inbox, ...repository } = rita.config.repository!;
  const invitation: AgentKeyInvitation = {
    v: 1, kind: "agent-key", service: SERVICE, repository, definition, handle, controller: { membership: M, member: controller as MemberId },
    member, invitation: invited["fact"] as FactRef, secret, expected: { on: roster.revision, member: memberItem.revision },
  };
  return { link: encodeAgentKeyInvitation(invitation), invitation, secret };
}

/** A control request signed by `signer`'s secret, as the `Authorization` header carries it, over `body`. */
function control(room: Room, secret: Uint8Array, action: ControlRequest["action"], membership: ScopeRef, agent: string | null, body: string, op: string, overrides: Partial<ControlRequest> = {}): string {
  const request: ControlRequest = { v: 1, action, service: SERVICE, membership, agent, actor: keyIdOfSecret(secret), body: digestBytes(utf8(body)), op, notAfter: timeOf(room.now() + 60_000), ...overrides };
  const signed = signControl(request, secret);
  return `Control ${b64url(utf8(canonicalize(request)))}.${signed.sig}`;
}
const post = (path: string, authorization: string, body: string, method = "POST") => routed(`${SERVICE}${path}`, { method, headers: { authorization, "content-type": "application/json" }, body });
/** Arm only on the second real admission reply. The next configuration
 * await belongs to the tool body, after both synchronous HTTP checks. */
function holdAfterAdmission(handle: string) {
  let reached!: () => void, release!: () => void;
  const entered = new Promise<void>(resolve => { reached = resolve; });
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const gate = { then: <TResult1 = void, TResult2 = never>(yes?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null, no?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) => {
    reached(); return waiting.then(yes, no);
  } } as Promise<void>;
  const reads = { agent: handle, at: 2, calls: 0, entered: () => { hostedTest.configHold = gate; }, waiting: Promise.resolve() };
  hostedTest.roleReply = reads;
  return { entered, reads, release: () => { hostedTest.configHold = null; release(); } };
}
/** Decode the actual SQLite custody record without projecting away its envelope/outcomes. */
const custodyFor = (agent: string, key: string, id?: string) => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(agent)), async (_instance, state) => {
  const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
  const store = sqliteStore(sql);
  const rows = id ? [{ id }] : state.storage.sql.exec(`SELECT id FROM record WHERE key = ? UNION SELECT id FROM archive WHERE key = ?`, key, key).toArray();
  expect(rows).toHaveLength(1);
  const selected = String(rows[0]!["id"]), record = await store.read(selected);
  if (!record) throw Error("The actual kept custody record is required");
  return { id: selected, record };
});
async function commentTarget(rita: Agent, key: string): Promise<string> {
  const opened = await rita.ok("issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: key, conditions: ["done"] }, values: [canonicalize(issueDemo)], idempotencyKey: key });
  const created = await rita.ok("wait", { scope: "directory", entry: (opened["fact"] as FactRef).seq });
  return (created["created"] as { scope: string; kind: string }[]).find(row => row.kind === "lane")!.scope;
}

const BEARER_LIFETIME = 30 * 86_400_000;
type IssuedBearer = { agent: string; key: KeyId; bearer: string; bearerExpires: string };
const shownReceipt = (answer: object) => {
  const { bearer: _bearer, ...stable } = answer as Record<string, unknown>;
  return { ...stable, bearerShown: true };
};
/** The three actual SQLite answer copies, apart from retained native envelopes. */
async function storedBearerAnswers(agent: string, membership: string) {
  const agentObject = env.AGENTS.get(env.AGENTS.idFromString(agent));
  const registryObject = env.REGISTRIES.get(env.REGISTRIES.idFromName(membership));
  const [agentAnswers, registryAnswers] = await Promise.all([
    runInDurableObject(agentObject, (_instance, state) => ({
      agent: state.storage.sql.exec("SELECT answer, bearer FROM agent WHERE id = 1").toArray(),
      control: state.storage.sql.exec("SELECT op, answer FROM control ORDER BY op").toArray(),
    })),
    runInDurableObject(registryObject, (_instance, state) => state.storage.sql.exec("SELECT op, answer FROM control ORDER BY op").toArray()),
  ]);
  return { ...agentAnswers, registry: registryAnswers };
}
async function expectBearerNotStored(agent: string, membership: string, bearer: string) {
  const answers = await storedBearerAnswers(agent, membership);
  const stored = JSON.stringify(answers);
  expect(stored).not.toContain(bearer);
  expect(stored).not.toContain(bearer.slice(bearer.indexOf(".") + 1));
  return answers;
}

test.each(["platform:register@3", "platform:register@10"] as const)("H1, the whole recipe: add-member, invite-key, create, enrol, then the pinned client in both revisions acts as the agent (%s)", async registerDefinition => {
  const room = mcpRoom();
  hostedTest.clientRegistry = env.REGISTRIES.newUniqueId();
  const metrics: McpMetricPoint[] = [];
  hostedTest.metrics = { report: point => { metrics.push(structuredClone(point)); } };
  hostedTest.now = () => room.now();
  hostedTest.pause = (waiting) => room.pause(waiting);
  try {
    const rita = room.agent("rita");
    await createRoom(room, rita, "default", registerDefinition);
    const definition = registerDefinition === "platform:register@10" ? "platform:membership@6" : "platform:membership@2";
    const inviteAgent = (handle: string) => invite(room, rita, handle, definition);
    const M = rita.config.repository!.membership;
    // The rules published and the issue definition activated, as the room story does, so an agent may open issues.
    expect((await rita.ok("rules.publish", { on: 0, fields: { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) }, idempotencyKey: "publish" }))["answer"]).toBe("accepted");
    expect((await rita.ok("rules.activate", { fields: { digest: DEMO_DIGESTS.issue, name: "issue" }, values: [canonicalize(issueDemo)], idempotencyKey: "activate-issue" }))["answer"]).toBe("accepted");
    const { link, invitation } = await inviteAgent("@bot");
    const body = JSON.stringify({ link });
    // The controller's create: the registry reserves, the agent object enrols its own key, and the bearer is shown once.
    const created = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, "create-1"), body));
    const answer = await created.json() as IssuedBearer & { handle: string; member: FactRef };
    expect([created.status, answer.handle], JSON.stringify(answer)).toEqual([201, "@bot"]);
    expect(answer.bearer.startsWith(`${answer.agent}.`)).toBe(true);
    expect(answer.bearerExpires).toBe(timeOf(room.now() + BEARER_LIFETIME));
    const stored = await expectBearerNotStored(answer.agent, M.scope, answer.bearer);
    const keptCreate = { status: 201, body: shownReceipt(answer) };
    expect(JSON.parse(String(stored.agent[0]!["answer"]))).toEqual(keptCreate);
    expect(JSON.parse(String(stored.control.find(row => row["op"] === "create-1")!["answer"]))).toEqual(keptCreate);
    expect(JSON.parse(String(stored.registry.find(row => row["op"] === "create-1")!["answer"]))).toEqual(keptCreate);
    // The same op returns its stable receipt; plaintext is disclosed only by the committing call.
    const again = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, "create-1"), body));
    expect([again.status, await again.json()]).toEqual([201, shownReceipt(answer)]);
    // Two concurrent creates retain one identity, but at most one caller receives plaintext.
    const { link: link3 } = await inviteAgent("@bot3");
    const body3 = JSON.stringify({ link: link3 });
    const pair = await room.wait(() => Promise.all([1, 2].map(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body3, "create-3"), body3))));
    const answers = await Promise.all(pair.map((r) => r.json() as Promise<Partial<IssuedBearer> & { agent: string; key: string }>));
    expect(pair.map((r) => r.status), JSON.stringify(answers)).toEqual([201, 201]);
    expect([answers[0]!.agent, answers[0]!.key]).toEqual([answers[1]!.agent, answers[1]!.key]);
    const disclosed = answers.filter((value): value is IssuedBearer => typeof value.bearer === "string");
    expect(disclosed).toHaveLength(1);
    expect(answers.find(value => value.bearer === undefined)).toEqual(shownReceipt(disclosed[0]!));
    expect(disclosed[0]!.bearerExpires).toBe(timeOf(room.now() + BEARER_LIFETIME));
    await expectBearerNotStored(disclosed[0]!.agent, M.scope, disclosed[0]!.bearer);
    expect((await registryStub(M.scope).agents()).filter((a) => a.handle === "@bot3")).toHaveLength(1);
    const other = JSON.stringify({ link: (await inviteAgent("@bot2")).link });
    expect((await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, other, "create-1"), other))).status, "another request under the same op").toBe(409);
    // The key reads back active for @bot, enrolled by the entry the answer names.
    const keys = await allItems(rita, "membership");
    expect(keys.some((i) => i.type === "key" && i.state === "active" && i.values["id"] === answer.key), "the agent's key is active").toBe(true);
    // The pinned client, 2025-11-25: lists the tools of an agent, acts, and the entry names the agent's key as its actor.
    for (const pin of ["legacy", "modern"] as const) {
      const c = new Client({ name: "hosted-test", version: "1" }, pin === "modern" ? { versionNegotiation: { mode: { pin: MODERN } } } : {});
      const transport = new StreamableHTTPClientTransport(new URL(`${SERVICE}/mcp`), { requestInit: { headers: { authorization: `Bearer ${answer.bearer}` } }, fetch: fetchLike } as never);
      await room.wait(() => c.connect(transport));
      const tools = await room.wait(() => c.listTools());
      const names = tools.tools.map((t) => t.name);
      expect(names, pin).toContain("room");
      expect(names, pin).toContain("issue.create");
      const opened = await room.wait(() => c.callTool({ name: "issue.create", arguments: { fields: { definition: DEMO_DIGESTS.issue, title: `Opened by @bot over ${pin}`, conditions: ["done"] }, ...(pin === "legacy" ? { values: [canonicalize(issueDemo)] } : {}), idempotencyKey: `issue-${pin}` } }));
      const content = opened.structuredContent as { answer: string; fact: FactRef };
      expect(content.answer, JSON.stringify(opened.structuredContent)).toBe("accepted");
      const seen = await room.wait(() => c.callTool({ name: "wait", arguments: { scope: "directory", entry: content.fact.seq } }));
      expect((seen.structuredContent as { timedOut: boolean }).timedOut).toBe(false);
      await c.close();
    }
    // The agent's own entries name its key: rita reads the directory's history for the opened issues.
    const steps = (await rita.ok("steps", { scope: "directory" }))["steps"] as { kind: string | null; signer: string | null }[];
    expect(steps.filter((e) => e.kind === "open-issue" && e.signer === answer.key).length, "two issues signed by the agent's key").toBe(2);
    expect(metrics.some(p => p.blobs[0] === "tools-list")).toBe(true);
    expect(metrics.some(p => p.blobs[0] === "tool-call" && p.blobs[3] === "wait" && p.doubles[2]! > 0)).toBe(true);
    for (const phase of ["prepared", "sent", "accepted"]) expect(metrics.filter(p => p.blobs[0] === "custody" && p.blobs[3] === "enrol" && p.blobs[5] === phase)).toHaveLength(2);
    expect(metrics.every(p => p.blobs[8] === MCP_METRIC_SCHEMA)).toBe(true);
    const observation = JSON.stringify(metrics);
    expect(observation).not.toContain(invitation.secret);
    expect(observation).not.toContain(answer.bearer);
    expect(observation).not.toContain(b64url(rita.secret));
    // The secret of the invitation appears in no hosted row but the retained envelope: the agent object's tables hold no copy.
    const registry = env.REGISTRIES.get(env.REGISTRIES.idFromName(M.scope)) as unknown as { agents(): Promise<{ agent: string; handle: string; state: string }[]> };
    expect(await registry.agents()).toEqual(expect.arrayContaining([{ agent: answer.agent, handle: "@bot", key: answer.key, state: "enrolled" }]));
    if (definition === "platform:membership@6") {
      const privateSeed = b64url(new Uint8Array(32).fill(81));
      const invited = await rita.ok("member.invite", { fields: { handle: "@visitor", role: "member", ...invitationIssueFields(definition, privateSeed), inviteEnds: timeOf(room.now() + 3_600_000) }, idempotencyKey: "person-invitation" });
      expect(invited["answer"]).toBe("accepted");
      const { inbox: _inbox, ...repository } = rita.config.repository!;
      const link = INVITATION_LINK + b64url(utf8(JSON.stringify({ v: 1, service: SERVICE, repository, invitation: (invited["fact"] as FactRef).seq, secret: privateSeed, handle: "@visitor", definition })));
      const visitor = room.agent("visitor");
      expect((await visitor.ok("join", { link, idempotencyKey: "person-join" }))["answer"]).toBe("accepted");
      const history = JSON.stringify(await room.platform(M.scope).entries());
      expect(history).not.toContain(privateSeed);
      expect(history).not.toContain(invitation.secret);
      expect(history).not.toContain('"secret"');
    }
  } finally { hostedTest.metrics = null; hostedTest.now = null; hostedTest.clientRegistry = null; hostedTest.pause = null; room.done(); }
});

/** A room created by rita with the issue definition active, and one agent created under `op`; the agent's answer. */
async function hosted(room: Room, rita: Agent, handle: string, op: string, signer: Uint8Array = rita.secret, definition: AgentKeyInvitation["definition"] = "platform:membership@2", controller = "@rita"): Promise<IssuedBearer & { link: string }> {
  const M = rita.config.repository!.membership;
  const { link } = await invite(room, rita, handle, definition, controller);
  const body = JSON.stringify({ link });
  const created = await room.wait(() => post("/mcp/agents", control(room, signer, "create", M, null, body, op), body));
  const answer: IssuedBearer = await created.json();
  expect(created.status, JSON.stringify(answer)).toBe(201);
  return { ...answer, link };
}
async function roomWithIssues(): Promise<{ room: Room; rita: Agent }> {
  const room = mcpRoom();
  hostedTest.clientRegistry = env.REGISTRIES.newUniqueId();
  hostedTest.now = () => room.now();
  hostedTest.pause = (waiting) => room.pause(waiting);
  const rita = room.agent("rita");
  await createRoom(room, rita, "default");
  expect((await rita.ok("rules.publish", { on: 0, fields: { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) }, idempotencyKey: "publish" }))["answer"]).toBe("accepted");
  expect((await rita.ok("rules.activate", { fields: { digest: DEMO_DIGESTS.issue, name: "issue" }, values: [canonicalize(issueDemo)], idempotencyKey: "activate-issue" }))["answer"]).toBe("accepted");
  return { room, rita };
}
const done = (room: Room) => { hostedTest.metrics = null; hostedTest.now = null; hostedTest.clientRegistry = null; hostedTest.pause = null; hostedTest.lose = null; hostedTest.drop = null; hostedTest.controlBudget = null; hostedTest.custodyBounds = null; hostedTest.failWrite = null; hostedTest.faultAt = null; hostedTest.failSession = false; hostedTest.scheduleExpiry = null; hostedTest.roleReply = null; hostedTest.submitted = null; hostedTest.nativeSubmit = null; hostedTest.issuerRandom = null; hostedTest.configHold = null; hostedTest.removalReply = null; room.done(); };
/** A raw request to the agent's endpoint with a bearer. */
const mcp = async (bearer: string, method: string, headers: Record<string, string>, body?: unknown): Promise<Response> => {
  const response = await routed(`${SERVICE}/mcp`, { method, headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json", ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  // A stream a case opens only to see its status is cancelled here, so no body outlives its test.
  if (method === "GET" && response.status === 200 && response.headers.get("content-type")?.startsWith("text/event-stream") && !headers["x-keep-open"]) await response.body?.cancel();
  return response;
};
const META = { "io.modelcontextprotocol/protocolVersion": MODERN, "io.modelcontextprotocol/clientCapabilities": {} };
const modernCall = (bearer: string, name: string, args: Record<string, unknown>, id = 1) =>
  mcp(bearer, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/call", "mcp-name": name }, { jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args, _meta: META } });

// The issuer below is TEST-ONLY direct SQL. The production route, registry,
// agent key, membership standing and removal are Native. No OAuth consent,
// code exchange, deployed connector, or live host runs in this O1 witness.
test("O1 test-issued access tokens bind exact connectors and lose Native reads after controller removal", async () => {
  const { room, rita } = await roomWithIssues();
  const claude = SERVICE + "/mcp?connector=claude", chatgpt = SERVICE + "/mcp?connector=chatgpt";
  const streams: Response[] = [];
  let timerId = 0;
  let timerOwner: string | null = null;
  const timers = new Map<number, { due: number; run: () => Promise<void> }>();
  hostedTest.scheduleExpiry = (delay, run) => { const id = ++timerId; timers.set(id, { due: room.now() + delay, run }); return () => { timers.delete(id); }; };
  const fireDue = async () => {
    for (let n = 0; n < 32; n++) {
      const next = [...timers].filter(([, job]) => job.due <= room.now()).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) return;
      if (timerOwner === null) throw Error("TEST hosted timer has no owning agent");
      timers.delete(next[0]);
      await room.wait(() => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(timerOwner!)), () => next[1].run()));
    }
    throw Error("TEST hosted timer loop did not reach its bounded idle state");
  };
  hostedTest.toolSettings = { MCP_ENABLED: "true", MCP_RESOURCE_URLS: JSON.stringify([claude, chatgpt]) };
  try {
    const M = rita.config.repository!.membership;
    const invitationSecret = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const invitation = await rita.ok("member.invite", { fields: { handle: "@oauth-owner", role: "member", inviteHash: textDigest(invitationSecret), inviteEnds: timeOf(room.now() + 3_600_000) }, idempotencyKey: "TEST-oauth-controller" });
    const link = INVITATION_LINK + b64url(utf8(JSON.stringify({ v: 1, service: SERVICE,
      repository: (({ inbox: _inbox, ...shared }) => shared)(rita.config.repository!),
      invitation: (invitation["fact"] as FactRef).seq, secret: invitationSecret, handle: "@oauth-owner", definition: "platform:membership@2" })));
    const owner = room.agent("oauth-owner", { config: { service: "" } });
    expect((await owner.ok("join", { link, idempotencyKey: "TEST-oauth-controller-join" }))["answer"]).toBe("accepted");
    const controller = (await allItems(rita, "membership")).find(item => item.type === "member" && item.values["handle"] === "@oauth-owner")!;
    const bot = await hosted(room, rita, "@oauth-agent", "TEST-oauth-agent", rita.secret, "platform:membership@2", "@oauth-owner");
    timerOwner = bot.agent;
    const issue = async (resource: string, owner = "@oauth-owner", lifetime = 3_600_000, agent = bot.agent) => {
      const id = b64url(crypto.getRandomValues(new Uint8Array(32))), secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
      const row: OAuthAccessGrant = { controller: owner as MemberId, resource, created: room.now(), ends: room.now() + 86_400_000,
        accessIssued: room.now(), accessExpires: room.now() + lifetime, accessDigest: digestBytes(utf8(secret)) };
      const text = canonicalize(row);
      await room.wait(() => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(agent)), (_instance, state) => state.storage.transactionSync(() => {
        const charge = utf8(text).length + utf8(id).length + 6 + ROW_OVERHEAD;
        const used = Number(state.storage.sql.exec(`SELECT v FROM control_budget WHERE k = 'used'`).toArray()[0]!["v"]);
        expect(used + charge).toBeLessThan(15 * 1024 * 1024);
        state.storage.sql.exec(`INSERT INTO oauth_grant (id, row, state, created) VALUES (?, ?, 'active', ?)`, id, text, row.created);
        state.storage.sql.exec(`UPDATE control_budget SET v = v + ? WHERE k = 'used'`, charge);
      })));
      return { id, token: `${agent}.${id}.${secret}` };
    };
    const list = (resource: string, token: string, address = "192.0.2.11") => room.wait(() => routed(resource, { method: "POST",
      headers: { authorization: `Bearer ${token}`, "cf-connecting-ip": address, "content-type": "application/json", "mcp-protocol-version": MODERN, "mcp-method": "tools/list" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } }) }));
    const first = await issue(claude), second = await issue(chatgpt);
    const missing = await room.wait(() => routed(claude, { method: "POST" }));
    expect(missing.status).toBe(401);
    expect(missing.headers.get("www-authenticate")).toContain("/.well-known/oauth-protected-resource/mcp?connector=claude");
    for (const resource of [claude, chatgpt]) {
      const metadata = await room.wait(() => routed(resource.replace("/mcp?", "/.well-known/oauth-protected-resource/mcp?")));
      expect(metadata.status).toBe(200);
      expect(await metadata.json()).toMatchObject({ resource, authorization_servers: [SERVICE] });
    }
    expect((await room.wait(() => routed(SERVICE + "/.well-known/oauth-protected-resource/mcp?connector=unknown"))).status).toBe(404);
    expect((await list(claude, first.token)).status).toBe(200);
    expect((await list(chatgpt, first.token)).status).toBe(401);
    expect((await list(claude, second.token)).status).toBe(401);
    expect((await list(chatgpt, second.token)).status).toBe(200);
    const wrongSecret = first.token.slice(0, first.token.lastIndexOf(".") + 1) + b64url(new Uint8Array(32).fill(7));
    for (let n = 0; n < 10; n++) expect((await list(claude, wrongSecret, "192.0.2.99")).status).toBe(401);
    expect((await list(claude, first.token, "192.0.2.99")).status, "OAuth failures share the existing address window").toBe(429);
    expect((await list(claude, first.token, "192.0.2.100")).status).toBe(200);
    expect((await list(claude, bot.bearer)).status, "the static bearer still serves").toBe(200);
    const roleRoster = (await allItems(rita, "membership")).find(item => item.type === "roster")!;
    const baseAgentActions = [...roleRoster.values[ROLE_LISTS.agent] as string[]], controllerActions = roleRoster.values[ROLE_LISTS.member] as string[];
    expect(baseAgentActions).toContain("issue.comment"); expect(controllerActions).toContain("issue.comment");
    expect(controllerActions).not.toContain("membership.manage");
    const widerActions = [...baseAgentActions, "membership.manage"];
    const changeActions = async (actions: string[], key: string) => expect((await rita.ok("member.actions", { on: 0, fields: { role: "agent", actions }, idempotencyKey: key }))["answer"]).toBe("accepted");
    const grantState = () => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(bot.agent)), (_instance, state) =>
      state.storage.sql.exec(`SELECT row, state FROM oauth_grant WHERE id = ?`, first.id).toArray());
    const exactGrant = await grantState(), finalTarget = await commentTarget(rita, "TEST-S4-oauth-final-issue");
    const call = (key: string) => routed(claude, { method: "POST", headers: {
      authorization: `Bearer ${first.token}`, "cf-connecting-ip": "192.0.2.78", "content-type": "application/json",
      "mcp-protocol-version": MODERN, "mcp-method": "tools/call", "mcp-name": "issue.comment",
    }, body: JSON.stringify({ jsonrpc: "2.0", id: 94, method: "tools/call", params: { name: "issue.comment",
      arguments: { target: finalTarget, fields: { body: "An exact OAuth request keeps its original." }, idempotencyKey: key }, _meta: META } }) });
    const finalKey = "TEST-S4-oauth-final-comment", gate = holdAfterAdmission("@oauth-agent"), finalPosts: string[] = [];
    hostedTest.submitted = url => { finalPosts.push(new URL(url).pathname); };
    try {
      const pending = room.wait(() => call(finalKey));
      await gate.entered; expect(gate.reads.calls).toBe(2);
      await changeActions(widerActions, "TEST-S4-oauth-final-wider");
      gate.release();
      const response = await pending, stopped = await response.json() as { result: { structuredContent: Record<string, unknown> } };
      expect(response.status).toBe(200);
      expect(stopped.result.structuredContent).toMatchObject({ error: "unauthorized" });
      expect(stopped.result.structuredContent).not.toHaveProperty("answer");
      expect(stopped.result.structuredContent).not.toHaveProperty("submitted");
      expect(finalPosts).toEqual([]); expect(await grantState()).toEqual(exactGrant);
      const original = await custodyFor(bot.agent, finalKey), envelope = structuredClone(original.record.envelope);
      expect(original.record.outcomes).toEqual([]);
      await changeActions(baseAgentActions, "TEST-S4-oauth-final-restore");
      const resumed = await room.wait(() => call(finalKey));
      expect((await resumed.json() as { result: { structuredContent: { answer: string } } }).result.structuredContent.answer).toBe("accepted");
      expect((await custodyFor(bot.agent, finalKey, original.id)).record.envelope).toEqual(envelope);
      expect(finalPosts.filter(path => path.endsWith("/acts"))).toHaveLength(1);
      expect(await grantState()).toEqual(exactGrant);
      expect((await list(claude, first.token, "192.0.2.78")).status).toBe(200);
    } finally {
      gate.release(); hostedTest.roleReply = null; hostedTest.submitted = null;
      await changeActions(baseAgentActions, "TEST-S4-oauth-final-cleanup");
    }

    // A real Access read captures 5000, while Host's later 3000 still
    // clears its admitted/start floor 2000. Keep Native fixture time fixed.
    const clockKey = "TEST-S4-oauth-checkpoint-comment", clockGate = holdAfterAdmission("@oauth-agent"), epoch = room.now();
    const clockPosts: string[] = [], clockReads: number[] = [];
    hostedTest.now = () => epoch + 2000;
    hostedTest.submitted = url => { clockPosts.push(new URL(url).pathname); };
    try {
      const pending = room.wait(() => call(clockKey));
      await clockGate.entered; expect(clockGate.reads.calls).toBe(2);
      hostedTest.roleReply = { agent: "@oauth-agent", at: 1, calls: 0, waiting: Promise.resolve(), entered: () => {
        hostedTest.now = () => { const value = epoch + (clockReads.length === 0 ? 5000 : 3000); clockReads.push(value); return value; };
      } };
      clockGate.release();
      const response = await pending, stopped = await response.json() as { result: { structuredContent: Record<string, unknown> } };
      expect(response.status).toBe(200);
      expect(stopped.result.structuredContent).toMatchObject({ error: "unavailable" });
      expect(clockReads.slice(0, 3)).toEqual([epoch + 5000, epoch + 3000, epoch + 3000]);
      expect(clockReads.slice(1).every(at => at === epoch + 3000)).toBe(true);
      expect(room.now(), "only the Hosted clock seam moved").toBe(epoch);
      expect(clockPosts).toEqual([]); expect(await grantState()).toEqual(exactGrant);
      const original = await custodyFor(bot.agent, clockKey);
      expect(original.record.outcomes).toEqual([]);
      expect(Date.parse(original.record.envelope.signed.intent.notAfter)).toBeGreaterThan(epoch + 5000);
    } finally {
      clockGate.release(); hostedTest.roleReply = null; hostedTest.submitted = null; hostedTest.now = () => room.now();
    }

    const initialization = (resource: string, token: string) => room.wait(() => routed(resource, { method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "mcp-protocol-version": LEGACY },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: LEGACY, capabilities: {}, clientInfo: { name: "TEST-oauth-resource", version: "1" } } }) }));
    const initialize = async (resource: string, token: string) => {
      const response = await initialization(resource, token);
      expect(response.status).toBe(200);
      const id = response.headers.get("mcp-session-id"); expect(id).not.toBeNull();
      return id!;
    };
    const session = await initialize(claude, first.token);
    const legacyList = (resource: string, token: string, id: string) => room.wait(() => routed(resource, { method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "mcp-protocol-version": LEGACY, "mcp-session-id": id },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) }));
    expect((await legacyList(claude, first.token, session)).status).toBe(200);
    expect((await legacyList(chatgpt, second.token, session)).status, "grants never share a legacy session").toBe(404);
    expect((await legacyList(claude, bot.bearer, session)).status, "static bearer has its own sessions").toBe(404);
    const peers = [
      { resource: claude, token: first.token, id: await initialize(claude, first.token) },
      { resource: chatgpt, token: second.token, id: await initialize(chatgpt, second.token) },
      { resource: claude, token: bot.bearer, id: await initialize(claude, bot.bearer) },
      { resource: claude, token: first.token, id: await initialize(claude, first.token) },
    ];
    for (const peer of peers) {
      const response = await room.wait(() => routed(peer.resource, { method: "GET", headers: {
        authorization: `Bearer ${peer.token}`, "mcp-protocol-version": LEGACY, "mcp-session-id": peer.id,
      } }));
      streams.push(response); expect(response.status).toBe(200);
    }
    const fifth = await initialize(chatgpt, second.token);
    expect((await room.wait(() => routed(chatgpt, { method: "GET", headers: {
      authorization: `Bearer ${second.token}`, "mcp-protocol-version": LEGACY, "mcp-session-id": fifth,
    } }))).status, "the four-stream limit spans grants and the static bearer").toBe(409);
    for (const response of streams) {
      const reader = response.body!.getReader();
      await reader.read();
      await reader.cancel();
    }
    streams.length = 0;
    // This cross-object fetch fixture does not finish body cancellation at
    // this barrier, including the static layer. Use authenticated teardown
    // here. oauth-http.scope.test.ts checks the local cancellation hook.
    for (const peer of peers) expect((await room.wait(() => routed(peer.resource, { method: "DELETE", headers: {
      authorization: `Bearer ${peer.token}`, "mcp-protocol-version": LEGACY, "mcp-session-id": peer.id,
    } }))).status).toBe(200);
    expect(timers.size, "ending the last stream cancels both deadline and standing timers").toBe(0);
    const staticSession = await initialize(claude, bot.bearer);
    const rotation = await room.wait(() => post(`/mcp/agents/${bot.agent}/bearer`, control(room, rita.secret, "bearer", M, bot.agent, "", "TEST-oauth-static-rotation"), ""));
    expect(rotation.status).toBe(200);
    const replacement = await rotation.json() as IssuedBearer;
    expect((await list(claude, bot.bearer)).status).toBe(401);
    expect((await legacyList(claude, replacement.bearer, staticSession)).status).toBe(404);
    expect((await legacyList(claude, first.token, session)).status, "static rotation preserves OAuth sessions").toBe(200);
    await initialize(claude, replacement.bearer);
    const expired = await issue(claude, "@oauth-owner", 1000);
    const shortSession = await initialize(claude, expired.token);
    const shortStream = await room.wait(() => routed(claude, { method: "GET", headers: {
      authorization: `Bearer ${expired.token}`, "mcp-protocol-version": LEGACY, "mcp-session-id": shortSession,
    } }));
    streams.push(shortStream); expect(shortStream.status).toBe(200);
    expect([...timers.values()].every(job => job.due === room.now() + 1000), "an access deadline schedules no zero-delay refresh loop").toBe(true);
    room.advance(1000);
    await fireDue();
    expect(await shortStream.text(), "access expiry closes the existing stream").toContain("event: end");
    streams.splice(streams.indexOf(shortStream), 1);
    expect(timers.size).toBe(0);
    const refusal = await list(claude, expired.token);
    expect(refusal.status).toBe(401);
    expect(refusal.headers.get("www-authenticate")).toContain('error="invalid_token"');
    for (let n = 0; n < 13; n++) await initialize(claude, first.token);
    expect((await initialization(chatgpt, second.token)).status, "the sixteen-session limit spans credentials without evicting another host").toBe(507);
    expect((await legacyList(chatgpt, second.token, fifth)).status).toBe(200);
    const count = await room.wait(() => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(bot.agent)), (_instance, state) => Number(state.storage.sql.exec(`SELECT (SELECT count(*) FROM session) + (SELECT count(*) FROM oauth_session) AS n`).toArray()[0]!["n"])));
    expect(count).toBe(16);
    const standingStream = await room.wait(() => routed(claude, { method: "GET", headers: {
      authorization: `Bearer ${first.token}`, "mcp-protocol-version": LEGACY, "mcp-session-id": session,
    } }));
    streams.push(standingStream); expect(standingStream.status).toBe(200);
    const removed = await rita.ok("member.remove", { on: controller.id, idempotencyKey: "TEST-remove-oauth-controller" });
    expect(removed["answer"]).toBe("accepted");
    room.advance(30_000);
    await fireDue();
    expect(await standingStream.text(), "standing refresh ends a removed controller's existing stream").toContain("event: end");
    streams.splice(streams.indexOf(standingStream), 1);
    expect(timers.size).toBe(0);
    room.advance(OAUTH_STANDING_MS);
    expect((await list(claude, first.token)).status).toBe(401);
    expect((await list(chatgpt, second.token)).status).toBe(401);
    const states = await room.wait(() => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(bot.agent)), (_instance, state) => state.storage.sql.exec(`SELECT id, state FROM oauth_grant WHERE id IN (?, ?) ORDER BY id`, first.id, second.id).toArray()));
    expect(states.map(row => row["state"])).toEqual(["ended", "ended"]);
    const retired = await hosted(room, rita, "@oauth-retired", "TEST-oauth-retired");
    const retiredToken = await issue(claude, "@rita", 3_600_000, retired.agent);
    expect((await list(claude, retiredToken.token)).status).toBe(200);
    expect((await room.wait(() => post(`/mcp/agents/${retired.agent}`, control(room, rita.secret, "retire", M, retired.agent, "", "TEST-oauth-retire"), "", "DELETE"))).status).toBe(202);
    expect((await list(claude, retiredToken.token)).status).toBe(401);
    const revoked = await hosted(room, rita, "@oauth-revoked", "TEST-oauth-revoked");
    const revokedToken = await issue(claude, "@rita", 3_600_000, revoked.agent);
    expect((await list(claude, revokedToken.token)).status).toBe(200);
    const keyItem = (await allItems(rita, "membership")).find(item => item.type === "key" && item.values["id"] === revoked.key)!;
    expect((await rita.ok("key.revoke", { on: keyItem.id, fields: { as: "retired" }, idempotencyKey: "TEST-revoke-oauth-key" }))["answer"]).toBe("accepted");
    room.advance(OAUTH_STANDING_MS);
    expect((await list(claude, revokedToken.token)).status, "a revoked Native agent key ends OAuth access within sixty seconds").toBe(401);
    const revokedState = await room.wait(() => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(revoked.agent)), (_instance, state) => state.storage.sql.exec(`SELECT state FROM oauth_grant WHERE id = ?`, revokedToken.id).toArray()[0]!["state"]));
    expect(revokedState).toBe("ended");
  } finally { for (const response of streams) await response.body?.cancel(); hostedTest.toolSettings = null; done(room); }
});

// A rewritten Request is ONLY the Worker boundary of a proxy, not an actual
// proxy/celld witness. Registry, agent, invitation/enrolment and MCP are real
// Native objects; the room's Git host and clock retain their TEST fixtures.
test("configured public HTTPS origin binds a real hosted create and MCP session behind an internal HTTP Worker request", async context => {
  const room = mcpRoom(), publicOrigin = "https://public-room.example", internalOrigin = "http://celld.internal:8787";
  hostedTest.clientRegistry = env.REGISTRIES.newUniqueId();
  hostedTest.now = () => room.now(); hostedTest.pause = waiting => room.pause(waiting);
  let client: Client | undefined;
  try {
    const rita = room.agent("rita");
    await createRoom(room, rita);
    const membership = rita.config.repository!.membership;
    const boundary = (path: string, init: RequestInit, settings: { PUBLIC_ORIGIN?: string } = {}) => room.wait(() => worker.fetch(
      new Request(internalOrigin + path, init), { ...env, REGISTRIES: hostedRegistries(env.REGISTRIES), SCOPES: env.PLATFORM, MCP_ENABLED: "true", ...settings }));
    const fresh = async (handle: string, op: string, signedService = publicOrigin) => {
      const invitation = (await invite(room, rita, handle)).invitation;
      const body = JSON.stringify({ link: encodeAgentKeyInvitation({ ...invitation, service: publicOrigin }) });
      return { body, authorization: control(room, rita.secret, "create", membership, null, body, op, { service: signedService }) };
    };
    const refused = async (handle: string, op: string, headers: Record<string, string> = {}, service = publicOrigin) => {
      const input = await fresh(handle, op, service);
      const response = await boundary("/mcp/agents", { method: "POST", headers: { "content-type": "application/json", authorization: input.authorization, ...headers }, body: input.body }, service === publicOrigin ? {} : { PUBLIC_ORIGIN: publicOrigin });
      expect([response.status, await response.json()]).toEqual([403, { error: "control", rule: "service" }]);
    };
    await refused("@unset-origin", "h1-unset");
    await refused("@forwarded-only", "h1-forwarded", { host: "different-host.example", forwarded: 'host="public-room.example";proto=https', "x-forwarded-host": "public-room.example", "x-forwarded-proto": "https" });
    await refused("@wrong-service", "h1-wrong-service", {}, "https://different-service.example");
    const input = await fresh("@public-origin", "h1-public-origin");
    const created = await boundary("/mcp/agents", { method: "POST", headers: { "content-type": "application/json", authorization: input.authorization, host: "different-host.example" }, body: input.body }, { PUBLIC_ORIGIN: publicOrigin });
    const issued = await created.json() as IssuedBearer;
    expect(created.status).toBe(201);
    expect(issued.bearer.startsWith(issued.agent + ".")).toBe(true);
    const proxyBoundary = (async (url: string | URL | Request, init?: RequestInit) => {
      const requested = new URL(url instanceof Request ? url.url : url);
      expect(requested.origin).toBe(publicOrigin);
      return boundary(requested.pathname + requested.search, { ...init, headers: { ...Object.fromEntries(new Headers(init?.headers)), host: "different-host.example" } }, { PUBLIC_ORIGIN: publicOrigin });
    }) as unknown as typeof fetch;
    client = new Client({ name: "public-origin-native", version: "1" }, { versionNegotiation: { mode: { pin: MODERN } } });
    await room.wait(() => client!.connect(new StreamableHTTPClientTransport(new URL(publicOrigin + "/mcp"), {
      fetch: proxyBoundary, requestInit: { headers: { authorization: `Bearer ${issued.bearer}` } },
    } as never)));
    expect((await room.wait(() => client!.listTools())).tools.map(tool => tool.name)).toContain("room");
    expect((await room.wait(() => client!.callTool({ name: "room", arguments: {} }))).isError).not.toBe(true);
    const wrong = control(room, rita.secret, "bearer", membership, issued.agent, "{}", "h1-wrong-rotation", { service: "https://different-service.example" });
    const rotation = await boundary(`/mcp/agents/${issued.agent}/bearer`, { method: "POST", headers: { authorization: wrong, "content-type": "application/json" }, body: "{}" }, { PUBLIC_ORIGIN: publicOrigin });
    expect([rotation.status, await rotation.json()]).toEqual([403, { error: "control", rule: "service" }]);
    Object.assign(context.task.meta, { publicOrigin: { qualification: "Real Native registry/agent and MCP client; rewritten Request covers Worker boundary only, not an actual TLS proxy or celld.", internalProtocol: "http", publicProtocol: "https", createdStatus: created.status, unsetStatus: 403, forwardedOnlyStatus: 403, wrongServiceStatus: 403, initialized: true, roomTool: true } });
  } finally { if (client) await room.wait(() => client!.close()); done(room); }
});
test("hosted default policy travels through Worker Env and the actual agent constructor to list and call", async () => {
  const previousToolSettings = hostedTest.toolSettings;
  hostedTest.toolSettings = { MCP_ENABLED: "true" };
  const room = mcpRoom();
  hostedTest.clientRegistry = env.REGISTRIES.newUniqueId();
  hostedTest.now = () => room.now();
  hostedTest.pause = waiting => room.pause(waiting);
  try {
    const rita = room.agent("rita");
    await createRoom(room, rita);
    const bot = await hosted(room, rita, "@default-policy", "default-policy-create");
    const listed = await room.wait(() => mcp(bot.bearer, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } }));
    expect(listed.status).toBe(200);
    const body = await listed.json() as { result: { tools: { name: string }[] } };
    const names = body.result.tools.map(tool => tool.name);
    expect(names).toContain("room");
    for (const name of ["create", "install_application", "credential", "diff", "prepare", "join", "record"]) {
      expect(names).not.toContain(name);
      const called = await room.wait(() => modernCall(bot.bearer, name, {}));
      const refused = await called.json() as { result: { isError: boolean; structuredContent: Record<string, unknown> } };
      expect(refused.result.isError).toBe(true);
      expect(refused.result.structuredContent).toEqual({ error: "unknown-tool", message: `No tool is named ${name} in this list.`, next: "Call tools/list." });
    }
    const orientation = await room.wait(() => modernCall(bot.bearer, "room", {}));
    expect((await orientation.json() as { result: { isError: boolean } }).result.isError).toBe(false);
  } finally { hostedTest.toolSettings = previousToolSettings; done(room); }
});
// The agent loop on the hosted default: every fact and text the agent uses comes
// from its own tool calls. Rita only makes the room's state, as the person.
test("a hosted session on the default tools accepts exact terms and releases its block with facts and text it read through hosted tools", async () => {
  const previousToolSettings = hostedTest.toolSettings;
  hostedTest.toolSettings = { MCP_ENABLED: "true" };
  const room = mcpRoom();
  hostedTest.clientRegistry = env.REGISTRIES.newUniqueId();
  hostedTest.now = () => room.now();
  hostedTest.pause = waiting => room.pause(waiting);
  try {
    const rita = room.agent("rita");
    await createRoom(room, rita, "default");
    expect((await rita.ok("rules.publish", { on: 0, fields: { approvals: 0, ownerMayReview: false, checks: [], labels: [], extents: firstExtents({ approvals: 0, checks: [] }) }, idempotencyKey: "publish" }))["answer"]).toBe("accepted");
    expect((await rita.ok("rules.activate", { fields: { digest: QUESTION_DIGESTS.issue, name: "issue" }, values: [canonicalize(issueQuestions)], idempotencyKey: "activate-issue" }))["answer"]).toBe("accepted");
    const roster = (await allItems(rita, "membership")).find(item => item.type === "roster")!;
    const prior = roster.values[ROLE_LISTS.admin] as string[];
    expect((await rita.ok("member.actions", { on: 0, fields: { role: "admin", actions: [...prior, ...["issue.approve", "issue.decide"].filter(action => !prior.includes(action))] }, idempotencyKey: "admin-decides" }))["answer"]).toBe("accepted");
    const bot = await hosted(room, rita, "@bot", "create-bot");
    const person = async (name: string, args: Record<string, unknown>) => {
      const answer = await rita.ok(name, { idempotencyKey: crypto.randomUUID(), ...args });
      expect(answer["answer"], `${name}: ${JSON.stringify(answer)}`).toBe("accepted");
      return answer["fact"] as FactRef;
    };
    const opened = await person("issue.create", { fields: { definition: QUESTION_DIGESTS.issue, title: "TEST hosted loop", conditions: ["TEST first terms"] }, values: [canonicalize(issueQuestions)] });
    const created = await rita.ok("wait", { scope: "directory", entry: opened.seq });
    const made = (created["created"] as { scope: ScopeId; kind: string }[]).find(row => row.kind === "lane")!.scope;
    await person("issue.offer", { target: made, fields: { offeree: "@bot" } });

    const called: string[] = [];
    const tool = async (name: string, args: Record<string, unknown> = {}) => {
      called.push(name);
      const reply = await room.wait(() => modernCall(bot.bearer, name, args));
      const body = await reply.json() as { result: { isError: boolean; structuredContent: Record<string, unknown> } };
      expect(body.result.isError, `${name}: ${JSON.stringify(body.result.structuredContent)}`).toBe(false);
      return body.result.structuredContent;
    };
    const did = async (name: string, args: Record<string, unknown>) => {
      const answer = await tool(name, { idempotencyKey: crypto.randomUUID(), ...args });
      expect(answer["answer"], `${name}: ${JSON.stringify(answer)}`).toBe("accepted");
      return answer["fact"] as FactRef;
    };
    const factOf = async (scope: ScopeId, seq: number): Promise<FactRef> => {
      const read = await tool("step", { scope, seq });
      const entry = read["entry"] as Entry;
      return { at: entry.at, seq, hash: read["hash"] as FactRef["hash"] };
    };
    const seqOf = (ref: unknown): number => typeof ref === "number" ? ref : (ref as FactRef).seq;
    const wholeText = async (scope: ScopeId, digest: string): Promise<string> => {
      let whole = "", offset: number | undefined;
      do {
        const part = await tool("text", { scope, kind: "text", digest, ...(offset !== undefined ? { offset } : {}) });
        whole += part["text"] as string;
        offset = part["offset"] as number | undefined;
      } while (offset !== undefined);
      return whole;
    };

    const listed = await room.wait(() => mcp(bot.bearer, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } }));
    const names = (await listed.json() as { result: { tools: { name: string }[] } }).result.tools.map(row => row.name);
    for (const name of ["step", "text", "steps", "items", "issue.take", "issue.block", "issue.release-block"]) expect(names).toContain(name);
    expect(names).not.toContain("record");

    // Accept: the terms come from the entry that the commitment names.
    const lane = ((await tool("room"))["lanes"] as { scope: ScopeId; kind: string }[]).find(row => row.kind === "issue")!.scope;
    expect(lane).toBe(made);
    const items = async (type: string, final = false) => (await tool("items", { scope: lane, type, final }))["items"] as Item[];
    const offered = (await items("commitment")).find(item => item.state === "offered")!;
    await did("issue.take", { target: lane, on: offered.id, fields: { terms: await factOf(lane, seqOf(offered.refs["termsAt"])) } });

    // Ask and block, on a question long enough to be a detached text.
    const body = "TEST question body. ".repeat(3000);
    const question = await did("issue.ask", { target: lane, fields: { question: "TEST which terms?", body } });
    await did("issue.request-approval", { target: lane, fields: { ask: question.seq, bodyAt: question, requested: "@rita" } });
    await did("issue.block", { target: lane, fields: { commitment: offered.id, on: question } });

    // The person approves with a long comment and decides.
    const comment = "TEST the person's reasons. ".repeat(2000);
    const request = (await allItems(rita, lane)).find(item => item.type === "approval-request" && item.state === "open")!;
    await person("issue.approve", { target: lane, fields: { request: request.id, bodyAt: question, verdict: "approve", comment } });
    await person("issue.decide", { target: lane, on: question.seq, fields: { bodyAt: question } });

    // The agent reads each person's whole text by the digest its entry holds.
    const asked = (await items("ask", true)).find(item => item.id === question.seq)!;
    expect(asked.state).toBe("decided");
    expect(await wholeText(lane, asked.values["body"] as string)).toBe(body);
    const steps = (await tool("steps", { scope: lane }))["steps"] as { seq: number; kind: string | null }[];
    const approval = await tool("step", { scope: lane, seq: steps.find(row => row.kind === "approve")!.seq });
    const signed = (approval["entry"] as { input: { signed: { intent: { fields: { comment: string } } } } }).input.signed;
    expect(await wholeText(lane, signed.intent.fields.comment)).toBe(comment);

    // Release: the answer is the decide entry that the question names.
    const block = (await items("block")).find(item => item.state === "blocked")!;
    const decision = await factOf(lane, seqOf(asked.refs["decisionAt"]));
    expect(((await tool("step", { scope: lane, seq: decision.seq }))["entry"] as Entry).input).toMatchObject({ type: "act", signed: { intent: { kind: "decide", on: asked.id } } });
    await did("issue.release-block", { target: lane, on: block.id, fields: { commitment: offered.id, answer: decision } });
    expect((await items("block", true)).find(item => item.id === block.id)).toMatchObject({ state: "released" });
    expect(called).not.toContain("record");
  } finally { hostedTest.toolSettings = previousToolSettings; done(room); }
});
// Invariant: an enrolled native hosted agent's production fetch port carries
// deployment admission settings, so its signed parentless install is refused.
// The existing room uses the TEST namespace/clock and a STAND-IN Git provider.
test("hosted production fetch preserves deployed parentless creation admission", async () => {
  const room = mcpRoom();
  hostedTest.clientRegistry = env.REGISTRIES.newUniqueId();
  const previous = { settings: creationTest.settings, productionHostedFetch: creationTest.productionHostedFetch };
  hostedTest.now = () => room.now();
  hostedTest.pause = waiting => room.pause(waiting);
  try {
    const rita = room.agent("rita");
    const { register } = await createRoom(room, rita);
    creationTest.settings = { DEPLOYMENT: "native-hosted-creation-admission", ARTIFACTS_CONFIG: JSON.stringify({ registerScope: register, namespace: "artroom-demo", host: "scopes.test", maxBytes: 1024, credentialIdentity: "adapter-attempt" }) };
    creationTest.productionHostedFetch = true;
    // A unique real registry reservation constructs this agent under those
    // explicit settings; ports() omits its fetch override for this case.
    const agent = await hosted(room, rita, "@admission-bot", "creation-admission-agent");
    const response = await room.wait(() => modernCall(agent.bearer, "create", { definition: "platform:register@3", kind: "install", fields: { host: "artifacts", namespace: "artroom-demo", policy: "keys", founders: [agent.key] }, idempotencyKey: "unplanned-hosted-install" }));
    const body = await response.json() as { result?: { structuredContent?: Record<string, unknown> }; error?: unknown };
    expect([response.status, body.error]).toEqual([200, undefined]);
    expect(body.result?.structuredContent).toMatchObject({ answer: "refused", reason: "unauthorized" });
    const keptCreate = await custodyFor(agent.agent, "unplanned-hosted-install");
    expect(keptCreate.record.identity).toMatchObject({ membership: null, signer: agent.key, target: { create: "platform:register@3" } });
    expect(keptCreate.record.envelope.signed.intent.kind).toBe("install");
    expect(keptCreate.record.envelope.creation?.definition).toBe("platform:register@3");
    expect(keptCreate.record.outcomes).toHaveLength(1);
  } finally {
    creationTest.settings = previous.settings;
    creationTest.productionHostedFetch = previous.productionHostedFetch;
    done(room);
  }
});

// A hosted key is already enrolled and meets the earlier key-in-use guard.
// Fresh, unconfigured MCP services exercise native invitation failures through
// the production Worker without a transport address. Git/clock/token setup
// remain the room fixture's; no hosted bearer is claimed to be an unknown key.
test("fresh MCP services' addressless native join failures count by verified key while an enrolled hosted key meets its earlier guard", async () => {
  const room = mcpRoom(), previous = { production: creationTest.productionHostedFetch, limits: platformNet.limits };
  hostedTest.clientRegistry = env.REGISTRIES.newUniqueId();
  platformNet.limits = { windowSeconds: 60, failures: 2, windows: 4096, waiting: 8, joinBytes: 16 * 1024 };
  hostedTest.now = () => room.now(); hostedTest.pause = waiting => room.pause(waiting);
  try {
    const rita = room.agent("rita");
    await createRoom(room, rita);
    creationTest.productionHostedFetch = true;
    const agent = await hosted(room, rita, "@limited-bot", "r12-join-agent");
    const M = rita.config.repository!.membership, expectedSeed = crypto.getRandomValues(new Uint8Array(32));
    const expectedSecret = b64url(expectedSeed), wrongSeed = expectedSeed.slice(); wrongSeed[0] = wrongSeed[0]! ^ 1;
    const invitation = await rita.ok("member.invite", { fields: { handle: "@r12-visitor", role: "member", inviteHash: textDigest(expectedSecret), inviteEnds: timeOf(room.now() + 3_600_000) }, idempotencyKey: "r12-person-invitation" });
    const { inbox: _inbox, ...repository } = rita.config.repository!;
    const wrongLink = INVITATION_LINK + b64url(utf8(JSON.stringify({ v: 1, service: SERVICE, repository,
      invitation: (invitation["fact"] as FactRef).seq, secret: b64url(wrongSeed), handle: "@r12-visitor", definition: "platform:membership@2" })));
    const fresh = () => {
      const signer = secretSigner(crypto.getRandomValues(new Uint8Array(32)));
      return { key: signer.key, service: new McpService({ service: SERVICE, signer, custody: memoryStore(), now: room.now,
        fetch: (url, init) => room.wait(() => routed(url, init)), every: () => () => {},
        config: { read: async () => ({ service: SERVICE }), addRoot: async () => { throw Error("A refused join must not add a root"); } } }) };
    };
    const visitor = fresh(), otherVisitor = fresh();
    for (const key of [visitor.key, otherVisitor.key])
      expect(await room.wait(() => room.platform(M.scope).stub.observe({ of: M, key }))).toMatchObject({ of: M, key, keyState: "unknown" });
    const before = (await room.platform(M.scope).summary()).at;
    // Actual hosted control/enrolment remains covered, but its known key must
    // not be mistaken for a wrong-secret failure that charges the join window.
    const nativeJoins: Parameters<NonNullable<typeof hostedTest.nativeSubmit>>[1][] = [];
    hostedTest.nativeSubmit = (scope, signed) => {
      if (scope === M.scope && signed.intent.actor === agent.key && signed.intent.kind === "join") nativeJoins.push(structuredClone(signed));
    };
    const enrolledResponse = await room.wait(() => modernCall(agent.bearer, "join", { link: wrongLink, idempotencyKey: "r12-enrolled-key" }));
    const enrolled = await enrolledResponse.json() as { error?: unknown; result?: { structuredContent?: Record<string, unknown> } };
    expect([enrolledResponse.status, enrolled.error, enrolled.result?.structuredContent?.["answer"], enrolled.result?.structuredContent?.["name"]])
      .toEqual([200, undefined, "refused", "key-in-use"]);
    expect(nativeJoins).toHaveLength(1);
    const keptJoin = await custodyFor(agent.agent, "r12-enrolled-key");
    expect(keptJoin.record.envelope.signed).toEqual(nativeJoins[0]);
    expect(keptJoin.record.identity).toMatchObject({ target: M, signer: agent.key });
    expect(keptJoin.record.outcomes).toHaveLength(1);
    hostedTest.nativeSubmit = null;
    const replies: Record<string, unknown>[] = [];
    for (let n = 0; n < 3; n++) {
      const reply = await room.wait(() => visitor.service.call("join", { link: wrongLink, idempotencyKey: `r12-bad-join-${n}` }));
      expect(reply.isError).toBe(false); replies.push(reply.structuredContent);
    }
    expect(replies.map(reply => [reply["answer"], reply["name"] ?? reply["reason"]]))
      .toEqual([["refused", "invitation-refused"], ["refused", "invitation-refused"], ["unavailable", "rate-limited"]]);
    expect((await room.platform(M.scope).summary()).at).toEqual(before);
    const other = await room.wait(() => otherVisitor.service.call("join", { link: wrongLink, idempotencyKey: "r12-other-key" }));
    expect([other.isError, other.structuredContent["answer"], other.structuredContent["name"]]).toEqual([false, "refused", "invitation-refused"]);
    expect((await room.platform(M.scope).summary()).at).toEqual(before);
  } finally {
    creationTest.productionHostedFetch = previous.production; platformNet.limits = previous.limits; done(room);
  }
});

test.for(["legacy", "modern"] as const)("R12 default-limit hosted MCP %s connect, listTools and initial room count actual Signed admissions separately from sessions", async (revision, context) => {
  expect(startupTest.index).toBeNull();
  const owned = new StartupOwner(env.STARTUP_INDEX);
  const previous = creationTest.productionHostedFetch;
  let client: Client | undefined;
  let failed = false;
  try { await owned.run(async () => {
    const index = env.STARTUP_INDEX.get(env.STARTUP_INDEX.idFromName(SCOPE_INDEX_NAME));
    const port = index as unknown as ScopeIndexPort;
    // Activate without admission or index writes before the initial cold reset.
    await runInDurableObject(index, instance => startupSnapshot(instance as StartupServingIndex));
    await evictDurableObject(index);
    owned.assertOpen();
    const room = mcpRoom({ finish: "external", capture: life => owned.attach(life, () => { creationTest.productionHostedFetch = previous; done(room); }) });
    hostedTest.clientRegistry = env.REGISTRIES.newUniqueId();
    hostedTest.now = () => room.now(); hostedTest.pause = waiting => room.pause(waiting);
    const rita = room.agent("rita");
    const { register } = await createRoom(room, rita, "default", ARCHIVE_DEVICE_APPLICATION_COHORT.register);
    creationTest.productionHostedFetch = true;
    const made = await hosted(room, rita, `@startup-${revision}`, `r12-startup-${revision}`, rita.secret, ARCHIVE_DEVICE_APPLICATION_COHORT.membership);
    const membership = rita.config.repository!.membership;
    expect((await room.platform(membership.scope).summary()).value.definition).toBe(ARCHIVE_DEVICE_APPLICATION_COHORT.membership);
    // Join actual registration callbacks from the genuine setup, without inserting index rows.
    const repository = rita.config.repository!;
    const inbox = repository.inbox;
    if (!inbox) throw new Error("The actual native first-key inbox is required.");
    for (const scope of [register, repository.directory.scope, membership.scope, repository.rules, repository.destination, inbox])
      await room.wait(() => runInDurableObject(env.PLATFORM.get(env.PLATFORM.idFromName(scope)), instance => (instance as PlatformScope).awaitScheduledCallbacks()));
    expect(await port.has(membership.scope, "membership")).toBe(true); // actual native registration callback
    const setup = await runInDurableObject(index, instance => startupSnapshot(instance as StartupServingIndex));
    const agent = env.AGENTS.get(env.AGENTS.idFromString(made.agent));
    await evictDurableObject(agent); // actual cold startup from the enrolled durable state
    await evictDurableObject(index); // actual rate-memory reset; keep registered native scopes
    expect(await port.has(membership.scope, "membership")).toBe(true);
    const before = await runInDurableObject(index, instance => startupSnapshot(instance as StartupServingIndex));
    expect(before.instance).not.toBe(setup.instance);
    client = new Client({ name: "r12-startup", version: "1" }, revision === "modern" ? { versionNegotiation: { mode: { pin: MODERN } } } : {});
    owned.closeWith(() => room.wait(() => client!.close()));
    const startupFetch = ((url: string | URL | Request, init?: RequestInit) => owned.wait(() => routed(url instanceof Request ? url.url : url, init))) as unknown as typeof fetch;
    const transport = new StreamableHTTPClientTransport(new URL(`${SERVICE}/mcp`), { requestInit: { headers: { authorization: `Bearer ${made.bearer}` } }, fetch: startupFetch } as never);
    await room.wait(() => client!.connect(transport));
    const tools = await room.wait(() => client!.listTools());
    expect(tools.tools.some(tool => tool.name === "room")).toBe(true);
    const initial = await room.wait(() => client!.callTool({ name: "room", arguments: {} }));
    expect(initial.isError).not.toBe(true);
    await owned.quiesce(); // includes original native scheduled callbacks, not just Client completion
    const after = await runInDurableObject(index, instance => startupSnapshot(instance as StartupServingIndex));
    const reads = await runInDurableObject(agent, instance => (instance as PlatformMcpAgent).startupReads.snapshot());
    const report = startupReport(before, after, reads);
    // Actual post-phase cohort observations, not caller startup requests.
    const cohort = {
      register: (await room.platform(register).summary()).value.definition,
      directory: (await room.platform(repository.directory.scope).summary()).value.definition,
      membership: (await room.platform(repository.membership.scope).summary()).value.definition,
      rules: (await room.platform(repository.rules).summary()).value.definition,
      destination: (await room.platform(repository.destination).summary()).value.definition,
      inbox: (await room.platform(inbox).summary()).value.definition,
    };
    const actual = { ...report, setup, path: `Hosted MCP ${revision} cold connect/listTools/room`,
      cohort, transportAddress: null,
      qualification: report.qualification + " Actual Client and original hosted production fetch; Native local scopes. Git, clock, scheduler and token setup are existing fixtures. No hosted deployment or browser/provider claim." };
    console.info("R12 default startup", JSON.stringify(actual));
    (context.task.meta as Record<string, unknown>)["r12Startup"] = actual;
    expect(cohort).toEqual(ARCHIVE_DEVICE_APPLICATION_COHORT);
    expect([report.complete, report.requiresDefaultAdjustment, after.defaults, reads.calls > 0])
      .toEqual([true, false, DEFAULT_SERVING_LIMITS, true]);
    expect(after.counts.some(row => row.by === "address")).toBe(false);
  }); } catch (error) { failed = true; throw error; }
  finally {
    try { await owned.finish(); }
    catch (error) { if (!failed) throw error; console.error("R12 startup cleanup incomplete; original failure retained and ownership not reset"); }
  }
});

const LEGACY = "2025-11-25";
/** A legacy session: initialized, listed once; its ID and the listed generation. */
async function legacySession(bearer: string): Promise<string> {
  const opened = await mcp(bearer, "POST", { "mcp-protocol-version": LEGACY }, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: LEGACY, capabilities: {}, clientInfo: { name: "h", version: "0" } } });
  expect(opened.status).toBe(200);
  const id = opened.headers.get("mcp-session-id")!;
  expect((await mcp(bearer, "POST", { "mcp-protocol-version": LEGACY, "mcp-session-id": id }, { jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);
  return id;
}
/** A session's GET stream, read in the background: its events so far, and a way to stop reading. */
function stream(bearer: string, session: string): { text: () => string; stop: () => void; ready: Promise<number>; opening: Promise<void>; ended: Promise<number> } {
  const abort = new AbortController();
  const seen: string[] = [];
  let respond!: (status: number) => void;
  const ready = new Promise<number>(resolve => { respond = resolve; });
  let received!: () => void;
  const opening = new Promise<void>(resolve => { received = resolve; });
  const ended = routed(`${SERVICE}/mcp`, { method: "GET", signal: abort.signal, headers: { authorization: `Bearer ${bearer}`, "mcp-protocol-version": LEGACY, "mcp-session-id": session } })
    .then(async (res) => {
      respond(res.status);
      if (res.status !== 200 || !res.body) { received(); return res.status; }
      const reader = res.body.getReader();
      try {
        for (;;) {
          const r = await reader.read();
          if (r.done) break;
          seen.push(new TextDecoder().decode(r.value));
          if (seen.join("").includes(": stream\n\n")) received();
        }
      } catch { /* aborted */ } finally { received(); }
      return res.status;
    }).catch(() => { respond(-1); received(); return -1; });
  return { text: () => seen.join(""), stop: () => abort.abort(), ready, opening, ended };
}
const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const until = async (check: () => boolean, ms = 3000) => { for (let t = 0; t < ms && !check(); t += 25) await new Promise((r) => setTimeout(r, 25)); return check(); };
const agentStub = (id: string) => env.AGENTS.get(env.AGENTS.idFromString(id)) as unknown as { reset(): Promise<void>; holdRemoval(): Promise<void>; roleIdentity(): Promise<HostedAgentIdentityRead>; tick(): Promise<boolean>; counts(): Promise<{ streams: number; sessions: number }>; heldAnswers(): Promise<{ control: { op: string; answer: boolean }[]; agent: boolean }>; used(): Promise<number>; durableFacts(): Promise<{ key: string | null; state: string | null; enrol: string | null; bearer: boolean }>; custodyRecord(key: string): Promise<{ intent: string; attempt: number; outcomes: number; phase: string; steps: string[]; reserved: number } | null> };
const intentDigestOf = (intent: unknown) => digestBytes(utf8(canonicalize(intent as never)));
const registryStub = (membership: string) => env.REGISTRIES.get(env.REGISTRIES.idFromName(membership)) as unknown as { agents(): Promise<{ agent: string; handle: string; state: string }[]>; heldAnswers(): Promise<{ op: string; answer: boolean }[]> };
/** A 2026-07-28 listen, read in the background: its events so far. */
function listen(bearer: string): { text: () => string; stop: () => void; ended: Promise<number> } {
  const abort = new AbortController();
  const seen: string[] = [];
  const body = { jsonrpc: "2.0", id: 0, method: "subscriptions/listen", params: { notifications: { toolsListChanged: true }, _meta: META } };
  const ended = routed(`${SERVICE}/mcp`, { method: "POST", signal: abort.signal, headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json", "mcp-protocol-version": MODERN, "mcp-method": "subscriptions/listen" }, body: JSON.stringify(body) })
    .then(async (res) => { if (res.status !== 200 || !res.body) return res.status; const reader = res.body.getReader(); try { for (;;) { const r = await reader.read(); if (r.done) break; seen.push(new TextDecoder().decode(r.value)); } } catch { /* aborted */ } return res.status; }).catch(() => -1);
  return { text: () => seen.join(""), stop: () => abort.abort(), ended };
}

test("H2, H3 and H4: agents kept apart, control authority, the bearer and revocation", async () => {
  const { room, rita } = await roomWithIssues();
  try {
    const M = rita.config.repository!.membership;
    const bot = await hosted(room, rita, "@bot", "create-bot");
    // Keep expiry/renewal independent of the revoked-key refusal below.
    const expiryBot = await hosted(room, rita, "@expiry-bot", "TEST-expiry-active-key");
    // paul joins as a plain member through his own server, with an invitation from rita.
    const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const invited = await rita.ok("member.invite", { fields: { handle: "@paul", role: "member", inviteHash: textDigest(secret), inviteEnds: timeOf(room.now() + 3_600_000) }, idempotencyKey: "invite-paul" });
    const link = `${INVITATION_LINK}${b64url(utf8(JSON.stringify({ v: 1, service: SERVICE, repository: (({ inbox: _inbox, ...shared }) => shared)(rita.config.repository!), invitation: (invited["fact"] as FactRef).seq, secret, handle: "@paul", definition: "platform:membership@2" })))}`;
    const paul = room.agent("paul", { config: { service: "" } });
    expect((await paul.ok("join", { link, idempotencyKey: "join" }))["answer"]).toBe("accepted");
    await rita.ok("wait", { scope: "membership", entry: ((await paul.ok("wait", { scope: "inbox", entry: 0 })) ["timedOut"] === false ? 0 : 0) });
    // H3: a member who is neither admin nor controller is refused create, bearer and retire; the controller and an admin succeed.
    const { link: link2 } = await invite(room, rita, "@bot2");
    const body2 = JSON.stringify({ link: link2 });
    expect((await room.wait(() => post("/mcp/agents", control(room, paul.secret, "create", M, null, body2, "paul-create"), body2))).status, "paul creates").toBe(403);
    expect((await room.wait(() => post(`/mcp/agents/${bot.agent}/bearer`, control(room, paul.secret, "bearer", M, bot.agent, "", "paul-bearer"), ""))).status, "paul re-issues").toBe(403);
    expect((await room.wait(() => post(`/mcp/agents/${bot.agent}`, control(room, paul.secret, "retire", M, bot.agent, "", "paul-retire"), "", "DELETE"))).status, "paul retires").toBe(403);
    // @bot3 is controlled by paul: paul's create and bearer succeed as the controller, his retire of @bot (not his) does not.
    const added = await rita.ok("member.add", { fields: { handle: "@bot3", kind: "agent", controller: "@paul" }, idempotencyKey: "add-bot3" });
    const s3 = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const inv3 = await rita.ok("key.invite", { fields: { member: (added["fact"] as FactRef).seq, kind: "agent", inviteHash: textDigest(s3), inviteEnds: timeOf(room.now() + 3_600_000) }, idempotencyKey: "invite-bot3" });
    const items = await allItems(rita, "membership");
    const { inbox: _i, ...repository } = rita.config.repository!;
    const link3 = encodeAgentKeyInvitation({ v: 1, kind: "agent-key", service: SERVICE, repository, definition: "platform:membership@2", handle: "@bot3", controller: { membership: M, member: "@paul" as MemberId }, member: added["fact"] as FactRef, invitation: inv3["fact"] as FactRef, secret: s3, expected: { on: items.find((i) => i.type === "roster")!.revision, member: items.find((i) => i.type === "member" && i.values["handle"] === "@bot3")!.revision } });
    const body3 = JSON.stringify({ link: link3 });
    const bot3 = await (await room.wait(() => post("/mcp/agents", control(room, paul.secret, "create", M, null, body3, "paul-create-3"), body3))).json() as { agent: string; bearer: string; key: KeyId };
    expect(bot3.agent, JSON.stringify(bot3)).toMatch(/^[0-9a-f]{64}$/);
    const rotated = await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, paul.secret, "bearer", M, bot3.agent, "", "paul-bearer-3"), ""));
    expect([rotated.status, (await rotated.json() as { by: string }).by], "the controller re-issues").toEqual([200, "controller"]);
    const byAdmin = await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "bearer", M, bot3.agent, "", "rita-bearer-3"), ""));
    const adminAnswer = await byAdmin.json() as IssuedBearer & { by: string };
    expect([byAdmin.status, adminAnswer.by], "an admin re-issues").toEqual([200, "admin"]);
    expect(adminAnswer.bearerExpires).toBe(timeOf(room.now() + BEARER_LIFETIME));
    await expectBearerNotStored(bot3.agent, M.scope, adminAnswer.bearer);
    // Binding refusals: another incarnation, another action than the route, another agent than the path, a differing body, an expired deadline.
    const otherInc = { ...M, inc: newIncarnation(new Uint8Array(16).fill(7)) };
    expect((await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "bearer", otherInc, bot3.agent, "", "inc"), ""))).status, "another incarnation").toBe(403);
    expect((await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "retire", M, bot3.agent, "", "action"), ""))).status, "another action").toBe(400);
    expect((await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "bearer", M, bot.agent, "", "agent"), ""))).status, "another agent").toBe(400);
    expect((await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "bearer", M, bot3.agent, "x", "body"), ""))).status, "a differing body").toBe(400);
    expect((await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "bearer", M, bot3.agent, "", "late", { notAfter: timeOf(room.now() - 1000) }), ""))).status, "an expired deadline").toBe(400);
    // A repeated op with the same digest answers the same; with a different digest it is refused.
    const same = await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "bearer", M, bot3.agent, "", "rita-bearer-3"), ""));
    expect([same.status, await same.json()], "the same op returns its redacted original issuance").toEqual([200, shownReceipt(adminAnswer)]);
    expect((await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "bearer", M, bot3.agent, "{}", "rita-bearer-3"), "{}"))).status, "the same op, another digest").toBe(409);
    // H2: two agents in one repository: the same idempotency key in both makes two records; one's session is unknown to the other.
    const first = await room.wait(() => modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "by bot", conditions: ["done"] }, values: [canonicalize(issueDemo)], idempotencyKey: "same" }));
    let bot3Rotated = adminAnswer.bearer;
    const second = await room.wait(() => modernCall(bot3Rotated, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "by bot3", conditions: ["done"] }, idempotencyKey: "same" }));
    const factOf = async (r: Response) => ((await r.json() as { result: { structuredContent: { answer: string; fact: FactRef } } }).result.structuredContent);
    const [f1, f2] = [await factOf(first), await factOf(second)];
    expect([f1.answer, f2.answer]).toEqual(["accepted", "accepted"]);
    expect(f1.fact.seq).not.toBe(f2.fact.seq);
    const botSession = await legacySession(bot.bearer);
    expect((await mcp(bot3Rotated, "POST", { "mcp-protocol-version": LEGACY, "mcp-session-id": botSession }, { jsonrpc: "2.0", id: 2, method: "tools/list" })).status, "another agent's session").toBe(404);
    // H4: the bearer. Missing, malformed, wrong and retired each answer 401 with no body; eleven failures from one address, 429.
    for (const [why, authorization] of [["missing", ""], ["malformed", "Bearer nonsense"], ["wrong id", `Bearer ${"0".repeat(64)}.x`], ["wrong secret", `Bearer ${bot.agent}.nope`]] as const) {
      const r = await routed(`${SERVICE}/mcp`, { method: "POST", headers: { ...(authorization ? { authorization } : {}), "content-type": "application/json", "cf-connecting-ip": "fe80::1%en0" }, body: "{}" });
      expect([r.status, await r.text()], why).toEqual([401, ""]);
    }
    // The failures an agent counts are those that name it: eleven wrong secrets from one address, then that address is refused.
    for (let n = 0; n < 9; n++) expect((await routed(`${SERVICE}/mcp`, { method: "POST", headers: { authorization: `Bearer ${bot.agent}.nope${n}`, "cf-connecting-ip": "fe80::1%en0" }, body: "{}" })).status, "the tenth failure is still 401").toBe(401);
    expect((await routed(`${SERVICE}/mcp`, { method: "POST", headers: { authorization: `Bearer ${bot.bearer}`, "cf-connecting-ip": "FE80:0000:0000:0000:0000:0000:0000:0001%en0", "content-type": "application/json", "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } }) })).status, "the expanded zoned alias is limited, even with the right bearer").toBe(429);
    expect((await mcp(bot.bearer, "POST", { "cf-connecting-ip": "fe80::2%en0", "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } })).status, "another link-local client in the same /64 is served").toBe(200);
    // After bearer: the old bearer answers 401, the new one serves, and the sessions and streams open under the old one are gone.
    const open = stream(bot.bearer, botSession);
    expect(await open.ready, "the stream attached before bearer rotation").toBe(200);
    expect((await agentStub(bot.agent).counts()).streams).toBe(1);
    const reissued = await room.wait(() => post(`/mcp/agents/${bot.agent}/bearer`, control(room, rita.secret, "bearer", M, bot.agent, "", "rita-bearer-bot"), ""));
    const renewal = await reissued.json() as IssuedBearer;
    const botNew = renewal.bearer;
    expect(renewal.bearerExpires).toBe(timeOf(room.now() + BEARER_LIFETIME));
    await expectBearerNotStored(bot.agent, M.scope, botNew);
    expect(await open.ended, "the stream closed").toBe(200);
    expect(open.text(), "with a final event").toContain("event: end");
    expect((await mcp(bot.bearer, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } })).status).toBe(401);
    expect((await mcp(botNew, "POST", { "mcp-protocol-version": LEGACY, "mcp-session-id": botSession }, { jsonrpc: "2.0", id: 2, method: "tools/list" })).status, "the old session is gone").toBe(404);
    expect((await mcp(botNew, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } })).status).toBe(200);
    // A completed control replay has no effect: a stream and a listen opened under the new bearer stay open through the replay.
    const afterSession = await legacySession(botNew);
    const afterStream = stream(botNew, afterSession);
    const afterListen = listen(botNew);
    expect(await afterStream.ready, "the replacement stream attached before control replay").toBe(200);
    expect(await until(() => afterListen.text().includes("acknowledged"))).toBe(true);
    expect((await agentStub(bot.agent).counts()).streams).toBe(2);
    const replayed = await room.wait(() => post(`/mcp/agents/${bot.agent}/bearer`, control(room, rita.secret, "bearer", M, bot.agent, "", "rita-bearer-bot"), ""));
    expect([replayed.status, await replayed.json()]).toEqual([200, shownReceipt(renewal)]);
    await settle();
    expect((await agentStub(bot.agent).counts()).streams, "the replay disturbed nothing").toBe(2);
    expect(afterStream.text()).not.toContain("event: end");
    // After retire: 401 for the bearer, and the control answers 409 for a further bearer. The stream gets its final event; the
    // listen its result and the end of its body.
    expect((await room.wait(() => post(`/mcp/agents/${bot.agent}`, control(room, rita.secret, "retire", M, bot.agent, "", "rita-retire-bot"), "", "DELETE"))).status).toBe(202);
    expect(await afterStream.ended).toBe(200);
    expect(afterStream.text()).toContain("event: end");
    expect(await afterListen.ended, "the listen's body ended").toBe(200);
    expect(afterListen.text(), "with its result").toContain('"resultType":"complete"');
    expect((await mcp(botNew, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } })).status).toBe(401);
    expect((await room.wait(() => post(`/mcp/agents/${bot.agent}/bearer`, control(room, rita.secret, "bearer", M, bot.agent, "", "after-retire"), ""))).status).toBe(409);
    // Actual Native roster changes after enrollment have no kept-enrollment expected-revision dependency.
    const roster = (await allItems(rita, "membership")).find(item => item.type === "roster")!;
    const agentActions = [...roster.values[ROLE_LISTS.agent] as string[]];
    const memberActions = roster.values[ROLE_LISTS.member] as string[];
    expect(agentActions).not.toContain("membership.manage");
    expect(memberActions).not.toContain("membership.manage");
    const wider = [...agentActions, "membership.manage"];
    const setAgentActions = async (actions: string[], key: string) => {
      const result = await rita.ok("member.actions", { on: 0, fields: { role: "agent", actions }, idempotencyKey: key });
      expect(result["answer"], JSON.stringify(result)).toBe("accepted");
    };
    const ordinaryOwner = () => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(bot3.agent)), (_instance, state) =>
      state.storage.sql.exec(`SELECT bearer, bearer_expires FROM agent WHERE id = 1`).toArray()[0]);
    const beforeRoleLoss = await ordinaryOwner();
    const admittedList = () => mcp(bot3Rotated, "POST", { "cf-connecting-ip": "192.0.2.77", "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, { jsonrpc: "2.0", id: 91, method: "tools/list", params: { _meta: META } });
    expect((await admittedList()).status).toBe(200);
    hostedTest.now = () => room.now() - 1;
    try {
      for (let n = 0; n < 13; n++) expect((await admittedList()).status, "a valid ordinary secret before its fixed-lifetime issuance floor is unavailable, never a bad-secret failure").toBe(503);
    } finally { hostedTest.now = () => room.now(); }
    expect((await admittedList()).status, "backward-clock refusals did not fill the bad-secret window").toBe(200);
    try {
      await setAgentActions(wider, "TEST-S4-ordinary-wider");
      for (let n = 0; n < 13; n++) {
        const denied = await admittedList();
        expect([denied.status, await denied.text()], "current Native Agent actions exceed its member controller's actual roster actions").toEqual([401, ""]);
      }
      expect(await ordinaryOwner(), "temporary role-subset denial neither rotates nor erases the stored bearer").toEqual(beforeRoleLoss);
      const budget = await agentStub(bot3.agent).used();
      const deniedRotation = await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "bearer", M, bot3.agent, "", "TEST-S4-rotation-wide"), ""));
      expect([deniedRotation.status, await deniedRotation.json()], "admin signing does not bypass the current controller subset before mint").toEqual([403, { error: "unauthorized", rule: "controller-role" }]);
      expect(await ordinaryOwner()).toEqual(beforeRoleLoss);
      expect(await agentStub(bot3.agent).used(), "the refused pre-mint rotation consumes no operation budget").toBe(budget);
      expect(await runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(bot3.agent)), (_instance, state) => state.storage.sql.exec(`SELECT op FROM control WHERE op = ?`, "TEST-S4-rotation-wide").toArray())).toEqual([]);
    } finally { await setAgentActions(agentActions, "TEST-S4-ordinary-restore"); }
    expect((await admittedList()).status, "the same bearer and address work immediately: role denials did not fill the bad-secret window").toBe(200);

    // A coherent old first read cannot authorize dispatch after the actual roster changes before the final read.
    await agentStub(bot3.agent).reset();
    let roleEntered!: () => void, roleRelease!: () => void, submitted = 0;
    const roleReached = new Promise<void>(resolve => { roleEntered = resolve; });
    hostedTest.roleReply = { agent: "@bot3", at: 1, calls: 0, entered: roleEntered, waiting: new Promise<void>(resolve => { roleRelease = resolve; }) };
    hostedTest.submitted = () => { submitted++; };
    try {
      const pending = room.wait(() => admittedList());
      await roleReached;
      await setAgentActions(wider, "TEST-S4-ordinary-held-wider");
      roleRelease();
      const denied = await pending;
      expect([denied.status, await denied.text()], "the post-setup admission reads actual current Native roles").toEqual([401, ""]);
      expect(submitted, "a denied ordinary MCP list performs no Agent native act").toBe(0);
      expect(await ordinaryOwner()).toEqual(beforeRoleLoss);
    } finally {
      roleRelease(); hostedTest.roleReply = null; hostedTest.submitted = null;
      await setAgentActions(agentActions, "TEST-S4-ordinary-held-restore");
    }
    expect((await admittedList()).status, "a fresh read of narrowed actual roles restores ordinary admission without reminting").toBe(200);

    // A distinct, valid comment reaches the body only after both HTTP admissions.
    expect(agentActions).toContain("issue.comment"); expect(memberActions).toContain("issue.comment");
    const lateTarget = await commentTarget(rita, "TEST-S4-ordinary-final-issue"), lateKey = "TEST-S4-ordinary-final-comment";
    const lateArgs = { target: lateTarget, fields: { body: "The same valid original survives final role loss." }, idempotencyKey: lateKey };
    const finalGate = holdAfterAdmission("@bot3"), actualPosts: string[] = [];
    hostedTest.submitted = url => { actualPosts.push(new URL(url).pathname); };
    try {
      const pending = room.wait(() => modernCall(bot3Rotated, "issue.comment", lateArgs));
      await finalGate.entered;
      expect(finalGate.reads.calls).toBe(2);
      await setAgentActions(wider, "TEST-S4-ordinary-final-wider");
      finalGate.release();
      const response = await pending;
      const stopped = await response.json() as { result: { structuredContent: Record<string, unknown> } };
      expect(response.status).toBe(200);
      expect(stopped.result.structuredContent).toMatchObject({ error: "unauthorized" });
      expect(stopped.result.structuredContent).not.toHaveProperty("answer");
      expect(stopped.result.structuredContent).not.toHaveProperty("submitted");
      expect(actualPosts).toEqual([]);
      const original = await custodyFor(bot3.agent, lateKey);
      expect(original.record.outcomes).toEqual([]);
      const envelope = structuredClone(original.record.envelope);
      await setAgentActions(agentActions, "TEST-S4-ordinary-final-restore");
      const resumed = await room.wait(() => modernCall(bot3Rotated, "issue.comment", lateArgs));
      expect((await resumed.json() as { result: { structuredContent: { answer: string } } }).result.structuredContent.answer).toBe("accepted");
      expect((await custodyFor(bot3.agent, lateKey, original.id)).record.envelope).toEqual(envelope);
      expect(actualPosts.filter(path => path.endsWith("/acts"))).toHaveLength(1);
      expect(await ordinaryOwner()).toEqual(beforeRoleLoss);
    } finally {
      finalGate.release(); hostedTest.roleReply = null; hostedTest.submitted = null;
      await setAgentActions(agentActions, "TEST-S4-ordinary-final-cleanup");
    }

    const rotate = (op: string) => room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "bearer", M, bot3.agent, "", op), ""));
    const rotationState = (op: string) => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(bot3.agent)), (_instance, state) => ({
      agent: state.storage.sql.exec(`SELECT bearer, bearer_expires FROM agent WHERE id = 1`).toArray()[0],
      control: state.storage.sql.exec(`SELECT op, fingerprint, state, answer, not_after FROM control WHERE op = ?`, op).toArray()[0],
    }));
    // A local replacement during the actual pre-mint Native reply consumes no bearer or control owner.
    const preOp = "TEST-S4-rotation-pre-owner", object = env.AGENTS.get(env.AGENTS.idFromString(bot3.agent));
    const originalRotationConfig = await runInDurableObject(object, (_instance, state) => String(state.storage.sql.exec(`SELECT config FROM agent WHERE id = 1`).toArray()[0]!["config"]));
    const preOwner = await ordinaryOwner(), preBudget = await agentStub(bot3.agent).used();
    let preEntered!: () => void, preRelease!: () => void;
    const preReached = new Promise<void>(resolve => { preEntered = resolve; });
    hostedTest.roleReply = { agent: "@bot3", at: 1, calls: 0, entered: preEntered, waiting: new Promise<void>(resolve => { preRelease = resolve; }) };
    try {
      const pending = rotate(preOp);
      await preReached;
      await runInDurableObject(object, (_instance, state) => { state.storage.sql.exec(`UPDATE agent SET config = json_set(config, '$.service', ?) WHERE id = 1`, "https://TEST-configuration-owner.invalid"); });
      preRelease();
      const denied = await pending;
      expect([denied.status, await denied.json()]).toEqual([409, { error: "op", rule: "stale" }]);
      expect(await ordinaryOwner()).toEqual(preOwner);
      expect((await rotationState(preOp)).control).toBeUndefined();
      expect(await agentStub(bot3.agent).used()).toBe(preBudget);
    } finally {
      preRelease(); hostedTest.roleReply = null;
      await runInDurableObject(object, (_instance, state) => { state.storage.sql.exec(`UPDATE agent SET config = ? WHERE id = 1`, originalRotationConfig); });
    }
    const preRetry = await rotate(preOp);
    expect(preRetry.status).toBe(200);
    bot3Rotated = (await preRetry.json() as IssuedBearer).bearer;

    const armRemoval = async () => {
      await legacySession(bot3Rotated); // A real generation and session make graceful await an actual removal callback.
      let entered!: () => void, release!: () => void;
      const reached = new Promise<void>(resolve => { entered = resolve; });
      hostedTest.removalReply = { entered, waiting: new Promise<void>(resolve => { release = resolve; }) };
      await agentStub(bot3.agent).holdRemoval();
      return { reached, release };
    };
    // Native role loss while actual post-mint disposal waits must withhold the already-minted plaintext.
    const heldSubset = await armRemoval(), heldOp = "TEST-S4-rotation-held-subset";
    try {
      const pending = rotate(heldOp);
      await heldSubset.reached;
      const committed = await rotationState(heldOp);
      expect(committed.control).toMatchObject({ state: "complete" });
      expect(JSON.parse(String(committed.control!["answer"]))).toMatchObject({ status: 200, body: { bearerShown: true } });
      expect(JSON.parse(String(committed.control!["answer"])).body).not.toHaveProperty("bearer");
      await setAgentActions(wider, "TEST-S4-rotation-held-wider");
      heldSubset.release();
      const response = await pending, result = await response.json();
      expect(response.status).toBe(403);
      expect(result).toMatchObject({ error: "unauthorized", rule: "controller-role", bearerShown: true, bearerExpires: committed.agent!["bearer_expires"] });
      expect(result).not.toHaveProperty("bearer");
      expect(await rotationState(heldOp), "postcommit withholding neither rolls back nor rewrites the committed issuance").toEqual(committed);
      await setAgentActions(agentActions, "TEST-S4-rotation-held-narrow");
      const replay = await rotate(heldOp);
      expect([replay.status, await replay.json()]).toEqual([200, JSON.parse(String(committed.control!["answer"])).body]);
      expect(await rotationState(heldOp), "same-operation replay cannot remint or recover the withheld secret").toEqual(committed);
    } finally {
      heldSubset.release(); hostedTest.removalReply = null;
      await setAgentActions(agentActions, "TEST-S4-rotation-held-cleanup");
    }
    const nextIssuance = await rotate("TEST-S4-rotation-new-disclosure");
    expect(nextIssuance.status).toBe(200);
    bot3Rotated = (await nextIssuance.json() as IssuedBearer).bearer;
    expect((await admittedList()).status).toBe(200);

    // Epoch-only loss: reset/abrupt changes the old instance, while the exact SQL candidate stays unchanged.
    const epochOp = "TEST-S4-rotation-epoch-only";
    const epochOwnerSQL = () => runInDurableObject(env.AGENTS.get(env.AGENTS.idFromString(bot3.agent)), (_instance, state) => {
      const row = state.storage.sql.exec(`SELECT * FROM agent WHERE id = 1`).toArray()[0]!;
      const seed = row["seed"];
      if (!(seed instanceof Uint8Array) && !(seed instanceof ArrayBuffer)) throw Error("The TEST Agent must retain its seed bytes");
      return {
        agent: { ...row, seed: digestBytes(seed instanceof Uint8Array ? seed : new Uint8Array(seed)) },
        control: state.storage.sql.exec(`SELECT * FROM control WHERE op = ?`, epochOp).toArray(),
        budget: state.storage.sql.exec(`SELECT * FROM control_budget ORDER BY k`).toArray(),
      };
    });
    const heldEpoch = await armRemoval();
    try {
      const pending = rotate(epochOp);
      await heldEpoch.reached;
      const committed = await epochOwnerSQL();
      expect(committed.control[0]).toMatchObject({ state: "complete" });
      expect(JSON.parse(String(committed.control[0]!["answer"]))).toMatchObject({ status: 200, body: { bearerShown: true } });
      await agentStub(bot3.agent).reset(); // Actual evict calls old HostedAgent.abrupt; no new rotation or SQL write follows.
      expect(await epochOwnerSQL(), "epoch loss alone preserves every private Agent/control/budget SQL field").toEqual(committed);
      heldEpoch.release();
      const response = await pending, result = await response.json();
      expect(response.status, "an obsolete HTTP epoch cannot disclose even an unchanged SQL candidate").toBe(409);
      expect(result).toMatchObject({ error: "op", rule: "stale", bearerShown: true });
      expect(result).not.toHaveProperty("bearer");
      expect(await epochOwnerSQL(), "old completion cannot rewrite the committed issuance").toEqual(committed);
      const replay = await rotate(epochOp);
      expect([replay.status, await replay.json()]).toEqual([200, JSON.parse(String(committed.control[0]!["answer"])).body]);
      expect(await epochOwnerSQL(), "historical replay cannot redisclose or remint the epoch-withheld bearer").toEqual(committed);
    } finally { heldEpoch.release(); hostedTest.removalReply = null; }
    const afterEpoch = await rotate("TEST-S4-rotation-after-epoch-loss");
    expect(afterEpoch.status).toBe(200);
    bot3Rotated = (await afterEpoch.json() as IssuedBearer).bearer;
    expect((await admittedList()).status).toBe(200);

    // Reset creates a newer owner while the old instance's real disposal still waits.
    const heldOwner = await armRemoval(), olderOp = "TEST-S4-rotation-older-owner";
    try {
      const older = rotate(olderOp);
      await heldOwner.reached;
      const committedOlder = await rotationState(olderOp);
      await agentStub(bot3.agent).reset();
      const newer = await rotate("TEST-S4-rotation-newer-owner");
      expect(newer.status).toBe(200);
      const next = await newer.json() as IssuedBearer;
      bot3Rotated = next.bearer;
      const newerState = await ordinaryOwner();
      heldOwner.release();
      const obsolete = await older, result = await obsolete.json();
      expect(obsolete.status).toBe(409);
      expect(result).toMatchObject({ error: "op", rule: "stale", bearerShown: true });
      expect(result).not.toHaveProperty("bearer");
      expect((await rotationState(olderOp)).control, "the older mint keeps only its original history").toEqual(committedOlder.control);
      expect(await ordinaryOwner(), "old completion cannot replace or erase the newer legitimate bearer").toEqual(newerState);
      expect((await admittedList()).status).toBe(200);
    } finally { heldOwner.release(); hostedTest.removalReply = null; }
    // Keep a persisted session so the later revoked-key/retention controls must preserve it too.
    const retentionSession = await legacySession(bot3Rotated);

    // A revoked exact Native key now refuses ordinary HTTP admission before tool lookup, signing or custody.
    const keyItem = (await allItems(rita, "membership")).find((i) => i.type === "key" && i.values["id"] === bot3.key)!;
    expect((await rita.ok("key.revoke", { on: keyItem.id, fields: { as: "retired" }, idempotencyKey: "revoke-bot3" }))["answer"]).toBe("accepted");
    const hidden = await room.wait(() => modernCall(bot3Rotated, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "after revocation", conditions: ["done"] }, idempotencyKey: "after-revoke" }));
    expect([hidden.status, await hidden.text()], "the stored ordinary secret cannot authorize a revoked exact Native key").toEqual([401, ""]);
    expect(await agentStub(bot3.agent).custodyRecord("after-revoke"), "hidden acts create no custody record").toBeNull();
    // Expiry: seven days past the original request's deadline, the op is stale and no answer body remains in either object.
    room.advance(8 * 86_400_000);
    const agentObject = env.AGENTS.get(env.AGENTS.idFromString(bot3.agent));
    const registryObject = env.REGISTRIES.get(env.REGISTRIES.idFromName(M.scope));
    const agentRetention = () => runInDurableObject(agentObject, (instance, state) => ({
      control: state.storage.sql.exec("SELECT op, fingerprint, state, answer, not_after FROM control ORDER BY op").toArray(),
      agent: state.storage.sql.exec("SELECT state, key, bearer, bearer_expires, answer, updated FROM agent WHERE id = 1").toArray(),
      sessions: state.storage.sql.exec("SELECT id, row, created FROM session ORDER BY id").toArray(),
      used: Number(state.storage.sql.exec("SELECT v FROM control_budget WHERE k = 'used'").toArray()[0]!["v"]),
      counts: (instance as PlatformMcpAgent).counts(),
      durable: (instance as PlatformMcpAgent).durableFacts(),
    }));
    const registryRetention = () => runInDurableObject(registryObject, (_instance, state) => ({
      control: state.storage.sql.exec("SELECT op, fingerprint, state, answer, not_after FROM control ORDER BY op").toArray(),
      agents: state.storage.sql.exec("SELECT agent, handle, key, state, created FROM agents ORDER BY agent").toArray(),
      used: Number(state.storage.sql.exec("SELECT v FROM control_budget WHERE k = 'used'").toArray()[0]!["v"]),
    }));
    const beforeAgentExpiry = await agentRetention(), beforeRegistryExpiry = await registryRetention();
    expect(beforeAgentExpiry.control.some(row => row["answer"] !== null), "legacy control answers are present before cleanup").toBe(true);
    expect(beforeAgentExpiry.agent[0]!["answer"], "the legacy creation answer is present too").not.toBeNull();
    expect(beforeAgentExpiry.sessions.map(row => row["id"])).toContain(retentionSession);
    expect(beforeRegistryExpiry.control.some(row => row["answer"] !== null)).toBe(true);
    // Both headers have the right actor, body and route, but Paul's key did
    // not sign for Rita. Refusal must precede even retention-budget writes.
    const badAgent = await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, paul.secret, "bearer", M, bot3.agent, "", "bad-expiry-agent", { actor: rita.key as KeyId }), ""));
    expect([badAgent.status, await badAgent.json()]).toEqual([403, { error: "control", rule: "signature" }]);
    expect(await agentRetention(), "invalid signature changes no answer, budget, session or agent state").toEqual(beforeAgentExpiry);
    const badRegistry = await room.wait(() => post("/mcp/agents", control(room, paul.secret, "create", M, null, body3, "bad-expiry-registry", { actor: rita.key as KeyId }), body3));
    expect([badRegistry.status, await badRegistry.json()]).toEqual([403, { error: "control", rule: "signature" }]);
    expect(await registryRetention(), "the registry already authenticates before cleanup").toEqual(beforeRegistryExpiry);
    expect((await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "bearer", M, bot3.agent, "", "rita-bearer-3"), ""))).status, "stale").toBe(409);
    const afterAgentExpiry = await agentRetention();
    const agentAnswerBytes = beforeAgentExpiry.control.reduce((bytes, row) => bytes + (row["answer"] === null ? 0 : utf8(String(row["answer"])).length), 0);
    expect(afterAgentExpiry.control).toEqual(beforeAgentExpiry.control.map(row => ({ ...row, answer: null })));
    expect(afterAgentExpiry.agent).toEqual(beforeAgentExpiry.agent.map(row => ({ ...row, answer: null })));
    expect(afterAgentExpiry.used, "cleanup credits only the expired control answer bytes").toBe(beforeAgentExpiry.used - agentAnswerBytes);
    expect(afterAgentExpiry.sessions).toEqual(beforeAgentExpiry.sessions);
    expect(afterAgentExpiry.counts).toEqual(beforeAgentExpiry.counts);
    expect(afterAgentExpiry.durable).toEqual(beforeAgentExpiry.durable);
    expect((await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, rita.secret, "bearer", M, bot3.agent, "", "rita-bearer-3"), ""))).status).toBe(409);
    expect(await agentRetention(), "a second stale replay credits nothing twice").toEqual(afterAgentExpiry);
    const heldByAgent = await agentStub(bot3.agent).heldAnswers();
    expect(heldByAgent.control.every((r) => !r.answer), JSON.stringify(heldByAgent)).toBe(true);
    expect(heldByAgent.agent, "the creation's answer, with the bearer shown once, is gone").toBe(false);
    // The registry removes its copies at its next control operation: a stale replay of the creation finds the op stale and no body kept.
    expect((await room.wait(() => post("/mcp/agents", control(room, paul.secret, "create", M, null, body3, "paul-create-3"), body3))).status, "a stale creation replay").toBe(409);
    const afterRegistryExpiry = await registryRetention();
    const registryAnswerBytes = beforeRegistryExpiry.control.reduce((bytes, row) => bytes + (row["answer"] === null ? 0 : utf8(String(row["answer"])).length), 0);
    expect(afterRegistryExpiry.control).toEqual(beforeRegistryExpiry.control.map(row => ({ ...row, answer: null })));
    expect(afterRegistryExpiry.agents).toEqual(beforeRegistryExpiry.agents);
    expect(afterRegistryExpiry.used).toBe(beforeRegistryExpiry.used - registryAnswerBytes);
    expect((await room.wait(() => post("/mcp/agents", control(room, paul.secret, "create", M, null, body3, "paul-create-3"), body3))).status).toBe(409);
    expect(await registryRetention(), "registry tombstones also prevent a second credit").toEqual(afterRegistryExpiry);
    expect((await registryStub(M.scope).heldAnswers()).every((r) => !r.answer)).toBe(true);
    // An oversized streaming control body is refused while it streams, before any object is reached: no row appears.
    const before = (await registryStub(M.scope).agents()).length;
    const chunk = new TextEncoder().encode("x".repeat(16 * 1024));
    const big = new ReadableStream<Uint8Array>({ pull: (c) => { c.enqueue(chunk); } });
    const over = await routed(`${SERVICE}/mcp/agents`, { method: "POST", headers: { authorization: control(room, rita.secret, "create", M, null, "", "big"), "content-type": "application/json" }, body: big, duplex: "half" } as RequestInit);
    expect(over.status).toBe(413);
    expect((await registryStub(M.scope).agents()).length).toBe(before);
    // Membership's old invitations became due during the eight-day retention
    // jump. Only its real alarm ends them before the following signed act.
    expect(await room.wait(() => runDurableObjectAlarm(room.platform(M.scope).object))).toBe(true);
    // A revoked key cannot sign control: paul's key is revoked, then his bearer for @bot3 is refused.
    const paulKey = (await allItems(rita, "membership")).find((i) => i.type === "key" && i.values["id"] === paul.key)!;
    expect((await rita.ok("key.revoke", { on: paulKey.id, fields: { as: "retired" }, idempotencyKey: "revoke-paul" }))["answer"]).toBe("accepted");
    expect((await room.wait(() => post(`/mcp/agents/${bot3.agent}/bearer`, control(room, paul.secret, "bearer", M, bot3.agent, "", "paul-after-revoke"), ""))).status, "a revoked key").toBe(403);
    // Retention is seven days; bearer validity is its independent fixed
    // thirty-day deadline. Reset and ordinary use never extend that date.
    const expires = Date.parse(expiryBot.bearerExpires);
    room.advance(expires - room.now() - 1);
    await agentStub(expiryBot.agent).reset();
    const list = () => mcp(expiryBot.bearer, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } });
    expect((await list()).status, "one millisecond before expiry").toBe(200);
    room.advance(1);
    const expired = await list();
    expect([expired.status, await expired.text()], "exact expiry refuses before any RPC answer").toEqual([401, ""]);
    const renewedResponse = await room.wait(() => post(`/mcp/agents/${expiryBot.agent}/bearer`, control(room, rita.secret, "bearer", M, expiryBot.agent, "", "renew-expired"), ""));
    const renewed = await renewedResponse.json() as IssuedBearer;
    expect(renewedResponse.status, "signed authority can renew an expired bearer").toBe(200);
    expect(renewed.bearerExpires).toBe(timeOf(room.now() + BEARER_LIFETIME));
    expect(renewed.bearer).not.toBe(expiryBot.bearer);
    expect((await list()).status, "renewal does not revive the old digest").toBe(401);
    expect((await modernCall(renewed.bearer, "room", {})).status).toBe(200);
    await expectBearerNotStored(expiryBot.agent, M.scope, renewed.bearer);
  } finally { done(room); }
});

test("H5, H6 and H7: eviction and reconciliation, custody across a lost reply and a reset, the framing overhead", async () => {
  const { room, rita } = await roomWithIssues();
  try {
    const bot = await hosted(room, rita, "@bot", "create-bot");
    const stub = agentStub(bot.agent);
    const list = (session: string) => mcp(bot.bearer, "POST", { "mcp-protocol-version": LEGACY, "mcp-session-id": session }, { jsonrpc: "2.0", id: 2, method: "tools/list" });
    const told = (s: { text: () => string }) => s.text().split("notifications/tools/list_changed").length - 1;
    // H5. A legacy session lists at generation A; the inventory changes to B with the stream open; the stream is told once.
    const S = await legacySession(bot.bearer);
    expect((await list(S)).status).toBe(200);
    const open1 = stream(bot.bearer, S);
    await until(() => open1.text().includes(": stream"));
    expect(open1.text()).toContain(": stream");
    expect(told(open1), "nothing told before a change").toBe(0);
    expect((await rita.ok("rules.activate", { fields: { digest: DEMO_DIGESTS.change, name: "change" }, values: [canonicalize(changeDemo)], idempotencyKey: "activate-change" }))["answer"]).toBe("accepted");
    expect(await stub.tick()).toBe(true);
    await until(() => told(open1) > 0);
    expect(told(open1), "told once with the stream open").toBe(1);
    expect(await stub.tick()).toBe(true);
    await settle();
    expect(told(open1), "not told again").toBe(1);
    // The object is reset without the client listing: on reconnect the client is told once more, because listed is still A.
    open1.stop();
    await stub.reset();
    const open2 = stream(bot.bearer, S);
    await until(() => told(open2) > 0);
    expect(open2.text(), "the session survived the reset").toContain(": stream");
    expect(told(open2), "reconciliation tells the unlisted change once").toBe(1);
    // It lists (listed = B); a further reconnect without a change receives nothing.
    expect((await list(S)).status).toBe(200);
    open2.stop();
    await stub.reset();
    const open3 = stream(bot.bearer, S);
    await until(() => open3.text().includes(": stream"));
    await settle();
    expect(open3.text()).toContain(": stream");
    expect(told(open3), "nothing to reconcile after listing").toBe(0);
    // A change while no stream is open is told once at the next stream; a second GET closes the first stream, the second keeps receiving.
    open3.stop();
    await settle();
    // A change of the agent's list while no stream is open: a third definition activated changes the choices of a field.
    expect((await rita.ok("rules.activate", { fields: { digest: COUNTING_DEFINITION, name: "counting" }, values: [canonicalize(counting)], idempotencyKey: "activate-counting" }))["answer"]).toBe("accepted");
    await stub.tick();
    const open4 = stream(bot.bearer, S);
    // Opening awaits an inventory snapshot before its reconciliation message.
    await until(() => told(open4) > 0);
    expect(told(open4), "a change while no stream was open is told once at the next stream").toBe(1);
    const open5 = stream(bot.bearer, S);
    await until(() => told(open5) > 0);
    expect(await open4.ended, "the first stream closed on replacement").toBe(200);
    expect(open5.text()).toContain(": stream");
    expect((await stub.counts()).streams).toBe(1);
    expect(told(open5), "the replacement is told once more, because the session has still not listed").toBe(1);
    // A later change reaches the replacement, not the closed stream: the session lists (listed = current), then a definition is
    // activated under another name, which changes the choices again.
    expect((await list(S)).status).toBe(200);
    // A new lane is a new held scope of the agent's inventory.
    const opened = await rita.ok("issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "a later lane", conditions: ["done"] }, values: [canonicalize(issueDemo)], idempotencyKey: "later-lane" });
    expect(opened["answer"], JSON.stringify(opened)).toBe("accepted");
    expect((await rita.ok("wait", { scope: "directory", entry: (opened["fact"] as FactRef).seq }))["timedOut"]).toBe(false);
    await stub.tick();
    await until(() => told(open5) > 1);
    expect(told(open5), "the replacement receives the later change").toBe(2);
    expect(told(open4), "the closed stream receives nothing").toBe(1);
    open5.stop();
    await settle();
    // A modern listen across a reset: the reset ends it abruptly with no event; a reopened listen is acknowledged with its ID
    // and honored types and replays nothing.
    const first = listen(bot.bearer);
    expect(await until(() => first.text().includes("acknowledged"))).toBe(true);
    await stub.reset();
    expect(await first.ended, "the reset ended the old body").toBe(200);
    expect(first.text(), "with no event").not.toContain("resultType");
    expect(first.text()).not.toContain("event: end");
    const reopened = listen(bot.bearer);
    expect(await until(() => reopened.text().includes("acknowledged"))).toBe(true);
    expect(reopened.text()).toContain('"io.modelcontextprotocol/subscriptionId":0');
    expect(reopened.text()).toContain('"toolsListChanged":true');
    expect(reopened.text(), "nothing from before the reopen is replayed").not.toContain("notifications/tools/list_changed");
    first.stop(); reopened.stop();
    await settle();
    // A listing whose session-row write fails moves nothing: the live marker stays with the durable one, the client gets a
    // correlated error and no list, a reconnect without a reset is told the change once, and a listing that succeeds suppresses it.
    const S2 = await legacySession(bot.bearer);
    expect((await list(S2)).status).toBe(200);
    // The agent role's actions change: the agent's standing, and so its list, changes with them.
    const agentActions = (FIRST_ACTIONS_OF as Record<string, Record<string, readonly string[]>>)["platform:membership@2"]!["agent"] ?? [];
    const widened = await rita.ok("member.actions", { on: 0, fields: { role: "agent", actions: [...agentActions, "membership.invite"] }, idempotencyKey: "agent-actions" });
    expect(widened["answer"], `the agent role's actions change: ${JSON.stringify(widened)}`).toBe("accepted");
    await stub.tick();
    hostedTest.failSession = true;
    const failedList = await list(S2);
    const failedBody = await failedList.json() as { error?: { code: number } };
    expect([failedList.status, failedBody.error?.code], "a correlated internal error, no list").toEqual([200, -32603]);
    const reconnect = stream(bot.bearer, S2);
    expect(await until(() => told(reconnect) === 1), "the change is told once on reconnect, because the durable listed did not move").toBe(true);
    reconnect.stop();
    await settle();
    expect((await list(S2)).status).toBe(200);
    const reconnect2 = stream(bot.bearer, S2);
    expect(await until(() => reconnect2.text().includes(": stream"))).toBe(true);
    await settle(200);
    expect(told(reconnect2), "a successful listing suppresses further reconciliation").toBe(0);
    reconnect2.stop();
    await settle();
    // H6. A reply lost on the way back leaves the record unknown; settle after a reset resolves it from the scope; a repeat under the
    // same key signs nothing and returns the retained answer.
    hostedTest.lose = `/${rita.config.repository!.directory.scope}/acts`;
    const lost = await room.wait(() => modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "lost on the way back", conditions: ["done"] }, idempotencyKey: "lost-1" }));
    const lostBody = (await lost.json() as { result: { structuredContent: Record<string, unknown> } }).result.structuredContent;
    expect(lostBody["error"], JSON.stringify(lostBody)).toBe("transport");
    // A hosted agent holds its own key and its own custody: a lost reply leaves no copy at membership (signed-requests note, section 9).
    expect(await room.wait(() => runInDurableObject(room.platform(rita.config.repository!.membership.scope).object, (_instance, state) => state.storage.sql.exec("SELECT COUNT(*) AS n FROM original_copy").toArray()[0]!["n"])), "a hosted agent keeps no copy").toBe(0);
    await stub.reset();
    const settled = await room.wait(() => modernCall(bot.bearer, "settle", { idempotencyKey: "lost-1", target: "directory" }));
    const settledBody = (await settled.json() as { result: { structuredContent: Record<string, unknown> } }).result.structuredContent;
    expect(settledBody["answer"], JSON.stringify(settledBody)).toBe("accepted");
    const repeat = await room.wait(() => modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "lost on the way back", conditions: ["done"] }, idempotencyKey: "lost-1" }));
    const repeatBody = (await repeat.json() as { result: { structuredContent: Record<string, unknown> } }).result.structuredContent;
    expect([repeatBody["answer"], repeatBody["retained"]], JSON.stringify(repeatBody)).toEqual(["accepted", true]);
    expect((repeatBody["fact"] as FactRef).seq).toBe((settledBody["fact"] as FactRef).seq);
    // An enrolment whose reply is lost stays unfinished; an admin retires it; the create's retry does not revive it.
    const { link: lostLink } = await invite(room, rita, "@bot4");
    const lostLinkBody = JSON.stringify({ link: lostLink });
    hostedTest.lose = `/${rita.config.repository!.membership.scope}/acts`;
    const unresolved = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", rita.config.repository!.membership, null, lostLinkBody, "create-4"), lostLinkBody));
    const unresolvedBody = await unresolved.json() as { error: string };
    expect([unresolved.status, unresolvedBody.error]).toEqual([503, "unresolved"]);
    const agents = await registryStub(rita.config.repository!.membership.scope).agents();
    expect(agents.some((a) => a.handle === "@bot4"), "no agent row until the enrolment resolves").toBe(false);
    const retireUrl = (id: string) => `/mcp/agents/${id}`;
    // The reserved agent ID is the registry's: find it by retiring through the control route with the reserved ID from the op's row.
    const reservedId = (await (env.REGISTRIES.get(env.REGISTRIES.idFromName(rita.config.repository!.membership.scope)) as unknown as { reservedAgent(op: string): Promise<string | null> }).reservedAgent("create-4"))!;
    expect(reservedId).toMatch(/^[0-9a-f]{64}$/);
    expect((await room.wait(() => post(retireUrl(reservedId), control(room, rita.secret, "retire", rita.config.repository!.membership, reservedId, "", "retire-4"), "", "DELETE"))).status, "an admin retires the unfinished agent").toBe(202);
    const retried = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", rita.config.repository!.membership, null, lostLinkBody, "create-4"), lostLinkBody));
    expect([retried.status, (await retried.json() as { error: string }).error], "the retry does not revive it").toEqual([409, "retired"]);
    // H7. The HTTP framing overhead of a 2026-07-28 tools/call: the response's bytes beyond the CallResult, measured once.
    const framed = await room.wait(() => modernCall(bot.bearer, "room", {}));
    const text = await framed.text();
    const result = (JSON.parse(text) as { result: Record<string, unknown> }).result;
    const { resultType: _r, _meta: _m, ...callResult } = result;
    const overhead = utf8(text).length - utf8(JSON.stringify(callResult)).length;
    // The JSON-RPC envelope with a one-digit id, plus what 2026-07-28 adds to every result; docs/mcp.md states both (observed here).
    const envelope = utf8(JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} })).length - 2;
    expect(overhead, "the JSON-RPC envelope and the modern result's added members").toBe(envelope + MODERN_RESULT_EXTRA);
    expect(framed.headers.get("content-type")).toBe("application/json");
    // The plan 031 bounds hold through the endpoint: each response is its CallResult's bound plus the framing, observed.
    const within = async (name: string, args: Record<string, unknown>, bound: number): Promise<Record<string, unknown>> => {
      const r = await room.wait(() => modernCall(bot.bearer, name, args));
      const body = await r.text();
      expect(r.status, name).toBe(200);
      const parsed = JSON.parse(body) as { result: { isError: boolean; structuredContent: Record<string, unknown> } };
      expect(parsed.result.isError, `${name} succeeds: ${body.slice(0, 200)}`).toBe(false);
      expect(utf8(body).length - overhead, `${name} within its bound through the endpoint`).toBeLessThanOrEqual(bound);
      return parsed.result.structuredContent;
    };
    await within("room", {}, BOUNDS.room);
    await within("inspect", { scope: "directory" }, BOUNDS.inspect);
    const bounded = await within("issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "bounded", conditions: ["done"] }, idempotencyKey: "bounded" }, BOUNDS.act);
    expect(bounded["answer"]).toBe("accepted");
    await within("settle", { idempotencyKey: "bounded", target: "directory" }, BOUNDS.act);
    // The large responses, paged: the declaration of the issue definition, the membership's items, and the directory's steps
    // with a continuation.
    const declaration = await within("inspect", { scope: "directory", declaration: true }, BOUNDS.large);
    expect(declaration["declaration"] ?? declaration["definition"], "the declaration is in the result").toBeDefined();
    await within("items", { scope: "membership", type: "member" }, BOUNDS.large);
    for (let n = 0; n < 12; n++) expect((await rita.ok("issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: `page filler ${n}`, conditions: ["done"] }, idempotencyKey: `filler-${n}` }))["answer"]).toBe("accepted");
    // The continuation is followed to exhaustion: more than one page, the last without a cursor, and the steps in all are the
    // directory's whole history as an independent reader pages it, each sequence number once and in order.
    // The whole history as an independent reader pages it first, by sequence number. The room is live, so the hosted pages
    // read after it may end with entries that landed since: they must begin with this whole and stay contiguous from 0.
    const whole = (await allSteps(rita, "directory")).map((step) => step.seq);
    expect(whole.length).toBeGreaterThanOrEqual(14);
    const wholeThenContiguous = (seqs: number[]) => seqs.length >= whole.length && whole.every((seq, i) => seqs[i] === seq) && seqs.every((seq, i) => seq === i);
    // The steps, followed to exhaustion: the last page has no cursor, and the pages together are the whole history, each step
    // once and in order.
    const stepPages: { seq: number }[][] = [];
    let stepsCursor: unknown = undefined, stepsHead: { seq: number } | null = null;
    for (let n = 0; n < 64; n++) {
      const next = await within("steps", { scope: "directory", ...(stepsCursor !== undefined ? { cursor: stepsCursor } : {}) }, BOUNDS.large);
      stepPages.push(next["steps"] as { seq: number }[]);
      stepsHead = next["head"] as { seq: number };
      stepsCursor = next["cursor"];
      if (stepsCursor === undefined) break;
    }
    expect(stepsCursor, "the steps continuation is exhausted").toBeUndefined();
    const stepSeqs = stepPages.flat().map((step) => step.seq);
    expect(wholeThenContiguous(stepSeqs), "the steps paged through are the whole history, each once, in order").toBe(true);
    // Against the scope's own head, as the last read reported it: every position through the head, and nothing past it.
    expect(stepSeqs.length, "the steps reach the scope's head").toBeGreaterThanOrEqual(stepsHead!.seq + 1);
    // And against the native fixture's own reading of the directory, taken apart from any MCP implementation: the native head
    // at the time of the first read is within what was paged, and the pages end at or before the native head now.
    const nativeNow = (await room.platform(rita.config.repository!.directory.scope).summary()).at.seq;
    expect(stepSeqs.length - 1, "the pages end at or before the directory's native head").toBeLessThanOrEqual(nativeNow);
    expect(stepSeqs.length - 1, "and at or past the head the first page reported").toBeGreaterThanOrEqual(stepsHead!.seq);
    // The record, whose entries are larger than steps, actually continues: more than one page within the bound, the last
    // without a cursor, and the pages together are the whole history, each entry once and in order.
    const recordPages: { seq: number }[][] = [];
    let recordCursor: unknown = undefined, recordHead: { seq: number } | null = null;
    for (let n = 0; n < 64; n++) {
      const next = await within("record", { scope: "directory", ...(recordCursor !== undefined ? { cursor: recordCursor } : {}) }, BOUNDS.large);
      recordPages.push(next["entries"] as { seq: number }[]);
      recordHead = next["head"] as { seq: number };
      recordCursor = next["cursor"];
      if (recordCursor === undefined) break;
    }
    expect(recordCursor, "the record continuation is exhausted").toBeUndefined();
    expect(recordPages.length, "an actual continuation: more than one page").toBeGreaterThan(1);
    for (const page of recordPages) expect(page.length, "no page is empty").toBeGreaterThan(0);
    const recorded = recordPages.flat().map((entry) => entry.seq ?? (entry as { entry?: { seq: number } }).entry?.seq ?? -1);
    expect(wholeThenContiguous(recorded), `the record's pages together are the whole history, each entry once, in order: ${JSON.stringify(recorded)} for ${JSON.stringify(whole)}`).toBe(true);
    expect(recorded.length, "the record reaches the scope's head as the last read reported it").toBeGreaterThanOrEqual(recordHead!.seq + 1);
    expect(recorded.length - 1, "the record's pages end at or before the directory's native head").toBeLessThanOrEqual((await room.platform(rita.config.repository!.directory.scope).summary()).at.seq);
  } finally { done(room); }
});

test("H8 through the route: the matrix, the modern headers, the legacy rules, and the methods across eras", async () => {
  const { room, rita } = await roomWithIssues();
  try {
    const bot = await hosted(room, rita, "@bot", "create-bot");
    const B = bot.bearer;
    const listBody = { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } };
    const code = async (r: Response) => (await r.json() as { error?: { code: number } }).error?.code;
    // Modern: the header is required and must agree with _meta in both directions; Mcp-Method and Mcp-Name are checked on the raw value.
    expect([(await mcp(B, "POST", { "mcp-method": "tools/list" }, listBody)).status, await code(await mcp(B, "POST", { "mcp-method": "tools/list" }, listBody))]).toEqual([400, -32020]);
    expect(await code(await mcp(B, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })), "a July header without July metadata").toBe(-32020);
    expect(await code(await mcp(B, "POST", { "mcp-protocol-version": LEGACY }, listBody)), "a November header on July metadata").toBe(-32020);
    expect(await code(await mcp(B, "POST", { "mcp-protocol-version": MODERN }, listBody)), "missing Mcp-Method").toBe(-32020);
    expect(await code(await mcp(B, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/call" }, listBody)), "Mcp-Method differs").toBe(-32020);
    const call = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "room", arguments: {}, _meta: META } };
    expect(await code(await mcp(B, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/call" }, call)), "missing Mcp-Name").toBe(-32020);
    expect(await code(await mcp(B, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/call", "mcp-name": "inspect" }, call)), "Mcp-Name differs").toBe(-32020);
    expect(await code(await mcp(B, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/call", "mcp-name": "=?base64?###?=" }, call)), "a sentinel that is not base64").toBe(-32020);
    const sentinel = `=?base64?${btoa("room")}?=`;
    expect((await mcp(B, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/call", "mcp-name": sentinel }, call)).status, "a sentinel that decodes equal").toBe(200);
    const unsupported = await mcp(B, "POST", { "mcp-protocol-version": "2025-03-26", "mcp-method": "tools/list" }, listBody);
    expect([unsupported.status, (await unsupported.json() as { error: { code: number; data: { supported: string[] } } }).error.data.supported]).toEqual([400, [MODERN, LEGACY]]);
    const unknown = await mcp(B, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "no/such" }, { jsonrpc: "2.0", id: 1, method: "no/such", params: { _meta: META } });
    expect([unknown.status, await code(unknown)]).toEqual([404, -32601]);
    const notified = await mcp(B, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "notifications/cancelled" }, { jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 1, _meta: META } });
    expect([notified.status, await notified.text(), notified.headers.get("mcp-session-id")]).toEqual([202, "", null]);
    for (const [raw, expected] of [["{", -32700], ['{"id":1}', -32600], ["[]", -32600]] as const) {
      const r = await routed(`${SERVICE}/mcp`, { method: "POST", headers: { authorization: `Bearer ${B}`, "content-type": "application/json", "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, body: raw });
      const parsed = await r.json() as { id: unknown; error: { code: number } };
      expect([r.status, parsed.id, parsed.error.code], raw).toEqual([400, null, expected]);
    }
    // Both: Origin, the body bound, a batch under every header.
    expect((await routed(`${SERVICE}/mcp`, { method: "POST", headers: { authorization: `Bearer ${B}`, origin: "https://evil.example", "content-type": "application/json" }, body: JSON.stringify(listBody) })).status).toBe(403);
    expect((await routed(`${SERVICE}/mcp`, { method: "POST", headers: { authorization: `Bearer ${B}`, "content-type": "application/json", "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, body: JSON.stringify({ ...listBody, pad: "x".repeat(1024 * 1024 + 16) }) })).status).toBe(413);
    for (const headers of [{ "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, { "mcp-protocol-version": LEGACY }, {}]) expect(await code(await mcp(B, "POST", headers, [listBody])), JSON.stringify(headers)).toBe(-32600);
    // Legacy, and the methods across eras with a live session S.
    const S = await legacySession(B);
    const list = (headers: Record<string, string>) => mcp(B, "POST", headers, { jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect((await list({ "mcp-protocol-version": LEGACY, "mcp-session-id": S, "mcp-method": "tools/call", "mcp-name": "ignored" })).status, "modern headers ignored on a legacy request").toBe(200);
    expect((await list({ "mcp-session-id": S })).status, "header absent, live session").toBe(200);
    expect((await list({ "mcp-protocol-version": LEGACY })).status, "no session").toBe(400);
    expect((await list({ "mcp-protocol-version": LEGACY, "mcp-session-id": "no-such" })).status).toBe(404);
    expect((await mcp(B, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/list", "mcp-session-id": S }, listBody)).status, "a modern request ignores the session").toBe(200);
    for (const method of ["GET", "DELETE"]) {
      for (const id of [S, "no-such"]) {
        const r = await mcp(B, method, { "mcp-protocol-version": MODERN, "mcp-session-id": id });
        expect([r.status, r.headers.get("allow")], `${method} July naming ${id === S ? "S" : "an unknown ID"}`).toEqual([405, "POST"]);
      }
      expect((await mcp(B, method, { "mcp-protocol-version": LEGACY })).status, `${method} November without a session`).toBe(400);
      expect((await mcp(B, method, {})).status, `${method} no header, no session`).toBe(405);
      expect((await mcp(B, method, { "mcp-session-id": "no-such" })).status, `${method} no header, unknown session`).toBe(404);
      expect((await mcp(B, method, { "mcp-protocol-version": "x", "mcp-session-id": S })).status, `${method} an unsupported version`).toBe(400);
    }
    expect((await list({ "mcp-protocol-version": LEGACY, "mcp-session-id": S })).status, "S serves after the July attempts").toBe(200);
    const open = stream(B, S);
    expect(await open.ready, "S attaches its stream after the July attempts").toBe(200);
    await open.opening;
    expect(open.text(), "S opens its stream after the July attempts").toContain(": stream");
    const second = await mcp(B, "GET", { "mcp-protocol-version": LEGACY, "mcp-session-id": S });
    expect(second.status, "a 2nd stream replaces the 1st").toBe(200);
    expect(await open.ended).toBe(200);
    await settle();
    // A 17th session ends the oldest.
    for (let n = 1; n < 17; n++) await legacySession(B);
    expect((await agentStub(bot.agent).counts()).sessions).toBe(16);
    expect((await list({ "mcp-protocol-version": LEGACY, "mcp-session-id": S })).status, "the oldest session ended").toBe(404);
    expect((await mcp(B, "DELETE", { "mcp-session-id": S })).status).toBe(404);
  } finally { done(room); }
});

test("the control budget is one aggregate: operations, sessions and configuration are charged as stored, and retire keeps its reserve", async () => {
  const { room, rita } = await roomWithIssues();
  // A small budget for the agent objects made in this test: 64 KiB, of which the last 8 KiB admit retire alone.
  hostedTest.controlBudget = { budget: 64 * 1024, reserve: 8 * 1024 };
  try {
    const M = rita.config.repository!.membership;
    // Eighteen unique read operations exceed what this real 64 KiB control
    // budget could keep at 4 KiB per row. The actual subsequent create must fit.
    const registryBody = JSON.stringify({ after: null });
    for (let n = 0; n < 18; n++) {
      const listed = await room.wait(() => post("/mcp/agents/connections", control(room, rita.secret, "connections", M, null, registryBody, `read-registry-${n}`), registryBody));
      expect(listed.status).toBe(200);
    }
    const registryObject = env.REGISTRIES.get(env.REGISTRIES.idFromName(M.scope));
    const registryReads = await runInDurableObject(registryObject, (_registry, state) => ({
      used: Number(state.storage.sql.exec(`SELECT v FROM control_budget WHERE k = 'used'`).toArray()[0]!["v"]),
      reads: state.storage.sql.exec(`SELECT op FROM control WHERE action = 'connections'`).toArray(),
    }));
    expect(registryReads).toEqual({ used: 0, reads: [] });
    const bot = await hosted(room, rita, "@bot", "create-bot");
    const stub = agentStub(bot.agent);
    const afterCreate = await stub.used();
    for (let n = 0; n < 18; n++) {
      const listed = await room.wait(() => post(`/mcp/agents/${bot.agent}/connections`, control(room, rita.secret, "connections", M, bot.agent, "{}", `read-agent-${n}`), "{}"));
      expect(listed.status).toBe(200);
    }
    expect(await stub.used()).toBe(afterCreate);
    const agentObject = env.AGENTS.get(env.AGENTS.idFromString(bot.agent));
    expect(await runInDurableObject(agentObject, (_agent, state) => state.storage.sql.exec(`SELECT op FROM control WHERE action = 'connections'`).toArray())).toEqual([]);
    const afterReads = await hosted(room, rita, "@after-reads", "create-after-reads");
    expect(afterReads.bearer).toMatch(new RegExp(`^${afterReads.agent}\\.`));
    expect(afterCreate, "the creation's reservation and the agent row's configuration are charged").toBeGreaterThan(4 * 1024);
    // A session's declared capabilities are bounded; within the bound, the session row's bytes are charged and credited on DELETE.
    const big = { experimental: { pad: "x".repeat(20 * 1024) } };
    const tooLarge = await mcp(bot.bearer, "POST", { "mcp-protocol-version": LEGACY }, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: LEGACY, capabilities: big, clientInfo: { name: "h", version: "0" } } });
    expect([tooLarge.status, (await tooLarge.json() as { error: { code: number } }).error.code, tooLarge.headers.get("mcp-session-id")]).toEqual([200, -32602, null]);
    const within = { experimental: { pad: "y".repeat(8 * 1024) } };
    const opened = await mcp(bot.bearer, "POST", { "mcp-protocol-version": LEGACY }, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: LEGACY, capabilities: within, clientInfo: { name: "h", version: "0" } } });
    const S = opened.headers.get("mcp-session-id")!;
    expect(opened.status).toBe(200);
    const withSession = await stub.used();
    expect(withSession - afterCreate, "the session row's bytes are charged").toBeGreaterThan(8 * 1024);
    expect((await mcp(bot.bearer, "DELETE", { "mcp-protocol-version": LEGACY, "mcp-session-id": S })).status).toBe(200);
    expect(await stub.used(), "and credited when the session ends").toBe(afterCreate);
    // A session's capabilities are bounded in UTF-8 bytes: 6,000 three-byte characters are refused though they are 6,000 units.
    const multibyte = await mcp(bot.bearer, "POST", { "mcp-protocol-version": LEGACY }, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: LEGACY, capabilities: { experimental: { pad: "\u20ac".repeat(6000) } }, clientInfo: { name: "h", version: "0" } } });
    expect([(await multibyte.json() as { error?: { code: number } }).error?.code, multibyte.headers.get("mcp-session-id")]).toEqual([-32602, null]);
    // Sixteen sessions, then a refused seventeenth: every one of the sixteen is still served; a valid seventeenth ends exactly the oldest.
    const sixteen: string[] = [];
    for (let n = 0; n < 16; n++) sixteen.push(await legacySession(bot.bearer));
    const afterSixteen = await stub.used();
    const list = (session: string) => mcp(bot.bearer, "POST", { "mcp-protocol-version": LEGACY, "mcp-session-id": session }, { jsonrpc: "2.0", id: 2, method: "tools/list" });
    const refusedSeventeenth = await mcp(bot.bearer, "POST", { "mcp-protocol-version": LEGACY }, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: LEGACY, capabilities: big, clientInfo: { name: "h", version: "0" } } });
    expect([(await refusedSeventeenth.json() as { error?: { code: number } }).error?.code, refusedSeventeenth.headers.get("mcp-session-id")]).toEqual([-32602, null]);
    for (const id of sixteen) expect((await list(id)).status, "every earlier session is still served after a refused seventeenth").toBe(200);
    expect((await stub.counts()).sessions).toBe(16);
    const afterLists = await stub.used();
    const seventeenth = await legacySession(bot.bearer);
    const afterSeventeenth = await stub.used();
    expect((await list(sixteen[0]!)).status, "the oldest ended").toBe(404);
    for (const id of [...sixteen.slice(1), seventeenth]) expect((await list(id)).status).toBe(200);
    expect((await stub.counts()).sessions).toBe(16);
    for (const id of [...sixteen.slice(1), seventeenth]) expect((await mcp(bot.bearer, "DELETE", { "mcp-protocol-version": LEGACY, "mcp-session-id": id })).status, id).toBe(200);
    expect(await stub.used(), `the sessions' bytes are credited (create ${afterCreate}, sixteen ${afterSixteen}, lists ${afterLists}, seventeenth ${afterSeventeenth})`).toBe(afterCreate);
    // Rotations with distinct 128-byte ops fill the budget to its ceiling for create and bearer; the next is refused 507.
    let rotations = 0;
    let bearer = bot.bearer;
    for (let n = 0; n < 40; n++) {
      const op = `rotate-${String(n).padStart(3, "0")}-${"p".repeat(117)}`;
      expect(utf8(op).length).toBe(128);
      const r = await room.wait(() => post(`/mcp/agents/${bot.agent}/bearer`, control(room, rita.secret, "bearer", M, bot.agent, "", op), ""));
      if (r.status === 507) { expect((await r.json() as { error: string }).error).toBe("full"); break; }
      expect(r.status, `rotation ${n}`).toBe(200);
      bearer = (await r.json() as { bearer: string }).bearer;
      rotations++;
    }
    expect(rotations, "the ceiling was reached by the operations' stored state").toBeGreaterThan(5);
    expect(rotations).toBeLessThan(40);
    const full = await stub.used();
    expect(full).toBeLessThanOrEqual(64 * 1024 - 8 * 1024);
    // At the ceiling, a small session still fits below it, and is kept as the incumbent; a session with 8 KiB of capabilities
    // cannot be kept: initialize answers the session-full error and issues no session, and the incumbent is untouched.
    const kept = await legacySession(bearer);
    const noRoom = await mcp(bearer, "POST", { "mcp-protocol-version": LEGACY }, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: LEGACY, capabilities: within, clientInfo: { name: "h", version: "0" } } });
    expect([noRoom.status, noRoom.headers.get("mcp-session-id")]).toEqual([507, null]);
    expect((await mcp(bearer, "POST", { "mcp-protocol-version": LEGACY, "mcp-session-id": kept }, { jsonrpc: "2.0", id: 2, method: "tools/list" })).status, "the earlier session is still served").toBe(200);
    expect((await stub.counts()).sessions).toBe(1);
    // The counters are durable: after a reset the object sees the same used bytes, and the next rotation is still refused.
    const beforeReset = await stub.used();
    await stub.reset();
    expect(await stub.used()).toBe(beforeReset);
    expect((await room.wait(() => post(`/mcp/agents/${bot.agent}/bearer`, control(room, rita.secret, "bearer", M, bot.agent, "", "rotate-after-reset"), ""))).status).toBe(507);
    // Exhaust the Agent's real signed control window without spending more
    // operation capacity. Direct RPC keeps the central window independent.
    const directAgent = agentObject as unknown as Pick<PlatformMcpAgent, "connectionControl">;
    let agentWindowLimited = false;
    for (let n = 0; n <= 120; n++) {
      const signed = controlOf(control(room, rita.secret, "connections", M, bot.agent, "{}", `window-agent-${n}`))!;
      const listed = await room.wait(() => directAgent.connectionControl(signed, "connections", utf8("{}")));
      if (listed.status === 429) { expect(listed.body).toEqual({ error: "rate-limited" }); agentWindowLimited = true; break; }
      expect(listed.status).toBe(200);
    }
    expect(agentWindowLimited).toBe(true);
    const publicClients = hostedRegistries(env.REGISTRIES);
    const publicClientObject = publicClients.get(publicClients.idFromName("oauth-public-clients-1"));
    const keyCalls = (object: DurableObjectStub) => runInDurableObject(object, (_instance, state) =>
      state.storage.sql.exec("SELECT calls FROM mcp_request_window WHERE purpose = 'control' AND identity = ?", "identity:" + rita.key).toArray()[0]?.["calls"]);
    expect(await keyCalls(agentObject)).toBe(120);
    // Real routed reads consume the remaining central allowance even though
    // this Agent already refuses. The exhausted central gate must also keep
    // its cleanup purpose separate.
    for (let n = 0; n <= 120 && await keyCalls(publicClientObject) !== 120; n++) {
      const limited = await room.wait(() => post(`/mcp/agents/${bot.agent}/connections`, control(room, rita.secret, "connections", M, bot.agent, "{}", `window-route-${n}`), "{}"));
      expect(limited.status).toBe(429);
      expect(await limited.json()).toEqual({ error: "rate-limited" });
    }
    expect(await keyCalls(publicClientObject)).toBe(120);
    expect(await keyCalls(agentObject)).toBe(120);
    expect(await stub.used()).toBe(beforeReset);
    const sameClientId = publicClients.idFromName("oauth-public-clients-1").toString();
    // A new clock callback in this same room must keep the very same object.
    hostedTest.now = () => room.now() - 1;
    try {
      expect(hostedRegistries(env.REGISTRIES).idFromName("oauth-public-clients-1").toString()).toBe(sameClientId);
      const rollback = await room.wait(() => post(`/mcp/agents/${bot.agent}`, control(room, rita.secret, "retire", M, bot.agent, "", "retire-backward-clock"), "", "DELETE"));
      expect(rollback.status).toBe(503);
      expect(await rollback.json()).toEqual({ error: "temporarily_unavailable" });
    } finally { hostedTest.now = () => room.now(); }
    await evictDurableObject(publicClientObject);
    expect(hostedRegistries(env.REGISTRIES).idFromName("oauth-public-clients-1").toString()).toBe(sameClientId);
    expect(await keyCalls(publicClientObject)).toBe(120);
    // Retire draws on the reserve and its separate cleanup window after both
    // ordinary control windows refuse. No counter or budget is reset.
    expect((await room.wait(() => post(`/mcp/agents/${bot.agent}`, control(room, rita.secret, "retire", M, bot.agent, "", "retire-at-full"), "", "DELETE"))).status).toBe(202);
    expect((await mcp(bearer, "POST", { "mcp-protocol-version": MODERN, "mcp-method": "tools/list" }, { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: META } })).status).toBe(401);
  } finally { done(room); }
});

test("a listing pending while its session is deleted persists nothing: the old ID stays 404 across a reset, the accounting is as before the session, and a fresh session is issued", async () => {
  const { room, rita } = await roomWithIssues();
  try {
    const bot = await hosted(room, rita, "@bot", "create-bot");
    const stub = agentStub(bot.agent);
    const list = (session: string, id: number) => mcp(bot.bearer, "POST", { "mcp-protocol-version": LEGACY, "mcp-session-id": session }, { jsonrpc: "2.0", id, method: "tools/list" });
    const before = await stub.used();
    const S = await legacySession(bot.bearer);
    expect(await stub.used(), "the session row is charged").toBeGreaterThan(before);
    // A listing's configuration read is held; the session is deleted while the listing waits; then the read is released.
    let release!: () => void;
    hostedTest.configHold = new Promise<void>((r) => { release = r; });
    const pending = list(S, 2);
    await settle(100);
    expect((await mcp(bot.bearer, "DELETE", { "mcp-protocol-version": LEGACY, "mcp-session-id": S })).status).toBe(200);
    expect(await stub.used(), "the row's bytes are credited at the delete").toBe(before);
    release();
    hostedTest.configHold = null;
    // The request that was in flight still answers; the ended session is not written again.
    expect((await pending).status).toBe(200);
    expect(await stub.used(), "no row is recreated by the pending listing").toBe(before);
    expect((await stub.counts()).sessions).toBe(0);
    expect((await list(S, 3)).status, "the old ID is gone").toBe(404);
    // A reset restores the rows as they are: none of the old session; the accounting is unchanged; a fresh session is issued.
    await stub.reset();
    expect((await list(S, 4)).status, "the old ID stays 404 after the reset").toBe(404);
    expect(await stream(bot.bearer, S).ended, "and opens no stream").toBe(404);
    expect(await stub.used()).toBe(before);
    expect((await stub.counts()).sessions).toBe(0);
    const fresh = await legacySession(bot.bearer);
    expect(fresh).not.toBe(S);
    expect((await list(fresh, 5)).status, "a fresh session is served").toBe(200);
    expect((await stub.counts()).sessions).toBe(1);
  } finally { hostedTest.configHold = null; done(room); }
});

test("H1 fences: a reset at each adopted fence of a creation resumes with the same agent, key, envelope and bearer", async () => {
  const { room, rita } = await roomWithIssues();
  try {
    const M = rita.config.repository!.membership;
    const registry = registryStub(M.scope) as unknown as { reset(): Promise<void>; agents(): Promise<{ agent: string; handle: string; key: string | null; state: string }[]>; reservedAgent(op: string): Promise<string | null> };
    const fences = ["reservation", "seed", "kept", "accepted", "complete"] as const;
    for (const [i, fence] of fences.entries()) {
      const handle = `@fence${i}`;
      const op = `create-fence-${fence}`;
      const { link } = await invite(room, rita, handle);
      const body = JSON.stringify({ link });
      hostedTest.faultAt = fence;
      // The reset: the object throws at the fence and drops its memory; the request fails with no answer.
      const failed = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, op), body)).then((r) => r.status, () => -1);
      expect(failed, `${fence}: no answer`).not.toBe(201);
      expect(hostedTest.faultAt, `${fence}: the fault fired`).toBeNull();
      await registry.reset();
      const reserved = await registry.reservedAgent(op);
      expect(reserved, `${fence}: the reservation survived`).toMatch(/^[0-9a-f]{64}$/);
      await agentStub(reserved!).reset();
      // The durable facts at the fence: the key once the seed was written, the kept enrol intent once the envelope was kept.
      const before = await agentStub(reserved!).durableFacts();
      const identityBefore = await agentStub(reserved!).roleIdentity();
      if (fence === "reservation") expect(identityBefore, "reservation-before-seed is an exact absent Agent, not an unknown enrolled key").toEqual({ status: "absent", agent: reserved });
      else expect(identityBefore).toMatchObject({ status: "observed", identity: { agent: reserved, op, key: before.key } });
      if (["seed", "kept", "accepted", "complete"].includes(fence)) expect(before.key, `${fence}: the key is durable`).toMatch(/^key_/);
      if (["kept", "accepted", "complete"].includes(fence)) expect(before.enrol, `${fence}: the envelope is kept`).toMatch(/^sha256:/);
      if (fence === "complete") expect(before.bearer, `${fence}: the bearer was minted before the reply was lost`).toBe(true);
      else expect(before.bearer, `${fence}: no bearer yet`).toBe(false);
      if (fence === "seed" || fence === "kept") {
        const object = env.AGENTS.get(env.AGENTS.idFromString(reserved!));
        await runInDurableObject(object, (_agent, state) => { state.storage.sql.exec(`UPDATE agent SET op = ? WHERE id = 1`, "TEST wrong creation stage"); });
        const wrongStage = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, op), body));
        expect(wrongStage.status, "a different creation owner cannot use pre-enrollment permission").toBe(409);
        expect((await agentStub(reserved!).durableFacts()).key).toBe(before.key);
        await runInDurableObject(object, (_agent, state) => { state.storage.sql.exec(`UPDATE agent SET op = ? WHERE id = 1`, op); });
      }
      if (fence === "complete") {
        const object = env.AGENTS.get(env.AGENTS.idFromString(reserved!));
        const missing = keyIdOfSecret(new Uint8Array(32).fill(251));
        expect(missing).not.toBe(before.key);
        await runInDurableObject(object, (_agent, state) => { state.storage.sql.exec(`UPDATE agent SET key = ? WHERE id = 1`, missing); });
        const unknownEnrolledKey = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, op), body));
        expect(unknownEnrolledKey.status, "an enrolled Agent with a missing exact Native key cannot use pre-enrollment permission").toBe(403);
        expect(await unknownEnrolledKey.json()).toEqual({ error: "unauthorized", rule: "controller-role" });
        expect((await agentStub(reserved!).durableFacts()).bearer, "the refused read does not mint or remove the committed bearer").toBe(true);
        await runInDurableObject(object, (_agent, state) => { state.storage.sql.exec(`UPDATE agent SET key = ? WHERE id = 1`, before.key!); });
      }
      if (fence === "kept") {
        // This is an actual local owner race across a real Native reply, not a Native role-loss witness.
        const object = env.AGENTS.get(env.AGENTS.idFromString(reserved!));
        const originalConfig = await runInDurableObject(object, (_agent, state) => String(state.storage.sql.exec(`SELECT config FROM agent WHERE id = 1`).toArray()[0]!["config"]));
        const originalCustody = await agentStub(reserved!).custodyRecord(`enrol:${op}`);
        expect(originalCustody?.intent).toBe(before.enrol);
        let entered!: () => void, release!: () => void, submitted = 0;
        const reached = new Promise<void>(resolve => { entered = resolve; });
        hostedTest.roleReply = { agent: handle, at: 2, calls: 0, entered, waiting: new Promise<void>(resolve => { release = resolve; }) };
        hostedTest.submitted = () => { submitted++; };
        try {
          const pending = room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, op), body));
          await reached;
          await runInDurableObject(object, (_agent, state) => { state.storage.sql.exec(`UPDATE agent SET config = json_set(config, '$.roots', json('[]')) WHERE id = 1`); });
          release();
          const refused = await pending, result = await refused.json();
          expect(refused.status, "a changed configuration cannot use a held creation admission").toBe(409);
          expect(result).toMatchObject({ error: "op", rule: "stale", next: "This call submitted no enrollment. An earlier attempt may still have been sent; resume this same operation to reconcile its kept envelope." });
          expect(result).not.toHaveProperty("bearer");
          expect(submitted, "the local admission stop reaches no actual Agent POST /acts").toBe(0);
          const stopped = await agentStub(reserved!).custodyRecord(`enrol:${op}`);
          expect(stopped).toMatchObject({ intent: originalCustody!.intent, attempt: originalCustody!.attempt, outcomes: originalCustody!.outcomes, phase: "sent" });
          expect((await agentStub(reserved!).durableFacts()).bearer).toBe(false);
          expect(await registry.reservedAgent(op), "the Registry keeps this exact resumable creation").toBe(reserved);
        } finally {
          release(); hostedTest.roleReply = null; hostedTest.submitted = null;
          await runInDurableObject(object, (_agent, state) => { state.storage.sql.exec(`UPDATE agent SET config = ? WHERE id = 1`, originalConfig); });
        }
      }
      const beforeAnswers = await storedBearerAnswers(reserved!, M.scope);
      const beforeAnswer = beforeAnswers.agent[0]?.["answer"];
      const committedExpiry = beforeAnswer === null || beforeAnswer === undefined ? null
        : (JSON.parse(String(beforeAnswer)) as { body: { bearerExpires?: string } }).body.bearerExpires;
      room.advance(2_000);
      // The retry with the same op resumes from the durable state and answers; a further retry answers the same.
      const resumed = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, op), body));
      const answer = await resumed.json() as { agent: string; key: string; bearer?: string; bearerShown?: true; bearerExpires: string; member: FactRef };
      expect([resumed.status, answer.agent], `${fence}: resumed ${JSON.stringify(answer)}`).toEqual([201, reserved]);
      expect(answer.bearerExpires, `${fence}: only terminal issuance starts the lifetime`).toBe(fence === "complete" ? committedExpiry : timeOf(room.now() + BEARER_LIFETIME));
      if (fence === "complete") expect([answer.bearer, answer.bearerShown], "the committed plaintext was lost, never replayed").toEqual([undefined, true]);
      else expect(answer.bearer).toMatch(new RegExp(`^${reserved}\\.`));
      const again = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, op), body));
      expect(await again.json(), `${fence}: only the stable receipt replays`).toEqual(shownReceipt(answer));
      // One key, one enrol entry signed by it: the envelope kept before the reset is the one admitted, never a second one.
      const after = await agentStub(reserved!).durableFacts();
      expect(await agentStub(reserved!).roleIdentity(), `${fence}: the resumed reservation observes the exact key`).toMatchObject({ status: "observed", identity: { agent: reserved, op, key: answer.key, state: "enrolled" } });
      if (fence === "complete") {
        const afterAnswers = await storedBearerAnswers(reserved!, M.scope);
        expect(afterAnswers.agent[0]!["bearer"], "a committed issuance never remints on resume").toBe(beforeAnswers.agent[0]!["bearer"]);
      }
      if (before.key) expect(after.key, `${fence}: the same key`).toBe(before.key);
      if (before.enrol) expect(after.enrol, `${fence}: the same kept envelope`).toBe(before.enrol);
      expect(after.key).toBe(answer.key);
      const enrols = (await allSteps(rita, "membership")).filter((e) => e.kind === "enrol" && e.signer === answer.key);
      expect(enrols.length, `${fence}: exactly one enrol by the agent's key`).toBe(1);
      // The admitted entry holds the intent the object kept: the envelope was never replaced.
      const entry = (await rita.ok("step", { scope: "membership", seq: enrols[0]!.seq }))["entry"] as { input: { signed: { intent: unknown } } };
      expect(intentDigestOf(entry.input.signed.intent), `${fence}: the admitted intent is the kept one`).toBe(after.enrol);
      expect((await registry.agents()).filter((a) => a.handle === handle).map((a) => [a.key, a.state])).toEqual([[answer.key, "enrolled"]]);
      // A lost terminal disclosure needs a new signed renewal, not another
      // copy of the creation's secret. Earlier fences issue once on resume.
      let bearer = answer.bearer;
      if (bearer === undefined) {
        const renewed = await room.wait(() => post(`/mcp/agents/${answer.agent}/bearer`, control(room, rita.secret, "bearer", M, answer.agent, "", `renew-${fence}`), ""));
        expect(renewed.status).toBe(200);
        bearer = (await renewed.json() as IssuedBearer).bearer;
        const oldReceipt = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, op), body));
        expect([oldReceipt.status, await oldReceipt.json()], "renewal does not rewrite the creation's original expiry").toEqual([201, shownReceipt(answer)]);
      }
      await expectBearerNotStored(answer.agent, M.scope, bearer);
      const r = await room.wait(() => modernCall(bearer, "room", {}));
      expect(r.status, `${fence}: the bearer serves`).toBe(200);
    }
  } finally { done(room); }
});

test("legacy hosted bearer migration redacts all three SQLite answers once and requires signed renewal", async () => {
  const { room, rita } = await roomWithIssues();
  try {
    const M = rita.config.repository!.membership, op = "legacy-create";
    const { link } = await invite(room, rita, "@legacy");
    const body = JSON.stringify({ link });
    const response = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, op), body));
    const fresh = await response.json() as IssuedBearer & { handle: string; member: FactRef };
    expect(response.status).toBe(201);
    // A real persisted session, without starting an inventory watcher while
    // this witness reconstructs the old schema. Eviction keeps its row.
    const initialized = await mcp(fresh.bearer, "POST", { "mcp-protocol-version": LEGACY }, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: LEGACY, capabilities: {} } });
    const session = initialized.headers.get("mcp-session-id");
    expect([initialized.status, typeof session]).toEqual([200, "string"]);
    await agentStub(fresh.agent).reset();
    const agent = env.AGENTS.get(env.AGENTS.idFromString(fresh.agent));
    const registry = env.REGISTRIES.get(env.REGISTRIES.idFromName(M.scope));
    const { bearerExpires: _newExpiry, ...legacyBody } = fresh;
    const { bearer: _legacyBearer, ...legacyStable } = legacyBody;
    const legacyText = JSON.stringify({ status: 201, body: legacyBody });
    const redactedText = JSON.stringify({ status: 201, body: { ...legacyStable, bearerShown: true, bearerExpires: null } });
    const credit = utf8(redactedText).length - utf8(legacyText).length;
    // Seed the actual pre-cutover layout and accounting, not a migration
    // test switch. The original protocol stored the agent answer twice but
    // charged/credited only its control copy.
    await runInDurableObject(agent, (_instance, state) => state.storage.transactionSync(() => {
      const old = String(state.storage.sql.exec("SELECT answer FROM control WHERE op=?", op).toArray()[0]!["answer"]);
      state.storage.sql.exec("UPDATE control SET answer=? WHERE op=?", legacyText, op).toArray();
      state.storage.sql.exec("UPDATE agent SET answer=? WHERE id=1", legacyText).toArray();
      state.storage.sql.exec("UPDATE control_budget SET v=v+? WHERE k='used'", utf8(legacyText).length - utf8(old).length - utf8(fresh.bearerExpires).length).toArray();
      state.storage.sql.exec("CREATE TABLE agent_legacy (id INTEGER PRIMARY KEY CHECK (id=1), op TEXT NOT NULL, seed BLOB NOT NULL, key TEXT NOT NULL, state TEXT NOT NULL, membership TEXT NOT NULL, handle TEXT NOT NULL, config TEXT NOT NULL, bearer TEXT, answer TEXT, created TEXT NOT NULL, updated TEXT NOT NULL)").toArray();
      state.storage.sql.exec("INSERT INTO agent_legacy SELECT id,op,seed,key,state,membership,handle,config,bearer,answer,created,updated FROM agent").toArray();
      state.storage.sql.exec("DROP TABLE agent").toArray();
      state.storage.sql.exec("ALTER TABLE agent_legacy RENAME TO agent").toArray();
      state.storage.sql.exec("DELETE FROM control_budget WHERE k='bearer-schema'").toArray();
      state.storage.sql.exec("CREATE TRIGGER r5_migration_abort BEFORE UPDATE OF answer ON agent BEGIN SELECT RAISE(ABORT, 'scripted migration write'); END").toArray();
    }));
    await runInDurableObject(registry, (_instance, state) => state.storage.transactionSync(() => {
      const old = String(state.storage.sql.exec("SELECT answer FROM control WHERE op=?", op).toArray()[0]!["answer"]);
      state.storage.sql.exec("UPDATE control SET answer=? WHERE op=?", legacyText, op).toArray();
      state.storage.sql.exec("UPDATE control_budget SET v=v+? WHERE k='used'", utf8(legacyText).length - utf8(old).length).toArray();
      state.storage.sql.exec("DELETE FROM control_budget WHERE k='bearer-schema'").toArray();
    }));
    const agentSnapshot = () => runInDurableObject(agent, (_instance, state) => ({
      columns: state.storage.sql.exec("PRAGMA table_info(agent)").toArray().map(row => row["name"]),
      agent: state.storage.sql.exec("SELECT id,op,key,state,membership,handle,config,bearer,answer,created,updated FROM agent").toArray(),
      control: state.storage.sql.exec("SELECT * FROM control ORDER BY op").toArray(),
      sessions: state.storage.sql.exec("SELECT * FROM session ORDER BY id").toArray(),
      budget: state.storage.sql.exec("SELECT * FROM control_budget ORDER BY k").toArray(),
    }));
    const registrySnapshot = () => runInDurableObject(registry, (_instance, state) => ({
      agents: state.storage.sql.exec("SELECT * FROM agents ORDER BY agent").toArray(),
      control: state.storage.sql.exec("SELECT * FROM control ORDER BY op").toArray(),
      budget: state.storage.sql.exec("SELECT * FROM control_budget ORDER BY k").toArray(),
    }));
    const before = await agentSnapshot(), beforeRegistry = await registrySnapshot();
    expect(before.columns).not.toContain("bearer_expires");
    expect(before.sessions.map(row => row["id"])).toContain(session);
    expect(before.agent[0]!["answer"]).toBe(legacyText);
    expect(before.control[0]!["answer"]).toBe(legacyText);
    expect(beforeRegistry.control[0]!["answer"]).toBe(legacyText);
    await agentStub(fresh.agent).reset();
    const migrationFailure = await runInDurableObject(agent, instance => {
      try { (instance as PlatformMcpAgent).used(); }
      catch (error) { return { threw: true, message: error instanceof Error ? error.message : String(error) }; }
      return { threw: false, message: null };
    });
    expect(migrationFailure.threw, "the actual migration write must fail inside its owning object").toBe(true);
    expect(migrationFailure.message).toContain("scripted migration write");
    expect(await agentSnapshot(), "the failed last write rolls back column, answers, credit and marker together").toEqual(before);
    await runInDurableObject(agent, (_instance, state) => state.storage.sql.exec("DROP TRIGGER r5_migration_abort").toArray());
    await agentStub(fresh.agent).used();
    const registryWithReset = registryStub(M.scope) as unknown as { reset(): Promise<void>; agents(): Promise<unknown> };
    await registryWithReset.reset(); await registryWithReset.agents();
    const migrated = await agentSnapshot(), migratedRegistry = await registrySnapshot();
    const migratedBudget = (rows: typeof before.budget) => {
      const next: Record<string, unknown>[] = [...rows.map(row => ({ ...row, v: row["k"] === "used" ? Number(row["v"]) + credit : row["v"] })), { k: "bearer-schema", v: 1 }];
      return next.sort((a, b) => String(a["k"]).localeCompare(String(b["k"])));
    };
    expect(migrated).toEqual({ ...before, columns: [...before.columns, "bearer_expires"],
      agent: before.agent.map(row => ({ ...row, answer: redactedText })), control: before.control.map(row => ({ ...row, answer: redactedText })), budget: migratedBudget(before.budget) });
    expect(migratedRegistry).toEqual({ ...beforeRegistry, control: beforeRegistry.control.map(row => ({ ...row, answer: redactedText })), budget: migratedBudget(beforeRegistry.budget) });
    const expiry = await runInDurableObject(agent, (_instance, state) => state.storage.sql.exec("SELECT bearer_expires FROM agent").toArray());
    expect(expiry).toEqual([{ bearer_expires: null }]);
    await expectBearerNotStored(fresh.agent, M.scope, fresh.bearer);
    const replay = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, op), body));
    expect([replay.status, await replay.json()]).toEqual([201, JSON.parse(redactedText).body]);
    await agentStub(fresh.agent).reset(); await agentStub(fresh.agent).used();
    await registryWithReset.reset(); await registryWithReset.agents();
    expect(await agentSnapshot(), "second initialization neither extends nor credits again").toEqual(migrated);
    expect(await registrySnapshot()).toEqual(migratedRegistry);
    expect((await modernCall(fresh.bearer, "room", {})).status, "null expiry authorizes no legacy digest").toBe(401);
    const renewedResponse = await room.wait(() => post(`/mcp/agents/${fresh.agent}/bearer`, control(room, rita.secret, "bearer", M, fresh.agent, "", "renew-legacy"), ""));
    const renewed = await renewedResponse.json() as IssuedBearer;
    expect(renewedResponse.status).toBe(200);
    expect(renewed.bearerExpires).toBe(timeOf(room.now() + BEARER_LIFETIME));
    expect((await modernCall(renewed.bearer, "room", {})).status).toBe(200);
    expect((await agentStub(fresh.agent).counts()).sessions, "renewal removes the legacy session through its ordinary lifecycle").toBe(0);
    await expectBearerNotStored(fresh.agent, M.scope, renewed.bearer);
    await runInDurableObject(agent, (_instance, state) => state.storage.sql.exec("UPDATE agent SET bearer_expires='malformed' WHERE id=1").toArray());
    await agentStub(fresh.agent).reset();
    expect((await modernCall(renewed.bearer, "room", {})).status, "a malformed expiry cannot borrow the updated timestamp").toBe(401);
  } finally { done(room); }
}, 30_000);

test("H6 through the endpoint: a custody budget refuses full before signing, a storage failure settles nothing and the receipt follows", async () => {
  const { room, rita } = await roomWithIssues();
  // Room for two identities' completion needs and little more.
  // Room for one identity's completion need beside the settled enrolment's record, and little more.
  hostedTest.custodyBounds = { budget: COMPLETION_BYTES + 64 * 1024, identityMost: 64 * 1024 * 1024, terminalMost: 1024, ageDays: 30 };
  try {
    const bot = await hosted(room, rita, "@bot", "create-bot");
    const result = async (r: Response) => (await r.json() as { result: { structuredContent: Record<string, unknown> } }).result.structuredContent;
    // The enrolment's record is terminal and holds no reservation. The first act's reply is lost, so it stays unresolved and
    // holds its completion need; the next act is refused full before anything is signed, and the refusal names custody.
    hostedTest.lose = `/${rita.config.repository!.directory.scope}/acts`;
    const first = await result(await room.wait(() => modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "one", conditions: ["done"] }, values: [canonicalize(issueDemo)], idempotencyKey: "one" })));
    expect(first["error"], JSON.stringify(first)).toBe("transport");
    const refused = await result(await room.wait(() => modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "two", conditions: ["done"] }, idempotencyKey: "two" })));
    expect(refused["error"], JSON.stringify(refused)).toBe("custody");
    expect(String(refused["message"]), "the refusal names the budget, not the envelope's size").toContain("at its budget");
    expect(((await rita.ok("steps", { scope: "directory" }))["steps"] as { kind: string | null }[]).filter((e) => e.kind === "open-issue").length, "nothing was sent for the refused act").toBe(1);
    const noRecord = await result(await room.wait(() => modernCall(bot.bearer, "settle", { idempotencyKey: "two", target: "directory" })));
    expect(noRecord["answer"], `nothing was signed or kept for the refused act: ${JSON.stringify(noRecord)}`).toBe("not-found");
    // settle resolves the first from the scope and consumes what it held; the second is admitted now; a repeat of the first
    // signs nothing and returns the retained answer.
    const settled = await result(await room.wait(() => modernCall(bot.bearer, "settle", { idempotencyKey: "one", target: "directory" })));
    expect(settled["answer"], JSON.stringify(settled)).toBe("accepted");
    const second = await result(await room.wait(() => modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "two", conditions: ["done"] }, idempotencyKey: "two" })));
    expect(second["answer"], JSON.stringify(second)).toBe("accepted");
    const repeat = await result(await room.wait(() => modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "one", conditions: ["done"] }, values: [canonicalize(issueDemo)], idempotencyKey: "one" })));
    expect([repeat["answer"], repeat["retained"]], JSON.stringify(repeat)).toEqual(["accepted", true]);
  } finally { done(room); }
});

// Real: the production app Worker's fetch, the agent object, its SQLite custody, and the scopes. STAND-INS: `hostedTest.lose`, for the lost
// replies, and the room's scripted clock. Invariant: after a lost reply, 601 seconds and a failed session renewal, the agent's custody
// identity still names the room's membership. So `settle` finds the record, no second intent is signed, and the stop names the earlier send.
test("H6 through the endpoint: a lost reply, 601 seconds and a failed session renewal keep the custody record, and the scope holds one entry", async () => {
  const { room, rita } = await roomWithIssues();
  try {
    const bot = await hosted(room, rita, "@bot", "create-bot");
    const result = async (r: Response) => (await r.json() as { result: { structuredContent: Record<string, unknown> } }).result.structuredContent;
    const stub = agentStub(bot.agent);
    const lane = async (title: string, key: string) => {
      const opened = await rita.ok("issue.create", { fields: { definition: DEMO_DIGESTS.issue, title, conditions: ["done"] }, values: [canonicalize(issueDemo)], idempotencyKey: key });
      await rita.ok("wait", { scope: "directory", entry: (opened["fact"] as FactRef).seq });
      return ((await rita.ok("room"))["lanes"] as { title: string; scope: string }[]).find(row => row.title === title)!.scope;
    };
    const [first, second] = [await lane("first", "open-first"), await lane("second", "open-second")];
    const comments = async (scope: string) => ((await rita.ok("steps", { scope }))["steps"] as { kind: string | null; signer: string | null }[]).filter(step => step.kind === "comment" && step.signer === bot.key);
    // The agent's entries age past the signed-read window, so its later signed reads of the room's scopes are refused.
    room.advance(601_000);
    const args = { target: first, fields: { body: "It is in README.md." }, idempotencyKey: "drift-1" };
    hostedTest.lose = `/${first}/acts`;
    const lost = await result(await room.wait(() => modernCall(bot.bearer, "issue.comment", args)));
    expect(lost["error"], JSON.stringify(lost)).toBe("transport");
    const kept = (await stub.custodyRecord("drift-1"))!;
    expect(kept.phase).toBe("unknown");

    room.advance(601_000);
    hostedTest.lose = "/sessions";
    const unread = await result(await room.wait(() => modernCall(bot.bearer, "room", {})));
    expect(hostedTest.lose, "the renewal went, and its reply was lost").toBeNull();
    expect((unread["unread"] as { reason: string }[]).map(row => row.reason), "the room's scopes are unread").toEqual(["forbidden", "forbidden", "forbidden"]);
    expect(unread["lanes"], "the list holds no lane").toEqual([]);

    // The list lost the tool with the lane: the stop says so, names the earlier send, and points at settle. Nothing is signed.
    const stop = await result(await room.wait(() => modernCall(bot.bearer, "issue.comment", args)));
    expect([stop["error"], stop["message"]], JSON.stringify(stop)).toEqual(["unknown-tool", "An earlier send under this key has no known outcome. No tool is named issue.comment in this list."]);
    expect(stop["next"]).toBe("Call settle with this idempotencyKey, or repeat the first call's arguments under it. Do not use a new key until the scope has answered, because a new key can make a second entry.");

    // `settle` finds the record it holds, under the same read failure, and the scope's settlement resolves it.
    const settled = await result(await room.wait(() => modernCall(bot.bearer, "settle", { idempotencyKey: "drift-1", target: first })));
    expect([settled["answer"], settled["phase"]], JSON.stringify(settled)).toEqual(["accepted", "accepted"]);
    expect((await stub.custodyRecord("drift-1"))!.intent, "the same signed intent").toBe(kept.intent);
    expect(await comments(first), "one entry under the key").toHaveLength(1);

    // The renewal works again past its refusal window: the tool is back, and the same call returns the kept answer.
    room.advance(61_000);
    const repeat = await result(await room.wait(() => modernCall(bot.bearer, "issue.comment", args)));
    expect([repeat["answer"], repeat["retained"], (repeat["fact"] as FactRef).seq], JSON.stringify(repeat)).toEqual(["accepted", true, (settled["fact"] as FactRef).seq]);
    expect(await comments(first)).toHaveLength(1);

    // A limit that docs/mcp.md states: the identity names the target, so a changed target under the same key is a new record and a new entry.
    const moved = await result(await room.wait(() => modernCall(bot.bearer, "issue.comment", { ...args, target: second })));
    expect([moved["answer"], moved["retained"]], JSON.stringify(moved)).toEqual(["accepted", false]);
    expect([(await comments(first)).length, (await comments(second)).length]).toEqual([1, 1]);
  } finally { done(room); }
}, 120_000);

test("H6 through the endpoint: a write that fails while a result is written is reported as an outcome not kept, never as nothing sent; the record stays sent, and settle under the same key writes the receipt", async () => {
  const { room, rita } = await roomWithIssues();
  hostedTest.custodyBounds = { budget: 1024 * 1024 * 1024, identityMost: 64 * 1024 * 1024, terminalMost: 1024, ageDays: 30 };
  try {
    const bot = await hosted(room, rita, "@bot", "create-bot");
    const result = async (r: Response) => (await r.json() as { result: { structuredContent: Record<string, unknown> } }).result.structuredContent;
    // The scope accepts the act; the store fails as the result is written: the tool reports that the scope answered and the
    // outcome was not kept, with what the scope said, that the act may have taken effect, and that settle under the same key is
    // the next step. It never says that nothing was sent.
    hostedTest.failWrite = "result";
    const failed = await result(await room.wait(() => modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "written late", conditions: ["done"] }, values: [canonicalize(issueDemo)], idempotencyKey: "late" })));
    expect(failed["error"], JSON.stringify(failed)).toBe("custody");
    expect(String(failed["message"]), JSON.stringify(failed)).toMatch(/was sent and the scope answered accepted, and the server could not keep that outcome\. The act may have taken effect/);
    expect(String(failed["message"])).not.toMatch(/nothing was sent[.;]/);
    expect(String(failed["next"])).toMatch(/settle with the same idempotencyKey/);
    expect((await agentStub(bot.agent).custodyRecord("late"))?.phase, "the record stays sent").toBe("sent");
    const sent = ((await rita.ok("steps", { scope: "directory" }))["steps"] as { kind: string | null; signer: string | null }[]).filter((e) => e.kind === "open-issue" && e.signer === bot.key);
    expect(sent.length, "the act was admitted by the scope").toBe(1);
    // settle reads the scope's receipt and writes it now that writes succeed; the record is accepted with the same entry.
    const settled = await result(await room.wait(() => modernCall(bot.bearer, "settle", { idempotencyKey: "late", target: "directory" })));
    expect([settled["answer"], (settled["fact"] as FactRef | undefined)?.seq], JSON.stringify(settled)).toEqual(["accepted", expect.any(Number)]);
    const repeat = await result(await room.wait(() => modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "written late", conditions: ["done"] }, values: [canonicalize(issueDemo)], idempotencyKey: "late" })));
    expect([repeat["answer"], repeat["retained"]], JSON.stringify(repeat)).toEqual(["accepted", true]);
    expect(((await rita.ok("steps", { scope: "directory" }))["steps"] as { kind: string | null; signer: string | null }[]).filter((e) => e.kind === "open-issue" && e.signer === bot.key).length, "never signed twice").toBe(1);
  } finally { done(room); }
});

test("H6 through the endpoint: a preparation step whose answer the store could not keep is reported as such, with the step's identity and its own recovery; the step stays sent, the same step under the same key is sent again and kept, one preparation entry", async () => {
  const { room, rita } = await roomWithIssues();
  const metrics: McpMetricPoint[] = [];
  hostedTest.metrics = { report: point => { metrics.push(structuredClone(point)); } };
  const stepPhases = () => metrics.filter(p => p.blobs[0] === "custody" && p.blobs[3] === "prepare" && p.doubles[5] === 1).map(p => p.blobs[5]);
  hostedTest.custodyBounds = { budget: 1024 * 1024 * 1024, identityMost: 64 * 1024 * 1024, terminalMost: 1024, ageDays: 30 };
  try {
    const bot = await hosted(room, rita, "@bot", "create-bot");
    const stub = agentStub(bot.agent);
    const result = async (r: Response) => (await r.json() as { result: { structuredContent: Record<string, unknown> } }).result.structuredContent;
    // A lane with a commitment the agent holds: rita opens an issue and offers it to the agent, who takes it and takes a hold.
    const opened = await rita.ok("issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "a held issue", conditions: ["done"] }, values: [canonicalize(issueDemo)], idempotencyKey: "held-issue" });
    expect(opened["answer"], JSON.stringify(opened)).toBe("accepted");
    const created = await rita.ok("wait", { scope: "directory", entry: (opened["fact"] as FactRef).seq });
    const lane = (created["created"] as { scope: string; kind: string }[]).find((c) => c.kind === "lane")!.scope;
    const offer = await rita.ok("issue.offer", { target: lane, fields: { offeree: "@bot" }, idempotencyKey: "offer-bot" });
    expect(offer["answer"], JSON.stringify(offer)).toBe("accepted");
    const commitment = (offer["fact"] as FactRef).seq;
    const filed = await rita.ok("step", { scope: lane, seq: 0 });
    const terms: FactRef = { at: (offer["fact"] as FactRef).at, seq: 0, hash: filed["hash"] as Digest };
    const taken = await result(await room.wait(() => modernCall(bot.bearer, "issue.take", { target: lane, on: commitment, fields: { terms }, idempotencyKey: "take-bot" })));
    expect(taken["answer"], JSON.stringify(taken)).toBe("accepted");
    const worked = await result(await room.wait(() => modernCall(bot.bearer, "issue.work", { target: lane, fields: { commitment }, idempotencyKey: "work-bot" })));
    expect(worked["answer"], JSON.stringify(worked)).toBe("accepted");
    const hold = (worked["fact"] as FactRef).seq;
    const laneRef = (await rita.ok("inspect", { scope: lane }))["ref"] as { scope: string; inc: string; kind: string };
    const entriesBy = async () => (await allSteps(rita, lane)).filter((e) => e.signer === bot.key && e.kind !== null && e.kind.includes("instance")).length;
    const preparationPosts: string[] = [];
    hostedTest.submitted = url => { if (new URL(url).pathname.endsWith("/preparations")) preparationPosts.push(new URL(url).pathname); };
    // Standalone: a hold instance step, a step with no act. The lane accepts it; the store fails as the answer is written.
    const standalone = { resource: lane, capability: "hold@1", step: "instance", fields: { hold, task: { ...laneRef, kind: "task" }, instance: "i-1" }, idempotencyKey: "instance-bot" };
    hostedTest.failWrite = "result";
    const unkept = await result(await room.wait(() => modernCall(bot.bearer, "prepare", standalone)));
    expect(unkept["error"], JSON.stringify(unkept)).toBe("custody");
    expect(String(unkept["message"]), JSON.stringify(unkept)).toMatch(new RegExp(`^Step instance of hold@1 for key instance-bot was sent to ${lane} and ${lane} answered accepted, and the server could not keep that answer\\. The step may have changed the resource`));
    expect(String(unkept["message"])).not.toMatch(/nothing was sent/);
    expect(String(unkept["next"])).toMatch(/Call prepare again with the same idempotencyKey, resource, capability and step/);
    expect(String(unkept["next"])).toMatch(/Do not use a new key or settle/);
    const kept = (await stub.custodyRecord("instance-bot"))!;
    expect([kept.phase, kept.steps], "the step is kept as sent, under a record that is still unresolved").toEqual(["sent", ["sent"]]);
    expect(stepPhases()).toEqual(["sent"]);
    expect(await entriesBy(), "the lane admitted the step once").toBe(1);
    // The same step under the same key and arguments: the same signed step is sent again, the lane repeats its answer, the
    // answer is kept, the record settles and its capacity is released; the lane holds one preparation entry.
    const again = await result(await room.wait(() => modernCall(bot.bearer, "prepare", standalone)));
    expect((again["step"] as { phase: string; answer: { answer: string } }), JSON.stringify(again)).toMatchObject({ phase: "answered", answer: { answer: "accepted" } });
    const settled = (await stub.custodyRecord("instance-bot"))!;
    expect([settled.intent, settled.phase, settled.steps, settled.reserved], "the same intent, settled, nothing reserved").toEqual([kept.intent, "settled", ["answered"], 0]);
    expect(stepPhases()).toEqual(["sent", "answered"]);
    expect(await entriesBy(), "one preparation entry").toBe(1);
    expect(preparationPosts).toHaveLength(2);
    // Ordinary: an act prepared at a resource, the report staged at the lane, then its check step. The lane answers the check;
    // the store fails as that answer is written (the write of a prepared act's record, which the store's fault names `keep`);
    // the act's record stays prepared with the check step sent, and the same prepare is the recovery.
    const report = { target: lane, kind: "report", fields: { commitment, terms, commit: "c".repeat(40), tree: "d".repeat(40) }, idempotencyKey: "report-bot", resource: lane, capability: "hold@1" };
    const staged = await result(await room.wait(() => modernCall(bot.bearer, "prepare", { ...report, step: "stage" })));
    expect((staged["step"] as { phase: string; answer: { answer: string } }), JSON.stringify(staged)).toMatchObject({ phase: "answered", answer: { answer: "accepted" } });
    const held = (await stub.custodyRecord("report-bot"))!;
    const beforeAttachedCheck = preparationPosts.length;
    hostedTest.failWrite = "keep";
    const checked = await result(await room.wait(() => modernCall(bot.bearer, "prepare", { ...report, step: "check" })));
    expect(checked["error"], JSON.stringify(checked)).toBe("custody");
    expect(preparationPosts.length).toBe(beforeAttachedCheck + 1);
    expect(String(checked["message"]), JSON.stringify(checked)).toMatch(new RegExp(`^Step check of hold@1 for key report-bot was sent to ${lane} and ${lane} answered (accepted|refused), and the server could not keep that answer\\. The step may have changed the resource; the step is kept as sent, and the act is not submitted by this`));
    expect(String(checked["message"])).not.toMatch(/nothing was sent/);
    const unkeptCheck = (await stub.custodyRecord("report-bot"))!;
    expect([unkeptCheck.intent, unkeptCheck.phase, unkeptCheck.steps.sort()], "the act is not submitted; its check step is kept as sent beside the answered stage").toEqual([held.intent, "prepared", ["answered", "sent"]]);
    expect(stepPhases()).toEqual(["sent", "answered", "sent", "answered", "sent"]);
    const checkedAgain = await result(await room.wait(() => modernCall(bot.bearer, "prepare", { ...report, step: "check" })));
    expect((checkedAgain["step"] as { phase: string }).phase, JSON.stringify(checkedAgain)).toBe("answered");
    expect((checkedAgain["act"] as { phase: string }).phase).toBe("prepared");
    const heldAgain = (await stub.custodyRecord("report-bot"))!;
    expect([heldAgain.intent, heldAgain.phase, heldAgain.steps.sort()], "the same act envelope, both steps answered").toEqual([held.intent, "prepared", ["answered", "answered"]]);
    expect(stepPhases()).toEqual(["sent", "answered", "sent", "answered", "sent", "answered"]);
  } finally { done(room); }
});

test("H6 matrix through the endpoint: prepared reset, concurrent send and settle, bounded unresolved records, archived refusal and replay, repeated uncertain attempts, a full create", async () => {
  const { room, rita } = await roomWithIssues();
  const unresolvedMost = 2;
  hostedTest.custodyBounds = { budget: 1024 * 1024 * 1024, identityMost: 64 * 1024 * 1024, terminalMost: 0, ageDays: 30, unresolvedMost };
  try {
    const M = rita.config.repository!.membership;
    const bot = await hosted(room, rita, "@bot", "create-bot");
    const stub = agentStub(bot.agent);
    const result = async (r: Response) => (await r.json() as { result: { structuredContent: Record<string, unknown> } }).result.structuredContent;
    const open = (key: string, title = key) => modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title, conditions: ["done"] }, values: [canonicalize(issueDemo)], idempotencyKey: key });
    const opened = async (signer: string) => (await allSteps(rita, "directory")).filter((e) => e.kind === "open-issue" && e.signer === signer);
    // Prepared, then reset: the dispatch write fails after the envelope was kept; the retry sends the exact bytes once.
    hostedTest.failWrite = "dispatch";
    const prepared = await result(await room.wait(() => open("prepared")));
    expect(prepared["error"], JSON.stringify(prepared)).toBe("custody");
    expect((await opened(bot.key)).length, "nothing was sent").toBe(0);
    await stub.reset();
    const resent = await result(await room.wait(() => open("prepared")));
    expect([resent["answer"], resent["retained"]], JSON.stringify(resent)).toEqual(["accepted", false]);
    expect((await opened(bot.key)).length, "sent once").toBe(1);
    // Archived terminal replay: with every terminal record archived at once, the same key returns the retained answer and sends nothing.
    const replay = await result(await room.wait(() => open("prepared")));
    expect([replay["answer"], replay["retained"]]).toEqual(["accepted", true]);
    expect((await opened(bot.key)).length).toBe(1);
    // Concurrent send and settle on one key serialize and leave one decisive outcome.
    const [sentC, settledC] = await room.wait(() => Promise.all([open("concurrent"), modernCall(bot.bearer, "settle", { idempotencyKey: "concurrent", target: "directory" })]));
    const [sentBody, settledBody] = [await result(sentC), await result(settledC)];
    expect(sentBody["answer"], JSON.stringify(sentBody)).toBe("accepted");
    expect(settledBody["answer"] ?? settledBody["error"], JSON.stringify(settledBody)).toBeDefined();
    expect((await opened(bot.key)).length, "one entry for the concurrent pair").toBe(2);
    const settledAgain = await result(await room.wait(() => modernCall(bot.bearer, "settle", { idempotencyKey: "concurrent", target: "directory" })));
    expect(settledAgain["answer"]).toBe("accepted");
    // Repeated uncertain attempts with a reset between: two lost replies, then settle: one decisive result, one entry.
    hostedTest.lose = `/${rita.config.repository!.directory.scope}/acts`;
    expect((await result(await room.wait(() => open("uncertain"))))["error"]).toBe("transport");
    const priorUncertain = await custodyFor(bot.agent, "uncertain");
    expect(priorUncertain.record.outcomes.some(outcome => "lost" in outcome)).toBe(true);
    const beforeActions = (await allItems(rita, "membership")).find(item => item.type === "roster")!.values;
    const actualAgentActions = [...beforeActions[ROLE_LISTS.agent] as string[]], actualAdminActions = beforeActions[ROLE_LISTS.admin] as string[];
    expect(actualAgentActions).not.toContain("change.check"); expect(actualAdminActions).not.toContain("change.check");
    const gate = holdAfterAdmission("@bot"), noPosts: string[] = [];
    hostedTest.submitted = url => { noPosts.push(new URL(url).pathname); };
    try {
      const pending = room.wait(() => open("uncertain"));
      await gate.entered; expect(gate.reads.calls).toBe(2);
      expect((await rita.ok("member.actions", { on: 0, fields: { role: "agent", actions: [...actualAgentActions, "change.check"] }, idempotencyKey: "TEST-S4-old-lost-wider" }))["answer"]).toBe("accepted");
      gate.release();
      expect((await result(await pending))["error"]).toBe("unauthorized");
      expect(noPosts).toEqual([]);
      const stopped = await custodyFor(bot.agent, "uncertain", priorUncertain.id);
      expect(stopped.record.envelope).toEqual(priorUncertain.record.envelope);
      expect(stopped.record.outcomes).toEqual(priorUncertain.record.outcomes);
      expect(stopped.record.count).toBe(priorUncertain.record.count);
    } finally {
      gate.release(); hostedTest.roleReply = null; hostedTest.submitted = null;
      expect((await rita.ok("member.actions", { on: 0, fields: { role: "agent", actions: actualAgentActions }, idempotencyKey: "TEST-S4-old-lost-restore" }))["answer"]).toBe("accepted");
    }
    await stub.reset();
    hostedTest.lose = `/${rita.config.repository!.directory.scope}/acts`;
    expect((await result(await room.wait(() => open("uncertain"))))["error"]).toBe("transport");
    const decisive = await result(await room.wait(() => modernCall(bot.bearer, "settle", { idempotencyKey: "uncertain", target: "directory" })));
    expect(decisive["answer"], JSON.stringify(decisive)).toBe("accepted");
    expect((await opened(bot.key)).length, "the resend is the same request: one entry").toBe(3);
    // An archived refusal resubmitted: the scope refuses a comment on an item that does not exist; the refusal is archived at once;
    // a plain repeat returns it; an explicit resubmit sends the same envelope again and is refused again, attempt 2.
    const lane = (resent["fact"] as FactRef);
    const created = await rita.ok("wait", { scope: "directory", entry: lane.seq });
    const laneScope = (created["created"] as { scope: string; kind: string }[]).find((c) => c.kind === "lane")!.scope;
    // The agent closes its own issue; a second close is refused by the scope, since the issue is no longer open.
    const intent = ((await rita.ok("inspect", { scope: laneScope }))["items"] as { id: number; type: string }[]).find((i) => i.type === "intent")!;
    const close = (key: string, extra: Record<string, unknown> = {}) => modernCall(bot.bearer, "issue.close-own", { target: laneScope, on: intent.id, fields: { reason: "completed" }, idempotencyKey: key, ...extra });
    const closed = await result(await room.wait(() => close("close-1")));
    expect(closed["answer"], JSON.stringify(closed)).toBe("accepted");
    const refused = await result(await room.wait(() => close("close-2")));
    expect(refused["answer"], JSON.stringify(refused)).toBe("refused");
    const repeated = await result(await room.wait(() => close("close-2")));
    expect([repeated["answer"], repeated["retained"]]).toEqual(["refused", true]);
    // The record under the key, read in the agent object: the plain repeat sent nothing (attempt 1, one outcome, archived at
    // once as refused); the explicit resubmit sent the same envelope again (the same intent digest, attempt 2, two outcomes).
    const original = (await agentStub(bot.agent).custodyRecord("close-2"))!;
    expect([original.attempt, original.outcomes, original.phase]).toEqual([1, 1, "refused"]);
    const resubmitted = await result(await room.wait(() => close("close-2", { resubmit: true })));
    expect([resubmitted["answer"], resubmitted["retained"]], JSON.stringify(resubmitted)).toEqual(["refused", false]);
    const again = (await agentStub(bot.agent).custodyRecord("close-2"))!;
    expect([again.intent, again.attempt, again.outcomes, again.phase], "the same envelope, a second attempt, a second outcome").toEqual([original.intent, 2, 2, "refused"]);
    // The small injected count crosses the real endpoint. The default 256 is
    // witnessed by sqlite-custody.test.ts and the file store's concurrent case.
    for (let n = 0; n < unresolvedMost; n++) {
      hostedTest.lose = `/${rita.config.repository!.directory.scope}/acts`;
      const lost = await result(await room.wait(() => open(`lost-${n}`)));
      expect(lost["error"], `lost-${n}: ${JSON.stringify(lost)}`).toBe("transport");
    }
    const beforeCount = (await opened(bot.key)).length;
    const overCount = await result(await room.wait(() => open("one-too-many")));
    expect(String(overCount["message"]), JSON.stringify(overCount)).toMatch(/full|unresolved/);
    expect(overCount["answer"]).toBeUndefined();
    expect((await opened(bot.key)).length, "nothing was sent past the count").toBe(beforeCount);
    // Settling one frees a slot; the next is admitted.
    expect((await result(await room.wait(() => modernCall(bot.bearer, "settle", { idempotencyKey: "lost-0", target: "directory" }))))["answer"]).toBe("accepted");
    expect((await result(await room.wait(() => open("one-too-many"))))["answer"]).toBe("accepted");
    // A full control budget refuses create before any allocation or enrolment: the registry has no row for it.
    hostedTest.controlBudget = { budget: 2048, reserve: 1024 };
    const { link } = await invite(room, rita, "@nobody");
    const body = JSON.stringify({ link });
    const registry2 = env.REGISTRIES.get(env.REGISTRIES.idFromName(`${M.scope}`)) as unknown as { reset(): Promise<void>; agents(): Promise<{ handle: string }[]>; reservedAgent(op: string): Promise<string | null> };
    await registry2.reset();
    const refusedCreate = await room.wait(() => post("/mcp/agents", control(room, rita.secret, "create", M, null, body, "create-nobody"), body));
    expect([refusedCreate.status, (await refusedCreate.json() as { error: string }).error]).toEqual([507, "full"]);
    expect(await registry2.reservedAgent("create-nobody"), "no reservation, no agent").toBeNull();
    expect((await registry2.agents()).some((a) => a.handle === "@nobody")).toBe(false);
  } finally { done(room); }
}, 180_000);

// Native membership, endpoint, SQLite and replay. Only the transport failure
// and fixture clock are scripted. These scenes contact no deployed service.
test("retire erases the seed before an uncertain revoke, retries only its retained envelope, and replays the recorded end", async () => {
  const { room, rita } = await roomWithIssues();
  try {
    const M = rita.config.repository!.membership;
    const bot = await hosted(room, rita, "@retire-admin", "TEST-retire-admin-create");
    const object = env.AGENTS.get(env.AGENTS.idFromString(bot.agent));
    const seed = Uint8Array.from(await runInDurableObject(object, (_instance, state) => {
      const value = state.storage.sql.exec("SELECT seed FROM agent WHERE id = 1").toArray()[0]!["seed"];
      return Array.from(value instanceof Uint8Array ? value : new Uint8Array(value as ArrayBuffer));
    }));
    expect(seed.length).toBe(32);
    const created = await room.wait(() => modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "TEST before retirement", conditions: ["done"] }, values: [canonicalize(issueDemo)], idempotencyKey: "TEST-retire-before" }));
    expect(created.status).toBe(200);
    const D = room.platform(rita.config.repository!.directory.scope);
    const before = (await D.entries()).find(entry => entry.input.type === "act" && entry.input.signed.intent.actor === bot.key);
    expect(before?.input.type).toBe("act");
    if (!before || before.input.type !== "act") throw new Error("The agent's original signed act is missing.");
    const original = await runInDurableObject(object, async (_instance, state) => {
      const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
      const kept = sql.exec("SELECT id FROM record WHERE key = ?", "TEST-retire-before").toArray()[0];
      return kept ? (await sqliteStore(sql).read(String(kept["id"])))?.envelope ?? null : null;
    });
    expect(original?.signed).toEqual(before.input.signed);
    if (!original) throw new Error("The original custody envelope is missing.");
    const items = await allItems(rita, "membership");
    const key = items.find(item => item.type === "key" && item.values["id"] === bot.key)!;
    const expected = { on: key.revision, roster: items.find(item => item.type === "roster")!.revision, member: items.find(item => item.type === "member" && item.values["handle"] === "@retire-admin")!.revision };
    const revoke = await signedIntent(secretSigner(rita.secret), { to: M, kind: "revoke-key", on: key.id, fields: { as: "retired" }, expected }, { idempotencyKey: "TEST-retire-exact-revoke", now: room.now() });
    const body = canonicalize({ revoke });
    const retire = () => room.wait(() => post(`/mcp/agents/${bot.agent}`, control(room, rita.secret, "retire", M, bot.agent, body, "TEST-retire-admin"), body, "DELETE"));
    hostedTest.drop = `/${M.scope}/acts`;
    const first = await retire();
    expect([first.status, await first.json()]).toEqual([202, expect.objectContaining({ retired: false, pending: true, seedErased: true, endpointDisabled: true, reason: "revoke-unresolved" })]);
    const stored = () => runInDurableObject(object, (_instance, state) => ({
      agent: state.storage.sql.exec("SELECT length(seed) AS bytes, state, bearer FROM agent WHERE id = 1").toArray(),
      revoke: state.storage.sql.exec("SELECT revoke FROM agent_retirement WHERE id = 1").toArray(),
      sessions: state.storage.sql.exec("SELECT count(*) AS count FROM session").toArray(),
    }));
    expect(await stored()).toMatchObject({ agent: [{ bytes: 0, state: "retired", bearer: null }], revoke: [{ revoke: canonicalize(revoke) }], sessions: [{ count: 0 }] });
    expect((await modernCall(bot.bearer, "room", {})).status).toBe(401);
    expect((await room.platform(M.scope).item(key.id)).state).toBe("active");
    await agentStub(bot.agent).reset();
    const finished = await retire();
    expect([finished.status, await finished.json()]).toEqual([200, expect.objectContaining({ retired: true, seedErased: true })]);
    expect(await room.platform(M.scope).stub.observe({ of: M, key: bot.key })).toMatchObject({ keyState: "retired" });
    const membership = await room.platform(M.scope).entries();
    const revokes = membership.filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "revoke-key" && entry.input.signed.intent.on === key.id);
    expect(revokes).toHaveLength(1);
    expect(revokes[0]!.input).toMatchObject({ type: "act", signed: revoke });
    expect((await stored()).revoke).toEqual([{ revoke: canonicalize(revoke) }]);
    // A fresh authority read sees the recorded revoke. The existing bounded
    // lifetime of grants another scope already holds does not change here.
    await D.restart();
    const repositoryItem = (await D.summary()).value.items.find(item => item.type === "repository")!;
    expect(Object.keys(before.input.signed.intent.expected)).toEqual(["repository"]);
    const after = signIntent({ ...before.input.signed.intent, expected: { repository: repositoryItem.revision }, idempotencyKey: "TEST-after-retire", notAfter: timeOf(room.now() + 60_000) }, seed);
    expect(await D.stub.submit(after, [], original.beside)).toMatchObject({ answer: "refused", reason: "unauthorized" });
    expect((await modernCall(bot.bearer, "issue.create", { fields: { definition: DEMO_DIGESTS.issue, title: "TEST forbidden", conditions: ["done"] }, idempotencyKey: "TEST-after-endpoint-retire" })).status).toBe(401);
    // Signed reads expose only the signer's cause chain. Replay needs the
    // admin's complete membership session, with signed bootstrap reads for
    // scopes that have not recorded a membership incarnation yet.
    const session = await requestSession(SERVICE, M.scope, sessionRequest(M, rita.secret, timeOf(room.now() + 60_000), b64url(crypto.getRandomValues(new Uint8Array(16)))), { fetch: room.fetch });
    if (!session.ok) throw new Error(`no replay session: ${session.reason}`);
    const full = httpSource(SERVICE, { fetch: room.fetch, reader: session.session.reader() });
    const signed = httpSource(SERVICE, { fetch: room.fetch, reader: signedLogReader(secretSigner(rita.secret), { now: room.now }) });
    const source: HistorySource = {
      page: async (scope, from, allow) => { const got = await full.page(scope, from, allow); return !got.ok && got.reason === "forbidden" ? signed.page(scope, from, allow) : got; },
      retained: async (scope, kind, digest, allow, domain) => { const got = await full.retained(scope, kind, digest, allow, domain); return !got.ok && got.reason === "forbidden" ? signed.retained(scope, kind, digest, allow, domain) : got; },
    };
    const replayed = await room.wait(() => verify(source, { mode: "replay", scope: M.scope, platform, grants: "proven" }));
    expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
    seed.fill(0);
  } finally { done(room); }
});

test("a controller's pending retire keeps no seed or replacement revoke and completes only after an admitted recorded revocation", async () => {
  const { room, rita } = await roomWithIssues();
  try {
    const M = rita.config.repository!.membership;
    const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const invited = await rita.ok("member.invite", { fields: { handle: "@retire-controller", role: "member", inviteHash: textDigest(secret), inviteEnds: timeOf(room.now() + 3_600_000) }, idempotencyKey: "TEST-retire-controller-invite" });
    const { inbox: _inbox, ...repository } = rita.config.repository!;
    const link = INVITATION_LINK + b64url(utf8(canonicalize({ v: 1, service: SERVICE, repository, invitation: (invited["fact"] as FactRef).seq, secret, handle: "@retire-controller", definition: "platform:membership@2" })));
    const controller = room.agent("retire-controller", { config: { service: "" } });
    expect((await controller.ok("join", { link, idempotencyKey: "TEST-retire-controller-join" }))["answer"]).toBe("accepted");
    const bot = await hosted(room, rita, "@retire-controlled", "TEST-retire-controlled-create", controller.secret, "platform:membership@2", "@retire-controller");
    const retire = (body: string, op: string, signer = controller.secret) => room.wait(() => post(`/mcp/agents/${bot.agent}`, control(room, signer, "retire", M, bot.agent, body, op), body, "DELETE"));
    const objectBefore = env.AGENTS.get(env.AGENTS.idFromString(bot.agent));
    const configBefore = await runInDurableObject(objectBefore, (_instance, state) => state.storage.sql.exec("SELECT config FROM agent WHERE id = 1").toArray()[0]!["config"]);
    if (typeof configBefore !== "string") throw Error("Missing retained retirement config");
    // Hold the actual Native fact reply; only the local replacement config is scripted.
    for (const [at, committed] of [[1, false], [2, true]] as const) {
      let entered!: () => void, release!: () => void;
      const held = new Promise<void>(resolve => { entered = resolve; });
      hostedTest.roleReply = { agent: "@retire-controlled", at, calls: 0, entered, waiting: new Promise<void>(resolve => { release = resolve; }) };
      const op = committed ? "TEST-retire-no-envelope" : "TEST-retire-precommit-owner";
      const waiting = retire("", op);
      await held;
      const beforeRelease = await runInDurableObject(objectBefore, (_instance, state) => ({
        seed: state.storage.sql.exec("SELECT length(seed) AS n FROM agent WHERE id = 1").toArray()[0]!["n"],
        control: state.storage.sql.exec("SELECT state, answer FROM control WHERE op = ?", op).toArray(),
      }));
      expect(beforeRelease.seed).toBe(committed ? 0 : 32);
      expect(beforeRelease.control).toEqual(committed ? [{ state: "pending", answer: null }] : []);
      const replacement = canonicalize({ ...JSON.parse(configBefore), service: "https://replacement.example" });
      expect(replacement).not.toBe(configBefore);
      await runInDurableObject(objectBefore, (_instance, state) => state.storage.sql.exec("UPDATE agent SET config=? WHERE id=1", replacement).toArray());
      try {
        release(); const stopped = await waiting;
        expect([stopped.status, await stopped.json()]).toEqual([503, committed
          ? { error: "temporarily_unavailable", next: "The cleanup may already be in effect. Send the same operation again. Do not start a new operation." }
          : { error: "temporarily_unavailable" }]);
        expect(await runInDurableObject(objectBefore, (_instance, state) => state.storage.sql.exec("SELECT config FROM agent WHERE id=1").toArray()[0]!["config"]))
          .toBe(replacement);
      } finally {
        release(); hostedTest.roleReply = null;
        await runInDurableObject(objectBefore, (_instance, state) => state.storage.sql.exec("UPDATE agent SET config=? WHERE id=1", configBefore).toArray());
      }
    }
    const first = await retire("", "TEST-retire-no-envelope");
    expect([first.status, await first.json()]).toEqual([202, expect.objectContaining({ pending: true, retired: false, seedErased: true, reason: "revoke-required" })]);
    const object = env.AGENTS.get(env.AGENTS.idFromString(bot.agent));
    const stored = () => runInDurableObject(object, (_instance, state) => ({
      seedBytes: state.storage.sql.exec("SELECT length(seed) AS bytes FROM agent WHERE id = 1").toArray()[0]!["bytes"],
      revoke: state.storage.sql.exec("SELECT revoke FROM agent_retirement WHERE id = 1").toArray()[0]!["revoke"],
    }));
    expect(await stored()).toEqual({ seedBytes: 0, revoke: null });
    expect((await modernCall(bot.bearer, "room", {})).status).toBe(401);
    const items = await allItems(rita, "membership");
    const key = items.find(item => item.type === "key" && item.values["id"] === bot.key)!;
    const expected = { on: key.revision, roster: items.find(item => item.type === "roster")!.revision, member: items.find(item => item.type === "member" && item.values["handle"] === "@retire-controlled")!.revision };
    const revoke = await signedIntent(secretSigner(controller.secret), { to: M, kind: "revoke-key", on: key.id, fields: { as: "retired" }, expected }, { idempotencyKey: "TEST-controller-refused-revoke", now: room.now() });
    const body = canonicalize({ revoke });
    const refused = await retire(body, "TEST-retire-controller-envelope");
    expect([refused.status, await refused.json()]).toEqual([202, expect.objectContaining({ pending: true, retired: false, reason: "unauthorized" })]);
    expect(await stored()).toEqual({ seedBytes: 0, revoke: canonicalize(revoke) });
    await agentStub(bot.agent).reset();
    const replacement = await signedIntent(secretSigner(rita.secret), { to: M, kind: "revoke-key", on: key.id, fields: { as: "retired" }, expected }, { idempotencyKey: "TEST-ignored-replacement-revoke", now: room.now() });
    const ignored = await retire(canonicalize({ revoke: replacement }), "TEST-retire-replacement", rita.secret);
    expect(ignored.status).toBe(202);
    expect(await stored()).toEqual({ seedBytes: 0, revoke: canonicalize(revoke) });
    expect((await room.platform(M.scope).item(key.id)).state).toBe("active");
    room.advance(Date.parse(revoke.intent.notAfter) - room.now() + 1);
    const expired = await retire(body, "TEST-retire-controller-envelope");
    expect([expired.status, await expired.json()]).toEqual([202, expect.objectContaining({ pending: true, reason: "revoke-expired" })]);
    expect((await rita.ok("key.revoke", { on: key.id, fields: { as: "retired" }, idempotencyKey: "TEST-external-admin-revoke" }))["answer"]).toBe("accepted");
    const finished = await retire(body, "TEST-retire-controller-envelope");
    expect([finished.status, await finished.json()]).toEqual([200, expect.objectContaining({ retired: true, seedErased: true })]);
    expect(await stored()).toEqual({ seedBytes: 0, revoke: canonicalize(revoke) });
    const entries = await room.platform(M.scope).entries();
    expect(entries.filter(entry => entry.input.type === "act" && entry.input.signed.intent.kind === "revoke-key" && entry.input.signed.intent.on === key.id)).toHaveLength(1);
    // The original controller key permanently retires; no other signer takes its operation.
    const controllerItems = await allItems(rita, "membership"), controllerKey = controllerItems.find(item => item.type === "key" && item.values["id"] === controller.key)!;
    expect((await rita.ok("key.revoke", { on: controllerKey.id, fields: { as: "retired" }, idempotencyKey: "TEST-retire-original-controller-key" }))["answer"]).toBe("accepted");
    const inactive = await retire(body, "TEST-retire-controller-envelope");
    expect([inactive.status, await inactive.json()]).toEqual([403, { error: "unauthorized" }]);
    const conflict = await retire(body, "TEST-retire-controller-envelope", rita.secret);
    expect([conflict.status, await conflict.json()]).toEqual([409, { error: "op", rule: "fingerprint" }]);
    expect(await stored()).toEqual({ seedBytes: 0, revoke: canonicalize(revoke) });
    const listed = await room.wait(() => post(`/mcp/agents/${bot.agent}/connections`, control(room, rita.secret, "connections", M, bot.agent, "{}", "TEST-retired-connections"), "{}"));
    expect([listed.status, await listed.json()]).toEqual([200, { agent: bot.agent, handle: "@retire-controlled", state: "retired", connections: [] }]);
  } finally { done(room); }
});
