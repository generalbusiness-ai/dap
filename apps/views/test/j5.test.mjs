import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { register } from 'tsx/esm/api';

// The actual adapter, Collection reads, card source and owner-only review file, with the real pinned definitions, over scripted scope answers.
// No scope judges these rows, so no guard runs here: `packages/mcp/test/needs-you.scope.test.ts` runs the real lane on a real journal.
const scoped = register({ namespace: 'artroom-j5-owner' });
after(async () => { await scoped.unregister(); });
const load = source => scoped.import(source, import.meta.url);
const { digestBytes, utf8 } = await load('@generalbusiness/dap-bytes');
const { secretSigner } = await load('@generalbusiness/dap-client');
const { FINDING_DIGESTS, QUESTION_DIGESTS, changeFinding, issueQuestions } = await load('@generalbusiness/dap-lanes');
const { StandIn, SERVICE } = await load(new URL('../../../packages/mcp/test/support/standin.ts', import.meta.url).href);
const { RepoInAi, SINCE_ENTRIES } = await load(new URL('../src/repo-in-ai.ts', import.meta.url).href);
const { ReviewStore } = await load(new URL('../src/review-store.ts', import.meta.url).href);
const { decisionSource } = await load(new URL('../src/decision.ts', import.meta.url).href);

const NOW = Date.parse('2099-01-01T00:00:00Z');
const item = (id, type, state, values = {}, refs = {}, parties = {}) => ({ id, type, state, revision: id, opened: null, values, refs, parties, attributed: [] });
const DEFINITIONS = { [QUESTION_DIGESTS.issue]: issueQuestions, [FINDING_DIGESTS.change]: changeFinding };
const THREE_REASONS = ['needs', 'why', 'settles'];

function fixture(t, actions = ['issue.approve', 'issue.decide', 'change.merge']) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'artroom-j5-')));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const signer = secretSigner(new Uint8Array(32).fill(55)), peer = new StandIn(signer.key, 'admin', actions);
  const viewer = { membership: peer.membership, member: '@ana' }, vic = { membership: peer.membership, member: '@vic' }, una = { membership: peer.membership, member: '@una' };
  const M = peer.scopes.get(peer.membership.scope); M.definition = 'platform:membership@8';
  M.items[1] = item(1, 'member', 'active', { handle: '@ana', kind: 'person', role: 'admin' }, {}, { member: viewer, controller: null });
  M.items.push(item(3, 'member', 'active', { handle: '@vic', kind: 'person', role: 'member' }, {}, { member: vic, controller: null }), item(4, 'member', 'active', { handle: '@una', kind: 'agent', role: 'agent' }, {}, { member: una, controller: viewer }));
  const D = peer.scopes.get(peer.directory.scope); D.definition = 'platform:directory@16';
  M.items[0].refs.directory = peer.directory;
  const app = new RepoInAi({ service: SERVICE, signer, config: async () => peer.config(), now: () => NOW, reviewStore: new ReviewStore(home), brief: { bytes: utf8('TEST'), digest: digestBytes(utf8('TEST')) }, fetch: (url, init) => peer.fetch(url, init) });
  const lane = (definition, values = {}) => { const ref = peer.add('lane', definition); D.items.push(item(10 + D.items.length, 'lane', 'created', { number: D.items.length, ...values }, { scope: ref })); return peer.scopes.get(ref.scope); };
  return { peer, viewer, vic, una, app, lane, source: decisionSource(app) };
}
const asked = (f, id, values = {}) => item(id, 'ask', 'asked', { question: `TEST question ${id}`, ...values }, { bodyAt: id }, { asker: f.vic });
const request = (f, id, ask, bodyAt = ask, requester = f.vic) => item(id, 'approval-request', 'open', {}, { ask, bodyAt }, { requested: f.viewer, requester });
const approval = (f, id, ask, verdict, bodyAt = ask) => item(id, 'approval', 'submitted', { verdict }, { ask, bodyAt }, { approver: f.viewer });
const proposal = () => item(0, 'proposal', 'open', { title: 'TEST change', number: 4 });
const manifest = f => item(6, 'manifest', 'current', { base: 'b'.repeat(40), integration: 'c'.repeat(40), tree: '3'.repeat(40), complete: true, selected: [] }, {}, { authors: [f.una] });
const rulesOf = f => item(1, 'rules', 'current', { revision: 7, approvals: 1, ownerMayReview: false, checks: [{ name: 'security-review', required: true, checker: f.vic }], extents: [{ name: 'source', class: 'content' }] });
const finding = f => item(12, 'finding', 'open', { file: 'src/a.ts', start: 10, end: 12, class: 'race', severity: 'high', confidence: 80, scenario: 'TEST', source: 'security-review', sourceVersion: 'reviewer 1.2' }, { version: 6 }, { reporter: f.vic });
const rowsOf = async f => (await f.app.needsYou()).structuredContent;

