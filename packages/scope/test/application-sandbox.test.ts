/** Package cases exercise validation/R2/rendering with labelled installation
 * and binding stand-ins. The final case exercises real native RPC separately.
 * Maintained packets use the existing TEST signer; no hosted browser proof. */
import { env } from "cloudflare:test";
import { expect, inject, onTestFinished, test } from "vitest";
import { b64url, newIncarnation, scopeIdOf, unb64url } from "@generalbusiness/dap-bytes";
import { readPublishedApplicationPackage2 } from "@generalbusiness/dap-bytes/application-v2";
import { PROPOSED_BOUNDS, type ScopeKind, type ScopeRef } from "@generalbusiness/dap-contract";
import { applicationScreenPath, readApplicationScreenHost } from "@generalbusiness/dap-client/application";
import { requestSession, sessionRequest, type Fetch } from "@generalbusiness/dap-client";
import room, { type Env } from "../../../apps/room/worker.ts";
import sandbox, { type SandboxEnv } from "../../../apps/sandbox/worker.ts";
import { applicationSandboxPage } from "../src/applications/route.ts";
import { ApplicationContentStore, applicationReleaseKey } from "../src/applications/content.ts";
import type {} from "./support/maintained-applications.ts";
import { repository, una } from "./repository.ts";
import { beginSessionFixture } from "./session-settings.ts";
import { soon } from "./net.ts";
import { SCREEN_TEST_HOST } from "./worker.ts";
const ref = (kind: ScopeKind, ordinal: number): ScopeRef => ({ kind, scope: scopeIdOf({ v: 1, kind, definition: "platform:directory@16", creator: null, cause: `sha256:${"a".repeat(64)}`, ordinal }), inc: newIncarnation(new Uint8Array(16).fill(ordinal)) });

test("the public Room serves no package bytes before any scope or content lookup", async () => {
  const directory = ref("directory", 1), base = applicationScreenPath(directory.scope, 7, `sha256:${"b".repeat(64)}`);
  let nativeLookups = 0, indexLookups = 0, contentReads = 0;
  // The dispatcher may read namespace bindings to construct a lazy adapter.
  // Addressing or selecting any native/index object must still fail here.
  const bindings = Object.defineProperties({}, {
    SCOPES: { value: {
      idFromName() { nativeLookups++; expect.fail("public screen must not address a scope"); },
      get() { nativeLookups++; expect.fail("public screen must not instantiate a scope"); },
    } },
    SCOPE_INDEX: { value: {
      idFromName() { indexLookups++; expect.fail("public screen must not address the index"); },
      get() { indexLookups++; expect.fail("public screen must not instantiate the index"); },
    } },
    APPLICATION_CONTENT: { enumerable: true, value: {
      get() { contentReads++; expect.fail("public screen must not read package content"); },
      head() { contentReads++; expect.fail("public screen must not inspect package content"); },
    } },
  }) as Env;
  for (const method of ["GET", "HEAD"]) {
    const response = await room.fetch(new Request("https://dap-grow.inguz.workers.dev" + base + "index.html", { method }), bindings);
    expect([nativeLookups, indexLookups, contentReads]).toEqual([0, 0, 0]);
    expect(response.status).toBe(404); expect(await response.text()).not.toMatch(/<html|<script/);
  }
});

