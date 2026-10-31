import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tsImport } from 'tsx/esm/api';

// Actual adapter/Reads/codecs/local filesystem over scripted scope answers.
// No native authority, hosted room, provider, or browser is exercised here.
const load = source => tsImport(source, import.meta.url);
const { canonicalize, digestBytes, entryHash, itemQueryArgument, itemQueryDigest, readItemQueryParameter, textDigest, utf8 } = await load('@generalbusiness/dap-bytes');
const { secretSigner, signedIntent } = await load('@generalbusiness/dap-client');
const { issueQuestionsBrief, QUESTION_DIGESTS, J4_DIGESTS } = await load('@generalbusiness/dap-lanes');
const { StandIn, SERVICE } = await load(new URL('../../../packages/mcp/test/support/standin.ts', import.meta.url).href);
const { RepoInAi } = await load(new URL('../src/repo-in-ai.ts', import.meta.url).href);
const { ReviewStore } = await load(new URL('../src/review-store.ts', import.meta.url).href);
const { Collection } = await load(new URL('../src/reads.ts', import.meta.url).href);
const { captureQuestionAction, decisionSource } = await load(new URL('../src/decision.ts', import.meta.url).href);
const { createRepoInAiService } = await load(new URL('../src/node.ts', import.meta.url).href);
const NOW = Date.parse('2099-01-01T00:00:00Z');
const item = (id, type, state, values = {}, refs = {}, parties = {}) => ({ id, type, state, revision: id, opened: null, values, refs, parties, attributed: [] });
const json = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

function fixture(t) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'artroom-s4-')));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const signer = secretSigner(new Uint8Array(32).fill(47)), peer = new StandIn(signer.key, 'admin', ['issue.approve', 'issue.decide', 'change.merge']);
  const viewer = { membership: peer.membership, member: '@rita' }, other = { membership: peer.membership, member: '@vic' };
  const M = peer.scopes.get(peer.membership.scope); M.definition = 'platform:membership@8';
  M.items[1] = item(1, 'member', 'active', { handle: '@rita', kind: 'person', role: 'admin' }, {}, { member: viewer, controller: null });
  M.items.push(item(3, 'member', 'active', { handle: '@vic', kind: 'person', role: 'member' }, {}, { member: other, controller: null }));
  const D = peer.scopes.get(peer.directory.scope); D.definition = 'platform:directory@16';
  M.items[0].refs.directory = peer.directory;
  const brief = { bytes: utf8('TEST immutable Brief\n'), digest: digestBytes(utf8('TEST immutable Brief\n')) };
  const options = { service: SERVICE, signer, config: async () => peer.config(), now: () => NOW, brief, reviewStore: new ReviewStore(home),
    fetch: async (url, init) => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith('/query-items')) {
        peer.requests.push(`GET ${parsed.pathname}`);
        const query = readItemQueryParameter(parsed.searchParams.get('q'));
        assert.ok(query, 'The actual adapter emits a valid bounded native query');
        const state = peer.scopes.get(query.scope.scope);
        const rows = [...state.items, ...state.final].filter(row => row.type === query.type && query.states.includes(row.state) && (query.ids === null || query.ids.includes(row.id))).sort((a, b) => a.id - b.id);
        assert.ok(rows.length <= query.limit, 'This small stand-in never pretends an omitted suffix is complete');
        return json({ ok: true, at: peer.head(state), value: { v: 1, scope: state.ref, query: itemQueryDigest(query), argument: itemQueryArgument(query), items: rows }, complete: true });
      }
      return peer.fetch(url, init);
    } };
  function lane(definition = issueQuestionsBrief) {
    const ref = peer.add('lane', definition);
    D.items.push(item(10 + D.items.length, 'lane', 'created', { number: D.items.length }, { scope: ref }));
    return peer.scopes.get(ref.scope);
  }
  return { home, signer, peer, viewer, other, M, D, brief, options, lane, app: new RepoInAi(options) };
}

