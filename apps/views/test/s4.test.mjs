import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { register } from 'tsx/esm/api';

// Actual adapter/Reads/codecs/local filesystem over scripted scope answers.
// No native authority, hosted room, provider, or browser is exercised here.
// One namespace keeps shared runtime classes identical across all actual adapters.
const scoped = register({ namespace: 'artroom-s4-owner' });
after(async () => { await scoped.unregister(); });
const load = source => scoped.import(source, import.meta.url);
const { canonicalize, parseStrict, digestBytes, entryHash, itemQueryArgument, itemQueryDigest, readItemQueryParameter, readMinimumParameter, textDigest, utf8 } = await load('@generalbusiness/dap-bytes');
const { secretSigner, signedIntent } = await load('@generalbusiness/dap-client');
const { issueQuestionsBrief, FINDING_DIGESTS, QUESTION_DIGESTS, J4_DIGESTS } = await load('@generalbusiness/dap-lanes');
const { StandIn, SERVICE } = await load(new URL('../../../packages/mcp/test/support/standin.ts', import.meta.url).href);
const { RepoInAi } = await load(new URL('../src/repo-in-ai.ts', import.meta.url).href);
const { ReviewStore } = await load(new URL('../src/review-store.ts', import.meta.url).href);
const { Collection } = await load(new URL('../src/reads.ts', import.meta.url).href);
const { FIRST_CARD_TEXT, captureQuestionAction, decisionSource, fitsFirstCard, questionSubject } = await load(new URL('../src/decision.ts', import.meta.url).href);
const { changeSubject } = await load(new URL('../src/change.ts', import.meta.url).href);
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

