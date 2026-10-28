import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configOf } from "./security-settings.mjs";
import { contextForCelldSmoke, runCelldSmoke, smokeSettings } from "./celld-smoke.mjs";
import { matchesCelldVersion } from "./test-celld-proxy.mjs";

test("the proxy compares the maintained celld pin as a whole version token without a hidden release literal", async () => {
  const pin = await readFile(new URL("../apps/room/celld/celld.version", import.meta.url), "utf8");
  assert.equal(matchesCelldVersion(pin, `celld ${pin.trim()}`), true);
  assert.equal(matchesCelldVersion(pin, `celld ${pin.trim().slice(1)}\n`), true);
  // This version is synthetic comparison input, not a release or compatibility claim.
  const synthetic = "v12.34.567\n";
  assert.equal(matchesCelldVersion(synthetic, "celld v12.34.567"), true);
  assert.equal(matchesCelldVersion(synthetic, "celld\t12.34.567\n"), true);
  for (const reported of ["celld 12.34.568", "celld 12.34.5670", "celld 112.34.567", "celld v12.34.567-rc.1", "celld prefixv12.34.567", "celld v12.34.567suffix"])
    assert.equal(matchesCelldVersion(synthetic, reported), false, reported);
  for (const invalid of [undefined, "", "v12.34.567", "12.34.567\n", "v12x34x567\n", "v12.34.567.*\n", "v12.34.567\n\n", " v12.34.567\n", "v12.34.567\r\n"])
    assert.throws(() => matchesCelldVersion(invalid, "celld 12.34.567"), /Invalid maintained celld version pin/);
});

function triggerBlock(workflow, trigger) {
  const lines = workflow.split("\n"), header = `  ${trigger}:`, start = lines.indexOf(header);
  assert.ok(start >= 0 && start === lines.lastIndexOf(header), `One ${trigger} block is required`);
  let end = start + 1;
  while (end < lines.length && (!lines[end] || lines[end].startsWith("    "))) end++;
  return lines.slice(start, end).join("\n");
}

function assertTriggerPaths(workflow, trigger) {
  const lines = triggerBlock(workflow, trigger).split("\n"), start = lines.indexOf("    paths:");
  assert.ok(start >= 0, `${trigger} keeps its paths list`);
  const paths = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) continue;
    const match = /^      - '([^']+)'$/.exec(line);
    if (!match) break;
    paths.push(match[1]);
  }
  for (const path of ["packages/scope/**", "packages/mcp/**", "packages/cli/**", "packages/platform/**", "packages/derive/**", "packages/bytes/**", "apps/room/**", "scripts/celld-smoke*", "scripts/test-celld-proxy*", ".github/workflows/celld-smoke.yml", "package.json", "package-lock.json"])
    assert.ok(paths.includes(path), `${trigger} must include ${path}`);
}

test("both smoke workflow triggers cover runtime packages and retain lockfile coverage", async () => {
  const workflow = await readFile(new URL("../.github/workflows/celld-smoke.yml", import.meta.url), "utf8");
  // Literal source policy only: this does not emulate GitHub glob matching or run CI.
  for (const trigger of ["pull_request", "push"]) {
    assertTriggerPaths(workflow, trigger);
    const block = triggerBlock(workflow, trigger), other = trigger === "push" ? "pull_request" : "push";
    for (const path of ["packages/cli/**", "package-lock.json"]) {
      const missing = block.replace(`      - '${path}'`, "");
      assert.notEqual(missing, block);
      const specimen = workflow.replace(block, missing);
      assert.throws(() => assertTriggerPaths(specimen, trigger), error => error.message.includes(trigger) && error.message.includes(path));
      assertTriggerPaths(specimen, other);
    }
  }
});

test("local project keeps a distinct deployment identity, native migrations and pinned workflow actions without committed secrets", async () => {
  const local = JSON.parse(await readFile(new URL("../apps/room/celld/wrangler.json", import.meta.url), "utf8"));
  const deployed = configOf(await readFile(new URL("../apps/room/wrangler.jsonc", import.meta.url), "utf8"), "apps/room/wrangler.jsonc");
  assert.equal(local.name, "dap-celld-local");
  assert.notEqual(local.name, deployed.name);
  assert.deepEqual(local.durable_objects, deployed.durable_objects);
  assert.deepEqual(local.migrations, deployed.migrations);
  assert.deepEqual(Object.keys(local).sort(), ["compatibility_date", "compatibility_flags", "durable_objects", "main", "migrations", "name", "vars"]);
  assert.equal(local.vars.SCOPE_INDEX_MODE, "enforce");
  assert.equal(Object.hasOwn(local.vars, "SESSION_SECRET"), false);
  assert.equal(Object.hasOwn(local.vars, "REGISTER_SCOPE"), false);
  assert.equal(await readFile(new URL("../apps/room/celld/worker.ts", import.meta.url), "utf8"), 'export * from "../worker.ts";\nexport { default } from "../worker.ts";\n');
  assert.match(await readFile(new URL("../apps/room/celld/celld.version", import.meta.url), "utf8"), /^v[0-9]+\.[0-9]+\.[0-9]+\n$/);
  const workflow = await readFile(new URL("../.github/workflows/celld-smoke.yml", import.meta.url), "utf8");
  const actions = [...workflow.matchAll(/^\s*(?:-\s+)?uses:\s*(.+)$/gm)].map(line => {
    const pin = /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+)@([0-9a-f]{40})\s+# v([1-9][0-9]*)$/.exec(line[1].trim());
    assert.ok(pin, "Every workflow action uses a full commit hash and trailing # vN comment");
    return { name: pin[1], major: pin[3] };
  });
  for (const name of ["actions/checkout", "actions/setup-node"])
    assert.ok(actions.some(action => action.name === name && action.major === "6"), `${name} keeps its reviewed v6 major`);
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
