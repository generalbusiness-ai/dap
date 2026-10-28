import { expect, test } from "vitest";
import type { FactRef, KeyId, MemberObservation, Observation, RulesObservation } from "@generalbusiness/dap-contract";
import { canonicalize, type EvidenceBinding, type ScopedRulesPosition, type ServiceMark } from "@generalbusiness/dap-bytes";
import { keys, otherLane, d, t } from "@generalbusiness/dap-derive/testing";
import { valueDigest } from "@generalbusiness/dap-derive";
import { keyObserved, MEMBERSHIP, RULES } from "./support-destination.ts";
import { RULES_PATTERNS } from "../src/extents.ts";
import { rulesPolicyProposalV13, type RulesCheckV13, type RulesPolicyV13 } from "../src/rules-policy-v13.ts";
import { evidenceKeyEligibleV17, evidenceSourceV17, readRulesPolicyObservationV17, readRulesPolicyReplyV17, requiredChecksV17, type ReservationPolicyViewV17 } from "../src/reservation-v17.ts";

// All observations, facts, certificates, and source bindings below are
// SCRIPTED. These are the real pure readers/guards, not Native authority,
// a membership answer, a published policy, or an executed checker job.
const fact = (seq: number): FactRef => ({ at: otherLane, seq, hash: d("a") });
const destination = { ...otherLane, kind: "destination" as const };
const checker = { membership: MEMBERSHIP, member: keys.una.member.member };
const mark: ServiceMark = { checker, key: keys.una.key }, rotated: ServiceMark = { checker, key: keys.vic.key };
const memberCheck: RulesCheckV13 = { name: "member", configuration: d("b"), required: true, checker };
const roomCheck: RulesCheckV13 = { ...memberCheck, name: "room", source: "room" };
const generation = (seq: number): ScopedRulesPosition => ({ rules: RULES, seq });
const certificate = { request: { ...fact(10), at: destination }, certificate: { ...fact(11), at: destination }, proof: d("c"), commit: "a".repeat(40) };

function policy(checks: readonly RulesCheckV13[], roomService: ServiceMark | null = mark): RulesPolicyV13 {
  const proposed = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, checks, labels: [], roomService,
    extents: [
      { name: "rules", patterns: [...RULES_PATTERNS], approvals: 1, approver: "change.review", checks: [], class: "authority" },
      { name: "source", patterns: [], approvals: 1, approver: "change.review", checks: checks.map(check => check.name), class: "content" },
    ] });
  if (!proposed.ok) throw Error(`Scripted policy is invalid: ${proposed.reason}`);
  return proposed.policy;
}
function view(check: RulesCheckV13, roomService: ServiceMark | null = mark, serviceSeq = 2, revision = 5): ReservationPolicyViewV17 {
  const complete = policy([check], roomService), proposed = rulesPolicyProposalV13(complete);
  if (!proposed.ok) throw Error("Scripted policy is invalid");
  return { rules: RULES, head: { seq: revision + 1, hash: d("d") }, revision, proposal: proposed.digest, certificate, policy: complete, serviceGeneration: generation(serviceSeq) };
}
function binding(check: RulesCheckV13, roomService: ServiceMark | null = mark, serviceSeq = 2, revision = 5): EvidenceBinding {
  return { v: 1, source: check.source ?? "member", stage: "landing", checker, policyGeneration: generation(revision), roomService,
    serviceGeneration: generation(serviceSeq), auditOf: null, subject: { kind: "landing", publication: { ...fact(1), at: destination }, manifest: fact(2) } };
}
function standing(key: KeyId = keys.una.key, over: Partial<Observation> = {}): Observation {
  return keyObserved(keys.una, t(10), { of: MEMBERSHIP, key, member: checker.member, role: "checker", actions: ["change.check"], ...over });
}
function memberStanding(over: Partial<MemberObservation> = {}): MemberObservation {
  return { subject: "member", of: MEMBERSHIP, head: { seq: 100, hash: d("e") }, member: checker.member, memberState: "active", role: "checker", activeKey: true,
    controller: null, controllerActive: null, definition: "platform:membership@8", at: t(10), ...over };
}

