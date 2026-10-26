/** G15 only. Canonical record bytes plus the complete carrying entry,
 * including future generations, must fit before the first capture. */
import type { Bounds, Effect, Entry, FactRef, FactUse, KeyId, RulesObservation } from '@generalbusiness/dap-contract';
import { canonicalize, isDigest, isFactRef, isKeyId, isMemberRef, isRecord, memberFits, parseStrict, same, timeMs, utf8 } from '@generalbusiness/dap-bytes';
import { observationBytes, operationOpening, type Opening, type RuleEffect, type RuleGiven, type RuleRequest } from '@generalbusiness/dap-derive';
import { isObjectId } from './reservation.ts';
import { readRulesPolicyObservationV15, requiredChecksV15, type ReservationPolicyInputV15 } from './reservation-v15.ts';
import type { RulesCheckV11 } from './rules-policy-v11.ts';

export interface CertifiedReservationSnapshotV15 {
  observation: RulesObservation;
  input: ReservationPolicyInputV15;
  touched: string[];
  required: readonly RulesCheckV11[];
  tree: string;
  manifest: FactRef;
}
export interface CertifiedGenerationV15 {
  name: string; job: FactRef; passed: boolean;
  proof?: { result: FactRef; key: KeyId; decided: number; configuration: string; checker: RulesCheckV11['checker']; tree: string; proposal: string };
}
export interface CertifiedPublicationStateV15 { policy: CertifiedReservationSnapshotV15; generations: readonly CertifiedGenerationV15[] }
const bytes = (value: unknown): number => utf8(canonicalize(value)).length;
const exact = (value: Record<string, unknown>, names: readonly string[]): boolean => Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const MAX = Number.MAX_SAFE_INTEGER;
const TIME = '9999-12-31T23:59:59.999Z';
const HASH = `sha256:${'f'.repeat(64)}` as const;
// Longest real forms, not guessed per-entry slack. All numbers remain safe
// integers and every identifier has the protocol's maximum encoded width.
const SCOPE = { scope: `sc_${'a'.repeat(52)}`, inc: `in_${'a'.repeat(26)}`, kind: 'destination' } as const;
const FACT: FactRef = { at: SCOPE, seq: MAX, hash: HASH };
const USE: FactUse = { fact: FACT, content: HASH };
const OPERATION = `${MAX}:${MAX}` as const;
const KEY = `key_${'A'.repeat(43)}` as const;
const TEXT128 = '\u0000'.repeat(128); // six canonical bytes for each permitted text byte

/** This decoder checks policy correspondence, not observation authority. The
 * native judge still supplies the authenticated Q12 observation and values. */
export function certifiedReservationSnapshotV15(value: unknown, bounds: Bounds): CertifiedReservationSnapshotV15 | null {
  try {
    if (!isRecord(value) || !exact(value, ['observation', 'input', 'touched', 'required', 'tree', 'manifest'])
      || !isRecord(value['observation']) || !isRecord(value['input']) || !exact(value['input'], ['rules', 'destination', 'extents'])
      || !Array.isArray(value['touched']) || value['touched'].length > 8 || !value['touched'].every(name => typeof name === 'string' && name.length <= 64)
      || !Array.isArray(value['required']) || value['required'].length > 32 || !isObjectId(value['tree']) || !isFactRef(value['manifest'])) return null;
    const observation = value['observation'] as unknown as RulesObservation;
    const input = value['input'] as unknown as ReservationPolicyInputV15;
    const decoded = readRulesPolicyObservationV15(observation, input, observation.at);
    if (!decoded.ok) return null;
    const required = requiredChecksV15(decoded.view.policy, value['touched'] as string[]);
    if (!required.ok || !same(required.checks, value['required']) || required.checks.some(check => !memberFits(check.checker, bounds))) return null;
    return { observation, input, touched: [...value['touched']] as string[], required: required.checks, tree: value['tree'], manifest: value['manifest'] };
  } catch { return null; }
}

function generations(value: unknown, bounds: Bounds): value is readonly CertifiedGenerationV15[] {
  return Array.isArray(value) && value.length <= 32 && value.every(row => {
    if (!isRecord(row) || !['name', 'job', 'passed'].every(name => Object.hasOwn(row, name))
      || Object.keys(row).some(name => !['name', 'job', 'passed', 'proof'].includes(name))
      || typeof row['name'] !== 'string' || row['name'].length > 128 || utf8(row['name']).length > 128
      || !isFactRef(row['job']) || typeof row['passed'] !== 'boolean') return false;
    if (!Object.hasOwn(row, 'proof')) return true;
    const proof = row['proof'];
    return isRecord(proof) && exact(proof, ['result', 'key', 'decided', 'configuration', 'checker', 'tree', 'proposal'])
      && isFactRef(proof['result']) && isKeyId(proof['key']) && Number.isSafeInteger(proof['decided']) && (proof['decided'] as number) >= 0
      && isDigest(proof['configuration']) && isMemberRef(proof['checker']) && memberFits(proof['checker'], bounds)
      && isObjectId(proof['tree']) && isDigest(proof['proposal']);
  }) && new Set(value.map(row => row.name)).size === value.length;
}

