/** Stage GitHub settings in a new private project. The original project stays intact. */
import { createRequire } from 'node:module';
import { chmod, lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applicationProjectSettings, readApplicationProject } from './application-settings.mjs';

const maintained = new URL('../wrangler.json', import.meta.url);
const worker = fileURLToPath(new URL('../../worker.ts', import.meta.url));
const cliRequire = createRequire(new URL('../../../../packages/cli/bin/dap.js', import.meta.url));
const required = ['REGISTER_SCOPE', 'PUBLIC_ORIGIN', 'MCP_ENABLED', 'MCP_TOOL_ADDITIONS', 'SESSION_SECRET'];
const absolute = value => typeof value === 'string' && value.length <= 4096 && isAbsolute(value)
  && resolve(value) === value && !/[\x00-\x1f\x7f]/.test(value);
let native;
const github = () => native ??= (async () => {
  // Use the checkout's pinned loader and production validation. No install or HTTP.
  const { tsImport } = await import(pathToFileURL(cliRequire.resolve('tsx/esm/api')).href);
  const [wiring, registers] = await Promise.all([
    tsImport(new URL('../../../../packages/scope/src/github-wiring.ts', import.meta.url).href, import.meta.url),
    tsImport(new URL('../../../../packages/scope/src/register-setting.ts', import.meta.url).href, import.meta.url),
  ]);
  return { ...wiring, readInstalledRegisters: registers.readInstalledRegisters };
})();

export class GitHubProjectPreparationError extends Error {
  constructor(stage) {
    super('GitHub project preparation refused: ' + stage + '. Retain any private output for inspection.');
    this.stage = stage;
  }
}

async function file(path, maximum, privateInput) {
  if (!absolute(path) || await realpath(path) !== path) throw Error();
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > maximum) throw Error();
  if (privateInput && (process.getuid && info.uid !== process.getuid()
    || ![0o400, 0o600].includes(info.mode & 0o777))) throw Error();
  return readFile(path, 'utf8');
}

async function originalProject(project) {
  if (await realpath(project) !== project) throw Error();
  const info = await lstat(project);
  if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o777) !== 0o700
    || process.getuid && info.uid !== process.getuid()) throw Error();
  const config = await readApplicationProject(await file(join(project, 'wrangler.json'), 64 * 1024, true));
  const template = JSON.parse(await readFile(maintained, 'utf8'));
  const applications = await applicationProjectSettings(config);
  const { vars, ...settings } = applications.settings, { vars: defaults, ...maintainedSettings } = template;
  const optional = [...applications.optional, ...['PLATFORM_CREATION_PINS', 'INSTALLED_REGISTER_SCOPES'].filter(key => vars && Object.hasOwn(vars, key))];
  if (optional.includes('PLATFORM_CREATION_PINS')) {
    const policy = JSON.parse(await readFile(new URL('./repository-binding-policy.json', import.meta.url), 'utf8'));
    if (vars.PLATFORM_CREATION_PINS !== JSON.stringify(policy.PLATFORM_CREATION_PINS)) throw Error();
  }
  if (JSON.stringify(settings) !== JSON.stringify(maintainedSettings) || !vars || typeof vars !== 'object'
    || Object.keys(vars).length !== Object.keys(defaults).length + required.length + optional.length
    || ![...Object.keys(defaults), ...required, ...optional].every(key => Object.hasOwn(vars, key))
    || !Object.entries(defaults).every(([key, value]) => vars[key] === value)
    || !/^sc_[a-z2-7]{52}$/.test(vars.REGISTER_SCOPE)
    || vars.MCP_ENABLED !== 'true' || vars.MCP_TOOL_ADDITIONS !== '[]'
    || !/^[A-Za-z0-9_-]{43}$/.test(vars.SESSION_SECRET)) throw Error();
  if (optional.includes('INSTALLED_REGISTER_SCOPES')) {
    const { readInstalledRegisters } = await github();
    if (readInstalledRegisters(vars).kind !== 'pinned') throw Error();
  }
  const origin = new URL(vars.PUBLIC_ORIGIN);
  if (origin.protocol !== 'https:' || origin.origin !== vars.PUBLIC_ORIGIN || origin.username || origin.password) throw Error();
  const entry = await file(join(project, 'worker.ts'), 64 * 1024, true);
  const quoted = JSON.stringify(worker);
  if (entry !== 'export * from ' + quoted + ';\nexport { default } from ' + quoted + ';\n') throw Error();
  return { config, entry };
}

