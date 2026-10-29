/** G17-only bounded evidence records. No history, storage, or authority is read here. */
import type { Bounds, Digest, FactRef, KeyId, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { natural, canonicalize, digestBytes, isDigest, isFactRef, isKeyId, isMemberRef, isRecord, isScopeRef, parseStrict, same, utf8, wellFormed } from "@generalbusiness/dap-bytes";
import { readEvidenceBinding, type CheckSource, type CheckStage, type EvidenceBinding } from "./evidence.ts";
import { amountMath, naturalAmount, NOTHING, type Amount } from "@generalbusiness/dap-derive";

export const EVIDENCE_LIMITS_V17 = { keys: 2048, candidates: 8, keyBytes: 32768, holds: 512, policyGenerations: 512, incidents: 8192, triagers: 32 } as const;
const bytes = (value: unknown): number => utf8(canonicalize(value)).length;
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => isRecord(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value) as object | null) && Reflect.ownKeys(value).length === keys.length
  && keys.every(key => { const field = Object.getOwnPropertyDescriptor(value, key); return !!field?.enumerable && Object.hasOwn(field, "value"); });
const dataArray = (value: unknown, max: number): value is unknown[] => Array.isArray(value) && value.length <= max
  && Reflect.ownKeys(value).length === value.length + 1 && Array.from({ length: value.length }, (_, index) => Object.getOwnPropertyDescriptor(value, String(index)))
    .every(field => !!field?.enumerable && Object.hasOwn(field, "value"));
const text = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max && wellFormed(value) && utf8(value).length <= max;
const objectId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{40}$/.test(value) && !/^0+$/.test(value);
const owned = <T>(value: T): T => parseStrict(canonicalize(value)) as T;
const scopeValue = (value: unknown): value is ScopeRef => exact(value, ["scope", "inc", "kind"]) && isScopeRef(value);
const factValue = (value: unknown): value is FactRef => exact(value, ["at", "seq", "hash"]) && scopeValue(value["at"]) && isFactRef(value);
const member = (value: unknown): value is MemberRef => exact(value, ["membership", "member"]) && scopeValue(value["membership"]) && isMemberRef(value) && text(value.member, 256);
export const evidencePositionV17 = natural;

export interface EvidenceKeyV17 { room: ScopeRef; tree: string; name: string; configuration: Digest; source: CheckSource; stage: CheckStage }
export function readEvidenceKeyV17(value: unknown): EvidenceKeyV17 | null {
  return exact(value, ["room", "tree", "name", "configuration", "source", "stage"]) && scopeValue(value["room"])
    && objectId(value["tree"]) && text(value["name"], 128) && isDigest(value["configuration"])
    && (value["source"] === "member" || value["source"] === "room") && ["work", "landing", "published"].includes(String(value["stage"]))
    ? owned(value as unknown as EvidenceKeyV17) : null;
}
/** The key intentionally excludes both Rules generations, the checker, and the signing key. */
export function evidenceKeyDigestV17(key: EvidenceKeyV17): Digest {
  const read = readEvidenceKeyV17(key); if (!read) throw Error("Invalid evidence key");
  return digestBytes(utf8(canonicalize({ domain: "artroom-evidence-key-1", key: read })));
}

