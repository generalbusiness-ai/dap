import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LifecycleWorld, buildThrough, keys, packages, principals } from '../fixtures/ordering-lifecycle-runner.ts';
import { forkSource, laterProof } from '../fixtures/ordering-scope-faults.ts';
import { ScopeJournal, replayScope } from '../src/scope.ts';
import { publicProof, publicProofBytes, verifyPublicProof, assertPublicData } from '../src/scope-proof.ts';
import { MemoryBackend } from '../src/append.ts';
import { canonicalize, envelopeBytes, envelopeId, signEvent, verifyEnvelope, type ActorEnvelope } from '../src/codec.ts';
import { ScopeProfileError, SCOPE_KINDS } from '../src/scope-profile.ts';
import { K } from '../src/foundation.ts';
import { SALE } from '../fixtures/sale.ts';
import { INSPECTION } from '../fixtures/inspection.ts';
import { genesisPaths } from '../manifests/ordering-lifecycle.ts';

function dormant(world: LifecycleWorld) {
  const state = world.contexts.F!.state;
  assert.equal(state.activations, 0);
  assert.equal(state.active, false);
  assert.deepEqual(Object.values(state.rights).map(r => r!.status), ['dormant', 'dormant']);
}
function failed(result: ReturnType<LifecycleWorld['activate']>, reason: RegExp) {
  assert.ok(!('refused' in result)); assert.equal(result.verdict?.effective, false);
  assert.match(result.verdict!.reason!, reason);
}
test('O4 release proof pins come from F genesis: r=p+1, exact prefix and source writer', () => {
  const world = buildThrough('destination-started');
  try {
    const proofs = [world.proof('S'), world.proof('D')];
    const beforeRelease = world.contexts.S!.proof(23);
    failed(world.activate([{ source: beforeRelease, release: 24 }, proofs[1]!]), /ineffective_release|source_binding_mismatch/); dormant(world);
    failed(world.activate([{ ...proofs[0]!, release: 23 }, proofs[1]!]), /source_binding_mismatch/); dormant(world);
    const wrongWriter = structuredClone(proofs[0]!); wrongWriter.source.initialWriter = principals.WD;
    failed(world.activate([wrongWriter, proofs[1]!]), /wrong source or prefix/); dormant(world);
    const later = [laterProof(world, 'S'), laterProof(world, 'D')];
    assert.notEqual(publicProofBytes(later[0]!.source), publicProofBytes(proofs[0]!.source));
    assert.deepEqual(replayScope(later[0]!.source, packages).verdicts[24], world.contexts.S!.state.verdicts[24]);
    const activation = world.activate(later); assert.ok(!('refused' in activation)); assert.equal(activation.verdict?.effective, true);
  } finally { world.close(); }
});
test('O4 altered public proof bodies cannot activate a destination', () => {
  const world = buildThrough('destination-started');
  try {
    for (const position of [3, 11, 17]) {
      const proofs = [structuredClone(world.proof('S')), world.proof('D')];
      delete proofs[0]!.source.positions[position]!.committed;
      failed(world.activate(proofs), /completeness|missing semantic|dependency/); dormant(world);
    }
  } finally { world.close(); }
});
test('O4 actual revoked release source cannot be repaired by stripping its revocation', () => {
  const world = buildThrough('writer-assigned');
  try {
    world.emit('S', 'alice', K.revoke, { principal: principals.alice, capabilities: [K.scope_release] }); // S23
    world.startDelivery(); world.describeDestination();
    const release = world.release('S'); assert.ok(!('refused' in release)); assert.equal(release.verdict?.authorized, false);
    world.release('D'); world.startDestination();
    const proof = world.proof('S');
    failed(world.activate([proof, world.proof('D')]), /unauthorized_release/); dormant(world);
    const stripped = structuredClone(proof); delete stripped.source.positions[23]!.committed;
    failed(world.activate([stripped, world.proof('D')]), /completeness/); dormant(world);
  } finally { world.close(); }
});
test('O4 public/full scope replay agrees at every opened release-prefix position', () => {
  const world = buildThrough('destination-started');
  try {
    for (const name of ['S', 'I', 'D'] as const) {
      const source = world.contexts[name]!; const proof = source.proof();
      const actual = replayScope(proof, packages);
      for (const [position, entry] of proof.positions.entries()) if (entry.committed) assert.deepEqual(actual.verdicts[position], source.state.verdicts[position], name + '@' + position);
    }
  } finally { world.close(); }
});
test('O4 actual activation, exports and F views disclose public source bodies without private bytes', () => {
  const world = buildThrough('destination-activated');
  try {
    const activation = world.contexts.F!.journal.context.entries[1]!;
    const serialized = [activation.committed!, canonicalize(world.exports.S), canonicalize(world.exports.D), publicProofBytes(world.proof('S').source)];
    for (const reader of ['alice', 'bob', 'kim'] as const) {
      const view = world.contexts.F!.journal.context.view(principals[reader]);
      serialized.push(canonicalize(view));
      assert.equal(world.contexts.F!.interpret(principals[reader]).active, true);
      assert.equal(view[1]!.committed, activation.committed);
    }
    for (const bytes of serialized) {
      assertPublicData(JSON.parse(bytes));
      assert.ok(!bytes.includes(SALE + 'offer_terms'));
      assert.ok(!bytes.includes(SALE + 'counter'));
      assert.ok(!bytes.includes(INSPECTION + 'request'));
      assert.ok(!/\\?"(?:amount|acceptedAmount|counter|terms|offer_terms)\\?"\s*:/.test(bytes));
    }
    const packet = world.proof('S').source;
    assert.equal(verifyEnvelope(packet.positions[8]!.committed!).body.actor, principals.carol);
    assert.equal(verifyEnvelope(packet.positions[5]!.committed!).body.actor, principals.carol);
    for (const reader of ['alice','bob','kim'] as const) assert.ok(world.contexts.F!.journal.context.state.participants.includes(principals[reader]));
    world.restart('F');
    for (const reader of ['alice','bob','kim'] as const) assert.equal(world.contexts.F!.interpret(principals[reader]).active, true);
  } finally { world.close(); }
});

