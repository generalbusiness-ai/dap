// Pinned scratch Playwright; no install, provider or native-authority claim.
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
    throw Error('The host did not resize the inner app to contain its card.');
  });
}
try {
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  report.browser = browser.version();
  for (const width of [320, 592]) {
    const page = await browser.newPage({ viewport: { width: width + 32, height: 900 } }), errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(host.url + '/?fixture=declared&screen=board');
    const app = page.frameLocator('#frame').frameLocator('iframe');
    await app.getByRole('link', { name: 'open', exact: true }).waitFor();
    await app.getByText('lastNumber: 42', { exact: true }).waitFor();
    await page.waitForFunction(() => window.proof.contexts.length > 0 && window.proof.sizes.length > 0);
    assert.equal(await app.locator('.actor').count(), 0, 'no invented actor for a null declaration');
    const denial = await page.evaluate(() => window.modelCall('view_read', { view: window.proof.config.id }));
    assert.equal(denial.error.code, -32601, 'projection data remains app-only');
    await app.getByRole('link', { name: 'open', exact: true }).click();
    await app.getByRole('button', { name: /Back/ }).waitFor();
    assert.equal(await app.getByRole('button', { name: 'Pause', exact: true }).count(), 0, 'the scripted reader holds no control action');
    // The host and sandbox each resize on a frame. Inspect the actual inner
    // viewport, not just the emitted size or the outer iframe's style.
    await contained(app);
    const measured = await app.locator('#card-root').evaluate(root => ({ width: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, height: Math.ceil(root.getBoundingClientRect().height), viewportHeight: window.innerHeight }));
    assert.equal(measured.width, width); assert.equal(measured.overflow, false);
    assert.ok(measured.viewportHeight >= measured.height);
    const proof = await page.evaluate(() => window.proof);
    assert.equal(proof.mode, 'inline', 'the declared display mode is used');
    assert.deepEqual(errors, []); assert.deepEqual(proof.errors, []); assert.deepEqual(proof.chat, []);
    assert.ok(!JSON.stringify(proof.contexts).includes('lastNumber'));
    assert.ok(!JSON.stringify(proof.contexts).includes('42'));
    assert.equal(proof.contexts.at(-1).structuredContent.note, 'Board 2 v1');
    await page.screenshot({ path: join(out, `declared-${width}.png`) });
    await app.getByRole('button', { name: /Back/ }).click();
    await page.waitForFunction(() => window.proof.mode === 'fullscreen' && window.proof.contexts.at(-1)?.structuredContent.screen === 'record');
    await app.getByRole('heading', { name: 'open', exact: true }).waitFor();
    assert.equal(await app.getByRole('link').count(), 0, 'record opens directly in detail');
    await contained(app);
    await page.screenshot({ path: join(out, `declared-record-${width}.png`) });
    await app.getByRole('button', { name: /Back/ }).click();
    await app.getByRole('link', { name: 'open', exact: true }).waitFor();
    await page.waitForFunction(() => window.proof.mode === 'inline' && window.proof.contexts.at(-1)?.structuredContent.screen === 'board');
    await contained(app);
    const navigation = await page.evaluate(() => window.proof.contexts.map(context => context.structuredContent.screen));
    assert.ok(navigation.includes('record'));
    assert.deepEqual(errors, []);
    report.cases.push({ width, measured, contextCount: navigation.length, appOnlyDenial: denial.error.code, navigation });
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 422, height: 900 } }), errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(host.url + '/?fixture=declared&screen=record');
    const app = page.frameLocator('#frame').frameLocator('iframe');
    await app.getByRole('heading', { name: 'open', exact: true }).waitFor();
    await page.waitForFunction(() => window.proof.mode === 'fullscreen' && window.proof.contexts.at(-1)?.structuredContent.screen === 'record');
    await app.locator('html[data-mode="fullscreen"]').waitFor({ state: 'attached' });
    await contained(app);
    assert.equal(await app.getByRole('link').count(), 0);
    assert.equal(await app.getByRole('button', { name: /Back/ }).count(), 1);
    await page.screenshot({ path: join(out, 'declared-direct-record-390.png') });
    await app.getByRole('button', { name: /Back/ }).click();
    await app.getByRole('link', { name: 'open', exact: true }).waitFor();
    await page.waitForFunction(() => window.proof.mode === 'inline' && window.proof.contexts.at(-1)?.structuredContent.screen === 'board');
    assert.deepEqual(errors, []);
    report.cases.push({ label: 'direct-record-390', navigation: ['record', 'board'], initialDisplay: 'fullscreen', backDisplay: 'inline' });
    await page.close();
  }
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser?.close(); await host.close(); }
