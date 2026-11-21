// Scripted host replies exercise the browser bridge and DOM, not native authority.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { startViewsHost } from './support/views-host.ts';
const { PLAYWRIGHT_CORE, CHROMIUM, VIEW_CAPTURE_OUT } = process.env;
assert.ok(PLAYWRIGHT_CORE && CHROMIUM && VIEW_CAPTURE_OUT && /^\/(?:private\/)?tmp\//.test(VIEW_CAPTURE_OUT));
const require = createRequire(join(PLAYWRIGHT_CORE, 'package.json'));
assert.equal(require('playwright-core/package.json').version, '1.63.0');
const { chromium } = require('playwright-core');
await mkdir(VIEW_CAPTURE_OUT, { recursive: true });
const host = await startViewsHost(); let browser;
const report = { browserPlugin: 'Browser plugin unavailable; pinned Playwright fallback', authority: 'Scripted host replies; no native authority claim.', cases: [] };
try {
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  report.browser = browser.version();
  for (const mode of ['passive', 'active']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.clock.install();
    await page.goto(host.url + '/?presence=' + mode);
    const app = page.frameLocator('#frame').frameLocator('iframe');
    const members = app.getByLabel('Present members').locator('.dap-member');
    await members.first().getByText('@viewer', { exact: true }).waitFor();
    assert.equal(await members.count(), 2);
    assert.equal(await app.getByRole('button', { name: 'Retry read' }).count(), 0);
    assert.match(await members.nth(0).innerText(), /here/);
    assert.doesNotMatch(await members.nth(1).innerText(), /here/);
    assert.match(await members.nth(1).innerText(), /sc_b{51}a/);
    assert.equal(await app.getByLabel('Present members').locator('[role=status], [aria-live]').count(), 0);
    assert.equal(await app.locator('vite-error-overlay,nextjs-portal').count(), 0);
    if (mode === 'passive') {
      await page.screenshot({ path: join(VIEW_CAPTURE_OUT, 'presence-passive.png') });
      assert.equal(await page.evaluate(() => proof.calls.filter(call => call.name === 'view_live_act').length), 0);
    } else {
      await page.waitForFunction(() => proof.calls.some(call => call.name === 'view_live_act' && call.arguments.action === 'presence-enter'));
      await page.waitForFunction(() => proof.presenceCuts.length >= 2);
      const initial = await page.evaluate(() => ({ calls: proof.calls, cuts: proof.presenceCuts, id: proof.config.id }));
      const read = initial.calls.find(call => call.name === 'view_read');
      const enter = initial.calls.find(call => call.name === 'view_live_act');
      assert.equal(enter.arguments.view, initial.id);
      assert.equal(enter.arguments.view, read.arguments.view);
      assert.equal(enter.arguments.cut, initial.cuts[0].cut);
      await page.clock.fastForward(2000);
      await page.waitForFunction(() => proof.calls.some(call => call.name === 'view_live_act' && call.arguments.action === 'presence-renew'));
      await page.waitForFunction(() => proof.presenceCuts.length >= 4);
      const calls = await page.evaluate(() => proof.calls);
      const renew = calls.find(call => call.name === 'view_live_act' && call.arguments.action === 'presence-renew');
      assert.equal(renew.arguments.view, initial.id);
      const renewCut = await page.evaluate(() => proof.presenceAtCalls.find(call => call.action === 'presence-renew'));
      assert.equal(renew.arguments.cut, renewCut.cut); assert.equal(renew.arguments.view, renewCut.view);
      await page.evaluate(() => sendHost({ id: 7001, method: 'ui/resource-teardown', params: {} }));
      await page.waitForFunction(() => proof.calls.some(call => call.name === 'view_live_act' && call.arguments.action === 'presence-leave'));
      const leave = await page.evaluate(() => proof.calls.find(call => call.name === 'view_live_act' && call.arguments.action === 'presence-leave'));
      assert.equal(leave.arguments.view, initial.id);
      const leaveCut = await page.evaluate(() => proof.presenceAtCalls.find(call => call.action === 'presence-leave'));
      assert.equal(leave.arguments.cut, leaveCut.cut); assert.equal(leave.arguments.view, leaveCut.view);
      const count = await page.evaluate(() => proof.calls.filter(call => call.name === 'view_live_act').length);
      await page.clock.fastForward(60000);
      assert.equal(await page.evaluate(() => proof.calls.filter(call => call.name === 'view_live_act').length), count);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => proof.errors), []);
    report.cases.push({ mode, memberRows: 2, errors });
    await page.close();
  }
  await writeFile(join(VIEW_CAPTURE_OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await browser?.close(); await host.close(); }