export interface EvidenceCandidateV17 {
  job: FactRef;
  keyDigest: Digest;
  /** Local native positions. Resolve their hashes only from actual sealed entries. */
  admission: number;
  result: FactRef;
  decidedBy: number;
  key: KeyId;
  checker: MemberRef;
  binding: EvidenceBinding;
  outcome: "passed" | "failed";
}
export function readEvidenceCandidateV17(value: unknown): EvidenceCandidateV17 | null {
  if (!exact(value, ["job", "keyDigest", "admission", "result", "decidedBy", "key", "checker", "binding", "outcome"]) || !factValue(value["job"]) || value["job"].at.kind !== "lane" || !isDigest(value["keyDigest"])
    || !natural(value["admission"]) || !factValue(value["result"]) || !natural(value["decidedBy"]) || value["decidedBy"] < value["admission"]
    || !same(value["job"].at, value["result"].at) || !isKeyId(value["key"]) || !member(value["checker"]) || (value["outcome"] !== "passed" && value["outcome"] !== "failed")) return null;
  const binding = readEvidenceBinding(value["binding"]);
  return binding && same(binding.checker, value["checker"]) ? owned({ ...value, binding } as unknown as EvidenceCandidateV17) : null;
}
export interface EvidenceConflictV17 { passed: FactRef; failed: FactRef }
export interface EvidenceIndexRecordV17 { key: EvidenceKeyV17; pending: readonly FactRef[]; candidates: readonly EvidenceCandidateV17[]; conflict: EvidenceConflictV17 | null }
export function readEvidenceIndexV17(value: unknown): EvidenceIndexRecordV17 | null {
  try {
    if (!exact(value, ["key", "pending", "candidates", "conflict"]) || !dataArray(value["pending"], EVIDENCE_LIMITS_V17.candidates)
      || !dataArray(value["candidates"], EVIDENCE_LIMITS_V17.candidates) || value["pending"].length + value["candidates"].length > EVIDENCE_LIMITS_V17.candidates
      || !value["pending"].every(factValue)) return null;
    const key = readEvidenceKeyV17(value["key"]), candidates = value["candidates"].map(readEvidenceCandidateV17);
    if (!key || key.stage === "published" || candidates.some(candidate => candidate === null)) return null;
    const rows = candidates as EvidenceCandidateV17[];
    if (rows.some(candidate => candidate.keyDigest !== evidenceKeyDigestV17(key) || candidate.binding.source !== key.source || candidate.binding.stage !== key.stage)
      || new Set([...value["pending"], ...rows.map(candidate => candidate.job)].map(fact => canonicalize(fact))).size !== value["pending"].length + rows.length) return null;
    const conflict = value["conflict"];
    if (conflict !== null && (!exact(conflict, ["passed", "failed"]) || !factValue(conflict["passed"]) || !factValue(conflict["failed"])
      || !rows.some(row => row.outcome === "passed" && same(row.result, conflict["passed"])) || !rows.some(row => row.outcome === "failed" && same(row.result, conflict["failed"])))) return null;
    if (bytes(value) > EVIDENCE_LIMITS_V17.keyBytes) return null;
    return owned({ key, pending: value["pending"] as FactRef[], candidates: rows, conflict } as EvidenceIndexRecordV17);
  } catch { return null; }
}
export function newEvidenceIndexV17(key: EvidenceKeyV17): EvidenceIndexRecordV17 | null {
  const read = readEvidenceKeyV17(key); return read && read.stage !== "published" ? { key: read, pending: [], candidates: [], conflict: null } : null;
}

export type EvidenceIndexRefusalV17 = { ok: false; reason: "evidence-invalid" | "evidence-capacity" | "evidence-not-reserved" | "evidence-result-conflict"; resource?: "reuse-candidates" | "reuse-record" };
export type EvidenceIndexChangeV17 = { ok: true; record: EvidenceIndexRecordV17 } | EvidenceIndexRefusalV17;
const invalid = (): EvidenceIndexRefusalV17 => ({ ok: false, reason: "evidence-invalid" });
const fit = (record: EvidenceIndexRecordV17): EvidenceIndexChangeV17 => {
  const read = readEvidenceIndexV17(record); return read ? { ok: true, record: read } : { ok: false, reason: "evidence-capacity", resource: "reuse-record" };
};

/** The native owner supplies a complete future record forecast, not an unexplained per-row allowance. */
export function reserveEvidenceCandidateV17(value: EvidenceIndexRecordV17, job: FactRef, futureRecordBytes: number): EvidenceIndexChangeV17 {
  const record = readEvidenceIndexV17(value);
  if (!record || !factValue(job) || !natural(futureRecordBytes)) return invalid();
  if (record.pending.some(pending => same(pending, job)) || record.candidates.some(candidate => same(candidate.job, job))) return { ok: true, record };
  if (record.conflict) return { ok: true, record };
  if (record.pending.length + record.candidates.length === EVIDENCE_LIMITS_V17.candidates) return { ok: false, reason: "evidence-capacity", resource: "reuse-candidates" };
  const next = { ...record, pending: [...record.pending, owned(job)] };
  if (futureRecordBytes < bytes(next) || futureRecordBytes > EVIDENCE_LIMITS_V17.keyBytes) return { ok: false, reason: "evidence-capacity", resource: "reuse-record" };
  return fit(next);
}

export interface EvidenceAssessmentV17 { record: EvidenceIndexRecordV17; reusable: EvidenceCandidateV17 | null; conflicted: boolean }
/** One predicate applies to both outcomes. The owner proves current authority before returning true. */
export function assessEvidenceV17(value: EvidenceIndexRecordV17, eligible: (candidate: EvidenceCandidateV17) => boolean): EvidenceAssessmentV17 | null {
  const record = readEvidenceIndexV17(value); if (!record) return null;
  if (record.conflict) return { record, reusable: null, conflicted: true };
  const current = record.candidates.filter(candidate => eligible(owned(candidate)));
  const passed = current.find(candidate => candidate.outcome === "passed"), failed = current.find(candidate => candidate.outcome === "failed");
  if (passed && failed) {
    const next = readEvidenceIndexV17({ ...record, conflict: { passed: passed.result, failed: failed.result } });
    return next ? { record: next, reusable: null, conflicted: true } : null;
  }
  return { record, reusable: passed ? owned(passed) : null, conflicted: false };
}

