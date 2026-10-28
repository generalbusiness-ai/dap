/** G17 native job records. Every full native fact below is resolved only
 * after its entry was sealed. Indexes contain live and decided anchors. */
import type { Digest, Entry, FactRef, FieldValue, KeyId, Observation, PlatformData, ScopedRulesPosition, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, entryHash, isDigest, isFactRef, isHead, isKeyId, isRecord, isScopeRef, parseStrict, same as equalCanonical, textDigest, timeMs, unb64url, utf8 } from "@generalbusiness/dap-bytes";
import { evidenceBindingDigest, readEvidenceBinding, type EvidenceBinding } from "./evidence.ts";
import { idOf, isObjectId, parseCommit } from "@generalbusiness/dap-git/tree-proof";
import { isEntryOf, RuleFault, type Item, type Operation, type Own, type Opening, type OutcomeGives, type RuleEffect, type RuleGiven, type RuleRequest, type Rules, type StateSnapshot, type StateView, type ValidDefinition } from "@generalbusiness/dap-derive";
import { readEvidenceDecisionV17 } from "./evidence-decision-v17.ts";
import { evidenceFutureEntriesV17 } from "./evidence-forecast-v17.ts";
import { readEvidenceBatchV17, readEvidenceBatchWireV17, type EvidenceBatchRecordV17 } from "./evidence-batch-v17.ts";
import { evidenceCapacityValidV17, evidencePendingCapacityForecastV17, evidenceSettlePendingCapacityV17, evidenceSpendPublishedCapacityV17, readEvidenceCapacityWireV17 } from "./destination-evidence-capacity-v17.ts";
import { evidenceFundingFloorReferencesV17, evidenceFundingReadyV17 } from "./destination-evidence-funding-v17.ts";
import { EVIDENCE_LEDGER_ITEM_V17, evidenceLedgerOfV17 } from "./evidence-ledger-v17.ts";
export { evidenceFundCapacityV17, evidenceCapacityValidV17 } from "./destination-evidence-capacity-v17.ts";
import { classify } from "./extents.ts";
import { branchOf, destinationRulesScope, destinationStageConfirmedV17 } from "./destination.ts";
import { EVIDENCE_LIMITS_V17, assessEvidenceV17, evidenceKeyDigestV17, newEvidenceIndexV17, readEvidenceCountsV17, readEvidenceIndexV17, releaseEvidenceCandidateV17, reserveEvidenceCandidateV17, reserveEvidenceCountsV17, settleEvidenceCandidateV17, type EvidenceCandidateV17, type EvidenceCountsV17, type EvidenceIndexRecordV17 } from "./evidence-index-v17.ts";
import { decideEvidenceIncidentV17, effectiveEvidenceHoldV17, evidenceTriagersV17, failEvidenceHoldV17, newEvidenceHoldV17, passEvidenceHoldV17, readEvidenceHoldKeyV17, readEvidenceHoldV17, readEvidenceIncidentV17, releaseEvidenceHoldV17, reserveEvidenceIncidentV17, type EvidenceFailureV17, type EvidenceHoldKeyV17, type EvidenceHoldRecordV17, type EvidenceIncidentV17 } from "./evidence-holds-v17.ts";
import { evidenceSourceV17, judgeListEligibilityV17, judgeReservationV17, readRulesPolicyObservationV17, type ReservationPolicyViewV17 } from "./reservation-v17.ts";
import { RULES_EXTENTS_VALUE_V13, checkHoldsV13, checkReuseV13, checkSourceV13, checkStageV13, readRulesPolicyV13, readServiceMarkV13, type RulesCheckV13 } from "./rules-policy-v13.ts";
import { certifiedPublicationStateV17, certifiedPublicationStateWireV17, certifiedPublicationWireV17, CERTIFIED_PUBLICATION_TEXT_BYTES_V17, certifiedReservationBudgetV17, evidenceCarryingBudgetV17, type CertifiedGenerationV17 } from "./destination-budget-v17.ts";
import { evidenceWireV17, readEvidenceWireV17 } from "./evidence-wire-v17.ts";
import { evidenceOperationOpeningV17 } from "./evidence-opening-v17.ts";
import type { DestinationSuccessorV17 } from "./destination.ts";
import { platformFloorReferences } from "./floor.ts";
import { readRulesCertificateDeclinedV17 } from "./rules-certificate-v17.ts";
import { type EvidenceKeyV17 } from "./evidence-index-v17.ts";

export const EVIDENCE_ADMIT_V17 = "evidence-admit";
export const EVIDENCE_RESULT_V17 = "evidence-result";
export const EVIDENCE_NOTICE_V17 = "evidence-notice";
export const EVIDENCE_PROGRESS_V17 = "evidence-progress";
export const WORK_COMMIT_PROOF_V17 = { domain: "artroom-work-commit-1", max: 49152 } as const;
export const EVIDENCE_BINDING_TEXT_V17 = 16384;
export const EVIDENCE_RECORD_BYTES_V17 = 196608;
export const EVIDENCE_SERVICE_BYTES_V17 = 16384;
const exact = (value: unknown, names: readonly string[]): value is Record<string, unknown> => isRecord(value)
  && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const natural = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
const same = (left: unknown, right: unknown): boolean => left !== undefined && right !== undefined && equalCanonical(left, right);
const copy = <T>(value: T): T => parseStrict(canonicalize(value)) as T;
export const evidenceJobKeyV17 = (job: FactRef): Digest => textDigest(canonicalize({ domain: "artroom-evidence-job-1", job }));
export const evidenceUnusedKeyV17 = (job: FactRef, index: string): Digest => textDigest(canonicalize({ domain: "artroom-evidence-unused-1", index, job }));
export const evidencePolicyKeyV17 = (generation: ScopedRulesPosition): Digest => textDigest(canonicalize({ domain: "artroom-evidence-policy-1", generation }));
export const evidenceAuditKeyV17 = (job: FactRef): Digest => textDigest(canonicalize({ domain: "artroom-evidence-audit-1", job }));
export const evidenceHoldOwnerKeyV17 = (binding: EvidenceBinding, name: string, configuration: Digest): Digest => textDigest(canonicalize({ domain: "artroom-evidence-hold-owner-1", generation: binding.policyGeneration, name, configuration, source: binding.source, stage: binding.stage }));

export function readBindingTextV17(value: unknown, digest?: unknown): EvidenceBinding | null {
  try {
    if (typeof value !== "string" || value.length > EVIDENCE_BINDING_TEXT_V17 || utf8(value).length > EVIDENCE_BINDING_TEXT_V17) return null;
    const parsed = parseStrict(value), binding = readEvidenceBinding(parsed);
    return binding && canonicalize(parsed) === value && (digest === undefined || evidenceBindingDigest(binding) === digest) ? binding : null;
  } catch { return null; }
}
export interface EvidenceJobRecordV17 {
  v: 1; job: FactRef; name: string; configuration: Digest; binding: EvidenceBinding; bindingDigest: Digest;
  state: "pending" | "admitted" | "reused" | "refused" | "passed" | "failed" | "error" | "timeout" | "unknown";
  admittedAt: number | null; commit: string | null; tree: string | null; base: string | null;
  sourceFacts: readonly FactRef[]; commitProof: Digest | null; policy: ReservationPolicyViewV17 | null;
  reuseOwner: number | null; reuse: EvidenceIndexRecordV17 | null;
  holdOwner: number | null; holds: readonly EvidenceHoldRecordV17[]; policyOwner: number | null;
  incident: EvidenceIncidentV17 | null; result: FactRef | null; signer: KeyId | null;
  decidedAt: number | null; reason: string | null; observedGeneration: ScopedRulesPosition | null;
  funded: { reuse: boolean; holds: boolean; policy: boolean; incident: boolean };
  countedJob: FactRef | null;
  reuseRequested: boolean;
  deadline: Timestamp;
  forJob: FactRef | null;
  noticeAt: number | null;
  holder: number;
  requestAt: number;
  covered: readonly EvidenceHoldKeyV17[];
}
const RECORD_FIELDS = ["v", "job", "name", "configuration", "binding", "bindingDigest", "state", "admittedAt", "commit", "tree", "base", "sourceFacts", "commitProof", "policy", "reuseOwner", "reuse", "holdOwner", "holds", "policyOwner", "incident", "result", "signer", "decidedAt", "reason", "observedGeneration", "funded", "countedJob", "reuseRequested", "deadline", "forJob", "noticeAt", "holder", "requestAt", "covered"];
export function readEvidenceJobRecordV17(value: unknown): EvidenceJobRecordV17 | null {
  try {
    if (!exact(value, RECORD_FIELDS) || value["v"] !== 1 || !isFactRef(value["job"]) || value["job"].at.kind !== "lane"
      || typeof value["name"] !== "string" || value["name"].length > 128 || utf8(value["name"]).length > 128 || !isDigest(value["configuration"])
      || !["pending", "admitted", "reused", "refused", "passed", "failed", "error", "timeout", "unknown"].includes(String(value["state"])) || typeof value["reuseRequested"] !== "boolean" || timeMs(value["deadline"]) === null
      || !natural(value["requestAt"]) || !natural(value["holder"]) || !["admittedAt", "reuseOwner", "holdOwner", "policyOwner", "decidedAt", "noticeAt"].every(field => value[field] === null || natural(value[field]))
      || !["commit", "tree", "base"].every(field => value[field] === null || isObjectId(value[field]))
      || !Array.isArray(value["sourceFacts"]) || value["sourceFacts"].length > 32 || !value["sourceFacts"].every(isFactRef)
      || !(value["commitProof"] === null || isDigest(value["commitProof"])) || !(value["result"] === null || isFactRef(value["result"]))
      || !(value["signer"] === null || isKeyId(value["signer"])) || !(value["countedJob"] === null || isFactRef(value["countedJob"])) || !(value["forJob"] === null || isFactRef(value["forJob"])) || !(value["reason"] === null || typeof value["reason"] === "string" && utf8(value["reason"]).length <= 1024)
      || !Array.isArray(value["holds"]) || value["holds"].length > 8 || value["holds"].some(hold => readEvidenceHoldV17(hold) === null)
      || !Array.isArray(value["covered"]) || value["covered"].length > 8 || value["covered"].some(key => readEvidenceHoldKeyV17(key) === null)
      || value["reuse"] !== null && readEvidenceIndexV17(value["reuse"]) === null || value["incident"] !== null && readEvidenceIncidentV17(value["incident"]) === null
      || !exact(value["funded"], ["reuse", "holds", "policy", "incident"]) || Object.values(value["funded"]).some(value => typeof value !== "boolean")) return null;
    const binding = readEvidenceBinding(value["binding"]);
    if (!binding || evidenceBindingDigest(binding) !== value["bindingDigest"] || utf8(canonicalize(value)).length > EVIDENCE_RECORD_BYTES_V17) return null;
    const keys = [...value["covered"], ...value["holds"].map(hold => (hold as EvidenceHoldRecordV17).key)] as EvidenceHoldKeyV17[];
    if (keys.some(key => binding.stage !== "published" || !same(key.generation, binding.policyGeneration) || key.name !== value["name"]
      || key.configuration !== value["configuration"] || key.source !== binding.source)
      || new Set(value["covered"].map(canonicalize)).size !== value["covered"].length
      || new Set(value["holds"].map(hold => canonicalize((hold as EvidenceHoldRecordV17).key))).size !== value["holds"].length) return null;
    if (value["observedGeneration"] !== null && (!exact(value["observedGeneration"], ["rules", "seq"]) || !isScopeRef(value["observedGeneration"]["rules"])
      || value["observedGeneration"]["rules"].kind !== "rules" || !natural(value["observedGeneration"]["seq"]))) return null;
    if (value["state"] !== "pending" && value["state"] !== "refused" && (value["admittedAt"] === null || value["commit"] === null || value["tree"] === null || value["base"] === null || value["policy"] === null)) return null;
    const policy = value["policy"];
    if (policy !== null && (!exact(policy, ["rules", "head", "revision", "proposal", "certificate", "policy", "serviceGeneration"])
      || !isScopeRef(policy["rules"]) || policy["rules"].kind !== "rules" || !isHead(policy["head"]) || !natural(policy["revision"]) || policy["revision"] > policy["head"].seq
      || !isDigest(policy["proposal"]) || !readRulesPolicyV13(policy["policy"]).ok
      || !exact(policy["certificate"], ["request", "certificate", "proof", "commit"]) || !isFactRef(policy["certificate"]["request"]) || !isFactRef(policy["certificate"]["certificate"])
      || !isDigest(policy["certificate"]["proof"]) || !isObjectId(policy["certificate"]["commit"])
      || !exact(policy["serviceGeneration"], ["rules", "seq"]) || !same(policy["serviceGeneration"]["rules"], policy["rules"])
      || !natural(policy["serviceGeneration"]["seq"]) || policy["serviceGeneration"]["seq"] > policy["revision"])) return null;
    return copy({ ...value, binding } as unknown as EvidenceJobRecordV17);
  } catch { return null; }
}
export function readEvidenceJobRecordWireV17(value: unknown): EvidenceJobRecordV17 | null {
  const read = readEvidenceWireV17(value, EVIDENCE_RECORD_BYTES_V17);
  return read.ok ? readEvidenceJobRecordV17(read.value) : null;
}
export function evidenceJobRecordWireV17(record: EvidenceJobRecordV17): string {
  if (!readEvidenceJobRecordV17(record)) throw Error("The evidence record is malformed");
  return evidenceWireV17(record, EVIDENCE_RECORD_BYTES_V17);
}
export interface EvidenceServiceV17 { mark: EvidenceBinding["roomService"]; generation: ScopedRulesPosition }
export function readEvidenceServiceWireV17(value: unknown): EvidenceServiceV17 | null {
  const read = readEvidenceWireV17(value, EVIDENCE_SERVICE_BYTES_V17), parsed = read.ok ? read.value : null;
  if (!exact(parsed, ["mark", "generation"]) || !exact(parsed["generation"], ["rules", "seq"]) || !isScopeRef(parsed["generation"]["rules"])
    || parsed["generation"]["rules"].kind !== "rules" || !natural(parsed["generation"]["seq"])) return null;
  const mark = readServiceMarkV13(parsed["mark"]);
  return mark.ok ? { mark: mark.mark, generation: parsed["generation"] as unknown as ScopedRulesPosition } : null;
}
export function evidenceRowV17(state: StateView, job: FactRef): { item: Item; record: EvidenceJobRecordV17 } | null {
  const found = state.lookup("evidence-job", "jobKey", canonicalize(evidenceJobKeyV17(job)), 2);
  if (!found || found.length !== 1) return null;
  const item = state.item(found[0]!), record = item && readEvidenceJobRecordWireV17(item.values["record"]);
  return item && item.type === "evidence-job" && record && same(record.job, job) ? { item, record: currentEvidenceRecordV17(item, record) } : null;
}
/** Literal TIMED changes the job alone. The immutable admission record is
 * decoded first; this current-state view is never substituted in its proof. */
