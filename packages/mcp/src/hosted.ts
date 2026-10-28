import { addressKey, isRecord, same } from "@generalbusiness/dap-bytes";
import { invitationRedemptionFields } from "@generalbusiness/dap-client";
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

import type { ControlAction, ControlRequest, Digest, KeyId, MemberId, ScopeRef, Seed, SignedControl } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, isKeyId, isScopeRef, keyIdOfSecret, parseStrict, scopeIdOf, timeMs, timeOf, unb64url, utf8, verifyControl } from "@generalbusiness/dap-bytes";
import { TransportError, agentKeyInvitationOf, secretSigner, signedIntent, type AgentKeyInvitation, type Fetch } from "@generalbusiness/dap-client";
import { CustodyError, Lost, meaningOf, type Envelope, type Identity } from "./custody.ts";
import { McpHttp, SessionFull, type SessionRow } from "./http.ts";
import type { McpConfig, Root } from "./inventory.ts";
import { McpService } from "./service.ts";
import { McpMetrics, mcpRead, type McpMetricOptions } from "./metrics.ts";
import { sqliteStore, type Sql, type SqliteCustodyBounds } from "./sqlite-custody.ts";
import { Wire } from "./wire.ts";

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
  if (!Object.hasOwn(result.body, "bearer")) return result;
  const body = { ...result.body };
  delete body["bearer"];
  return answer(result.status, { ...body, bearerShown: true, bearerExpires: typeof body["bearerExpires"] === "string" ? body["bearerExpires"] : null });
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
    if (!["create", "bearer", "retire"].includes(request["action"] as string) || typeof request["service"] !== "string") return null;
    if (!isScopeRef(request["membership"]) || (request["membership"] as ScopeRef).kind !== "membership") return null;
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
  agent(id: string): { create(op: string, request: ControlRequest, link: AgentKeyInvitation): Promise<ControlAnswer> };
}

/** One repository's registry: the only place that creates an agent object. Named by the membership scope ID. */
export class HostedRegistry {
  readonly #control: ControlPlane;
  constructor(private readonly sql: Sql, private readonly ports: RegistryPorts) {
    sql.exec(`CREATE TABLE IF NOT EXISTS agents (agent TEXT PRIMARY KEY, handle TEXT NOT NULL, key TEXT, state TEXT NOT NULL, created TEXT NOT NULL)`);
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
    const now = this.ports.now();
    const refused = bound(signed, service, "create", null, body, now);
    if (refused) return refused;
    const r = signed.request;
    let link: AgentKeyInvitation | null = null;
    try {
      const given = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body));
      link = closed(given, ["link"]) && typeof given["link"] === "string" ? agentKeyInvitationOf(given["link"]) : null;
    } catch { link = null; }
    if (!link) return answer(400, { error: "link", rule: "agent-key-invitation" });
    if (link.service !== service) return answer(400, { error: "link", rule: "service" });
    if (!same(link.repository.membership, r.membership)) return answer(400, { error: "link", rule: "membership" });
    // Authority now, before anything is reserved: the controller the invitation names, or an admin.
    const authority = await authorityOf(this.ports, r.membership, r.actor, link.handle as MemberId);
    if (!authority.ok || (authority.by === "controller" && authority.member !== link.controller.member)) return answer(403, { error: "unauthorized" });
    const fingerprint = fingerprintOf(r);
    // The reservation, in one transaction, before the handoff to the agent object; expired answer bodies go first.
    const reserved = this.sql.transaction((): ControlAnswer | { agent: string } => {
      this.#control.expire(now);
      const row = this.#control.row(r.op);
      if (row) {
        if (row.fingerprint !== fingerprint) return answer(409, { error: "op", rule: "fingerprint" });
        if (row.state !== "reserved") return this.#control.retained(row, now) ?? answer(409, { error: "op", rule: "stale" });
        return { agent: row.agent! };
      }
      if (!this.#control.reserve("create")) return answer(507, { error: "full", rule: "control-budget" });
      const agent = this.ports.mintId();
      this.#control.insert(r.op, fingerprint, "create", agent, "reserved", r.notAfter, timeOf(now));
      return { agent };
    });
    if ("status" in reserved) return reserved;
    this.ports.fault?.("reservation");
    const result = await this.ports.agent(reserved.agent).create(r.op, r, link);
    this.ports.fault?.("complete");
    // Unresolved: the reservation stays, and the next request with the same op resumes it.
    if (result.status === 503) return result;
    this.sql.transaction(() => {
      // Agent serialization selects the sole bearer disclosure; concurrent
      // registry handoffs settle this reservation only once.
      if (this.#control.row(r.op)?.state !== "reserved") return;
      this.#control.complete(r.op, result.status < 300 ? "complete" : "refused", result);
      const existing = this.sql.exec(`SELECT agent FROM agents WHERE agent = ?`, reserved.agent).toArray()[0];
      if (!existing) this.sql.exec(`INSERT INTO agents (agent, handle, key, state, created) VALUES (?, ?, ?, ?, ?)`, reserved.agent, link.handle, typeof result.body["key"] === "string" ? result.body["key"] : null, result.status < 300 ? "enrolled" : "refused", timeOf(now));
    });
    return result;
  }
}

