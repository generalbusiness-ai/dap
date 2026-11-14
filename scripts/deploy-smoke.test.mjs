import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { smokeWorker, smokeSandbox, deploySmokeMain, BROWSER_USER_AGENT } from "./deploy-smoke.mjs";
import { parseConfig, sandboxScreenOrigins, smokePolicy } from "./deploy-config.mjs";

const origin = "https://TEST.invalid".toLowerCase();
const register = { scope: "sc_" + "a".repeat(52), genesis: "sha256:" + "a".repeat(64) };
const offer = { v: 2, origin, register, definition: "platform:register@26" };
const config = (start = false) => ({ name: "dap-demo", main: "worker.ts", vars: start
  ? { REGISTER_SCOPE: register.scope, DEMO_START_CONFIG: JSON.stringify({ ...offer, v: 3 }) } : {} });

/** Scripted HTTP observations exercise the checker, not a Worker or an edge. */
function scripted({ health = [200, 200, 200], mcp = 404, page = 200, creation = 404, body = offer } = {}) {
  const calls = []; let healthIndex = 0;
  const fetch = async (url, init) => {
    calls.push({ url, init });
    assert.equal(init.headers["User-Agent"], BROWSER_USER_AGENT);
    assert.equal(init.redirect, "error"); assert.equal(init.credentials, "omit");
    assert.ok(init.signal instanceof AbortSignal); assert.equal(init.body, undefined);
    const path = new URL(url).pathname;
    if (path === "/health") {
      assert.equal(init.method, "GET"); return Response.json({ register: "ready" }, { status: health[healthIndex++] ?? 500 });
    }
    if (path === "/mcp") { assert.equal(init.method, "POST"); return new Response(null, { status: mcp }); }
    if (path === "/page/") { assert.equal(init.method, "GET"); return new Response("TEST page", { status: page }); }
    assert.equal(path, "/v1/demo/creation-offer"); assert.equal(init.method, "GET");
    return Response.json(body, { status: creation });
  };
  return { calls, fetch };
}

test("health stays503 fails after exactly one cold-start retry", async () => {
  const f = scripted({ health: [503, 503, 200] });
  const result = await smokeWorker({ config: config(), url: origin }, f);
  assert.equal(result.pass, false); assert.equal(result.coldStart, true);
  assert.deepEqual(result.checks.map(row => row.status), [503, 503]); assert.equal(f.calls.length, 2);
});

test("open /mcp on a closed configuration fails smoke", async () => {
  const f = scripted({ mcp: 200 }), result = await smokeWorker({ config: config(), url: origin }, f);
  assert.equal(result.pass, false); assert.deepEqual(result.checks.at(-1), { check: "mcp", status: 200, expected: 404 });
  assert.equal(f.calls.length, 4);
});

test("one initial503 can recover but a later503 never receives another retry", async () => {
  const recovered = scripted({ health: [503, 200, 200, 200] });
  const result = await smokeWorker({ config: config(), url: origin }, recovered);
  assert.equal(result.pass, true); assert.equal(result.coldStart, true);
  assert.equal(recovered.calls.filter(call => call.url.endsWith("/health")).length, 4);
  const later = scripted({ health: [200, 503, 200] });
  const failed = await smokeWorker({ config: config(), url: origin }, later);
  assert.equal(failed.pass, false); assert.equal(failed.coldStart, false); assert.equal(later.calls.length, 2);
});

test("the configured offer must name its exact register and an omitted offer must stay absent", async () => {
  const valid = scripted({ creation: 200 });
  assert.equal((await smokeWorker({ config: config(true), url: origin }, valid)).pass, true);
  assert.equal(valid.calls.length, 6);
  const wrong = scripted({ creation: 200, body: { ...offer, register: { ...register, genesis: "sha256:" + "b".repeat(64) } } });
  assert.equal((await smokeWorker({ config: config(true), url: origin }, wrong)).pass, false);
  const absent = scripted(); assert.equal((await smokeWorker({ config: config(), url: origin }, absent)).pass, true);
  const untracked = scripted({ creation: 200 });
  assert.equal((await smokeWorker({ config: config(), url: origin }, untracked)).pass, false);
  const missing = scripted(); assert.equal((await smokeWorker({ config: config(true), url: origin }, missing)).pass, false);
});

test("tracked MCP opt-in expects authentication and page failure cannot pass smoke", async () => {
  const enabled = config(); enabled.vars.MCP_ENABLED = "true";
  enabled.durable_objects = { bindings: [{ name: "REGISTRIES" }, { name: "AGENTS" }] };
  const authenticated = scripted({ mcp: 401 });
  assert.equal((await smokeWorker({ config: enabled, url: origin }, authenticated)).pass, true);
  const page = scripted({ page: 503 });
  assert.equal((await smokeWorker({ config: config(), url: origin }, page)).pass, false);
  assert.equal(page.calls.length, 5);
});

test("network refusal and oversized JSON fail without revealing response bytes", async () => {
  const network = await smokeWorker({ config: config(), url: origin }, { fetch: async () => { throw new Error("TEST fetch refused"); } });
  assert.equal(network.pass, false);
  let cancelled = false;
  const oversized = await smokeWorker({ config: config(), url: origin }, { fetch: async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('"PRIVATE-TEST-' + "x".repeat(16 * 1024))); },
    cancel() { cancelled = true; },
  })) });
  assert.equal(oversized.pass, false); assert.equal(cancelled, true);
  assert.doesNotMatch(JSON.stringify(oversized), /PRIVATE-TEST/);
});

