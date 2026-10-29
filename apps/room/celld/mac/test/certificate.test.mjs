import assert from 'node:assert/strict';
import { X509Certificate, createPrivateKey, createPublicKey } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import tls from 'node:tls';

const script = fileURLToPath(new URL('../certificate.sh', import.meta.url));
const openssl = '/usr/bin/openssl';

function scratch(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dap-certificate-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const staging = join(dir, 'staging');
  mkdirSync(staging);
  return { dir, staging, cert: join(dir, 'cert.pem'), key: join(dir, 'key.pem') };
}

function generate(paths, more = [], env = {}) {
  return spawnSync('/bin/bash', [script, '--cert', paths.cert, '--key', paths.key, ...more], {
    encoding: 'utf8', env: { ...process.env, TMPDIR: paths.staging, ...env }, timeout: 15_000,
  });
}

test('the generated self-signed P-256 server certificate covers DNS and IP SANs for 825 days', t => {
  const paths = scratch(t);
  const previous = process.umask(0);
  let result;
  try {
    result = generate(paths, ['--name', 'host.local', '--name', 'localhost', '--ip', '192.168.1.52', '--ip', '127.0.0.1', '--ip', '::1', '--days', '825']);
  } finally { process.umask(previous); }
  assert.equal(result.status, 0, result.stderr);
  const cert = new X509Certificate(readFileSync(paths.cert));
  assert.equal(cert.publicKey.asymmetricKeyType, 'ec');
  assert.equal(cert.publicKey.asymmetricKeyDetails.namedCurve, 'prime256v1');
  assert.equal(cert.verify(cert.publicKey), true);
  assert.equal(cert.subject, cert.issuer);
  assert.equal(cert.ca, false);
  assert.ok(cert.keyUsage.includes('1.3.6.1.5.5.7.3.1'));
  assert.equal(cert.checkHost('host.local'), 'host.local');
  assert.equal(cert.checkHost('localhost'), 'localhost');
  assert.equal(cert.checkIP('192.168.1.52'), '192.168.1.52');
  assert.equal(cert.checkIP('127.0.0.1'), '127.0.0.1');
  assert.equal(cert.checkIP('::1'), '::1');
  assert.equal(cert.checkHost('other.local'), undefined);
  assert.equal((Date.parse(cert.validTo) - Date.parse(cert.validFrom)) / 86_400_000, 825);
  assert.equal(statSync(paths.key).mode & 0o777, 0o600);
  const key = createPrivateKey(readFileSync(paths.key));
  const publicKey = createPublicKey(key).export({ type: 'spki', format: 'der' });
  assert.equal(publicKey.equals(cert.publicKey.export({ type: 'spki', format: 'der' })), true);
  const inspected = spawnSync(openssl, ['x509', '-in', paths.cert, '-noout', '-text'], { encoding: 'utf8' });
  assert.equal(inspected.status, 0, inspected.stderr);
  assert.match(inspected.stdout, /sha256/i);
  assert.match(inspected.stdout, /TLS Web Server Authentication/);
  assert.deepEqual(readdirSync(paths.staging), []);
});

