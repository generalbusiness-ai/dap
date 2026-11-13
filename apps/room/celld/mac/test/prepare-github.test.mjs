import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { prepareProject } from '../prepare-project.mjs';
import { prepareGitHubProject, GitHubProjectPreparationError } from '../prepare-github.mjs';

const origin = 'https://room.example', register = 'sc_' + 'a'.repeat(52);
const command = fileURLToPath(new URL('../prepare-github.mjs', import.meta.url));

async function fixture(t) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'dap-prepare-github-test-')));
  t.after(() => rm(directory, { recursive: true }));
  const home = join(directory, 'home'), project = join(directory, 'project');
  await mkdir(home, { mode: 0o700 });
  await writeFile(join(home, 'config.json'), JSON.stringify({ v: 2, service: origin, key: 'operator', plan: { service: origin, register,
    definition: 'platform:register@25', founding: { intent: { fields: { host: 'none', namespace: '' } } } } }), { mode: 0o600 });
  await prepareProject({ origin, home, out: project });
  const configFile = join(directory, 'github.json'), privateKeyFile = join(directory, 'github-key.pem'), readTokenFile = join(directory, 'read-token'), bindingsFile = join(directory, 'bindings.json');
  // Real key syntax for the production validator, with no GitHub installation
  // behind it. This fixture makes no provider or deployment request.
  const key = generateKeyPairSync('rsa', { modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }).privateKey;
  const token = 'TEST.private.read.token';
  const config = { issuer: 'TEST-issuer', installationId: 23, account: { id: 17, login: 'test-account', type: 'Organization' },
    maxBytes: 10485760, registerScope: register, privateRepositories: true, publicReads: false, credentialIdentity: 'adapter-attempt' };
  await writeFile(configFile, JSON.stringify(config), { mode: 0o644 });
  await writeFile(privateKeyFile, key, { mode: 0o600 });
  await writeFile(readTokenFile, token + '\n', { mode: 0o600 });
  const bindings = [{ destination: { scope: 'sc_' + 'a'.repeat(52), genesis: 'sha256:' + 'a'.repeat(64) },
    repository: { host: 'github.com', namespace: 'test-account', name: 'TEST-repo', id: '71' }, branch: 'main' }];
  await writeFile(bindingsFile, JSON.stringify(bindings), { mode: 0o644 });
  return { directory, project, configFile, privateKeyFile, readTokenFile, bindingsFile, bindings, out: join(directory, 'configured'), config, key, token };
}