test('attention filters actual requested members and met requests; nine total scopes leave exactly one unread before any request', async t => {
  const f = fixture(t), states = Array.from({ length: 7 }, () => f.lane());
  for (const state of states) state.items.push(item(1, 'ask', 'asked', { question: 'TEST question' }, { bodyAt: 1 }, { asker: f.other }),
    item(2, 'approval-request', 'open', {}, { ask: 1, bodyAt: 1 }, { requested: f.viewer, requester: f.other }),
    item(3, 'approval-request', 'open', {}, { ask: 1, bodyAt: 1 }, { requested: f.other, requester: f.viewer }),
    item(4, 'approval-request', 'met', {}, { ask: 1, bodyAt: 1 }, { requested: f.viewer, requester: f.other }));
  const answer = await f.app.needsYou(), data = answer.structuredContent;
  assert.equal(answer.isError, false); assert.equal(data.rows.length, 6); assert.equal(data.omittedScopes.length, 1);
  assert.ok(data.rows.every(row => row.item === 2 && row.rule.clause.includes('acts.request-approval') && row.rule.definition.startsWith('sha256:')));
  const scopes = new Set(f.peer.requests.map(request => request.split('/v1/scopes/')[1]?.split('/')[0]).filter(Boolean));
  assert.equal(scopes.size, 8, 'M and D count alongside all six lane reads');
  assert.ok(!scopes.has(data.omittedScopes[0].scope)); assert.equal(data.counters.scopes, 8);
  const chosen = states.find(state => state.ref.scope === data.rows[0].scope.scope); chosen.items[1].state = 'met';
  f.peer.append(chosen, { type: 'timed', item: 2, rule: 'TEST met request', due: '2099-01-01T00:00:01Z' });
  assert.equal((await f.app.needsYou()).structuredContent.rows.some(row => row.scope.scope === chosen.ref.scope), false);
  for (let n = 0; n < 55; n++) {
    const ask = 20 + n * 2;
    chosen.items.push(item(ask, 'ask', 'asked', { question: 'TEST bounded row ' + n }, { bodyAt: ask }, { asker: f.other }), item(ask + 1, 'approval-request', 'open', {}, { ask, bodyAt: ask }, { requested: f.viewer, requester: f.other }));
  }
  while (chosen.entries.length <= 129) f.peer.append(chosen, { type: 'timed', item: 0, rule: 'TEST retained row position', due: '2099-01-01T00:00:02Z' });
  const capped = (await f.app.needsYou()).structuredContent;
  assert.equal(capped.rows.length, 50); assert.equal(capped.omittedRows, 10);
  assert.ok(capped.counters.items <= 512);
});

test('work retains the real agent controller; an unresolved controller never becomes the viewer', async t => {
  const f = fixture(t), state = f.lane(), agent = { membership: f.peer.membership, member: '@builder' };
  f.M.items.push(item(8, 'member', 'active', { kind: 'agent', role: 'agent', handle: '@builder' }, {}, { member: agent, controller: f.other }));
  state.items.push(item(1, 'intent', 'open', { conditions: ['TEST current condition'] }, { conditionsAt: 0 }),
    item(2, 'commitment', 'accepted', { conditions: ['TEST agreed term'] }, { conditionsAt: 0, termsAt: 2 }, { performer: agent }),
    item(3, 'block', 'blocked', { reason: 'TEST question' }, { commitment: 2, on: 1 }));
  const first = (await f.app.work()).structuredContent;
  assert.equal(first.rows.length, 1); assert.deepEqual(first.rows[0].controller, f.other); assert.equal(first.rows[0].blocks.length, 1);
  const conditions = Array.from({ length: 16 }, () => 'x'.repeat(4096));
  state.items[0].values.conditions = conditions; state.items[1].values.conditions = conditions;
  const { service } = createRepoInAiService({ home: f.home, ...f.options, config: { read: f.options.config, addRoot: async () => {} } });
  const clipped = await service.call('work', {});
  assert.equal(clipped.isError, false, 'The application preserves its bounded result instead of triggering a generic replacement');
  assert.equal(clipped.structuredContent.rows.length, 0); assert.equal(clipped.structuredContent.omittedRows, 1); assert.equal(clipped.structuredContent.complete, false);
  assert.ok(utf8(canonicalize(clipped)).length <= 256 * 1024, 'The whole CallResult, including its text copy, fits the catalogue bound');
  f.M.items.at(-1).parties.controller = { membership: { ...f.peer.membership, inc: 'in_' + 'a'.repeat(26) }, member: '@vic' };
  const missing = (await f.app.work()).structuredContent;
  assert.equal(missing.rows.length, 0); assert.ok(missing.unread.some(row => row.reason === 'agent-controller-unavailable'));
  const unsupported = f.lane('sha256:' + 'c'.repeat(64)), change = f.lane(J4_DIGESTS.change);
  const incomplete = (await f.app.work()).structuredContent;
  assert.equal(incomplete.complete, false);
  assert.ok(incomplete.unread.some(row => row.scope.scope === unsupported.ref.scope && row.reason === 'unsupported-profile'));
  assert.ok(!incomplete.unread.some(row => row.scope.scope === change.ref.scope), 'The explicitly supported Change profile is not an unsupported lane');
});

