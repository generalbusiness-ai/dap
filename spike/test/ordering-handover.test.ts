import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { MemoryBackend, snapshot } from '../src/append.ts';
import { envelopeId, signEvent, signHeader, verifyWire } from '../src/codec.ts';
import { K } from '../src/foundation.ts';
import { Journal, verifyJournalView } from '../src/journal.ts';
import { ASSIGN } from '../src/ordering.ts';
import { acceptance, act, invite } from './fixtures/o1-fixture.ts';
import { create, sqlite, seal, assign, controlKey, control, successorKey, successor, competitor, keys, people, packages, envelopeBytes } from './fixtures/o3-fixture.ts';
import type { Entry } from '../src/types.ts';
const child = new URL('./fixtures/o3-process.ts', import.meta.url);
const effective = { known: true, authorized: true, effective: true };
function dir() { return mkdtempSync(join(tmpdir(), 'dap-o3-')); }
function accepted(r: ReturnType<Journal['submit']>) { assert.ok(!('refused' in r), JSON.stringify(r)); return r; }
function ordinary(j: Journal, action = 'ordinary') { return signEvent(j.context.intent(people.alice, K.observe, { fact: {} }, { action_id: action, nonce: '33'.repeat(16) }), keys.alice); }

for (const storage of ['memory', 'sqlite'] as const) test('O3 same-context handover preserves prefix, dense positions, retry results, control verdicts and publication on ' + storage, async () => {
  const path = join(dir(), 'journal.db');
  let backend = storage === 'memory' ? new MemoryBackend() : sqlite(path);
  let j = create(backend);
  assert.equal(j.context.state.participants.includes(control), false);
  assert.equal(j.context.state.grantHistory.some(g => g.principal === control), false);
  assert.equal(j.context.credentialFor(control), undefined);
  const invitation = invite(j, 'bob');
  const consumed = acceptance(j, 'bob', invitation);
  const prior = accepted(j.submit(consumed));
  const original = j.context.entries, genesis = j.context.genesisId;
  const h = j.context.head, previous = original.at(-1)!;
  const s = seal(j), sr = accepted(j.submit(s));
  assert.equal(sr.header.position, h + 1);
  assert.equal(sr.header.prev, previous.headerHash);
  assert.equal((s.body.payload as { predecessor: string }).predecessor, previous.header.commitment);
  assert.notEqual(previous.headerHash, previous.header.commitment);
  assert.deepEqual(sr.controlVerdict, effective); assert.equal(sr.verdict, undefined);
  assert.deepEqual(j.controlVerdictAt(h + 1), effective);
  const a = assign(j), ar = accepted(j.submit(a));
  assert.equal(ar.header.position, h + 2); assert.equal(ar.header.prev, sr.headerHash);
  assert.equal((a.body.payload as { predecessor: string }).predecessor, sr.header.commitment);
  assert.deepEqual(ar.controlVerdict, effective); assert.equal(ar.verdict, undefined);
  assert.deepEqual(j.submit(ordinary(j), j.context.credentialFor(people.alice)), { refused: true, reason: 'retired_writer' });
  const pending = storage === 'sqlite' ? (backend as ReturnType<typeof sqlite>).pending() : undefined;
  assert.deepEqual(accepted(j.submit(s)).controlVerdict, sr.controlVerdict);
  assert.deepEqual(accepted(j.submit(a)).controlVerdict, ar.controlVerdict);
  assert.equal(accepted(j.submit(consumed)).headerHash, prior.headerHash);
  if (pending) assert.deepEqual((backend as ReturnType<typeof sqlite>).pending(), pending);
  j.close();
  if (storage === 'sqlite') backend = sqlite(path);
  j = Journal.open({ backend, writerKey: successorKey, packages });
  assert.deepEqual(j.controlVerdictAt(h + 1), effective); assert.deepEqual(j.controlVerdictAt(h + 2), effective);
  const next = accepted(j.submit(ordinary(j), j.context.credentialFor(people.alice)));
  assert.equal(next.header.position, h + 3); assert.equal(next.header.prev, ar.headerHash);
  assert.equal(j.ordering.writer, successor); assert.equal(j.ordering.epoch, 1);
  assert.equal(j.context.genesisId, genesis); assert.deepEqual(j.context.entries.slice(0, original.length), original);
  assert.deepEqual(j.context.entries.map(e => e.position), Array.from({ length: h + 4 }, (_, i) => i));
  assert.deepEqual(accepted(j.submit(a)).controlVerdict, ar.controlVerdict);
  assert.equal(accepted(j.submit(consumed)).headerHash, prior.headerHash);
  assert.deepEqual(j.submit(signEvent({ ...a.body, payload: { ...a.body.payload as object, writer: competitor } }, controlKey)), { refused: true, reason: 'changed_content' });
  assert.deepEqual(verifyJournalView(j.context.view(people.bob), { genesis, writer: people.writer }), j.context.view(people.bob));
  if (storage === 'sqlite') {
    const b = backend as ReturnType<typeof sqlite>, entries = j.context.entries;
    const delivered: Entry[] = [];
    await b.drain(record => { delivered.push(record.entry); });
    assert.deepEqual(delivered, entries); assert.deepEqual(b.pending(), []);
  }
  j.close();
  if (storage === 'sqlite') backend = sqlite(path);
  const former = Journal.open({ backend, writerKey: keys.writer, packages });
  assert.deepEqual(former.submit(ordinary(former, 'former-new'), former.context.credentialFor(people.alice)), { refused: true, reason: 'retired_writer' });
  assert.equal(accepted(former.submit(consumed)).headerHash, prior.headerHash);
  former.close();
});