// Scripted summaries witness exact family selection only; native room reads run in failed-claim-cohort.test.ts.
test('Needs you reads each supported exact room family and refuses mixed siblings', async t => {
  const f = fixture(t), lane = f.lane(QUESTION_DIGESTS.issue);
  lane.items.push(asked(f, 1), request(f, 2, 1));
  const M = f.peer.scopes.get(f.peer.membership.scope), D = f.peer.scopes.get(f.peer.directory.scope);
  for (const [membership, directory] of [['platform:membership@8', 'platform:directory@16'], ['platform:membership@9', 'platform:directory@22'], ['platform:membership@12', 'platform:directory@25']]) {
    M.definition = membership; D.definition = directory;
    const result = await rowsOf(f);
    assert.ok(result.rows.some(row => row.category === 'requested-review' && row.item === 2), `${membership}/${directory} reads the current request`);
  }
  for (const [membership, directory] of [['platform:membership@12', 'platform:directory@16'], ['platform:membership@8', 'platform:directory@25'], ['platform:membership@9', 'platform:directory@16']]) {
    M.definition = membership; D.definition = directory;
    assert.deepEqual(await rowsOf(f), { error: 'read-unavailable', reason: 'directory-unsupported', complete: false });
  }
});


test('every kind of row says what needs you, why it is yours and what settles it, and names an act or delivery that its pinned definition holds', async t => {
  const f = fixture(t);
  const question = f.lane(QUESTION_DIGESTS.issue);
  question.items.push(asked(f, 1), request(f, 2, 1), asked(f, 3), request(f, 4, 3, 1), asked(f, 5), approval(f, 6, 5, 'approve'), request(f, 7, 99));
  const change = f.lane(FINDING_DIGESTS.change);
  change.items.push(proposal(), rulesOf(f), manifest(f), finding(f),
    item(10, 'review-request', 'open', {}, {}, { requested: f.viewer, requester: f.vic }), item(11, 'merge', 'unknown', {}, { manifest: 6 }, { merger: f.viewer }));
  const { rows } = await rowsOf(f);
  const kinds = new Set(rows.map(row => `${row.category} ${(row.settledBy ?? ["no settling act"]).join("/")}`));
  assert.deepEqual([...kinds].sort(), ['decision-due decide', 'merge-attention merge', 'open-finding resolve-finding-own/resolve-finding-any/mark-finding-irrelevant', 'requested-review approve', 'requested-review review-verdict', 'requested-review withdraw-approval-request', 'unknown-merge publication'], 'EVERY KIND: the room holds each kind of row, with the act that settles it');
  for (const row of rows) {
    for (const reason of THREE_REASONS) assert.ok(typeof row[reason] === 'string' && row[reason].length > 0, `THREE REASONS: row ${row.item} of ${row.category} has its ${reason}`);
    assert.ok(row.rule.clause.length > 0 && row.rule.definition === (DEFINITIONS[row.rule.definition] ? row.rule.definition : null), `NAMES ITS RULE: row ${row.item} names a pinned definition and a clause`);
    const definition = DEFINITIONS[row.rule.definition], messages = Object.values(definition.receives ?? {}).map(handler => handler.message);
    for (const name of row.settledBy) assert.ok(definition.acts[name] || messages.includes(name), `NAMES THE SETTLING ACT: ${name} is an act or delivery of the pinned definition of row ${row.item}`);
  }
  const of = id => rows.find(row => row.item === id);
  assert.equal(of(2).needs, 'Approve or request changes on question 1: "TEST question 1".', 'CURRENT TEXT: the person can approve');
  assert.deepEqual(of(4).settledBy, ['withdraw-approval-request'], 'OLD TEXT: approve binds the current text, so only the requester can close this request');
  assert.match(of(4).needs, /^Question 3 changed after @vic asked you/, 'OLD TEXT: the row says the text changed');
  assert.deepEqual(of(7).settledBy, ['withdraw-approval-request'], 'A CLOSED QUESTION: only the requester can close this request');
  assert.equal(of(12).why, 'Your role holds change.merge, and this finding holds that merge.', 'A FINDING: the row says why this viewer sees it');
  assert.ok(of(12).needs.includes('src/a.ts'), 'A FINDING: the row names the file');
  // Scripted summaries prove exact historical/current read selection only.
  // The recorded golden stays unchanged; no native factory runs here.
  for (const pin of ['sha256:aaf68c3bd82c217312acd7784dfe06bcb7ba6a30a066d0475a7728c62c43a7e7', FINDING_DIGESTS.change]) {
    change.definition = pin;
    const found = (await rowsOf(f)).rows.find(row => row.category === 'open-finding' && row.item === 12);
    assert.ok(found, 'Both exact finding pins retain the open-finding row');
    assert.equal(found.rule.definition, pin);
    for (const name of ['needs', 'why', 'settles', 'settledBy']) assert.deepEqual(found[name], of(12)[name], 'Spelling changes no finding meaning');
  }
});

