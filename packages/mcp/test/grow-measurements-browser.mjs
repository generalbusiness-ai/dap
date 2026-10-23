// G2: real kit, owned Core/SQLite Site/Room, MCP custody and native probes.
// Install/session/standing ports are TEST stand-ins. The default model calls
// below are scripted. Optional bridge mode waits for a separate live caller;
// this host has no LLM backend and never parses the fixture text itself.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { secretSigner } from '@generalbusiness/dap-client';
import { prepareGrowCheck } from '../../../examples/grow/prepare-check.ts';
import { prepareApplicationDirectory } from '../../cli/src/application-files.ts';
import { openOwnedGrowScenario } from './support/grow-owned-session.ts';
import { growOperator } from './support/grow-operator.ts';
import { startViewsHost } from './support/views-host.ts';
import { viewInputToolName } from '../src/views/names.ts';

const { PLAYWRIGHT_CORE, CHROMIUM, VIEW_CAPTURE_OUT: out, GROW_LIVE_MODEL_BRIDGE: live } = process.env;
assert.ok(PLAYWRIGHT_CORE && CHROMIUM && out && /^\/(?:private\/)?tmp\//.test(out));
const require = createRequire(join(PLAYWRIGHT_CORE, 'package.json'));
assert.equal(require('playwright-core/package.json').version, '1.63.0');
const { chromium } = require('playwright-core');
const root = await prepareGrowCheck(); let session, operator, browser, host;
const report = { browserPlugin: 'Browser plugin unavailable; cached pinned Playwright fallback', model: live ? 'Separate live command-bridge caller; fixture host has no LLM backend' : 'Scripted typed-text consumer with literal fields; no actual LLM call', authority: 'Actual owned Core/SQLite Site/Room and native entries, MCP signatures and custody. TEST install, membership, sessions and standing lookup. No provider or device execution.', cases: [] };
async function contained(app) {
  await app.locator('#card-root').evaluate(async root => { for (let n = 0; n < 90; n++) { await new Promise(resolve => requestAnimationFrame(resolve)); if (window.innerHeight >= Math.ceil(root.getBoundingClientRect().height)) return; } throw Error('Host did not apply card height'); });
}
async function capture(page, app, name) {
  await contained(app); const viewport = page.viewportSize(), height = await app.locator('#card-root').evaluate(root => Math.ceil(root.getBoundingClientRect().height));
  await page.setViewportSize({ ...viewport, height: Math.max(viewport.height, height + 80) }); await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: join(out, name), fullPage: true }); await page.setViewportSize(viewport); await contained(app);
}
try {
  await mkdir(out, { recursive: true });
  const { packet } = await prepareApplicationDirectory(root, secretSigner(new Uint8Array(32).fill(254)));
  const original = JSON.parse(await readFile(new URL('./support/grow-owned-fault-scenario.json', import.meta.url), 'utf8'));
  const scene = structuredClone(original); scene.time = '2026-10-16T12:00:00Z'; scene.steps = scene.steps.slice(0, scene.steps.findIndex(step => step.act?.kind === 'probe'));
  host = await startViewsHost({ declared: async base => ({ ...base, service: operator.service }) });
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true }); report.browser = browser.version();
  for (const width of (process.env.GROW_VIEW_WIDTH ? [Number(process.env.GROW_VIEW_WIDTH)] : [320, 592])) {
    session?.close(); session = await openOwnedGrowScenario(packet, scene); operator = growOperator(packet, session, 'grow.tend');
    const accepted = async (actor, kind, on, fields, subjects) => { const result = await operator.nativeAct(actor, kind, on, fields, subjects); assert.equal(result.answer, 'accepted', JSON.stringify(result)); return result.receipt.fact; };
    await accepted('day', 'probe', 45, { moisture: 25, ec: 2000, ph: 580, note: 'baseline' }, { on: 45 });
    await accepted('day', 'probe', 22, { note: 'old scout' }, { on: 22 });
    await operator.advance('2026-10-17T12:00:00Z');
    for (let id = 22; id <= 121; id++) if (id !== 45) await accepted('day', 'probe', id, { moisture: 40, ...(id === 22 ? { insects: 2 } : id === 23 ? { insects: 0 } : {}) }, { on: id });
    await operator.advance('2026-10-18T12:00:00Z');
    const zones = [2, 7, 12, 17].map(zone => ({ zone, min: 2300, max: 2500, mean: 2400, inBand: 25 }));
    const summary = await accepted('sensors', 'observe', null, { sampledAt: '2026-10-18T12:00:00Z', zones }, {});
    for (const { zone, ...values } of zones) await accepted('sensors', 'report-zone', zone, { summary, sampledAt: '2026-10-18T12:00:00Z', zones, ...values }, { on: zone });
    const page = await browser.newPage({ viewport: { width: width + 32, height: 1100 } }), errors = [];
    page.on('pageerror', error => errors.push(String(error))); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.clock.setFixedTime('2026-10-18T12:00:00Z');
    await page.goto(host.url + '/?fixture=declared&screen=grid&scope=' + encodeURIComponent(JSON.stringify(session.scope.at)));
    const app = page.frameLocator('#frame').frameLocator('iframe'), cell = () => app.locator('.bench[data-bench="45"]');
    await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor(); assert.equal(await app.locator('.bench').count(), 100);
    assert.equal(await cell().getAttribute('data-value'), '25'); assert.equal(await cell().getAttribute('data-stale'), 'true'); assert.equal(await cell().locator('.age').innerText(), '2d');
    await capture(page, app, `moisture-old-${width}.png`);
    await page.waitForFunction(() => window.proof.contexts.at(-1)?.structuredContent?.screen === 'grid');
    const before = await page.evaluate(() => ({ contexts: proof.contexts.length, reads: proof.calls.filter(call => call.name === 'view_read').length }));
    await app.getByRole('button', { name: 'Temperature', exact: true }).click(); assert.equal(await cell().getAttribute('data-value'), '2400'); assert.equal(await cell().locator('.age').innerText(), '0m');
    await capture(page, app, `temperature-${width}.png`);
    await app.getByRole('button', { name: 'Scouting', exact: true }).click(); assert.equal(await cell().getAttribute('data-value'), 'baseline'); assert.equal(await cell().getAttribute('data-stale'), 'true');
    assert.equal(await app.locator('.bench[data-bench="22"]').getAttribute('data-value'), 'old scout · 2 insects');
    assert.equal(await app.locator('.bench[data-bench="22"]').getAttribute('data-time'), '2026-10-17T12:00:00Z');
    assert.equal(await app.locator('.bench[data-bench="22"] .age').innerText(), '1d');
    assert.equal(await app.locator('.bench[data-bench="23"]').getAttribute('data-value'), '0 insects');
    assert.equal(await app.locator('.bench[data-bench="24"]').getAttribute('data-missing'), 'true');
    await capture(page, app, `scouting-old-${width}.png`);
    await page.waitForFunction(reads => proof.calls.filter(call => call.name === 'view_read').length >= reads + 2, before.reads);
    assert.equal(await page.evaluate(() => proof.contexts.length), before.contexts, 'Layer switches and unchanged refreshes stay quiet');
    await app.getByRole('button', { name: 'Temperature', exact: true }).click(); await cell().click();
    await app.getByRole('heading', { name: 'Zone 1', exact: true }).waitFor(); await app.getByText('Mean: 24 °C', { exact: true }).waitFor(); await contained(app);
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor(); await contained(app);
    await app.getByRole('button', { name: 'Moisture', exact: true }).click(); await cell().click(); await app.getByRole('heading', { name: 'C4', exact: true }).waitFor();
    await app.getByText('Moisture age: 2 days ago (2026-10-16T12:00:00Z)', { exact: true }).waitFor();
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor(); await contained(app);
    await app.getByRole('button', { name: 'Measure benches', exact: true }).click(); await app.getByRole('heading', { name: 'C4', exact: true }).waitFor();
    await app.getByRole('button', { name: 'Add measurements in chat', exact: true }).click();
    await page.waitForFunction(() => proof.contexts.at(-1)?.structuredContent?.screen === 'benches');
    const publicContext = await page.evaluate(() => proof.contexts.at(-1).structuredContent);
    assert.equal(publicContext.identity.item, '45'); assert.equal(publicContext.identity.revision, '3'); assert.ok(publicContext.view); assert.ok(!Object.hasOwn(publicContext, 'cut'));
    const denied = await page.evaluate(view => window.modelCall('view_read', { view }), publicContext.view); assert.equal(denied.error.code, -32601);
    const tool = viewInputToolName('benches', 'probe'), prompt = 'C4 moisture 31, EC 2.1, pH 5.9, leaf edge curl';
    const args = { view: publicContext.view, item: '45', revision: '3', request: `morning-c4-${width}` };
    assert.equal(operator.signatures(), 0); await capture(page, app, `carousel-old-${width}.png`);
    let response;
    if (live) {
      const schema = (await operator.service.snapshot()).tools.find(value => value.name === tool);
      await writeFile(join(out, 'model-bridge.json'), JSON.stringify({ url: host.url, instance: await page.evaluate(() => proof.config.id), tool: schema, prompt, context: publicContext, requestKey: args.request }, null, 2));
      console.log('MODEL_INPUT_READY ' + join(out, 'model-bridge.json'));
      await new Promise(resolve => process.stdin.once('data', resolve)); process.stdin.pause(); response = JSON.parse(await readFile(join(out, 'live-result.json'), 'utf8'));
    } else response = await page.evaluate(({ tool, args }) => window.modelCall(tool, args), { tool, args: { ...args, values: { moisture: 31, ec: 2.1, ph: 5.9, note: 'leaf edge curl' } } });
    assert.equal(response.error, undefined, JSON.stringify(response)); assert.equal(response.result.isError, false, JSON.stringify(response));
    assert.match(response.result.structuredContent.receipt, /accepted \(entry 231\)/); assert.equal(response.result.structuredContent.identity.item, '22');
    assert.equal(operator.signatures(), 1); assert.equal(operator.submitted.length, 1);
    assert.deepEqual(operator.submitted[0].intent.fields, { moisture: 31, ec: 2100, ph: 590, note: 'leaf edge curl' });
    assert.deepEqual(operator.submitted[0].intent.expected, { on: 3 }); assert.equal(operator.submitted[0].intent.kind, 'probe'); assert.equal(operator.submitted[0].intent.on, 45);
    await app.getByRole('heading', { name: 'A1', exact: true }).waitFor(); await app.getByText(/accepted \(entry 231\)/).waitFor(); await capture(page, app, `carousel-next-${width}.png`);
    if (!live) {
      const duplicate = await page.evaluate(({ tool, args }) => window.modelCall(tool, args), { tool, args: { ...args, values: { moisture: 31, ec: 2.1, ph: 5.9, note: 'leaf edge curl' } } });
      assert.deepEqual(duplicate.result, response.result); assert.equal(operator.signatures(), 1);
    }
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor(); await contained(app);
    assert.equal(await cell().getAttribute('data-value'), '31'); assert.equal(await cell().getAttribute('data-stale'), 'false'); assert.equal(await cell().locator('.age').innerText(), '0m');
    await capture(page, app, `moisture-new-${width}.png`);
    await app.getByRole('button', { name: 'Scouting', exact: true }).click(); assert.equal(await cell().getAttribute('data-value'), 'leaf edge curl'); assert.equal(await cell().locator('.age').innerText(), '0m');
    await capture(page, app, `scouting-new-${width}.png`);
    const layout = await app.locator('html').evaluate(root => ({ width: root.clientWidth, overflow: root.scrollWidth > root.clientWidth })); assert.equal(layout.width, width); assert.equal(layout.overflow, false);
    const proof = await page.evaluate(() => proof); assert.deepEqual(proof.errors, []); assert.deepEqual(errors, []); assert.equal(proof.chat.length, 1); assert.equal(proof.calls.filter(call => call.name === 'view_act').length, 0);
    assert.ok(!/sources|leaf edge curl|baseline|moistureTime/.test(JSON.stringify(proof.contexts)), 'Only context/identity/receipt, no raw card data, reaches the model');
    assert.ok(proof.sizes.length > 1); assert.equal(operator.signatures(), 1); assert.equal(operator.submitted.length, 1);
    const replay = await session.scope.replay(); assert.equal(replay.report.result, 'consistent'); assert.equal(replay.why, null);
    await writeFile(join(out, `proof-${width}.json`), JSON.stringify({ prompt, response, proof, signed: operator.submitted, replay: replay.report.result }, null, 2));
    report.cases.push({ width, signatures: 1, nativeKind: 'probe', nativeItem: 45, nativeRevision: 3, entry: 231, next: 22, moisture: '25 at 2d → 31 at 0m', scouting: 'baseline at 2d → leaf edge curl at 0m', insectFallback: '0 insects is present; later insect time wins beside an older note', temperature: '24 °C at 0m', quietLayerRefresh: true, privateReads: 'app-only', replay: 'consistent', layout, errors });
    await page.close();
  }
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch (error) {
  for (const context of browser?.contexts() ?? []) for (const page of context.pages()) {
    try { const app = page.frameLocator('#frame').frameLocator('iframe'); await writeFile(join(out, 'failure.json'), JSON.stringify({ text: await app.locator('html').innerText(), proof: await page.evaluate(() => proof) }, null, 2)); await page.screenshot({ path: join(out, 'failure.png'), fullPage: true }); } catch {}
  }
  throw error;
} finally { await browser?.close(); await host?.close(); session?.close(); await rm(root, { recursive: true, force: true }); }
