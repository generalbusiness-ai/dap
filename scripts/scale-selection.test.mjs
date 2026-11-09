import test from "node:test";
import assert from "node:assert/strict";
import { gateScaleSelection, scaleGateDecision } from "./scale-selection.mjs";

import { mkdtempSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const head = "a".repeat(40), main = "b".repeat(40);
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
