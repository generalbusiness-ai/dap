import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MemoryBackend } from '../src/append.ts';
import { envelopeBytes, envelopeId, signEvent, signHeader, verifyEnvelope, verifyWire, type ActorEnvelope } from '../src/codec.ts';
import { ZERO_HASH } from '../src/canon.ts';
import { K } from '../src/foundation.ts';
import { Journal, verifyJournalView } from '../src/journal.ts';
import { createJournal, keys, packages, people } from './fixtures/o1-fixture.ts';
import { create, seal, assign, sqlite, successor } from './fixtures/o3-fixture.ts';
import type { Entry } from '../src/types.ts';

function signedCopy(envelopes: ActorEnvelope[]) {
  const genesis = envelopeId(envelopes[0]!);
  const entries: Entry[] = [];
  const backend = new MemoryBackend();
  for (const [position, envelope] of envelopes.entries()) {
    const expected = { genesis, position, prev: entries.at(-1)?.headerHash ?? ZERO_HASH };
    const header = signHeader({ ...expected, commitment: envelopeId(envelope) }, keys.writer);
    const entry = verifyWire({ header, committed: envelopeBytes(envelope) }, people.writer, expected, { allowOrigin: position === 1 });
    backend.serialized(() => backend.commit(entry, undefined, undefined));
    entries.push(entry);
  }
  const view = entries.map(e => ({ position: e.position, event: e.event, committed: e.committed!, header: e.header, headerHash: e.headerHash, via: 'audience' as const }));
  return { backend, view, genesis };
}

for (const movable of [false, true]) test('O-H1 repeated entry commitments are rejected by journal and view, movable=' + movable, () => {
  const backend = new MemoryBackend(), j = movable ? create(backend) : createJournal(backend);
  const event = signEvent(j.context.intent(people.alice, K.observe, { fact: { value: 'C' } }, { action_id: 'C' }), keys.alice);
  const accepted = j.submit(event, j.context.credentialFor(people.alice));
  assert.ok(!('refused' in accepted));
  const signedSeal = movable ? seal(j) : undefined;
  const intervening = j.submit(signEvent(j.context.intent(people.alice, K.observe, { fact: { value: 'D' } }, { action_id: 'D' }), keys.alice), j.context.credentialFor(people.alice));
  assert.ok(!('refused' in intervening));
  const entries = [...j.context.entries];
  function add(envelope: typeof event) {
    const head = entries.at(-1)!;
    const expected = { genesis: j.context.genesisId, position: head.position + 1, prev: head.headerHash };
    const header = signHeader({ ...expected, commitment: envelopeId(envelope) }, keys.writer);
    entries.push(verifyWire({ header, committed: envelopeBytes(envelope) }, people.writer, expected));
  }
  add(event); // Writer repeats C after D, then relocates the original seal.
  if (signedSeal) add(signedSeal);
  const genesis = j.context.genesisId; j.close();
  const copy = new MemoryBackend();
  copy.serialized(() => { for (const entry of entries) copy.commit(entry, undefined, undefined); });
  assert.throws(() => Journal.open({ backend: copy, writerKey: keys.writer, packages }), /duplicate commitment/);
  const view = entries.map((e: Entry) => ({ position: e.position, event: e.event, committed: e.committed!, header: e.header, headerHash: e.headerHash, via: 'audience' as const }));
  assert.throws(() => verifyJournalView(view, { genesis, writer: people.writer }), /duplicate commitment/);
  // The duplication is visible even when every non-genesis body is hidden.
  const hidden = view.map((v, i) => i === 0 ? v : { position: v.position, header: v.header, headerHash: v.headerHash, via: 'hidden' as const });
  assert.throws(() => verifyJournalView(hidden, { genesis, writer: people.writer }), /duplicate commitment/);
});

for (const movable of [false, true]) test('O-H2 append never rereads the full journal under serialization, movable=' + movable, () => {
  class CountedBackend extends MemoryBackend {
    armed = false;
    inside = false;
    override serialized<T>(fn: () => T): T {
      return super.serialized(() => { this.inside = true; try { return fn(); } finally { this.inside = false; } });
    }
    override entries() {
      if (this.armed && this.inside) throw new Error('full journal read under append lock');
      return super.entries();
    }
  }
  const backend = new CountedBackend(), j = movable ? create(backend) : createJournal(backend);
  backend.armed = true;
  const event = signEvent(j.context.intent(people.alice, K.observe, { fact: {} }, { action_id: 'bounded' }), keys.alice);
  const first = j.submit(event, j.context.credentialFor(people.alice));
  assert.ok(!('refused' in first));
  const retry = j.submit(event); assert.ok(!('refused' in retry) && retry.replay);
  assert.equal(first.headerHash, retry.headerHash);
  j.close();
});

