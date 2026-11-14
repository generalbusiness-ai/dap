import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { register } from 'tsx/esm/api';

// Two real `apps/views/src/node.ts` processes on one home, as the desktop AI app starts them.
// A stand-in answers as the service over loopback. It judges nothing, so this shows where each
// process keeps its views and its custody, and it shows no guard of a real scope.
const scoped = register({ namespace: 'artroom-two-process' });
after(async () => { await scoped.unregister(); });
const load = source => scoped.import(source, import.meta.url);
const { canonicalize, digestBytes, itemQueryArgument, itemQueryDigest, readItemQueryParameter, textDigest, utf8 } = await load('@generalbusiness/dap-bytes');
const { secretSigner, signedIntent } = await load('@generalbusiness/dap-client');
const { issueQuestionsBrief } = await load('@generalbusiness/dap-lanes');
const { StandIn, SERVICE } = await load(new URL('../../../packages/mcp/test/support/standin.ts', import.meta.url).href);
const { questionSubject } = await load(new URL('../src/decision.ts', import.meta.url).href);
const { fileStore } = await load(new URL('../../../packages/cli/src/files.ts', import.meta.url).href);

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const SECRET = new Uint8Array(32).fill(47), BRIEF = 'TEST immutable Brief\n', BODY = 'TEST current Question body\n';
const item = (id, type, state, values = {}, refs = {}, parties = {}) => ({ id, type, state, revision: id, opened: null, values, refs, parties, attributed: [] });

/** One process's stdio, with the requests of the desktop app's client. */
function server(home, brief) {
  const child = spawn(process.execPath, ['--import', 'tsx', 'apps/views/src/node.ts', '--brief', brief], { cwd: ROOT, env: { ...process.env, DAP_HOME: home }, stdio: ['pipe', 'pipe', 'pipe'] });
  const waiting = new Map(); let buffer = '', errors = '', next = 0, ended = null;
  const fail = failure => {
    ended ??= failure;
    for (const pending of waiting.values()) { clearTimeout(pending.timer); pending.reject(ended); }
    waiting.clear();
  };
  child.once('error', failure => fail(failure));
  child.once('close', (code, signal) => fail(Error(`The views process closed (${signal ?? code}). ${errors.slice(-400)}`)));
  child.stdin.on('error', failure => fail(failure));
  child.stderr.on('data', data => { errors = (errors + data).slice(-4096); });
  child.stdout.on('data', data => {
    buffer += data;
    for (let at = buffer.indexOf('\n'); at >= 0; at = buffer.indexOf('\n')) {
      const message = JSON.parse(buffer.slice(0, at)); buffer = buffer.slice(at + 1);
      const pending = waiting.get(message.id);
      if (pending) { clearTimeout(pending.timer); waiting.delete(message.id); pending.resolve(message); }
    }
  });
  const request = (method, params = {}) => new Promise((resolve, reject) => {
    if (ended) { reject(ended); return; }
    const id = ++next, timer = setTimeout(() => { waiting.delete(id); reject(Error(`${method}: no answer. ${errors.slice(-400)}`)); }, 30_000);
    waiting.set(id, { resolve, reject, timer });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
  return {
    async start() {
      const opened = await request('initialize', { protocolVersion: '2025-06-18', capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: ['text/html;profile=mcp-app'] } } }, clientInfo: { name: 'two-process test', version: '0' } });
      assert.ok(opened.result, `The process starts. ${errors.slice(-400)}`);
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    },
    call: async (name, args) => { const reply = await request('tools/call', { name, arguments: args }); assert.ok(reply.result, JSON.stringify(reply.error)); return reply.result; },
    stop() { child.kill(); },
    pid: child.pid,
  };
}

