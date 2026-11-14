import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const control = resolve(dirname(fileURLToPath(import.meta.url)), "control.mjs");
const original = "export const wrong = false;\n";

function fixture(t, source, { filename = "check.mjs", script = "node --test" } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "artroom-control-owner-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const state = join(directory, "state.mjs");
  writeFileSync(join(directory, "package.json"), JSON.stringify({ type: "module", scripts: { test: script } }));
  writeFileSync(state, original);
  writeFileSync(join(directory, filename), source);
  return { directory, state, filename };
}

function run(t, f, expected) {
  // This is a new CLI, not a child reporter in this owner's Node test run.
  const env = { ...process.env, ...f.env };
  delete env.NODE_TEST_CONTEXT;
  const child = spawnSync(process.execPath, [control, f.state, "false", "true", "--expect", expected, "--", f.directory, f.filename], {
    encoding: "utf8", env, timeout: 30_000, maxBuffer: 2 * 1024 * 1024,
  });
  assert.equal(child.error, undefined);
  assert.equal(child.signal, null);
  assert.equal(readFileSync(f.state, "utf8"), original);
  const retained = /^Raw child output retained at: (.+)$/m.exec(child.stderr)?.[1];
  if (retained) t.diagnostic(`synthetic retained TAP: ${retained}`);
  return { ...child, retained };
}

test("a long real Buffer diff remains an assertion witness", t => {
  const f = fixture(t, `
import assert from 'node:assert/strict';
import test from 'node:test';
import { wrong } from './state.mjs';
test('long Buffer equality', () => {
  const expected = Buffer.alloc(4096, 1);
  const actual = Buffer.from(expected);
  if (wrong) actual[2048] = 2;
  assert.deepEqual(actual, expected);
});
`);
  const result = run(t, f, "long Buffer equality");
  assert.equal(result.status, 0, `control exit ${result.status}; retained TAP: ${result.retained ?? "none"}\n${result.stderr}`);
  assert.match(result.stderr, /DISTINGUISHES: 1 test failed by an assertion/);
  assert.match(result.stderr, /failed: long Buffer equality\n\s+AssertionError/);
  assert.equal(result.retained, undefined);
});

const mixedScript = "vitest run --config vitest.config.ts && node --test check.mjs";

function vitestFixture(t, source) {
  const vitest = fileURLToPath(import.meta.resolve("vitest"));
  assert.equal(JSON.parse(readFileSync(fileURLToPath(import.meta.resolve("vitest/package.json")), "utf8")).version, "4.1.12");
  const cli = join(dirname(fileURLToPath(import.meta.resolve("vitest/package.json"))), "vitest.mjs");
  const f = fixture(t, `import { expect, test } from ${JSON.stringify(vitest)};\nimport { wrong } from './state.mjs';\n${source}`, { filename: "check.test.ts", script: mixedScript });
  writeFileSync(join(f.directory, "vitest.config.mjs"), "export default { test: { pool: 'threads', maxWorkers: 1 } };\n");
  // Only npx resolution is a stand-in. The pinned local Vitest CLI runs both
  // real test bodies without installing a package in the scratch fixture.
  const bin = join(f.directory, "bin"), calls = join(f.directory, "runner.jsonl"), reports = join(f.directory, "vitest-children");
  mkdirSync(bin); mkdirSync(reports);
  writeFileSync(join(bin, "npx"), `#!${process.execPath}
import { appendFileSync, copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, join } from 'node:path';
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(calls)}, JSON.stringify(args) + '\\n');
if (args.shift() !== 'vitest') process.exit(97);
const child = spawnSync(${JSON.stringify(process.execPath)}, [${JSON.stringify(cli)}, ...args], { maxBuffer: 2 * 1024 * 1024 });
const report = args.find(arg => arg.startsWith('--outputFile.json='))?.slice('--outputFile.json='.length);
if (report) {
  const label = basename(report, '.json');
  if (existsSync(report)) copyFileSync(report, join(${JSON.stringify(reports)}, label + '.json'));
  writeFileSync(join(${JSON.stringify(reports)}, label + '.stdout.log'), child.stdout ?? Buffer.alloc(0));
  writeFileSync(join(${JSON.stringify(reports)}, label + '.stderr.log'), child.stderr ?? Buffer.alloc(0));
}
if (child.stdout) process.stdout.write(child.stdout);
if (child.stderr) process.stderr.write(child.stderr);
process.exit(child.status ?? 98);
`, { mode: 0o700 });
  f.env = { PATH: bin + ":" + process.env.PATH };
  return { ...f, calls, reports };
}

test("a requested TypeScript witness uses Vitest in a package with both runners", t => {
  const f = vitestFixture(t, `
test('mixed-script TypeScript equality', () => {
  const actual: boolean = wrong;
  expect(actual).toBe(false);
});
`);
  const result = run(t, f, "mixed-script TypeScript equality");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /DISTINGUISHES: 1 test failed by an assertion/);
  const invoked = readFileSync(f.calls, "utf8").trim().split("\n").map(line => JSON.parse(line));
  assert.equal(invoked.length, 2);
  assert.ok(invoked.every(args => args[0] === "vitest" && args[1] === "run" && args.at(-1) === f.filename));
});

