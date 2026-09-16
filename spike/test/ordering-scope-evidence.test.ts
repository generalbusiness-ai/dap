import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sign, verify } from 'node:crypto';
import { LifecycleWorld, buildThrough, keys, packages, principals } from '../fixtures/ordering-lifecycle-runner.ts';
import { forkSource, laterProof } from '../fixtures/ordering-scope-faults.ts';
import { ScopeJournal, replayScope } from '../src/scope.ts';
import { publicProof, publicProofBytes, verifyPublicProof, assertPublicData, ScopeProofError } from '../src/scope-proof.ts';
import { SQLiteBackend } from '../src/sqlite.ts';
import { O1_PROFILE_VERSION } from '../src/journal.ts';
import { join } from 'node:path';
import { MemoryBackend } from '../src/append.ts';
import { canonicalize, envelopeBytes, envelopeId, signEvent, signHeader, headerHash, verifyHeader, publicKeyOf, verifyEnvelope, type ActorEnvelope } from '../src/codec.ts';
import { ScopeProfileError, SCOPE_KINDS, scopeId } from '../src/scope-profile.ts';
import { K, holdsNow } from '../src/foundation.ts';
import { SALE } from '../fixtures/sale.ts';
import { INSPECTION } from '../fixtures/inspection.ts';
import { recordScope } from '../fixtures/ordering-scope-records.ts';
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
for (const storage of ['memory','sqlite'] as const) test('O4 release proof pins come from F genesis: r=p+1, exact prefix and source writer: ' + storage, () => {
  const world = buildThrough('destination-started',{},storage);
  try {
    const proofs = [world.proof('S'), world.proof('D')];
    const beforeRelease = world.contexts.S!.proof(23);
    failed(world.activate([{ source: beforeRelease, release: 24 }, proofs[1]!]), /ineffective_release|source_binding_mismatch/); dormant(world);
    failed(world.activate([{ ...proofs[0]!, release: 23 }, proofs[1]!]), /ineffective_release/); dormant(world);
    const wrongWriter = structuredClone(proofs[0]!); wrongWriter.source.initialWriter = principals.WD;
    failed(world.activate([wrongWriter, proofs[1]!]), /wrong source or prefix/); dormant(world);
    const later = [laterProof(world, 'S'), laterProof(world, 'D')];
    assert.notEqual(publicProofBytes(later[0]!.source), publicProofBytes(proofs[0]!.source));
    assert.deepEqual(replayScope(later[0]!.source, packages).verdicts[24], world.contexts.S!.state.verdicts[24]);
    const activation = world.activate(later); assert.ok(!('refused' in activation)); assert.equal(activation.verdict?.effective, true);
  } finally { world.close(); }
});
for (const storage of ['memory','sqlite'] as const) test('O4 altered public proof bodies cannot activate a destination: ' + storage, () => {
  const world = buildThrough('destination-started',{},storage);
  try {
    for (const position of [3, 11, 17]) {
      const proofs = [structuredClone(world.proof('S')), world.proof('D')];
      delete proofs[0]!.source.positions[position]!.committed;
      failed(world.activate(proofs), /completeness|missing semantic|dependency/); dormant(world);
    }
  } finally { world.close(); }
});
for (const storage of ['memory','sqlite'] as const) test('O4 actual revoked release source cannot be repaired by stripping its revocation: ' + storage, () => {
  const world = buildThrough('writer-assigned',{},storage);
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
for (const storage of ['memory','sqlite'] as const) test('O4 public/full scope replay agrees at every opened release-prefix position: ' + storage, () => {
  const world = buildThrough('destination-started',{},storage);
  try {
    for (const name of ['S', 'I', 'D'] as const) {
      const source = world.contexts[name]!; const proof = source.proof();
      const actual = replayScope(proof, packages);
      for (const [position, entry] of proof.positions.entries()) if (entry.committed) assert.deepEqual(actual.verdicts[position], source.state.verdicts[position], name + '@' + position);
    }
  } finally { world.close(); }
});
for (const storage of ['memory','sqlite'] as const) test('O4 actual activation, exports and F views exclude Sale private fields and the Inspection request body: ' + storage, () => {
  const world = buildThrough('destination-activated',{},storage);
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
for (const storage of ['memory','sqlite'] as const) test('O4 every materialized signed F genesis field/container is bound before either release: ' + storage, () => {
  const world = buildThrough('destination-started',{},storage);
  try {
    const original = world.destination!;
    const mutations = genesisPaths(original as never).flatMap(path => (['replace','remove'] as const).map(operation => ({ path, operation })));
    mutations.push({ path: '/extra', operation: 'add' as never });
    const records: unknown[] = [];
    for (const mutation of mutations) {
      let candidate: ScopeJournal | undefined;
      let backend: MemoryBackend | SQLiteBackend | undefined;
      const raw = mutate(original, mutation.path, mutation.operation);
      try {
        let signed: ActorEnvelope;
        // Re-sign shape-valid bodies so body edits test destination binding,
        // not merely the fact that the original actor signature changed.
        if (mutation.path.startsWith('/body')) signed = signEvent(raw.body, keys.alice);
        else signed = verifyEnvelope(canonicalize(raw));
        assert.notEqual(envelopeId(signed), envelopeId(original));
        backend = storage === 'sqlite' ? new SQLiteBackend(join(world.root,'mutant-' + records.length + '.sqlite'), { writer:principals.WF,profile:O1_PROFILE_VERSION }) : new MemoryBackend();
        candidate = ScopeJournal.create({ backend, writerKey: keys.WF, packages }, signed);
        const envelope = signEvent(candidate.journal.context.intent(principals.alice, K.scope_activate, { proofs: [world.proof('S'),world.proof('D')] as never }, { action_id: 'mutant-activation', nonce: 'd'.repeat(32) }), keys.alice);
        const result = candidate.submit(envelope, candidate.journal.context.credentialFor(principals.alice));
        assert.ok(!('refused' in result)); assert.equal(result.verdict?.effective, false);
        if (holdsNow(candidate.journal.context.state, principals.alice, K.scope_activate)) assert.equal(result.verdict?.reason, 'destination_mismatch');
        else { assert.equal(result.verdict?.authorized, false); assert.equal(result.verdict?.reason, 'unauthorized'); }
        assert.equal(candidate.state.activations, 0); assert.ok(Object.values(candidate.state.rights).every(r => r!.status !== 'live'));
        records.push({ ...mutation, verdict: result.verdict });
      } catch (error) { try { records.push({ ...mutation, ...recognized(error) }); } catch (unexpected) { console.log('failed mutation', mutation, error); throw unexpected; } }
      finally { candidate?.close(); if (backend instanceof SQLiteBackend) backend.close(); }
    }
    recordScope('materialized-genesis-mutations-' + storage,{ genesis:original,records });
    console.log('materialized genesis mutations:', records.length);
    assert.equal(records.length, genesisPaths(original as never).length * 2 + 1);
  } finally { world.close(); }
});

for (const storage of ['memory','sqlite'] as const) test('O4 withdrawn o3 cannot be restored by stripping the real withdrawal: ' + storage, () => {
  const healthy = buildThrough('destination-described', {}, storage);
  const world = buildThrough('inspection-result-recorded', {}, storage);
  try {
    world.emit('S','bob',SALE + 'offer',{ offer_id:'o3', replaces:'o1' });
    const withdraw = world.emit('S','bob',SALE + 'withdraw',{ offer_id:'o3' });
    assert.ok(!('refused' in withdraw)); assert.equal(withdraw.verdict?.effective, true);
    for (let i = 0; i < 2; i++) {
      const acceptance = world.emit('S','alice',SALE + 'accept',{ offer_id:'o3' });
      assert.ok(!('refused' in acceptance)); assert.equal(acceptance.verdict?.perModel?.sale?.reason,'withdrawn');
    }
    world.emit('S','alice',SALE + 'close',{ outcome:'sold' });
    world.importInspection(); world.seal(); world.assign(); world.continueWriter(); world.startDelivery();
    const { identity, ...claim } = healthy.exports.S!;
    const head = world.contexts.S!.journal.context.entries[23]!;
    const changed = { ...claim, prefix: { position:23, headerHash:head.headerHash, commitment:head.header.commitment } };
    world.describeDestination({ S:{...changed,identity:scopeId(changed)}, D:world.contexts.D!.export(['R_deliver']) });
    const release = world.release('S'); assert.ok(!('refused' in release)); assert.equal(release.verdict?.reason,'unowned_right');
    world.release('D'); world.startDestination();
    const proof = world.proof('S');
    failed(world.activate([proof,world.proof('D')]),/ineffective_release/); dormant(world);
    const stripped = structuredClone(proof); delete stripped.source.positions[16]!.committed;
    failed(world.activate([stripped,world.proof('D')]),/completeness/); dormant(world);
  } finally { world.close(); healthy.close(); }
});


for (const storage of ['memory','sqlite'] as const) test('O4 H1 a signed duplicate-commitment fault proof refuses activation without poisoning the destination: ' + storage, () => {
  const world = buildThrough('destination-started',{},storage);
  try {
    const original = world.proof('S');
    const packet = structuredClone(original.source);
    const last = packet.positions.at(-1)!;
    const expected = { genesis:packet.genesis,position:packet.frontier + 1,prev:headerHash(last.header) };
    const header = signHeader({ ...expected,commitment:last.header.commitment },keys.W1);
    verifyHeader(header,principals.W1,expected);
    // Explicit faulty-writer packet: reuse the actual actor envelope in a new
    // correctly signed header. The healthy source journal remains untouched.
    assert.equal(verifyEnvelope(last.committed!).body.kind,K.scope_release);
    packet.positions.push({ header,committed:last.committed! });packet.frontier++;
    const { certificate,...unsigned } = packet;
    const body = { ...certificate.body,frontier:packet.frontier,proof_hash:scopeId(unsigned) };
    packet.certificate = { body,signer:principals.W1,sig:sign(null,Buffer.from(canonicalize(body)),keys.W1).toString('base64url') };
    assert.equal(verify(null,Buffer.from(canonicalize(body)),publicKeyOf(principals.W1),Buffer.from(packet.certificate.sig,'base64url')),true);
    assert.throws(()=>verifyPublicProof(packet,{ genesis:packet.genesis,initialWriter:principals.W0,frontier:packet.frontier },packages),error=>error instanceof ScopeProofError && error.message==='Journal view: duplicate commitment');
    const refusal = world.activate([{ source:packet,release:original.release },world.proof('D')]);
    failed(refusal,/^Journal view: duplicate commitment$/);dormant(world);
    assert.equal(world.contexts.S!.journal.context.head,24);
    const honest = world.activate();assert.ok(!('refused' in honest));assert.equal(honest.verdict?.effective,true);
    assert.equal(world.contexts.F!.state.activations,1);
    recordScope('h1-duplicate-commitment-' + storage,{ faultyWriterPacket:packet,refusal,honest,sourceHead:world.contexts.S!.journal.context.head,final:world.snapshot() });
  } finally {world.close();}
});
