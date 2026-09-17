import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildThrough, keys, packages, principals, type LifecycleWorld } from '../fixtures/ordering-lifecycle-runner.ts';
import { recordScope } from '../fixtures/ordering-scope-records.ts';
import { MemoryBackend } from '../src/append.ts';
import { SQLiteBackend } from '../src/sqlite.ts';
import { envelopeBytes, signEvent, type ActorEnvelope } from '../src/codec.ts';
import { own, setOwn, type PackageDescriptor } from '../src/descriptor.ts';
import { F0_ID, K, RUNTIME } from '../src/foundation.ts';
import { O1_PROFILE_VERSION } from '../src/journal.ts';
import { ScopeJournal, type SourceExport } from '../src/scope.ts';
import { SCOPE_KINDS, SCOPE_PROFILE, ScopeProfileError, scopeId, scopeImplementationId } from '../src/scope-profile.ts';
import { scopePackage } from '../src/scope-package.ts';

const propertyNames = ['__proto__', 'constructor', 'toString', 'hasOwnProperty'];
function accepted(result: ReturnType<LifecycleWorld['emit']>) { assert.ok(!('refused' in result), JSON.stringify(result)); return result; }
function effective(result: ReturnType<LifecycleWorld['emit']>) { const receipt = accepted(result); assert.equal(receipt.verdict?.effective, true, JSON.stringify(receipt)); return receipt; }
function refactored(exported: SourceExport, additions: Record<string, unknown>): SourceExport {
  const { identity: _identity, ...preimage } = exported;
  // The object-valued variant retains the checker's accepted genesis surface;
  // this test does not widen or silently constrain the existing facts schema.
  const changed = { ...preimage, facts: { ...preimage.facts, ...additions } };
  return { ...changed, identity: scopeId(changed) } as SourceExport;
}

