/** Access-token admission over durable grant digests and bounded Native standing reads. */
import type { KeyId, MemberId, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isMemberId, parseStrict, same, utf8 } from "@generalbusiness/dap-bytes";
import type { HostedRoleDecision, HostedRolePorts, HostedRoleRead, HostedRoleRequest } from "./hosted.ts";
import { mcpRead } from "./metrics.ts";
import { isMcpResource } from "./oauth-resource.ts";
import type { Sql } from "./sqlite-custody.ts";

export const OAUTH_STANDING_MS = 60_000;
export const OAUTH_ACCESS_MS = 3_600_000;
export const OAUTH_GRANT_MS = 30 * 86_400_000;
export const OAUTH_GRANTS_MOST = 8;
export const OAUTH_GRANT_BYTES = 4096;

/** O3 writes this bounded row through its authenticated grant/code flow.
 * O1 has no production issuer. Tests write rows directly through Native SQL. */
export interface OAuthAccessGrant {
  controller: MemberId;
  resource: string;
  created: number;
  ends: number;
  accessIssued: number;
  accessExpires: number;
  accessDigest: string;
}
export interface OAuthAgentIdentity {
  /** Private local owner bytes; never a role RPC or outward result field. */
  op: string;
  configuration: string;
  state: string;
  membership: ScopeRef;
  key: KeyId;
  handle: string;
}
export interface OAuthAccessCandidate {
  id: string;
  grant: OAuthAccessGrant;
  /** Exact durable bytes checked again after each asynchronous authority read. */
  row: string;
  agent: OAuthAgentIdentity;
}
interface StandingLease { key: string; started: number }
/** Identity owns only stream metadata updates, never another request's authority. */
interface StandingRead { key: string; lease: StandingLease | undefined }
interface AccessPorts extends HostedRolePorts {
  now(): number;
  agent(): OAuthAgentIdentity | null;
  /** Charge an ended row's size difference inside the caller's SQL transaction. */
  charge(bytes: number): void;
}

/** Evaluate agent roles only. Management actor authority remains the caller's separate check. */
export function agentRoleDecision(request: HostedRoleRequest, read: HostedRoleRead): HostedRoleDecision {
  if (read.status === "unavailable") return read;
  if (!same(read.of, request.membership) || read.agent.member !== request.agent) return { status: "unavailable" };
  const agent = read.agent;
  if (agent.state !== "active") return { status: "inactive", reason: "agent-inactive" };
  if (request.expectedController !== null && agent.controller !== request.expectedController) return { status: "inactive", reason: "controller-changed" };
  const controller = read.controller;
  if (agent.controller === null || controller?.state !== "active") return { status: "inactive", reason: "controller-inactive" };
  if (controller.member !== agent.controller) return { status: "unavailable" };
  if (request.agentKey !== null) {
    const key = read.agentKey;
    if (!key || key.key !== request.agentKey || key.keyState !== "active" || key.memberState !== "active" || key.member !== agent.member)
      return { status: "inactive", reason: "agent-inactive" };
    if (key.controller !== agent.controller) return { status: "inactive", reason: "controller-changed" };
    if (agent.activeKey !== true) return { status: "unavailable" };
    if (!same(key.actions, agent.actions)) return { status: "unavailable" };
  } else if (read.agentKey !== null) return { status: "unavailable" };
  return agent.actions.every(action => controller.actions.includes(action))
    ? { status: "active" } : { status: "inactive", reason: "role-subset" };
}

const ROLE_READ_MS = 5000;
const safeClock = (now: number): boolean => Number.isSafeInteger(now) && now >= 0 && Number.isSafeInteger(now + ROLE_READ_MS);
const standingKey = (candidate: OAuthAccessCandidate): string => canonicalize([candidate.agent.op, candidate.agent.configuration, candidate.agent.membership, candidate.agent.key, candidate.agent.handle, candidate.grant.controller, candidate.row]);

