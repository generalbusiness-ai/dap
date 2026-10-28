/** Pure G17 hold order and incident state. Authority and native atomicity belong to the caller. */
import type { Digest, FactRef, HoldersObservation, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import type { CheckSource, ScopedRulesPosition } from "@generalbusiness/dap-bytes";
import { canonicalize, digestBytes, isDigest, isFactRef, isMemberRef, isRecord, isScopeRef, parseStrict, same, utf8, wellFormed } from "@generalbusiness/dap-bytes";
import { EVIDENCE_LIMITS_V17, evidencePositionV17 } from "./evidence-index-v17.ts";

const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => isRecord(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value) as object | null) && Reflect.ownKeys(value).length === keys.length
  && keys.every(key => { const field = Object.getOwnPropertyDescriptor(value, key); return !!field?.enumerable && Object.hasOwn(field, "value"); });
const text = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max && wellFormed(value) && utf8(value).length <= max;
const objectId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{40}$/.test(value) && !/^0+$/.test(value);
const owned = <T>(value: T): T => parseStrict(canonicalize(value)) as T;
const scopeValue = (value: unknown): value is ScopeRef => exact(value, ["scope", "inc", "kind"]) && isScopeRef(value);
const factValue = (value: unknown): value is FactRef => exact(value, ["at", "seq", "hash"]) && scopeValue(value["at"]) && isFactRef(value);
const generation = (value: unknown): value is ScopedRulesPosition => exact(value, ["rules", "seq"]) && scopeValue(value["rules"]) && value["rules"].kind === "rules" && evidencePositionV17(value["seq"]) && value["seq"] <= 1000000000;

