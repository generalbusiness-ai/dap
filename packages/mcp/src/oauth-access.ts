/** Access-token admission over durable grant digests and bounded Native standing reads. */
import type { KeyId, MemberId, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, digestBytes, isMemberId, parseStrict, same, utf8 } from "@generalbusiness/dap-bytes";
import type { Authority, KeyStanding, MemberStanding } from "./hosted.ts";
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
interface Standing { key: string; started: number; answer: Promise<"active" | "inactive" | "unavailable">; active?: boolean }
interface AccessPorts extends Authority {
  now(): number;
  agent(): OAuthAgentIdentity | null;
  /** Charge an ended row's size difference inside the caller's SQL transaction. */
  charge(bytes: number): void;
}

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
  readonly #standing = new Map<string, Standing>();
  constructor(private readonly sql: Sql, private readonly ports: AccessPorts) {
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_grant (id TEXT PRIMARY KEY, row TEXT NOT NULL, state TEXT NOT NULL CHECK (state IN ('active', 'ended')), created INTEGER NOT NULL)`);
  }

  /** Cryptographic and audience admission precede any Native standing read. */
  inspect(id: string, secret: string, resource: string | null): OAuthAccessCandidate | null {
    if (!/^[A-Za-z0-9_-]{43}$/.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(secret) || resource === null) return null;
    const agent = this.ports.agent();
    if (agent?.state !== "enrolled") return null;
    const size = this.sql.exec(`SELECT octet_length(row) AS bytes, state FROM oauth_grant WHERE id = ?`, id).toArray()[0];
    if (!size || size["state"] !== "active" || typeof size["bytes"] !== "number" || size["bytes"] > OAUTH_GRANT_BYTES) return null;
    const text = String(this.sql.exec(`SELECT row FROM oauth_grant WHERE id = ?`, id).toArray()[0]!["row"]);
    const grant = grantOf(text), now = this.ports.now();
    if (!grant || !Number.isSafeInteger(now) || now < grant.accessIssued || now >= grant.accessExpires || now >= grant.ends
      || grant.resource !== resource || !equalTokenDigest(grant.accessDigest, secret)) return null;
    return { id, grant, row: text, agent };
  }

  /** Recheck durable revocation, rotation, expiry and agent retirement after an await. */
  current(candidate: OAuthAccessCandidate): boolean {
    const now = this.ports.now(), agent = this.ports.agent();
    if (!Number.isSafeInteger(now) || !agent || agent.state !== "enrolled" || !same(agent.membership, candidate.agent.membership)
      || agent.key !== candidate.agent.key || agent.handle !== candidate.agent.handle
      || now < candidate.grant.accessIssued || now >= candidate.grant.accessExpires || now >= candidate.grant.ends) return false;
    return this.sql.exec(`SELECT 1 AS matches FROM oauth_grant WHERE id = ? AND row = ? AND state = 'active'`, candidate.id, candidate.row).toArray().length === 1;
  }

  /** A revoked key or removed agent/controller ends the grant. Unavailable
   * authority fails this request without inventing a permanent revocation. */
  async standing(candidate: OAuthAccessCandidate, refresh = false): Promise<boolean> {
    if (!this.current(candidate)) return false;
    const now = this.ports.now();
    const key = canonicalize([candidate.agent.membership, candidate.agent.key, candidate.agent.handle, candidate.grant.controller]);
    let held = this.#standing.get(candidate.id);
    if (!held || held.key !== key || now < held.started || now >= held.started + OAUTH_STANDING_MS || refresh && held.active !== undefined) {
      if (!held && this.#standing.size >= OAUTH_GRANTS_MOST) this.#standing.delete(this.#standing.keys().next().value!);
      held = { key, started: now, answer: this.#observe(candidate) };
      this.#standing.set(candidate.id, held);
    }
    const answer = await held.answer, after = this.ports.now();
    if (!this.current(candidate) || after < held.started || after >= held.started + OAUTH_STANDING_MS) return false;
    held.active = answer === "active";
    if (answer === "inactive") this.end(candidate.id);
    // Do not cache a transient failure for the full standing window.
    if (answer === "unavailable" && this.#standing.get(candidate.id) === held) this.#standing.delete(candidate.id);
    return answer === "active";
  }

  /** The last successful read's hard deadline, measured from its start. */
  standingDeadline(candidate: OAuthAccessCandidate): number | null {
    const held = this.#standing.get(candidate.id), now = this.ports.now();
    return held?.active === true && this.current(candidate) && now >= held.started && now < held.started + OAUTH_STANDING_MS
      ? Math.min(held.started + OAUTH_STANDING_MS, candidate.grant.accessExpires, candidate.grant.ends) : null;
  }

  async #observe(candidate: OAuthAccessCandidate): Promise<"active" | "inactive" | "unavailable"> {
    try {
      mcpRead();
      const key = await this.ports.observe(candidate.agent.membership, { key: candidate.agent.key }) as KeyStanding | null;
      if (!key || typeof key.keyState !== "string" || typeof key.memberState !== "string") return "unavailable";
      if (key.keyState !== "active" || key.memberState !== "active" || key.member !== candidate.agent.handle
        || key.controller !== candidate.grant.controller) return "inactive";
      mcpRead();
      const controller = await this.ports.observe(candidate.agent.membership, { member: candidate.grant.controller }) as MemberStanding | null;
      if (!controller || typeof controller.memberState !== "string") return "unavailable";
      return controller.memberState === "active" ? "active" : "inactive";
    } catch { return "unavailable"; }
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