test('a decision is due only when the approvals are in on the current text and the viewer holds issue.decide', async t => {
  const f = fixture(t);
  const lane = f.lane(QUESTION_DIGESTS.issue);
  lane.items.push(asked(f, 1), approval(f, 2, 1, 'approve'), // due
    asked(f, 3), // no approval yet
    asked(f, 5), approval(f, 6, 5, 'approve'), item(7, 'approval-request', 'open', {}, { ask: 5, bodyAt: 5 }, { requested: f.vic, requester: f.una }), // another person's request is open
    asked(f, 8), approval(f, 9, 8, 'approve'), approval(f, 10, 8, 'request-changes'), // changes asked
    item(11, 'ask', 'asked', { question: 'TEST revised' }, { bodyAt: 13 }, { asker: f.vic }), approval(f, 12, 11, 'approve', 11)); // approved older text
  const due = (await rowsOf(f)).rows.filter(row => row.category === 'decision-due').map(row => row.item);
  assert.deepEqual(due, [1], 'DUE: only the question whose guards hold');
  const without = fixture(t, ['issue.approve']), other = without.lane(QUESTION_DIGESTS.issue);
  other.items.push(asked(without, 1), approval(without, 2, 1, 'approve'));
  assert.deepEqual((await rowsOf(without)).rows.filter(row => row.category === 'decision-due'), [], 'NOT YOURS: a viewer without issue.decide has no such row');
});

test('the needs-you card says what needs the person, why and what settles it, names the rule and who waits, and says that reading leaves the item open', async t => {
  const f = fixture(t), lane = f.lane(QUESTION_DIGESTS.issue);
  lane.items.push(asked(f, 1), request(f, 2, 1), item(3, 'commitment', 'accepted', {}, {}, { performer: f.una }), item(4, 'block', 'blocked', {}, { commitment: 3, on: 1 }, { by: f.una }));
  const { card } = await f.source.read({ screen: 'needs-you', position: 0, page: 'summary' });
  assert.equal(card.title, 'Approve or request changes on question 1: "TEST question 1".', 'WHAT NEEDS YOU: the title');
  assert.equal(card.summary, 'Why it is yours: @vic asked you by name.', 'WHY YOURS: the summary');
  assert.deepEqual(card.settles, ['approve'], 'WHAT SETTLES IT: the kit field');
  assert.deepEqual(card.waitsOn, ['@una'], 'WHO WAITS: the kit field');
  const has = text => card.reasons.some(reason => reason.includes(text));
  for (const text of ['What settles it: Your approve act on the current text', 'Waiting on this: @una', `Rule: this lane's rule for an approval request.`, 'Reading this item leaves it open.'])
    assert.ok(has(text), `THE CARD says: ${text}`);
});