test("a member result keeps its own current authority across room-service rotation and cannot borrow the service key's standing", () => {
  const frozen = binding(memberCheck), original = view(memberCheck);
  expect(evidenceSourceV17(frozen, memberCheck, original, standing(), t(10))).toEqual({ ok: true });
  for (const current of [view(memberCheck, rotated, 3, 6), view(memberCheck, null, 4, 7)]) {
    expect(evidenceSourceV17(frozen, memberCheck, current, standing(), t(10))).toEqual({ ok: true });
    expect(evidenceSourceV17(frozen, memberCheck, current, standing(keys.vic.key, { member: keys.vic.member.member }), t(10))).toMatchObject({ ok: false, reason: "checker-unavailable" });
    expect(evidenceSourceV17(frozen, memberCheck, current, standing(keys.una.key, { keyState: "retired" }), t(10))).toMatchObject({ ok: false, reason: "checker-unavailable" });
  }
  const freshBinding = binding(memberCheck, rotated, 3, 6), freshView = view(memberCheck, rotated, 3, 6);
  expect(evidenceSourceV17(freshBinding, memberCheck, freshView, null, t(10), true, memberStanding())).toEqual({ ok: true });
  expect(evidenceSourceV17(freshBinding, memberCheck, freshView, null, t(10), true, memberStanding({ activeKey: false }))).toMatchObject({ ok: false, reason: "checker-unavailable" });
  // Member-only admission is not proof of the actual signing key of a result.
  expect(evidenceSourceV17(freshBinding, memberCheck, freshView, null, t(10), false, memberStanding())).toMatchObject({ ok: false, reason: "checker-unavailable" });
});

test("an unfinished room job refuses both keys after rotation, including a return to its former mark; a fresh explicit job can proceed", () => {
  const frozen = binding(roomCheck), current = view(roomCheck, rotated, 3, 6);
  expect(evidenceSourceV17(frozen, roomCheck, view(roomCheck), standing(), t(10))).toEqual({ ok: true });
  for (const key of [keys.una.key, keys.vic.key]) {
    expect(evidenceSourceV17(frozen, roomCheck, current, standing(key), t(10))).toEqual({ ok: false, reason: "wrong-source", frozenGeneration: generation(2), observedGeneration: generation(3) });
  }
  const back = view(roomCheck, mark, 4, 7);
  expect(evidenceSourceV17(frozen, roomCheck, back, standing(), t(10))).toEqual({ ok: false, reason: "wrong-source", frozenGeneration: generation(2), observedGeneration: generation(4) });
  expect(evidenceSourceV17(frozen, roomCheck, view(roomCheck, null, 3, 6), standing(), t(10))).toMatchObject({ ok: false, reason: "wrong-source" });
  const fresh = binding(roomCheck, rotated, 3, 6);
  expect(evidenceSourceV17(fresh, roomCheck, current, standing(keys.vic.key), t(10), true)).toEqual({ ok: true });
});

test("a finished historical room candidate can count after the old key is currently marked again, without repairing the unfinished job", () => {
  const frozen = binding(roomCheck), back = view(roomCheck, mark, 4, 7);
  expect(evidenceSourceV17(frozen, roomCheck, back, standing(), t(10), false, null, false)).toEqual({ ok: true });
  expect(evidenceSourceV17(frozen, roomCheck, back, standing(), t(10))).toMatchObject({ ok: false, reason: "wrong-source" });
  expect(evidenceSourceV17(frozen, roomCheck, view(roomCheck, rotated, 3, 6), standing(), t(10), false, null, false)).toMatchObject({ ok: false, reason: "wrong-source" });
  expect(evidenceSourceV17(frozen, roomCheck, back, standing(keys.una.key, { controllerActive: false }), t(10), false, null, false)).toMatchObject({ ok: false, reason: "checker-unavailable" });
});

