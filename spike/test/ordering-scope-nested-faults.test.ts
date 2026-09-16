import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { buildThrough, keys, packages, principals } from '../fixtures/ordering-lifecycle-runner.ts';
import { MemoryBackend, type Backend } from '../src/append.ts';
import { ScopeJournal } from '../src/scope.ts';
import { verifyPublicProof } from '../src/scope-proof.ts';
import { SQLiteBackend } from '../src/sqlite.ts';
import { Journal, O1_PROFILE_VERSION } from '../src/journal.ts';
import { K } from '../src/foundation.ts';
import { envelopeBytes, signEvent } from '../src/codec.ts';

for (const storage of ['memory', 'sqlite'] as const) test('O4 K2 every activation registry fault propagates unchanged and cold exact retry agrees: ' + storage, t => {
  const world = buildThrough('destination-started', {}, storage);
  const proofs = [world.proof('S'), world.proof('D')], destination = world.destination!, root = world.root;
  world.close();
  let count = 0, failAt = -1, serial = 0;
  const failure = new Error('ineffective_release'); // Matching a policy reason does not make it a policy error.
  const registry = new Proxy({ ...packages }, { get(target, property, receiver) {
    if (typeof property === 'string' && property.startsWith('sha256:') && ++count === failAt) throw failure;
    return Reflect.get(target, property, receiver);
  } });
  const opts = { writer: principals.WF, profile: O1_PROFILE_VERSION };
  function fresh() {
    const path = join(root, 'k2-' + serial++ + '.db');
    let backend: Backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
    ScopeJournal.create({ backend, writerKey: keys.WF, packages }, destination).close();
    if (storage === 'sqlite') backend = new SQLiteBackend(path, opts);
    return { path, backend, scope: ScopeJournal.open({ backend, writerKey: keys.WF, packages: registry }) };
  }
  function action(scope: ScopeJournal) {
    return signEvent(scope.journal.context.intent(principals.alice, K.scope_activate, { proofs } as never, { action_id: 'k2-activate', nonce: 'ca'.repeat(16) }), keys.alice);
  }
  const healthy = fresh(), original = action(healthy.scope);
  count = 0;
  const baseline = healthy.scope.submit(original, healthy.scope.journal.context.credentialFor(principals.alice));
  assert.ok(!('refused' in baseline) && baseline.verdict?.effective);
  const total = count; healthy.scope.close();
  assert.ok(total >= 112, 'include the reviewer\'s nested export lookup');
  let caught = 0, recovered = 0;
  for (let n = 1; n <= total; n++) {
    const { path, backend, scope } = fresh(), envelope = action(scope), bytes = envelopeBytes(envelope);
    const credential = scope.journal.context.credentialFor(principals.alice);
    count = 0; failAt = n;
    try {
      assert.throws(() => scope.submit(bytes, credential), error => error === failure, 'lookup ' + n);
      caught++;
    } finally { failAt = -1; }
    assert.throws(() => scope.submit(bytes, credential), /unavailable|closed|inactive|reopen/);
    assert.throws(() => scope.journal.context.submit(envelope.body, credential, envelope), /closed|inactive/);
    assert.throws(() => scope.interpret(principals.alice), /unavailable/);
    assert.throws(() => scope.export(['R_fulfil']), /unavailable/);
    scope.close();
    const reopened = storage === 'sqlite' ? new SQLiteBackend(path, opts) : backend;
    const cold = ScopeJournal.open({ backend: reopened, writerKey: keys.WF, packages });
    assert.equal(cold.journal.context.head, 1);
    assert.equal(cold.journal.context.entries[1]!.committed, bytes);
    assert.equal(cold.state.activations, 1);
    const retry = cold.submit(bytes, credential);
    assert.ok(!('refused' in retry) && retry.replay && retry.verdict?.effective, 'cold retry at lookup ' + n);
    assert.equal(retry.headerHash, cold.journal.context.entries[1]!.headerHash);
    assert.equal(cold.journal.context.head, 1); assert.equal(cold.state.activations, 1);
    recovered++; cold.close();
  }
  assert.equal(caught, total); assert.equal(recovered, total);
  t.diagnostic(JSON.stringify({ storage, totalLookups: total, originalExceptions: caught, exactRetryRecoveries: recovered, returnedFaultVerdicts: 0 }));
});

