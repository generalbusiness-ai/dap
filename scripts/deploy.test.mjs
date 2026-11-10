import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { deployMain, bundleManifest } from "./deploy.mjs";
import { parseConfig } from "./deploy-config.mjs";

const version = "11111111-1111-1111-1111-111111111111";
const settings = () => ({ name: "dap-grow", main: "worker.ts", vars: {}, migrations: [{ tag: "v1", new_sqlite_classes: ["Room"] }] });

async function fixture(t, names = ["grow"]) {
  const directory = await mkdtemp(join(tmpdir(), "artroom-deploy-test-")), root = join(directory, "checkout"), receipts = join(directory, "receipts");
  await mkdir(join(root, "apps/room"), { recursive: true });
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", env: { ...process.env,
    GIT_AUTHOR_NAME: "TEST", GIT_AUTHOR_EMAIL: "test@example.invalid", GIT_COMMITTER_NAME: "TEST", GIT_COMMITTER_EMAIL: "test@example.invalid" } });
  git(["init", "--quiet"]);
  const path = name => join(root, `apps/room/wrangler.${name}.jsonc`);
  for (const name of names) await writeFile(path(name), JSON.stringify({ ...settings(), name: `dap-${name}` }) + "\n");
  const commit = () => { git(["add", "."]); git(["-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "TEST deployment source"]); return git(["rev-parse", "HEAD"]).trim(); };
  const baseline = commit(), calls = [], outputs = [], scratch = new Set();
  let behavior = {};
  const run = async (command, args, options) => {
    if (command === "git") {
      try { return { code: 0, stdout: git(args), stderr: "" }; }
      catch { return { code: 1, stdout: "", stderr: "TEST Git refusal" }; }
    }
    assert.equal(command, "npx"); calls.push({ args, options }); scratch.add(options.cwd);
    assert.ok(!resolve(options.cwd).startsWith(resolve(root)));
    assert.deepEqual(args.slice(0, 4), ["-y", "wrangler@4.147.0", "deploy", "--keep-vars"]);
    assert.equal(options.env.WRANGLER_CI_OVERRIDE_NAME, undefined);
    const config = JSON.parse(await readFile(args[args.indexOf("--config") + 1], "utf8"));
    if (args.includes("--dry-run")) {
      const dir = args[args.indexOf("--outdir") + 1];
      await writeFile(join(dir, "worker.js"), "export default {fetch(){}};\n");
      await writeFile(join(dir, "fixture.dap.json"), '{"TEST":"exact text bytes"}\n');
      await writeFile(join(dir, "README.md"), "TEST timestamp " + calls.length);
      await writeFile(join(dir, "worker.js.map"), "TEST diagnostic map " + calls.length);
      if (behavior.afterBuild) await behavior.afterBuild(config);
      return { code: behavior.buildExit ?? 0, stdout: "TEST build", stderr: "" };
    }
    const rows = [
      { type: "wrangler-session", version: 1, wrangler_version: "4.147.0", command_line_args: ["deploy", "--keep-vars"] },
      { type: "deploy", version: 1, worker_name: behavior.worker ?? config.name, version_id: version },
    ];
    await writeFile(options.env.WRANGLER_OUTPUT_FILE_PATH, rows.map(JSON.stringify).join("\n") + (behavior.badOutput ? "\nTEST malformed output" : "\n"));
    return { code: behavior.deployExit ?? 0, stdout: "TEST deployed", stderr: "" };
  };
  const write = line => { const value = JSON.parse(line); outputs.push(value); if (value.scratch) scratch.add(value.scratch); };
  const argv = [...names, ...names.flatMap(name => ["--deployed", `${name}=${baseline}`]), "--receipt-dir", receipts];
  const invoke = (extra = [], ports = {}) => deployMain([...argv, ...extra], { root, run, write, env: { WRANGLER_CI_OVERRIDE_NAME: "TEST-wrong-worker" }, now: () => new Date("2026-11-10T21:00:00Z"), ...ports });
  t.after(async () => {
    await rm(directory, { recursive: true });
    for (const path of scratch) await rm(path, { recursive: true });
  });
  return { directory, root, receipts, baseline, path, commit, calls, outputs, invoke, run, write, argv,
    behavior: value => { behavior = value; } };
}

test("a dirty checkout refuses before the scripted Wrangler", async t => {
  const f = await fixture(t); await writeFile(join(f.root, "uncommitted"), "TEST");
  assert.equal(await f.invoke(), 1); assert.equal(f.calls.length, 0);
  assert.match(f.outputs.at(-1).failure, /Dirty checkout/);
});

test("a new migration tag without --accept-migration refuses the whole batch before Wrangler", async t => {
  const f = await fixture(t, ["grow", "lending"]), config = settings(); config.name = "dap-lending";
  config.migrations.push({ tag: "v2", new_sqlite_classes: ["Index"] });
  await writeFile(f.path("lending"), JSON.stringify(config) + "\n"); f.commit();
  assert.equal(await f.invoke(), 1); assert.equal(f.calls.length, 0);
  assert.match(f.outputs.at(-1).failure, /--accept-migration/);
  assert.equal(await f.invoke(["--accept-migration", "lending=v2", "--dry-run"]), 0);
  assert.equal(f.calls.length, 2); assert.ok(f.calls.every(call => call.args.includes("--dry-run")));
  assert.equal(await f.invoke(["--accept-migration", "lending=typo"]), 1);
  assert.equal(f.calls.length, 2);
});

test("an explicit baseline cannot rewrite history or come from a mismatched receipt", async t => {
  const f = await fixture(t), config = settings(); config.migrations[0].new_sqlite_classes = ["AnotherRoom"];
  await writeFile(f.path("grow"), JSON.stringify(config)); f.commit();
  assert.equal(await f.invoke(["--accept-migration", "grow=v1"]), 1);
  assert.match(f.outputs.at(-1).failure, /Historical migrations/); assert.equal(f.calls.length, 0);
  const wrong = join(f.directory, "wrong.json"); await writeFile(wrong, JSON.stringify({ format: "dap-deployment-receipt-1", status: "deployed", config: "demo" }));
  assert.equal(await deployMain(["grow", "--previous-receipt", `grow=${wrong}`, "--receipt-dir", f.receipts], { root: f.root, run: f.run, write: f.write }), 1);
  assert.equal(f.calls.length, 0);
});

test("dry-run output hashes exact module bytes and omits generated diagnostics", async t => {
  const f = await fixture(t);
  assert.equal(await f.invoke(["--dry-run"]), 0);
  const first = f.outputs.find(row => row.bundle).bundle;
  assert.deepEqual(first.files.map(row => row.name), ["fixture.dap.json", "worker.js"]);
  assert.equal(first.kind, "dry-run-output"); assert.match(first.qualification, /Does not prove uploaded bytes/);
  assert.equal(await f.invoke(["--dry-run"]), 0);
  assert.equal(f.outputs.filter(row => row.bundle).at(-1).bundle.sha256, first.sha256);
  const directory = join(f.directory, "manual-bundle"); await mkdir(directory);
  await writeFile(join(directory, "worker.js"), "changed TEST bytes");
  assert.notEqual((await bundleManifest(directory, "worker.ts")).sha256, first.sha256);
  await symlink(join(directory, "worker.js"), join(directory, "escape"));
  await assert.rejects(bundleManifest(directory, "worker.ts"), /symlink/);
  assert.ok(f.calls.every(call => call.args.includes("--dry-run")));
});

test("a completed scripted deployment writes an external receipt that supplies the next baseline", async t => {
  const f = await fixture(t); assert.equal(await f.invoke(), 0);
  assert.equal(f.calls.length, 2); assert.ok(!f.calls[1].args.includes("--dry-run"));
  const files = await readdir(f.receipts); assert.equal(files.length, 1);
  const path = join(f.receipts, files[0]), receipt = JSON.parse(await readFile(path, "utf8"));
  assert.equal(receipt.commit, f.baseline); assert.equal(receipt.config, "grow");
  assert.equal(receipt.worker, "dap-grow"); assert.equal(receipt.version, version); assert.equal(receipt.status, "deployed");
  assert.match(receipt.qualification, /not uploaded bytes/); assert.match(receipt.qualification, /Smoke has not run/);
  assert.equal(await deployMain(["grow", "--previous-receipt", `grow=${path}`, "--dry-run"], { root: f.root, run: f.run, write: f.write }), 0);
});

test("an upload with a malformed result preserves its reported version and stops later Workers", async t => {
  const f = await fixture(t, ["grow", "lending"]); f.behavior({ badOutput: true });
  assert.equal(await f.invoke(), 3);
  assert.equal(f.calls.filter(call => !call.args.includes("--dry-run")).length, 1);
  const result = f.outputs.at(-1); assert.equal(result.partial.version, version);
  assert.equal(result.partial.commit, f.baseline); assert.equal(result.partial.config, "grow");
  assert.equal(result.partial.bundle.kind, "dry-run-output");
  assert.equal(JSON.parse(await readFile(result.partialRecord, "utf8")).version, version);
});

test("a receipt write failure keeps a partial record and never retries or rolls back", async t => {
  const f = await fixture(t);
  assert.equal(await f.invoke([], { persist: async () => { throw new Error("TEST receipt refusal"); } }), 3);
  const result = f.outputs.at(-1); assert.equal(result.partial.version, version);
  assert.match(result.failure, /Do not retry or roll back/); assert.equal(f.calls.length, 2);
  assert.equal(JSON.parse(await readFile(result.partialRecord, "utf8")).status, "partial");
});

test("failed builds and source edits between build and upload prevent deployment", async t => {
  for (const mode of ["build", "source"]) {
    const f = await fixture(t);
    f.behavior(mode === "build" ? { buildExit: 2 } : { afterBuild: () => writeFile(join(f.root, "dirty-after-build"), "TEST") });
    assert.equal(await f.invoke(), 1); assert.equal(f.calls.length, 1);
  }
});

test("receipts cannot enter the checkout through a symlink and inputs cannot invent deployment flags", async t => {
  const f = await fixture(t), alias = join(f.directory, "checkout-alias"); await symlink(f.root, alias);
  for (const argv of [
    ["grow", "--deployed", `grow=${f.baseline}`, "--receipt-dir", join(alias, "receipts")],
    ["grow", "--dry-run"],
    [...f.argv, "--var", "SCOPE_INDEX_MODE=enforce"],
    [...f.argv, "--expected-offer", "TEST"],
  ]) assert.equal(await deployMain(argv, { root: f.root, run: f.run, write: f.write }), 1);
  assert.equal(f.calls.length, 0);
});

test("the config reader preserves string bytes and accepts comments without evaluating code", () => {
  const parsed = parseConfig('{/* TEST */"name":"dap-grow","main":"worker.ts","vars":{"URL":"https://test.invalid/a/*x*/","QUOTE":"\\\"//"},"migrations":[{"tag":"v1",},],}');
  assert.equal(parsed.vars.URL, "https://test.invalid/a/*x*/"); assert.equal(parsed.vars.QUOTE, '"//');
  assert.throws(() => parseConfig('{"name":"dap-grow","main":process.exit()}'));
  assert.throws(() => parseConfig('{/* unclosed'));
});
