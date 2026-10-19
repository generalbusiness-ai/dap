// Actual kit and checked package resource in cached Chromium. Native ports
// are scripted; this makes no hostile-code isolation or deployment claim.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startViewsHost } from './support/views-host.ts';
const { PLAYWRIGHT_CORE, CHROMIUM, VIEW_CAPTURE_OUT: out } = process.env;
assert.ok(PLAYWRIGHT_CORE && CHROMIUM && out && /^\/(?:private\/)?tmp\//.test(out));
const require = createRequire(join(PLAYWRIGHT_CORE, 'package.json'));
assert.equal(require('playwright-core/package.json').version, '1.63.0');
const { chromium } = require('playwright-core');
await mkdir(out, { recursive: true });
const host = await startViewsHost(); let browser;
const report = { browserPlugin: 'Browser plugin unavailable; cached pinned Playwright fallback', cases: [] };
async function contained(app) {
  await app.locator('#card-root').evaluate(async root => {
    for (let frame = 0; frame < 90; frame++) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (window.innerHeight >= Math.ceil(root.getBoundingClientRect().height)) return;
    }
    throw Error('The host did not resize the inner app to contain its surface.');
  });
}
try {
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  report.browser = browser.version();
  for (const width of process.env.VIEW_SURFACE_CASE === 'current-open' ? [320] : [320, 592]) {
    const page = await browser.newPage({ viewport: { width: width + 32, height: 1000 } }), errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(host.url + '/?fixture=declared&screen=grid');
    const app = page.frameLocator('#frame').frameLocator('iframe');
    await app.getByRole('heading', { name: 'Participant grid', exact: true }).waitFor();
    await app.getByText('Native head 13', { exact: true }).waitFor();
    await page.waitForFunction(() => window.proof.mode === 'fullscreen' && window.proof.contexts.length > 0);
    assert.equal(await app.getByRole('button', { name: /^Participant / }).count(), 3);
    const api = await app.locator('html').evaluate(() => ({ keys: window.surfaceProof.keys, slotRemoved: !Object.hasOwn(window, 'dapSurface') }));
    assert.deepEqual(api.keys.sort(), ['onData', 'open', 'root', 'signal']); assert.equal(api.slotRemoved, true);
    await app.getByRole('button', { name: 'Invalid opening', exact: true }).click();
    await app.getByText('This surface declares no such opening.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.proof.calls.filter(call => call.name !== 'view_read').length), 0);
    await app.getByRole('button', { name: 'Participant 12', exact: true }).click();
    await app.getByRole('heading', { name: '12', exact: true }).waitFor();
    await page.waitForFunction(() => window.proof.contexts.at(-1)?.structuredContent.screen === 'person-record');
    const stale = await app.locator('html').evaluate(async () => window.surfaceProof.api.open('record', { participant: 13 }).then(() => 'opened', error => error.message));
    assert.equal(stale, 'This surface is no longer current.');
    await app.getByRole('button', { name: /Back/ }).click();
    await app.getByRole('heading', { name: 'Participant grid', exact: true }).waitFor();
    await app.getByText('Selected participant 12', { exact: true }).waitFor();
    await contained(app);
    const measured = await app.locator('#card-root').evaluate(root => ({ width: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, height: Math.ceil(root.getBoundingClientRect().height), viewportHeight: window.innerHeight }));
    assert.equal(measured.width, width); assert.equal(measured.overflow, false); assert.ok(measured.viewportHeight >= measured.height);
    const proof = await page.evaluate(() => window.proof);
    assert.equal(proof.contexts.at(-1).structuredContent.identity.kind, 'scope');
    assert.deepEqual(proof.contexts.at(-1).structuredContent.identity.at, {});
    assert.ok(!JSON.stringify(proof.contexts).includes('sources') && !JSON.stringify(proof.contexts).includes('surfaceProof'));
    assert.deepEqual(proof.chat, []); assert.deepEqual(proof.errors, []); assert.deepEqual(errors, []);
    const state = await page.evaluate(async () => fetch('/proof?instance=' + window.proof.config.id).then(response => response.json()));
    assert.equal(state.signed.length, 0);
    await page.screenshot({ path: join(out, `declared-surface-${width}.png`) });
    await page.evaluate(() => window.sendHost({ method: 'ui/resource-teardown', params: {} }));
    await app.locator('html').evaluate(async () => { for (let frame = 0; frame < 30 && !window.surfaceProof.aborted; frame++) await new Promise(resolve => requestAnimationFrame(resolve)); });
    assert.equal(await app.locator('html').evaluate(() => window.surfaceProof.aborted), true);
    report.cases.push({ width, measured, nativeHead: 13, namedOpen: 12, retainedSelection: 12, staleOpenRefused: true, signatures: 0, teardown: true });
    await page.close();
  }
  if (process.env.VIEW_SURFACE_CASE !== 'current-open') {
    const page = await browser.newPage({ viewport: { width: 422, height: 1000 } });
    await page.goto(host.url + '/?fixture=declared&screen=grid-empty');
    const app = page.frameLocator('#frame').frameLocator('iframe');
    await app.getByText('No participants in this projection.', { exact: true }).waitFor();
    await app.getByText('Native head 13', { exact: true }).waitFor();
    await page.waitForFunction(() => window.proof.contexts.length > 0);
    const context = await page.evaluate(() => window.proof.contexts.at(-1).structuredContent);
    assert.equal(context.status, 'empty'); assert.equal(context.identity, null); assert.equal(context.projection[0].seq, 13);
    await page.waitForFunction(() => window.proof.calls.some(call => call.name === 'view_read' && call.arguments.refresh === true));
    assert.equal(await page.evaluate(() => window.proof.contexts.length), 1);
    await contained(app);
    await page.screenshot({ path: join(out, 'declared-empty-surface-390.png') });
    report.cases.push({ label: 'empty-390', nativeHead: 13, identity: null, refresh: true, unchangedContextRepeated: false });
    await page.close();
  }
  if (process.env.VIEW_SURFACE_CASE !== 'current-open') {
    const page = await browser.newPage({ viewport: { width: 422, height: 1000 } }), errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(host.url + '/?fixture=declared&screen=grid-broken');
    const app = page.frameLocator('#frame').frameLocator('iframe');
    await app.getByText('Surface fixture failed to initialize.', { exact: true }).waitFor();
    assert.equal(await app.locator('.declared-surface').count(), 0);
    assert.equal(await app.locator('html').evaluate(() => Object.hasOwn(window, 'dapSurface')), false);
    assert.deepEqual(errors, []);
    await contained(app);
    await page.screenshot({ path: join(out, 'declared-broken-surface-390.png') });
    report.cases.push({ label: 'broken-390', initializationErrorShown: true, partialSurfaceShown: false, slotRetained: false });
    await page.close();
  }
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser?.close(); await host.close(); }
