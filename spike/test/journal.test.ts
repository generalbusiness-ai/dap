import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { MemoryBackend } from '../src/append.ts';
import { canonicalize, encodeWire, envelopeBytes, signEvent, verifyHeader, verifyWire } from '../src/codec.ts';
import { ZERO_HASH } from '../src/canon.ts';
import { checkContext } from '../src/checker.ts';
import { CAP, K } from '../src/foundation.ts';
import { Context } from '../src/context.ts';
import { Journal, O1_PROFILE_VERSION, verifyJournalView } from '../src/journal.ts';
import { SQLiteBackend, CRASH_POINTS } from '../src/sqlite.ts';
import { SALE } from '../fixtures/sale.ts';
import { acceptance, act, createJournal, invite, keys, packages, people } from './fixtures/o1-fixture.ts';
const child = new URL('./fixtures/o1-crash-child.ts', import.meta.url);
function sqlite(path: string) { return new SQLiteBackend(path, { writer: people.writer, profile: O1_PROFILE_VERSION }); }
function dir() { return mkdtempSync(join(tmpdir(), 'dap-o1-')); }
function run(mode: string, path: string, point = '-', input = '-') { return spawnSync(process.execPath, [child.pathname, mode, path, point, input], { encoding: 'utf8', timeout: 15000 }); }
function open(backend: SQLiteBackend) { return Journal.open({ backend, writerKey: keys.writer, packages }); }

for (const storage of ['memory', 'sqlite'] as const) test('V1 Sale visibility trace through verified bytes and ' + storage, () => {
  const path = join(dir(), 'journal.db');
  const backend = storage === 'sqlite' ? sqlite(path) : new MemoryBackend();
  const j = createJournal(backend);
  for (const who of ['bob', 'carol'] as const) {
    const pos = invite(j, who);
    const r = j.submit(envelopeBytes(acceptance(j, who, pos)));
    assert.ok(!('refused' in r) && r.verdict?.effective);
  }
  assert.equal(j.context.head, 5);
  assert.deepEqual(j.context.view(people.bob).map(e => e.event ? 'r' : 'h'), ['r', 'r', 'r', 'r', 'h', 'r']);
  assert.deepEqual(j.context.view(people.carol).map(e => e.event ? 'r' : 'h'), ['r', 'r', 'h', 'r', 'r', 'r']);
  act(j, 'bob', SALE + 'offer', { offer_id: 'o1' }); // V1 malformed attempt remains members-visible.
  const ivan = invite(j, 'ivan', ['Inspector']);
  assert.ok(!('refused' in j.submit(envelopeBytes(acceptance(j, 'ivan', ivan)))));
  assert.equal(j.context.hiddenCount(people.ivan), 3);
  const before = j.context.head;
  act(j, 'alice', K.disclose, { positions: [6], to: [people.ivan] });
  assert.equal(j.context.hiddenCount(people.ivan), 2);
  assert.equal(j.context.hiddenCount(people.ivan, before), 3);
  assert.deepEqual(checkContext(j.context), []);
  for (const person of Object.values(people)) {
    for (let frontier = 0; frontier <= j.context.head; frontier++) {
      const view = j.context.view(person, frontier);
      assert.deepEqual(verifyJournalView(view, { genesis: j.context.genesisId, writer: people.writer }), view);
      for (const v of view) assert.equal(v.committed !== undefined, v.event !== undefined);
    }
  }
  let prev = ZERO_HASH;
  for (const e of j.context.entries) {
    const expected = { genesis: j.context.genesisId, position: e.position, prev };
    assert.deepEqual(verifyWire(encodeWire({ header: e.header, committed: e.committed! }), people.writer, expected, { allowOrigin: e.position === 1 }), e);
    verifyHeader(e.header, people.writer, expected); // includes hidden invitation at 4
    prev = e.headerHash;
  }
  if (backend instanceof SQLiteBackend) {
    j.close();
    const reopened = sqlite(path);
    assert.deepEqual(open(reopened).context.state, j.context.state);
    reopened.close();
  }
});

