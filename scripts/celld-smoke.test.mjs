import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configOf } from "./security-settings.mjs";
import { contextForCelldSmoke, runCelldSmoke, smokeSettings } from "./celld-smoke.mjs";

test("local project preserves native object identities and migration history without a host, public package store or committed session secret", async () => {
  const local = JSON.parse(await readFile(new URL("../apps/room/celld/wrangler.json", import.meta.url), "utf8"));
  const deployed = configOf(await readFile(new URL("../apps/room/wrangler.jsonc", import.meta.url), "utf8"), "apps/room/wrangler.jsonc");
  assert.equal(local.name, deployed.name);
  assert.deepEqual(local.durable_objects, deployed.durable_objects);
  assert.deepEqual(local.migrations, deployed.migrations);
  assert.deepEqual(Object.keys(local).sort(), ["compatibility_date", "compatibility_flags", "durable_objects", "main", "migrations", "name", "vars"]);
  assert.equal(local.vars.SCOPE_INDEX_MODE, "enforce");
  assert.equal(Object.hasOwn(local.vars, "SESSION_SECRET"), false);
  assert.equal(Object.hasOwn(local.vars, "REGISTER_SCOPE"), false);
  assert.equal(await readFile(new URL("../apps/room/celld/worker.ts", import.meta.url), "utf8"), 'export * from "../worker.ts";\nexport { default } from "../worker.ts";\n');
  assert.match(await readFile(new URL("../apps/room/celld/celld.version", import.meta.url), "utf8"), /^v[0-9]+\.[0-9]+\.[0-9]+\n$/);
});

test("smoke planning retains the actual native host-none install offline and exposes only its public identity", async () => {
  const home = await mkdtemp(join(tmpdir(), "dap-celld-plan-"));
  let calls = 0;
  const fetch = async () => { calls++; throw Error("Private transport sentinel must stay private"); };
  try {
    const report = await runCelldSmoke({ phase: "plan", base: "http://127.0.0.1:9876", home, fetch });
    assert.deepEqual(Object.keys(report).sort(), ["definition", "phase", "register", "version"]);
    assert.match(report.register, /^sc_[a-z2-7]{52}$/);
    assert.equal(report.definition, "platform:register@21");
    assert.equal(calls, 0);
    const config = JSON.parse(await readFile(join(home, "config.json"), "utf8"));
    assert.equal(config.plan.register, report.register);
    assert.equal(config.plan.founding.intent.fields.host, "none");
    assert.equal(config.plan.founding.intent.fields.namespace, "");
    assert.equal(config.register, undefined);
    assert.ok((await stat(join(home, "keys", "operator.key"))).size > 0);
    assert.equal((await stat(join(home, "config.json"))).mode & 0o077, 0);
    assert.equal((await stat(home)).mode & 0o077, 0);
    assert.equal(JSON.stringify(report).includes(config.plan.founding.sig), false);
    assert.equal(JSON.stringify(report).includes("Private transport sentinel"), false);
    const original = await readFile(join(home, "config.json"), "utf8");
    const ctx = await contextForCelldSmoke({ base: config.service, home, fetch });
    assert.equal(ctx.trustedCreationService.service, config.service);
    assert.equal(ctx.trustedCreationService.fetch, ctx.fetch);
    await ctx.store.keepPrivate("celld-smoke-run-started", new Uint8Array([1]));
    await assert.rejects(() => runCelldSmoke({ phase: "run", base: config.service, home, fetch }), /run-already-started/);
    assert.equal(await readFile(join(home, "config.json"), "utf8"), original);
    assert.equal(calls, 0, "A second run cannot replace acknowledged or uncertain acts");
  } finally { await rm(home, { recursive: true, force: true }); }
});

test("smoke keeps proxy identity separate from the explicit local no-proxy address and never follows redirects", async () => {
  const home = await mkdtemp(join(tmpdir(), "dap-celld-port-"));
  const base = "http://127.0.0.1:9876", seen = [];
  const fetch = async (url, init) => { seen.push({ url, init }); return new Response(null, { status: 503 }); };
  try {
    const local = await contextForCelldSmoke({ base, home, localAddress: "127.0.0.1", fetch });
    await local.fetch(`${base}/health`, { headers: { "x-test": "actual transport boundary" } });
    assert.equal(seen[0].init.headers.get("cf-connecting-ip"), "127.0.0.1");
    assert.equal(seen[0].init.redirect, "error");
    assert.equal(seen[0].init.credentials, "omit");
    assert.ok(seen[0].init.signal instanceof AbortSignal);
    const proxy = await contextForCelldSmoke({ base: "https://localhost:9877", home, fetch });
    await proxy.fetch("https://localhost:9877/health");
    assert.equal(seen[1].init.headers.has("cf-connecting-ip"), false);
    await assert.rejects(() => local.fetch("https://another.invalid/health"), /request-origin/);
    assert.equal(seen.length, 2);
    for (const base of ["http://localhost:9876", "https://u:p@example.com", "https://example.com/path", "https://example.com/"])
      assert.throws(() => smokeSettings({ phase: "plan", base, home }), /base/);
    assert.throws(() => smokeSettings({ phase: "plan", base: "https://localhost:9877", home, localAddress: "127.0.0.1" }), /local-address/);
  } finally { await rm(home, { recursive: true, force: true }); }
});
