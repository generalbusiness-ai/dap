/** Hosted MCP routes and Durable Object adapters. */
import { readDeployment } from "./deployment-setting.ts";
import { readPublicOrigin, type PublicOriginBindings } from "./public-origin.ts";
import { jsonReply as json } from "./response.ts";
import { ApplicationContentStore } from "./applications/content.ts";
import { readApplicationTrust } from "./applications/admission.ts";
import { DurableObject } from "cloudflare:workers";
import { hostedRolePort, CONTROL_BODY_BYTES, HostedAgent, HostedRegistry, OAuthClients, OAuthError, oauthPolicy, controlOf, hostedMcpTools, hostedMcpResources, mcpChallengeResponse, mcpUnauthorized, publicRequestUrl, RESOURCE_METADATA_PATH, resourceMetadataUrl, remoteCardOrigins, type OAuthPolicy, type OAuthClient, type HostedMcpSettings, type AgentPorts, type ControlAnswer, type RegistryPorts, type HostedRolePorts, type HostedRolePeer } from "@generalbusiness/dap-mcp";
import { OAUTH_METADATA_PATH, OAUTH_CLIENT_REGISTRY, oauthRoute, resolvedOAuthClient, oauthAnswer, type OAuthPublicClients, type OAuthTokenAgent } from "./oauth-routes.ts";
import { PROPOSED_BOUNDS, type ControlAction, type SignedControl } from "@generalbusiness/dap-contract";
import { digestBytes, parseStrict, timeMs, verifyControl } from "@generalbusiness/dap-bytes";
import { isObject } from "@generalbusiness/dap-derive";
import { type Binding } from "./namespace.ts";
import { admittedRequestUrl } from "./item-query-wire.ts";
import type { MetricPoint } from "./metrics.ts";
import { indexedScopes, scopeIndex, type ScopeIndexEnvironment } from "./scope-index.ts";
import { route, type Env } from "./worker.ts";

/** The two namespaces of the hosted MCP endpoint (`McpRegistry`, `McpAgent`): one registry per repository, one object per agent. */
export interface McpEnv extends Env { REGISTRIES: DurableObjectNamespace; AGENTS: DurableObjectNamespace }

// ---------------------------------------------------------------- the hosted MCP endpoint

/**
 * The routes of the hosted MCP endpoint (notes/2026-10-13-hosted-mcp-endpoint.md,
 * section 3.4), over the two namespaces. `POST /mcp/agents` goes to the
 * repository's registry, named by the membership scope the control request
 * names; the agent routes go to the agent object the path names; `/mcp`
 * itself goes to the agent the bearer names. Null: not a hosted route.
 *
 * | Route | Authorization | Object |
 * |---|---|---|
 * | `POST /mcp/agents` | `Control`, action `create` | the registry of the membership |
 * | `POST /mcp/agents/<id>/bearer` | `Control`, action `bearer` | the agent |
 * | `DELETE /mcp/agents/<id>` | `Control`, action `retire` | the agent |
 * | `POST`, `GET`, `DELETE /mcp` | `Bearer <id>.<secret>` | the agent |
 */