test.each(["grow", "lending"] as const)("sandbox serves maintained %s bytes with canonical room context and no ambient credentials", async name => {
  const background: Promise<unknown>[] = [], execution = { waitUntil: (work: Promise<unknown>) => { background.push(work); } }; // ExecutionContext STAND-IN.
  const input = inject("maintainedApplications")[name], bytes = unb64url(input.bytes);
  if (!bytes) throw Error("The maintained TEST packet must be captured.");
  const packet = readPublishedApplicationPackage2(bytes, input.release), directory = ref("directory", 1), rules = ref("rules", 2), membership = ref("membership", 3), destination = ref("destination", 4), scope = ref("lane", 5);
  const host = readApplicationScreenHost({ v: 1, screenOrigin: `https://${name}.inguz.space`, roomOrigin: `https://dap-${name}.inguz.workers.dev`, directory: directory.scope, item: 7, presentation: packet.ids.presentation });
  const trust = [{ release: packet.ids.release, publisher: packet.package.release.manifest.publisher }], store = new ApplicationContentStore(env.APPLICATION_CONTENT, trust, PROPOSED_BOUNDS);
  const scopes = { idFromName: (value: string) => value, get: (value: string) => value === directory.scope ? { applicationRoom: async () => ({ directory, rules }) }
    : { applicationInstallation: async () => ({ directory, rules, membership, destination, scope, item: host.item, definition: packet.package.semantic.entry, ids: packet.ids, membershipDefinition: "platform:membership@8" }) } };
  const roomEnv = { SCOPES: scopes as unknown as Env["SCOPES"], APPLICATION_CONTENT: env.APPLICATION_CONTENT, APPLICATION_TRUST: JSON.stringify(trust), APPLICATION_SCREEN_HOSTS: JSON.stringify([host]), DEPLOYMENT: "TEST fixed sandbox" };
  let cancelled = 0;
  const service = {
    screenHost: async () => host,
    screen: async (_origin: string, request: Request) => {
      expect(request.url.startsWith(host.roomOrigin)).toBe(true); expect(request.headers.get("cookie")).toBeNull(); expect(request.headers.get("authorization")).toBeNull();
      return (await applicationSandboxPage(request, roomEnv))!;
    },
    native: async (_origin: string, request: Request) => {
      expect(request.headers.get("authorization")).toBe("Session TEST-explicit"); expect(request.headers.get("cookie")).toBeNull();
      return new Response(new ReadableStream<Uint8Array>({ cancel() { cancelled++; } }), { headers: { "content-type": "application/x-ndjson", "set-cookie": "TEST-never-forward" } });
    },
  };
  const nativeStream = async (origin: string, request: Request) => ({ response: await service.native(origin, request), lifetime: { close: async () => undefined } });
  const boundService = { ...service, nativeStream };
  const bindings: SandboxEnv = { SCREEN_HOSTS: JSON.stringify([{ host, service: name === "grow" ? "GROW" : "LENDING" }]), ...(name === "grow" ? { GROW: boundService } : { LENDING: boundService }) };
  const base = applicationScreenPath(directory.scope, host.item, packet.ids.presentation), send = (path: string, init?: RequestInit) => sandbox.fetch(new Request(host.screenOrigin + path, init), bindings, execution);
  try {
    await store.put(packet.bytes, packet.ids.release);
    const publicReply = await room.fetch(new Request(host.roomOrigin + base + packet.package.presentation.entry), roomEnv);
    expect(publicReply.status).toBe(302); expect(publicReply.headers.get("location")).toBe(host.screenOrigin + base + packet.package.presentation.entry); expect(await publicReply.text()).toBe("");
    const asset = packet.package.presentation.assets.find(value => value.path === packet.package.presentation.entry)!;
    const served = await send(base + asset.path, { headers: { cookie: "TEST-room-key", authorization: "TEST-ambient" } });
    expect(served.status).toBe(200); expect(new Uint8Array(await served.arrayBuffer())).toEqual(unb64url(asset.bytes));
    const context = await send(base + "_/context");
    expect(await context.json()).toMatchObject({ origin: host.roomOrigin, directory, rules, membership, scope, ids: packet.ids });
    const denied = await sandbox.fetch(new Request("https://unconfigured.inguz.space" + base + asset.path), bindings, execution); expect(denied.status).toBe(404);
    expect((await send(base.replace("/7/", "/8/") + asset.path)).status).toBe(404);
    const stream = await send(`/v1/scopes/${scope.scope}/stream`, { headers: { authorization: "Session TEST-explicit", cookie: "TEST-ambient" } });
    expect(stream.headers.get("set-cookie")).toBeNull(); await stream.body!.cancel(); expect(cancelled).toBe(1);
    expect((await send("/mcp", { method: "POST" })).status).toBe(404);
  } finally { await Promise.all(background); await env.APPLICATION_CONTENT.delete(applicationReleaseKey(packet.ids.release)); }
});

