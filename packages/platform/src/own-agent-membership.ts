/** A person can create agents they control without gaining a wider role. */
import type { PlatformData } from "@generalbusiness/dap-contract";
import { same, timeMs } from "@generalbusiness/dap-bytes";
import type { Item, RuleGiven, Rules } from "@generalbusiness/dap-derive";
import { repositoryBindingMembership, repositoryBindingMembershipRules } from "./repository-binding-cohort-data.ts";
import { ROLE_LISTS, isActions, type Role } from "./membership.ts";

const add = repositoryBindingMembership.acts["add-member"]!;
const invite = repositoryBindingMembership.acts["invite-key"]!;
const person = { code: "own-agent-person-role", row: "O2" } as const;

export const ownAgentMembership: PlatformData = {
  ...repositoryBindingMembership,
  acts: { ...repositoryBindingMembership.acts,
    "add-own-agent": { ...add, grant: "membership.own-agent",
      fields: { ...add.fields, kind: { type: "enum", of: ["agent"], required: true }, controller: { type: "member", required: true } },
      guards: [...add.guards,
        { equals: { a: { field: "controller" }, b: { signer: true } }, reason: "not-controller" },
        person, { code: "own-agent-capacity", row: "O2" }],
    },
    "invite-own-agent-key": { ...invite, grant: "membership.own-agent",
      fields: { ...invite.fields, kind: { type: "enum", of: ["agent"], required: true } },
      guards: [...invite.guards,
        { equals: { a: { slot: "kind", of: "also.member" }, b: { const: "agent" } }, reason: "not-agent" },
        { equals: { a: { slot: "role", of: "also.member" }, b: { const: "agent" } }, reason: "not-agent" },
        { equals: { a: { slot: "controller", of: "also.member" }, b: { signer: true } }, reason: "not-controller" },
        person, { code: "own-agent-invitation-window", row: "O2" }, { code: "own-agent-key-capacity", row: "O2" }],
    },
  },
};

/** The declaration bounds membership at 10,000 members. Read active pages
 * only, and stop capacity reads as soon as eight controlled agents exist. */
function* activeMembers(given: RuleGiven): Generator<Item> {
  let after: number | null = null;
  for (;;) {
    const page = given.state.page("member", ["active"], after, 128);
    yield* page.items;
    if (!page.more || page.items.length === 0) return;
    after = page.items.at(-1)!.id;
  }
}
function signerMember(given: RuleGiven): Item | null {
  const signer = given.resolved.signer?.member;
  if (!signer || !same(signer.membership, given.resolved.at)) return null;
  for (const item of activeMembers(given)) if (same(item.parties["member"], signer)) return item;
  return null;
}

export const ownAgentMembershipRules: Rules = {
  ...repositoryBindingMembershipRules,
  "own-agent-person-role": { place: "guard", refusals: ["not-active-person", "agent-role-wider"], run: given => {
    const member = signerMember(given);
    if (!member || member.values["kind"] !== "person") return { holds: false, name: "not-active-person" };
    if (member.values["role"] === "admin") return { holds: true };
    const role = member.values["role"];
    const roster = given.state.page("roster", ["open"], null, 1).items[0];
    const agent = roster?.values["agentActions"];
    const own = typeof role === "string" && Object.hasOwn(ROLE_LISTS, role) ? roster?.values[ROLE_LISTS[role as Role]] : null;
    return isActions(agent) && isActions(own) && agent.every(action => own.includes(action))
      ? { holds: true } : { holds: false, name: "agent-role-wider" };
  } },
  "own-agent-invitation-window": { place: "guard", refusals: ["own-agent-invitation-window"], run: given => {
    const now = timeMs(given.time), ends = timeMs(given.resolved.fields["inviteEnds"]);
    return now !== null && ends !== null && ends > now && ends - now <= 24 * 60 * 60 * 1000
      ? { holds: true } : { holds: false, name: "own-agent-invitation-window" };
  } },
  "own-agent-key-capacity": { place: "guard", refusals: ["own-agent-key-limit"], run: given => {
    const member = given.resolved.subjects.get("also.member");
    if (!member) return { holds: false, name: "own-agent-key-limit" };
    // One pending or enrolled key per agent through the ordinary-member path.
    // The existing administrative invitation and revocation steps stay distinct.
    let after: number | null = null;
    for (;;) {
      const page = given.state.page("key", ["invited", "active"], after, 128);
      if (page.items.some(key => key.refs["member"] === member.id)) return { holds: false, name: "own-agent-key-limit" };
      if (!page.more || page.items.length === 0) return { holds: true };
      after = page.items.at(-1)!.id;
    }
  } },
  "own-agent-capacity": { place: "guard", refusals: ["own-agent-limit"], run: given => {
    const signer = given.resolved.signer?.member;
    let count = 0;
    for (const item of activeMembers(given)) {
      if (item.values["kind"] === "agent" && same(item.parties["controller"], signer) && ++count >= 8) return { holds: false, name: "own-agent-limit" };
    }
    return { holds: true };
  } },
};
