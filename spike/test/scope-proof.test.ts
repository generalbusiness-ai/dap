import assert from 'node:assert/strict';
import { createHash, sign, type KeyObject } from 'node:crypto';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryBackend } from '../src/append.ts';
import { canonicalize, envelopeBytes, principalOf, signEvent } from '../src/codec.ts';
import { CAP, K, holdsNow } from '../src/foundation.ts';
import { Journal } from '../src/journal.ts';
import { publicProof, publicProofBytes, verifyPublicProof, assertPublicData, PUBLIC_PROOF_RULE, PUBLIC_PROOF_RULE_ID, type PublicProof } from '../src/scope-proof.ts';
import { descriptorId, type PackageDescriptor } from '../src/descriptor.ts';
import { inspectionPackage, INSPECTION, type InspectionState } from '../fixtures/inspection.ts';
import { SALE, salePackage, type SaleState } from '../fixtures/sale.ts';
import { acceptance, act, invite } from './fixtures/o1-fixture.ts';
import { create, sqlite, seal, assign, successorKey, successor, keys, people, packages } from './fixtures/o3-fixture.ts';

const available = { ...packages, [inspectionPackage.id]: inspectionPackage };
function certified(journal: Journal, frontier = journal.context.head) {
  const assignment = journal.context.entries.findIndex(entry => entry.event.kind === K.seq_assign);
  const key = assignment >= 0 && frontier > assignment ? successorKey : keys.writer;
  return publicProof(journal, frontier, key);
}
function resign(proof: PublicProof, key: KeyObject): PublicProof {
  const { certificate, ...unsigned } = proof;
  const body = { ...certificate.body, proof_hash: 'sha256:' + createHash('sha256').update(canonicalize(unsigned)).digest('hex') };
  return { ...unsigned, certificate: { body, signer: principalOf(key), sig: sign(null, Buffer.from(canonicalize(body)), key).toString('base64url') } };
}
function accepted(result: ReturnType<Journal['submit']>) {
  assert.ok(!('refused' in result), JSON.stringify(result));
  return result;
}
function effective(result: ReturnType<Journal['submit']>) {
  const receipt = accepted(result);
  assert.equal(receipt.verdict?.effective, true, JSON.stringify(result));
  return receipt.header.position;
}
function source(storage: 'memory' | 'sqlite' = 'memory', withdrawBeforeAcceptance = false, registry = available) {
  // The real O3 signed genesis/assignment fixture, with the existing Inspection
  // package available for a later attachment. No lifecycle expected outcomes.
  const template = create(new MemoryBackend());
  const initial = template.context.entries;
  template.close();
  const path = join(mkdtempSync(join(tmpdir(), 'dap-scope-proof-')), 'source.db');
  let backend = storage === 'sqlite' ? sqlite(path) : new MemoryBackend();
  let journal = Journal.create({ backend, writerKey: keys.writer, packages: registry }, initial[0]!.committed!, [initial[1]!.committed!]);
  const positions: Record<string, number> = {};
  for (const who of ['bob', 'ivan'] as const) {
    positions['invite-' + who] = invite(journal, who, who === 'bob' ? ['Buyer'] : ['Inspector']);
    positions['join-' + who] = effective(journal.submit(acceptance(journal, who, positions['invite-' + who]!)));
  }
  positions.offer = effective(act(journal, 'bob', SALE + 'offer', { offer_id: 'public-offer' }));
  positions.terms = effective(act(journal, 'bob', SALE + 'offer_terms', { offer_id: 'public-offer', seller: people.alice, amount: 731 }));
  positions.counter = effective(act(journal, 'alice', SALE + 'counter', { offer_id: 'public-offer', author: people.bob, amount: 743 }));
  positions.attach = effective(act(journal, 'alice', K.attach, { package: inspectionPackage.id }));
  positions.inspection = effective(act(journal, 'bob', INSPECTION + 'request', { offer_id: 'public-offer', seller: people.alice, inspector: people.ivan }));
  positions.grant = effective(act(journal, 'alice', K.grant, { principal: people.bob, capabilities: [CAP.close] }));
  positions.revoke = effective(act(journal, 'alice', K.revoke, { principal: people.bob, capabilities: [CAP.close] }));
  if (withdrawBeforeAcceptance) positions.withdraw = effective(act(journal, 'bob', SALE + 'withdraw', { offer_id: 'public-offer' }));
  const acceptedOffer = accepted(act(journal, 'alice', SALE + 'accept', { offer_id: 'public-offer' }));
  assert.equal(acceptedOffer.verdict?.effective, !withdrawBeforeAcceptance);
  positions.accept = acceptedOffer.header.position;
  positions.seal = accepted(journal.submit(seal(journal))).header.position;
  positions.assign = accepted(journal.submit(assign(journal))).header.position;
  journal.close();
  if (storage === 'sqlite') backend = sqlite(path);
  journal = Journal.open({ backend, writerKey: successorKey, packages: registry });
  positions.successor = effective(act(journal, 'alice', K.grant, { principal: people.bob, capabilities: [CAP.disclose] }));
  assert.equal(journal.ordering.writer, successor);
  const expected = { genesis: journal.context.genesisId, initialWriter: people.writer, frontier: journal.context.head };
  return { journal, positions, expected, path, registry };
}
function withoutBody(proof: PublicProof, position: number): PublicProof {
  const changed = structuredClone(proof);
  delete changed.positions[position]!.committed;
  return changed;
}

