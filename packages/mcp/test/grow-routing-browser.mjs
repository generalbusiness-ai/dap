// G3: actual kit, owned Core/SQLite Site/Rooms and MCP custody. Installation,
// membership, sessions and held grants are TEST ports. The report call is a
// scripted typed-text consumer, not an LLM, provider or device execution.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalize } from '@generalbusiness/dap-bytes';
import { secretSigner } from '@generalbusiness/dap-client';
import { prepareGrowCheck } from '../../../examples/grow/prepare-check.ts';
import { prepareApplicationDirectory } from '../../cli/src/application-files.ts';
import { openOwnedGrowScenario } from './support/grow-owned-session.ts';
import { growOperator } from './support/grow-operator.ts';
import { startViewsHost } from './support/views-host.ts';
import { viewInputToolName } from '../src/views/names.ts';

const { PLAYWRIGHT_CORE, CHROMIUM, VIEW_CAPTURE_OUT: out } = process.env;
assert.ok(PLAYWRIGHT_CORE && CHROMIUM && out && /^\/(?:private\/)?tmp\//.test(out));
const require = createRequire(join(PLAYWRIGHT_CORE, 'package.json'));
assert.equal(require('playwright-core/package.json').version, '1.63.0');
const { chromium } = require('playwright-core');
const root = await prepareGrowCheck(); let session, viewer, browser, host;
const title = "Check vent 2's actuator in Room A, zone 2.";
const report = { browserPlugin: 'Browser plugin unavailable; cached pinned Playwright fallback',
  model: 'Scripted report-text consumer; no LLM backend',
  authority: 'Actual owned Core/SQLite Site/Rooms, MCP signatures, custody and replay; TEST installation, membership, sessions and grants. No provider or device execution.', cases: [] };
async function contained(app) {
  await app.locator('#card-root').evaluate(async root => {
    for (let i = 0; i < 90; i++) { await new Promise(resolve => requestAnimationFrame(resolve)); if (innerHeight >= Math.ceil(root.getBoundingClientRect().height)) return; }
    throw Error('Host did not apply card height');
  });
}
async function layout(app, width) {
  await contained(app);
  const value = await app.locator('html').evaluate(root => ({ width: root.clientWidth, overflow: root.scrollWidth > root.clientWidth }));
  assert.equal(value.width, width); assert.equal(value.overflow, false); return value;
}
async function capture(page, app, name) {
  await contained(app); const viewport = page.viewportSize(), height = await app.locator('#card-root').evaluate(root => Math.ceil(root.getBoundingClientRect().height));
  await page.setViewportSize({ ...viewport, height: Math.max(viewport.height, height + 80) });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: join(out, name), fullPage: true }); await page.setViewportSize(viewport); await contained(app);
}
try {
  await mkdir(out, { recursive: true });
  const { packet } = await prepareApplicationDirectory(root, secretSigner(new Uint8Array(32).fill(254)));
  const original = JSON.parse(await readFile(new URL('./support/grow-owned-fault-scenario.json', import.meta.url), 'utf8'));
  host = await startViewsHost({ declared: async base => ({ ...base, service: viewer.service }) });
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true }); report.browser = browser.version();
  for (const width of (process.env.GROW_VIEW_WIDTH ? [Number(process.env.GROW_VIEW_WIDTH)] : [320, 592])) {
    session?.close();
    const scene = structuredClone(original), end = scene.steps.findIndex(step => step.act?.kind === 'offer-task');
    assert.ok(end > 0); scene.steps = scene.steps.slice(0, end + 1); scene.steps[end].act.fields.text = title;
    session = await openOwnedGrowScenario(packet, scene);
    const people = { day: growOperator(packet, session, 'grow.tend', 'day'), operator: growOperator(packet, session, 'grow.heat', 'operator'), head: growOperator(packet, session, 'grow.water-more', 'head') };
    const { day, operator, head } = people; await day.advance(session.time);
    const task = session.scope.state.page('task', ['offered'], null, 32).items[0];
    const bench = session.scope.state.page('bench', ['fresh', 'stale'], null, 100).items.find(item => item.values.label === 'D4');
    assert.ok(task && bench && typeof bench.refs.zone === 'number');
    const probe = await day.nativeAct('day', 'probe', bench.id, { ec: 2800 }, { on: bench.id }); assert.equal(probe.answer, 'accepted');
    const ask = async reason => {
      const answer = await head.nativeAct('irrigation', 'request-watering', null,
        { zone: bench.refs.zone, bench: bench.id, basis: probe.receipt.fact, amountMl: 800, reason }, { zone: bench.refs.zone, bench: bench.id });
      assert.equal(answer.answer, 'accepted', JSON.stringify(answer)); return session.scope.state.page('watering', ['asked'], null, 32).items.at(-1);
    };
    const request = await ask('High EC on D4; request early watering.');
    const roomA = session.site.state.page('room', ['active'], null, 3).items.find(item => canonicalize(item.refs.scope) === canonicalize(session.scope.at)); assert.ok(roomA);
    const roomB = await session.createRoom('Room B');
    const provision = async name => {
      const member = session.actors.find(actor => actor.name === name).member;
      const result = await day.nativeAct('operator', 'provision-presence', null, { member }, {}, 'site');
      assert.equal(result.answer, 'accepted', JSON.stringify(result)); return result.receipt.fact.seq;
    };
    const errors = [], proofs = {};
    const pageFor = async (name, screen) => {
      viewer = people[name]; const page = await browser.newPage({ viewport: { width: width + 32, height: 1100 } });
      page.on('pageerror', error => errors.push(String(error))); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.clock.setFixedTime(session.time);
      await page.goto(host.url + '/?fixture=declared&screen=' + screen + '&scope=' + encodeURIComponent(JSON.stringify(session.scope.at)));
      return { page, app: page.frameLocator('#frame').frameLocator('iframe') };
    };
    const save = async (name, page) => { proofs[name] = await page.evaluate(() => proof); assert.deepEqual(proofs[name].errors, []); await page.close(); };

    const tender = await pageFor('day', 'tasks'), { page, app } = tender;
    await app.getByRole('heading', { name: 'Assignment unavailable', exact: true }).waitFor();
    assert.equal(await app.getByRole('button', { name: 'Take', exact: true }).count(), 0);
    assert.ok(!(await app.locator('#card-root').innerText()).includes(title));
    await app.locator('summary').filter({ hasText: 'Read points' }).click();
    await app.locator('.read-points code').filter({ hasText: session.site.at.scope }).first().waitFor();
    await layout(app, width); await capture(page, app, `unavailable-${width}.png`);
    const dayPresence = await provision('day'), nightPresence = await provision('night');
    assert.equal(session.site.state.item(dayPresence).state, 'unknown');
    assert.equal(session.site.state.item(dayPresence).refs.reportedAt, null);
    const unknownReads = await page.evaluate(() => proof.calls.filter(call => call.name === 'view_read').length);
    await page.waitForFunction(reads => proof.calls.filter(call => call.name === 'view_read').length >= reads + 2, unknownReads);
    await app.getByRole('heading', { name: 'Assignment unavailable', exact: true }).waitFor();
    assert.equal(await app.getByRole('button', { name: 'Take', exact: true }).count(), 0);
    const arrival = await day.nativeAct('day', 'arrive', dayPresence, { room: roomA.id }, { on: dayPresence }, 'site'); assert.equal(arrival.answer, 'accepted');
    assert.equal(session.site.state.item(dayPresence).refs.reportedAt, arrival.receipt.fact.seq);
    if (await app.getByRole('button', { name: 'Retry read', exact: true }).isVisible()) await app.getByRole('button', { name: 'Retry read', exact: true }).click();
    await app.getByRole('heading', { name: title, exact: true }).waitFor(); await app.getByRole('button', { name: 'Take', exact: true }).waitFor();
    await page.waitForFunction(() => proof.contexts.at(-1)?.structuredContent?.identity?.kind === 'task' && proof.contexts.at(-1)?.structuredContent?.status === 'ready');
    const stablePresence = structuredClone(session.site.state.item(dayPresence));
    const wrongRoom = await day.nativeAct('day', 'leave', dayPresence, { room: roomB.item }, { on: dayPresence }, 'site');
    assert.deepEqual({ answer: wrongRoom.answer, reason: wrongRoom.reason, name: wrongRoom.name }, { answer: 'refused', reason: 'guard-failed', name: 'wrong-presence-room' });
    for (let i = 0; i < 101; i++) {
      const result = await day.nativeAct('night', 'arrive', nightPresence, { room: roomB.item }, { on: nightPresence }, 'site');
      assert.equal(result.answer, 'accepted', JSON.stringify(result));
    }
    assert.deepEqual(session.site.state.item(dayPresence), stablePresence);
    await app.getByRole('heading', { name: title, exact: true }).waitFor();
    await app.getByRole('button', { name: 'Take', exact: true }).waitFor();
    const sitePoint = session.site.state.scope().head;
    await page.waitForFunction(({ scope, seq, hash }) => {
      const context = proof.contexts.at(-1)?.structuredContent, points = context?.projection?.filter(point => point.scope === scope) ?? [];
      return context?.status === 'ready' && points.length === 2 && points.every(point => point.seq === seq && point.hash === hash);
    }, { scope: session.site.at.scope, ...sitePoint });
    await app.locator('#card-root[aria-busy="false"]').waitFor();
    const quiet = await page.evaluate(() => ({ contexts: proof.contexts.length, reads: proof.calls.filter(call => call.name === 'view_read').length }));
    await page.waitForFunction(reads => proof.calls.filter(call => call.name === 'view_read').length >= reads + 2, quiet.reads);
    assert.equal(await page.evaluate(() => proof.contexts.length), quiet.contexts);
    const otherWidth = width === 320 ? 592 : 320;
    await page.setViewportSize({ width: otherWidth + 32, height: 1100 }); await layout(app, otherWidth);
    await page.setViewportSize({ width: width + 32, height: 1100 }); await layout(app, width); await capture(page, app, `task-${width}.png`);
    assert.equal(day.signatures(), 0);
    await app.getByRole('button', { name: 'Take', exact: true }).click();
    await app.getByRole('button', { name: 'Report in chat', exact: true }).waitFor();
    await app.locator('#card-root[aria-busy="false"]').waitFor();
    assert.equal(day.signatures(), 1); assert.equal(session.scope.state.item(task.id).state, 'taken');
    await app.getByRole('button', { name: 'Report in chat', exact: true }).click();
    await page.waitForFunction(revision => proof.contexts.at(-1)?.structuredContent?.identity?.revision === revision, String(session.scope.state.item(task.id).revision));
    const context = await page.evaluate(() => proof.contexts.at(-1).structuredContent);
    const denied = await page.evaluate(view => window.modelCall('view_read', { view }), context.view); assert.equal(denied.error.code, -32601);
    const response = await page.evaluate(({ tool, args }) => window.modelCall(tool, args), {
      tool: viewInputToolName('tasks', 'report-task'), args: { view: context.view, item: context.identity.item, revision: context.identity.revision,
        request: `task-report-${width}`, values: { report: 'Freed the jammed vane by hand.' } },
    });
    assert.equal(response.error, undefined, JSON.stringify(response)); assert.equal(response.result.isError, false, JSON.stringify(response));
    assert.match(response.result.structuredContent.receipt, /accepted/); assert.ok(!JSON.stringify(response.result).includes('sources'));
    await app.getByText('This declared view has no matching items.', { exact: true }).waitFor();
    assert.equal(day.signatures(), 2); assert.equal(session.scope.state.item(task.id).state, 'done');
    assert.equal(session.scope.state.item(task.id).values.report, 'Freed the jammed vane by hand.');
    await app.getByRole('button', { name: /Back/ }).waitFor(); await layout(app, width); await capture(page, app, `task-complete-${width}.png`);
    await app.getByRole('button', { name: /Back/ }).click(); await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor(); await layout(app, width);
    assert.equal(await page.evaluate(() => proof.chat.length), 1); await save('day', page);

    const op = await pageFor('operator', 'alerts');
    await op.app.getByRole('button', { name: 'Authorize', exact: true }).waitFor(); await op.app.getByRole('button', { name: 'Hold 60 s', exact: true }).waitFor();
    await layout(op.app, width); await capture(op.page, op.app, `operator-${width}.png`);
    await op.app.getByRole('button', { name: 'Hold 60 s', exact: true }).click();
    await op.app.getByText('This declared view has no matching items.', { exact: true }).waitFor();
    assert.equal(operator.signatures(), 1); assert.equal(operator.submitted[0].intent.kind, 'hold'); await save('operator', op.page);

    const grower = await pageFor('head', 'watering-requests');
    await grower.app.getByRole('heading', { name: 'High EC on D4; request early watering.', exact: true }).waitFor();
    await grower.app.getByRole('button', { name: 'Approve', exact: true }).waitFor(); await grower.app.getByRole('button', { name: 'Decline', exact: true }).waitFor();
    await layout(grower.app, width); await capture(grower.page, grower.app, `watering-${width}.png`);
    await grower.app.getByRole('button', { name: 'Approve', exact: true }).click();
    await grower.app.getByText('This declared view has no matching items.', { exact: true }).waitFor();
    assert.equal(session.scope.state.item(request.id).state, 'approved'); assert.equal(head.signatures(), 1);
    const second = await ask('High EC on D4; second manual request.');
    await grower.app.getByRole('heading', { name: 'High EC on D4; second manual request.', exact: true }).waitFor();
    await grower.app.getByRole('button', { name: 'Decline', exact: true }).click();
    await grower.app.getByText('This declared view has no matching items.', { exact: true }).waitFor();
    assert.equal(session.scope.state.item(second.id).state, 'declined'); assert.equal(head.signatures(), 2);
    await layout(grower.app, width); await capture(grower.page, grower.app, `watering-complete-${width}.png`); await save('head', grower.page);
    assert.deepEqual(errors, []);
    for (const proof of Object.values(proofs)) assert.ok(!JSON.stringify(proof.contexts).includes('"sources"'));
    const replay = [];
    for (const scope of [session.site, session.scope, roomB.scope]) { const result = await scope.replay(); assert.equal(result.report.result, 'consistent'); assert.equal(result.why, null); replay.push({ scope: scope.at, result: result.report.result }); }
    await writeFile(join(out, `proof-${width}.json`), JSON.stringify({ proofs, errors, signed: { day: day.submitted, operator: operator.submitted, head: head.submitted }, presence: { item: dayPresence, scope: session.site.at, arrival: arrival.receipt.fact, rawReportPosition: stablePresence.refs.reportedAt, unrelatedReports: 101, wrongRoomRefusal: wrongRoom.name }, replay }, null, 2));
    report.cases.push({ width, resizedTo: otherWidth, unavailableReadPoints: true, provisionedUnknown: true, durableAfterOtherReports: 101, wrongRoomRefused: true, quietRefresh: true, appOnlyRead: true,
      signatures: { day: 2, operator: 1, head: 2 }, nativeKinds: ['take-task', 'report-task', 'hold', 'approve-watering', 'decline-watering'], emptyBack: true, replay: 'consistent', errors });
  }
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch (error) {
  for (const context of browser?.contexts() ?? []) for (const page of context.pages()) {
    try { const app = page.frameLocator('#frame').frameLocator('iframe'); await writeFile(join(out, 'failure.json'), JSON.stringify({ text: await app.locator('html').innerText(), proof: await page.evaluate(() => proof) }, null, 2)); await page.screenshot({ path: join(out, 'failure.png'), fullPage: true }); } catch {}
  }
  throw error;
} finally { await browser?.close(); await host?.close(); session?.close(); await rm(root, { recursive: true, force: true }); }