export function currentEvidenceRecordV17(item: Pick<Item, "id" | "state" | "refs" | "values">, record: EvidenceJobRecordV17): EvidenceJobRecordV17 {
  if (!item.state.endsWith("-timedout") || record.state !== "admitted") return record;
  const deciding = item.refs["timeoutDecision"];
  const position = typeof deciding === "number" ? deciding : isFactRef(deciding) ? deciding.seq : null;
  if (position === null || !natural(position) || item.values["timeoutReason"] !== "check-timeout" || position <= item.id) throw Error("The literal timeout record is unavailable");
  return { ...record, state: "timeout", reason: "check-timeout", decidedAt: position };
}
export function evidenceOwnerV17(state: StateView, slot: "reuseKey" | "holdKey" | "policyKey", key: Digest): { item: Item; record: EvidenceJobRecordV17 } | null {
  const found = state.lookup("evidence-job", slot, canonicalize(key), 2);
  if (!found || found.length > 1) throw Error("Evidence index is unavailable");
  if (!found.length) return null;
  const item = state.item(found[0]!), record = item && readEvidenceJobRecordWireV17(item.values["record"]);
  if (!item || !record) throw Error("Evidence index record is unavailable");
  return { item, record: currentEvidenceRecordV17(item, record) };
}
export function destinationEvidencePending(state: StateView, own: Own, operation: Operation): { job: FactRef } | null {
  if (operation.owner !== "platform:destination@17" || operation.kind !== EVIDENCE_ADMIT_V17 || operation.most !== 1 || operation.for === undefined) return null;
  const id = operationRecordId(state, own, operation), item = id === null ? null : state.item(id), record = item && readEvidenceJobRecordWireV17(item.values["record"]), opened = own(Number(operation.id.split(":")[0]));
  return item && ["evidence-request", "evidence-slot"].includes(item.type) && item.state === "pending" && record?.state === "pending" && record.holder === operation.for && opened && evidenceOperationOpeningV17(opened.entry, operation)
    ? { job: copy(record.job) } : null;
}
export function destinationEvidenceResultPending(state: StateView, own: Own, operation: Operation): { job: FactRef } | null {
  if (operation.owner !== "platform:destination@17" || operation.kind !== EVIDENCE_RESULT_V17 || operation.most !== 1 || operation.for === undefined) return null;
  const id = operationRecordId(state, own, operation), item = id === null ? null : state.item(id), record = item && readEvidenceJobRecordWireV17(item.values["record"]), opened = own(Number(operation.id.split(":")[0]));
  const input = opened?.entry.input, body = input?.type === "delivery" && input.message.class === "request" ? input.message.body : null;
  const fields = isRecord(body) && ["checked", "work-checked"].includes(String(body["message"])) && isRecord(body["fields"]) ? body["fields"] : null;
  return record && record.holder === operation.for && record.admittedAt !== null && fields && same(fields["job"], record.job) && isFactRef(fields["result"])
    && evidenceOperationOpeningV17(opened!.entry, operation)
    ? { job: copy(record.job) } : null;
}
export function destinationEvidenceNoticePending(state: StateView, own: Own, operation: Operation): { job: FactRef } | null {
  if (operation.owner !== "platform:destination@17" || operation.kind !== EVIDENCE_NOTICE_V17 || operation.most !== 1 || operation.for === undefined) return null;
  const id = operationRecordId(state, own, operation), item = id === null ? null : state.item(id), record = item && readEvidenceJobRecordWireV17(item.values["record"]), opened = own(Number(operation.id.split(":")[0]));
  return record?.admittedAt !== null && record?.incident?.cause && opened && evidenceOperationOpeningV17(opened.entry, operation) ? { job: copy(record.job) } : null;
}
export function destinationEvidenceProgressPending(state: StateView, own: Own, operation: Operation): { job: FactRef } | null {
  if (operation.owner !== "platform:destination@17" || operation.kind !== EVIDENCE_PROGRESS_V17 || operation.most !== 1) return null;
  const id = operationRecordId(state, own, operation), record = id === null ? null : readEvidenceJobRecordWireV17(state.item(id)?.values["record"]);
  const opened = own(Number(operation.id.split(":")[0]))?.entry;
  return record && record.holder === operation.for && record.admittedAt !== null && record.binding.stage === "landing" && opened?.input.type === "outcome"
    && opened.input.owner === "platform:destination@17" && [EVIDENCE_ADMIT_V17, EVIDENCE_RESULT_V17].includes(opened.input.kind)
    && evidenceOperationOpeningV17(opened, operation)
    ? { job: record.job } : null;
}
export interface EvidenceJobAdmissionV17 {
  job: FactRef; binding: EvidenceBinding; bindingDigest: Digest; commit: string; tree: string; base: string;
  sourceFacts: readonly FactRef[]; admission: FactRef;
}
export function destinationEvidenceJob(state: StateView, own: Own, job: FactRef): EvidenceJobAdmissionV17 | null {
  const row = evidenceRowV17(state, job), record = row?.record;
  if (!row || !record || record.admittedAt === null || record.state === "pending" || record.state === "refused" || !record.commit || !record.tree || !record.base) return null;
  const sealed = own(record.admittedAt);
  if (!sealed || entryHash(sealed.entry) !== sealed.hash || sealed.entry.input.type !== "outcome" || sealed.entry.input.owner !== "platform:destination@17"
    || sealed.entry.input.kind !== EVIDENCE_ADMIT_V17 || sealed.entry.input.attempt !== 1 || sealed.entry.input.result !== "confirmed"
    || !sealed.entry.effects.some(effect => effect.effect === "attempt" && effect.selected === true)
    || row.item.id !== sealed.entry.seq || !sealed.entry.effects.some(effect => effect.effect === "open" && effect.item === sealed.entry.seq && effect.type === "evidence-job")
    || !sealed.entry.effects.some(effect => effect.effect === "value" && effect.item === row.item.id && effect.slot === "record" && same(readEvidenceJobRecordWireV17(effect.value)?.job, job))) return null;
  return copy({ job, binding: record.binding, bindingDigest: record.bindingDigest, commit: record.commit, tree: record.tree, base: record.base,
    sourceFacts: record.sourceFacts, admission: { at: sealed.entry.at, seq: sealed.entry.seq, hash: sealed.hash } });
}
export function destinationEvidenceAdmissionCurrent(state: StateView, own: Own, admitted: EvidenceJobAdmissionV17, signerKey: KeyId): boolean {
  const actual = destinationEvidenceJob(state, own, admitted.job), row = evidenceRowV17(state, admitted.job);
  if (!actual || !row || !same(actual, admitted) || !["admitted", "timeout", "unknown"].includes(row.record.state)) return false;
  if (admitted.binding.source === "member") return true; // The host separately proves this key's current configured member standing.
  const current = readEvidenceServiceWireV17(evidenceLedgerOfV17(state)?.values["service"]);
  return current !== null && same(current.generation, admitted.binding.serviceGeneration)
    && same(current.mark, admitted.binding.roomService) && admitted.binding.roomService?.key === signerKey;
}
export function evidencePolicyV17(given: RuleGiven): ReservationPolicyViewV17 | null {
  const observation = given.observed({ asked: "rules" })?.observation, rules = destinationRulesScope(given.state);
  if (!rules || !observation || !("subject" in observation) || observation.subject !== "rules" || observation.content.asked !== "rules"
    || observation.of.scope !== rules.scope || "inc" in rules && observation.of.inc !== rules.inc || !observation.content.extents) return null;
  const extents = given.value(RULES_EXTENTS_VALUE_V13.domain, observation.content.extents, RULES_EXTENTS_VALUE_V13.max);
  const read = readRulesPolicyObservationV17(observation, { rules: observation.of, destination: given.resolved.at, extents }, given.time);
  return read.ok ? read.view : null;
}
export function evidenceCountsV17(state: StateView): EvidenceCountsV17 {
  const ledger = evidenceLedgerOfV17(state), result = ledger && readEvidenceCountsV17(ledger.values["counts"]);
  if (!result) throw Error("Evidence capacity counters are unavailable");
  return result;
}
export const evidenceRecordEffectV17 = (item: number, record: EvidenceJobRecordV17): RuleEffect => ({ effect: "value", item, slot: "record", value: evidenceJobRecordWireV17(record) });
export function workCommitV17(value: unknown, commit: string): { commit: string; tree: string; base: string } | null {
  try {
    if (!exact(value, ["v", "id", "data"]) || value["v"] !== 1 || value["id"] !== commit || !isObjectId(commit) || typeof value["data"] !== "string"
      || value["data"].length > 43692 || utf8(canonicalize(value)).length > WORK_COMMIT_PROOF_V17.max || !/^[A-Za-z0-9_-]*$/.test(value["data"])) return null;
    const data = unb64url(value["data"]);
    if (!data || data.length > 32768 || idOf("commit", data) !== commit) return null;
    const parsed = parseCommit(data), base = parsed.parents[0];
    return base ? { commit, tree: parsed.tree, base } : null;
  } catch { return null; }
}
/** An actual literal job TIME is the cause, even before a normal entry
 * materializes its incident. No callback time or guessed self hash enters. */
function literalTimeoutCause(state: StateView, own: Own, row: { item: Item; record: EvidenceJobRecordV17 }): EvidenceFailureV17 | null {
  const { item, record } = row, reference = item.refs["timeoutDecision"];
  const position = typeof reference === "number" ? reference : isFactRef(reference) ? reference.seq : null;
  if (position === null) return null;
  const scope = state.scope(), sealed = own(position), input = sealed?.entry.input;
  const subject = record.binding.subject;
  if (!scope || subject.kind !== "published" || !record.commit || record.admittedAt !== item.id || item.values["timeoutReason"] !== "check-timeout"
    || !sealed || entryHash(sealed.entry) !== sealed.hash || !same(sealed.entry.at, scope.at) || input?.type !== "timed" || input.item !== item.id
    || !["evidence-job-deadline", "evidence-reuse-deadline", "evidence-hold-deadline"].includes(input.rule) || input.due !== record.deadline
    || isFactRef(reference) && !same(reference, { at: scope.at, seq: position, hash: sealed.hash })
    || !sealed.entry.effects.some(effect => effect.effect === "state" && effect.item === item.id && effect.state.endsWith("-timedout"))
    || !sealed.entry.effects.some(effect => effect.effect === "value" && effect.item === item.id && effect.slot === "timeoutReason" && effect.value === "check-timeout")
    || !sealed.entry.effects.some(effect => effect.effect === "ref" && effect.item === item.id && effect.slot === "timeoutDecision" && effect.to === position)
    || !destinationEvidenceJob(state, own, record.job)) throw new RuleFault("The literal timeout cause is unavailable");
  return { job: record.job, publication: subject.publication, commit: record.commit, order: { publication: subject.publication.seq, job: item.id },
    decidedAt: position, kind: "timeout", reason: "check-timeout", result: null };
}
/** The same pure current hold view serves Native admission and its witness. */
export function evidenceEffectiveHoldV17(state: StateView, own: Own, owner: Item, hold: EvidenceHoldRecordV17) {
  const record = readEvidenceJobRecordWireV17(owner.values["record"]), capacity = record?.policyOwner === null || record?.policyOwner === undefined ? null
    : readEvidenceCapacityWireV17(state.item(record.policyOwner)?.values["capacity"]);
  const indexed = capacity?.holds?.find(row => same(row.key, hold.key) && row.owner === owner.id);
  if (!record || !capacity || !indexed || !same(capacity.generation, hold.key.generation)) return { ok: false as const, reason: "assessment-unavailable" as const };
  return effectiveEvidenceHoldV17(hold, indexed.pending, slot => {
    const row = slot.job === null ? null : evidenceRowV17(state, slot.job), subject = row?.record.binding.subject;
    if (!row || row.item.id !== slot.admittedAt || subject?.kind !== "published" || !same(subject.publication, slot.publication)
      || row.record.policyOwner !== capacity.owner || !row.record.covered.some(key => same(key, hold.key))) return "unavailable";
    return row.item.state.endsWith("-timedout") || row.record.state === "timeout" ? literalTimeoutCause(state, own, row) : null;
  });
}
function firstEvidenceBlock(given: RuleGiven, paths: readonly string[]): EvidenceFailureV17 | null {
  const page = given.state.page("evidence-job", ["hold-anchor", "hold-anchor-timedout"], null, EVIDENCE_LIMITS_V17.holds + 1);
  if (page.more) throw Error("Evidence anchor index exceeded its capacity");
  let holds = 0;
  for (const item of page.items) {
    const record = readEvidenceJobRecordWireV17(item.values["record"]); if (!record) throw Error("Evidence anchor is malformed");
    for (const hold of record.holds) {
      if (++holds > EVIDENCE_LIMITS_V17.holds) throw Error("Evidence hold index exceeded its capacity");
      const owner = record.policyOwner === null ? null : given.state.item(record.policyOwner), policy = readEvidenceBatchWireV17(owner?.values["batch"])?.policy;
      const extent = policy?.policy.extents.find(extent => extent.name === hold.key.extent);
      if (!extent) throw Error("The held policy extent is unavailable");
      if (!classify(policy!.policy.extents, paths, []).touched.some(row => row.extent === extent.name)) continue;
      const effective = evidenceEffectiveHoldV17(given.state, given.own, item, hold);
      if (!effective.ok) throw new RuleFault("The bounded hold assessment is unavailable");
      if (effective.active) return effective.cause;
    }
  }
  return null;
}
export const evidenceBlocksV17 = (given: RuleGiven, paths: readonly string[]): boolean => firstEvidenceBlock(given, paths) !== null;

