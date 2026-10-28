import { expect, test } from "vitest";
import type { Digest, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import type { RuleGiven, StateView } from "@generalbusiness/dap-derive";
import { contentChecked, contentStates, valueDigest } from "@generalbusiness/dap-derive";
import { canonicalize, isRecord, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { rulesScopeV12 } from "../src/rules-scope-v12.ts";
import { rulesAnswerV13, rulesObservedValuesV13, rulesScopeRulesV13, rulesScopeV13 } from "../src/rules-scope-v13.ts";
import { firstExtentsV13, rulesPolicyProposalV13, RULES_CONTENT_BYTES_V13, RULES_EXTENTS_VALUE_V13 } from "../src/rules-policy-v13.ts";

// Folded state and membership observations are explicit stand-ins. No certificate or native turn runs here.
const rules: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "rules" };
const membership: ScopeRef = { ...rules, kind: "membership" };
const checker: MemberRef = { membership, member: "@checker" };
const digest = `sha256:${"1".repeat(64)}` as Digest;
const item = { id: 0, refs: {}, values: { configured: false, membership: membership.scope, approvals: 1, ownerMayReview: false } };
const state = { page: () => ({ items: [item] }), incarnations: () => [membership.inc], scope: () => ({ status: "active", at: rules, head: { seq: 0, hash: digest } }) } as unknown as StateView;

function retainedPolicy(state: StateView): Record<string, unknown> {
  const answer = rulesAnswerV13(state, { of: rules, asked: "rules" }), values = rulesObservedValuesV13(state, { of: rules, asked: "rules" });
  if (!answer || answer.content.asked !== "rules" || values.length !== 1) throw Error("The actual Q13 answer must name exactly one retained policy");
  const value = values[0]!, envelope = parseStrict(value.bytes);
  if (!isRecord(envelope)) throw Error("The retained policy must be a record");
  expect(Object.keys(envelope).sort()).toEqual(["certificate", "configured", "policy", "proposal"]);
  expect(value.domain).toBe(RULES_EXTENTS_VALUE_V13.domain);
  expect(utf8(value.bytes).length).toBeLessThanOrEqual(RULES_EXTENTS_VALUE_V13.max);
  expect(canonicalize(envelope)).toBe(value.bytes);
  expect(valueDigest(value.domain, envelope)).toBe(answer.content.extents);
  return envelope;
}

test("Q13 observes scoped service metadata under revision21 and preserves earlier observation grammars", () => {
  const answer = rulesAnswerV13(state, { of: rules, asked: "rules" });
  expect(answer?.content.asked).toBe("rules");
  if (!answer || answer.content.asked !== "rules") throw Error("Missing Rules answer");
  expect(answer.content.roomService).toBeNull();
  expect(answer.content.serviceGeneration).toEqual({ rules, seq: 0 });
  expect(retainedPolicy(state)).toMatchObject({ configured: false, policy: null });
  expect(Object.hasOwn(retainedPolicy(state), "serviceGeneration")).toBe(false);
  expect(contentChecked({ ...answer, at: "2026-10-28T00:00:00Z" }, contentStates(rulesScopeV13))).toBe(true);
  expect(contentChecked({ ...answer, at: "2026-10-28T00:00:00Z" }, contentStates(rulesScopeV12))).toBe(false);
  const { roomService: _mark, serviceGeneration: _generation, ...oldContent } = answer.content;
  expect(contentChecked({ ...answer, content: oldContent, at: "2026-10-28T00:00:00Z" }, contentStates(rulesScopeV12))).toBe(true);
  expect(contentChecked({ ...answer, content: oldContent, at: "2026-10-28T00:00:00Z" }, contentStates(rulesScopeV13))).toBe(false);
  const longChecker = { ...checker, member: `@${"a".repeat(255)}` as const };
  const policy = { approvals: 1, ownerMayReview: false, roomService: { checker: longChecker, key: `key_${"A".repeat(43)}` },
    checks: Array.from({ length: 32 }, (_, n) => ({ name: "\0".repeat(127) + String.fromCharCode(n), configuration: digest, required: true, checker: longChecker })),
    labels: Array.from({ length: 32 }, () => "\0".repeat(64)), extents: firstExtentsV13({ approvals: 1, checks: [] }) };
  const parsed = rulesPolicyProposalV13(policy);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw Error("Expected individually bounded policy");
  const fact = { at: rules, seq: 1, hash: digest };
  const huge = { ...state, scope: () => ({ status: "active", at: rules, head: { seq: 8, hash: digest } }),
    page: () => ({ items: [{ ...item, refs: { published: 8, roomServiceChanged: 8 }, values: { ...item.values, configured: true,
      policy: canonicalize(parsed.policy), proposal: parsed.digest, certificate: { request: fact, certificate: { ...fact, seq: 2 }, proof: digest, commit: "a".repeat(40) } } }] }) } as unknown as StateView;
  const oldProjection = { asked: "rules", approvals: policy.approvals, ownerMayReview: policy.ownerMayReview,
    checks: policy.checks.map(({ name, configuration, required, checker }) => ({ name, configuration, required, checker: checker.member })),
    labels: policy.labels, singleControllerException: false, extents: digest, roomService: policy.roomService, serviceGeneration: { rules, seq: 8 } };
  const largeAnswer = rulesAnswerV13(huge, { of: rules, asked: "rules" });
  expect(largeAnswer === null).toBe(utf8(canonicalize(oldProjection)).length > RULES_CONTENT_BYTES_V13);
  if (largeAnswer) expect(utf8(canonicalize(largeAnswer.content)).length).toBeLessThanOrEqual(RULES_CONTENT_BYTES_V13);
  else expect(rulesObservedValuesV13(huge, { of: rules, asked: "rules" })).toEqual([]);
  const withdrawn = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, roomService: null, checks: [], labels: [], extents: firstExtentsV13({ approvals: 1, checks: [] }) });
  if (!withdrawn.ok) throw Error("Expected withdrawn policy");
  const later = { ...state, scope: () => ({ status: "active", at: rules, head: { seq: 10, hash: digest } }),
    page: () => ({ items: [{ ...item, refs: { published: 10, roomServiceChanged: 7 }, values: { ...item.values, configured: true,
      policy: canonicalize(withdrawn.policy), proposal: withdrawn.digest, certificate: { request: fact, certificate: { ...fact, seq: 2 }, proof: digest, commit: "a".repeat(40) } } }] }) } as unknown as StateView;
  const observed = rulesAnswerV13(later, { of: rules, asked: "rules" });
  expect(observed?.revision).toBe(10);
  expect(observed?.content.asked).toBe("rules");
  expect(observed?.content.asked === "rules" && observed.content.serviceGeneration).toEqual({ rules, seq: 7 });
  expect(retainedPolicy(later)).toMatchObject({ configured: true, policy: { roomService: null } });
  const objectFallback = { ...later, page: () => ({ items: later.page("rules", ["current"], null, 1).items.map(row => ({ ...row, values: { ...row.values, policy: withdrawn.policy } })) }) } as unknown as StateView;
  expect(rulesAnswerV13(objectFallback, { of: rules, asked: "rules" })).toBeNull();
});

