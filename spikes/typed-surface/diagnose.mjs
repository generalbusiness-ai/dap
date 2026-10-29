/** Measure first observed diagnostics for five independent mistakes. No editor claims. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { tsImport } from 'tsx/esm/api';
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '../..');
const sha = s => createHash('sha256').update(s).digest('hex');
const load = (file, config) => tsImport(pathToFileURL(file).href, { parentURL: import.meta.url, tsconfig: config });
const args = process.argv.slice(2);
let interruptedSignal = null, ownedChild = null, outputDirectory = null;
const childClosures = [];
if (args[0] !== '--runtime') {
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { interruptedSignal ??= signal; ownedChild?.kill(); });
  process.on('exit', () => {
    if (interruptedSignal && outputDirectory) writeFileSync(resolve(outputDirectory, 'interruption.json'), JSON.stringify({ signal: interruptedSignal, childClosures, active: ownedChild ? { pid: ownedChild.pid, processGroup: ownedChild.pid } : null }, null, 2) + '\n', { flag: 'wx' });
  });
}

async function runtimeStage(side, id, file, config) {
  const started = performance.now(), stages = [];
  const finish = (detected, stage, detail, blocked = false) => {
    console.log(JSON.stringify({ detected, stage, detail, blocked, stages, childElapsedMs: performance.now() - started }));
  };
  let fixture, lib;
  try { fixture = await load(file, config); lib = await load(resolve(root, `spikes/typed-surface${side === 'before' ? '-before' : ''}/lib.ts`), config); }
  catch (error) { finish(false, 'harness-load', { name: error.name, message: error.message }, true); return; }
  const packageModule = await load(resolve(root, `spikes/typed-surface${side === 'before' ? '-before' : ''}/package.ts`), config);
  try {
    packageModule.manifest({ name: 'TEST-diagnostic', version: 'TEST', definition: { path: 'definition.json', value: fixture.definition }, projections: {}, views: {}, roles: fixture.held, scenarios: [], browser: { entry: 'test.ts', html: 'test.html', script: 'test.js' } });
    stages.push({ stage: 'application-builder', refused: false });
  } catch (error) {
    const expected = id === 'unheld-grant' && error.name === 'Error' && error.message === 'no role holds example.write, which probe needs';
    finish(expected, 'application-builder', { name: error.name, message: error.message, expectedCause: expected }, !expected); return;
  }
  let compiled;
  try { compiled = lib.compile(fixture.definition); }
  catch (error) {
    // These seeds should fail in TS, except the old manifest path and old reason survival.
    // Do not turn a new compiler exception or unrelated validation failure into a detected seed.
    finish(false, 'compile', { name: error.name, message: error.message, diagnostics: error.diagnostics ?? null, qualification: 'Unexpected runtime refusal after the isolated source typechecked' }, true); return;
  }
  stages.push({ stage: 'compile', refused: false, findings: compiled.findings });
  if (compiled.findings?.length) { finish(false, 'compile-findings', compiled.findings, true); return; }
  const derive = await tsImport('@generalbusiness/dap-derive', { parentURL: pathToFileURL(file).href, tsconfig: config });
  const contract = await tsImport('@generalbusiness/dap-contract', { parentURL: pathToFileURL(file).href, tsconfig: config });
  const rule = await tsImport('@generalbusiness/dap-derive/rule', { parentURL: pathToFileURL(file).href, tsconfig: config });
  const validation = derive.validateDefinition(compiled.definition, contract.PROPOSED_BOUNDS, rule.RULE_PROFILES);
  if (!validation.ok) { finish(false, 'validator', validation.problems, true); return; }
  stages.push({ stage: 'validator', refused: false });
  const fixtures = await tsImport('@generalbusiness/dap-derive/testing', { parentURL: pathToFileURL(file).href, tsconfig: config });
  const ledger = fixtures.created(fixtures.valid(validation), {}, `TEST-${side}-${id}`);
  const judgment = ledger.act(fixtures.keys.rita, 'probe', { on: 0, expected: { on: ledger.item(0).revision }, fields: { label: 'TEST' } }, { grants: [{ grant: fixtures.grantOf(fixtures.keys.rita, ledger.at, Object.values(fixture.held).flat()), current: true }] });
  const answer = { result: judgment.result, reason: judgment.reason ?? null };
  stages.push({ stage: 'judge', ...answer });
  if (id === 'unheld-grant' && judgment.result === 'refused' && judgment.reason === 'unauthorized') finish(true, 'judge', answer);
  else if (judgment.result !== 'write') finish(false, 'judge', answer, true);
  else finish(false, null, { judgment: answer, qualification: id === 'baseline' ? 'Calibration reached an accepted real judgment' : id === 'undeclared-reason' && side === 'before' ? 'Historical API has no reason declaration; the literal survives construction, validation and this judgment' : 'No stage detected the seeded mistake' });
}

if (args[0] === '--runtime') {
  if (args.length !== 5 || !['before', 'after'].includes(args[1])) throw new Error('Invalid internal runtime args');
  try { await runtimeStage(...args.slice(1, 5)); }
  catch (error) { console.log(JSON.stringify({ detected: false, blocked: true, stage: 'harness', detail: { name: error.name, message: error.message } })); }
} else {
  if (args.length !== 2 || args[0] !== '--out') throw new Error('Usage: node spikes/typed-surface/diagnose.mjs --out <new scratch directory>');
  const out = resolve(args[1]);
  if (!out.startsWith('/private/tmp/') || existsSync(out)) throw new Error('Output must be a new directory under /private/tmp');
  mkdirSync(out); outputDirectory = out;
  writeFileSync(resolve(out, 'package.json'), '{"type":"module","private":true}\n', { flag: 'wx' });
  const { fixtureSource, diagnosticCases } = await load(resolve(here, 'diagnostic-fixtures.ts'), resolve(here, 'tsconfig.json'));
  const bounded = async (argv, prefix, match) => {
    if (interruptedSignal) throw new Error(`Interrupted before launch: ${interruptedSignal}`);
    const started = performance.now(), child = spawn(argv[0], argv.slice(1), { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    const buffers = { stdout: [], stderr: [] }, lengths = { stdout: 0, stderr: 0 };
    let firstDiagnosticMs = null, firstDiagnosticAt = null, timedOut = false, overflow = false, launchError = null;
    const killOwned = () => { if (child.pid) try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } };
    const launch = { pid: child.pid ?? null, processGroup: child.pid ?? null, observedAt: new Date().toISOString() };
    ownedChild = { pid: child.pid ?? null, kill: killOwned };
    writeFileSync(resolve(out, `${prefix}.launch.json`), JSON.stringify({ argv, cwd: root, ...launch }, null, 2) + '\n', { flag: 'wx' });
    const timer = setTimeout(() => { timedOut = true; killOwned(); }, 60_000);
    for (const stream of ['stdout', 'stderr']) child[stream].on('data', bytes => {
      lengths[stream] += bytes.length;
      if (lengths[stream] > 8 * 1024 * 1024) { overflow = true; killOwned(); return; }
      buffers[stream].push(bytes);
      if (firstDiagnosticMs === null && match(Buffer.concat(buffers[stream]).toString('utf8'))) { firstDiagnosticAt = performance.now(); firstDiagnosticMs = firstDiagnosticAt - started; }
    });
    child.on('error', e => { launchError = e.message; });
    const [exit, signal] = await new Promise(res => child.on('close', (code, signal) => res([code, signal])));
    clearTimeout(timer);
    const closure = { pid: launch.pid, processGroup: launch.processGroup, exit, signal, event: 'close', observedAt: new Date().toISOString() };
    childClosures.push(closure);
    const streams = {};
    for (const stream of ['stdout', 'stderr']) { const data = Buffer.concat(buffers[stream]); const path = `${prefix}.${stream}.log`; writeFileSync(resolve(out, path), data, { flag: 'wx' }); streams[stream] = { path, bytes: data.length, sha256: sha(data) }; }
    const result = { argv, cwd: root, launch, closure, exit, signal, interruptedSignal, timedOut, overflow, launchError, elapsedMs: performance.now() - started, firstDiagnosticMs, firstDiagnosticAt, streams };
    writeFileSync(resolve(out, `${prefix}.process.json`), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    ownedChild = null;
    if (timedOut || overflow || launchError || signal || interruptedSignal) throw new Error(`Inconclusive diagnostic process ${prefix}; retained in ${out}`);
    return { ...result, stdout: Buffer.concat(buffers.stdout).toString('utf8'), stderr: Buffer.concat(buffers.stderr).toString('utf8') };
  };
  const inputPaths = ['lib.ts', 'package.ts'].flatMap(name => [resolve(here, name), resolve(root, 'spikes/typed-surface-before', name)]);
  const inputHashes = inputPaths.map(path => ({ path: relative(root, path), sha256: sha(readFileSync(path)) }));
  const rows = [];
  for (const side of ['before', 'after']) {
    const sideDir = resolve(root, `spikes/typed-surface${side === 'before' ? '-before' : ''}`);
    for (const id of ['baseline', ...diagnosticCases.map(c => c.id)]) {
      const stem = `${side}-${id}`, file = resolve(out, `${stem}.ts`), config = resolve(out, `${stem}.json`);
      const text = fixtureSource(side, id, resolve(sideDir, 'lib.ts'));
      writeFileSync(file, text, { flag: 'wx' });
      writeFileSync(config, JSON.stringify({ extends: resolve(sideDir, 'tsconfig.json'), include: [file], compilerOptions: { noEmit: true, typeRoots: [resolve(root, 'node_modules/@types')] } }, null, 2) + '\n', { flag: 'wx' });
      const started = performance.now();
      const compile = await bounded([process.execPath, resolve(root, 'node_modules/typescript/bin/tsc'), '-p', config, '--pretty', 'false'], `${stem}-typescript`, text => /\berror TS\d+:/.test(text));
      const diagnostics = (compile.stdout + compile.stderr).split('\n').filter(s => /\berror TS\d+:/.test(s));
      const own = diagnostics.filter(s => s.includes(`${stem}.ts(`));
      if (compile.exit !== 0) {
        const expected = diagnosticCases.find(seed => seed.id === id)?.typescript;
        const output = compile.stdout + compile.stderr;
        const causeText = output.replace(/^.*error TS\d+:\s*/gm, ''); // Seed filenames are not diagnostic causes.
        const causeMatches = expected !== undefined && own.length === 1 && diagnostics.length === 1
          && Number(/error TS(\d+):/.exec(own[0])?.[1]) === expected.code
          && expected.tokens.every(token => causeText.includes(token));
        const blocked = !causeMatches;
        rows.push({ side, id, source: { path: relative(out, file), bytes: Buffer.byteLength(text), sha256: sha(text) }, detected: !blocked, stage: blocked ? null : 'typescript', blocked, expectedCause: expected ?? null, causeMatches, diagnostics, firstObservedDiagnosticMs: compile.firstDiagnosticAt === null ? null : compile.firstDiagnosticAt - started, elapsedMs: performance.now() - started, typescript: compile, runtime: { reached: false, reason: blocked ? 'Unexpected compiler cause or errors outside isolated seed' : 'TypeScript already refused the seed' }, editor: 'unavailable: no editor session measured' });
        if (id === 'baseline') throw new Error(`Baseline ${side} does not typecheck; no seeded conclusion is valid`);
        continue;
      }
      const runtime = await bounded([process.execPath, fileURLToPath(import.meta.url), '--runtime', side, id, file, config], `${stem}-runtime`, text => /"detected":true/.test(text));
      if (runtime.exit !== 0) throw new Error(`Runtime diagnostic stage failed unexpectedly: ${stem}; inspect retained streams`);
      const result = JSON.parse(runtime.stdout.trim());
      if (id === 'baseline' && (result.detected || result.blocked)) throw new Error(`Baseline ${side} did not reach an accepted real judgment`);
      rows.push({ side, id, source: { path: relative(out, file), bytes: Buffer.byteLength(text), sha256: sha(text) }, ...result, firstObservedDiagnosticMs: result.detected ? runtime.firstDiagnosticAt - started : null, elapsedMs: performance.now() - started, typescript: compile, runtime, editor: 'unavailable: no editor session measured' });
    }
  }
  if (interruptedSignal) throw new Error(`Interrupted: ${interruptedSignal}`);
  for (const file of inputHashes) if (sha(readFileSync(resolve(root, file.path))) !== file.sha256) throw new Error(`Diagnostic input changed: ${file.path}`);
  const result = { schema: 'artroom-dxtr-first-diagnostics@1', tools: { node: process.version, typescript: JSON.parse(readFileSync(resolve(root, 'node_modules/typescript/package.json'), 'utf8')).version }, sourceInputs: inputHashes, sourceInputsStable: true, outputDirectory: out, qualification: 'Each seed starts a fresh TypeScript CLI and then, only if it compiles, actual builders/compile/validator/judge. Time starts before that seed compiler launch and ends when the host first observes its diagnostic output; process startup and imports count. Cold processes may use OS caches. No editor behavior or interactive edit latency measured. Derive Ledger uses its labelled in-memory test authority; this is not Native authority. Historical APIs lack declared reasons and typed role coverage; old literal/manifest path remains explicit. A matching code plus seeded tokens identifies a TS cause; unexpected same-file errors and runtime import/compile failures are blocked, not detected. Child launch/close records retain PID/owned process group; SIGTERM/INT kills the current owned group before the runner retains its closure. This does not prove drain outside that group.', cases: diagnosticCases, rows };
  writeFileSync(resolve(out, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(result, null, 2));
  if (rows.some(r => r.blocked) || rows.filter(r => r.side === 'after' && r.id !== 'baseline').some(r => !r.detected)) process.exitCode = 1;
}
