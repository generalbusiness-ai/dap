/** One public client, exact registered redirects, and a single connector audience. */
import { b64url, digestBytes, unb64url, utf8 } from "@generalbusiness/dap-bytes";

export const OAUTH_CLIENT_BYTES = 5 * 1024;
export const OAUTH_CLIENT_CACHE_MS = 3_600_000;
export const OAUTH_CLIENTS_MOST = 1000;
export const OAUTH_CODE_MS = 60_000;
export const OAUTH_OWN_INVITATION_MS = 3_600_000;
export interface OAuthClient {
  client_id: string;
  client_name: string;
  redirect_uris: readonly string[];
  token_endpoint_auth_method: "none";
}
export interface OAuthBinding {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  resource: string;
  scope: "mcp";
  state_digest: string;
}
export class OAuthError extends Error {
  constructor(readonly error: string, readonly status = 400) { super(error); }
}
const fail = (reason: string): never => { throw new OAuthError(reason); };
const bounded = (value: unknown, most: number): value is string => typeof value === "string" && utf8(value).length > 0 && utf8(value).length <= most && !/[\u0000-\u001f\u007f]/.test(value);
function redirectUrl(value: unknown): URL | null {
  if (!bounded(value, 2048) || value.includes("#") || value.includes("\\")) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || !url.hostname || !["https:", "http:"].includes(url.protocol)) return null;
    if (url.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname)) return null;
    return url;
  } catch { return null; }
}
export interface OAuthRedirectPolicy { exact: readonly string[]; loopback: boolean }
/** A custom list replaces the defaults and admits only exact strings. */
export function oauthRedirectPolicy(setting?: string): OAuthRedirectPolicy | null {
  if (setting === undefined) return { exact: ["https://claude.ai/api/mcp/auth_callback", "https://chatgpt.com/connector_platform_oauth_redirect"], loopback: true };
  if (utf8(setting).length > 32_800) return null;
  try {
    const rows: unknown = JSON.parse(setting);
    if (!Array.isArray(rows) || rows.length > 32 || rows.some(row => redirectUrl(row) === null) || new Set(rows).size !== rows.length) return null;
    return { exact: Object.freeze([...rows] as string[]), loopback: false };
  } catch { return null; }
}
export function allowedOAuthRedirect(value: string, policy: OAuthRedirectPolicy): boolean {
  const url = redirectUrl(value);
  return url !== null && (policy.exact.includes(value) || policy.loopback && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
}
/** The normalized public fields are all the issuer uses. It follows no logo,
 * JWK or other URL supplied inside a client document. */
export function oauthClient(value: unknown, id: string, policy: OAuthRedirectPolicy, document: boolean): OAuthClient {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("invalid_client_metadata");
  const row = value as Record<string, unknown>;
  if (document && row["client_id"] !== id || !bounded(id, 2048)
    || Object.hasOwn(row, "client_secret") || Object.hasOwn(row, "client_secret_expires_at")
    || row["token_endpoint_auth_method"] !== undefined && row["token_endpoint_auth_method"] !== "none"
    || row["grant_types"] !== undefined && (!Array.isArray(row["grant_types"]) || row["grant_types"].some(grant => !["authorization_code", "refresh_token"].includes(String(grant))))
    || row["response_types"] !== undefined && (!Array.isArray(row["response_types"]) || row["response_types"].some(type => type !== "code"))) return fail("invalid_client_metadata");
  const redirects = row["redirect_uris"];
  if (!Array.isArray(redirects) || redirects.length === 0 || redirects.length > 16 || redirects.some(uri => typeof uri !== "string" || !allowedOAuthRedirect(uri, policy)) || new Set(redirects).size !== redirects.length) return fail("invalid_redirect_uri");
  let fallback = "Registered client";
  try { fallback = new URL(id).hostname; } catch { /* Registered IDs can be opaque. */ }
  const name = row["client_name"] ?? fallback;
  if (!bounded(name, 128)) return fail("invalid_client_metadata");
  return { client_id: id, client_name: name, redirect_uris: Object.freeze([...redirects] as string[]), token_endpoint_auth_method: "none" };
}
export function isPkceChallenge(value: unknown): value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) return false;
  const bytes = unb64url(value);
  return bytes?.length === 32 && b64url(bytes) === value;
}
export async function pkceChallenge(verifier: string): Promise<string> {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return fail("invalid_grant");
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(utf8(verifier)))));
}
/** Duplicated security parameters never select one value by accident. The
 * caller keeps state locally; only its digest enters the signed grant. */
export function oauthAuthorization(query: URLSearchParams, client: OAuthClient, resources: readonly string[], policy: OAuthRedirectPolicy): { binding: OAuthBinding; state: string } {
  for (const key of ["response_type", "client_id", "redirect_uri", "code_challenge", "code_challenge_method", "resource", "scope", "state"]) if (query.getAll(key).length > 1) return fail("invalid_request");
  if (query.get("response_type") !== "code") return fail("unsupported_response_type");
  if (query.get("client_id") !== client.client_id) return fail("invalid_client");
  const redirect = query.get("redirect_uri");
  if (redirect === null || !allowedOAuthRedirect(redirect, policy) || !client.redirect_uris.includes(redirect)) return fail("invalid_redirect_uri");
  const challenge = query.get("code_challenge");
  if (query.get("code_challenge_method") !== "S256" || !isPkceChallenge(challenge)) return fail("invalid_request");
  const resource = query.get("resource");
  if (resource === null || !resources.includes(resource)) return fail("invalid_target");
  if ((query.get("scope") ?? "mcp") !== "mcp") return fail("invalid_scope");
  const state = query.get("state");
  if (!bounded(state, 2048)) return fail("invalid_request");
  return { binding: { client_id: client.client_id, redirect_uri: redirect, code_challenge: challenge, resource, scope: "mcp", state_digest: digestBytes(utf8(state)) }, state };
}