test("named sandbox RPC carries a real session and stream, and cancellation releases the native subscription", async () => {
  // Real WorkerEntrypoint RPC and PLATFORM membership/session/stream routes.
  // repository.ts labels the office/clock/host stand-ins; this fixed TEST
  // locator is not evidence of an installed screen or a hosted deployment.
  const owner = beginSessionFixture({ secret: b64url(crypto.getRandomValues(new Uint8Array(32))), sessions: false, inspector: null });
  onTestFinished(owner.close);
  const background: Promise<unknown>[] = [], execution = { waitUntil: (work: Promise<unknown>) => { background.push(work); } }; // ExecutionContext STAND-IN.
  const { M } = await repository(), membership = await M.at(), initial = (await M.summary()).at, host = SCREEN_TEST_HOST;
  const original = env.SCREEN_API as unknown as NonNullable<SandboxEnv["ROOM"]>;
  const errorName = (error: unknown): string => error instanceof Error ? error.name.slice(0, 64) : "non-Error";
  const descriptorMatches = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    const descriptor = value as Record<string, unknown>;
    return Object.keys(descriptor).length === 6 && descriptor["v"] === host.v && descriptor["screenOrigin"] === host.screenOrigin
      && descriptor["roomOrigin"] === host.roomOrigin && descriptor["directory"] === host.directory
      && descriptor["item"] === host.item && descriptor["presentation"] === host.presentation;
  };
  // Temporary stage observation only. No additional RPC, body read or retry;
  // every original method receives its original receiver and arguments once.
  const observed: NonNullable<SandboxEnv["ROOM"]> = {
    screenHost(...args) {
      console.info("R8 sandbox RPC", { stage: "screenHost", event: "entered" });
      try {
        return Reflect.apply(original.screenHost, original, args).then((value: typeof host | null) => {
          console.info("R8 sandbox RPC", { stage: "screenHost", event: "resolved", descriptorMatches: descriptorMatches(value) });
          return value;
        }, (error: unknown) => {
          console.info("R8 sandbox RPC", { stage: "screenHost", event: "rejected", name: errorName(error) });
          throw error;
        });
      } catch (error) {
        console.info("R8 sandbox RPC", { stage: "screenHost", event: "rejected", name: errorName(error) });
        throw error;
      }
    },
    screen(...args) { return Reflect.apply(original.screen, original, args); },
    nativeStream(...args) { return Reflect.apply(original.nativeStream, original, args); },
    native(...args) {
      console.info("R8 sandbox RPC", { stage: "native", event: "entered" });
      try {
        return Reflect.apply(original.native, original, args).then((value: Response) => {
          console.info("R8 sandbox RPC", { stage: "native", event: "resolved" });
          return value;
        }, (error: unknown) => {
          console.info("R8 sandbox RPC", { stage: "native", event: "rejected", name: errorName(error) });
          throw error;
        });
      } catch (error) {
        console.info("R8 sandbox RPC", { stage: "native", event: "rejected", name: errorName(error) });
        throw error;
      }
    },
  };
  const bindings: SandboxEnv = { SCREEN_HOSTS: JSON.stringify([{ host, service: "ROOM" }]), ROOM: observed };
  const send = (path: string, init?: RequestInit) => sandbox.fetch(new Request(host.screenOrigin + path, init), bindings, execution);
  const native: Fetch = async (url, init) => {
    const response = await send(url.slice(host.roomOrigin.length), init);
    if (init?.method === "POST" && new URL(url).pathname.endsWith("/sessions")) {
      // Bounded transport metadata only: never log the answer body/token or
      // arbitrary headers, and let requestSession validate the same response.
      console.info("R8 sandbox session response", { status: response.status, contentType: response.headers.get("content-type")?.slice(0, 128) ?? null });
    }
    return response;
  };
  const counts = () => (M.object as unknown as { serving(): Promise<{ streams: { open: number; released: number } }> }).serving();
  const before = (await counts()).streams;
  try {
    await owner.required(async () => {
      const signed = sessionRequest(membership, una.secret, soon(60), "sandbox-rpc-session");
      const issued = await requestSession(host.roomOrigin, M.name, signed, { fetch: native });
      expect(issued.ok).toBe(true);
      if (!issued.ok) throw Error(`No native session: ${issued.reason}`);
      const headers = { authorization: issued.session.reader() };
      const summary = await send(`/v1/scopes/${M.name}`, { headers });
      expect(summary.status).toBe(200); expect(await summary.json()).toMatchObject({ ok: true, value: { scope: membership } });
      const streamed = await send(`/v1/scopes/${M.name}/stream`, { headers });
      expect(streamed.status).toBe(200);
      const reader = streamed.body!.getReader();
      try {
        const first = await reader.read();
        expect(first.done).toBe(false);
        expect(JSON.parse(new TextDecoder().decode(first.value).trim())).toEqual({ at: initial });
        expect((await counts()).streams.open).toBe(before.open + 1);
      } finally { await reader.cancel(); }
      expect((await counts()).streams).toEqual({ open: before.open, released: before.released + 1 });
    });
    const wrong = await sandbox.fetch(new Request(`https://wrong-host.inguz.space/v1/scopes/${M.name}`), bindings, execution);
    expect(wrong.status).toBe(404);
  } finally { await Promise.all(background); owner.close(); }
});

