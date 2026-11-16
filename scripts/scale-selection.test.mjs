import test from "node:test";
import assert from "node:assert/strict";
import { gateScaleSelection, scaleGateDecision } from "./scale-selection.mjs";
import { runScale, scaleResults } from "./scale-runner.mjs";
import { scaleDeadline, scaleDeadlineFactor } from "../packages/scope/test/support/archive-scale-deadline.ts";
import { scaleDeadlineRegistrations } from "./scale-deadline-registrations.mjs";
import { scopeScaleFiles, scopeScaleCaseCounts, scopeScaleGroup } from "../packages/scope/vitest.scale-files.ts";
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

test("the scale capture retains full process output and failures; its summary requires every owner's case results", () => {
  const repository = resolve(fileURLToPath(new URL("..", import.meta.url))), scratch = mkdtempSync(join(tmpdir(), "scale-capture-"));
  const modules = scopeScaleFiles.map((file, i) => ({ name: resolve(repository, "packages/scope", file), status: "passed", assertionResults: Array.from({ length: scopeScaleCaseCounts[file] }, (_, n) => ({ fullName: `TEST witness ${i}:${n}`, status: "passed", duration: 1000 + i + n })) }));
  const report = { testResults: modules, numTotalTests: 22, numPassedTests: 22, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0, success: true };
  const moved = scopeScaleGroup("moved"), movedPaths = new Set(moved.files.map(file => resolve(repository, "packages/scope", file)));
  const movedReport = { ...report, testResults: modules.filter(module => movedPaths.has(module.name)), numTotalTests: 16, numPassedTests: 16 };
  assert.equal(scaleResults(report, repository).complete, true);
  assert.equal(scaleResults(movedReport, repository, "moved").complete, true);
  assert.equal(scaleResults(report, repository, "moved").complete, false, "moved cannot accept the old six as extras");
  assert.equal(scaleResults(movedReport, repository).complete, false, "all cannot accept a moved-only report");
  assert.equal(scaleResults({ ...movedReport, testResults: movedReport.testResults.slice(1) }, repository, "moved").complete, false);
  const unknownOwner = structuredClone(movedReport);
  unknownOwner.testResults[0].name = resolve(repository, "unexpected-owner.test.ts");
  assert.equal(scaleResults(unknownOwner, repository, "moved").complete, false);
  const movedRedistributed = structuredClone(movedReport);
  movedRedistributed.testResults[1].assertionResults.push(movedRedistributed.testResults[0].assertionResults.pop());
  assert.equal(scaleResults(movedRedistributed, repository, "moved").complete, false, "sixteen cases in the wrong owners cannot pass");
  assert.throws(() => scaleResults(report, repository, "unknown"), /omit, moved or all/);
  assert.throws(() => scaleResults(report, repository, "omit"), /no case result/);
  assert.equal(scaleResults({ ...report, testResults: modules.slice(1) }, repository).complete, false);
  assert.equal(scaleResults({ ...report, testResults: [...modules, modules[0]] }, repository).complete, false);
  // The global total stays 22: a case moved to the wrong owner must still fail.
  const redistributed = structuredClone(report);
  redistributed.testResults[1].assertionResults.push(redistributed.testResults[0].assertionResults.pop());
  const wrongOwner = scaleResults(redistributed, repository);
  assert.equal(wrongOwner.complete, false);
  assert.ok(wrongOwner.issues.some(issue => issue.startsWith("Expected 3 scale cases in owner:")));
  const failed = structuredClone(report);
  failed.testResults[0].status = "failed";
  Object.assign(failed.testResults[0].assertionResults[1], { status: "failed", duration: 600_000 });
  Object.assign(failed, { numPassedTests: 21, numFailedTests: 1, success: false });
  const failedResult = scaleResults(failed, repository);
  assert.deepEqual([failedResult.complete, failedResult.passed, failedResult.failed, failedResult.cases[1].durationMs], [true, 21, 1, 600_000]);
  const command = join(scratch, "scripted-runner.mjs");
  writeFileSync(command, `import { writeFileSync } from 'node:fs';\nconst reports=${JSON.stringify({ all: report, moved: movedReport })};\nconst mode=process.env.ARTROOM_SCALE_MODE;\nif(!Object.hasOwn(reports,mode))throw new Error('Unexpected inherited mode');\nprocess.stdout.write('x'.repeat(3*1024*1024));\nprocess.stderr.write('TEST retained stderr\\n');\nwriteFileSync(process.argv.find(v=>v.startsWith('--outputFile=')).slice('--outputFile='.length), JSON.stringify(reports[mode]));\nprocess.exitCode=mode==='all'?1:0;\n`);
  const output = join(scratch, "output"), result = runScale(output, { command: [process.execPath, command], repository, environment: { ...process.env, ARTROOM_SCALE_MODE: "omit" } });
  assert.deepEqual([result.childExit, result.exitCode, result.passed, result.complete], [1, 1, 22, true]);
  assert.equal(statSync(join(output, "scale.stdout.log")).size, 3 * 1024 * 1024);
  assert.equal(readFileSync(join(output, "scale.stderr.log"), "utf8"), "TEST retained stderr\n");
  assert.equal(readFileSync(join(output, "scale.exit"), "utf8"), "exit 1\n");
  const movedOutput = join(scratch, "moved"), movedResult = runScale(movedOutput, { command: [process.execPath, command], repository, mode: "moved", environment: { ...process.env, ARTROOM_SCALE_MODE: "all" } });
  assert.deepEqual([movedResult.exitCode, movedResult.mode, movedResult.expectedCases, movedResult.passed, movedResult.expectedOwners.length], [0, "moved", 16, 16, 9]);
  assert.equal(JSON.parse(readFileSync(join(movedOutput, "command.json"), "utf8")).mode, "moved");
  const omittedOutput = join(scratch, "omitted");
  assert.equal(runScale(omittedOutput, { mode: "omit", command: [join(scratch, "must-not-run")] }), null);
  assert.throws(() => statSync(omittedOutput), { code: "ENOENT" });
  assert.throws(() => runScale(join(scratch, "unknown"), { mode: "unknown" }), /omit, moved or all/);
});
test("main always selects scale; a review outside the ruled families records its omission", () => {
  assert.equal(scaleGateDecision({ head: main, main, changedPaths: [] }).mode, "all");
  const decision = scaleGateDecision({ head, main, changedPaths: ["docs/testing.md", "notes/archive-finding.md"] });
  assert.equal(decision.include, false);
  assert.equal(decision.mode, "omit");
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
    assert.equal(decision.mode, "all", path);
    assert.deepEqual(decision.matchedPaths, [path]);
  }
  // GS1 includes shared Native state and fixtures; unrelated paths still omit.
  for (const path of ["packages/scope/src/metrics.ts", "packages/client/src/mark-descriptions.ts", "package-lock.json"]) {
    assert.equal(scaleGateDecision({ head, main, changedPaths: [path] }).include, false, path);
  }
  assert.throws(() => scaleGateDecision({ head: "a", main, changedPaths: [] }), /exact heads/);
  assert.throws(() => scaleGateDecision({ head, main, changedPaths: [null] }), /complete changed-path/);
});

