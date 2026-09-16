import type { Backend } from '../../src/append.ts';
import { principalOf, signEvent, envelopeBytes } from '../../src/codec.ts';
import { Journal } from '../../src/journal.ts';
import { HANDOVER_PROFILE, SEAL, ASSIGN } from '../../src/ordering.ts';
import { SQLiteBackend, type SQLiteOptions } from '../../src/sqlite.ts';
import { createJournal, key, keys, people, packages } from './o1-fixture.ts';
import { MemoryBackend } from '../../src/append.ts';
export const controlKey = key(6), successorKey = key(7), competitorKey = key(8);
export const control = principalOf(controlKey), successor = principalOf(successorKey), competitor = principalOf(competitorKey);
export function sqlite(path: string, fault?: SQLiteOptions['fault']) {
  return new SQLiteBackend(path, { writer: people.writer, profile: HANDOVER_PROFILE, fault });
}
export function create(backend: Backend) {
  const base = createJournal(new MemoryBackend());
  const entries = base.context.entries;
  const genesis = structuredClone(entries[0]!.event);
  (genesis.payload as { sequencing: unknown }).sequencing = { profile: HANDOVER_PROFILE, writer: people.writer, control };
  base.close();
  return Journal.create({ backend, writerKey: keys.writer, packages }, signEvent(genesis, keys.alice), [entries[1]!.committed!]);
}
export function seal(j: Journal, action = 'o3-seal') {
  return signEvent(j.context.intent(control, SEAL, { epoch: j.ordering.epoch, predecessor: { position: j.context.backend.head()!.position, headerHash: j.context.backend.head()!.headerHash } }, { action_id: action, nonce: '31'.repeat(16) }), controlKey);
}
export function assign(j: Journal, writer = successor, action = 'o3-assign') {
  return signEvent(j.context.intent(control, ASSIGN, { epoch: j.ordering.epoch + 1, predecessor: { position: j.context.backend.head()!.position, headerHash: j.context.backend.head()!.headerHash }, writer }, { action_id: action, nonce: '32'.repeat(16) }), controlKey);
}
export { envelopeBytes, keys, people, packages };
