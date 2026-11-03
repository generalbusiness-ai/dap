/** Durable single-use codes and rotating public-client tokens. Native authority
 * belongs to the caller's fresh standing port, never to these credentials. */
import type { MemberId } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, isDigest, isMemberId, parseStrict, same, utf8 } from "@generalbusiness/dap-bytes";
import { equalTokenDigest, OAUTH_ACCESS_MS, OAUTH_GRANT_BYTES, OAUTH_GRANT_MS, OAUTH_GRANTS_MOST, type OAuthAccess, type OAuthAccessGrant, type OAuthAgentIdentity } from "./oauth-access.ts";
import { isPkceChallenge, OAUTH_CODE_MS, OAuthError, pkceChallenge, type OAuthBinding } from "./oauth-parameters.ts";
import { isMcpResource } from "./oauth-resource.ts";
import type { Sql } from "./sqlite-custody.ts";

const DETAILS_MOST = 8192, OVERHEAD = 128, TOKEN_RESERVE = OAUTH_GRANT_BYTES + 512;
type State = "pending" | "active" | "ended";
interface Details {
  op: string; binding: OAuthBinding; clientName: string; controller: MemberId;
  created: number; ends: number; codeDigest: string; codeExpires: number;
  codeUsed: boolean; refreshDigest: string | null; reserved: number; state: State;
}
interface Held { id: string; text: string; value: Details }
export interface OAuthIssuerPorts {
  id: string;
  now(): number;
  random(bytes: number): Uint8Array;
  agent(): OAuthAgentIdentity | null;
  /** Run inside the same SQL transaction as every durable change. */
  charge(bytes: number): boolean;
  standing(controller: MemberId): Promise<"active" | "inactive" | "unavailable">;
  /** A deterministic deadline in tests; production uses a cancellable timer. */
  deadline?: (milliseconds: number, run: () => void) => () => void;
  /** Close this grant's transport and remove its sessions after revocation. */
  ended(id: string): Promise<void>;
  /** Close the old token's layer while keeping this client's retained sessions. */
  rotated(id: string): Promise<void>;
}
export interface OAuthResult { status: number; body: Record<string, unknown> }
const result = (status: number, body: Record<string, unknown>): OAuthResult => ({ status, body });
const invalid = () => result(400, { error: "invalid_grant" });
const unavailable = () => result(503, { error: "temporarily_unavailable" });
const digest = (value: string) => digestBytes(utf8(value));
const bounded = (value: unknown, most: number): value is string => typeof value === "string" && utf8(value).length > 0 && utf8(value).length <= most;

/** Called only after the signed grant's client, redirect, audience, controller
 * and role subset have passed. It stores no code or token plaintext. */
