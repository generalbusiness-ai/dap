/** Hosted MCP routes and Durable Object adapters. */
import { readDeployment } from "./deployment-setting.ts";
import { readPublicOrigin, type PublicOriginBindings } from "./public-origin.ts";
import { jsonReply as json } from "./response.ts";
import { ApplicationContentStore } from "./applications/content.ts";
import { readApplicationTrust } from "./applications/admission.ts";
import { DurableObject } from "cloudflare:workers";
import { CONTROL_BODY_BYTES, HostedAgent, HostedRegistry, OAuthClients, OAuthError, oauthPolicy, controlOf, hostedMcpTools, hostedMcpResources, mcpChallengeResponse, mcpUnauthorized, publicRequestUrl, RESOURCE_METADATA_PATH, resourceMetadataUrl, remoteCardOrigins, type OAuthPolicy, type OAuthClient, type HostedMcpSettings, type AgentPorts, type ControlAnswer, type RegistryPorts, RETIRED_STORE_STOP, isRetiredStoreStop, type RetiredStoreStop } from "@generalbusiness/dap-mcp";
import { OAUTH_METADATA_PATH, OAUTH_CLIENT_REGISTRY, oauthRoute, resolvedOAuthClient, oauthAnswer, type OAuthPublicClients, type OAuthTokenAgent } from "./oauth-routes.ts";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { parseStrict } from "@generalbusiness/dap-bytes";
import type { SequenceRef } from "@generalbusiness/dap-contract";
import { hostedRegistryName } from "./hosted-registry-name.ts";
import { classifyRoomFormat, writeRoomFormat2, type RoomFormatStart } from "./room-format.ts";
import { isRoomRetiredStop, roomRetiredResponse } from "./room-retired.ts";
import { registryAnswers, registryScopes, registryNow, registryPorts, registryEvict, hostedRegistryOwnsMembership, agentScopes, agentPorts, agentRetainClient, agentEvict, agentDurable, agentCustodyOf, agentHeld, agentControlUsed, agentAnswers, hostedAgentStart } from "./internal/hosted-hooks.ts";
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
  if (oauth) {
    const policy = oauthPolicy(env);
    if (!policy || resources.length === 0) return json(404, { error: "not-found" });
    return await oauthRoute(request, { origin, resources, policy, read: boundedBytes,
      clients: {
        registerClient: (bytes, given) => (REGISTRIES.get(REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY)) as unknown as OAuthPublicClients).registerClient(bytes, given),
        resolveClient: (id, given) => (REGISTRIES.get(REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY)) as unknown as OAuthPublicClients).resolveClient(id, given),
      },
      agent: id => { try { return AGENTS.get(AGENTS.idFromString(id)) as unknown as OAuthTokenAgent; } catch { return null; } },
    }) ?? json(404, { error: "not-found" });
  }
  const answered = (a: ControlAnswer | RetiredStoreStop): Response => isRetiredStoreStop(a)
    ? json(503, { error: "unavailable" })
    : new Response(JSON.stringify(a.body), { status: a.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
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
  if (control.agent === null) {
    let known = false;
    try {
      const index = scopeIndex(env);
      if (!index) return json(404, { error: "not-found" });
      known = await index.has(signed.request.membership.scope, "membership") === true;
      if (!known && env.SCOPE_INDEX_MODE === "register" && env.SCOPES) {
        const target = env.SCOPES.get(env.SCOPES.idFromName(signed.request.membership.scope)) as unknown as { registerKnown(): Promise<boolean> };
        const registered = await target.registerKnown();
        if (isRetiredStoreStop(registered)) return roomRetiredResponse();
        known = registered === true && await index.has(signed.request.membership.scope, "membership") === true;
      }
    } catch { return json(404, { error: "not-found" }); }
    if (!known) return json(404, { error: "not-found" });
  }
  // The body, within its bound, as the exact bytes the object digests against the request's binding: read in chunks and
  // cancelled at the chunk that passes the bound, before anything is authenticated or any object is reached.
  const bytes = await boundedBytes(request, CONTROL_BODY_BYTES);
  if (bytes === "too-large") return json(413, { error: "too-large" });
  if (bytes === "unreadable") return json(400, { error: "bad-request" });
  if (control.action === "grant") {
    try {
      const body = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
      if (!isObject(body) || typeof body["client_id"] !== "string") return oauthAnswer({ status: 400, body: { error: "invalid_request" } });
      const clients = REGISTRIES.get(REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY)) as unknown as OAuthPublicClients;
      const client = await resolvedOAuthClient(clients, body["client_id"], policy!);
      const context = { client, resources, redirects: policy!.redirects };
      const registry = REGISTRIES.get(REGISTRIES.idFromName(hostedRegistryName(signed.request.membership))) as unknown as Pick<McpRegistry, "grant" | "grantExisting">;
      return oauthAnswer(control.agent === null ? await registry.grant(signed, bytes, origin, context) : await registry.grantExisting(signed, bytes, origin, context));
    } catch (error) { return oauthAnswer({ status: error instanceof OAuthError ? error.status : 503, body: { error: error instanceof OAuthError ? error.error : "temporarily_unavailable" } }); }
  }
  if (control.agent === null) {
    const registry = REGISTRIES.get(REGISTRIES.idFromName(hostedRegistryName(signed.request.membership))) as unknown as Pick<McpRegistry, "create" | "connections">;
    return answered(control.action === "create" ? await registry.create(signed, bytes, origin) : await registry.connections(signed, bytes, origin));
  }
  let id: DurableObjectId;
  try { id = AGENTS.idFromString(control.agent); } catch { return json(404, { error: "agent" }); }
  const agent = AGENTS.get(id) as unknown as Pick<McpAgent, "control" | "connectionControl">;
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

/** A transport stop cannot become an inactive key or a refused authority read. */
async function membershipControl(work: () => Promise<ControlAnswer>, error: "unavailable" | "temporarily_unavailable"): Promise<ControlAnswer> {
  try { return await work(); }
  catch (failed) { if (isRetiredStoreStop(failed)) return { status: 503, body: { error } }; throw failed; }
}

/** The membership object's observation read, as the hosted objects check authority: a real read of the membership now. */
function observeThrough(binding: Binding): RegistryPorts["observe"] {
  return async (membership, ask) => {
    const answer = await (binding.get(binding.idFromName(membership.scope)) as unknown as { observe(asked: unknown): Promise<unknown> }).observe({ of: membership, ...ask });
    if (isRoomRetiredStop(answer)) throw answer;
    return answer;
  };
}

const sqlOf = (ctx: DurableObjectState) => ({
  exec: (query: string, ...bindings: (string | number | null | ArrayBuffer | Uint8Array)[]) => ctx.storage.sql.exec(query, ...bindings),
  transaction: <T>(closure: () => T): T => ctx.storage.transactionSync(closure),
});

/** One full Membership registry, or the unchanged public OAuth-client registry. */
export class McpRegistry<E extends McpEnv = McpEnv> extends DurableObject<E> {
  #registry: HostedRegistry | null = null;
  #clients: OAuthClients | null = null;
  readonly #publicClients: boolean;
  // Private inspection only: never an authorization shortcut for a public call.
  #inspectionOwner = false;
  constructor(ctx: DurableObjectState, env: E) {
    super(ctx, env);
    try { this.#publicClients = ctx.id.toString() === env.REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY).toString(); }
    catch { this.#publicClients = false; }
  }
  #owns(membership: SequenceRef): boolean {
    try { return !this.#publicClients && this.ctx.id.toString() === this.env.REGISTRIES.idFromName(hostedRegistryName(membership)).toString(); }
    catch { return false; }
  }
  protected [hostedRegistryOwnsMembership](membership: SequenceRef): boolean { return this.#owns(membership); }
  #inspection(): void {
    if (!this.#inspectionOwner) throw new Error("Hosted registry inspection is unavailable.");
  }
  #clientsOf(): OAuthClients { return this.#clients ??= new OAuthClients(sqlOf(this.ctx), { now: () => this[registryNow](), random: n => crypto.getRandomValues(new Uint8Array(n)), fetch: (url, init) => fetch(url, init) }); }
  async registerClient(bytes: Uint8Array, policy: OAuthPolicy): Promise<ControlAnswer | RetiredStoreStop> {
    if (!this.#publicClients) return RETIRED_STORE_STOP;
    try { return { status: 201, body: { ...this.#clientsOf().register(bytes, policy.redirects) } }; }
    catch (error) { return { status: error instanceof OAuthError ? error.status : 503, body: { error: error instanceof OAuthError ? error.error : "temporarily_unavailable" } }; }
  }
  async retainClient(client: OAuthClient): Promise<ControlAnswer | RetiredStoreStop> {
    if (!this.#publicClients) return RETIRED_STORE_STOP;
    try { return { status: 200, body: { expires: this.#clientsOf().retain(client) } }; }
    catch (error) { return { status: error instanceof OAuthError ? error.status : 503, body: { error: error instanceof OAuthError ? error.error : "temporarily_unavailable" } }; }
  }
  async resolveClient(id: string, policy: OAuthPolicy): Promise<ControlAnswer | RetiredStoreStop> {
    if (!this.#publicClients) return RETIRED_STORE_STOP;
    try { return { status: 200, body: { ...await this.#clientsOf().resolve(id, policy) } }; }
    catch (error) { return { status: error instanceof OAuthError ? error.status : 503, body: { error: error instanceof OAuthError ? error.error : "temporarily_unavailable" } }; }
  }
  /** The persisted answer bodies, for a test's subclass. */
  protected [registryAnswers](): { op: string; answer: boolean }[] {
    this.#inspection();
    return this.ctx.storage.sql.exec(`SELECT op, answer IS NOT NULL AS held FROM control ORDER BY created`).toArray().map((r) => ({ op: String(r["op"]), answer: Number(r["held"]) === 1 }));
  }
  protected [registryScopes](): Binding { return indexedScopes(this.env.SCOPES, this.env); }
  protected [registryNow](): number { return Date.now(); }
  protected [registryPorts](): Partial<RegistryPorts> { return {}; }
  /** Drop this instance's memory, as an eviction would. For a test's subclass. */
  protected [registryEvict](): void { this.#registry = null; }
  #of(): HostedRegistry {
    if (this.#registry) return this.#registry;
    this.#inspectionOwner = false;
    const agents = this.env.AGENTS;
    let candidate: HostedRegistry;
    try { candidate = new HostedRegistry(sqlOf(this.ctx), {
      now: () => this[registryNow](), observe: observeThrough(this[registryScopes]()), ...this[registryPorts](),
      mintId: () => agents.newUniqueId().toString(),
      agent: (id) => agents.get(agents.idFromString(id)) as unknown as ReturnType<RegistryPorts["agent"]>,
    }); } catch (error) {
      this.#inspectionOwner = false;
      throw error;
    }
    // Publish this private role fact only after the entire helper setup succeeds.
    this.#registry = candidate;
    this.#inspectionOwner = true;
    return candidate;
  }
  async create(signed: Parameters<HostedRegistry["create"]>[0], body: Uint8Array, origin: string): Promise<ControlAnswer | RetiredStoreStop> { if (!this.#owns(signed?.request?.membership)) return RETIRED_STORE_STOP; return membershipControl(() => this.#of().create(signed, body, origin), "unavailable"); }
  async grant(signed: Parameters<HostedRegistry["grant"]>[0], body: Uint8Array, origin: string, context: Parameters<HostedRegistry["grant"]>[3]): Promise<ControlAnswer | RetiredStoreStop> { if (!this.#owns(signed?.request?.membership)) return RETIRED_STORE_STOP; return membershipControl(() => this.#of().grant(signed, body, origin, context), "unavailable"); }
  async grantExisting(signed: Parameters<HostedRegistry["grantExisting"]>[0], body: Uint8Array, origin: string, context: Parameters<HostedRegistry["grantExisting"]>[3]): Promise<ControlAnswer | RetiredStoreStop> { if (!this.#owns(signed?.request?.membership)) return RETIRED_STORE_STOP; return membershipControl(() => this.#of().grantExisting(signed, body, origin, context), "unavailable"); }
  async connections(signed: Parameters<HostedRegistry["connections"]>[0], body: Uint8Array, origin: string): Promise<ControlAnswer | RetiredStoreStop> { if (!this.#owns(signed?.request?.membership)) return RETIRED_STORE_STOP; return membershipControl(() => this.#of().connections(signed, body, origin), "unavailable"); }
  agents(membership: SequenceRef): ReturnType<HostedRegistry["agents"]> | RetiredStoreStop { if (!this.#owns(membership)) return RETIRED_STORE_STOP; return this.#of().agents(); }
  reservedAgent(op: string, membership: SequenceRef): string | null | RetiredStoreStop { if (!this.#owns(membership)) return RETIRED_STORE_STOP; return this.#of().reservedAgent(op); }
  async alarm(): Promise<void> { /* No registry alarm work, including on old names. */ }
}

/** One hosted agent: its key, bearer, sessions, custody and control identities. */
export class McpAgent<E extends McpEnv = McpEnv> extends DurableObject<E> {
  #agent: HostedAgent | null = null;
  #format: RoomFormatStart;
  constructor(ctx: DurableObjectState, env: E) {
    super(ctx, env);
    // Only the shared raw catalog/word reads precede this disposition.
    this.#format = classifyRoomFormat(ctx.storage.sql);
  }
  protected [hostedAgentStart](): RoomFormatStart["kind"] { return this.#format.kind; }
  #entry(error: "unavailable" | "temporarily_unavailable"): RetiredStoreStop | ControlAnswer | null {
    if (this.#format.kind === "retired") return RETIRED_STORE_STOP;
    return this.#format.kind === "unavailable" ? { status: 503, body: { error } } : null;
  }
  #admitted(): void {
    if (this.#format.kind === "retired" || this.#format.kind === "unavailable") throw new Error("Hosted agent store is unavailable.");
  }
  protected [agentScopes](): Binding { this.#admitted(); return indexedScopes(this.env.SCOPES, this.env); }
  protected [agentPorts](): Partial<AgentPorts> { this.#admitted(); return {}; }
  protected async [agentRetainClient](client: OAuthClient): Promise<number> { this.#admitted();
    const clients = this.env.REGISTRIES.get(this.env.REGISTRIES.idFromName(OAUTH_CLIENT_REGISTRY)) as unknown as Pick<McpRegistry, "retainClient">;
    const response = await clients.retainClient(client);
    if (isRetiredStoreStop(response)) throw new OAuthError("temporarily_unavailable", 503);
    if (response.status !== 200 || typeof response.body["expires"] !== "number") throw new OAuthError(typeof response.body["error"] === "string" ? response.body["error"] : "temporarily_unavailable", response.status === 200 ? 503 : response.status);
    return response.body["expires"];
  }
  #of(): HostedAgent {
    this.#admitted();
    if (this.#agent) return this.#agent;
    const scopes = this[agentScopes]();
    const build = () => new HostedAgent(sqlOf(this.ctx), {
      genericTools: hostedMcpTools(this.env) ?? [],
      cardOrigins: remoteCardOrigins(this.env.MCP_CARD_ORIGINS) ?? [],
      retainClient: client => this[agentRetainClient](client),
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
      id: this.ctx.id.toString(), now: () => Date.now(), random: (n) => crypto.getRandomValues(new Uint8Array(n)), observe: observeThrough(scopes),
      ...(this.env.METRICS ? { metrics: { deployment: readDeployment(this.env.DEPLOYMENT) ?? "unknown", version: this.env.VERSION_METADATA?.id ?? "unknown", report: (point: MetricPoint) => this.env.METRICS?.writeDataPoint(point) } } : {}),
      fetch: ((url: string, init?: RequestInit) => route(new Request(url, init), scopes, this.env)) as unknown as AgentPorts["fetch"],
      ...this[agentPorts](),
    });
    const candidate = this.#format.kind === "fresh" ? this.ctx.storage.transactionSync(() => {
      // Preserve ControlPlane.migrateBearerAnswers' own nested transaction.
      const created = build();
      writeRoomFormat2(sqlOf(this.ctx));
      return created;
    }) : build();
    // Both memory publications follow the successful outer commit.
    this.#agent = candidate;
    this.#format = { kind: "current" };
    return candidate;
  }
  async create(op: string, request: Parameters<HostedAgent["create"]>[1], link: Parameters<HostedAgent["create"]>[2]): Promise<ControlAnswer | RetiredStoreStop> { const stopped = this.#entry("unavailable"); if (stopped) return stopped; return membershipControl(() => this.#of().create(op, request, link), "unavailable"); }
  async grant(signed: Parameters<HostedAgent["grant"]>[0], body: Uint8Array, context: Parameters<HostedAgent["grant"]>[2]): Promise<ControlAnswer | RetiredStoreStop> { const stopped = this.#entry("unavailable"); if (stopped) return stopped; return membershipControl(() => this.#of().grant(signed, body, context), "unavailable"); }
  async agentState(): Promise<string | null | RetiredStoreStop> { if (this.#format.kind === "retired") return RETIRED_STORE_STOP; this.#admitted(); return this.#of().agentState(); }
  async connectionControl(signed: Parameters<HostedAgent["connectionControl"]>[0], action: "connections" | "revoke-grant", body: Uint8Array): Promise<ControlAnswer | RetiredStoreStop> { const stopped = this.#entry("unavailable"); if (stopped) return stopped; return membershipControl(() => this.#of().connectionControl(signed, action, body), "unavailable"); }
  async exchangeCode(...args: Parameters<HostedAgent["exchangeCode"]>): Promise<ControlAnswer | RetiredStoreStop> { const stopped = this.#entry("temporarily_unavailable"); if (stopped) return stopped; return membershipControl(() => this.#of().exchangeCode(...args), "temporarily_unavailable"); }
  async refreshGrant(...args: Parameters<HostedAgent["refreshGrant"]>): Promise<ControlAnswer | RetiredStoreStop> { const stopped = this.#entry("temporarily_unavailable"); if (stopped) return stopped; return membershipControl(() => this.#of().refreshGrant(...args), "temporarily_unavailable"); }
  async revokeToken(...args: Parameters<HostedAgent["revokeToken"]>): Promise<ControlAnswer | RetiredStoreStop> { const stopped = this.#entry("temporarily_unavailable"); if (stopped) return stopped; return membershipControl(() => this.#of().revokeToken(...args), "temporarily_unavailable"); }
  async control(signed: Parameters<HostedAgent["control"]>[0], action: "bearer" | "retire", body: Uint8Array): Promise<ControlAnswer | RetiredStoreStop> { const stopped = this.#entry("unavailable"); if (stopped) return stopped; return membershipControl(() => this.#of().control(signed, action, body), "unavailable"); }
  override async fetch(request: Request): Promise<Response> {
    if (this.#format.kind === "retired") return roomRetiredResponse();
    if (this.#format.kind === "unavailable") return json(503, { error: "unavailable" });
    try { return await this.#of().fetch(request); }
    catch (failed) { if (isRetiredStoreStop(failed)) return json(503, { error: "unavailable" }); throw failed; }
  }
  async alarm(): Promise<void> {
    if (this.#format.kind === "retired" || this.#format.kind === "unavailable") return;
    // The admitted adapter also has no alarm work.
  }
  /** Drop this instance's memory, as an eviction would: streams end with no event, storage stays. For a test's subclass. */
  protected [agentEvict](): void { this.#admitted(); this.#agent?.abrupt(); this.#agent = null; }
  /** The durable facts a witness compares across a reset. For a test's subclass. */
  protected [agentDurable](): ReturnType<HostedAgent["durable"]> { this.#admitted(); return this.#of().durable(); }
  protected [agentCustodyOf](key: string): ReturnType<HostedAgent["custodyOf"]> { this.#admitted(); return this.#of().custodyOf(key); }
  /** What this instance holds in memory now. For a test's subclass. */
  protected [agentHeld](): HostedAgent | null { this.#admitted(); return this.#agent; }
  /** The control budget's used bytes, for a test's subclass. */
  protected [agentControlUsed](): number { this.#admitted(); return this.#of().controlUsed(); }
  /** The persisted answer bodies, for a test's subclass: whether each control row and the agent row still hold one. */
  protected [agentAnswers](): { control: { op: string; answer: boolean }[]; agent: boolean } {
    this.#admitted();
    const rows = this.ctx.storage.sql.exec(`SELECT op, answer IS NOT NULL AS held FROM control ORDER BY created`).toArray();
    const agent = this.ctx.storage.sql.exec(`SELECT answer IS NOT NULL AS held FROM agent WHERE id = 1`).toArray()[0];
    return { control: rows.map((r) => ({ op: String(r["op"]), answer: Number(r["held"]) === 1 })), agent: agent ? Number(agent["held"]) === 1 : false };
  }
}
