// Explicit fork/fault fixtures. These copy a signed prefix and create an
// alternate history; they never append to the healthy source journals.
import { sign } from 'node:crypto';
import { MemoryBackend, snapshot } from '../src/append.ts';
import { canonicalize, envelopeBytes, headerHash, principalOf, signEvent } from '../src/codec.ts';
import { K } from '../src/foundation.ts';
import { ScopeJournal, type ReleaseProof, type SourceExport } from '../src/scope.ts';
import { PUBLIC_PROOF_RULE, PUBLIC_PROOF_RULE_ID, type PublicProof } from '../src/scope-proof.ts';
import { scopeId } from '../src/scope-profile.ts';
import { LifecycleWorld, keys, packages, principals, type Person } from './ordering-lifecycle-runner.ts';

export function forkSource(world: LifecycleWorld, name: 'S' | 'D', frontier: number): ScopeJournal {
  const source = world.contexts[name]!.journal;
  const backend = new MemoryBackend();
  for (const entry of source.context.entries.slice(0, frontier + 1)) {
    const retry = entry.event.action_id ? source.context.backend.retry(entry.event.action_id) : undefined;
    const token = entry.event.kind === K.accept_invite ? (entry.event.payload as { invite: { header: { commitment: string } } }).invite.header.commitment : undefined;
    backend.serialized(() => backend.commit(entry, retry, token));
  }
  return ScopeJournal.open({ backend, writerKey: keys[name === 'S' && frontier >= 22 ? 'W1' : name === 'S' ? 'W0' : 'WD'], packages });
}
/** Deliberately dishonest serving-party fixture: signs the kind-selected
 * projection despite a narrow audience. The destination must still check
 * all actor/grant/effect evidence. Not an alternative production API. */
export function faultyWriterProof(source: ScopeJournal, writer: Person): PublicProof {
  const positions = source.journal.context.entries.map(entry => ({ header: entry.header,
    ...(PUBLIC_PROOF_RULE.kinds.includes(entry.event.kind) ? { committed: entry.committed! } : {}) }));
  const unsigned = { genesis: source.journal.context.genesisId, initialWriter: source.journal.ordering.initialWriter, frontier: positions.length - 1, positions };
  const body = { type: 'dap.fixture.public-proof-completeness/1' as const, rule: PUBLIC_PROOF_RULE_ID, genesis: unsigned.genesis, frontier: unsigned.frontier, proof_hash: scopeId(unsigned) };
  return snapshot({ ...unsigned, certificate: { body, signer: principals[writer], sig: sign(null, Buffer.from(canonicalize(body)), keys[writer]).toString('base64url') } });
}
export function alternateRelease(world: LifecycleWorld, alias: string): { proof: ReleaseProof; verdict: unknown; producerRefusal?: string } {
  const name = alias.startsWith('D-') ? 'D' : 'S';
  const source = forkSource(world, name, name === 'S' ? 23 : 0);
  try {
    let exported = world.exports[name]!;
    let actor: Person = name === 'S' ? 'alice' : 'kim';
    let right = name === 'S' ? 'R_fulfil' : 'R_deliver';
    let destination = world.destination ? scopeId(world.destination) : '';
    if (alias === 'S-ordered-but-unauthorized') actor = 'bob';
    if (alias === 'S-ordered-but-ineffective') right = 'R_deliver';
    if (alias === 'S-valid-for-F-other') destination = scopeId({ other: world.destination });
    if (alias === 'D-claims-R_fulfil') {
      right = 'R_fulfil'; const { identity, ...base } = exported;
      const changed = { ...base, rights: [{ name: 'R_fulfil' as const, owner: principals.kim }] };
      exported = { ...changed, identity: scopeId(changed) };
    }
    const transition = (world.destination!.body.payload as { transition: { identity: string } }).transition.identity;
    const envelope = signEvent(source.journal.context.intent(principals[actor], K.scope_release, { right, destination, transition, export: exported as never }, { action_id: 'fault:' + alias, nonce: 'f'.repeat(32) }), keys[actor]);
    const result = source.submit(envelopeBytes(envelope), source.journal.context.credentialFor(principals[actor]));
    if ('refused' in result) throw new Error('fault fixture was not sequenced: ' + result.reason);
    let proof: PublicProof; let producerRefusal: string | undefined;
    try { proof = source.proof(); }
    catch (error) { producerRefusal = (error as Error).message; proof = faultyWriterProof(source, name === 'S' ? 'W1' : 'WD'); }
    return { proof: { source: proof, release: result.header.position }, verdict: result.verdict, ...(producerRefusal ? { producerRefusal } : {}) };
  } finally { source.close(); }
}
/** A later, honestly certified extension is distinct valid proof material.
 * The extension is a labeled fixture fork so the healthy source heads stay
 * at their predeclared boundaries. It changes no prefix/release verdict. */
export function laterProof(world: LifecycleWorld, name: 'S' | 'D'): ReleaseProof {
  const source = forkSource(world, name, name === 'S' ? 24 : 1);
  try {
    const actor = name === 'S' ? 'alice' : 'kim';
    // A semantic refusal is safe public evidence: the right already released.
    const original = source.journal.context.entries.at(-1)!.event;
    const envelope = signEvent({ ...original, action_id: 'later-proof:' + name, nonce: 'e'.repeat(32) }, keys[actor]);
    const result = source.submit(envelopeBytes(envelope), source.journal.context.credentialFor(principals[actor]));
    if ('refused' in result || result.verdict?.reason !== 'already_released') throw new Error('later frontier fixture did not preserve release');
    return { source: source.proof(), release: name === 'S' ? 24 : 1 };
  } finally { source.close(); }
}