for (const storage of ['memory', 'sqlite'] as const) test('O4 public proof reconstructs signed Sale facts and grants across handover on ' + storage, t => {
  const fixture = source(storage), { journal, positions, expected } = fixture;
  t.after(() => journal.close());
  const proof = certified(journal);
  assert.equal(proof.positions.length, journal.context.entries.length);
  assert.equal(proof.frontier, expected.frontier);
  assert.equal(proof.genesis, expected.genesis);
  assert.equal(proof.initialWriter, people.writer);
  for (const [i, entry] of journal.context.entries.entries()) assert.deepEqual(proof.positions[i]!.header, entry.header);
  for (const name of ['invite-bob', 'invite-ivan', 'terms', 'counter', 'inspection']) {
    assert.equal(proof.positions[positions[name]!]!.committed, undefined, name);
    assert.deepEqual(Object.keys(proof.positions[positions[name]!]!).sort(), ['header']);
  }
  for (const name of ['join-bob', 'join-ivan', 'offer', 'attach', 'grant', 'revoke', 'accept', 'seal', 'assign', 'successor']) {
    assert.equal(proof.positions[positions[name]!]!.committed, journal.context.entries[positions[name]!]!.committed, name);
  }
  const bytes = publicProofBytes(proof);
  assert.equal(bytes, canonicalize(proof));
  for (const name of ['terms', 'counter', 'inspection']) assert.equal(bytes.includes(JSON.stringify(journal.context.entries[positions[name]!]!.committed!).slice(1, -1)), false, name);
  const { view, interpreted } = verifyPublicProof(JSON.parse(bytes), expected, available);
  assert.equal(view.length, proof.positions.length);
  assert.equal(interpreted.frontier, expected.frontier);
  assert.equal(interpreted.basis, expected.frontier);
  assert.deepEqual(interpreted.state.participants, [people.alice, people.bob, people.ivan]);
  assert.equal(holdsNow(interpreted.state, people.bob, CAP.close), false);
  assert.equal(holdsNow(interpreted.state, people.bob, CAP.disclose), true);
  const sale = interpreted.state.models.sale as unknown as SaleState;
  assert.equal(sale.status, 'decided');
  assert.deepEqual(sale.accepted, { id: 'public-offer', position: positions.accept });
  assert.deepEqual(sale.offers.map(offer => ({ id: offer.id, author: offer.author })), [{ id: 'public-offer', author: people.bob }]);
  assert.deepEqual(sale.terms, []); assert.deepEqual(sale.counters, []);
  assert.deepEqual((interpreted.state.models.inspection as unknown as InspectionState).requests, []);
  for (const name of ['terms', 'counter', 'inspection']) assert.equal(interpreted.outcomes[positions[name]!]!.reason, 'hidden');
  assert.equal(interpreted.outcomes[positions.accept!]!.effective, true);
  if (storage === 'sqlite') {
    journal.close();
    const reopened = Journal.open({ backend: sqlite(fixture.path), writerKey: successorKey, packages: available });
    try { assert.deepEqual(certified(reopened), proof); } finally { reopened.close(); }
  }
});