const foreign = (given: RuleGiven, fact: FactRef): Entry | null => {
  const copy = given.uses.find(copy => same(copy.fact, fact));
  return copy && isEntryOf(copy.entry, fact) ? copy.entry : null;
};
const local = (given: RuleGiven, fact: FactRef): Entry | null => {
  const sealed = same(fact.at, given.resolved.at) ? given.own(fact.seq) : null;
  return sealed && sealed.hash === fact.hash && isEntryOf(sealed.entry, fact) ? sealed.entry : null;
};
const effectValue = (entry: Entry, slot: string, item = entry.seq): unknown => {
  const rows = entry.effects.filter(effect => effect.effect === "value" && effect.item === item && effect.slot === slot);
  return rows.length === 1 && rows[0]!.effect === "value" ? rows[0]!.value : undefined;
};
const effectRef = (entry: Entry, slot: string, item = entry.seq): unknown => {
  const rows = entry.effects.filter(effect => effect.effect === "ref" && effect.item === item && effect.slot === slot);
  return rows.length === 1 && rows[0]!.effect === "ref" ? rows[0]!.to : undefined;
};
const refIs = (entry: Entry, slot: string, fact: FactRef): boolean => {
  const value = effectRef(entry, slot);
  return isFactRef(value) ? same(value, fact) : value === fact.seq && same(entry.at, fact.at);
};
function proposed(given: RuleGiven): EvidenceJobRecordV17 | null {
  const job = given.resolved.fields["job"], binding = readBindingTextV17(given.resolved.fields["binding"], given.resolved.fields["bindingDigest"]);
  if (given.input.type !== "delivery" || !isFactRef(job) || !same(given.input.from, job) || !binding || typeof given.resolved.fields["name"] !== "string") return null;
  const entry = foreign(given, job);
  if (!entry || !entry.effects.some(effect => effect.effect === "open" && effect.item === job.seq && effect.type === "job")
    || effectValue(entry, "name") !== given.resolved.fields["name"] || effectValue(entry, "binding") !== given.resolved.fields["binding"]
    || effectValue(entry, "bindingDigest") !== given.resolved.fields["bindingDigest"] || effectValue(entry, "stage") !== binding.stage
    || !same(effectRef(entry, "destination"), given.resolved.at)) return null;
  const checkers = entry.effects.filter(effect => effect.effect === "party" && effect.item === job.seq && effect.slot === "checker");
  if (checkers.length !== 1 || checkers[0]!.effect !== "party" || !same(checkers[0]!.member, binding.checker)) return null;
  if (binding.subject.kind === "work" ? !refIs(entry, "workSource", binding.subject.source) : !refIs(entry, "manifest", binding.subject.manifest)) return null;
  const configuration = effectValue(entry, "configuration"), deadline = effectValue(entry, "deadline");
  if (!isDigest(configuration) || timeMs(deadline) === null) return null;
  if (entry.input.type === "act") {
    if (!["request-check", "request-work-check"].includes(entry.input.signed.intent.kind) || !same(entry.input.signed.intent.to, job.at)
      || binding.stage === "published" || binding.auditOf !== null || effectValue(entry, "stage") !== binding.stage) return null;
  } else if (entry.input.type !== "delivery" || entry.input.message.class !== "request" || !same(entry.input.from.at, given.resolved.at)
    || !isRecord(entry.input.message.body) || entry.input.message.body["message"] !== (binding.auditOf ? "admit-audit-check" : "admit-published-check")
    || binding.auditOf === null && binding.stage !== "published" || binding.auditOf !== null && binding.stage !== "landing") return null;
  const sourceFacts: FactRef[] = binding.subject.kind === "work" ? [binding.subject.source]
    : binding.subject.kind === "landing" ? [binding.subject.publication, binding.subject.manifest]
      : [binding.subject.publication, binding.subject.receipt, binding.subject.written, binding.subject.manifest];
  const birth = given.own(0); if (!birth) return null;
  sourceFacts.push({ at: given.resolved.at, seq: 0, hash: birth.hash });
  if (entry.input.type === "delivery") sourceFacts.push(entry.input.from);
  const commit = effectValue(entry, "commit"), tree = effectValue(entry, "tree"), base = effectValue(entry, "base");
  const forJob = given.resolved.fields["forJob"];
  if (binding.auditOf !== null && !isFactRef(forJob) || binding.auditOf === null && forJob !== undefined) return null;
  if (binding.auditOf && (!refIs(entry, "auditOf", binding.auditOf) || !refIs(entry, "forJob", forJob as FactRef))) return null;
  if (isFactRef(forJob)) sourceFacts.push(forJob);
  return readEvidenceJobRecordV17({ v: 1, job, name: given.resolved.fields["name"], configuration, binding, bindingDigest: evidenceBindingDigest(binding),
    state: "pending", admittedAt: null, commit: isObjectId(commit) ? commit : null, tree: isObjectId(tree) ? tree : null, base: isObjectId(base) ? base : null,
    sourceFacts, commitProof: null, policy: null, reuseOwner: null, reuse: null, holdOwner: null, holds: [], policyOwner: null,
    incident: null, result: null, signer: null, decidedAt: null, reason: null, observedGeneration: null,
    funded: { reuse: false, holds: false, policy: false, incident: false }, countedJob: null, reuseRequested: given.resolved.fields["reuse"] === true, deadline, forJob: forJob ?? null, noticeAt: null,
    requestAt: given.resolved.self, covered: [], holder: binding.stage === "work" ? given.resolved.self : given.resolved.subjects.get("also.batch")?.id });
}
export function evidenceSubjectV17(given: RuleGiven, record: EvidenceJobRecordV17): { commit: string; tree: string; base: string; proof: Digest | null } | null {
  const subject = record.binding.subject;
  if (subject.kind === "work") {
    const source = foreign(given, subject.source), job = foreign(given, record.job);
    if (!source || source.input.type !== "act" || source.input.signed.intent.kind !== "stage-work" || !same(source.at, record.job.at)
      || !source.effects.some(effect => effect.effect === "open" && effect.item === source.seq && effect.type === "work-source")) return null;
    const fields = source.input.signed.intent.fields, commit = fields["commit"];
    const pin = source.effects.filter(effect => effect.effect === "record" && effect.capability === "hold@1" && effect.kind === "pin" && effect.state === "held");
    if (!isObjectId(commit) || pin.length !== 1 || pin[0]!.effect !== "record" || pin[0]!.values["admitted"] !== source.seq || pin[0]!.values["commit"] !== commit
      || !same(pin[0]!.key[0], source.at) || !source.input.authority.some(grant => grant.actions.includes("issue.work"))) return null;
    const proofText = job?.input.type === "act" ? job.input.signed.intent.fields["commitProof"] : null;
    if (typeof proofText !== "string" || proofText.length > WORK_COMMIT_PROOF_V17.max || utf8(proofText).length > WORK_COMMIT_PROOF_V17.max) return null;
    try {
      const proof = parseStrict(proofText); if (canonicalize(proof) !== proofText) return null;
      const read = workCommitV17(proof, commit); return read ? { ...read, proof: textDigest(proofText) } : null;
    } catch { return null; }
  }
  const opening = local(given, subject.publication), publication = given.state.item(subject.publication.seq), manifest = foreign(given, subject.manifest);
  if (!opening || !publication || publication.type !== "publication" || !manifest || !same(publication.refs["manifest"], subject.manifest)
    || !same(publication.refs["lane"], record.job.at) || manifest.input.type !== "act") return null;
  const commit = publication.values["integration"], tree = publication.values["tree"], base = manifest.input.signed.intent.fields["base"];
  if (!isObjectId(commit) || !isObjectId(tree) || !isObjectId(base) || record.commit !== commit || record.tree !== tree || record.base !== base) return null;
  if (subject.kind === "landing") return publication.state === "reserved" ? { commit, tree, base, proof: null } : null;
  const receiptEntry = local(given, subject.receipt), written = local(given, subject.written), receipt = given.state.item(subject.receipt.seq);
  if (!receiptEntry || !written || !receipt || receipt.type !== "receipt" || receipt.state !== "written"
    || receipt.refs["publication"] !== publication.id && receipt.values["publication"] !== publication.id
    || receipt.values["commit"] !== commit || written.input.type !== "outcome" || written.input.owner !== "platform:destination@17"
    || !["receipt", "read"].includes(written.input.kind)
    || !written.effects.some(effect => effect.effect === "state" && effect.item === receipt.id && effect.state === "written")) return null;
  return { commit, tree, base, proof: null };
}

const FACT_CHANGE_JOB = { type: "fact" as const, kind: ["request-check", "admit-published-check", "admit-audit-check"], under: "change", required: true };
const FACT_ISSUE_JOB = { type: "fact" as const, kind: ["request-work-check"], under: "issue", required: true };
const fenceFields = { name: { type: "text" as const, max: 128, required: true }, binding: { type: "text" as const, max: EVIDENCE_BINDING_TEXT_V17, required: true }, bindingDigest: { type: "digest" as const, required: true }, reuse: { type: "bool" as const, required: false } };
export function evidenceDestinationDataV17(base: PlatformData): PlatformData {
  const deadline = (state: string): PlatformData["timed"][string] => ({ on: "evidence-job", states: [state], deadline: "deadline",
    effects: [{ state: `${state}-timedout` }, { value: { slot: "timeoutReason", from: { const: "check-timeout" } } },
      { ref: { slot: "timeoutDecision", from: "self" } }, { value: { slot: "deadline", from: null } }], attention: [] });
  const publicationBinding = { item: "publication", code: "evidence-publication-v17", row: "E1" };
  const admittedJob = { item: "evidence-job", code: "evidence-admitted-job-v17", row: "E2" };
  const fence = (work: boolean): PlatformData["receives"][string] => ({ message: work ? "work-check-fence" : "check-fence", class: "tell", from: { kind: "lane", under: work ? "issue" : "change" }, opens: work ? "evidence-request" : null,
    also: work ? {} : { publication: publicationBinding },
    ...(!work ? { bound: { of: "also.publication" as const, where: [{ equals: { a: { sender: true as const }, b: { slot: "lane", of: "also.publication" as const } } }] } } : {}),
    fields: { ...fenceFields, job: work ? FACT_ISSUE_JOB : FACT_CHANGE_JOB,
      ...(work ? { source: { type: "fact" as const, kind: ["stage-work"], under: "issue", required: true }, configuration: { type: "digest" as const, required: true }, commitProof: { type: "text" as const, max: WORK_COMMIT_PROOF_V17.max, required: true } }
        : { operation: { type: "fact" as const, kind: ["merge"], under: "change", required: true }, manifest: { type: "fact" as const, kind: ["propose-manifest", "propose-file"], under: "change", required: true }, earlier: { ...FACT_CHANGE_JOB, required: false }, forJob: { ...FACT_CHANGE_JOB, required: false } }) },
    guards: [{ code: "evidence-fence-v17", row: "E1" }], effects: [{ code: "evidence-open-v17", row: "E1", most: { effects: 5, operations: [EVIDENCE_ADMIT_V17], ...(!work ? { opens: "evidence-slot" } : {}) } }], sends: [], attention: [] });
  const release = (transition: boolean): PlatformData["acts"][string] => ({ step: "transition", on: "evidence-job", grant: "issue.triage", also: {},
    fields: { extent: { type: "text", max: 64, required: true }, job: FACT_CHANGE_JOB, reason: { type: "text", max: 1024, required: true },
      ...(transition ? { generation: { type: "text" as const, max: 1024, required: true } } : {}) },
    guards: [{ code: "evidence-release-v17", row: "E4" }], effects: [{ code: "evidence-release-record-v17", row: "E4", most: { effects: 2 } }], sends: [], attention: [],
    observes: [{ of: "rules", window: 10, use: "once", retains: [RULES_EXTENTS_VALUE_V13] }] });
  const checked = (work: boolean): PlatformData["receives"][string] => ({ message: work ? "work-checked" : "checked", class: "tell", from: { kind: "lane", under: work ? "issue" : "change" }, opens: null,
    also: { job: admittedJob, ...(work ? { request: { item: "evidence-request", index: "job", key: "job", code: "evidence-holder-v17", row: "E2" } } : { publication: publicationBinding }) },
    fields: { admission: { type: "fact", kind: ["platform:destination@17:evidence-admit"], under: "platform:destination", required: true },
      job: work ? FACT_ISSUE_JOB : FACT_CHANGE_JOB, ...(!work ? { operation: { type: "fact" as const, kind: ["merge"], under: "change", required: true } } : {}),
      result: { type: "fact", kind: ["check", "check-error"], under: work ? "issue" : "change", required: true }, bindingDigest: { type: "digest", required: true } },
    bound: { of: work ? "also.request" : "also.publication", where: [{ equals: { a: { sender: true }, b: { slot: "lane", of: work ? "also.request" : "also.publication" } } }] },
    guards: [{ code: "evidence-result-bound-v17", row: "E2" }], effects: [{ code: "evidence-result-open-v17", row: "E2", most: { effects: 2, operations: [EVIDENCE_RESULT_V17] } }], sends: [], attention: [] });
  return { ...base, capacity: { name: "whole-scope", version: 1 }, items: { ...base.items,
    branch: { ...base.items["branch"]!, refs: { ...base.items["branch"]!.refs,
      evidenceLedger: { fixed: false, required: false, to: { type: "item", of: "evidence-ledger" } } } },
    "evidence-ledger": EVIDENCE_LEDGER_ITEM_V17,
    "evidence-request": { many: true, max: 2048, initial: "pending", states: { pending: { final: false }, waiting: { final: false }, settled: { final: true } }, parties: {}, refs: { lane: { fixed: true, required: true, to: { type: "scope", kind: "lane" } } }, indexes: ["job"],
      holds: { operations: { [EVIDENCE_ADMIT_V17]: 1, [EVIDENCE_RESULT_V17]: 1, [EVIDENCE_NOTICE_V17]: 1 }, requests: 4, items: 1, decisions: { "work-checked": 1 } },
      values: { job: { fixed: true, required: true, of: { type: "fact", kind: ["request-work-check"], under: "issue" } }, record: { fixed: false, required: true, of: { type: "code", code: "evidence-record-v17", row: "E1" } } } },
    "evidence-slot": { many: true, max: 2048, initial: "pending", states: { pending: { final: false }, waiting: { final: false }, settled: { final: true } }, parties: {}, refs: {}, indexes: ["job"],
      values: { job: { fixed: true, required: true, of: { type: "fact", kind: ["request-check", "admit-published-check", "admit-audit-check"], under: "change" } }, record: { fixed: false, required: true, of: { type: "code", code: "evidence-record-v17", row: "E1" } } } },
    "evidence-job": { many: true, max: 16384, initial: "job", states: { job: { final: false }, "reuse-anchor": { final: false }, "hold-anchor": { final: false },
      "job-timedout": { final: false }, "reuse-anchor-timedout": { final: false }, "hold-anchor-timedout": { final: false }, "incident-pending": { final: false }, decided: { final: true } },
      parties: {}, refs: { lane: { fixed: true, required: true, to: { type: "scope", kind: "lane" } },
        timeoutDecision: { fixed: false, required: false, to: { type: "fact", kind: ["timed:evidence-job-deadline", "timed:evidence-reuse-deadline", "timed:evidence-hold-deadline"], under: "platform:destination" } } }, indexes: ["jobKey", "reuseKey", "holdKey", "policyKey"],
      values: { jobKey: { fixed: true, required: true, of: { type: "digest" } }, reuseKey: { fixed: true, required: true, of: { type: "digest" } },
        holdKey: { fixed: true, required: true, of: { type: "digest" } }, policyKey: { fixed: true, required: true, of: { type: "digest" } },
        record: { fixed: false, required: true, of: { type: "code", code: "evidence-record-v17", row: "E1" } }, deadline: { fixed: false, required: false, of: { type: "time" } },
        timeoutReason: { fixed: false, required: false, of: { type: "text", max: 128 } }, noticeOpenedAt: { fixed: false, required: false, of: { type: "int", min: 0, max: 1000000000 } } } },
  }, acts: { ...base.acts, "evidence-hold-override": release(false), "evidence-hold-transition": release(true),
    "evidence-recover-timeout": { step: "transition", on: "branch", grant: "destination.read-token",
      also: { job: admittedJob },
      fields: { admission: { type: "fact", kind: ["platform:destination@17:evidence-admit"], under: "platform:destination", required: true },
        operation: { type: "fact", kind: ["merge"], under: "change", required: false } },
      guards: [{ code: "evidence-recovery-authority-v17", row: "E3" }, { code: "evidence-recovery-ready-v17", row: "E3" }],
      effects: [{ code: "evidence-recovery-v17", row: "E3", most: { effects: 5, operations: [EVIDENCE_NOTICE_V17] } }], sends: [], attention: [] } },
    receives: { ...base.receives, "check-fence": fence(false), "work-check-fence": fence(true), checked: checked(false), "work-checked": checked(true) },
    outcomes: { ...base.outcomes,
      [EVIDENCE_ADMIT_V17]: { code: "evidence-admit-v17", row: "E1", attempts: 1, origin: "rule", most: { effects: 16, operations: [EVIDENCE_PROGRESS_V17], opens: "evidence-job" }, observes: [
        { of: "rules", window: 10, use: "once", without: "wait", retains: [RULES_EXTENTS_VALUE_V13] },
        { of: "member", from: "rule", max: 1, window: 10, use: "once", without: "wait" },
        { of: "key", from: "rule", max: 9, window: 10, use: "once", without: "wait", second: true },
      ] },
      [EVIDENCE_RESULT_V17]: { code: "evidence-result-v17", row: "E2", attempts: 1, origin: "rule", most: { effects: 16, operations: [EVIDENCE_PROGRESS_V17, EVIDENCE_NOTICE_V17] }, observes: [
        { of: "rules", window: 10, use: "once", without: "wait", retains: [RULES_EXTENTS_VALUE_V13] },
        { of: "member", from: "rule", max: 1, window: 10, use: "once", without: "wait" },
        { of: "holders", action: "issue.triage", most: 32, window: 10, use: "once", without: "wait" },
        { of: "key", from: "rule", max: 9, window: 10, use: "once", without: "wait", second: true },
      ] },
      [EVIDENCE_NOTICE_V17]: { code: "evidence-notice-v17", row: "E3", attempts: 1, origin: "rule", most: { effects: 2, operations: [] }, observes: [
        { of: "holders", action: "issue.triage", most: 32, window: 10, use: "once", without: "wait" },
      ] },
      [EVIDENCE_PROGRESS_V17]: { code: "evidence-progress-v17", row: "E6", attempts: 1, origin: "rule", most: { effects: 8, operations: ["push", "mint", "reservation-delete"] }, observes: [
        { of: "rules", window: 10, use: "once", without: "wait", retains: [RULES_EXTENTS_VALUE_V13] },
        { of: "key", from: "rule", max: 32, window: 10, use: "once", without: "wait", second: true },
      ] },
      ...Object.fromEntries(["judge", "read"].flatMap(kind => base.outcomes?.[kind] ? [[kind, { ...base.outcomes[kind]!,
        most: { ...base.outcomes[kind]!.most, effects: base.outcomes[kind]!.most?.effects ?? 16, operations: [...(base.outcomes[kind]!.most?.operations ?? []), EVIDENCE_NOTICE_V17] } }]] : [])),
    }, timed: { ...base.timed, "evidence-job-deadline": deadline("job"), "evidence-reuse-deadline": deadline("reuse-anchor"), "evidence-hold-deadline": deadline("hold-anchor") } };
}

