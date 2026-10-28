/** G17-only admission. Retained values and observations must already have
 * passed native canonical/domain/member bounds and sibling authentication.
 * This module checks correspondence and policy; it neither fetches nor
 * authenticates an observation or a certificate supplied by a caller. */
import type { Digest, FactRef, Head, MemberObservation, Observation, RulesObservation, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, utf8, isDigest, isFactRef, isHead, isRecord, isScopeRef, parseStrict, same, timeMs, type EvidenceBinding, type ScopedRulesPosition } from "@generalbusiness/dap-bytes";
import { byteOrder, valueDigest } from "@generalbusiness/dap-derive";
import { classify } from "./extents.ts";
import { fileSound, judgeReservation, judgeReservationWithStanding, reservationCheckStatus, type Reservation, type ReservationAsked, type ReservationRead, type ReservationStanding, type ReservationWithStanding, type Statement } from "./reservation.ts";
import { checkSourceV13, checkStageV13, rulesPolicyProposalV13, RULES_CONTENT_BYTES_V13, type RulesCheckV13, type RulesPolicyV13 } from "./rules-policy-v13.ts";

/** Inputs from the native reader's exact, authenticated Q13 observation.
 * The single extents-3 envelope was admitted at most 262144 canonical UTF-8 bytes;
 * rules and destination come from the proven native sibling/own identity. */
export interface ReservationPolicyInputV17 {
  rules: ScopeRef;
  destination: ScopeRef;
  extents: unknown; // artroom-rules-extents-3
}
export interface RulesCertificateV17 { request: FactRef; certificate: FactRef; proof: Digest; commit: string }
export interface ReservationPolicyViewV17 {
  rules: ScopeRef;
  head: Head;
  revision: number;
  proposal: Digest;
  certificate: RulesCertificateV17;
  policy: RulesPolicyV13;
  serviceGeneration: ScopedRulesPosition;
}
export type RulesPolicyObservationV17 = { ok: true; view: ReservationPolicyViewV17 }
  | { ok: false; reason: "rules-not-configured" | "evidence-invalid" };
export type ReservationAskedV17 = ReservationAsked & { policy: ReservationPolicyInputV17 };
const exact = (value: unknown, names: readonly string[]): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const no = (reason: string): Reservation => ({ reserved: false, reason });
const SHA1 = /^(?!0{40}$)[0-9a-f]{40}$/;
const EXTENTS_DOMAIN = "artroom-rules-extents-3";
const EXTENTS_MAX_BYTES = 262144;
const envelopeFits = (value: unknown): boolean => {
  try { return utf8(canonicalize(value)).length <= EXTENTS_MAX_BYTES; } catch { return false; }
};

export interface EvidenceSourceRefusalV17 {
  reason: "wrong-source" | "checker-unavailable" | "evidence-invalid";
  frozenGeneration: ScopedRulesPosition;
  observedGeneration: ScopedRulesPosition | null;
}
export function evidenceKeyEligibleV17(check: RulesCheckV13, key: Observation | null, time: Timestamp): boolean {
  const now = timeMs(time), at = key && timeMs(key.at), end = key?.notAfter == null ? null : timeMs(key.notAfter);
  return !!key && now !== null && at !== null && now >= at && now - at <= 10000
    && same(key.of, check.checker.membership) && key.member === check.checker.member
    && key.keyState === "active" && key.memberState === "active" && key.role === "checker"
    && key.actions.includes("change.check") && key.controllerActive !== false && (key.notAfter === null || end !== null && end > now);
}
/** One predicate for current admission and both historical result outcomes.
 * Member authority never comes from a room-service mark. */
