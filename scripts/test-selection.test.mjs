import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { excludedTests, nodeFiles } from './test.mjs';

// Invariant: every tracked test file is selected by a gate step, or is listed
// in excludedTests (scripts/test.mjs) with a reason. Vitest itself lists the
// plain and native phase files, so the project configs stay the one source.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0')
  .filter(file => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file));

function vitestFiles(phase) {
  const scratch = mkdtempSync(join(tmpdir(), 'artroom-test-selection-'));
  try {
    const env = { ...process.env, ARTROOM_TEST_PHASE: phase, ARTROOM_SCALE_MODE: 'run' };
    for (const name of ['ARTROOM_TEST_TIMING', 'ARTROOM_TEST_PROGRESS', 'VITEST_MAX_WORKERS']) delete env[name];
    const output = join(scratch, 'files.json');
    execFileSync(process.execPath, [resolve(root, 'node_modules/vitest/vitest.mjs'), 'list', '--filesOnly',
      '--json=' + output, '--config', resolve(root, `vitest.${phase}.config.ts`)], { cwd: root, env, stdio: 'pipe' });
    return JSON.parse(readFileSync(output, 'utf8')).map(entry => relative(root, entry.file));
  } finally {
    rmSync(scratch, { recursive: true });
  }
}

function sourceList(path, pattern) {
  const found = [...readFileSync(resolve(root, path), 'utf8').matchAll(pattern)].map(match => match[1]);
  assert.ok(found.length > 0, `${path} names its test files`);
  return found;
}

test('every tracked test file is selected by a gate step or excluded with a reason', () => {
  const counting = sourceList('apps/counter/scripts/test-browser.mjs', /const names=\[([^\]]*)\]/g)
    .flatMap(list => [...list.matchAll(/"([^"]+)"/g)].map(match => `apps/counter/browser/${match[1]}.test.ts`));
  const gate = sourceList('scripts/gate.sh', /node --test (\S+)/g);
  const selected = new Map();
  for (const [step, files] of [['gate.sh', gate], ['node', nodeFiles], ['counting', counting],
    ['plain', vitestFiles('plain')], ['native', vitestFiles('native')]]) {
    for (const file of files) selected.set(file, step);
  }

  for (const file of [...gate, ...nodeFiles, ...counting]) assert.ok(tracked.includes(file), `${file} is a tracked test file`);
  const excluded = new Map(excludedTests.map(entry => [entry.file, entry.reason]));
  assert.equal(excluded.size, excludedTests.length, 'each exclusion names a file once');
  for (const [file, reason] of excluded) {
    assert.ok(tracked.includes(file), `the excluded ${file} is a tracked test file`);
    assert.ok(typeof reason === 'string' && reason.trim() !== '', `the exclusion of ${file} gives a reason`);
    assert.equal(selected.get(file), undefined, `the excluded ${file} is not also selected`);
  }
  assert.deepEqual(tracked.filter(file => !selected.has(file) && !excluded.has(file)), [],
    'add each listed file to a gate step, or to excludedTests in scripts/test.mjs with a reason');
});
