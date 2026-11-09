import test from "node:test";
import assert from "node:assert/strict";
import { gateScaleSelection, scaleGateDecision } from "./scale-selection.mjs";
import { runScale, scaleResults } from "./scale-runner.mjs";
import { scaleDeadline, scaleDeadlineFactor } from "../packages/scope/test/support/archive-scale-deadline.ts";
import { scopeScaleFiles } from "../packages/scope/vitest.scale-files.ts";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { mkdtempSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const head = "a".repeat(40), main = "b".repeat(40);
test("scale deadlines retain local limits and multiply only an explicit runner factor", () => {
  assert.equal(scaleDeadlineFactor(undefined), 1);
  for (const milliseconds of [30_000, 600_000, 1_200_000]) {
    assert.equal(scaleDeadline(milliseconds), milliseconds);
    assert.equal(scaleDeadline(milliseconds, scaleDeadlineFactor("3")), milliseconds * 3);
  }
  for (const invalid of ["", "0", "-1", "0.5", "3x", "Infinity", "9007199254740992"]) assert.throws(() => scaleDeadlineFactor(invalid));
  assert.throws(() => scaleDeadline(1_200_000, 2000), /timer range/);
});

test("the scale capture retains full process output and failures; its summary requires all six case results", () => {
  const repository = resolve(fileURLToPath(new URL("..", import.meta.url))), scratch = mkdtempSync(join(tmpdir(), "scale-capture-"));
  const modules = scopeScaleFiles.map((file, i) => ({ name: resolve(repository, "packages/scope", file), status: "passed", assertionResults: Array.from({ length: i === 0 ? 3 : 1 }, (_, n) => ({ fullName: `TEST witness ${i}:${n}`, status: "passed", duration: 1000 + i + n })) }));
  const report = { testResults: modules, numTotalTests: 6, numPassedTests: 6, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0, success: true };
  assert.equal(scaleResults(report, repository).complete, true);
  assert.equal(scaleResults({ ...report, testResults: modules.slice(1) }, repository).complete, false);
  assert.equal(scaleResults({ ...report, testResults: [...modules, modules[0]] }, repository).complete, false);
  const failed = structuredClone(report);
  failed.testResults[0].status = "failed";
  Object.assign(failed.testResults[0].assertionResults[1], { status: "failed", duration: 600_000 });
  Object.assign(failed, { numPassedTests: 5, numFailedTests: 1, success: false });
  const failedResult = scaleResults(failed, repository);
  assert.deepEqual([failedResult.complete, failedResult.passed, failedResult.failed, failedResult.cases[1].durationMs], [true, 5, 1, 600_000]);
  const command = join(scratch, "scripted-runner.mjs");
  writeFileSync(command, `import { writeFileSync } from 'node:fs';\nprocess.stdout.write('x'.repeat(3*1024*1024));\nprocess.stderr.write('TEST retained stderr\\n');\nwriteFileSync(process.argv.find(v=>v.startsWith('--outputFile=')).slice('--outputFile='.length), ${JSON.stringify(JSON.stringify(report))});\nprocess.exitCode=1;\n`);
  const output = join(scratch, "output"), result = runScale(output, { command: [process.execPath, command], repository });
  assert.deepEqual([result.childExit, result.exitCode, result.passed, result.complete], [1, 1, 6, true]);
  assert.equal(statSync(join(output, "scale.stdout.log")).size, 3 * 1024 * 1024);
  assert.equal(readFileSync(join(output, "scale.stderr.log"), "utf8"), "TEST retained stderr\n");
  assert.equal(readFileSync(join(output, "scale.exit"), "utf8"), "exit 1\n");
});
test("main always selects scale; a review outside the ruled families records its omission", () => {
  assert.equal(scaleGateDecision({ head: main, main, changedPaths: [] }).include, true);
  const decision = scaleGateDecision({ head, main, changedPaths: ["docs/testing.md", "notes/archive-finding.md"] });
  assert.equal(decision.include, false);
  assert.equal(decision.reason, "outside-scale-paths");
  assert.deepEqual(decision.matchedPaths, []);
  assert.deepEqual(decision.changedPaths, ["docs/testing.md", "notes/archive-finding.md"]);
});

test("runtime families and their test owners select scale with literal full paths", () => {
  for (const path of ["packages/scope/src/archive-driver.ts", "packages/scope/test/archive-one-entry-scale.test.ts",
    "packages/scope/test/floor-archive.test.ts", "packages/derive/src/floor.ts", "packages/derive/test/floor.test.ts",
    "packages/git/src/journal-v2.ts", "packages/git/test/journal-v2-tree.test.ts",
    "packages/platform/src/directory-partitions.ts", "packages/platform/test/directory-partitions.test.ts",
    "apps/room/lanes/test/directory-partition-success-capacity.scope.test.ts",
    "packages/scope/test/support/archive-native-authority.ts", "packages/replay/src/archive.ts",
    "packages/scope/vitest.scale.config.ts", "packages/scope/vitest.worker.config.ts",
    "packages/scope/vitest.scale-files.ts",
    "vitest.projects.mjs", "vitest.native.config.ts", "vitest.scale.config.ts",
    "scripts/scale-selection.mjs", "scripts/scale-selection.test.mjs", "scripts/test-phases.test.mjs",
    "scripts/test.mjs", "scripts/gate.sh", "package.json", ".github/workflows/scale-tests.yml"]) {
    const decision = scaleGateDecision({ head, main, changedPaths: [path] });
    assert.equal(decision.include, true, path);
    assert.deepEqual(decision.matchedPaths, [path]);
  }
  // The planner explicitly leaves these shared inputs to the main run.
  for (const path of ["packages/scope/test/fixtures-native.ts", "packages/scope/test/worker.ts",
    "packages/scope/test/outside.ts", "apps/room/lanes/test/support/room.ts",
    "packages/scope/src/sqlite.ts", "packages/derive/src/judge.ts", "package-lock.json"]) {
    assert.equal(scaleGateDecision({ head, main, changedPaths: [path] }).include, false, path);
  }
  assert.throws(() => scaleGateDecision({ head: "a", main, changedPaths: [] }), /exact heads/);
  assert.throws(() => scaleGateDecision({ head, main, changedPaths: [null] }), /complete changed-path/);
});


test("the real Git comparison keeps a removed scale path when a rename moves it outside the family", () => {
  // Real scratch Git only; no provider or Worker runs. Keep its files in the
  // enclosing evidence temporary directory for inspection.
  const root = mkdtempSync(join(tmpdir(), "artroom-scale-selection-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" }).trim();
  git("init", "--initial-branch=main", "--object-format=sha1");
  git("config", "user.name", "builder"); git("config", "user.email", "builder@example.invalid");
  mkdirSync(join(root, "packages/scope/src"), { recursive: true });
  mkdirSync(join(root, "docs"));
  const original = "packages/scope/src/archive fixture.ts";
  writeFileSync(join(root, original), "fixture\n");
  git("add", "."); git("-c", "commit.gpgsign=false", "commit", "-m", "Seed scale selection fixture");
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  assert.equal(gateScaleSelection(root).reason, "main");
  git("switch", "-c", "review");
  writeFileSync(join(root, "docs/note.md"), "note\n");
  git("add", "."); git("-c", "commit.gpgsign=false", "commit", "-m", "Change only a note");
  assert.equal(gateScaleSelection(root).include, false);
  renameSync(join(root, original), join(root, "docs/moved fixture.ts"));
  git("add", "-A"); git("-c", "commit.gpgsign=false", "commit", "-m", "Move the scale fixture outside its family");
  const selected = gateScaleSelection(root);
  assert.equal(selected.include, true);
  assert.deepEqual(selected.matchedPaths, [original]);
  assert(selected.changedPaths.includes("docs/moved fixture.ts"));
});
