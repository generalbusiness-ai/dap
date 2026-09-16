// O4 public evidence. Selecting an export is a source-authorized operation;
// this module authenticates its bytes and reconstructs semantic/grant evidence.
// It never decides whether a release was effective or imports expected outcomes.
import { createHash, sign, verify, type KeyObject } from 'node:crypto';
import { snapshot } from './append.ts';
import { canonicalize, headerHash, verifyEnvelope, publicKeyOf, principalOf } from './codec.ts';
import { Journal, verifyJournalView } from './journal.ts';
import { K } from './foundation.ts';
import { SCOPE_KINDS } from './scope-profile.ts';
import { initialOrdering, advanceOrdering } from './ordering.ts';
import { interpretView, type Interpreted } from './interpret.ts';
import type { ViewEntry } from './context.ts';
import { visibleBinding, type PackageDescriptor } from './descriptor.ts';
import { SYSTEM_PREFIX, type EventBody, type Header } from './types.ts';

export class ScopeProofError extends Error {}

export interface CompletenessCertificate {
  body: { type: 'dap.fixture.public-proof-completeness/1'; rule: string; genesis: string; frontier: number; proof_hash: string };
  signer: string;
  sig: string;
}
export interface PublicProof {
  genesis: string;
  initialWriter: string;
  frontier: number;
  positions: { header: Header; committed?: string }[];
  certificate: CompletenessCertificate;
}
const PUBLIC = new Set<string>([
  K.genesis, K.accept_invite, K.grant, K.revoke, K.attach, K.close,
  K.scope_release, K.scope_activate, K.admit, K.seq_request, K.seq_seal, K.seq_assign,
  'com.example.sale.listing', 'com.example.sale.offer', 'com.example.sale.withdraw',
  'com.example.sale.accept', 'com.example.sale.close', ...Object.values(SCOPE_KINDS),
]);
const PRIVATE_FIELDS = new Set(['amount', 'acceptedAmount', 'counter', 'terms', 'offer_terms']);
export const PUBLIC_PROOF_RULE = {
  type: 'dap.fixture.scope-public-openings/3', kinds: [...PUBLIC].sort(), requiredAudience: ['members', 'spine'],
  ineffectiveActorOnly: {
    body: 'hidden', known: true, effective: false,
    indeterminateReasons: ['model_unavailable', 'not_in_v1', 'package_unavailable', 'scope_runtime_required', 'unhandled'],
    indeterminateReasonPrefixes: ['audience_error:', 'fold_error:'],
  },
  unboundActorOnly: {
    body: 'hidden', application: true, binding: 'absent-before-entry',
    known: false, authorized: false, effective: false, reason: 'unhandled', perModel: 'absent',
  },
  otherPositions: 'hidden', bannedFields: [...PRIVATE_FIELDS].sort(), excludedKinds: [K.disclose, K.observe].sort(),
} as const;
export const PUBLIC_PROOF_RULE_ID = digest(PUBLIC_PROOF_RULE);
export function assertPublicData(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_FIELDS.has(key)) throw new ScopeProofError('scope proof: private field ' + key);
    if (key === 'committed' && typeof child === 'string') {
      const envelope = wireInput(() => verifyEnvelope(child));
      assertPublicBody(envelope.body);
    } else assertPublicData(child);
  }
}
function isPublic(kind: string): boolean { return PUBLIC.has(kind); }
function assertPublicBody(event: EventBody): void {
  if (!isPublic(event.kind)) throw new ScopeProofError('scope proof: private or undeclared body kind');
  // An accepted invitation deliberately publishes its issuance proof on the spine.
  // Recursion rejects private extra fields even inside that embedded body.
  assertPublicData(event.payload);
}
export function publicProof(journal: Journal, frontier = journal.context.head, writerKey?: KeyObject): PublicProof {
  if (!writerKey) throw new ScopeProofError('scope proof: completeness signer required');
  if (!Number.isSafeInteger(frontier) || frontier < 0 || frontier > journal.context.head) throw new ScopeProofError('scope proof: invalid frontier');
  const entries = journal.context.entries.slice(0, frontier + 1);
  const state = journal.context.state;
  const positions = entries.map(entry => {
    if (!isPublic(entry.event.kind)) return { header: entry.header };
    const audience = state.audiences[entry.position];
    // The serving writer already attests completeness. Its classification of
    // a failed actor-only attempt is trusted too; an opaque header cannot
    // establish this. Missing/indeterminate verdicts do not permit omission.
    if (audience?.kind === 'named' && audience.principals.length === 1 && audience.principals[0] === entry.event.actor) {
      const verdict = state.verdicts[entry.position];
      // Effective attachment history, not the caller's expected_binding or
      // registry availability, establishes absence at this event's position.
      // A later attachment cannot retroactively bind an earlier attempt.
      if (!entry.event.kind.startsWith(SYSTEM_PREFIX) &&
          verdict?.known === false && verdict.authorized === false && verdict.effective === false &&
          verdict.reason === 'unhandled' && verdict.perModel === undefined &&
          (!Object.hasOwn(state.env.kinds, entry.event.kind) ||
            !visibleBinding(state.env, entry.event.kind, position => position < entry.position))) {
        return { header: entry.header };
      }
      const reasons = [verdict?.reason, ...Object.values(verdict?.perModel ?? {}).map(v => v.reason)];
      const rule = PUBLIC_PROOF_RULE.ineffectiveActorOnly;
      const indeterminate = reasons.some(reason => reason !== undefined && (
        rule.indeterminateReasons.some(value => value === reason) || rule.indeterminateReasonPrefixes.some(prefix => reason.startsWith(prefix))
      ));
      if (verdict?.known === true && verdict.effective === false && !indeterminate) return { header: entry.header };
    }
    if (!audience || !['spine', 'members'].includes(audience.kind)) throw new ScopeProofError('scope proof: authority body has narrower audience');
    assertPublicBody(entry.event);
    if (!entry.committed) throw new ScopeProofError('scope proof: unsigned entry');
    return { header: entry.header, committed: entry.committed };
  });
  const unsigned = { genesis: journal.context.genesisId, initialWriter: journal.ordering.initialWriter, frontier, positions };
  let ordering = initialOrdering(entries[0]!.event);
  for (const entry of entries.slice(1, -1)) ordering = advanceOrdering(ordering, entry);
  if (principalOf(writerKey) !== ordering.writer) throw new ScopeProofError('scope proof: wrong completeness signer');
  const body: CompletenessCertificate['body'] = { type: 'dap.fixture.public-proof-completeness/1', rule: PUBLIC_PROOF_RULE_ID, genesis: unsigned.genesis, frontier, proof_hash: digest(unsigned) };
  const certificate = { body, signer: ordering.writer, sig: sign(null, Buffer.from(canonicalize(body)), writerKey).toString('base64url') };
  return snapshot({ ...unsigned, certificate });
}
export function verifyPublicProof(proof: PublicProof, expected: { genesis: string; initialWriter: string; frontier?: number }, packages: Record<string, PackageDescriptor>): { view: ViewEntry[]; interpreted: Interpreted } {
  const view = wireInput(() => {
    if (!proof || Object.keys(proof).sort().join(',') !== 'certificate,frontier,genesis,initialWriter,positions') throw new ScopeProofError('scope proof: unexpected packet fields');
    if (proof.genesis !== expected.genesis || proof.initialWriter !== expected.initialWriter || (expected.frontier !== undefined && proof.frontier !== expected.frontier)) throw new ScopeProofError('scope proof: wrong source or prefix');
    if (!Number.isSafeInteger(proof.frontier) || proof.frontier < 0 || !Array.isArray(proof.positions) || proof.positions.length !== proof.frontier + 1) throw new ScopeProofError('scope proof: incomplete prefix');
    assertPublicData(proof);
    const view: ViewEntry[] = proof.positions.map((position, i) => {
      if (!position || Object.keys(position).some(k => k !== 'header' && k !== 'committed')) throw new ScopeProofError('scope proof: unexpected position field');
      const base = { position: i, header: position.header, headerHash: headerHash(position.header) };
      if (position.committed === undefined) return { ...base, via: 'hidden' };
      const envelope = verifyEnvelope(position.committed);
      assertPublicBody(envelope.body);
      return { ...base, event: envelope.body, committed: position.committed, via: 'disclosure' };
    });
    verifyJournalView(view, { genesis: expected.genesis, writer: expected.initialWriter });
    let ordering = initialOrdering(view[0]!.event!);
    for (const entry of view.slice(1, -1)) if (entry.event) ordering = advanceOrdering(ordering, { position: entry.position, header: entry.header, headerHash: entry.headerHash, id: entry.header.commitment, event: entry.event, committed: entry.committed });
    const { certificate, ...unsigned } = proof;
    const body: CompletenessCertificate['body'] = { type: 'dap.fixture.public-proof-completeness/1', rule: PUBLIC_PROOF_RULE_ID, genesis: proof.genesis, frontier: proof.frontier, proof_hash: digest(unsigned) };
    if (!certificate || Object.keys(certificate).sort().join(',') !== 'body,sig,signer' || certificate.signer !== ordering.writer || canonicalize(certificate.body) !== canonicalize(body) || typeof certificate.sig !== 'string') throw new ScopeProofError('scope proof: completeness certificate mismatch');
    const signature = Buffer.from(certificate.sig, 'base64url');
    if (signature.length !== 64 || signature.toString('base64url') !== certificate.sig || !verify(null, Buffer.from(canonicalize(body)), publicKeyOf(ordering.writer), signature)) throw new ScopeProofError('scope proof: invalid completeness signature');
    return view;
  });
  const interpreted = interpretView('scope-evidence-reader', view, proof.frontier, packages, proof.frontier, { throwOnError: true });
  if (interpreted.kind !== 'interpreted') throw new ScopeProofError('scope proof: missing semantic or binding evidence at ' + interpreted.at);
  return { view, interpreted };
}
export function publicProofBytes(proof: PublicProof): string { assertPublicData(proof); return canonicalize(proof); }

