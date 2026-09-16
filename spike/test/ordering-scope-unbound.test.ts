import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildThrough, keys, packages, principals, type LifecycleWorld, type Name, type Person } from '../fixtures/ordering-lifecycle-runner.ts';
import { recordScope } from '../fixtures/ordering-scope-records.ts';
import { envelopeBytes, signEvent } from '../src/codec.ts';
import { verifyPublicProof } from '../src/scope-proof.ts';
import { SALE } from '../fixtures/sale.ts';
import type { ScopeJournal } from '../src/scope.ts';

function accepted(result: ReturnType<ScopeJournal['submit']>) {
  assert.ok(!('refused' in result), JSON.stringify(result));
  return result;
}
function unbound(world: LifecycleWorld, name: Name, actor: Person) {
  const context = world.contexts[name]!.journal.context;
  const kind = SALE + 'offer';
  assert.equal(Object.hasOwn(context.state.env.kinds, kind), false);
  const envelope = signEvent(context.intent(principals[actor], kind, { offer_id: 'unbound' }, {
    expected_binding: 'sha256:' + '0'.repeat(64), action_id: 'unbound:' + name, nonce: 'f'.repeat(32),
  }), keys[actor]);
  const receipt = accepted(world.emit(name, actor, '', {}, envelope));
  assert.deepEqual(receipt.verdict, { known: false, authorized: false, effective: false, reason: 'unhandled' });
  assert.deepEqual(world.contexts[name]!.journal.context.state.audiences[receipt.header.position], { kind: 'named', principals: [principals[actor]] });
  const proof = world.contexts[name]!.proof();
  assert.deepEqual(proof.positions[receipt.header.position], { header: receipt.header });
  const verified = verifyPublicProof(proof, { genesis: proof.genesis, initialWriter: proof.initialWriter }, packages);
  assert.equal(verified.interpreted.outcomes[receipt.header.position]!.reason, 'hidden');
  assert.equal(verified.interpreted.outcomes[receipt.header.position]!.effective, false);
  world.restart(name);
  assert.deepEqual(world.contexts[name]!.proof(), proof);
  const retry = accepted(world.contexts[name]!.submit(envelopeBytes(envelope), world.contexts[name]!.journal.context.credentialFor(principals[actor])));
  assert.equal(retry.replay, true); assert.equal(retry.headerHash, receipt.headerHash);
  assert.deepEqual(retry.verdict, receipt.verdict);
  return { envelope, receipt, proof };
}

for (const storage of ['memory', 'sqlite'] as const) {
  test('O4 L3 unbound D member attempt permits certified completed transfer: ' + storage, () => {
    const world = buildThrough('delivery-started', {}, storage);
    try {
      const attempt = unbound(world, 'D', 'bob');
      world.describeDestination();
      const releaseS = accepted(world.release('S')), releaseD = accepted(world.release('D'));
      assert.equal(releaseS.verdict?.effective, true); assert.equal(releaseD.verdict?.effective, true);
      assert.equal(releaseD.header.position, 2);
      const proof = world.contexts.D!.proof();
      world.restart('D'); assert.deepEqual(world.contexts.D!.proof(), proof);
      world.startDestination();
      const activation = accepted(world.activate([world.proof('S', releaseS.header.position), world.proof('D', releaseD.header.position)]));
      assert.equal(activation.verdict?.effective, true);
      assert.equal(accepted(world.exercise('F', 'kim', 'R_deliver')).verdict?.effective, true);
      assert.equal(accepted(world.exercise('F', 'alice', 'R_fulfil')).verdict?.effective, true);
      world.restart('F');
      const final = world.snapshot();
      assert.equal(final.activations, 1); assert.equal(final.deliveryConfirmed, true); assert.equal(final.fulfilled, true);
      assert.equal(final.rights.R_deliver.D, 'released'); assert.equal(final.rights.R_deliver.F, 'spent');
      recordScope('l3-unbound-D-' + storage, { attempt, releaseS, releaseD, proof, activation, final });
    } finally { world.close(); }
  });
  test('O4 L3 unbound I attempt preserves proof and later inspection result: ' + storage, () => {
    const world = buildThrough('inspection-spawned', {}, storage);
    try {
      const attempt = unbound(world, 'I', 'ivan');
      const result = accepted(world.inspectionResult()); assert.equal(result.verdict?.effective, true);
      const proof = world.contexts.I!.proof();
      assert.equal(typeof proof.positions[result.header.position]!.committed, 'string');
      world.restart('I'); assert.deepEqual(world.contexts.I!.proof(), proof);
      assert.equal(world.contexts.I!.state.inspection.result, 'pass:o2');
      recordScope('l3-unbound-I-' + storage, { attempt, result, proof });
    } finally { world.close(); }
  });
  test('O4 L3 unbound F member attempt preserves proof and both spends: ' + storage, () => {
    const world = buildThrough('destination-activated', {}, storage);
    try {
      const attempt = unbound(world, 'F', 'bob');
      assert.equal(accepted(world.exercise('F', 'kim', 'R_deliver')).verdict?.effective, true);
      assert.equal(accepted(world.exercise('F', 'alice', 'R_fulfil')).verdict?.effective, true);
      const proof = world.contexts.F!.proof();
      world.restart('F'); assert.deepEqual(world.contexts.F!.proof(), proof);
      const final = world.snapshot(); assert.equal(final.activations, 1); assert.equal(final.fulfilled, true);
      recordScope('l3-unbound-F-' + storage, { attempt, proof, final });
    } finally { world.close(); }
  });
}
