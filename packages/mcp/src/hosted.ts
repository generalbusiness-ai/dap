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

import { McpRequestWindows } from "./request-window.ts";
import { ROLE_LISTS, isActions } from "@generalbusiness/dap-platform/membership-actions";
import type { ControlAction, ControlRequest, Digest, Head, KeyId, MemberId, ScopeRef, Seed, SignedControl, SignedIntent } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, isHead, isKeyId, isSequenceRef, keyIdOfSecret, parseStrict, scopeIdOf, sign, timeMs, timeOf, unb64url, utf8, verifyControl } from "@generalbusiness/dap-bytes";
import { TransportError, agentKeyInvitationOf, httpTransport, secretSigner, signedIntent, type AgentKeyInvitation, type Fetch } from "@generalbusiness/dap-client";
import { CustodyError, Lost, identityId, meaningOf, type Envelope, type Identity, type StoredCustodyRecord } from "@generalbusiness/dap-client";
import { enrolledKeyItem, retirementBody } from "./hosted-retirement.ts";
import { HttpGeneration, McpHttp, SESSIONS_MOST, SessionFull, type SessionRow } from "./http.ts";
import type { McpConfig, Root } from "./inventory.ts";
import { McpService, failed, type ServerPort } from "./service.ts";
import { McpMetrics, mcpRead, type McpMetricOptions } from "./metrics.ts";
import { sqliteStore, type Sql, type SqliteCustodyBounds } from "./sqlite-custody.ts";
import { Wire } from "./wire.ts";
import type { DispatchContext, Failure } from "./results.ts";
import { remoteCardDomain, type RemoteCardOrigin } from "./views/remote-origins.ts";
import { mcpChallengeResponse, mcpUnauthorized, publicRequestUrl } from "./oauth-resource.ts";
import { OAuthAccess, agentRoleDecision, equalTokenDigest, type OAuthAccessCandidate } from "./oauth-access.ts";
import { OAuthHttpLayers, type OAuthHttpLayer } from "./oauth-http.ts";
import { OAuthIssuer, type OAuthResult } from "./oauth-issuer.ts";
import { isRegisteredOAuthClient, oauthGrant, OAuthError, type OAuthBinding, type OAuthClient, type OAuthGrantContext } from "./oauth-parameters.ts";

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

/** A null expectedController means derive the actual recorded controller, not skip its check. */
export interface HostedRoleRequest {
  readonly membership: ScopeRef;
  readonly agent: MemberId;
  /** Null only before enrollment. Access and credential disclosure name the actual agent key. */
  readonly agentKey: KeyId | null;
  readonly expectedController: MemberId | null;
  /** The signed control's actor. Access-token standing has no separate control signer. */
  readonly actor: KeyId | null;
}

/** Actor-only management facts use this exact second request shape. */
export interface HostedActorRequest {
  readonly membership: ScopeRef;
  readonly actor: KeyId;
}
export type HostedStandingRequest = HostedRoleRequest | HostedActorRequest;

export interface HostedMemberRole {
  readonly member: MemberId;
  readonly state: "active" | "removed" | "unknown";
  readonly role: string | null;
  readonly activeKey: boolean | null;
  readonly controller: MemberId | null;
  /** Owned current roster bytes, not a default-role lookup. At most ACTIONS_MOST names. */
  readonly actions: readonly string[];
}

export interface HostedKeyRole {
  readonly key: KeyId;
  readonly keyState: "active" | "retired" | "compromised";
  readonly member: MemberId;
  readonly memberState: "active" | "removed";
  readonly controller: MemberId | null;
  readonly actions: readonly string[];
}

/** Facts from one synchronous membership state read. This is not a Native Observation. */
export type HostedRoleRead =
  | { readonly status: "unavailable" }
  | {
      readonly status: "observed";
      readonly of: ScopeRef;
      readonly head: Head;
      readonly agent: HostedMemberRole;
      /** Null means no observed key. The request distinguishes missing exact key from pre-enrollment. */
      readonly agentKey: HostedKeyRole | null;
      readonly controller: HostedMemberRole | null;
      /** A requested but absent actor has no fabricated member or member-state binding. */
      readonly actor: HostedKeyRole | null;
    };

/** Facts of the requested key only; no Agent, other member or roster payload. */
export type HostedActorRead =
  | { readonly status: "unavailable" }
  | { readonly status: "observed"; readonly of: ScopeRef; readonly head: Head; readonly actor: HostedKeyRole | null };
export type HostedStandingRead = HostedRoleRead | HostedActorRead;

/** Exact request keys select the existing Agent or actor-only shape. */
function hostedRoleRequestKind(request: unknown): "agent" | "actor" | null {
  if (!isRecord(request) || !isSequenceRef(request["membership"])) return null;
  const fields = Object.keys(request).sort().join(",");
  if (fields === "actor,membership") return isKeyId(request["actor"]) ? "actor" : null;
  return fields === "actor,agent,agentKey,expectedController,membership" && isMemberId(request["agent"])
    && (request["agentKey"] === null || isKeyId(request["agentKey"]))
    && (request["expectedController"] === null || isMemberId(request["expectedController"]))
    && (request["actor"] === null || isKeyId(request["actor"])) ? "agent" : null;
}

/** Worker-only RPC projection. The Worker decodes unknown before returning a typed read. */
export interface HostedRolePeer {
  hostedRoleStanding(request: HostedStandingRequest): Promise<unknown>;
}

/** Internal hosted admission port. No client chooses a role, action list, or observed head. */
export interface HostedRolePorts {
  roleStanding(request: HostedRoleRequest): Promise<HostedRoleRead>;
  roleStanding(request: HostedActorRequest): Promise<HostedActorRead>;
  roleStanding(request: HostedStandingRequest): Promise<HostedStandingRead>;
}

/** Temporary role denial must not become durable revocation. */
export type HostedRoleDecision =
  | { readonly status: "active" }
  | { readonly status: "inactive"; readonly reason: "agent-inactive" | "controller-inactive" | "controller-changed" | "role-subset" | "owner-changed" }
  | { readonly status: "unavailable" };

/** Public facts of one internal Agent owner; never seed, credential or authority. */
export interface HostedAgentIdentity {
  readonly agent: string;
  readonly op: string;
  readonly state: "enrolling" | "enrolled" | "retired" | "refused";
  readonly membership: ScopeRef;
  readonly key: KeyId;
  readonly handle: MemberId;
}

/** Exact absence is distinct from an unreadable or malformed stored owner. */
export type HostedAgentIdentityRead =
  | { readonly status: "observed"; readonly identity: HostedAgentIdentity }
  | { readonly status: "absent"; readonly agent: string }
  | { readonly status: "unavailable" };

/** Decode only this internal fact union, bound to the addressed Agent. */
export function hostedAgentIdentity(expectedAgent: string, value: unknown): HostedAgentIdentityRead {
  const unavailable = { status: "unavailable" } as const;
  if (isRetiredStoreStop(value) || !isRecord(value)) return unavailable;
  const fields = Object.keys(value).sort().join(",");
  if (value["status"] === "absent") return fields === "agent,status" && value["agent"] === expectedAgent
    ? { status: "absent", agent: expectedAgent } : unavailable;
  if (value["status"] !== "observed" || fields !== "identity,status" || !isRecord(value["identity"])) return unavailable;
  const identity = value["identity"];
  if (Object.keys(identity).sort().join(",") !== "agent,handle,key,membership,op,state"
    || identity["agent"] !== expectedAgent || typeof identity["op"] !== "string" || identity["op"].length === 0 || utf8(identity["op"]).length > OP_BYTES
    || !isSequenceRef(identity["membership"]) || !isKeyId(identity["key"]) || !isMemberId(identity["handle"])) return unavailable;
  const state = identity["state"];
  if (state !== "enrolling" && state !== "enrolled" && state !== "retired" && state !== "refused") return unavailable;
  return { status: "observed", identity: { agent: expectedAgent, op: identity["op"], state,
    membership: { ...identity["membership"] }, key: identity["key"], handle: identity["handle"] } };
}

/** Decode only this internal RPC shape; retain no peer-owned array or reference. */
export function hostedRoleRead(request: HostedRoleRequest, value: unknown): HostedRoleRead;
export function hostedRoleRead(request: HostedActorRequest, value: unknown): HostedActorRead;
export function hostedRoleRead(request: HostedStandingRequest, value: unknown): HostedStandingRead;
export function hostedRoleRead(request: HostedStandingRequest, value: unknown): HostedStandingRead {
  const unavailable = { status: "unavailable" } as const;
  if (hostedRoleRequestKind(request) === null) return unavailable;
  const fields = (given: Record<string, unknown>, names: string): boolean => Object.keys(given).sort().join(",") === names;
  const nullableMember = (given: unknown): given is MemberId | null => given === null || isMemberId(given);
  const member = (given: unknown): HostedMemberRole | null => {
    if (!isRecord(given) || !fields(given, "actions,activeKey,controller,member,role,state")) return null;
    const { member, state, role, activeKey, controller, actions } = given;
    if (!isMemberId(member) || (state !== "active" && state !== "removed" && state !== "unknown")
      || !nullableMember(controller) || !isActions(actions)) return null;
    if (state === "unknown") return role === null && activeKey === null && controller === null && actions.length === 0
      ? { member, state, role, activeKey, controller, actions: [] } : null;
    if (typeof role !== "string" || !Object.hasOwn(ROLE_LISTS, role) || typeof activeKey !== "boolean") return null;
    return { member, state, role, activeKey, controller, actions: [...actions] };
  };
  const key = (given: unknown): HostedKeyRole | null => {
    if (!isRecord(given) || !fields(given, "actions,controller,key,keyState,member,memberState")) return null;
    const { key, keyState, member, memberState, controller, actions } = given;
    if (!isKeyId(key) || (keyState !== "active" && keyState !== "retired" && keyState !== "compromised")
      || !isMemberId(member) || (memberState !== "active" && memberState !== "removed")
      || !nullableMember(controller) || !isActions(actions)) return null;
    return { key, keyState, member, memberState, controller, actions: [...actions] };
  };
  if (!("agent" in request)) {
    if (!isRecord(value) || value["status"] !== "observed" || !fields(value, "actor,head,of,status")
      || !isSequenceRef(value["of"]) || !same(value["of"], request.membership) || !isHead(value["head"])) return unavailable;
    const actor = value["actor"] === null ? null : key(value["actor"]);
    if (value["actor"] !== null && (!actor || actor.key !== request.actor)) return unavailable;
    return { status: "observed", of: { ...value["of"] }, head: { ...value["head"] }, actor };
  }
  if (!isRecord(value) || value["status"] !== "observed"
    || !fields(value, "actor,agent,agentKey,controller,head,of,status") || !isSequenceRef(value["of"])
    || !same(value["of"], request.membership) || !isHead(value["head"])) return unavailable;
  const agent = member(value["agent"]), controller = value["controller"] === null ? null : member(value["controller"]);
  const agentKey = value["agentKey"] === null ? null : key(value["agentKey"]);
  const actor = value["actor"] === null ? null : key(value["actor"]);
  if (!agent || agent.member !== request.agent || (value["controller"] !== null && !controller)
    || (agent.controller === null ? controller !== null : controller?.member !== agent.controller)
    || (value["agentKey"] !== null && (!agentKey || agentKey.key !== request.agentKey))
    || (request.agentKey === null && agentKey !== null)
    || (value["actor"] !== null && (!actor || actor.key !== request.actor)) || (request.actor === null && actor !== null)) return unavailable;
  return { status: "observed", of: { ...value["of"] }, head: { ...value["head"] }, agent, agentKey, controller, actor };
}

/** Adapt raw producers through the same closed decoder, preserving both typed overloads. */
export function hostedRolePort(read: (request: HostedStandingRequest) => Promise<unknown>): HostedRolePorts["roleStanding"] {
  function standing(request: HostedRoleRequest): Promise<HostedRoleRead>;
  function standing(request: HostedActorRequest): Promise<HostedActorRead>;
  function standing(request: HostedStandingRequest): Promise<HostedStandingRead>;
  async function standing(request: HostedStandingRequest): Promise<HostedStandingRead> {
    if (hostedRoleRequestKind(request) === null) return { status: "unavailable" };
    return hostedRoleRead(request, await read(request));
  }
  return standing;
}

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

