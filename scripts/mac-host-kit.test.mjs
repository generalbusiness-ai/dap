import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const kit = resolve(root, 'apps/room/celld/mac');

test('the Mac host kit runs its offline Node and Python owners', {
  skip: process.platform !== 'darwin' ? 'Mac host kit requires Darwin system Python and OpenSSL' : false,
  timeout: 130_000,
}, t => {
  const commands = [
    { language: 'node', cwd: root, argv: [process.execPath, '--test', '--test-reporter=tap',
      'apps/room/celld/mac/test/certificate.test.mjs', 'apps/room/celld/mac/test/prepare-project.test.mjs'] },
    { language: 'python', cwd: kit, argv: ['/usr/bin/python3', '-B', '-m', 'unittest', '-v',
      'test_install', 'test_shutdown', 'test_deploy'] },
  ];
  const env = { ...process.env, PYTHONDONTWRITEBYTECODE: '1' };
  // Each child is an independent test invocation, not a recursive node:test run.
  delete env.NODE_TEST_CONTEXT;
  for (const { language, cwd, argv } of commands) {
    const child = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', timeout: 60_000,
      maxBuffer: 2 * 1024 * 1024, killSignal: 'SIGKILL', env });
    const stdout = child.stdout ?? '', stderr = child.stderr ?? '';
    // These are child results, not additional cases in the parent Node stage.
    const tests = language === 'node' ? /^# tests (\d+)$/m.exec(stdout) : /^Ran (\d+) tests? in /m.exec(stderr);
    const count = tests ? Number(tests[1]) : null;
    t.diagnostic(JSON.stringify({ kind: 'mac-host-kit-child', language, argv, cwd, pid: child.pid ?? null,
      exit: child.status, signal: child.signal, error: child.error ? { code: child.error.code, message: child.error.message } : null,
      tests: count, stdout, stderr }));
    assert.equal(child.error, undefined, `${language} owner must launch and finish within its bounds`);
    assert.equal(child.signal, null, `${language} owner must close without a signal`);
    assert.equal(child.status, 0, `${language} owner failed; see its retained stdout and stderr above`);
    assert.ok(count !== null && count > 0, `${language} owner must report actual child tests`);
    if (language === 'node') assert.match(stdout, /^# fail 0$/m);
    else assert.match(stderr, /^OK(?: \([^\n]*\))?$/m);
  }
});