for (const storage of ['memory', 'sqlite'] as const) {
  test('O4 M1 source fact union preserves own property names and source binding: ' + storage, () => {
    const observations = [];
    for (const protoValue of ['own string fact', { extra: 'own object fact' }]) {
      const world = buildThrough('delivery-started', {}, storage);
      try {
        const source = world.contexts.S!.export(['R_fulfil']), delivery = world.contexts.D!.export(['R_deliver']);
        const sourceExtras = Object.fromEntries([['__proto__', protoValue], ['constructor', 'first source'], ['toString', 'source data']]);
        const proposed = { S: refactored(source, sourceExtras), D: refactored(delivery, { constructor: 'second source' }) };
        world.describeDestination(proposed);
        const sourceRelease = effective(world.release('S', 'alice', 'R_fulfil', source));
        const deliveryRelease = effective(world.release('D', 'kim', 'R_deliver', delivery));
        world.startDestination();
        const before = world.contexts.F!.state;
        const expectedFacts = { ...source.facts, ...sourceExtras, ...delivery.facts, constructor: 'second source' };
        assert.deepEqual(before.facts, expectedFacts);
        assert.equal(Object.getPrototypeOf(before.facts), Object.prototype);
        assert.ok(Object.hasOwn(before.facts, '__proto__'));
        assert.deepEqual(own(before.facts, '__proto__'), protoValue);
        assert.equal(own(before.facts, 'constructor'), 'second source', 'later source still wins for duplicate fact keys');
        assert.equal(own(before.facts, 'extra'), undefined, 'no inherited object fact becomes a fact');
        assert.equal(own(Object.prototype as Record<string, unknown>, 'extra'), undefined);
        world.restart('F'); assert.deepEqual(world.contexts.F!.state, before);
        const activation = accepted(world.activate([world.proof('S', sourceRelease.header.position), world.proof('D', deliveryRelease.header.position)]));
        assert.equal(activation.verdict?.reason, 'source_binding_mismatch');
        assert.equal(world.contexts.F!.state.activations, 0);
        assert.equal(world.contexts.F!.state.rights.R_fulfil?.status, 'dormant');
        assert.equal(world.contexts.F!.state.rights.R_deliver?.status, 'dormant');
        const envelope = world.envelopes.get('F@' + activation.header.position)!;
        world.restart('F');
        const retry = accepted(world.emit('F', 'alice', '', {}, envelope));
        assert.equal(retry.replay, true); assert.equal(retry.headerHash, activation.headerHash); assert.deepEqual(retry.verdict, activation.verdict);
        assert.equal(world.contexts.F!.journal.context.head, activation.header.position);
        assert.deepEqual(world.contexts.F!.state.facts, expectedFacts);
        observations.push({ proposed, sourceRelease, deliveryRelease, facts: before.facts, activation, retry });
      } finally { world.close(); }
    }
    recordScope('m1-own-facts-' + storage, observations);
  });

  test('O4 M1 Scope genesis rejects inherited packages and accepts declared own property-name bindings: ' + storage, () => {
    const observations = [];
    for (const name of [...propertyNames, 'inheritedPackage']) {
      const path = join(mkdtempSync(join(tmpdir(), 'dap-o4-m1-own-')), 'journal.db');
      const sequencing = { profile: O1_PROFILE_VERSION, writer: principals.WD };
      let backend = storage === 'memory' ? new MemoryBackend() : new SQLiteBackend(path, sequencing);
      const registry: Record<string, PackageDescriptor> = Object.create({ inheritedPackage: scopePackage });
      const genesis = signEvent({ kind: K.genesis, actor: principals.kim, nonce: '11'.repeat(16), payload: {
        foundation: F0_ID, runtime: RUNTIME, sequencing, grants: [{ principal: principals.kim, capabilities: [SCOPE_KINDS.exercise] }],
        bindings: [{ package: name }], origins: [], referents: [], route: 'm1-own-packages',
        scope: { profile: SCOPE_PROFILE, implementation: scopeImplementationId(), role: 'delivery', founders: [principals.kim], owners: { R_deliver: principals.kim }, facts: { buyer: principals.bob, delivery_slot: 25 } },
      } }, keys.kim);
      assert.equal(Object.hasOwn(registry, name), false);
      let rejection: { name: string; code: string; message: string } | undefined;
      assert.throws(() => ScopeJournal.create({ backend, writerKey: keys.WD, packages: registry }, genesis), error => {
        assert.ok(error instanceof ScopeProfileError); assert.equal(error.code, 'invalid_genesis');
        assert.equal(error.message, 'scope profile: binding shape or missing package');
        rejection = { name: error.name, code: error.code, message: error.message }; return true;
      });
      assert.equal(backend.entries().length, 0, 'profile validation must precede durable genesis');
      setOwn(registry, name, scopePackage);
      assert.equal(Object.hasOwn(registry, name), true);
      assert.equal(Object.getPrototypeOf(registry).inheritedPackage, scopePackage);
      let scoped = ScopeJournal.create({ backend, writerKey: keys.WD, packages: registry }, envelopeBytes(genesis));
      try {
        assert.equal(scoped.journal.context.state.env.packages[0]?.id, scopePackage.id);
        assert.equal(scoped.state.rights.R_deliver?.status, 'live');
        const action: ActorEnvelope = signEvent(scoped.journal.context.intent(principals.kim, SCOPE_KINDS.exercise, { right: 'R_deliver' }, { nonce: '22'.repeat(16) }), keys.kim);
        const receipt = effective(scoped.submit(action, scoped.journal.context.credentialFor(principals.kim)));
        assert.equal(scoped.state.delivered, true); assert.equal(scoped.state.rights.R_deliver?.status, 'spent');
        const before = scoped.state;
        scoped.close(); if (storage === 'sqlite') backend = new SQLiteBackend(path, sequencing);
        scoped = ScopeJournal.open({ backend, writerKey: keys.WD, packages: registry });
        assert.deepEqual(scoped.state, before);
        const retry = accepted(scoped.submit(action, scoped.journal.context.credentialFor(principals.kim)));
        assert.equal(retry.replay, true); assert.equal(retry.headerHash, receipt.headerHash); assert.deepEqual(retry.verdict, receipt.verdict);
        assert.equal(scoped.journal.context.head, 1); assert.deepEqual(scoped.state, before);
        observations.push({ name, rejection, genesis: scoped.journal.context.genesisId, receipt, retry, state: before });
      } finally { scoped.close(); }
    }
    recordScope('m1-own-packages-' + storage, observations);
  });

  test('O4 M1 unchanged facts complete transfer with cold state and exact activation retry: ' + storage, () => {
    const world = buildThrough('sale-fulfilled', {}, storage);
    try {
      const final = world.snapshot();
      assert.equal(final.activations, 1); assert.equal(final.fulfilled, true); assert.equal(final.deliveryConfirmed, true);
      const expectedFacts = { ...world.exports.S!.facts, ...world.exports.D!.facts };
      assert.deepEqual(world.contexts.F!.state.facts, expectedFacts);
      const receipt = world.contexts.F!.journal.context.entries[1]!;
      const verdict = world.contexts.F!.state.verdicts[1];
      for (const name of ['S', 'I', 'D', 'F'] as const) world.restart(name);
      assert.deepEqual(world.snapshot(), final);
      const retry = accepted(world.emit('F', 'alice', '', {}, world.envelopes.get('F@1')!));
      assert.equal(retry.replay, true); assert.equal(retry.headerHash, receipt.headerHash); assert.deepEqual(retry.verdict, verdict);
      assert.deepEqual(world.snapshot(), final);
      recordScope('m1-own-healthy-' + storage, { facts: world.contexts.F!.state.facts, final, retry });
    } finally { world.close(); }
  });
}
