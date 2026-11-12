/** OAuth wire bounds and public-client routing. The caller admits the hosted
 * deployment, public origin, resource list and OAuth policy first. */
import { oauthAuthorization, OAuthError, OAUTH_CLIENT_BYTES, type ControlAnswer, type OAuthClient, type OAuthPolicy } from "@generalbusiness/dap-mcp";
import type { ControlAction, SignedControl } from "@generalbusiness/dap-contract";
export const OAUTH_METADATA_PATH = "/.well-known/oauth-authorization-server";
export const OAUTH_CLIENT_REGISTRY = "oauth-public-clients-1";
export interface OAuthPublicClients {
  admitControl(signed: SignedControl, service: string, action: ControlAction, agent: string | null, address: string | null): Promise<ControlAnswer>;
  admitContext(address: string | null): Promise<ControlAnswer>;
  registerClient(bytes: Uint8Array, policy: OAuthPolicy): Promise<ControlAnswer>;
  resolveClient(id: string, policy: OAuthPolicy): Promise<ControlAnswer>;
}
export interface OAuthTokenAgent {
  exchangeCode(id: string, secret: string, client: string, redirect: string, verifier: string, resource?: string): Promise<ControlAnswer>;
  refreshGrant(id: string, secret: string, client: string, resource?: string): Promise<ControlAnswer>;
  revokeToken(id: string, secret: string, client: string): Promise<ControlAnswer>;
}
interface Ports {
  origin: string; resources: readonly string[]; policy: OAuthPolicy; clients: OAuthPublicClients; address: string | null;
  agent(id: string): OAuthTokenAgent | null;
  read(request: Request, most: number): Promise<Uint8Array | "too-large" | "unreadable">;
}
export function oauthAnswer(result: ControlAnswer): Response {
  return new Response(JSON.stringify(result.body), { status: result.status, headers: { "content-type": "application/json", "cache-control": "no-store", pragma: "no-cache", ...(result.status === 503 ? { "retry-after": "1" } : {}) } });
}
const error = (status: number, name: string) => oauthAnswer({ status, body: { error: name } });
export async function resolvedOAuthClient(clients: OAuthPublicClients, id: string, policy: OAuthPolicy): Promise<OAuthClient> {
  if (!id || id.length > 2048) throw new OAuthError("invalid_client");
  const response = await clients.resolveClient(id, policy);
  if (response.status !== 200) throw new OAuthError(typeof response.body["error"] === "string" ? response.body["error"] : "invalid_client", response.status);
  // Only the trusted registry builds this normalized record.
  return response.body as unknown as OAuthClient;
}
export async function oauthRoute(request: Request, ports: Ports): Promise<Response | null> {
  const url = new URL(request.url), path = url.pathname;
  if (path !== OAUTH_METADATA_PATH && !path.startsWith("/oauth/")) return null;
  if (path === OAUTH_METADATA_PATH) {
    if (request.method !== "GET") return error(405, "method_not_allowed");
    const issuer = ports.origin;
    return oauthAnswer({ status: 200, body: { issuer, authorization_endpoint: issuer + "/oauth/authorize", token_endpoint: issuer + "/oauth/token", ...(ports.policy.dynamicRegistration ? { registration_endpoint: issuer + "/oauth/register" } : {}), revocation_endpoint: issuer + "/oauth/revoke",
      response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"], scopes_supported: ["mcp"], code_challenge_methods_supported: ["S256"], token_endpoint_auth_methods_supported: ["none"], revocation_endpoint_auth_methods_supported: ["none"], client_id_metadata_document_supported: true, authorization_response_iss_parameter_supported: true } });
  }
  try {
    if (path === "/oauth/authorize/context") {
      if (request.method !== "GET") return error(405, "method_not_allowed");
      for (const key of url.searchParams.keys()) if (url.searchParams.getAll(key).length !== 1) return error(400, "invalid_request");
      const admission = await ports.clients.admitContext(ports.address);
      if (admission.status !== 200) return oauthAnswer(admission);
      const client = await resolvedOAuthClient(ports.clients, url.searchParams.get("client_id") ?? "", ports.policy);
      const authorization = oauthAuthorization(url.searchParams, client, ports.resources, ports.policy.redirects);
      return oauthAnswer({ status: 200, body: { issuer: ports.origin, client, ...authorization } });
    }
    if (!["/oauth/register", "/oauth/token", "/oauth/revoke"].includes(path)) return null;
    if (request.method !== "POST") return error(405, "method_not_allowed");
    const registration = path === "/oauth/register";
    // This deployment accepts no self-asserted registration metadata. Refuse
    // before reading the body or obtaining a registry object.
    if (registration && !ports.policy.dynamicRegistration) return error(400, "invalid_client_metadata");
    const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (type !== (registration ? "application/json" : "application/x-www-form-urlencoded")) return error(400, "invalid_request");
    const bytes = await ports.read(request, registration ? OAUTH_CLIENT_BYTES : 8192);
    if (bytes === "too-large") return error(413, "invalid_request");
    if (bytes === "unreadable") return error(400, "invalid_request");
    if (registration) return oauthAnswer(await ports.clients.registerClient(bytes, ports.policy));
    if (request.headers.has("authorization")) return error(400, "invalid_client");
    let form: URLSearchParams;
    try { form = new URLSearchParams(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes)); } catch { return error(400, "invalid_request"); }
    for (const key of form.keys()) if (form.getAll(key).length !== 1) return error(400, "invalid_request");
    const client = form.get("client_id"); if (!client || client.length > 2048) return error(400, "invalid_client");
    const resource = form.get("resource"); if (resource !== null && !ports.resources.includes(resource)) return error(400, "invalid_target");
    const revocation = path === "/oauth/revoke", kind = form.get("grant_type");
    if (!revocation && kind !== "authorization_code" && kind !== "refresh_token") return error(400, "unsupported_grant_type");
    const token = form.get(revocation ? "token" : kind === "authorization_code" ? "code" : "refresh_token");
    const parts = /^([0-9a-f]{64})\.([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/.exec(token ?? "");
    if (!parts) return revocation ? oauthAnswer({ status: 200, body: {} }) : error(400, "invalid_grant");
    const agent = ports.agent(parts[1]!);
    if (!agent) return revocation ? oauthAnswer({ status: 200, body: {} }) : error(400, "invalid_grant");
    if (revocation) return oauthAnswer(await agent.revokeToken(parts[2]!, parts[3]!, client));
    if (kind === "refresh_token") return oauthAnswer(await agent.refreshGrant(parts[2]!, parts[3]!, client, resource ?? undefined));
    const redirect = form.get("redirect_uri"), verifier = form.get("code_verifier");
    if (!redirect || !verifier) return error(400, "invalid_request");
    return oauthAnswer(await agent.exchangeCode(parts[2]!, parts[3]!, client, redirect, verifier, resource ?? undefined));
  } catch (e) { return error(e instanceof OAuthError ? e.status : 503, e instanceof OAuthError ? e.error : "temporarily_unavailable"); }
}
