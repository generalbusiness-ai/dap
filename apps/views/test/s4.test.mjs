import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { register } from 'tsx/esm/api';

// Actual adapter/Reads/codecs/local filesystem over scripted scope answers.
// No native authority, hosted room, provider, or browser is exercised here.
// One namespace keeps shared runtime classes identical across all actual adapters.
const scoped = register({ namespace: 'artroom-s4-owner' });
after(async () => { await scoped.unregister(); });
const load = source => scoped.import(source, import.meta.url);
const { canonicalize, digestBytes, entryHash, itemQueryArgument, itemQueryDigest, readItemQueryParameter, readMinimumParameter, textDigest, utf8 } = await load('@generalbusiness/dap-bytes');
const { secretSigner, signedIntent } = await load('@generalbusiness/dap-client');
const { issueQuestionsBrief, QUESTION_DIGESTS, J4_DIGESTS } = await load('@generalbusiness/dap-lanes');
const { StandIn, SERVICE } = await load(new URL('../../../packages/mcp/test/support/standin.ts', import.meta.url).href);
const { RepoInAi } = await load(new URL('../src/repo-in-ai.ts', import.meta.url).href);
const { ReviewStore } = await load(new URL('../src/review-store.ts', import.meta.url).href);
const { Collection } = await load(new URL('../src/reads.ts', import.meta.url).href);
const { captureQuestionAction, decisionSource, questionSubject } = await load(new URL('../src/decision.ts', import.meta.url).href);
const { ViewSessions } = await load(new URL('../../../packages/mcp/src/views/session.ts', import.meta.url).href);
const { createRepoInAiService } = await load(new URL('../src/node.ts', import.meta.url).href);
const NOW = Date.parse('2099-01-01T00:00:00Z');
const item = (id, type, state, values = {}, refs = {}, parties = {}) => ({ id, type, state, revision: id, opened: null, values, refs, parties, attributed: [] });
const json = body => new Response(canonicalize(body), { headers: { 'content-type': 'application/json' } });

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
  const large = await question(f, 'TEST ' + 'x'.repeat(65531));
  assert.equal(utf8(large.body).length, 65536);
  large.state.items.push(item(20, 'ask', 'asked', { question: 'TEST unrelated Question', body: textDigest('TEST unrelated body') }, { bodyAt: 20 }, { asker: f.other }),
    item(21, 'commitment', 'accepted', { conditions: ['TEST unrelated terms'] }, {}, { performer: f.other }));
  while (large.state.entries.length <= 21) f.peer.append(large.state, { type: 'timed', item: 0, rule: 'TEST unrelated retained item position', due: '2099-01-01T00:00:00Z' });
  const { service } = createRepoInAiService({ home: f.home, ...f.options, config: { read: f.options.config, addRoot: async () => {} } });
  const bounded = await service.call('context', { question: { scope: large.state.ref, ask: large.opening.entry.seq } });
  assert.equal(bounded.isError, false, 'The largest ordinary legal body remains available through the card fallback');
  assert.equal(bounded.structuredContent.complete, true);
  assert.equal(bounded.structuredContent.context.body, large.body);
  assert.deepEqual(bounded.structuredContent.context.versions, [{ fact: { at: large.state.ref, seq: 1, hash: large.opening.hash }, current: true }]);
  assert.equal(Object.hasOwn(bounded.structuredContent.context, 'items'), false, 'Private action-capture rows must not expose unrelated Questions or duplicates');
  assert.ok(utf8(canonicalize(bounded)).length <= 256 * 1024);
  const escaped = await question(f, '\u0000'.repeat(65536));
  const refused = await service.call('context', { question: { scope: escaped.state.ref, ask: escaped.opening.entry.seq } });
  assert.equal(refused.isError, true);
  assert.deepEqual(refused.structuredContent, { error: 'context-output-limit', complete: false }, 'Legal text still obeys the independent serialized-output bound when JSON escaping expands it');
  q.state.definition = QUESTION_DIGESTS.issue;
  const legacy = (await f.app.question(q.state.ref, 1)).context; assert.equal(legacy.brief, null); assert.equal(legacy.briefMatches, false);
  q.state.retained.set(`text ${textDigest(q.body)}`, canonicalize('TEST substituted body'));
  await assert.rejects(() => f.app.question(q.state.ref, 1), error => error.reason === 'unavailable');
});