test("invalid origin or offer context refuses before fetch and no input can override the expected offer", async () => {
  let calls = 0; const ports = { fetch: async () => { calls++; throw new Error("TEST unexpected fetch"); } };
  for (const url of ["http://test.invalid", "https://user:secret@test.invalid", "https://test.invalid/path", "https://test.invalid/?token=TEST"]) {
    assert.equal((await smokeWorker({ config: config(), url }, ports)).pass, false);
  }
  const mismatch = config(true); mismatch.vars.REGISTER_SCOPE = "sc_" + "b".repeat(52);
  assert.equal((await smokeWorker({ config: mismatch, url: origin }, ports)).pass, false);
  assert.equal(await deploySmokeMain(["demo", "--url", origin, "--expected-offer", "TEST"], { ...ports, write: () => {} }), 2);
  assert.equal(calls, 0);
});

test("tracked room smoke policies follow their own optional full-reference offers", async () => {
  for (const name of ["grow", "lending", "demo", "artroom-scope"]) {
    const source = await readFile(new URL(`../apps/room/wrangler.${name}.jsonc`, import.meta.url), "utf8");
    const config = parseConfig(source), policy = smokePolicy(config);
    assert.equal(policy.mcpStatus, 404);
    const scriptedOffer = policy.offer ? { ...policy.offer, v: 2 } : offer;
    const observed = scripted({ body: scriptedOffer, creation: policy.offer ? 200 : 404 });
    assert.equal((await smokeWorker({ config, url: policy.offer?.origin ?? origin }, observed)).pass, true, name);
    if (policy.offer) {
      assert.deepEqual(policy.offer.register, JSON.parse(config.vars.DEMO_START_CONFIG).register);
      assert.equal(policy.offer.register.scope, config.vars.REGISTER_SCOPE);
      const wrong = structuredClone(config); wrong.vars.REGISTER_SCOPE = register.scope;
      assert.throws(() => smokePolicy(wrong), /Invalid creation offer/);
    }
  }
});

const screen = "https://test.inguz.space", room = "sc_" + "c".repeat(52);
const sandboxConfig = { name: "dap-application-sandbox", main: "worker.ts", vars: { SCREEN_HOSTS: JSON.stringify([{ host: { screenOrigin: screen }, service: "GROW" }]) } };

/** Scripted sandbox answers; each key overrides one read by its full URL. */
function scriptedSandbox(overrides = {}) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push(url);
    assert.equal(init.method, "GET"); assert.equal(init.headers["User-Agent"], BROWSER_USER_AGENT);
    assert.equal(init.redirect, "error"); assert.equal(init.credentials, "omit");
    if (Object.hasOwn(overrides, url)) return overrides[url]();
    if (url === `${screen}/v1/scopes/${room}`) return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
    return new Response(null, { status: 404 });
  };
  return { calls, fetch };
}

test("sandbox smoke passes only on four 404 reads and the room's exact forbidden read", async () => {
  const valid = scriptedSandbox(), result = await smokeSandbox({ config: sandboxConfig, host: screen, room }, valid);
  assert.equal(result.pass, true);
  assert.deepEqual(valid.calls, [`${screen}/`, `${screen}/site/x`, `${screen}/applications/x`, `${screen}/v1/scopes/${room}`, "https://unmapped-smoke.inguz.space/"]);
  for (const [url, answer] of [
    [`${screen}/site/x`, () => new Response("TEST page", { status: 200 })],
    [`${screen}/v1/scopes/${room}`, () => new Response(null, { status: 503 })],
    [`${screen}/v1/scopes/${room}`, () => Response.json({ ok: false, reason: "not-found" }, { status: 403 })],
    ["https://unmapped-smoke.inguz.space/", () => new Response(null, { status: 503 })],
  ]) assert.equal((await smokeSandbox({ config: sandboxConfig, host: screen, room }, scriptedSandbox({ [url]: answer }))).pass, false);
});

test("sandbox smoke refuses an untracked host or an invalid room before fetch and takes no --url", async () => {
  let calls = 0; const ports = { fetch: async () => { calls++; throw new Error("TEST unexpected fetch"); } };
  assert.equal((await smokeSandbox({ config: sandboxConfig, host: "https://other.inguz.space", room }, ports)).pass, false);
  assert.equal((await smokeSandbox({ config: sandboxConfig, host: screen, room: "TEST" }, ports)).pass, false);
  assert.equal(await deploySmokeMain(["sandbox", "--url", screen], { ...ports, write: () => {} }), 2);
  assert.equal(await deploySmokeMain(["sandbox", "--host", screen, "--room", room, "--url", screen], { ...ports, write: () => {} }), 2);
  assert.equal(calls, 0);
  const tracked = await readFile(new URL("../apps/sandbox/wrangler.rollout.jsonc", import.meta.url), "utf8");
  assert.deepEqual(sandboxScreenOrigins(parseConfig(tracked)), ["https://grow.inguz.space"]);
});