for (const movable of [false, true]) test('O-H1 repeated adopted commitments fail before durable creation, movable=' + movable, () => {
  const source = movable ? create(new MemoryBackend()) : createJournal(new MemoryBackend());
  const genesis = structuredClone(source.context.entries[0]!.event);
  const origin = source.context.entries[1]!;
  (genesis.payload as { origins: unknown[] }).origins.push(origin.event);
  source.close();
  const backend = new MemoryBackend();
  assert.throws(() => Journal.create({ backend, writerKey: keys.writer, packages }, signEvent(genesis, keys.alice), [origin.committed!, origin.committed!]), /duplicate commitment/);
  assert.deepEqual(backend.entries(), []);
});

for (const storage of ['memory', 'sqlite'] as const) for (const direct of [false, true]) test('O-H2 lost reply poisons the cache owner and cold retry reconciles the committed seal on ' + storage + ', direct=' + direct, () => {
  let armed = false;
  class LostReply extends MemoryBackend {
    override serialized<T>(fn: () => T): T {
      const result = super.serialized(fn);
      if (armed) { armed = false; throw new Error('lost reply after serialized commit'); }
      return result;
    }
  }
  const path = join(mkdtempSync(join(tmpdir(), 'dap-h2-')), 'journal.db');
  let backend = storage === 'memory' ? new LostReply() : sqlite(path, point => {
    if (armed && point === 'after-commit') { armed = false; throw new Error('lost reply after serialized commit'); }
  });
  let j = create(backend);
  const control = seal(j);
  armed = true;
  assert.throws(() => direct ? j.context.submit(control.body, undefined, control) : j.submit(control), /lost reply/);
  const committed = backend.head()!;
  assert.equal(committed.event.kind, control.body.kind);
  assert.throws(() => j.ordering, /verified prefix is stale/);
  assert.throws(() => j.submit(control), /inactive|reopen/);
  assert.throws(() => j.context.submit(control.body, undefined, control), /inactive/);
  j.close();
  if (storage === 'sqlite') backend = sqlite(path);
  j = Journal.open({ backend, writerKey: keys.writer, packages });
  assert.deepEqual(j.ordering.sealed, { position: committed.position, headerHash: committed.headerHash });
  const replay = j.submit(control);
  assert.ok(!('refused' in replay) && replay.replay && replay.controlVerdict?.effective);
  assert.equal(replay.headerHash, committed.headerHash);
  const assignment = assign(j);
  const result = j.context.submit(assignment.body, undefined, assignment);
  assert.ok(!('refused' in result));
  assert.equal(j.ordering.writer, successor);
  assert.deepEqual(j.controlVerdictAt(result.header.position), { known: true, authorized: true, effective: true });
  const retry = j.submit(assignment);
  assert.ok(!('refused' in retry) && retry.replay && retry.controlVerdict?.effective);
  assert.equal(j.context.head, committed.position + 1);
  const state = j.ordering;
  assert.throws(() => { state.writer = people.writer; }, TypeError);
  assert.equal(j.ordering.writer, successor);
  j.close();
});

test('O-H2 an unexpected signed tail is not silently trusted by the live cache', () => {
  const backend = new MemoryBackend(), j = create(backend);
  const expected = { genesis: j.context.genesisId, position: j.context.head + 1, prev: backend.head()!.headerHash };
  const envelope = signEvent(j.context.intent(people.alice, K.observe, { fact: {} }, { action_id: 'outside-owned-path' }), keys.alice);
  const header = signHeader({ ...expected, commitment: envelopeId(envelope) }, keys.writer);
  const entry = verifyWire({ header, committed: envelopeBytes(envelope) }, people.writer, expected);
  backend.serialized(() => backend.commit(entry, undefined, undefined));
  assert.throws(() => j.ordering, /verified prefix is stale/);
  assert.throws(() => j.submit(envelope), /stale fold/);
  j.close();
  const cold = Journal.open({ backend, writerKey: keys.writer, packages });
  assert.equal(cold.context.head, entry.position);
  assert.equal(cold.ordering.epoch, 0);
  cold.close();
});

