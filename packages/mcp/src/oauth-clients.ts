/** Bounded public-client registration and metadata cache. Listed origins and
 * their DNS are trusted. This policy does not inspect the socket address. */
import { b64url, canonicalize, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { oauthClient, oauthRedirectPolicy, OAuthError, OAUTH_CLIENT_BYTES, OAUTH_CLIENT_CACHE_MS, OAUTH_CLIENTS_MOST, type OAuthClient, type OAuthRedirectPolicy } from "./oauth-parameters.ts";
import type { Sql } from "./sqlite-custody.ts";

export interface OAuthSettings { OAUTH_REDIRECT_URIS?: string; OAUTH_CLIENT_METADATA_ORIGINS?: string }
export interface OAuthPolicy { redirects: OAuthRedirectPolicy; origins: readonly string[] }
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
  const redirects = oauthRedirectPolicy(settings.OAUTH_REDIRECT_URIS), origins = oauthMetadataOrigins(settings.OAUTH_CLIENT_METADATA_ORIGINS);
  return redirects && origins ? { redirects, origins } : null;
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

export class OAuthClients {
  readonly #pending = new Map<string, Promise<OAuthClient>>();
  constructor(private readonly sql: Sql, private readonly ports: OAuthClientPorts) {
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_client (id TEXT PRIMARY KEY, row TEXT NOT NULL, created INTEGER NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS oauth_client_cache (id TEXT PRIMARY KEY, row TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL)`);
  }
  #now(): number { const now = this.ports.now(); if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(now + OAUTH_CLIENT_CACHE_MS)) throw new OAuthError("temporarily_unavailable", 503); return now; }
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
      const n = Number(this.sql.exec(`SELECT count(*) AS n FROM oauth_client`).toArray()[0]!["n"]);
      if (n >= OAUTH_CLIENTS_MOST || this.sql.exec(`SELECT id FROM oauth_client WHERE id = ?`, id).toArray().length) throw new OAuthError("temporarily_unavailable", 503);
      this.sql.exec(`INSERT INTO oauth_client (id, row, created) VALUES (?, ?, ?)`, id, text, now);
    });
    return { ...client, client_id_issued_at: Math.floor(now / 1000), grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] };
  }
  async resolve(id: string, policy: OAuthPolicy): Promise<OAuthClient> {
    if (typeof id !== "string" || utf8(id).length > 2048) return invalid();
    if (/^dap-client-[A-Za-z0-9_-]{43}$/.test(id)) return this.#read("oauth_client", id, policy.redirects) ?? invalid();
    const url = oauthMetadataUrl(id, policy.origins); if (url === null) return invalid();
    const now = this.#now();
    const held = this.sql.exec(`SELECT created, expires FROM oauth_client_cache WHERE id = ?`, id).toArray()[0];
    if (held && typeof held["created"] === "number" && typeof held["expires"] === "number" && held["created"] <= now && held["expires"] > now && held["expires"] <= held["created"] + OAUTH_CLIENT_CACHE_MS) {
      const client = this.#read("oauth_client_cache", id, policy.redirects); if (client) return client;
    }
    const prior = this.#pending.get(id); if (prior) return oauthClient(await prior, id, policy.redirects, true);
    if (this.#pending.size >= OAUTH_CLIENTS_MOST) throw new OAuthError("temporarily_unavailable", 503);
    const loading = this.#document(url, policy.redirects).then(client => {
      const saved = this.#now(), text = canonicalize(client as never); if (utf8(text).length > 8192) return invalid();
      this.sql.transaction(() => {
        this.sql.exec(`DELETE FROM oauth_client_cache WHERE expires <= ? OR created > ?`, saved, saved);
        const existing = this.sql.exec(`SELECT id FROM oauth_client_cache WHERE id = ?`, id).toArray()[0];
        if (!existing && Number(this.sql.exec(`SELECT count(*) AS n FROM oauth_client_cache`).toArray()[0]!["n"]) >= OAUTH_CLIENTS_MOST) this.sql.exec(`DELETE FROM oauth_client_cache WHERE id = (SELECT id FROM oauth_client_cache ORDER BY created, id LIMIT 1)`);
        this.sql.exec(`INSERT INTO oauth_client_cache (id, row, created, expires) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET row = excluded.row, created = excluded.created, expires = excluded.expires`, id, text, saved, saved + OAUTH_CLIENT_CACHE_MS);
      });
      return client;
    });
    this.#pending.set(id, loading);
    try { return await loading; } finally { if (this.#pending.get(id) === loading) this.#pending.delete(id); }
  }
  async #document(id: string, policy: OAuthRedirectPolicy): Promise<OAuthClient> {
    const abort = new AbortController(); let reader: ReadableStreamDefaultReader<Uint8Array> | null = null, stop = () => {};
    const timeout = new Promise<never>((_resolve, reject) => {
      const end = () => { abort.abort(); void reader?.cancel().catch(() => {}); reject(new OAuthError("temporarily_unavailable", 503)); };
      if (this.ports.deadline) stop = this.ports.deadline(5000, end);
      else { const timer = setTimeout(end, 5000); stop = () => clearTimeout(timer); }
    });
    const request = async (): Promise<OAuthClient> => {
      const response = await this.ports.fetch(id, { redirect: "manual", credentials: "omit", signal: abort.signal, headers: { accept: "application/json" } });
      if (response.status !== 200 || response.redirected || !/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "") || Number(response.headers.get("content-length") ?? 0) > OAUTH_CLIENT_BYTES || !response.body) { void response.body?.cancel().catch(() => {}); return invalid(); }
      reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
      try {
        for (;;) {
          const chunk = await reader.read(); if (chunk.done) break;
          length += chunk.value.length; if (length > OAUTH_CLIENT_BYTES) { void reader.cancel().catch(() => {}); return invalid(); }
          chunks.push(chunk.value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      try { return oauthClient(decode(bytes), id, policy, true); } catch (error) { if (error instanceof OAuthError) throw error; return invalid(); }
    };
    try { return await Promise.race([timeout, request()]); }
    catch (error) { if (error instanceof OAuthError) throw error; throw new OAuthError("temporarily_unavailable", 503); }
    finally { stop(); }
  }
}
