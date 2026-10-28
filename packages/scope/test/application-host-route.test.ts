/** Retired hosted routes have no public assets. Generic exact-release serving
 * is witnessed on real installed scopes in application-install-custody. */
import { env } from "cloudflare:test";
import { newIncarnation, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { applicationScreenPath, readApplicationScreenHost } from "@generalbusiness/dap-client/application";
import type { ScopeKind, ScopeRef } from "@generalbusiness/dap-contract";
import { applicationResolverFixture, applicationWorkerBindings } from "./fixtures-native.ts";
import { expect, test } from "vitest";
import worker, { type Env } from "../../../apps/room/worker.ts";
import { applicationPage, applicationSandboxPage } from "../src/applications/route.ts";

test("public screen redirect matches the configured room identity rather than internal HTTP or forwarded headers", async () => {
  const directory = scopeIdOf({ v: 1, kind: "directory", definition: "platform:directory@20", creator: null, cause: textDigest("TEST public screen identity"), ordinal: 0 });
  const host = readApplicationScreenHost({ v: 1, screenOrigin: "https://h1-screen.inguz.space", roomOrigin: "https://room.example", directory, item: 7, presentation: textDigest("TEST presentation") });
  const path = applicationScreenPath(directory, 7, host.presentation) + "index.html";
  const internal = new Request("http://celld.internal:8787" + path, { headers: { host: "different-host.example", forwarded: "host=room.example;proto=https", "x-forwarded-proto": "https", "x-forwarded-host": "room.example" } });
  const settings = { APPLICATION_SCREEN_HOSTS: JSON.stringify([host]) };
  expect((await applicationPage(internal, settings))?.status).toBe(404);
  const configured = await applicationPage(internal, { ...settings, PUBLIC_ORIGIN: host.roomOrigin });
  expect([configured?.status, configured?.headers.get("location"), await configured!.text()]).toEqual([302, host.screenOrigin + path, ""]);
  expect((await applicationPage(internal, { ...settings, PUBLIC_ORIGIN: host.roomOrigin + "/" }))?.status).toBe(503);
  expect((await applicationPage(new Request("http://celld.internal:8787" + path + "?extra=1"), { ...settings, PUBLIC_ORIGIN: host.roomOrigin }))?.status).toBe(404);
});
test("Room refuses retired application paths and still rejects URL credentials before dispatch", async () => {
  const get = (path: string, method = "GET") => worker.fetch(new Request("https://scopes.test" + path, { method, headers: { authorization: "Bearer TEST-header", cookie: "private=TEST-cookie" } }), { SCOPES: env.PLATFORM, SCOPE_INDEX: env.SCOPE_INDEX } as Env);
  for (const path of ["/counting", "/counting/", "/counting/counting.js", "/counting/brand/dap-wordmark.svg", "/lending", "/lending/", "/lending/lending.css", "/lending/keys.json"]) {
    const response = await get(path);
    expect(response.status).toBe(404); expect(await response.text()).not.toMatch(/TEST-header|TEST-cookie|<script|<html/);
    expect((await get(path, "HEAD")).status).toBe(404);
  }
  for (const path of ["/counting/?token=TEST-url", "/lending/lending.js?secret=TEST-url"]) {
    const response = await get(path); expect([response.status, await response.json()]).toEqual([400, { error: "credential-in-url" }]);
  }
});


// Invariant: concurrent public reads cannot evict an in-flight packet load
// and start unbounded replacements. Native binding RPCs are explicit stand-ins;
// private R2, packet validation and the production Room route are real.
test("two pending packet loads coalesce while a third distinct release refuses before another R2 read", async () => {
  const fixtures = await Promise.all([{}, { admin: ["counting.control"] }, { member: ["counting.fulfill"] }].map(roles => applicationResolverFixture("sha1", undefined, roles)));
  const trust = JSON.stringify(fixtures.flatMap(f => f.trust));
  const ref = (kind: ScopeKind, ordinal: number): ScopeRef => ({ kind, scope: scopeIdOf({ v: 1, kind, definition: textDigest("TEST route binding"), creator: null, cause: textDigest("TEST cache " + kind), ordinal }), inc: newIncarnation(new Uint8Array(16).fill(ordinal)) });
  const directory = ref("directory", 1), rules = ref("rules", 2), membership = ref("membership", 3), destination = ref("destination", 4);
  const scopes = { idFromName: (name: string) => name, get: (name: string) => name === directory.scope ? { applicationRoom: async () => ({ directory, rules }) }
    : { applicationInstallation: async (_directory: ScopeRef, item: number) => ({ directory, rules, membership, destination, scope: ref("lane", item + 5), item, definition: fixtures[item]!.packet.package.semantic.entry, ids: fixtures[item]!.packet.ids }) } };
  let releaseFirst!: () => void, releaseSecond!: () => void, firstEntered!: () => void, secondEntered!: () => void;
  const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; }), secondGate = new Promise<void>(resolve => { releaseSecond = resolve; });
  const first = new Promise<void>(resolve => { firstEntered = resolve; }), second = new Promise<void>(resolve => { secondEntered = resolve; });
  const reads: string[] = [];
  const bucket = new Proxy(env.APPLICATION_CONTENT, { get(target, key) {
    const value: unknown = Reflect.get(target, key, target);
    if (key === "get") return async (...args: Parameters<R2Bucket["get"]>) => {
      reads.push(args[0]);
      if (args[0] === fixtures[0]!.key) { firstEntered(); await firstGate; }
      if (args[0] === fixtures[1]!.key) { secondEntered(); await secondGate; }
      return target.get(...args);
    };
    return typeof value === "function" ? value.bind(target) : value;
  } });
  // Explicit reachability stand-in for these two scripted native RPC peers.
  // It grants no native authority and never admits another target.
  const index = { idFromName: (name: string) => name, get: (name: string) => {
    expect(name).toBe("applied-genesis-v1");
    return { has: async (scope: string) => scope === directory.scope || scope === rules.scope };
  } };
  const bindings = applicationWorkerBindings(scopes as unknown as Env["SCOPES"], bucket, trust, index);
  // The dedicated sandbox service's byte renderer; public Room refusal is
  // checked separately. Installation RPCs here remain explicit stand-ins.
  const get = async (item: number) => (await applicationSandboxPage(new Request("https://cache.test" + applicationScreenPath(directory.scope, item, fixtures[item]!.packet.ids.presentation) + "index.html"), bindings))!;
  const outstanding: Promise<Response>[] = [];
  try {
    for (const f of fixtures) await f.store.put(f.packet.bytes, f.packet.ids.release);
    for (const DEPLOYMENT of ["", "a".repeat(129), "界".repeat(43)]) {
      const response = await applicationSandboxPage(new Request("https://cache.test" + applicationScreenPath(directory.scope, 0, fixtures[0]!.packet.ids.presentation) + "_/context"), { ...bindings, DEPLOYMENT });
      expect([response?.status, await response!.json()]).toEqual([503, { error: "application-unavailable" }]);
    }
    expect(reads).toEqual([]);
    outstanding.push(get(0)); await first; outstanding.push(get(1)); await second; outstanding.push(get(0));
    expect((await get(2)).status).toBe(503); expect(reads).toEqual([fixtures[0]!.key, fixtures[1]!.key]);
    releaseFirst(); expect((await outstanding[0]!).status).toBe(200); expect((await outstanding[2]!).status).toBe(200);
    expect((await get(2)).status).toBe(200); expect(reads).toEqual(fixtures.map(f => f.key));
    releaseSecond(); expect((await outstanding[1]!).status).toBe(200);
    for (const DEPLOYMENT of ["a".repeat(128), "界".repeat(42) + "aa"]) {
      const response = await applicationSandboxPage(new Request("https://cache.test" + applicationScreenPath(directory.scope, 0, fixtures[0]!.packet.ids.presentation) + "_/context"), { ...bindings, DEPLOYMENT });
      expect([response?.status, (await response!.json<{ deployment: string }>()).deployment]).toEqual([200, DEPLOYMENT]);
    }
    const local = await applicationSandboxPage(new Request("https://cache.test" + applicationScreenPath(directory.scope, 0, fixtures[0]!.packet.ids.presentation) + "_/context"), bindings);
    expect([local?.status, (await local!.json<{ deployment: string }>()).deployment]).toEqual([200, "https://cache.test"]);
    // Actual packet/R2/context validation; native installation RPCs above
    // remain explicit stand-ins. This rewrites no gateway path or identity.
    const internal = "http://celld.internal:8787" + applicationScreenPath(directory.scope, 0, fixtures[0]!.packet.ids.presentation) + "_/context";
    const configured = await applicationSandboxPage(new Request(internal, { headers: { host: "different-host.example" } }), { ...bindings, PUBLIC_ORIGIN: "https://cache.test" });
    expect([configured?.status, await configured!.json()]).toEqual([200, expect.objectContaining({ origin: "https://cache.test", deployment: "https://cache.test" })]);
    const explicit = await applicationSandboxPage(new Request(internal), { ...bindings, PUBLIC_ORIGIN: "https://cache.test", DEPLOYMENT: "TEST explicit deployment" });
    expect([explicit?.status, (await explicit!.json<{ deployment: string }>()).deployment]).toEqual([200, "TEST explicit deployment"]);
    const invalid = await applicationSandboxPage(new Request(internal), { ...bindings, PUBLIC_ORIGIN: "https://cache.test/" });
    expect([invalid?.status, await invalid!.json()]).toEqual([503, { error: "application-unavailable" }]);
  } finally { releaseFirst(); releaseSecond(); await Promise.allSettled(outstanding); for (const f of fixtures) await env.APPLICATION_CONTENT.delete(f.key); }
});
