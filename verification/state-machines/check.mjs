// Run from the checkout root. Tools and TLC working files stay outside it.
import { readFileSync, mkdtempSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '../..');
const coverage = JSON.parse(readFileSync(join(import.meta.dirname, 'coverage.json')));
const name = process.argv[2];
if (!coverage[name]) throw new Error('Choose Transport, Observation, Editor, Effects or Voice');
const commands = {
  Transport: ['node', '--import', 'tsx', 'verification/state-machines/source-probes.mjs', 'Transport'],
  Editor: ['node', '--import', 'tsx', 'verification/state-machines/source-probes.mjs', 'Editor'],
  Observation: ['node', 'node_modules/vitest/vitest.mjs', 'run', '--project', 'client', 'test/observe.test.ts', '-t', 'an old observer cannot clear'],
  Effects: ['node', 'node_modules/vitest/vitest.mjs', 'run', '--project', 'scope', 'test/operations.test.ts', '-t', 'T19:'],
  Voice: ['node', '--import', 'tsx', '--test', '--test-name-pattern=Durable audio start', 'apps/counter/browser/voice-controller.test.ts'],
};
function run(argv) {
  const result = spawnSync(argv[0], argv.slice(1), {cwd:root, encoding:'utf8', timeout:120000, maxBuffer:16*1024*1024});
  process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
  if (result.error || result.signal) throw new Error(`Check did not complete: ${result.error ?? result.signal}`);
  return result.status;
}
function source() {
  if (name === 'Observation' || name === 'Effects') {
    const prepared = run(['node','scripts/cloudflare-pool-compat.mjs']);
    if (prepared !== 0) return prepared;
  }
  return run(commands[name]);
}
if (process.argv.includes('--source')) process.exit(source());
for (const [file, hash] of Object.entries(coverage[name].sha256)) {
  const actual = createHash('sha256').update(readFileSync(join(root,file))).digest('hex');
  if (actual !== hash) throw new Error(`Source drift: review ${file}, update the model and controls before advancing coverage.json`);
}
const jar = process.env.TLA2TOOLS;
if (!jar) throw new Error('Set TLA2TOOLS to the TLC 1.7.4 jar and JAVA to Java 11 or later');
const digest = createHash('sha256').update(readFileSync(jar)).digest('hex');
if (digest !== '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88') throw new Error('Expected the pinned TLC 1.7.4 jar');
const scratch = mkdtempSync(join(tmpdir(),'artroom-formal-'));
cpSync(join(import.meta.dirname,name),scratch,{recursive:true});
const result = spawnSync(process.env.JAVA ?? 'java', ['-XX:+UseParallelGC','-cp',resolve(jar),'tlc2.TLC','-workers','1','-config',`${name}.cfg`,`${name}.tla`], {cwd:scratch,encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});
process.stdout.write(result.stdout ?? '');process.stderr.write(result.stderr ?? '');
console.log(`TLC scratch: ${scratch}`);
if (result.error || result.status !== 0) process.exit(1);
process.exit(source());