function evidenceRelease(given: RuleGiven): { item: Item; record: EvidenceJobRecordV17; effects: readonly RuleEffect[] } | null {
  if (given.input.type !== "act") return null;
  const item = given.resolved.subjects.get("on"), record = item && readEvidenceJobRecordWireV17(item.values["record"]);
  const observation = given.input.grant?.fresh?.observation;
  if (!item || !record || !observation || "subject" in observation || !["admin", "maintainer"].includes(observation.role)
    || typeof given.resolved.fields["reason"] !== "string" || given.resolved.fields["reason"] === "") return null;
  const extent = given.resolved.fields["extent"], index = record.holds.findIndex(hold => hold.key.extent === extent);
  if (index < 0) return null;
  const effective = evidenceEffectiveHoldV17(given.state, given.own, item, record.holds[index]!);
  if (!effective.ok || !effective.active || !effective.cause || !same(given.resolved.fields["job"], effective.cause.job)) return null;
  const materialized = failEvidenceHoldV17(record.holds[index]!, effective.cause);
  if (!materialized.ok) return null;
  const hold = materialized.record, through = effective.cause.order;
  const transition = given.input.signed.intent.kind === "evidence-hold-transition";
  let next: ScopedRulesPosition | null = null;
  if (transition) {
    const view = evidencePolicyV17(given), text = given.resolved.fields["generation"];
    if (!view || typeof text !== "string") return null;
    try {
      const parsed = parseStrict(text); next = { rules: view.rules, seq: view.revision };
      if (canonicalize(parsed) !== text || !same(parsed, next) || same(hold.key.generation, next)) return null;
    } catch { return null; }
  }
  const released = releaseEvidenceHoldV17(hold, transition ? { kind: "transition", decidedAt: given.resolved.self, through, reason: given.resolved.fields["reason"], next: next! }
    : { kind: "override", decidedAt: given.resolved.self, through, reason: given.resolved.fields["reason"] });
  if (!released.ok) return null;
  const result = { ...record, holds: record.holds.map((held, n) => n === index ? released.record : held) };
  const effects = record.policyOwner === null ? [] : evidenceSettlePendingCapacityV17(given, record.policyOwner, [hold.key], effective.cause.job, through.publication);
  return readEvidenceJobRecordV17(result) && evidenceCarryingBudgetV17(given, [evidenceRecordEffectV17(item.id, result), ...effects], [], [], []).admitted
    ? { item, record: result, effects } : null;
}

function nativeDecided(given: RuleGiven, record: EvidenceJobRecordV17): boolean {
  if (record.decidedAt === null || record.result === null || record.admittedAt === null) return false;
  if (record.decidedAt >= given.resolved.self) return false;
  const sealed = given.own(record.decidedAt);
  return !!sealed && entryHash(sealed.entry) === sealed.hash && sealed.entry.input.type === "outcome"
    && sealed.entry.input.owner === "platform:destination@17" && sealed.entry.input.kind === EVIDENCE_RESULT_V17
    && sealed.entry.effects.some(effect => effect.effect === "value" && effect.slot === "record"
      && same(readEvidenceJobRecordWireV17(effect.value)?.job, record.job) && same(readEvidenceJobRecordWireV17(effect.value)?.result, record.result));
}
function acceptedCandidate(given: RuleGiven, candidate: EvidenceCandidateV17, check: RulesCheckV13, view: ReservationPolicyViewV17): boolean {
  const row = evidenceRowV17(given.state, candidate.job), key = given.observed({ key: candidate.key })?.observation;
  return !!row && nativeDecided(given, row.record) && row.record.admittedAt === candidate.admission && row.record.decidedAt === candidate.decidedBy
    && same(row.record.result, candidate.result) && row.record.signer === candidate.key && row.record.state === candidate.outcome
    && row.record.name === check.name && row.record.configuration === check.configuration
    && evidenceSourceV17(candidate.binding, check, view, key && !("subject" in key) ? key : null, given.time, false, null, false).ok;
}
function projectedLogicalJob(given: RuleGiven, publication: number, selected: { job: FactRef; proof?: { decided: number } }): FactRef | null {
  const accepted = selected.proof ? given.own(selected.proof.decided)?.entry : null;
  const alias = accepted?.effects.flatMap(effect => effect.effect === "value" && effect.slot === "record" ? [readEvidenceJobRecordWireV17(effect.value)] : [])
    .find(value => value?.state === "reused" && same(value.countedJob, selected.job) && value.binding.subject.kind === "landing" && value.binding.subject.publication.seq === publication);
  return alias?.job ?? null;
}
function evidenceComplete(given: RuleGiven, publication: Item, passes: readonly { name: string; job: FactRef; passed: boolean; proof?: { decided: number } }[]): boolean {
  const snapshot = certifiedPublicationStateWireV17(publication.values["passes"], given.resolved.bounds)?.policy;
  if (!snapshot) return false;
  if (!snapshot.required.length) return true;
  const view = evidencePolicyV17(given);
  if (!view || view.revision !== snapshot.observation.revision || !same(view.rules, snapshot.input.rules)) return false;
  return snapshot.required.every(check => {
    const rows = passes.filter(row => row.name === check.name), selected = rows[0];
    if (rows.length !== 1 || !selected?.passed) return false;
    const found = evidenceRowV17(given.state, selected.job), record = found?.record;
    if (!record || record.state !== "passed" || !nativeDecided(given, record) || record.name !== check.name
      || record.configuration !== check.configuration || record.tree !== snapshot.tree || record.binding.stage !== "landing" || record.binding.source !== checkSourceV13(check)) return false;
    const current = view.policy.checks.find(row => row.name === check.name && row.configuration === check.configuration);
    if (!current || !record.signer || !evidenceSourceV17(record.binding, current, view, keyObservation(given, record.signer), given.time, false, null, false).ok) return false;
    if (check.audit) {
      const logical = projectedLogicalJob(given, publication.id, selected) ?? record.job;
      const audit = given.state.lookup("evidence-job", "policyKey", canonicalize(evidenceAuditKeyV17(logical)), 2);
      if (!audit || audit.length !== 1) return false;
      const paired = readEvidenceJobRecordWireV17(given.state.item(audit[0]!)?.values["record"]);
      const currentPolicy = readRulesPolicyV13((snapshot.input.extents as Record<string, unknown>)["policy"]);
      const target = currentPolicy.ok ? currentPolicy.policy.checks.find(target => target.name === check.audit!.check) : null;
      if (!target || !paired || paired.name !== target.name || paired.configuration !== target.configuration || paired.state !== "passed" || paired.binding.source !== "room"
        || !same(paired.binding.auditOf, record.job) || !same(paired.forJob, logical) || paired.tree !== record.tree || paired.configuration !== record.configuration || !nativeDecided(given, paired)) return false;
      if (!paired.signer || !evidenceSourceV17(paired.binding, target, view, keyObservation(given, paired.signer), given.time, false, null, false).ok) return false;
    }
    return true;
  });
}
export const evidenceDestinationProfileV17: DestinationSuccessorV17 = {
  readPolicy: readRulesPolicyObservationV17, publication: certifiedPublicationStateV17,
  publicationWire: certifiedPublicationStateWireV17, encodePublication: (value, bounds) => {
    const record = certifiedPublicationStateV17(value, bounds); if (!record) throw Error("The publication record is malformed");
    return certifiedPublicationWireV17(record, bounds);
  },
  budget: certifiedReservationBudgetV17, list: judgeListEligibilityV17, blocks: evidenceBlocksV17, blocked: evidenceBlockedRecovery, complete: evidenceComplete,
  // Landing jobs start only after a reservation exposes its integration tree.
  // Reservation proves the policy; the push fence below proves its jobs.
  judge: asked => judgeReservationV17(asked),
  checked: (given, publication, fields) => {
    const job = fields["job"], result = fields["result"];
    if (!isFactRef(job) || !isFactRef(result)) return null;
    const record = evidenceRowV17(given.state, job)?.record, snapshot = certifiedPublicationStateWireV17(publication.values["passes"], given.resolved.bounds)?.policy;
    if (!record || !snapshot || record.state !== "passed" || !nativeDecided(given, record) || !same(record.result, result) || !record.signer
      || record.tree !== snapshot.tree || record.binding.stage !== "landing") return null;
    return { name: record.name, proof: { result, key: record.signer, decided: record.decidedAt!, configuration: record.configuration,
      checker: record.binding.checker, tree: record.tree, proposal: (snapshot.input.extents as Record<string, unknown>)["proposal"] as string } };
  },
};

interface EvidenceOpeningV17 { record: EvidenceJobRecordV17; indexes: Record<"jobKey" | "reuseKey" | "holdKey" | "policyKey", Digest> }
function evidenceOpening(given: RuleGiven, proposedRecord: EvidenceJobRecordV17): EvidenceOpeningV17 | null {
  const triple = evidenceSubjectV17(given, proposedRecord), directory = branchOf(given.state)?.refs["directory"];
  if (!triple || !isFactRef(proposedRecord.job) || !isRecord(directory)) return null;
  const record = { ...proposedRecord, ...triple, commitProof: triple.proof }; delete (record as Record<string, unknown>)["proof"];
  const reuseKey = evidenceKeyDigestV17({ room: directory as unknown as EvidenceKeyV17["room"], tree: triple.tree, name: record.name,
    configuration: record.configuration, source: record.binding.source, stage: record.binding.stage });
  const reuse = record.binding.stage === "published" ? null : evidenceOwnerV17(given.state, "reuseKey", reuseKey);
  const holdKey = evidenceHoldOwnerKeyV17(record.binding, record.name, record.configuration), policyKey = evidencePolicyKeyV17(record.binding.policyGeneration);
  const holds = record.binding.stage === "published" ? evidenceOwnerV17(given.state, "holdKey", holdKey) : null;
  const policy = record.binding.stage === "published" ? evidenceOwnerV17(given.state, "policyKey", policyKey) : null;
  record.reuseOwner = record.binding.stage === "published" ? null : reuse?.item.id ?? given.resolved.self;
  record.reuse = record.reuseOwner === given.resolved.self ? newEvidenceIndexV17({ room: directory as unknown as EvidenceKeyV17["room"], tree: triple.tree,
    name: record.name, configuration: record.configuration, source: record.binding.source, stage: record.binding.stage }) : null;
  record.holdOwner = record.binding.stage === "published" ? holds?.item.id ?? given.resolved.self : null;
  record.policyOwner = record.binding.stage === "published" ? policy?.item.id ?? given.resolved.self : null;
  return { record, indexes: { jobKey: evidenceJobKeyV17(record.job), reuseKey: record.reuseOwner === given.resolved.self ? reuseKey : evidenceUnusedKeyV17(record.job, "reuse"),
    holdKey: record.holdOwner === given.resolved.self ? holdKey : evidenceUnusedKeyV17(record.job, "hold"),
    policyKey: record.forJob ? evidenceAuditKeyV17(record.forJob) : record.policyOwner === given.resolved.self ? policyKey : evidenceUnusedKeyV17(record.job, "policy") } };
}
const readRow = (given: RuleGiven, id: number): { item: Item; record: EvidenceJobRecordV17 } => {
  const item = given.state.item(id), record = item && readEvidenceJobRecordWireV17(item.values["record"]);
  if (!item || !record) throw Error("A funded evidence row is missing");
  return { item, record: item.type === "evidence-job" ? currentEvidenceRecordV17(item, record) : record };
};
function operationRecordId(state: StateView, own: Own, operation: Operation): number | null {
  const opened = own(Number(operation.id.split(":")[0]))?.entry;
  if (!opened) return null;
  if (operation.kind === EVIDENCE_ADMIT_V17) return opened.seq;
  if (operation.kind === EVIDENCE_RESULT_V17 && opened.input.type === "delivery" && opened.input.message.class === "request" && isRecord(opened.input.message.body)) {
    const fields = opened.input.message.body["fields"];
    return isRecord(fields) && isFactRef(fields["admission"]) && same(fields["admission"].at, opened.at) ? fields["admission"].seq : null;
  }
  if (operation.kind === EVIDENCE_NOTICE_V17) {
    const marked = opened.effects.filter(effect => effect.effect === "value" && effect.slot === "noticeOpenedAt" && effect.value === opened.seq);
    return marked.length === 1 && marked[0]!.effect === "value" ? marked[0]!.item : null;
  }
  if (operation.kind === EVIDENCE_PROGRESS_V17 && opened.input.type === "outcome" && exact(opened.input.evidence.body, ["job"]) && isFactRef(opened.input.evidence.body["job"]))
    return evidenceRowV17(state, opened.input.evidence.body["job"])?.item.id ?? null;
  return null;
}
const operationRow = (given: RuleGiven, operation: Operation) => {
  const id = operationRecordId(given.state, given.own, operation);
  if (id === null) throw Error("The evidence operation lost its exact source");
  return readRow(given, id);
};
function evidenceRecordState(record: EvidenceJobRecordV17, _item: number): string {
  if (record.funded.holds || record.funded.policy) return record.state === "timeout" ? "hold-anchor-timedout" : "hold-anchor";
  if (record.reuse !== null) return record.state === "timeout" ? "reuse-anchor-timedout" : "reuse-anchor";
  if (record.state === "timeout") return "job-timedout";
  if (record.incident?.cause && record.noticeAt === null) return "incident-pending";
  return ["passed", "failed", "error", "refused", "reused"].includes(record.state) ? "decided" : "job";
}
const keyObservation = (given: RuleGiven, key: KeyId | null): Observation | null => {
  const observed = key && given.observed({ key })?.observation;
  return observed && !("subject" in observed) ? observed : null;
};
function candidateBytes(given: RuleGiven, bucket: EvidenceIndexRecordV17, next: EvidenceJobRecordV17): number {
  const rows = bucket.candidates.map(copy), pending = [...bucket.pending.filter(job => !same(job, next.job)), next.job];
  for (const job of pending) {
    const record = same(job, next.job) ? next : evidenceRowV17(given.state, job)?.record;
    if (!record) throw Error("A candidate reservation lost its admitted job");
    rows.push({ job, keyDigest: evidenceKeyDigestV17(bucket.key), admission: Number.MAX_SAFE_INTEGER, result: { at: job.at, seq: Number.MAX_SAFE_INTEGER, hash: `sha256:${"f".repeat(64)}` },
      decidedBy: Number.MAX_SAFE_INTEGER, key: `key_${"A".repeat(43)}`, checker: record.binding.checker, binding: record.binding, outcome: "failed" });
  }
  return utf8(canonicalize({ ...bucket, pending: [], candidates: rows })).length;
}
function decisionRequest(record: EvidenceJobRecordV17, reason: string, phase: "admission" | "result" = "admission"): RuleRequest {
  return { to: record.job.at, message: { class: "request", type: "tell", body: { message: "check-decision", fields: { job: record.job, decision: { self: true }, reason,
    status: phase === "result" ? "decided" : reason === "admitted" ? "admitted" : reason === "reused" ? "reused" : "refused",
    frozenGeneration: canonicalize(record.binding.serviceGeneration), observedGeneration: canonicalize(record.observedGeneration),
    ...(record.result ? { result: record.result } : {}), ...(record.countedJob ? { countedJob: record.countedJob } : {}),
    ...(reason === "admitted" || reason === "reused" ? { commit: record.commit, tree: record.tree, base: record.base } : {}) } } } };
}
function serviceEffect(given: RuleGiven, view: ReservationPolicyViewV17 | null): RuleEffect[] {
  const ledger = evidenceLedgerOfV17(given.state);
  const value = view && { mark: view.policy.roomService, generation: view.serviceGeneration };
  if (value && !ledger) throw new RuleFault("The commissioned evidence ledger is unavailable");
  const stored = ledger?.values["service"], current = readEvidenceServiceWireV17(stored);
  if (stored !== undefined && stored !== null && !current) throw new RuleFault("The current evidence service record is unavailable");
  return ledger && value && !same(current, value)
    ? [{ effect: "value", item: ledger.id, slot: "service", value: evidenceWireV17(value, EVIDENCE_SERVICE_BYTES_V17) }] : [];
}
/** A delayed frozen published obligation can be refused by current
 * authority. Its reasoned hold is funded already; it is not a failed run. */
