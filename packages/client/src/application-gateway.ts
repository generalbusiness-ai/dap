/** A sandbox changes transport location, never the room that owns an identity. */
import { isDigest, isRecord, isScopeId, parseStrict } from "@generalbusiness/dap-bytes";
import type { Digest, ScopeId } from "@generalbusiness/dap-contract";
import { applicationJson } from "./application-json.ts";
import { readApplicationScreenAddress } from "./application-route.ts";
import type { Fetch } from "./http.ts";
import type { HeadStreamFetch } from "./head-stream.ts";
import type { ApplicationScreenContext } from "./application-types.ts";

declare const URL: new (url: string) => {
  origin: string; pathname: string; search: string; hash: string; username: string; password: string; href: string;
  searchParams: { keys(): IterableIterator<string> };
};
export const APPLICATION_SCREEN_HOST_PATH = "/_application-host";
export interface ApplicationScreenHost {
  readonly v: 1; readonly screenOrigin: string; readonly roomOrigin: string;
  readonly directory: ScopeId; readonly item: number; readonly presentation: Digest;
}
export function isApplicationSandboxOrigin(origin: string): boolean {
  return /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.inguz\.space$/.test(origin);
}
/** This descriptor comes from the fixed sandbox binding, not a URL parameter. */
export function readApplicationScreenHost(value: unknown): ApplicationScreenHost {
  const body: unknown = parseStrict(applicationJson(value, 4096));
  if (!isRecord(body) || Object.keys(body).sort().join() !== "directory,item,presentation,roomOrigin,screenOrigin,v" || body["v"] !== 1
    || typeof body["screenOrigin"] !== "string" || !isApplicationSandboxOrigin(body["screenOrigin"])
    || typeof body["roomOrigin"] !== "string" || !/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(body["roomOrigin"])
    || body["roomOrigin"] === body["screenOrigin"] || !isScopeId(body["directory"])
    || !Number.isSafeInteger(body["item"]) || (body["item"] as number) < 0 || !isDigest(body["presentation"])) throw Error("Invalid application screen host.");
  return Object.freeze(body) as unknown as ApplicationScreenHost;
}
export function applicationScreenHostMatches(host: ApplicationScreenHost, path: string): boolean {
  const at = readApplicationScreenAddress(path);
  return !!at && at.directory === host.directory && at.item === host.item && at.presentation === host.presentation;
}

/** Only maintained native contracts. Their own parsers and membership gates
 * still decide every request; this is not a general Worker or URL proxy. */
export function applicationGatewayRoute(host: ApplicationScreenHost, address: string, method: string): boolean {
  if (address.length > 128 * 1024) return false;
  let url: InstanceType<typeof URL>;
  try { url = new URL(address); } catch { return false; }
  if (url.origin !== host.roomOrigin || url.username || url.password || url.hash || url.href !== address) return false;
  const keys = [...url.searchParams.keys()];
  if (keys.length !== new Set(keys).size) return false;
  const query = (...allowed: string[]) => keys.every(key => allowed.includes(key));
  const parts = url.pathname.split("/").slice(1);
  // Lending compares an inert published page. This directory alone belongs
  // to the configured installation; public Site admission is unchanged.
  if (parts[0] === "site") return (method === "GET" || method === "HEAD") && !url.search && parts[1] === host.directory
    && (parts[2] === "HEAD" || /^[a-f0-9]{40}$/.test(parts[2] ?? "")) && parts.length >= 4
    && parts.slice(3).every(part => /^[A-Za-z0-9][A-Za-z0-9._~-]*$/.test(part));
  if (parts[0] !== "v1" || parts[1] !== "scopes" || !isScopeId(parts[2])) return false;
  const what = parts[3], which = parts[4];
  if (method === "POST") return parts.length === 4 && ["acts", "settle", "sessions"].includes(what ?? "") && !url.search;
  if (method !== "GET") return false;
  if (parts.length === 3) return !url.search;
  if (parts.length === 4) {
    if (["history", "outbox", "log"].includes(what ?? "")) return query("cursor");
    if (what === "stream") return !url.search;
    if (what === "query-items") return keys.length === 1 && query("q");
    if (what === "application-projection") return keys.length === 1 && query("p");
  }
  if (parts.length === 5 && what === "entries") return /^(?:0|[1-9][0-9]{0,15})$/.test(which ?? "") && !url.search;
  if (parts.length === 5 && what === "items") return /^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(which ?? "") && query("cursor");
  return false;
}

export type ApplicationGatewayFetch = (url: string, init?: Parameters<Fetch>[1] & { redirect?: "error"; credentials?: "omit" }) => ReturnType<HeadStreamFetch>;
const hosts = new WeakMap<ApplicationScreenContext, ApplicationScreenHost>();
/** Called only after strict same-origin metadata and context checks. */
export function bindApplicationScreenHost(context: ApplicationScreenContext, host: ApplicationScreenHost): void {
  if (context.origin !== host.roomOrigin || context.directory.scope !== host.directory || context.item !== host.item || context.ids.presentation !== host.presentation) throw Error("The screen host does not match this installation.");
  hosts.set(context, host);
}
/** Caller gets no new authority. Cookies and unrelated headers never cross
 * the gateway; explicit native read authorization and signed bodies remain. */
export function applicationScreenTransport(context: ApplicationScreenContext, options: { fetch?: ApplicationGatewayFetch } = {}): { fetch: Fetch; headFetch: HeadStreamFetch; request: ApplicationGatewayFetch } {
  const host = hosts.get(context), send = options.fetch ?? (globalThis as { fetch?: ApplicationGatewayFetch }).fetch;
  if (!host || !send) throw Error("The sandbox host was not verified for this application.");
  const call: ApplicationGatewayFetch = async (url, init = {}) => {
    const method = init.method ?? "GET";
    if (!applicationGatewayRoute(host, url, method)) throw Error("This request is outside the application gateway.");
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(init.headers ?? {})) {
      const key = name.toLowerCase();
      if (["authorization", "content-type", "accept", "if-none-match"].includes(key)) headers[key] = value;
    }
    const physical = host.screenOrigin + url.slice(host.roomOrigin.length);
    const response = await send(physical, { ...init, headers, redirect: "error", credentials: "omit" });
    // Preserve the native reader's logical URL check only after proving the
    // actual network response belongs to the exact physical request.
    if (response.redirected || response.url !== physical) {
      if (response.body) void response.body.getReader().cancel().catch(() => undefined);
      throw Error("The application gateway response changed location.");
    }
    return { status: response.status, body: response.body, headers: response.headers, url, redirected: false };
  };
  return { fetch: call, headFetch: call, request: call };
}