test('O4 source pins distinguish genesis, initial writer and requested frontier', t => {
  const { journal, expected, positions } = source(); t.after(() => journal.close());
  const proof = certified(journal);
  assert.throws(() => verifyPublicProof(proof, { ...expected, genesis: 'sha256:' + 'f'.repeat(64) }, available), /source|prefix|genesis/);
  assert.throws(() => verifyPublicProof(proof, { ...expected, initialWriter: people.carol }, available), /source|writer/);
  assert.throws(() => verifyPublicProof(proof, { ...expected, frontier: expected.frontier - 1 }, available), /source|prefix/);
  const earlier = certified(journal, positions.accept);
  assert.equal(verifyPublicProof(earlier, { ...expected, frontier: positions.accept }, available).interpreted.frontier, positions.accept);
  assert.throws(() => verifyPublicProof(earlier, expected, available), /source|prefix/);
  for (const invalid of [-1, 0.5, Infinity, journal.context.head + 1]) assert.throws(() => certified(journal, invalid), /frontier/);
});

test('O4 public proof rejects malformed, tampered and incomplete authenticated prefixes', t => {
  const { journal, expected, positions } = source(); t.after(() => journal.close());
  const proof = certified(journal);
  const missingPosition = structuredClone(proof); missingPosition.positions.splice(positions.counter!, 1);
  assert.throws(() => verifyPublicProof(missingPosition, expected, available), /prefix/);
  const changedHeader = structuredClone(proof); changedHeader.positions[positions.counter!]!.header.commitment = 'sha256:' + '1'.repeat(64);
  assert.throws(() => verifyPublicProof(changedHeader, expected, available), /signature|commitment/);
  const changedBody = structuredClone(proof);
  const signed = JSON.parse(changedBody.positions[positions.offer!]!.committed!);
  signed.body.payload.offer_id = 'forged';
  changedBody.positions[positions.offer!]!.committed = canonicalize(signed);
  assert.throws(() => verifyPublicProof(changedBody, expected, available), /signature/);
  assert.throws(() => verifyPublicProof(withoutBody(proof, 0), expected, available), /genesis/);
  const injected = structuredClone(proof) as PublicProof & { positions: ({ header: unknown; committed?: string; amount?: number })[] };
  injected.positions[positions.offer!]!.amount = 999;
  assert.throws(() => verifyPublicProof(injected, expected, available), /unexpected|private/);
});

test('O4 public proof rejects missing, changed and forged handover evidence', t => {
  const { journal, expected, positions } = source(); t.after(() => journal.close());
  const proof = certified(journal);
  for (const control of ['seal', 'assign']) assert.throws(() => verifyPublicProof(withoutBody(proof, positions[control]!), expected, available), /seal|assignment|signature|control/);
  const changed = structuredClone(proof);
  const envelope = JSON.parse(changed.positions[positions.assign!]!.committed!);
  envelope.body.payload.writer = people.carol;
  changed.positions[positions.assign!]!.committed = canonicalize(envelope);
  assert.throws(() => verifyPublicProof(changed, expected, available), /signature/);
  const forged = structuredClone(proof);
  forged.positions[positions.assign!]!.committed = envelopeBytes(signEvent({ ...envelope.body, actor: people.alice }, keys.alice));
  assert.throws(() => verifyPublicProof(forged, expected, available), /commitment|control|authorization/);
});