// These controls execute the actual gateway with explicit RPC/ExecutionContext
// stand-ins. They prove local acknowledgement/error ownership, not remote
// serialization or authority; the genuine RPC case above retains that oracle.
function pendingValue<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
}
function cleanupGateway(body: ReadableStream<Uint8Array>, release: () => Promise<void>, delayHeaders = false) {
  const host = SCREEN_TEST_HOST, headers = pendingValue<void>(), background: Promise<unknown>[] = [];
  let closes = 0, disposals = 0;
  const exchange = { response: new Response(body, { headers: { "content-type": "application/x-ndjson" } }), lifetime: { close: () => { closes++; return release(); } }, [Symbol.dispose]() { disposals++; } };
  const service: NonNullable<SandboxEnv["ROOM"]> = {
    screenHost: async () => host,
    screen: async () => { throw new Error("Unexpected screen call"); },
    native: async () => { throw new Error("A stream must use its bounded exchange"); },
    nativeStream: async () => { if (delayHeaders) await headers.promise; return exchange; },
  };
  const bindings: SandboxEnv = { SCREEN_HOSTS: JSON.stringify([{ host, service: "ROOM" }]), ROOM: service };
  const execution = { waitUntil: (work: Promise<unknown>) => { background.push(work); } };
  return {
    send: () => sandbox.fetch(new Request(`${host.screenOrigin}/v1/scopes/${host.directory}/stream`), bindings, execution),
    headers, background, counts: () => ({ closes, disposals }),
  };
}

test("sandbox cancellation waits for its deferred release acknowledgement before completing", async () => {
  const entered = pendingValue<void>(), ack = pendingValue<void>(); let released = false, cancelled = 0, settled = false;
  const fixture = cleanupGateway(new ReadableStream<Uint8Array>({ cancel() { cancelled++; } }), async () => { entered.resolve(); await ack.promise; released = true; });
  const response = await fixture.send();
  const cancellation = response.body!.cancel().then(() => { expect(released).toBe(true); settled = true; });
  try {
    await entered.promise;
    expect([released, settled, cancelled]).toEqual([false, false, 0]);
    ack.resolve(); await cancellation;
    expect([released, cancelled, fixture.counts()]).toEqual([true, 1, { closes: 1, disposals: 1 }]);
  } finally { ack.resolve(); await cancellation; await Promise.all(fixture.background); }
});

test("sandbox cancellation rejects a failed release acknowledgement rather than reporting success", async () => {
  let cancelled = 0;
  const refused = new Error("TEST native release refused");
  const fixture = cleanupGateway(new ReadableStream<Uint8Array>({ cancel() { cancelled++; } }), async () => { throw refused; });
  const response = await fixture.send();
  await expect(response.body!.cancel()).rejects.toBe(refused);
  expect([cancelled, fixture.counts()]).toEqual([1, { closes: 1, disposals: 1 }]);
  await Promise.all(fixture.background);
});

test("sandbox EOF and overlapping cancellation share one release and dispose the exchange once", async () => {
  const entered = pendingValue<void>(), ack = pendingValue<void>();
  const fixture = cleanupGateway(new ReadableStream<Uint8Array>({ start(controller) { controller.close(); } }), async () => { entered.resolve(); await ack.promise; });
  const response = await fixture.send(), reader = response.body!.getReader(), ended = reader.read();
  let cancellation: Promise<void> | undefined;
  try {
    await entered.promise; cancellation = reader.cancel();
    expect(fixture.counts()).toEqual({ closes: 1, disposals: 0 });
    ack.resolve(); await Promise.all([ended, cancellation]);
    expect(fixture.counts()).toEqual({ closes: 1, disposals: 1 });
  } finally { ack.resolve(); await ended; await cancellation; await Promise.all(fixture.background); }
});

test("sandbox late headers retain bounded cleanup in the context until the exact exchange is released", async () => {
  const entered = pendingValue<void>(), ack = pendingValue<void>(); let cancelled = 0;
  const fixture = cleanupGateway(new ReadableStream<Uint8Array>({ cancel() { cancelled++; } }), async () => { entered.resolve(); await ack.promise; }, true);
  // This control intentionally awaits the real 30-second header deadline.
  // Its local 60-second test allowance includes the subsequent cleanup checks;
  // the production transport window and all other test deadlines are unchanged.
  try {
    const response = await fixture.send();
    expect(response.status).toBe(503); expect(fixture.background).toHaveLength(1);
    fixture.headers.resolve(); await entered.promise;
    expect([cancelled, fixture.counts()]).toEqual([0, { closes: 1, disposals: 0 }]);
    ack.resolve(); await Promise.all(fixture.background);
    expect([cancelled, fixture.counts()]).toEqual([1, { closes: 1, disposals: 1 }]);
  } finally { fixture.headers.resolve(); ack.resolve(); await Promise.all(fixture.background); }
}, 60_000);
