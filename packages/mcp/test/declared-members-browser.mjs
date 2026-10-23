// Actual kit and surface API in pinned Chromium. Identity/projection answers
// are explicit fictional fixtures; native session reads have a separate case.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalize } from '@generalbusiness/dap-bytes';
import { secretSigner } from '@generalbusiness/dap-client';
import { McpService, memoryStore } from '../src/index.ts';
import { PRESENTATION } from '../src/views/generated.ts';
import { startViewsHost } from './support/views-host.ts';

const { PLAYWRIGHT_CORE, CHROMIUM, VIEW_CAPTURE_OUT: out } = process.env;
assert.ok(PLAYWRIGHT_CORE && CHROMIUM && out && /^\/(?:private\/)?tmp\//.test(out));
const require = createRequire(join(PLAYWRIGHT_CORE, 'package.json'));
assert.equal(require('playwright-core/package.json').version, '1.63.0');
const { chromium } = require('playwright-core');
await mkdir(out, { recursive: true });
const host = await startViewsHost({ declared: async base => {
  const membership = base.scope.membership, scope = base.scope.rules;
  const ref = member => ({ membership, member });
  const owner = ref('@maya'), agent = ref('@climate-prober'), checker = ref('@checks'), invited = ref('@invited'), removed = ref('@removed-agent'), lapsed = ref('@lapsed'), unknown = ref('@unavailable');
  const refs = [owner, agent, checker, invited, removed, lapsed, unknown];
  const record = (who, kind, state, controller = null) => ({ ref: who, identity: { handle: who.member, kind },
    standing: { state, role: kind === 'person' ? 'member' : kind, actions: [] }, controller, opened: null });
  const members = { records: Object.fromEntries([
    record(owner, 'person', 'active'), record(agent, 'agent', 'active', owner), record(checker, 'checker', 'active'),
    record(invited, 'person', 'invited'), record(removed, 'agent', 'removed', owner), record(lapsed, 'checker', 'lapsed'),
  ].map(member => [canonicalize(member.ref), member])), overflow: 0 };
  const data = { v: 1, projection: `sha256:${'a'.repeat(64)}`, scope, at: { seq: 9, hash: `sha256:${'b'.repeat(64)}` },
    sources: { alert: [{ id: 2, type: 'alert', state: 'open', revision: 1, fields: { raisedBy: agent } }] } };
  const html = `<h1>Member surface fixture</h1><button id="show">Show raising agent</button><div id="member"></div><script>(()=>{
    const api=window.dapSurface;let data;window.memberSurfaceProof={api,keys:Object.keys(api)};
    api.onData(next=>{data=next;window.memberSurfaceProof.memberCount=Object.keys(next.members.records).length;});
    api.root.querySelector('#show').onclick=()=>api.root.querySelector('#member').replaceChildren(api.member(data.sources.alert[0].fields.raisedBy));
  })()</script>`;
  const screens = ['member-card', 'member-grid', 'member-overflow'].map(name => ({ name, resource: 'ui://dap/declared/' + name }));
  const source = { declared: true, screens, initialPage: () => 'item',
    presentation: { resources: screens.map(({ name, resource }) => ({ ...PRESENTATION.resources[0], name, uri: resource })) },
    read: async query => {
      const surface = query.screen === 'member-grid' ? { screen: query.screen, resource: 'members.html', html, opens: {}, refresh: 0, display: 'inline', back: null } : undefined;
      const card = { identity: { item: '2', kind: 'alert', revision: '1', subject: { scope: scope.scope, item: 2 }, at: { on: 1 } },
        title: 'Member identity fixture', summary: 'Recorded identity and standing only.', reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], actions: [], fallback: 'Fictional member display.',
        declared: { kind: surface ? 'surface' : 'record', source: 'alert', context: 'Fictional member display.', actor: surface ? null : refs,
          refresh: 0, display: 'inline', back: null, scope, data, ...(surface ? { surface } : {}) } };
      return { status: 'ready', position: 0, count: 1, card, scope, members: query.screen === 'member-overflow' ? { ...members, overflow: 5 } : members, fallback: card.fallback };
    } };
  const service = new McpService({ service: base.service.service, signer: secretSigner(new Uint8Array(32).fill(17)),
    custody: memoryStore(), views: source, fetch: base.scope.fetch, config: { read: async () => base.scope.config(), addRoot: async () => {} } });
  return { ...base, service };
} });
const report = { browserPlugin: 'Browser plugin not available; independently copied pinned Playwright fallback',
  flow: 'kit identity card -> fixed states; surface Show raising agent -> member(ref) identity and controller', cases: [] };