for (const storage of ['memory', 'sqlite'] as const) test('O4 K2 cold open throws the original nested registry error while ordinary Journal keeps legacy verdicts: ' + storage, () => {
  const world = buildThrough('sale-accepted', {}, storage);
  const original = world.contexts.S!, backend = original.journal.context.backend, ordering = original.journal.ordering;
  original.close();
  const reopen = () => storage === 'sqlite' ? new SQLiteBackend(world.paths.S!, { writer: ordering.initialWriter, profile: ordering.profile }) : backend;
  let count = 0;
  const failure = new Error('cold registry failure');
  const registry = new Proxy({ ...packages }, { get(target, property, receiver) {
    if (typeof property === 'string' && property.startsWith('sha256:') && ++count === 3) throw failure;
    return Reflect.get(target, property, receiver);
  } });
  const strict = reopen();
  assert.throws(() => ScopeJournal.open({ backend: strict, writerKey: keys.W0, packages: registry }), error => error === failure);
  if (strict instanceof SQLiteBackend) strict.close();
  count = 0;
  const legacy = Journal.open({ backend: reopen(), writerKey: keys.W0, packages: registry });
  assert.ok(Object.values(legacy.context.state.verdicts).some(v => v.reason === 'fold_error:cold registry failure'));
  legacy.close();
  const cold = ScopeJournal.open({ backend: reopen(), writerKey: keys.W0, packages });
  assert.equal(cold.state.sale.status, 'accepted');
  assert.equal(cold.export(['R_fulfil']).rights[0]!.name, 'R_fulfil');
  cold.close(); world.close();
});

test('O4 K2 export and public-proof interpretations preserve original non-Error failures', () => {
  const world = buildThrough('sale-accepted', {}, 'memory');
  const original = world.contexts.S!, backend = original.journal.context.backend, packet = original.proof();
  original.close();
  const failure = { kind: 'unexpected registry failure' };
  let count = 0, failAt = -1;
  const registry = new Proxy({ ...packages }, { get(target, property, receiver) {
    if (typeof property === 'string' && property.startsWith('sha256:') && ++count === failAt) throw failure;
    return Reflect.get(target, property, receiver);
  } });
  const scope = ScopeJournal.open({ backend, writerKey: keys.W0, packages: registry });
  count = 0; scope.export(['R_fulfil']); const total = count;
  // Every nested interpretation used by export must propagate its registry fault.
  for (let n = 1; n <= total; n++) {
    count = 0; failAt = n;
    assert.throws(() => scope.export(['R_fulfil']), error => error === failure, 'export lookup ' + n);
  }
  count = 0; failAt = -1; verifyPublicProof(packet, { genesis: packet.genesis, initialWriter: packet.initialWriter }, registry);
  const proofLookups = count;
  for (let n = 1; n <= proofLookups; n++) {
    count = 0; failAt = n;
    assert.throws(() => verifyPublicProof(packet, { genesis: packet.genesis, initialWriter: packet.initialWriter }, registry), error => error === failure, 'proof lookup ' + n);
  }
  failAt = -1; scope.close(); world.close();
});

test('O4 K2 an unlisted error inside wireInput retains its identity', () => {
  const world = buildThrough('sale-accepted');
  try {
    const packet = world.contexts.S!.proof(), failure = new Error('Journal view: unlisted implementation fault');
    const broken = new Proxy(packet, { ownKeys() { throw failure; } });
    assert.throws(() => verifyPublicProof(broken, { genesis: packet.genesis, initialWriter: packet.initialWriter }, packages), error => error === failure);
  } finally { world.close(); }
});