export function settleEvidenceCandidateV17(value: EvidenceIndexRecordV17, supplied: EvidenceCandidateV17, eligible: (candidate: EvidenceCandidateV17) => boolean): EvidenceIndexChangeV17 {
  const record = readEvidenceIndexV17(value), candidate = readEvidenceCandidateV17(supplied);
  if (!record || !candidate || candidate.keyDigest !== evidenceKeyDigestV17(record.key) || candidate.binding.source !== record.key.source || candidate.binding.stage !== record.key.stage) return invalid();
  const prior = record.candidates.find(row => same(row.job, candidate.job));
  if (prior) return same(prior, candidate) ? { ok: true, record } : { ok: false, reason: "evidence-result-conflict" };
  if (record.conflict) return fit({ ...record, pending: record.pending.filter(job => !same(job, candidate.job)) });
  if (!record.pending.some(job => same(job, candidate.job))) return { ok: false, reason: "evidence-not-reserved" };
  const assessed = assessEvidenceV17({ ...record, pending: record.pending.filter(job => !same(job, candidate.job)), candidates: [...record.candidates, candidate] }, eligible);
  return assessed ? { ok: true, record: assessed.record } : invalid();
}

/** Call only after a native terminal decision proves this job can supply no later eligible result. */
export function releaseEvidenceCandidateV17(value: EvidenceIndexRecordV17, job: FactRef): EvidenceIndexChangeV17 {
  const record = readEvidenceIndexV17(value); return !record || !factValue(job) ? invalid() : fit({ ...record, pending: record.pending.filter(row => !same(row, job)) });
}

export interface EvidenceCountsV17 { keys: number; holds: number; policyGenerations: number; incidents: number }
export function readEvidenceCountsV17(value: unknown): EvidenceCountsV17 | null {
  if (!exact(value, ["keys", "holds", "policyGenerations", "incidents"])) return null;
  for (const key of ["keys", "holds", "policyGenerations", "incidents"] as const) if (!natural(value[key]) || value[key] > EVIDENCE_LIMITS_V17[key]) return null;
  return owned(value as unknown as EvidenceCountsV17);
}
export function reserveEvidenceCountsV17(value: EvidenceCountsV17, increments: EvidenceCountsV17): { ok: true; counts: EvidenceCountsV17 } | { ok: false; reason: "evidence-invalid" | "evidence-capacity"; resource?: keyof EvidenceCountsV17 } {
  const counts = readEvidenceCountsV17(value); if (!counts || !exact(increments, ["keys", "holds", "policyGenerations", "incidents"])) return { ok: false, reason: "evidence-invalid" };
  for (const key of ["keys", "holds", "policyGenerations", "incidents"] as const) if (!natural(increments[key])) return { ok: false, reason: "evidence-invalid" };
  const next = { ...counts };
  for (const key of ["keys", "holds", "policyGenerations", "incidents"] as const) {
    let sum: number;
    try { sum = amountMath(true).sum({ ...NOTHING, items: counts[key] }, { ...NOTHING, items: increments[key] }).items; }
    catch { return { ok: false, reason: "evidence-invalid" }; }
    if (sum > EVIDENCE_LIMITS_V17[key]) return { ok: false, reason: "evidence-capacity", resource: key };
    next[key] = sum;
  }
  return { ok: true, counts: next };
}

export interface EvidenceCapacityQuoteV17 {
  used: Amount;
  pending: Amount;
  /** This entry's new storage, separate from the future reservation it opens. */
  write: Amount;
  future: Amount;
  carryingEntryBytes: number;
  maximumSettlementEntryBytes: number;
}
export type EvidenceCapacityBoundsV17 = Pick<Bounds, "entryBytes" | "scopeEntries" | "scopeBytes" | "scopeItems" | "scopeRecords" | "scopeRequests">;
export function evidenceCapacityV17(quote: EvidenceCapacityQuoteV17, bounds: EvidenceCapacityBoundsV17): { ok: true; total: Amount } | { ok: false; reason: "evidence-invalid" | "evidence-capacity"; resource?: keyof EvidenceCapacityBoundsV17 } {
  try {
    for (const value of Object.values(bounds)) if (!natural(value)) return { ok: false, reason: "evidence-invalid" };
    if (!natural(quote.carryingEntryBytes) || !natural(quote.maximumSettlementEntryBytes)) return { ok: false, reason: "evidence-invalid" };
    for (const amount of [quote.used, quote.pending, quote.write, quote.future]) naturalAmount(amount);
    const total = amountMath(true).sum(quote.used, quote.pending, quote.write, quote.future);
    if (quote.carryingEntryBytes > bounds.entryBytes || quote.maximumSettlementEntryBytes > bounds.entryBytes) return { ok: false, reason: "evidence-capacity", resource: "entryBytes" };
    for (const [dimension, bound] of [["entries", "scopeEntries"], ["bytes", "scopeBytes"], ["items", "scopeItems"], ["records", "scopeRecords"], ["requests", "scopeRequests"]] as const) {
      if (total[dimension] > bounds[bound]) return { ok: false, reason: "evidence-capacity", resource: bound };
    }
    return { ok: true, total };
  } catch { return { ok: false, reason: "evidence-invalid" }; }
}