export async function mcpRoute(request: Request, env: HostedMcpSettings & PublicOriginBindings & Partial<Pick<McpEnv, "REGISTRIES" | "AGENTS" | "SCOPES">> & ScopeIndexEnvironment): Promise<Response | null> {
  if (!admittedRequestUrl(request.url)) return json(413, { error: "too-large" });
  const url = new URL(request.url);
  const path = url.pathname;
  const oauth = path === OAUTH_METADATA_PATH || path.startsWith("/oauth/");
  if (path !== "/mcp" && !path.startsWith("/mcp/") && path !== RESOURCE_METADATA_PATH && !oauth) return null;
  // Explicit opt-in and valid policy precede body reads or namespace addressing.
  if (hostedMcpTools(env) === null || !env.REGISTRIES || !env.AGENTS) return json(404, { error: "not-found" });
  const origin = readPublicOrigin(env, request.url);
  if (origin === null) return json(503, { error: "unavailable" });
  const resources = hostedMcpResources(env, origin);
  if (resources === null) return json(404, { error: "not-found" });
  if (path === RESOURCE_METADATA_PATH) {
    const resource = resources.find(value => resourceMetadataUrl(value) === publicRequestUrl(origin, request.url));
    if (resource === undefined) return json(404, { error: "not-found" });
    if (request.method !== "GET") return json(405, { error: "method-not-allowed" });
    return json(200, { resource, authorization_servers: [origin], scopes_supported: ["mcp"], bearer_methods_supported: ["header"] });
  }
  const { REGISTRIES, AGENTS } = env;
  const address = request.headers.get("cf-connecting-ip");
  if (oauth) {
    const policy = oauthPolicy(env);
    if (!policy || resources.length === 0) return json(404, { error: "not-found" });
    return await oauthRoute(request, { origin, resources, policy, read: boundedBytes, address,
      clients: {
        admitControl: (signed, service, action, agent, address) => (REGISTRIES.get(REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY)) as unknown as OAuthPublicClients).admitControl(signed, service, action, agent, address),
        admitContext: address => (REGISTRIES.get(REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY)) as unknown as OAuthPublicClients).admitContext(address),
        registerClient: (bytes, given) => (REGISTRIES.get(REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY)) as unknown as OAuthPublicClients).registerClient(bytes, given),
        resolveClient: (id, given) => (REGISTRIES.get(REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY)) as unknown as OAuthPublicClients).resolveClient(id, given),
      },
      agent: id => { try { return AGENTS.get(AGENTS.idFromString(id)) as unknown as OAuthTokenAgent; } catch { return null; } },
    }) ?? json(404, { error: "not-found" });
  }
  const answered = (a: ControlAnswer): Response => new Response(JSON.stringify(a.body), { status: a.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  if (path === "/mcp") {
    const named = /^Bearer ([0-9a-f]{64})\./.exec(request.headers.get("authorization") ?? "");
    if (!named) return mcpUnauthorized(request, origin);
    let id: DurableObjectId;
    try { id = AGENTS.idFromString(named[1]!); } catch { return mcpUnauthorized(request, origin); }
    return mcpChallengeResponse(request, await AGENTS.get(id).fetch(request), origin);
  }
  const agentPath = /^\/mcp\/agents\/([0-9a-f]{64})(\/(?:bearer|grant|connections|revoke-grant))?$/.exec(path);
  const control = path === "/mcp/agents" && request.method === "POST" ? { action: "create" as const, agent: null }
    : path === "/mcp/agents/grant" && request.method === "POST" ? { action: "grant" as const, agent: null }
    : path === "/mcp/agents/connections" && request.method === "POST" ? { action: "connections" as const, agent: null }
    : agentPath && agentPath[2] === "/bearer" && request.method === "POST" ? { action: "bearer" as const, agent: agentPath[1]! }
    : agentPath && agentPath[2] === "/grant" && request.method === "POST" ? { action: "grant" as const, agent: agentPath[1]! }
    : agentPath && agentPath[2] === "/connections" && request.method === "POST" ? { action: "connections" as const, agent: agentPath[1]! }
    : agentPath && agentPath[2] === "/revoke-grant" && request.method === "POST" ? { action: "revoke-grant" as const, agent: agentPath[1]! }
    : agentPath && !agentPath[2] && request.method === "DELETE" ? { action: "retire" as const, agent: agentPath[1]! }
    : null;
  if (!control) return json(path === "/mcp/agents" || agentPath ? 405 : 404, { error: path === "/mcp/agents" || agentPath ? "method-not-allowed" : "not-found" });
  const oauthControl = ["grant", "connections", "revoke-grant"].includes(control.action), policy = oauthControl ? oauthPolicy(env) : null;
  if (oauthControl && (!policy || resources.length === 0)) return json(404, { error: "not-found" });
  const signed = controlOf(request.headers.get("authorization"));
  if (!signed) return json(400, { error: "control", rule: "header" });
  if (signed.request.action !== control.action || signed.request.agent !== control.agent) return json(400, { error: "control", rule: "binding" });
  if (signed.request.service !== origin) return json(403, { error: "control", rule: "service" });
  if (!verifyControl(signed)) return json(403, { error: "control", rule: "signature" });
  if (control.agent === null) {
    let known = false;
    try {
      const index = scopeIndex(env);
      if (!index) return json(404, { error: "not-found" });
      known = await index.has(signed.request.membership.scope, "membership") === true;
      if (!known && env.SCOPE_INDEX_MODE === "register" && env.SCOPES) {
        const target = env.SCOPES.get(env.SCOPES.idFromName(signed.request.membership.scope)) as unknown as { registerKnown(): Promise<boolean> };
        known = await target.registerKnown() === true && await index.has(signed.request.membership.scope, "membership") === true;
      }
    } catch { return json(404, { error: "not-found" }); }
    if (!known) return json(404, { error: "not-found" });
  }
  // The body, within its bound, as the exact bytes the object digests against the request's binding: read in chunks and
  // cancelled at the chunk that passes the bound, before anything is authenticated or any object is reached.
  const bytes = await boundedBytes(request, CONTROL_BODY_BYTES);
  if (bytes === "too-large") return json(413, { error: "too-large" });
  if (bytes === "unreadable") return json(400, { error: "bad-request" });
  if (digestBytes(bytes) !== signed.request.body) return json(403, { error: "control", rule: "body" });
  try {
    // No invitation/body plaintext enters the public-client registry. Its own
    // clock verifies the signed deadline before this actor spends a window.
    const admission = await (REGISTRIES.get(REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY)) as unknown as OAuthPublicClients).admitControl(signed, origin, control.action, control.agent, address);
    if (admission.status !== 200) return answered(admission);
  } catch { return answered({ status: 503, body: { error: "temporarily_unavailable" } }); }
  if (control.action === "grant") {
    try {
      const body = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
      if (!isObject(body) || typeof body["client_id"] !== "string") return oauthAnswer({ status: 400, body: { error: "invalid_request" } });
      const clients = REGISTRIES.get(REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY)) as unknown as OAuthPublicClients;
      const client = await resolvedOAuthClient(clients, body["client_id"], policy!);
      const context = { client, resources, redirects: policy!.redirects };
      const registry = REGISTRIES.get(REGISTRIES.idFromName(signed.request.membership.scope)) as unknown as Pick<HostedRegistry, "grant" | "grantExisting">;
      return oauthAnswer(control.agent === null ? await registry.grant(signed, bytes, origin, context) : await registry.grantExisting(signed, bytes, origin, context));
    } catch (error) { return oauthAnswer({ status: error instanceof OAuthError ? error.status : 503, body: { error: error instanceof OAuthError ? error.error : "temporarily_unavailable" } }); }
  }
  if (control.agent === null) {
    const registry = REGISTRIES.get(REGISTRIES.idFromName(signed.request.membership.scope)) as unknown as Pick<HostedRegistry, "create" | "connections">;
    return answered(control.action === "create" ? await registry.create(signed, bytes, origin) : await registry.connections(signed, bytes, origin));
  }
  let id: DurableObjectId;
  try { id = AGENTS.idFromString(control.agent); } catch { return json(404, { error: "agent" }); }
  const agent = AGENTS.get(id) as unknown as Pick<HostedAgent, "control" | "connectionControl">;
  return answered(control.action === "connections" || control.action === "revoke-grant" ? await agent.connectionControl(signed, control.action, bytes) : await agent.control(signed, control.action, bytes));
}

