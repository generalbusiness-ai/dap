/** G17 only. Canonical record bytes plus the complete carrying entry,
 * including future generations, must fit before the first capture. */
import type { Bounds, Effect, Entry, FactRef, FactUse, KeyId, RulesObservation } from '@generalbusiness/dap-contract';
import { canonicalize, isDigest, isFactRef, isKeyId, isMemberRef, isRecord, memberFits, parseStrict, same, timeMs, utf8 } from '@generalbusiness/dap-bytes';
import { amountMath, naturalAmount, NOTHING, observationBytes, operationOpening, type Opening, type OperationRules, type RuleEffect, type RuleGiven, type RuleRequest } from '@generalbusiness/dap-derive';
import { isObjectId } from './reservation.ts';
import { readRulesPolicyObservationV17, requiredChecksV17, type ReservationPolicyInputV17 } from './reservation-v17.ts';
import type { RulesCheckV13 } from './rules-policy-v13.ts';
import { RULES_POLICY_VALUE_V13 } from './rules-policy-v13.ts';
import { RULES_TREE_PROOF } from './rules-policy-tree.ts';
import { evidenceWireV17, readEvidenceWireV17 } from './evidence-wire-v17.ts';

export const CERTIFIED_PUBLICATION_TEXT_BYTES_V17 = 262144;

export const rulesCertificateEvidenceValuesV17: NonNullable<OperationRules['values']> = evidence => {
  const body=evidence.body;
  return isRecord(body)&&Object.keys(body).length===3&&isDigest(body['proposal'])&&isDigest(body['proof'])&&isFactRef(body['started'])
    ? [{...RULES_POLICY_VALUE_V13,digest:body['proposal']},{...RULES_TREE_PROOF,digest:body['proof']}] : [];
};

/** The sealed input form, before the judge appends retained observations. */
export function evidenceCarryingInputV17(stated: RuleGiven['input']) {
  return stated.type==='act'?{type:'act' as const,signed:stated.signed,authority:stated.grant?[stated.grant]:[],presented:stated.presented}
    :stated.type==='delivery'&&stated.message.class==='request'?{...stated,decision:'applied' as const}:{...stated};
}
/** One actual carrying entry. This is independent of the kernel's complete
 * five-dimensional holder quote and of the terminal forecasts below. */
