import { addressKey, isMemberId, isRecord, same } from "@generalbusiness/dap-bytes";
import { invitationRedemptionFields } from "@generalbusiness/dap-client";
import { isRetiredStoreStop, type RetiredStoreStop } from "./hosted-store-stop.ts";
/**
 * The hosted MCP endpoint (notes/2026-10-13-hosted-mcp-endpoint.md): the
 * registry of one repository's agents and the object of one agent, each over
 * a Durable Object's SQLite storage, with the runtime's classes supplied by
 * the scope Worker (`packages/scope/src/worker.ts`), which binds the ports:
 * its own routes as the agent's in-process reader, the membership object's
 * observation read as the authority check, and the namespaces.
 *
 * - A **control request** (section 3.2) is a signed statement under
 *   `artroom-mcp-control-1` by a member key: `create`, `bearer` or `retire`.
 *   Its signature, its binding to this service, the membership and its
 *   incarnation, the action, the agent and the body, and the current
 *   authority of its signer (an admin holding `membership.manage`, or the
 *   recorded controller of the agent) are checked before anything is
 *   reserved. Then the request is recorded under its `op`, and a repeat with
 *   the same fingerprint resumes or answers the same; another request under
 *   the same `op` is refused.
 * - **Enrolment** (section 3.3) is the membership's own: an admin's
 *   `add-member` and `invite-key`, then the controller's `create` with the
 *   agent-key invitation; the agent object makes its key, keeps the signed
 *   `enrol` under custody before sending it, reads the admitted entry back
 *   and confirms the key is active, and only then mints the bearer.
 * - The **bearer** `<agent>.<secret>` is held as a digest and compared in
 *   constant time; failures are counted per connecting address.
 * - **Budgets** (section 3.6): custody has the store's own; the control plane
 *   of each object has 16 MiB, of which the last 1 MiB admits `retire` alone.
 */

import type { ControlAction, ControlRequest, Digest, KeyId, MemberId, ScopeRef, Seed, SignedControl, SignedIntent } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, isKeyId, isSequenceRef, keyIdOfSecret, parseStrict, scopeIdOf, sign, timeMs, timeOf, unb64url, utf8, verifyControl } from "@generalbusiness/dap-bytes";
import { TransportError, agentKeyInvitationOf, httpTransport, secretSigner, signedIntent, type AgentKeyInvitation, type Fetch } from "@generalbusiness/dap-client";
import { CustodyError, Lost, identityId, meaningOf, type Envelope, type Identity } from "./custody.ts";
import { enrolledKeyItem, retirementBody } from "./hosted-retirement.ts";
import { HttpGeneration, McpHttp, SESSIONS_MOST, SessionFull, type SessionRow } from "./http.ts";
import type { McpConfig, Root } from "./inventory.ts";
import { McpService, type ServerPort } from "./service.ts";
import { McpMetrics, mcpRead, type McpMetricOptions } from "./metrics.ts";
import { sqliteStore, type Sql, type SqliteCustodyBounds } from "./sqlite-custody.ts";
import { Wire } from "./wire.ts";
import { remoteCardDomain, type RemoteCardOrigin } from "./views/remote-origins.ts";
import { mcpChallengeResponse, mcpUnauthorized, publicRequestUrl } from "./oauth-resource.ts";
import { OAuthAccess, equalTokenDigest, type OAuthAccessCandidate } from "./oauth-access.ts";
import { OAuthHttpLayers, type OAuthHttpLayer } from "./oauth-http.ts";
import { OAuthIssuer, type OAuthResult } from "./oauth-issuer.ts";
import { isRegisteredOAuthClient, oauthGrant, OAuthError, type OAuthClient, type OAuthGrantContext } from "./oauth-parameters.ts";

export const CONTROL_BUDGET = 16 * 1024 * 1024;
export const RETIRE_RESERVE = 1024 * 1024;
/** What one control operation reserves before anything else: room for its row, its answer and its tombstone, as stored. */
export const CONTROL_ROW_BYTES = 4 * 1024;
/** The fixed overhead charged for each persisted row beside its bytes. */
export const ROW_OVERHEAD = 128;
/** How long a stored answer is kept past the original request's `notAfter`. */
export const ANSWER_RETENTION_MS = 7 * 86_400_000;
export const BEARER_LIFETIME_MS = 30 * 86_400_000;
export const CONTROL_BODY_BYTES = 64 * 1024;
export const BEARER_FAILURES_PER_MINUTE = 10;
export const BEARER_FAILURE_KEYS = 4096;
export const BEARER_ADDRESS_BYTES = 64;
export const OP_BYTES = 128;

/** A bounded, sliding-minute failure window. Capacity never evicts an active
 * key or prevents a valid bearer on a new address from being checked. */