/** A request body as exact bytes within `most`: cancelled at the chunk that passes the bound; a declared length over it is not read. */
async function boundedBytes(request: Request, most: number): Promise<Uint8Array | "too-large" | "unreadable"> {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > most) return "too-large";
    if (!request.body) return new Uint8Array(0);
    const reader = request.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > most) { await reader.cancel(); return "too-large"; }
      parts.push(value);
    }
    const out = new Uint8Array(size);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  } catch { return "unreadable"; }
}

/** The membership object's observation read, as the hosted objects check authority: a real read of the membership now. */
function observeThrough(binding: Binding): RegistryPorts["observe"] {
  return (membership, ask) => (binding.get(binding.idFromName(membership.scope)) as unknown as { observe(asked: unknown): Promise<unknown> }).observe({ of: membership, ...ask });
}

/** Fresh internal facts only; callers still own all authority and final-owner checks. */
export function roleStandingThrough(binding: Binding): HostedRolePorts["roleStanding"] {
  return hostedRolePort(async request => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const peer = binding.get(binding.idFromName(request.membership.scope)) as HostedRolePeer;
      if (typeof peer.hostedRoleStanding !== "function") return { status: "unavailable" };
      const reply = await Promise.race([
        peer.hostedRoleStanding(request),
        new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 5000); }),
      ]);
      return reply;
    } catch { return { status: "unavailable" }; }
    finally { if (timer !== undefined) clearTimeout(timer); }
  });
}

