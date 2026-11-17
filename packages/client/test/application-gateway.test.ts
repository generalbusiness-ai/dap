/** Fixed transport mapping only. No browser/native admission or hosted shim
 * is claimed by these scripted HTTP boundaries. */
import { expect, test } from "vitest";
import { canonicalize, encodeReadMinimumParameter, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import type { Digest, ScopeKind, ScopeRef } from "@generalbusiness/dap-contract";
import { applicationScreenPath } from "../src/application-route.ts";
import { applicationGatewayRoute, applicationScreenTransport, readApplicationScreenHost, type ApplicationGatewayFetch } from "../src/application-gateway.ts";
import { loadApplicationScreenContext } from "../src/application-screen.ts";
const digest = (letter: string): Digest => `sha256:${letter.repeat(64)}`;
const ref = (kind: ScopeKind, ordinal: number): ScopeRef => ({ scope: scopeIdOf({ v: 1, kind, definition: digest("a"), creator: null, cause: digest("b"), ordinal }), genesis: textDigest(`TEST genesis ${ordinal}`) });
const directory = ref("directory", 1), rules = ref("rules", 2), membership = ref("membership", 3), destination = ref("destination", 4), scope = ref("lane", 5);
const host = readApplicationScreenHost({ v: 1, screenOrigin: "https://library.inguz.space", roomOrigin: "https://dap-lending.inguz.workers.dev", directory: directory.scope, item: 7, presentation: digest("c") });
const base = applicationScreenPath(directory.scope, host.item, host.presentation);
const body = { v: 1, origin: host.roomOrigin, deployment: "TEST mapped room", directory, rules, membership, destination, scope, item: host.item,
  definition: digest("d"), ids: { release: digest("e"), semantic: digest("f"), presentation: host.presentation }, membershipDefinition: "platform:membership@8" };
async function context() {
  const result = await loadApplicationScreenContext(host.screenOrigin + base + "index.html", { fetch: async url => new Response(canonicalize(url.endsWith("/_application-host") ? host : body)) });
  if (!result) throw Error("The scripted context must exist.");
  return result;
}

test("sandbox metadata preserves canonical room identity and exact installation", async () => {
  const loaded = await context();
  expect(loaded.origin).toBe(host.roomOrigin); expect(loaded.scope).toEqual(scope);
  await expect(loadApplicationScreenContext(host.screenOrigin + base + "index.html", { fetch: async () => new Response(canonicalize({ ...host, item: 8 })) })).rejects.toThrow();
  await expect(loadApplicationScreenContext(host.screenOrigin + base + "index.html", { fetch: async url => new Response(canonicalize(url.endsWith("/_application-host") ? host : { ...body, origin: host.screenOrigin })) })).rejects.toThrow();
  expect(() => applicationScreenTransport({ ...loaded })).toThrow("not verified");
});

test("native gateway changes network destination only and rejects redirects before projecting a stream URL", async () => {
  const loaded = await context(), url = `${host.roomOrigin}/v1/scopes/${scope.scope}/acts`, original = '{"signed":"TEST original signature"}';
  let sent = 0;
  const send: ApplicationGatewayFetch = async (physical, init) => {
    sent++; expect(physical).toBe(host.screenOrigin + url.slice(host.roomOrigin.length));
    expect(init).toMatchObject({ method: "POST", body: original, credentials: "omit", redirect: "error", headers: { authorization: "Session TEST-explicit", "content-type": "application/json" } });
    expect(init?.headers).not.toHaveProperty("cookie"); expect(init?.headers).not.toHaveProperty("proxy-authorization");
    return { status: 200, body: null, headers: new Headers(), url: physical, redirected: false };
  };
  const api = applicationScreenTransport(loaded, { fetch: send });
  await api.fetch(url, { method: "POST", body: original, headers: { authorization: "Session TEST-explicit", "content-type": "application/json", cookie: "TEST-room-cookie", "proxy-authorization": "TEST-ambient" } });
  expect(sent).toBe(1);
  let cancelled = 0;
  const bad = applicationScreenTransport(loaded, { fetch: async physical => ({ status: 200,
    body: new ReadableStream<Uint8Array>({ cancel() { cancelled++; } }), headers: new Headers(), url: physical, redirected: true }) });
  await expect(bad.headFetch(`${host.roomOrigin}/v1/scopes/${scope.scope}/stream`, { method: "GET", headers: { authorization: "Session TEST" }, signal: new AbortController().signal as never, redirect: "error" })).rejects.toThrow("changed location");
  expect(cancelled).toBe(1);
  const good = applicationScreenTransport(loaded, { fetch: async physical => ({ status: 200, body: null, headers: new Headers(), url: physical, redirected: false }) });
  const stream = `${host.roomOrigin}/v1/scopes/${scope.scope}/stream`;
  expect((await good.headFetch(stream, { method: "GET", headers: {}, signal: new AbortController().signal as never, redirect: "error" })).url).toBe(stream);
});

test("gateway allows only fixed native methods, canonical queries and the installation's Site directory", () => {
  const at = `${host.roomOrigin}/v1/scopes/${scope.scope}`;
  expect(applicationGatewayRoute(host, at + "/history?cursor=2", "GET")).toBe(true);
  expect(applicationGatewayRoute(host, at + "/application-projection?p=TEST-native-parser-checks-this", "GET")).toBe(true);
  expect(applicationGatewayRoute(host, `${host.roomOrigin}/site/${directory.scope}/HEAD/shelf/item.md`, "GET")).toBe(true);
  for (const [url, method] of [[at + "/acts", "GET"], [at + "/stream?target=https%3A%2F%2Fevil.test", "GET"], [at + "/history?cursor=1&cursor=2", "GET"], [at + "?token=TEST", "GET"],
    [at.replace(host.roomOrigin, "https://other.test"), "GET"], [at.replace("https://", "https://user:TEST@"), "GET"], [`${host.roomOrigin}/v1/scopes`, "POST"], [`${host.roomOrigin}/mcp`, "POST"],
    [`${host.roomOrigin}/site/${scope.scope}/HEAD/item.md`, "GET"]]) expect(applicationGatewayRoute(host, url!, method!), url).toBe(false);
});

// GW-1 (request 54e31a40): each read that takes a minimum allows one canonical atLeast of its own scope, beside its own parameters.
test("gateway allows one canonical read minimum of the same scope on every read that takes one", () => {
  const at = `${host.roomOrigin}/v1/scopes/${scope.scope}`;
  const own = encodeReadMinimumParameter({ at: scope, head: 3 })!, other = encodeReadMinimumParameter({ at: membership, head: 3 })!;
  const reads = { summary: at, history: at + "/history?cursor=2", items: at + "/items/Task?cursor=2", projection: at + "/application-projection?p=TEST-native-parser-checks-this", entries: at + "/entries/4" };
  const join = (url: string, extra: string) => url + (url.includes("?") ? "&" : "?") + extra;
  for (const [name, url] of Object.entries(reads)) {
    expect(applicationGatewayRoute(host, url, "GET"), name + " without a minimum").toBe(true);
    expect(applicationGatewayRoute(host, join(url, "atLeast=" + own), "GET"), name + " with its minimum").toBe(true);
    for (const refused of ["atLeast=" + own + "&atLeast=" + own, "atLeast=TEST-not-canonical", "atLeast=", "atLeast=" + other, "atLeast=" + own + "&token=TEST"])
      expect(applicationGatewayRoute(host, join(url, refused), "GET"), name + " refuses " + refused.slice(0, 24)).toBe(false);
  }
  // Reads that take no minimum, and every write, still refuse it.
  for (const [url, method] of [[at + "/outbox?atLeast=" + own, "GET"], [at + "/log?atLeast=" + own, "GET"], [at + "/stream?atLeast=" + own, "GET"],
    [at + "/query-items?q=TEST&atLeast=" + own, "GET"], [at + "/acts?atLeast=" + own, "POST"], [at + "/sessions?atLeast=" + own, "POST"]])
    expect(applicationGatewayRoute(host, url!, method!), url).toBe(false);
});