export interface EvidenceHoldKeyV17 { generation: ScopedRulesPosition; extent: string; name: string; configuration: Digest; source: CheckSource; stage: "published" }
export function readEvidenceHoldKeyV17(value: unknown): EvidenceHoldKeyV17 | null {
  return exact(value, ["generation", "extent", "name", "configuration", "source", "stage"]) && generation(value["generation"])
    && text(value["extent"], 64) && value["extent"] !== "" && text(value["name"], 128) && isDigest(value["configuration"])
    && (value["source"] === "member" || value["source"] === "room") && value["stage"] === "published" ? owned(value as unknown as EvidenceHoldKeyV17) : null;
}
export function evidenceHoldKeyDigestV17(key: EvidenceHoldKeyV17): Digest {
  const read = readEvidenceHoldKeyV17(key); if (!read) throw Error("Invalid evidence hold key");
  return digestBytes(utf8(canonicalize({ domain: "artroom-evidence-hold-key-1", key: read })));
}
export interface EvidenceOrderV17 { publication: number; job: number }
export function compareEvidenceOrderV17(left: EvidenceOrderV17, right: EvidenceOrderV17): number {
  return left.publication === right.publication ? Math.sign(left.job - right.job) : Math.sign(left.publication - right.publication);
}
const order = (value: unknown): value is EvidenceOrderV17 => exact(value, ["publication", "job"]) && evidencePositionV17(value["publication"]) && evidencePositionV17(value["job"]) && value["job"] >= value["publication"];
export type EvidenceFailureKindV17 = "failed" | "error" | "timeout" | "unknown" | "observation-unavailable";
export interface EvidenceFailureV17 {
  job: FactRef;
  publication: FactRef;
  commit: string;
  order: EvidenceOrderV17;
  /** Position of the actual native decision, not an invented self FactRef. */
  decidedAt: number;
  kind: EvidenceFailureKindV17;
  reason: string;
  result: FactRef | null;
}
export function readEvidenceFailureV17(value: unknown): EvidenceFailureV17 | null {
  if (!exact(value, ["job", "publication", "commit", "order", "decidedAt", "kind", "reason", "result"]) || !factValue(value["job"]) || value["job"].at.kind !== "lane"
    || !factValue(value["publication"]) || value["publication"].at.kind !== "destination" || !objectId(value["commit"]) || !order(value["order"])
    || value["order"].publication !== value["publication"].seq || !evidencePositionV17(value["decidedAt"]) || value["decidedAt"] < value["order"].job
    || !["failed", "error", "timeout", "unknown", "observation-unavailable"].includes(String(value["kind"])) || !text(value["reason"], 1024) || value["reason"] === ""
    || !(value["result"] === null || factValue(value["result"]) && same(value["result"].at, value["job"].at))) return null;
  if (value["kind"] === "failed" && value["result"] === null || ["timeout", "unknown", "observation-unavailable"].includes(String(value["kind"])) && value["result"] !== null) return null;
  return owned(value as unknown as EvidenceFailureV17);
}
export interface EvidencePassReleaseV17 {
  kind: "pass"; decidedAt: number; through: EvidenceOrderV17;
  job: FactRef; publication: FactRef; result: FactRef;
}
export interface EvidenceOverrideReleaseV17 { kind: "override"; decidedAt: number; through: EvidenceOrderV17; reason: string }
export interface EvidenceTransitionReleaseV17 { kind: "transition"; decidedAt: number; through: EvidenceOrderV17; reason: string; next: ScopedRulesPosition }
export type EvidenceReleaseV17 = EvidencePassReleaseV17 | EvidenceOverrideReleaseV17 | EvidenceTransitionReleaseV17;
function release(value: unknown): EvidenceReleaseV17 | null {
  if (!isRecord(value) || !evidencePositionV17(value["decidedAt"]) || !order(value["through"]) || value["decidedAt"] < value["through"].job) return null;
  if (value["kind"] === "pass") return exact(value, ["kind", "decidedAt", "through", "job", "publication", "result"])
    && factValue(value["job"]) && factValue(value["publication"]) && value["publication"].at.kind === "destination" && value["publication"].seq === value["through"].publication
    && factValue(value["result"]) && same(value["job"].at, value["result"].at) ? owned(value as unknown as EvidencePassReleaseV17) : null;
  if (value["kind"] === "override") return exact(value, ["kind", "decidedAt", "through", "reason"]) && text(value["reason"], 1024) && value["reason"] !== ""
    ? owned(value as unknown as EvidenceOverrideReleaseV17) : null;
  return value["kind"] === "transition" && exact(value, ["kind", "decidedAt", "through", "reason", "next"]) && text(value["reason"], 1024) && value["reason"] !== "" && generation(value["next"])
    ? owned(value as unknown as EvidenceTransitionReleaseV17) : null;
}
export interface EvidenceHoldRecordV17 { key: EvidenceHoldKeyV17; failure: EvidenceFailureV17 | null; release: EvidenceReleaseV17 | null }
export function readEvidenceHoldV17(value: unknown): EvidenceHoldRecordV17 | null {
  if (!exact(value, ["key", "failure", "release"])) return null;
  const key = readEvidenceHoldKeyV17(value["key"]), failure = value["failure"] === null ? null : readEvidenceFailureV17(value["failure"]), cleared = value["release"] === null ? null : release(value["release"]);
  if (!key || value["failure"] !== null && failure === null || value["release"] !== null && cleared === null) return null;
  if (failure && cleared?.kind === "pass" && !same(failure.publication.at, cleared.publication.at)) return null;
  return owned({ key, failure, release: cleared });
}
export function newEvidenceHoldV17(key: EvidenceHoldKeyV17): EvidenceHoldRecordV17 | null {
  const read = readEvidenceHoldKeyV17(key); return read ? { key: read, failure: null, release: null } : null;
}
export function evidenceHoldActiveV17(record: EvidenceHoldRecordV17): boolean {
  return record.failure !== null && (record.release === null || compareEvidenceOrderV17(record.failure.order, record.release.through) > 0);
}
export type EvidenceHoldChangeV17 = { ok: true; record: EvidenceHoldRecordV17 } | { ok: false; reason: "evidence-invalid" | "hold-key-mismatch" | "hold-not-active" | "hold-pass-ineligible" | "hold-order-conflict" };
const invalid = (): EvidenceHoldChangeV17 => ({ ok: false, reason: "evidence-invalid" });

/** Every listed non-pass cause sets a hold. An older already-covered failure remains a recorded fact only. */
export function failEvidenceHoldV17(value: EvidenceHoldRecordV17, supplied: EvidenceFailureV17): EvidenceHoldChangeV17 {
  const record = readEvidenceHoldV17(value), failure = readEvidenceFailureV17(supplied); if (!record || !failure) return invalid();
  if (record.failure) {
    const compared = compareEvidenceOrderV17(failure.order, record.failure.order);
    if (compared < 0) return { ok: true, record };
    if (compared === 0) {
      if (same(record.failure, failure)) return { ok: true, record };
      // A timeout/unknown decision did not prove that the checker ended.
      // A later genuine answer may refine that same admitted job's cause.
      if (!["timeout", "unknown", "observation-unavailable"].includes(record.failure.kind) || failure.decidedAt <= record.failure.decidedAt
        || !same(record.failure.job, failure.job) || !same(record.failure.publication, failure.publication) || record.failure.commit !== failure.commit) return { ok: false, reason: "hold-order-conflict" };
    }
    if (!same(record.failure.publication.at, failure.publication.at)) return invalid();
  }
  const next = readEvidenceHoldV17({ ...record, failure }); return next ? { ok: true, record: next } : invalid();
}

