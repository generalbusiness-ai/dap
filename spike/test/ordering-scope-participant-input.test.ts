import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildThrough, principals, type LifecycleWorld } from '../fixtures/ordering-lifecycle-runner.ts';
import { INSPECTION } from '../fixtures/inspection.ts';
import { recordScope, recordedIdentities } from '../fixtures/ordering-scope-records.ts';
import { envelopeBytes, type ActorEnvelope } from '../src/codec.ts';
import type { Json } from '../src/canon.ts';
import { named } from '../src/types.ts';

function accepted(result: ReturnType<LifecycleWorld['emit']>) {
  assert.ok(!('refused' in result), JSON.stringify(result));
  return result;
}
function effective(result: ReturnType<LifecycleWorld['emit']>) {
  const receipt = accepted(result);
  assert.equal((receipt.controlVerdict ?? receipt.verdict)?.effective, true, JSON.stringify(receipt));
  return receipt;
}
function retry(world: LifecycleWorld, envelope: ActorEnvelope, original: ReturnType<typeof accepted>) {
  const head = world.contexts.S!.journal.context.head;
  const replay = accepted(world.emit('S', 'carol', '', {}, envelope));
  assert.equal(replay.replay, true);
  assert.deepEqual(replay.header, original.header);
  assert.equal(replay.headerHash, original.headerHash);
  assert.deepEqual(replay.verdict, original.verdict);
  assert.equal(world.contexts.S!.journal.context.head, head);
  return replay;
}
const malformed: { name: string; payload: Json }[] = [
  { name: 'null', payload: null },
  { name: 'boolean', payload: false },
  { name: 'number', payload: 7 },
  { name: 'string', payload: 'request' },
  { name: 'empty-array', payload: [] },
  { name: 'nested-array', payload: [{ seller: principals.carol }] },
  { name: 'empty-object', payload: {} },
  { name: 'missing-offer-id', payload: { seller: principals.carol, inspector: principals.carol } },
  { name: 'non-string-offer-id', payload: { offer_id: {}, seller: principals.carol, inspector: principals.carol } },
  { name: 'missing-seller', payload: { offer_id: 'o2', inspector: principals.carol } },
  { name: 'missing-inspector', payload: { offer_id: 'o2', seller: principals.carol } },
];
for (const field of ['seller', 'inspector']) for (const value of [null, false, 7, [], {}] satisfies Json[]) {
  malformed.push({ name: field + '=' + JSON.stringify(value), payload: { offer_id: 'o2', seller: principals.carol, inspector: principals.carol, [field]: value } });
}

for (const storage of ['memory', 'sqlite'] as const) test('O4 K1 malformed participant requests preserve retries and the signed lifecycle: ' + storage, () => {
  const world = buildThrough('inspection-attached', {}, storage);
  const observations: { name: string; committed: string; receipt: ReturnType<typeof accepted>; coldRetry: ReturnType<typeof accepted> }[] = [];
  try {
    assert.ok(world.contexts.S!.journal.context.state.participants.includes(principals.carol));
    for (const { name, payload } of malformed) {
      const head = world.contexts.S!.journal.context.head;
      const receipt = accepted(world.emit('S', 'carol', INSPECTION + 'request', payload));
      assert.equal(receipt.header.position, head + 1, name);
      assert.deepEqual(receipt.verdict, {
        known: true, authorized: true, effective: false, reason: 'ineffective',
        perModel: { inspection: { effective: false, reason: 'malformed' } },
      }, name);
      const envelope = world.envelopes.get('S@' + receipt.header.position)!;
      retry(world, envelope, receipt);
      world.restart('S');
      const cold = world.contexts.S!;
      assert.deepEqual(cold.state.verdicts[receipt.header.position], receipt.verdict, name);
      assert.deepEqual(cold.journal.context.state.audiences[receipt.header.position], named(principals.carol), name);
      assert.equal(cold.journal.context.entries[receipt.header.position]!.committed, envelopeBytes(envelope), name);
      assert.equal(cold.journal.context.view(principals.carol)[receipt.header.position]!.committed, envelopeBytes(envelope), name);
      assert.equal(cold.journal.context.view(principals.bob)[receipt.header.position]!.committed, undefined, name);
      assert.equal(cold.state.inspection.requested, false, name);
      assert.equal(cold.state.rights.R_sell!.status, 'live', name);
      assert.equal(cold.export(['R_sell']).prefix.position, receipt.header.position, name);
      observations.push({ name, committed: envelopeBytes(envelope), receipt, coldRetry: retry(world, envelope, receipt) });
    }

    // Continue real signed work with actual positions: the extra refused
    // requests shift S's release away from the healthy fixture's default S@24.
    world.saleThrough14();
    const requestPosition = world.contexts.S!.journal.context.head;
    assert.equal(world.contexts.S!.state.verdicts[requestPosition]!.effective, true);
    assert.deepEqual(world.contexts.S!.journal.context.state.audiences[requestPosition], named(principals.carol, principals.alice, principals.ivan));
    world.spawnInspection();
    effective(world.inspectionResult());
    effective(world.saleThrough17());
    effective(world.saleThrough19());
    effective(world.importInspection());
    effective(world.seal());
    effective(world.assign());
    effective(world.continueWriter());
    world.startDelivery();
    world.describeDestination();
    const saleRelease = effective(world.release('S'));
    const deliveryRelease = effective(world.release('D'));
    world.startDestination();
    const proofs = [world.proof('S', saleRelease.header.position), world.proof('D', deliveryRelease.header.position)];
    for (const { receipt } of observations) assert.equal(proofs[0]!.source.positions[receipt.header.position]!.committed, undefined);
    const activation = effective(world.activate(proofs));
    effective(world.exercise('F', 'kim', 'R_deliver'));
    effective(world.exercise('F', 'alice', 'R_fulfil'));
    const final = world.snapshot();
    assert.equal(final.activations, 1);
    assert.equal(final.deliveryConfirmed, true);
    assert.equal(final.fulfilled, true);
    assert.equal(final.rights.R_fulfil.S, 'released');
    assert.equal(final.rights.R_deliver.D, 'released');
    assert.equal(final.rights.R_fulfil.F, 'spent');
    assert.equal(final.rights.R_deliver.F, 'spent');
    for (const name of ['S', 'I', 'D', 'F'] as const) world.restart(name);
    assert.deepEqual(world.snapshot(), final);
    const completedRetries = observations.map(({ receipt }) => retry(world, world.envelopes.get('S@' + receipt.header.position)!, receipt));
    assert.deepEqual(world.snapshot(), final);
    recordScope('k1-participant-input-' + storage, { malformed: observations, saleRelease, deliveryRelease, activation, completedRetries, final, identities: recordedIdentities(world) });
  } finally { world.close(); }
});
