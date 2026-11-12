/** Bounded public-client registration and metadata cache. Listed origins and
 * their DNS are trusted. This policy does not inspect the socket address. */
import { addressKey, b64url, canonicalize, digestBytes, LATE, parseStrict, takeBytes, utf8 } from "@generalbusiness/dap-bytes";
import { OAUTH_GRANT_MS } from "./oauth-access.ts";
import { isRegisteredOAuthClient, OAUTH_CLIENT_UNUSED_MS, oauthClient, oauthRedirectPolicy, OAuthError, OAUTH_CLIENT_BYTES, OAUTH_CLIENT_CACHE_MS, OAUTH_CLIENTS_MOST, type OAuthClient, type OAuthRedirectPolicy } from "./oauth-parameters.ts";
import type { Sql } from "./sqlite-custody.ts";
import { McpRequestWindows } from "./request-window.ts";

export interface OAuthSettings { OAUTH_REDIRECT_URIS?: string; OAUTH_CLIENT_METADATA_ORIGINS?: string; OAUTH_DYNAMIC_REGISTRATION?: string }
export interface OAuthPolicy { redirects: OAuthRedirectPolicy; origins: readonly string[]; dynamicRegistration: boolean }
export function oauthMetadataOrigins(setting?: string): readonly string[] | null {
  if (setting === undefined) return Object.freeze(["https://claude.ai", "https://chatgpt.com"]);
  if (utf8(setting).length > 8192) return null;
  try {
    const rows: unknown = JSON.parse(setting);
    if (!Array.isArray(rows) || rows.length > 32 || new Set(rows).size !== rows.length || rows.some(row => {
      if (typeof row !== "string") return true;
      const url = new URL(row);
      return url.protocol !== "https:" || url.origin !== row || !!url.username || !!url.password;
    })) return null;
    return Object.freeze([...rows] as string[]);
  } catch { return null; }
}
export function oauthPolicy(settings: OAuthSettings): OAuthPolicy | null {
  const dynamic = settings.OAUTH_DYNAMIC_REGISTRATION;
  if (dynamic !== undefined && dynamic !== "on") return null;
  const redirects = oauthRedirectPolicy(settings.OAUTH_REDIRECT_URIS), origins = oauthMetadataOrigins(settings.OAUTH_CLIENT_METADATA_ORIGINS);
  return redirects && origins ? { redirects, origins, dynamicRegistration: dynamic === "on" } : null;
}
export function oauthMetadataUrl(id: string, origins: readonly string[]): string | null {
  if (utf8(id).length > 2048 || /[\u0000-\u0020\u007f\\#]/.test(id)) return null;
  try {
    const url = new URL(id);
    if (url.protocol !== "https:" || url.username || url.password || !origins.includes(url.origin)) return null;
    // Check the original path before URL parsing can erase dot segments.
    const raw = /^https:\/\/[^/]+(\/[^?#]*)/.exec(id)?.[1];
    if (!raw || raw.split("/").some(part => /^(?:\.|%2e){1,2}$/i.test(part))) return null;
    return id;
  } catch { return null; }
}
export interface OAuthClientPorts {
  now(): number;
  random(bytes: number): Uint8Array;
  fetch(url: string, init: RequestInit & { credentials: "omit" }): Promise<Response>;
  /** Test deadline port; production always uses five seconds. */
  deadline?: (milliseconds: number, run: () => void) => () => void;
}
const decode = (bytes: Uint8Array): unknown => parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
const invalid = (): never => { throw new OAuthError("invalid_client_metadata"); };

const INVALID_CLIENT_MS = 60_000;
type DocumentResult = { ok: true; client: OAuthClient } | { ok: false; error: OAuthError; cacheInvalid: boolean };
export class OAuthClients {
  readonly #pending = new Map<string, Promise<OAuthClient>>();
  readonly #requestWindows: McpRequestWindows;
  constructor(private readonly sql: Sql, private readonly ports: OAuthClientPorts) {
    this.#requestWindows = new McpRequestWindows(sql);
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_client (id TEXT PRIMARY KEY, row TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL)`);
    // One persisted conservative deadline covers pre-upgrade grants. Object
    // reconstruction never renews an existing row.
    if (!sql.exec(`PRAGMA table_info(oauth_client)`).toArray().some(row => row["name"] === "expires")) {
      const expires = this.#now() + OAUTH_GRANT_MS;
      sql.transaction(() => {
        sql.exec(`ALTER TABLE oauth_client ADD COLUMN expires INTEGER`);
        sql.exec(`UPDATE oauth_client SET expires = ?`, expires);
      });
    }
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_client_cache (id TEXT PRIMARY KEY, row TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_client_invalid (key TEXT PRIMARY KEY, error TEXT NOT NULL CHECK (error IN ('invalid_client_metadata','invalid_redirect_uri')), created INTEGER NOT NULL, expires INTEGER NOT NULL)`);
  }
  #now(): number { const now = this.ports.now(); if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(now + OAUTH_GRANT_MS)) throw new OAuthError("temporarily_unavailable", 503); return now; }
  #read(table: "oauth_client" | "oauth_client_cache", id: string, policy: OAuthRedirectPolicy): OAuthClient | null {
    const scalar = this.sql.exec(`SELECT octet_length(row) AS bytes FROM ${table} WHERE id = ?`, id).toArray()[0];
    if (!scalar || typeof scalar["bytes"] !== "number" || scalar["bytes"] > 8192) return null;
    try { return oauthClient(decode(utf8(String(this.sql.exec(`SELECT row FROM ${table} WHERE id = ?`, id).toArray()[0]!["row"]))), id, policy, true); } catch { return null; }
  }
  register(bytes: Uint8Array, policy: OAuthRedirectPolicy): OAuthClient & { client_id_issued_at: number; grant_types: string[]; response_types: string[] } {
    if (bytes.length > OAUTH_CLIENT_BYTES) return invalid();
    const random = this.ports.random(32); if (random.length !== 32) throw new OAuthError("temporarily_unavailable", 503);
    const id = `dap-client-${b64url(random)}`;
    let client: OAuthClient;
    try { client = oauthClient(decode(bytes), id, policy, false); } catch (error) { if (error instanceof OAuthError) throw error; return invalid(); }
    const now = this.#now(), text = canonicalize(client as never);
    if (utf8(text).length > 8192) return invalid();
    this.sql.transaction(() => {
      this.sql.exec(`DELETE FROM oauth_client WHERE expires <= ?`, now);
      const n = Number(this.sql.exec(`SELECT count(*) AS n FROM oauth_client`).toArray()[0]!["n"]);
      if (n >= OAUTH_CLIENTS_MOST || this.sql.exec(`SELECT id FROM oauth_client WHERE id = ?`, id).toArray().length) throw new OAuthError("temporarily_unavailable", 503);
      this.sql.exec(`INSERT INTO oauth_client (id, row, created, expires) VALUES (?, ?, ?, ?)`, id, text, now, now + OAUTH_CLIENT_UNUSED_MS);
    });
    return { ...client, client_id_issued_at: Math.floor(now / 1000), grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] };
  }
  /** Internal only: the agent calls after signed control and Native authority.
   * Public resolution never writes or renews a registration. */
  retain(client: OAuthClient): number {
    if (!isRegisteredOAuthClient(client.client_id)) return invalid();
    const now = this.#now();
    return this.sql.transaction(() => {
      const row = this.sql.exec(`SELECT row, expires, octet_length(row) AS bytes FROM oauth_client WHERE id = ?`, client.client_id).toArray()[0];
      if (!row || typeof row["expires"] !== "number" || !Number.isSafeInteger(row["expires"]) || row["expires"] <= now
        || typeof row["bytes"] !== "number" || row["bytes"] > 8192 || row["row"] !== canonicalize(client as never)) return invalid();
      const expires = Math.max(row["expires"], now + OAUTH_GRANT_MS);
      this.sql.exec(`UPDATE oauth_client SET expires = ? WHERE id = ?`, expires, client.client_id);
      return expires;
    });
  }
  /** The trusted control adapter verifies signature/body/bindings/deadline first. */
  admitControl(actor: string, cleanup: boolean, address: string | null): void {
    const now = this.ports.now(), purpose = cleanup ? "cleanup" : "control";
    const addressIdentity = "address:" + (addressKey(typeof address === "string" ? address : null) ?? "addressless");
    const addressAdmission = this.#requestWindows.admit(purpose, addressIdentity, now);
    if (addressAdmission !== "allowed") throw new OAuthError(addressAdmission === "limited" ? "rate-limited" : "temporarily_unavailable", addressAdmission === "limited" ? 429 : 503);
    const admission = this.#requestWindows.admit(purpose, "key:" + actor, now);
    if (admission !== "allowed") throw new OAuthError(admission === "limited" ? "rate-limited" : "temporarily_unavailable", admission === "limited" ? 429 : 503);
  }
  /** Anonymous context work is admitted before any client resolution or fetch. */
  admitContext(address: string | null): void {
    const admission = this.#requestWindows.admit("context", addressKey(address) ?? "addressless", this.ports.now());
    if (admission !== "allowed") throw new OAuthError(admission === "limited" ? "rate-limited" : "temporarily_unavailable", admission === "limited" ? 429 : 503);
  }
  async resolve(id: string, policy: OAuthPolicy): Promise<OAuthClient> {
    const redirects: OAuthRedirectPolicy = { exact: [...policy.redirects.exact], loopback: policy.redirects.loopback };
    if (typeof id !== "string" || utf8(id).length > 2048) return invalid();
    if (isRegisteredOAuthClient(id)) {
      const expires = this.sql.exec(`SELECT expires FROM oauth_client WHERE id = ?`, id).toArray()[0]?.["expires"];
      if (typeof expires !== "number" || !Number.isSafeInteger(expires) || expires <= this.#now()) return invalid();
      return this.#read("oauth_client", id, redirects) ?? invalid();
    }
    const url = oauthMetadataUrl(id, policy.origins); if (url === null) return invalid();
    const now = this.#now();
    const held = this.sql.exec(`SELECT created, expires FROM oauth_client_cache WHERE id = ?`, id).toArray()[0];
    if (held && typeof held["created"] === "number" && typeof held["expires"] === "number" && held["created"] <= now && held["expires"] > now && held["expires"] <= held["created"] + OAUTH_CLIENT_CACHE_MS) {
      const client = this.#read("oauth_client_cache", id, redirects); if (client) return client;
    }
    // Policy identity also separates in-flight failures: an incompatible
    // redirect policy must not lend its negative result to another caller.
    const cacheKey = digestBytes(utf8(canonicalize([url, redirects])));
    this.sql.exec(`DELETE FROM oauth_client_invalid WHERE expires <= ? OR created > ?`, now, now);
    const negative = this.sql.exec(`SELECT error, created, expires FROM oauth_client_invalid WHERE key = ?`, cacheKey).toArray()[0];
    if (negative && typeof negative["created"] === "number" && Number.isSafeInteger(negative["created"]) && negative["created"] <= now
      && typeof negative["expires"] === "number" && Number.isSafeInteger(negative["expires"]) && negative["expires"] > now && negative["expires"] === negative["created"] + INVALID_CLIENT_MS
      && (negative["error"] === "invalid_client_metadata" || negative["error"] === "invalid_redirect_uri")) throw new OAuthError(negative["error"]);
    const prior = this.#pending.get(cacheKey); if (prior) return oauthClient(await prior, id, redirects, true);
    if (this.#pending.size >= OAUTH_CLIENTS_MOST) throw new OAuthError("temporarily_unavailable", 503);
    const loading = this.#document(url, redirects).then(outcome => {
      const saved = this.#now();
      if (saved < now) throw new OAuthError("temporarily_unavailable", 503);
      if (!outcome.ok) {
        if (outcome.cacheInvalid) this.sql.transaction(() => {
          this.sql.exec(`DELETE FROM oauth_client_invalid WHERE expires <= ? OR created > ?`, saved, saved);
          const n = Number(this.sql.exec(`SELECT count(*) AS n FROM oauth_client_invalid`).toArray()[0]!["n"]);
          if (n < OAUTH_CLIENTS_MOST) this.sql.exec(`INSERT INTO oauth_client_invalid (key, error, created, expires) VALUES (?, ?, ?, ?) ON CONFLICT (key) DO UPDATE SET error = excluded.error, created = excluded.created, expires = excluded.expires`, cacheKey, outcome.error.error, saved, saved + INVALID_CLIENT_MS);
        });
        throw outcome.error;
      }
      const client = outcome.client, text = canonicalize(client as never); if (utf8(text).length > 8192) return invalid();
      this.sql.transaction(() => {
        this.sql.exec(`DELETE FROM oauth_client_cache WHERE expires <= ? OR created > ?`, saved, saved);
        const existing = this.sql.exec(`SELECT id FROM oauth_client_cache WHERE id = ?`, id).toArray()[0];
        if (!existing && Number(this.sql.exec(`SELECT count(*) AS n FROM oauth_client_cache`).toArray()[0]!["n"]) >= OAUTH_CLIENTS_MOST) this.sql.exec(`DELETE FROM oauth_client_cache WHERE id = (SELECT id FROM oauth_client_cache ORDER BY created, id LIMIT 1)`);
        this.sql.exec(`INSERT INTO oauth_client_cache (id, row, created, expires) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET row = excluded.row, created = excluded.created, expires = excluded.expires`, id, text, saved, saved + OAUTH_CLIENT_CACHE_MS);
      });
      return client;
    });
    this.#pending.set(cacheKey, loading);
    try { return await loading; } finally { if (this.#pending.get(cacheKey) === loading) this.#pending.delete(cacheKey); }
  }
  async #document(id: string, policy: OAuthRedirectPolicy): Promise<DocumentResult> {
    const abort = new AbortController(); let stop = () => {};
    const timeout = new Promise<never>((_resolve, reject) => {
      const end = () => { abort.abort(); reject(new OAuthError("temporarily_unavailable", 503)); };
      if (this.ports.deadline) stop = this.ports.deadline(5000, end);
      else { const timer = setTimeout(end, 5000); stop = () => clearTimeout(timer); }
    });
    const rejected = (cacheInvalid: boolean, error = new OAuthError("invalid_client_metadata")): DocumentResult => ({ ok: false, error, cacheInvalid });
    const request = async (): Promise<DocumentResult> => {
      const response = await this.ports.fetch(id, { redirect: "manual", credentials: "omit", signal: abort.signal, headers: { accept: "application/json" } });
      if (response.status !== 200) { void response.body?.cancel().catch(() => {}); return rejected(false); }
      if (response.redirected || !/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "") || Number(response.headers.get("content-length") ?? 0) > OAUTH_CLIENT_BYTES || !response.body) { void response.body?.cancel().catch(() => {}); return rejected(true); }
      const bytes = await takeBytes(response.body, OAUTH_CLIENT_BYTES, abort.signal);
      if (bytes === LATE) throw new OAuthError("temporarily_unavailable", 503);
      if (bytes === null) return rejected(true);
      try { return { ok: true, client: oauthClient(decode(bytes), id, policy, true) }; }
      catch (error) { return rejected(error instanceof OAuthError ? error.status === 400 && (error.error === "invalid_client_metadata" || error.error === "invalid_redirect_uri") : true, error instanceof OAuthError ? error : new OAuthError("invalid_client_metadata")); }
    };
    try { return await Promise.race([timeout, request()]); }
    catch (error) { if (error instanceof OAuthError) throw error; throw new OAuthError("temporarily_unavailable", 503); }
    finally { stop(); }
  }
}
