import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryBackend } from '../src/append.ts';
import { canonicalize, envelopeBytes, signEvent } from '../src/codec.ts';
import { CAP, K, holdsNow } from '../src/foundation.ts';
import { Journal } from '../src/journal.ts';
import { publicProof, publicProofBytes, verifyPublicProof, assertPublicData, type PublicProof } from '../src/scope-proof.ts';
import { inspectionPackage, INSPECTION, type InspectionState } from '../fixtures/inspection.ts';
import { SALE, type SaleState } from '../fixtures/sale.ts';
import { acceptance, act, invite } from './fixtures/o1-fixture.ts';
import { create, sqlite, seal, assign, successorKey, successor, keys, people, packages } from './fixtures/o3-fixture.ts';

const available = { ...packages, [inspectionPackage.id]: inspectionPackage };
function accepted(result: ReturnType<Journal['submit']>) {
  assert.ok(!('refused' in result), JSON.stringify(result));
  return result;
}
function effective(result: ReturnType<Journal['submit']>) {
  const receipt = accepted(result);
  assert.equal(receipt.verdict?.effective, true, JSON.stringify(result));
  return receipt.header.position;
}
function source(storage: 'memory' | 'sqlite' = 'memory', withdrawBeforeAcceptance = false) {
  // The real O3 signed genesis/assignment fixture, with the existing Inspection
  // package available for a later attachment. No lifecycle expected outcomes.
  const template = create(new MemoryBackend());
  const initial = template.context.entries;
  template.close();
  const path = join(mkdtempSync(join(tmpdir(), 'dap-scope-proof-')), 'source.db');
  let backend = storage === 'sqlite' ? sqlite(path) : new MemoryBackend();
  let journal = Journal.create({ backend, writerKey: keys.writer, packages: available }, initial[0]!.committed!, [initial[1]!.committed!]);
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
  journal = Journal.open({ backend, writerKey: successorKey, packages: available });
  positions.successor = effective(act(journal, 'alice', K.grant, { principal: people.bob, capabilities: [CAP.disclose] }));
  assert.equal(journal.ordering.writer, successor);
  const expected = { genesis: journal.context.genesisId, initialWriter: people.writer, frontier: journal.context.head };
  return { journal, positions, expected, path };
}
function withoutBody(proof: PublicProof, position: number): PublicProof {
  const changed = structuredClone(proof);
  delete changed.positions[position]!.committed;
  return changed;
}

for (const storage of ['memory', 'sqlite'] as const) test('O4 public proof reconstructs signed Sale facts and grants across handover on ' + storage, t => {
  const fixture = source(storage), { journal, positions, expected } = fixture;
  t.after(() => journal.close());
  const proof = publicProof(journal);
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
    try { assert.deepEqual(publicProof(reopened), proof); } finally { reopened.close(); }
  }
});

test('O4 source pins distinguish genesis, initial writer and requested frontier', t => {
  const { journal, expected, positions } = source(); t.after(() => journal.close());
  const proof = publicProof(journal);
  assert.throws(() => verifyPublicProof(proof, { ...expected, genesis: 'sha256:' + 'f'.repeat(64) }, available), /source|prefix|genesis/);
  assert.throws(() => verifyPublicProof(proof, { ...expected, initialWriter: people.carol }, available), /source|writer/);
  assert.throws(() => verifyPublicProof(proof, { ...expected, frontier: expected.frontier - 1 }, available), /source|prefix/);
  const earlier = publicProof(journal, positions.accept);
  assert.equal(verifyPublicProof(earlier, { ...expected, frontier: positions.accept }, available).interpreted.frontier, positions.accept);
  assert.throws(() => verifyPublicProof(earlier, expected, available), /source|prefix/);
  for (const invalid of [-1, 0.5, Infinity, journal.context.head + 1]) assert.throws(() => publicProof(journal, invalid), /frontier/);
});

test('O4 public proof rejects malformed, tampered and incomplete authenticated prefixes', t => {
  const { journal, expected, positions } = source(); t.after(() => journal.close());
  const proof = publicProof(journal);
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
  const proof = publicProof(journal);
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
  const proof = publicProof(journal);
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
  assert.throws(() => publicProof(journal), /private field amount/);
  for (const field of ['amount', 'acceptedAmount', 'counter', 'terms', 'offer_terms']) {
    assert.throws(() => assertPublicData({ nested: [{ [field]: 'private' }] }), /private field/);
  }
});

test('O4 public proof rejects private data attached outside its declared shape', t => {
  const { journal, expected } = source(); t.after(() => journal.close());
  const proof = publicProof(journal);
  for (const extra of [{ amount: 991 }, { metadata: { acceptedAmount: 991 } }, { extra: journal.context.entries[7]!.committed }]) {
    const changed = { ...proof, ...extra };
    assert.throws(() => verifyPublicProof(changed, expected, available), /private|unexpected|shape|field/);
  }
});

test('O4 public proof requires semantic packages and disclosed attachment bodies', t => {
  const { journal, expected, positions } = source(); t.after(() => journal.close());
  const proof = publicProof(journal);
  assert.throws(() => verifyPublicProof(proof, expected, {}), /semantic|binding/);
  assert.throws(() => verifyPublicProof(proof, expected, packages), /semantic|binding/);
  assert.throws(() => verifyPublicProof(withoutBody(proof, positions.attach!), expected, available), /semantic|binding|missing|public/);
});

for (const kind of ['grant', 'revoke'] as const) test('O4 public proof cannot hide an authenticated ' + kind + ' body as a private position', t => {
  const { journal, expected, positions } = source(); t.after(() => journal.close());
  const proof = publicProof(journal);
  const changed = withoutBody(proof, positions[kind]!);
  assert.throws(() => {
    const result = verifyPublicProof(changed, expected, available);
    t.diagnostic(JSON.stringify({ omitted: kind, closeCapability: holdsNow(result.interpreted.state, people.bob, CAP.close) }));
  }, /semantic|binding|missing|public|grant|revoke/);
});

test('O4 public proof cannot omit a withdrawal to turn a refused acceptance into a decision', t => {
  const { journal, expected, positions } = source('memory', true); t.after(() => journal.close());
  const proof = publicProof(journal);
  const verified = verifyPublicProof(proof, expected, available);
  assert.equal(verified.interpreted.outcomes[positions.accept!]!.effective, false);
  assert.equal((verified.interpreted.state.models.sale as unknown as SaleState).accepted, null);
  assert.throws(() => {
    const result = verifyPublicProof(withoutBody(proof, positions.withdraw!), expected, available);
    t.diagnostic(JSON.stringify({ omitted: 'withdraw', effectiveAcceptance: result.interpreted.outcomes[positions.accept!]!.effective, accepted: (result.interpreted.state.models.sale as unknown as SaleState).accepted }));
  }, /semantic|binding|missing|public|withdraw/);
});
