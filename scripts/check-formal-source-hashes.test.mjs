import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

// A real scratch Git cut binds each refreshed hash, without importing mapped code.
test("formal source drift requires an explicit refresh of committed, reviewed bytes", t => {
  const root = mkdtempSync(join(tmpdir(), "artroom-formal-pins-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"]) delete env[name];
  const git = args => execFileSync("git", args, { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const hash = bytes => createHash("sha256").update(bytes).digest("hex");
  const coverage = JSON.parse(readFileSync(new URL("../verification/state-machines/coverage.json", import.meta.url), "utf8"));
  const fixture = "export const reviewedPremise = true;\n";
  for (const record of Object.values(coverage)) for (const file of Object.keys(record.sha256)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), fixture);
    record.sha256[file] = hash(fixture);
  }
  const coveragePath = join(root, "verification/state-machines/coverage.json");
  mkdirSync(dirname(coveragePath), { recursive: true });
  writeFileSync(coveragePath, JSON.stringify(coverage, null, 2) + "\n");
  mkdirSync(join(root, "scripts"));
  const script = join(root, "scripts/check-formal-source-hashes.mjs");
  copyFileSync(new URL("./check-formal-source-hashes.mjs", import.meta.url), script);
  const run = args => {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: root, env, encoding: "utf8" });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    return result;
  };
  const before = readFileSync(coveragePath);
  const baseline = run([]); // This check must work before a Git repository exists.
  assert.equal(baseline.status, 0, baseline.stderr);
  assert.match(baseline.stdout, /8 mapped files in 5 models/);
  git(["init", "--quiet"]);
  const commit = message => {
    git(["add", "."]);
    git(["-c", "user.name=Formal pins witness", "-c", "user.email=formal-pins@example.invalid", "commit", "--quiet", "-m", message]);
    return git(["rev-parse", "HEAD"]).trim();
  };
  commit("Keep the initial scratch correspondence");
  const file = "apps/room/page/src/retained-editor-data.ts";
  writeFileSync(join(root, file), fixture + "// Reviewed comment leaves the fixture premise unchanged.\n");
  const drift = run([]);
  assert.equal(drift.status, 1);
  assert.ok(drift.stderr.includes(`Formal source drift: ${file} (Editor)`));
  assert.ok(drift.stderr.includes("node scripts/check-formal-source-hashes.mjs --refresh Editor"));
  assert.deepEqual(readFileSync(coveragePath), before, "ordinary failure must not refresh the record");
  const uncommitted = run(["--refresh", "Editor"]);
  assert.equal(uncommitted.status, 1);
  assert.ok(uncommitted.stderr.includes(`${file} (Editor) differs from`));
  assert.deepEqual(readFileSync(coveragePath), before, "a mismatched Git cut must write nothing");
  const reviewed = commit("Review the changed source\n\nThe changed file still meets the Editor model's premises.");
  const refreshed = run(["--refresh", "Editor"]);
  assert.equal(refreshed.status, 0, refreshed.stderr);
  const adopted = JSON.parse(readFileSync(coveragePath, "utf8"));
  assert.equal(adopted.Editor.syncCommit, reviewed);
  assert.equal(adopted.Editor.sha256[file], hash(readFileSync(join(root, file))));
  const expected = structuredClone(coverage);
  expected.Editor.syncCommit = reviewed;
  expected.Editor.sha256[file] = hash(readFileSync(join(root, file)));
  assert.deepEqual(adopted, expected, "the explicit refresh changes only that model's hashes and cut");
  const checked = run([]);
  assert.equal(checked.status, 0, checked.stderr);
});