const frame = (input: unknown, effects: readonly unknown[], sends: readonly unknown[]) => ({
  v: 1, at: SCOPE, seq: MAX, prev: HASH, time: TIME, clamped: false, epoch: 0,
  input, uses: [USE, USE, USE, USE], prepared: [], effects, sends,
});
const passes = { effect: 'value', item: MAX, slot: 'passes', value: null } as const;
const requestResult = { n: MAX, to: SCOPE, message: { class: 'result', of: { from: FACT, n: MAX }, outcome: 'applied' } };

/** Maximum native envelopes without the passes value. Foreign signed
 * entries are retained separately: only their FactUse records occur here. */
export function certifiedFutureEnvelopeBytesV15(bounds: Bounds): number {
  const fence = frame({ type: 'delivery', from: FACT, n: MAX, decision: 'applied', message: {
    class: 'request', type: 'tell', body: { message: 'check-fence', fields: { operation: FACT, job: FACT, earlier: FACT, name: TEXT128 } },
  } }, [passes], [requestResult]);
  const input = { type: 'outcome', operation: OPERATION, attempt: MAX, owner: 'platform:destination@15', kind: 'check-judge', result: 'confirmed',
    evidence: { basis: 'own-answer', body: { readAt: TIME, current: false, job: FACT, result: FACT } } };
  const openings = [operationOpening(0, { owner: 'platform:destination@15', kind: 'push', attempts: 3, for: MAX }),
    operationOpening(1, { owner: 'platform:destination@15', kind: 'mint', attempts: 3, for: MAX })].flat();
  const update = { n: MAX, to: SCOPE, message: { class: 'request', type: 'relate', body: {
    name: 'publication', item: FACT, state: 'reserved', detail: { operation: FACT, outcome: 'committed', commit: 'f'.repeat(64), tree: 'f'.repeat(64), rules: MAX },
  } } };
  const checked = frame(input, [{ effect: 'attempt', operation: OPERATION, attempt: MAX, result: 'confirmed', selected: false }, passes,
    { effect: 'value', item: MAX, slot: 'checkDeadline', value: null }, ...openings], [update]);
  // The empty observed array supplies its exact property/array syntax;
  // the whole admitted ObservationUse has its own enforced size ceiling.
  const observedSyntax = bytes({ ...input, observed: [] }) - bytes(input);
  return Math.max(bytes(fence) - bytes(null), bytes(checked) - bytes(null) + observedSyntax + observationBytes('key', bounds));
}

export interface CertifiedPublicationBudgetV15 {
  entryBytes: number; recordBytes: number; emptyRecordBytes: number;
  generationsReserveBytes: number; maximumRecordBytes: number; futureEnvelopeBytes: number;
  recordCeiling: number; admitted: boolean;
}
/** Reserve all 32 proof-bearing rows before capture, including non-required
 * names that a later fence can introduce. Code-point and byte bounds differ:
 * the synthetic name uses the maximum possible JSON escaping. */
export function certifiedPublicationBudgetV15(record: CertifiedPublicationStateV15, bounds: Bounds): CertifiedPublicationBudgetV15 {
  const checker = record.policy.required.reduce<RulesCheckV11['checker']>((largest, check) => bytes(check.checker) > bytes(largest) ? check.checker : largest,
    { membership: SCOPE, member: '@a' });
  const row = { name: TEXT128, job: FACT, passed: false, proof: { result: FACT, key: KEY, decided: MAX, configuration: HASH, checker, tree: 'f'.repeat(64), proposal: HASH } };
  const generationsReserveBytes = 32 * (bytes(row) + 1); // one comma per row safely includes the last
  const emptyRecordBytes = bytes({ policy: record.policy, generations: [] });
  const recordBytes = bytes(record), maximumRecordBytes = emptyRecordBytes + generationsReserveBytes;
  const futureEnvelopeBytes = certifiedFutureEnvelopeBytesV15(bounds), recordCeiling = bounds.entryBytes - futureEnvelopeBytes;
  return { entryBytes: bounds.entryBytes, recordBytes, emptyRecordBytes, generationsReserveBytes, maximumRecordBytes, futureEnvelopeBytes, recordCeiling,
    admitted: recordBytes <= recordCeiling && maximumRecordBytes <= recordCeiling };
}