function publishedRefusal(given: RuleGiven, request: Item, proposed: EvidenceJobRecordV17, reason: string,
  view: ReservationPolicyViewV17 | null): OutcomeGives | null {
  if (proposed.binding.stage !== "published" || proposed.binding.subject.kind !== "published") return null;
  const subject = proposed.binding.subject;
  const batch = readEvidenceBatchWireV17(given.state.item(proposed.holder)?.values["batch"]), triple = evidenceSubjectV17(given, proposed);
  const spent = evidenceSpendPublishedCapacityV17(given, proposed.holder, proposed.binding, proposed.name, proposed.configuration, proposed.job, false);
  if (!batch || !triple || !spent) return null;
  const record: EvidenceJobRecordV17 = { ...copy(proposed), ...triple, commitProof: triple.proof, policy: batch.policy,
    state: "refused", admittedAt: null, reason, observedGeneration: view?.serviceGeneration ?? null, decidedAt: given.resolved.self,
    holdOwner: spent.keys.length ? spent.holdOwner : null, policyOwner: spent.policyOwner, covered: spent.keys };
  delete (record as unknown as Record<string, unknown>)["proof"];
  const effects: RuleEffect[] = [...serviceEffect(given, view), ...spent.effects, { effect: "state", item: request.id, state: "settled" }];
  if (spent.keys.length) {
    const owner = spent.holdOwner === given.resolved.self ? record : copy(readRow(given, spent.holdOwner).record);
    owner.holds = [...owner.holds, ...spent.keys.filter(key => !owner.holds.some(hold => same(hold.key, key))).map(key => newEvidenceHoldV17(key)!)];
    owner.policyOwner = spent.policyOwner; owner.funded.holds = true;
    owner.holds = owner.holds.map(hold => {
      if (!record.covered.some(key => same(key, hold.key))) return hold;
      const held = failEvidenceHoldV17(hold, { job: record.job, publication: subject.publication, commit: triple.commit,
        order: { publication: subject.publication.seq, job: given.resolved.self }, decidedAt: given.resolved.self,
        kind: "observation-unavailable", reason, result: null });
      if (!held.ok) throw Error("A refused published obligation lost its funded hold"); return held.record;
    });
    if (spent.holdOwner === given.resolved.self) Object.assign(record, owner);
    else effects.push(evidenceRecordEffectV17(spent.holdOwner, owner));
  }
  effects.push({ effect: "open", item: given.resolved.self, type: "evidence-job", state: evidenceRecordState(record, given.resolved.self) },
    { effect: "ref", item: given.resolved.self, slot: "lane", to: record.job.at }, evidenceRecordEffectV17(given.resolved.self, record));
  for (const [slot, value] of Object.entries({ jobKey: evidenceJobKeyV17(record.job), reuseKey: evidenceUnusedKeyV17(record.job, "reuse"),
    holdKey: spent.holdOwner === given.resolved.self && spent.keys.length ? evidenceHoldOwnerKeyV17(record.binding, record.name, record.configuration) : evidenceUnusedKeyV17(record.job, "hold"),
    policyKey: evidenceUnusedKeyV17(record.job, "policy") })) effects.push({ effect: "value", item: given.resolved.self, slot, value });
  if (!readEvidenceJobRecordV17(record)) throw Error("A refused published obligation does not fit its funded record");
  return { effects, sends: [decisionRequest(record, reason)], opens: [] };
}
function auditRequest(given: RuleGiven, record: EvidenceJobRecordV17, view: ReservationPolicyViewV17): RuleRequest | null {
  const parent = view.policy.checks.find(check => check.name === record.name), target = parent?.audit && view.policy.checks.find(check => check.name === parent.audit!.check);
  if (record.binding.stage !== "landing" || record.binding.source !== "member" || record.binding.auditOf !== null || !target) return null;
  const operation = record.binding.subject.kind === "landing" ? given.state.item(record.binding.subject.publication.seq)?.refs["operation"] : null;
  if (!isFactRef(operation)) throw Error("An automatic audit lost its publication operation");
  const binding: EvidenceBinding = { ...copy(record.binding), checker: target.checker, source: "room", auditOf: record.countedJob ?? record.job };
  if (!frozenEvidenceBatch(given, binding, target.name, target.configuration)) throw Error("An automatic audit lost its frozen funded descriptor");
  return { to: record.job.at, message: { class: "request", type: "tell", body: { message: "admit-audit-check", fields: {
    manifest: record.binding.subject.kind === "landing" ? record.binding.subject.manifest : null,
    name: target.name, configuration: target.configuration, tree: record.tree, commit: record.commit, base: record.base,
    checker: target.checker, operation, auditOf: binding.auditOf, forJob: record.job, binding: canonicalize(binding), bindingDigest: evidenceBindingDigest(binding),
  } } } };
}
/** Semantic correspondence only. The Native wrapper below proves the
 * retained capture and funded account; current Q13 authority is separate. */
export function evidenceFrozenBatchMatchesV17(binding: EvidenceBinding, name: string, configuration: Digest, value: EvidenceBatchRecordV17): boolean {
  const batch = readEvidenceBatchV17(value);
  if (!batch || binding.subject.kind === "work" || !same(binding.subject.publication, batch.publication)
    || !same(binding.policyGeneration, { rules: batch.policy.rules, seq: batch.policy.revision })
    || !same(binding.serviceGeneration, batch.policy.serviceGeneration) || !same(binding.roomService, batch.policy.policy.roomService)) return false;
  const descriptor = batch.checks.find(check => check.name === name);
  return !!descriptor && descriptor.configuration === configuration && checkSourceV13(descriptor) === binding.source
    && checkStageV13(descriptor) === binding.stage && binding.subject.kind === binding.stage && same(descriptor.checker, binding.checker);
}
function frozenEvidenceBatch(given: RuleGiven, binding: EvidenceBinding, name: string, configuration: Digest, holder?: number, job?: FactRef): EvidenceBatchRecordV17 | null {
  if (binding.subject.kind === "work") return null;
  const subject = binding.subject, publication = given.state.item(subject.publication.seq), opening = local(given, subject.publication);
  const operation = publication?.refs["operation"];
  if (!opening || !publication || publication.type !== "publication" || !isFactRef(operation)
    || !same(publication.refs["manifest"], subject.manifest)) return null;
  const ids = given.state.lookup("evidence-batch", "operation", canonicalize(operation), 5);
  if (!ids?.length || ids.length > 4) return null;
  const rows = ids.map(id => ({ item: given.state.item(id), batch: readEvidenceBatchWireV17(given.state.item(id)?.values["batch"]) }))
    .sort((left, right) => (left.batch?.ordinal ?? -1) - (right.batch?.ordinal ?? -1));
  const first = rows[0]!.batch;
  if (!first || rows.length !== first.total || rows.some((row, ordinal) => !row.item || row.item.type !== "evidence-batch" || !row.batch
    || row.batch.ordinal !== ordinal || row.batch.total !== rows.length || !same(row.batch.publication, subject.publication)
    || !same(row.batch.operation, operation) || !same(row.batch.capture, first.capture) || !same(row.batch.policy, first.policy) || !same(row.batch.touched, first.touched))) return null;
  const selected = rows.find(row => (holder === undefined || row.item!.id === holder) && (!job || row.batch!.jobs.some(row => same(row.job, job) && row.name === name))
    && evidenceFrozenBatchMatchesV17(binding, name, configuration, row.batch!));
  if (!selected?.batch) return null;
  const capture = local(given, selected.batch.capture), born = given.own(selected.item!.id)?.entry;
  const captured = capture && certifiedPublicationStateWireV17(effectValue(capture, "passes", publication.id), given.resolved.bounds);
  const current = certifiedPublicationStateWireV17(publication.values["passes"], given.resolved.bounds);
  const view = captured && readRulesPolicyObservationV17(captured.policy.observation, captured.policy.input, captured.policy.observation.at);
  return capture?.input.type === "outcome" && capture.input.owner === "platform:destination@17" && ["judge", "read"].includes(capture.input.kind)
    && capture.input.result === "confirmed" && capture.effects.some(effect => effect.effect === "state" && effect.item === publication.id && effect.state === "reserved")
    && born?.input.type === "delivery" && same(born.input.from, selected.batch.capture)
    && born.effects.some(effect => effect.effect === "open" && effect.item === born.seq && effect.type === "evidence-batch")
    && captured && current && same(current.policy, captured.policy) && same(captured.policy.manifest, subject.manifest)
    && same(captured.policy.touched, selected.batch.touched) && view?.ok && same(view.view, selected.batch.policy) ? selected.batch : null;
}
function evidenceAdmission(given: RuleGiven, operation: Operation): OutcomeGives {
  if (operation.for === undefined) throw Error("Evidence admission has no funded job");
  const original = operationRow(given, operation), view = evidencePolicyV17(given), updates = new Map<number, EvidenceJobRecordV17>();
  let record = copy(original.record); const effects = serviceEffect(given, view), admittedItem = given.resolved.self;
  const working = (id: number) => {
    const existing = updates.get(id);
    if (existing) return { id, record: existing };
    const row = readRow(given, id); updates.set(id, row.record); return { id, record: row.record };
  };
  const refuse = (reason: string) => {
    const published = publishedRefusal(given, original.item, original.record, reason, view);
    if (published) return published;
    const rejected: EvidenceJobRecordV17 = { ...copy(original.record), state: "refused", reason, observedGeneration: view?.serviceGeneration ?? null };
    return { effects: [...serviceEffect(given, view), evidenceRecordEffectV17(original.item.id, rejected), { effect: "state" as const, item: original.item.id, state: "settled" }], sends: [decisionRequest(rejected, reason)], opens: [] as [] };
  };
  if (record.state !== "pending") return { effects, sends: [], opens: [] };
  if (given.input.type === "outcome" && given.input.result === "unknown") {
    return { effects: [...effects, evidenceRecordEffectV17(original.item.id, { ...record, reason: "admission-unknown" })], sends: [], opens: [] };
  }
  if (given.input.type !== "outcome" || given.input.result !== "confirmed" || given.resolved.outcome?.selected !== true || !view) return refuse("evidence-unavailable");
  if (timeMs(record.deadline)! <= timeMs(given.time)!) return refuse("check-timeout");
  const check = view.policy.checks.find(check => check.name === record.name && check.configuration === record.configuration);
  if (!check) return refuse("not-this-check");
  if (record.binding.subject.kind !== "work" && !frozenEvidenceBatch(given, record.binding, record.name, record.configuration, record.holder, record.job)) return refuse("wrong-source");
  const memberUse = given.observed({ member: record.binding.checker.member })?.observation;
  const key = record.binding.source === "room" ? keyObservation(given, view.policy.roomService?.key ?? null) : null;
  const source = evidenceSourceV17(record.binding, check, view, key, given.time, true, memberUse && "subject" in memberUse && memberUse.subject === "member" ? memberUse : null);
  if (!source.ok) return refuse(source.reason);
  const triple = evidenceSubjectV17(given, record); if (!triple) return refuse("subject-unavailable");
  const opened = evidenceOpening(given, record); if (!opened) return refuse("evidence-invalid");
  record = opened.record; updates.set(admittedItem, record);
  if (record.binding.auditOf) {
    const logical = record.forJob && evidenceRowV17(given.state, record.forJob)?.record;
    const member = logical && evidenceRowV17(given.state, logical.countedJob ?? logical.job)?.record;
    const parent = logical && view.policy.checks.find(check => check.name === logical.name);
    if (!member || !parent?.audit || parent.audit.check !== check.name || parent.audit.every !== 1 || member.binding.source !== "member"
      || record.binding.source !== "room" || record.binding.stage !== "landing" || member.tree !== triple.tree || member.configuration !== record.configuration
      || !logical || !same(record.binding.auditOf, member.job) || !same(logical.binding.subject, record.binding.subject)
      || !["admitted", "reused", "timeout", "unknown", "passed", "failed"].includes(logical.state) || record.reuseRequested
      || evidenceOwnerV17(given.state, "policyKey", evidenceAuditKeyV17(logical.job)) !== null) return refuse("audit-invalid");
  }
  const target = view.policy.checks.some(check => check.audit?.check === record.name);
  if (record.reuseRequested && (!checkReuseV13(check) || target || record.binding.auditOf !== null || record.binding.stage === "published")) return refuse("reuse-forbidden");
  const counts = evidenceCountsV17(given.state), increments: EvidenceCountsV17 = { keys: 0, holds: 0, policyGenerations: 0, incidents: 0 };
  Object.assign(record, triple, { commitProof: triple.proof, policy: view, admittedAt: given.resolved.self, state: "admitted", reason: null, observedGeneration: view.serviceGeneration });
  delete (record as unknown as Record<string, unknown>)["proof"];
  const opening = given.own(original.item.id); if (!opening) return refuse("evidence-invalid");
  record.sourceFacts = [...record.sourceFacts, { at: given.resolved.at, seq: original.item.id, hash: opening.hash }];
  if (record.reuseOwner !== null) {
    const owner = working(record.reuseOwner);
    if (!owner.record.reuse) return refuse("evidence-invalid");
    // At most eight reserved jobs are inspected by exact key. A terminal
    // native cancellation makes this publication ineligible even for a late
    // answer; timeout/unknown alone deliberately does not release a slot.
    for (const pending of owner.record.reuse.pending) {
      const held = evidenceRowV17(given.state, pending)?.record;
      if (held?.binding.subject.kind !== "landing") continue;
      const publication = given.state.item(held.binding.subject.publication.seq);
      if (publication && ["aborted", "not-reserved", "cleanup-aborted", "cleanup-deleted", "cleaned", "superseded"].includes(publication.state)) {
        const released = releaseEvidenceCandidateV17(owner.record.reuse, pending); if (!released.ok) return refuse(released.reason);
        owner.record.reuse = released.record;
      }
    }
    const assessment = assessEvidenceV17(owner.record.reuse, candidate => acceptedCandidate(given, candidate, check, view));
    if (!assessment) return refuse("evidence-invalid");
    owner.record.reuse = assessment.record;
    if (record.reuseRequested && assessment.conflicted) {
      const rejected = refuse("check-disagrees");
      // Discovery is itself permanent even though this requested alias is
      // refused. Rotation cannot later erase an observed disagreement.
      return { ...rejected, effects: [...rejected.effects, evidenceRecordEffectV17(owner.id, owner.record)] };
    }
    if (record.reuseRequested && assessment.reusable) {
      record.state = "reused"; record.reason = "reused"; record.countedJob = assessment.reusable.job; record.result = assessment.reusable.result; record.signer = assessment.reusable.key;
    } else {
      const reserved = reserveEvidenceCandidateV17(assessment.record, record.job, candidateBytes(given, assessment.record, record));
      if (!reserved.ok) return refuse(reserved.reason);
      owner.record.reuse = reserved.record;
    }
    if (!owner.record.funded.reuse) { increments.keys++; owner.record.funded.reuse = true; }
    updates.set(owner.id, owner.record);
  }
  if (record.binding.stage === "published") {
    const reserved = evidenceSpendPublishedCapacityV17(given, record.holder, record.binding, record.name, record.configuration, record.job);
    if (!reserved) return refuse("evidence-capacity");
    effects.push(...reserved.effects); record.holdOwner = reserved.keys.length ? reserved.holdOwner : null; record.policyOwner = reserved.policyOwner; record.covered = reserved.keys;
    record.incident = reserveEvidenceIncidentV17(record.job); if (!record.incident) return refuse("evidence-invalid");
    record.funded.incident = true;
    if (checkHoldsV13(check)) {
      if (record.holdOwner === null || record.policyOwner === null) return refuse("evidence-invalid");
      const owner = working(record.holdOwner);
      owner.record.holds = [...owner.record.holds, ...reserved.keys.filter(key => !owner.record.holds.some(hold => same(hold.key, key))).map(key => newEvidenceHoldV17(key)!)];
      owner.record.funded.holds = true;
      owner.record.policyOwner = reserved.policyOwner; updates.set(owner.id, owner.record);
    }
  }
  updates.set(admittedItem, record);
  const capacity = reserveEvidenceCountsV17(counts, increments); if (!capacity.ok) return refuse(capacity.reason);
  effects.push({ effect: "state", item: original.item.id, state: record.state === "reused" ? "settled" : "waiting" },
    evidenceRecordEffectV17(original.item.id, { ...original.record, admittedAt: admittedItem }),
    { effect: "open", item: admittedItem, type: "evidence-job", state: evidenceRecordState(record, admittedItem) },
    { effect: "ref", item: admittedItem, slot: "lane", to: record.job.at });
  for (const [slot, digest] of Object.entries(opened.indexes)) effects.push({ effect: "value", item: admittedItem, slot, value: digest });
  if (record.state === "admitted") effects.push({ effect: "value", item: admittedItem, slot: "deadline", value: record.deadline });
  for (const [id, next] of updates) {
    if (!readEvidenceJobRecordV17(next)) return refuse("evidence-too-large");
    if (id !== admittedItem && same(readEvidenceJobRecordWireV17(given.state.item(id)?.values["record"]), next)) continue;
    effects.push(evidenceRecordEffectV17(id, next), ...(id === admittedItem || given.state.item(id)?.state === evidenceRecordState(next, id) ? [] : [{ effect: "state" as const, item: id, state: evidenceRecordState(next, id) }]));
  }
  const ledger = evidenceLedgerOfV17(given.state); if (!ledger) return refuse("evidence-invalid");
  if (!same(counts, capacity.counts)) effects.push({ effect: "value", item: ledger.id, slot: "counts", value: capacity.counts as unknown as FieldValue });
  const sends = [decisionRequest(record, record.state === "reused" ? "reused" : "admitted")], audit = auditRequest(given, record, view);
  if (audit) sends.push(audit);
  const progress = landingNeedsProgress(given, record) ? [openingV17(EVIDENCE_PROGRESS_V17, record.holder)] : [];
  const forecast = record.state === "reused" ? { admitted: true } : evidenceFutureEntriesV17(given, { item: admittedItem, record }, [...updates].map(([item, record]) => ({ item, record })),
    job => same(job, record.job) ? record : evidenceRowV17(given.state, job)?.record ?? null,
    record.covered.length && record.policyOwner !== null ? evidencePendingCapacityForecastV17(given, record.policyOwner, record.job.at) : []);
  if (!forecast.admitted || !evidenceCarryingBudgetV17(given, effects, progress, sends, []).admitted) return refuse("evidence-too-large");
  return { effects, sends, opens: progress };
}