test('context attaches comments only to exact retained facts in its own scope', async t => {
  const f = fixture(t), q = await question(f), foreign = await question(f);
  const local = { at: q.state.ref, seq: q.opening.entry.seq, hash: q.opening.hash };
  const references = [local, { at: foreign.state.ref, seq: foreign.opening.entry.seq, hash: foreign.opening.hash },
    { ...local, at: { ...local.at, inc: f.peer.membership.inc } }, { ...local, hash: 'sha256:' + 'f'.repeat(64) }];
  for (const [n, about] of references.entries()) {
    const body = 'TEST comment ' + n;
    q.state.items.push(item(10 + n, 'comment', 'posted', { body: textDigest(body) }, { about }, { author: f.viewer }));
    q.state.retained.set(`text ${textDigest(body)}`, canonicalize(body));
  }
  while (q.state.entries.length <= 13) f.peer.append(q.state, { type: 'timed', item: 0, rule: 'TEST comment retained item position', due: '2099-01-01T00:00:00Z' });
  const got = await f.app.context({ question: { scope: q.state.ref, ask: q.opening.entry.seq } });
  assert.equal(got.isError, false); assert.equal(got.structuredContent.complete, true);
  assert.deepEqual(got.structuredContent.context.comments.map(comment => comment.text), ['TEST comment 0'], 'A matching sequence alone must not attribute a foreign or wrong-hash comment');
});

