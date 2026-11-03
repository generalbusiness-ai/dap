/** Same-origin consent assets. The scope framework owns OAuth wire routes. */
import { hostedMcpResources, hostedMcpTools, oauthPolicy, type HostedMcpSettings } from "@generalbusiness/dap-mcp";
import { readPublicOrigin, type PublicOriginBindings } from "../../../packages/scope/src/public-origin.ts";
import { OAUTH_HTML, OAUTH_JS } from "./assets.ts";
const POLICY = "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
export function oauthPage(request: Request, env: HostedMcpSettings & PublicOriginBindings & { REGISTRIES?: unknown; AGENTS?: unknown }): Response | null {
  const path = new URL(request.url).pathname;
  if (path !== "/oauth/authorize" && path !== "/oauth/consent.js") return null;
  const origin = readPublicOrigin(env, request.url);
  if (hostedMcpTools(env) === null || !oauthPolicy(env) || !env.REGISTRIES || !env.AGENTS || origin === null || !hostedMcpResources(env, origin)?.length) return new Response("Not found", { status: 404 });
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  return new Response(request.method === "HEAD" ? null : path === "/oauth/authorize" ? OAUTH_HTML : OAUTH_JS, { status: 200, headers: { "content-type": path === "/oauth/authorize" ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", "content-security-policy": POLICY, "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "cache-control": "no-store" } });
}