test('a card and needs_you name every lane they could not read and count every row they left out, so a person knows the list is short', async t => {
  const f = fixture(t), lane = f.lane(QUESTION_DIGESTS.issue);
  for (let id = 1; id <= 120; id += 2) lane.items.push(asked(f, id), request(f, id + 1, id));
  const data = await rowsOf(f);
  assert.equal(data.rows.length, 50, 'BOUND: at most 50 rows');
  assert.equal(data.omittedRows, 10, 'COUNTED: the other 10 rows');
  const { card } = await f.source.read({ screen: 'needs-you', position: 0, page: 'summary' });
  assert.ok(card.reasons.some(reason => reason.includes('10')) && card.reasons.some(reason => /left out|leaves out/.test(reason)), `SAID ON THE CARD: the card counts the rows it left out: ${JSON.stringify(card.reasons)}`);
});

test('since lists the newest entries with who did them and counts the rest; after a mark, the next visit lists only what is new, and the mark leaves the item open', async t => {
  const f = fixture(t), lane = f.lane(QUESTION_DIGESTS.issue, { kind: 'issue', title: 'TEST title' });
  lane.items.push(asked(f, 1), request(f, 2, 1));
  const timed = rule => f.peer.append(lane, { type: 'timed', item: 0, rule, due: '2099-01-01T00:00:00Z' });
  for (let n = 0; n < SINCE_ENTRIES + 3; n++) timed(`TEST old ${n}`);
  const first = (await f.app.since()).structuredContent.rows.find(row => row.scope.scope === lane.ref.scope);
  assert.equal(first.since, null, 'FIRST VISIT: nothing is marked');
  assert.equal(first.name, 'Issue 1: TEST title', 'NAME: the row says which issue');
  assert.equal(first.changed.length, SINCE_ENTRIES, 'BOUND: the newest entries only');
  assert.equal(first.changed.at(-1).seq, first.head.seq, 'NEWEST: the list ends at the head');
  assert.equal(first.earlier, first.head.seq + 1 - SINCE_ENTRIES, 'COUNTED: every other entry is counted');

  const updates = (await f.source.read({ screen: 'change', position: 0, page: 'updates' })).card;
  assert.equal(updates.title, 'What changed since your last review', 'THE CARD: the updates title');
  const line = updates.entries.find(entry => entry.scope === lane.ref.scope);
  assert.ok(line.text.startsWith('Issue 1: TEST title.') && line.text.includes(`Entry ${first.head.seq}: the timed rule TEST old ${SINCE_ENTRIES + 2}.`), `THE CARD: the line names the scope and its newest entry: ${line.text}`);
  assert.ok(line.text.includes(`This list leaves out ${first.earlier} earlier entries.`), `THE CARD: the line counts the rest: ${line.text}`);
  const mark = updates.actions.find(action => action.id === 'mark-reviewed');
  assert.deepEqual((await f.source.markReviewed(mark.capture, { view: 'TEST', cut: 1, admit() {} })).structuredContent, { localStatus: 'marked' });
  assert.equal((await f.app.since()).structuredContent.rows.length, 0, 'AFTER THE MARK: nothing has changed');
  assert.deepEqual((await rowsOf(f)).rows.map(row => row.item), [2], 'THE MARK CLOSES NOTHING: the request stays on the list');

  const next = timed('TEST new').entry.seq;
  const later = (await f.app.since()).structuredContent.rows;
  assert.deepEqual(later.map(row => [row.changed, row.earlier]), [[[{ seq: next, what: 'the timed rule TEST new' }], 0]], 'NEXT VISIT: only the new entry');
  assert.deepEqual((await f.app.since()).structuredContent.rows, later, 'NEXT VISIT: reading again shows the same, until the next mark');
});
