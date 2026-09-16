// O4 public evidence. Selecting an export is a source-authorized operation;
// this module authenticates its bytes and reconstructs semantic/grant evidence.
// It never decides whether a release was effective or imports expected outcomes.
import { snapshot } from './append.ts';
import { canonicalize, headerHash, verifyEnvelope } from './codec.ts';
import { Journal, verifyJournalView } from './journal.ts';
import { K } from './foundation.ts';
import { interpretView, type Interpreted } from './interpret.ts';
import type { ViewEntry } from './context.ts';
import type { PackageDescriptor } from './descriptor.ts';
import type { EventBody, Header } from './types.ts';

export interface PublicProof {
  genesis: string;
  initialWriter: string;
  frontier: number;
  positions: { header: Header; committed?: string }[];
}
const PUBLIC = new Set<string>([
  K.genesis, K.accept_invite, K.grant, K.revoke, K.attach, K.close,
  K.scope_release, K.scope_activate, K.admit, K.seq_request, K.seq_seal, K.seq_assign,
  'com.example.sale.listing', 'com.example.sale.offer', 'com.example.sale.withdraw',
  'com.example.sale.accept', 'com.example.sale.close',
]);
const PRIVATE_FIELDS = new Set(['amount', 'acceptedAmount', 'counter', 'terms', 'offer_terms']);
export function assertPublicData(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_FIELDS.has(key)) throw new Error('scope proof: private field ' + key);
    if (key === 'committed' && typeof child === 'string') {
      const envelope = verifyEnvelope(child);
      assertPublicBody(envelope.body);
    } else assertPublicData(child);
  }
}
function isPublic(kind: string): boolean { return PUBLIC.has(kind) || kind.startsWith('com.example.scope.'); }
function assertPublicBody(event: EventBody): void {
  if (!isPublic(event.kind)) throw new Error('scope proof: private or undeclared body kind');
  // An accepted invitation deliberately publishes its issuance proof on the spine.
  // Recursion rejects private extra fields even inside that embedded body.
  assertPublicData(event.payload);
}
export function publicProof(journal: Journal, frontier = journal.context.head): PublicProof {
  if (!Number.isSafeInteger(frontier) || frontier < 0 || frontier > journal.context.head) throw new Error('scope proof: invalid frontier');
  const entries = journal.context.entries.slice(0, frontier + 1);
  const positions = entries.map(entry => {
    if (!isPublic(entry.event.kind)) return { header: entry.header };
    assertPublicBody(entry.event);
    if (!entry.committed) throw new Error('scope proof: unsigned entry');
    return { header: entry.header, committed: entry.committed };
  });
  return snapshot({ genesis: journal.context.genesisId, initialWriter: journal.ordering.initialWriter, frontier, positions });
}
export function verifyPublicProof(proof: PublicProof, expected: { genesis: string; initialWriter: string; frontier?: number }, packages: Record<string, PackageDescriptor>): { view: ViewEntry[]; interpreted: Interpreted } {
  if (proof.genesis !== expected.genesis || proof.initialWriter !== expected.initialWriter || (expected.frontier !== undefined && proof.frontier !== expected.frontier)) throw new Error('scope proof: wrong source or prefix');
  if (!Number.isSafeInteger(proof.frontier) || proof.frontier < 0 || !Array.isArray(proof.positions) || proof.positions.length !== proof.frontier + 1) throw new Error('scope proof: incomplete prefix');
  const view: ViewEntry[] = proof.positions.map((position, i) => {
    if (!position || Object.keys(position).some(k => k !== 'header' && k !== 'committed')) throw new Error('scope proof: unexpected position field');
    const base = { position: i, header: position.header, headerHash: headerHash(position.header) };
    if (position.committed === undefined) return { ...base, via: 'hidden' };
    const envelope = verifyEnvelope(position.committed);
    assertPublicBody(envelope.body);
    return { ...base, event: envelope.body, committed: position.committed, via: 'audience' };
  });
  verifyJournalView(view, { genesis: expected.genesis, writer: expected.initialWriter });
  const interpreted = interpretView('scope-evidence-reader', view, proof.frontier, packages);
  if (interpreted.kind !== 'interpreted') throw new Error('scope proof: missing semantic or binding evidence at ' + interpreted.at);
  return { view, interpreted };
}
export function publicProofBytes(proof: PublicProof): string { assertPublicData(proof); return canonicalize(proof); }