/** The native owner must prove current eligible pass authority before setting eligible=true. */
export function passEvidenceHoldV17(value: EvidenceHoldRecordV17, key: EvidenceHoldKeyV17, supplied: EvidencePassReleaseV17, eligible: boolean): EvidenceHoldChangeV17 {
  const record = readEvidenceHoldV17(value), passed = release(supplied); if (!record || !passed || passed.kind !== "pass") return invalid();
  if (!same(record.key, key)) return { ok: false, reason: "hold-key-mismatch" };
  if (!eligible) return { ok: false, reason: "hold-pass-ineligible" };
  if (record.failure && !same(record.failure.publication.at, passed.publication.at)) return invalid();
  if (record.release) {
    const compared = compareEvidenceOrderV17(passed.through, record.release.through);
    if (compared < 0) return { ok: true, record };
    if (compared === 0 && record.release.kind === "pass" && (!same(record.release.job, passed.job) || !same(record.release.result, passed.result))) return { ok: false, reason: "hold-order-conflict" };
  }
  const next = readEvidenceHoldV17({ ...record, release: passed }); return next ? { ok: true, record: next } : invalid();
}

/** Authorized overrides and transitions are release acts, never passes. The caller reserves any new key first. */
export function releaseEvidenceHoldV17(value: EvidenceHoldRecordV17, supplied: EvidenceOverrideReleaseV17 | EvidenceTransitionReleaseV17): EvidenceHoldChangeV17 {
  const record = readEvidenceHoldV17(value), released = release(supplied); if (!record || !released || released.kind === "pass") return invalid();
  if (!evidenceHoldActiveV17(record) || !record.failure) return { ok: false, reason: "hold-not-active" };
  if (!same(released.through, record.failure.order) || released.decidedAt <= record.failure.decidedAt) return invalid();
  if (released.kind === "transition" && same(released.next, record.key.generation)) return invalid();
  return { ok: true, record: { ...record, release: released } };
}

export const EVIDENCE_HOLD_PENDING_V17 = 3;
/** Capacity is reserved before publication. Actual admission binds the
 * foreign job and local admission position once; neither is a future fact. */
export interface EvidenceHoldPendingV17 {
  publication: FactRef; name: string; job: FactRef | null; admittedAt: number | null;
}
export type EvidenceHoldPendingChangeV17 = { ok: true; pending: readonly EvidenceHoldPendingV17[] }
  | { ok: false; reason: "evidence-invalid" | "hold-pending-full" | "hold-pending-conflict" };