let browser;
try {
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true }); report.browser = browser.version();
  for (const width of [390, 1080]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: width + 32, height: 1000 } }), errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    await page.goto(host.url + '/?fixture=declared&screen=member-card&theme=' + theme);
    assert.equal(await page.title(), 'S2 card fixture host');
    const app = page.frameLocator('#frame').frameLocator('iframe');
    await app.getByRole('heading', { name: 'Member identity fixture', exact: true }).waitFor();
    assert.equal(await app.locator('vite-error-overlay,nextjs-portal').count(), 0);
    assert.equal(await app.locator('.dap-member').count(), 7);
    await app.getByText('agent · controlled by @maya · role agent', { exact: true }).first().waitFor();
    await app.getByText('checker · invitation lapsed · role checker', { exact: true }).waitFor();
    await app.getByText('person · invited · role member', { exact: true }).waitFor();
    await app.getByText('agent · controlled by @maya · removed · role agent', { exact: true }).waitFor();
    await app.getByText('Member unavailable', { exact: true }).waitFor();
    assert.ok((await app.locator('.dap-member-reference').textContent()).includes('"membership"'));
    const measured = await app.locator('.declared-members').evaluate(root => ({ cardWidth: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      shapes: [...root.querySelectorAll('.dap-member-mark')].map(mark => ({ initials: mark.textContent, width: mark.getBoundingClientRect().width,
        height: mark.getBoundingClientRect().height, transform: getComputedStyle(mark).transform, borderTransform: getComputedStyle(mark, '::before').transform })) }));
    assert.equal(measured.overflow, false); assert.equal(measured.shapes.length, 6);
    assert.ok(measured.shapes.every(mark => mark.width === 32 && mark.height === 32 && mark.transform === 'none'));
    assert.equal(measured.shapes[1].initials, 'CP'); assert.notEqual(measured.shapes[2].borderTransform, 'none');
    const contrast = await app.locator('.dap-member-removed-word').evaluate(element => {
      const color = text => text.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => n / 255);
      const luminance = rgb => rgb.map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
      const foreground = getComputedStyle(element).color, background = getComputedStyle(document.documentElement).backgroundColor;
      const a = luminance(color(foreground)), b = luminance(color(background));
      return { foreground, background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
    });
    assert.ok(contrast.ratio >= 4.5, 'Removal word remains readable in the selected host theme.');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: join(out, `member-card-${theme}-${width}.png`), fullPage: true });
    if (width === 390 && theme === 'light') {
      await page.goto(host.url + '/?fixture=declared&screen=member-overflow');
      await app.getByText('5 member references exceed the 32-member display limit.', { exact: true }).waitFor();
      await page.screenshot({ path: join(out, 'member-overflow-light-390.png'), fullPage: true });
    }
    await page.goto(host.url + '/?fixture=declared&screen=member-grid&theme=' + theme);
    await app.getByRole('button', { name: 'Show raising agent', exact: true }).click();
    await app.getByText('@climate-prober', { exact: true }).waitFor();
    await app.getByText('agent · controlled by @maya · role agent', { exact: true }).waitFor();
    const api = await app.locator('html').evaluate(() => {
      const proof = window.memberSurfaceProof; let invalid;
      try { proof.api.member({ member: '@guessed' }); } catch (error) { invalid = error.message; }
      return { keys: proof.keys.sort(), count: proof.memberCount, invalid, frozen: Object.isFrozen(proof.api),
        writes: ['invite', 'remove', 'setRole', 'setPresence'].filter(name => name in proof.api), slot: Object.hasOwn(window, 'dapSurface') };
    });
    assert.deepEqual(api.keys, ['member', 'onData', 'open', 'root', 'signal']); assert.equal(api.count, 6);
    assert.equal(api.invalid, 'A member element needs a full member reference.'); assert.equal(api.frozen, true);
    assert.deepEqual(api.writes, []); assert.equal(api.slot, false); assert.deepEqual(errors, []);
    const proof = await page.evaluate(() => window.proof); assert.deepEqual(proof.chat, []); assert.deepEqual(proof.errors, []);
    const state = await page.evaluate(async () => fetch('/proof?instance=' + window.proof.config.id).then(reply => reply.json()));
    assert.equal(state.signed.length, 0);
    await page.screenshot({ path: join(out, `member-surface-${theme}-${width}.png`), fullPage: true });
    report.cases.push({ width, theme, measured, contrast, api, signatures: 0 }); await page.close();
  }
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} finally { await browser?.close(); await host.close(); }
