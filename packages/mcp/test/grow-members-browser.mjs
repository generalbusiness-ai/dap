// Actual maintained Grow HTML, owned Core/SQLite probes and kit in Chromium.
// Membership display, grants, sessions and installation are explicit TEST
// stand-ins. Real membership/session authority has a separate native case.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalize, textDigest } from '@generalbusiness/dap-bytes';
import { secretSigner } from '@generalbusiness/dap-client';
import { prepareGrowCheck } from '../../../examples/grow/prepare-check.ts';
import { prepareApplicationDirectory } from '../../cli/src/application-files.ts';
import { openOwnedGrowScenario } from './support/grow-owned-session.ts';
import { growOperator } from './support/grow-operator.ts';
import { startViewsHost } from './support/views-host.ts';

const { PLAYWRIGHT_CORE, CHROMIUM, VIEW_CAPTURE_OUT: out } = process.env;
assert.ok(PLAYWRIGHT_CORE && CHROMIUM && out && /^\/(?:private\/)?tmp\//.test(out));
const require = createRequire(join(PLAYWRIGHT_CORE, 'package.json'));
assert.equal(require('playwright-core/package.json').version, '1.63.0');
const { chromium } = require('playwright-core');
const root = await prepareGrowCheck(); let session, operator, browser, host, activePage;
const report = { browserPlugin: 'Browser plugin unavailable; independently copied pinned Playwright fallback',
  authority: 'Actual owned Core/SQLite, native probe entries, maintained Grow package HTML and kit. Scripted membership identity/controller, TEST grants, install and session ports. No production packet signing, native enrollment, provider or hosted acceptance.', cases: [] };
try {
  await mkdir(out, { recursive: true });
  const { packet } = await prepareApplicationDirectory(root, secretSigner(new Uint8Array(32).fill(254)));
  const scene = JSON.parse(await readFile(new URL('./support/grow-owned-fault-scenario.json', import.meta.url), 'utf8'));
  const raised = scene.steps.findIndex(step => step.act?.kind === 'raise-alert' && step.expect?.answer === 'accepted');
  assert.ok(raised > 0); scene.steps = scene.steps.slice(0, raised + 1);
  scene.actors.sensors.actions.push('grow.tend'); // Explicit TEST grant, never a package or roster inference.
  scene.actors.sensors.member = '@sensors'; scene.actors.operator.member = '@rita';
  scene.actors.climate.member = '@climate'; scene.actors.day.member = '@person-prober';
  host = await startViewsHost({ declared: async base => ({ ...base, service: operator.service }) });
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true }); report.browser = browser.version();
  for (const width of [390, 592]) {
    session?.close(); session = await openOwnedGrowScenario(packet, scene);
    const who = name => session.actors.find(actor => actor.name === name).member;
    const sensor = who('sensors'), owner = who('operator'), person = who('day'), climate = who('climate');
    const at = { seq: 9, hash: textDigest('PUBLIC TEST scripted membership display head') };
    const members = async scope => {
      assert.equal(canonicalize(scope), canonicalize(sensor.membership));
      return { scope, at, roster: { at, item: { id: 0, type: 'roster', state: 'open', revision: 1, opened: at.hash, attributed: at.hash, parties: {}, refs: {},
        values: { memberActions: ['grow.tend'], agentActions: ['grow.climate', 'grow.sense', 'grow.tend'] } } },
        members: [[owner, 'person', null], [sensor, 'agent', owner], [person, 'person', null], [climate, 'agent', owner]].map(([member, kind, controller], i) => ({
        id: i + 1, type: 'member', state: 'active', revision: 1, opened: at.hash, attributed: at.hash,
        values: { handle: member.member, kind, role: kind === 'agent' ? 'agent' : 'member' }, refs: {}, parties: { member, controller },
      })) };
    };
    operator = growOperator(packet, session, 'grow.tend', 'sensors', members);
    const accept = async (name, kind, on, fields, subjects) => {
      const result = await operator.nativeAct(name, kind, on, fields, subjects);
      assert.equal(result.answer, 'accepted', JSON.stringify(result)); return result.receipt.fact;
    };
    const sensorFact = await accept('sensors', 'probe', 45, { moisture: 31 }, { on: 45 });
    const personFact = await accept('day', 'probe', 46, { moisture: 45 }, { on: 46 });
    const alert = { seq: session.scope.developmentProjection('grid').sources.alert[0].id };
    const page = await browser.newPage({ viewport: { width: width + 32, height: 1100 } }), errors = [];
    activePage = page;
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.clock.setFixedTime(session.time);
    await page.goto(host.url + '/?fixture=declared&screen=grid&scope=' + encodeURIComponent(JSON.stringify(session.scope.at)));
    const app = page.frameLocator('#frame').frameLocator('iframe');
    await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor();
    assert.equal(await app.locator('.bench').count(), 100);
    await app.locator('#choose-bench').selectOption('45');
    await app.locator('#selection').getByText('@sensors', { exact: true }).waitFor();
    await app.locator('#selection').getByText('agent · controlled by @rita · role agent', { exact: true }).waitFor();
    await page.screenshot({ path: join(out, `grow-sensors-${width}.png`), fullPage: true });
    await app.locator('#choose-bench').selectOption('46');
    await app.locator('#selection').getByText('@person-prober', { exact: true }).waitFor();
    await app.locator('#selection').getByText('person · role member', { exact: true }).waitFor();
    await page.screenshot({ path: join(out, `grow-person-${width}.png`), fullPage: true });
    await app.locator('#choose-bench').selectOption('47');
    await app.locator('#selection').getByText(/Last prober unavailable/).waitFor();
    await page.screenshot({ path: join(out, `grow-unavailable-${width}.png`), fullPage: true });
    await page.goto(host.url + '/?fixture=declared&screen=alert-record&scope=' + encodeURIComponent(JSON.stringify(session.scope.at)) + '&items=' + encodeURIComponent(JSON.stringify({ alert: alert.seq })));
    await app.getByText('@climate', { exact: true }).first().waitFor();
    await app.getByText('agent · controlled by @rita · role agent', { exact: true }).first().waitFor();
    assert.equal(await app.locator('vite-error-overlay,nextjs-portal').count(), 0); assert.deepEqual(errors, []);
    await page.screenshot({ path: join(out, `grow-alert-agent-${width}.png`), fullPage: true });
    assert.equal(operator.signatures(), 0);
    report.cases.push({ width, benches: 100, sensorFact, personFact, raisingAgent: climate, controller: owner, signatures: 0, errors });
    await page.close();
  }
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch (error) {
  const selection = await activePage?.frameLocator('#frame').frameLocator('iframe').locator('#selection').textContent({ timeout: 1000 }).catch(() => null);
  await writeFile(join(out, 'failure.json'), JSON.stringify({ error: String(error.stack ?? error), selection }, null, 2) + '\n');
  await activePage?.screenshot({ path: join(out, 'failure.png'), fullPage: true, timeout: 5000 }).catch(() => {});
  throw error;
} finally { session?.close(); await browser?.close(); await host?.close(); await rm(root, { recursive: true, force: true }); }