test('O4 public proof rejects private bodies supplied at their genuine signed positions', t => {
  const { journal, expected, positions } = source(); t.after(() => journal.close());
  const proof = certified(journal);
  for (const name of ['terms', 'counter', 'inspection']) {
    const changed = structuredClone(proof), at = positions[name]!;
    changed.positions[at]!.committed = journal.context.entries[at]!.committed;
    assert.throws(() => verifyPublicProof(changed, expected, available), /private|undeclared/, name);
    assert.throws(() => publicProofBytes(changed), /private|undeclared/, name);
  }
});

test('O4 public proof rejects a public kind carrying nested private extras despite valid signatures', t => {
  const { journal } = source(); t.after(() => journal.close());
  effective(act(journal, 'alice', K.grant, { principal: people.bob, capabilities: [], audit: [{ nested: { amount: 991 } }] }));
  assert.throws(() => certified(journal), /private field amount/);
  for (const field of ['amount', 'acceptedAmount', 'counter', 'terms', 'offer_terms']) {
    assert.throws(() => assertPublicData({ nested: [{ [field]: 'private' }] }), /private field/);
  }
});

test('O4 public proof rejects private data attached outside its declared shape', t => {
  const { journal, expected } = source(); t.after(() => journal.close());
  const proof = certified(journal);
  for (const extra of [{ amount: 991 }, { metadata: { acceptedAmount: 991 } }, { extra: journal.context.entries[7]!.committed }]) {
    const changed = { ...proof, ...extra };
    assert.throws(() => verifyPublicProof(changed, expected, available), /private|unexpected|shape|field/);
  }
});

test('O4 public proof requires semantic packages and disclosed attachment bodies', t => {
  const { journal, expected, positions } = source(); t.after(() => journal.close());
  const proof = certified(journal);
  assert.throws(() => verifyPublicProof(proof, expected, {}), /semantic|binding/);
  assert.throws(() => verifyPublicProof(proof, expected, packages), /semantic|binding/);
  assert.throws(() => verifyPublicProof(withoutBody(proof, positions.attach!), expected, available), /semantic|binding|missing|public|completeness/);
});

for (const kind of ['grant', 'revoke'] as const) test('O4 public proof cannot hide an authenticated ' + kind + ' body as a private position', t => {
  const { journal, expected, positions } = source(); t.after(() => journal.close());
  const proof = certified(journal);
  const changed = withoutBody(proof, positions[kind]!);
  assert.throws(() => {
    const result = verifyPublicProof(changed, expected, available);
    t.diagnostic(JSON.stringify({ omitted: kind, closeCapability: holdsNow(result.interpreted.state, people.bob, CAP.close) }));
  }, /semantic|binding|missing|public|grant|revoke|completeness/);
});

test('O4 public proof cannot omit a withdrawal to turn a refused acceptance into a decision', t => {
  const { journal, expected, positions } = source('memory', true); t.after(() => journal.close());
  const proof = certified(journal);
  const verified = verifyPublicProof(proof, expected, available);
  assert.equal(verified.interpreted.outcomes[positions.accept!]!.effective, false);
  assert.equal((verified.interpreted.state.models.sale as unknown as SaleState).accepted, null);
  assert.throws(() => {
    const result = verifyPublicProof(withoutBody(proof, positions.withdraw!), expected, available);
    t.diagnostic(JSON.stringify({ omitted: 'withdraw', effectiveAcceptance: result.interpreted.outcomes[positions.accept!]!.effective, accepted: (result.interpreted.state.models.sale as unknown as SaleState).accepted }));
  }, /semantic|binding|missing|public|withdraw|completeness/);
});