test('trusting the endpoint certificate rejects another hostname certificate signed with its key', { timeout: 15_000 }, async t => {
  const paths = scratch(t);
  const generated = generate(paths, ['--name', 'host.local', '--days', '2']);
  assert.equal(generated.status, 0, generated.stderr);
  const other = { cert: join(paths.dir, 'other.pem'), key: join(paths.dir, 'other.key') };
  const request = join(paths.dir, 'other.csr');
  const extensions = join(paths.dir, 'other.cnf');
  writeFileSync(extensions, 'basicConstraints = critical,CA:FALSE\nkeyUsage = critical,digitalSignature\nextendedKeyUsage = serverAuth\nsubjectAltName = DNS:other.local\n');
  for (const argv of [
    ['ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', other.key],
    ['req', '-new', '-key', other.key, '-subj', '/CN=other.local', '-out', request],
    ['x509', '-req', '-in', request, '-CA', paths.cert, '-CAkey', paths.key, '-set_serial', '2', '-days', '2', '-sha256', '-extfile', extensions, '-out', other.cert],
  ]) {
    const issued = spawnSync(openssl, argv, { encoding: 'utf8', timeout: 5000 });
    assert.equal(issued.status, 0, issued.stderr);
  }
  async function connect(certificate, hostname) {
    const server = tls.createServer({ cert: readFileSync(certificate.cert), key: readFileSync(certificate.key) });
    server.on('tlsClientError', () => {});
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    try {
      return await new Promise(resolve => {
        const client = tls.connect({ host: '127.0.0.1', port: server.address().port,
          servername: hostname, ca: readFileSync(paths.cert), rejectUnauthorized: true });
        client.setTimeout(3000, () => client.destroy(new Error('TLS handshake deadline elapsed')));
        client.once('secureConnect', () => { resolve({ accepted: true }); client.destroy(); });
        client.once('error', error => { resolve({ accepted: false, message: error.message }); client.destroy(); });
      });
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  }
  assert.deepEqual(await connect(paths, 'host.local'), { accepted: true });
  const refused = await connect(other, 'other.local');
  assert.equal(refused.accepted, false);
  assert.match(refused.message, /key usage does not include certificate signing|invalid CA certificate/);
});

test('an excessive lifetime or configuration-injection name refuses before any writes', t => {
  const paths = scratch(t);
  const tooLong = generate(paths, ['--name', 'localhost', '--days', '900']);
  assert.notEqual(tooLong.status, 0);
  assert.match(tooLong.stderr, /1 to 825/);
  assert.deepEqual(readdirSync(paths.dir), ['staging']);
  const marker = join(paths.dir, 'injected');
  const injected = generate(paths, ['--name', `localhost\n[other]\nvalue = $(touch ${marker})`]);
  assert.notEqual(injected.status, 0);
  assert.match(injected.stderr, /invalid DNS name/);
  assert.equal(existsSync(marker), false);
  assert.deepEqual(readdirSync(paths.dir), ['staging']);
  assert.deepEqual(readdirSync(paths.staging), []);
});

test('existing key and certificate custody is preserved, including a dangling symlink', t => {
  const paths = scratch(t);
  writeFileSync(paths.key, 'existing private custody', { mode: 0o600 });
  const existing = generate(paths, ['--name', 'localhost']);
  assert.notEqual(existing.status, 0);
  assert.match(existing.stderr, /already exists/);
  assert.equal(readFileSync(paths.key, 'utf8') === 'existing private custody', true);
  assert.equal(existsSync(paths.cert), false);
  rmSync(paths.key);
  symlinkSync(join(paths.dir, 'missing'), paths.cert);
  const linked = generate(paths, ['--name', 'localhost']);
  assert.notEqual(linked.status, 0);
  assert.match(linked.stderr, /already exists/);
  assert.equal(existsSync(paths.key), false);
  assert.deepEqual(readdirSync(paths.staging), []);
});

test('a publication collision removes only this invocation\'s new key and preserves the other certificate', t => {
  const paths = scratch(t);
  const bin = join(paths.dir, 'bin');
  mkdirSync(bin);
  // Real OpenSSL generates the pair. The wrapper models another creator
  // publishing the certificate after validation and before exclusive open.
  writeFileSync(join(bin, 'openssl'), '#!/bin/bash\n/usr/bin/openssl "$@" || exit $?\nif [[ "$1" == req ]]; then printf "other creator\\n" > "$COLLIDING_CERT"; fi\n', { mode: 0o700 });
  const result = generate(paths, ['--name', 'localhost'], { PATH: `${bin}${delimiter}${process.env.PATH}`, COLLIDING_CERT: paths.cert });
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(paths.key), false);
  assert.equal(readFileSync(paths.cert, 'utf8'), 'other creator\n');
  assert.deepEqual(readdirSync(paths.staging), []);
});
