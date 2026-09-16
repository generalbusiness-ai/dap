import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryBackend } from '../src/append.ts';
import { envelopeBytes, envelopeId, signEvent, signHeader, verifyWire } from '../src/codec.ts';
import { K } from '../src/foundation.ts';
import { Journal, verifyJournalView } from '../src/journal.ts';
import { createJournal, keys, packages, people } from './fixtures/o1-fixture.ts';
import { create, seal } from './fixtures/o3-fixture.ts';
import type { Entry } from '../src/types.ts';

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