export async function prepareGitHubProject(options) {
  let stage = 'arguments';
  try {
    const { project, configFile, privateKeyFile, readTokenFile, bindingsFile, out } = options ?? {};
    if (![project, configFile, privateKeyFile, out].every(absolute)
      || readTokenFile !== undefined && !absolute(readTokenFile)
      || bindingsFile !== undefined && !absolute(bindingsFile)) throw Error();
    stage = 'project';
    const original = await originalProject(project);
    stage = 'github-config';
    const configText = await file(configFile, 4096, false);
    const { gitHubConfiguration, gitHubReadiness } = await github();
    const config = gitHubConfiguration(configText);
    if (!config || config.registerScope !== original.config.vars.REGISTER_SCOPE) throw Error();
    stage = 'private-key';
    const key = await file(privateKeyFile, 32 * 1024, true);
    stage = 'read-token';
    const token = readTokenFile === undefined ? undefined : (await file(readTokenFile, 4097, true)).replace(/\r?\n$/, '');
    stage = 'repository-bindings';
    const bindings = bindingsFile === undefined ? undefined : await file(bindingsFile, 65536, false);
    const additions = { GITHUB_APP_CONFIG: configText, GITHUB_APP_PRIVATE_KEY: key,
      ...(token === undefined ? {} : { GITHUB_READ_TOKEN: token }),
      ...(bindings === undefined ? {} : { GITHUB_REPOSITORY_BINDINGS: bindings }) };
    stage = 'github-readiness';
    if (gitHubReadiness(additions).state !== 'wired') throw Error();
    stage = 'output';
    const configured = { ...original.config, vars: { ...original.config.vars, ...additions } };
    const configuredText = JSON.stringify(configured, null, 2) + '\n';
    if (Buffer.byteLength(configuredText) > 64 * 1024) throw Error();
    await mkdir(out, { mode: 0o700 });
    await chmod(out, 0o700);
    for (const [name, text] of [['wrangler.json', configuredText], ['worker.ts', original.entry]]) {
      const path = join(out, name);
      await writeFile(path, text, { mode: 0o600, flag: 'wx' });
      await chmod(path, 0o600);
    }
    return { version: 1, origin: original.config.vars.PUBLIC_ORIGIN,
      register: config.registerScope, host: 'github.com' };
  } catch {
    // Configuration and partial output can hold credentials. Never echo or remove them.
    throw new GitHubProjectPreparationError(stage);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2), values = new Map();
    const names = new Set(['--project', '--config', '--private-key', '--read-token', '--bindings-file', '--out']);
    if (args.length % 2) throw new GitHubProjectPreparationError('arguments');
    for (let i = 0; i < args.length; i += 2) {
      if (!names.has(args[i]) || values.has(args[i])) throw new GitHubProjectPreparationError('arguments');
      values.set(args[i], args[i + 1]);
    }
    const summary = await prepareGitHubProject({ project: values.get('--project'), configFile: values.get('--config'),
      privateKeyFile: values.get('--private-key'), readTokenFile: values.get('--read-token'),
      bindingsFile: values.get('--bindings-file'), out: values.get('--out') });
    console.log(JSON.stringify(summary));
  } catch (error) {
    console.error(error instanceof GitHubProjectPreparationError ? error.message : 'GitHub project preparation failed. Retain any private output for inspection.');
    process.exitCode = 1;
  }
}
