/** Explicit S1 permissions. Replacements retain every action read before setup. */
import type { Summary } from "@generalbusiness/dap-contract";
import { ROLE_LISTS, isActions, type Role } from "../../packages/platform/src/membership-actions.ts";
import { firstExtents } from "../../packages/platform/src/extents.ts";

export type RoleActions = Record<Role, readonly string[]>;
const people = ["issue.open", "issue.comment", "issue.edit-own", "issue.revise", "issue.close-own", "change.open", "change.edit-own", "change.propose", "change.review"];
const agents = ["issue.open", "issue.comment", "issue.edit-own", "change.open", "change.edit-own", "change.propose"];
const personOnly = new Set(["change.review", "change.merge", "change.dismiss", "issue.approve", "issue.decide"]);
const mapRoles = (read: (role: Role) => readonly string[]): RoleActions => ({ admin: read("admin"), maintainer: read("maintainer"), member: read("member"), agent: read("agent"), checker: read("checker") });

export function roleActions(summary: Summary): RoleActions {
  const roster = summary.items.filter(item => item.type === "roster" && item.state === "open");
  if (roster.length !== 1 || roster[0]!.id !== 0) throw new Error("One active roster is required.");
  return mapRoles(role => {
    const slot = ROLE_LISTS[role];
    const actions = roster[0]!.values[slot];
    if (!isActions(actions)) throw new Error("The role action list is unavailable.");
    if ((role === "agent" || role === "checker") && actions.some(action => personOnly.has(action))) throw new Error("An automated role already holds a person-only action. Stop for policy review.");
    return [...actions];
  });
}

export function appendedActions(original: RoleActions): RoleActions {
  return mapRoles(role => {
    const extra = role === "agent" ? agents : role === "checker" ? [] : people;
    const actions = [...new Set([...original[role], ...extra])];
    if (!isActions(actions)) throw new Error("The appended role list exceeds membership bounds.");
    return actions;
  });
}

export function preservesActions(original: RoleActions, current: RoleActions): boolean {
  return (Object.keys(ROLE_LISTS) as Role[]).every(role => original[role].every(action => current[role].includes(action)));
}

/** One owner approval, with the controller exception stated visibly. No check runner is claimed. */
export const seedRules = {
  approvals: 1, ownerMayReview: true, checks: [], labels: [], singleControllerException: false,
  extents: firstExtents({ approvals: 1, checks: [] }),
} as const;