function mutate(value: any, path: string, operation: 'replace' | 'remove' | 'add'): any {
  if (!path) return operation === 'remove' ? null : 'changed-root';
  const changed = structuredClone(value); const segments = path.slice(1).split('/');
  let parent = changed; for (const key of segments.slice(0, -1)) parent = parent[key];
  const key = segments.at(-1)!;
  if (operation === 'remove') { if (Array.isArray(parent)) parent.splice(Number(key), 1); else delete parent[key]; }
  else if (operation === 'add') parent[key] = 'extra-field';
  else {
    const prior = parent[key];
    parent[key] = typeof prior === 'string' ? prior + '-changed' : typeof prior === 'number' ? prior + 1 : typeof prior === 'boolean' ? !prior : Array.isArray(prior) ? [...prior, 'changed'] : null;
  }
  return changed;
}
function recognized(error: unknown): { category: string; diagnostic: string } {
  assert.ok(error instanceof Error, 'non-Error failure is not a recognized rejection');
  const diagnostic = error.message;
  if (error instanceof ScopeProfileError) return { category: 'profile invalid_genesis', diagnostic };
  if (error instanceof TypeError && diagnostic.startsWith('codec: ')) return { category: diagnostic === 'codec: invalid actor signature' ? 'codec invalid_actor_signature' : 'codec malformed_envelope', diagnostic };
  if (['Journal: unsupported profile','ordering: malformed control payload','ordering: v1 cannot install control authority'].includes(diagnostic)) return { category: 'profile unsupported_profile', diagnostic };
  assert.fail('unrecognized exception: ' + diagnostic);
}
test('O4 every materialized signed F genesis field/container is bound before either release', () => {
  const world = buildThrough('destination-started');
  try {
    const original = world.destination!;
    const mutations = genesisPaths(original as never).flatMap(path => (['replace','remove'] as const).map(operation => ({ path, operation })));
    mutations.push({ path: '/extra', operation: 'add' as never });
    const records: unknown[] = [];
    for (const mutation of mutations) {
      let candidate: ScopeJournal | undefined;
      const raw = mutate(original, mutation.path, mutation.operation);
      try {
        let signed: ActorEnvelope;
        // Re-sign shape-valid bodies so body edits test destination binding,
        // not merely the fact that the original actor signature changed.
        if (mutation.path.startsWith('/body')) signed = signEvent(raw.body, keys.alice);
        else signed = verifyEnvelope(canonicalize(raw));
        assert.notEqual(envelopeId(signed), envelopeId(original));
        candidate = ScopeJournal.create({ backend: new MemoryBackend(), writerKey: keys.WF, packages }, signed);
        const envelope = signEvent(candidate.journal.context.intent(principals.alice, K.scope_activate, { proofs: [world.proof('S'),world.proof('D')] as never }, { action_id: 'mutant-activation', nonce: 'd'.repeat(32) }), keys.alice);
        const result = candidate.submit(envelope);
        assert.ok(!('refused' in result)); assert.equal(result.verdict?.effective, false);
        assert.equal(result.verdict?.reason, 'destination_mismatch');
        assert.equal(candidate.state.activations, 0); assert.ok(Object.values(candidate.state.rights).every(r => r!.status !== 'live'));
        records.push({ ...mutation, verdict: result.verdict });
      } catch (error) { records.push({ ...mutation, ...recognized(error) }); }
      finally { candidate?.close(); }
    }
    console.log('materialized genesis mutation records', JSON.stringify(records));
    assert.equal(records.length, genesisPaths(original as never).length * 2 + 1);
  } finally { world.close(); }
});
