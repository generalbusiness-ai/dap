// Production kit and maintained Grow resources in cached Chromium. Native
// install, scopes, sessions, projection data and standing below are scripted.
// Native ownership and replay have separate Workerd/SQLite witnesses.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DOMAINS } from '@generalbusiness/dap-contract';
import { canonicalize, newIncarnation, scopeIdOf, textDigest } from '@generalbusiness/dap-bytes';
import { applicationProjectionId, applicationProjectionQueryDigest } from '@generalbusiness/dap-bytes/application-v2';
import { secretSigner } from '@generalbusiness/dap-client';
import { prepareGrowCheck } from '../../../examples/grow/prepare-check.ts';
import { prepareApplicationDirectory } from '../../cli/src/application-files.ts';
import { McpService, memoryStore } from '../src/index.ts';
import { DeclaredViewSource } from '../src/views/declared.ts';
import { viewToolName } from '../src/views/names.ts';
import { startViewsHost } from './support/views-host.ts';
const { PLAYWRIGHT_CORE, CHROMIUM, VIEW_CAPTURE_OUT: out } = process.env;
assert.ok(PLAYWRIGHT_CORE && CHROMIUM && out && /^\/(?:private\/)?tmp\//.test(out));
const require = createRequire(join(PLAYWRIGHT_CORE, 'package.json'));
assert.equal(require('playwright-core/package.json').version, '1.63.0');
const { chromium } = require('playwright-core');
const root = await prepareGrowCheck(); let host, browser;
const report = { browserPlugin: 'Browser plugin not available; cached pinned Playwright fallback', authority: 'Scripted install, projection, scopes, sessions and standing. No native ownership claim.', cases: [] };
try {
  const { packet } = await prepareApplicationDirectory(root, secretSigner(new Uint8Array(32).fill(254)));
  host = await startViewsHost({ declared: async base => {
    const site = { ...base.scope.rules, kind: 'lane' }, definition = packet.package.semantic.projections.grid.definition;
    const rooms = [1, 2].map(n => ({ kind: 'lane', scope: scopeIdOf({ v: 1, kind: 'lane', definition, creator: site, cause: textDigest(`TEST browser room ${n}`), ordinal: n }), inc: newIncarnation(new Uint8Array(16).fill(n)) }));
    const fields = (declaration, values) => Object.fromEntries(Object.entries(declaration.fields).map(([name, field]) => [name,
      Object.hasOwn(values, name) ? values[name] : field.nullable ? null : field.of.type === 'int' ? field.of.min : field.of.type === 'enum' ? field.of.of[0] : field.of.type === 'item' ? 7 : 'TEST']));
    const source = new DeclaredViewSource(packet.bytes, packet.ids.release, {
      installation: async () => ({ scope: site, directory: { ...site, kind: 'directory' }, rules: base.scope.rules, membership: { ...site, kind: 'membership' }, destination: { ...site, kind: 'destination' }, item: 7, definition: packet.package.semantic.entry, ids: packet.ids }),
      actions: async () => [],
      projection: async query => {
        const projection = packet.package.semantic.projections[query.projection], index = rooms.findIndex(room => canonicalize(room) === canonicalize(query.scope));
        const isSite = query.projection === 'site' && canonicalize(query.scope) === canonicalize(site);
        if (!isSite && (index < 0 || !['grid', 'bench'].includes(query.projection))) return { ok: false, reason: 'query-not-ready' };
        const sources = {};
        for (const [name, declaration] of Object.entries(projection.sources)) {
          if (isSite) sources[name] = name === 'site'
            ? [{ id: 0, type: 'site', state: 'open', revision: 1, fields: fields(declaration, { label: 'Grow site' }) }]
            : [0, 1, 2].map(n => ({ id: n + 2, type: 'room', state: n === 2 ? 'pending' : 'active', revision: 1, fields: fields(declaration, { label: `Room ${'ABC'[n]}`, scope: rooms[n] ?? null }) }));
          else sources[name] = name === 'bench'
            ? [{ id: 11, type: 'bench', state: 'stale', revision: 1, fields: fields(declaration, { label: `Room ${'AB'[index]} bench`, row: 'A', column: 1, zone: 7 }) }]
            : name === 'room' ? [{ id: 0, type: 'room', state: 'open', revision: 1, fields: fields(declaration, { label: `Room ${'AB'[index]}` }) }] : name === 'zone' ? [{ id: 7, type: 'zone', state: 'unobserved', revision: 1, fields: fields(declaration, { label: `Zone ${'AB'[index]}`, setpoint: 2200, band: 100 }) }] : [];
        }
        if (query.projection === 'bench' && query.items.bench !== 11) return { ok: false, reason: 'incomplete' };
        return { ok: true, query: applicationProjectionQueryDigest(query), value: { v: 1, scope: query.scope, projection: applicationProjectionId(projection), at: { seq: isSite ? 4 : 3, hash: textDigest('TEST browser head') }, sources } };
      },
    });
    const signer = secretSigner(new Uint8Array(32).fill(17));
    return { ...base, service: new McpService({ service: 'https://scopes.test', custody: memoryStore(), views: source,
      signer: { key: signer.key, sign: bytes => { const text = new TextDecoder().decode(bytes), prefix = `${DOMAINS.intent}\n`; if (text.startsWith(prefix)) base.signed.push(JSON.parse(text.slice(prefix.length))); return signer.sign(bytes); } },
      fetch: base.scope.fetch, config: { read: async () => base.scope.config(), addRoot: async () => {} } }) };
  } });
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true }); report.browser = browser.version();
  await mkdir(out, { recursive: true });
  let directRoom;
  for (const width of [320, 592]) {
    const page = await browser.newPage({ viewport: { width: width + 32, height: 1100 } }), errors = [];
    page.on('pageerror', error => errors.push(String(error))); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(host.url + '/?fixture=declared&screen=site'); assert.match(await page.title(), /S2 card fixture host/);
    const app = page.frameLocator('#frame').frameLocator('iframe');
    await app.getByRole('heading', { name: 'Grow site', exact: true }).waitFor();
    await app.getByText('Native head 4 · 3 rooms', { exact: true }).waitFor();
    assert.equal(await app.getByRole('button', { name: 'Open Room C', exact: true }).isDisabled(), true);
    await page.waitForFunction(() => window.proof.mode === 'fullscreen' && window.proof.contexts.at(-1)?.structuredContent.screen === 'site');
    await app.locator('#card-root').evaluate(async root => { for (let n = 0; n < 90; n++) { await new Promise(resolve => requestAnimationFrame(resolve)); if (window.innerHeight >= Math.ceil(root.getBoundingClientRect().height)) return; } throw Error('Host did not resize Site'); });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: join(out, `site-${width}.png`) });
    await app.getByRole('button', { name: 'Open Room A', exact: true }).click();
    await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor();
    await app.getByText('Zone A: unobserved', { exact: false }).waitFor();
    await app.getByRole('button', { name: 'EC', exact: true }).click();
    await app.locator('#choose-bench').selectOption('11');
    await app.locator('html').evaluate(() => { window.ownedOldButton = document.querySelector('.declared-surface').shadowRoot.querySelector('#open-bench'); });
    await app.getByRole('button', { name: 'Open bench record', exact: true }).click();
    await app.getByRole('heading', { name: 'Room A bench', exact: true }).waitFor();
    await app.getByRole('button', { name: /Back/ }).click();
    await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor();
    assert.equal(await app.getByRole('button', { name: 'EC', exact: true }).getAttribute('aria-pressed'), 'true');
    await app.getByRole('button', { name: /Back/ }).click();
    await app.getByRole('heading', { name: 'Grow site', exact: true }).waitFor();
    await app.getByRole('button', { name: 'Open Room B', exact: true }).click();
    await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor();
    assert.match(await app.locator('#choose-bench').textContent(), /Room B bench/);
    assert.equal(await app.getByRole('button', { name: 'Moisture', exact: true }).getAttribute('aria-pressed'), 'true');
    const beforeStale = await page.evaluate(() => window.proof.calls.filter(call => call.name !== 'view_read').length);
    const stale = await app.locator('html').evaluate(async () => {
      window.ownedOldButton.click();
      for (let n = 0; n < 12; n++) await Promise.resolve();
      return window.ownedOldButton.getRootNode().querySelector('#error').textContent;
    });
    assert.equal(stale, 'This surface is no longer current.');
    assert.equal(await page.evaluate(() => window.proof.calls.filter(call => call.name !== 'view_read').length), beforeStale);
    await app.getByRole('button', { name: 'Open bench record', exact: true }).click();
    await app.getByRole('heading', { name: 'Room B bench', exact: true }).waitFor();
    await app.getByRole('button', { name: /Back/ }).click();
    await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor();
    await app.getByRole('button', { name: /Back/ }).click();
    await app.getByRole('heading', { name: 'Grow site', exact: true }).waitFor();
    await app.getByRole('button', { name: 'Open Room A', exact: true }).click();
    await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor();
    assert.equal(await app.getByRole('button', { name: 'EC', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.match(await app.locator('#choose-bench').textContent(), /Room A bench/);
    await app.getByText('Room A', { exact: true }).waitFor();
    await app.getByRole('button', { name: 'Open bench record', exact: true }).click();
    await app.getByRole('heading', { name: 'Room A bench', exact: true }).waitFor();
    await app.getByRole('button', { name: /Back/ }).click();
    await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor();
    assert.equal(await app.locator('#error').textContent(), '');
    await app.locator('#card-root').evaluate(async root => { for (let n = 0; n < 90; n++) { await new Promise(resolve => requestAnimationFrame(resolve)); if (window.innerHeight >= Math.ceil(root.getBoundingClientRect().height)) return; } throw Error('Host did not resize'); });
    const measured = await app.locator('html').evaluate(root => ({ width: root.clientWidth, overflow: root.scrollWidth > root.clientWidth }));
    assert.equal(measured.width, width); assert.equal(measured.overflow, false);
    const proof = await page.evaluate(() => window.proof), openings = proof.calls.filter(call => call.name === 'view_grid');
    assert.ok(openings.length >= 3); assert.deepEqual(openings[0].arguments.scope, openings.at(-1).arguments.scope);
    directRoom = openings[0].arguments.scope;
    const otherRoom = openings.find(opening => canonicalize(opening.arguments.scope) !== canonicalize(openings[0].arguments.scope));
    assert.ok(otherRoom);
    const records = proof.calls.filter(call => call.name === viewToolName('bench-record', true));
    assert.equal(records.length, 3); assert.deepEqual(records[0].arguments.scope, openings[0].arguments.scope); assert.deepEqual(records[1].arguments.scope, otherRoom.arguments.scope); assert.deepEqual(records[2].arguments.scope, openings[0].arguments.scope);
    assert.ok(!JSON.stringify(proof.contexts).includes('sources')); assert.deepEqual(proof.errors, []); assert.deepEqual(proof.chat, []); assert.deepEqual(errors, []);
    assert.equal(proof.calls.filter(call => call.name === 'view_act').length, 0);
    const state = await page.evaluate(async () => fetch('/proof?instance=' + window.proof.config.id).then(response => response.json())); assert.equal(state.signed.length, 0);
    await page.screenshot({ path: join(out, `room-grid-${width}.png`) });
    report.cases.push({ width, measured, path: 'Site → Room A grid → bench → grid → Site → Room B grid → bench → Site → Room A grid', distinctFullScopes: true, pendingDisabled: true, backToSite: true, independentRoomState: true, staleRoomCallbackRefused: true, signatures: 0 });
    await page.close();
  }
  // Direct openings have no local Site history. Server-retained Back scopes
  // select the installation root or retain the selected Room as appropriate.
  for (const screen of ['grid', 'bench-record']) {
    const page = await browser.newPage({ viewport: { width: 422, height: 1000 } });
    const query = new URLSearchParams({ fixture: 'declared', screen, scope: JSON.stringify(directRoom), ...(screen === 'bench-record' ? { items: JSON.stringify({ bench: 11 }) } : {}) });
    await page.goto(host.url + '/?' + query);
    const app = page.frameLocator('#frame').frameLocator('iframe');
    await app.getByRole('heading', { name: screen === 'grid' ? 'Bench grid' : 'Room A bench', exact: true }).waitFor();
    if (screen === 'bench-record') {
      await app.getByRole('button', { name: /Back/ }).click();
      await app.getByRole('heading', { name: 'Bench grid', exact: true }).waitFor();
      await app.getByText('Room A', { exact: true }).waitFor();
    }
    await app.getByRole('button', { name: /Back/ }).click();
    await app.getByRole('heading', { name: 'Grow site', exact: true }).waitFor();
    assert.equal(await app.getByRole('button', { name: /Back/ }).count(), 0);
    const proof = await page.evaluate(() => window.proof);
    const rootOpening = proof.calls.find(call => call.name === 'view_site'); assert.ok(rootOpening);
    assert.notDeepEqual(rootOpening.arguments.scope, directRoom);
    assert.deepEqual(proof.errors, []); assert.deepEqual(proof.chat, []);
    report.cases.push({ direct: screen, width: 390, selectedRoomRetained: true, backToInstallationRoot: true });
    await page.close();
  }
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} finally { await browser?.close(); await host?.close(); await rm(root, { recursive: true, force: true }); }