test('signed stable facts precede retry and admission; raw Context cannot bypass proof', () => {
  const j = createJournal(new MemoryBackend());
  const event = j.context.intent(people.alice, K.observe, { fact: {} }, { action_id: 'stable' });
  const envelope = signEvent(event, keys.alice);
  const first = j.submit(envelopeBytes(envelope), j.context.credentialFor(people.alice));
  assert.ok(!('refused' in first));
  const retry = j.submit(envelopeBytes(envelope)); // no credential on exact retry
  assert.ok(!('refused' in retry) && retry.replay);
  assert.equal(retry.headerHash, first.headerHash);
  assert.deepEqual(j.submit({ ...envelope, sig: 'A'.repeat(86) }), { refused: true, reason: 'invalid_envelope' });
  assert.deepEqual(j.submit(signEvent({ ...event, payload: {} }, keys.alice)), { refused: true, reason: 'changed_content' });
  assert.deepEqual(j.submit(signEvent({ ...event, genesis: 'sha256:' + 'e'.repeat(64) }, keys.alice)), { refused: true, reason: 'wrong_genesis' });
  assert.deepEqual(j.context.submit(event, j.context.credentialFor(people.alice)), { refused: true, reason: 'invalid_envelope' });
  assert.deepEqual(j.submit(signEvent({ ...event, action_id: 'huge', payload: { x: 'x'.repeat(65536) } }, keys.alice)), { refused: true, reason: 'envelope_bounds' });
});

test('exclusive SQLite owner excludes a second OS process and releases on close', () => {
  const path = join(dir(), 'journal.db');
  const backend = sqlite(path); createJournal(backend);
  const rejected = run('lock', path);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /locked/);
  backend.close();
  const acquired = run('lock', path);
  assert.equal(acquired.status, 0, acquired.stderr);
});

for (const point of CRASH_POINTS) test('SIGKILL at ' + point + ' preserves one atomic append boundary', async () => {
  const root = dir(), path = join(root, 'journal.db'), input = join(root, 'accept.json');
  let backend = sqlite(path);
  let j = createJournal(backend);
  const pos = invite(j, 'bob');
  const tokenId = j.context.entries[pos]!.id;
  const envelope = acceptance(j, 'bob', pos);
  const baseline = j.context.entries;
  writeFileSync(input, envelopeBytes(envelope));
  await backend.drain(() => {});
  backend.close();
  const killed = run('append', path, point, input);
  assert.equal(killed.signal, 'SIGKILL', killed.stderr);
  assert.equal(killed.stdout, 'kill:' + point);
  backend = sqlite(path); j = open(backend);
  const committed = point === 'after-commit';
  assert.equal(j.context.head, baseline.length - 1 + Number(committed));
  assert.deepEqual(j.context.entries.slice(0, baseline.length), baseline);
  assert.equal(backend.isConsumed(tokenId), committed);
  assert.equal(!!backend.retry(envelope.body.action_id!), committed);
  assert.equal(backend.pending().length, Number(committed));
  const saved = backend.head();
  const result = j.submit(readFileSync(input, 'utf8'));
  assert.ok(!('refused' in result));
  assert.equal(result.replay, committed);
  if (committed) assert.equal(result.headerHash, saved!.headerHash);
  const again = j.submit(envelopeBytes(envelope));
  assert.ok(!('refused' in again) && again.replay && again.headerHash === result.headerHash);
  assert.equal(j.context.head, baseline.length);
  assert.deepEqual(j.submit(envelopeBytes(acceptance(j, 'bob', pos, 'other'))), { refused: true, reason: 'invitation_consumed' });
  assert.deepEqual(checkContext(j.context), []);
  backend.close();
});