const openingV17 = (kind: string, item: number): Opening => ({ owner: "platform:destination@17", kind, attempts: 1, for: item });
function landingNeedsProgress(given: RuleGiven, record: EvidenceJobRecordV17): boolean {
  if (record.binding.subject.kind !== "landing") return false;
  const publication = given.state.item(record.binding.subject.publication.seq), frozen = publication && certifiedPublicationStateWireV17(publication.values["passes"], given.resolved.bounds);
  const name = record.forJob ? evidenceRowV17(given.state, record.forJob)?.record.name : record.name;
  return !!frozen && frozen.policy.required.some(check => check.name === name);
}
const openedEffectsV17 = (kind: string, item: number): RuleEffect[] => [
  { effect: "operation", k: 0, owner: "platform:destination@17", kind, attempts: 1, for: item },
  { effect: "attempt", operation: { k: 0 }, attempt: 1, result: "opened", selected: null },
];
function resultFields(given: RuleGiven, operation: Operation): Record<string, unknown> | null {
  const entry = given.own(Number(operation.id.split(":")[0]))?.entry;
  const input = entry?.input;
  return input?.type === "delivery" && input.message.class === "request" && isRecord(input.message.body)
    && ["checked", "work-checked"].includes(String(input.message.body["message"])) && isRecord(input.message.body["fields"])
    ? input.message.body["fields"] : null;
}
function resultBound(given: RuleGiven): { item: Item; record: EvidenceJobRecordV17 } | null {
  const item = given.resolved.subjects.get("also.job"), record = item && readEvidenceJobRecordWireV17(item.values["record"]);
  const admission = record && destinationEvidenceJob(given.state, given.own, record.job);
  return item && record && admission && given.input.type === "delivery" && same(given.input.from.at, record.job.at)
    && same(given.resolved.fields["admission"], admission.admission) && same(given.resolved.fields["job"], record.job)
    && given.resolved.fields["bindingDigest"] === record.bindingDigest && isFactRef(given.resolved.fields["result"])
    && same(given.resolved.fields["result"], given.input.from) && ["admitted", "timeout", "unknown"].includes(record.state)
    ? { item, record } : null;
}
function landingEffects(given: RuleGiven, record: EvidenceJobRecordV17): OutcomeGives {
  const subject = record.binding.subject;
  if (subject.kind !== "landing") return { effects: [], sends: [], opens: [] };
  const publication = given.state.item(subject.publication.seq), captured = publication && certifiedPublicationStateWireV17(publication.values["passes"], given.resolved.bounds);
  if (!publication || publication.state !== "reserved" || !captured || publication.values["tree"] !== record.tree) return { effects: [], sends: [], opens: [] };
  const check = captured.policy.required.find(check => check.name === record.name), isAudit = record.binding.auditOf !== null;
  if (!check && !isAudit) return { effects: [], sends: [], opens: [] };
  if (["failed", "error"].includes(record.state)) {
    const branch = branchOf(given.state); if (!branch) throw Error("The publication branch is unavailable");
    return { effects: [{ effect: "state", item: publication.id, state: "cleanup-aborted" },
      { effect: "value", item: publication.id, slot: "reason", value: isAudit ? "audit-disagrees" : "required-check-failed" },
      { effect: "ref", item: branch.id, slot: "slot", to: null }], sends: [], opens: [
        { owner: "platform:destination@17", kind: "reservation-delete", attempts: 3, for: publication.id }, openingV17("mint", publication.id),
      ] };
  }
  const generations = [...captured.generations];
  if (check) {
    const passed = record.state === "passed" || record.state === "reused";
    const generation = { name: record.name, job: record.countedJob ?? record.job, passed,
      ...(passed && record.result && record.signer ? { proof: { result: record.result, key: record.signer, decided: record.decidedAt ?? record.admittedAt!,
        configuration: record.configuration, checker: record.binding.checker, tree: record.tree!, proposal: String((captured.policy.input.extents as Record<string, unknown>)["proposal"]) } } : {}) };
    const prior = generations.findIndex(row => row.name === record.name);
    if (prior < 0) generations.push(generation); else generations[prior] = generation;
  }
  const effects: RuleEffect[] = check ? [{ effect: "value", item: publication.id, slot: "passes", value: certifiedPublicationWireV17({ ...captured, generations }, given.resolved.bounds) }] : [];
  const ready = publication.values["checkDeadline"] !== undefined && publication.values["checkDeadline"] !== null
    && destinationStageConfirmedV17(given, publication, given.resolved.self)
    && evidenceComplete(given, publication, generations);
  if (ready) effects.push({ effect: "value", item: publication.id, slot: "checkDeadline", value: null });
  return { effects, sends: [], opens: ready ? [{ owner: "platform:destination@17", kind: "push", attempts: 3, for: publication.id }, openingV17("mint", publication.id)] : [] };
}
function incidentRequest(given: RuleGiven, record: EvidenceJobRecordV17): RuleRequest | null {
  if (record.binding.subject.kind !== "published" || !record.incident?.cause || record.noticeAt !== null) return null;
  const observation = given.observed({ holders: "issue.triage" })?.observation;
  const holders = observation && "subject" in observation && observation.subject === "holders" ? observation : null;
  const now = timeMs(given.time), at = holders && timeMs(holders.at);
  const triagers = evidenceTriagersV17(holders && now !== null && at !== null && now >= at && now - at <= 10000 ? holders : null);
  if (!triagers.ok) { record.incident = { ...record.incident, reason: triagers.reason }; return null; }
  const cause = record.incident.cause;
  record.noticeAt = given.resolved.self;
  return { to: record.job.at, message: { class: "request", type: "tell", body: { message: "published-check-failure", fields: {
    job: record.job, publication: record.binding.subject.publication, manifest: record.binding.subject.manifest,
    ...(cause.result ? { result: cause.result } : {}), decision: { self: true }, cause: canonicalize(cause),
    triagers: triagers.triagers, policyGeneration: canonicalize(record.binding.policyGeneration),
  } } } };
}
function publishedDecision(given: RuleGiven, record: EvidenceJobRecordV17, outcome: "passed" | EvidenceFailureV17["kind"], reason: string,
  updates: Map<number, EvidenceJobRecordV17>, eligiblePass = false): void {
  if (record.binding.subject.kind !== "published" || !record.commit || record.admittedAt === null) return;
  const subject = record.binding.subject, order = { publication: subject.publication.seq, job: record.admittedAt };
  const failure: EvidenceFailureV17 = { job: record.job, publication: subject.publication, commit: record.commit, order,
    decidedAt: given.resolved.self, kind: outcome === "passed" ? "unknown" : outcome, reason,
    result: outcome === "passed" || outcome === "failed" || outcome === "error" ? record.result : null };
  if (record.holdOwner !== null && (outcome !== "passed" || eligiblePass)) {
    const owner = updates.get(record.holdOwner) ?? copy(readRow(given, record.holdOwner).record);
    owner.holds = owner.holds.map(hold => {
      if (!record.covered.some(key => same(key, hold.key))) return hold;
      const next = outcome === "passed" && record.result ? passEvidenceHoldV17(hold, hold.key, { kind: "pass", decidedAt: given.resolved.self,
        through: order, job: record.job, publication: subject.publication, result: record.result }, true) : failEvidenceHoldV17(hold, failure);
      if (!next.ok) throw Error("A funded evidence hold decision is inconsistent");
      return next.record;
    });
    updates.set(record.holdOwner, owner);
  }
  // A genuine native timeout/error decision is recorded as that cause. A
  // bare unavailable observation never becomes an invented failed result.
  if (outcome !== "passed" && outcome !== "unknown" && outcome !== "observation-unavailable" && record.incident && record.incident.cause === null) {
    const next = decideEvidenceIncidentV17(record.incident, failure);
    if (!next.ok) throw Error("A funded incident decision is inconsistent");
    record.incident = next.incident;
  }
}
function hydrateTimeout(given: RuleGiven, row: { item: Item; record: EvidenceJobRecordV17 }, record: EvidenceJobRecordV17,
  updates: Map<number, EvidenceJobRecordV17>): EvidenceFailureV17 | null {
  const cause = literalTimeoutCause(given.state, given.own, row);
  if (!cause) return null;
  if (record.incident && record.incident.cause === null) {
    const next = decideEvidenceIncidentV17(record.incident, cause);
    if (!next.ok) throw new RuleFault("The admitted timeout incident is unavailable");
    record.incident = next.incident;
  }
  if (record.holdOwner !== null) {
    const owner = updates.get(record.holdOwner) ?? copy(readRow(given, record.holdOwner).record);
    owner.holds = owner.holds.map(hold => {
      if (!record.covered.some(key => same(key, hold.key))) return hold;
      // A later normal entry may already have refined this same timeout
      // to an observation/result reason. Retain that newer hold history.
      if (hold.failure && same(hold.failure.job, cause.job) && same(hold.failure.publication, cause.publication)
        && hold.failure.decidedAt >= cause.decidedAt) return hold;
      const next = failEvidenceHoldV17(hold, cause);
      if (!next.ok) throw new RuleFault("The admitted timeout hold is unavailable");
      return next.record;
    });
    updates.set(record.holdOwner, owner);
  }
  updates.set(row.item.id, record);
  return cause;
}
/** The local marker names one real opening entry. An empty or unknown
 * triager answer never clears it or spends another held notice count. */