test("current key eligibility requires the exact member and incarnation, checker role, action, controller, lifetime and fresh nonfuture clock", () => {
  const good = standing();
  expect(evidenceKeyEligibleV17(memberCheck, good, t(10))).toBe(true);
  expect(evidenceKeyEligibleV17(memberCheck, good, t(20))).toBe(true);
  expect(evidenceKeyEligibleV17(memberCheck, good, t(20.001))).toBe(false);
  for (const invalid of [
    null, standing(keys.una.key, { keyState: "compromised" }), standing(keys.una.key, { memberState: "removed" }),
    standing(keys.una.key, { member: keys.vic.member.member }), standing(keys.una.key, { of: { ...MEMBERSHIP, inc: RULES.inc } }),
    standing(keys.una.key, { role: "maintainer" }), standing(keys.una.key, { actions: [] }),
    standing(keys.una.key, { controller: keys.rita.member.member, controllerActive: false }),
    standing(keys.una.key, { notAfter: t(10) }), standing(keys.una.key, { at: t(11) }),
  ]) expect(evidenceKeyEligibleV17(memberCheck, invalid, t(10))).toBe(false);
  expect(evidenceKeyEligibleV17(memberCheck, standing(keys.una.key, { notAfter: t(11) }), t(10))).toBe(true);
});

test("unavailable Rules retains a typed null observed generation instead of inventing rotation", () => {
  expect(evidenceSourceV17(binding(roomCheck), roomCheck, null, standing(), t(10))).toEqual({
    ok: false, reason: "wrong-source", frozenGeneration: generation(2), observedGeneration: null,
  });
});

type RulesContent = Extract<RulesObservation["content"], { asked: "rules" }>;
function observedPolicy(complete: RulesPolicyV13) {
  const proposed = rulesPolicyProposalV13(complete); if (!proposed.ok) throw Error("Scripted complete policy is invalid");
  const envelope = { configured: true, policy: proposed.policy, proposal: proposed.digest, certificate, serviceGeneration: generation(2) };
  const content: RulesContent = { asked: "rules", approvals: complete.approvals, ownerMayReview: complete.ownerMayReview,
    checks: complete.checks.map(({ name, configuration, required, checker }) => ({ name, configuration, required, checker: checker.member })),
    labels: [...complete.labels], singleControllerException: complete.singleControllerException === true,
    extents: valueDigest("artroom-rules-extents-3", envelope) };
  const observed: RulesObservation & { content: RulesContent } = { subject: "rules", of: RULES, head: { seq: 6, hash: d("d") }, revision: 5, definition: "platform:rules@13", at: t(10), content };
  return { observed, envelope, input: { rules: RULES, destination, extents: envelope } };
}