const samePosition = (left: FactRef, right: FactRef): boolean => same(left.at, right.at) && left.seq === right.seq;
const pendingInvalid = (): EvidenceHoldPendingChangeV17 => ({ ok: false, reason: "evidence-invalid" });
const pendingConflict = (): EvidenceHoldPendingChangeV17 => ({ ok: false, reason: "hold-pending-conflict" });
const publicationValue = (value: unknown): value is FactRef => factValue(value) && value.at.kind === "destination";
const jobValue = (value: unknown): value is FactRef => factValue(value) && value.at.kind === "lane";
export function readEvidenceHoldPendingV17(value: unknown): readonly EvidenceHoldPendingV17[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > EVIDENCE_HOLD_PENDING_V17
      || Reflect.ownKeys(value).length !== value.length + 1) return null;
    const pending: EvidenceHoldPendingV17[] = [];
    for (let n = 0; n < value.length; n++) {
      const field = Object.getOwnPropertyDescriptor(value, String(n));
      if (!field?.enumerable || !Object.hasOwn(field, "value")) return null;
      const row: unknown = field.value;
      if (!exact(row, ["publication", "name", "job", "admittedAt"]) || !publicationValue(row["publication"])
        || !text(row["name"], 128) || row["name"] === "") return null;
      const publication = row["publication"], name = row["name"];
      const unbound = row["job"] === null && row["admittedAt"] === null;
      if (!unbound && (!jobValue(row["job"]) || !evidencePositionV17(row["admittedAt"]) || row["admittedAt"] < publication.seq)) return null;
      const job = row["job"] as FactRef | null;
      if (pending.some(previous => previous.name === name && samePosition(previous.publication, publication)
        || job !== null && previous.job !== null && samePosition(previous.job, job))) return null;
      pending.push({ publication, name, job, admittedAt: row["admittedAt"] as number | null });
    }
    return owned(pending);
  } catch { return null; }
}
export function reserveEvidenceHoldPendingV17(value: readonly EvidenceHoldPendingV17[], publication: FactRef, name: string): EvidenceHoldPendingChangeV17 {
  const pending = readEvidenceHoldPendingV17(value);
  if (!pending || !publicationValue(publication) || !text(name, 128) || name === "") return pendingInvalid();
  const prior = pending.find(row => row.name === name && samePosition(row.publication, publication));
  if (prior) return same(prior.publication, publication) ? { ok: true, pending } : pendingConflict();
  if (pending.length >= EVIDENCE_HOLD_PENDING_V17) return { ok: false, reason: "hold-pending-full" };
  return { ok: true, pending: [...pending, { publication: owned(publication), name, job: null, admittedAt: null }] };
}
export function bindEvidenceHoldPendingV17(value: readonly EvidenceHoldPendingV17[], publication: FactRef, name: string,
  job: FactRef, admittedAt: number, clearedThrough: number | null): EvidenceHoldPendingChangeV17 {
  const pending = readEvidenceHoldPendingV17(value);
  if (!pending || !publicationValue(publication) || !text(name, 128) || name === "" || !jobValue(job)
    || !evidencePositionV17(admittedAt) || admittedAt < publication.seq || !(clearedThrough === null || evidencePositionV17(clearedThrough))) return pendingInvalid();
  const index = pending.findIndex(row => row.name === name && samePosition(row.publication, publication)), prior = pending[index];
  if (!prior || !same(prior.publication, publication)) return pendingConflict();
  if (prior.job !== null) return same(prior.job, job) && prior.admittedAt === admittedAt ? { ok: true, pending } : pendingConflict();
  if (pending.some(row => row.job !== null && samePosition(row.job, job))) return pendingConflict();
  if (clearedThrough !== null && publication.seq <= clearedThrough) return { ok: true, pending: pending.filter((_row, n) => n !== index) };
  return { ok: true, pending: pending.map((row, n) => n === index ? { publication: owned(publication), name, job: owned(job), admittedAt } : row) };
}
/** Caller proves an actual terminal result. Timer/notification code must
 * never call this helper merely because it observed or announced a job. */
export function removeEvidenceHoldPendingV17(value: readonly EvidenceHoldPendingV17[], job: FactRef): EvidenceHoldPendingChangeV17 {
  const pending = readEvidenceHoldPendingV17(value);
  if (!pending || !jobValue(job)) return pendingInvalid();
  if (pending.some(row => row.job !== null && samePosition(row.job, job) && !same(row.job, job))) return pendingConflict();
  return { ok: true, pending: pending.filter(row => row.job === null || !same(row.job, job)) };
}
/** A proven eligible pass or authorized prefix release prunes bound rows.
 * An unbound reservation still owns its capacity until actual binding or
 * independently proved irreversible withdrawal. */
export function clearEvidenceHoldPendingV17(value: readonly EvidenceHoldPendingV17[], throughPub: number): EvidenceHoldPendingChangeV17 {
  const pending = readEvidenceHoldPendingV17(value);
  if (!pending || !evidencePositionV17(throughPub)) return pendingInvalid();
  return { ok: true, pending: pending.filter(row => row.job === null || row.publication.seq > throughPub) };
}
export function withdrawEvidenceHoldPendingV17(value: readonly EvidenceHoldPendingV17[], publication: FactRef): EvidenceHoldPendingChangeV17 {
  const pending = readEvidenceHoldPendingV17(value);
  if (!pending || !publicationValue(publication)) return pendingInvalid();
  if (pending.some(row => samePosition(row.publication, publication) && !same(row.publication, publication))) return pendingConflict();
  return { ok: true, pending: pending.filter(row => row.job !== null || !same(row.publication, publication)) };
}
export type EffectiveEvidenceHoldV17 = { ok: true; active: boolean; cause: EvidenceFailureV17 | null; clearedThrough: number | null }
  | { ok: false; reason: "evidence-invalid" | "assessment-unavailable" };