test("GS1-only paths select moved while an original path wins over the moved group", () => {
  assert.equal(scaleGateDecision({ head, main, changedPaths: ["packages/derive/src/judge.ts"] }).mode, "moved");
  assert.equal(scaleGateDecision({ head, main, changedPaths: ["packages/derive/src/judge.ts", "packages/scope/src/archive-driver.ts"] }).mode, "all");
  for (const path of ["scripts/scale-runner.mjs", "packages/scope/vitest.scale-files.ts", "scripts/scale-selection.mjs", "packages/scope/vitest.scale.config.ts"]) {
    assert.equal(scaleGateDecision({ head, main, changedPaths: [path] }).mode, "all", path);
  }
  const originalPaths = new Set([
    "packages/scope/test/floor-kept.test.ts",
    "apps/room/lanes/test/directory-partition-capacity.scope.test.ts",
    "packages/scope/test/archive-installed-scale.test.ts",
    "apps/room/lanes/test/directory-partition-lanes-scale.scope.test.ts",
    "packages/scope/test/archive-installed.fixture.ts",
    "apps/room/lanes/test/directory-partition-lanes.scope.fixture.ts",
  ]);
  for (const path of [
    "packages/contract/src/bounds.ts",
    "packages/cli/test/fixed-slot-membership.scope.test.ts", "packages/scope/test/floor-kept.test.ts",
    "apps/room/lanes/test/directory-partition-capacity.scope.test.ts",
    "apps/room/lanes/test/certified-rules-hardening-budget.scope.test.ts",
    "packages/scope/test/archive-installed-scale.test.ts", "packages/scope/test/evidence-rules-real-scale.test.ts",
    "apps/room/lanes/test/directory-partition-lanes-scale.scope.test.ts",
    "apps/room/lanes/test/manifest-tree-scale.scope.test.ts", "apps/room/lanes/test/demo-scale.scope.test.ts",
    "packages/scope/test/archive-installed.fixture.ts", "packages/scope/test/evidence-rules-real.fixture.ts",
    "apps/room/lanes/test/directory-partition-lanes.scope.fixture.ts",
    "apps/room/lanes/test/manifest-tree.scope.fixture.ts", "apps/room/lanes/test/demo.scope.fixture.ts",
    "packages/scope/test/evidence-rules-real.test.ts", "apps/room/lanes/test/demo.scope.test.ts",
    "apps/room/lanes/test/manifest-tree.scope.test.ts", "packages/cli/test/fixed-slot-membership.scope.test.ts",
    "packages/platform/src/base-membership.ts", "packages/platform/src/membership.ts",
    "packages/derive/src/program/guard-value.ts", "packages/derive/src/judge.ts", "packages/derive/src/fold.ts",
    "packages/cli/src/command-verify.ts", "packages/cli/src/verification.ts", "packages/replay/src/verify.ts",
    "packages/scope/src/core.ts", "packages/scope/src/turn.ts", "packages/scope/src/sqlite.ts", "packages/scope/src/operations.ts",
    "packages/scope/src/partition-proof.ts", "packages/scope/src/receiver-reads.ts", "packages/scope/src/native-birth.ts",
    "packages/scope/src/proof-bytes.ts", "packages/scope/src/read-preparation.ts",
    "packages/platform/src/partition-provenance.ts", "packages/platform/src/destination-budget-v15.ts",
    "packages/platform/src/destination-v15.ts", "packages/platform/src/destination.ts",
    "packages/platform/src/rules-certificate-v15.ts", "packages/platform/src/rules-policy-v11.ts",
    "packages/platform/src/destination-evidence-v17.ts", "packages/platform/src/evidence-holds-v17.ts",
    "packages/platform/src/destination-evidence-capacity-v17.ts", "packages/platform/src/destination-evidence-funding-v17.ts",
    "packages/platform/src/reservation-v17.ts", "packages/platform/src/destination-v17.ts",
    "packages/platform/src/evidence-incident-origin-v17.ts", "packages/platform/src/evidence-index-v17.ts",
    "packages/platform/src/evidence-decision-v17.ts", "packages/platform/src/reservation.ts",
    "packages/platform/src/archive-binding.ts", "packages/platform/src/archive-replay-code.ts",
    "apps/room/archive.ts", "apps/room/archive-policy.ts",
    "packages/scope/test/support/maintained-applications-setup.ts",
    "packages/scope/test/support/maintained-applications-child.ts",
    "packages/scope/test/support/maintained-applications.ts",
    "packages/scope/test/fixtures.ts",
    "packages/scope/test/fixtures-core.ts",
    "examples/grow/prepare-demo.ts",
    "examples/grow/prepare-check.ts",
    "examples/grow/demo-definitions.ts",
    "examples/grow/room.ts",
    "examples/grow/site.ts",
    "examples/grow/definitions/room.json",
    "examples/grow/definitions/site.json",
    "examples/grow/check/dap.application.json",
    "examples/grow/check/site-scenario.json",
    "examples/grow/check/fault-scenario.json",
    "examples/grow/check/index.html",
    "examples/grow/check/grid.html",
    "examples/grow/check/site.html",
    "examples/grow/demo/simulator.json",
    "packages/cli/src/application-files.ts",
    "packages/platform/src/application-codec/application-package-v2.ts",
 "packages/cli/src/archive-remote.ts",
    "packages/cli/src/clone-outcome.ts", "packages/cli/src/command-repository.ts", "packages/cli/src/command-change.ts",
    "packages/scope/src/worker.ts",
    "packages/scope/src/object.ts", "packages/scope/src/stage-snapshot.ts", "packages/scope/src/destination-host.ts",
    "packages/checkers/src/service.ts", "packages/checkers/src/reservation-snapshot.ts", "packages/checkers/src/job.ts",
    "scripts/demo/rehearse.ts", "packages/scope/src/artifacts-wiring.ts", "packages/scope/src/github-wiring.ts",
    "packages/scope/src/site/route.ts", "apps/room/worker.ts",
    "packages/scope/test/fixtures-native.ts", "packages/scope/test/worker.ts", "packages/scope/test/outside.ts",
    "packages/scope/test/definition-corpus-data.ts", "packages/scope/test/support/native-fixture-lifetime.ts",
    "packages/scope/test/support/serving-startup.ts", "packages/scope/test/support/session-room.ts",
    "packages/scope/test/repository.ts", "packages/scope/test/session-settings.ts", "packages/scope/test/support.ts",
    "apps/room/lanes/test/support/room.ts", "apps/room/lanes/test/support/graph.ts",
  ]) {
    const decision = scaleGateDecision({ head, main, changedPaths: [path] });
    assert.equal(decision.include, true, path);
    assert.equal(decision.mode, originalPaths.has(path) ? "all" : "moved", path);
    assert.deepEqual(decision.matchedPaths, [path]);
  }
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
  assert.equal(selected.mode, "all");
  assert.deepEqual(selected.matchedPaths, [original]);
  assert(selected.changedPaths.includes("docs/moved fixture.ts"));
});