// The input is the maintained preparation helper's actual private output over
// a scripted retained plan. Filesystem, CLI, and GitHub readiness are real;
// the room, App installation, provider and deployment are not exercised.
test('GitHub preparation stages a private copy, keeps session custody and never replaces either project', async t => {
  const f = await fixture(t);
  const before = await readFile(join(f.project, 'wrangler.json')), worker = await readFile(join(f.project, 'worker.ts'));
  const result = spawnSync(process.execPath, [command, '--project', f.project, '--config', f.configFile,
    '--private-key', f.privateKeyFile, '--read-token', f.readTokenFile, '--bindings-file', f.bindingsFile, '--out', f.out], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { version: 1, origin, register, host: 'github.com' });
  assert.equal(result.stdout.includes(f.key) || result.stdout.includes(f.token), false);
  assert.equal((await lstat(f.out)).mode & 0o777, 0o700);
  assert.deepEqual((await readdir(f.out)).sort(), ['worker.ts', 'wrangler.json']);
  for (const name of ['worker.ts', 'wrangler.json']) assert.equal((await lstat(join(f.out, name))).mode & 0o777, 0o600);
  const bytes = await readFile(join(f.out, 'wrangler.json')), configured = JSON.parse(bytes), original = JSON.parse(before);
  const { GITHUB_APP_CONFIG: config, GITHUB_APP_PRIVATE_KEY: key, GITHUB_READ_TOKEN: token, GITHUB_REPOSITORY_BINDINGS: bindings, ...vars } = configured.vars;
  assert.deepEqual(vars, original.vars);
  assert.deepEqual(JSON.parse(vars.PLATFORM_CREATION_PINS), JSON.parse(await readFile(new URL('../repository-binding-policy.json', import.meta.url))).PLATFORM_CREATION_PINS);
  assert.equal(config === JSON.stringify(f.config), true);
  assert.equal(key === f.key && token === f.token, true);
  assert.deepEqual(JSON.parse(bindings), f.bindings);
  assert.equal(JSON.stringify({ ...configured, vars }) === JSON.stringify(original), true);
  assert.equal((await readFile(join(f.out, 'worker.ts'))).equals(worker), true);
  const checked = spawnSync('/usr/bin/python3', ['-B', '-c',
    'import deploy,sys; deploy.prepared_project(deploy.Path(sys.argv[1]))', f.out],
  { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(checked.stdout.includes(f.key) || checked.stderr.includes(f.token), false);
  assert.equal((await readFile(join(f.project, 'wrangler.json'))).equals(before), true);
  await assert.rejects(prepareGitHubProject(f), error => error instanceof GitHubProjectPreparationError && error.stage === 'output');
  assert.equal((await readFile(join(f.out, 'wrangler.json'))).equals(bytes), true);
  assert.equal((await readFile(join(f.project, 'wrangler.json'))).equals(before), true);
});

test('App-only private preparation needs no static read token and retains exact binding authority', async t => {
  const f = await fixture(t), before = await readFile(join(f.project, 'wrangler.json'));
  await writeFile(f.configFile, JSON.stringify({ ...f.config, installationReads: true }));
  await prepareGitHubProject({ ...f, readTokenFile: undefined });
  const configured = JSON.parse(await readFile(join(f.out, 'wrangler.json')));
  assert.equal(Object.hasOwn(configured.vars, 'GITHUB_READ_TOKEN'), false);
  assert.equal(JSON.parse(configured.vars.GITHUB_APP_CONFIG).installationReads, true);
  assert.deepEqual(JSON.parse(configured.vars.GITHUB_REPOSITORY_BINDINGS), f.bindings);
  assert.equal(configured.vars.GITHUB_APP_PRIVATE_KEY, f.key);
  const checked = spawnSync('/usr/bin/python3', ['-B', '-c',
    'import deploy,sys; deploy.prepared_project(deploy.Path(sys.argv[1]))', f.out],
  { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal((await readFile(join(f.project, 'wrangler.json'))).equals(before), true);
  await assert.rejects(prepareGitHubProject({ ...f, out: join(f.directory, 'ambiguous') }),
    error => error instanceof GitHubProjectPreparationError && error.stage === 'github-readiness');
  await assert.rejects(lstat(join(f.directory, 'ambiguous')), { code: 'ENOENT' });
});

test('repository authorization for another account cannot reach a prepared project', async t => {
  const f = await fixture(t), before = await readFile(join(f.project, 'wrangler.json'));
  f.bindings[0].repository.namespace = 'another-account';
  await writeFile(f.bindingsFile, JSON.stringify(f.bindings));
  await assert.rejects(prepareGitHubProject(f), error => error instanceof GitHubProjectPreparationError && error.stage === 'github-readiness');
  await assert.rejects(lstat(f.out), { code: 'ENOENT' });
  assert.equal((await readFile(join(f.project, 'wrangler.json'))).equals(before), true);
});

test('a foreign register cannot stage GitHub authority or change the original project', async t => {
  const f = await fixture(t), before = await readFile(join(f.project, 'wrangler.json'));
  await writeFile(f.configFile, JSON.stringify({ ...f.config, registerScope: 'sc_' + 'b'.repeat(51) + 'a' }));
  await assert.rejects(prepareGitHubProject(f), error => error instanceof GitHubProjectPreparationError && error.stage === 'github-config');
  await assert.rejects(lstat(f.out), { code: 'ENOENT' });
  assert.equal((await readFile(join(f.project, 'wrangler.json'))).equals(before), true);
});

test('a nonprivate App key refuses before output and exposes no credential in its error', async t => {
  const f = await fixture(t), before = await readFile(join(f.project, 'wrangler.json'));
  await chmod(f.privateKeyFile, 0o644);
  const error = await prepareGitHubProject(f).then(() => null, value => value);
  assert.equal(error instanceof GitHubProjectPreparationError && error.stage === 'private-key', true);
  assert.equal(error.message.includes(f.key) || error.message.includes(f.token), false);
  await assert.rejects(lstat(f.out), { code: 'ENOENT' });
  assert.equal((await readFile(join(f.project, 'wrangler.json'))).equals(before), true);
});

// Real staging and the actual Python deployment validator; no App, provider,
// installed root or deployment exists behind these public test Scope IDs.
test('installed roots survive GitHub staging unchanged and reach the strict deployment validator', async t => {
  const f = await fixture(t), path = join(f.project, 'wrangler.json');
  const original = JSON.parse(await readFile(path));
  const roots = ' [\n  ' + JSON.stringify(['sc_' + 'b'.repeat(51) + 'a', register, 'sc_' + 'c'.repeat(51) + 'a']).slice(1, -1) + '\n] ';
  original.vars.INSTALLED_REGISTER_SCOPES = roots;
  await writeFile(path, JSON.stringify(original));
  const before = await readFile(path);
  await prepareGitHubProject(f);
  const staged = JSON.parse(await readFile(join(f.out, 'wrangler.json')));
  assert.equal(staged.vars.INSTALLED_REGISTER_SCOPES, roots, 'staging preserves the reviewed setting bytes');
  const checked = spawnSync('/usr/bin/python3', ['-B', '-c',
    'import deploy,sys; deploy.prepared_project(deploy.Path(sys.argv[1]))', f.out],
  { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8' });
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal((await readFile(path)).equals(before), true);
  assert.equal(staged.vars.SESSION_SECRET, original.vars.SESSION_SECRET);
  assert.deepEqual(JSON.parse(staged.vars.GITHUB_REPOSITORY_BINDINGS), f.bindings);
});

test('untrusted installed roots refuse before private key access and at the deployment boundary', async t => {
  const f = await fixture(t), path = join(f.project, 'wrangler.json');
  const original = JSON.parse(await readFile(path));
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  const tooMany = Array.from({ length: 33 }, (_, i) => 'sc_' + alphabet[Math.floor(i / 32)] + alphabet[i % 32] + 'a'.repeat(50));
  for (const [reason, roots] of [
    ['missing current root', JSON.stringify(['sc_' + 'b'.repeat(51) + 'a'])],
    ['duplicate root', JSON.stringify([register, register])],
    ['noncanonical Scope ID', JSON.stringify([register, 'sc_' + 'a'.repeat(51) + 'b'])],
    ['non-list', JSON.stringify({ register })],
    ['too many roots', JSON.stringify(tooMany)],
    ['oversize setting', JSON.stringify([register]) + ' '.repeat(4096)],
  ]) {
    await writeFile(path, JSON.stringify({ ...original, vars: { ...original.vars, INSTALLED_REGISTER_SCOPES: roots } }));
    const before = await readFile(path);
    await assert.rejects(prepareGitHubProject({ ...f, privateKeyFile: join(f.directory, 'unread-private-key') }),
      error => error instanceof GitHubProjectPreparationError && error.stage === 'project', reason);
    await assert.rejects(lstat(f.out), { code: 'ENOENT' });
    const checked = spawnSync('/usr/bin/python3', ['-B', '-c',
      'import deploy,sys; deploy.prepared_project(deploy.Path(sys.argv[1]))', f.project],
    { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8' });
    assert.equal(checked.status, 1, 'deployment refuses ' + reason);
    assert.match(checked.stderr, /Refusal:/, 'deployment names its own refusal');
    assert.equal((await readFile(path)).equals(before), true);
  }
});