/** Native readBound proves the job's actual literal timed state, reason and
 * deciding self-reference, and its coverage of this exact key/generation.
 * Null means an actually read non-timeout job; missing data is unavailable.
 * No row or incident is materialized by this bounded, short-circuit read. */
export function effectiveEvidenceHoldV17(value: EvidenceHoldRecordV17, slots: readonly EvidenceHoldPendingV17[],
  readBound: (slot: EvidenceHoldPendingV17) => EvidenceFailureV17 | null | "unavailable"): EffectiveEvidenceHoldV17 {
  try {
    const record = readEvidenceHoldV17(value), pending = readEvidenceHoldPendingV17(slots);
    if (!record || !pending || pending.some(row => row.name !== record.key.name)) return { ok: false, reason: "evidence-invalid" };
    const clearedThrough = record.release?.through.publication ?? null;
    const recordedActive = record.failure !== null && (record.failure.kind === "timeout"
      ? clearedThrough === null || record.failure.publication.seq > clearedThrough : evidenceHoldActiveV17(record));
    if (recordedActive) return { ok: true, active: true, cause: record.failure, clearedThrough };
    const ordered = [...pending].sort((left, right) => left.publication.seq - right.publication.seq
      || (left.admittedAt ?? Number.MAX_SAFE_INTEGER) - (right.admittedAt ?? Number.MAX_SAFE_INTEGER)
      || (canonicalize(left) < canonicalize(right) ? -1 : canonicalize(left) > canonicalize(right) ? 1 : 0));
    for (const slot of ordered) {
      if (slot.job === null || clearedThrough !== null && slot.publication.seq <= clearedThrough) continue;
      let supplied: EvidenceFailureV17 | null | "unavailable";
      try { supplied = readBound(slot); } catch { return { ok: false, reason: "assessment-unavailable" }; }
      if (supplied === "unavailable") return { ok: false, reason: "assessment-unavailable" };
      if (supplied === null) continue;
      const cause = readEvidenceFailureV17(supplied);
      if (!cause || cause.kind !== "timeout" || !same(cause.job, slot.job) || !same(cause.publication, slot.publication)
        || cause.order.job !== slot.admittedAt) return { ok: false, reason: "assessment-unavailable" };
      return { ok: true, active: true, cause, clearedThrough };
    }
    return { ok: true, active: false, cause: null, clearedThrough };
  } catch { return { ok: false, reason: "evidence-invalid" }; }
}

export type EvidenceTriagersV17 = Pick<HoldersObservation, "of" | "action" | "holders" | "count">;
export type EvidenceTriagerReadV17 = { ok: true; triagers: readonly MemberRef[] } | { ok: false; reason: "triagers-unavailable" | "triagers-empty" | "triagers-over-bound" };
/** The owner verifies the actual fresh holders observation. Here completeness and bounded ownership are checked. */
export function evidenceTriagersV17(value: EvidenceTriagersV17 | null): EvidenceTriagerReadV17 {
  if (!value || !scopeValue(value.of) || value.of.kind !== "membership" || value.action !== "issue.triage" || !Array.isArray(value.holders) || !evidencePositionV17(value.count)) return { ok: false, reason: "triagers-unavailable" };
  if (value.count > EVIDENCE_LIMITS_V17.triagers || value.holders.length > EVIDENCE_LIMITS_V17.triagers) return { ok: false, reason: "triagers-over-bound" };
  const holders = value.holders.map(holder => ({ membership: value.of, member: holder }));
  if (holders.length !== value.count || holders.some(holder => !isMemberRef(holder) || !text(holder.member, 256))
    || new Set(value.holders).size !== value.holders.length) return { ok: false, reason: "triagers-unavailable" };
  return holders.length ? { ok: true, triagers: owned(holders) } : { ok: false, reason: "triagers-empty" };
}

