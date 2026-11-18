import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
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
  assert.deepEqual(sandboxScreenOrigins(parseConfig(tracked)), ["https://grow.inguz.space", "https://lending.inguz.space", "https://counter.inguz.space", "https://lending-shelf.inguz.space", "https://counter-upgrade.inguz.space"]);
});

test("room screen descriptors and sandbox mappings agree in both directions on the matching Worker service", async () => {
  const sandbox = parseConfig(await readFile(new URL("../apps/sandbox/wrangler.rollout.jsonc", import.meta.url), "utf8"));
  const mapped = JSON.parse(sandbox.vars.SCREEN_HOSTS), expected = [];
  const roomFiles = (await readdir(new URL("../apps/room/", import.meta.url)))
    .filter(name => /^wrangler(?:\..+)?\.jsonc$/.test(name)).sort();
  for (const file of roomFiles) {
    const room = parseConfig(await readFile(new URL(`../apps/room/${file}`, import.meta.url), "utf8"));
    const hosts = JSON.parse(room.vars.APPLICATION_SCREEN_HOSTS ?? "[]");
    assert.ok(Array.isArray(hosts), file);
    for (const host of hosts) {
      const services = sandbox.services.filter(row => row.service === room.name && row.entrypoint === "ApplicationScreenService");
      assert.equal(services.length, 1, `${file} must have one matching sandbox Worker service`);
      expected.push({ host, service: services[0].binding });
    }
  }
  assert.deepEqual(mapped.filter(row => row.host.screenOrigin === "https://counter.inguz.space"), [{
    host: { v: 1, screenOrigin: "https://counter.inguz.space", roomOrigin: "https://dap-lending.inguz.workers.dev",
      directory: "sc_rgtlrioy5eckfikcapmqdteiw7y4b4lrc7k6use4rqdktn4lnabq", item: 20,
      presentation: "sha256:905a3f7e088278894937f41bd27bf612bafac9b65fe030dbf0e2e0f584cd444f" },
    service: "LENDING",
  }], "Counter 0.6.0 (item 20) uses its exact installed screen descriptor through dap-lending");
  assert.deepEqual(mapped.filter(row => row.host.screenOrigin === "https://lending.inguz.space"), [{
    host: { v: 1, screenOrigin: "https://lending.inguz.space", roomOrigin: "https://dap-lending.inguz.workers.dev",
      directory: "sc_5hagamavauu5lcejxqxqkd6xl3ol26bke2ipkhaiwxtxono2gujq", item: 2,
      presentation: "sha256:7217583c00c0548755faa3a83ee9fef194a354624dd29dccf62a7c79cbfd48ef" },
    service: "LENDING",
  }], "Lending 0.3.0 keeps lending-library's installed screen on its original host");
  assert.deepEqual(mapped.filter(row => row.host.screenOrigin === "https://lending-shelf.inguz.space"), [{
    host: { v: 1, screenOrigin: "https://lending-shelf.inguz.space", roomOrigin: "https://dap-lending.inguz.workers.dev",
      directory: "sc_zyofzb2ffitaapn2qavxv2nbdtlxzcjohc2t3mtrgqhvh2nt4dtq", item: 5,
      presentation: "sha256:6153d94842dffeadaab5cfb8c6db3f417021daf8c1f9e2fb07a3bdfd110f1e84" },
    service: "LENDING",
  }], "lending-shelf.inguz.space names upgrade-witness item 5, reviewed at Lending 0.6.0, through dap-lending");
  assert.deepEqual(mapped.filter(row => row.host.screenOrigin === "https://counter-upgrade.inguz.space"), [{
    host: { v: 1, screenOrigin: "https://counter-upgrade.inguz.space", roomOrigin: "https://dap-lending.inguz.workers.dev",
      directory: "sc_zyofzb2ffitaapn2qavxv2nbdtlxzcjohc2t3mtrgqhvh2nt4dtq", item: 2,
      presentation: "sha256:70c32e9edc50ac6c5128fb0573f9703773bcac7098269fdd7b51b70832e5c15c" },
    service: "LENDING",
  }], "counter-upgrade.inguz.space names upgrade-witness item 2, reviewed at Counter 0.7.0, through dap-lending");
  const byHost = (a, b) => a.host.screenOrigin.localeCompare(b.host.screenOrigin) || a.service.localeCompare(b.service);
  assert.deepEqual(mapped.sort(byHost), expected.sort(byHost), "room and sandbox screen descriptors must match, with no row on one side alone");
});

// SD-2: a row's presentation is the reviewed presentation. It must belong to a
// release in the same Worker's APPLICATION_TRUST, read from a committed packet.
test("each room screen row names the presentation of a release that its Worker trusts", async () => {
  const { readPublishedApplicationPackage2 } = await import("@generalbusiness/dap-platform/application-v2");
  const repository = new URL("../", import.meta.url);
  const packets = ["examples/grow/demo/application.dap.json"];
  for (const dir of ["apps/counter/releases/", "examples/lending/releases/"]) {
    for (const version of (await readdir(new URL(dir, repository))).sort()) packets.push(`${dir}${version}/application.dap.json`);
  }
  const presentationOf = new Map();
  for (const path of packets) {
    const { ids } = readPublishedApplicationPackage2(new Uint8Array(await readFile(new URL(path, repository))), null);
    presentationOf.set(ids.release, ids.presentation);
  }
  const roomFiles = (await readdir(new URL("apps/room/", repository))).filter(name => /^wrangler(?:\..+)?\.jsonc$/.test(name)).sort();
  let rows = 0;
  for (const file of roomFiles) {
    const room = parseConfig(await readFile(new URL(`apps/room/${file}`, repository), "utf8"));
    const hosts = JSON.parse(room.vars.APPLICATION_SCREEN_HOSTS ?? "[]");
    if (!hosts.length) continue;
    const trusted = new Set(JSON.parse(room.vars.APPLICATION_TRUST ?? "[]").map(row => presentationOf.get(row.release)));
    for (const host of hosts) {
      rows += 1;
      assert.ok(trusted.has(host.presentation), `${file}: ${host.screenOrigin} names ${host.presentation}, which no release in this Worker's APPLICATION_TRUST presents`);
    }
  }
  assert.ok(rows > 0, "the tracked room files name screen rows");
});