test('outbox resumes saved bytes after crash before notification and after delivery before ack', async () => {
  const root = dir(), path = join(root, 'journal.db'), deliveries = join(root, 'delivered.txt');
  let backend = sqlite(path); createJournal(backend);
  const pending = backend.pending(); backend.close(); // no notifications yet
  const killed = run('publish', path, '-', deliveries);
  assert.equal(killed.signal, 'SIGKILL', killed.stderr);
  backend = sqlite(path);
  assert.deepEqual(backend.pending(), pending);
  const seen = new Set(readFileSync(deliveries, 'utf8').trim().split('\n'));
  let duplicates = 0;
  await backend.drain(record => { if (seen.has(record.headerHash)) duplicates++; seen.add(record.headerHash); assert.equal(canonicalize(record.entry), canonicalize(pending[record.position]!.entry)); });
  assert.equal(duplicates, 1);
  assert.equal(seen.size, pending.length);
  assert.deepEqual(backend.pending(), []);
  backend.close();
  backend = sqlite(path); assert.deepEqual(backend.pending(), []); backend.close();
});

test('restart rejects tampered stored body despite unchanged signed wire bytes', () => {
  const path = join(dir(), 'journal.db');
  const backend = sqlite(path); createJournal(backend); backend.close();
  const db = new DatabaseSync(path);
  const row = db.prepare('SELECT body FROM entries WHERE position=1').get()!;
  const entry = JSON.parse(String(row.body)); entry.event.payload.ask = 1;
  db.prepare('UPDATE entries SET body=? WHERE position=1').run(JSON.stringify(entry)); db.close();
  const reopened = sqlite(path);
  assert.throws(() => open(reopened), /disagrees with verified bytes/);
  reopened.close();
});

test('signed invitations and origin duplicate checks accept finite fractional JCS numbers', () => {
  const j = createJournal(new MemoryBackend(), 800.5);
  const r = act(j, 'alice', K.invite, { invitee: people.bob, grants: { principal: people.bob, roles: ['Buyer'] }, token_id: 'fractional', extra: { amount: 0.5 } });
  assert.ok(!('refused' in r) && r.verdict?.effective);
  const accepted = j.submit(envelopeBytes(acceptance(j, 'bob', r.header.position)));
  assert.ok(!('refused' in accepted) && accepted.verdict?.effective);
  assert.deepEqual(checkContext(j.context), []);
});

test('outbox awaits asynchronous confirmation and retains failed publications', async () => {
  const backend = sqlite(join(dir(), 'journal.db')); createJournal(backend);
  const original = backend.pending();
  let release: (() => void) | undefined;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const delivery = backend.drain(async () => { await wait; });
  assert.deepEqual(backend.pending(), original);
  release!(); await delivery;
  assert.deepEqual(backend.pending(), []);
  backend.close();
  const failed = sqlite(join(dir(), 'journal.db')); createJournal(failed);
  const pending = failed.pending();
  await assert.rejects(failed.drain(async () => { throw new Error('delivery failed'); }), /delivery failed/);
  assert.deepEqual(failed.pending(), pending);
  assert.throws(() => failed.serialized(() => Promise.resolve()), /must be synchronous/);
  failed.close();
});

test('restart rejects SQL row positions that disagree with signed entry positions', () => {
  const path = join(dir(), 'journal.db');
  const backend = sqlite(path); createJournal(backend); backend.close();
  const db = new DatabaseSync(path); db.exec('UPDATE entries SET position=9 WHERE position=1'); db.close();
  assert.throws(() => sqlite(path), /SQL position/);
});