// The request's nine lanes: every lane read at the scope limit of one call, and a mark that covers one window.
test('nine lanes: repeated calls reach every lane, each call says what it left out, and a mark leaves other lanes unreviewed', async t => {
  const f = fixture(t), states = Array.from({ length: 9 }, () => f.lane());
  for (const state of states) state.items.push(item(1, 'ask', 'asked', { question: 'TEST question' }, { bodyAt: 1 }, { asker: f.other }),
    item(2, 'approval-request', 'open', {}, { ask: 1, bodyAt: 1 }, { requested: f.viewer, requester: f.other }));
  const walk = async (read) => {
    const seen = [], left = [], counts = [];
    let after;
    do {
      assert.ok(seen.length < 4, 'The windows of nine lanes end');
      const answer = await read(after === undefined ? {} : { after });
      assert.equal(answer.isError, false);
      const data = answer.structuredContent;
      seen.push(data.rows.filter(row => states.some(state => state.ref.scope === row.scope.scope)).map(row => row.scope.scope));
      left.push(data.omittedScopes.map(ref => ref.scope));
      counts.push(data.counters.scopes);
      assert.equal(data.complete, false, 'A window is never the whole room');
      after = data.next ?? undefined;
    } while (after !== undefined);
    return { seen, left, counts };
  };
  const all = states.map(state => state.ref.scope).sort();
  for (const read of [args => f.app.needsYou(args), args => f.app.since(args)]) {
    const { seen, left, counts } = await walk(read);
    assert.deepEqual(seen.map(rows => rows.length), [6, 3], 'The walk has a window of six lanes and a window of three');
    assert.deepEqual(seen.flat().sort(), all, 'The windows reach all nine lanes, each once');
    seen.forEach((rows, index) => assert.deepEqual([...rows, ...left[index]].sort(), all, 'Each call names every lane it did not read'));
    assert.ok(counts.every(count => count <= 8), 'Each call keeps the scope limit');
  }
  assert.equal((await f.app.since({ after: 'TEST not a scope' })).structuredContent.error, 'after-selector');

  // Through the card: the first window offers a mark, and that mark covers only its own lanes.
  const source = decisionSource(f.app);
  const first = await source.read({ screen: 'change', position: 0, page: 'updates' });
  assert.equal(first.status, 'ready');
  const mark = first.card.actions.find(action => action.id === 'mark-reviewed');
  assert.ok(mark, 'A complete window offers a mark');
  assert.ok(first.card.reasons.some(reason => reason.includes('leaves out 3 lanes')));
  const windowOne = mark.capture.heads.map(point => point.scope.scope).filter(scope => all.includes(scope));
  assert.equal(windowOne.length, 6);
  assert.deepEqual((await source.markReviewed(mark.capture, { view: 'TEST', cut: 1, admit() {} })).structuredContent, { localStatus: 'marked' }, 'The mark reads the lanes of its own capture');
  const after = (await f.app.since()).structuredContent;
  assert.deepEqual(after.rows, [], 'The marked window has no new head');
  assert.equal(after.complete, false, 'The room is still not complete');
  assert.equal(after.omittedScopes.length, 3);
  const empty = await source.read({ screen: 'change', position: 0, page: 'updates' });
  assert.equal(empty.status, 'incomplete');
  assert.match(empty.fallback, /leaves out 3 lanes.*open this screen again with scope/);

  // The second window still shows its three lanes as never reviewed, and a mark can reach them.
  const second = await source.read({ screen: 'change', position: 0, page: 'updates', scope: after.next });
  assert.deepEqual(second.card.reviewIntended.map(range => range.scope).sort(), all.filter(scope => !windowOne.includes(scope)));
  const secondRows = (await f.app.since({ after: after.next })).structuredContent.rows;
  assert.ok(secondRows.every(row => row.since === null));
  const secondMark = second.card.actions.find(action => action.id === 'mark-reviewed');
  assert.deepEqual((await source.markReviewed(secondMark.capture, { view: 'TEST', cut: 2, admit() {} })).structuredContent, { localStatus: 'marked' }, 'A mark reaches the lanes of the second window');
  assert.deepEqual((await f.app.since({ after: after.next })).structuredContent.rows, [], 'The second mark covers the second window');
  assert.deepEqual((await f.app.since()).structuredContent.rows, [], 'The first window keeps its marks after the second mark');

  // The Work list reads the first window. It names the omission and offers nothing it would refuse.
  const work = await source.read({ screen: 'work', position: 0, page: 'summary' });
  assert.match(work.fallback, /leaves out 3 lanes\. The Work list reads only the first lanes\./, 'The Work list names its omission');
  assert.doesNotMatch(work.fallback, /with scope/, 'The Work list offers no scope');
  assert.equal('next' in (await f.app.work()).structuredContent, false, 'The Work tool answer has no next');

  // The session and its tool take that scope on a list.
  const sessions = new ViewSessions(source, () => ({ call: async () => { throw Error('TEST no generic read'); } }), async () => { throw Error('TEST no act'); }, async () => { throw Error('TEST no settle'); });
  assert.equal((await sessions.open('TEST-window', 'change', undefined, undefined, after.next).catch(error => ({ status: error.message }))).status, 'incomplete', 'The session opens a list at its next window');
  await assert.rejects(() => sessions.open('TEST-bad-window', 'change', undefined, undefined, 'TEST not a scope'), /selected scope/);

  // A capture cannot name a scope outside the room, and a list is the only screen with a scope.
  const stranger = { scope: { ...after.next, scope: 'sc_' + 'z'.repeat(52) }, head: second.card.projection[0] && { seq: 0, hash: 'sha256:' + 'a'.repeat(64) } };
  assert.equal((await source.markReviewed({ ...mark.capture, heads: [stranger] }, { view: 'TEST', cut: 3, admit() {} })).structuredContent.reason, 'outside-room', 'A capture cannot name a lane outside the room');
  assert.equal((await source.read({ screen: 'work', position: 0, page: 'summary', scope: after.next })).status, 'unavailable');
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

async function question(f, body = 'TEST current Question body\n', idempotencyKey) {
  const state = f.lane(), signed = await signedIntent(f.signer, { to: state.ref, kind: 'ask', fields: { question: 'TEST question', body: textDigest(body), brief: f.brief.digest } }, { now: NOW, ...(idempotencyKey ? { idempotencyKey } : {}) });
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

test('context remains readable above 50 entries and counts its 512-entry history allowance once', async t => {
  const f = fixture(t), q = await question(f);
  while (q.state.entries.length < 512) f.peer.append(q.state, { type: 'timed', item: 0, rule: 'TEST full lane history', due: '2099-01-01T00:00:00Z' });
  const got = await f.app.context({ question: { scope: q.state.ref, ask: q.opening.entry.seq } });
  assert.equal(got.isError, false); assert.equal(got.structuredContent.complete, true);
  assert.equal(got.structuredContent.counters.history, 512, 'The separately read bodyAt is already part of the whole history');
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

test('review marks stay on one device while another device sees the same room changes (scope answers are stand-ins)', async t => {
  const f = fixture(t), state = f.lane();
  const secondHome = join(f.home, 'second-device');
  mkdirSync(secondHome, { mode: 0o700 });
  // The same room, key and native-head stand-ins isolate the storage boundary.
  const second = new RepoInAi({ ...f.options, reviewStore: new ReviewStore(secondHome) });
  const first = (await f.app.since()).structuredContent;
  assert.ok(first.rows.some(row => row.scope.scope === state.ref.scope));
  assert.deepEqual((await second.since()).structuredContent.rows, first.rows);
  const source = decisionSource(f.app);
  const card = (await source.read({ screen: 'change', position: 0, page: 'summary' })).card;
  assert.ok(card.reasons.includes('Mark reviewed moves your place on this device and closes nothing. Another device keeps its own place, so it shows these changes again.'));
  const action = card.actions.find(action => action.id === 'mark-reviewed');
  assert.ok(action);
  const before = f.peer.head(state);
  assert.deepEqual((await source.markReviewed(action.capture, { view: 'TEST', cut: 1, admit() {} })).structuredContent, { localStatus: 'marked' });
  assert.equal((await f.app.since()).structuredContent.rows.length, 0);
  assert.equal((await new RepoInAi({ ...f.options, reviewStore: new ReviewStore(f.home) }).since()).structuredContent.rows.length, 0);
  assert.deepEqual((await second.since()).structuredContent.rows, first.rows);
  assert.deepEqual(f.peer.head(state), before, 'A local mark changes no native room head.');
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
  const f = fixture(t), q = await question(f, 'TEST current Question body. '.repeat(40)), older = structuredClone(q.state);
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
  const source = decisionSource(app), sessions = new ViewSessions(source, () => ({ call: async () => { throw Error('Unexpected generic read.'); } }), async (kind, args, admit) => {
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
  const summary = sessions.display('floor'); assert.equal(summary.status, 'ready'); assert.deepEqual(summary.card.actions, [], 'A text too long for the first card keeps its acts behind Open');
  const initial = await sessions.read('floor', summary.cut, { page: 'item' }); assert.equal(initial.status, 'ready'); assert.equal(initial.card.actions[0].id, 'approve');
  const done = await sessions.act('floor', initial.cut, 'approve'); assert.equal(done.result.structuredContent.answer, 'accepted'); assert.equal(performed, 1);
  assert.equal(done.display.receipt, 'Review recorded: approved.', 'THE RECEIPT says what the room recorded');
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

/**
 * A scripted change lane: an open proposal, a current version, one earlier version, rules with one required check, a passed job and a review.
 * A STAND-IN answers the reads, and nothing judges these rows. `extra` adds rows of the lane.
 */
function scriptedChange(f, definition, extra = () => []) {
  const state = f.lane(definition), author = { membership: f.peer.membership, member: '@una' };
  const rules = item(1, 'rules', 'current', { revision: 7, approvals: 1, ownerMayReview: false, checks: [{ name: 'security-review', required: true, checker: f.other }, { name: 'style-review', required: false, checker: f.other }], extents: [{ name: 'source', class: 'content' }] });
  state.items.push(item(0, 'proposal', 'open', { title: 'TEST change', number: 4 }, {}, { author }), rules,
    item(6, 'manifest', 'current', { base: 'b'.repeat(40), integration: 'c'.repeat(40), tree: '3'.repeat(40), complete: true, selected: [] }, {}, { authors: [author] }),
    item(7, 'job', 'passed', { name: 'security-review' }, { manifest: 6 }),
    item(9, 'review', 'submitted', { verdict: 'approve' }, { manifest: 6 }, { reviewer: f.other }),
    ...extra(state));
  state.final.push(item(5, 'manifest', 'superseded', { base: 'b'.repeat(40), integration: 'a'.repeat(40), tree: '2'.repeat(40), complete: true, selected: [] }, {}, { authors: [author] }),
    item(8, 'result', 'recorded', { outcome: 'passed' }, { job: 7 }, { checker: f.other }));
  while (state.entries.length <= 20) f.peer.append(state, { type: 'timed', item: 0, rule: 'TEST scripted change position', due: '2099-01-01T00:00:00Z' });
  return state;
}

// Every read of a room with no finding profile, as canonical bytes. The finding profile left these bytes alone at main 76cac675. J2 added a change's Earlier versions lines, the diff read's label and its interdiff reads. J5 added three reasons on each needs_you row, and entry lines on since and the updates card. The actor-chip head adds signer displays from the exact entry and its membership, with explicit unavailable words; the ordinary row records stay the same. The card words head took the raw row out of the card's body, into a disclosure, gave each card a kicker and each act its receipt words, gave the rule line words, added a merge row's holds, and said what an empty list means.
test('a room with no finding profile reads byte for byte as it did before the finding profile', async t => {
  const f = fixture(t), source = decisionSource(f.app);
  const ready = scriptedChange(f, 'sha256:e6c55417a6d686f34ee05eaa477f0dd6918c997268deb43ae735a2f1d0d3bfb7');
  const requested = scriptedChange(f, 'sha256:e6c55417a6d686f34ee05eaa477f0dd6918c997268deb43ae735a2f1d0d3bfb7', () => [item(10, 'review-request', 'open', {}, {}, { requested: f.viewer, requester: f.other }),
    item(11, 'merge', 'unknown', {}, { manifest: 6 }, { merger: f.viewer })]);
  const q = await question(f, undefined, 'TEST-fixed-question');
  const screens = { 'needs-you': await source.read({ screen: 'needs-you', position: 0, page: 'summary' }), work: await source.read({ screen: 'work', position: 0, page: 'summary' }), updates: await source.read({ screen: 'change', position: 0, page: 'updates' }),
    ready: await source.read({ screen: 'change', subject: changeSubject(ready.ref), position: 0, page: 'item' }), requested: await source.read({ screen: 'change', subject: changeSubject(requested.ref), position: 0, page: 'item' }),
    question: await source.read({ screen: 'decision', subject: questionSubject(q.state.ref, q.opening.entry.seq), position: 0, page: 'item' }) };
  const tools = { needsYou: await f.app.needsYou(), work: await f.app.work(), since: await f.app.since(), ready: await f.app.change({ scope: ready.ref }), requested: await f.app.change({ scope: requested.ref }), context: await f.app.context({ question: { scope: q.state.ref, ask: q.opening.entry.seq } }) };
  assert.equal(screens.ready.card.actions[0].id, 'merge', 'The compared room offers a merge, so the bytes cover its signed revisions');
  assert.equal(tools.needsYou.structuredContent.rows.length, 5, 'The compared room holds attention rows, so the bytes cover them');
  const actual = canonicalize({ screens, tools }), golden = new URL('./j4-reads.golden.json', import.meta.url);
  assert.equal(actual, canonicalize(parseStrict(readFileSync(golden, 'utf8'))), 'NON-FINDING ROOM: the canonical reads and cards differ from their value before the finding profile');
});

// A person is not told to do what the card offers no way to do, and is not told to open a card that is open.
test('a card says only what this page offers', async t => {
  const f = fixture(t), source = decisionSource(f.app);
  const ready = scriptedChange(f, J4_DIGESTS.change);
  const requested = scriptedChange(f, J4_DIGESTS.change, () => [item(10, 'review-request', 'open', {}, {}, { requested: f.viewer, requester: f.other }),
    item(11, 'merge', 'unknown', {}, { manifest: 6 }, { merger: f.viewer })]);
  const read = async (state, page) => (await source.read({ screen: 'change', subject: changeSubject(state.ref), position: 0, page })).card;
  assert.deepEqual((await read(ready, 'summary')).reasons, ["Open this card to read the change or merge it. The room's rules decide each act.", "The signer of this entry is unavailable in this read."]);
  assert.deepEqual((await read(ready, 'item')).reasons, ["The room's rules decide each act.", "The signer of this entry is unavailable in this read."]);
  assert.deepEqual((await read(requested, 'summary')).actions, []);
  assert.deepEqual((await read(requested, 'summary')).reasons, ['Open this card to read the change.', 'The signer of this entry is unavailable in this read.']);
  assert.deepEqual((await read(requested, 'item')).reasons, ['The signer of this entry is unavailable in this read.']);

  const q = await question(f, undefined, 'TEST-fixed-question');
  const asked = async page => (await source.read({ screen: 'decision', subject: questionSubject(q.state.ref, q.opening.entry.seq), position: 0, page })).card;
  assert.deepEqual((await asked('summary')).actions.map(action => action.kind), (await asked('item')).actions.map(action => action.kind));
  assert.deepEqual((await asked('item')).reasons, (await asked('item')).actions.length ? ["The room's rules decide each act."] : []);
  assert.deepEqual((await asked('summary')).reasons, ["The room's rules decide each act."], 'A SHORT TEXT: the first card holds the text and its acts, so it names no Open step');
  const long = await question(f, 'TEST long text. '.repeat(50)), kept = (await source.read({ screen: 'decision', subject: questionSubject(long.state.ref, long.opening.entry.seq), position: 0, page: 'summary' })).card;
  assert.match(kept.reasons[0], /^Open this card to read the question/, 'A LONG TEXT: the first card sends the person to Open');
  assert.ok(!kept.reasons[0].includes('sha256:'), 'A card reason shows no digest');
});

// Words over scripted scope answers: nothing judges these rows. `packages/mcp/test/change-view.scope.test.ts` runs the merge guard on the real lane.
const refusedBy = (id, reviewer, manifest = 6) => item(id, 'review', 'submitted', { verdict: 'request-changes' }, { manifest }, { reviewer });
const mergeRow = async f => (await f.app.needsYou()).structuredContent.rows.find(row => row.category === 'merge-attention');

test('a refused version waits on its author: the row says who asked for changes, and no longer says merge', async t => {
  const own = fixture(t); scriptedChange(own, J4_DIGESTS.change, () => [refusedBy(10, own.viewer)]);
  let row = await mergeRow(own);
  assert.equal(row.needs, 'Change 4: "TEST change" waits on its author, @una.', 'REFUSED BY YOU: the row names who it waits on');
  assert.equal(row.why, 'You requested changes on version 2.', 'REFUSED BY YOU: the row says why');
  assert.equal(row.settles, 'A new version from the author ends the wait. A reviewer who requested changes can also replace that verdict with a new review. Until then the room refuses a merge of version 2.', 'REFUSED BY YOU: the row says what ends the wait');
  assert.deepEqual(row.settledBy, ['propose-manifest', 'review-verdict'], 'REFUSED BY YOU: the row names the acts that end it');
  assert.deepEqual([row.rule.clause, row.holds, row.changesRequested], ['acts.merge#changes-requested;items.review', ['changes-requested'], [10]], 'REFUSED BY YOU: the exact fields stay true for a model');
  assert.equal(row.category, 'merge-attention', 'A MODEL\'S CATEGORY stays');

  const mix = fixture(t); scriptedChange(mix, J4_DIGESTS.change, () => [refusedBy(10, mix.viewer), refusedBy(11, { membership: mix.peer.membership, member: '@ola' })]);
  assert.equal((await mergeRow(mix)).why, 'You and @ola requested changes on version 2.', 'A MIX: the row names everyone who asked');

  const other = fixture(t); scriptedChange(other, J4_DIGESTS.change, () => [refusedBy(10, other.other)]);
  assert.equal((await mergeRow(other)).why, 'Your role holds change.merge, and @vic requested changes on version 2.', 'REFUSED BY ANOTHER: the row names them');

  const author = fixture(t), mine = scriptedChange(author, J4_DIGESTS.change, () => [refusedBy(10, author.other)]);
  mine.items.find(one => one.type === 'proposal').parties.author = author.viewer;
  assert.equal((await mergeRow(author)).needs, 'Change 4: "TEST change" waits on you, its author.', 'THE AUTHOR reads that it waits on them');

  const newer = fixture(t); scriptedChange(newer, J4_DIGESTS.change, () => [refusedBy(10, newer.viewer, 5)]);
  row = await mergeRow(newer);
  assert.equal(row.why, 'Your role holds change.merge. You requested changes on an earlier version.', 'A NEWER VERSION: the old request is named as earlier');
  assert.deepEqual([row.needs, row.settledBy, row.rule.clause, row.changesRequested], ['Merge change 4: "TEST change".', ['merge'], 'acts.merge', []], 'A NEWER VERSION: nothing holds this version');
});

test('the opened needs-you item shows no raw row: the exact row and rule stay behind a disclosure and in the fields a model reads', async t => {
  const f = fixture(t), state = f.lane(QUESTION_DIGESTS.issue);
  state.items.push(item(1, 'ask', 'asked', { question: 'TEST question' }, { bodyAt: 1 }, { asker: f.other }), item(2, 'approval-request', 'open', {}, { ask: 1, bodyAt: 1 }, { requested: f.viewer, requester: f.other }));
  const [row] = (await f.app.needsYou()).structuredContent.rows, source = decisionSource(f.app);
  for (const page of ['summary', 'item']) {
    const { card } = await source.read({ screen: 'needs-you', position: 0, page });
    assert.equal(card.body, undefined, `NO RAW ROW: the ${page} page has no JSON body`);
    assert.equal(card.kicker, 'Question 1', 'THE KICKER says the room\'s word');
    assert.deepEqual(JSON.parse(card.record.text), JSON.parse(JSON.stringify(row)), 'NOTHING LOST: the disclosure holds the whole row');
    assert.deepEqual(card.rule, { definition: QUESTION_DIGESTS.issue, clause: 'acts.request-approval;items.approval-request' }, 'NOTHING LOST: the exact rule stays');
    assert.ok(!card.reasons.join('\n').includes('sha256:'), 'A PERSON READS WORDS: no reason prints a digest');
    assert.ok(card.reasons.includes("Rule: this lane's rule for an approval request."), 'A PERSON READS WORDS: the rule line says what the rule covers');
  }
  assert.deepEqual([row.rule.definition, row.rule.clause], [QUESTION_DIGESTS.issue, 'acts.request-approval;items.approval-request'], 'THE MODEL\'S ROW keeps the digest and the clause');
});

test('two work rows that read alike tell a person which lane and which agent each one is', async t => {
  const f = fixture(t), [one, two] = [f.lane(QUESTION_DIGESTS.issue), f.lane(QUESTION_DIGESTS.issue)];
  const agent = member => ({ membership: f.peer.membership, member });
  f.M.items.push(item(8, 'member', 'active', { kind: 'agent', role: 'agent', handle: '@una' }, {}, { member: agent('@una'), controller: f.other }),
    item(9, 'member', 'active', { kind: 'agent', role: 'agent', handle: '@una2' }, {}, { member: agent('@una2'), controller: f.viewer }));
  for (const [state, performer, title, number] of [[one, '@una', 'TEST first import', 1], [two, '@una2', 'TEST second import', 2]]) {
    Object.assign(f.D.items.find(row => row.type === 'lane' && row.refs.scope === state.ref).values, { kind: 'issue', title, number });
    state.items.push(item(1, 'intent', 'open', { conditions: ['TEST large files import'] }, { conditionsAt: 0 }),
      item(2, 'commitment', 'accepted', { conditions: ['TEST large files import'] }, { conditionsAt: 0, termsAt: 2 }, { performer: agent(performer) }));
  }
  const source = decisionSource(f.app), cards = [(await source.read({ screen: 'work', position: 0, page: 'summary' })).card, (await source.read({ screen: 'work', position: 1, page: 'summary' })).card];
  assert.notEqual(cards[0].title, cards[1].title, 'TELL THEM APART: the titles differ');
  assert.notEqual(cards[0].summary, cards[1].summary, 'TELL THEM APART: the summaries differ');
  assert.deepEqual(cards.map(card => card.title).sort(), ['Issue 1: TEST first import', 'Issue 2: TEST second import'], 'THE TITLE names the lane, in the room\'s word');
  assert.deepEqual(cards.map(card => card.summary).sort(), ['@una, agent of @vic, accepted this work.', '@una2, agent of @rita, accepted this work.'], 'THE SUMMARY names who holds the work');
  for (const card of cards) {
    assert.equal(card.kicker, 'Work', 'THE KICKER says the room\'s word');
    assert.equal(card.body, undefined, 'NO RAW ROW: the work card has no JSON body');
    assert.ok(card.reasons.includes('Conditions: TEST large files import.'), 'THE LINES say what was agreed');
    assert.ok(!card.reasons.join('\n').includes('sha256:') && !card.summary.includes('items.commitment'), 'A PERSON READS WORDS: no digest and no clause');
    assert.ok(JSON.parse(card.record.text).rule.definition.startsWith('sha256:'), 'NOTHING LOST: the disclosure holds the exact row');
  }
});

test('kickers and receipts use the room\'s words, and the model\'s context keeps the entry', async t => {
  const f = fixture(t), source = decisionSource(f.app), state = scriptedChange(f, J4_DIGESTS.change), q = await question(f);
  const change = (await source.read({ screen: 'change', subject: changeSubject(state.ref), position: 0, page: 'item' })).card;
  assert.equal(change.kicker, 'Change 4, version 2', 'THE CHANGE KICKER');
  assert.deepEqual(change.actions.map(action => action.done), ['Merge started.'], 'THE MERGE RECEIPT');
  const reviewable = scriptedChange(f, J4_DIGESTS.change, () => [item(10, 'review-request', 'open', {}, {}, { requested: f.viewer, requester: f.other })]);
  const asked = (await source.read({ screen: 'change', subject: changeSubject(reviewable.ref), position: 0, page: 'item' })).card;
  for (const action of asked.actions.filter(one => one.kind === 'review-verdict')) assert.equal(action.done, action.id === 'approve' ? 'Review recorded: approved.' : 'Review recorded: changes requested.', 'THE REVIEW RECEIPT');
  const decision = (await source.read({ screen: 'decision', subject: questionSubject(q.state.ref, q.opening.entry.seq), position: 0, page: 'item' })).card;
  assert.equal(decision.kicker, `Question ${q.opening.entry.seq}`, 'THE QUESTION KICKER');
  assert.deepEqual(decision.actions.map(action => action.done), ['Review recorded: approved.', 'Review recorded: changes requested.'], 'THE QUESTION RECEIPTS');
  assert.equal((await source.read({ screen: 'change', position: 0, page: 'updates' })).card.kicker, 'Updates', 'THE UPDATES KICKER');
  for (const card of [change, decision, asked]) assert.ok(!/manifest|\bask\b|approval-request/.test(card.kicker), `NO INTERNAL NAME in ${card.kicker}`);
});

test('an empty list says that nothing is open, in words, and no list speaks of rows', async t => {
  const f = fixture(t), source = decisionSource(f.app);
  const said = {};
  for (const screen of ['needs-you', 'work']) said[screen] = await source.read({ screen, position: 0, page: 'summary' });
  // The first read of updates lists the room's own lanes. Mark reviewed moves the place, and then nothing has changed.
  const updates = await source.read({ screen: 'change', position: 0, page: 'updates' });
  const mark = updates.card.actions.find(action => action.id === 'mark-reviewed');
  assert.deepEqual((await source.markReviewed(mark.capture, { view: 'TEST', cut: 1, admit() {} })).structuredContent, { localStatus: 'marked' });
  said.change = await source.read({ screen: 'change', position: 0, page: 'updates' });
  assert.deepEqual(Object.values(said).map(one => one.status), ['empty', 'empty', 'empty'], 'A COMPLETE READ of an empty room');
  assert.deepEqual(Object.values(said).map(one => one.fallback), ['Nothing in this room needs you.', 'No work is open in this room.', 'Nothing has changed since your last review.'], 'THE WORDS');
  for (const one of Object.values(said)) assert.ok(!/\brows?\b|reviewed scope/.test(one.fallback), 'NO INTERNAL WORDS');
});

test('a question fits the first card up to the named bound, in characters and in lines, and the first card never shows part of a text', async t => {
  assert.deepEqual([FIRST_CARD_TEXT.characters, FIRST_CARD_TEXT.lines], [600, 8], 'THE NAMED BOUND');
  assert.equal(fitsFirstCard('x'.repeat(FIRST_CARD_TEXT.characters)), true, 'AT THE BOUND: the text fits');
  assert.equal(fitsFirstCard('x'.repeat(FIRST_CARD_TEXT.characters + 1)), false, 'PAST THE BOUND: the text does not fit');
  assert.equal(fitsFirstCard(Array.from({ length: FIRST_CARD_TEXT.lines }, () => 'x').join('\n')), true, 'AT THE LINE BOUND: the text fits');
  assert.equal(fitsFirstCard(Array.from({ length: FIRST_CARD_TEXT.lines + 1 }, () => 'x').join('\n')), false, 'PAST THE LINE BOUND: the text does not fit');
  const f = fixture(t), source = decisionSource(f.app);
  const first = async body => { const q = await question(f, body); return (await source.read({ screen: 'decision', subject: questionSubject(q.state.ref, q.opening.entry.seq), position: 0, page: 'summary' })).card; };
  const short = await first('x'.repeat(FIRST_CARD_TEXT.characters)), long = await first('x'.repeat(FIRST_CARD_TEXT.characters + 1));
  assert.deepEqual([short.body, short.wholeText, short.actions.map(action => action.id)], ['x'.repeat(FIRST_CARD_TEXT.characters), true, ['approve', 'request-changes']], 'THAT FITS: the whole text and both acts');
  assert.equal(long.wholeText, undefined, 'THAT DOES NOT FIT: the card does not claim the whole text, so the session keeps its acts behind Open');
});

test('a Question detail at the UTF-8 card budget remains reachable through a summary with no hidden body or native acts', async t => {
  const f = fixture(t), q = await question(f), { context } = await f.app.question(q.state.ref, q.opening.entry.seq);
  const subject = questionSubject(q.state.ref, q.opening.entry.seq), bytes = card => utf8(canonicalize(card)).length;
  // Only the body varies in this scripted context. The actual adapter and mounted
  // session run unchanged; these reads prove no Native judgment or host limit.
  let body;
  const source = decisionSource({ question: async () => ({ context: { ...context, body } }) });
  const read = page => source.read({ screen: 'decision', subject, position: 0, page });
  const unexpected = async () => { assert.fail('This projection test sends no generic read or act.'); };
  for (const prefix of ['x'.repeat(601), 'é😀"\\\n'.repeat(103)]) {
    body = prefix;
    const seed = await read('item');
    assert.equal(seed.status, 'ready');
    body += 'x'.repeat(60 * 1024 - bytes(seed.card));
    const exact = body, detail = await read('item');
    assert.equal(bytes(detail.card), 60 * 1024, 'The complete detail reaches the canonical UTF-8 byte limit exactly.');
    const sessions = new ViewSessions(source, () => ({ call: unexpected }), unexpected, unexpected);
    assert.equal((await sessions.open('TEST-budget', 'decision', subject)).status, 'ready', 'A detail that fits remains reachable.');
    const summary = sessions.display('TEST-budget');
    assert.deepEqual(summary.context.navigation, ['open']);
    assert.equal(summary.card.body, undefined, 'The navigation summary carries no hidden or partial text.');
    assert.deepEqual(summary.card.actions, [], 'The summary offers no native act before the whole text.');
    assert.equal(summary.card.wholeText, undefined);
    for (const field of ['identity', 'actor', 'actorLabel', 'projection']) assert.deepEqual(summary.card[field], detail.card[field], `Open retains ${field}.`);
    const opened = await sessions.read('TEST-budget', summary.cut, { page: 'item' });
    assert.equal(opened.status, 'ready');
    assert.equal(opened.card.body, exact, 'Open reads the exact whole text, including UTF-8 and JSON escapes.');
    assert.deepEqual(opened.card.actions.map(action => action.id), ['approve', 'request-changes']);
    assert.deepEqual(opened.card.identity, summary.card.identity);
    body += 'x';
    for (const page of ['summary', 'item']) {
      const refused = await read(page);
      assert.equal(refused.status, 'incomplete', 'One additional body byte refuses both pages.');
      assert.equal(refused.card, undefined);
    }
    const refused = await sessions.read('TEST-budget', opened.cut, { page: 'summary' });
    assert.equal(refused.status, 'incomplete');
    assert.equal(refused.card, undefined);
    assert.ok(!refused.context.navigation.includes('open'));
  }
});

// The finding profile over scripted scope answers. No scope judges these rows, so nothing here shows a guard: `packages/mcp/test/change-view.scope.test.ts` runs the real lane.
const FILE = 'src/a.ts';
const scriptedFinding = (f, id, source, values = {}, refs = {}, parties = {}) => item(id, 'finding', 'open', { file: FILE, start: 10, end: 12, class: 'race', severity: 'high', confidence: 80, scenario: 'TEST two writers', source, sourceVersion: 'reviewer 1.2', tree: '3'.repeat(40), ...values }, { version: 6, ...refs }, { reporter: f.other, ...parties });
const openFinding = rows => rows.filter(row => row.category === 'open-finding');
const heldBy = rows => rows.find(row => row.category === 'merge-attention')?.heldBy;
const changeCard = async (f, state) => (await decisionSource(f.app).read({ screen: 'change', subject: changeSubject(state.ref), position: 0, page: 'item' })).card;
const ids = card => card.actions.map(action => action.id);

test('an open finding from a required source appears in needs_you with its rule and head and on the card, holds the merge there, and leaves both once it is answered', async t => {
  const f = fixture(t), state = scriptedChange(f, FINDING_DIGESTS.change, () => [scriptedFinding(f, 12, 'security-review')]);
  const rows = (await f.app.needsYou()).structuredContent.rows, [row] = openFinding(rows);
  assert.equal(openFinding(rows).length, 1, 'HELD IN NEEDS_YOU: the required open finding has a row');
  assert.deepEqual(row.rule, { definition: FINDING_DIGESTS.change, clause: 'acts.merge#finding-open;items.finding' }, 'HELD IN NEEDS_YOU: the row names its exact pin and the guard that holds the merge');
  assert.deepEqual(row.head, f.peer.head(state), 'HELD IN NEEDS_YOU: the row names the head it read');
  assert.deepEqual([row.holdsMerge, row.rulesRevision, row.sourceRow.name, row.file, row.start, row.end, row.class, row.severity, row.source, row.sourceVersion, row.version], [true, 7, 'security-review', FILE, 10, 12, 'race', 'high', 'security-review', 'reviewer 1.2', 6], 'HELD IN NEEDS_YOU: the row carries the finding and its bound rule');
  assert.deepEqual(heldBy(rows), [12], 'HELD IN NEEDS_YOU: the merge row names the finding that holds it');
  const listed = await decisionSource(f.app).read({ screen: 'needs-you', position: rows.indexOf(row), page: 'summary' });
  assert.deepEqual([listed.card.identity.kind, listed.card.identity.item, JSON.parse(listed.card.record.text).category], ['finding', '12', 'open-finding'], 'HELD IN NEEDS_YOU: the needs-you card holds the row behind its disclosure');

  const card = await changeCard(f, state);
  for (const line of ['Finding 12: holds the merge.', `File: ${FILE}`, 'Lines: 10 to 12', 'Class: race', 'Severity: high', 'Source: security-review', 'Source version: reviewer 1.2', 'Change version: 2, manifest 6, the version this card shows.', 'Filed by: @vic (person)'])
    assert.ok(card.body.split('\n').includes(line), `HELD ON THE CARD: the card shows the line "${line}"`);
  assert.ok(card.body.includes('A required source has an open finding, so this change cannot merge until someone answers it.'), 'HELD ON THE CARD: the card says that the finding holds the merge');
  assert.ok(card.summary.endsWith('1 open finding holds the merge.'), 'HELD ON THE CARD: the summary says that the finding holds the merge');
  assert.equal(ids(card).includes('merge'), false, 'HELD ON THE CARD: the card offers no merge while a required finding is open');
  assert.ok(card.body.includes('The ordinary dap mcp server does: change.resolve-finding-any'), 'The card names the tool that answers a finding, for it offers no answer itself');
  const told = (await f.app.change({ scope: state.ref })).structuredContent.change.findings;
  assert.deepEqual(told.map(found => [found.id, found.required, found.holdsMerge, found.reporterIs, found.values.scenario]), [[12, true, true, '@vic (person)', 'TEST two writers']], 'The change tool returns the whole finding, with its scenario');

  // Answered: a final item leaves the summary, as a scope's does.
  const answered = state.items.splice(state.items.findIndex(row => row.type === 'finding'), 1)[0];
  state.final.push({ ...answered, state: 'resolved' });
  f.peer.append(state, { type: 'timed', item: 0, rule: 'TEST answered', due: '2099-01-01T00:00:01Z' });
  const after = (await f.app.needsYou()).structuredContent.rows;
  assert.deepEqual(openFinding(after), [], 'AFTER RESOLVE: the finding leaves needs_you');
  assert.deepEqual(heldBy(after), [], 'AFTER RESOLVE: nothing holds the merge row');
  const cleared = await changeCard(f, state);
  assert.equal(cleared.body.includes('Finding 12'), false, 'AFTER RESOLVE: the finding leaves the card');
  assert.equal(cleared.body.includes('holds the merge'), false, 'AFTER RESOLVE: the card no longer says that anything holds the merge');
  assert.equal(ids(cleared)[0], 'merge', 'AFTER RESOLVE: the card offers the merge');
  assert.deepEqual((await f.app.change({ scope: state.ref })).structuredContent.change.findings, [], 'AFTER RESOLVE: the change tool holds no open finding');
});

test('a finding from a source that is not required stays on the card, does not hold the merge there, and has no row in needs_you', async t => {
  const f = fixture(t), state = scriptedChange(f, FINDING_DIGESTS.change, () => [scriptedFinding(f, 12, 'style-review')]);
  const rows = (await f.app.needsYou()).structuredContent.rows;
  assert.deepEqual(openFinding(rows), [], 'NOT REQUIRED: the finding has no row in needs_you');
  assert.deepEqual(heldBy(rows), [], 'NOT REQUIRED: the merge row names no finding');
  const card = await changeCard(f, state);
  assert.ok(card.body.split('\n').includes('Finding 12: open. It does not hold the merge, because its source is not required.'), 'NOT REQUIRED: the card lists the finding and says that it does not hold the merge');
  assert.equal(card.body.includes('A required source has an open finding'), false, 'NOT REQUIRED: the card does not say that the merge is held');
  assert.equal(card.summary.includes('holds the merge'), false, 'NOT REQUIRED: the summary does not say that the merge is held');
  assert.equal(ids(card)[0], 'merge', 'NOT REQUIRED: the card offers the merge');
  const told = (await f.app.change({ scope: state.ref })).structuredContent.change.findings;
  assert.deepEqual(told.map(found => [found.required, found.holdsMerge]), [[false, false]], 'NOT REQUIRED: the change tool says the same');
});

test('needs_you lists a required finding only for a viewer with an act that bears on it, and names those acts', async t => {
  const f = fixture(t), una = { membership: f.peer.membership, member: '@una' };
  const state = scriptedChange(f, FINDING_DIGESTS.change, () => [scriptedFinding(f, 12, 'security-review')]);
  const proposal = state.items.find(row => row.type === 'proposal'), reporter = state.items.find(row => row.type === 'finding');
  const seen = async (actions, { author = una, filer = f.other } = {}) => {
    f.M.items[0].values.adminActions = actions; proposal.parties.author = author; reporter.parties.reporter = filer;
    return openFinding((await f.app.needsYou()).structuredContent.rows).map(row => row.acts);
  };
  assert.deepEqual(await seen(['change.review', 'change.propose']), [], 'CAN ACT: a member who wrote nothing and can answer nothing has no row');
  assert.deepEqual(await seen(['change.dismiss']), [['resolve-finding-any', 'mark-finding-irrelevant']], 'CAN ACT: a holder of change.dismiss can answer');
  assert.deepEqual(await seen(['change.dismiss'], { author: f.viewer }), [], 'CAN ACT: the opener cannot answer with change.dismiss');
  assert.deepEqual(await seen(['change.propose'], { author: f.viewer }), [['propose-manifest']], 'CAN ACT: the opener can propose a new version');
  assert.deepEqual(await seen(['change.check'], { filer: f.viewer }), [['resolve-finding-own']], 'CAN ACT: the source that filed it can resolve it');
  assert.deepEqual(await seen(['change.check']), [], 'CAN ACT: another source has no row');
  assert.deepEqual(await seen(['change.merge']), [['merge']], 'CAN ACT: a holder of change.merge has a row, for the finding holds that merge');
});

test('a finding on an earlier version reads that version from the retained items, and a closed or merged change lists no row', async t => {
  const f = fixture(t), state = scriptedChange(f, FINDING_DIGESTS.change, () => [scriptedFinding(f, 12, 'security-review', {}, { version: 5 })]);
  f.M.items[0].values.adminActions = ['change.dismiss'];
  const earlier = state.final.find(row => row.id === 5); earlier.parties.authors = [f.viewer];
  const asked = () => f.peer.requests.filter(request => request.includes('/query-items')).length, before = asked();
  assert.deepEqual(openFinding((await f.app.needsYou()).structuredContent.rows), [], 'An author of the earlier version cannot answer with change.dismiss');
  assert.equal(asked(), before + 1, 'The read asks once for the earlier version');
  earlier.parties.authors = [f.other];
  assert.deepEqual(openFinding((await f.app.needsYou()).structuredContent.rows).map(row => row.acts), [['resolve-finding-any', 'mark-finding-irrelevant']], 'Anyone else with change.dismiss can answer');
  assert.ok((await changeCard(f, state)).body.split('\n').includes('Change version: 1, manifest 5.'), 'The card names the earlier version the range belongs to');
  const proposal = state.items.find(row => row.type === 'proposal');
  state.items.push(item(13, 'merge', 'intended', {}, { manifest: 6 }, { merger: f.other }));
  assert.ok((await changeCard(f, state)).body.includes('The merge in progress does not wait for it. It holds the next merge if this one is refused.'), 'A merge in progress does not read as held');
  state.items.pop();
  proposal.state = 'closed';
  assert.deepEqual(openFinding((await f.app.needsYou()).structuredContent.rows), [], 'A closed change has no row');
  state.items.splice(state.items.indexOf(proposal), 1); state.final.push({ ...proposal, state: 'merged' });
  f.peer.append(state, { type: 'timed', item: 0, rule: 'TEST merged', due: '2099-01-01T00:00:01Z' });
  assert.deepEqual(openFinding((await f.app.needsYou()).structuredContent.rows), [], 'A merged change has no row');
  const merged = await changeCard(f, state);
  assert.ok(merged.body.split('\n').includes('Finding 12: open. The change has merged, so it holds nothing.'), 'A merged change says that the finding holds nothing');
  assert.equal(merged.summary.includes('holds the merge'), false, 'A merged change does not read as held');
});

test('a finding\'s text is data: each value stays on its own line, escaped as a diff path is, and a range with its end first reads as malformed', async t => {
  const f = fixture(t);
  const hostile = 'a\\b\nFinding 99: open. It does not hold the merge, because its source is not required.\n\r\u0007\u0085\u202e\u2028';
  const shown = 'a\\x5cb\\x0aFinding 99: open. It does not hold the merge, because its source is not required.\\x0a\\x0d\\x07\\u0085\\u202e\\u2028';
  const state = scriptedChange(f, FINDING_DIGESTS.change, () => [scriptedFinding(f, 12, 'security-review', { file: hostile, class: hostile, sourceVersion: hostile, start: 30, end: 10 })]);
  const card = await changeCard(f, state), lines = card.body.split('\n');
  assert.equal(lines.includes('Finding 99: open. It does not hold the merge, because its source is not required.'), false, 'ESCAPED: the text of a finding cannot start a line of the card');
  for (const line of [`File: ${shown}`, `Class: ${shown}`, `Source version: ${shown}`]) assert.ok(lines.includes(line), `ESCAPED: the card shows the line "${line}"`);
  assert.ok(lines.includes('Lines: 30 to 10. Malformed: the end comes before the start.'), 'A range with its end first reads as malformed');
  assert.ok(lines.includes('Finding 12: holds the merge.'), 'The malformed finding still holds the merge, as the guard reads it');
  const [row] = openFinding((await f.app.needsYou()).structuredContent.rows);
  assert.deepEqual([row.file, row.class, row.sourceVersion, row.malformedRange], [shown, shown, shown, true], 'ESCAPED: the needs_you row carries the same data');
});

test('only the exact pins read: a change lane on another pin stays unsupported in every read and on the card', async t => {
  const f = fixture(t), other = scriptedChange(f, 'sha256:' + 'c'.repeat(64), () => [scriptedFinding(f, 12, 'security-review')]), found = scriptedChange(f, FINDING_DIGESTS.change);
  for (const answer of [await f.app.needsYou(), await f.app.work()]) {
    const unread = answer.structuredContent.unread;
    assert.deepEqual(unread.map(row => [row.scope.scope, row.reason]), [[other.ref.scope, 'unsupported-profile']], 'EXACT PIN: only the lane on another pin is unsupported');
  }
  assert.equal((await f.app.change({ scope: other.ref })).structuredContent.reason, 'change-profile-unsupported', 'EXACT PIN: the change tool refuses another pin');
  assert.equal((await decisionSource(f.app).read({ screen: 'change', subject: changeSubject(other.ref), position: 0, page: 'item' })).status, 'unavailable', 'EXACT PIN: the card refuses another pin');
  assert.equal((await f.app.change({ scope: found.ref })).isError, false, 'EXACT PIN: the change tool reads the finding pin');
  assert.ok((await changeCard(f, found)).body.split('\n').includes(`Lane definition: ${FINDING_DIGESTS.change}.`), 'EXACT PIN: the card names the pin of its lane');
});