test('O-H1 a control signature cannot move to a different header at the same position, even with unique commitments', () => {
  const j = create(new MemoryBackend());
  for (const action_id of ['E', 'C']) {
    const r = j.submit(signEvent(j.context.intent(people.alice, K.observe, { fact: { action_id } }, { action_id }), keys.alice), j.context.credentialFor(people.alice));
    assert.ok(!('refused' in r));
  }
  const originalHead = j.context.backend.head()!;
  const control = seal(j);
  const envelopes = j.context.entries.map(e => verifyEnvelope(e.committed!));
  envelopes[2] = signEvent({ ...envelopes[2]!.body, payload: { fact: { action_id: 'X' } }, action_id: 'X' }, keys.alice);
  const alternative = signedCopy([...envelopes, control]);
  const newHead = alternative.backend.get(originalHead.position)!;
  assert.equal(newHead.header.commitment, originalHead.header.commitment);
  assert.notEqual(newHead.headerHash, originalHead.headerHash);
  assert.equal(new Set(alternative.view.map(v => v.header.commitment)).size, alternative.view.length);
  assert.throws(() => Journal.open({ backend: alternative.backend, writerKey: keys.writer, packages }), /wrong_control_predecessor/);
  assert.throws(() => verifyJournalView(alternative.view, { genesis: alternative.genesis, writer: people.writer }), /wrong_control_predecessor/);
  j.close();
});

test('O-H1 archived movable profile /2 is unsupported on journal open and view authentication', () => {
  const j = create(new MemoryBackend());
  const envelopes = j.context.entries.map(e => verifyEnvelope(e.committed!));
  const genesis = structuredClone(envelopes[0]!.body);
  (genesis.payload as { sequencing: { profile: string } }).sequencing.profile = 'dap.fixture.single-writer/2';
  envelopes[0] = signEvent(genesis, keys.alice);
  const old = signedCopy(envelopes);
  assert.throws(() => Journal.open({ backend: old.backend, writerKey: keys.writer, packages }), /unsupported profile/);
  assert.throws(() => verifyJournalView(old.view, { genesis: old.genesis, writer: people.writer }), /unsupported profile/);
  j.close();
});

test('O-H2 a cache callback exception after durable write disables every owned write path', () => {
  let armed = false, failHead = false;
  class CallbackFault extends MemoryBackend {
    override commit(...args: Parameters<MemoryBackend['commit']>) {
      super.commit(...args);
      if (armed) { armed = false; failHead = true; }
    }
    override head() {
      if (failHead) { failHead = false; throw new Error('cache callback head fault'); }
      return super.head();
    }
  }
  const backend = new CallbackFault(), j = create(backend), control = seal(j);
  armed = true;
  assert.throws(() => j.context.submit(control.body, undefined, control), /cache callback head fault/);
  assert.equal(backend.head()!.event.kind, control.body.kind);
  assert.throws(() => j.context.submit(control.body, undefined, control), /inactive/);
  assert.throws(() => j.submit(control), /inactive/);
  j.close();
  const cold = Journal.open({ backend, writerKey: keys.writer, packages });
  const retry = cold.submit(control);
  assert.ok(!('refused' in retry) && retry.replay && retry.controlVerdict?.effective);
  assert.equal(cold.context.head, 2);
  cold.close();
});

for (const movable of [false, true]) test('O-H1 a missing retry row cannot append an already committed envelope, movable=' + movable, () => {
  class MissingRetry extends MemoryBackend {
    hideRetry = false;
    override retry(action: string) { return this.hideRetry ? undefined : super.retry(action); }
  }
  const backend = new MissingRetry(), j = movable ? create(backend) : createJournal(backend);
  const event = signEvent(j.context.intent(people.alice, K.observe, { fact: {} }, { action_id: 'lost-index' }), keys.alice);
  const first = j.submit(event, j.context.credentialFor(people.alice)); assert.ok(!('refused' in first));
  const before = backend.entries();
  backend.hideRetry = true;
  assert.throws(() => j.submit(event, j.context.credentialFor(people.alice)), /duplicate commitment/);
  assert.deepEqual(backend.entries(), before);
  assert.throws(() => j.submit(event), /reopen/);
  backend.hideRetry = false; j.close();
  const cold = Journal.open({ backend, writerKey: keys.writer, packages });
  const retry = cold.submit(event); assert.ok(!('refused' in retry) && retry.replay);
  assert.equal(retry.headerHash, first.headerHash); cold.close();
});