// ---------------------------------------------------------------- the agent

export interface AgentPorts extends Authority {
  /** Hosted deployment policy, separate from the durable agent configuration. */
  genericTools?: readonly string[];
  applicationTrust?: string | undefined;
  /** Separate MCP observation map; never a native input or an authority read. */
  metrics?: McpMetricOptions;
  /** This object's own ID, as the registry allotted it. */
  id: string;
  /** The Worker's own routes, on its own origin. */
  fetch: Fetch;
  now(): number;
  random(bytes: number): Uint8Array;
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
  #http: McpHttp | null = null;
  readonly #failures = new BearerFailures();
  /** Control operations run one at a time in this object: a retry of `create` waits for the first and then finds its answer. */
  readonly #controls = new Queue();
  constructor(private readonly sql: Sql, private readonly ports: AgentPorts) {
    this.#metrics = new McpMetrics(ports.metrics);
    sql.exec(`CREATE TABLE IF NOT EXISTS agent (id INTEGER PRIMARY KEY CHECK (id = 1), op TEXT NOT NULL, seed BLOB NOT NULL, key TEXT NOT NULL, state TEXT NOT NULL, membership TEXT NOT NULL, handle TEXT NOT NULL, config TEXT NOT NULL, bearer TEXT, answer TEXT, created TEXT NOT NULL, updated TEXT NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS session (id TEXT PRIMARY KEY, row TEXT NOT NULL, created INTEGER NOT NULL)`);
    this.#control = new ControlPlane(sql, ports.controlBudget?.budget, ports.controlBudget?.reserve);
    this.#control.migrateBearerAnswers(true);
  }