function digest(value: unknown): string { return 'sha256:' + createHash('sha256').update(canonicalize(value)).digest('hex'); }

// These are declared rejections from the side-effect-free wire routines above.
// No package handler, registry lookup, storage call or semantic replay occurs
// within this boundary. Unexpected errors retain their identity and are thrown.
const WIRE_REJECTIONS = new Set([
  'Journal: expected genesis', 'Journal: wrong writer (initial assignment)',
  'Journal: invalid origins', 'Journal: unsupported profile', 'Journal: duplicate commitment',
  'ordering: malformed control payload', 'ordering: invalid v3 sequencing fields',
  'ordering: control key must differ from writer',
  ...['genesis must be readable','non-dense positions','wrong header hash','duplicate commitment',
    'missing actor proof','envelope bounds','body disagrees with signed bytes',
    'unadopted origin','hidden position contains an envelope',
    'missing assignment opening after seal','retired_writer','handover_not_enabled',
    'writer_sealed','wrong_control_predecessor','wrong_ordering_epoch',
    'wrong_seal_authority','assignment_without_seal','wrong_control_authority',
    'control_key_is_writer','writer_already_used','malformed_control',
  ].map(reason => 'Journal view: ' + reason),
]);
function wireInput<T>(validate: () => T): T {
  try { return validate(); }
  catch (error) {
    if (error instanceof TypeError && error.message.startsWith('codec: ') ||
        error instanceof Error && WIRE_REJECTIONS.has(error.message)) {
      throw new ScopeProofError(error.message);
    }
    throw error;
  }
}
