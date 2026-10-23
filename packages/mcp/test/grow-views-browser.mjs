// G1 UI witness: production kit/resources/MCP custody and real local Core/SQLite.
// Install, read-session and standing ports are scripted TEST fixtures. The
// Site and Room are actual Core/SQLite Lane births in one owned path.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startViewsHost } from './support/views-host.ts';
import { prepareGrowCheck } from '../../../examples/grow/prepare-check.ts';
import { prepareApplicationDirectory } from '../../cli/src/application-files.ts';
import { openOwnedGrowScenario } from './support/grow-owned-session.ts';
import { secretSigner } from '@generalbusiness/dap-client';
import { growOperator } from './support/grow-operator.ts';
const { PLAYWRIGHT_CORE, CHROMIUM, VIEW_CAPTURE_OUT: out } = process.env;
assert.ok(PLAYWRIGHT_CORE && CHROMIUM && out && /^\/(?:private\/)?tmp\//.test(out));
const require = createRequire(join(PLAYWRIGHT_CORE, 'package.json'));
assert.equal(require('playwright-core/package.json').version, '1.63.0');
const { chromium } = require('playwright-core');
const root = await prepareGrowCheck(); let session, host, browser, operator;
const report = { browserPlugin: 'Browser plugin not available; cached pinned Playwright fallback', authority: 'One actual Core/SQLite Site-to-Room creation and ownership path, with explicit TEST grants and manual delivery of recorded native sends. Directory launcher, installation lookup, read sessions and standing are fixtures. Real MCP custody and native target judgment; separate sensor/agent actors. No device execution, provider or host installation-admission claim.', cases: [] };
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
  const original = JSON.parse(await readFile(new URL('./support/grow-owned-fault-scenario.json', import.meta.url), 'utf8')), open = structuredClone(original);
  const opened = open.steps.findIndex(step => step.act?.kind === 'open-incident' && step.expect.answer === 'accepted');
  assert.ok(opened > 0); open.steps = open.steps.slice(0, opened + 1);
  host = await startViewsHost({ declared: async base => {
    operator = growOperator(packet, session);
    return { ...base, service: operator.service };
  } });
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true }); report.browser = browser.version(); await mkdir(out, { recursive: true });
  for (const width of (process.env.GROW_VIEW_WIDTH ? [Number(process.env.GROW_VIEW_WIDTH)] : [320, 592])) {
    session?.close(); session = await openOwnedGrowScenario(packet, open);
    const page = await browser.newPage({ viewport: { width: width + 32, height: 1100 } }), errors = [];
    page.on('pageerror', error => errors.push(String(error))); page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(host.url + '/?fixture=declared&screen=site'); assert.match(await page.title(), /S2 card fixture host/);
    const app = page.frameLocator('#frame').frameLocator('iframe');
    await app.getByRole('heading', { name: 'Grow site', exact: true }).waitFor();
    await app.getByText('Native head 4 · 1 room', { exact: true }).waitFor();
    await capture(page, app, `site-open-${width}.png`);
    await app.getByRole('button', { name: 'Open Room A', exact: true }).click();
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
    await app.getByRole('heading', { name: 'Mean temperature history', exact: true }).waitFor();
    assert.equal(await app.locator('.native-series svg circle').count(), 2);
    await app.locator('.series-fallback').filter({ hasText: 'Latest 26.5 °C at 2026-10-18T12:05:00Z' }).waitFor();
    await app.locator('.native-series summary').click();
    assert.equal(await app.locator('.native-series li').count(), 2);
    assert.match(await app.locator('.native-series li').first().innerText(), /^24 °C at 2026-10-18T12:00:00Z \(entry \d+\)$/);
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
    assert.deepEqual({ target: session.scope.state.item(10).values.target, reported: session.scope.state.item(10).values.reported }, { target: 'off', reported: null });
    await capture(page, app, `receipt-${width}.png`);
    const accepted = async (name, kind, on, fields, subjects) => {
      const answer = await operator.nativeAct(name, kind, on, fields, subjects); assert.equal(answer.answer, 'accepted', JSON.stringify(answer)); return answer.receipt.fact;
    };
    await accepted('sensors', 'report-device', 10, { reported: 'off', level: 0, description: '' }, { on: 10 });
    await accepted('sensors', 'report-device', 8, { reported: 'open', level: 100, description: '' }, { on: 8 });
    await operator.advance('2026-10-18T12:10:00Z');
    const zones = [2, 7, 12, 17].map(zone => ({ zone, min: 2300, max: 2500, mean: 2400, inBand: 25 }));
    const cool = await accepted('sensors', 'observe', null, { sampledAt: '2026-10-18T12:10:00Z', zones }, {});
    await accepted('sensors', 'report-zone', 7, { summary: cool, sampledAt: '2026-10-18T12:10:00Z', zones, min: 2300, max: 2500, mean: 2400, inBand: 25 }, { on: 7 });
    await accepted('climate', 'propose-restoration', 137, { text: 'Vent 2 is responding.', proposal: 'Restore heater 2?' }, { on: 137, zone: 7, vent: 8 });
    await app.getByRole('heading', { name: 'Vent 2 is responding.', exact: true }).waitFor();
    await app.getByRole('button', { name: 'Authorize', exact: true }).click();
    await app.getByText(/accepted \(entry \d+\)/).waitFor();
    assert.equal(operator.signatures(), 2); assert.equal(operator.submitted.length, 2);
    assert.equal(session.scope.state.item(10).values.target, 'on'); assert.equal(session.scope.state.item(10).values.reported, 'off');
    await accepted('sensors', 'report-device', 10, { reported: 'on', level: 100, description: '' }, { on: 10 });
    const closed = await accepted('climate', 'close-incident', 137, { incident: 138 }, { on: 137, incident: 138, zone: 7 });
    await app.getByRole('button', { name: /Back/ }).click(); await page.evaluate(() => window.scrollTo(0, 0));
    await app.getByText(new RegExp(`Incident 138 closed · entries 137–${closed.seq}`)).waitFor();
    await app.getByRole('button', { name: 'Open incident record', exact: true }).click(); await app.getByRole('heading', { name: 'closed', exact: true }).waitFor();
    await capture(page, app, `closed-same-flow-${width}.png`);
    assert.equal(session.scope.state.item(138).refs.first, 137); assert.equal(session.scope.state.item(138).refs.last, closed.seq);
    await app.getByRole('button', { name: /Back/ }).click();
    await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor(); await contained(app);
    await app.locator('#zones').getByRole('button', { name: /^Zone 2:/ }).click();
    await app.getByRole('heading', { name: 'Zone 2', exact: true }).waitFor(); await contained(app);
    assert.equal(await app.locator('.native-series svg circle').count(), 3);
    await app.locator('.series-fallback').filter({ hasText: 'Latest 24 °C at 2026-10-18T12:10:00Z' }).waitFor();
    await app.getByRole('button', { name: 'Open heater controls', exact: true }).click();
    await app.getByRole('heading', { name: /^heater 2$/i }).waitFor();
    const fixed = async (label, kind, on, fields) => {
      const seq = session.scope.state.scope().head.seq + 1, revision = session.scope.state.item(on).revision + 1;
      await app.getByRole('button', { name: label, exact: true }).click();
      await app.getByText(`accepted (entry ${seq})`, { exact: false }).waitFor();
      // The receipt precedes the host's post-act refresh. Chaining another
      // click requires the new native target/revision and the idle card.
      await app.getByText(`target: ${fields.target}`, { exact: true }).waitFor();
      await app.locator('.eyebrow code.revision').filter({ hasText: new RegExp(`^${revision}$`) }).waitFor();
      await app.locator('#card-root[aria-busy=false]').waitFor();
      assert.deepEqual(operator.submitted.at(-1).intent.fields, fields);
      assert.equal(operator.submitted.at(-1).intent.kind, kind); assert.equal(operator.submitted.at(-1).intent.on, on);
    };
    await fixed('Turn heater off', 'set-heater', 10, { target: 'off', level: 0 });
    assert.equal(session.scope.state.item(10).values.target, 'off'); assert.equal(session.scope.state.item(10).values.reported, 'on');
    await capture(page, app, `heater-manual-${width}.png`);
    await fixed('Turn heater on', 'set-heater', 10, { target: 'on', level: 100 });
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Zone 2', exact: true }).waitFor();
    await app.getByRole('button', { name: 'Open vent controls', exact: true }).click(); await app.getByRole('heading', { name: /^vent 2$/i }).waitFor();
    await capture(page, app, `vent-manual-${width}.png`);
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Zone 2', exact: true }).waitFor();
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor(); await contained(app);
    await app.locator('#zones').getByRole('button', { name: /^Zone 1:/ }).click();
    await app.getByRole('heading', { name: 'Zone 1', exact: true }).waitFor(); await contained(app);
    await app.getByRole('button', { name: 'Open vent controls', exact: true }).click(); await app.getByRole('heading', { name: /^vent 1$/i }).waitFor();
    await fixed('Close vent', 'set-vent', 3, { target: 'closed', level: 0 });
    await fixed('Open vent', 'set-vent', 3, { target: 'open', level: 100 });
    assert.equal(operator.signatures(), 6); assert.equal(operator.submitted.length, 6);
    await session.reportSite('2026-10-18T12:10:00Z');
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Zone 1', exact: true }).waitFor();
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor();
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Grow site', exact: true }).waitFor();
    await app.getByText('Native head 5 · 1 room', { exact: true }).waitFor();
    await app.getByText('Active · 0 open alerts', { exact: true }).waitFor();
    await capture(page, app, `site-closed-${width}.png`);
    const replay = await session.scope.replay(); assert.equal(replay.report.result, 'consistent'); assert.equal(replay.why, null);
    const finalProof = await page.evaluate(() => window.proof); assert.ok(!JSON.stringify(finalProof.contexts).includes('sources')); assert.deepEqual(finalProof.errors, []); assert.deepEqual(finalProof.chat, []); assert.deepEqual(errors, []);
    for (let n = 1; n < finalProof.contexts.length; n++) assert.notDeepEqual(finalProof.contexts[n], finalProof.contexts[n - 1], 'Unchanged private refreshes keep model context quiet');
    report.cases.push({ width, site: session.site.at, room: session.scope.at, head: session.scope.developmentProjection('grid').at.seq, nativeOwnedSiteToRoom: true, nativeManualDeviceControls: true, freshSiteClosure: true, nativeZoneHistory: { openSamples: 2, closedSamples: 3, sourceTimes: true }, benches: 100, alertAtTop: true, sensorDescriptions: true, genericAlertControls: ['Authorize', 'Hold 60 s'], zonePointerNavigationAfterResize: true, capture: 'Outer viewport temporarily expanded for nested-frame rasterization; restored to 1100 px before interactions', measured, operatorIntents: operator.submitted.map(signed => ({ kind: signed.intent.kind, on: signed.intent.on, expected: signed.intent.expected })), targetSeparateFromReport: true, closedIncident: { first: 137, last: closed.seq }, replay: replay.report.result });
    await page.close();
  }
  const previous = session; session = await openOwnedGrowScenario(packet, original); previous.close();
  const page = await browser.newPage({ viewport: { width: 422, height: 1000 } }); await page.goto(host.url + '/?fixture=declared&screen=site');
  const app = page.frameLocator('#frame').frameLocator('iframe');
  await app.getByRole('button', { name: 'Open Room A', exact: true }).click();
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
} finally { await browser?.close(); await host?.close(); session?.close(); await rm(root, { recursive: true, force: true }); }