/** Compare complete digests without an early exit on differing bytes. */
export function equalTokenDigest(expected: string, secret: string): boolean {
  const given = utf8(digestBytes(utf8(secret))), held = utf8(expected);
  let differ = given.length ^ held.length;
  for (let i = 0; i < Math.max(given.length, held.length); i++) differ |= (given[i] ?? 0) ^ (held[i] ?? 0);
  return differ === 0;
}

function grantOf(text: string): OAuthAccessGrant | null {
  if (utf8(text).length > OAUTH_GRANT_BYTES) return null;
  try {
    const row = parseStrict(text) as OAuthAccessGrant;
    if (!row || typeof row !== "object" || Array.isArray(row)
      || Object.keys(row).length !== 7 || !["controller", "resource", "created", "ends", "accessIssued", "accessExpires", "accessDigest"].every(key => Object.hasOwn(row, key))
      || !isMemberId(row.controller) || !isMcpResource(row.resource)
      || ![row.created, row.ends, row.accessIssued, row.accessExpires].every(value => Number.isSafeInteger(value) && value >= 0)
      || row.ends <= row.created || row.ends > row.created + OAUTH_GRANT_MS
      || row.accessIssued < row.created || row.accessIssued >= row.ends
      || row.accessExpires <= row.accessIssued || row.accessExpires > row.accessIssued + OAUTH_ACCESS_MS || row.accessExpires > row.ends
      || typeof row.accessDigest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(row.accessDigest)) return null;
    return row;
  } catch { return null; }
}

