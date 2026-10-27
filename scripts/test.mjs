import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir, constants } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stageNames = ['kernel', 'node', 'counting', 'plain', 'native'];
const nodeFiles = [
  'scripts/usage-report.test.mjs',
  'scripts/security-settings.test.mjs',
  'scripts/security-entry-points.test.mjs',
  'scripts/active-source.test.mjs',
  'scripts/check-kernel-boundary.test.mjs',
  'scripts/cloudflare-pool-compat.test.mjs',
  'scripts/check-shared-helpers.test.mjs',
  'scripts/check-notes.test.mjs',
  'apps/counter/scripts/node-witness.test.mjs',
  'scripts/deploy-check.test.mjs',
  'homepage/test/home.test.mjs',
  'packages/cli/test/config-dir.test.mjs',
  'apps/jam/test/managed-assets.test.mjs',
  'scripts/test.test.mjs',
  'scripts/test-summary.test.mjs',
  'scripts/test-progress.test.mjs',
  'scripts/test-phases.test.mjs',
];

// Fixed production argv. The exported runner below accepts tiny commands only
// so its owning test can observe real process ordering without starting Workers.
export function fixedStages(directory, environment = process.env) {
  const reporter = pathToFileURL(resolve(root, 'scripts/test-summary.mjs')).href;
  const phases = ['plain', 'native'];
  const progress = Object.fromEntries(phases.map(phase => [phase,
    environment.ARTROOM_TEST_PROGRESS ? resolve(environment.ARTROOM_TEST_PROGRESS + '.' + phase + '.jsonl') : null]));
  for (const phase of phases) {
    console.log(`${phase} timing: ${resolve(directory, phase + '.jsonl')}`);
    if (progress[phase]) console.log(`${phase} progress: ${progress[phase]}`);
  }
  return [
    { name: 'kernel', command: process.execPath, args: [resolve(root, 'scripts/check-kernel-boundary.mjs')] },
    { name: 'node', command: process.execPath, args: ['--test', '--test-reporter=spec', '--test-reporter=' + reporter,
      '--test-reporter-destination=stdout', '--test-reporter-destination=' + resolve(directory, 'node.jsonl'),
      ...nodeFiles.map(file => resolve(root, file))], env: { ARTROOM_TEST_PHASE: 'node' } },
    { name: 'counting', command: process.execPath, args: [resolve(root, 'apps/counter/scripts/test-browser.mjs')],
      env: { ARTROOM_TEST_PHASE: 'counting' } },
    ...phases.map(phase => ({ name: phase, command: process.execPath,
      args: [resolve(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', resolve(root, 'vitest.' + phase + '.config.ts')],
      env: { ARTROOM_TEST_PHASE: phase, ARTROOM_TEST_TIMING: resolve(directory, phase + '.jsonl'),
        ...(progress[phase] ? { ARTROOM_TEST_PROGRESS: progress[phase] } : {}) } })),
  ];
}

function exitFor(outcome) {
  if (outcome.spawnError) return 1;
  if (outcome.signal) return 128 + (constants.signals[outcome.signal] ?? 1);
  return outcome.exitCode ?? 1;
}

function launch(stage, options, observeChild = () => {}) {
  return new Promise(resolveOutcome => {
    let spawnError = null, child;
    try { child = spawn(stage.command, stage.args, options); observeChild(child); }
    catch (error) { resolveOutcome({ exitCode: null, signal: null, spawnError: error.code ?? error.name }); return; }
    child.once('error', error => { spawnError = error.code ?? error.name; });
    child.once('close', (exitCode, signal) => resolveOutcome({ exitCode, signal, spawnError }));
  });
}

export async function runStages({ stages, directory, cwd = root, environment = process.env, finalize = null }) {
  if (stages.length !== stageNames.length || stages.some((stage, index) => stage.name !== stageNames[index])) {
    throw new Error('The test stages must be kernel, node, counting, plain and native, in order.');
  }
  const ledger = { version: 1, stages: stageNames.map(name => ({ name, status: 'unreached', exitCode: null,
    signal: null, wallMs: null, userMs: null, systemMs: null })), reportErrors: [] };
  let firstFailure = null, activeChild = null;
  const interrupt = signal => {
    if (ledger.interruption) return;
    ledger.interruption = { signal };
    if (firstFailure === null) firstFailure = { exitCode: null, signal, spawnError: null, stage: ledger.stages.find(row => row.status === 'running')?.name ?? 'orchestrator' };
    if (activeChild) activeChild.kill(signal);
  };
  const onInterrupt = () => interrupt('SIGINT'), onTerminate = () => interrupt('SIGTERM');
  process.on('SIGINT', onInterrupt); process.on('SIGTERM', onTerminate);
  const reportError = error => { ledger.reportErrors.push(error instanceof Error ? error.message : String(error)); };
  const persist = () => writeFile(resolve(directory, 'stages.json'), JSON.stringify(ledger, null, 2) + '\n', { mode: 0o600 });
  try {
    await persist();
    for (const [index, stage] of stages.entries()) {
      if (firstFailure !== null) break;
      const record = ledger.stages[index];
      record.status = 'running';
      await persist();
      if (ledger.interruption) { record.status = 'unreached'; break; }
      const started = performance.now();
      const env = { ...environment, ARTROOM_TEST_EVIDENCE_DIR: directory };
      // These are observation channels, not test or Worker settings. Each
      // child receives only its own current stage's destinations.
      for (const name of ['ARTROOM_TEST_PHASE', 'ARTROOM_TEST_TIMING', 'ARTROOM_TEST_PROGRESS']) delete env[name];
      Object.assign(env, stage.env);
      const outcome = await launch(stage, { cwd, env, stdio: 'inherit' }, child => { activeChild = child; });
      activeChild = null;
      record.wallMs = performance.now() - started;
      record.exitCode = outcome.exitCode;
      record.signal = outcome.signal;
      if (outcome.spawnError) record.spawnError = outcome.spawnError;
      record.status = outcome.spawnError ? 'spawn-error' : outcome.signal ? 'signalled' : outcome.exitCode === 0 ? 'passed' : 'failed';
      if (record.status !== 'passed' && firstFailure === null) firstFailure = { ...outcome, stage: stage.name };
      await persist();
    }
  } catch (error) {
    reportError(error);
  } finally {
    if (finalize) {
      try { await finalize(); }
      catch (error) { reportError(error); }
    }
    try { await persist(); }
    catch (error) { reportError(error); }
    process.removeListener('SIGINT', onInterrupt); process.removeListener('SIGTERM', onTerminate);
  }
  return { ledger, firstFailure, exitCode: firstFailure ? exitFor(firstFailure) : ledger.reportErrors.length ? 1 : 0 };
}

async function summary(directory) {
  const result = await launch({ command: process.execPath, args: [resolve(root, 'scripts/test-summary.mjs'), directory] },
    { cwd: root, env: process.env, stdio: 'inherit' });
  if (result.spawnError || result.signal || result.exitCode !== 0) {
    throw new Error(`Test summary failed: exit ${result.exitCode ?? 'none'}, signal ${result.signal ?? 'none'}, spawn ${result.spawnError ?? 'none'}`);
  }
}

async function main(args) {
  let directory = null, deferSummary = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--defer-summary' && !deferSummary) deferSummary = true;
    else if (args[index] === '--evidence' && directory === null && args[index + 1] && !args[index + 1].startsWith('--')) directory = resolve(args[++index]);
    else throw new Error('Usage: test.mjs [--evidence NEW_DIRECTORY] [--defer-summary]');
  }
  if (directory) await mkdir(directory, { mode: 0o700 });
  else directory = await mkdtemp(resolve(tmpdir(), 'artroom-test-'));
  console.log(`Test evidence: ${directory}`);
  const result = await runStages({ directory, stages: fixedStages(directory), finalize: deferSummary ? null : () => summary(directory) });
  for (const error of result.ledger.reportErrors) console.error('Test reporting error: ' + error);
  process.exitCode = result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
