/** Generic trusted screen bytes, bound to one native active installation and
 * its exact presentation. This serves no application state and grants no
 * member authority. Same-origin delivery is not an isolation boundary. */
import { PROPOSED_BOUNDS, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, unb64url } from "@generalbusiness/artroom-bytes";
import { readApplicationScreenAddress, readApplicationScreenContext, type ApplicationInstallation, type ApplicationRoom, type PackedApplication } from "@generalbusiness/artroom-client/application";
import { LATE, within } from "../turn.ts";
import { ApplicationAdmissionError, readApplicationTrust, type ApplicationTrust } from "./admission.ts";
import { ApplicationContentStore } from "./content.ts";
import type { ApplicationBindings } from "./bindings.ts";
interface Peer {
  applicationRoom(): Promise<ApplicationRoom | null>;
  applicationInstallation(directory: ScopeRef, item: number): Promise<ApplicationInstallation | null>;
}
type Binding = Pick<DurableObjectNamespace, "get" | "idFromName">;
const POLICY = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'; form-action 'self'";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
/** Two immutable packet entries per bucket. Concurrent reads of one release
 * share a load. This is a cache bound, not a measured Worker heap allowance. */
const packets = new WeakMap<R2Bucket, Map<string, Promise<PackedApplication | null>>>();
async function packetOf(bucket: R2Bucket, setting: string | undefined, trust: readonly ApplicationTrust[], release: ApplicationInstallation["ids"]["release"]) {
  let cache = packets.get(bucket); if (!cache) packets.set(bucket, (cache = new Map()));
  const key = `${release}\n${setting ?? ""}`, held = cache.get(key);
  if (held) { cache.delete(key); cache.set(key, held); return held; }
  while (cache.size >= 2) cache.delete(cache.keys().next().value!);
  const loaded = new ApplicationContentStore(bucket, trust, PROPOSED_BOUNDS).get(release);
  cache.set(key, loaded);
  try { const packet = await loaded; if (packet === null && cache.get(key) === loaded) cache.delete(key); return packet; }
  catch (error) { if (cache.get(key) === loaded) cache.delete(key); throw error; }
}
export function isApplicationPage(request: Request): boolean { return new URL(request.url).pathname.startsWith("/applications/"); }
async function screenResponse(request: Request, env: ApplicationBindings & { SCOPES: Binding; DEPLOYMENT?: string }): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/applications/")) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { allow: "GET, HEAD", "cache-control": "no-store" } });
  const address = readApplicationScreenAddress(url.pathname);
  if (!address || url.search || url.hash || url.username || url.password) return json(404, { error: "not-found" });
  if (!env.APPLICATION_CONTENT) return json(503, { error: "application-unavailable" });
  try {
    const trust = readApplicationTrust(env.APPLICATION_TRUST);
    const room = await within(() => (env.SCOPES.get(env.SCOPES.idFromName(address.directory)) as unknown as Peer).applicationRoom(), PROPOSED_BOUNDS.fetchSeconds);
    if (room === LATE) return json(503, { error: "application-unavailable" });
    if (!room || room.directory.scope !== address.directory) return json(404, { error: "not-found" });
    const install = await within(() => (env.SCOPES.get(env.SCOPES.idFromName(room.rules.scope)) as unknown as Peer).applicationInstallation(room.directory, address.item), PROPOSED_BOUNDS.fetchSeconds);
    if (install === LATE) return json(503, { error: "application-unavailable" });
    if (!install || canonicalize(install.rules) !== canonicalize(room.rules) || canonicalize(install.directory) !== canonicalize(room.directory)
      || install.ids.presentation !== address.presentation || !trust.some(row => row.release === install.ids.release)) return json(404, { error: "not-found" });
    const context = readApplicationScreenContext({ ...install, v: 1, origin: url.origin, deployment: env.DEPLOYMENT ?? url.origin, membershipDefinition: "platform:membership@7" }, address, url.origin);
    const packet = await packetOf(env.APPLICATION_CONTENT, env.APPLICATION_TRUST, trust, install.ids.release);
    if (!packet) return json(503, { error: "application-unavailable" });
    if (canonicalize(packet.ids) !== canonicalize(install.ids) || packet.package.semantic.entry !== install.definition) return json(404, { error: "not-found" });
    if (address.asset === "_/context") {
      const response = json(200, context);
      return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
    }
    if (address.asset === "") return new Response(null, { status: 302, headers: { location: address.base + packet.package.presentation.entry, "cache-control": "no-store" } });
    const asset = packet.package.presentation.assets.find(asset => asset.path === address.asset);
    if (!asset) return json(404, { error: "not-found" });
    const etag = `"${address.presentation}:${asset.path}"`;
    const headers = new Headers({ "content-type": asset.mediaType, "cache-control": "private, max-age=0, must-revalidate", etag,
      "content-security-policy": POLICY, "x-content-type-options": "nosniff", "referrer-policy": "same-origin" });
    if (request.headers.get("if-none-match")?.split(",").some(tag => [etag, `W/${etag}`, "*"].includes(tag.trim()))) return new Response(null, { status: 304, headers });
    const bytes = unb64url(asset.bytes);
    if (!bytes) return json(503, { error: "application-unavailable" });
    headers.set("content-length", String(bytes.length));
    return new Response(request.method === "HEAD" ? null : bytes, { status: 200, headers });
  } catch (error) {
    return error instanceof ApplicationAdmissionError && error.reason === "untrusted-release" ? json(404, { error: "not-found" }) : json(503, { error: "application-unavailable" });
  }
}


export async function applicationPage(request: Request, env: ApplicationBindings & { SCOPES: Binding; DEPLOYMENT?: string }): Promise<Response | null> {
  const response = await screenResponse(request, env);
  if (request.method === "HEAD" && response?.body) {
    await response.body.cancel(); return new Response(null, { status: response.status, headers: response.headers });
  }
  return response;
}
