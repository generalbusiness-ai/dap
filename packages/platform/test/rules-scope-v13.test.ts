import { expect, test } from "vitest";
import type { Digest, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import type { RuleGiven, StateView } from "@generalbusiness/dap-derive";
import { contentChecked, contentStates } from "@generalbusiness/dap-derive";
import { rulesScopeV12 } from "../src/rules-scope-v12.ts";
import { rulesAnswerV13, rulesScopeRulesV13, rulesScopeV13 } from "../src/rules-scope-v13.ts";
import { firstExtentsV13, rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";

// Folded state and membership observations are explicit stand-ins. No certificate or native turn runs here.
const rules: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "rules" };
const membership: ScopeRef = { ...rules, kind: "membership" };
const checker: MemberRef = { membership, member: "@checker" };
const digest = `sha256:${"1".repeat(64)}` as Digest;
const item = { id: 0, refs: {}, values: { configured: false, membership: membership.scope, approvals: 1, ownerMayReview: false } };
const state = { page: () => ({ items: [item] }), incarnations: () => [membership.inc], scope: () => ({ status: "active", at: rules, head: { seq: 0, hash: digest } }) } as unknown as StateView;

test("the successor alone exposes the scoped unmarked generation and refuses a projection beyond the retained observation ceiling", () => {
  const answer = rulesAnswerV13(state, { of: rules, asked: "rules" });
  expect(answer?.content.asked).toBe("rules");
  if (!answer || answer.content.asked !== "rules") throw Error("Missing Rules answer");
  expect(answer.content.roomService).toBe(null);
  expect(answer.content.serviceGeneration).toEqual({ rules, seq: 0 });
  expect(contentChecked({ ...answer, at: "2026-10-28T00:00:00Z" }, contentStates(rulesScopeV13))).toBe(true);
  expect(contentChecked({ ...answer, at: "2026-10-28T00:00:00Z" }, contentStates(rulesScopeV12))).toBe(false);
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
      policy: parsed.policy, proposal: parsed.digest, certificate: { request: fact, certificate: { ...fact, seq: 2 }, proof: digest, commit: "a".repeat(40) } } }] }) } as unknown as StateView;
  expect(rulesAnswerV13(huge, { of: rules, asked: "rules" })).toBe(null);
  const withdrawn = rulesPolicyProposalV13({ approvals: 1, ownerMayReview: false, roomService: null, checks: [], labels: [], extents: firstExtentsV13({ approvals: 1, checks: [] }) });
  if (!withdrawn.ok) throw Error("Expected withdrawn policy");
  const later = { ...state, scope: () => ({ status: "active", at: rules, head: { seq: 10, hash: digest } }),
    page: () => ({ items: [{ ...item, refs: { published: 10, roomServiceChanged: 7 }, values: { ...item.values, configured: true,
      policy: withdrawn.policy, proposal: withdrawn.digest, certificate: { request: fact, certificate: { ...fact, seq: 2 }, proof: digest, commit: "a".repeat(40) } } }] }) } as unknown as StateView;
  const observed = rulesAnswerV13(later, { of: rules, asked: "rules" });
  expect(observed?.revision).toBe(10);
  expect(observed?.content.asked === "rules" && observed.content.serviceGeneration).toEqual({ rules, seq: 7 });
});

test("a mark-only member must be observed and a customizable publish grant cannot mark or withdraw without the admin role", () => {
  const rule = rulesScopeRulesV13['q13-checker-union'];
  if (!rule || rule.place !== "guard") throw Error("Missing union guard");
  const fields = { approvals: 1, ownerMayReview: false, labels: [], checks: [], extents: firstExtentsV13({ approvals: 1, checks: [] }), roomService: { checker, key: `key_${"A".repeat(43)}` }, checkers: [checker] };
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
  const { checkers: _transport, ...priorPolicy } = fields;
  const withdrawing = given("maintainer") as unknown as { state: StateView; resolved: { fields: unknown } };
  withdrawing.state = { ...state, page: () => ({ items: [{ ...item, values: { ...item.values, configured: true, policy: priorPolicy } }] }) } as unknown as StateView;
  withdrawing.resolved.fields = { ...priorPolicy, roomService: null, checkers: [] };
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