test('journal pins the signed genesis profile and writer assignment to its backend', () => {
  const wrong = new SQLiteBackend(join(dir(), 'journal.db'), { writer: people.alice, profile: O1_PROFILE_VERSION });
  assert.throws(() => createJournal(wrong), /backend assignment mismatch/);
  assert.equal(wrong.entries().length, 0); wrong.close();
  const source = createJournal(new MemoryBackend());
  const genesis = structuredClone(source.context.entries[0]!.event);
  (genesis.payload as { sequencing: { profile: string } }).sequencing.profile = 'single-writer';
  const backend = new MemoryBackend();
  assert.throws(() => Journal.create({ backend, writerKey: keys.writer, packages }, signEvent(genesis, keys.alice)), /unsupported profile/);
  assert.equal(backend.entries().length, 0);
  assert.throws(() => Journal.create({ backend, writerKey: keys.writer, packages }, source.context.entries[0]!.committed!, []), /origin proofs/);
  assert.equal(backend.entries().length, 0);
});

test('V1 signed invitation issued before revocation remains redeemable after SQLite restart', () => {
  const path = join(dir(), 'journal.db');
  let backend = sqlite(path); let j = createJournal(backend);
  const position = invite(j, 'bob');
  const proof = envelopeBytes(acceptance(j, 'bob', position));
  const revoked = act(j, 'alice', K.revoke, { principal: people.alice, capabilities: [CAP.invite] });
  assert.ok(!('refused' in revoked) && revoked.verdict?.effective);
  backend.close(); backend = sqlite(path); j = open(backend);
  const redeemed = j.submit(proof);
  assert.ok(!('refused' in redeemed) && redeemed.verdict?.effective);
  const again = j.submit(proof);
  assert.ok(!('refused' in again) && again.replay && again.headerHash === redeemed.headerHash);
  assert.deepEqual(checkContext(j.context), []);
  backend.close();
});

test('V1 signed unauthorized and unissued invitations cannot admit another participant', () => {
  const backend = sqlite(join(dir(), 'journal.db')); const j = createJournal(backend);
  const bob = invite(j, 'bob'); j.submit(envelopeBytes(acceptance(j, 'bob', bob)));
  const unauthorized = act(j, 'bob', K.invite, { invitee: people.carol, grants: { principal: people.carol, roles: ['Buyer'] }, token_id: 'unauthorized' });
  assert.ok(!('refused' in unauthorized) && unauthorized.verdict?.reason === 'unauthorized');
  assert.deepEqual(j.submit(envelopeBytes(acceptance(j, 'carol', unauthorized.header.position))), { refused: true, reason: 'invitation_not_issued' });
  const unissued = structuredClone(j.context.inviteEnvelope(bob));
  unissued.invite.event.nonce = 'ff'.repeat(16);
  const forged = signEvent(j.context.intent(people.carol, K.accept_invite, unissued as never), keys.carol);
  const head = j.context.head;
  assert.deepEqual(j.submit(envelopeBytes(forged)), { refused: true, reason: 'invitation_not_issued' });
  assert.equal(j.context.head, head);
  assert.deepEqual(j.context.state.participants, [people.alice, people.bob]);
  assert.deepEqual(checkContext(j.context), []);
  backend.close();
});

for (const point of ['after-entry', 'after-commit']) test('initialization SIGKILL at ' + point + ' retains all or none of genesis and origins', () => {
  const path = join(dir(), 'journal.db');
  const killed = run('initialize', path, point);
  assert.equal(killed.signal, 'SIGKILL', killed.stderr);
  const backend = sqlite(path);
  if (point === 'after-entry') {
    assert.deepEqual(backend.entries(), []); assert.deepEqual(backend.pending(), []);
    createJournal(backend);
  } else {
    assert.equal(open(backend).context.head, 1); assert.equal(backend.pending().length, 2);
  }
  backend.close();
});

