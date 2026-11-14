import { spawnSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scopeScaleCaseCounts } from "../packages/scope/vitest.scale-files.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedCases = Object.values(scopeScaleCaseCounts).reduce((sum, count) => sum + count, 0);

/** Reconcile the runner's report without reading its potentially large logs. */
export function scaleResults(report, repository = root) {
  const issues = [], cases = [], files = new Set();
  const owners = new Map(Object.entries(scopeScaleCaseCounts).map(([file, count]) =>
    [relative(repository, resolve(repository, "packages/scope", file)), count]));
  for (const module of report?.testResults ?? []) {
    const file = typeof module.name === "string" ? relative(repository, resolve(module.name)) : "";
    if (!owners.has(file) || files.has(file)) issues.push("Unexpected or duplicate scale owner: " + file);
    files.add(file);
    if (owners.has(file) && (module.assertionResults ?? []).length !== owners.get(file)) issues.push(`Expected ${owners.get(file)} scale cases in owner: ${file}`);
    for (const test of module.assertionResults ?? []) {
      const durationMs = typeof test.duration === "number" && Number.isFinite(test.duration) && test.duration >= 0 ? test.duration : null;
      cases.push({ file, name: test.fullName, status: test.status, durationMs });
      if (typeof test.fullName !== "string" || !["passed", "failed"].includes(test.status) || durationMs === null) issues.push("Incomplete scale case result: " + file);
    }
    if (module.status !== "passed" && !(module.assertionResults ?? []).some(test => test.status === "failed")) issues.push("Scale owner failed outside a case: " + file);
  }
  if (files.size !== owners.size || cases.length !== expectedCases) issues.push(`Expected all ${expectedCases} scale cases in ${owners.size} complete owners`);
  if (new Set(cases.map(test => JSON.stringify([test.file, test.name]))).size !== cases.length) issues.push("Duplicate scale case result");
  const passed = cases.filter(test => test.status === "passed").length, failed = cases.filter(test => test.status === "failed").length;
  if (report?.numTotalTests !== cases.length || report?.numPassedTests !== passed || report?.numFailedTests !== failed || report?.numPendingTests !== 0 || report?.numTodoTests !== 0 || report?.success !== (passed === expectedCases && failed === 0)) issues.push("Scale report totals disagree with case results");
  return { cases, issues, passed, failed, complete: issues.length === 0 };
}

/** The command seam lets the owning test observe real file output and exits. */
export function runScale(directory, { command = ["npm", "run", "test:scale", "--"], repository = root, environment = process.env } = {}) {
  const out = resolve(directory);
  mkdirSync(out, { mode: 0o700 });
  const argv = [...command, "--reporter=json", "--outputFile=" + resolve(out, "scale.json")];
  writeFileSync(resolve(out, "command.json"), JSON.stringify({ argv, cwd: repository, deadlineFactor: environment.ARTROOM_SCALE_DEADLINE_FACTOR ?? "1" }, null, 2) + "\n");
  const stdout = openSync(resolve(out, "scale.stdout.log"), "wx", 0o600), stderr = openSync(resolve(out, "scale.stderr.log"), "wx", 0o600);
  const started = performance.now();
  let child;
  try { child = spawnSync(argv[0], argv.slice(1), { cwd: repository, env: environment, stdio: ["ignore", stdout, stderr] }); }
  finally { closeSync(stdout); closeSync(stderr); }
  let summary;
  try { summary = scaleResults(JSON.parse(readFileSync(resolve(out, "scale.json"), "utf8")), repository); }
  catch { summary = { cases: [], issues: ["No readable complete Vitest JSON report; inspect the retained stdout and stderr"], passed: 0, failed: 0, complete: false }; }
  const exitCode = child.status === 0 && summary.complete && summary.passed === expectedCases ? 0 : child.status || 1;
  const result = { childExit: child.status, signal: child.signal, spawnError: child.error?.message ?? null, exitCode, elapsedMilliseconds: performance.now() - started, ...summary };
  writeFileSync(resolve(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
  writeFileSync(resolve(out, "scale.exit"), "exit " + exitCode + "\n");
  for (const test of summary.cases) console.log(`${test.status} ${test.durationMs === null ? "duration unreported" : (test.durationMs / 1000).toFixed(3) + "s"} ${test.file}: ${JSON.stringify(test.name)}`);
  for (const issue of summary.issues) console.log("Scale report: " + issue);
  console.log(`Scale child exit ${child.status ?? child.signal ?? "unavailable"}; ${summary.passed} passed, ${summary.failed} failed; retained output: ${out}`);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error("Usage: node scripts/scale-runner.mjs <new-output-directory>");
  process.exitCode = runScale(process.argv[2]).exitCode;
}