export class BearerFailures {
  readonly #keys = new Map<string, number[]>();
  get size(): number { return this.#keys.size; }

  check(address: string | null, now: number, authenticate: () => boolean): "ok" | "unauthorized" | "limited" {
    const raw = address ?? "";
    // Cloudflare's IPv4/IPv6 address fits this bound. Reject, never truncate
    // or hash, an oversized representation into another caller's window.
    if (raw.length > BEARER_ADDRESS_BYTES || utf8(raw).length > BEARER_ADDRESS_BYTES) return "limited";
    const key = addressKey(address) ?? "";
    const recent = (this.#keys.get(key) ?? []).filter(at => now - at < 60_000);
    if (recent.length > 0) this.#keys.set(key, recent);
    else this.#keys.delete(key);
    if (recent.length >= BEARER_FAILURES_PER_MINUTE) return "limited";
    if (authenticate()) return "ok";
    if (recent.length === 0 && this.#keys.size >= BEARER_FAILURE_KEYS) {
      for (const [other, failures] of this.#keys) {
        if (failures.every(at => now - at >= 60_000)) this.#keys.delete(other);
      }
      if (this.#keys.size >= BEARER_FAILURE_KEYS) return "limited";
    }
    recent.push(now);
    this.#keys.set(key, recent);
    return "unauthorized";
  }
}

/** What a control route answers: the status, and a body that names a rule or a result, never a secret except the bearer shown once. */
export interface ControlAnswer { status: number; body: Record<string, unknown> }
const answer = (status: number, body: Record<string, unknown>): ControlAnswer => ({ status, body });
/** Only the winning call may return a bearer. SQL always receives this receipt. */
const retainedAnswer = (result: ControlAnswer): ControlAnswer => {
  if (!Object.hasOwn(result.body, "bearer") && !Object.hasOwn(result.body, "code")) return result;
  const body = { ...result.body };
  if (Object.hasOwn(body, "bearer")) {
    delete body["bearer"]; body["bearerShown"] = true;
    body["bearerExpires"] = typeof body["bearerExpires"] === "string" ? body["bearerExpires"] : null;
  }
  if (Object.hasOwn(body, "code")) { delete body["code"]; body["codeShown"] = true; }
  return answer(result.status, body);
};
const closed = (v: unknown, keys: readonly string[]): v is Record<string, unknown> => isRecord(v) && Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));

/** The `Authorization: Control <b64url canonical JSON>.<sig>` header, parsed and shape-checked; null when malformed. Verifies nothing. */
export function controlOf(authorization: string | null): SignedControl | null {
  try {
    if (!authorization?.startsWith("Control ") || authorization.length > 8 * 1024) return null;
    const [encoded, sig, ...rest] = authorization.slice("Control ".length).split(".");
    if (!encoded || !sig || rest.length > 0) return null;
    const bytes = unb64url(encoded);
    if (!bytes) return null;
    const request = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
    if (!closed(request, ["v", "action", "service", "membership", "agent", "actor", "body", "op", "notAfter"]) || request["v"] !== 1) return null;
    if (!["create", "bearer", "retire", "grant", "connections", "revoke-grant"].includes(request["action"] as string) || typeof request["service"] !== "string") return null;
    // This fixed protocol place names Membership; a reference supplies no kind proof.
    if (!isSequenceRef(request["membership"])) return null;
    if (request["agent"] !== null && (typeof request["agent"] !== "string" || !/^[0-9a-f]{64}$/.test(request["agent"]))) return null;
    if (!isKeyId(request["actor"]) || typeof request["body"] !== "string" || !/^sha256:[0-9a-f]{64}$/.test(request["body"])) return null;
    if (typeof request["op"] !== "string" || utf8(request["op"]).length < 1 || utf8(request["op"]).length > OP_BYTES || typeof request["notAfter"] !== "string" || timeMs(request["notAfter"]) === null) return null;
    return { request: request as unknown as ControlRequest, sig };
  } catch { return null; }
}

/** A control request's identity: everything but its signature and its deadline. */
export const fingerprintOf = (r: ControlRequest): string => digestBytes(utf8(canonicalize([r.actor, r.membership, r.action, r.agent, r.body, r.op])));

/** The membership's observation of a key or a member, as the hosted objects read it. Null: no answer (another incarnation, or no membership). */
export interface KeyStanding { keyState: string; memberState: string; member: MemberId; actions: readonly string[]; controller: MemberId | null }
export interface MemberStanding { memberState: string; controller: MemberId | null; activeKey: boolean | null }
export interface Authority { observe(membership: ScopeRef, ask: { key: KeyId } | { member: MemberId }): Promise<unknown> }

export type Authorized = { ok: true; by: "admin" | "controller"; member: MemberId } | { ok: false };

/**
 * Current authority, read from the membership now: the signer is an active key of an active member, and that member either
 * holds `membership.manage` or is the recorded controller of the agent member named.
 */
export async function authorityOf(ports: Authority, membership: ScopeRef, actor: KeyId, agentHandle: MemberId | null): Promise<Authorized> {
  mcpRead();
  const key = (await ports.observe(membership, { key: actor })) as KeyStanding | null;
  if (!key || key.keyState !== "active" || key.memberState !== "active") return { ok: false };
  if (key.actions.includes("membership.manage")) return { ok: true, by: "admin", member: key.member };
  if (agentHandle !== null) {
    mcpRead();
    const agent = (await ports.observe(membership, { member: agentHandle })) as MemberStanding | null;
    if (agent && agent.memberState !== "unknown" && agent.controller === key.member) return { ok: true, by: "controller", member: key.member };
  }
  return { ok: false };
}

/** The checks every control request passes before any effect: the signature, its binding to this service and route, and its time. */
export function bound(signed: SignedControl, service: string, action: ControlAction, agent: string | null, body: Uint8Array, now: number): ControlAnswer | null {
  const r = signed.request;
  if (!verifyControl(signed)) return answer(403, { error: "control", rule: "signature" });
  if (r.service !== service) return answer(403, { error: "control", rule: "service" });
  if (r.action !== action || r.agent !== agent) return answer(400, { error: "control", rule: "binding" });
  if (r.body !== digestBytes(body)) return answer(400, { error: "control", rule: "body" });
  const until = timeMs(r.notAfter)!;
  if (until <= now || until > now + PROPOSED_BOUNDS.intentLifetimeSeconds * 1000) return answer(400, { error: "control", rule: "notAfter" });
  return null;
}

/** The control table and budget of one object: reservations keyed by `op`, answers, tombstones. */
class ControlPlane {
  constructor(private readonly sql: Sql, private readonly budget: number = CONTROL_BUDGET, private readonly retireReserve: number = RETIRE_RESERVE) {
    sql.exec(`CREATE TABLE IF NOT EXISTS control (op TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, action TEXT NOT NULL, agent TEXT, state TEXT NOT NULL, answer TEXT, not_after TEXT NOT NULL, created TEXT NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS control_budget (k TEXT PRIMARY KEY, v INTEGER NOT NULL)`);
    sql.exec(`INSERT OR IGNORE INTO control_budget (k, v) VALUES ('used', 0)`);
  }
  used(): number { return Number(this.sql.exec(`SELECT v FROM control_budget WHERE k = 'used'`).toArray()[0]!["v"]); }
  /** One atomic cutover per object. Page at most one old answer into JS;
   * the existing control budget bounds the complete scan. */
  migrateBearerAnswers(agent: boolean): void {
    this.sql.transaction(() => {
      if (this.sql.exec(`SELECT v FROM control_budget WHERE k = 'bearer-schema'`).toArray()[0]?.["v"] === 1) return;
      if (agent && !this.sql.exec(`PRAGMA table_info(agent)`).toArray().some(row => row["name"] === "bearer_expires")) this.sql.exec(`ALTER TABLE agent ADD COLUMN bearer_expires TEXT`);
      const total = this.sql.exec(`SELECT coalesce(sum(octet_length(answer)), 0) AS bytes FROM control`).toArray()[0]!["bytes"];
      if (typeof total !== "number" || total < 0 || total > CONTROL_BUDGET) throw new Error("Hosted control migration exceeds its storage bound.");
      let after: string | null = null;
      for (;;) {
        const scalar: Record<string, unknown> | undefined = after === null
          ? this.sql.exec(`SELECT op, octet_length(answer) AS bytes FROM control WHERE answer IS NOT NULL ORDER BY op LIMIT 1`).toArray()[0]
          : this.sql.exec(`SELECT op, octet_length(answer) AS bytes FROM control WHERE answer IS NOT NULL AND op > ? ORDER BY op LIMIT 1`, after).toArray()[0];
        if (!scalar) break;
        const op: string = String(scalar["op"]);
        if (utf8(op).length > OP_BYTES || typeof scalar["bytes"] !== "number" || scalar["bytes"] > CONTROL_BUDGET) throw new Error("Invalid hosted control migration row.");
        const text = String(this.sql.exec(`SELECT answer FROM control WHERE op = ?`, op).toArray()[0]!["answer"]);
        const next = this.#migratedAnswer(text);
        if (next !== text) {
          if (!this.charge(utf8(next).length - utf8(text).length, "retire")) throw new Error("SQLITE_FULL: hosted control migration.");
          this.sql.exec(`UPDATE control SET answer = ? WHERE op = ?`, next, op);
        }
        after = op;
      }
      if (agent) {
        const scalar = this.sql.exec(`SELECT octet_length(answer) AS bytes FROM agent WHERE id = 1 AND answer IS NOT NULL`).toArray()[0];
        if (scalar) {
          if (typeof scalar["bytes"] !== "number" || scalar["bytes"] > CONTROL_BUDGET) throw new Error("Invalid hosted agent migration row.");
          const text = String(this.sql.exec(`SELECT answer FROM agent WHERE id = 1`).toArray()[0]!["answer"]);
          // The duplicate is not separately credited by retention either.
          this.sql.exec(`UPDATE agent SET answer = ? WHERE id = 1`, this.#migratedAnswer(text));
        }
      }
      this.sql.exec(`INSERT INTO control_budget (k, v) VALUES ('bearer-schema', 1)`);
    });
  }
  #migratedAnswer(text: string): string {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value) || !Number.isInteger(value["status"]) || !isRecord(value["body"])) throw new Error("Invalid hosted control answer.");
    const result = value as unknown as ControlAnswer;
    return Object.hasOwn(result.body, "bearer") ? JSON.stringify(retainedAnswer(result)) : text;
  }
  /**
   * Charge `bytes` of persisted control state against the budget, inside the caller's transaction. False: the budget admits
   * none; `retire` alone may draw on the last 1 MiB. A negative charge credits what a removed row held. Every persisted row of
   * the control plane is charged by its stored bytes: control rows, session rows, the agent row's configuration.
   */
  charge(bytes: number, action: ControlAction | "session" | "config"): boolean {
    const used = this.used();
    const ceiling = action === "retire" ? this.budget : this.budget - this.retireReserve;
    if (bytes > 0 && used + bytes > ceiling) return false;
    this.sql.exec(`UPDATE control_budget SET v = ? WHERE k = 'used'`, Math.max(0, used + bytes));
    return true;
  }
  /** Reserve one operation's space before anything else: room for its row, its answer and its tombstone. */
  reserve(action: ControlAction): boolean { return this.charge(CONTROL_ROW_BYTES, action); }
  /** The bytes a control row holds as stored. */
  static rowBytes(op: string, fingerprint: string, answer: ControlAnswer | null): number { return utf8(op).length + utf8(fingerprint).length + (answer ? utf8(JSON.stringify(answer)).length : 0) + ROW_OVERHEAD; }
  row(op: string): { fingerprint: string; action: string; agent: string | null; state: string; answer: ControlAnswer | null; notAfter: string } | null {
    const r = this.sql.exec(`SELECT fingerprint, action, agent, state, answer, not_after FROM control WHERE op = ?`, op).toArray()[0];
    if (!r) return null;
    return { fingerprint: String(r["fingerprint"]), action: String(r["action"]), agent: r["agent"] === null ? null : String(r["agent"]), state: String(r["state"]), answer: r["answer"] === null ? null : JSON.parse(String(r["answer"])) as ControlAnswer, notAfter: String(r["not_after"]) };
  }
  /** Insert a row, settling its reservation against its stored bytes: the reservation covers the row and its answer to come. */
  insert(op: string, fingerprint: string, action: ControlAction, agent: string | null, state: string, notAfter: string, created: string): void {
    this.sql.exec(`INSERT INTO control (op, fingerprint, action, agent, state, answer, not_after, created) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`, op, fingerprint, action, agent, state, notAfter, created);
  }
  /** Write the answer; bytes beyond the reservation are charged, and a refusal here is a storage failure the caller reports. */
  complete(op: string, state: string, result: ControlAnswer): void {
    result = retainedAnswer(result);
    const row = this.row(op)!;
    const beyond = ControlPlane.rowBytes(op, row.fingerprint, result) - CONTROL_ROW_BYTES;
    if (beyond > 0 && !this.charge(beyond, row.action as ControlAction)) throw new Error("SQLITE_FULL: the control budget is exhausted");
    this.sql.exec(`UPDATE control SET state = ?, answer = ? WHERE op = ?`, state, JSON.stringify(result), op);
  }
  /** Retention: an answer is kept seven days past the original request's deadline; the tombstone stays. */
  retained(row: { answer: ControlAnswer | null; notAfter: string }, now: number): ControlAnswer | null {
    if (!row.answer) return null;
    return now > timeMs(row.notAfter)! + ANSWER_RETENTION_MS ? answer(409, { error: "op", rule: "stale" }) : row.answer;
  }
  /**
   * Remove every answer body past its retention, keeping the row (its fingerprint, deadline and state are the tombstone). The
   * caller removes any other copy it keeps. Run inside the caller's transaction, before an answer is looked up.
   */
  expire(now: number): string[] {
    const due = this.sql.exec(`SELECT op, not_after, answer FROM control WHERE answer IS NOT NULL`).toArray()
      .filter((r) => now > timeMs(String(r["not_after"]))! + ANSWER_RETENTION_MS);
    for (const r of due) {
      this.sql.exec(`UPDATE control SET answer = NULL WHERE op = ?`, String(r["op"]));
      this.charge(-utf8(String(r["answer"])).length, "retire");   // the body's bytes are credited; the tombstone keeps its row
    }
    return due.map((r) => String(r["op"]));
  }
}

// ---------------------------------------------------------------- the registry

/** The points of a creation where a witness may fail the object, as the design's H1 names them (section 6). */
export type CreationFence = "reservation" | "seed" | "kept" | "accepted" | "complete";

export interface RegistryPorts extends Authority {
  now(): number;
  /** A test's control budget and retirement reserve in place of 16 MiB and 1 MiB. */
  controlBudget?: { budget: number; reserve: number };
  /** A test's fault: called at the named fence; throwing there is the reset. */
  fault?: (fence: CreationFence) => void;
  /** A fresh, unique agent object ID. */
  mintId(): string;
  /** The agent object by its ID: its `create`. */
  agent(id: string): { create(op: string, request: ControlRequest, link: AgentKeyInvitation): Promise<ControlAnswer | RetiredStoreStop>; grant?(signed: SignedControl, body: Uint8Array, context: OAuthGrantContext): Promise<ControlAnswer | RetiredStoreStop>; agentState?(): Promise<string | null | RetiredStoreStop> };
}

/** One repository's registry: the only place that creates an agent object. Named by the membership scope ID. */
export class HostedRegistry {
  readonly #control: ControlPlane;
  constructor(private readonly sql: Sql, private readonly ports: RegistryPorts) {
    sql.exec(`CREATE TABLE IF NOT EXISTS agents (agent TEXT PRIMARY KEY, handle TEXT NOT NULL, key TEXT, state TEXT NOT NULL, created TEXT NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_agent (controller TEXT NOT NULL, client_id TEXT NOT NULL, agent TEXT NOT NULL UNIQUE, handle TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY (controller, client_id))`);
    this.#control = new ControlPlane(sql, ports.controlBudget?.budget, ports.controlBudget?.reserve);
    this.#control.migrateBearerAnswers(false);
  }