// SD1: every fixed Scale registration needs an explicit, reviewed exception.
// Read current factories without importing their Worker/native dependencies.
test("scale registration factories leave no unlisted fixed deadline", () => {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const demoSuite = "the demo runner's rehearsal on real scopes. The Git host, git and the scheduler are STAND-INs > ";
  const exceptions = [
    ["../cli/test/fixed-slot-membership.scope.test.ts", "a real 2000-member room keeps handle uniqueness and verifies every actual scope under shipped defaults", 1_820_000],
    ["test/floor-kept.test.ts", "Native floor-kept refuses the 4097th live opening after an exact4096 kept set", 120_000],
    ["../../apps/room/lanes/test/directory-partition-capacity.scope.test.ts", "native full root preserves three thousand standing entries through one thousand undelivered generations", 600_000],
    ["test/evidence-rules-real-scale.test.ts", "actual landing reuse follows the tree key and a fresh passed job still publishes after disagreement disables reuse", 240_000],
    ["test/evidence-rules-real-scale.test.ts", "real published holds survive newer counted passes and clear only through distinct authorized transition and override records", 240_000],
    ["test/evidence-rules-real-scale.test.ts", "literal native TIME holds at its own head, replays unchanged, and recovers one funded incident within the pending bound", 240_000],
    ["test/evidence-rules-real-scale.test.ts", "the real failure and reservation outcomes serialize atomically in both admitted-before-failure and failure-before-admission schedules", 240_000],
    ["../../apps/room/lanes/test/directory-partition-lanes-scale.scope.test.ts", "two native partition roots keep cross-room block and restart release with one nineteen-call admission", 60_000],
    ...["file-publication", "default"].map(creation => ["../../apps/room/lanes/test/manifest-tree-scale.scope.test.ts", `a manifest-list reservation records both files before the configured checker passes; no branch push occurs before that pass (real scopes, STAND-IN Git host and scheduler; ${creation} creation)`, 120_000]),
    ...["artifacts", "github.com"].map(host => ["../../apps/room/lanes/test/demo-scale.scope.test.ts", demoSuite + `on ${host}: the optional manifest sequence follows shot 16, publishes both text files together and refuses a controlled two-file branch; Git capture is a STAND-IN`, 240_000]),
  ];
  const factorySources = {
    "test/evidence-rules-real-scale.test.ts": "packages/scope/test/evidence-rules-real.fixture.ts",
    "../../apps/room/lanes/test/directory-partition-lanes-scale.scope.test.ts": "apps/room/lanes/test/directory-partition-lanes.scope.fixture.ts",
    "../../apps/room/lanes/test/manifest-tree-scale.scope.test.ts": "apps/room/lanes/test/manifest-tree.scope.fixture.ts",
    "../../apps/room/lanes/test/demo-scale.scope.test.ts": "apps/room/lanes/test/demo.scope.fixture.ts",
  };
  const expected = exceptions.map(([owner, title, milliseconds]) => [owner, factorySources[owner] ?? resolve(root, "packages/scope", owner).slice(root.length + 1), title, milliseconds]);
  const fixed = rows => rows.filter(row => !row.scaled).map(row => [row.owner, row.source, row.title, row.milliseconds]);
  const ordered = rows => rows.map(row => JSON.stringify(row)).sort();
  const check = rows => assert.deepEqual(ordered(fixed(rows)), ordered(expected), "unlisted or changed fixed Scale registration");
  const actual = scaleDeadlineRegistrations(root, scopeScaleFiles);
  check(actual);
  for (const owner of scopeScaleFiles) assert.equal(actual.filter(row => row.owner === owner).length, scopeScaleCaseCounts[owner], owner);

  // One new fixed case inside an imported factory must reach the guard.
  // Source strings only: no mutation, fixture import, or native collection.
  const file = resolve(root, "packages/scope/test/evidence-rules-real.fixture.ts");
  const original = readFileSync(file, "utf8"), marker = "export function registerEvidenceRulesScale() {";
  assert.equal(original.split(marker).length, 2);
  const changed = original.replace(marker, marker + '\ntest("SD1 unlisted fixed case", { timeout: 30_000 }, async () => {});');
  const fault = scaleDeadlineRegistrations(root, scopeScaleFiles, path => path === file ? changed : readFileSync(path, "utf8"));
  assert.ok(fault.some(row => row.title === "SD1 unlisted fixed case" && !row.scaled && row.milliseconds === 30_000));
  assert.throws(() => check(fault), /unlisted or changed fixed Scale registration/);

  // Registrations hidden in values must not vanish from the inventory.
  const inspectSource = (file, source) => scaleDeadlineRegistrations(root, scopeScaleFiles, path => path === file ? source : readFileSync(path, "utf8"));
  const valueRegistration = original.replace(marker, marker + '\nconst extra = test("SD1 hidden fixed case", { timeout: 30_000 }, async () => {});');
  assert.throws(() => inspectSource(file, valueRegistration), /Scale registration calls in initializers/);
  const localFactory = original.replace(marker, 'function registerExtra() { test("SD1 local fixed case", { timeout: 30_000 }, async () => {}); }\n' + marker + '\nconst extra = registerExtra();');
  assert.throws(() => inspectSource(file, localFactory), /Scale registration calls in initializers/);
  const owner = resolve(root, "packages/scope/test/archive-installed-scale.test.ts"), ownerSource = readFileSync(owner, "utf8");
  assert.ok(ownerSource.includes('registerArchiveInstalledCases(["Grow production"]);'));
  const importedFactory = ownerSource.replace('registerArchiveInstalledCases(["Grow production"]);', 'const extra = registerArchiveInstalledCases(["Grow production"]);');
  assert.throws(() => inspectSource(owner, importedFactory), /Scale registration calls in initializers/);

  // An imported helper's spelling grants no authority after local shadowing.
  const archive = resolve(root, "packages/scope/test/archive-installed.fixture.ts"), archiveSource = readFileSync(archive, "utf8");
  const archiveFactory = "export function registerArchiveInstalledCases(scenarios: readonly string[]) {";
  assert.equal(archiveSource.split(archiveFactory).length, 2);
  const shadow = archiveSource.replace(archiveFactory, archiveFactory + '\nconst scaleDeadline = (ms: number) => ms;');
  assert.throws(() => inspectSource(archive, shadow), /Shadowed Scale registration binding: scaleDeadline/);

  // Only a demanded, known boolean may select the follower registration.
  // An unknown RHS after false must not become a guessed false condition.
  const archiveCondition = 'if (scenario === "Grow production" || sharedScenario) {';
  assert.equal(archiveSource.split(archiveCondition).length, 2);
  const unknownCondition = archiveSource.replace(archiveCondition, 'if (scenario === "shared Base" || unresolvedArchiveSelection) {');
  assert.throws(() => inspectSource(archive, unknownCondition), /Unresolved Scale registration condition/);
});