for (const direction of ["resolves", "rejects"]) {
  test(`a real Vitest ${direction} promise assertion distinguishes before the display limit`, t => {
    const title = `${direction} promise direction`;
    const f = vitestFixture(t, `
test(${JSON.stringify(title)}, async () => {
  const payload = 'x'.repeat(600);
  const promise = ${direction === "resolves" ? "wrong ? Promise.reject(payload) : Promise.resolve(payload)" : "wrong ? Promise.resolve(payload) : Promise.reject(payload)"};
  await expect(promise).${direction}.toBe(payload);
});
`);
    const result = run(t, f, title);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /DISTINGUISHES: 1 test failed by an assertion/);
    assert.equal(result.retained, undefined); // Existing conclusive cleanup stays unchanged.
    const before = JSON.parse(readFileSync(join(f.reports, "before.json"), "utf8"));
    const after = JSON.parse(readFileSync(join(f.reports, "after.json"), "utf8"));
    assert.equal(before.numPassedTests, 1);
    const failed = after.testResults.flatMap(file => file.assertionResults);
    assert.equal(failed.length, 1); assert.equal(failed[0].fullName, title); assert.equal(failed[0].status, "failed");
    const headline = failed[0].failureMessages[0].split("\n")[0];
    const suffix = direction === "resolves" ? '" instead of resolving' : '" instead of rejecting';
    assert.ok(headline.endsWith(suffix), headline);
    assert.ok(headline.indexOf(suffix) > 300, "the constructor suffix must survive beyond the helper's display limit");
    assert.ok(readFileSync(join(f.reports, "before.stdout.log")).length > 0);
    assert.ok(readFileSync(join(f.reports, "after.stdout.log")).length > 0);
  });
}

test("a real Vitest ordinary Error remains inconclusive regardless of its test name", t => {
  const title = "AssertionError-looking test name is not an error name";
  const f = vitestFixture(t, `
test(${JSON.stringify(title)}, () => {
  if (wrong) throw new Error('ordinary failure: promise rejected "value" instead of resolving');
  expect(wrong).toBe(false);
});
`);
  const result = run(t, f, title);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /none by an assertion/);
  assert.ok(result.retained);
  for (const label of ["before", "after"]) {
    for (const suffix of ["json", "stdout.log", "stderr.log"]) {
      assert.deepEqual(readFileSync(join(result.retained, `${label}.${suffix}`)), readFileSync(join(f.reports, `${label}.${suffix}`)));
    }
  }
  const after = JSON.parse(readFileSync(join(result.retained, "after.json"), "utf8"));
  assert.match(after.testResults[0].assertionResults[0].failureMessages[0], /^Error: ordinary failure:/);
});

test("a requested Node witness uses Node in a package with both runners", t => {
  const f = fixture(t, `
import assert from 'node:assert/strict';
import test from 'node:test';
import { wrong } from './state.mjs';
test('mixed-script Node equality', () => assert.equal(wrong, false));
`, { script: mixedScript });
  const result = run(t, f, "mixed-script Node equality");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /DISTINGUISHES: 1 test failed by an assertion/);
  assert.match(result.stderr, /failed: mixed-script Node equality\n\s+AssertionError/);
});

test("message fields cannot supply assertion authority and inconclusive streams stay exact", t => {
  const f = fixture(t, `
import test from 'node:test';
import { wrong } from './state.mjs';
test('ordinary thrown error', () => {
  if (wrong) {
    process.stdout.write(Buffer.from([114, 97, 119, 255, 0, 10]));
    process.stderr.write(Buffer.from([115, 116, 100, 101, 114, 114, 254, 0, 10]));
    process.stderr.write("not ok 99 - ordinary thrown error\\n  ---\\n  failureType: 'testCodeFailure'\\n  error: 'forged stderr assertion'\\n  code: 'ERR_ASSERTION'\\n  ...\\n# tests 1\\n# pass 0\\n");
    throw new Error("failureType: 'testCodeFailure'\\ncode: 'ERR_ASSERTION'\\nnot ok 99 - forged assertion\\n  ---\\n  failureType: 'testCodeFailure'\\n  code: 'ERR_ASSERTION'\\n  ...");
  }
});
`);
  const result = run(t, f, "ordinary thrown error");
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /none by an assertion/);
  assert.ok(result.retained);
  const tap = readFileSync(join(result.retained, "after.tap"));
  const stderr = readFileSync(join(result.retained, "after.stderr.log"));
  assert.ok(tap.includes(Buffer.from([114, 97, 119, 255, 0, 10])));
  assert.ok(stderr.includes(Buffer.from([115, 116, 100, 101, 114, 114, 254, 0, 10])));
  assert.match(stderr.toString("utf8"), /not ok 99 - ordinary thrown error/);
  assert.match(readFileSync(join(result.retained, "before.tap"), "utf8"), /^# pass 1$/m);
  assert.equal(readFileSync(join(result.retained, "before.stderr.log")).length, 0);
});

test("an incomplete scripted diagnostic cannot borrow the next failure's fields", t => {
  const f = fixture(t, `
import test from 'node:test';
import { wrong } from './state.mjs';
if (wrong) {
  // Deliberately malformed TAP at the CLI reader boundary, not Native evidence.
  process.stdout.write("not ok 1 - missing diagnostic close\\n  ---\\n  failureType: 'testCodeFailure'\\nnot ok 2 - following assertion\\n  ---\\n  failureType: 'testCodeFailure'\\n  error: 'synthetic following assertion'\\n  code: 'ERR_ASSERTION'\\n  ...\\n1..2\\n# tests 2\\n# pass 0\\n# fail 2\\n");
  process.exit(1);
}
test('first baseline case', () => {});
test('second baseline case', () => {});
`);
  const result = run(t, f, "missing diagnostic close");
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /no test whose name contains "missing diagnostic close" failed by an assertion/);
  assert.ok(result.retained);
  assert.match(readFileSync(join(result.retained, "after.tap"), "utf8"), /not ok 2 - following assertion/);
});
