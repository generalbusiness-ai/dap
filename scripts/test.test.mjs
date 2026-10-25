import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { runStages } from './test.mjs';

const names = ['kernel', 'node', 'counting', 'plain', 'native'];
async function fixture(t) {
  const directory = await mkdtemp(resolve(tmpdir(), 'artroom-test-owner-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const calls = resolve(directory, 'calls');
  const stages = names.map(name => ({ name, command: process.execPath, args: ['-e',
    'require("node:fs").appendFileSync(process.argv[1],process.argv[2]+"\\n")', calls, name] }));
  return { directory, calls, stages };
}
const exists = path => access(path).then(() => true, () => false);
function subprocess(command, args, options) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code, signal) => resolveResult({ code, signal, stdout, stderr }));
  });
}

test('the fixed owner starts each stage once, in order, and finalizes once', async t => {
  const f = await fixture(t); let summaries = 0;
  const result = await runStages({ ...f, finalize: async () => { summaries++; } });
  assert.equal(result.exitCode, 0);
  assert.equal(await readFile(f.calls, 'utf8'), names.join('\n') + '\n');
  assert.equal(summaries, 1);
});

test('a failed plain stage cannot start native', async t => {
  const f = await fixture(t), sentinel = resolve(f.directory, 'native-started');
  f.stages[3].args = ['-e', 'process.exit(17)'];
  f.stages[4].args = ['-e', 'require("node:fs").writeFileSync(process.argv[1],"started")', sentinel];
  const result = await runStages({ ...f });
  assert.equal(result.exitCode, 17);
  assert.equal(await exists(sentinel), false);
  assert.equal(result.ledger.stages[4].status, 'unreached');
});

test('spawn failure and child signal both stop later stages with their real outcomes', async t => {
  for (const kind of ['spawn', 'signal']) {
    const f = await fixture(t), sentinel = resolve(f.directory, 'native-started');
    if (kind === 'spawn') { f.stages[3].command = resolve(f.directory, 'missing-command'); f.stages[3].args = []; }
    else f.stages[3].args = ['-e', 'process.kill(process.pid,"SIGTERM")'];
    f.stages[4].args = ['-e', 'require("node:fs").writeFileSync(process.argv[1],"started")', sentinel];
    const result = await runStages({ ...f });
    assert.equal(await exists(sentinel), false);
    if (kind === 'spawn') {
      assert.equal(result.firstFailure.spawnError, 'ENOENT');
      const stored = JSON.parse(await readFile(resolve(f.directory, 'stages.json'), 'utf8'));
      assert.equal(stored.stages[3].spawnError, 'ENOENT');
      assert.equal(result.exitCode, 1);
    }
    else { assert.equal(result.firstFailure.signal, 'SIGTERM'); assert.equal(result.firstFailure.exitCode, null); assert.equal(result.exitCode, 143); }
  }
});

test('a summary failure fails a healthy run but cannot replace the first child failure', async t => {
  for (const childCode of [0, 19]) {
    const f = await fixture(t); let summaries = 0;
    if (childCode) f.stages[3].args = ['-e', `process.exit(${childCode})`];
    const result = await runStages({ ...f, finalize: async () => { summaries++; throw new Error('scripted summary write refusal'); } });
    assert.equal(summaries, 1);
    assert.equal(result.exitCode, childCode || 1);
    assert.match(result.ledger.reportErrors.join('\n'), /scripted summary write refusal/);
    if (childCode) assert.equal(result.firstFailure.exitCode, childCode);
  }
});

test('a parent signal is retained when its child handles the forwarded signal and exits zero', async t => {
  const directory = await mkdtemp(resolve(tmpdir(), 'artroom-test-parent-signal-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const owner = new URL('./test.mjs', import.meta.url).href;
  // This tiny subprocess imports the actual owner. Its child signals only
  // after installing its handler, so no sleep or guessed startup delay is used.
  const source = `import {runStages} from ${JSON.stringify(owner)};
    import {writeFile} from 'node:fs/promises';
    const names=${JSON.stringify(names)},directory=process.argv[1];
    const stages=names.map(name=>({name,command:process.execPath,args:['-e','']}));
    stages[0].args=['-e','const {MessageChannel}=require("node:worker_threads");const channel=new MessageChannel();channel.port1.on("message",()=>{});process.on("SIGTERM",()=>process.exit(0));process.kill(process.ppid,"SIGTERM")'];
    let summaries=0;const result=await runStages({stages,directory,finalize:async()=>{summaries++}});
    await writeFile(directory+'/outcome.json',JSON.stringify({...result,summaries}));process.exitCode=result.exitCode;`;
  const child = await subprocess(process.execPath, ['--input-type=module', '-e', source, directory]);
  assert.equal(child.code, 143);
  const result = JSON.parse(await readFile(resolve(directory, 'outcome.json'), 'utf8'));
  assert.equal(result.ledger.interruption.signal, 'SIGTERM');
  assert.equal(result.ledger.stages[0].exitCode, 0);
  assert.equal(result.ledger.stages[0].signal, null);
  assert.equal(result.ledger.stages[1].status, 'unreached');
  assert.equal(result.summaries, 1);
});

test('an early gate refusal prints one real empty summary and preserves the original exit', async t => {
  const directory = await mkdtemp(resolve(tmpdir(), 'artroom-gate-finalizer-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(resolve(directory, 'scripts')); await mkdir(resolve(directory, 'node_modules')); await mkdir(resolve(directory, 'bin'));
  await copyFile(new URL('./gate.sh', import.meta.url), resolve(directory, 'scripts/gate.sh'));
  await copyFile(new URL('./test-summary.mjs', import.meta.url), resolve(directory, 'scripts/test-summary.mjs'));
  const lock = '{}\n';
  await writeFile(resolve(directory, 'package-lock.json'), lock);
  await writeFile(resolve(directory, 'node_modules/.artroom-lock-sha256'), createHash('sha256').update(lock).digest('hex') + '\n');
  // Git is a declared boundary stand-in: only its whitespace check refuses.
  // The actual Bash gate and actual summary module run; no install, test
  // suite, provider or Worker is available in this scratch project.
  await writeFile(resolve(directory, 'bin/git'), '#!/bin/sh\ncase "$1" in\nrev-parse|merge-base) echo 0123456789abcdef ;;\nstatus) exit 0 ;;\ndiff) exit 23 ;;\n*) exit 97 ;;\nesac\n', { mode: 0o700 });
  const result = await subprocess('/bin/bash', [resolve(directory, 'scripts/gate.sh')],
    { env: { ...process.env, PATH: resolve(directory, 'bin') + ':' + dirname(process.execPath) + ':' + process.env.PATH } });
  assert.equal(result.code, 23);
  assert.equal(result.stdout.split('Test observations').length - 1, 1);
  assert.match(result.stdout, /No observed cases\./);
  for (const name of names) assert.match(result.stdout, new RegExp(name + ': unreached;'));
  assert.doesNotMatch(result.stdout, /gate passed/);
});