test('uncertain committed response requires reopen before another action', () => {
  const path = join(dir(), 'journal.db');
  const initial = sqlite(path); createJournal(initial); initial.close();
  const backend = new SQLiteBackend(path, { writer: people.writer, profile: O1_PROFILE_VERSION, fault: point => { if (point === 'after-commit') throw new Error('lost response'); } });
  const j = open(backend);
  const envelope = signEvent(j.context.intent(people.alice, K.observe, { fact: {} }), keys.alice);
  assert.throws(() => j.submit(envelope, j.context.credentialFor(people.alice)), /lost response/);
  assert.throws(() => j.submit(envelope), /reopen and reconcile/);
  assert.throws(() => j.context.submit(envelope.body, j.context.credentialFor(people.alice), envelope), /inactive/);
  backend.close();
  const reopened = sqlite(path);
  const result = open(reopened).submit(envelope);
  assert.ok(!('refused' in result) && result.replay);
  reopened.close();
});


test('recipient view verification checks original actor proofs and rejects hidden envelope leakage', () => {
  const j = createJournal(new MemoryBackend());
  const bob = invite(j, 'bob'); j.submit(envelopeBytes(acceptance(j, 'bob', bob)));
  invite(j, 'carol');
  const view = j.context.view(people.bob);
  const expected = { genesis: j.context.genesisId, writer: people.writer };
  assert.equal(view[4]!.event, undefined);
  assert.equal(view[4]!.committed, undefined);
  const missing = structuredClone(view); delete missing[1]!.committed;
  assert.throws(() => verifyJournalView(missing, expected), /missing actor proof/);
  const tampered = structuredClone(view); (tampered[1]!.event!.payload as { ask: number }).ask = 1;
  assert.throws(() => verifyJournalView(tampered, expected), /body disagrees/);
  const leaked = structuredClone(view); leaked[4]!.committed = j.context.entries[4]!.committed!;
  assert.throws(() => verifyJournalView(leaked, expected), /hidden position contains/);
  const hiddenHeader = structuredClone(view); hiddenHeader[4]!.header.commitment = ZERO_HASH;
  assert.throws(() => verifyJournalView(hiddenHeader, expected), /sequencer signature/);
  assert.throws(() => verifyJournalView(view.slice(1), expected), /genesis|non-dense|position/);
  assert.throws(() => verifyJournalView(view, { ...expected, genesis: 'sha256:' + 'f'.repeat(64) }), /genesis/);
  assert.throws(() => verifyJournalView(view, { ...expected, writer: people.carol }), /wrong writer/);
});


test('one live Journal owns each backend: revoked authority cannot be admitted through a stale facade', () => {
  const path = join(dir(), 'journal.db');
  const backend = sqlite(path); const a = createJournal(backend);
  assert.throws(() => open(backend), /already has a live facade/); // the QA stale B
  const revoke = act(a, 'alice', K.revoke, { principal: people.alice, capabilities: [CAP.invite] });
  assert.ok(!('refused' in revoke) && revoke.verdict?.effective);
  const intent = signEvent(a.context.intent(people.alice, K.invite, { invitee: people.bob, grants: { principal: people.bob, roles: ['Buyer'] }, token_id: 'revoked-issuer' }), keys.alice);
  const refusedAuthority = a.submit(intent, a.context.credentialFor(people.alice));
  assert.ok(!('refused' in refusedAuthority) && refusedAuthority.verdict?.reason === 'unauthorized');
  const invitationId = a.context.entries[refusedAuthority.header.position]!.id;
  const accept = acceptance(a, 'bob', refusedAuthority.header.position);
  assert.deepEqual(a.submit(accept), { refused: true, reason: 'invitation_not_issued' });
  assert.equal(backend.isConsumed(invitationId), false);
  assert.deepEqual(a.context.state.participants, [people.alice]);
  const state = a.context.state;
  a.close();
  assert.throws(() => a.submit(intent), /facade is closed/);
  const fresh = sqlite(path); const reopened = open(fresh);
  assert.deepEqual(reopened.context.state, state);
  const retry = reopened.submit(intent);
  assert.ok(!('refused' in retry) && retry.replay);
  assert.equal(retry.headerHash, refusedAuthority.headerHash);
  assert.deepEqual(retry.verdict, refusedAuthority.verdict);
  assert.deepEqual(reopened.submit(accept), { refused: true, reason: 'invitation_not_issued' });
  assert.equal(fresh.isConsumed(invitationId), false);
  assert.deepEqual(checkContext(reopened.context), []);
  reopened.close();
  // Memory callers can explicitly release the facade without durable storage.
  const memory = new MemoryBackend(); const first = createJournal(memory);
  assert.throws(() => Journal.open({ backend: memory, writerKey: keys.writer, packages }), /live facade/);
  first.close();
  const second = Journal.open({ backend: memory, writerKey: keys.writer, packages });
  assert.deepEqual(second.context.state, first.context.state); second.close();
});


