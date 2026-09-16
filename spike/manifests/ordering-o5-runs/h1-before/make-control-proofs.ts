// Hand-declared O5 traces. Only the agreed codec constructs their signatures.
// Do not import the append service or either control transition algorithm.
import { createPrivateKey, type KeyObject } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { ZERO_HASH, type Json } from '../../src/canon.ts';
import { canonicalize, envelopeBytes, envelopeId, headerHash, principalOf, signEvent, signHeader } from '../../src/codec.ts';
import { SYSTEM_PREFIX, type EventBody, type Header } from '../../src/types.ts';
import type { ControlProof } from '../../src/control-verifier.ts';

const key = (n: number) => createPrivateKey({ key: Buffer.from('302e020100300506032b657004220420' + n.toString(16).padStart(2, '0').repeat(32), 'hex'), format: 'der', type: 'pkcs8' });
const old = key(1), control = key(2), next = key(3), third = key(4), applicant = key(5);
const id = principalOf;
const seq = SYSTEM_PREFIX + 'seq.';
let nonce = 0;
function event(kind: string, payload: Json, actor: KeyObject, genesis?: string): EventBody {
  return { kind, payload, actor: id(actor), nonce: (++nonce).toString(16).padStart(32, '0'), ...(genesis ? { genesis, action_id: 'o5:' + nonce, ...(!kind.startsWith(SYSTEM_PREFIX) ? { expected_binding: ZERO_HASH } : {}) } : {}) };
}
function origin(profile = 'dap.fixture.single-writer/2', ctl = control): ControlProof {
  const e = signEvent(event(SYSTEM_PREFIX + 'genesis', { sequencing: { profile, writer: id(old), ...(profile === 'dap.fixture.single-writer/2' ? { control: id(ctl) } : {}) } }, applicant), applicant);
  const genesis = envelopeId(e);
  return { pinnedGenesis: genesis, genesis: { header: signHeader({ genesis, position: 0, prev: ZERO_HASH, commitment: genesis }, old), committed: envelopeBytes(e) }, entries: [] };
}
function last(p: ControlProof): Header { return p.entries.at(-1)?.header ?? p.genesis.header; }
function append(p: ControlProof, kind: string, payload: Json, actor = control, signer = old, hidden = false, bodyOverride: Partial<EventBody> = {}): ControlProof {
  const q = structuredClone(p);
  const body = { ...event(kind, payload, actor, q.pinnedGenesis), ...bodyOverride };
  const envelope = signEvent(body, actor);
  const h = signHeader({ genesis: q.pinnedGenesis, position: q.entries.length + 1, prev: headerHash(last(q)), commitment: envelopeId(envelope) }, signer);
  q.entries.push({ header: h, ...(hidden ? {} : { committed: envelopeBytes(envelope) }) });
  return q;
}
function opaque(p: ControlProof, signer = old, tag = 'private'): ControlProof {
  return append(p, 'private.example.' + tag, { secret: 'not retained in proof' }, applicant, signer, true);
}
function seal(p: ControlProof, epoch = 0, actor = control, signer = old, predecessor = last(p).commitment) {
  return append(p, seq + 'seal', { epoch, predecessor }, actor, signer);
}
function assign(p: ControlProof, writer = next, epoch = 1, actor = control, signer = old, predecessor = last(p).commitment) {
  return append(p, seq + 'assign', { epoch, predecessor, writer: id(writer) }, actor, signer);
}
function headerChange(p: ControlProof, change: Partial<Header>, signer = old): ControlProof {
  const q = structuredClone(p), item = q.entries.at(-1)!;
  item.header = signHeader({ ...item.header, ...change }, signer); return q;
}
const proofs: Array<{ name: string; proof: ControlProof; expected: { accept: boolean; code?: string; epoch?: number; writer?: string; sealed?: boolean } }> = [];
function pass(name: string, proof: ControlProof, epoch = 0, writer = old, sealed = false) { proofs.push({ name, proof, expected: { accept: true, epoch, writer: id(writer), sealed } }); }
function reject(name: string, proof: ControlProof, code: string) { proofs.push({ name, proof, expected: { accept: false, code } }); }
const base = origin();
const normal = opaque(base);
const requested = append(normal, seq + 'request', { epoch: 99, writer: id(third) }, applicant);
const sealed = seal(requested);
const assigned = assign(sealed);
const complete = opaque(assigned, next);
pass('genesis-only', base);
pass('ordinary-payload-unavailable', normal);
pass('two-client-nominations-have-no-authority', append(requested, seq + 'request', { writer: id(next) }, third));
pass('interrupted-after-seal', sealed, 0, old, true);
pass('valid-handover', complete, 1, next);
const twice = opaque(assign(seal(complete, 1, control, next), third, 2, control, next), third);
pass('two-handovers', twice, 2, third);
const fixed = origin('dap.fixture.single-writer/1');
pass('v1-fixed-writer', opaque(fixed));
pass('v1-request-does-not-assign', append(fixed, seq + 'request', { writer: id(next) }, applicant));
reject('v1-seal-cannot-change-profile', seal(fixed), 'fixed_writer_profile');
reject('genesis-control-is-writer', origin('dap.fixture.single-writer/2', old), 'control_is_writer');
reject('unsupported-profile', origin('invented.profile/3'), 'unsupported_profile');
reject('wrong-genesis-pin', { ...base, pinnedGenesis: ZERO_HASH }, 'wrong_genesis_pin');
reject('assign-without-seal', assign(normal), 'assign_requires_seal');
reject('request-does-not-authorize-successor', opaque(requested, next), 'invalid sequencer signature');
reject('retired-writer-continuation', opaque(assigned, old), 'invalid sequencer signature');
reject('successor-cannot-sign-assignment', assign(sealed, next, 1, control, next), 'invalid sequencer signature');
reject('writer-is-not-seal-authority', seal(normal, 0, old), 'wrong_control_actor');
reject('stranger-is-not-seal-authority', seal(normal, 0, applicant), 'wrong_control_actor');
reject('writer-is-not-assign-authority', assign(sealed, next, 1, old), 'wrong_control_actor');
reject('successor-is-not-assign-authority', assign(sealed, next, 1, next), 'wrong_control_actor');
reject('seal-predecessor-is-not-header-hash', seal(normal, 0, control, old, headerHash(last(normal))), 'wrong_predecessor_commitment');
reject('assign-predecessor-is-not-header-hash', assign(sealed, next, 1, control, old, headerHash(last(sealed))), 'wrong_predecessor_commitment');
reject('stale-assign-head', assign(sealed, next, 1, control, old, last(normal).commitment), 'wrong_predecessor_commitment');
reject('skipped-seal-epoch', seal(normal, 1), 'wrong_seal_epoch');
reject('skipped-assign-epoch', assign(sealed, next, 2), 'wrong_assign_epoch');
reject('negative-epoch', seal(normal, -1), 'invalid_epoch');
reject('fractional-epoch', assign(sealed, next, 1.5), 'invalid_epoch');
reject('ordinary-after-seal', opaque(sealed), 'sealed_requires_assign');
reject('request-after-seal', append(sealed, seq + 'request', {}, applicant), 'sealed_requires_assign');
reject('seal-after-seal', seal(sealed), 'sealed_requires_assign');
reject('second-competing-assignment', assign(assigned, third, 2, control, next), 'assign_requires_seal');
reject('retired-key-cannot-be-revived', assign(seal(complete, 1, control, next), old, 2, control, next), 'writer_reuse');
reject('control-cannot-become-writer', assign(sealed, control), 'control_is_writer');
reject('unknown-control-kind', append(normal, seq + 'reset', { writer: id(next) }), 'unknown_control_kind');
reject('extra-control-payload-field', append(normal, seq + 'seal', { epoch: 0, predecessor: last(normal).commitment, control: id(next) }), 'control_payload_shape');
reject('missing-control-payload-field', append(normal, seq + 'seal', { epoch: 0 }), 'control_payload_shape');
reject('application-opening-is-not-accepted', append(normal, 'private.example.offer', { secret: 'application payload' }, applicant), 'non_control_opening');
reject('wrong-prev-header-hash', headerChange(seal(normal), { prev: last(normal).commitment }), 'wrong prev');
const skipped = structuredClone(complete); skipped.entries.splice(0, 1); reject('skipped-position', skipped, 'wrong position');
const repeated = structuredClone(normal); repeated.entries.push(structuredClone(repeated.entries[0]!)); reject('receipt-retry-is-not-a-second-position', repeated, 'wrong position');
reject('wrong-body-destination', append(normal, seq + 'request', {}, applicant, old, false, { genesis: ZERO_HASH }), 'wrong genesis');
const forged = seal(normal); const item = forged.entries.at(-1)!;
const envelope = JSON.parse(item.committed!); envelope.sig = 'A'.repeat(86);
item.committed = canonicalize(envelope);
item.header = signHeader({ ...item.header, commitment: envelopeId(envelope) }, old);
reject('forged-actor-signature', forged, 'invalid actor signature');
const forgedHeader = structuredClone(normal); forgedHeader.entries[0]!.header.seq_sig = 'A'.repeat(86);
reject('forged-writer-signature', forgedHeader, 'invalid sequencer signature');
const omittedAssign = structuredClone(complete); delete omittedAssign.entries[3]!.committed;
reject('missing-assign-opening-detected-after-seal', omittedAssign, 'sealed_requires_assign');
const omittedBoth = structuredClone(complete); delete omittedBoth.entries[2]!.committed; delete omittedBoth.entries[3]!.committed;
reject('missing-controls-detected-at-successor-signature', omittedBoth, 'invalid sequencer signature');
// A dishonest server conceals the seal's kind and the trusted writer continues.
// Same signed seal header; its hidden opening cannot be distinguished from an app.
const matchedSeal = seal(normal);
const matchedSuffix = opaque(matchedSeal);
reject('opening-exposes-same-sealed-suffix', matchedSuffix, 'sealed_requires_assign');
const matchedHidden = structuredClone(matchedSuffix); delete matchedHidden.entries[1]!.committed;
pass('LIMIT-hidden-seal-and-old-writer-suffix', matchedHidden);
const forkA = opaque(normal, old, 'a'), forkB = opaque(normal, old, 'b');
const assignmentA = assign(sealed, next), assignmentB = assign(sealed, third);
writeFileSync(new URL('control-proofs.json', import.meta.url), JSON.stringify({
  schema: 1, description: 'O5 proof inputs contain genesis, control envelopes, and other headers only. Expected decisions were declared before running the verifier.',
  proofs,
  comparisons: [
    { name: 'ordinary-signed-head-fork', left: forkA, right: forkB, conflictAt: 2 },
    { name: 'competing-signed-assignments', left: assignmentA, right: assignmentB, conflictAt: 4 },
    { name: 'same-history', left: complete, right: complete, commonLength: 6 },
    { name: 'one-history-is-prefix', left: sealed, right: complete, commonLength: 4 },
  ],
}, null, 2) + '\n');