/** A room with one question that asks @rita, over a loopback server. `loseNext` drops the next act's reply after the stand-in keeps it. `holdNext` delays the next act until its release. */
async function room(t) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'artroom-two-process-')));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const signer = secretSigner(SECRET), peer = new StandIn(signer.key, 'admin', ['issue.approve', 'issue.decide', 'change.merge']);
  const viewer = { membership: peer.membership, member: '@rita' }, other = { membership: peer.membership, member: '@vic' };
  const M = peer.scopes.get(peer.membership.scope); M.definition = 'platform:membership@8';
  M.items[1] = item(1, 'member', 'active', { handle: '@rita', kind: 'person', role: 'admin' }, {}, { member: viewer, controller: null });
  M.items.push(item(3, 'member', 'active', { handle: '@vic', kind: 'person', role: 'member' }, {}, { member: other, controller: null }));
  const D = peer.scopes.get(peer.directory.scope); D.definition = 'platform:directory@16';
  M.items[0].refs.directory = peer.directory;
  const ref = peer.add('lane', issueQuestionsBrief);
  D.items.push(item(10 + D.items.length, 'lane', 'created', { number: D.items.length }, { scope: ref }));
  const lane = peer.scopes.get(ref.scope), brief = digestBytes(utf8(BRIEF));
  const signed = await signedIntent(signer, { to: ref, kind: 'ask', fields: { question: 'TEST question', body: textDigest(BODY), brief } }, { now: Date.now() });
  const opening = peer.append(lane, { type: 'act', signed, authority: [], presented: {} });
  while (lane.entries.length < 6) peer.append(lane, { type: 'timed', item: 0, rule: 'TEST history position', due: '2099-01-01T00:00:00Z' });
  lane.items.push(item(opening.entry.seq, 'ask', 'asked', { question: 'TEST question', body: textDigest(BODY), brief }, { bodyAt: opening.entry.seq }, { asker: other }),
    item(5, 'approval-request', 'open', {}, { ask: opening.entry.seq, bodyAt: opening.entry.seq }, { requested: viewer, requester: other }));
  lane.retained.set(`text ${textDigest(BODY)}`, canonicalize(BODY));
  const posted = []; let lose = false, held = null, reached = () => {};
  const http = createServer((request, response) => { void (async () => {
    let body = ''; for await (const chunk of request) body += chunk;
    const url = new URL(request.url, SERVICE), init = { method: request.method, headers: Object.fromEntries(Object.entries(request.headers)), ...(body ? { body } : {}) };
    if (request.method === 'POST' && !url.pathname.endsWith('/sessions')) posted.push(url.pathname);
    if (held && request.method === 'POST' && url.pathname.endsWith('/acts')) { const gate = held; held = null; reached(); await gate; }
    let answer;
    if (url.pathname.endsWith('/query-items')) {
      const query = readItemQueryParameter(url.searchParams.get('q')), state = peer.scopes.get(query.scope.scope);
      const rows = [...state.items, ...state.final].filter(row => row.type === query.type && query.states.includes(row.state) && (query.ids === null || query.ids.includes(row.id))).sort((a, b) => a.id - b.id);
      answer = { status: 200, body: new Response(canonicalize({ ok: true, at: peer.head(state), value: { v: 1, scope: state.ref, query: itemQueryDigest(query), argument: itemQueryArgument(query), items: rows }, complete: true })).body };
    } else answer = await peer.fetch(url.href, init);
    const bytes = answer.body ? Buffer.from(await new Response(answer.body).arrayBuffer()) : Buffer.alloc(0);
    if (lose && request.method === 'POST' && !url.pathname.endsWith('/sessions')) { lose = false; request.socket.destroy(); return; }
    response.writeHead(answer.status, { 'content-type': 'application/json' }); response.end(bytes);
  })().catch(error => { response.writeHead(500); response.end(String(error)); }); });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { http.closeAllConnections(); http.close(resolve); }));
  const service = `http://127.0.0.1:${http.address().port}`, store = fileStore(home);
  await store.keep('operator', SECRET);
  // This application opens an existing room. Its optional installation register is absent,
  // rather than the old invalid `sc_test` fallback that fileStore.config must refuse.
  await store.save({ v: 2, service, key: 'operator', handle: '@rita', repository: peer.config().repository });
  const file = join(home, 'brief.txt'); writeFileSync(file, BRIEF);
  const pair = [server(home, file), server(home, file)];
  t.after(() => { for (const process_ of pair) process_.stop(); });
  await Promise.all(pair.map(process_ => process_.start()));
  return { home, peer, lane, pair, posted, subject: questionSubject(ref, opening.entry.seq), loseNext() { lose = true; },
    holdNext() { let open; held = new Promise(resolve => { open = resolve; }); return open; }, posting() { return new Promise(resolve => { reached = resolve; }); } };
}
const records = home => { const directory = join(home, 'private', 'mcp-custody', 'records'); return existsSync(directory) ? readdirSync(directory).filter(name => name.endsWith('.json')) : []; };

const page = async (process_, view, name) => {
  const summary = (await process_.call('view_read', { view })).structuredContent.display;
  return (await process_.call('view_read', { view, cut: summary.cut, page: name })).structuredContent.display;
};