  /** The agent object ID a reservation under `op` allotted, for a test's eyes; null when there is none. */
  reservedAgent(op: string): string | null { return this.#control.row(op)?.agent ?? null; }

  /** The agents of this repository, for a test's eyes: no route lists them in this head. */
  agents(): { agent: string; handle: string; key: string | null; state: string }[] {
    return this.sql.exec(`SELECT agent, handle, key, state FROM agents ORDER BY created`).toArray().map((r) => ({ agent: String(r["agent"]), handle: String(r["handle"]), key: r["key"] === null ? null : String(r["key"]), state: String(r["state"]) }));
  }

  /** `service`: the origin the request arrived at, which the control request and the invitation must both name. */
  async create(signed: SignedControl, body: Uint8Array, service: string): Promise<ControlAnswer> {
    return this.#creation(signed, body, service);
  }
  async grant(signed: SignedControl, body: Uint8Array, service: string, context: OAuthGrantContext): Promise<ControlAnswer> {
    return this.#creation(signed, body, service, context);
  }
  async grantExisting(signed: SignedControl, body: Uint8Array, service: string, context: OAuthGrantContext): Promise<ControlAnswer> {
    const request = signed.request;
    if (request.agent === null) return answer(400, { error: "control", rule: "binding" });
    const refused = bound(signed, service, "grant", request.agent, body, this.ports.now()); if (refused) return refused;
    try { oauthGrant(parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body)), context, false); }
    catch (error) { return answer(error instanceof OAuthError ? error.status : 400, { error: error instanceof OAuthError ? error.error : "invalid_request" }); }
    const native = this.sql.exec(`SELECT handle FROM agents WHERE agent = ?`, request.agent).toArray()[0];
    if (!native) return answer(404, { error: "agent" });
    const handle = String(native["handle"]) as MemberId;
    const authority = await authorityOf(this.ports, request.membership, request.actor, handle);
    if (!authority.ok) return answer(403, { error: "unauthorized" });
    const standing = await this.ports.observe(request.membership, { member: handle }) as MemberStanding | null;
    if (!standing || standing.controller === null) return answer(403, { error: "unauthorized" });
    const expired = bound(signed, service, "grant", request.agent, body, this.ports.now()); if (expired) return expired;
    const fingerprint = fingerprintOf(request), created = timeOf(this.ports.now());
    const held = this.sql.transaction((): ControlAnswer | null => {
      this.#control.expire(this.ports.now());
      const prior = this.#control.row(request.op);
      if (prior) {
        if (prior.fingerprint !== fingerprint) return answer(409, { error: "op", rule: "fingerprint" });
        return prior.state === "reserved" ? null : this.#control.retained(prior, this.ports.now()) ?? answer(409, { error: "op", rule: "stale" });
      }
      const mapping = this.sql.exec(`SELECT agent, handle FROM oauth_agent WHERE controller = ? AND client_id = ?`, standing.controller, context.client.client_id).toArray()[0];
      if (mapping && mapping["agent"] !== request.agent) return answer(409, { error: "existing-agent", agent: mapping["agent"], handle: mapping["handle"] });
      const bytes = mapping ? 0 : this.#mappingBytes({ controller: standing.controller, client_id: context.client.client_id, agent: request.agent, handle, created });
      if (!this.#control.charge(CONTROL_ROW_BYTES + bytes, "grant")) return answer(507, { error: "full", rule: "control-budget" });
      this.#control.insert(request.op, fingerprint, "grant", request.agent, "reserved", request.notAfter, created);
      if (!mapping) this.sql.exec(`INSERT INTO oauth_agent (controller, client_id, agent, handle, created) VALUES (?, ?, ?, ?, ?)`, standing.controller, context.client.client_id, request.agent, handle, created);
      return null;
    });
    if (held) return held;
    const result = await this.ports.agent(request.agent).grant?.(signed, body, context) ?? answer(503, { error: "unavailable" });
    if (isRetiredStoreStop(result)) return answer(503, { error: "unavailable" });
    if (result.status !== 503) this.sql.transaction(() => { if (this.#control.row(request.op)?.state === "reserved") this.#control.complete(request.op, result.status < 300 ? "complete" : "refused", result); });
    return result;
  }
  #mappingBytes(row: Record<string, unknown>): number { return ["controller", "client_id", "agent", "handle", "created"].reduce((n, key) => n + utf8(String(row[key])).length, ROW_OVERHEAD); }
  async connections(signed: SignedControl, body: Uint8Array, service: string): Promise<ControlAnswer> {
    const refused = bound(signed, service, "connections", null, body, this.ports.now()); if (refused) return refused;
    let after: string, controller: MemberId | undefined;
    try { const row = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body)); if (!(closed(row, ["after"]) || closed(row, ["after", "controller"])) || row["after"] !== null && (typeof row["after"] !== "string" || !/^[0-9a-f]{64}$/.test(row["after"])) || Object.hasOwn(row, "controller") && !isMemberId(row["controller"])) return answer(400, { error: "invalid_request" }); after = row["after"] as string ?? ""; controller = row["controller"] as MemberId | undefined; }
    catch { return answer(400, { error: "invalid_request" }); }
    const request = signed.request, key = await this.ports.observe(request.membership, { key: request.actor }) as KeyStanding | null;
    if (!key || key.keyState !== "active" || key.memberState !== "active") return answer(403, { error: "unauthorized" });
    if (controller !== undefined && controller !== key.member && !key.actions.includes("membership.manage")) return answer(403, { error: "unauthorized" });
    const expired = bound(signed, service, "connections", null, body, this.ports.now()); if (expired) return expired;
    return this.sql.transaction(() => {
      const fingerprint = fingerprintOf(request), existing = this.#control.row(request.op);
      if (existing) return existing.fingerprint !== fingerprint ? answer(409, { error: "op", rule: "fingerprint" }) : this.#control.retained(existing, this.ports.now()) ?? answer(409, { error: "op", rule: "stale" });
      if (!this.#control.reserve("connections")) return answer(507, { error: "full", rule: "control-budget" });
      const rows = this.sql.exec(`SELECT agent, handle, client_id, created FROM oauth_agent WHERE controller = ? AND agent > ? ORDER BY agent LIMIT 9`, controller ?? key.member, after).toArray();
      const result = answer(200, { agents: rows.slice(0, 8), next: rows.length > 8 ? rows[7]!["agent"] : null });
      this.#control.insert(request.op, fingerprint, "connections", null, "complete", request.notAfter, timeOf(this.ports.now())); this.#control.complete(request.op, "complete", result); return result;
    });
  }
  async #creation(signed: SignedControl, body: Uint8Array, service: string, context?: OAuthGrantContext): Promise<ControlAnswer> {
    const now = this.ports.now();
    const action = context ? "grant" : "create";
    const refused = bound(signed, service, action, null, body, now);
    if (refused) return refused;
    const r = signed.request;
    let link: AgentKeyInvitation | null = null;
    try {
      const given = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body));
      link = context ? agentKeyInvitationOf(oauthGrant(given, context, true).link!) : closed(given, ["link"]) && typeof given["link"] === "string" ? agentKeyInvitationOf(given["link"]) : null;
    } catch (error) { if (error instanceof OAuthError) return answer(error.status, { error: error.error }); link = null; }
    if (!link) return answer(400, { error: "link", rule: "agent-key-invitation" });
    if (link.service !== service) return answer(400, { error: "link", rule: "service" });
    if (!same(link.repository.membership, r.membership)) return answer(400, { error: "link", rule: "membership" });
    // Authority now, before anything is reserved: the controller the invitation names, or an admin.
    const authority = await authorityOf(this.ports, r.membership, r.actor, link.handle as MemberId);
    if (!authority.ok || (authority.by === "controller" && authority.member !== link.controller.member)) return answer(403, { error: "unauthorized" });
    if (context && !this.#control.row(r.op)) {
      const mapping = this.sql.exec(`SELECT * FROM oauth_agent WHERE controller = ? AND client_id = ?`, link.controller.member, context.client.client_id).toArray()[0];
      if (mapping) {
        let state: string | null | RetiredStoreStop | undefined;
        try { state = await this.ports.agent(String(mapping["agent"])).agentState?.(); }
        catch { return answer(503, { error: "unavailable" }); }
        // Whole-store retirement cannot authorize deletion or replacement.
        if (isRetiredStoreStop(state)) return answer(503, { error: "unavailable" });
        if (state === "retired") this.sql.transaction(() => {
          const current = this.sql.exec(`SELECT * FROM oauth_agent WHERE controller = ? AND client_id = ?`, link!.controller.member, context.client.client_id).toArray()[0];
          if (current && current["agent"] === mapping["agent"]) { this.sql.exec(`DELETE FROM oauth_agent WHERE controller = ? AND client_id = ?`, link!.controller.member, context.client.client_id); this.#control.charge(-this.#mappingBytes(current), "retire"); }
        });
      }
    }
    const fingerprint = fingerprintOf(r);
    if (context) { const expired = bound(signed, service, action, null, body, this.ports.now()); if (expired) return expired; }
    // The reservation, in one transaction, before the handoff to the agent object; expired answer bodies go first.
    const reserved = this.sql.transaction((): ControlAnswer | { agent: string } => {
      this.#control.expire(now);
      const row = this.#control.row(r.op);
      if (row) {
        if (row.fingerprint !== fingerprint) return answer(409, { error: "op", rule: "fingerprint" });
        if (row.state !== "reserved") return this.#control.retained(row, now) ?? answer(409, { error: "op", rule: "stale" });
        return { agent: row.agent! };
      }
      const created = timeOf(now);
      if (context) {
        const mapping = this.sql.exec(`SELECT agent, handle FROM oauth_agent WHERE controller = ? AND client_id = ?`, link!.controller.member, context.client.client_id).toArray()[0];
        if (mapping) return answer(409, { error: "existing-agent", agent: mapping["agent"], handle: mapping["handle"] });
        const bytes = this.#mappingBytes({ controller: link!.controller.member, client_id: context.client.client_id, agent: "a".repeat(64), handle: link!.handle, created });
        if (!this.#control.charge(CONTROL_ROW_BYTES + bytes, action)) return answer(507, { error: "full", rule: "control-budget" });
      } else if (!this.#control.reserve(action)) return answer(507, { error: "full", rule: "control-budget" });
      const agent = this.ports.mintId();
      this.#control.insert(r.op, fingerprint, action, agent, "reserved", r.notAfter, timeOf(now));
      if (context) this.sql.exec(`INSERT INTO oauth_agent (controller, client_id, agent, handle, created) VALUES (?, ?, ?, ?, ?)`, link!.controller.member, context.client.client_id, agent, link!.handle, created);
      return { agent };
    });
    if ("status" in reserved) return reserved;
    this.ports.fault?.("reservation");
    const target = this.ports.agent(reserved.agent);
    const given = context ? await target.grant?.(signed, body, context) ?? answer(503, { error: "unavailable" }) : await target.create(r.op, r, link);
    if (isRetiredStoreStop(given)) return answer(503, { error: "unavailable" });
    let state: string | null | RetiredStoreStop | undefined;
    if (context) {
      try { state = await target.agentState?.(); }
      catch { return answer(503, { error: "unavailable" }); }
      if (isRetiredStoreStop(state)) return answer(503, { error: "unavailable" });
    }
    const enrolled = context && state === "enrolled";
    const result = enrolled ? answer(given.status, { ...given.body, agent: reserved.agent, handle: link.handle }) : given;
    this.ports.fault?.("complete");
    // Unresolved: the reservation stays, and the next request with the same op resumes it.
    if (result.status === 503) return result;
    this.sql.transaction(() => {
      // Agent serialization selects the sole bearer disclosure; concurrent
      // registry handoffs settle this reservation only once.
      if (this.#control.row(r.op)?.state !== "reserved") return;
      this.#control.complete(r.op, result.status < 300 ? "complete" : "refused", result);
      const existing = this.sql.exec(`SELECT agent FROM agents WHERE agent = ?`, reserved.agent).toArray()[0];
      if (!existing) this.sql.exec(`INSERT INTO agents (agent, handle, key, state, created) VALUES (?, ?, ?, ?, ?)`, reserved.agent, link.handle, typeof result.body["key"] === "string" ? result.body["key"] : null, enrolled || result.status < 300 ? "enrolled" : "refused", timeOf(now));
      if (context && result.status >= 300 && !enrolled) {
        const mapping = this.sql.exec(`SELECT * FROM oauth_agent WHERE agent = ?`, reserved.agent).toArray()[0];
        if (mapping) { this.sql.exec(`DELETE FROM oauth_agent WHERE agent = ?`, reserved.agent); this.#control.charge(-this.#mappingBytes(mapping), "retire"); }
      }
    });
    return result;
  }
}

// ---------------------------------------------------------------- the agent

export interface AgentPorts extends Authority {
  /** Hosted deployment policy, separate from the durable agent configuration. */
  genericTools?: readonly string[];
  applicationTrust?: string | undefined;
  cardOrigins?: readonly RemoteCardOrigin[];
  /** Exact public connector URL admitted by the current deployment policy. */
  oauthResource?: (request: Request) => string | null;
  /** Immutable package bytes from the Worker's trusted content store. */
  applicationContent?: (release: Digest) => Promise<Uint8Array | null>;
  /** Separate MCP observation map; never a native input or an authority read. */
  metrics?: McpMetricOptions;
  /** This object's own ID, as the registry allotted it. */
  id: string;
  /** The Worker's own routes, on its own origin. */
  fetch: Fetch;
  now(): number;
  random(bytes: number): Uint8Array;
  /** Internal registry retention after verified Native authority. The returned
   * deadline caps this grant; anonymous resolution cannot call this port. */
  retainClient?: (client: OAuthClient) => Promise<number>;
  /** A deterministic short expiry timer in tests; production uses setTimeout. */
  scheduleExpiry?: (delayMs: number, run: () => Promise<void>) => () => void;
  every?: (ms: number, run: () => void) => () => void;
  pause?: (waiting: readonly string[]) => Promise<void>;
  /** A test's control budget and retirement reserve in place of 16 MiB and 1 MiB. */
  controlBudget?: { budget: number; reserve: number };
  /** A test's custody bounds in place of the store's own. */
  custodyBounds?: SqliteCustodyBounds;
  /** A test's fault: called at the named fence; throwing there is the reset. */
  fault?: (fence: CreationFence) => void;
  /** A test's fault on a session-row write: throwing there is the storage failure. */
  sessionFault?: () => void;
  /** A test's hold on the configuration read, and with it on every listing and snapshot, while another request runs. */
  configHold?: () => Promise<void> | void;
}

interface AgentRow { op: string; seed: Uint8Array; key: KeyId; state: "enrolling" | "enrolled" | "retired" | "refused"; membership: ScopeRef; handle: string; config: McpConfig; bearer: string | null; bearerExpires: string | null; answer: ControlAnswer | null }

/** One agent: its key, bearer, configuration, sessions, custody and control identities, all in this object. */
class Queue {
  #last: Promise<unknown> = Promise.resolve();
  run<T>(section: () => Promise<T>): Promise<T> {
    const result = this.#last.then(section);
    this.#last = result.catch(() => undefined);
    return result;
  }
}

export class HostedAgent {
  readonly #control: ControlPlane;
  readonly #metrics: McpMetrics;
  #service: McpService | null = null;
  #transport: HttpGeneration | null = null;
  #httpEpoch = 0;
  #oauthEpoch = 0;
  readonly #oauth: OAuthAccess;
  readonly #oauthHttp: OAuthHttpLayers;
  readonly #issuer: OAuthIssuer;
  readonly #failures = new BearerFailures();
  /** Control operations run one at a time in this object: a retry of `create` waits for the first and then finds its answer. */
  readonly #controls = new Queue();
  constructor(private readonly sql: Sql, private readonly ports: AgentPorts) {
    this.#metrics = new McpMetrics(ports.metrics);
    sql.exec(`CREATE TABLE IF NOT EXISTS agent (id INTEGER PRIMARY KEY CHECK (id = 1), op TEXT NOT NULL, seed BLOB NOT NULL, key TEXT NOT NULL, state TEXT NOT NULL, membership TEXT NOT NULL, handle TEXT NOT NULL, config TEXT NOT NULL, bearer TEXT, answer TEXT, created TEXT NOT NULL, updated TEXT NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS session (id TEXT PRIMARY KEY, row TEXT NOT NULL, created INTEGER NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_session (id TEXT PRIMARY KEY, grant_id TEXT NOT NULL, row TEXT NOT NULL, created INTEGER NOT NULL)`);
    this.#control = new ControlPlane(sql, ports.controlBudget?.budget, ports.controlBudget?.reserve);
    this.#control.migrateBearerAnswers(true);
    sql.exec(`CREATE TABLE IF NOT EXISTS agent_retirement (id INTEGER PRIMARY KEY CHECK (id = 1), revoke TEXT)`);
    // Old endpoint-only retirements must not retain their signing seed.
    sql.exec(`UPDATE agent SET seed = ? WHERE state = 'retired' AND length(seed) <> 0`, new Uint8Array());
    this.#oauth = new OAuthAccess(sql, { now: ports.now, observe: (membership, ask) => ports.observe(membership, ask),
      agent: () => { const row = this.#row(); return row ? { state: row.state, membership: row.membership, key: row.key, handle: row.handle } : null; },
      charge: bytes => { this.#control.charge(bytes, "retire"); } });
    this.#oauthHttp = new OAuthHttpLayers(this.#oauth, { now: ports.now, ...(ports.scheduleExpiry ? { schedule: ports.scheduleExpiry } : {}) });
    this.#issuer = new OAuthIssuer(sql, { id: ports.id, now: ports.now, random: ports.random,
      agent: () => { const row = this.#row(); return row ? { state: row.state, membership: row.membership, key: row.key, handle: row.handle } : null; },
      charge: bytes => this.#control.charge(bytes, "grant"),
      standing: controller => this.#grantStanding(controller),
      rotated: id => this.#oauthHttp.closeGrant(id, true),
      ended: async id => {
        this.sql.transaction(() => {
          const rows = this.sql.exec(`SELECT row FROM oauth_session WHERE grant_id = ?`, id).toArray();
          this.sql.exec(`DELETE FROM oauth_session WHERE grant_id = ?`, id);
          this.#control.charge(-rows.reduce((n, row) => n + utf8(String(row["row"])).length + ROW_OVERHEAD, 0), "retire");
        });
        await this.#oauthHttp.closeGrant(id);
      },
    }, this.#oauth);
  }

  async #grantStanding(controller: MemberId): Promise<"active" | "inactive" | "unavailable"> {
    const row = this.#row();
    if (!row || row.state !== "enrolled") return "inactive";
    try {
      const key = await this.ports.observe(row.membership, { key: row.key }) as KeyStanding | null;
      const person = await this.ports.observe(row.membership, { member: controller }) as MemberStanding | null;
      if (!key || !person) return "unavailable";
      return key.keyState === "active" && key.memberState === "active" && key.member === row.handle && key.controller === controller && person.memberState === "active" ? "active" : "inactive";
    } catch { return "unavailable"; }
  }

  /** Fresh signer and agent observations carry the role table in force. */
  async #grantAuthority(request: ControlRequest, row: AgentRow): Promise<MemberId | null> {
    const signer = await this.ports.observe(row.membership, { key: request.actor }) as KeyStanding | null;
    const agent = await this.ports.observe(row.membership, { key: row.key }) as KeyStanding | null;
    if (!signer || !agent || signer.keyState !== "active" || signer.memberState !== "active" || agent.keyState !== "active" || agent.memberState !== "active" || agent.member !== row.handle || agent.controller === null) return null;
    const controller = await this.ports.observe(row.membership, { member: agent.controller }) as MemberStanding | null;
    if (!controller || controller.memberState !== "active") return null;
    if (signer.actions.includes("membership.manage")) return agent.controller;
    return signer.member === agent.controller && agent.actions.every(action => signer.actions.includes(action)) ? agent.controller : null;
  }

  /** The trusted Worker supplies resolved client metadata, never the browser. */
  grant(signed: SignedControl, body: Uint8Array, context: OAuthGrantContext): Promise<ControlAnswer> {
    return this.#controls.run(() => this.#grant(signed, body, context));
  }
  async #grant(signed: SignedControl, body: Uint8Array, context: OAuthGrantContext): Promise<ControlAnswer> {
    const first = signed.request.agent === null;
    let given: ReturnType<typeof oauthGrant>, link: AgentKeyInvitation | null = null;
    try {
      given = oauthGrant(parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body)), context, first);
      if (first) { link = agentKeyInvitationOf(given.link!); if (!link) return answer(400, { error: "invalid_request" }); }
    } catch (error) { return answer(error instanceof OAuthError ? error.status : 400, { error: error instanceof OAuthError ? error.error : "invalid_request" }); }
    const request = signed.request, before = this.#row();
    const service = first ? link!.service : before?.config.service;
    if (!service) return answer(404, { error: "agent" });
    const refused = bound(signed, service, "grant", first ? null : this.ports.id, body, this.ports.now());
    if (refused) return refused;
    const membership = first ? link!.repository.membership : before!.membership;
    if (!same(request.membership, membership)) return answer(403, { error: "unauthorized", rule: "membership" });
    const fingerprint = fingerprintOf(request), existing = this.#control.row(request.op);
    if (existing && existing.fingerprint !== fingerprint) return answer(409, { error: "op", rule: "fingerprint" });
    if (first) {
      const authority = await authorityOf(this.ports, membership, request.actor, link!.handle as MemberId);
      if (!authority.ok || authority.by === "controller" && authority.member !== link!.controller.member) return answer(403, { error: "unauthorized" });
      if (!existing || existing.state === "reserved") {
        const made = await this.#create(request.op, request, link!);
        if (made.status >= 300) return made;
      }
    }
    const row = this.#row();
    if (!row || row.state !== "enrolled") return answer(409, { error: "agent" });
    const controller = await this.#grantAuthority(request, row);
    if (controller === null) return answer(403, { error: "unauthorized", rule: "controller-role" });
    const expired = bound(signed, service, "grant", first ? null : this.ports.id, body, this.ports.now());
    if (expired) return expired;
    const prior = this.#control.row(request.op);
    if (prior?.state !== undefined && prior.state !== "reserved") return this.#control.retained(prior, this.ports.now()) ?? answer(409, { error: "op", rule: "stale" });
    if (!prior) {
      const reserved = this.sql.transaction(() => {
        if (!this.#control.reserve("grant")) return false;
        this.#control.insert(request.op, fingerprint, "grant", this.ports.id, "reserved", request.notAfter, timeOf(this.ports.now())); return true;
      });
      if (!reserved) return answer(507, { error: "full", rule: "control-budget" });
    }
    let result: ControlAnswer;
    try {
      let registrationEnds: number | undefined;
      if (isRegisteredOAuthClient(context.client.client_id)) {
        if (!this.ports.retainClient) return answer(503, { error: "temporarily_unavailable" });
        registrationEnds = await this.ports.retainClient(structuredClone(context.client));
        const current = this.#row();
        if (!current || current.state !== "enrolled" || await this.#grantAuthority(request, current) !== controller || this.#row()?.state !== "enrolled") return answer(403, { error: "unauthorized", rule: "controller-role" });
        const late = bound(signed, service, "grant", first ? null : this.ports.id, body, this.ports.now());
        if (late) return late;
      }
      result = await this.#issuer.issue(request.op, controller, given.binding, context.client.client_name, registrationEnds);
    }
    catch (error) { if (!(error instanceof OAuthError)) throw error; return answer(error.status, { error: error.error }); }
    this.ports.fault?.("complete");
    this.sql.transaction(() => {
      this.#control.complete(request.op, result.status < 300 ? "complete" : "refused", result);
      if (first) this.sql.exec(`UPDATE agent SET answer = ? WHERE id = 1 AND op = ?`, JSON.stringify(retainedAnswer(result)), request.op);
    });
    return result;
  }

  exchangeCode(id: string, secret: string, client: string, redirect: string, verifier: string, resource?: string): Promise<OAuthResult> { return this.#issuer.exchange(id, secret, client, redirect, verifier, resource); }
  refreshGrant(id: string, secret: string, client: string, resource?: string): Promise<OAuthResult> { return this.#issuer.refresh(id, secret, client, resource); }
  revokeToken(id: string, secret: string, client: string): Promise<OAuthResult> { return this.#issuer.revokeToken(id, secret, client); }

  connectionControl(signed: SignedControl, action: "connections" | "revoke-grant", body: Uint8Array): Promise<ControlAnswer> {
    return this.#controls.run(async () => {
      const row = this.#row(), request = signed.request;
      if (!row) return answer(404, { error: "agent" });
      const refused = bound(signed, row.config.service, action, this.ports.id, body, this.ports.now());
      if (refused) return refused;
      if (!same(request.membership, row.membership)) return answer(403, { error: "unauthorized", rule: "membership" });
      const authority = await authorityOf(this.ports, row.membership, request.actor, row.handle as MemberId);
      if (!authority.ok) return answer(403, { error: "unauthorized" });
      let given: unknown;
      try { given = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body)); } catch { return answer(400, { error: "invalid_request" }); }
      if (action === "connections" ? !closed(given, []) : !closed(given, ["grant"]) || typeof given["grant"] !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(given["grant"])) return answer(400, { error: "invalid_request" });
      const expired = bound(signed, row.config.service, action, this.ports.id, body, this.ports.now());
      if (expired) return expired;
      const fingerprint = fingerprintOf(request), existing = this.#control.row(request.op);
      if (existing) {
        if (existing.fingerprint !== fingerprint) return answer(409, { error: "op", rule: "fingerprint" });
        if (existing.state !== "reserved") return this.#control.retained(existing, this.ports.now()) ?? answer(409, { error: "op", rule: "stale" });
      } else if (!this.sql.transaction(() => {
        if (!this.#control.reserve(action)) return false;
        this.#control.insert(request.op, fingerprint, action, this.ports.id, "reserved", request.notAfter, timeOf(this.ports.now())); return true;
      })) return answer(507, { error: "full", rule: "control-budget" });
      const result = action === "connections"
        ? answer(200, { agent: this.ports.id, handle: row.handle, state: row.state, connections: this.#issuer.list() })
        : await this.#issuer.revokeGrant((given as { grant: string }).grant);
      this.sql.transaction(() => this.#control.complete(request.op, "complete", result));
      return result;
    });
  }

  /** The control budget's used bytes, for a test's eyes. */
  controlUsed(): number { return this.#control.used(); }
  agentState(): string | null { return this.#row()?.state ?? null; }

  #row(): AgentRow | null {
    const r = this.sql.exec(`SELECT op, seed, key, state, membership, handle, config, bearer, bearer_expires, answer FROM agent WHERE id = 1`).toArray()[0];
    if (!r) return null;
    const seed = r["seed"] instanceof Uint8Array ? r["seed"] : new Uint8Array(r["seed"] as ArrayBuffer);
    return { op: String(r["op"]), seed, key: String(r["key"]) as KeyId, state: String(r["state"]) as AgentRow["state"], membership: JSON.parse(String(r["membership"])) as ScopeRef, handle: String(r["handle"]), config: JSON.parse(String(r["config"])) as McpConfig, bearer: r["bearer"] === null ? null : String(r["bearer"]), bearerExpires: r["bearer_expires"] === null ? null : String(r["bearer_expires"]), answer: r["answer"] === null ? null : JSON.parse(String(r["answer"])) as ControlAnswer };
  }
  /** The agent row's configuration is control state too: its growth (a root added) is charged, and refused when the budget is full. */
  #setConfig(config: McpConfig): void {
    const text = canonicalize(config as never);
    this.sql.transaction(() => {
      const before = this.sql.exec(`SELECT config FROM agent WHERE id = 1`).toArray()[0];
      const delta = utf8(text).length - (before ? utf8(String(before["config"])).length : 0);
      if (!this.#control.charge(delta, "config")) throw new Error("The agent's control budget is full: the configuration cannot grow.");
      this.sql.exec(`UPDATE agent SET config = ?, updated = ? WHERE id = 1`, text, timeOf(this.ports.now()));
    });
  }

  /** The service of this agent: its key from the seed, its configuration from the row, its custody in this object's storage. */
  #serviceOf(row: AgentRow): McpService {
    return this.#service ??= new McpService(this.#servicePort(row));
  }

  #servicePort(row: AgentRow): ServerPort {
    const { op, key, config } = row;
    const read = async (): Promise<McpConfig> => { await this.ports.configHold?.(); return this.#row()?.config ?? config; };
    const active = (): AgentRow | null => {
      const current = this.#row();
      return current?.op === op && current.key === key && (current.state === "enrolling" || current.state === "enrolled") && current.seed.length === 32 ? current : null;
    };
    const fetch: Fetch = (url, init) => {
      // A retained intent prepared before retirement cannot dispatch afterwards.
      if (!active()) return Promise.reject(new Error("The hosted agent cannot dispatch."));
      return this.ports.fetch(url, init);
    };
    return {
      applicationTrust: this.ports.applicationTrust,
      service: config.service, fetch, signer: { key, sign: bytes => {
        const current = active();
        if (!current) throw new Error("The hosted agent cannot sign.");
        const seed = current.seed.slice();
        try { return sign(seed, bytes); }
        finally { seed.fill(0); }
      } }, custody: sqliteStore(this.sql, this.ports.custodyBounds, this.ports.now), now: this.ports.now,
      ...(this.ports.genericTools !== undefined ? { genericTools: this.ports.genericTools } : {}),
      ...(this.ports.metrics ? { metrics: this.ports.metrics } : {}),
      ...(this.ports.every ? { every: this.ports.every } : {}), ...(this.ports.pause ? { pause: this.ports.pause } : {}),
      config: {
        read,
        addRoot: async (root: Root) => { const c = await read(); this.#setConfig({ ...c, roots: [...(c.roots ?? []).filter((x) => x.scope !== root.scope), root] }); },
        setRepository: async (repository) => { this.#setConfig({ ...(await read()), repository }); },
        joined: async (joined) => { this.#setConfig({ ...(await read()), service: joined.service, repository: joined.repository, handle: joined.handle }); },
      },
    };
  }

  async #httpOf(row: AgentRow): Promise<McpHttp> {
    const owner = this.#transport ?? (this.#transport = new HttpGeneration());
    try { return await owner.open(() => this.#openHttp(row, this.#httpEpoch, owner)); }
    catch (error) {
      if (this.#transport === owner) this.#transport = null;
      throw error;
    }
  }

  async #openHttp(row: AgentRow, epoch: number, generation: HttpGeneration, oauth?: OAuthHttpLayer): Promise<McpHttp> {
    const service = this.ports.applicationContent
      ? await McpService.fromInstalledApplication(this.#servicePort(row), this.ports.applicationContent)
      : this.#serviceOf(row);
    const wire = new Wire(service);
    const table = oauth ? "oauth_session" : "session";
    const http = new McpHttp({
      wire, bodyBytes: 1024 * 1024, now: this.ports.now,
      resourceDomain: request => {
        return remoteCardDomain(this.ports.cardOrigins ?? [], publicRequestUrl(row.config.service, request.url));
      },
      lifetime: { get expires() { return oauth ? oauth.deadline : timeMs(row.bearerExpires!)!; }, ...(this.ports.scheduleExpiry ? { schedule: this.ports.scheduleExpiry } : {}) },
      streamCount: () => (this.#transport?.streams ?? 0) + this.#oauthHttp.streams,
      ...(oauth ? { streamsChanged: () => this.#oauthHttp.watch(oauth.candidate) } : {}),
      mintSession: () => b64url(this.ports.random(16)),
      authorized: () => true,   // the bearer was checked before the request reached the layer
      persist: (session: SessionRow) => {
        // A session row is control state: its bytes as stored are charged, the difference on an update; no room, no session.
        const text = JSON.stringify(session);
        this.sql.transaction(() => {
          this.ports.sessionFault?.();
          const before = this.sql.exec(`SELECT row FROM ${table} WHERE id = ?`, session.id).toArray()[0];
          if (!before) {
            const total = Number(this.sql.exec(`SELECT (SELECT count(*) FROM session) + (SELECT count(*) FROM oauth_session) AS n`).toArray()[0]!["n"]);
            const own = Number((oauth ? this.sql.exec(`SELECT count(*) AS n FROM oauth_session WHERE grant_id = ?`, oauth.candidate.id)
              : this.sql.exec(`SELECT count(*) AS n FROM session`)).toArray()[0]!["n"]);
            // Preserve the existing 17th-session eviction within one credential.
            // Another grant cannot evict a different host's retained session.
            if (total >= SESSIONS_MOST && own < SESSIONS_MOST) throw new SessionFull();
          }
          const delta = utf8(text).length + ROW_OVERHEAD - (before ? utf8(String(before["row"])).length + ROW_OVERHEAD : 0);
          if (!this.#control.charge(delta, "session")) throw new SessionFull();
          if (oauth) this.sql.exec(`INSERT INTO oauth_session (id, grant_id, row, created) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET row = excluded.row`, session.id, oauth.candidate.id, text, session.created);
          else this.sql.exec(`INSERT INTO session (id, row, created) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET row = excluded.row`, session.id, text, session.created);
        });
      },
      remove: (id) => {
        this.sql.transaction(() => {
          const before = this.sql.exec(`SELECT row FROM ${table} WHERE id = ?`, id).toArray()[0];
          if (before) this.#control.charge(-(utf8(String(before["row"])).length + ROW_OVERHEAD), "retire");
          this.sql.exec(`DELETE FROM ${table} WHERE id = ?`, id);
        });
      },
    }, generation);
    // The sessions as persisted survive eviction; their streams do not, and the next GET reconciles.
    if (generation.closed || epoch !== (oauth ? this.#oauthEpoch : this.#httpEpoch) || oauth && !this.#oauth.current(oauth.candidate)) { http.abrupt(); return http; }
    const sessions = oauth
      ? this.sql.exec(`SELECT row FROM oauth_session WHERE grant_id = ? ORDER BY created`, oauth.candidate.id)
      : this.sql.exec(`SELECT row FROM session ORDER BY created`);
    http.restore(sessions.toArray().map((r) => JSON.parse(String(r["row"])) as SessionRow));
    this.#service = service;
    return http;
  }

  /** Remove expired answer bodies from both copies: the control row's, and the agent row's redacted creation receipt. */
  #expire(now: number): void {
    for (const op of this.#control.expire(now)) this.sql.exec(`UPDATE agent SET answer = NULL WHERE id = 1 AND op = ?`, op);
  }

  /** The registry's call: make the key, enrol it, mint the bearer. Idempotent on `op`; resumable at every step; one at a time. */
  create(op: string, request: ControlRequest, link: AgentKeyInvitation): Promise<ControlAnswer> {
    return this.#metrics.call("enrol", () => this.#controls.run(() => this.#create(op, request, link)), result => ({
      end: result.status >= 500 ? "unavailable" : result.status >= 400 ? "refused" : "ok",
      reason: typeof result.body["error"] === "string" ? result.body["error"] : "none", bytes: utf8(JSON.stringify(result)).length,
    }));
  }

  async #create(op: string, request: ControlRequest, link: AgentKeyInvitation): Promise<ControlAnswer> {
    const now = this.ports.now();
    this.sql.transaction(() => this.#expire(now));
    let row = this.#row();
    if (row && row.op !== op) return answer(409, { error: "op", rule: "agent" });
    if (row?.state === "enrolled" || row?.state === "refused") return row.answer ?? (row.state === "enrolled" && request.action === "grant" ? answer(201, { agent: this.ports.id, key: row.key, handle: row.handle }) : answer(409, { error: "op", rule: "stale" }));
    if (row?.state === "retired") return answer(409, { error: "retired" });
    if (!row) {
      // The seed is written before the envelope is built; the control budget is reserved before the key exists.
      const made = this.sql.transaction((): ControlAnswer | null => {
        if (!this.#control.reserve(request.action)) return answer(507, { error: "full", rule: "control-budget" });
        const seed = this.ports.random(32);
        const config: McpConfig = { service: link.service, repository: link.repository, handle: link.handle };
        const configText = canonicalize(config as never);
        if (!this.#control.charge(utf8(configText).length + 256 + ROW_OVERHEAD, "create")) return answer(507, { error: "full", rule: "control-budget" });
        this.sql.exec(`INSERT INTO agent (id, op, seed, key, state, membership, handle, config, bearer, answer, created, updated) VALUES (1, ?, ?, ?, 'enrolling', ?, ?, ?, NULL, NULL, ?, ?)`,
          op, seed, keyIdOfSecret(seed), canonicalize(link.repository.membership as never), link.handle, configText, timeOf(now), timeOf(now));
        this.#control.insert(op, fingerprintOf(request), request.action, this.ports.id, "reserved", request.notAfter, timeOf(now));
        return null;
      });
      if (made) return made;
      row = this.#row()!;
      this.ports.fault?.("seed");
    }
    const service = this.#serviceOf(row);
    const M = link.repository.membership;
    const signer = secretSigner(row.seed);
    const identity: Identity = { service: link.service, membership: M, signer: signer.key, target: M, key: `enrol:${op}` };
    const meaning = meaningOf({ enrol: digestBytes(utf8(canonicalize(link as never))) });
    const fields = invitationRedemptionFields(link.definition, M, link.invitation.seq, signer.key, link.secret);
    const build = async () => ({
      binding: { definition: "platform:membership", kind: "enrol", declaration: null, pinned: link.definition },
      envelope: { signed: await signedIntent(signer, { to: M, kind: "enrol", on: 0, fields, expected: link.expected }, { idempotencyKey: `enrol:${op}`, now }), beside: {} } as Envelope,
    });
    const notAfter = timeOf(now + PROPOSED_BOUNDS.intentLifetimeSeconds * 1000);
    let kept: Awaited<ReturnType<typeof service.custody.send>>;
    try {
      // The envelope is kept, and read back, before anything is sent; a reset here resumes with the same envelope.
      await service.custody.keep(identity, meaning, build, notAfter, utf8(canonicalize(fields)).length);
      this.ports.fault?.("kept");
      kept = await service.custody.send(identity, meaning, build, async (envelope) => {
        try { return await service.reads.transport.submit(M.scope, envelope.signed, [], envelope.beside); }
        catch (error) { if (error instanceof TransportError) throw new Lost(); throw error; }
      }, { notAfter, bytes: utf8(canonicalize(fields)).length });
    } catch (error) {
      if (error instanceof CustodyError) return answer(error.why.held === "full" ? 507 : 503, { error: "custody", rule: error.why.held });
      throw error;
    }
    if ("lost" in kept) return answer(503, { error: "unresolved", op });
    if ("archivedSettlement" in kept) return answer(410, { error: "archived", op, archived: kept.archivedSettlement.archived,
      ...(kept.archivedSettlement.fact ? { fact: kept.archivedSettlement.fact } : {}), next: "Verify the original enrollment in its archive clone before continuing; do not sign or send a replacement request." });
    if (kept.answer.answer === "archived") return answer(410, { error: "archived", op, archived: kept.answer.archived, fact: kept.answer.fact,
      next: "Verify the original enrollment in its archive clone before continuing; do not sign or send a replacement request." });
    if (kept.answer.answer !== "accepted") {
      const given = kept.answer as { answer: string; reason?: string };
      if (given.answer === "unavailable") return answer(503, { error: "unresolved", op });
      const result = answer(422, { error: "refused", reason: given.reason ?? given.answer });
      this.sql.transaction(() => { this.sql.exec(`UPDATE agent SET state = 'refused', answer = ?, updated = ? WHERE id = 1`, JSON.stringify(result), timeOf(now)); this.#control.complete(op, "refused", result); });
      return result;
    }
    // Admitted: the entry holds the exact envelope, the key reads back active, and only then is the bearer minted.
    const fact = kept.answer.receipt.fact;
    service.reads.forget(M.scope);
    const entry = await service.reads.read(M, (t, r) => t.entry(M.scope, r, fact.seq, { at: fact.at, head: fact.seq }));
    if (!entry.ok) return answer(503, { error: "unresolved", op, rule: "read-back" });
    const input = entry.value.entry.input;
    if (entry.value.hash !== fact.hash || input.type !== "act" || canonicalize(input.signed) !== canonicalize(kept.record.envelope.signed)) return answer(409, { error: "enrol", rule: "entry" });
    mcpRead();
    const standing = (await this.ports.observe(M, { key: signer.key })) as KeyStanding | null;
    if (!standing || standing.keyState !== "active") return answer(503, { error: "unresolved", op, rule: "key-not-active" });
    this.ports.fault?.("accepted");
    const inbox = entry.value.entry.sends.flatMap((send) => ("creator" in send.to && send.to.kind === "inbox" ? [scopeIdOf(send.to as Seed)] : []))[0];
    // The terminal transition is decided on the durable state as it is now: an agent retired or completed meanwhile keeps its
    // answer, and no second bearer is ever minted for one creation.
    const decided = this.sql.transaction((): ControlAnswer => {
      const current = this.#row()!;
      if (current.state === "retired") return answer(409, { error: "retired" });
      if (current.state !== "enrolling") return current.answer ?? answer(409, { error: "op", rule: "stale" });
      const config: McpConfig = { ...current.config, repository: { ...link.repository, ...(inbox ? { inbox } : {}) } };
      if (request.action === "grant") {
        this.sql.exec(`UPDATE agent SET state = 'enrolled', config = ?, updated = ? WHERE id = 1`, canonicalize(config as never), timeOf(this.ports.now()));
        return answer(201, { agent: this.ports.id, key: signer.key, handle: link.handle, member: fact });
      }
      const issued = this.ports.now(), bearerExpires = timeOf(issued + BEARER_LIFETIME_MS);
      if (!this.#control.charge(utf8(bearerExpires).length, "create")) throw new Error("SQLITE_FULL: the bearer expiry cannot be stored.");
      const secret = b64url(this.ports.random(32));
      const result = answer(201, { agent: this.ports.id, key: signer.key, handle: link.handle, member: fact, bearer: `${this.ports.id}.${secret}`, bearerExpires });
      this.sql.exec(`UPDATE agent SET state = 'enrolled', bearer = ?, bearer_expires = ?, answer = ?, config = ?, updated = ? WHERE id = 1`, digestBytes(utf8(secret)), bearerExpires, JSON.stringify(retainedAnswer(result)), canonicalize(config as never), timeOf(issued));
      this.#control.complete(op, "complete", result);
      return result;
    });
    this.#service = null;   // derived again with the configuration that names the inbox
    this.#transport?.abrupt();
    this.#transport = null;
    return decided;
  }

  /** Controls serialize rotation and retirement; shutdown commits before outside work. */
  control(signed: SignedControl, action: "bearer" | "retire", body: Uint8Array): Promise<ControlAnswer> {
    return this.#controls.run(() => this.#control_(signed, action, body));
  }

  async #control_(signed: SignedControl, action: "bearer" | "retire", body: Uint8Array): Promise<ControlAnswer> {
    const now = this.ports.now();
    const row = this.#row();
    if (!row) return answer(404, { error: "agent" });
    // An enrolment still unfinished can be retired by its authority; it cannot be re-issued a bearer, having none.
    if (row.state === "enrolling" && action === "bearer") return answer(409, { error: "enrolling" });
    const refused = bound(signed, row.config.service, action, this.ports.id, body, now);
    if (refused) return refused;
    const r = signed.request;
    // Another repository or another incarnation: refused as the design states, with a fixed body.
    if (!same(r.membership, row.membership)) return answer(403, { error: "unauthorized", rule: "membership" });
    const authority = await authorityOf(this.ports, row.membership, r.actor, row.handle as MemberId);
    if (!authority.ok) return answer(403, { error: "unauthorized" });
    if (action === "retire") return this.#retire(signed, row, body, authority, now);
    const fingerprint = fingerprintOf(r);
    // `fresh`: this call committed the action now. A replay returns the retained answer and disturbs nothing opened since.
    const { result, fresh } = this.sql.transaction((): { result: ControlAnswer; fresh: boolean } => {
      this.#expire(now);
      const existing = this.#control.row(r.op);
      if (existing) {
        if (existing.fingerprint !== fingerprint) return { result: answer(409, { error: "op", rule: "fingerprint" }), fresh: false };
        return { result: this.#control.retained(existing, now) ?? answer(409, { error: "op", rule: "stale" }), fresh: false };
      }
      if (row.state === "retired") return { result: answer(409, { error: "retired" }), fresh: false };
      const issued = this.ports.now(), bearerExpires = timeOf(issued + BEARER_LIFETIME_MS);
      const expiryDelta = utf8(bearerExpires).length - (row.bearerExpires === null ? 0 : utf8(row.bearerExpires).length);
      // Reserve the operation and settle the expiry field in one admission.
      if (!this.#control.charge(CONTROL_ROW_BYTES + expiryDelta, action)) return { result: answer(507, { error: "full", rule: "control-budget" }), fresh: false };
      const secret = b64url(this.ports.random(32));
      const done = answer(200, { agent: this.ports.id, by: authority.by, bearer: `${this.ports.id}.${secret}`, bearerExpires });
      this.sql.exec(`UPDATE agent SET bearer = ?, bearer_expires = ?, updated = ? WHERE id = 1`, digestBytes(utf8(secret)), bearerExpires, timeOf(issued));
      const held = this.sql.exec(`SELECT row FROM session`).toArray().reduce((n, s) => n + utf8(String(s["row"])).length + ROW_OVERHEAD, 0);
      this.sql.exec(`DELETE FROM session`);
      this.#control.charge(-held, "retire");
      this.#control.insert(r.op, fingerprint, action, this.ports.id, "complete", r.notAfter, timeOf(now));
      this.#control.complete(r.op, "complete", done);
      return { result: done, fresh: true };
    });
    if (fresh) {
      // Graceful: every open stream closes with a final event, every listen with its result; the sessions are already gone.
      // A package load that started under the old bearer cannot adopt a layer.
      this.#httpEpoch++;
      const owner = this.#transport;
      this.#transport = null;
      await owner?.graceful();
    }
    return result;
  }

  /** Endpoint shutdown and seed erasure precede every outside read or dispatch. */
  async #retire(signed: SignedControl, row: AgentRow, body: Uint8Array, authority: Extract<Authorized, { ok: true }>, now: number): Promise<ControlAnswer> {
    const r = signed.request, fingerprint = fingerprintOf(r);
    const prior = this.sql.exec(`SELECT revoke FROM agent_retirement WHERE id = 1`).toArray()[0];
    // Once captured, no later body replaces or changes the retained envelope.
    const parsed = prior?.["revoke"] != null ? { valid: true as const, revoke: null } : retirementBody(body, row.membership, r.actor);
    if (!parsed.valid) return answer(400, { error: "retire", rule: "revoke-envelope" });
    const text = parsed.revoke ? canonicalize(parsed.revoke) : null;
    const refused = this.sql.transaction((): ControlAnswer | null => {
      this.#expire(now);
      const existing = this.#control.row(r.op);
      if (existing && existing.fingerprint !== fingerprint) return answer(409, { error: "op", rule: "fingerprint" });
      const held = this.sql.exec(`SELECT revoke FROM agent_retirement WHERE id = 1`).toArray()[0];
      const capture = held?.["revoke"] == null ? text : null;
      const cost = (existing ? 0 : CONTROL_ROW_BYTES) + (held ? 0 : ROW_OVERHEAD) + (capture === null ? 0 : utf8(capture).length);
      if (!this.#control.charge(cost, "retire")) return answer(507, { error: "full", rule: "control-budget" });
      if (!held) this.sql.exec(`INSERT INTO agent_retirement (id, revoke) VALUES (1, ?)`, capture);
      else if (capture !== null) this.sql.exec(`UPDATE agent_retirement SET revoke = ? WHERE id = 1 AND revoke IS NULL`, capture);
      this.sql.exec(`UPDATE agent SET state = 'retired', seed = ?, bearer = NULL, bearer_expires = NULL, updated = ? WHERE id = 1`, new Uint8Array(), timeOf(now));
      this.#oauth.endAll();
      for (const table of ["session", "oauth_session"]) {
        const bytes = this.sql.exec(`SELECT row FROM ${table}`).toArray().reduce((n, s) => n + utf8(String(s["row"])).length + ROW_OVERHEAD, 0);
        this.sql.exec(`DELETE FROM ${table}`);
        this.#control.charge(-bytes, "retire");
      }
      if (!existing) this.#control.insert(r.op, fingerprint, "retire", this.ports.id, "pending", r.notAfter, timeOf(now));
      return null;
    });
    if (refused) return refused;
    row.seed.fill(0);
    this.#httpEpoch++; this.#oauthEpoch++;
    const owner = this.#transport;
    this.#transport = null; this.#service = null;
    await owner?.graceful();
    await this.#issuer.revokeAll();
    await this.#oauthHttp.closeAll();
    const result = (complete: boolean, reason?: string): ControlAnswer => answer(complete ? 200 : 202, {
      agent: this.ports.id, by: authority.by, key: row.key, retired: complete,
      endpointDisabled: true, seedErased: true,
      ...(complete ? {} : { pending: true, reason: reason ?? "key-active", next: "A membership.manage holder or the recovery key must revoke this key. Retry retire after the recorded revoke." }),
    });
    const revoked = async (): Promise<boolean> => {
      try {
        const key = await this.ports.observe(row.membership, { key: row.key }) as KeyStanding | null;
        return key?.keyState === "retired" || key?.keyState === "compromised";
      } catch { return false; }
    };
    let decided: ControlAnswer;
    if (await revoked()) decided = result(true);
    else {
      const kept = this.sql.exec(`SELECT revoke FROM agent_retirement WHERE id = 1`).toArray()[0]?.["revoke"];
      let reason = "revoke-required";
      if (typeof kept === "string") {
        const revoke = parseStrict(kept) as SignedIntent;
        const identity: Identity = { service: row.config.service, membership: row.membership, signer: row.key, target: row.membership, key: `enrol:${row.op}` };
        try {
          const record = await sqliteStore(this.sql, this.ports.custodyBounds, this.ports.now).read(identityId(identity));
          const target = enrolledKeyItem(record, identity);
          if (target === null) reason = "enrolment-unavailable";
          else if (revoke.intent.on !== target) reason = "wrong-key";
          else if ((timeMs(revoke.intent.notAfter) ?? -Infinity) <= this.ports.now()) reason = "revoke-expired";
          else {
            const reply = await httpTransport(row.config.service, { fetch: this.ports.fetch }).submit(row.membership.scope, revoke, []);
            reason = reply.answer === "accepted" ? "revocation-unobserved" : "reason" in reply ? String(reply.reason) : reply.answer;
          }
        } catch { reason = "revoke-unresolved"; }
      }
      decided = await revoked() ? result(true) : result(false, reason);
    }
    this.sql.transaction(() => this.#control.complete(r.op, decided.status === 200 ? "complete" : "pending", decided));
    return decided;
  }

  /** The bearer check, in constant time over digests, with failures counted per connecting address. */
  async #authorized(request: Request): Promise<"unauthorized" | "limited" | "unavailable" | { oauth: OAuthAccessCandidate | null }> {
    const authorization = request.headers.get("authorization"), address = request.headers.get("cf-connecting-ip");
    const now = this.ports.now();
    let oauth: OAuthAccessCandidate | null = null;
    const checked = this.#failures.check(address, now, () => {
      const row = this.#row();
      let ok = false;
      const expires = row?.bearerExpires === null || row?.bearerExpires === undefined ? null : timeMs(row.bearerExpires);
      if (authorization?.startsWith("Bearer ") && row?.state === "enrolled") {
        const [id, second, third, ...rest] = authorization.slice("Bearer ".length).split(".");
        if (id === this.ports.id && second && rest.length === 0) {
          if (third === undefined && row.bearer && expires !== null && now < expires) ok = equalTokenDigest(row.bearer, second);
          else if (third !== undefined) {
            oauth = this.#oauth.inspect(second, third, this.ports.oauthResource?.(request) ?? null);
            ok = oauth !== null;
          }
        }
      }
      return ok;
    });
    if (checked !== "ok") return checked;
    if (oauth !== null) {
      const standing = await this.#oauth.standingResult(oauth);
      if (standing === "unavailable") return "unavailable";
      if (standing === "inactive") return this.#failures.check(address, this.ports.now(), () => false) === "limited" ? "limited" : "unauthorized";
    }
    return { oauth };
  }

  /** `POST`, `GET` and `DELETE /mcp` for this agent. */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("origin") !== null) return new Response(null, { status: 403 });
    const checked = await this.#authorized(request);
    if (checked === "unavailable") return new Response(JSON.stringify({ error: "unavailable" }), { status: 503, headers: { "content-type": "application/json", "retry-after": "1" } });
    if (checked === "limited") return new Response(JSON.stringify({ error: "rate-limited" }), { status: 429, headers: { "content-type": "application/json" } });
    if (checked === "unauthorized") return mcpUnauthorized(request);
    const http = checked.oauth
      ? await this.#oauthHttp.open(checked.oauth, layer => this.#openHttp(this.#row()!, this.#oauthEpoch, layer.generation, layer))
      : await this.#httpOf(this.#row()!);
    if (http === null) return mcpUnauthorized(request);
    // Discovery may await native reads and package storage. Retirement or a
    // bearer rotation during that wait must take effect before dispatch.
    const current = await this.#authorized(request);
    if (current === "unavailable") return new Response(JSON.stringify({ error: "unavailable" }), { status: 503, headers: { "content-type": "application/json", "retry-after": "1" } });
    if (current === "limited") return new Response(JSON.stringify({ error: "rate-limited" }), { status: 429, headers: { "content-type": "application/json" } });
    if (current === "unauthorized") return mcpUnauthorized(request);
    if (checked.oauth && current.oauth?.row !== checked.oauth.row) return mcpUnauthorized(request);
    const response = await http.handle(request);
    if (checked.oauth) this.#oauthHttp.watch(checked.oauth);
    return mcpChallengeResponse(request, response);
  }

  /** For a test: the service and the layer as this object holds them now. */
  inside(): { service: McpService | null; http: McpHttp | null } { return { service: this.#service, http: this.#transport?.phase === "open" ? this.#transport.http : null }; }

  /** What an eviction does to this instance's memory: every stream ends abruptly, with no event; nothing durable changes. */
  abrupt(): void { this.#httpEpoch++; this.#oauthEpoch++; this.#transport?.abrupt(); this.#oauthHttp.abrupt(); this.#transport = null; this.#service = null; }

  /** The durable facts of this agent a witness compares across a reset: its key, its state, and the digest of its kept enrol intent. */
  durable(): { key: string | null; state: string | null; enrol: string | null; bearer: boolean } {
    const row = this.#row();
    if (!row) return { key: null, state: null, enrol: null, bearer: false };
    const hasStore = this.sql.exec(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'record'`).toArray().length > 0;
    const records = hasStore ? this.sql.exec(`SELECT id, chunks FROM record WHERE key LIKE 'enrol:%'`).toArray() : [];
    let enrol: string | null = null;
    if (records[0]) {
      const parts = this.sql.exec(`SELECT bytes FROM chunk WHERE id = ? ORDER BY idx`, String(records[0]["id"])).toArray().map((r) => (r["bytes"] instanceof Uint8Array ? r["bytes"] : new Uint8Array(r["bytes"] as ArrayBuffer)));
      const whole = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
      let at = 0;
      for (const p of parts) { whole.set(p, at); at += p.length; }
      const record = JSON.parse(new TextDecoder().decode(whole)) as { envelope: { signed: { intent: unknown } } };
      enrol = digestBytes(utf8(canonicalize(record.envelope.signed.intent as never)));
    }
    return { key: row.key, state: row.state, enrol, bearer: row.bearer !== null };
  }

  /**
   * A test's read of the custody record kept under an idempotency key, live or archived: the digest of its envelope's intent,
   * its attempt and how many outcomes it holds; null when there is none. What a witness compares across a repeat and a resubmit.
   */
  custodyOf(key: string): { intent: string; attempt: number; outcomes: number; phase: string; steps: string[]; reserved: number } | null {
    const hasStore = this.sql.exec(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'record'`).toArray().length > 0;
    if (!hasStore) return null;
    const live = this.sql.exec(`SELECT id, chunks FROM record WHERE key = ?`, key).toArray()[0];
    const matched = live ?? this.sql.exec(`SELECT id, chunks FROM archive WHERE key = ?`, key).toArray()[0];
    if (!matched) return null;
    const parts = this.sql.exec(`SELECT bytes FROM ${live ? "chunk" : "archive_chunk"} WHERE id = ? ORDER BY idx`, String(matched["id"])).toArray().map((r) => (r["bytes"] instanceof Uint8Array ? r["bytes"] : new Uint8Array(r["bytes"] as ArrayBuffer)));
    const whole = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) { whole.set(p, at); at += p.length; }
    const record = JSON.parse(new TextDecoder().decode(whole)) as { envelope: { signed: { intent: unknown } }; attempt: number; count: number; phase: string; steps: Record<string, { phase: string }> };
    const identity = this.sql.exec(`SELECT reserved FROM identity WHERE id = ?`, String(matched["id"])).toArray()[0];
    return { intent: digestBytes(utf8(canonicalize(record.envelope.signed.intent as never))), attempt: record.attempt, outcomes: record.count, phase: record.phase, steps: Object.values(record.steps ?? {}).map((st) => st.phase), reserved: identity ? Number(identity["reserved"]) : 0 };
  }
}

export type { ControlRequest, SignedControl, Digest };