export interface RegistryPorts extends Authority, HostedRolePorts {
  now(): number;
  /** A test's control budget and retirement reserve in place of 16 MiB and 1 MiB. */
  controlBudget?: { budget: number; reserve: number };
  /** A test's fault: called at the named fence; throwing there is the reset. */
  fault?: (fence: CreationFence) => void;
  /** A fresh, unique agent object ID. */
  mintId(): string;
  /** The agent object by its ID: its `create`. */
  agent(id: string): { create(op: string, request: ControlRequest, link: AgentKeyInvitation): Promise<ControlAnswer | RetiredStoreStop>; grant?(signed: SignedControl, body: Uint8Array, context: OAuthGrantContext): Promise<ControlAnswer | RetiredStoreStop>; agentState?(): Promise<string | null | RetiredStoreStop>; roleIdentity(): Promise<unknown> };
}

/** One repository's registry: the only place that creates an agent object. Named by the membership scope ID. */
export class HostedRegistry {
  readonly #control: ControlPlane;
  readonly #requestWindows: McpRequestWindows;
  constructor(private readonly sql: Sql, private readonly ports: RegistryPorts) {
    sql.exec(`CREATE TABLE IF NOT EXISTS agents (agent TEXT PRIMARY KEY, handle TEXT NOT NULL, key TEXT, state TEXT NOT NULL, created TEXT NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_agent (controller TEXT NOT NULL, client_id TEXT NOT NULL, agent TEXT NOT NULL UNIQUE, handle TEXT NOT NULL, created TEXT NOT NULL, pending_op TEXT, PRIMARY KEY (controller, client_id))`);
    this.#control = new ControlPlane(sql, ports.controlBudget?.budget, ports.controlBudget?.reserve);
    this.#requestWindows = new McpRequestWindows(sql);
    this.#control.migrateBearerAnswers(false);
    // NULL preserves unresolved legacy origin; it never proves a confirmed mapping.
    this.sql.transaction(() => {
      if (!sql.exec(`PRAGMA table_info(oauth_agent)`).toArray().some(row => row["name"] === "pending_op")) sql.exec(`ALTER TABLE oauth_agent ADD COLUMN pending_op TEXT`);
    });
  }

