// G1 UI witness: production kit/resources/MCP custody and real local Core/SQLite.
// Install, read-session and standing ports are scripted TEST fixtures. The
// developer Room is a Directory root, not a native child-ownership witness.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startViewsHost } from './support/views-host.ts';
import { prepareGrowCheck } from '../../../examples/grow/prepare-check.ts';
import { prepareApplicationDirectory, readApplicationScenario } from '../../cli/src/application-files.ts';
import { openApplicationScenario } from '../../cli/src/application-scenarios.ts';
import { secretSigner } from '@generalbusiness/artroom-client';
import { growOperator } from './support/grow-operator.ts';
const { PLAYWRIGHT_CORE, CHROMIUM, VIEW_CAPTURE_OUT: out } = process.env;
assert.ok(PLAYWRIGHT_CORE && CHROMIUM && out && /^\/(?:private\/)?tmp\//.test(out));
const require = createRequire(join(PLAYWRIGHT_CORE, 'package.json'));
assert.equal(require('playwright-core/package.json').version, '1.63.0');
const { chromium } = require('playwright-core');
const root = await prepareGrowCheck(); let session, host, browser, operator;
const report = { browserPlugin: 'Browser plugin not available; cached pinned Playwright fallback', authority: 'Local Core/SQLite with scripted TEST grants and developer Directory root; installation, read session and standing are stand-ins. Real MCP operator custody and native target judgment. Sensor/agent inputs use separate public TEST actors. No device execution or native child ownership claim.', cases: [] };
async function contained(app) {
  await app.locator('#card-root').evaluate(async root => { for (let n = 0; n < 90; n++) { await new Promise(resolve => requestAnimationFrame(resolve)); if (window.innerHeight >= Math.ceil(root.getBoundingClientRect().height)) return; } throw Error('The host did not resize to its card'); });
}
async function capture(page, app, name) {
  await contained(app);
  const viewport = page.viewportSize(), height = await app.locator('#card-root').evaluate(root => Math.ceil(root.getBoundingClientRect().height));
  // Chromium can leave off-screen nested-frame pixels unpainted in a fullPage
  // capture. Expand only the outer capture viewport, then restore it before
  // the next interaction. Card width and its reported content height stay fixed.
  await page.setViewportSize({ ...viewport, height: Math.max(viewport.height, height + 80) });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: join(out, name), fullPage: true });
  await page.setViewportSize(viewport);
  await contained(app);
}
try {
  const { packet } = await prepareApplicationDirectory(root, secretSigner(new Uint8Array(32).fill(254)));
  const original = await readApplicationScenario(root, 'fault-scenario.json'), open = structuredClone(original);
  const opened = open.steps.findIndex(step => step.act?.kind === 'open-incident' && step.expect.answer === 'accepted');
  assert.ok(opened > 0); open.steps = open.steps.slice(0, opened + 1);
  host = await startViewsHost({ declared: async base => {
    operator = growOperator(packet, session);
    return { ...base, service: operator.service };
  } });
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true }); report.browser = browser.version(); await mkdir(out, { recursive: true });
  for (const width of (process.env.GROW_VIEW_WIDTH ? [Number(process.env.GROW_VIEW_WIDTH)] : [320, 592])) {
    session?.scope.close(); session = await openApplicationScenario(packet, open);
    const page = await browser.newPage({ viewport: { width: width + 32, height: 1100 } }), errors = [];
    page.on('pageerror', error => errors.push(String(error))); page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(host.url + '/?fixture=declared&screen=grid'); assert.match(await page.title(), /S2 card fixture host/);
    const app = page.frameLocator('#frame').frameLocator('iframe');
    await app.getByRole('heading', { name: 'Operator authorization needed', exact: true }).waitFor();
    await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor();
    assert.equal(await app.locator('.bench').count(), 100);
    await app.getByText(/sensor report/, { exact: false }).first().waitFor();
    await capture(page, app, `grid-open-${width}.png`);
    await app.getByRole('button', { name: 'Open alert', exact: true }).click();
    await app.getByRole('heading', { name: 'Zone 2 hot; vent jammed and fan tripped.', exact: true }).waitFor();
    await app.getByRole('button', { name: 'Authorize', exact: true }).waitFor(); await app.getByRole('button', { name: 'Hold 60 s', exact: true }).waitFor();
    await capture(page, app, `alert-${width}.png`);
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor();
    // Busy=false does not mean the parent has applied the new height yet.
    await contained(app);
    const zoneButton = app.locator('#zones').getByRole('button', { name: /^Zone 2:/ });
    const zoneBox = await zoneButton.boundingBox(); assert.ok(zoneBox);
    await page.evaluate(y => window.scrollBy(0, y - window.innerHeight / 2), zoneBox.y);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const clickBox = await zoneButton.boundingBox(); assert.ok(clickBox);
    assert.equal(await page.evaluate(box => document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.tagName, clickBox), 'IFRAME');
    await zoneButton.click(); await app.getByRole('heading', { name: 'Zone 2', exact: true }).waitFor();
    await app.getByText('Mean: 26.5 °C', { exact: true }).waitFor();
    await app.getByText('Minimum: 23 °C', { exact: true }).waitFor();
    await app.getByText('Maximum: 27.4 °C', { exact: true }).waitFor();
    await capture(page, app, `zone-${width}.png`);
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor(); await contained(app); await page.evaluate(() => window.scrollTo(0, 0));
    await app.getByRole('button', { name: 'Open alert', exact: true }).click(); await app.getByRole('button', { name: 'Authorize', exact: true }).waitFor();
    const measured = await app.locator('html').evaluate(root => ({ width: root.clientWidth, overflow: root.scrollWidth > root.clientWidth })); assert.equal(measured.width, width); assert.equal(measured.overflow, false);
    const proof = await page.evaluate(() => window.proof); assert.ok(!JSON.stringify(proof.contexts).includes('sources')); assert.deepEqual(proof.errors, []); assert.deepEqual(proof.chat, []); assert.deepEqual(errors, []);
    assert.equal(proof.calls.filter(call => call.name === 'view_act').length, 0);
    assert.equal(operator.signatures(), 0);
    await app.getByRole('button', { name: 'Authorize', exact: true }).click();
    await app.getByText(/accepted \(entry \d+\)/).waitFor();
    await app.getByText('state: authorized', { exact: true }).waitFor();
    assert.equal(operator.signatures(), 1); assert.equal(operator.submitted.length, 1);
    assert.equal(await app.getByRole('button', { name: /Back/ }).count(), 1, 'An accepted record retains detail and Back');
    assert.deepEqual({ target: session.scope.state.item(9).values.target, reported: session.scope.state.item(9).values.reported }, { target: 'off', reported: null });
    await capture(page, app, `receipt-${width}.png`);
    const accepted = async (name, kind, on, fields, subjects) => {
      const answer = await operator.nativeAct(name, kind, on, fields, subjects); assert.equal(answer.answer, 'accepted', JSON.stringify(answer)); return answer.receipt.fact;
    };
    await accepted('sensors', 'report-device', 9, { reported: 'off', level: 0, description: '' }, { on: 9 });
    await accepted('sensors', 'report-device', 7, { reported: 'open', level: 100, description: '' }, { on: 7 });
    await operator.advance('2026-10-18T12:10:00Z');
    const zones = [1, 6, 11, 16].map(zone => ({ zone, min: 2300, max: 2500, mean: 2400, inBand: 25 }));
    const cool = await accepted('sensors', 'observe', null, { sampledAt: '2026-10-18T12:10:00Z', zones }, {});
    await accepted('sensors', 'report-zone', 6, { summary: cool, sampledAt: '2026-10-18T12:10:00Z', zones, min: 2300, max: 2500, mean: 2400, inBand: 25 }, { on: 6 });
    await accepted('climate', 'propose-restoration', 136, { text: 'Vent 2 is responding.', proposal: 'Restore heater 2?' }, { on: 136, zone: 6, vent: 7 });
    await app.getByRole('heading', { name: 'Vent 2 is responding.', exact: true }).waitFor();
    await app.getByRole('button', { name: 'Authorize', exact: true }).click();
    await app.getByText(/accepted \(entry \d+\)/).waitFor();
    assert.equal(operator.signatures(), 2); assert.equal(operator.submitted.length, 2);
    assert.equal(session.scope.state.item(9).values.target, 'on'); assert.equal(session.scope.state.item(9).values.reported, 'off');
    await accepted('sensors', 'report-device', 9, { reported: 'on', level: 100, description: '' }, { on: 9 });
    const closed = await accepted('climate', 'close-incident', 136, { incident: 137 }, { on: 136, incident: 137, zone: 6 });
    await app.getByRole('button', { name: /Back/ }).click(); await page.evaluate(() => window.scrollTo(0, 0));
    await app.getByText(new RegExp(`Incident 137 closed · entries 136–${closed.seq}`)).waitFor();
    await app.getByRole('button', { name: 'Open incident record', exact: true }).click(); await app.getByRole('heading', { name: 'closed', exact: true }).waitFor();
    await capture(page, app, `closed-same-flow-${width}.png`);
    assert.equal(session.scope.state.item(137).refs.first, 136); assert.equal(session.scope.state.item(137).refs.last, closed.seq);
    const replay = await session.scope.replay(); assert.equal(replay.report.result, 'consistent'); assert.equal(replay.why, null);
    const finalProof = await page.evaluate(() => window.proof); assert.ok(!JSON.stringify(finalProof.contexts).includes('sources')); assert.deepEqual(finalProof.errors, []); assert.deepEqual(finalProof.chat, []); assert.deepEqual(errors, []);
    for (let n = 1; n < finalProof.contexts.length; n++) assert.notDeepEqual(finalProof.contexts[n], finalProof.contexts[n - 1], 'Unchanged private refreshes keep model context quiet');
    report.cases.push({ width, head: session.scope.developmentProjection('grid').at.seq, benches: 100, alertAtTop: true, sensorDescriptions: true, genericAlertControls: ['Authorize', 'Hold 60 s'], zonePointerNavigationAfterResize: true, capture: 'Outer viewport temporarily expanded for nested-frame rasterization; restored to 1100 px before interactions', measured, operatorIntents: operator.submitted.map(signed => ({ kind: signed.intent.kind, on: signed.intent.on, expected: signed.intent.expected })), targetSeparateFromReport: true, closedIncident: { first: 136, last: closed.seq }, replay: replay.report.result });
    await page.close();
  }
  const previous = session; session = await openApplicationScenario(packet, original); previous.scope.close();
  const page = await browser.newPage({ viewport: { width: 422, height: 1000 } }); await page.goto(host.url + '/?fixture=declared&screen=grid');
  const app = page.frameLocator('#frame').frameLocator('iframe');
  await app.getByText(/Incident \d+ closed · entries \d+–\d+/, { exact: false }).waitFor(); await contained(app);
  await capture(page, app, 'grid-closed-390.png');
  await app.getByRole('button', { name: 'Open incident record', exact: true }).click();
  await app.getByRole('heading', { name: 'closed', exact: true }).waitFor(); await contained(app);
  await capture(page, app, 'incident-390.png');
  report.cases.push({ width: 390, separateClosedScene: true, head: session.scope.developmentProjection('grid').at.seq, closedIncidentRecord: true });
  await page.close(); await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch (error) {
  for (const context of browser?.contexts() ?? []) for (const page of context.pages()) {
    try { const app = page.frameLocator('#frame').frameLocator('iframe'); await writeFile(join(out, 'failure.json'), JSON.stringify({ text: await app.locator('html').innerText(), proof: await page.evaluate(() => window.proof) }, null, 2)); await page.screenshot({ path: join(out, 'failure.png'), fullPage: true }); } catch {}
  }
  throw error;
} finally { await browser?.close(); await host?.close(); session?.scope.close(); await rm(root, { recursive: true, force: true }); }