export function evidenceCarryingBudgetV17(given: RuleGiven, effects: readonly RuleEffect[], opens: readonly Opening[], sends: readonly RuleRequest[], futureRecords: readonly unknown[]) {
  const input=evidenceCarryingInputV17(given.input);
  // RuleGiven's judged input excludes observations. Their full declared
  // cohort is quoted separately below, once, as it is added to the entry.
  const attempt=given.input.type==='outcome'?[{effect:'attempt',operation:given.input.operation,attempt:given.input.attempt,result:given.input.result,selected:given.resolved.outcome?.selected??null}]:[];
  const actualEffects=[...attempt,...effects,...opens.flatMap((open,n)=>operationOpening(n,open))];
  const reply=given.input.type==='delivery'&&given.input.message.class==='request'?[{n:MAX,to:given.input.from.at,message:{class:'result',of:{from:given.input.from,n:given.input.n},outcome:'applied'}}]:[];
  const body={v:1,at:given.resolved.at,seq:MAX,prev:HASH,time:TIME,clamped:false,epoch:0,input,
    uses:given.uses.map(use=>({fact:use.fact,content:HASH})),prepared:[],effects:actualEffects,sends:[...sends.map((send,n)=>({n,...send})),...reply]};
  const actual=bytes(maximumEnvelope(body));
  const admission=input.type==='outcome'&&input.kind==='evidence-admit',result=input.type==='outcome'&&input.kind==='evidence-result',notice=input.type==='outcome'&&input.kind==='evidence-notice';
  const capture=input.type==='outcome'&&['judge','read'].includes(input.kind);
  const release=input.type==='act'&&['evidence-hold-override','evidence-hold-transition'].includes(input.signed.intent.kind);
  const observed=admission||result?observationBytes('rules',given.resolved.bounds)+9*observationBytes('key',given.resolved.bounds)+observationBytes('member',given.resolved.bounds)
    +(result?observationBytes('holders',given.resolved.bounds,32):0):notice?observationBytes('holders',given.resolved.bounds,32)
      :capture?observationBytes('rules',given.resolved.bounds)+9*observationBytes('key',given.resolved.bounds)+65*observationBytes('member',given.resolved.bounds)+observationBytes('holders',given.resolved.bounds,1)
        :release?observationBytes('rules',given.resolved.bounds):0;
  const observationReserve=observed===0?0:bytes({...input,observed:[]})-bytes(input)+observed+(capture?75:result?11:admission?10:0);
  const futureGrowth=futureRecords.reduce<number>((total,record)=>{
    const measured=bytes(record); return amountMath(true).sum({...NOTHING,bytes:total},{...NOTHING,bytes:measured}).bytes;
  },0);
  const entryBytes=amountMath(true).sum({...NOTHING,bytes:actual},{...NOTHING,bytes:observationReserve},{...NOTHING,bytes:futureGrowth}).bytes;
  const write=naturalAmount({entries:1,items:actualEffects.filter(effect=>effect.effect==='open').length,records:0,requests:sends.length,
    bytes:entryBytes+given.uses.reduce((total,use)=>amountMath(true).sum({...NOTHING,bytes:total},{...NOTHING,bytes:bytes(use.entry)}).bytes,0)});
  return {admitted:entryBytes<=given.resolved.bounds.entryBytes&&actualEffects.length<=Math.min(16,given.resolved.bounds.derivedEffects)
    &&actualEffects.filter(effect=>effect.effect==='open').length<=1&&sends.length+reply.length<=given.resolved.bounds.sendsPerEntry,entryBytes,write};
}

export interface CertifiedReservationSnapshotV17 {
  observation: RulesObservation;
  input: ReservationPolicyInputV17;
  touched: string[];
  required: readonly RulesCheckV13[];
  tree: string;
  manifest: FactRef;
}
export interface CertifiedGenerationV17 {
  name: string; job: FactRef; passed: boolean;
  proof?: { result: FactRef; key: KeyId; decided: number; configuration: string; checker: RulesCheckV13['checker']; tree: string; proposal: string };
}
export interface CertifiedPublicationStateV17 { policy: CertifiedReservationSnapshotV17; generations: readonly CertifiedGenerationV17[] }
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
 * native judge still supplies the authenticated Q13 observation and values. */
export function certifiedReservationSnapshotV17(value: unknown, bounds: Bounds): CertifiedReservationSnapshotV17 | null {
  try {
    if (!isRecord(value) || !exact(value, ['observation', 'input', 'touched', 'required', 'tree', 'manifest'])
      || !isRecord(value['observation']) || !isRecord(value['input']) || !exact(value['input'], ['rules', 'destination', 'extents'])
      || !Array.isArray(value['touched']) || value['touched'].length > 8 || !value['touched'].every(name => typeof name === 'string' && name.length <= 64)
      || !Array.isArray(value['required']) || value['required'].length > 32 || !isObjectId(value['tree']) || !isFactRef(value['manifest'])) return null;
    const observation = value['observation'] as unknown as RulesObservation;
    const input = value['input'] as unknown as ReservationPolicyInputV17;
    const decoded = readRulesPolicyObservationV17(observation, input, observation.at);
    if (!decoded.ok) return null;
    const required = requiredChecksV17(decoded.view.policy, value['touched'] as string[]);
    if (!required.ok || !same(required.checks, value['required']) || required.checks.some(check => !memberFits(check.checker, bounds))) return null;
    return { observation, input, touched: [...value['touched']] as string[], required: required.checks, tree: value['tree'], manifest: value['manifest'] };
  } catch { return null; }
}