export function evidenceNoticeOpeningV17(given: RuleGiven, item: Item, record: EvidenceJobRecordV17): Pick<OutcomeGives, "effects" | "opens"> {
  const marked = item.values["noticeOpenedAt"];
  if (marked !== undefined && marked !== null) {
    const opened = natural(marked) ? given.own(marked)?.entry : null;
    const matches = opened?.effects.filter(effect => effect.effect === "operation" && effect.owner === "platform:destination@17"
      && effect.kind === EVIDENCE_NOTICE_V17 && (effect.for === "self" ? opened?.seq : effect.for) === record.holder) ?? [];
    if (!opened || matches.length !== 1 || !opened.effects.some(effect => effect.effect === "value" && effect.item === item.id && effect.slot === "noticeOpenedAt" && effect.value === opened.seq))
      throw new RuleFault("The original incident notice is unavailable");
    return { effects: [], opens: [] };
  }
  if (!record.incident?.cause || record.noticeAt !== null) return { effects: [], opens: [] };
  return { effects: [{ effect: "value", item: item.id, slot: "noticeOpenedAt", value: given.resolved.self }],
    opens: [openingV17(EVIDENCE_NOTICE_V17, record.holder)] };
}
function recoverIncident(given: RuleGiven, row: { item: Item; record: EvidenceJobRecordV17 }, carrier?: Pick<OutcomeGives, "effects" | "opens" | "sends">): OutcomeGives {
  const record = copy(row.record), updates = new Map<number, EvidenceJobRecordV17>([[row.item.id, record]]);
  hydrateTimeout(given, row, record, updates);
  const opening = evidenceNoticeOpeningV17(given, row.item, record);
  const effects = [...updates].filter(([id, value]) => !same(readEvidenceJobRecordWireV17(given.state.item(id)?.values["record"]), value))
    .map(([id, value]) => evidenceRecordEffectV17(id, value));
  effects.push(...opening.effects);
  if ((effects.length || opening.opens.length) && !evidenceCarryingBudgetV17(given, [...(carrier?.effects ?? []), ...effects],
    [...(carrier?.opens ?? []), ...opening.opens], carrier?.sends ?? [], []).admitted) throw new RuleFault("The funded incident recovery entry is unavailable");
  return { effects, sends: [], opens: opening.opens };
}
function evidenceBlockedRecovery(given: RuleGiven, paths: readonly string[], carrier: Pick<OutcomeGives, "effects" | "opens" | "sends">): Pick<OutcomeGives, "effects" | "opens"> {
  const cause = firstEvidenceBlock(given, paths), row = cause && evidenceRowV17(given.state, cause.job);
  return row ? recoverIncident(given, row, carrier) : { effects: [], opens: [] };
}
function recoveryRow(given: RuleGiven): { item: Item; record: EvidenceJobRecordV17 } | null {
  const item = given.resolved.subjects.get("also.job"), record = item && readEvidenceJobRecordWireV17(item.values["record"]);
  const admission = record && destinationEvidenceJob(given.state, given.own, record.job);
  return item && item.type === "evidence-job" && record && admission && same(admission.admission, given.resolved.fields["admission"])
    ? { item, record: currentEvidenceRecordV17(item, record) } : null;
}
function recoveryAuthority(given: RuleGiven): boolean {
  if (given.input.type !== "act") return false;
  const grant = given.input.grant, observation = grant?.fresh.observation, now = timeMs(given.time), at = observation ? timeMs(observation.at) : null;
  if (!grant || !observation || "subject" in observation || now === null || at === null || now < at || now - at > 10000
    || grant.key !== given.input.signed.intent.actor || observation.key !== grant.key || !same(grant.subject, { membership: observation.of, member: observation.member })
    || observation.keyState !== "active" || observation.memberState !== "active" || observation.controllerActive === false
    || !observation.actions.includes("destination.read-token") || !grant.actions.includes("destination.read-token")) return false;
  if (grant.actions.includes("issue.triage") && observation.actions.includes("issue.triage")) return true;
  const row = recoveryRow(given), subject = row?.record.binding.subject, operation = subject?.kind === "published"
    ? given.state.item(subject.publication.seq)?.refs["operation"] : null;
  const supplied = given.resolved.fields["operation"];
  const merge = isFactRef(operation) && same(operation, supplied) ? foreign(given, operation) : null;
  if (merge?.input.type !== "act" || merge.input.signed.intent.kind !== "merge" || merge.input.authority.length !== 1) return false;
  const accepted = merge.input.authority[0]!;
  return accepted.key === merge.input.signed.intent.actor && same(accepted.subject, grant.subject);
}
function evidenceResult(given: RuleGiven, operation: Operation): OutcomeGives {
  if (operation.for === undefined) throw Error("An evidence result has no funded job");
  const row = operationRow(given, operation), record = copy(row.record), view = evidencePolicyV17(given), fields = resultFields(given, operation);
  if (!["admitted", "timeout", "unknown"].includes(record.state)) return { effects: [], sends: [], opens: [] };
  const initial = new Map<number, EvidenceJobRecordV17>([[row.item.id, record]]);
  hydrateTimeout(given, row, record, initial);
  const refuse = (reason: string): OutcomeGives => {
    const held = { ...copy(record), reason, observedGeneration: view?.serviceGeneration ?? null };
    const updates = new Map(initial); updates.set(row.item.id, held);
    publishedDecision(given, held, "observation-unavailable", reason, updates);
    const notice = evidenceNoticeOpeningV17(given, row.item, held);
    return { effects: [...serviceEffect(given, view), ...[...updates].map(([id, record]) => evidenceRecordEffectV17(id, record)), ...notice.effects],
      sends: [decisionRequest(held, reason, "result")], opens: notice.opens };
  };
  if (!fields || !isFactRef(fields["result"]) || !same(fields["job"], record.job)) return refuse("evidence-invalid");
  const actual = given.uses.find(use => same(use.fact, fields["result"])), admission = destinationEvidenceJob(given.state, given.own, record.job);
  if (!actual || !admission) return refuse("evidence-unavailable");
  const decision = readEvidenceDecisionV17({ entry: actual.entry, hash: actual.fact.hash }, { job: record.job, admission: admission.admission,
    bindingDigest: record.bindingDigest, tree: record.tree!, configuration: record.configuration });
  if (!decision) return refuse("not-this-check");
  const check = view?.policy.checks.find(check => check.name === record.name && check.configuration === record.configuration);
  const source = check ? evidenceSourceV17(record.binding, check, view, keyObservation(given, decision.key), given.time) : null;
  if (!source?.ok) return refuse(source?.reason ?? "evidence-unavailable");
  if (record.binding.subject.kind === "landing") {
    const publication = given.state.item(record.binding.subject.publication.seq);
    if (!publication || publication.state !== "reserved") return refuse("subject-ended");
  }
  record.state = decision.outcome; record.result = decision.result; record.signer = decision.key;
  // The complete signed reason (up to 4096 bytes) stays in the retained
  // result fact. This bounded native summary never truncates or retypes it.
  record.decidedAt = given.resolved.self; record.reason = decision.outcome === "error" ? "check-error" : decision.reason; record.observedGeneration = view!.serviceGeneration;
  const updates = new Map(initial); updates.set(row.item.id, record);
  if (record.reuseOwner !== null) {
    const owner = record.reuseOwner === row.item.id ? record : copy(readRow(given, record.reuseOwner).record);
    if (!owner.reuse) throw Error("A funded candidate index is unavailable");
    const candidate: EvidenceCandidateV17 = { job: record.job, keyDigest: evidenceKeyDigestV17(owner.reuse.key), admission: record.admittedAt!,
      result: decision.result, decidedBy: given.resolved.self, key: decision.key, checker: record.binding.checker, binding: record.binding, outcome: decision.outcome === "passed" ? "passed" : "failed" };
    const next = decision.outcome === "error" ? releaseEvidenceCandidateV17(owner.reuse, record.job) : settleEvidenceCandidateV17(owner.reuse, candidate, candidate => same(candidate.job, record.job)
      ? evidenceSourceV17(candidate.binding, check!, view, keyObservation(given, candidate.key), given.time, false, null, false).ok
      : acceptedCandidate(given, candidate, check!, view!));
    if (!next.ok) throw Error("A reserved candidate cannot be settled"); owner.reuse = next.record; updates.set(record.reuseOwner, owner);
  }
  publishedDecision(given, record, decision.outcome, record.reason ?? decision.outcome, updates,
    same(record.binding.policyGeneration, { rules: view!.rules, seq: view!.revision }));
  const sends = [decisionRequest(record, "counted", "result")], incident = incidentRequest(given, record);
  if (incident) sends.push(incident);
  const notice = evidenceNoticeOpeningV17(given, row.item, record);
  const progress = [...(landingNeedsProgress(given, record) ? [openingV17(EVIDENCE_PROGRESS_V17, record.holder)] : []), ...notice.opens];
  const effects: RuleEffect[] = [...serviceEffect(given, view), { effect: "value", item: row.item.id, slot: "deadline", value: null },
    { effect: "state", item: record.requestAt, state: "settled" }, ...notice.effects];
  if (record.binding.subject.kind === "published" && record.covered.length && record.policyOwner !== null) effects.push(...evidenceSettlePendingCapacityV17(given,
    record.policyOwner, record.covered, record.job, decision.outcome === "passed" && same(record.binding.policyGeneration, { rules: view!.rules, seq: view!.revision }) ? record.binding.subject.publication.seq : null));
  for (const [id, next] of updates) {
    effects.push(evidenceRecordEffectV17(id, next));
    if (given.state.item(id)?.state !== evidenceRecordState(next, id)) effects.push({ effect: "state", item: id, state: evidenceRecordState(next, id) });
  }
  if (!evidenceCarryingBudgetV17(given, effects, progress, sends, []).admitted) throw Error("A funded evidence result does not fit its entry");
  return { effects, sends, opens: progress };
}

function evidenceNotice(given: RuleGiven, operation: Operation): OutcomeGives {
  if (operation.for === undefined) throw Error("An evidence notice has no funded job");
  if (given.input.type !== "outcome" || given.input.result !== "confirmed") return { effects: [], sends: [], opens: [] };
  const row = operationRow(given, operation), record = copy(row.record), request = incidentRequest(given, record);
  if (!request && record.noticeAt === null) throw new RuleFault("The incident awaits a complete nonempty bounded triager observation");
  return { effects: [evidenceRecordEffectV17(row.item.id, record), ...(row.item.state === evidenceRecordState(record, row.item.id) ? []
    : [{ effect: "state" as const, item: row.item.id, state: evidenceRecordState(record, row.item.id) }])], sends: request ? [request] : [], opens: [] };
}
/** The keys of exactly the generations this progress turn may retain.
 * Reads supply retained Native records; this helper creates no authority. */
export function evidenceProgressCohortV17(required: readonly Pick<RulesCheckV13, "name" | "audit">[], generations: readonly CertifiedGenerationV17[],
  current: EvidenceJobRecordV17, read: (job: FactRef) => EvidenceJobRecordV17 | null,
  alias: (generation: CertifiedGenerationV17) => FactRef | null, audit: (logical: FactRef) => EvidenceJobRecordV17 | null): { applies: boolean; keys: readonly KeyId[] } {
  const actual = current.countedJob ? read(current.countedJob) : current;
  const replaces = required.some(check => check.name === current.name);
  const applies = replaces || current.binding.auditOf !== null && current.forJob !== null && required.some(check => {
    const selected = generations.find(row => row.name === check.name);
    return !!check.audit && !!selected && same(alias(selected) ?? selected.job, current.forJob)
      && same(audit(current.forJob!)?.job, current.job);
  });
  if (!applies) return { applies: false, keys: [] };
  // Failed/error progress aborts before reading retained generations. The
  // deciding signer still owns the fresh eligibility/wrong-source check.
  if (current.state === "failed" || current.state === "error") return { applies: true, keys: actual?.signer ? [actual.signer] : [] };
  const keys = new Set<KeyId>();
  for (const check of required) {
    const replacing = check.name === current.name;
    const selected = generations.find(row => row.name === check.name);
    const record = replacing ? actual : selected ? read(selected.job) : null;
    if (record?.signer) keys.add(record.signer);
    const logical = replacing ? current.job : selected ? alias(selected) ?? selected.job : null;
    if (check.audit && logical) { const pair = audit(logical); if (pair?.signer) keys.add(pair.signer); }
  }
  return { applies: true, keys: [...keys] };
}
function progressCohort(given: RuleGiven, record: EvidenceJobRecordV17): { applies: boolean; keys: readonly KeyId[] } {
  if (record.binding.subject.kind !== "landing") return { applies: false, keys: [] };
  const publication = given.state.item(record.binding.subject.publication.seq), snapshot = publication && certifiedPublicationStateWireV17(publication.values["passes"], given.resolved.bounds);
  if (!snapshot) return { applies: false, keys: [] };
  return evidenceProgressCohortV17(snapshot.policy.required, snapshot.generations, record,
    job => evidenceRowV17(given.state, job)?.record ?? null,
    selected => projectedLogicalJob(given, publication!.id, selected),
    logical => evidenceOwnerV17(given.state, "policyKey", evidenceAuditKeyV17(logical))?.record ?? null);
}
function evidenceProgress(given: RuleGiven, operation: Operation): OutcomeGives {
  const row = operationRow(given, operation), record = row.record;
  if (record.binding.subject.kind !== "landing" || given.input.type !== "outcome" || given.input.result !== "confirmed") return { effects: [], sends: [], opens: [] };
  // An audit result remains retained even when its parent projection has
  // moved on. Only that obsolete progress is a no-op; a pending parent's
  // later progress reads the actual sealed audit through its own pairing.
  if (!progressCohort(given, record).applies) return { effects: [], sends: [], opens: [] };
  const view = evidencePolicyV17(given);
  const publication = given.state.item(record.binding.subject.publication.seq);
  if (!publication || publication.state !== "reserved") return { effects: [], sends: [], opens: [] };
  if (!["admitted", "passed", "failed", "error", "reused", "timeout", "unknown"].includes(record.state)) return { effects: [], sends: [], opens: [] };
  const actual = evidenceRowV17(given.state, record.countedJob ?? record.job)?.record ?? record;
  const check = view?.policy.checks.find(check => check.name === record.name && check.configuration === record.configuration);
  const frozen = certifiedPublicationStateWireV17(publication.values["passes"], given.resolved.bounds)?.policy;
  const eligible = check && view && frozen && view.revision === frozen.observation.revision && (actual.signer === null
    || evidenceSourceV17(actual.binding, check, view, keyObservation(given, actual.signer), given.time, false, null, false).ok);
  if (!eligible) {
    const refused = { ...record, reason: "wrong-source", observedGeneration: view?.serviceGeneration ?? null };
    return { effects: [...serviceEffect(given, view), evidenceRecordEffectV17(row.item.id, refused)], sends: [decisionRequest(refused, "wrong-source", "result")], opens: [] };
  }
  const projection = landingEffects(given, record);
  return { ...projection, effects: [...serviceEffect(given, view), ...projection.effects] };
}

