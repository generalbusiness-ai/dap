/** Generic trusted screen bytes, bound to one native active installation and
 * its exact presentation. This serves no application state and grants no
 * member authority. Only the dedicated sandbox service serves package bytes. */
import { jsonReply } from "../response.ts";
import type { AnyPackedApplication } from "@generalbusiness/dap-bytes/application-v2";
import { PROPOSED_BOUNDS, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, parseStrict, unb64url } from "@generalbusiness/dap-bytes";
import { applicationScreenHostMatches, readApplicationScreenHost, readApplicationScreenAddress, readApplicationScreenContext, type ApplicationScreenHost, type ApplicationInstallation, type ApplicationRoom } from "@generalbusiness/dap-client/application";
import { LATE, within } from "../turn.ts";
import { ApplicationAdmissionError, readApplicationTrust, type ApplicationTrust } from "./admission.ts";
import { ApplicationContentStore } from "./content.ts";
import type { ApplicationBindings } from "./bindings.ts";
interface Peer {
  applicationRoom(): Promise<ApplicationRoom | null>;
  applicationInstallation(directory: ScopeRef, item: number): Promise<ApplicationInstallation | null>;
}
import type { Binding } from "../namespace.ts";
const POLICY = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'; form-action 'self'";
const applicationJsonReply = (status: number, body: unknown) => jsonReply(status, body, { "x-content-type-options": "nosniff" });
/** Missing, duplicate or malformed mappings admit no sandbox. A hostname is
 * stable for one installation; a reviewed presentation update replaces its
 * descriptor, without moving that installation's browser key storage. */
export function applicationScreenHosts(setting: string | undefined): readonly ApplicationScreenHost[] {
  try {
    if (!setting || setting.length > 32 * 4096) return [];
    const rows: unknown = parseStrict(setting);
    if (!Array.isArray(rows) || rows.length > 32) return [];
    const hosts = rows.map(readApplicationScreenHost);
    if (new Set(hosts.map(host => host.screenOrigin)).size !== hosts.length
      || new Set(hosts.map(host => `${host.roomOrigin}/${host.directory}/${host.item}`)).size !== hosts.length) return [];
    return hosts;
  } catch { return []; }
}
/** Two immutable packet entries per bucket. Concurrent reads of one release
 * share a load. Pending loads count toward the two entries; a third distinct
 * release waits for a later request. This is not a measured heap allowance. */