const sqlOf = (ctx: DurableObjectState) => ({
  exec: (query: string, ...bindings: (string | number | null | ArrayBuffer | Uint8Array)[]) => ctx.storage.sql.exec(query, ...bindings),
  transaction: <T>(closure: () => T): T => ctx.storage.transactionSync(closure),
});

/** One repository's registry of hosted agents, named by its membership scope ID. */
export class McpRegistry<E extends McpEnv = McpEnv> extends DurableObject<E> {
  #registry: HostedRegistry | null = null;
  #clients: OAuthClients | null = null;
  #clientsOf(): OAuthClients { return this.#clients ??= new OAuthClients(sqlOf(this.ctx), { now: () => this.now(), random: n => crypto.getRandomValues(new Uint8Array(n)), fetch: (url, init) => fetch(url, init) }); }
  async admitControl(signed: SignedControl, service: string, action: ControlAction, agent: string | null, address: string | null): Promise<ControlAnswer> {
    try {
      if (!verifyControl(signed)) return { status: 403, body: { error: "control", rule: "signature" } };
      const r = signed.request;
      if (r.service !== service) return { status: 403, body: { error: "control", rule: "service" } };
      if (r.action !== action || r.agent !== agent) return { status: 400, body: { error: "control", rule: "binding" } };
      const now = this.now(), until = timeMs(r.notAfter);
      if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(now + 60_000)) return { status: 503, body: { error: "temporarily_unavailable" } };
      if (until === null || until <= now || until > now + PROPOSED_BOUNDS.intentLifetimeSeconds * 1000) return { status: 400, body: { error: "control", rule: "notAfter" } };
      this.#clientsOf().admitControl(r.actor, action === "retire" || action === "revoke-grant", address);
      return { status: 200, body: {} };
    } catch (error) { return { status: error instanceof OAuthError ? error.status : 503, body: { error: error instanceof OAuthError ? error.error : "temporarily_unavailable" } }; }
  }
  async admitContext(address: string | null): Promise<ControlAnswer> {
    try { this.#clientsOf().admitContext(address); return { status: 200, body: {} }; }
    catch (error) { return { status: error instanceof OAuthError ? error.status : 503, body: { error: error instanceof OAuthError ? error.error : "temporarily_unavailable" } }; }
  }
  async registerClient(bytes: Uint8Array, policy: OAuthPolicy): Promise<ControlAnswer> {
    try { return { status: 201, body: { ...this.#clientsOf().register(bytes, policy.redirects) } }; }
    catch (error) { return { status: error instanceof OAuthError ? error.status : 503, body: { error: error instanceof OAuthError ? error.error : "temporarily_unavailable" } }; }
  }
  async retainClient(client: OAuthClient): Promise<ControlAnswer> {
    try { return { status: 200, body: { expires: this.#clientsOf().retain(client) } }; }
    catch (error) { return { status: error instanceof OAuthError ? error.status : 503, body: { error: error instanceof OAuthError ? error.error : "temporarily_unavailable" } }; }
  }
  async resolveClient(id: string, policy: OAuthPolicy): Promise<ControlAnswer> {
    try { return { status: 200, body: { ...await this.#clientsOf().resolve(id, policy) } }; }
    catch (error) { return { status: error instanceof OAuthError ? error.status : 503, body: { error: error instanceof OAuthError ? error.error : "temporarily_unavailable" } }; }
  }
  /** The persisted answer bodies, for a test's subclass. */
  protected answers(): { op: string; answer: boolean }[] {
    return this.ctx.storage.sql.exec(`SELECT op, answer IS NOT NULL AS held FROM control ORDER BY created`).toArray().map((r) => ({ op: String(r["op"]), answer: Number(r["held"]) === 1 }));
  }
  protected scopes(): Binding { return indexedScopes(this.env.SCOPES, this.env); }
  protected now(): number { return Date.now(); }
  protected ports(): Partial<RegistryPorts> { return {}; }
  /** Drop this instance's memory, as an eviction would. For a test's subclass. */
  protected evict(): void { this.#registry = null; }
  #of(): HostedRegistry {
    if (this.#registry) return this.#registry;
    const agents = this.env.AGENTS;
    this.#registry = new HostedRegistry(sqlOf(this.ctx), {
      now: () => this.now(), observe: observeThrough(this.scopes()), roleStanding: roleStandingThrough(this.scopes()), ...this.ports(),
      mintId: () => agents.newUniqueId().toString(),
      agent: (id) => agents.get(agents.idFromString(id)) as unknown as ReturnType<RegistryPorts["agent"]>,
    });
    return this.#registry;
  }
  async create(signed: Parameters<HostedRegistry["create"]>[0], body: Uint8Array, origin: string): Promise<ControlAnswer> { return this.#of().create(signed, body, origin); }
  async grant(signed: Parameters<HostedRegistry["grant"]>[0], body: Uint8Array, origin: string, context: Parameters<HostedRegistry["grant"]>[3]): Promise<ControlAnswer> { return this.#of().grant(signed, body, origin, context); }
  async grantExisting(signed: Parameters<HostedRegistry["grantExisting"]>[0], body: Uint8Array, origin: string, context: Parameters<HostedRegistry["grantExisting"]>[3]): Promise<ControlAnswer> { return this.#of().grantExisting(signed, body, origin, context); }
  async connections(signed: Parameters<HostedRegistry["connections"]>[0], body: Uint8Array, origin: string): Promise<ControlAnswer> { return this.#of().connections(signed, body, origin); }
  agents(): ReturnType<HostedRegistry["agents"]> { return this.#of().agents(); }
  reservedAgent(op: string): string | null { return this.#of().reservedAgent(op); }
}

/** One hosted agent: its key, bearer, sessions, custody and control identities. */
export class McpAgent<E extends McpEnv = McpEnv> extends DurableObject<E> {
  #agent: HostedAgent | null = null;
  protected scopes(): Binding { return indexedScopes(this.env.SCOPES, this.env); }
  protected ports(): Partial<AgentPorts> { return {}; }
  protected async retainClient(client: OAuthClient): Promise<number> {
    const clients = this.env.REGISTRIES.get(this.env.REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY)) as unknown as Pick<McpRegistry, "retainClient">;
    const response = await clients.retainClient(client);
    if (response.status !== 200 || typeof response.body["expires"] !== "number") throw new OAuthError(typeof response.body["error"] === "string" ? response.body["error"] : "temporarily_unavailable", response.status === 200 ? 503 : response.status);
    return response.body["expires"];
  }
  #of(): HostedAgent {
    if (this.#agent) return this.#agent;
    const scopes = this.scopes();
    this.#agent = new HostedAgent(sqlOf(this.ctx), {
      genericTools: hostedMcpTools(this.env) ?? [],
      cardOrigins: remoteCardOrigins(this.env.MCP_CARD_ORIGINS) ?? [],
      retainClient: client => this.retainClient(client),
      oauthResource: request => {
        const origin = readPublicOrigin(this.env, request.url);
        if (origin === null) return null;
        const resource = publicRequestUrl(origin, request.url);
        return hostedMcpResources(this.env, origin)?.includes(resource) ? resource : null;
      },
      applicationContent: async release => {
        if (!this.env.APPLICATION_CONTENT) return null;
        const store = new ApplicationContentStore(this.env.APPLICATION_CONTENT, readApplicationTrust(this.env.APPLICATION_TRUST), PROPOSED_BOUNDS);
        return (await store.get(release))?.bytes ?? null;
      },
      applicationTrust: this.env.APPLICATION_TRUST,
      id: this.ctx.id.toString(), now: () => Date.now(), random: (n) => crypto.getRandomValues(new Uint8Array(n)), observe: observeThrough(scopes), roleStanding: roleStandingThrough(scopes),
      ...(this.env.METRICS ? { metrics: { deployment: readDeployment(this.env.DEPLOYMENT) ?? "unknown", version: this.env.VERSION_METADATA?.id ?? "unknown", report: (point: MetricPoint) => this.env.METRICS?.writeDataPoint(point) } } : {}),
      fetch: ((url: string, init?: RequestInit) => route(new Request(url, init), scopes, this.env)) as unknown as AgentPorts["fetch"],
      ...this.ports(),
    });
    return this.#agent;
  }
  async create(op: string, request: Parameters<HostedAgent["create"]>[1], link: Parameters<HostedAgent["create"]>[2]): Promise<ControlAnswer> { return this.#of().create(op, request, link); }
  async grant(signed: Parameters<HostedAgent["grant"]>[0], body: Uint8Array, context: Parameters<HostedAgent["grant"]>[2]): Promise<ControlAnswer> { return this.#of().grant(signed, body, context); }
  async agentState(): Promise<string | null> { return this.#of().agentState(); }
  async roleIdentity(): Promise<ReturnType<HostedAgent["roleIdentity"]>> { return this.#of().roleIdentity(); }
  async connectionControl(signed: Parameters<HostedAgent["connectionControl"]>[0], action: "connections" | "revoke-grant", body: Uint8Array): Promise<ControlAnswer> { return this.#of().connectionControl(signed, action, body); }
  async exchangeCode(...args: Parameters<HostedAgent["exchangeCode"]>): Promise<ControlAnswer> { return this.#of().exchangeCode(...args); }
  async refreshGrant(...args: Parameters<HostedAgent["refreshGrant"]>): Promise<ControlAnswer> { return this.#of().refreshGrant(...args); }
  async revokeToken(...args: Parameters<HostedAgent["revokeToken"]>): Promise<ControlAnswer> { return this.#of().revokeToken(...args); }
  async control(signed: Parameters<HostedAgent["control"]>[0], action: "bearer" | "retire", body: Uint8Array): Promise<ControlAnswer> { return this.#of().control(signed, action, body); }
  override async fetch(request: Request): Promise<Response> { return this.#of().fetch(request); }
  /** Drop this instance's memory, as an eviction would: streams end with no event, storage stays. For a test's subclass. */
  protected evict(): void { this.#agent?.abrupt(); this.#agent = null; }
  /** The durable facts a witness compares across a reset. For a test's subclass. */
  protected durable(): ReturnType<HostedAgent["durable"]> { return this.#of().durable(); }
  protected custodyOf(key: string): ReturnType<HostedAgent["custodyOf"]> { return this.#of().custodyOf(key); }
  /** What this instance holds in memory now. For a test's subclass. */
  protected held(): HostedAgent | null { return this.#agent; }
  /** The control budget's used bytes, for a test's subclass. */
  protected controlUsed(): number { return this.#of().controlUsed(); }
  /** The persisted answer bodies, for a test's subclass: whether each control row and the agent row still hold one. */
  protected answers(): { control: { op: string; answer: boolean }[]; agent: boolean } {
    const rows = this.ctx.storage.sql.exec(`SELECT op, answer IS NOT NULL AS held FROM control ORDER BY created`).toArray();
    const agent = this.ctx.storage.sql.exec(`SELECT answer IS NOT NULL AS held FROM agent WHERE id = 1`).toArray()[0];
    return { control: rows.map((r) => ({ op: String(r["op"]), answer: Number(r["held"]) === 1 })), agent: agent ? Number(agent["held"]) === 1 : false };
  }
}
