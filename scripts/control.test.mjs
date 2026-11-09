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

test("a requested TypeScript witness uses Vitest in a package with both runners", t => {
  const vitest = fileURLToPath(import.meta.resolve("vitest"));
  const cli = join(dirname(fileURLToPath(import.meta.resolve("vitest/package.json"))), "vitest.mjs");
  const f = fixture(t, `
import { expect, test } from ${JSON.stringify(vitest)};
import { wrong } from './state.mjs';
test('mixed-script TypeScript equality', () => {
  const actual: boolean = wrong;
  expect(actual).toBe(false);
});
`, { filename: "check.test.ts", script: mixedScript });
  writeFileSync(join(f.directory, "vitest.config.mjs"), "export default { test: { pool: 'threads', maxWorkers: 1 } };\n");
  // Only npx resolution is a stand-in. The pinned local Vitest CLI runs both
  // real test bodies without installing a package in the scratch fixture.
  const bin = join(f.directory, "bin"), calls = join(f.directory, "runner.jsonl");
  mkdirSync(bin);
  writeFileSync(join(bin, "npx"), `#!${process.execPath}
import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(calls)}, JSON.stringify(args) + '\\n');
if (args.shift() !== 'vitest') process.exit(97);
const child = spawnSync(${JSON.stringify(process.execPath)}, [${JSON.stringify(cli)}, ...args], { stdio: 'inherit' });
process.exit(child.status ?? 98);
`, { mode: 0o700 });
  f.env = { PATH: bin + ":" + process.env.PATH };
  const result = run(t, f, "mixed-script TypeScript equality");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /DISTINGUISHES: 1 test failed by an assertion/);
  const invoked = readFileSync(calls, "utf8").trim().split("\n").map(line => JSON.parse(line));
  assert.equal(invoked.length, 2);
  assert.ok(invoked.every(args => args[0] === "vitest" && args[1] === "run" && args.at(-1) === f.filename));
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
