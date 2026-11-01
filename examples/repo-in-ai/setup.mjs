#!/usr/bin/env node
// Use the checkout's locked loader, as the maintained dap launcher does.
import { spawnSync } from 'node:child_process';

const source = new URL('./setup.ts', import.meta.url).href;
const run = `const { main } = await import(${JSON.stringify(source)}); process.exitCode = await main(process.argv.slice(1));`;
const child = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), '--disable-warning=DEP0205', '--input-type=module', '--eval', run, '--', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exitCode = child.status ?? 1;