function generations(value: unknown, bounds: Bounds): value is readonly CertifiedGenerationV17[] {
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

/** Reachable written-receipt closures, quoted before any published work.
 * These are forecast shells, never recorded facts. Receipt's token cleanup
 * and staged-ref cleanup are independent of the separate plan dispatch.
 * Each shell carries the full allowed FactUse count; full foreign entries
 * remain in holder custody, rather than being copied into the Entry. */
export function certifiedWrittenPlanBudgetV17(bounds: Bounds) {
  const uses = bounds.usesPerEntry;
  if (!Number.isSafeInteger(uses) || uses < 0) return { admitted: false, entryBytes: 0, effects: 0, variants: [] };
  const attempt: Effect = { effect: 'attempt', operation: OPERATION, attempt: MAX, result: 'confirmed', selected: false };
  const opening = (k: number, kind: string, attempts: number) => operationOpening(k, { owner: 'platform:destination@17', kind, attempts, for: MAX });
  const input = (kind: string, body: import('@generalbusiness/dap-contract').FieldValue): Entry['input'] => ({
    type: 'outcome', operation: OPERATION, attempt: MAX, owner: 'platform:destination@17', kind, result: 'confirmed',
    evidence: { basis: 'own-answer', body }, observed: [],
  });
  const shell = (kind: string, body: import('@generalbusiness/dap-contract').FieldValue, effects: Effect[], sends: Entry['sends']): Entry => ({
    v: 1, at: SCOPE, seq: MAX, prev: HASH, time: TIME, clamped: false, epoch: 0,
    input: input(kind, body), uses: [], prepared: [], effects: [attempt, ...effects], sends,
  });
  const written: Effect = { effect: 'state', item: MAX, state: 'written' };
  const variants = [
    { name: 'receipt', entry: shell('receipt', { send: 'accepted', seen: 'f'.repeat(64) }, [
      { effect: 'value', item: MAX, slot: 'token', value: null }, written,
      ...opening(0, 'revoke', 3), ...opening(1, 'reservation-delete', 3), ...opening(2, 'mint', 1), ...opening(3, 'evidence-plan', 1),
    ], []), observed: 0 },
    { name: 'read', entry: shell('read', { seen: 'f'.repeat(64) }, [written, ...opening(0, 'evidence-plan', 1)], []),
      // Read declares the complete Rules/member/key/holder cohort, including
      // the property, array and row separators even on this receipt branch.
      observed: observationBytes('rules', bounds) + 9 * observationBytes('key', bounds)
        + 65 * observationBytes('member', bounds) + observationBytes('holders', bounds, 1) + 75 },
    { name: 'evidence-plan', entry: shell('evidence-plan', { written: FACT }, [], [{ n: MAX, to: SCOPE,
      message: { class: 'request', type: 'tell', body: { message: 'evidence-plan-open', fields: {
        publication: FACT, operation: FACT, receipt: FACT, written: FACT, manifest: FACT,
      } } } }]), observed: 0 },
  ].map(variant => ({ ...variant,
    // Empty uses[] syntax is already present. No array proportional to a
    // caller-supplied bound is allocated merely to compute its exact size.
    entryBytes: bytes(variant.entry) + uses * bytes(USE) + Math.max(0, uses - 1) + variant.observed,
    effects: variant.entry.effects.length,
  }));
  return { admitted: variants.every(variant => variant.entryBytes <= bounds.entryBytes
      && variant.effects <= Math.min(16, bounds.derivedEffects) && variant.entry.sends.length <= bounds.sendsPerEntry),
    entryBytes: Math.max(...variants.map(variant => variant.entryBytes)), effects: Math.max(...variants.map(variant => variant.effects)), variants };
}

/** Maximum native envelopes without the passes value. Foreign signed
 * entries are retained separately: only their FactUse records occur here. */
export function certifiedFutureEnvelopeBytesV17(bounds: Bounds): number {
  const fence = frame({ type: 'delivery', from: FACT, n: MAX, decision: 'applied', message: {
    class: 'request', type: 'tell', body: { message: 'check-fence', fields: { operation: FACT, job: FACT, earlier: FACT, name: TEXT128 } },
  } }, [passes], [requestResult]);
  const input = { type: 'outcome', operation: OPERATION, attempt: MAX, owner: 'platform:destination@17', kind: 'check-judge', result: 'confirmed',
    evidence: { basis: 'own-answer', body: { readAt: TIME, current: false, job: FACT, result: FACT } } };
  const openings = [operationOpening(0, { owner: 'platform:destination@17', kind: 'push', attempts: 3, for: MAX }),
    operationOpening(1, { owner: 'platform:destination@17', kind: 'mint', attempts: 3, for: MAX })].flat();
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

export interface CertifiedPublicationBudgetV17 {
  entryBytes: number; recordBytes: number; emptyRecordBytes: number;
  generationsReserveBytes: number; maximumRecordBytes: number; futureEnvelopeBytes: number;
  recordCeiling: number; admitted: boolean;
}
/** Reserve all 32 proof-bearing rows before capture, including non-required
 * names that a later fence can introduce. Code-point and byte bounds differ:
 * the synthetic name uses the maximum possible JSON escaping. */
export function certifiedPublicationBudgetV17(record: CertifiedPublicationStateV17, bounds: Bounds): CertifiedPublicationBudgetV17 {
  const checker = record.policy.required.reduce<RulesCheckV13['checker']>((largest, check) => bytes(check.checker) > bytes(largest) ? check.checker : largest,
    { membership: SCOPE, member: '@a' });
  const row = { name: TEXT128, job: FACT, passed: false, proof: { result: FACT, key: KEY, decided: MAX, configuration: HASH, checker, tree: 'f'.repeat(64), proposal: HASH } };
  const emptyText = canonicalize({ policy: record.policy, generations: [] }), recordText = canonicalize(record);
  const maximumText = canonicalize({ policy: record.policy, generations: Array.from({length:32},()=>row) });
  const emptyRecordBytes = bytes(emptyText), recordBytes = bytes(recordText), maximumRecordBytes = bytes(maximumText);
  const generationsReserveBytes = maximumRecordBytes - emptyRecordBytes;
  const futureEnvelopeBytes = certifiedFutureEnvelopeBytesV17(bounds), recordCeiling = bounds.entryBytes - futureEnvelopeBytes;
  return { entryBytes: bounds.entryBytes, recordBytes, emptyRecordBytes, generationsReserveBytes, maximumRecordBytes, futureEnvelopeBytes, recordCeiling,
    admitted: utf8(recordText).length <= CERTIFIED_PUBLICATION_TEXT_BYTES_V17 && utf8(maximumText).length <= CERTIFIED_PUBLICATION_TEXT_BYTES_V17
      && recordBytes <= recordCeiling && maximumRecordBytes <= recordCeiling };
}

export function certifiedPublicationStateV17(value: unknown, bounds: Bounds): CertifiedPublicationStateV17 | null {
  try {
    if (!isRecord(value) || !exact(value, ['policy', 'generations']) || bytes(value) > bounds.entryBytes) return null;
    const owned = parseStrict(canonicalize(value));
    if (!isRecord(owned)) return null;
    const policy = certifiedReservationSnapshotV17(owned['policy'], bounds);
    if (!policy || !generations(owned['generations'], bounds)) return null;
    const record = { policy, generations: owned['generations'] };
    // A proof must use the exact admitted checker, so future growth is bounded
    // by configured descriptors rather than an unrelated arbitrary handle.
    if (record.generations.some(row => row.proof && !policy.required.some(check => check.name === row.name && same(check.checker, row.proof!.checker)))) return null;
    return certifiedPublicationBudgetV17(record, bounds).admitted ? record : null;
  } catch { return null; }
}
export function certifiedPublicationStateWireV17(value: unknown, bounds: Bounds): CertifiedPublicationStateV17 | null {
  const read = readEvidenceWireV17(value, Math.min(bounds.entryBytes, CERTIFIED_PUBLICATION_TEXT_BYTES_V17));
  return read.ok ? certifiedPublicationStateV17(read.value, bounds) : null;
}
export function certifiedPublicationWireV17(record: CertifiedPublicationStateV17, bounds: Bounds): string {
  if (!certifiedPublicationStateV17(record, bounds)) throw Error('The certified publication record is malformed');
  return evidenceWireV17(record, Math.min(bounds.entryBytes, CERTIFIED_PUBLICATION_TEXT_BYTES_V17));
}

export interface CaptureEnvelopeV17 { effects: readonly RuleEffect[]; opens: readonly Opening[]; sends: readonly RuleRequest[]; uses: readonly FactUse[] }
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
export function certifiedCaptureBudgetV17(record: CertifiedPublicationStateV17, bounds: Bounds, entry: Entry) {
  if (entry.input.type !== 'outcome') throw Error('A certified capture is an outcome');
  const input = { ...entry.input };
  delete input.observed;
  const passEffects = entry.effects.filter(effect => effect.effect === 'value' && effect.slot === 'passes');
  if (passEffects.length !== 1) throw Error('A certified capture writes one complete passes record');
  // destinationRules4's fileEffects lowers the capture's branch slot/judging
  // refs after the judge callback. The stored value/value form is five bytes
  // longer than ref/to. Forecast that longer form for every ref; any ref that
  // remains a ref is then conservatively over-counted, never under-counted.
  const effects = entry.effects.map(effect => effect.effect === 'ref'
    ? { effect: 'value', item: effect.item, slot: effect.slot, value: effect.to }
    : effect.effect === 'value' && effect.slot === 'passes' ? { ...effect, value: null } : effect);
  const shell = maximumEnvelope({ ...entry, input, effects });
  const observationRecordsBytes = observationBytes('rules', bounds) + 9 * observationBytes('key', bounds)
    + 65 * observationBytes('member', bounds) + observationBytes('holders', bounds, 1);
  // G17 keeps the exact five G17 row maxima: 1+1+1+65+8 = 76.
  const observedBytes = bytes({ ...input, observed: [] }) - bytes(input) + observationRecordsBytes + 75;
  const captureEnvelopeBytes = bytes(shell) - bytes(null) + observedBytes;
  const publication = certifiedPublicationBudgetV17(record, bounds);
  return { ...publication, captureEnvelopeBytes, captureEntryBytes: captureEnvelopeBytes + publication.emptyRecordBytes,
    admitted: publication.admitted && captureEnvelopeBytes + publication.emptyRecordBytes <= bounds.entryBytes };
}

/** Complete capture forecast; the exact origin uses and outcome body are
 * already known. Only the observation cohort uses its declared maxima. */
export function certifiedReservationBudgetV17(given: RuleGiven, record: CertifiedPublicationStateV17, capture: CaptureEnvelopeV17) {
  if (given.input.type !== 'outcome') throw Error('A certified capture is an outcome');
  const effects: Effect[] = [{ effect: 'attempt', operation: given.input.operation, attempt: given.input.attempt, result: given.input.result, selected: null },
    ...capture.effects, ...capture.opens.flatMap((open, n) => operationOpening(n, open))];
  const entry: Entry = { v: 1, at: given.resolved.at, seq: given.resolved.self, prev: given.state.scope()!.head.hash, time: given.time, clamped: false, epoch: 0,
    input: given.input, uses: capture.uses, prepared: [], effects, sends: capture.sends.map((send, n) => ({ n, ...send })) };
  return certifiedCaptureBudgetV17(record, given.resolved.bounds, entry);
}