test('O1-F1 closed memory Context cannot issue or accept from stale authority after a new facade revokes it', t => {
  const backend = new MemoryBackend();
  const a = createJournal(backend);
  const originalState = { participants: [...a.context.state.participants], grantHistory: structuredClone(a.context.state.grantHistory) };
  a.close();
  const b = Journal.open({ backend, writerKey: keys.writer, packages });
  const revoke = act(b, 'alice', K.revoke, { principal: people.alice, capabilities: [CAP.invite] });
  assert.ok(!('refused' in revoke) && revoke.verdict?.effective);
  const before = b.context.entries;
  const envelope = signEvent(a.context.intent(people.alice, K.invite, {
    invitee: people.bob, grants: { principal: people.bob, roles: ['Buyer'] }, token_id: 'closed-context-token',
  }, { action_id: 'closed-context-invite', nonce: 'ab'.repeat(16) }), keys.alice);
  let error: unknown, issued: ReturnType<Context['submit']> | undefined, redeemed: ReturnType<Context['submit']> | undefined;
  try {
    issued = a.context.submit(envelope.body, a.context.credentialFor(people.alice), envelope);
    if (!('refused' in issued)) {
      const accept = acceptance(a, 'bob', issued.header.position, 'closed-context-accept');
      redeemed = a.context.submit(accept.body, undefined, accept);
    }
  } catch (e) { error = e; }
  const staleParticipants = [...a.context.state.participants];
  const liveParticipants = [...b.context.state.participants];
  b.close();
  const cold = Journal.open({ backend, writerKey: keys.writer, packages });
  t.diagnostic(JSON.stringify({ issued, redeemed, staleParticipants, liveParticipants, coldParticipants: cold.context.state.participants, coldInviteVerdict: issued && !('refused' in issued) ? cold.context.verdictAt(issued.header.position) : null }));
  assert.match(String(error), /closed|inactive/);
  assert.deepEqual(cold.context.entries, before);
  assert.equal(backend.retry(envelope.body.action_id!), undefined);
  assert.deepEqual({ participants: a.context.state.participants, grantHistory: a.context.state.grantHistory }, originalState); // historical fold inspection is still possible
  assert.deepEqual(cold.context.state.participants, [people.alice]);
  assert.deepEqual(checkContext(cold.context), []);
  cold.close();
});

for (const storage of ['memory', 'sqlite'] as const) test('O1-F1 raw Context restoration or creation cannot bypass a live Journal on ' + storage, () => {
  const backend = storage === 'memory' ? new MemoryBackend() : sqlite(join(dir(), 'journal.db'));
  const journal = createJournal(backend), entries = journal.context.entries;
  assert.throws(() => Context.restore(backend, packages), /owned|live facade/);
  assert.throws(() => Context.create({ creator: people.alice, packages, backend }), /owned|live facade/);
  assert.deepEqual(journal.context.entries, entries);
  const result = act(journal, 'alice', K.observe, { fact: {} }, 'active-owner');
  assert.ok(!('refused' in result));
  journal.close();
});