async function question(f, body = 'TEST current Question body\n') {
  const state = f.lane(), signed = await signedIntent(f.signer, { to: state.ref, kind: 'ask', fields: { question: 'TEST question', body: textDigest(body), brief: f.brief.digest } }, { now: NOW });
  const opening = f.peer.append(state, { type: 'act', signed, authority: [], presented: {} });
  while (state.entries.length < 6) f.peer.append(state, { type: 'timed', item: 0, rule: 'TEST history position', due: '2099-01-01T00:00:00Z' });
  state.items.push(item(opening.entry.seq, 'ask', 'asked', { question: 'TEST question', body: textDigest(body), brief: f.brief.digest }, { bodyAt: opening.entry.seq }, { asker: f.other }),
    item(5, 'approval-request', 'open', {}, { ask: opening.entry.seq, bodyAt: opening.entry.seq }, { requested: f.viewer, requester: f.other }));
  state.retained.set(`text ${textDigest(body)}`, canonicalize(body));
  return { state, opening, body };
}

test('context resolves sequence bodyAt through actual canonical entries and checks the fixed Brief; Decision captures the native revision tuple', async t => {
  const f = fixture(t), q = await question(f), got = await f.app.question(q.state.ref, q.opening.entry.seq), c = got.context;
  assert.deepEqual(c.bodyAt, { at: q.state.ref, seq: 1, hash: entryHash(q.opening.entry) });
  assert.equal(c.body, q.body); assert.equal(c.versions[0].text, q.body); assert.equal(c.briefMatches, true);
  const action = captureQuestionAction(c, 'approve', c.requests[0]);
  assert.deepEqual(action.args.at, { request: 5, ask: 1 }); assert.deepEqual(action.args.fields.bodyAt, c.bodyAt);
  assert.equal(digestBytes(f.app.brief.bytes), c.brief);
  const changed = new RepoInAi({ ...f.options, brief: { bytes: utf8('TEST other Brief'), digest: digestBytes(utf8('TEST other Brief')) } });
  assert.equal((await changed.question(q.state.ref, 1)).context.briefMatches, false);
  const large = await question(f, 'TEST ' + 'x'.repeat(65530));
  const { service } = createRepoInAiService({ home: f.home, ...f.options, config: { read: f.options.config, addRoot: async () => {} } });
  const bounded = await service.call('context', { question: { scope: large.state.ref, ask: large.opening.entry.seq } });
  assert.equal(bounded.isError, true);
  assert.deepEqual(bounded.structuredContent, { error: 'context-output-limit', complete: false }, 'The oversized actual context keeps its specific boundary instead of a generic catalogue replacement');
  assert.ok(utf8(canonicalize(bounded)).length <= 256 * 1024);
  q.state.definition = QUESTION_DIGESTS.issue;
  const legacy = (await f.app.question(q.state.ref, 1)).context; assert.equal(legacy.brief, null); assert.equal(legacy.briefMatches, false);
  q.state.retained.set(`text ${textDigest(q.body)}`, canonicalize('TEST substituted body'));
  await assert.rejects(() => f.app.question(q.state.ref, 1), error => error.reason === 'unavailable');
});

test('a head move during context makes the read unavailable rather than mixing two cuts', async t => {
  const f = fixture(t), q = await question(f); let moved = false;
  const app = new RepoInAi({ ...f.options, fetch: async (url, init) => {
    if (!moved && new URL(url).pathname.endsWith('/entries/1')) { moved = true; f.peer.append(q.state, { type: 'timed', item: 1, rule: 'TEST move', due: '2099-01-01T00:00:01Z' }); }
    return f.options.fetch(url, init);
  } });
  await assert.rejects(() => app.question(q.state.ref, 1), error => error.reason === 'head-changed');
});

