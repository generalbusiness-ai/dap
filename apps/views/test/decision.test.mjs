import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { register } from 'tsx/esm/api';

// Real Decision adapter, mounted views, MCP wire/custody and local store.
// Question projections and scope HTTP/authority are explicit stand-ins;
// these cases prove no native judgment, hosted room or provider behavior.
const scoped = register({ namespace: 'artroom-s4-decision-owner' });
after(async () => { await scoped.unregister(); });
const load = source => scoped.import(source, import.meta.url);
const { digestBytes, utf8 } = await load('@generalbusiness/dap-bytes');
const { DOMAINS } = await load('@generalbusiness/dap-contract');
const { secretSigner } = await load('@generalbusiness/dap-client');
const { issueQuestionsBrief } = await load('@generalbusiness/dap-lanes');
const { LEGACY, McpService, ViewError, Wire, memoryStore, newSession } = await load('@generalbusiness/dap-mcp');
const { StandIn, SERVICE } = await load(new URL('../../../packages/mcp/test/support/standin.ts', import.meta.url).href);
const { decisionSource, questionSubject } = await load(new URL('../src/decision.ts', import.meta.url).href);
const { Unread } = await load(new URL('../src/reads.ts', import.meta.url).href);
const { ReviewStore } = await load(new URL('../src/review-store.ts', import.meta.url).href);
const NOW = Date.parse('2099-01-01T00:00:00Z');
const item = (id, type, state, values = {}, refs = {}, parties = {}) => ({ id, type, state, revision: id, opened: null, values, refs, parties, attributed: [] });

function fixture(t) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'artroom-s4-decision-')));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const base = secretSigner(new Uint8Array(32).fill(52)), actSignatures = [];
  const signer = { key: base.key, sign: bytes => {
    const text = new TextDecoder().decode(bytes), prefix = DOMAINS.intent + '\n';
    if (text.startsWith(prefix)) actSignatures.push(JSON.parse(text.slice(prefix.length)).kind);
    return base.sign(bytes);
  } };
  const peer = new StandIn(signer.key, 'admin', ['issue.approve', 'issue.decide']), scope = peer.lane(issueQuestionsBrief);
  const state = peer.scopes.get(scope.scope), viewer = { membership: peer.membership, member: '@rita' }, other = { membership: peer.membership, member: '@vic' };
  while (state.entries.length < 3) peer.append(state, { type: 'timed', item: 0, rule: 'TEST scripted projection position', due: '2099-01-01T00:00:00Z' });
  const ask = item(1, 'ask', 'asked', { question: 'TEST displayed Question' }, { bodyAt: 1 }, { asker: other });
  const request = item(2, 'approval-request', 'open', {}, { ask: 1, bodyAt: 1 }, { requested: viewer, requester: other });
  state.items.push(ask, request);
  const brief = { bytes: utf8('TEST immutable Brief'), digest: digestBytes(utf8('TEST immutable Brief')) };
  const context = { scope, head: peer.head(state), definition: state.definition, ask, bodyAt: { at: scope, seq: 1, hash: state.entries[1].hash },
    body: 'TEST displayed body', requests: [request], approvals: [], approvalTexts: [], comments: [], versions: [], conditions: [], brief: brief.digest,
    briefMatches: true, viewer, actions: ['issue.approve', 'issue.decide'], items: state.items };
  let current = context, readFailure = false, questionReads = 0;
  const reviewStore = new ReviewStore(home);
  const app = {
    options: { service: SERVICE, signer, reviewStore },
    question: async (ref, id) => {
      questionReads++; assert.deepEqual(ref, scope); assert.equal(id, ask.id);
      if (readFailure) throw new Unread('transport');
      return { context: current };
    },
    collect: async run => ({ value: await run({ directory: peer.directory, viewer, frame: async ref => {
      assert.deepEqual(ref, scope); return { head: peer.head(state) };
    } }) }),
  };
  const source = decisionSource(app), custody = memoryStore();
  const service = new McpService({ service: SERVICE, signer, custody, now: () => NOW, views: source,
    config: { read: async () => peer.config(), addRoot: async () => { throw Error('No provisioning.'); } },
    applicationReads: { revision: digestBytes(utf8('TEST explicit empty catalogue')), tools: [] }, fetch: peer.fetch.bind(peer) });
  return { home, peer, state, scope, viewer, signer, ask, context, source, custody, service, actSignatures,
    revise() { current = { ...context, ask: { ...ask, revision: 3 }, body: 'TEST revised body' }; },
    failRead() { readFailure = true; }, reads() { return questionReads; } };
}