for (const stage of ['seal', 'assign'] as const) for (const point of ['before-commit', 'after-commit', 'after-receipt'] as const) test('O3 SIGKILL during ' + stage + ' at ' + point + ' retains the committed control boundary', () => {
  const root = dir(), path = join(root, 'journal.db'), input = join(root, 'control.json');
  let backend = sqlite(path), j = create(backend);
  if (stage === 'assign') accepted(j.submit(seal(j)));
  const action = stage === 'seal' ? seal(j) : assign(j);
  const baseline = j.context.entries;
  writeFileSync(input, envelopeBytes(action)); j.close();
  const killed = spawnSync(process.execPath, [child.pathname, path, input, point], { encoding: 'utf8', timeout: 15000 });
  assert.equal(killed.signal, 'SIGKILL', killed.stderr); assert.equal(killed.stdout, 'kill:' + point);
  backend = sqlite(path); j = Journal.open({ backend, writerKey: keys.writer, packages });
  const committed = point !== 'before-commit';
  assert.equal(j.context.head, baseline.length - 1 + Number(committed));
  assert.deepEqual(j.context.entries.slice(0, baseline.length), baseline);
  const retried = accepted(j.submit(action)); assert.equal(retried.replay, committed);
  assert.deepEqual(retried.controlVerdict, effective);
  if (stage === 'seal') {
    assert.deepEqual(j.submit(ordinary(j), j.context.credentialFor(people.alice)), { refused: true, reason: 'writer_sealed' });
    accepted(j.submit(assign(j)));
  }
  const assignment = j.context.entries.at(-1)!;
  j.close(); backend = sqlite(path); j = Journal.open({ backend, writerKey: successorKey, packages });
  const next = accepted(j.submit(ordinary(j), j.context.credentialFor(people.alice)));
  assert.equal(next.header.prev, assignment.headerHash);
  assert.equal(next.header.position, assignment.position + 1);
  assert.equal(backend.pending().length, j.context.entries.length);
  j.close();
});

test('O3 independent nominations and two signed assignments cannot install two successors', async () => {
  const path = join(dir(), 'journal.db');
  let backend = sqlite(path), j = create(backend);
  for (const writer of [successor, competitor]) accepted(act(j, 'alice', K.seq_request, { writer }));
  assert.equal(j.ordering.writer, people.writer); assert.equal(j.ordering.epoch, 0);
  j.close(); backend = sqlite(path);
  assert.throws(() => Journal.open({ backend, writerKey: successorKey, packages }), /unassigned writer key/);
  j = Journal.open({ backend, writerKey: keys.writer, packages });
  accepted(j.submit(seal(j)));
  const a = assign(j), b = assign(j, competitor, 'competing');
  const [first, second] = await Promise.all([Promise.resolve().then(() => j.submit(a)), Promise.resolve().then(() => j.submit(b))]);
  accepted(first); assert.deepEqual(second, { refused: true, reason: 'retired_writer' });
  assert.equal(j.ordering.writer, successor); assert.equal(j.context.entries.filter(e => e.event.kind === ASSIGN).length, 1);
  assert.equal(backend.retry(b.body.action_id!), undefined);
  assert.equal(backend.pending().length, j.context.entries.length);
  j.close();
});