export function evidenceSourceV17(binding: EvidenceBinding, check: RulesCheckV13, view: ReservationPolicyViewV17 | null,
  key: Observation | null, time: Timestamp, admission = false, member: MemberObservation | null = null, unfinished = true): { ok: true } | ({ ok: false } & EvidenceSourceRefusalV17) {
  const no = (reason: EvidenceSourceRefusalV17["reason"]) => ({ ok: false as const, reason,
    frozenGeneration: binding.serviceGeneration, observedGeneration: view?.serviceGeneration ?? null });
  if (!view || binding.source !== checkSourceV13(check) || binding.stage !== checkStageV13(check)
    || binding.subject.kind !== binding.stage || !same(binding.checker, check.checker)) return no("wrong-source");
  if (admission && (!same(binding.policyGeneration, { rules: view.rules, seq: view.revision })
    || !same(binding.serviceGeneration, view.serviceGeneration) || !same(binding.roomService, view.policy.roomService))) return no("wrong-source");
  const now = timeMs(time), at = member && timeMs(member.at);
  const memberAdmission = admission && binding.source === "member" && member !== null && same(member.of, check.checker.membership)
    && member.member === check.checker.member && member.memberState === "active" && member.role === "checker" && member.activeKey === true
    && member.controllerActive !== false && now !== null && at !== null && now >= at && now - at <= 10000;
  if (!memberAdmission && !evidenceKeyEligibleV17(check, key, time)) return no("checker-unavailable");
  if (binding.source === "room") {
    const mark = view.policy.roomService;
    if (!mark || !same(mark.checker, check.checker) || !same(binding.roomService, mark)
      || unfinished && !same(binding.serviceGeneration, view.serviceGeneration) || key!.key !== mark.key) return no("wrong-source");
  }
  return { ok: true };
}

/** No parallel partial-policy projection: decode and hash the complete policy
 * from the authenticated envelope once, then compare the observer's MemberId projection.
 * Returned records are owned but mutable; do not cache/expose them across an
 * await without revalidation. A matching digest alone grants no authority. */
export function readRulesPolicyObservationV17(observed: RulesObservation | null, input: ReservationPolicyInputV17, time: Timestamp): RulesPolicyObservationV17 {
  const invalid = (): RulesPolicyObservationV17 => ({ ok: false, reason: "evidence-invalid" });
  if (!observed || observed.subject !== "rules" || observed.definition !== "platform:rules@13" || observed.content.asked !== "rules"
    || !isScopeRef(input.rules) || input.rules.kind !== "rules" || !same(observed.of, input.rules)
    || !isScopeRef(input.destination) || input.destination.kind !== "destination" || !isHead(observed.head)
    || !Number.isSafeInteger(observed.revision) || Object.is(observed.revision, -0) || observed.revision < 0 || observed.revision > observed.head.seq) return invalid();
  const at = timeMs(observed.at), now = timeMs(time);
  if (at === null || now === null || now < at || now - at > 10000) return invalid();
  const envelope = input.extents;
  if (!isRecord(envelope) || !exact(envelope, ["configured", "policy", "proposal", "certificate", "serviceGeneration"]) || typeof envelope["configured"] !== "boolean" || !envelopeFits(envelope)) return invalid();
  const outer = observed.content;
  if (!exact(outer, ["asked", "approvals", "ownerMayReview", "checks", "labels", "singleControllerException", "extents"]) || !isDigest(outer.extents)) return invalid();
  // Values are native byte-admitted before this call. Even the unconfigured
  // envelope must be the one this authenticated observation actually names.
  if (valueDigest(EXTENTS_DOMAIN, envelope) !== outer.extents) return invalid();
  const generation = envelope["serviceGeneration"];
  if (!isRecord(generation) || !exact(generation, ["rules", "seq"]) || !isScopeRef(generation["rules"]) || !same(generation["rules"], observed.of)
    || typeof generation["seq"] !== "number" || !Number.isSafeInteger(generation["seq"]) || Object.is(generation["seq"], -0)
    || generation["seq"] < 0 || generation["seq"] > observed.revision) return invalid();
  if (!envelope["configured"]) return envelope["policy"] === null && envelope["proposal"] === null && envelope["certificate"] === null
    && generation["seq"] === 0 ? { ok: false, reason: "rules-not-configured" } : invalid();
  const proposal = rulesPolicyProposalV13(envelope["policy"]);
  if (!proposal.ok || !isDigest(envelope["proposal"]) || proposal.digest !== envelope["proposal"]) return invalid();
  const { policy } = proposal;
  if (outer.approvals !== policy.approvals || outer.ownerMayReview !== policy.ownerMayReview || !same(outer.labels, policy.labels)
    || outer.singleControllerException !== (policy.singleControllerException === true)
    || !same(outer.checks, policy.checks.map(({ name, configuration, required, checker }) => ({ name, configuration, required, checker: checker.member })))
    || policy.roomService !== null && generation["seq"] === 0) return invalid();
  const certificate = envelope["certificate"];
  if (!isRecord(certificate) || !exact(certificate, ["request", "certificate", "proof", "commit"])
    || !isFactRef(certificate["request"]) || !isFactRef(certificate["certificate"]) || !isDigest(certificate["proof"])
    || typeof certificate["commit"] !== "string" || !SHA1.test(certificate["commit"])
    || !same(certificate["request"].at, input.destination) || !same(certificate["certificate"].at, input.destination)
    || certificate["request"].seq >= certificate["certificate"].seq) return invalid();
  const copy = (fact: FactRef): FactRef => ({ ...fact, at: { ...fact.at } });
  return { ok: true, view: { rules: { ...input.rules }, head: { ...observed.head }, revision: observed.revision, proposal: proposal.digest, policy, serviceGeneration: { rules: { ...generation["rules"] }, seq: generation["seq"] },
    certificate: { request: copy(certificate["request"]), certificate: copy(certificate["certificate"]), proof: certificate["proof"], commit: certificate["commit"] } } };
}

