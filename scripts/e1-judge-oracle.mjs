#!/usr/bin/env node
/** One deliberate pre-split capture, or comparison against the committed cases. */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { oracleBase, oracleHarnessPaths, oracleOwners, rowsOf, sha256 } from "../packages/derive/test/judge-oracle.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const [mode, destination, ...extra] = process.argv.slice(2);
if (extra.length || !["capture", "compare"].includes(mode) || (mode === "capture" ? !destination : destination !== undefined)) {
  throw new Error("Usage: node scripts/e1-judge-oracle.mjs capture <new-external-directory> | compare");
}
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
let capture;
let harness;
if (mode === "capture") {
  // An E1 implementation head cannot overwrite the baseline with its own answers.
  if (git("status", "--porcelain") !== "") throw new Error("Capture needs a clean, committed harness checkpoint");
  const changed = execFileSync("git", ["diff", "--no-renames", "--name-only", "-z", oracleBase, "HEAD"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  if (changed.some(path => !oracleHarnessPaths.includes(path))) throw new Error("Capture refused: production or owner bytes differ from the pre-split base");
  if (git("merge-base", oracleBase, "HEAD") !== oracleBase) throw new Error("Capture checkpoint does not descend from the declared base");
  harness = git("rev-parse", "HEAD");
  capture = resolve(destination);
  const outside = relative(resolve(homedir(), "play/artroom-evidence"), capture);
  if (!outside || outside.startsWith("..") || isAbsolute(outside)) throw new Error("Capture needs a new directory below ~/play/artroom-evidence/");
  mkdirSync(capture, { recursive: false });
}

const env = { ...process.env };
delete env.ARTROOM_E1_ORACLE_CAPTURE_DIR;
if (capture) env.ARTROOM_E1_ORACLE_CAPTURE_DIR = capture;
const run = args => {
  const child = spawnSync(process.execPath, args, { cwd: root, env, stdio: "inherit" });
  if (child.error) throw child.error;
  if (child.status !== 0) {
    console.error(`E1 ${mode} stopped: child exit ${child.status}, signal ${child.signal ?? "none"}. No fixture was adopted.`);
    process.exit(child.status ?? 1);
  }
};
run(["scripts/cloudflare-pool-compat.mjs"]);
const reports = capture ?? mkdtempSync(join(tmpdir(), "e1-oracle-comparison-"));
const report = resolve(reports, "vitest.json");
run(["node_modules/vitest/vitest.mjs", "run", "--project", "derive", "--project", "replay",
  "--reporter=default", "--reporter=json", `--outputFile.json=${report}`, ...oracleOwners]);
const result = JSON.parse(readFileSync(report, "utf8"));
const completed = result.testResults?.map(file => file.name);
const expected = oracleOwners.map(owner => resolve(root, owner));
if (!result.success || !completed || completed.length !== expected.length || new Set(completed).size !== expected.length
  || completed.some(path => !expected.includes(path))) throw new Error("E1 owner selection changed: missing or extra owner; no fixture was adopted");

if (capture) {
  // Every owner has its own write-once file, including owners with zero calls.
  const answers = oracleOwners.flatMap(owner => readFileSync(resolve(capture, owner + ".answers.jsonl"), "utf8").split("\n").filter(Boolean).map(line => {
    const answer = JSON.parse(line);
    if (answer.owner !== owner) throw new Error("Capture owner/file mismatch");
    return answer;
  }));
  const fixture = { format: 1, base: oracleBase, harness, owners: oracleOwners, cases: rowsOf(answers) };
  const bytes = JSON.stringify(fixture, null, 2) + "\n";
  const raw = answers.map(answer => JSON.stringify(answer) + "\n").join("");
  writeFileSync(resolve(capture, "answers.jsonl"), raw, { flag: "wx" });
  writeFileSync(resolve(capture, "judge-answers.json"), bytes, { flag: "wx" });
  console.log(`E1 capture: ${answers.length} calls, ${fixture.cases.length} case rows, ${Buffer.byteLength(bytes)} fixture bytes.`);
  console.log(`Raw answers: ${resolve(capture, "answers.jsonl")}`);
  console.log(`Raw answers SHA-256: ${sha256(raw)}`);
  for (const owner of oracleOwners) {
    const rows = answers.filter(answer => answer.owner === owner);
    console.log(`${owner}: runtime ${rows.filter(answer => answer.list === "runtime").length}, replay ${rows.filter(answer => answer.list === "replay").length}`);
  }
  console.log("The aggregate fixture is external and uncommitted. Report its actual size before adoption.");
} else { unlinkSync(report); rmdirSync(reports); }