test('O3 rejects forged and wrong authority, stale or swapped predecessor hashes, skipped seals and malformed nominations without an append', () => {
  const backend = sqlite(join(dir(), 'journal.db')), j = create(backend);
  function refused(envelope: ReturnType<typeof seal>, reason: string) {
    const entries = j.context.entries, pending = backend.pending();
    assert.deepEqual(j.submit(envelope), { refused: true, reason });
    assert.deepEqual(j.context.entries, entries); assert.deepEqual(backend.pending(), pending);
    assert.equal(backend.retry(envelope.body.action_id!), undefined);
  }
  assert.equal(j.context.state.participants.includes(people.alice), true);
  assert.equal(j.context.state.grantHistory.some(g => g.principal === people.alice), true);
  const s = seal(j);
  refused({ ...s, sig: 'A'.repeat(86) }, 'invalid_envelope');
  refused(signEvent({ ...s.body, actor: people.alice }, keys.alice), 'wrong_seal_authority');
  refused(signEvent({ ...s.body, actor: people.writer }, keys.writer), 'wrong_seal_authority');
  refused(signEvent({ ...s.body, payload: { epoch: 0, predecessor: j.context.entries.at(-1)!.headerHash } }, controlKey), 'wrong_control_predecessor');
  refused(assign(j), 'assignment_without_seal');
  accepted(j.submit(ordinary(j, 'intervening'), j.context.credentialFor(people.alice)));
  refused(s, 'wrong_control_predecessor');
  accepted(j.submit(seal(j)));
  const a = assign(j);
  refused(signEvent({ ...a.body, actor: people.alice }, keys.alice), 'wrong_control_authority');
  refused(signEvent({ ...a.body, payload: { ...a.body.payload as object, predecessor: j.context.entries.at(-1)!.headerHash } }, controlKey), 'wrong_control_predecessor');
  refused(signEvent({ ...a.body, payload: { ...a.body.payload as object, epoch: 2 } }, controlKey), 'wrong_ordering_epoch');
  refused(signEvent({ ...a.body, payload: { ...a.body.payload as object, writer: [successor, competitor] } }, controlKey), 'malformed_control');
  refused(signEvent({ ...a.body, payload: { ...a.body.payload as object, writer: people.writer } }, controlKey), 'writer_already_used');
  refused(signEvent({ ...a.body, payload: { ...a.body.payload as object, writer: control } }, controlKey), 'control_key_is_writer');
  accepted(j.submit(a)); j.close();
});

test('O3 cold authentication rejects a correctly signed control with wrong payload predecessor or wrong header predecessor', () => {
  for (const wrong of ['payload', 'header'] as const) {
    const backend = new MemoryBackend(), j = create(backend);
    const before = j.context.entries.at(-1)!;
    const source = seal(j);
    const envelope = wrong === 'payload' ? signEvent({ ...source.body, payload: { epoch: 0, predecessor: before.headerHash } }, controlKey) : source;
    const sr = accepted(j.submit(seal(j)));
    const header = signHeader({ ...sr.header, ...(wrong === 'header' ? { prev: before.header.commitment } : {}) }, keys.writer);
    // Build an actor-authenticated corrupt copy using the codec. This does not
    // bypass the production journal; Journal.open must reject the saved copy.
    let bad: Entry;
    if (wrong === 'payload') {
      const changed = signHeader({ ...header, commitment: envelopeId(envelope) }, keys.writer);
      bad = verifyWire({ header: changed, committed: envelopeBytes(envelope) }, people.writer, { genesis: j.context.genesisId, position: sr.header.position, prev: before.headerHash });
    } else {
      bad = { ...j.context.entries.at(-1)!, header };
    }
    const entries = [...j.context.entries.slice(0, -1), snapshot(bad)]; j.close();
    const copy = new MemoryBackend(); copy.serialized(() => { for (const entry of entries) copy.commit(entry, undefined, undefined); });
    assert.throws(() => Journal.open({ backend: copy, writerKey: keys.writer, packages }), wrong === 'payload' ? /wrong_control_predecessor/ : /wrong prev/);
  }
});


test('O3 v2 pins distinct writer/control keys and exact sequencing fields before any durable initialization', () => {
  const source = create(new MemoryBackend());
  const genesis = source.context.entries[0]!.event, origin = source.context.entries[1]!.committed!;
  source.close();
  for (const [sequencing, reason] of [
    [{ profile: 'dap.fixture.single-writer/2', writer: people.writer, control: people.writer }, /control key must differ/],
    [{ profile: 'dap.fixture.single-writer/2', writer: people.writer, control, epoch: 0 }, /invalid v2 sequencing fields/],
  ] as [Record<string, string | number>, RegExp][]) {
    const backend = sqlite(join(dir(), 'journal.db'));
    const body = { ...genesis, payload: { ...genesis.payload as object, sequencing } };
    assert.throws(() => Journal.create({ backend, writerKey: keys.writer, packages }, signEvent(body, keys.alice), [origin]), reason);
    assert.deepEqual(backend.entries(), []); assert.deepEqual(backend.pending(), []); backend.close();
  }
});