export function certifiedPublicationStateV15(value: unknown, bounds: Bounds): CertifiedPublicationStateV15 | null {
  try {
    if (!isRecord(value) || !exact(value, ['policy', 'generations']) || bytes(value) > bounds.entryBytes) return null;
    const owned = parseStrict(canonicalize(value));
    if (!isRecord(owned)) return null;
    const policy = certifiedReservationSnapshotV15(owned['policy'], bounds);
    if (!policy || !generations(owned['generations'], bounds)) return null;
    const record = { policy, generations: owned['generations'] };
    // A proof must use the exact admitted checker, so future growth is bounded
    // by configured descriptors rather than an unrelated arbitrary handle.
    if (record.generations.some(row => row.proof && !policy.required.some(check => check.name === row.name && same(check.checker, row.proof!.checker)))) return null;
    return certifiedPublicationBudgetV15(record, bounds).admitted ? record : null;
  } catch { return null; }
}

export interface CaptureEnvelopeV15 { effects: readonly RuleEffect[]; opens: readonly Opening[]; sends: readonly RuleRequest[]; uses: readonly FactUse[] }
/** Numeric positions and times have bounded protocol widths. Saturating the
 * shell makes a preview independent of the position of its later request. */
function maximumEnvelope(value: unknown): unknown {
  if (typeof value === 'number') return MAX;
  if (typeof value === 'boolean') return false;
  if (typeof value === 'string' && timeMs(value) !== null) return TIME;
  if (Array.isArray(value)) return value.map(maximumEnvelope);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, member]) => [key, maximumEnvelope(member)]));
  return value;
}

/** A pure preview can reuse a real prior capture's envelope without executing
 * another native attempt. The witness must still measure actual stored bytes
 * independently. It supplies the new requiredChecks effect as well as record. */
export function certifiedCaptureBudgetV15(record: CertifiedPublicationStateV15, bounds: Bounds, entry: Entry) {
  if (entry.input.type !== 'outcome') throw Error('A certified capture is an outcome');
  const input = { ...entry.input };
  delete input.observed;
  const passEffects = entry.effects.filter(effect => effect.effect === 'value' && effect.slot === 'passes');
  if (passEffects.length !== 1) throw Error('A certified capture writes one complete passes record');
  const shell = maximumEnvelope({ ...entry, input, effects: entry.effects.map(effect => effect.effect === 'value' && effect.slot === 'passes' ? { ...effect, value: null } : effect) });
  const observationRecordsBytes = observationBytes('rules', bounds) + 9 * observationBytes('key', bounds)
    + 65 * observationBytes('member', bounds) + observationBytes('holders', bounds, 1);
  // G15 keeps the exact five G14 row maxima: 1+1+1+65+8 = 76.
  const observedBytes = bytes({ ...input, observed: [] }) - bytes(input) + observationRecordsBytes + 75;
  const captureEnvelopeBytes = bytes(shell) - bytes(null) + observedBytes;
  const publication = certifiedPublicationBudgetV15(record, bounds);
  return { ...publication, captureEnvelopeBytes, captureEntryBytes: captureEnvelopeBytes + publication.emptyRecordBytes,
    admitted: publication.admitted && captureEnvelopeBytes + publication.emptyRecordBytes <= bounds.entryBytes };
}

/** Complete capture forecast; the exact origin uses and outcome body are
 * already known. Only the observation cohort uses its declared maxima. */
export function certifiedReservationBudgetV15(given: RuleGiven, record: CertifiedPublicationStateV15, capture: CaptureEnvelopeV15) {
  if (given.input.type !== 'outcome') throw Error('A certified capture is an outcome');
  const effects: Effect[] = [{ effect: 'attempt', operation: given.input.operation, attempt: given.input.attempt, result: given.input.result, selected: null },
    ...capture.effects, ...capture.opens.flatMap((open, n) => operationOpening(n, open))];
  const entry: Entry = { v: 1, at: given.resolved.at, seq: given.resolved.self, prev: given.state.scope()!.head.hash, time: given.time, clamped: false, epoch: 0,
    input: given.input, uses: capture.uses, prepared: [], effects, sends: capture.sends.map((send, n) => ({ n, ...send })) };
  return certifiedCaptureBudgetV15(record, given.resolved.bounds, entry);
}