export class OAuthAccess {
  readonly #standing = new Map<string, StandingRead>();
  constructor(private readonly sql: Sql, private readonly ports: AccessPorts) {
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_grant (id TEXT PRIMARY KEY, row TEXT NOT NULL, state TEXT NOT NULL CHECK (state IN ('active', 'ended')), created INTEGER NOT NULL)`);
  }

  /** Cryptographic and audience admission precede any Native standing read. */
  inspect(id: string, secret: string, resource: string | null): OAuthAccessCandidate | null {
    if (!/^[A-Za-z0-9_-]{43}$/.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(secret) || resource === null) return null;
    const agent = this.ports.agent();
    if (agent?.state !== "enrolled" || typeof agent.op !== "string" || agent.op.length === 0
      || typeof agent.configuration !== "string" || agent.configuration.length === 0) return null;
    const size = this.sql.exec(`SELECT octet_length(row) AS bytes, state FROM oauth_grant WHERE id = ?`, id).toArray()[0];
    if (!size || size["state"] !== "active" || typeof size["bytes"] !== "number" || size["bytes"] > OAUTH_GRANT_BYTES) return null;
    const text = String(this.sql.exec(`SELECT row FROM oauth_grant WHERE id = ?`, id).toArray()[0]!["row"]);
    const grant = grantOf(text), now = this.ports.now();
    if (!grant || !Number.isSafeInteger(now) || now < grant.accessIssued || now >= grant.accessExpires || now >= grant.ends
      || grant.resource !== resource || !equalTokenDigest(grant.accessDigest, secret)) return null;
    return { id, grant, row: text, agent: { ...agent, membership: { ...agent.membership } } };
  }

  /** Recheck durable revocation, rotation, expiry and agent retirement after an await. */
  current(candidate: OAuthAccessCandidate, now = this.ports.now()): boolean {
    const agent = this.ports.agent();
    if (!Number.isSafeInteger(now) || !agent || agent.state !== "enrolled"
      || typeof agent.op !== "string" || agent.op.length === 0 || typeof agent.configuration !== "string" || agent.configuration.length === 0
      || agent.op !== candidate.agent.op || agent.configuration !== candidate.agent.configuration || !same(agent.membership, candidate.agent.membership)
      || agent.key !== candidate.agent.key || agent.handle !== candidate.agent.handle
      || now < candidate.grant.accessIssued || now >= candidate.grant.accessExpires || now >= candidate.grant.ends) return false;
    return this.sql.exec(`SELECT 1 AS matches FROM oauth_grant WHERE id = ? AND row = ? AND state = 'active'`, candidate.id, candidate.row).toArray().length === 1;
  }

  /** Every use reads current same-head role facts. Stream leases never authorize a request. */
  async standing(candidate: OAuthAccessCandidate, refresh = false): Promise<boolean> {
    return (await this.standingResult(candidate, refresh)).status === "active";
  }

  /** Preserve temporary subset/unavailable denial separately from true current revocation. */
  async standingResult(candidate: OAuthAccessCandidate, _refresh = false, checkpoint?: (at: number, until: number) => void): Promise<HostedRoleDecision> {
    const started = this.ports.now();
    if (!safeClock(started) || started < candidate.grant.accessIssued) return { status: "unavailable" };
    if (!this.current(candidate, started)) return { status: "inactive", reason: "owner-changed" };
    if (!isMemberId(candidate.agent.handle)) return { status: "unavailable" };
    const request: HostedRoleRequest = { membership: { ...candidate.agent.membership }, agent: candidate.agent.handle,
      agentKey: candidate.agent.key, expectedController: candidate.grant.controller, actor: null };
    const key = standingKey(candidate);
    const previous = this.#standing.get(candidate.id);
    const owner: StandingRead = { key, lease: previous?.key === key ? previous.lease : undefined };
    if (!this.#standing.has(candidate.id) && this.#standing.size >= OAUTH_GRANTS_MOST) this.#standing.delete(this.#standing.keys().next().value!);
    this.#standing.set(candidate.id, owner);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const discardLease = () => { if (this.#standing.get(candidate.id) === owner) this.#standing.delete(candidate.id); };
    try {
      mcpRead();
      const read = await Promise.race([
        this.ports.roleStanding(request),
        new Promise<HostedRoleRead>(resolve => { timer = setTimeout(() => resolve({ status: "unavailable" }), ROLE_READ_MS); }),
      ]);
      const after = this.ports.now();
      if (!safeClock(after) || after < started || after >= started + ROLE_READ_MS) { discardLease(); return { status: "unavailable" }; }
      // One synchronous transaction compares the actual owner and decides only that candidate.
      return this.sql.transaction<HostedRoleDecision>(() => {
        if (!this.current(candidate, after)) { discardLease(); return { status: "inactive", reason: "owner-changed" }; }
        const decision = agentRoleDecision(request, read);
        if (decision.status === "active") {
          if (this.#standing.get(candidate.id) === owner) owner.lease = { key, started };
          // A dispatch may capture numeric bounds for its immediate synchronous finish; this is no permission cache.
          checkpoint?.(after, started + ROLE_READ_MS);
        } else {
          discardLease();
          if (decision.status === "inactive" && decision.reason !== "role-subset" && decision.reason !== "owner-changed") this.end(candidate.id);
        }
        return decision;
      });
    } catch { discardLease(); return { status: "unavailable" }; }
    finally { if (timer !== undefined) clearTimeout(timer); }
  }

  /** Last successful-read lease for a live stream only, never a permission cache. */
  standingDeadline(candidate: OAuthAccessCandidate): number | null {
    const held = this.#standing.get(candidate.id)?.lease, now = this.ports.now();
    return held?.key === standingKey(candidate) && safeClock(now) && this.current(candidate, now) && now >= held.started && now < held.started + OAUTH_STANDING_MS
      ? Math.min(held.started + OAUTH_STANDING_MS, candidate.grant.accessExpires, candidate.grant.ends) : null;
  }

  end(id: string): void {
    this.sql.transaction(() => {
      const active = this.sql.exec(`SELECT id FROM oauth_grant WHERE id = ? AND state = 'active'`, id).toArray().length;
      if (active) {
        this.sql.exec(`UPDATE oauth_grant SET state = 'ended' WHERE id = ?`, id);
        this.ports.charge(-1); // active -> ended removes one stored byte.
      }
    });
    this.#standing.delete(id);
  }

  endAll(): void {
    this.sql.transaction(() => {
      const count = Number(this.sql.exec(`SELECT count(*) AS n FROM oauth_grant WHERE state = 'active'`).toArray()[0]!["n"]);
      this.sql.exec(`UPDATE oauth_grant SET state = 'ended' WHERE state = 'active'`);
      this.ports.charge(-count);
    });
    this.#standing.clear();
  }
}