  #admitControl(request: ControlRequest, at = this.ports.now()): ControlAnswer | null {
    const admission = this.#requestWindows.admit(request.action === "retire" || request.action === "revoke-grant" ? "cleanup" : "control", request.actor, at);
    return admission === "allowed" ? null : admission === "limited" ? answer(429, { error: "rate-limited" }) : answer(503, { error: "temporarily_unavailable" });
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
    if (request.agent === null || request.op.length === 0 || utf8(request.op).length > OP_BYTES) return answer(400, { error: "control", rule: "binding" });
    const started = this.#factClock();
    if (started === null) return answer(503, { error: "temporarily_unavailable" });
    const refused = bound(signed, service, "grant", request.agent, body, started); if (refused) return refused;
    const limited = this.#admitControl(signed.request); if (limited) return limited;
    try { oauthGrant(parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body)), context, false); }
    catch (error) { return answer(error instanceof OAuthError ? error.status : 400, { error: error instanceof OAuthError ? error.error : "invalid_request" }); }
    const native = this.sql.exec(`SELECT * FROM agents WHERE agent = ?`, request.agent).toArray()[0];
    if (!native) return answer(404, { error: "agent" });
    const before = this.#control.row(request.op), fingerprint = fingerprintOf(request);
    const observed = await this.#identityFact(request.agent);
    if (observed.status !== "observed") return answer(503, { error: "temporarily_unavailable" });
    const identityAt = this.#factClock();
    if (identityAt === null || identityAt < started) return answer(503, { error: "temporarily_unavailable" });
    const identity = observed.identity;
    if (!same(identity.membership, request.membership)) return answer(403, { error: "unauthorized", rule: "membership" });
    if (identity.handle !== native["handle"]) return answer(409, { error: "op", rule: "stale" });
    const needsCredential = !before || before.state === "reserved";
    if (needsCredential && identity.state !== "enrolled") return identity.state === "retired" ? answer(409, { error: "retired" }) : answer(503, { error: "temporarily_unavailable" });
    const admitted = await this.#existingGrantAuthority(request, identity, needsCredential);
    if (!admitted.ok) return admitted.result;
    if (admitted.at < identityAt) return answer(503, { error: "temporarily_unavailable" });
    const expired = bound(signed, service, "grant", request.agent, body, admitted.at); if (expired) return expired;
    const reserved = this.sql.transaction((): ControlAnswer | { control: NonNullable<ReturnType<ControlPlane["row"]>>; mapping: Record<string, unknown> } => {
      const currentNative = this.sql.exec(`SELECT * FROM agents WHERE agent = ?`, request.agent).toArray()[0];
      if (!same(currentNative ?? null, native)) return answer(409, { error: "op", rule: "stale" });
      const prior = this.#control.row(request.op);
      if (prior) {
        if (prior.fingerprint !== fingerprint || prior.action !== "grant" || prior.agent !== request.agent) return answer(409, { error: "op", rule: "fingerprint" });
        if (prior.state !== "reserved") return this.#control.retained(prior, admitted.at) ?? answer(409, { error: "op", rule: "stale" });
      }
      if (!same(prior, before)) return answer(503, { error: "temporarily_unavailable" });
      if (admitted.controller === null) return answer(503, { error: "temporarily_unavailable" });
      const mapping = this.#mapping(admitted.controller, context.client.client_id);
      if (mapping) {
        // Ruled legacy unknown origin: no operation may claim, confirm or delete it.
        if (mapping["pending_op"] === null) return answer(503, { error: "temporarily_unavailable" });
        if (mapping["agent"] !== request.agent || mapping["handle"] !== identity.handle || mapping["pending_op"] !== "" && mapping["pending_op"] !== request.op)
          return answer(409, { error: "existing-agent", agent: mapping["agent"], handle: mapping["handle"] });
      }
      if (!prior) {
        const created = timeOf(admitted.at);
        const bytes = mapping ? 0 : this.#mappingBytes({ controller: admitted.controller, client_id: context.client.client_id, agent: request.agent, handle: identity.handle, created, pending_op: request.op });
        if (!this.#control.charge(CONTROL_ROW_BYTES + bytes, "grant")) return answer(507, { error: "full", rule: "control-budget" });
        this.#control.insert(request.op, fingerprint, "grant", request.agent, "reserved", request.notAfter, created);
        if (!mapping) this.sql.exec(`INSERT INTO oauth_agent (controller, client_id, agent, handle, created, pending_op) VALUES (?, ?, ?, ?, ?, ?)`, admitted.controller, context.client.client_id, request.agent, identity.handle, created, request.op);
      } else if (!mapping) return answer(409, { error: "op", rule: "stale" });
      const owned = this.#mapping(admitted.controller, context.client.client_id), control = this.#control.row(request.op);
      if (!owned || !control) throw Error("Reserved hosted grant owner missing");
      return { mapping: owned, control };
    });
    if ("status" in reserved) return reserved;
    let handoff: ControlAnswer | RetiredStoreStop;
    try { handoff = await this.ports.agent(request.agent).grant?.(signed, body, context) ?? answer(503, { error: "unavailable" }); }
    catch { return answer(503, { error: "temporarily_unavailable" }); }
    if (isRetiredStoreStop(handoff)) return answer(503, { error: "unavailable" });
    const result = handoff;
    const handoffAt = this.#factClock();
    if (handoffAt === null || handoffAt < admitted.at) return this.#withheldGrant(result, answer(503, { error: "temporarily_unavailable" }));
    const finalIdentity = await this.#identityFact(request.agent);
    if (finalIdentity.status !== "observed") return this.#withheldGrant(result, answer(503, { error: "temporarily_unavailable" }));
    const finalIdentityAt = this.#factClock();
    if (finalIdentityAt === null || finalIdentityAt < handoffAt) return this.#withheldGrant(result, answer(503, { error: "temporarily_unavailable" }));
    if (!same(finalIdentity.identity, identity)) return this.#withheldGrant(result, finalIdentity.identity.state === "retired" ? answer(409, { error: "retired" }) : answer(409, { error: "op", rule: "stale" }));
    const final = await this.#existingGrantAuthority(request, finalIdentity.identity, true);
    if (!final.ok) return this.#withheldGrant(result, final.result);
    if (final.at < finalIdentityAt) return this.#withheldGrant(result, answer(503, { error: "temporarily_unavailable" }));
    const late = bound(signed, service, "grant", request.agent, body, final.at);
    if (late) return this.#withheldGrant(result, late);
    return this.sql.transaction(() => {
      const current = this.#control.row(request.op);
      if (current && current.fingerprint === fingerprint && current.action === "grant" && current.agent === request.agent && current.state !== "reserved")
        return this.#control.retained(current, final.at) ?? answer(409, { error: "op", rule: "stale" });
      const mapping = this.#mapping(String(reserved.mapping["controller"]) as MemberId, String(reserved.mapping["client_id"]));
      const currentNative = this.sql.exec(`SELECT * FROM agents WHERE agent = ?`, request.agent).toArray()[0];
      if (!same(current, reserved.control) || !same(mapping, reserved.mapping) || !same(currentNative ?? null, native))
        return this.#withheldGrant(result, answer(409, { error: "op", rule: "stale" }));
      if (this.#resumableGrant(result)) return retainedAnswer(result);
      if (result.status >= 300 && (result.status < 400 || result.status >= 500)) return this.#withheldGrant(result, answer(503, { error: "temporarily_unavailable" }));
      if (!this.#settleOwnedMapping(reserved.mapping, request.op, result.status < 300)) return this.#withheldGrant(result, answer(409, { error: "op", rule: "stale" }));
      this.#control.complete(request.op, result.status < 300 ? "complete" : "refused", result);
      return result.status < 300 ? result : retainedAnswer(result);
    });
  }

  #factClock(): number | null {
    const now = this.ports.now();
    return Number.isSafeInteger(now) && now >= 0 && Number.isSafeInteger(now + 5000) ? now : null;
  }
  async #identityFact(agent: string): Promise<HostedAgentIdentityRead> {
    const started = this.#factClock();
    if (started === null) return { status: "unavailable" };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = await Promise.race([this.ports.agent(agent).roleIdentity(), new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 5000); })]);
      const after = this.#factClock();
      return after !== null && after >= started && after < started + 5000 ? hostedAgentIdentity(agent, value) : { status: "unavailable" };
    } catch { return { status: "unavailable" }; }
    finally { if (timer !== undefined) clearTimeout(timer); }
  }
  async #existingGrantAuthority(request: ControlRequest, identity: Pick<HostedAgentIdentity, "handle"> & { key: KeyId | null }, credential: boolean, preEnrollment = false, expectedController: MemberId | null = null): Promise<{ ok: true; controller: MemberId | null; at: number; keyAssociated: boolean } | { ok: false; result: ControlAnswer }> {
    const started = this.#factClock();
    if (started === null) return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
    const asked: HostedRoleRequest = { membership: request.membership, agent: identity.handle, agentKey: identity.key, expectedController, actor: request.actor };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = await Promise.race([this.ports.roleStanding(asked), new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 5000); })]);
      const at = this.#factClock();
      if (at === null || at < started || at >= started + 5000) return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
      const read = hostedRoleRead(asked, value);
      if (read.status !== "observed") return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
      const actor = read.actor;
      if (!actor || actor.keyState !== "active" || actor.memberState !== "active" || !actor.actions.includes("membership.manage") && actor.member !== read.agent.controller)
        return { ok: false, result: answer(403, { error: "unauthorized" }) };
      if (credential) {
        if (preEnrollment) {
          // Only the creation caller's unchanged same-op reservation/stage may select this PRIVATE preflight.
          // The request still names any known exact key; a missing Native key is never rewritten to null.
          const agent = read.agent, controller = read.controller, key = read.agentKey;
          if (agent.state !== "active" || !controller || controller.state !== "active" || agent.controller !== controller.member
            || expectedController !== null && agent.controller !== expectedController || !agent.actions.every(action => controller.actions.includes(action)))
            return { ok: false, result: answer(403, { error: "unauthorized", rule: "controller-role" }) };
          if (key && (key.key !== identity.key || key.keyState !== "active" || key.memberState !== "active" || key.member !== agent.member || key.controller !== agent.controller))
            return { ok: false, result: answer(403, { error: "unauthorized", rule: "controller-role" }) };
          if (key && (agent.activeKey !== true || !same(key.actions, agent.actions))) return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
        } else {
          const decision = agentRoleDecision(asked, read);
          if (decision.status === "unavailable") return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
          if (decision.status !== "active") return { ok: false, result: answer(403, { error: "unauthorized", rule: "controller-role" }) };
        }
      }
      // Association is independent of credential-use policy for retained receipts.
      const keyAssociated = identity.key !== null && read.agentKey !== null
        && read.agentKey.key === identity.key && read.agentKey.member === identity.handle;
      return { ok: true, controller: read.agent.controller, at, keyAssociated };
    } catch { return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) }; }
    finally { if (timer !== undefined) clearTimeout(timer); }
  }
  #mapping(controller: MemberId, client: string): Record<string, unknown> | null {
    return this.sql.exec(`SELECT controller, client_id, agent, handle, created, pending_op FROM oauth_agent WHERE controller = ? AND client_id = ?`, controller, client).toArray()[0] ?? null;
  }
  #mappingBytes(row: Record<string, unknown>): number {
    return ["controller", "client_id", "agent", "handle", "created"].reduce((n, key) => n + utf8(String(row[key])).length, ROW_OVERHEAD)
      + (typeof row["pending_op"] === "string" ? utf8(row["pending_op"]).length : 0);
  }
  #resumableGrant(result: ControlAnswer): boolean {
    return result.status >= 500 || result.status === 403 && result.body["rule"] === "controller-role"
      || result.status === 409 && result.body["error"] === "op" && result.body["rule"] === "stale"
      || result.status >= 300 && (result.body["codeShown"] === true || result.body["bearerShown"] === true || Object.hasOwn(result.body, "code") || Object.hasOwn(result.body, "bearer"));
  }
  #withheldGrant(result: ControlAnswer, failure: ControlAnswer): ControlAnswer {
    const committed = result.body["codeShown"] === true || result.body["bearerShown"] === true || Object.hasOwn(result.body, "code") || Object.hasOwn(result.body, "bearer");
    return committed ? answer(failure.status, { ...retainedAnswer(result).body, ...failure.body,
      next: "This attempt committed a one-shot credential but returned no credential plaintext. Its retained receipt cannot redisplay the secret. Do not expect a later role change or same-operation replay to recover it." }) : failure;
  }
  #settleOwnedMapping(snapshot: Record<string, unknown>, op: string, success: boolean): boolean {
    const current = this.#mapping(String(snapshot["controller"]) as MemberId, String(snapshot["client_id"]));
    if (!same(current, snapshot)) return false;
    if (snapshot["pending_op"] === "") return true; // Confirmed mappings are never claimed by a later op.
    if (snapshot["pending_op"] !== op) return false;
    if (success) {
      this.sql.exec(`UPDATE oauth_agent SET pending_op = '' WHERE controller = ? AND client_id = ? AND pending_op = ?`, snapshot["controller"] as string, snapshot["client_id"] as string, op);
      this.#control.charge(-utf8(op).length, "retire");
    } else {
      this.sql.exec(`DELETE FROM oauth_agent WHERE controller = ? AND client_id = ? AND pending_op = ?`, snapshot["controller"] as string, snapshot["client_id"] as string, op);
      this.#control.charge(-this.#mappingBytes(snapshot), "retire");
    }
    return true;
  }
  async connections(signed: SignedControl, body: Uint8Array, service: string): Promise<ControlAnswer> {
    const started = this.#factClock();
    if (started === null) return answer(503, { error: "temporarily_unavailable" });
    const refused = bound(signed, service, "connections", null, body, started); if (refused) return refused;
    const limited = this.#admitControl(signed.request, started); if (limited) return limited;
    let after: string, controller: MemberId | undefined;
    try { const row = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body)); if (!(closed(row, ["after"]) || closed(row, ["after", "controller"])) || row["after"] !== null && (typeof row["after"] !== "string" || !/^[0-9a-f]{64}$/.test(row["after"])) || Object.hasOwn(row, "controller") && !isMemberId(row["controller"])) return answer(400, { error: "invalid_request" }); after = row["after"] as string ?? ""; controller = row["controller"] as MemberId | undefined; }
    catch { return answer(400, { error: "invalid_request" }); }
    const request = signed.request, asked: HostedActorRequest = { membership: { ...request.membership }, actor: request.actor };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      mcpRead();
      const value = await Promise.race([this.ports.roleStanding(asked), new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 5000); })]);
      const at = this.#factClock(), read = hostedRoleRead(asked, value);
      if (at === null || at < started || at >= started + 5000 || read.status !== "observed") return answer(503, { error: "temporarily_unavailable" });
      const key = read.actor;
      if (!key || key.keyState !== "active" || key.memberState !== "active") return answer(403, { error: "unauthorized" });
      if (controller !== undefined && controller !== key.member && !key.actions.includes("membership.manage")) return answer(403, { error: "unauthorized" });
      const final = this.#factClock();
      if (final === null || final < at || final >= started + 5000) return answer(503, { error: "temporarily_unavailable" });
      const expired = bound(signed, service, "connections", null, body, final); if (expired) return expired;
      const rows = this.sql.exec(`SELECT agent, handle, client_id, created FROM oauth_agent WHERE controller = ? AND agent > ? ORDER BY agent LIMIT 9`, controller ?? key.member, after).toArray();
      return answer(200, { agents: rows.slice(0, 8), next: rows.length > 8 ? rows[7]!["agent"] : null });
    } catch { return answer(503, { error: "temporarily_unavailable" }); }
    finally { if (timer !== undefined) clearTimeout(timer); }
  }
  async #creation(signed: SignedControl, body: Uint8Array, service: string, context?: OAuthGrantContext): Promise<ControlAnswer> {
    const started = this.#factClock(), action = context ? "grant" : "create";
    if (started === null) return answer(503, { error: "temporarily_unavailable" });
    const refused = bound(signed, service, action, null, body, started); if (refused) return refused;
    const limited = this.#admitControl(signed.request); if (limited) return limited;
    const request = signed.request;
    if (request.op.length === 0 || utf8(request.op).length > OP_BYTES) return answer(400, { error: "control", rule: "binding" });
    let link: AgentKeyInvitation | null = null;
    try {
      const given = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body));
      link = context ? agentKeyInvitationOf(oauthGrant(given, context, true).link!) : closed(given, ["link"]) && typeof given["link"] === "string" ? agentKeyInvitationOf(given["link"]) : null;
    } catch (error) { if (error instanceof OAuthError) return answer(error.status, { error: error.error }); }
    if (!link || !isMemberId(link.handle)) return answer(400, { error: "link", rule: "agent-key-invitation" });
    if (link.service !== service) return answer(400, { error: "link", rule: "service" });
    if (!same(link.repository.membership, request.membership)) return answer(400, { error: "link", rule: "membership" });
    const handle = link.handle, controller = link.controller.member, fingerprint = fingerprintOf(request);
    type CreationControl = NonNullable<ReturnType<ControlPlane["row"]>>;
    let before = this.#control.row(request.op);
    let identity: HostedAgentIdentityRead | null = null, key: KeyId | null = null, preEnrollment = true, credential = true;
    let admissionAt = started, floor = started, adoptions = 0;
    const stillBefore = () => same(this.#control.row(request.op), before);
    // A same-request row can progress only absent -> reserved -> terminal.
    // Adoption never grants authority: the next phase reads its actual Agent
    // identity and obtains fresh appropriate standing before using this row.
    const adoptSameCreation = (current: CreationControl | null): boolean => {
      if (adoptions >= 2 || current === null || current.agent === null || current.fingerprint !== fingerprint || current.action !== action
        || !["reserved", "complete", "refused"].includes(current.state)) return false;
      if (before !== null && (before.state !== "reserved" || current.state === "reserved"
        || current.agent !== before.agent || current.fingerprint !== before.fingerprint
        || current.action !== before.action || current.notAfter !== before.notAfter)) return false;
      before = current;
      adoptions++;
      return true;
    };
    for (;;) {
      // Only call-local facts are replaced; no authority or result is shared.
      identity = null; key = null; preEnrollment = true; credential = true;
      let preflightAt = floor;
      if (before) {
        if (before.fingerprint !== fingerprint || before.action !== action || before.agent === null) return answer(409, { error: "op", rule: "fingerprint" });
        identity = await this.#identityFact(before.agent);
        const identityAt = this.#factClock();
        if (identityAt === null || identityAt < floor || identity.status === "unavailable") return answer(503, { error: "temporarily_unavailable" });
        preflightAt = identityAt;
        if (identity.status === "absent") {
          if (before.state !== "reserved") return answer(503, { error: "temporarily_unavailable" });
          const current = this.#control.row(request.op);
          if (!same(current, before)) {
            const expired = bound(signed, service, action, null, body, identityAt); if (expired) return expired;
            if (!adoptSameCreation(current)) return answer(503, { error: "temporarily_unavailable" });
            floor = identityAt;
            continue;
          }
        } else {
          const observed = identity.identity;
          if (observed.op !== request.op || observed.handle !== handle || !same(observed.membership, request.membership)) return answer(409, { error: "op", rule: "stale" });
          key = observed.key;
          preEnrollment = before.state === "reserved" && observed.state === "enrolling";
          credential = before.state === "reserved" && (observed.state === "enrolling" || observed.state === "enrolled");
          if (preEnrollment) {
            const current = this.#control.row(request.op);
            if (!same(current, before)) {
              const expired = bound(signed, service, action, null, body, identityAt); if (expired) return expired;
              if (!adoptSameCreation(current)) return answer(503, { error: "temporarily_unavailable" });
              floor = identityAt;
              continue;
            }
          }
        }
      } else {
        const current = this.#control.row(request.op);
        if (!same(current, before)) {
          if (!adoptSameCreation(current)) return answer(503, { error: "temporarily_unavailable" });
          continue;
        }
      }
      const admitted = await this.#existingGrantAuthority(request, { handle, key }, credential, preEnrollment, controller);
      if (!admitted.ok) return admitted.result;
      if (admitted.at < preflightAt) return answer(503, { error: "temporarily_unavailable" });
      const current = this.#control.row(request.op);
      if (!same(current, before)) {
        const expired = bound(signed, service, action, null, body, admitted.at); if (expired) return expired;
        if (!adoptSameCreation(current)) return answer(503, { error: "temporarily_unavailable" });
        floor = admitted.at;
        continue;
      }
      if (identity?.status === "observed" && identity.identity.state === "enrolled" && !admitted.keyAssociated)
        return answer(403, { error: "unauthorized", rule: "controller-role" });
      admissionAt = admitted.at;
      break;
    }
    let expired = bound(signed, service, action, null, body, admissionAt); if (expired) return expired;
    if (context && !before) {
      const mapping = this.#mapping(controller, context.client.client_id);
      if (mapping) {
        if (mapping["pending_op"] === null) return answer(503, { error: "temporarily_unavailable" });
        if (mapping["pending_op"] !== "") return answer(409, { error: "existing-agent", agent: mapping["agent"], handle: mapping["handle"] });
        const retired = await this.#identityFact(String(mapping["agent"]));
        if (retired.status !== "observed") return answer(503, { error: "temporarily_unavailable" });
        const retiredAt = this.#factClock();
        if (retiredAt === null || retiredAt < admissionAt || !same(retired.identity.membership, request.membership) || retired.identity.handle !== mapping["handle"]) return answer(503, { error: "temporarily_unavailable" });
        if (retired.identity.state !== "retired") return answer(409, { error: "existing-agent", agent: mapping["agent"], handle: mapping["handle"] });
        const again = await this.#existingGrantAuthority(request, { handle, key: null }, true, true, controller);
        if (!again.ok) return again.result;
        if (again.at < retiredAt) return answer(503, { error: "temporarily_unavailable" });
        expired = bound(signed, service, action, null, body, again.at); if (expired) return expired;
        const removed = this.sql.transaction(() => {
          if (!stillBefore() || !same(this.#mapping(controller, context.client.client_id), mapping)) return false;
          this.sql.exec(`DELETE FROM oauth_agent WHERE controller = ? AND client_id = ? AND pending_op = ''`, controller, context.client.client_id);
          this.#control.charge(-this.#mappingBytes(mapping), "retire");
          return true;
        });
        if (!removed) return answer(409, { error: "op", rule: "stale" });
        admissionAt = again.at;
      }
    }
    const reserved = this.sql.transaction((): ControlAnswer | { agent: string; control: NonNullable<ReturnType<ControlPlane["row"]>>; mapping: Record<string, unknown> | null; native: Record<string, unknown> | null } => {
      const current = this.#control.row(request.op);
      if (current && current.fingerprint === fingerprint && current.action === action && current.state !== "reserved" && (before === null || current.agent === before.agent)) {
        this.#control.expire(admissionAt);
        return this.#control.retained(this.#control.row(request.op)!, admissionAt) ?? answer(409, { error: "op", rule: "stale" });
      }
      if (!same(current, before)) return answer(503, { error: "temporarily_unavailable" });
      // Keep the original bounded retention sweep after authority and owner checks, before reservation.
      this.#control.expire(admissionAt);
      let agent = current?.agent ?? null;
      let mapping = context ? this.#mapping(controller, context.client.client_id) : null;
      if (context && mapping) {
        if (mapping["pending_op"] === null) return answer(503, { error: "temporarily_unavailable" });
        if (!current || mapping["agent"] !== agent || mapping["handle"] !== handle || mapping["pending_op"] !== "" && mapping["pending_op"] !== request.op)
          return answer(409, { error: "existing-agent", agent: mapping["agent"], handle: mapping["handle"] });
      }
      if (!current) {
        const created = timeOf(admissionAt);
        const bytes = context ? this.#mappingBytes({ controller, client_id: context.client.client_id, agent: "a".repeat(64), handle, created, pending_op: request.op }) : 0;
        if (!this.#control.charge(CONTROL_ROW_BYTES + bytes, action)) return answer(507, { error: "full", rule: "control-budget" });
        agent = this.ports.mintId();
        if (this.sql.exec(`SELECT agent FROM agents WHERE agent = ?`, agent).toArray().length) throw Error("Fresh hosted Agent id already registered");
        this.#control.insert(request.op, fingerprint, action, agent, "reserved", request.notAfter, created);
        if (context) this.sql.exec(`INSERT INTO oauth_agent (controller, client_id, agent, handle, created, pending_op) VALUES (?, ?, ?, ?, ?, ?)`, controller, context.client.client_id, agent, handle, created, request.op);
        mapping = context ? this.#mapping(controller, context.client.client_id) : null;
      } else if (context && !mapping) return answer(409, { error: "op", rule: "stale" });
      if (agent === null) throw Error("Reserved creation target missing");
      const owned = this.#control.row(request.op);
      if (!owned) throw Error("Reserved creation owner missing");
      return { agent, control: owned, mapping, native: this.sql.exec(`SELECT * FROM agents WHERE agent = ?`, agent).toArray()[0] ?? null };
    });
    if ("status" in reserved) return reserved;
    this.ports.fault?.("reservation");
    const target = this.ports.agent(reserved.agent);
    let handoff: ControlAnswer | RetiredStoreStop;
    try { handoff = context ? await target.grant?.(signed, body, context) ?? answer(503, { error: "unavailable" }) : await target.create(request.op, request, link); }
    catch { return answer(503, { error: "temporarily_unavailable" }); }
    if (isRetiredStoreStop(handoff)) return answer(503, { error: "unavailable" });
    const given = handoff;
    const handoffAt = this.#factClock();
    if (handoffAt === null || handoffAt < admissionAt) return this.#withheldGrant(given, answer(503, { error: "temporarily_unavailable" }));
    const after = await this.#identityFact(reserved.agent);
    const identityAt = this.#factClock();
    if (after.status === "unavailable" || identityAt === null || identityAt < handoffAt) return this.#withheldGrant(given, answer(503, { error: "temporarily_unavailable" }));
    const stillReserved = () => same(this.#control.row(request.op), reserved.control);
    let finalKey: KeyId | null = null, finalPre = true, finalCredential = true;
    if (after.status === "absent") {
      if (identity?.status === "observed" || !stillReserved() || given.status < 300) return this.#withheldGrant(given, answer(503, { error: "temporarily_unavailable" }));
    } else {
      const observed = after.identity;
      if (observed.op !== request.op || observed.handle !== handle || !same(observed.membership, request.membership)
        || identity?.status === "observed" && observed.key !== identity.identity.key) return this.#withheldGrant(given, answer(409, { error: "op", rule: "stale" }));
      finalKey = observed.key;
      finalPre = observed.state === "enrolling";
      finalCredential = observed.state === "enrolling" || observed.state === "enrolled";
      if (finalPre && (!stillReserved() || given.status < 300)) return this.#withheldGrant(given, answer(503, { error: "temporarily_unavailable" }));
      if (!finalCredential && given.status < 300) return this.#withheldGrant(given, observed.state === "retired" ? answer(409, { error: "retired" }) : answer(503, { error: "temporarily_unavailable" }));
    }
    const final = await this.#existingGrantAuthority(request, { handle, key: finalKey }, finalCredential, finalPre, controller);
    const result = after.status === "observed" && after.identity.state === "enrolled" ? answer(given.status, { ...given.body, agent: reserved.agent, handle }) : given;
    if (!final.ok) return this.#withheldGrant(result, final.result);
    if (final.at < identityAt) return this.#withheldGrant(result, answer(503, { error: "temporarily_unavailable" }));
    expired = bound(signed, service, action, null, body, final.at); if (expired) return this.#withheldGrant(result, expired);
    this.ports.fault?.("complete");
    return this.sql.transaction(() => {
      const current = this.#control.row(request.op);
      if (current && current.fingerprint === fingerprint && current.action === action && current.agent === reserved.agent && current.state !== "reserved") return this.#control.retained(current, final.at) ?? answer(409, { error: "op", rule: "stale" });
      const mapping = context ? this.#mapping(controller, context.client.client_id) : null;
      const registered = this.sql.exec(`SELECT * FROM agents WHERE agent = ?`, reserved.agent).toArray()[0] ?? null;
      if (!same(current, reserved.control) || !same(mapping, reserved.mapping) || !same(registered, reserved.native)) return this.#withheldGrant(result, answer(409, { error: "op", rule: "stale" }));
      if (this.#resumableGrant(result)) return retainedAnswer(result);
      if (result.status >= 300 && (result.status < 400 || result.status >= 500)) return this.#withheldGrant(result, answer(503, { error: "temporarily_unavailable" }));
      if (context && (!reserved.mapping || !this.#settleOwnedMapping(reserved.mapping, request.op, result.status < 300))) return this.#withheldGrant(result, answer(409, { error: "op", rule: "stale" }));
      this.#control.complete(request.op, result.status < 300 ? "complete" : "refused", result);
      if (!registered) this.sql.exec(`INSERT INTO agents (agent, handle, key, state, created) VALUES (?, ?, ?, ?, ?)`, reserved.agent, handle,
        after.status === "observed" ? after.identity.key : null, after.status === "observed" ? after.identity.state : "refused", timeOf(final.at));
      return result.status < 300 ? result : retainedAnswer(result);
    });
  }
}

// ---------------------------------------------------------------- the agent

export interface AgentPorts extends Authority, HostedRolePorts {
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
  readonly #requestWindows: McpRequestWindows;
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
    this.#requestWindows = new McpRequestWindows(sql);
    this.#control.migrateBearerAnswers(true);
    sql.exec(`CREATE TABLE IF NOT EXISTS agent_retirement (id INTEGER PRIMARY KEY CHECK (id = 1), revoke TEXT)`);
    // Old endpoint-only retirements must not retain their signing seed.
    sql.exec(`UPDATE agent SET seed = ? WHERE state = 'retired' AND length(seed) <> 0`, new Uint8Array());
    this.#oauth = new OAuthAccess(sql, { now: ports.now, roleStanding: hostedRolePort(request => ports.roleStanding(request)),
      agent: () => { const row = this.#row(); return row ? { op: row.op, configuration: canonicalize(row.config), state: row.state, membership: { ...row.membership }, key: row.key, handle: row.handle } : null; },
      charge: bytes => { this.#control.charge(bytes, "retire"); } });
    this.#oauthHttp = new OAuthHttpLayers(this.#oauth, { now: ports.now, ...(ports.scheduleExpiry ? { schedule: ports.scheduleExpiry } : {}) });
    this.#issuer = new OAuthIssuer(sql, { id: ports.id, now: ports.now, random: ports.random,
      agent: () => { const row = this.#row(); return row ? { op: row.op, configuration: canonicalize(row.config), state: row.state, membership: { ...row.membership }, key: row.key, handle: row.handle } : null; },
      charge: bytes => this.#control.charge(bytes, "grant"),
      standing: controller => this.#grantStanding(controller),
      issueOwner: op => this.#issueOwner(op),
      rotated: id => this.#oauthHttp.closeGrant(id, true),
      ended: async (id, current) => {
        if (!current()) throw new OAuthError("temporarily_unavailable", 503);
        this.sql.transaction(() => {
          const rows = this.sql.exec(`SELECT row FROM oauth_session WHERE grant_id = ?`, id).toArray();
          this.sql.exec(`DELETE FROM oauth_session WHERE grant_id = ?`, id);
          this.#control.charge(-rows.reduce((n, row) => n + utf8(String(row["row"])).length + ROW_OVERHEAD, 0), "retire");
        });
        await this.#oauthHttp.closeGrant(id);
        if (!current()) throw new OAuthError("temporarily_unavailable", 503);
      },
    }, this.#oauth);
  }

  #admitControl(request: ControlRequest, at = this.ports.now()): ControlAnswer | null {
    const admission = this.#requestWindows.admit(request.action === "retire" || request.action === "revoke-grant" ? "cleanup" : "control", request.actor, at);
    return admission === "allowed" ? null : admission === "limited" ? answer(429, { error: "rate-limited" }) : answer(503, { error: "temporarily_unavailable" });
  }


  #issuerClock(): number | null {
    const now = this.ports.now();
    return Number.isSafeInteger(now) && now >= 0 && Number.isSafeInteger(now + 5000) ? now : null;
  }
  #issuerAgentOwner(row: AgentRow): string {
    return canonicalize({ op: row.op, state: row.state, membership: row.membership, key: row.key, handle: row.handle, config: row.config });
  }
  #sameIssuerAgent(expected: AgentRow): boolean {
    const current = this.#row();
    return current?.state === "enrolled" && this.#issuerAgentOwner(current) === this.#issuerAgentOwner(expected);
  }
  /** Private current caller owner. It is neither a permission nor a replay receipt. */
  #issueOwner(op: string): string | null {
    const now = this.#issuerClock();
    const row = this.sql.exec(`SELECT op, fingerprint, action, agent, state, answer, not_after, created FROM control WHERE op = ?`, op).toArray()[0];
    const until = row && typeof row["not_after"] === "string" ? timeMs(row["not_after"]) : null;
    return now !== null && until !== null && now < until && row?.["op"] === op && row["state"] === "reserved" && row["action"] === "grant"
      && row["agent"] === this.ports.id && row["answer"] === null ? canonicalize(row) : null;
  }
  async #issuerRoleRead(row: Pick<AgentRow, "membership" | "handle"> & { key: KeyId | null }, controller: MemberId | null, actor: KeyId | null, notBefore = 0): Promise<{ read: HostedRoleRead; at: number | null; until: number | null }> {
    const started = this.#issuerClock();
    if (started === null || started < notBefore || !isMemberId(row.handle)) return { read: { status: "unavailable" }, at: null, until: null };
    const asked: HostedRoleRequest = { membership: { ...row.membership }, agent: row.handle, agentKey: row.key, expectedController: controller, actor };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      mcpRead();
      const value = await Promise.race([this.ports.roleStanding(asked), new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 5000); })]);
      const at = this.#issuerClock();
      return at !== null && at >= started && at < started + 5000
        ? { read: hostedRoleRead(asked, value), at, until: started + 5000 }
        : { read: { status: "unavailable" }, at: null, until: null };
    } catch { return { read: { status: "unavailable" }, at: null, until: null }; }
    finally { if (timer !== undefined) clearTimeout(timer); }
  }
  async #grantStanding(controller: MemberId): Promise<HostedRoleDecision> {
    const row = this.#row();
    if (!row || row.state !== "enrolled") return { status: "inactive", reason: "agent-inactive" };
    const facts = await this.#issuerRoleRead(row, controller, null);
    if (!this.#sameIssuerAgent(row)) return { status: "inactive", reason: "owner-changed" };
    if (!isMemberId(row.handle)) return { status: "unavailable" };
    return agentRoleDecision({ membership: row.membership, agent: row.handle, agentKey: row.key, expectedController: controller, actor: null }, facts.read);
  }

  /** The exact signer, Agent key and controller role come from one membership head. */
  async #grantAuthority(request: ControlRequest, row: AgentRow): Promise<{ ok: true; controller: MemberId; at: number; until: number } | { ok: false; result: ControlAnswer }> {
    const facts = await this.#issuerRoleRead(row, null, request.actor);
    if (!this.#sameIssuerAgent(row)) return { ok: false, result: this.#row()?.state === "retired"
      ? answer(409, { error: "retired" }) : answer(409, { error: "op", rule: "stale" }) };
    if (facts.read.status !== "observed" || facts.at === null || facts.until === null || !isMemberId(row.handle)) return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
    const read = facts.read, actor = read.actor;
    if (!actor || actor.keyState !== "active" || actor.memberState !== "active"
      || !actor.actions.includes("membership.manage") && actor.member !== read.agent.controller)
      return { ok: false, result: answer(403, { error: "unauthorized" }) };
    if (actor.member === read.agent.controller && read.controller && !same(actor.actions, read.controller.actions)) return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
    const decision = agentRoleDecision({ membership: row.membership, agent: row.handle, agentKey: row.key, expectedController: null, actor: request.actor }, read);
    if (decision.status === "unavailable") return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
    if (decision.status !== "active" || read.agent.controller === null) return { ok: false, result: answer(403, { error: "unauthorized", rule: "controller-role" }) };
    return { ok: true, controller: read.agent.controller, at: facts.at, until: facts.until };
  }
  #issuerResultResumable(result: ControlAnswer): boolean {
    return result.status >= 500 || result.status === 403 && result.body["rule"] === "controller-role"
      || result.status >= 300 && result.body["codeShown"] === true;
  }
  #withheldIssuer(result: ControlAnswer, failure: ControlAnswer): ControlAnswer {
    const committed = Object.hasOwn(result.body, "code") || result.status >= 300 && result.body["codeShown"] === true;
    return committed ? answer(failure.status, { ...retainedAnswer(result).body, ...failure.body,
      next: "This attempt committed a one-shot credential but returned no credential plaintext. Its retained receipt cannot redisplay the secret. Do not expect a later role change or same-operation replay to recover it." }) : failure;
  }
  /** Match the held code before any caller-side await; keep its full SQL bytes private. */
  #issuedCodeOwner(result: ControlAnswer, request: ControlRequest, binding: OAuthBinding, controller: MemberId, now: number): { id: string; row: string; expires: number } | null {
    const code = result.body["code"], id = result.body["grant"];
    if (typeof code !== "string" || typeof id !== "string") return null;
    const parts = code.split(".");
    if (parts.length !== 3 || parts[0] !== this.ports.id || parts[1] !== id || !/^[A-Za-z0-9_-]{43}$/.test(parts[2]!)) return null;
    const size = this.sql.exec(`SELECT octet_length(row) AS bytes FROM oauth_issuer WHERE id = ?`, id).toArray()[0]?.["bytes"];
    if (typeof size !== "number" || size > 8192) return null;
    const stored = this.sql.exec(`SELECT id, op, row, state, created FROM oauth_issuer WHERE id = ?`, id).toArray()[0];
    if (!stored || stored["op"] !== request.op || stored["state"] !== "pending" || typeof stored["row"] !== "string") return null;
    try {
      const value: unknown = parseStrict(stored["row"]);
      if (!isRecord(value) || value["op"] !== request.op || value["controller"] !== controller || value["codeUsed"] !== false || value["state"] !== "pending"
        || value["codeDigest"] !== digestBytes(utf8(parts[2]!)) || canonicalize(value["binding"]) !== canonicalize(binding)
        || typeof value["created"] !== "number" || !Number.isSafeInteger(value["created"]) || value["created"] < 0 || value["created"] > now
        || stored["created"] !== value["created"] || typeof value["ends"] !== "number" || !Number.isSafeInteger(value["ends"])
        || typeof value["codeExpires"] !== "number" || !Number.isSafeInteger(value["codeExpires"]) || now >= value["ends"] || now >= value["codeExpires"]) return null;
      return { id, row: canonicalize(stored), expires: Math.min(value["ends"], value["codeExpires"]) };
    } catch { return null; }
  }
  #sameIssuedCode(owner: { id: string; row: string; expires: number }, now: number): boolean {
    const row = this.sql.exec(`SELECT id, op, row, state, created FROM oauth_issuer WHERE id = ?`, owner.id).toArray()[0];
    return now < owner.expires && row !== undefined && canonicalize(row) === owner.row;
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
    const limited = this.#admitControl(signed.request); if (limited) return limited;
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
    const authority = await this.#grantAuthority(request, row);
    if (!authority.ok) return authority.result;
    const controller = authority.controller;
    const expired = bound(signed, service, "grant", first ? null : this.ports.id, body, this.ports.now());
    if (expired) return expired;
    const prior = this.#control.row(request.op), reservationAt = this.#issuerClock();
    if (!this.#sameIssuerAgent(row)) return this.#row()?.state === "retired" ? answer(409, { error: "retired" }) : answer(409, { error: "op", rule: "stale" });
    if (reservationAt === null || reservationAt < authority.at || reservationAt >= authority.until) return answer(503, { error: "temporarily_unavailable" });
    if (prior && prior.fingerprint !== fingerprint) return answer(409, { error: "op", rule: "fingerprint" });
    if (prior?.state !== undefined && prior.state !== "reserved") return this.#control.retained(prior, reservationAt) ?? answer(409, { error: "op", rule: "stale" });
    if (prior && this.#issueOwner(request.op) === null) return answer(409, { error: "op", rule: "stale" });
    if (!prior) {
      const reserved = this.sql.transaction(() => {
        if (!this.#control.reserve("grant")) return false;
        this.#control.insert(request.op, fingerprint, "grant", this.ports.id, "reserved", request.notAfter, timeOf(this.ports.now())); return true;
      });
      if (!reserved) return answer(507, { error: "full", rule: "control-budget" });
    }
    const owner = this.#issueOwner(request.op);
    if (owner === null) return answer(409, { error: "op", rule: "stale" });
    let result: ControlAnswer;
    try {
      let registrationEnds: number | undefined;
      if (isRegisteredOAuthClient(context.client.client_id)) {
        if (!this.ports.retainClient) return answer(503, { error: "temporarily_unavailable" });
        registrationEnds = await this.ports.retainClient(structuredClone(context.client));
        if (!this.#sameIssuerAgent(row) || this.#issueOwner(request.op) !== owner) return this.#row()?.state === "retired" ? answer(409, { error: "retired" }) : answer(409, { error: "op", rule: "stale" });
        const retainedAuthority = await this.#grantAuthority(request, row);
        if (!retainedAuthority.ok) return retainedAuthority.result;
        if (retainedAuthority.controller !== controller || this.#issueOwner(request.op) !== owner) return answer(409, { error: "op", rule: "stale" });
        const retainedAt = this.#issuerClock();
        if (retainedAt === null || retainedAt < reservationAt || retainedAt < retainedAuthority.at || retainedAt >= retainedAuthority.until) return answer(503, { error: "temporarily_unavailable" });
        const late = bound(signed, service, "grant", first ? null : this.ports.id, body, this.ports.now());
        if (late) return late;
      }
      result = await this.#issuer.issue(request.op, controller, given.binding, context.client.client_name, registrationEnds);
    }
    catch (error) { if (!(error instanceof OAuthError)) throw error; return answer(error.status, { error: error.error }); }
    const handoffAt = this.#issuerClock();
    if (handoffAt === null || handoffAt < reservationAt) return this.#withheldIssuer(result, answer(503, { error: "temporarily_unavailable" }));
    const hasCode = Object.hasOwn(result.body, "code");
    const codeOwner = hasCode ? this.#issuedCodeOwner(result, request, given.binding, controller, handoffAt) : null;
    if (hasCode && codeOwner === null) return this.#withheldIssuer(result, answer(409, { error: "op", rule: "stale" }));
    const final = await this.#grantAuthority(request, row);
    this.ports.fault?.("complete");
    return this.sql.transaction(() => {
      if (!this.#sameIssuerAgent(row) || this.#issueOwner(request.op) !== owner) return this.#withheldIssuer(result,
        this.#row()?.state === "retired" ? answer(409, { error: "retired" }) : answer(409, { error: "op", rule: "stale" }));
      if (!final.ok) return this.#withheldIssuer(result, final.result);
      const at = this.#issuerClock();
      if (at === null || at < final.at || at >= final.until || at < handoffAt) return this.#withheldIssuer(result, answer(503, { error: "temporarily_unavailable" }));
      const late = bound(signed, service, "grant", first ? null : this.ports.id, body, at);
      if (late) return this.#withheldIssuer(result, late);
      if (final.controller !== controller || codeOwner !== null && !this.#sameIssuedCode(codeOwner, at)) return this.#withheldIssuer(result, answer(409, { error: "op", rule: "stale" }));
      if (this.#issuerResultResumable(result)) return result;
      this.#control.complete(request.op, result.status < 300 ? "complete" : "refused", result);
      if (first) this.sql.exec(`UPDATE agent SET answer = ? WHERE id = 1 AND op = ?`, JSON.stringify(retainedAnswer(result)), request.op);
      return result;
    });
  }

  exchangeCode(id: string, secret: string, client: string, redirect: string, verifier: string, resource?: string): Promise<OAuthResult> { return this.#issuer.exchange(id, secret, client, redirect, verifier, resource); }
  refreshGrant(id: string, secret: string, client: string, resource?: string): Promise<OAuthResult> { return this.#issuer.refresh(id, secret, client, resource); }
  revokeToken(id: string, secret: string, client: string): Promise<OAuthResult> { return this.#issuer.revokeToken(id, secret, client); }

  connectionControl(signed: SignedControl, action: "connections" | "revoke-grant", body: Uint8Array): Promise<ControlAnswer> {
    return this.#controls.run(async () => {
      const started = this.#issuerClock(), row = this.#row(), request = signed.request;
      if (!row) return answer(404, { error: "agent" });
      if (started === null) return answer(503, { error: "temporarily_unavailable" });
      const refused = bound(signed, row.config.service, action, this.ports.id, body, started); if (refused) return refused;
      const limited = this.#admitControl(request, started); if (limited) return limited;
      if (!same(request.membership, row.membership)) return answer(403, { error: "unauthorized", rule: "membership" });
      const before = this.#managementOwner(request.op), authority = await this.#managementAuthority(request, row, before, started);
      if (!authority.ok) return authority.result;
      let given: unknown;
      try { given = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body)); } catch { return answer(400, { error: "invalid_request" }); }
      if (action === "connections" ? !closed(given, []) : !closed(given, ["grant"]) || typeof given["grant"] !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(given["grant"])) return answer(400, { error: "invalid_request" });
      const at = this.#issuerClock();
      if (at === null || at < authority.at || at >= authority.until || this.#managementOwner(request.op) !== before) return answer(503, { error: "temporarily_unavailable" });
      const expired = bound(signed, row.config.service, action, this.ports.id, body, at); if (expired) return expired;
      if (action === "connections") {
        try { return answer(200, { agent: this.ports.id, handle: row.handle, state: row.state, connections: this.#issuer.list(at) }); }
        catch { return answer(503, { error: "temporarily_unavailable" }); }
      }
      const fingerprint = fingerprintOf(request), existing = this.#control.row(request.op);
      if (existing) {
        if (existing.fingerprint !== fingerprint) return answer(409, { error: "op", rule: "fingerprint" });
        if (existing.state !== "reserved") return this.#control.retained(existing, at) ?? answer(409, { error: "op", rule: "stale" });
      } else if (!this.sql.transaction(() => {
        if (!this.#control.reserve(action)) return false;
        this.#control.insert(request.op, fingerprint, action, this.ports.id, "reserved", request.notAfter, timeOf(at)); return true;
      })) return answer(507, { error: "full", rule: "control-budget" });
      const owned = this.#managementOwner(request.op);
      let floor = at;
      const current = (): boolean => {
        const now = this.#issuerClock();
        if (now === null || now < floor || this.#managementOwner(request.op) !== owned
          || bound(signed, row.config.service, action, this.ports.id, body, now) !== null) return false;
        floor = now; return true;
      };
      try {
        if (!current()) return this.#cleanupStopped();
        const result = await this.#issuer.revokeGrant((given as { grant: string }).grant, current);
        if (!current()) return this.#cleanupStopped();
        const final = await this.#managementAuthority(request, row, owned, floor);
        if (!final.ok || !current() || floor < final.at) return this.#cleanupStopped();
        return this.sql.transaction(() => {
          if (!current()) return this.#cleanupStopped();
          if (floor >= final.until) return this.#cleanupStopped();
          this.#control.complete(request.op, "complete", result); return result;
        });
      } catch { return this.#cleanupStopped(); }
    });
  }

  /** This call's local rows and transport epochs; never stored or returned as authority. */
  #managementOwner(op: string): string {
    return canonicalize({ ...this.#creationOwner(op),
      retirement: this.sql.exec(`SELECT revoke FROM agent_retirement WHERE id = 1`).toArray()[0] ?? null,
      httpEpoch: this.#httpEpoch, oauthEpoch: this.#oauthEpoch });
  }
  #cleanupStopped(): ControlAnswer {
    return answer(503, { error: "temporarily_unavailable", next: "The cleanup may already be in effect. Send the same operation again. Do not start a new operation." });
  }
  /** Management needs the signer/controller facts, never the credential's action subset. */
  async #managementAuthority(request: ControlRequest, row: AgentRow, owner: string, notBefore: number): Promise<
    { ok: true; by: "admin" | "controller"; member: MemberId; at: number; until: number } | { ok: false; result: ControlAnswer }> {
    const facts = await this.#issuerRoleRead(row, null, request.actor, notBefore);
    if (this.#managementOwner(request.op) !== owner || facts.read.status !== "observed" || facts.at === null || facts.until === null)
      return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
    const actor = facts.read.actor;
    if (!actor || actor.keyState !== "active" || actor.memberState !== "active") return { ok: false, result: answer(403, { error: "unauthorized" }) };
    const admin = actor.actions.includes("membership.manage");
    if (!admin && actor.member !== facts.read.agent.controller) return { ok: false, result: answer(403, { error: "unauthorized" }) };
    return { ok: true, by: admin ? "admin" : "controller", member: actor.member, at: facts.at, until: facts.until };
  }

  /** The control budget's used bytes, for a test's eyes. */
  controlUsed(): number { return this.#control.used(); }
  agentState(): string | null { return this.#row()?.state ?? null; }

  /** One synchronous public-column read. Absent means that query returned no row. */
  roleIdentity(): HostedAgentIdentityRead {
    try {
      const row = this.sql.exec(`SELECT op, key, state, membership, handle FROM agent WHERE id = 1`).toArray()[0];
      if (!row) return { status: "absent", agent: this.ports.id };
      if (typeof row["membership"] !== "string" || utf8(row["membership"]).length > CONTROL_BODY_BYTES) return { status: "unavailable" };
      return hostedAgentIdentity(this.ports.id, { status: "observed", identity: {
        agent: this.ports.id, op: row["op"], key: row["key"], state: row["state"],
        membership: parseStrict(row["membership"]), handle: row["handle"],
      } });
    } catch { return { status: "unavailable" }; }
  }

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
      dispatchRequired: true,
      dispatchSource: { op, key, service: config.service, membership: { ...row.membership } },
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

  /** Exact local Agent/control owner, held only in this call. No private bytes leave this object. */
  #creationOwner(op: string): { agent: string | null; control: string | null } {
    const row = this.#row();
    const control = this.sql.exec(`SELECT op, fingerprint, action, agent, state, answer, not_after, created FROM control WHERE op = ?`, op).toArray()[0];
    return { agent: row ? canonicalize({ op: row.op, key: row.key, seed: digestBytes(row.seed), state: row.state,
      membership: row.membership, handle: row.handle, config: row.config, bearer: row.bearer, bearerExpires: row.bearerExpires, answer: row.answer }) : null,
      control: control ? canonicalize(control) : null };
  }
  #staleCreation(): ControlAnswer {
    return this.#row()?.state === "retired" ? answer(409, { error: "retired" }) : answer(409, { error: "op", rule: "stale" });
  }
  async #creationAuthority(request: ControlRequest, link: AgentKeyInvitation, row: AgentRow | null, owner: { agent: string | null; control: string | null }, credential: boolean, preEnrollment: boolean): Promise<{ ok: true; at: number; until: number } | { ok: false; result: ControlAnswer }> {
    if (!isMemberId(link.handle)) return { ok: false, result: answer(400, { error: "link", rule: "agent-key-invitation" }) };
    const facts = await this.#issuerRoleRead({ membership: link.repository.membership, handle: link.handle, key: row?.key ?? null }, link.controller.member, request.actor);
    if (!same(this.#creationOwner(request.op), owner)) return { ok: false, result: this.#staleCreation() };
    if (facts.read.status !== "observed" || facts.at === null || facts.until === null) return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
    const read = facts.read, actor = read.actor;
    if (!actor || actor.keyState !== "active" || actor.memberState !== "active" || !actor.actions.includes("membership.manage") && actor.member !== read.agent.controller)
      return { ok: false, result: answer(403, { error: "unauthorized" }) };
    if (actor.member === read.agent.controller && read.controller && !same(actor.actions, read.controller.actions)) return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
    if (credential && preEnrollment) {
      const agent = read.agent, controller = read.controller, key = read.agentKey;
      if (agent.state !== "active" || !controller || controller.state !== "active" || agent.controller !== controller.member || agent.controller !== link.controller.member
        || !agent.actions.every(action => controller.actions.includes(action))) return { ok: false, result: answer(403, { error: "unauthorized", rule: "controller-role" }) };
      if (key && (key.key !== row?.key || key.keyState !== "active" || key.memberState !== "active" || key.member !== agent.member || key.controller !== agent.controller)) return { ok: false, result: answer(403, { error: "unauthorized", rule: "controller-role" }) };
      if (key && (agent.activeKey !== true || !same(key.actions, agent.actions))) return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
    } else if (credential) {
      const decision = agentRoleDecision({ membership: link.repository.membership, agent: link.handle, agentKey: row?.key ?? null, expectedController: link.controller.member, actor: request.actor }, read);
      if (decision.status === "unavailable") return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
      if (decision.status !== "active" || row === null) return { ok: false, result: answer(403, { error: "unauthorized", rule: "controller-role" }) };
    }
    const now = this.#issuerClock(), until = timeMs(request.notAfter);
    if (now === null || now < facts.at || now >= facts.until) return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
    if (until === null || until <= now || until > now + PROPOSED_BOUNDS.intentLifetimeSeconds * 1000) return { ok: false, result: answer(400, { error: "control", rule: "notAfter" }) };
    return { ok: true, at: now, until: facts.until };
  }

  async #create(op: string, request: ControlRequest, link: AgentKeyInvitation): Promise<ControlAnswer> {
    const now = this.#issuerClock();
    if (now === null) return answer(503, { error: "temporarily_unavailable" });
    if (request.op !== op || op.length === 0 || utf8(op).length > OP_BYTES || request.agent !== null || request.action !== "create" && request.action !== "grant") return answer(400, { error: "control", rule: "binding" });
    if (request.service !== link.service || !same(request.membership, link.repository.membership)) return answer(403, { error: "unauthorized", rule: "membership" });
    this.sql.transaction(() => this.#expire(now));
    let row = this.#row();
    const firstOwner = this.#creationOwner(op), control = this.#control.row(op);
    if (row && (row.op !== op || row.handle !== link.handle || row.state === "enrolling" && row.config.service !== link.service || !same(row.membership, request.membership))) return answer(409, { error: "op", rule: "agent" });
    if (row && (!control || control.fingerprint !== fingerprintOf(request) || control.action !== request.action || control.agent !== this.ports.id)
      || !row && control) return this.#staleCreation();
    if (row?.state === "retired") return answer(409, { error: "retired" });
    if (row && (row.seed.length !== 32 || keyIdOfSecret(row.seed) !== row.key)) return answer(503, { error: "temporarily_unavailable" });
    const terminal = row?.state === "enrolled" || row?.state === "refused";
    const authority = await this.#creationAuthority(request, link, row, firstOwner, !terminal, !row || row.state === "enrolling");
    if (!authority.ok) return authority.result;
    if (authority.at < now) return answer(503, { error: "temporarily_unavailable" });
    if (terminal && row) return row.answer ?? (row.state === "enrolled" && request.action === "grant" ? answer(201, { agent: this.ports.id, key: row.key, handle: row.handle }) : answer(409, { error: "op", rule: "stale" }));
    if (!row) {
      // The seed is written before the envelope is built; the control budget is reserved before the key exists.
      const made = this.sql.transaction((): ControlAnswer | null => {
        if (!same(this.#creationOwner(op), firstOwner)) return this.#staleCreation();
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
    if (row.state !== "enrolling" || this.#control.row(op)?.state !== "reserved") return this.#staleCreation();
    const owner = this.#creationOwner(op);
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
    const stopped: { error: Error; answer: ControlAnswer | null } = { error: new Error("Hosted enrollment admission stopped before submit"), answer: null };
    let admissionAt = authority.at;
    try {
      // Keep and read back the same envelope. A reset or local stop never replaces it.
      await service.custody.keep(identity, meaning, build, notAfter, utf8(canonicalize(fields)).length);
      if (!same(this.#creationOwner(op), owner)) return this.#staleCreation();
      const keptAt = this.#issuerClock();
      if (keptAt === null || keptAt < admissionAt) return answer(503, { error: "temporarily_unavailable" });
      admissionAt = keptAt;
      this.ports.fault?.("kept");
      kept = await service.custody.send(identity, meaning, build, async (envelope) => {
        const ready = await this.#creationAuthority(request, link, row, owner, true, true);
        if (!ready.ok) { stopped.answer = ready.result; throw stopped.error; }
        if (ready.at < admissionAt) { stopped.answer = answer(503, { error: "temporarily_unavailable" }); throw stopped.error; }
        admissionAt = ready.at;
        // The local owner and fresh same-head facts precede the actual submit, with no intervening await.
        try { return await service.reads.transport.submit(M.scope, envelope.signed, [], envelope.beside); }
        catch (error) { if (error instanceof TransportError) throw new Lost(); throw error; }
      }, { notAfter, bytes: utf8(canonicalize(fields)).length });
    } catch (error) {
      if (error === stopped.error && stopped.answer) return answer(stopped.answer.status, { ...stopped.answer.body,
        next: "This call submitted no enrollment. An earlier attempt may still have been sent; resume this same operation to reconcile its kept envelope." });
      if (error instanceof CustodyError) return answer(error.why.held === "full" ? 507 : 503, { error: "custody", rule: error.why.held });
      throw error;
    }
    if (!same(this.#creationOwner(op), owner)) return this.#staleCreation();
    const sentAt = this.#issuerClock();
    if (sentAt === null || sentAt < admissionAt) return answer(503, { error: "temporarily_unavailable" });
    admissionAt = sentAt;
    if ("lost" in kept) return answer(503, { error: "unresolved", op });
    // The hosted agent never folds a record: a folded record has no answer to give here.
    if ("folded" in kept) return answer(503, { error: "custody", rule: "unreadable" });
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
    // The admitted entry must hold the exact kept envelope before any credential is minted.
    const fact = kept.answer.receipt.fact;
    service.reads.forget(M.scope);
    const entry = await service.reads.read(M, (t, r) => t.entry(M.scope, r, fact.seq, { at: fact.at, head: fact.seq }));
    if (!same(this.#creationOwner(op), owner)) return this.#staleCreation();
    const entryAt = this.#issuerClock();
    if (entryAt === null || entryAt < admissionAt) return answer(503, { error: "temporarily_unavailable" });
    admissionAt = entryAt;
    if (!entry.ok) return answer(503, { error: "unresolved", op, rule: "read-back" });
    const input = entry.value.entry.input;
    if (entry.value.hash !== fact.hash || input.type !== "act" || canonicalize(input.signed) !== canonicalize(kept.record.envelope.signed)) return answer(409, { error: "enrol", rule: "entry" });
    // Enrollment is now accepted: its known exact Native key must be active. No enrollment-null exception applies.
    const final = await this.#creationAuthority(request, link, row, owner, true, false);
    if (!final.ok) return final.result;
    if (final.at < admissionAt) return answer(503, { error: "temporarily_unavailable" });
    this.ports.fault?.("accepted");
    const inbox = entry.value.entry.sends.flatMap((send) => ("creator" in send.to && send.to.kind === "inbox" ? [scopeIdOf(send.to as Seed)] : []))[0];
    // The terminal transaction owns the exact row/control; no await follows the mint.
    const decided = this.sql.transaction((): ControlAnswer => {
      if (!same(this.#creationOwner(op), owner)) return this.#staleCreation();
      const at = this.#issuerClock();
      if (at === null || at < final.at || at >= final.until) return answer(503, { error: "temporarily_unavailable" });
      if (at >= timeMs(request.notAfter)!) return answer(400, { error: "control", rule: "notAfter" });
      const current = this.#row()!;
      const config: McpConfig = { ...current.config, repository: { ...link.repository, ...(inbox ? { inbox } : {}) } };
      if (request.action === "grant") {
        this.sql.exec(`UPDATE agent SET state = 'enrolled', config = ?, updated = ? WHERE id = 1`, canonicalize(config as never), timeOf(at));
        return answer(201, { agent: this.ports.id, key: signer.key, handle: link.handle, member: fact });
      }
      const issued = at, bearerExpires = timeOf(issued + BEARER_LIFETIME_MS);
      if (!this.#control.charge(utf8(bearerExpires).length, "create")) throw new Error("SQLITE_FULL: the bearer expiry cannot be stored.");
      const secret = b64url(this.ports.random(32));
      const result = answer(201, { agent: this.ports.id, key: signer.key, handle: link.handle, member: fact, bearer: `${this.ports.id}.${secret}`, bearerExpires });
      this.sql.exec(`UPDATE agent SET state = 'enrolled', bearer = ?, bearer_expires = ?, answer = ?, config = ?, updated = ? WHERE id = 1`, digestBytes(utf8(secret)), bearerExpires, JSON.stringify(retainedAnswer(result)), canonicalize(config as never), timeOf(issued));
      this.#control.complete(op, "complete", result);
      return result;
    });
    this.#service = null;
    this.#transport?.abrupt();
    this.#transport = null;
    return decided;
  }

  /** Controls serialize rotation and retirement; shutdown commits before outside work. */
  control(signed: SignedControl, action: "bearer" | "retire", body: Uint8Array): Promise<ControlAnswer> {
    return this.#controls.run(() => this.#control_(signed, action, body));
  }

  /** Fresh actor authority, with credential subset only when this call can disclose a new bearer. */
  async #bearerAuthority(request: ControlRequest, row: AgentRow, owner: { agent: string | null; control: string | null }, credential: boolean, expectedController: MemberId | null = null): Promise<{ ok: true; by: "admin" | "controller"; controller: MemberId | null; at: number; until: number } | { ok: false; result: ControlAnswer }> {
    const facts = await this.#issuerRoleRead(row, expectedController, request.actor);
    if (!same(this.#creationOwner(request.op), owner)) return { ok: false, result: this.#staleCreation() };
    const at = this.#issuerClock();
    if (facts.read.status !== "observed" || facts.at === null || facts.until === null || at === null || at < facts.at || at >= facts.until || !isMemberId(row.handle))
      return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
    const read = facts.read, actor = read.actor;
    if (!actor || actor.keyState !== "active" || actor.memberState !== "active") return { ok: false, result: answer(403, { error: "unauthorized" }) };
    const admin = actor.actions.includes("membership.manage");
    if (!admin && actor.member !== read.agent.controller) return { ok: false, result: answer(403, { error: "unauthorized" }) };
    if (actor.member === read.agent.controller && read.controller && !same(actor.actions, read.controller.actions)) return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
    if (credential) {
      if (row.state !== "enrolled") return { ok: false, result: row.state === "retired" ? answer(409, { error: "retired" }) : answer(409, { error: "op", rule: "stale" }) };
      const decision = agentRoleDecision({ membership: row.membership, agent: row.handle, agentKey: row.key, expectedController, actor: request.actor }, read);
      if (decision.status === "unavailable") return { ok: false, result: answer(503, { error: "temporarily_unavailable" }) };
      if (decision.status !== "active") return { ok: false, result: answer(403, { error: "unauthorized", rule: "controller-role" }) };
    }
    return { ok: true, by: admin ? "admin" : "controller", controller: read.agent.controller, at, until: facts.until };
  }
  #withheldBearer(result: ControlAnswer, failure: ControlAnswer): ControlAnswer {
    return answer(failure.status, { ...retainedAnswer(result).body, ...failure.body,
      next: "This rotation committed a one-shot bearer but returned no bearer plaintext. Its retained receipt cannot redisplay the secret. A later role change or same-operation replay cannot recover it." });
  }

  async #control_(signed: SignedControl, action: "bearer" | "retire", body: Uint8Array): Promise<ControlAnswer> {
    const now = this.#issuerClock();
    if (now === null) return answer(503, { error: "temporarily_unavailable" });
    const row = this.#row();
    if (!row) return answer(404, { error: "agent" });
    // An enrolment still unfinished can be retired by its authority; it cannot be re-issued a bearer, having none.
    if (row.state === "enrolling" && action === "bearer") return answer(409, { error: "enrolling" });
    const refused = bound(signed, row.config.service, action, this.ports.id, body, now);
    if (refused) return refused;
    const limited = this.#admitControl(signed.request, now); if (limited) return limited;
    const r = signed.request;
    // Another repository or another incarnation: refused as the design states, with a fixed body.
    if (!same(r.membership, row.membership)) return answer(403, { error: "unauthorized", rule: "membership" });
    if (action === "retire") {
      const owner = this.#managementOwner(r.op), authority = await this.#managementAuthority(r, row, owner, now);
      if (!authority.ok) return authority.result;
      const at = this.#issuerClock();
      if (at === null || at < authority.at || at >= authority.until || this.#managementOwner(r.op) !== owner) return answer(503, { error: "temporarily_unavailable" });
      const expired = bound(signed, row.config.service, action, this.ports.id, body, at); if (expired) return expired;
      return this.#retire(signed, row, body, authority, at);
    }
    if (r.op.length === 0 || utf8(r.op).length > OP_BYTES) return answer(400, { error: "control", rule: "binding" });
    const before = this.#control.row(r.op), firstOwner = this.#creationOwner(r.op), fingerprint = fingerprintOf(r);
    const authority = await this.#bearerAuthority(r, row, firstOwner, before === null);
    if (!authority.ok) return authority.result;
    if (authority.at < now) return answer(503, { error: "temporarily_unavailable" });
    // Historical receipts disclose no credential and disturb no current transport or bearer.
    const rotated = this.sql.transaction((): { result: ControlAnswer; fresh: false } | { result: ControlAnswer; fresh: true; row: AgentRow; controller: MemberId; owner: { agent: string | null; control: string | null }; at: number } => {
      if (!same(this.#creationOwner(r.op), firstOwner)) return { result: this.#staleCreation(), fresh: false };
      const at = this.#issuerClock();
      if (at === null || at < authority.at || at >= authority.until) return { result: answer(503, { error: "temporarily_unavailable" }), fresh: false };
      const expired = bound(signed, row.config.service, "bearer", this.ports.id, body, at);
      if (expired) return { result: expired, fresh: false };
      this.#expire(at);
      const existing = this.#control.row(r.op);
      if (existing) {
        if (existing.fingerprint !== fingerprint || existing.action !== "bearer" || existing.agent !== this.ports.id) return { result: answer(409, { error: "op", rule: "fingerprint" }), fresh: false };
        return { result: this.#control.retained(existing, at) ?? answer(409, { error: "op", rule: "stale" }), fresh: false };
      }
      const current = this.#row()!;
      if (current.state !== "enrolled") return { result: this.#staleCreation(), fresh: false };
      if (authority.controller === null) return { result: answer(503, { error: "temporarily_unavailable" }), fresh: false };
      const issued = at, bearerExpires = timeOf(issued + BEARER_LIFETIME_MS);
      const expiryDelta = utf8(bearerExpires).length - (current.bearerExpires === null ? 0 : utf8(current.bearerExpires).length);
      // Reserve the operation and settle the expiry field in one admission.
      if (!this.#control.charge(CONTROL_ROW_BYTES + expiryDelta, action)) return { result: answer(507, { error: "full", rule: "control-budget" }), fresh: false };
      const secret = b64url(this.ports.random(32));
      const done = answer(200, { agent: this.ports.id, by: authority.by, bearer: `${this.ports.id}.${secret}`, bearerExpires });
      this.sql.exec(`UPDATE agent SET bearer = ?, bearer_expires = ?, updated = ? WHERE id = 1`, digestBytes(utf8(secret)), bearerExpires, timeOf(issued));
      const held = this.sql.exec(`SELECT row FROM session`).toArray().reduce((n, s) => n + utf8(String(s["row"])).length + ROW_OVERHEAD, 0);
      this.sql.exec(`DELETE FROM session`);
      this.#control.charge(-held, "retire");
      this.#control.insert(r.op, fingerprint, action, this.ports.id, "complete", r.notAfter, timeOf(at));
      this.#control.complete(r.op, "complete", done);
      return { result: done, fresh: true, row: this.#row()!, controller: authority.controller, owner: this.#creationOwner(r.op), at };
    });
    if (!rotated.fresh) return rotated.result;
    // Preserve the original disposal order: the committed rotation detaches its old generation before awaiting graceful.
    this.#httpEpoch++;
    const owner = this.#transport;
    this.#transport = null;
    const rotationEpoch = this.#httpEpoch;
    try { await owner?.graceful(); }
    catch { return this.#withheldBearer(rotated.result, answer(503, { error: "temporarily_unavailable" })); }
    if (this.#httpEpoch !== rotationEpoch || !same(this.#creationOwner(r.op), rotated.owner)) return this.#withheldBearer(rotated.result, this.#staleCreation());
    const disposedAt = this.#issuerClock();
    if (disposedAt === null || disposedAt < rotated.at) return this.#withheldBearer(rotated.result, answer(503, { error: "temporarily_unavailable" }));
    const final = await this.#bearerAuthority(r, rotated.row, rotated.owner, true, rotated.controller);
    if (this.#httpEpoch !== rotationEpoch || !same(this.#creationOwner(r.op), rotated.owner)) return this.#withheldBearer(rotated.result, this.#staleCreation());
    if (!final.ok) return this.#withheldBearer(rotated.result, final.result);
    const at = this.#issuerClock();
    if (at === null || at < disposedAt || at < final.at || at >= final.until) return this.#withheldBearer(rotated.result, answer(503, { error: "temporarily_unavailable" }));
    const expired = bound(signed, rotated.row.config.service, "bearer", this.ports.id, body, at);
    if (expired) return this.#withheldBearer(rotated.result, expired);
    return rotated.result;
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
    const owned = this.#managementOwner(r.op);
    let lastAuthority = authority;
    let floor = now;
    const current = (): boolean => {
      const at = this.#issuerClock();
      if (at === null || at < floor || this.#managementOwner(r.op) !== owned || this.#transport !== null || this.#service !== null
        || bound(signed, row.config.service, "retire", this.ports.id, body, at) !== null) return false;
      floor = at; return true;
    };
    const fresh = async (): Promise<number | null> => {
      if (!current()) return null;
      const read = await this.#managementAuthority(r, this.#row()!, owned, floor);
      if (!read.ok || !current() || floor < read.at || floor >= read.until) return null;
      lastAuthority = read;
      return read.until;
    };
    const result = (complete: boolean, reason?: string): ControlAnswer => answer(complete ? 200 : 202, {
      agent: this.ports.id, by: lastAuthority.by, key: row.key, retired: complete,
      endpointDisabled: true, seedErased: true,
      ...(complete ? {} : { pending: true, reason: reason ?? "key-active", next: "A membership.manage holder or the recovery key must revoke this key. Retry retire after the recorded revoke." }),
    });
    const revoked = async (): Promise<boolean | null> => {
      if (!current()) return null;
      const facts = await this.#issuerRoleRead(row, null, null, floor);
      if (!current() || facts.at === null || facts.at > floor || facts.read.status !== "observed") return null;
      const key = facts.read.agentKey;
      return key?.keyState === "retired" || key?.keyState === "compromised";
    };
    try {
      if (!current()) return this.#cleanupStopped();
      await owner?.graceful();
      if (!current()) return this.#cleanupStopped();
      await this.#issuer.revokeAll(current);
      if (!current()) return this.#cleanupStopped();
      await this.#oauthHttp.closeAll();
      if (!current()) return this.#cleanupStopped();
      let complete = await revoked();
      if (complete === null) return this.#cleanupStopped();
      let reason = "revoke-required";
      if (!complete) {
        const kept = this.sql.exec(`SELECT revoke FROM agent_retirement WHERE id = 1`).toArray()[0]?.["revoke"];
        if (typeof kept === "string") {
          const revoke = parseStrict(kept) as SignedIntent;
          const identity: Identity = { service: row.config.service, membership: row.membership, signer: row.key, target: row.membership, key: `enrol:${row.op}` };
          if (!current()) return this.#cleanupStopped();
          let record: StoredCustodyRecord | null = null, unreadable = false;
          try { record = await sqliteStore(this.sql, this.ports.custodyBounds, this.ports.now).read(identityId(identity)); }
          catch { unreadable = true; reason = "revoke-unresolved"; }
          if (!current()) return this.#cleanupStopped();
          if (!unreadable) {
            const target = enrolledKeyItem(record, identity);
            if (target === null) reason = "enrolment-unavailable";
            else if (revoke.intent.on !== target) reason = "wrong-key";
            else if ((timeMs(revoke.intent.notAfter) ?? -Infinity) <= floor) reason = "revoke-expired";
            else {
              const until = await fresh();
              if (until === null || !current() || floor >= until) return this.#cleanupStopped();
              try {
                const reply = await httpTransport(row.config.service, { fetch: this.ports.fetch }).submit(row.membership.scope, revoke, []);
                reason = reply.answer === "accepted" ? "revocation-unobserved" : "reason" in reply ? String(reply.reason) : reply.answer;
              } catch { reason = "revoke-unresolved"; }
              if (!current()) return this.#cleanupStopped();
            }
          }
        }
        complete = await revoked();
        if (complete === null) return this.#cleanupStopped();
      }
      const until = await fresh();
      if (until === null) return this.#cleanupStopped();
      const decided = result(complete, reason);
      return this.sql.transaction(() => {
        if (!current()) return this.#cleanupStopped();
        if (floor >= until) return this.#cleanupStopped();
        this.#control.complete(r.op, decided.status === 200 ? "complete" : "pending", decided); return decided;
      });
    } catch { return this.#cleanupStopped(); }
  }

  /** Private request owner. Ordinary rotation does not replace an OAuth Agent owner. */
  #requestOwner(row: AgentRow, oauth: boolean): string {
    const agent = this.#issuerAgentOwner(row);
    return oauth ? agent : canonicalize({ agent, bearer: row.bearer, bearerExpires: row.bearerExpires });
  }

  /** Constant-time secret admission followed by fresh same-head Native standing on every request. */
  async #authorized(request: Request, notBefore = 0): Promise<"unauthorized" | "limited" | "unavailable" | { oauth: OAuthAccessCandidate | null; owner: string; controller: MemberId; at: number }> {
    const authorization = request.headers.get("authorization"), address = request.headers.get("cf-connecting-ip");
    const now = this.#issuerClock();
    if (now === null || now < notBefore) return "unavailable";
    const found: { oauth: OAuthAccessCandidate | null; row: AgentRow | null; owner: string | null } = { oauth: null, row: null, owner: null };
    const checked = this.#failures.check(address, now, () => {
      const row = this.#row();
      let ok = false;
      const expires = row?.bearerExpires === null || row?.bearerExpires === undefined ? null : timeMs(row.bearerExpires);
      if (authorization?.startsWith("Bearer ") && row?.state === "enrolled") {
        const [id, second, third, ...rest] = authorization.slice("Bearer ".length).split(".");
        if (id === this.ports.id && second && rest.length === 0) {
          if (third === undefined && row.bearer && expires !== null && now < expires) ok = equalTokenDigest(row.bearer, second);
          else if (third !== undefined) {
            found.oauth = this.#oauth.inspect(second, third, this.ports.oauthResource?.(request) ?? null);
            ok = found.oauth !== null;
          }
        }
      }
      if (ok && row) { found.row = row; found.owner = this.#requestOwner(row, found.oauth !== null); }
      return ok;
    });
    if (checked !== "ok") return checked;
    if (found.row === null || found.owner === null) return "unavailable";
    // Fixed lifetime supplies the issuance floor without another durable field. A valid secret under a backward clock is not a bad secret.
    if (found.oauth === null && (timeMs(found.row.bearerExpires!) ?? -Infinity) - BEARER_LIFETIME_MS > now) return "unavailable";
    let decision: HostedRoleDecision;
    let controller: MemberId | null = found.oauth?.grant.controller ?? null;
    let standingClock: { at: number; until: number } | null = null;
    if (found.oauth !== null) decision = await this.#oauth.standingResult(found.oauth);
    else {
      const row = found.row;
      const facts = await this.#issuerRoleRead(row, null, null);
      const at = this.#issuerClock();
      if (at === null || at < now || facts.at === null || facts.until === null || at < facts.at || at >= facts.until) return "unavailable";
      const current = this.#row();
      if (!current || this.#requestOwner(current, false) !== found.owner) return "unauthorized";
      if (!isMemberId(row.handle)) return "unavailable";
      standingClock = { at, until: facts.until };
      controller = facts.read.status === "observed" ? facts.read.agent.controller : null;
      decision = agentRoleDecision({ membership: row.membership, agent: row.handle, agentKey: row.key, expectedController: null, actor: null }, facts.read);
    }
    const at = this.#issuerClock(), current = this.#row();
    if (at === null || at < now || standingClock !== null && (at < standingClock.at || at >= standingClock.until)) return "unavailable";
    if (!current || this.#requestOwner(current, found.oauth !== null) !== found.owner) return "unauthorized";
    if (decision.status === "unavailable") return "unavailable";
    if (decision.status === "inactive") {
      if (decision.reason === "role-subset" || decision.reason === "owner-changed") return "unauthorized";
      return this.#failures.check(address, at, () => false) === "limited" ? "limited" : "unauthorized";
    }
    if (found.oauth === null && (current.bearerExpires === null || (timeMs(current.bearerExpires) ?? -Infinity) <= at)) return "unauthorized";
    if (controller === null) return "unavailable";
    return { oauth: found.oauth, owner: found.owner, controller, at };
  }

  /** One request's private credential owner; every actual delivery reads fresh facts. */
  #dispatchContext(row: Pick<AgentRow, "op" | "membership" | "key" | "handle"> & { service: string }, owner: string, controller: MemberId, oauth: OAuthAccessCandidate | null, generation: HttpGeneration, admittedAt: number): DispatchContext {
    const epoch = oauth ? this.#oauthEpoch : this.#httpEpoch;
    const denied = (error: "unavailable" | "unauthorized"): Failure => failed({ error,
      sentence: "This delivery stopped before its Native transport call. A request may already be kept, and earlier sends under the same key may remain unresolved. This local stop records no Native outcome.",
      next: "Keep the same idempotencyKey and exact arguments. Reconcile the kept original with settle before starting another operation." });
    return { prepare: async (binding, source) => {
      // Copy actual callback identity facts; never reconstruct them from the current Agent.
      const of = { service: binding.service, signer: binding.signer };
      const from = source === null ? null : { op: source.op, key: source.key, service: source.service, membership: { ...source.membership } };
      const matches = (at: number): boolean => {
        const current = this.#row();
        return !generation.closed && epoch === (oauth ? this.#oauthEpoch : this.#httpEpoch)
          && current?.state === "enrolled" && this.#requestOwner(current, oauth !== null) === owner
          && of.service === row.service && of.signer === row.key
          && from !== null && from.op === row.op && from.key === row.key && from.service === row.service && same(from.membership, row.membership)
          && (oauth ? this.#oauth.current(oauth, at)
            : current.bearerExpires !== null && at >= timeMs(current.bearerExpires)! - BEARER_LIFETIME_MS && at < timeMs(current.bearerExpires)!);
      };
      const started = this.#issuerClock();
      let after = started;
      const checkpoint: { at: number | null; until: number | null } = { at: null, until: null };
      let decision: HostedRoleDecision = { status: "unavailable" };
      if (started !== null && started >= admittedAt && matches(started)) {
        if (oauth) decision = await this.#oauth.standingResult(oauth, false, (at, until) => { checkpoint.at = at; checkpoint.until = until; });
        else {
          const facts = await this.#issuerRoleRead(row, controller, null);
          checkpoint.at = facts.at; checkpoint.until = facts.until;
          if (isMemberId(row.handle)) decision = agentRoleDecision({ membership: row.membership, agent: row.handle,
            agentKey: row.key, expectedController: controller, actor: null }, facts.read);
        }
        after = this.#issuerClock();
      }
      // No cached permission: this closure belongs to this delivery and can finish once.
      let finished = false;
      return () => {
        if (finished) return denied("unavailable");
        finished = true;
        const at = this.#issuerClock();
        if (started === null || after === null || at === null || started < admittedAt || after < started || at < after || at >= started + 5000)
          return denied("unavailable");
        if (!matches(at)) return denied("unauthorized");
        if (decision.status !== "active") return denied(decision.status === "unavailable" ? "unavailable" : "unauthorized");
        if (checkpoint.at === null || checkpoint.until === null || at < checkpoint.at || at >= checkpoint.until) return denied("unavailable");
        return null;
      };
    } };
  }

  /** `POST`, `GET` and `DELETE /mcp` for this agent. Admission does not cache permission for a later native act. */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("origin") !== null) return new Response(null, { status: 403 });
    const checked = await this.#authorized(request);
    if (checked === "unavailable") return new Response(JSON.stringify({ error: "unavailable" }), { status: 503, headers: { "content-type": "application/json", "retry-after": "1" } });
    if (checked === "limited") return new Response(JSON.stringify({ error: "rate-limited" }), { status: 429, headers: { "content-type": "application/json" } });
    if (checked === "unauthorized") return mcpUnauthorized(request);
    const row = this.#row();
    if (!row || this.#requestOwner(row, checked.oauth !== null) !== checked.owner) return mcpUnauthorized(request);
    const http = checked.oauth
      ? await this.#oauthHttp.open(checked.oauth, layer => this.#openHttp(row, this.#oauthEpoch, layer.generation, layer))
      : await this.#httpOf(row);
    if (http === null) return mcpUnauthorized(request);
    // Discovery may await native reads and package storage. Compare the same private owner after a fresh authority read.
    const current = await this.#authorized(request, checked.at);
    if (current === "unavailable") return new Response(JSON.stringify({ error: "unavailable" }), { status: 503, headers: { "content-type": "application/json", "retry-after": "1" } });
    if (current === "limited") return new Response(JSON.stringify({ error: "rate-limited" }), { status: 429, headers: { "content-type": "application/json" } });
    if (current === "unauthorized") return mcpUnauthorized(request);
    if (current.at < checked.at) return new Response(JSON.stringify({ error: "unavailable" }), { status: 503, headers: { "content-type": "application/json", "retry-after": "1" } });
    if (current.owner !== checked.owner || checked.oauth && current.oauth?.row !== checked.oauth.row) return mcpUnauthorized(request);
    const dispatch = this.#dispatchContext({ op: row.op, membership: { ...row.membership }, key: row.key, handle: row.handle, service: row.config.service }, current.owner, current.controller, current.oauth, http.generation, current.at);
    const response = await http.handle(request, dispatch);
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
