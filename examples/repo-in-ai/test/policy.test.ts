import { describe, expect, it } from "vitest";
import type { Summary } from "@generalbusiness/dap-contract";
import { ROLE_LISTS } from "../../../packages/platform/src/membership-actions.ts";
import { holdsRulesExtent, isExtents } from "../../../packages/platform/src/extents.ts";
import { appendedActions, preservesActions, roleActions, seedRules, type RoleActions } from "../policy.ts";

describe("repo-in-ai setup policy", () => {
  it("preserves all five original lists while keeping review and merge with people", () => {
    const original: RoleActions = { admin: ["membership.manage", "rules.publish"], maintainer: ["custom.maintainer"], member: ["custom.member"], agent: ["custom.agent"], checker: ["change.check", "custom.checker"] };
    const summary = { items: [{ type: "roster", id: 0, state: "open", values: Object.fromEntries(Object.entries(ROLE_LISTS).map(([role, slot]) => [slot, original[role as keyof RoleActions]])) }] } as unknown as Summary;
    const observed = roleActions(summary), next = appendedActions(observed);
    expect(observed).toEqual(original);
    expect(preservesActions(original, next)).toBe(true);
    expect(next.admin).toContain("change.review");
    expect(next.member).toContain("change.review");
    expect(next.agent).not.toContain("change.review");
    expect(next.checker).toEqual(original.checker);
    expect(appendedActions(next)).toEqual(next);
    expect(preservesActions(original, { ...next, checker: ["change.check"] })).toBe(false);
    const unsafe = { ...summary, items: [{ ...summary.items[0]!, values: { ...summary.items[0]!.values, agentActions: ["change.review"] } }] };
    expect(() => roleActions(unsafe)).toThrow("person-only");
  });

  it("states the owner approval and the maintained minimum authority extent", () => {
    expect(seedRules.ownerMayReview).toBe(true);
    expect(seedRules.approvals).toBe(1);
    expect(seedRules.checks).toEqual([]);
    expect(seedRules.singleControllerException).toBe(false);
    expect(isExtents(seedRules.extents)).toBe(true);
    expect(holdsRulesExtent(seedRules.extents)).toBe(true);
    expect(seedRules.extents.find(extent => extent.patterns.length === 0)).toMatchObject({ name: "source", approvals: 1, approver: "change.review" });
  });
});