/** Authenticated namespace reply, read now by the host. The timestamp is the
 * host's current clock; callers separately bound the whole read sequence. */
export function readRulesPolicyReplyV17(reply: unknown, rules: ScopeRef, destination: ScopeRef, time: Timestamp): RulesPolicyObservationV17 {
  const invalid = (): RulesPolicyObservationV17 => ({ ok: false, reason: "evidence-invalid" });
  try {
    if (!exact(reply, ["answer", "values"]) || !isRecord(reply["answer"]) || !Array.isArray(reply["values"]) || reply["values"].length !== 1) return invalid();
    const answer = reply["answer"], retained: unknown = reply["values"][0];
    if (!exact(answer, ["subject", "of", "head", "revision", "definition", "content"]) || answer["subject"] !== "rules" || answer["definition"] !== "platform:rules@13"
      || !isScopeRef(answer["of"]) || !same(answer["of"], rules) || !isHead(answer["head"]) || typeof answer["revision"] !== "number"
      || !Number.isSafeInteger(answer["revision"]) || answer["revision"] < 0 || answer["revision"] > answer["head"].seq
      || !isRecord(answer["content"]) || !isDigest(answer["content"]["extents"]) || utf8(canonicalize(answer["content"])).length > RULES_CONTENT_BYTES_V13
      || !exact(retained, ["domain", "bytes"]) || retained["domain"] !== EXTENTS_DOMAIN || typeof retained["bytes"] !== "string"
      || retained["bytes"].length > EXTENTS_MAX_BYTES || utf8(retained["bytes"]).length > EXTENTS_MAX_BYTES) return invalid();
    const envelope = parseStrict(retained["bytes"]);
    if (!isRecord(envelope) || canonicalize(envelope) !== retained["bytes"] || valueDigest(EXTENTS_DOMAIN, envelope) !== answer["content"]["extents"]) return invalid();
    const proposed = rulesPolicyProposalV13(envelope["policy"]);
    if (!proposed.ok) return invalid();
    const policy = proposed.policy, content = { asked: "rules" as const, approvals: policy.approvals, ownerMayReview: policy.ownerMayReview,
      checks: policy.checks.map(({ name, configuration, required, checker }) => ({ name, configuration, required, checker: checker.member })), labels: policy.labels,
      singleControllerException: policy.singleControllerException === true, extents: answer["content"]["extents"] };
    if (!same(answer["content"], content)) return invalid();
    const observed: RulesObservation = { subject: "rules", of: answer["of"], head: answer["head"], revision: answer["revision"], definition: "platform:rules@13", content, at: time };
    return readRulesPolicyObservationV17(observed, { rules, destination, extents: envelope }, time);
  } catch { return invalid(); }
}