interface CachedPacket { load: Promise<AnyPackedApplication | null>; settled: boolean }
const packets = new WeakMap<R2Bucket, Map<string, CachedPacket>>();
async function packetOf(bucket: R2Bucket, setting: string | undefined, trust: readonly ApplicationTrust[], release: ApplicationInstallation["ids"]["release"]) {
  let cache = packets.get(bucket); if (!cache) packets.set(bucket, (cache = new Map()));
  const key = `${release}\n${setting ?? ""}`, held = cache.get(key);
  if (held) { cache.delete(key); cache.set(key, held); return held.load; }
  while (cache.size >= 2) {
    const reusable = [...cache].find(([, entry]) => entry.settled);
    if (!reusable) return null;
    cache.delete(reusable[0]);
  }
  const loaded = new ApplicationContentStore(bucket, trust, PROPOSED_BOUNDS).get(release);
  const entry: CachedPacket = { load: loaded, settled: false }; cache.set(key, entry);
  try { const packet = await loaded; if (packet === null && cache.get(key) === entry) cache.delete(key); return packet; }
  catch (error) { if (cache.get(key) === entry) cache.delete(key); throw error; }
  finally { entry.settled = true; }
}
export function isApplicationPage(request: Request): boolean { return new URL(request.url).pathname.startsWith("/applications/"); }
async function screenResponse(request: Request, env: ApplicationBindings & { SCOPES: Binding; DEPLOYMENT?: string }): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/applications/")) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { allow: "GET, HEAD", "cache-control": "no-store" } });
  const address = readApplicationScreenAddress(url.pathname);
  if (!address || url.search || url.hash || url.username || url.password) return applicationJsonReply(404, { error: "not-found" });
  if (!env.APPLICATION_CONTENT) return applicationJsonReply(503, { error: "application-unavailable" });
  try {
    const trust = readApplicationTrust(env.APPLICATION_TRUST);
    const room = await within(() => (env.SCOPES.get(env.SCOPES.idFromName(address.directory)) as unknown as Peer).applicationRoom(), PROPOSED_BOUNDS.fetchSeconds);
    if (room === LATE) return applicationJsonReply(503, { error: "application-unavailable" });
    if (!room || room.directory.scope !== address.directory) return applicationJsonReply(404, { error: "not-found" });
    const install = await within(() => (env.SCOPES.get(env.SCOPES.idFromName(room.rules.scope)) as unknown as Peer).applicationInstallation(room.directory, address.item), PROPOSED_BOUNDS.fetchSeconds);
    if (install === LATE) return applicationJsonReply(503, { error: "application-unavailable" });
    if (!install || canonicalize(install.rules) !== canonicalize(room.rules) || canonicalize(install.directory) !== canonicalize(room.directory)
      || install.ids.presentation !== address.presentation || !trust.some(row => row.release === install.ids.release)) return applicationJsonReply(404, { error: "not-found" });
    const context = readApplicationScreenContext({ ...install, v: 1, origin: url.origin, deployment: env.DEPLOYMENT ?? url.origin, membershipDefinition: install.membershipDefinition ?? "platform:membership@7" }, address, url.origin);
    const packet = await packetOf(env.APPLICATION_CONTENT, env.APPLICATION_TRUST, trust, install.ids.release);
    if (!packet) return applicationJsonReply(503, { error: "application-unavailable" });
    if (canonicalize(packet.ids) !== canonicalize(install.ids) || packet.package.semantic.entry !== install.definition) return applicationJsonReply(404, { error: "not-found" });
    if (address.asset === "_/context") {
      const response = applicationJsonReply(200, context);
      return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
    }
    if (address.asset === "") return new Response(null, { status: 302, headers: { location: address.base + packet.package.presentation.entry, "cache-control": "no-store" } });
    const asset = packet.package.presentation.assets.find(asset => asset.path === address.asset);
    if (!asset) return applicationJsonReply(404, { error: "not-found" });
    const etag = `"${address.presentation}:${asset.path}"`;
    const headers = new Headers({ "content-type": asset.mediaType, "cache-control": "private, max-age=0, must-revalidate", etag,
      "content-security-policy": POLICY, "x-content-type-options": "nosniff", "referrer-policy": "same-origin" });
    if (request.headers.get("if-none-match")?.split(",").some(tag => [etag, `W/${etag}`, "*"].includes(tag.trim()))) return new Response(null, { status: 304, headers });
    const bytes = unb64url(asset.bytes);
    if (!bytes) return applicationJsonReply(503, { error: "application-unavailable" });
    headers.set("content-length", String(bytes.length));
    return new Response(request.method === "HEAD" ? null : bytes, { status: 200, headers });
  } catch (error) {
    return error instanceof ApplicationAdmissionError && error.reason === "untrusted-release" ? applicationJsonReply(404, { error: "not-found" }) : applicationJsonReply(503, { error: "application-unavailable" });
  }
}


export async function applicationSandboxPage(request: Request, env: ApplicationBindings & { SCOPES: Binding; DEPLOYMENT?: string }): Promise<Response | null> {
  const response = await screenResponse(request, env);
  if (request.method === "HEAD" && response?.body) {
    await response.body.cancel(); return new Response(null, { status: response.status, headers: response.headers });
  }
  return response;
}

/** Public room dispatch cannot serve a package script, even without sandbox
 * configuration. Configuration-only redirect precedes every scope/R2 read. */
export async function applicationPage(request: Request, env: ApplicationBindings): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/applications/")) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { allow: "GET, HEAD", "cache-control": "no-store" } });
  const address = readApplicationScreenAddress(url.pathname);
  if (!address || url.search || url.hash || url.username || url.password) return applicationJsonReply(404, { error: "not-found" });
  const host = applicationScreenHosts(env.APPLICATION_SCREEN_HOSTS).find(candidate => candidate.roomOrigin === url.origin && applicationScreenHostMatches(candidate, url.pathname));
  return host ? new Response(null, { status: 302, headers: { location: host.screenOrigin + url.pathname, "cache-control": "no-store", "referrer-policy": "no-referrer" } })
    : applicationJsonReply(404, { error: "not-found" });
}
