import test from "node:test";
import assert from "node:assert/strict";
import { testOptions } from "../vitest.projects.mjs";

test("the canonical partition keeps inherited native configs out of the plain phase and refuses inconsistent selection", () => {
  const all = testOptions(), plain = testOptions("plain"), native = testOptions("native");
  assert.deepEqual(plain.projects.map(project => project.test.name), ["bytes", "derive", "platform", "git", "checkers", "replay", "client", "lanes", "cli", "page", "mcp", "counting", "lending", "grow"]);
  assert.deepEqual(native.projects.map(project => project.test.name), ["scope", "scope-lending", "scope-denial"]);
  assert.equal(all.projects.length, 17);
  assert.deepEqual(new Set([...plain.projects, ...native.projects]), new Set(all.projects));
  assert.ok(plain.projects.every(project => !project.extends.includes("vitest.worker") && !project.extends.includes("vitest.lending") && !project.extends.includes("vitest.denial")));
  assert.deepEqual(native.projects.map(project => project.test.sequence.groupOrder), [1, 2, 3]);
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
  assert.equal(testOptions("plain").projects.length, 14);
});