for (const storage of ['memory', 'sqlite'] as const) {
  test('O4 certificate binds every authority opening on ' + storage, t => {
    const { journal, expected, positions } = source(storage, true); t.after(() => journal.close());
    const proof = certified(journal);
    assert.equal(proof.certificate.body.rule, PUBLIC_PROOF_RULE_ID);
    assert.equal(PUBLIC_PROOF_RULE_ID, 'sha256:' + createHash('sha256').update(canonicalize(PUBLIC_PROOF_RULE)).digest('hex'));
    for (const name of ['grant', 'revoke', 'withdraw', 'attach']) {
      assert.throws(() => verifyPublicProof(withoutBody(proof, positions[name]!), expected, available), /completeness/, name);
    }
    assert.throws(() => publicProof(journal), /signer required/);
    const noCertificate = structuredClone(proof) as Partial<PublicProof>; delete noCertificate.certificate;
    assert.throws(() => verifyPublicProof(noCertificate as PublicProof, expected, available), /packet|certificate/);
    const changedHash = structuredClone(proof); changedHash.certificate.body.proof_hash = 'sha256:' + '1'.repeat(64);
    changedHash.certificate.sig = sign(null, Buffer.from(canonicalize(changedHash.certificate.body)), successorKey).toString('base64url');
    assert.throws(() => verifyPublicProof(changedHash, expected, available), /completeness/);
  });

  test('O4 certificate signer follows the frontier header across assignment on ' + storage, t => {
    const { journal, expected, positions } = source(storage); t.after(() => journal.close());
    for (const frontier of [positions.seal!, positions.assign!, positions.successor!]) {
      const at = { ...expected, frontier };
      const proof = certified(journal, frontier);
      const correct = frontier <= positions.assign! ? keys.writer : successorKey;
      const wrong = frontier <= positions.assign! ? successorKey : keys.writer;
      assert.equal(proof.certificate.signer, principalOf(correct));
      assert.equal(verifyPublicProof(proof, at, available).interpreted.frontier, frontier);
      for (const key of [wrong, keys.carol]) {
        assert.throws(() => publicProof(journal, frontier, key), /wrong completeness signer/);
        assert.throws(() => verifyPublicProof(resign(proof, key), at, available), /completeness/);
      }
    }
  });

  test('O4 certificate strictly pins type, rule, genesis, frontier and shape on ' + storage, t => {
    const { journal, expected } = source(storage); t.after(() => journal.close());
    const proof = certified(journal);
    const changes = [
      { type: 'dap.fixture.public-proof-completeness/2' }, { rule: 'sha256:' + 'a'.repeat(64) },
      { genesis: 'sha256:' + 'b'.repeat(64) }, { frontier: expected.frontier - 1 }, { extra: 'unrecognized' },
    ];
    for (const fields of changes) {
      const changed = structuredClone(proof);
      Object.assign(changed.certificate.body, fields);
      // A correct signature over the altered object cannot substitute a different contract.
      changed.certificate.sig = sign(null, Buffer.from(canonicalize(changed.certificate.body)), successorKey).toString('base64url');
      assert.throws(() => verifyPublicProof(changed, expected, available), /completeness|private|unexpected/, JSON.stringify(fields));
    }
    assert.throws(() => verifyPublicProof({ ...proof, extra: 'field' } as PublicProof, expected, available), /unexpected packet fields/);
    assert.throws(() => verifyPublicProof({ ...proof, certificate: { ...proof.certificate, extra: 'field' } } as PublicProof, expected, available), /completeness/);
    const corruptSignature = structuredClone(proof); corruptSignature.certificate.sig = 'A'.repeat(86);
    assert.throws(() => verifyPublicProof(corruptSignature, expected, available), /signature/);
    const paddedSignature = structuredClone(proof); paddedSignature.certificate.sig += '==';
    assert.throws(() => verifyPublicProof(paddedSignature, expected, available), /signature/);
  });

  test('O4 producer refuses a capped authority audience on ' + storage, t => {
    const base: Omit<PackageDescriptor, 'id'> = {
      name: 'com.example.scope-proof-ceiling', module: import.meta.url, models: {}, capabilities: [],
      kinds: { [SALE + 'offer']: salePackage.kinds[SALE + 'offer']! },
    };
    const cap = { id: descriptorId(base), ...base };
    const registry = { ...available, [cap.id]: cap };
    const { journal } = source(storage, false, registry); t.after(() => journal.close());
    effective(act(journal, 'alice', K.attach, { package: cap.id, audience: [people.alice], resolution: { [SALE + 'offer']: { handlers: ['sale'] } } }));
    const at = accepted(act(journal, 'bob', SALE + 'offer', { offer_id: 'capped-offer' })).header.position;
    assert.equal(journal.context.state.audiences[at]!.kind, 'named');
    assert.throws(() => certified(journal), /authority body has narrower audience/);
  });

  test('O4 malicious writer omissions exceed destination trust but member recomputation detects them on ' + storage, t => {
    const { journal, expected, positions } = source(storage, true); t.after(() => journal.close());
    const complete = certified(journal);
    const full = verifyPublicProof(complete, expected, available).interpreted;
    assert.equal(holdsNow(full.state, people.bob, CAP.close), false);
    assert.equal(full.outcomes[positions.accept!]!.effective, false);
    for (const name of ['revoke', 'withdraw']) {
      // Explicit out-of-scope writer violation: the assigned writer signs a lie
      // about completeness. A destination cannot discover an opaque body's kind.
      const malicious = resign(withoutBody(complete, positions[name]!), successorKey);
      const result = verifyPublicProof(malicious, expected, available).interpreted;
      if (name === 'revoke') assert.equal(holdsNow(result.state, people.bob, CAP.close), true);
      else assert.equal(result.outcomes[positions.accept!]!.effective, true);
      // A source member with the full journal can reproduce the honest producer
      // output, locate the missing opening, and retain both signed certificates.
      const recomputed = certified(journal);
      assert.notEqual(malicious.certificate.body.proof_hash, recomputed.certificate.body.proof_hash);
      assert.deepEqual(recomputed.positions.flatMap((position, i) => position.committed !== undefined && malicious.positions[i]!.committed === undefined ? [i] : []), [positions[name]]);
      assert.notEqual(publicProofBytes(malicious), publicProofBytes(recomputed));
    }
  });

  test('O4 public and full semantic verdicts agree at every opening of every certified prefix on ' + storage, t => {
    const { journal, expected } = source(storage); t.after(() => journal.close());
    for (let frontier = 0; frontier <= journal.context.head; frontier++) {
      const proof = certified(journal, frontier);
      const { interpreted, view } = verifyPublicProof(proof, { ...expected, frontier }, available);
      for (let position = 0; position <= frontier; position++) {
        if (proof.positions[position]!.committed !== undefined) {
          assert.equal(view[position]!.via, 'disclosure');
          assert.deepEqual(interpreted.outcomes[position], journal.context.state.verdicts[position], `frontier ${frontier}, opening ${position}`);
        } else assert.equal(interpreted.outcomes[position]!.reason, 'hidden');
      }
    }
  });

  test('O4 disclosure and observation remain hidden under the named public rule on ' + storage, t => {
    const { journal, positions, expected } = source(storage); t.after(() => journal.close());
    const disclosed = effective(act(journal, 'alice', K.disclose, { positions: [positions.offer], to: [people.ivan] }));
    const observed = accepted(act(journal, 'alice', K.observe, { fact: { publicProofTestMarker: 'private-observation' } })).header.position;
    const proof = certified(journal);
    assert.deepEqual(PUBLIC_PROOF_RULE.excludedKinds, [K.disclose, K.observe].sort());
    for (const at of [disclosed, observed]) {
      assert.equal(proof.positions[at]!.committed, undefined);
      assert.deepEqual(proof.positions[at]!.header, journal.context.entries[at]!.header);
    }
    assert.equal(publicProofBytes(proof).includes('private-observation'), false);
    assert.equal(verifyPublicProof(proof, { ...expected, frontier: observed }, available).interpreted.outcomes[positions.accept!]!.effective, true);
  });
}
