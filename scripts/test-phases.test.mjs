import test from "node:test";
import assert from "node:assert/strict";
import { scopeScaleFiles, testOptions } from "../vitest.projects.mjs";

test("the canonical partition keeps inherited native configs out of the plain phase and refuses inconsistent selection", () => {
  const all = testOptions(), plain = testOptions("plain"), native = testOptions("native");
  assert.deepEqual(plain.projects.map(project => project.test.name), ["bytes", "derive", "define", "platform", "git", "checkers", "replay", "client", "lanes", "cli", "page", "mcp", "counting", "lending", "grow", "repo-in-ai"]);
  assert.deepEqual(native.projects.map(project => project.test.name), ["scope", "scope-stories", "scope-lending", "scope-denial", "scope-scale"]);
  assert.equal(all.projects.length, 21);
  assert.deepEqual(testOptions("native", "omit").projects.map(project => project.test.name), ["scope", "scope-stories", "scope-lending", "scope-denial"]);
  assert.deepEqual(testOptions("scale").projects.map(project => project.test.name), ["scope-scale"]);
  assert.deepEqual(scopeScaleFiles, ["test/floor-archive.test.ts", "test/archive-one-entry-scale.test.ts", "test/archive-cadence.test.ts",
    "../../apps/room/lanes/test/directory-partition-success-capacity.scope.test.ts"]);
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
  assert.deepEqual(stories.test.exclude, ["test/**/*.test.ts"]);
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
