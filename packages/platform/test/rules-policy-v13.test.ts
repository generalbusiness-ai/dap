import { expect, test } from "vitest";
import type { Digest, KeyId, MemberRef } from "@generalbusiness/dap-contract";
import { valueDigest } from "@generalbusiness/dap-derive";
import { firstExtentsV11, readRulesPolicyV11 } from "../src/rules-policy-v11.ts";
import { checkSourceV13, checkStageV13, readRulesPolicyV13, rulesPolicyCheckersV13, rulesPolicyProposalV13 } from "../src/rules-policy-v13.ts";
import type { RulesCheckV13, RulesPolicyV13 } from "../src/rules-policy-v13.ts";

// Pure owned policy decisions. These member/key identifiers stand in for native observations.
const checker: MemberRef = { membership: { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "membership" }, member: "@checker" };
const service: MemberRef = { ...checker, member: "@service" };
const key = `key_${"A".repeat(43)}` as KeyId;
const configuration = `sha256:${"1".repeat(64)}` as Digest;
const check: RulesCheckV13 = { name: "unit", configuration, required: true, checker };
const policy = (checks: readonly RulesCheckV13[] = [check]): RulesPolicyV13 => ({ approvals: 1, ownerMayReview: false,
  roomService: null, checks, labels: [], extents: firstExtentsV11({ approvals: 1, checks }) });
const reason = (value: unknown) => { const read = readRulesPolicyV13(value); return read.ok ? null : read.reason; };

test("Q13 owns complete choices without changing omitted member/landing meaning or the old policy domain", () => {
  const original = policy(), parsed = readRulesPolicyV13(original);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) throw Error("Expected policy");
  expect([checkSourceV13(parsed.policy.checks[0]!), checkStageV13(parsed.policy.checks[0]!)]).toEqual(["member", "landing"]);
  expect(Object.hasOwn(parsed.policy.checks[0]!, "source")).toBe(false);
  const proposal = rulesPolicyProposalV13(original);
  expect(proposal.ok && proposal.digest).toBe(valueDigest("artroom-rules-policy-2", original));
  const { roomService: _mark, ...legacy } = original;
  expect(readRulesPolicyV11(legacy).ok).toBe(true);
  expect(reason(legacy)).toBe("invalid-policy");
  expect(readRulesPolicyV11(original)).toEqual({ ok: false, reason: "invalid-policy" });
  const marked = { ...original, roomService: { checker: { membership: { ...service.membership }, member: service.member }, key } };
  const owned = readRulesPolicyV13(marked);
  expect(owned.ok).toBe(true);
  marked.roomService.checker.member = "@changed";
  marked.roomService.checker.membership.kind = "rules";
  expect(owned.ok && owned.policy.roomService?.checker).toEqual(service);
  const explicit = rulesPolicyProposalV13(policy([{ ...check, source: "member", stage: "landing", reuse: false, holds: false }]));
  expect(explicit.ok && explicit.digest).not.toBe(proposal.ok && proposal.digest);
  let accessed = false;
  const accessor = { ...original, get roomService() { accessed = true; return null; } };
  expect(reason(accessor)).toBe("invalid-policy");
  expect(accessed).toBe(false);
});

test("audits compare fresh room runs under one configuration while published reuse and misplaced holds refuse", () => {
  const room: RulesCheckV13 = { ...check, name: "room-unit", source: "room", checker: service };
  const member = { ...check, audit: { check: room.name, every: 1 as const } };
  expect(reason(policy([member, room]))).toBe(null);
  for (const target of [{ ...room, configuration: `sha256:${"2".repeat(64)}` }, { ...room, stage: "work" }, { ...room, reuse: true }, { ...room, source: "member" }]) {
    expect(reason(policy([member, target as RulesCheckV13]))).toBe("audit-invalid");
  }
  expect(reason(policy([{ ...member, audit: { check: room.name, every: 2 } } as unknown as RulesCheckV13, room]))).toBe("audit-invalid");
  expect(reason(policy([{ ...check, stage: "published", reuse: true }]))).toBe("published-reuse");
  expect(reason(policy([{ ...check, holds: true }]))).toBe("holds-stage");
  expect(reason(policy([{ ...check, stage: "published", holds: true }]))).toBe(null);
  expect(reason(policy([{ ...check, source: "outside" } as unknown as RulesCheckV13]))).toBe("invalid-policy");
});

test("the publication member union includes a marked service with no check and removes only identical references", () => {
  const marked = { ...policy([check, { ...check, name: "another" }]), roomService: { checker: service, key } };
  expect(rulesPolicyCheckersV13(marked)).toEqual([checker, service]);
  const union = rulesPolicyCheckersV13(marked);
  union[0]!.membership.kind = "rules";
  expect(marked.checks[0]!.checker.membership.kind).toBe("membership");
  expect(rulesPolicyCheckersV13({ ...marked, roomService: null })).toEqual([checker]);
});