for (const storage of ['memory', 'sqlite'] as const) test('O1-F1 a previously acquired raw Context loses write access while Journal owns its backend on ' + storage, () => {
  const path = join(dir(), 'journal.db');
  let backend = storage === 'memory' ? new MemoryBackend() : sqlite(path);
  createJournal(backend).close();
  if (storage === 'sqlite') backend = sqlite(path);
  const raw = Context.restore(backend, packages); // trusted replay before ownership is acquired
  const journal = Journal.open({ backend, writerKey: keys.writer, packages });
  const revoke = act(journal, 'alice', K.revoke, { principal: people.alice, capabilities: [CAP.invite] });
  assert.ok(!('refused' in revoke) && revoke.verdict?.effective);
  const before = journal.context.entries;
  const event = raw.intent(people.alice, K.invite, { invitee: people.bob, grants: { principal: people.bob, roles: ['Buyer'] }, token_id: 'raw-stale' });
  assert.throws(() => raw.submit(event, raw.credentialFor(people.alice)), /owned|live facade/);
  assert.throws(() => raw.act(people.alice, K.observe, { fact: {} }), /owned|live facade/);
  assert.deepEqual(journal.context.entries, before);
  assert.equal(backend.retry(event.action_id!), undefined);
  assert.deepEqual(journal.context.state.participants, [people.alice]);
  journal.close();
});


for (const storage of ['memory', 'sqlite'] as const) test('O1-F1 a lost reply through direct Context.submit invalidates every owned write path on ' + storage, () => {
  let armed = false;
  class LostReply extends MemoryBackend {
    override commit(...args: Parameters<MemoryBackend['commit']>): void {
      super.commit(...args);
      if (armed) { armed = false; throw new Error('lost response after commit'); }
    }
  }
  const path = join(dir(), 'journal.db');
  let backend = storage === 'memory' ? new LostReply() : new SQLiteBackend(path, {
    writer: people.writer, profile: O1_PROFILE_VERSION,
    fault(point) { if (armed && point === 'after-commit') { armed = false; throw new Error('lost response after commit'); } },
  });
  const j = createJournal(backend);
  const revoke = signEvent(j.context.intent(people.alice, K.revoke, {
    principal: people.alice, capabilities: [CAP.invite],
  }, { action_id: 'direct-lost-revocation', nonce: 'a1'.repeat(16) }), keys.alice);
  armed = true;
  assert.throws(() => j.context.submit(revoke.body, j.context.credentialFor(people.alice), revoke), /lost response/);
  assert.equal(backend.head()!.position, 2); // the revocation is already committed
  const before = backend.entries();
  const payload = { invitee: people.bob, grants: { principal: people.bob, roles: ['Buyer'] }, token_id: 'direct-stale-invite' };
  assert.throws(() => act(j, 'alice', K.invite, payload, 'direct-stale-invite'), /inactive/);
  assert.throws(() => j.context.submit(revoke.body, undefined, revoke), /inactive/);
  assert.throws(() => j.context.act(people.alice, K.invite, payload), /inactive/);
  assert.deepEqual(backend.entries(), before);
  assert.equal(backend.retry('direct-stale-invite'), undefined);
  j.close();
  if (storage === 'sqlite') backend = sqlite(path);
  const cold = Journal.open({ backend, writerKey: keys.writer, packages });
  const retried = cold.submit(revoke);
  assert.ok(!('refused' in retried) && retried.replay && retried.verdict?.effective);
  assert.equal(retried.headerHash, before[2]!.headerHash);
  const invitation = act(cold, 'alice', K.invite, payload, 'direct-stale-invite');
  assert.ok(!('refused' in invitation) && invitation.verdict?.reason === 'unauthorized');
  assert.deepEqual(cold.submit(acceptance(cold, 'bob', invitation.header.position)), { refused: true, reason: 'invitation_not_issued' });
  assert.deepEqual(cold.context.state.participants, [people.alice]);
  assert.deepEqual(checkContext(cold.context), []);
  cold.close();
});