/** Full, distinct descriptors, not a passed-name list. Every global required
 * check is included even when no touched extent names it. Unknown touched
 * extent names or policy descriptors refuse rather than yielding []. */
export function requiredChecksV17(value: unknown, touched: readonly string[]): { ok: true; checks: readonly RulesCheckV13[] } | { ok: false } {
  const proposal = rulesPolicyProposalV13(value);
  if (!proposal.ok || touched.length > 8 || touched.some(name => !proposal.policy.extents.some(extent => extent.name === name))) return { ok: false };
  const names = new Set([...proposal.policy.checks.filter(check => check.required).map(check => check.name),
    ...proposal.policy.extents.filter(extent => touched.includes(extent.name)).flatMap(extent => extent.checks)]);
  const checks = [...names].sort(byteOrder).map(name => proposal.policy.checks.find(check => check.name === name)).filter(check => check !== undefined && checkStageV13(check) === "landing");
  return checks.every((check): check is RulesCheckV13 => check !== undefined) ? { ok: true, checks } : { ok: false };
}

/** Keep G17's head/path/integration/current-merger refusals ahead of policy
 * decoding. The evidence-only prefix is the historical function itself;
 * the remaining short prefix deliberately matches that frozen contract.
 * Running the entire old judge first is insufficient: its touched-extent
 * unmet result could hide invalid global-check evidence. */
function beforePolicy(asked: ReservationAsked): Reservation | null {
  const early = judgeReservation({ ...asked, read: null });
  if (early.reserved !== null) return early;
  const { read, evidence, time } = asked;
  if (!read || !read.rules || read.rules.content.asked !== "rules") return { reserved: null };
  const { manifest, merger } = read;
  if (manifest.base !== evidence.head) return no("out-of-date");
  const edited = manifest.file ?? null;
  if (edited !== null && (!fileSound(edited) || evidence.changes === null || "over" in evidence.changes || !evidence.changes.paths.every(path => path === edited.path))) return no("integration-invalid");
  if (manifest.tree === null || manifest.integration === null || evidence.tree !== manifest.tree || evidence.firstParent !== manifest.base
    || (manifest.reports !== null && !manifest.reports.every(commit => evidence.ancestors.includes(commit)))) return no("integration-invalid");
  const at = merger ? timeMs(merger.at) : null, now = timeMs(time);
  if (!merger || at === null || now === null || now < at || now - at > 10000 || merger.keyState !== "active" || merger.memberState !== "active"
    || !merger.actions.includes("change.merge") || (merger.controller !== null || merger.controllerActive !== null) && merger.controllerActive !== true) return no("authority-lost");
  return null;
}

function policyRead(asked: ReservationAskedV17): { ok: true; view: ReservationPolicyViewV17; read: ReservationRead; required: readonly RulesCheckV13[] } | { ok: false; reason: string } {
  const decoded = readRulesPolicyObservationV17(asked.read?.rules ?? null, asked.policy, asked.time);
  if (!decoded.ok) return decoded;
  const changes = asked.evidence.changes;
  if (!asked.read || !changes || "over" in changes) return { ok: false, reason: "evidence-invalid" };
  const { view } = decoded;
  const touched = classify(view.policy.extents, changes.paths, changes.links, changes.unreadable);
  const required = requiredChecksV17(view.policy, touched.touched.map(row => row.extent));
  if (!required.ok) return { ok: false, reason: "evidence-invalid" };
  const landing = new Set(view.policy.checks.filter(check => checkStageV13(check) === "landing").map(check => check.name));
  const rules = asked.read.rules;
  if (!rules || rules.content.asked !== "rules") return { ok: false, reason: "evidence-invalid" };
  return { ok: true, view, required: required.checks, read: { ...asked.read,
    rules: { ...rules, content: { ...rules.content, checks: rules.content.checks.filter(check => landing.has(check.name)) } },
    extents: view.policy.extents.map(extent => ({ ...extent, checks: extent.checks.filter(name => landing.has(name)) })), singleControllerException: view.policy.singleControllerException === true } };
}