export class OAuthIssuer {
  constructor(private readonly sql: Sql, private readonly ports: OAuthIssuerPorts, private readonly access: OAuthAccess) {
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_issuer (id TEXT PRIMARY KEY, op TEXT NOT NULL UNIQUE, row TEXT NOT NULL, state TEXT NOT NULL CHECK (state IN ('pending','active','ended')), created INTEGER NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_refresh_used (digest TEXT PRIMARY KEY, grant_id TEXT NOT NULL, created INTEGER NOT NULL)`);
  }
  #now(): number {
    const now = this.ports.now();
    if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(now + OAUTH_GRANT_MS)) throw new OAuthError("temporarily_unavailable", 503);
    return now;
  }
  #secret(): string {
    const bytes = this.ports.random(32);
    if (!(bytes instanceof Uint8Array) || bytes.length !== 32) throw new OAuthError("temporarily_unavailable", 503);
    return b64url(bytes);
  }
  #charge(bytes: number): void { if (!this.ports.charge(bytes)) throw new OAuthError("temporarily_unavailable", 503); }
  #cost(id: string, value: Details, text = canonicalize(value)): number { return utf8(text).length + utf8(id).length + utf8(value.op).length + value.state.length + 8 + OVERHEAD; }
  #read(id: string): Held | null {
    if (!isPkceChallenge(id)) return null;
    const size = this.sql.exec(`SELECT octet_length(row) AS bytes FROM oauth_issuer WHERE id = ?`, id).toArray()[0];
    if (!size || typeof size["bytes"] !== "number" || size["bytes"] > DETAILS_MOST) return null;
    const row = this.sql.exec(`SELECT row, op, state FROM oauth_issuer WHERE id = ?`, id).toArray()[0]!;
    try {
      const text = String(row["row"]), value = parseStrict(text) as Details, b = value.binding;
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 12
        || !bounded(value.op, 128) || value.op !== row["op"] || !["pending", "active", "ended"].includes(value.state) || value.state !== row["state"]
        || !isMemberId(value.controller) || !bounded(value.clientName, 128)
        || ![value.created, value.ends, value.codeExpires].every(n => Number.isSafeInteger(n) && n >= 0)
        || value.ends <= value.created || value.ends > value.created + OAUTH_GRANT_MS || value.codeExpires !== value.created + OAUTH_CODE_MS
        || typeof value.codeUsed !== "boolean" || !isDigest(value.codeDigest) || value.refreshDigest !== null && !isDigest(value.refreshDigest)
        || ![0, TOKEN_RESERVE].includes(value.reserved)
        || !b || typeof b !== "object" || Array.isArray(b) || Object.keys(b).length !== 6
        || !bounded(b.client_id, 2048) || !bounded(b.redirect_uri, 2048) || !isPkceChallenge(b.code_challenge)
        || !isMcpResource(b.resource) || b.scope !== "mcp" || !isDigest(b.state_digest)) return null;
      return { id, text, value };
    } catch { return null; }
  }
  #write(id: string, value: Details, before: Held | null): void {
    const text = canonicalize(value);
    if (utf8(text).length > DETAILS_MOST) throw new OAuthError("invalid_request");
    this.#charge(this.#cost(id, value, text) - (before ? this.#cost(id, before.value, before.text) : 0) + value.reserved - (before?.value.reserved ?? 0));
    this.sql.exec(`INSERT INTO oauth_issuer (id, op, row, state, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET row = excluded.row, state = excluded.state`, id, value.op, text, value.state, value.created);
  }
  #end(held: Held): void {
    if (held.value.state === "ended") return;
    this.#write(held.id, { ...held.value, state: "ended", reserved: 0, refreshDigest: null }, held);
    this.access.end(held.id);
    const used = this.sql.exec(`SELECT coalesce(sum(octet_length(digest) + octet_length(grant_id) + 8 + ?), 0) AS bytes FROM oauth_refresh_used WHERE grant_id = ?`, OVERHEAD, held.id).toArray()[0]!["bytes"];
    this.sql.exec(`DELETE FROM oauth_refresh_used WHERE grant_id = ?`, held.id);
    this.#charge(-Number(used));
  }
  async #notify(ids: readonly string[]): Promise<void> { for (const id of new Set(ids)) await this.ports.ended(id); }
  #sameAgent(expected: OAuthAgentIdentity): boolean {
    const now = this.ports.agent();
    return now?.state === "enrolled" && now.key === expected.key && now.handle === expected.handle && same(now.membership, expected.membership);
  }
  async #standing(controller: MemberId, milliseconds: number): Promise<"active" | "inactive" | "unavailable"> {
    return new Promise(resolve => {
      let complete = false, stop = () => {};
      const finish = (answer: "active" | "inactive" | "unavailable") => {
        if (complete) return;
        complete = true; stop(); resolve(answer);
      };
      if (this.ports.deadline) stop = this.ports.deadline(milliseconds, () => finish("unavailable"));
      else { const timer = setTimeout(() => finish("unavailable"), milliseconds); stop = () => clearTimeout(timer); }
      if (complete) stop();
      try { void this.ports.standing(controller).then(finish, () => finish("unavailable")); }
      catch { finish("unavailable"); }
    });
  }
  async issue(op: string, controller: MemberId, binding: OAuthBinding, clientName: string): Promise<OAuthResult> {
    const agent = this.ports.agent();
    if (!agent || agent.state !== "enrolled" || !isMemberId(controller) || !bounded(op, 128) || !bounded(clientName, 128)) return result(403, { error: "unauthorized" });
    const ended: string[] = [];
    const issued = this.sql.transaction(() => {
      const existingId = this.sql.exec(`SELECT id FROM oauth_issuer WHERE op = ?`, op).toArray()[0]?.["id"];
      if (typeof existingId === "string") {
        const old = this.#read(existingId);
        if (!old || old.value.controller !== controller || canonicalize(old.value.binding) !== canonicalize(binding)) return result(409, { error: "op", rule: "fingerprint" });
        return result(200, { agent: this.ports.id, grant: existingId, codeShown: true, state_digest: old.value.binding.state_digest });
      }
      const now = this.#now();
      for (const row of this.sql.exec(`SELECT id FROM oauth_issuer WHERE state = 'pending' ORDER BY created, id LIMIT ?`, OAUTH_GRANTS_MOST).toArray()) {
        const old = this.#read(String(row["id"]));
        if (old && now >= old.value.codeExpires) { this.#end(old); ended.push(old.id); }
      }
      const count = Number(this.sql.exec(`SELECT count(*) AS n FROM oauth_issuer WHERE state IN ('pending','active')`).toArray()[0]!["n"]);
      if (count > OAUTH_GRANTS_MOST) throw new OAuthError("temporarily_unavailable", 503);
      if (count === OAUTH_GRANTS_MOST) {
        const id = String(this.sql.exec(`SELECT id FROM oauth_issuer WHERE state IN ('pending','active') ORDER BY created, id LIMIT 1`).toArray()[0]!["id"]);
        const oldest = this.#read(id);
        if (!oldest) throw new OAuthError("temporarily_unavailable", 503);
        this.#end(oldest); ended.push(id);
      }
      const id = this.#secret(), secret = this.#secret();
      if (this.sql.exec(`SELECT id FROM oauth_issuer WHERE id = ?`, id).toArray().length) throw new OAuthError("temporarily_unavailable", 503);
      const value: Details = { op, binding: structuredClone(binding), clientName, controller, created: now, ends: now + OAUTH_GRANT_MS, codeDigest: digest(secret), codeExpires: now + OAUTH_CODE_MS, codeUsed: false, refreshDigest: null, reserved: TOKEN_RESERVE, state: "pending" };
      this.#write(id, value, null);
      return result(201, { agent: this.ports.id, grant: id, code: `${this.ports.id}.${id}.${secret}`, state_digest: binding.state_digest });
    });
    await this.#notify(ended);
    return issued;
  }
  #tokens(held: Held, now: number): OAuthResult {
    const secret = this.#secret(), refresh = this.#secret(), expires = Math.min(now + OAUTH_ACCESS_MS, held.value.ends);
    const access: OAuthAccessGrant = { controller: held.value.controller, resource: held.value.binding.resource, created: held.value.created, ends: held.value.ends, accessIssued: now, accessExpires: expires, accessDigest: digest(secret) };
    const text = canonicalize(access);
    if (utf8(text).length > OAUTH_GRANT_BYTES) throw new OAuthError("temporarily_unavailable", 503);
    // Release the code's completion reservation in this same transaction.
    this.#write(held.id, { ...held.value, codeUsed: true, refreshDigest: digest(refresh), state: "active", reserved: 0 }, held);
    const before = this.sql.exec(`SELECT octet_length(row) AS bytes, state FROM oauth_grant WHERE id = ?`, held.id).toArray()[0];
    this.#charge(utf8(text).length + held.id.length + 6 + 8 + OVERHEAD - (before ? Number(before["bytes"]) + held.id.length + String(before["state"]).length + 8 + OVERHEAD : 0));
    this.sql.exec(`INSERT INTO oauth_grant (id, row, state, created) VALUES (?, ?, 'active', ?) ON CONFLICT (id) DO UPDATE SET row = excluded.row, state = 'active'`, held.id, text, access.created);
    return result(200, { access_token: `${this.ports.id}.${held.id}.${secret}`, token_type: "Bearer", expires_in: Math.floor((expires - now) / 1000), refresh_token: `${this.ports.id}.${held.id}.${refresh}`, scope: "mcp" });
  }
  async exchange(id: string, secret: string, client: string, redirect: string, verifier: string, resource?: string): Promise<OAuthResult> {
    const held = this.#read(id), now = this.#now(), agent = this.ports.agent();
    if (!held || !agent || agent.state !== "enrolled" || !isPkceChallenge(secret) || !equalTokenDigest(held.value.codeDigest, secret)
      || held.value.binding.client_id !== client || held.value.binding.redirect_uri !== redirect || resource !== undefined && held.value.binding.resource !== resource) return invalid();
    if (held.value.state === "ended" || now < held.value.created || now >= held.value.ends || now >= held.value.codeExpires) return invalid();
    if (await pkceChallenge(verifier) !== held.value.binding.code_challenge) return invalid();
    const standing = await this.#standing(held.value.controller, 8_000);
    if (standing === "unavailable") return unavailable();
    let ended = false;
    const exchanged = this.sql.transaction(() => {
      const current = this.#read(id), after = this.#now();
      if (!current || current.value.state === "ended" || !this.#sameAgent(agent)) return invalid();
      if (standing === "inactive" || current.value.codeUsed) { this.#end(current); ended = true; return invalid(); }
      if (current.text !== held.text || after < current.value.created || after >= current.value.codeExpires || after >= current.value.ends) return invalid();
      return this.#tokens(current, after);
    });
    if (ended) await this.#notify([id]);
    if (exchanged.status === 200) await this.ports.rotated(id);
    return exchanged;
  }
  async refresh(id: string, secret: string, client: string, resource?: string): Promise<OAuthResult> {
    const held = this.#read(id), now = this.#now(), agent = this.ports.agent();
    if (!held || !agent || agent.state !== "enrolled" || !isPkceChallenge(secret) || held.value.state !== "active" || held.value.binding.client_id !== client
      || now < held.value.created || now >= held.value.ends || resource !== undefined && held.value.binding.resource !== resource) return invalid();
    const used = () => this.sql.exec(`SELECT digest FROM oauth_refresh_used WHERE digest = ? AND grant_id = ?`, digest(secret), id).toArray().length > 0;
    if (!held.value.refreshDigest || !equalTokenDigest(held.value.refreshDigest, secret)) {
      if (used()) { this.sql.transaction(() => { const current = this.#read(id); if (current) this.#end(current); }); await this.#notify([id]); }
      return invalid();
    }
    const standing = await this.#standing(held.value.controller, 28_000);
    if (standing === "unavailable") return unavailable();
    let ended = false;
    const refreshed = this.sql.transaction(() => {
      const current = this.#read(id), after = this.#now();
      if (!current || current.value.state !== "active" || !this.#sameAgent(agent)) return invalid();
      if (standing === "inactive" || used()) { this.#end(current); ended = true; return invalid(); }
      if (current.text !== held.text || after < current.value.created || after >= current.value.ends) return invalid();
      const oldDigest = digest(secret);
      this.#charge(oldDigest.length + id.length + 8 + OVERHEAD);
      this.sql.exec(`INSERT INTO oauth_refresh_used (digest, grant_id, created) VALUES (?, ?, ?)`, oldDigest, id, after);
      return this.#tokens(current, after);
    });
    if (ended) await this.#notify([id]);
    if (refreshed.status === 200) await this.ports.rotated(id);
    return refreshed;
  }
  async revokeToken(id: string, secret: string, client: string): Promise<OAuthResult> {
    const held = this.#read(id);
    if (!held || held.value.state === "ended" || held.value.binding.client_id !== client || !isPkceChallenge(secret)) return result(200, {});
    const access = this.sql.exec(`SELECT row FROM oauth_grant WHERE id = ?`, id).toArray()[0];
    let accessDigest: string | null = null;
    try { accessDigest = access ? (parseStrict(String(access["row"])) as OAuthAccessGrant).accessDigest : null; } catch { /* Unreadable access row proves no credential. */ }
    const known = held.value.refreshDigest !== null && equalTokenDigest(held.value.refreshDigest, secret) || accessDigest !== null && equalTokenDigest(accessDigest, secret)
      || this.sql.exec(`SELECT digest FROM oauth_refresh_used WHERE digest = ? AND grant_id = ?`, digest(secret), id).toArray().length > 0;
    if (known) { this.sql.transaction(() => { const current = this.#read(id); if (current) this.#end(current); }); await this.#notify([id]); }
    return result(200, {});
  }
  /** The authenticated controller/admin route checks authority before this call. */
  async revokeGrant(id: string): Promise<OAuthResult> {
    const held = this.#read(id);
    if (held) { this.sql.transaction(() => this.#end(held)); await this.#notify([id]); }
    return result(200, { revoked: true });
  }
  async revokeAll(): Promise<void> {
    const ended: string[] = [];
    this.sql.transaction(() => {
      for (const row of this.sql.exec(`SELECT id FROM oauth_issuer WHERE state IN ('pending','active') ORDER BY created, id LIMIT ?`, OAUTH_GRANTS_MOST).toArray()) {
        const held = this.#read(String(row["id"]));
        if (held) { this.#end(held); ended.push(held.id); }
      }
    });
    await this.#notify(ended);
  }
  list(): { id: string; client_id: string; client_name: string; resource: string; controller: MemberId; ends: number }[] {
    const now = this.#now();
    return this.sql.exec(`SELECT id FROM oauth_issuer WHERE state IN ('pending','active') ORDER BY created, id LIMIT ?`, OAUTH_GRANTS_MOST).toArray().flatMap(row => {
      const held = this.#read(String(row["id"]));
      return held && held.value.ends > now && (held.value.state !== "pending" || held.value.codeExpires > now)
        ? [{ id: held.id, client_id: held.value.binding.client_id, client_name: held.value.clientName, resource: held.value.binding.resource, controller: held.value.controller, ends: held.value.ends }] : [];
    });
  }
}
