import assert from 'node:assert/strict';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { prepareProject, ProjectPreparationError } from '../prepare-project.mjs';

const origin = 'https://room.example';
const register = `sc_${'a'.repeat(52)}`;
const retainedPlan = () => ({ v: 2, service: origin, key: 'operator', plan: { service: origin, register,
  definition: 'platform:register@21', founding: { intent: { fields: { host: 'none', namespace: '' } } } } });

async function fixture(t, config = retainedPlan()) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'dap-prepare-project-test-')));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const home = join(directory, 'custody'), out = join(directory, 'project');
  await mkdir(home, { mode: 0o700 });
  await chmod(home, 0o700);
  await writeFile(join(home, 'config.json'), JSON.stringify(config), { mode: 0o600 });
  return { home, out };
}

// SCRIPTED retained plan JSON. The helper uses the maintained CLI store and
// real filesystem; these tests make no HTTP, signed-plan, or deployment claim.
test('a foreign retained plan refuses without changing custody or creating a project', async t => {
  const config = retainedPlan(); config.plan.service = 'https://another.example';
  const paths = await fixture(t, config), before = await readFile(join(paths.home, 'config.json'));
  await assert.rejects(prepareProject({ origin, ...paths }), error => error instanceof ProjectPreparationError && error.message.startsWith('Project preparation refused: plan.'));
  await assert.rejects(lstat(paths.out), { code: 'ENOENT' });
  assert.equal((await readFile(join(paths.home, 'config.json'))).equals(before), true);
  assert.deepEqual(await readdir(paths.home), ['config.json']);
});

test('the base plan and retained old-family plans prepare without replacing custody', async t => {
  for (const version of [21, 25, 28]) {
    const config = retainedPlan(); config.plan.definition = `platform:register@${version}`;
    const paths = await fixture(t, config), before = await readFile(join(paths.home, 'config.json'));
    assert.deepEqual(await prepareProject({ origin, ...paths }), { version: 1, origin, register });
    assert.equal((await readFile(join(paths.home, 'config.json'))).equals(before), true);
    const prepared = JSON.parse(await readFile(join(paths.out, 'wrangler.json')));
    assert.equal(prepared.vars.REGISTER_SCOPE, register);
    assert.equal(Object.hasOwn(prepared.vars, 'PLATFORM_CREATION_PINS'), version === 25);
  }
  const unknown = retainedPlan(); unknown.plan.definition = 'platform:register@29';
  const paths = await fixture(t, unknown);
  await assert.rejects(prepareProject({ origin, ...paths }), error => error instanceof ProjectPreparationError
    && error.message.startsWith('Project preparation refused: cohort.'));
  await assert.rejects(lstat(paths.out), { code: 'ENOENT' });
});

const trustedRelease = { release: 'sha256:' + 'a'.repeat(64), publisher: 'key_' + Buffer.alloc(32, 3).toString('base64url'), host: 'github.com' };

// Real production trust parser and private filesystem; SCRIPTED retained plan only. No packet, provider or fleet exists here.
test('explicit package trust stages only its exact content binding and preserves reviewed trust bytes', async t => {
  for (const trust of [' [\n' + JSON.stringify(trustedRelease) + '\n] ', ' []\n']) {
    const paths = await fixture(t), applicationTrustFile = join(paths.home, 'applications.json');
    const custody = await readFile(join(paths.home, 'config.json'));
    await writeFile(applicationTrustFile, trust, { mode: 0o644 });
    assert.deepEqual(await prepareProject({ origin, ...paths, applicationTrustFile }), { version: 1, origin, register });
    const project = JSON.parse(await readFile(join(paths.out, 'wrangler.json')));
    assert.deepEqual(project.r2_buckets, [{ binding: 'APPLICATION_CONTENT', bucket_name: 'application-content' }]);
    assert.equal(project.vars.APPLICATION_TRUST, trust);
    assert.equal(Object.hasOwn(project.vars, 'APPLICATION_CONTENT'), false);
    assert.equal((await readFile(join(paths.home, 'config.json'))).equals(custody), true);
    const { SESSION_SECRET, APPLICATION_TRUST, ...vars } = project.vars;
    const maintained = JSON.parse(await readFile(new URL('../../wrangler.json', import.meta.url), 'utf8'));
    assert.deepEqual(vars, { ...maintained.vars, REGISTER_SCOPE: register, PUBLIC_ORIGIN: origin, MCP_ENABLED: 'true', MCP_TOOL_ADDITIONS: '[]' });
    assert.equal(typeof SESSION_SECRET, 'string');
  }
});