export type EvidenceCreationStateV17 = "reserved" | "ready" | "pending" | "created" | "refused" | "conflict";
/** Local send coordinates avoid placing a creating entry's future hash in its own state. */
export interface EvidenceCreationV17 { at: ScopeRef; seq: number; n: number }
export interface EvidenceIncidentV17 {
  job: FactRef; cause: EvidenceFailureV17 | null; state: EvidenceCreationStateV17;
  creation: EvidenceCreationV17 | null; child: ScopeRef | null; reason: string | null;
}
export function readEvidenceIncidentV17(value: unknown): EvidenceIncidentV17 | null {
  if (!exact(value, ["job", "cause", "state", "creation", "child", "reason"]) || !factValue(value["job"]) || value["job"].at.kind !== "lane"
    || !["reserved", "ready", "pending", "created", "refused", "conflict"].includes(String(value["state"]))
    || !(value["reason"] === null || text(value["reason"], 1024)) || !(value["child"] === null || scopeValue(value["child"]) && value["child"].kind === "lane")) return null;
  const cause = value["cause"] === null ? null : readEvidenceFailureV17(value["cause"]);
  if (value["cause"] !== null && (!cause || !same(cause.job, value["job"]))) return null;
  const creation = value["creation"];
  if (creation !== null && (!exact(creation, ["at", "seq", "n"]) || !scopeValue(creation["at"]) || creation["at"].kind !== "lane" || !evidencePositionV17(creation["seq"]) || !evidencePositionV17(creation["n"]))) return null;
  if (value["state"] === "reserved" && (cause !== null || creation !== null || value["child"] !== null)
    || value["state"] !== "reserved" && cause === null || value["state"] === "ready" && creation !== null
    || ["pending", "created", "refused", "conflict"].includes(String(value["state"])) && creation === null
    || value["state"] === "created" && (value["child"] === null || value["reason"] !== null) || value["state"] !== "created" && value["child"] !== null) return null;
  return owned({ ...value, cause } as unknown as EvidenceIncidentV17);
}
export function reserveEvidenceIncidentV17(job: FactRef): EvidenceIncidentV17 | null {
  return factValue(job) && job.at.kind === "lane" ? { job: owned(job), cause: null, state: "reserved", creation: null, child: null, reason: null } : null;
}
export type EvidenceIncidentChangeV17 = { ok: true; incident: EvidenceIncidentV17 } | { ok: false; reason: "evidence-invalid" | "incident-conflict" | "incident-not-ready" };
/** A native admitted failure decision supplies a truthful cause. Unknown check state alone is not this authority. */
export function decideEvidenceIncidentV17(value: EvidenceIncidentV17, supplied: EvidenceFailureV17): EvidenceIncidentChangeV17 {
  const incident = readEvidenceIncidentV17(value), cause = readEvidenceFailureV17(supplied);
  if (!incident || !cause || !same(incident.job, cause.job)) return { ok: false, reason: "evidence-invalid" };
  if (incident.cause) return same(incident.cause, cause) ? { ok: true, incident } : { ok: false, reason: "incident-conflict" };
  return { ok: true, incident: { ...incident, cause, state: "ready" } };
}
/** An unanswered creation keeps exactly these coordinates. Calling again never starts a replacement. */
export function startEvidenceIncidentV17(value: EvidenceIncidentV17, creation: EvidenceCreationV17): EvidenceIncidentChangeV17 {
  const incident = readEvidenceIncidentV17(value); if (!incident) return { ok: false, reason: "evidence-invalid" };
  if (incident.creation) return same(incident.creation, creation) ? { ok: true, incident } : { ok: false, reason: "incident-conflict" };
  if (incident.state !== "ready") return { ok: false, reason: "incident-not-ready" };
  const next = readEvidenceIncidentV17({ ...incident, creation, state: "pending" });
  return next ? { ok: true, incident: next } : { ok: false, reason: "evidence-invalid" };
}
export function finishEvidenceIncidentV17(value: EvidenceIncidentV17, creation: EvidenceCreationV17, answer: { state: "created"; child: ScopeRef } | { state: "refused" | "conflict"; reason: string } | { state: "unknown" }): EvidenceIncidentChangeV17 {
  const incident = readEvidenceIncidentV17(value); if (!incident || !same(incident.creation, creation)) return { ok: false, reason: "evidence-invalid" };
  if (answer.state === "unknown") return { ok: true, incident };
  const next = readEvidenceIncidentV17({ ...incident, state: answer.state, child: answer.state === "created" ? answer.child : null, reason: answer.state === "created" ? null : answer.reason });
  if (!next) return { ok: false, reason: "evidence-invalid" };
  if (incident.state !== "pending") return same(incident, next) ? { ok: true, incident } : { ok: false, reason: "incident-conflict" };
  return { ok: true, incident: next };
}