test('a revised Question or failed admission read returns a stale view through MCP without signing or submitting Approve', { timeout: 30000 }, async t => {
  const f = fixture(t), wire = new Wire(f.service), session = newSession(null);
  t.after(() => { wire.endLegacy(session); wire.closeAll(); });
  const send = () => {};
  await wire.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: LEGACY } }, session, send);
  await wire.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }, session, send);
  let id = 2;
  const call = async (name, args) => {
    const reply = await wire.handle({ jsonrpc: '2.0', id: id++, method: 'tools/call', params: { name, arguments: args } }, session, send);
    assert.equal(reply.error, undefined, 'An ordinary stale admission must not become a JSON-RPC internal error');
    return reply.result;
  };
  const open = async view => {
    const summary = await call('view_decision', { view, subject: questionSubject(f.scope, f.ask.id) });
    assert.equal(summary.structuredContent.status, 'ready');
    const read = await call('view_read', { view, cut: 0, page: 'item' });
    assert.equal(read.structuredContent.status, 'ready');
    assert.equal(read.structuredContent.card.actions[0].id, 'approve');
    return read.structuredContent;
  };
  const shown = await open('revised');
  // Paired positive: the same displayed revision is admissible before it changes.
  await f.source.admit({ screen: 'decision', subject: questionSubject(f.scope, f.ask.id) }, shown.card);
  f.revise();
  const before = f.reads(), stale = await call('view_act', { view: 'revised', cut: shown.cut, action: 'approve' });
  assert.equal(stale.isError, true);
  assert.deepEqual({ error: stale.structuredContent.error, reason: stale.structuredContent.reason }, { error: 'view', reason: 'stale' });
  assert.equal(f.reads(), before + 1, 'Dispatch reaches the real Decision re-read guard');
  const repeated = await call('view_act', { view: 'revised', cut: shown.cut, action: 'approve' });
  assert.equal(repeated.structuredContent.reason, 'stale');
  assert.equal(f.reads(), before + 1, 'The same cut retains its stale outcome instead of dispatching again');
  const later = await open('read-failed'); f.failRead();
  const unavailable = await call('view_act', { view: 'read-failed', cut: later.cut, action: 'approve' });
  assert.equal(unavailable.isError, true);
  assert.equal(unavailable.structuredContent.reason, 'stale');
  assert.deepEqual(f.actSignatures, [], 'Neither refusal signs a native act');
  assert.equal(f.peer.requests.some(request => request.startsWith('POST ') && request.endsWith('/acts')), false);
  assert.deepEqual(await f.custody.unresolved(), []);
});

test('a local mark preserves the typed stale reason and the previous real store bytes when admission supersedes it', { timeout: 30000 }, async t => {
  const f = fixture(t), capture = { service: SERVICE, directory: f.peer.directory, viewer: f.viewer, key: f.signer.key,
    heads: [{ scope: f.scope, head: f.peer.head(f.state) }], ranges: [] };
  const first = await f.source.markReviewed(capture, { view: 'local', cut: 1, admit() {} });
  assert.deepEqual(first.structuredContent, { localStatus: 'marked' });
  const path = join(f.home, 'private', 'reviewed-heads.json'), previous = readFileSync(path);
  f.peer.append(f.state, { type: 'timed', item: 0, rule: 'TEST later local head', due: '2099-01-01T00:00:01Z' });
  const next = { ...capture, heads: [{ scope: f.scope, head: f.peer.head(f.state) }] };
  const refused = await f.source.markReviewed(next, { view: 'local', cut: 2, admit() { throw new ViewError('stale', 'TEST changed cut'); } });
  assert.equal(refused.isError, true);
  assert.deepEqual(refused.structuredContent, { localStatus: 'unavailable', reason: 'stale' });
  assert.deepEqual(readFileSync(path), previous, 'The typed admission refusal happens before local publication');
  assert.deepEqual(f.actSignatures, []);
});
