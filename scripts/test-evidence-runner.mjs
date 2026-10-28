#!/usr/bin/env node
/** Explicit real-container evidence acceptance; no VM-dependent gate pass.
 * node --import tsx scripts/test-evidence-runner.mjs --config /absolute/public.json --out /absolute/new-directory
 * Config is public operator data: command, execCommand, image, environment.
 * The Native fixture owns room marking, admission, signing and counting. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readReport } from "@generalbusiness/dap-checkers";
import { evidenceContainerBridge } from "../packages/checkers/test/support/evidence-container-bridge.mjs";

const TEST_NAME = "marked room work uses the actual production Runner through Native admission";
const TEST_FILE = "packages/scope/test/evidence-rules-real.test.ts";
const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== "--config" || args[2] !== "--out" || !isAbsolute(args[1]) || !isAbsolute(args[3])) throw Error("Use --config /absolute/public.json --out /absolute/new-directory");
const info = await lstat(args[1]);
assert(info.isFile() && !info.isSymbolicLink() && info.size > 0 && info.size <= 8192);
assert.equal(await realpath(args[1]), args[1]);
const settings = JSON.parse(await readFile(args[1], "utf8"));
assert(settings && typeof settings === "object" && !Array.isArray(settings));
assert.deepEqual(Object.keys(settings).sort(), ["command", "environment", "execCommand", "image"]);
assert(/^sha256:[a-f0-9]{64}$/.test(settings.image));
for (const prefix of [settings.command, settings.execCommand]) {
  assert(Array.isArray(prefix) && prefix.length >= 1 && prefix.length <= 16 && prefix.every(arg => typeof arg === "string" && arg.length > 0 && arg.length <= 256 && !/[\x00-\x1f\x7f]/.test(arg)) && isAbsolute(prefix[0]));
}
assert(Array.isArray(settings.environment) && settings.environment.length <= 64 && settings.environment.every(value => value && Object.keys(value).sort().join() === "name,value"
  && typeof value.name === "string" && value.name.length > 0 && value.name.length <= 256 && typeof value.value === "string" && value.value.length <= 4096 && !/[\x00]/.test(value.name + value.value)));
const output = args[3], root = dirname(dirname(fileURLToPath(import.meta.url)));
await mkdir(output, { mode: 0o700 });
const records = join(output, "native-runs"); await mkdir(records, { mode: 0o700 });
const bridge = await evidenceContainerBridge(settings, records);
let passed = false;
try {
  const argv = [join(root, "node_modules/vitest/vitest.mjs"), "run", "--config", "scripts/test/evidence-runner.config.mjs", "--project", "scope", TEST_FILE,
    "-t", `^${TEST_NAME}$`, "--reporter=default", "--reporter=json", `--outputFile.json=${join(output, "native.json")}`, "--silent=false"];
  const began = performance.now(), streams = { stdout: [], stderr: [] };
  let bytes = 0, killed = false, truncated = false;
  const child = spawn(process.execPath, argv, { cwd: root, env: { ...process.env, ARTROOM_EVIDENCE_NATIVE: JSON.stringify(bridge.settings) }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  const stop = () => { if (killed) return; killed = true; try { process.kill(-child.pid, "SIGTERM"); } catch {} };
  const timer = setTimeout(stop, 600_000), hard = setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch {} }, 605_000);
  for (const name of ["stdout", "stderr"]) child[name].on("data", chunk => {
    const left = Math.max(0, 16 * 1024 * 1024 - bytes);
    if (left) streams[name].push(chunk.subarray(0, left));
    bytes += chunk.length;
    if (bytes > 16 * 1024 * 1024) { truncated = true; stop(); }
  });
  const terminal = await new Promise((resolve, reject) => { child.once("error", reject); child.once("close", (code, signal) => resolve({ code, signal })); })
    .finally(() => { clearTimeout(timer); clearTimeout(hard); });
  for (const name of ["stdout", "stderr"]) await writeFile(join(output, `native-${name}.log`), Buffer.concat(streams[name]), { flag: "wx", mode: 0o600 });
  await writeFile(join(output, "native-command.json"), JSON.stringify({ argv: [process.execPath, ...argv], cwd: root, ...terminal,
    elapsedMilliseconds: performance.now() - began, killed, outputBytesObserved: bytes, truncated }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  assert.deepEqual(terminal, { code: 0, signal: null }); assert.equal(killed, false); assert.equal(truncated, false);
  const results = JSON.parse(await readFile(join(output, "native.json"), "utf8"));
  const cases = results.testResults.flatMap(file => file.assertionResults).filter(item => item.status !== "pending" && item.status !== "skipped");
  assert.equal(cases.length, 1); assert.equal(cases[0].title, TEST_NAME); assert.equal(cases[0].status, "passed");
  assert.equal(results.numFailedTests, 0); assert.equal(results.numFailedTestSuites, 0); assert.equal(results.success, true);
  assert(bridge.receipts.length >= 1 && bridge.receipts.length <= 2, "the selected Native case must run the real adapter");
  for (const receipt of bridge.receipts) {
    const report = readReport(receipt.report);
    assert(report && report.checkout && report.end === "complete" && report.steps.length > 0, "the actual room run must finish after exact checkout");
    assert.equal(report.image, settings.image); assert.deepEqual(report.environment, settings.environment); assert.equal(receipt.source, "room");
  }
  passed = true;
} finally {
  let bridgeWorkJoined = false;
  try { await bridge.close(); bridgeWorkJoined = true; }
  finally {
    await writeFile(join(output, "native-runner.json"), JSON.stringify({
      qualification: "Actual production J3 Runner terminals through an explicit TEST loopback port. The Native test owns real room marking/admission/result counting and external signing; its declared fixture boundaries remain. No deployed service/provider or guest CPU claim.",
      bridgeWorkJoined, receipts: bridge.receipts,
    }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  }
}
assert.equal(passed, true);
console.info(JSON.stringify({ qualification: "Explicit real-container evidence Native case; no deployment claim.", outcome: "passed", testCases: 1, actualRuns: bridge.receipts.length, image: settings.image }));