test("Q13 reads its complete retained policy and generation against the unchanged Rules projection", () => {
  const rich: RulesCheckV13 = { ...roomCheck, reuse: false, stage: "published", holds: true };
  const scripted = observedPolicy(policy([rich])), read = readRulesPolicyObservationV17(scripted.observed, scripted.input, t(10));
  expect(read).toMatchObject({ ok: true, view: { policy: { checks: [{ source: "room", stage: "published", holds: true, reuse: false }], roomService: mark }, serviceGeneration: generation(2) } });
  const otherSource = observedPolicy(policy([{ ...rich, source: "member" }]));
  expect(otherSource.observed.content.checks).toEqual(scripted.observed.content.checks);
  expect(readRulesPolicyObservationV17(otherSource.observed, otherSource.input, t(10))).toMatchObject({ ok: true, view: { policy: { checks: [{ source: "member" }] } } });
  expect(readRulesPolicyObservationV17(scripted.observed, otherSource.input, t(10))).toEqual({ ok: false, reason: "evidence-invalid" });
  const changedSummary = { ...scripted.observed, content: { ...scripted.observed.content, checks: [{ ...scripted.observed.content.checks[0]!, checker: keys.vic.member.member }] } };
  expect(readRulesPolicyObservationV17(changedSummary, scripted.input, t(10))).toEqual({ ok: false, reason: "evidence-invalid" });
  const withEnvelope = (envelope: unknown) => readRulesPolicyObservationV17({ ...scripted.observed,
    content: { ...scripted.observed.content, extents: valueDigest("artroom-rules-extents-3", envelope) } }, { ...scripted.input, extents: envelope }, t(10));
  const { serviceGeneration: _generation, ...missingGeneration } = scripted.envelope;
  expect(withEnvelope(missingGeneration)).toEqual({ ok: false, reason: "evidence-invalid" });
  for (const serviceGeneration of [generation(6), generation(0), { ...generation(2), rules: { ...RULES, inc: MEMBERSHIP.inc } }]) {
    expect(withEnvelope({ ...scripted.envelope, serviceGeneration })).toEqual({ ok: false, reason: "evidence-invalid" });
  }
  // Negative zero has no canonical digest. Pass the malformed input directly;
  // never manufacture an impossible authenticated canonical envelope for it.
  expect(readRulesPolicyObservationV17(scripted.observed, { ...scripted.input,
    extents: { ...scripted.envelope, serviceGeneration: { ...generation(2), seq: -0 } } }, t(10))).toEqual({ ok: false, reason: "evidence-invalid" });
  expect(readRulesPolicyObservationV17({ ...scripted.observed, definition: "platform:rules@12" }, scripted.input, t(10))).toEqual({ ok: false, reason: "evidence-invalid" });
  expect(readRulesPolicyObservationV17(scripted.observed, scripted.input, t(20.001))).toEqual({ ok: false, reason: "evidence-invalid" });
  expect(readRulesPolicyObservationV17(scripted.observed, scripted.input, t(9))).toEqual({ ok: false, reason: "evidence-invalid" });
  if (!read.ok) throw Error("Positive scripted policy was refused");
  (scripted.envelope.policy.labels as string[]).push("later caller mutation");
  expect(read.view.policy.labels).toEqual([]);
});

test("a fresh Q13 host reply authenticates its exact retained domain, canonical text and digest before deriving room authority", () => {
  const scripted = observedPolicy(policy([roomCheck])), { at: _at, ...answer } = scripted.observed;
  const value = { domain: "artroom-rules-extents-3", bytes: canonicalize(scripted.envelope) }, reply = { answer, values: [value] };
  expect(readRulesPolicyReplyV17(reply, RULES, destination, t(10))).toEqual(readRulesPolicyObservationV17(scripted.observed, scripted.input, t(10)));
  expect(Object.hasOwn(answer.content, "roomService")).toBe(false);
  expect(Object.hasOwn(answer.content, "serviceGeneration")).toBe(false);
  for (const malformed of [answer, { answer, values: [] }, { answer, values: [value, value] }, { answer, values: [{ ...value, domain: "artroom-rules-extents-2" }] },
    { answer, values: [{ ...value, bytes: " " + value.bytes }] }, { answer, values: [{ ...value, bytes: "{" }] },
    { answer, values: [{ ...value, bytes: " ".repeat(262_145) }] }, { answer: { ...answer, content: { ...answer.content, roomService: mark } }, values: [value] },
    { answer: { ...answer, content: { ...answer.content, extents: d("f") } }, values: [value] }]) {
    expect(readRulesPolicyReplyV17(malformed, RULES, destination, t(10))).toEqual({ ok: false, reason: "evidence-invalid" });
  }
});

test("required landing checks are the global and touched-extent union, excluding work and published checks even when globally required", () => {
  const complete = policy([
    { ...memberCheck, name: "global" },
    { ...memberCheck, name: "extent", required: false, source: "room", reuse: true },
    { ...memberCheck, name: "work", stage: "work" },
    { ...memberCheck, name: "published", stage: "published", holds: true },
  ]);
  const noneTouched = requiredChecksV17(complete, []), sourceTouched = requiredChecksV17(complete, ["source"]);
  expect(noneTouched.ok && noneTouched.checks.map(check => check.name)).toEqual(["global"]);
  expect(sourceTouched.ok && sourceTouched.checks.map(check => check.name)).toEqual(["extent", "global"]);
  expect(sourceTouched.ok && sourceTouched.checks[0]).toMatchObject({ name: "extent", source: "room", reuse: true });
  expect(requiredChecksV17(complete, ["not-an-extent"])).toEqual({ ok: false });
});