test('since remains a pure read; a local mark survives restart and pre-publication failures or stale admission preserve the prior file', async t => {
  const f = fixture(t), state = f.lane();
  const first = (await f.app.since()).structuredContent;
  const capture = { service: SERVICE, directory: f.peer.directory, viewer: f.viewer, key: f.signer.key, heads: first.heads, ranges: first.rows.map(row => ({ scope: row.scope.scope, from: row.head.seq, to: row.head.seq })) };
  const source = decisionSource(f.app), outcome = await source.markReviewed(capture, { view: 'TEST', cut: 1, admit() {} });
  assert.deepEqual(outcome.structuredContent, { localStatus: 'marked' });
  const path = join(f.home, 'private', 'reviewed-heads.json'), original = readFileSync(path);
  assert.equal((await f.app.since()).structuredContent.rows.length, 0);
  assert.equal(await new ReviewStore(f.home).mark(capture, () => {}), 'already');
  f.peer.append(state, { type: 'timed', item: 0, rule: 'TEST new head', due: '2099-01-01T00:00:01Z' });
  const after = (await f.app.since()).structuredContent; assert.equal(after.rows.length, 1);
  assert.deepEqual((await f.app.since()).structuredContent.rows, after.rows, 'Repeated since does not clear an unseen explicit mark');
  const next = { ...capture, heads: after.heads };
  await assert.rejects(() => new ReviewStore(f.home).mark(next, () => { throw Error('TEST superseded cut'); }), /TEST superseded/);
  assert.deepEqual(readFileSync(path), original);
  await assert.rejects(() => new ReviewStore(f.home, { flush() { throw Error('TEST flush failed'); } }).mark(next, () => {}), /TEST flush failed/);
  assert.deepEqual(readFileSync(path), original);
  const conflict = { ...capture, heads: capture.heads.map(point => point.scope.scope === state.ref.scope ? { ...point, head: { ...point.head, hash: 'sha256:' + 'b'.repeat(64) } } : point) };
  await assert.rejects(() => new ReviewStore(f.home).mark(conflict, () => {}), error => error.reason === 'conflict');
  const linkHome = f.home + '-link'; symlinkSync(f.home, linkHome); t.after(() => rmSync(linkHome));
  assert.throws(() => new ReviewStore(linkHome).read(capture), error => error.reason === 'unsafe-path');
  let observed;
  await new ReviewStore(f.home).mark(next, () => {
    queueMicrotask(() => { observed = readFileSync(path); });
  });
  const published = readFileSync(path);
  assert.notDeepEqual(published, original, 'The later head actually publishes a new local mark');
  assert.deepEqual(observed, published, 'Publication completes before a microtask queued by the final synchronous admission check');
});

test('the real static service catalogue and factory do not invoke room inventory or key reads; the collection refuses an unselected ninth scope', async t => {
  const f = fixture(t); let attempts = 0;
  const { service } = createRepoInAiService({ home: f.home, service: SERVICE, signer: f.signer,
    config: { read: f.options.config, addRoot: async () => { throw Error('TEST no provisioning'); } }, brief: f.brief, now: () => NOW,
    fetch: async () => { attempts++; throw Error('TEST no inventory reads'); } });
  const listed = await service.page();
  assert.deepEqual(listed.tools.filter(tool => ['needs_you', 'work', 'context', 'since'].includes(tool.name)).map(tool => tool.name).sort(), ['context', 'needs_you', 'since', 'work']);
  assert.equal(attempts, 0);
  const states = Array.from({ length: 7 }, () => f.lane()), collection = await new Collection(f.options).begin();
  try { await assert.rejects(() => collection.frame(collection.omitted[0]), error => error.reason === 'scope-limit'); }
  finally { collection.close(); }
  assert.equal(states.length, 7);
  // Exercise the actual default Fetch, including Node's redirect behavior.
  let reached = 0, nativeWrites = 0;
  const target = createServer((request, response) => { reached++; request.resume(); response.end('TEST forbidden redirect destination'); });
  const stop = server => new Promise(resolve => { server.closeAllConnections(); server.close(() => resolve()); });
  t.after(() => stop(target));
  const listen = server => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port)); });
  const destination = await listen(target);
  const redirect = createServer((request, response) => { if (request.method === 'POST' && request.url.endsWith('/acts')) nativeWrites++; request.resume(); response.writeHead(302, { location: destination + '/outside' }); response.end(); });
  t.after(() => stop(redirect));
  const redirectService = await listen(redirect), options = { ...f.options, service: redirectService, config: async () => ({ ...f.peer.config(), service: redirectService }) };
  delete options.fetch;
  const bounded = new Collection(options);
  try { await assert.rejects(() => bounded.begin(), error => error.reason === 'unavailable' || error.reason === 'transport'); }
  finally { bounded.close(); }
  assert.equal(reached, 0, 'The actual default Fetch must not follow a redirect beyond the selected service');
  assert.equal(nativeWrites, 0, 'A read diagnostic must never turn into a native act');
});
