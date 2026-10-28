#!/usr/bin/env node
/** Explicit real-container acceptance. No daemon-dependent skip/pass in gate.
 * node --import tsx scripts/test-j3-runner.mjs --config /absolute/public.json --out /absolute/new-directory
 * Config includes command (engine prefix), execCommand (complete trusted ctr
 * tasks exec prefix), image digest, exact environment and canaryPort. Both
 * command prefixes remain Node-host-only; neither is part of a Job.
 * Root builds/pins the relay + /j3-test-probe image before this command. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { containerAcceptance } from "../packages/checkers/test/container.acceptance.mjs";
import { containerBridge } from "../packages/checkers/test/support/container-bridge.mjs";

const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== "--config" || args[2] !== "--out" || !isAbsolute(args[1]) || !isAbsolute(args[3])) throw Error("Use --config /absolute/public.json --out /absolute/new-directory");
const info = await lstat(args[1]); assert(info.isFile() && !info.isSymbolicLink() && info.size <= 8192);
const settings = JSON.parse(await readFile(args[1], "utf8"));
assert.deepEqual(Object.keys(settings).sort(), ["canaryPort", "command", "environment", "execCommand", "image"]);
assert(/^sha256:[a-f0-9]{64}$/.test(settings.image));
for (const prefix of [settings.command, settings.execCommand]) {
  assert(Array.isArray(prefix) && prefix.length >= 1 && prefix.length <= 16 && prefix.every(arg => typeof arg === "string" && arg.length > 0 && arg.length <= 256 && !/[\x00-\x1f]/.test(arg)) && isAbsolute(prefix[0]));
}
assert(Array.isArray(settings.environment) && settings.environment.length <= 64 && settings.environment.every(value => value && Object.keys(value).sort().join() === "name,value" && typeof value.name === "string" && typeof value.value === "string"));
assert(Number.isInteger(settings.canaryPort) && settings.canaryPort >= 1024 && settings.canaryPort <= 65535);
const output = args[3], root = dirname(dirname(fileURLToPath(import.meta.url)));
await mkdir(output, { mode: 0o700 });
const direct = await containerAcceptance(settings, output);
await writeFile(join(output, "container.json"), JSON.stringify(direct, null, 2) + "\n", { flag: "wx", mode: 0o600 });
const bridgeRoot = join(output, "native-runs"); await mkdir(bridgeRoot, { mode: 0o700 });
const bridge = await containerBridge(settings, bridgeRoot);
let status = 1;
try {
  const argv = [join(root, "node_modules/vitest/vitest.mjs"), "run", "--config", "scripts/test/j3-runner.config.mjs", "--project", "scope", "apps/room/lanes/test/manifest-tree.scope.test.ts", "-t", "dap edit uses a one-element reservation tree", "--reporter=default", "--reporter=json", `--outputFile.json=${join(output, "native.json")}`, "--silent=false"];
  const started = performance.now(), streams = { stdout: [], stderr: [] }; let count = 0, killed = false;
  const child = spawn(process.execPath, argv, { cwd: root, env: { ...process.env, ARTROOM_J3_NATIVE: JSON.stringify(bridge.settings) }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  const stop = () => { if (killed) return; killed = true; try { process.kill(-child.pid, "SIGTERM"); } catch {} };
  const timer = setTimeout(stop, 600_000), hard = setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch {} }, 605_000);
  for (const name of ["stdout", "stderr"]) child[name].on("data", chunk => { count += chunk.length; if (count > 16 * 1024 * 1024) stop(); else streams[name].push(chunk); });
  const terminal = await new Promise((resolve, reject) => { child.once("error", reject); child.once("close", (code, signal) => resolve({ code, signal })); }).finally(() => { clearTimeout(timer); clearTimeout(hard); });
  for (const name of ["stdout", "stderr"]) await writeFile(join(output, `native-${name}.log`), Buffer.concat(streams[name]), { flag: "wx", mode: 0o600 });
  await writeFile(join(output, "native-command.json"), JSON.stringify({ argv: [process.execPath, ...argv], cwd: root, ...terminal, elapsedMilliseconds: performance.now() - started, killed }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  assert.deepEqual(terminal, { code: 0, signal: null }); assert.equal(killed, false);
  const results = JSON.parse(await readFile(join(output, "native.json"), "utf8"));
  const cases = results.testResults.flatMap(file => file.assertionResults).filter(item => item.status !== "pending" && item.status !== "skipped");
  assert.equal(cases.length, 1); assert.equal(cases[0].status, "passed");
  assert.equal(results.numFailedTests, 0); assert.equal(results.numFailedTestSuites, 0); assert.equal(results.success, true);
  assert.equal(bridge.receipts.length, 2);
  assert.deepEqual(bridge.receipts.map(item => item.report.steps.at(-1)?.status), [0, 1]);
  status = 0;
} finally {
  await bridge.close();
  await writeFile(join(output, "native-runner.json"), JSON.stringify({ qualification: "Actual Runner terminals from the explicit Native bridge; original fixture retains TEST Git/provider/scheduler/activation/config/durability boundaries.", receipts: bridge.receipts }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
}
assert.equal(status, 0);
console.info(JSON.stringify({ qualification: "Explicit actual-container acceptance; no deployment or provider claim.", outcome: "passed", directJobs: direct.outcomes.length, nativeJobs: bridge.receipts.length, image: settings.image }));