  /** The control budget's used bytes, for a test's eyes. */
  controlUsed(): number { return this.#control.used(); }

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
    if (this.#service) return this.#service;
    const read = async (): Promise<McpConfig> => { await this.ports.configHold?.(); return this.#row()?.config ?? row.config; };
    this.#service = new McpService({
      applicationTrust: this.ports.applicationTrust,
      service: row.config.service, fetch: this.ports.fetch, signer: secretSigner(row.seed), custody: sqliteStore(this.sql, this.ports.custodyBounds, this.ports.now), now: this.ports.now,
      ...(this.ports.genericTools !== undefined ? { genericTools: this.ports.genericTools } : {}),
      ...(this.ports.metrics ? { metrics: this.ports.metrics } : {}),
      ...(this.ports.every ? { every: this.ports.every } : {}), ...(this.ports.pause ? { pause: this.ports.pause } : {}),
      config: {
        read,
        addRoot: async (root: Root) => { const c = await read(); this.#setConfig({ ...c, roots: [...(c.roots ?? []).filter((x) => x.scope !== root.scope), root] }); },
        setRepository: async (repository) => { this.#setConfig({ ...(await read()), repository }); },
        joined: async (joined) => { this.#setConfig({ ...(await read()), service: joined.service, repository: joined.repository, handle: joined.handle }); },
      },
    });
    return this.#service;
  }

  #httpOf(row: AgentRow): McpHttp {
    if (this.#http) return this.#http;
    const wire = new Wire(this.#serviceOf(row));
    this.#http = new McpHttp({
      wire, bodyBytes: 1024 * 1024, now: this.ports.now,
      lifetime: { expires: timeMs(row.bearerExpires!)!, ...(this.ports.scheduleExpiry ? { schedule: this.ports.scheduleExpiry } : {}) },
      mintSession: () => b64url(this.ports.random(16)),
      authorized: () => true,   // the bearer was checked before the request reached the layer
      persist: (session: SessionRow) => {
        // A session row is control state: its bytes as stored are charged, the difference on an update; no room, no session.
        const text = JSON.stringify(session);
        this.sql.transaction(() => {
          this.ports.sessionFault?.();
          const before = this.sql.exec(`SELECT row FROM session WHERE id = ?`, session.id).toArray()[0];
          const delta = utf8(text).length + ROW_OVERHEAD - (before ? utf8(String(before["row"])).length + ROW_OVERHEAD : 0);
          if (!this.#control.charge(delta, "session")) throw new SessionFull();
          this.sql.exec(`INSERT INTO session (id, row, created) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET row = excluded.row`, session.id, text, session.created);
        });
      },
      remove: (id) => {
        this.sql.transaction(() => {
          const before = this.sql.exec(`SELECT row FROM session WHERE id = ?`, id).toArray()[0];
          if (before) this.#control.charge(-(utf8(String(before["row"])).length + ROW_OVERHEAD), "retire");
          this.sql.exec(`DELETE FROM session WHERE id = ?`, id);
        });
      },
    });
    // The sessions as persisted survive eviction; their streams do not, and the next GET reconciles.
    this.#http.restore(this.sql.exec(`SELECT row FROM session ORDER BY created`).toArray().map((r) => JSON.parse(String(r["row"])) as SessionRow));
    return this.#http;
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
    if (row?.state === "enrolled" || row?.state === "refused") return row.answer ?? answer(409, { error: "op", rule: "stale" });
    if (row?.state === "retired") return answer(409, { error: "retired" });
    if (!row) {
      // The seed is written before the envelope is built; the control budget is reserved before the key exists.
      const made = this.sql.transaction((): ControlAnswer | null => {
        if (!this.#control.reserve("create")) return answer(507, { error: "full", rule: "control-budget" });
        const seed = this.ports.random(32);
        const config: McpConfig = { service: link.service, repository: link.repository, handle: link.handle };
        const configText = canonicalize(config as never);
        if (!this.#control.charge(utf8(configText).length + 256 + ROW_OVERHEAD, "create")) return answer(507, { error: "full", rule: "control-budget" });
        this.sql.exec(`INSERT INTO agent (id, op, seed, key, state, membership, handle, config, bearer, answer, created, updated) VALUES (1, ?, ?, ?, 'enrolling', ?, ?, ?, NULL, NULL, ?, ?)`,
          op, seed, keyIdOfSecret(seed), canonicalize(link.repository.membership as never), link.handle, configText, timeOf(now), timeOf(now));
        this.#control.insert(op, fingerprintOf(request), "create", this.ports.id, "reserved", request.notAfter, timeOf(now));
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
    const entry = await service.reads.read(M, (t, r) => t.entry(M.scope, r, fact.seq));
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
      const issued = this.ports.now(), bearerExpires = timeOf(issued + BEARER_LIFETIME_MS);
      if (!this.#control.charge(utf8(bearerExpires).length, "create")) throw new Error("SQLITE_FULL: the bearer expiry cannot be stored.");
      const secret = b64url(this.ports.random(32));
      const result = answer(201, { agent: this.ports.id, key: signer.key, handle: link.handle, member: fact, bearer: `${this.ports.id}.${secret}`, bearerExpires });
      const config: McpConfig = { ...current.config, repository: { ...link.repository, ...(inbox ? { inbox } : {}) } };
      this.sql.exec(`UPDATE agent SET state = 'enrolled', bearer = ?, bearer_expires = ?, answer = ?, config = ?, updated = ? WHERE id = 1`, digestBytes(utf8(secret)), bearerExpires, JSON.stringify(retainedAnswer(result)), canonicalize(config as never), timeOf(issued));
      this.#control.complete(op, "complete", result);
      return result;
    });
    this.#service = null;   // derived again with the configuration that names the inbox
    this.#http = null;
    return decided;
  }

  /** `bearer` and `retire`: the rotation or the ending, every session's deletion, every stream's close and the answer, in one transaction. */
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
      const issued = this.ports.now(), bearerExpires = action === "bearer" ? timeOf(issued + BEARER_LIFETIME_MS) : null;
      const expiryDelta = (bearerExpires === null ? 0 : utf8(bearerExpires).length) - (row.bearerExpires === null ? 0 : utf8(row.bearerExpires).length);
      // Reserve the operation and settle the expiry field in one admission.
      if (!this.#control.charge(CONTROL_ROW_BYTES + expiryDelta, action)) return { result: answer(507, { error: "full", rule: "control-budget" }), fresh: false };
      const secret = action === "bearer" ? b64url(this.ports.random(32)) : null;
      const done = action === "bearer"
        ? answer(200, { agent: this.ports.id, by: authority.by, bearer: `${this.ports.id}.${secret}`, bearerExpires })
        : answer(200, { agent: this.ports.id, by: authority.by, retired: true });
      if (action === "bearer") this.sql.exec(`UPDATE agent SET bearer = ?, bearer_expires = ?, updated = ? WHERE id = 1`, digestBytes(utf8(secret!)), bearerExpires, timeOf(issued));
      else this.sql.exec(`UPDATE agent SET state = 'retired', bearer = NULL, bearer_expires = NULL, updated = ? WHERE id = 1`, timeOf(issued));
      const held = this.sql.exec(`SELECT row FROM session`).toArray().reduce((n, s) => n + utf8(String(s["row"])).length + ROW_OVERHEAD, 0);
      this.sql.exec(`DELETE FROM session`);
      this.#control.charge(-held, "retire");
      this.#control.insert(r.op, fingerprint, action, this.ports.id, "complete", r.notAfter, timeOf(now));
      this.#control.complete(r.op, "complete", done);
      return { result: done, fresh: true };
    });
    if (fresh && this.#http) {
      // Graceful: every open stream closes with a final event, every listen with its result; the sessions are already gone.
      const http = this.#http;
      this.#http = null;
      await http.closeAll();
    }
    return result;
  }

  /** The bearer check, in constant time over digests, with failures counted per connecting address. */
  #authorized(authorization: string | null, address: string | null): "ok" | "unauthorized" | "limited" {
    const now = this.ports.now();
    return this.#failures.check(address, now, () => {
      const row = this.#row();
      let ok = false;
      const expires = row?.bearerExpires === null || row?.bearerExpires === undefined ? null : timeMs(row.bearerExpires);
      if (authorization?.startsWith("Bearer ") && row?.state === "enrolled" && row.bearer && expires !== null && now < expires) {
        const [id, secret, ...rest] = authorization.slice("Bearer ".length).split(".");
        if (id === this.ports.id && secret && rest.length === 0) {
          const given = utf8(digestBytes(utf8(secret)));
          const expected = utf8(row.bearer);
          let differ = given.length ^ expected.length;
          for (let i = 0; i < Math.max(given.length, expected.length); i++) differ |= (given[i] ?? 0) ^ (expected[i] ?? 0);
          ok = differ === 0;
        }
      }
      return ok;
    });
  }

  /** `POST`, `GET` and `DELETE /mcp` for this agent. */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("origin") !== null) return new Response(null, { status: 403 });
    const checked = this.#authorized(request.headers.get("authorization"), request.headers.get("cf-connecting-ip"));
    if (checked === "limited") return new Response(JSON.stringify({ error: "rate-limited" }), { status: 429, headers: { "content-type": "application/json" } });
    if (checked === "unauthorized") return new Response(null, { status: 401 });
    return this.#httpOf(this.#row()!).handle(request);
  }

  /** For a test: the service and the layer as this object holds them now. */
  inside(): { service: McpService | null; http: McpHttp | null } { return { service: this.#service, http: this.#http }; }

  /** What an eviction does to this instance's memory: every stream ends abruptly, with no event; nothing durable changes. */
  abrupt(): void { this.#http?.abrupt(); this.#http = null; this.#service = null; }

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