// The desktop AI app's shape: the model's call reaches one process and the card's calls reach the other.
test('the other process refuses with words that say what to do, and the opening call gives it the same card', async t => {
  const r = await room(t), [model, card] = r.pair;
  assert.notEqual(model.pid, card.pid);
  const args = { view: 'floor', subject: r.subject }, opened = await model.call('view_decision', args);
  assert.equal(opened.structuredContent.status, 'ready');
  const lanePosts = () => r.posted.filter(path => path.includes(r.lane.ref.scope));
  assert.deepEqual(lanePosts(), [], 'Opening signs nothing');

  const refused = await card.call('view_read', { view: 'floor' });
  assert.equal(refused.isError, true); assert.equal(refused.structuredContent.reason, 'absent');
  assert.match(refused.content[0].text, /no act was sent/); assert.match(refused.content[0].text, /opening tool/);
  const press = await card.call('view_act', { view: 'floor', cut: 0, action: 'approve' });
  assert.equal(press.structuredContent.reason, 'absent', 'A press on a process with no view signs nothing');
  assert.deepEqual(lanePosts(), []);

  const again = await card.call('view_decision', args);
  assert.deepEqual(again.structuredContent.identity, opened.structuredContent.identity, 'Both processes read the same revision');
  assert.deepEqual(lanePosts(), [], 'The opening call signs nothing on this process either');
  const shown = await page(card, 'floor', 'item');
  assert.equal(shown.status, 'ready'); assert.equal(shown.card.actions[0].id, 'approve');

  const done = await card.call('view_act', { view: 'floor', cut: shown.cut, action: 'approve' });
  assert.equal(done.structuredContent.result.structuredContent.answer, 'accepted');
  assert.equal(lanePosts().length, 1, 'One press sends one act');
  assert.equal(records(r.home).length, 1, 'One press keeps one custody record, in the one directory under the home');
  const stillThere = await model.call('view_read', { view: 'floor' });
  assert.equal(stillThere.isError ?? false, false, "The model's process keeps its own view");
});

// A lost reply leaves one record on disk, and the process that did not send it reads that record.
test('after a lost reply, the other process offers only Check original on the same record, and it sends no second act', async t => {
  const r = await room(t), [first, second] = r.pair, lanePosts = () => r.posted.filter(path => path.endsWith('/acts') && path.includes(r.lane.ref.scope));
  await first.call('view_decision', { view: 'floor', subject: r.subject });
  const shown = await page(first, 'floor', 'item');
  r.loseNext();
  const lost = await first.call('view_act', { view: 'floor', cut: shown.cut, action: 'approve' });
  assert.notEqual(lost.structuredContent.result.structuredContent.answer, 'accepted');
  assert.equal(lanePosts().length, 1); assert.equal(records(r.home).length, 1);

  await second.call('view_decision', { view: 'after', subject: r.subject });
  const other = (await second.call('view_read', { view: 'after' })).structuredContent.display;
  assert.deepEqual(other.card.actions.map(action => action.purpose), ['check-original'], 'The other process finds the open record by reading custody');
  assert.equal(other.card.unresolvedOriginal, true);
  const settled = await second.call('view_act', { view: 'after', cut: other.cut, action: 'check-original' });
  assert.equal(settled.structuredContent.result.structuredContent.answer, 'accepted', 'The stand-in kept the first act, so the settlement finds it');
  assert.equal(lanePosts().length, 1, 'Checking the original sends no second act');
  assert.equal(records(r.home).length, 1, 'Both processes used one record');
});

// While one process waits for an answer, a press on the other meets the open record and signs nothing.
test('a press on one process while the other waits for its answer is refused and sends nothing', async t => {
  const r = await room(t), [first, second] = r.pair, lanePosts = () => r.posted.filter(path => path.endsWith('/acts') && path.includes(r.lane.ref.scope));
  await first.call('view_decision', { view: 'floor', subject: r.subject });
  await second.call('view_decision', { view: 'floor', subject: r.subject });
  const [one, two] = [await page(first, 'floor', 'item'), await page(second, 'floor', 'item')];
  const release = r.holdNext();
  const waiting = first.call('view_act', { view: 'floor', cut: one.cut, action: 'approve' });
  await r.posting();
  const refused = await second.call('view_act', { view: 'floor', cut: two.cut, action: 'approve' });
  assert.equal(lanePosts().length, 1, 'The second press sent no act');
  const answer = refused.structuredContent.result?.structuredContent ?? refused.structuredContent;
  assert.notEqual(answer.answer, 'accepted', JSON.stringify(answer));
  release();
  assert.equal((await waiting).structuredContent.result.structuredContent.answer, 'accepted');
  assert.equal(records(r.home).length, 1);
});