test("a mark-only member must be observed and a customizable publish grant cannot mark or withdraw without the admin role", () => {
  const rule = rulesScopeRulesV13['q13-checker-union'];
  if (!rule || rule.place !== "guard") throw Error("Missing union guard");
  const mark = { checker, key: `key_${"A".repeat(43)}` };
  const fields = { approvals: 1, ownerMayReview: false, labels: [], checks: [], extents: firstExtentsV13({ approvals: 1, checks: [] }), roomService: canonicalize(mark), checkers: [checker] };
  const given = (role: string, observedRole = "checker", supplied: unknown = fields.checkers) => ({ state,
    input: { type: "act", grant: { fresh: { observation: { role } } } },
    resolved: { fields: { ...fields, checkers: supplied } },
    observed: () => ({ observation: { subject: "member", of: membership, member: checker.member, memberState: "active", role: observedRole } }),
  }) as unknown as RuleGiven;
  expect(rule.run(given("admin"))).toEqual({ holds: true });
  expect(rule.run(given("maintainer"))).toEqual({ holds: false, name: "room-service-admin-required" });
  expect(rule.run(given("admin", "member"))).toEqual({ holds: false, name: "not-a-checker" });
  expect(rule.run(given("admin", "checker", []))).toEqual({ holds: false, name: "invalid-policy" });
  expect(rule.run(given("admin", "checker", [checker, checker]))).toEqual({ holds: false, name: "invalid-policy" });
  const objectMark = given("admin") as unknown as { resolved: { fields: Record<string, unknown> } };
  objectMark.resolved.fields['roomService'] = mark;
  expect(rule.run(objectMark as unknown as RuleGiven)).toEqual({ holds: false, name: "invalid-policy" });
  const { checkers: _transport, ...priorPolicy } = fields;
  const withdrawing = given("maintainer") as unknown as { state: StateView; resolved: { fields: unknown } };
  withdrawing.state = { ...state, page: () => ({ items: [{ ...item, values: { ...item.values, configured: true, policy: canonicalize({ ...priorPolicy, roomService: mark }) } }] }) } as unknown as StateView;
  withdrawing.resolved.fields = { ...priorPolicy, roomService: "null", checkers: [] };
  expect(rule.run(withdrawing as unknown as RuleGiven)).toEqual({ holds: false, name: "room-service-admin-required" });
});

test("the declared successor rules update carries nullable evidence authority in one bounded canonical text field", () => {
  const rule = rulesScopeRulesV13['rules-update'];
  if (!rule || rule.place !== "send") throw Error("Missing rules update");
  const sent = rule.run({ state, input: { type: "delivery", from: { at: { ...rules, kind: "lane" } } }, resolved: { at: rules } } as unknown as RuleGiven);
  const detail = (sent as unknown as { message: { body: { detail: Record<string, unknown> } } }).message.body.detail;
  expect(Object.hasOwn(detail, "roomService")).toBe(false);
  expect(typeof detail['evidencePolicy']).toBe("string");
  const wire = detail['evidencePolicy'] as string;
  expect(new TextEncoder().encode(wire).length).toBeLessThanOrEqual(2048);
  expect(JSON.parse(wire)).toEqual({ roomService: null, serviceGeneration: { rules, seq: 0 }, policyGeneration: { rules, seq: 0 } });
});