export function evidenceDestinationRulesV17(base: Rules): Rules {
  const outcome = (kind: "admit" | "result" | "notice" | "progress"): Extract<Rules[string], { place: "outcome" }> => ({ place: "outcome", clock: true, rules: {
    selects: kind === "admit", read: false, retries: () => false,
    most: { effects: 16, requests: 3, operations: 2 },
    origin: (given, operation) => kind === "notice" ? operationRow(given, operation).record.admittedAt : Number(operation.id.split(":")[0]),
    unknown: () => ({}),
    wellFormed: (result, answer, given) => {
      if (result !== "confirmed") return kind !== "notice" && exact(answer.body, []);
      if (answer.basis !== "own-answer" || !exact(answer.body, ["job"]) || given.input.type !== "outcome") return false;
      const operation = given.state.operation(given.input.operation), row = operation ? operationRow(given, operation) : null;
      return !!row && same(answer.body["job"], row.record.job);
    },
    subjects: (given, operation, row, first) => {
      const record = operationRow(given, operation).record;
      if (!record) return [];
      if (kind === "progress") return row === 1 ? progressCohort(given, record).keys : [];
      if (row === 1) return [record.binding.checker.member];
      if (row !== (kind === "result" ? 3 : 2)) return [];
      const keys = new Set<string>();
      const result = resultFields(given, operation)?.["result"], entry = isFactRef(result) ? foreign(given, result) : null;
      if (entry?.input.type === "act") keys.add(entry.input.signed.intent.actor);
      if (kind === "admit") {
        const observation = first?.observed({ asked: "rules" })?.observation;
        if (observation && "subject" in observation && observation.subject === "rules" && observation.content.asked === "rules" && observation.content.extents) {
          const extents = given.value(RULES_EXTENTS_VALUE_V13.domain, observation.content.extents, RULES_EXTENTS_VALUE_V13.max);
          const read = readRulesPolicyObservationV17(observation, { rules: observation.of, destination: given.resolved.at, extents }, given.time);
          if (read.ok && read.view.policy.roomService) keys.add(read.view.policy.roomService.key);
        }
      }
      const owner = record.reuseOwner === null ? null : given.state.item(record.reuseOwner);
      const bucket = readEvidenceJobRecordWireV17(owner?.values["record"])?.reuse;
      for (const candidate of bucket?.candidates ?? []) keys.add(candidate.key);
      // Pending admission chooses its real owner only after the source is
      // proved. The six-part key is already derivable from the pending job.
      if (kind === "admit" && record.reuseOwner === null) {
        const candidate = evidenceOpening(given, record)?.record;
        const stored = candidate?.reuseOwner === undefined || candidate.reuseOwner === null || candidate.reuseOwner === given.resolved.self ? null : given.state.item(candidate.reuseOwner);
        for (const value of readEvidenceJobRecordWireV17(stored?.values["record"])?.reuse?.candidates ?? []) keys.add(value.key);
      }
      return [...keys];
    },
    derives: (given, operation) => kind === "admit" ? evidenceAdmission(given, operation) : kind === "result" ? evidenceResult(given, operation) : kind === "progress" ? evidenceProgress(given, operation) : evidenceNotice(given, operation),
  } });
  return { ...base,
    "evidence-capacity-anchor-v17": { place: "type", run: (_given, value) => evidenceCapacityValidV17(value) },
    "evidence-record-v17": { place: "type", run: (_given, value) => readEvidenceJobRecordWireV17(value) !== null },
    "evidence-counts-v17": { place: "type", run: (_given, value) => readEvidenceCountsV17(value) !== null },
    "evidence-service-v17": { place: "type", run: (_given, value) => readEvidenceServiceWireV17(value) !== null },
    "evidence-fence-v17": { place: "guard", refusals: ["not-this-check", "already-admitted"], run: given => {
      const record = proposed(given); if (!record) return { holds: false, name: "not-this-check" };
      if (record.binding.subject.kind !== "work") {
        const publication = given.resolved.subjects.get("also.publication");
        if (!publication || publication.id !== record.binding.subject.publication.seq || !same(publication.refs["operation"], given.resolved.fields["operation"])) return { holds: false, name: "not-this-check" };
      }
      const pending = given.state.lookup(record.binding.stage === "work" ? "evidence-request" : "evidence-slot", "job", canonicalize(record.job), 1);
      return pending && pending.length === 0 && !evidenceRowV17(given.state, record.job) ? { holds: true } : { holds: false, name: "already-admitted" };
    } },
    "evidence-holder-v17": { place: "also", bind: items => items.length === 1 ? items[0]!.id : null },
    "evidence-publication-v17": { place: "also", run: (given: RuleGiven) => {
      const operation = given.resolved.fields["operation"];
      if (!isFactRef(operation)) return null;
      const ids = given.state.lookup("publication", "operation", canonicalize(operation), 2);
      if (!ids || ids.length > 1) throw new RuleFault("The publication operation index is unavailable");
      if (!ids.length) return null;
      const item = given.state.item(ids[0]!);
      if (!item || item.type !== "publication" || !same(item.refs["operation"], operation)) throw new RuleFault("The indexed publication is unavailable");
      return item.id;
    } },
    "evidence-admitted-job-v17": { place: "also", run: (given: RuleGiven) => {
      const fact = given.resolved.fields["admission"];
      if (!isFactRef(fact) || !same(fact.at, given.resolved.at)) return null;
      const item = given.state.item(fact.seq), record = item && readEvidenceJobRecordWireV17(item.values["record"]);
      if (!item || item.type !== "evidence-job" || !record) return null;
      const actual = destinationEvidenceJob(given.state, given.own, record.job);
      return actual && same(actual.admission, fact) ? item.id : null;
    } },
    "evidence-open-v17": { place: "effect", most: 5, run: given => {
      const record = proposed(given); if (!record) throw Error("An admitted evidence fence lost its job");
      return [...(record.binding.stage === "work" ? [{ effect: "ref" as const, item: given.resolved.self, slot: "lane", to: record.job.at }]
        : [{ effect: "open" as const, item: given.resolved.self, type: "evidence-slot", state: "pending" }]),
        { effect: "value", item: given.resolved.self, slot: "job", value: record.job }, evidenceRecordEffectV17(given.resolved.self, record), ...openedEffectsV17(EVIDENCE_ADMIT_V17, record.holder)];
    } },
    "evidence-result-bound-v17": { place: "guard", refusals: ["not-this-check"], run: given => resultBound(given) ? { holds: true } : { holds: false, name: "not-this-check" } },
    "evidence-result-open-v17": { place: "effect", most: 2, run: given => { const row = resultBound(given); if (!row) throw Error("A result lost its admitted job"); return openedEffectsV17(EVIDENCE_RESULT_V17, row.record.holder); } },
    "evidence-release-v17": { place: "guard", clock: true, refusals: ["not-an-active-hold"], run: given => evidenceRelease(given) ? { holds: true } : { holds: false, name: "not-an-active-hold" } },
    "evidence-release-record-v17": { place: "effect", clock: true, most: 2, run: given => { const released = evidenceRelease(given); if (!released) throw Error("An authorized hold release lost its hold"); return [evidenceRecordEffectV17(released.item.id, released.record), ...released.effects]; } },
    "evidence-recovery-authority-v17": { place: "guard", clock: true, refusals: ["evidence-recovery-authority"], run: given => recoveryAuthority(given) ? { holds: true } : { holds: false, name: "evidence-recovery-authority" } },
    "evidence-recovery-ready-v17": { place: "guard", refusals: ["not-a-timed-incident"], run: given => {
      const row = recoveryRow(given); return row && literalTimeoutCause(given.state, given.own, row) ? { holds: true } : { holds: false, name: "not-a-timed-incident" };
    } },
    "evidence-recovery-v17": { place: "effect", most: 5, run: given => {
      const row = recoveryRow(given); if (!row) throw new RuleFault("The admitted recovery job is unavailable");
      const recovered = recoverIncident(given, row);
      return [...recovered.effects, ...recovered.opens.flatMap(open => openedEffectsV17(open.kind, row.record.holder))];
    } },
    "evidence-admit-v17": outcome("admit"), "evidence-result-v17": outcome("result"), "evidence-notice-v17": outcome("notice"),
    "evidence-progress-v17": outcome("progress"),
  };
}
export const evidenceJobStateV17 = (state: StateView, job: FactRef): { state: string; admittedAt: number | null } | null => {
  const record = evidenceRowV17(state, job)?.record; return record ? { state: record.state, admittedAt: record.admittedAt } : null;
};
export function evidenceReadyUpdateV17(given: RuleGiven, publication: Item, accounts: readonly EvidenceBatchRecordV17[]): RuleRequest | null {
  if (publication.state !== "reserved" || evidenceFundingReadyV17(given.state, publication) || accounts.length < 1 || accounts.length > 4
    || accounts.some((account, ordinal) => !readEvidenceBatchV17(account) || account.ordinal !== ordinal || account.total !== accounts.length
      || account.publication.seq !== publication.id || !same(account.publication.at, given.resolved.at)
      || !same(account.capture, accounts[0]!.capture) || !same(account.policy, accounts[0]!.policy))
    || !destinationStageConfirmedV17(given, publication, given.resolved.self)) return null;
  const opening = given.own(publication.id), reservation = typeof publication.values["reservedAt"] === "number" ? given.own(publication.values["reservedAt"]) : null;
  const operation = publication.refs["operation"], lane = publication.refs["lane"], tree = publication.values["tree"], commit = publication.values["integration"];
  if (!opening || !reservation || !isFactRef(operation) || !isScopeRef(lane) || !isObjectId(tree) || !isObjectId(commit)
    || accounts.some(account => !same(account.operation, operation) || !same(account.publication, { at: given.resolved.at, seq: publication.id, hash: opening.hash }))) return null;
  return { to: lane, message: { class: "request", type: "relate", body: { name: "publication", item: { at: given.resolved.at, seq: publication.id, hash: opening.hash },
    state: "reserved", detail: { operation, outcome: "committed", tree, commit, rules: accounts[0]!.policy.revision,
      reservationRef: `refs/artroom/reservations/${reservation.hash.slice(7)}`,
      ...(typeof publication.values["checkDeadline"] === "string" ? { checkDeadline: publication.values["checkDeadline"] } : {}) } } } };
}

/** Typed retention only. No integer is treated as a position merely because
 * it occurs somewhere in a code value. The snapshot is already folded. */
export function* evidenceFloorReferencesV17(snapshot: StateSnapshot, _definition: ValidDefinition, own: Own): Iterable<number> {
  yield* platformFloorReferences(snapshot, _definition, own);
  yield* evidenceFundingFloorReferencesV17(snapshot, own);
  const scope = snapshot.scope; if (!scope) return;
  const positions = new Set<number>();
  const position = (value: number | null) => { if (value !== null && natural(value)) positions.add(value); };
  const fact = (value: FactRef | null) => { if (value && same(value.at, scope.at)) position(value.seq); };
  for (const item of snapshot.items) {
    if (item.type === "branch") {
      const declined = readRulesCertificateDeclinedV17(item.values["rulesCertificateDeclined"]);
      if (declined) { fact(declined.request); fact(declined.interveningFact); }
      const ledger = item.refs["evidenceLedger"];
      if (typeof ledger === "number") position(ledger); else if (isFactRef(ledger)) fact(ledger);
    } else if (item.type === "evidence-ledger") {
      position(item.id);
    } else if (item.type === "evidence-batch") {
      const batch = readEvidenceBatchWireV17(item.values["batch"]), capacity = readEvidenceCapacityWireV17(item.values["capacity"]);
      if (!batch || !capacity) throw Error("Evidence batch floor record is malformed");
      position(item.id); position(batch.planAt); position(capacity.owner);
      fact(batch.publication); fact(batch.capture); fact(batch.operation);
      fact(batch.policy.certificate.request); fact(batch.policy.certificate.certificate);
      for (const row of capacity.holds ?? []) position(row.owner);
      for (const row of capacity.holds ?? []) for (const pending of row.pending) { fact(pending.publication); fact(pending.job); position(pending.admittedAt); }
    } else if (item.type === "evidence-job" || item.type === "evidence-request" || item.type === "evidence-slot") {
      const record = readEvidenceJobRecordWireV17(item.values["record"]); if (!record) throw Error("Evidence floor record is malformed");
      if (item.state === "settled") continue;
      position(item.id); position(record.admittedAt); position(record.decidedAt); position(record.holder); position(record.requestAt); position(record.noticeAt);
      const timeout = item.refs["timeoutDecision"], notice = item.values["noticeOpenedAt"];
      if (typeof timeout === "number") position(timeout); else if (isFactRef(timeout)) fact(timeout);
      if (natural(notice)) position(notice);
      for (const source of record.sourceFacts) fact(source);
      position(record.reuseOwner); position(record.holdOwner); position(record.policyOwner);
      for (const candidate of record.reuse?.candidates ?? []) { position(candidate.admission); position(candidate.decidedBy); fact(candidate.job); fact(candidate.result); }
      for (const hold of record.holds) {
        position(hold.failure?.decidedAt ?? null); position(hold.release?.decidedAt ?? null);
        fact(hold.failure?.publication ?? null); fact(hold.failure?.job ?? null); fact(hold.failure?.result ?? null);
        if (hold.release?.kind === "pass") { fact(hold.release.publication); fact(hold.release.job); fact(hold.release.result); }
      }
      if (record.incident?.cause) { position(record.incident.cause.decidedAt); fact(record.incident.cause.publication); }
      if (record.policy) { fact(record.policy.certificate.request); fact(record.policy.certificate.certificate); }
    } else if (item.type === "publication") {
      const wire = readEvidenceWireV17(item.values["passes"], CERTIFIED_PUBLICATION_TEXT_BYTES_V17), value = wire.ok ? wire.value : null;
      // The native type already checked this exact G17 generation grammar;
      // keep its deciding native entry even for a fresh conflicted-key job.
      if (isRecord(value) && Array.isArray(value["generations"]) && value["generations"].length <= 32) for (const generation of value["generations"]) {
        if (isRecord(generation) && isRecord(generation["proof"]) && natural(generation["proof"]["decided"])) position(generation["proof"]["decided"]);
      }
    }
  }
  for (const seq of positions) {
    const sealed = own(seq);
    if (!sealed || sealed.entry.seq !== seq || !same(sealed.entry.at, scope.at) || entryHash(sealed.entry) !== sealed.hash) throw Error("Evidence floor source is unavailable");
    yield seq;
  }
}
