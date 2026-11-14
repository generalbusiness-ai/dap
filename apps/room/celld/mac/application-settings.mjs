/** The two optional package-host settings. All trust grammar comes from the production parser. */
import { createRequire } from 'node:module';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const cliRequire = createRequire(new URL('../../../../packages/cli/bin/dap.js', import.meta.url));
const maximum = 64 * 1024;
const content = Object.freeze({ binding: 'APPLICATION_CONTENT', bucket_name: 'application-content' });
let parser;
async function settingsParser() {
  return parser ??= (async () => {
    const { tsImport } = await import(pathToFileURL(cliRequire.resolve('tsx/esm/api')).href);
    const [trust, bytes] = await Promise.all([
      tsImport(new URL('../../../../packages/client/src/application-trust.ts', import.meta.url).href, import.meta.url),
      tsImport(new URL('../../../../packages/bytes/src/index.ts', import.meta.url).href, import.meta.url),
    ]);
    return { readApplicationTrust: trust.readApplicationTrust, parseStrict: bytes.parseStrict };
  })();
}

export async function checkApplicationTrust(raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > maximum) throw Error('Invalid application settings');
  (await settingsParser()).readApplicationTrust(raw);
}

/** A staged project cannot normalize away duplicate settings before the deployment guard reads it. */
export async function readApplicationProject(raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > maximum) throw Error('Invalid application settings');
  return (await settingsParser()).parseStrict(raw);
}

/** Both settings are absent, or both have their exact reviewed shape. No additional bucket enters the project. */
export async function applicationProjectSettings(config) {
  const hasContent = Object.hasOwn(config, 'r2_buckets');
  const hasTrust = config.vars && Object.hasOwn(config.vars, 'APPLICATION_TRUST');
  if (hasContent !== Boolean(hasTrust)) throw Error('Invalid application settings');
  if (!hasContent) return { settings: config, optional: [] };
  const buckets = config.r2_buckets, row = Array.isArray(buckets) && buckets[0];
  if (!Array.isArray(buckets) || buckets.length !== 1 || !row || typeof row !== 'object' || Array.isArray(row)
    || Object.keys(row).sort().join() !== 'binding,bucket_name'
    || row.binding !== content.binding || row.bucket_name !== content.bucket_name) throw Error('Invalid application settings');
  await checkApplicationTrust(config.vars.APPLICATION_TRUST);
  const { r2_buckets: _content, ...settings } = config;
  return { settings, optional: ['APPLICATION_TRUST'] };
}

/** Read an explicit public trust file before creating private project output. The text stays byte-for-byte in vars. */
export async function stageApplicationSettings(config, file) {
  if (file === undefined) return config;
  if (typeof file !== 'string' || file.length > 4096 || !isAbsolute(file) || resolve(file) !== file
    || /[\x00-\x1f\x7f]/.test(file) || await realpath(file) !== file) throw Error('Invalid application settings');
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > maximum) throw Error('Invalid application settings');
  const raw = await readFile(file, 'utf8');
  await checkApplicationTrust(raw);
  return { ...config, r2_buckets: [{ ...content }], vars: { ...config.vars, APPLICATION_TRUST: raw } };
}

// Python's deployment guard uses the same strict JSON, key and WHATWG hostname rules. Only the nonsecret trust setting enters stdin.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length !== 3 || process.argv[2] !== '--check-trust') throw Error();
    const chunks = []; let bytes = 0;
    for await (const chunk of process.stdin) {
      bytes += chunk.length;
      if (bytes > maximum) throw Error();
      chunks.push(chunk);
    }
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    await checkApplicationTrust(raw);
  } catch {
    console.error('Invalid application settings');
    process.exitCode = 1;
  }
}