test('malformed or ambiguous application trust refuses before output and cannot add another setting', async t => {
  const invalid = [
    JSON.stringify([{ ...trustedRelease, administrator: true }]),
    JSON.stringify([trustedRelease, { ...trustedRelease, host: 'other.example' }]),
    JSON.stringify([{ ...trustedRelease, host: 'GitHub.com' }]),
    JSON.stringify([{ ...trustedRelease, host: 'github.com:443' }]),
    JSON.stringify([{ ...trustedRelease, publisher: trustedRelease.publisher + '=' }]),
    JSON.stringify({ APPLICATION_TRUST: [trustedRelease], UNREVIEWED_SETTING: 'TEST' }),
    '[{"release":"' + trustedRelease.release + '","release":"' + trustedRelease.release + '","publisher":"' + trustedRelease.publisher + '","host":"github.com"}]',
    ' '.repeat(64 * 1024) + '[]',
    ' '.repeat(64 * 1024 - 2) + '[]', // valid trust text still cannot exceed the complete private-project bound
  ];
  for (const trust of invalid) {
    const paths = await fixture(t), applicationTrustFile = join(paths.home, 'applications.json');
    const before = await readFile(join(paths.home, 'config.json'));
    await writeFile(applicationTrustFile, trust);
    await assert.rejects(prepareProject({ origin, ...paths, applicationTrustFile }), error => error instanceof ProjectPreparationError
      && error.message.startsWith('Project preparation refused: applications.'));
    await assert.rejects(lstat(paths.out), { code: 'ENOENT' });
    assert.equal((await readFile(join(paths.home, 'config.json'))).equals(before), true);
  }
});

test('a new private project preserves the maintained configuration and cannot replace its session custody', async t => {
  const paths = await fixture(t), homeBefore = await readFile(join(paths.home, 'config.json'));
  const previous = process.umask(0o777);
  let summary;
  try { summary = await prepareProject({ origin, ...paths }); }
  finally { process.umask(previous); }
  assert.equal(JSON.stringify(summary) === JSON.stringify({ version: 1, origin, register }), true);
  assert.equal((await lstat(paths.out)).mode & 0o777, 0o700);
  assert.deepEqual((await readdir(paths.out)).sort(), ['worker.ts', 'wrangler.json']);
  for (const name of ['worker.ts', 'wrangler.json']) assert.equal((await lstat(join(paths.out, name))).mode & 0o777, 0o600);
  const bytes = await readFile(join(paths.out, 'wrangler.json')), project = JSON.parse(bytes);
  const maintained = JSON.parse(await readFile(new URL('../../wrangler.json', import.meta.url), 'utf8'));
  const { SESSION_SECRET: secret, ...publicVars } = project.vars;
  assert.equal(typeof secret, 'string');
  assert.equal(/^[A-Za-z0-9_-]{43}$/.test(secret), true);
  assert.equal(Buffer.from(secret, 'base64url').length, 32);
  assert.deepEqual(publicVars, { ...maintained.vars, REGISTER_SCOPE: register, PUBLIC_ORIGIN: origin,
    MCP_ENABLED: 'true', MCP_TOOL_ADDITIONS: '[]' });
  assert.equal(JSON.stringify({ ...project, vars: publicVars }) === JSON.stringify({ ...maintained, vars: publicVars }), true);
  const worker = fileURLToPath(new URL('../../../worker.ts', import.meta.url));
  assert.equal(await readFile(join(paths.out, 'worker.ts'), 'utf8'), `export * from ${JSON.stringify(worker)};\nexport { default } from ${JSON.stringify(worker)};\n`);
  await assert.rejects(prepareProject({ origin, ...paths }), ProjectPreparationError);
  assert.equal((await readFile(join(paths.out, 'wrangler.json'))).equals(bytes), true);
  assert.equal((await readFile(join(paths.home, 'config.json'))).equals(homeBefore), true);
  assert.deepEqual(await readdir(paths.home), ['config.json']);
});

test('pre-existing partial output and a nonprivate home remain untouched', async t => {
  const paths = await fixture(t);
  await mkdir(paths.out, { mode: 0o700 });
  await writeFile(join(paths.out, 'wrangler.json'), 'retained incomplete project', { mode: 0o600 });
  await assert.rejects(prepareProject({ origin, ...paths }), ProjectPreparationError);
  assert.equal(await readFile(join(paths.out, 'wrangler.json'), 'utf8'), 'retained incomplete project');
  assert.deepEqual(await readdir(paths.out), ['wrangler.json']);
  await chmod(paths.home, 0o755);
  const freshOut = join(paths.home, 'new-project');
  await assert.rejects(prepareProject({ origin, home: paths.home, out: freshOut }), error => error instanceof ProjectPreparationError && error.message.startsWith('Project preparation refused: home.'));
  await assert.rejects(lstat(freshOut), { code: 'ENOENT' });
  assert.equal((await lstat(paths.home)).mode & 0o777, 0o755);
});