test('context counts bodyAt and whole history once: exactly 50 entries are readable, 51 are unavailable', async t => {
  const f = fixture(t), q = await question(f);
  while (q.state.entries.length < 50) f.peer.append(q.state, { type: 'timed', item: 0, rule: 'TEST full lane history', due: '2099-01-01T00:00:00Z' });
  const got = await f.app.context({ question: { scope: q.state.ref, ask: q.opening.entry.seq } });
  assert.equal(got.isError, false); assert.equal(got.structuredContent.complete, true);
  assert.equal(got.structuredContent.counters.history, 50, 'The separately read bodyAt is already part of the whole history');
  assert.equal(got.structuredContent.context.body, q.body);
  f.peer.append(q.state, { type: 'timed', item: 0, rule: 'TEST one entry beyond the limit', due: '2099-01-01T00:00:00Z' });
  const refused = await f.app.context({ question: { scope: q.state.ref, ask: q.opening.entry.seq } });
  assert.equal(refused.isError, true);
  assert.deepEqual(refused.structuredContent, { error: 'context-unavailable', reason: 'history-limit', complete: false });
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
  assert.equal(Buffer.isBuffer(observed) && observed.equals(published), true, 'Publication completes before a microtask queued by the final synchronous admission check');
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


// Real mounted-view/Decision/Collection/Reads/codecs over scripted scope answers.
// The perform callback and receipt lookup stand in for Native admission/custody;
// this owner does not prove Native authority or the service's private receipt map.
test('an accepted Decision receipt floors the next actual app read; an older coherent cut cannot replace it', async t => {
  const f = fixture(t), q = await question(f), older = structuredClone(q.state);
  const wires = [], receipts = new WeakMap(); let serveOlder = false, performed = 0, accepted;
  const app = new RepoInAi({ ...f.options, fetch: async (url, init) => {
    const asked = new URL(url), target = asked.pathname.startsWith('/v1/scopes/' + q.state.ref.scope);
    if (asked.pathname === '/v1/scopes/' + q.state.ref.scope && asked.searchParams.has('atLeast')) {
      const minimum = readMinimumParameter(asked.searchParams.get('atLeast'));
      assert.ok(minimum, 'The actual summary route carries the maintained canonical minimum wire'); wires.push(minimum);
    }
    if (!target || !serveOlder) return f.options.fetch(url, init);
    // Every route of this one target can serve the same old cut, not a mixed-head fixture.
    f.peer.scopes.set(q.state.ref.scope, older);
    try { return await f.options.fetch(url, init); } finally { f.peer.scopes.set(q.state.ref.scope, q.state); }
  } });
  const source = decisionSource(app), sessions = new ViewSessions(source, { call: async () => { throw Error('Unexpected generic read.'); } }, async (kind, args, admit) => {
    await admit(); assert.equal(kind, 'approve'); performed++;
    const signed = await signedIntent(f.signer, { to: q.state.ref, kind, on: args.on, fields: args.fields, expected: args.at }, { now: NOW });
    const sealed = f.peer.append(q.state, { type: 'act', signed, authority: [], presented: {} });
    accepted = f.peer.receipt(q.state, sealed);
    const request = q.state.items.find(row => row.type === 'approval-request'); request.state = 'met'; request.revision = sealed.entry.seq;
    q.state.items.push(item(sealed.entry.seq, 'approval', 'submitted', { verdict: 'approve' }, { ask: q.opening.entry.seq, bodyAt: q.opening.entry.seq }, { approver: f.viewer }));
    const answer = { content: [{ type: 'text', text: 'Scripted accepted approval.' }], structuredContent: { answer: 'accepted', fact: accepted.fact }, isError: false };
    receipts.set(answer, accepted); return answer;
  }, async () => { throw Error('No settlement is needed in this composition witness.'); }, answer => receipts.get(answer) ?? null);
  await sessions.open('floor', 'decision', questionSubject(q.state.ref, q.opening.entry.seq));
  const summary = sessions.display('floor'); assert.equal(summary.status, 'ready'); assert.deepEqual(summary.card.actions, [], 'Summary pages keep native actions hidden');
  const initial = await sessions.read('floor', summary.cut, { page: 'item' }); assert.equal(initial.status, 'ready'); assert.equal(initial.card.actions[0].id, 'approve');
  const done = await sessions.act('floor', initial.cut, 'approve'); assert.equal(done.result.structuredContent.answer, 'accepted'); assert.equal(performed, 1);
  const required = { at: accepted.fact.at, head: { seq: accepted.fact.seq, hash: accepted.fact.hash } };
  serveOlder = true;
  const behind = await sessions.read('floor', done.display.cut, { refresh: true });
  assert.deepEqual(wires, [required], 'The accepted full receipt reaches the app summary wire without losing scope, incarnation or hash');
  assert.equal(behind.status, 'unavailable', 'A coherent cut below the accepted receipt must not become the next actionable card'); assert.equal(behind.card, undefined); assert.equal(behind.receipt, done.display.receipt);
  serveOlder = false;
  const reached = await sessions.read('floor', behind.cut, { refresh: true });
  assert.equal(reached.status, 'ready'); assert.deepEqual(reached.card.projection, [{ scope: q.state.ref.scope, seq: required.head.seq, hash: required.head.hash }]);
  assert.ok(!reached.card.actions.some(action => action.id === 'approve')); assert.equal(performed, 1);
  const count = f.peer.requests.length, foreign = { ...required, at: { ...required.at, inc: f.peer.membership.inc } };
  assert.equal((await source.read({ screen: 'decision', subject: questionSubject(q.state.ref, q.opening.entry.seq), position: 0, page: 'summary' }, { call: async () => { throw Error('No generic read.'); } }, foreign)).status, 'unavailable');
  assert.equal(f.peer.requests.length, count, 'A foreign incarnation refuses before any room read');
  assert.equal((await source.read({ screen: 'work', position: 0, page: 'summary' }, { call: async () => { throw Error('No generic read.'); } }, required)).status, 'unavailable');
  assert.equal(f.peer.requests.length, count, 'An unsupported screen cannot silently drop the receipt floor');
  const collection = await new Collection(f.options).begin(q.state.ref);
  try {
    const frame = await collection.frame(q.state.ref);
    await assert.rejects(() => collection.frame(q.state.ref, { at: q.state.ref, head: { seq: frame.head.seq + 1, hash: frame.head.hash } }), error => error.reason === 'read-minimum-behind');
    await assert.rejects(() => collection.frame(q.state.ref, { at: q.state.ref, head: { seq: frame.head.seq, hash: q.opening.hash } }), error => error.reason === 'read-minimum-behind');
  } finally { collection.close(); }
});
