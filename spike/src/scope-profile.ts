// O4 is an explicitly selected runtime extension, not a change to legacy genesis.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { canonicalize, publicKeyOf } from './codec.ts';
import type { EventBody } from './types.ts';
export const SCOPE_PROFILE = 'dap.fixture.scope/1';
export const SCOPE_NS = 'com.example.scope.';
export const SCOPE_KINDS = {
  result: SCOPE_NS + 'result', exercise: SCOPE_NS + 'exercise',
  importExport: SCOPE_NS + 'import-export', recover: SCOPE_NS + 'recover',
} as const;
export const TRANSFORM = 'copy-union-reject-duplicates-and-buyer-mismatch';
export const JOIN_POLICY_ID = scopeId({ profile: SCOPE_PROFILE, transformation: TRANSFORM, requiredRights: ['R_fulfil', 'R_deliver'], buyerMatchesWinner: true, dormantUntilAllReleases: true });
export function scopeId(value: unknown): string { return 'sha256:' + createHash('sha256').update(canonicalize(value)).digest('hex'); }
let implementation: string | undefined;
export function scopeImplementationId(): string {
  if (implementation) return implementation;
  const files = ['scope-profile.ts', 'scope.ts', 'scope-proof.ts', 'scope-package.ts', 'foundation.ts', 'interpret.ts', 'journal.ts', 'ordering.ts', 'codec.ts'];
  return implementation = scopeId({ profile: SCOPE_PROFILE, sources: files.map(file => ({ file, id: scopeId(readFileSync(new URL(file, import.meta.url), 'utf8')) })) });
}
export interface ScopeSetup {
  profile: typeof SCOPE_PROFILE;
  implementation: string;
  role: 'sale' | 'inspection' | 'delivery' | 'fulfilment';
  founders: string[];
  owners: Record<string, string>;
  facts?: { buyer: string; delivery_slot: number };
  mandate?: { source: string; prefix: number; offer: string; inspector: string };
}
export class ScopeProfileError extends Error {
  readonly code = 'invalid_genesis';
  constructor(message: string) { super('scope profile: ' + message); this.name = 'ScopeProfileError'; }
}
export function scopeSetup(event: EventBody): ScopeSetup | undefined {
  const raw = (event.payload as { scope?: unknown } | null)?.scope;
  if (raw === undefined) return undefined;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ScopeProfileError('malformed setup');
  const value = raw as ScopeSetup;
  if (Object.keys(value).some(k => !['profile', 'implementation', 'role', 'founders', 'owners', 'facts', 'mandate'].includes(k))) throw new ScopeProfileError('unknown setup field');
  if (value.profile !== SCOPE_PROFILE || value.implementation !== scopeImplementationId()) throw new ScopeProfileError('unsupported implementation');
  if (!['sale', 'inspection', 'delivery', 'fulfilment'].includes(value.role)) throw new ScopeProfileError('unknown role');
  if (!Array.isArray(value.founders) || !value.founders.length || value.founders[0] !== event.actor || new Set(value.founders).size !== value.founders.length) throw new ScopeProfileError('invalid founders');
  for (const p of value.founders) publicKeyOf(p);
  if (!value.owners || typeof value.owners !== 'object' || Array.isArray(value.owners)) throw new ScopeProfileError('invalid owners');
  for (const [right, owner] of Object.entries(value.owners)) {
    if (!['R_sell', 'R_fulfil', 'R_deliver'].includes(right) || !value.founders.includes(owner)) throw new ScopeProfileError('invalid owner');
  }
  if (value.role === 'sale' && (Object.keys(value.owners).join(',') !== 'R_sell' || value.founders.length !== 1)) throw new ScopeProfileError('sale preserves original founding participation');
  if (value.role === 'inspection' && Object.keys(value.owners).length) throw new ScopeProfileError('inspection owns no exclusive right');
  if (value.role === 'delivery') {
    if (Object.keys(value.owners).join(',') !== 'R_deliver' || !value.facts || Object.keys(value.facts).sort().join(',') !== 'buyer,delivery_slot' || !Number.isSafeInteger(value.facts.delivery_slot) || value.facts.delivery_slot < 0) throw new ScopeProfileError('invalid delivery facts');
    publicKeyOf(value.facts.buyer);
  }
  if (value.role !== 'delivery' && value.facts !== undefined) throw new ScopeProfileError('unexpected facts');
  if (value.role !== 'inspection' && value.mandate !== undefined) throw new ScopeProfileError('unexpected mandate');
  if (value.role === 'inspection') {
    const m = value.mandate;
    if (!m || Object.keys(m).sort().join(',') !== 'inspector,offer,prefix,source' || !/^sha256:[0-9a-f]{64}$/.test(m.source) || !Number.isSafeInteger(m.prefix) || m.prefix < 0 || typeof m.offer !== 'string' || !m.offer || !value.founders.includes(m.inspector)) throw new ScopeProfileError('invalid inspection mandate');
  }
  if (value.role === 'fulfilment' && Object.keys(value.owners).sort().join(',') !== 'R_deliver,R_fulfil') throw new ScopeProfileError('invalid dormant right declarations');
  return value;
}
