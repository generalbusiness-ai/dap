/** Prepare a new private celld project from an existing host-none CLI plan. */
import { randomBytes } from 'node:crypto';
import { chmod, lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { contextForCelldSmoke } from '../../../../scripts/celld-smoke.mjs';

const maintained = new URL('../wrangler.json', import.meta.url);
const worker = fileURLToPath(new URL('../../worker.ts', import.meta.url));
const absolute = value => typeof value === 'string' && value.length <= 4096 && isAbsolute(value)
  && resolve(value) === value && !/[\x00-\x1f\x7f]/.test(value);

export class ProjectPreparationError extends Error {
  constructor(stage) { super(`Project preparation refused: ${stage}. Retain any private output for inspection.`); }
}

export async function prepareProject(options) {
  let stage = 'arguments';
  try {
    const { origin, home, out } = options ?? {};
    if (!absolute(home) || !absolute(out)) throw Error();
    stage = 'origin';
    const url = new URL(origin);
    if (typeof origin !== 'string' || origin.length > 2048 || !/^[\x21-\x7e]+$/.test(origin)
      || url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) throw Error();
    stage = 'home';
    const info = await lstat(home);
    if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o777) !== 0o700
      || process.getuid && info.uid !== process.getuid()) throw Error();
    stage = 'plan';
    const context = await contextForCelldSmoke({ base: origin, home, fetch: () => { throw Error('HTTP is disabled during preparation'); } });
    const config = await context.store.config();
    if (config?.v !== 1 || config.service !== origin || config.plan?.service !== origin
      || config.plan.definition !== 'platform:register@21' || typeof config.plan.register !== 'string'
      || !/^sc_[a-z2-7]{52}$/.test(config.plan.register)
      || config.plan.founding?.intent?.fields?.host !== 'none' || config.plan.founding.intent.fields.namespace !== '') throw Error();
    const project = JSON.parse(await readFile(maintained, 'utf8'));
    stage = 'output';
    await mkdir(out, { mode: 0o700 });
    await chmod(out, 0o700);
    project.vars = { ...project.vars, REGISTER_SCOPE: config.plan.register, PUBLIC_ORIGIN: origin,
      MCP_ENABLED: 'true', MCP_TOOL_ADDITIONS: '[]', SESSION_SECRET: randomBytes(32).toString('base64url') };
    for (const [name, text] of [
      ['wrangler.json', JSON.stringify(project, null, 2) + '\n'],
      ['worker.ts', `export * from ${JSON.stringify(worker)};\nexport { default } from ${JSON.stringify(worker)};\n`],
    ]) {
      const path = join(out, name);
      await writeFile(path, text, { mode: 0o600, flag: 'wx' });
      await chmod(path, 0o600);
    }
    return { version: 1, origin, register: config.plan.register };
  } catch {
    // A partial project may contain its only session secret. Never remove it.
    throw new ProjectPreparationError(stage);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  try {
    if (args.length !== 6 || args[0] !== '--origin' || args[2] !== '--home' || args[4] !== '--out') throw new ProjectPreparationError('arguments');
    console.log(JSON.stringify(await prepareProject({ origin: args[1], home: args[3], out: args[5] })));
  } catch (error) {
    console.error(error instanceof ProjectPreparationError ? error.message : 'Project preparation failed. Retain any private output for inspection.');
    process.exitCode = 1;
  }
}