/** Check full checker membership/incarnation against the actual current key
 * observation. Historical opening/deciding/signing/grant proof is still
 * supplied by the native retained-lane reader; this is no boolean bypass. */
function requiredStanding(statement: Statement, read: ReservationRead, required: readonly RulesCheckV13[], time: Timestamp): { status: "met"; checks: ReservationStanding["checks"] } | { status: "invalid" | "unmet" } {
  let invalid = false, unmet = false;
  const checks: ReservationStanding["checks"][number][] = [];
  for (const descriptor of required) {
    const status = reservationCheckStatus(statement, read, descriptor.name);
    if (status !== "met") { invalid ||= status === "invalid"; unmet ||= status === "unmet"; continue; }
    const job = statement.jobs.find(job => job.name === descriptor.name)!, key = read.checks[descriptor.name]!.key!;
    const at = timeMs(key.at), now = timeMs(time);
    if (!job.decidedBy || !same(key.of, descriptor.checker.membership) || key.member !== descriptor.checker.member
      || at === null || now === null || now < at || now - at > 10000) { invalid = true; continue; }
    checks.push({ name: descriptor.name, job: job.job, result: job.decidedBy, key: key.key });
  }
  return invalid ? { status: "invalid" } : unmet ? { status: "unmet" } : { status: "met", checks };
}

/** Non-list final admission: the global+touched union is mandatory, including
 * its complete job/result/key provenance. Historical policy logic retains
 * independent reviews, protected-controller standing and the exception. */
export function judgeReservationV17(asked: ReservationAskedV17): ReservationWithStanding {
  const early = beforePolicy(asked);
  if (early !== null) return early;
  const selected = policyRead(asked);
  if (!selected.ok) return no(selected.reason);
  const judged = judgeReservationWithStanding({ ...asked, read: selected.read });
  // Earlier evidence failures still win. For policy-stage answers, aggregate
  // every required status before returning unmet or success: invalid wins.
  if (judged.reserved === null || judged.reserved === false && judged.reason !== "incomplete" && !judged.reason.startsWith("rules-not-met")) return judged;
  const required = requiredStanding(asked.statement, selected.read, selected.required, asked.time);
  if (required.status !== "met") return no(required.status === "invalid" ? "evidence-invalid" : "rules-not-met");
  if (!judged.reserved) return judged;
  if (!judged.standing) return no("evidence-invalid");
  return { ...judged, standing: { base: judged.standing.base, checks: required.checks } };
}

/** Initial list admission is a different result type, never reserved:true.
 * Tree-bound jobs do not exist before stage. Retain this complete policy and
 * required descriptor set with the publication, then use the native shared
 * current-generation completion predicate before final push/mint. A missing
 * captured snapshot or incomplete standing must refuse that later gate. */
export type ListEligibilityV17 = { eligible: true; integration: string; reason: string | null; standing: ReservationStanding; view: ReservationPolicyViewV17; required: readonly RulesCheckV13[] }
  | { eligible: false; reason: string } | { eligible: null };
export function judgeListEligibilityV17(asked: ReservationAskedV17): ListEligibilityV17 {
  const early = beforePolicy(asked);
  if (early !== null) return early.reserved === null ? { eligible: null } : { eligible: false, reason: early.reserved ? "evidence-invalid" : early.reason };
  const selected = policyRead(asked);
  if (!selected.ok) return { eligible: false, reason: selected.reason };
  const rules = selected.read.rules!;
  if (rules.content.asked !== "rules") return { eligible: false, reason: "evidence-invalid" };
  const withoutJobs: ReservationRead = { ...selected.read, rules: { ...rules, content: { ...rules.content, checks: [] } },
    extents: selected.view.policy.extents.map(extent => ({ ...extent, checks: [] })) };
  const judged = judgeReservationWithStanding({ ...asked, read: withoutJobs });
  if (judged.reserved === null) return { eligible: null };
  if (!judged.reserved) return { eligible: false, reason: judged.reason };
  if (!judged.standing) return { eligible: false, reason: "evidence-invalid" };
  return { eligible: true, integration: judged.integration, reason: judged.reason, standing: judged.standing, view: selected.view, required: selected.required };
}
