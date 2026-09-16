import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildThrough, packages, principals } from '../fixtures/ordering-lifecycle-runner.ts';
import { recordScope } from '../fixtures/ordering-scope-records.ts';
import { SALE } from '../fixtures/sale.ts';
import { K, holdsNow } from '../src/foundation.ts';
import { verifyPublicProof } from '../src/scope-proof.ts';
import type { ScopeJournal } from '../src/scope.ts';
import type { Json } from '../src/canon.ts';

function accepted(result: ReturnType<ScopeJournal['submit']>) {
  assert.ok(!('refused' in result), JSON.stringify(result));
  return result;
}
const attempts: Array<{ name: string; actor: 'bob' | 'carol'; kind: string; payload: Json; reason: string }> = [
  { name: 'bob-unauthorized-accept', actor: 'bob', kind: SALE + 'accept', payload: { offer_id: 'o3' }, reason: 'unauthorized' },
  { name: 'carol-malformed-grant', actor: 'carol', kind: K.grant, payload: { nope: true }, reason: 'malformed' },
  { name: 'bob-unauthorized-close', actor: 'bob', kind: SALE + 'close', payload: { outcome: 'x' }, reason: 'unauthorized' },
];
for (const storage of ['memory', 'sqlite'] as const) for (const attempt of attempts) {
  test('O4 K3 failed actor-only attempt permits certified transfer: ' + attempt.name + ' ' + storage, () => {
    const world = buildThrough('writer-continued', {}, storage);
    try {
      const failed = accepted(world.emit('S', attempt.actor, attempt.kind, attempt.payload));
      assert.equal(failed.header.position, 24);
      assert.equal(failed.verdict?.effective, false);
      assert.equal(failed.verdict?.reason, attempt.reason);
      assert.deepEqual(world.contexts.S!.journal.context.state.audiences[24], { kind: 'named', principals: [principals[attempt.actor]] });
      const original = world.envelopes.get('S@24')!;
      const atAttempt = world.contexts.S!.proof();
      assert.deepEqual(atAttempt.positions[24], { header: failed.header });
      world.restart('S');
      assert.deepEqual(world.contexts.S!.proof(), atAttempt);
      const retry = accepted(world.emit('S', attempt.actor, '', {}, original));
      assert.equal(retry.replay, true); assert.equal(retry.headerHash, failed.headerHash);
      assert.deepEqual(retry.verdict, failed.verdict);
      assert.equal(world.contexts.S!.journal.context.head, 24);

      world.startDelivery(); world.describeDestination();
      const released = accepted(world.release('S'));
      assert.equal(released.header.position, 25); assert.equal(released.verdict?.effective, true);
      assert.equal(accepted(world.release('D')).verdict?.effective, true);
      const proof = world.contexts.S!.proof();
      assert.deepEqual(proof.positions[24], { header: failed.header });
      assert.equal(proof.positions[25]!.committed, world.contexts.S!.journal.context.entries[25]!.committed);
      const verified = verifyPublicProof(proof, { genesis: proof.genesis, initialWriter: proof.initialWriter }, packages);
      assert.equal(verified.interpreted.outcomes[24]!.reason, 'hidden');
      assert.equal(verified.interpreted.outcomes[24]!.effective, false);
      for (const actor of ['bob', 'carol'] as const) assert.equal(holdsNow(verified.interpreted.state, principals[actor], K.scope_release), false);
      world.restart('S');
      assert.deepEqual(world.contexts.S!.proof(), proof);
      world.startDestination();
      const activated = accepted(world.activate([{ source: proof, release: 25 }, world.proof('D')]));
      assert.equal(activated.verdict?.effective, true);
      world.restart('F');
      assert.equal(world.contexts.F!.state.activations, 1);
      assert.equal(world.contexts.F!.state.rights.R_fulfil!.owner, principals.alice);
      assert.equal(world.contexts.F!.state.rights.R_fulfil!.status, 'live');
      recordScope('k3-' + attempt.name + '-' + storage, { failed, audience: { kind: 'named', principals: [principals[attempt.actor]] }, attempt: original, proof, released, activated, final: world.snapshot() });
    } finally { world.close(); }
  });
}
