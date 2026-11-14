/**
 * Membership 14 of the `base` family (rulings 68356c6c points 2 and 3, and
 * 7505fa96 point 1). It is Membership 12, with its separate founder and
 * recovery keys, and the own-agent acts of Membership 13, and it changes
 * five things:
 *
 * - `revoke-key`: an active key may retire itself or mark itself
 *   compromised, and an active person may revoke an active key of an agent
 *   that the person controls, without holding `membership.own-agent`.
 *   Another key refuses `not-own-key`.
 * - `leave`: an active key of a member removes that member. Another member
 *   refuses `not-own-member`. Every member kind may leave.
 * - `remove-member`: an active person who holds `membership.own-agent` may
 *   remove an active agent whose recorded controller is that person.
 * - `last-admin-kept` passes without its check only when the recovery key
 *   signed the act. A null grant alone no longer passes it, so each branch
 *   above keeps the last admin.
 * - An own agent holds at most four invited or active keys.
 *
 * Administrators and the recovery key keep their routes.
 */
import type { MemberRef, PlatformData } from "@generalbusiness/dap-contract";
import type { Item, RuleGiven, Rules } from "@generalbusiness/dap-derive";
import { same } from "@generalbusiness/dap-bytes";
import { separateRecoveryMembership, separateRecoveryMembershipRules } from "./separate-recovery-cohort-data.ts";
import { ownAgentMembership, ownAgentMembershipRules } from "./own-agent-membership.ts";
import { ROLE_LISTS, isActions, lastAdminKept, signedByRecovery, type Role } from "./membership.ts";

/** Invited and active keys of one own agent, counted together (ruling 68356c6c, point 3a). */
export const OWN_AGENT_KEYS = 4;

const row = "CF1" as const;
const invite = ownAgentMembership.acts["invite-own-agent-key"]!;
const remove = separateRecoveryMembership.acts["remove-member"]!;
const revoke = separateRecoveryMembership.acts["revoke-key"]!;

export const baseMembership: PlatformData = {
  ...separateRecoveryMembership,
  acts: { ...separateRecoveryMembership.acts,
    "add-own-agent": ownAgentMembership.acts["add-own-agent"]!,
    "invite-own-agent-key": { ...invite, guards: invite.guards.map(guard => "code" in guard && guard.code === "own-agent-key-capacity"
      ? { code: "own-agent-keys", row } : guard) },
    "remove-member": { ...remove, grant: { code: "remove-member-authority", row, grant: "membership.manage" } },
    "revoke-key": { ...revoke, grant: { code: "revoke-key-authority", row, grant: "membership.manage" } },
    // The signer's own member, removed. Its keys keep their states; every
    // observation of them answers that the member is removed (row 23).
    leave: { ...remove, grant: { code: "own-member", row } },
  },
};

/** Every item of one type in those states, lowest ID first. */
function* itemsOf(given: RuleGiven, type: string, states: readonly string[]): Generator<Item> {
  for (let after: number | null = null; ;) {
    const page = given.state.page(type, states, after, 128);
    yield* page.items;
    const last = page.items.at(-1);
    if (!page.more || !last) return;
    after = last.id;
  }
}

/** The active key that signed the act, and its active member. Null: the signing key is no active key of an active member. */
function signer(given: RuleGiven): { key: Item; member: Item; ref: MemberRef } | null {
  if (given.input.type !== "act") throw new Error("this rule stands in an act, and reads its signing key");
  const actor = given.input.signed.intent.actor;
  for (const key of itemsOf(given, "key", ["active"])) {
    if (key.values["id"] !== actor) continue;
    const member = typeof key.refs["member"] === "number" ? given.state.item(key.refs["member"]) : null;
    const ref = member?.parties["member"];
    return member?.type === "member" && member.state === "active" && ref && !Array.isArray(ref) ? { key, member, ref: ref as MemberRef } : null;
  }
  return null;
}

/** The signer is an active person who controls this active agent. */
const controls = (who: { member: Item; ref: MemberRef }, agent: Item | undefined): boolean =>
  who.member.values["kind"] === "person" && agent?.type === "member" && agent.state === "active"
  && agent.values["kind"] === "agent" && same(agent.parties["controller"], who.ref);

/** The signer's role holds that action in the roster's current lists. */
function holds(given: RuleGiven, member: Item, action: string): boolean {
  const role = member.values["role"], roster = given.state.page("roster", ["open"], null, 1).items[0];
  const actions = typeof role === "string" && Object.hasOwn(ROLE_LISTS, role) ? roster?.values[ROLE_LISTS[role as Role]] : null;
  return isActions(actions) && actions.includes(action);
}

export const baseMembershipRules: Rules = {
  ...separateRecoveryMembershipRules,
  "own-agent-person-role": ownAgentMembershipRules["own-agent-person-role"]!,
  "own-agent-invitation-window": ownAgentMembershipRules["own-agent-invitation-window"]!,
  "own-agent-capacity": ownAgentMembershipRules["own-agent-capacity"]!,
  "own-agent-keys": { place: "guard", refusals: ["own-agent-key-limit"], run: given => {
    const member = given.resolved.subjects.get("also.member");
    if (!member) return { holds: false, name: "own-agent-key-limit" };
    let count = 0;
    for (const key of itemsOf(given, "key", ["invited", "active"])) {
      if (key.refs["member"] === member.id && ++count >= OWN_AGENT_KEYS) return { holds: false, name: "own-agent-key-limit" };
    }
    return { holds: true };
  } },
  /** Runs only when no current `membership.manage` grant is held. */
  "remove-member-authority": { place: "grant", refusals: [], run: given => {
    if (signedByRecovery(given)) return { pass: true, member: null };
    const who = signer(given);
    return who && holds(given, who.member, "membership.own-agent") && controls(who, given.resolved.subjects.get("on"))
      ? { pass: true, member: who.ref } : { pass: false };
  } },
  /** Runs only when no current `membership.manage` grant is held. */
  "revoke-key-authority": { place: "grant", refusals: ["not-own-key"], run: given => {
    if (signedByRecovery(given)) return { pass: true, member: null };
    const who = signer(given), on = given.resolved.subjects.get("on");
    if (!who || on?.type !== "key") return { pass: false, name: "not-own-key" };
    if (on.id === who.key.id) return { pass: true, member: who.ref };
    return controls(who, given.resolved.subjects.get("also.member")) ? { pass: true, member: who.ref } : { pass: false, name: "not-own-key" };
  } },
  "own-member": { place: "grant", refusals: ["not-own-member"], run: given => {
    const who = signer(given);
    return who && who.member.id === given.resolved.subjects.get("on")?.id ? { pass: true, member: who.ref } : { pass: false, name: "not-own-member" };
  } },
  /** Ruling 68356c6c, point 2c: only the recovery key passes without the check. */
  "last-admin-kept": { place: "guard", refusals: ["last-admin"], run: given => signedByRecovery(given) ? { holds: true } : lastAdminKept(given) },
};
