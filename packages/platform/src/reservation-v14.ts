/** G14-only admission. Retained values and observations must already have
 * passed native canonical/domain/member bounds and sibling authentication.
 * This module checks correspondence and policy; it neither fetches nor
 * authenticates an observation or a certificate supplied by a caller. */
import type { Digest, FactRef, Head, RulesObservation, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, utf8, isDigest, isFactRef, isHead, isRecord, isScopeRef, same, timeMs } from "@generalbusiness/dap-bytes";
import { byteOrder, valueDigest } from "@generalbusiness/dap-derive";
import { classify } from "./extents.ts";
import { fileSound, judgeReservation, judgeReservationWithStanding, reservationCheckStatus, type Reservation, type ReservationAsked, type ReservationRead, type ReservationStanding, type ReservationWithStanding, type Statement } from "./reservation.ts";
import { rulesPolicyProposalV11, type RulesCheckV11, type RulesPolicyV11 } from "./rules-policy-v11.ts";

/** Inputs from the native reader's exact, authenticated Q11 observation.
 * The single extents-2 envelope was admitted at most 262144 canonical UTF-8 bytes;
 * rules and destination come from the proven native sibling/own identity. */
export interface ReservationPolicyInputV14 {
  rules: ScopeRef;
  destination: ScopeRef;
  extents: unknown; // artroom-rules-extents-2
}
export interface RulesCertificateV14 { request: FactRef; certificate: FactRef; proof: Digest; commit: string }
export interface ReservationPolicyViewV14 {
  rules: ScopeRef;
  head: Head;
  revision: number;
  proposal: Digest;
  certificate: RulesCertificateV14;
  policy: RulesPolicyV11;
}
export type RulesPolicyObservationV14 = { ok: true; view: ReservationPolicyViewV14 }
  | { ok: false; reason: "rules-not-configured" | "evidence-invalid" };
export type ReservationAskedV14 = ReservationAsked & { policy: ReservationPolicyInputV14 };
const exact = (value: Record<string, unknown>, names: readonly string[]): boolean =>
  Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const no = (reason: string): Reservation => ({ reserved: false, reason });
const SHA1 = /^(?!0{40}$)[0-9a-f]{40}$/;
const EXTENTS_DOMAIN = "artroom-rules-extents-2";
const EXTENTS_MAX_BYTES = 262144;
const envelopeFits = (value: unknown): boolean => {
  try { return utf8(canonicalize(value)).length <= EXTENTS_MAX_BYTES; } catch { return false; }
};

/** No parallel partial-policy projection: decode and hash the complete policy
 * from the authenticated envelope once, then compare the observer's MemberId projection.
 * Returned records are owned but mutable; do not cache/expose them across an
 * await without revalidation. A matching digest alone grants no authority. */
export function readRulesPolicyObservationV14(observed: RulesObservation | null, input: ReservationPolicyInputV14, time: Timestamp): RulesPolicyObservationV14 {
  const invalid = (): RulesPolicyObservationV14 => ({ ok: false, reason: "evidence-invalid" });
  if (!observed || observed.subject !== "rules" || observed.definition !== "platform:rules@11" || observed.content.asked !== "rules"
    || !isScopeRef(input.rules) || input.rules.kind !== "rules" || !same(observed.of, input.rules)
    || !isScopeRef(input.destination) || input.destination.kind !== "destination" || !isHead(observed.head)
    || !Number.isSafeInteger(observed.revision) || observed.revision < 0 || observed.revision > observed.head.seq) return invalid();
  const at = timeMs(observed.at), now = timeMs(time);
  if (at === null || now === null || now < at || now - at > 10000) return invalid();
  const envelope = input.extents;
  if (!isRecord(envelope) || !exact(envelope, ["configured", "policy", "proposal", "certificate"]) || typeof envelope["configured"] !== "boolean" || !envelopeFits(envelope)) return invalid();
  const outer = observed.content;
  if (!isDigest(outer.extents)) return invalid();
  // Values are native byte-admitted before this call. Even the unconfigured
  // envelope must be the one this authenticated observation actually names.
  if (valueDigest(EXTENTS_DOMAIN, envelope) !== outer.extents) return invalid();
  if (!envelope["configured"]) return envelope["policy"] === null && envelope["proposal"] === null && envelope["certificate"] === null
    ? { ok: false, reason: "rules-not-configured" } : invalid();
  const proposal = rulesPolicyProposalV11(envelope["policy"]);
  if (!proposal.ok || !isDigest(envelope["proposal"]) || proposal.digest !== envelope["proposal"]) return invalid();
  const { policy } = proposal;
  if (outer.approvals !== policy.approvals || outer.ownerMayReview !== policy.ownerMayReview || !same(outer.labels, policy.labels)
    || outer.singleControllerException !== (policy.singleControllerException === true)
    || !same(outer.checks, policy.checks.map(check => ({ ...check, checker: check.checker.member })))) return invalid();
  const certificate = envelope["certificate"];
  if (!isRecord(certificate) || !exact(certificate, ["request", "certificate", "proof", "commit"])
    || !isFactRef(certificate["request"]) || !isFactRef(certificate["certificate"]) || !isDigest(certificate["proof"])
    || typeof certificate["commit"] !== "string" || !SHA1.test(certificate["commit"])
    || !same(certificate["request"].at, input.destination) || !same(certificate["certificate"].at, input.destination)
    || certificate["request"].seq >= certificate["certificate"].seq) return invalid();
  const copy = (fact: FactRef): FactRef => ({ ...fact, at: { ...fact.at } });
  return { ok: true, view: { rules: { ...input.rules }, head: { ...observed.head }, revision: observed.revision, proposal: proposal.digest, policy,
    certificate: { request: copy(certificate["request"]), certificate: copy(certificate["certificate"]), proof: certificate["proof"], commit: certificate["commit"] } } };
}

