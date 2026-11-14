import test from "node:test";
import assert from "node:assert/strict";
import { scopeScaleFiles, scopeScaleCaseCounts, testOptions } from "../vitest.projects.mjs";

test("the canonical partition keeps inherited native configs out of the plain phase and refuses inconsistent selection", () => {
  const all = testOptions(), plain = testOptions("plain"), native = testOptions("native");
  assert.deepEqual(plain.projects.map(project => project.test.name), ["bytes", "derive", "define", "platform", "git", "checkers", "replay", "client", "lanes", "cli", "page", "mcp", "counting", "lending", "grow", "repo-in-ai"]);
  assert.deepEqual(native.projects.map(project => project.test.name), ["scope", "scope-stories", "scope-lending", "scope-denial", "scope-scale"]);
  assert.equal(all.projects.length, 21);
  assert.deepEqual(testOptions("native", "omit").projects.map(project => project.test.name), ["scope", "scope-stories", "scope-lending", "scope-denial"]);
  assert.deepEqual(testOptions("scale").projects.map(project => project.test.name), ["scope-scale"]);
  const expectedScale = {
    "test/floor-archive.test.ts": 3, "test/archive-one-entry-scale.test.ts": 1, "test/archive-cadence.test.ts": 1,
    "../../apps/room/lanes/test/directory-partition-success-capacity.scope.test.ts": 1,
    "../cli/test/fixed-slot-membership.scope.test.ts": 1, "test/floor-kept.test.ts": 1,
    "../../apps/room/lanes/test/directory-partition-capacity.scope.test.ts": 1,
    "../../apps/room/lanes/test/certified-rules-hardening-budget.scope.test.ts": 1,
    "test/archive-installed-scale.test.ts": 2, "test/evidence-rules-real-scale.test.ts": 4,
    "../../apps/room/lanes/test/directory-partition-lanes-scale.scope.test.ts": 2,
    "../../apps/room/lanes/test/manifest-tree-scale.scope.test.ts": 2,
    "../../apps/room/lanes/test/demo-scale.scope.test.ts": 2,
  };
  assert.deepEqual(scopeScaleCaseCounts, expectedScale);
  assert.deepEqual(scopeScaleFiles, Object.keys(expectedScale));
  assert.equal(scopeScaleFiles.length, 13);
  assert.equal(Object.values(scopeScaleCaseCounts).reduce((sum, count) => sum + count, 0), 22);
  assert.throws(() => testOptions("all", "omit"), /Only the native gate/);
  assert.throws(() => testOptions("native", "unknown"), /Only the native gate/);
  assert.deepEqual(new Set([...plain.projects, ...native.projects]), new Set(all.projects));
  assert.ok(plain.projects.every(project => !project.extends.includes("vitest.worker") && !project.extends.includes("vitest.lending") && !project.extends.includes("vitest.denial") && !project.extends.includes("vitest.scale")));
  assert.deepEqual(native.projects.map(project => project.test.sequence.groupOrder), [1, 2, 3, 4, 5]);
  const [scope, stories] = native.projects;
  assert.equal(scope.extends, "./packages/scope/vitest.worker.config.ts");
  assert.equal(stories.extends, scope.extends);
  assert.equal(stories.test.root, scope.test.root);
  assert.equal(scope.test.include, undefined);
  assert.deepEqual(stories.test.include, [
    "../../apps/room/lanes/test/**/*.scope.test.ts",
    "../cli/test/**/*.scope.test.ts",
    "../../apps/room/page/test/**/*.scope.test.ts",
    "../mcp/test/**/*.scope.test.ts",
  ]);
  assert.deepEqual(stories.test.exclude, ["test/**/*.test.ts", ...scopeScaleFiles]);
  assert.deepEqual(native.projects.find(project => project.test.name === "scope-scale").test.provide, scope.test.provide);
  assert.equal(plain.maxWorkers, 4); assert.equal(native.maxWorkers, 4);
  assert.throws(() => testOptions("unknown"), /Unknown test phase/);
  // Exercise the actual selection guard, without importing or resolving an
  // inherited config. Restore the canonical object even when it refuses.
  const selected = plain.projects[0], original = selected.test.sequence.groupOrder;
  try {
    selected.test.sequence.groupOrder = 1;
    assert.throws(() => testOptions("plain"), /canonical test projects/);
    assert.throws(() => testOptions("native"), /canonical test projects/);
  } finally { selected.test.sequence.groupOrder = original; }
  assert.equal(testOptions("plain").projects.length, 16);
});