/** Full, distinct descriptors, not a passed-name list. Every global required
 * check is included even when no touched extent names it. Unknown touched
 * extent names or policy descriptors refuse rather than yielding []. */
export function requiredChecksV14(value: unknown, touched: readonly string[]): { ok: true; checks: readonly RulesCheckV11[] } | { ok: false } {
  const proposal = rulesPolicyProposalV11(value);
  if (!proposal.ok || touched.length > 8 || touched.some(name => !proposal.policy.extents.some(extent => extent.name === name))) return { ok: false };
  const names = new Set([...proposal.policy.checks.filter(check => check.required).map(check => check.name),
    ...proposal.policy.extents.filter(extent => touched.includes(extent.name)).flatMap(extent => extent.checks)]);
  const checks = [...names].sort(byteOrder).map(name => proposal.policy.checks.find(check => check.name === name));
  return checks.every((check): check is RulesCheckV11 => check !== undefined) ? { ok: true, checks } : { ok: false };
}

/** Keep G14's head/path/integration/current-merger refusals ahead of policy
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

function policyRead(asked: ReservationAskedV14): { ok: true; view: ReservationPolicyViewV14; read: ReservationRead; required: readonly RulesCheckV11[] } | { ok: false; reason: string } {
  const decoded = readRulesPolicyObservationV14(asked.read?.rules ?? null, asked.policy, asked.time);
  if (!decoded.ok) return decoded;
  const changes = asked.evidence.changes;
  if (!asked.read || !changes || "over" in changes) return { ok: false, reason: "evidence-invalid" };
  const { view } = decoded;
  const touched = classify(view.policy.extents, changes.paths, changes.links, changes.unreadable);
  const required = requiredChecksV14(view.policy, touched.touched.map(row => row.extent));
  if (!required.ok) return { ok: false, reason: "evidence-invalid" };
  return { ok: true, view, required: required.checks, read: { ...asked.read, extents: view.policy.extents, singleControllerException: view.policy.singleControllerException === true } };
}

/** Check full checker membership/incarnation against the actual current key
 * observation. Historical opening/deciding/signing/grant proof is still
 * supplied by the native retained-lane reader; this is no boolean bypass. */
function requiredStanding(statement: Statement, read: ReservationRead, required: readonly RulesCheckV11[], time: Timestamp): { status: "met"; checks: ReservationStanding["checks"] } | { status: "invalid" | "unmet" } {
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
export function judgeReservationV14(asked: ReservationAskedV14): ReservationWithStanding {
  const early = beforePolicy(asked);
  if (early !== null) return early;
  const selected = policyRead(asked);
  if (!selected.ok) return no(selected.reason);
  const judged = judgeReservationWithStanding({ ...asked, read: selected.read });
  // Earlier evidence failures still win. For policy-stage answers, aggregate
  // every required status before returning unmet or success: invalid wins.
  if (judged.reserved === null || judged.reserved === false && judged.reason !== "incomplete" && !judged.reason.startsWith("rules-not-met")) return judged;
  const required = requiredStanding(asked.statement, selected.read, selected.required, asked.time);
  if (required.status === "invalid") return no("evidence-invalid");
  if (required.status === "unmet") return no("rules-not-met");
  if (!judged.reserved) return judged;
  if (!judged.standing) return no("evidence-invalid");
  return { ...judged, standing: { base: judged.standing.base, checks: required.checks } };
}

/** Initial list admission is a different result type, never reserved:true.
 * Tree-bound jobs do not exist before stage. Retain this complete policy and
 * required descriptor set with the publication, then use the native shared
 * current-generation completion predicate before final push/mint. A missing
 * captured snapshot or incomplete standing must refuse that later gate. */
export type ListEligibilityV14 = { eligible: true; integration: string; reason: string | null; standing: ReservationStanding; view: ReservationPolicyViewV14; required: readonly RulesCheckV11[] }
  | { eligible: false; reason: string } | { eligible: null };
export function judgeListEligibilityV14(asked: ReservationAskedV14): ListEligibilityV14 {
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
