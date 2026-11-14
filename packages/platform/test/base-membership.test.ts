import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type MemberId } from "@generalbusiness/dap-contract";
import { keyIdOfSecret, signInvitationProof } from "@generalbusiness/dap-bytes";
import { PROFILES, runnable, validateDefinition } from "@generalbusiness/dap-derive";
import { on, t, type Actor } from "@generalbusiness/dap-derive/testing";
import { BASE_COHORT as C, OWN_AGENT_KEYS, ROLE_LISTS, platform } from "../src/index.ts";
import { Roster, membershipRita as rita, membershipSam as sam, membershipUna as una, membershipVic as vic, membershipPaul as paul } from "./fixtures-entry.ts";

// Roster's creator is a STAND-IN office. Membership 14's data, rules,
// judgments and signatures are real, in memory. Native SQLite and replay
// are witnessed by the whole-family scope test.

/** A Membership 14 room: rita founds it as admin, sam holds the recovery key, and vic and una join as members. */
function room() {
  const m = new Roster(C.membership).seated();
  let n = 80;
  const join = (who: Actor, handle: string) => {
    const seed = new Uint8Array(32).fill(n++), inviteKey = keyIdOfSecret(seed);
    const invitation = m.did(rita, "invite-member", { fields: { handle, role: "member", inviteKey, inviteEnds: t(600) } }).seq;
    m.did(who, "join", { fields: { invitation, proof: signInvitationProof(seed, m.at, invitation, who.key) } });
    return { member: invitation, key: m.last.seq };
  };
  const vicAt = join(vic, "@vic"), unaAt = join(una, "@una");
  const ref = (member: string) => ({ membership: m.at, member: member as MemberId });
  /** vic's own agent with one enrolled key, signed by `holder`. */
  const agent = (handle: string, holder: Actor) => {
    const member = m.did(vic, "add-own-agent", { fields: { handle, kind: "agent", controller: ref("@vic") } }).seq;
    const seed = new Uint8Array(32).fill(n++), inviteKey = keyIdOfSecret(seed);
    const invitation = m.did(vic, "invite-own-agent-key", { expected: { member: m.item(member).revision }, fields: { member, kind: "agent", inviteKey, inviteEnds: t(600) } }).seq;
    m.did(holder, "enrol", { ...on(m, 0, { member }), fields: { invitation, proof: signInvitationProof(seed, m.at, invitation, holder.key) } });
    return { member, key: invitation };
  };
  const revoke = (who: Actor, key: number, as = "retired") => m.act(who, "revoke-key", { ...on(m, key, { roster: 0, member: m.item(key).refs["member"] as number }), fields: { as } });
  return { m, vicAt, unaAt, agent, revoke, ref };
}

test("Membership 14 is whole runnable native data with the own-agent role table of Membership 13", () => {
  const code = platform(C.membership)!;
  const checked = validateDefinition(code.data, PROPOSED_BOUNDS, PROFILES, { platform: true });
  expect(checked.ok ? [] : checked.problems).toEqual([]);
  if (checked.ok) expect(runnable(checked.definition, code.rules)).toBe(true);
  const roster = new Roster(C.membership).item(0);
  expect(roster.values[ROLE_LISTS.member]).toContain("membership.own-agent");
  expect(roster.values[ROLE_LISTS.admin]).toContain("destination.bind-repository");
});

test("an active key retires itself, and no other member's key may use that branch", () => {
  const { m, vicAt, unaAt, revoke } = room();
  expect(revoke(una, vicAt.key)).toMatchObject({ result: "refused", reason: "unauthorized", name: "not-own-key" });
  expect(revoke(vic, unaAt.key, "compromised")).toMatchObject({ result: "refused", reason: "unauthorized", name: "not-own-key" });
  expect(revoke(vic, vicAt.key)).toMatchObject({ result: "write" });
  expect(m.item(vicAt.key)).toMatchObject({ state: "retired", refs: { revokedBy: m.last.seq } });
  // The retired key stands for nothing, so it cannot act again.
  expect(revoke(vic, unaAt.key)).toMatchObject({ result: "refused", name: "not-own-key" });
});

test("the last admin's last key stays unless the recovery key signs, though the self branch returns a member with a null grant", () => {
  const { m, revoke } = room();
  // Without membership.manage in its list, the admin's act reaches the self branch of the grant mark.
  m.did(rita, "set-actions", { ...on(m, 0), fields: { role: "admin", actions: (m.item(0).values[ROLE_LISTS.admin] as string[]).filter(action => action !== "membership.manage") } });
  const self = revoke(rita, 3);
  expect(self).toMatchObject({ result: "refused", reason: "guard-failed", name: "last-admin" });
  expect(m.act(rita, "leave", { ...on(m, 2) })).toMatchObject({ result: "refused", reason: "guard-failed", name: "last-admin" });
  expect(revoke(sam, 3)).toMatchObject({ result: "write" });
  expect(m.item(3).state).toBe("retired");
});

test("a member leaves by its own key, every key of it loses standing, and another member cannot leave for it", () => {
  const { m, vicAt, unaAt, revoke } = room();
  expect(m.act(una, "leave", { ...on(m, vicAt.member) })).toMatchObject({ result: "refused", reason: "unauthorized", name: "not-own-member" });
  expect(m.act(vic, "leave", { ...on(m, vicAt.member) })).toMatchObject({ result: "write" });
  expect(m.item(vicAt.member).state).toBe("removed");
  expect(m.item(vicAt.key).state).toBe("active");
  expect(revoke(vic, vicAt.key)).toMatchObject({ result: "refused", name: "not-own-key" });
  expect(m.act(una, "leave", { ...on(m, unaAt.member) })).toMatchObject({ result: "write" });
});

test("an agent leaves by its own key", () => {
  const { m, agent } = room();
  const bot = agent("@bot", paul);
  expect(m.act(paul, "leave", { ...on(m, bot.member) })).toMatchObject({ result: "write" });
  expect(m.item(bot.member).state).toBe("removed");
});

test("a controller revokes its own agent's key and removes its own agent; another person may not, and a removal frees a place", () => {
  const { m, unaAt, agent, revoke, ref } = room();
  const bot = agent("@bot", paul);
  expect(revoke(una, bot.key)).toMatchObject({ result: "refused", name: "not-own-key" });
  expect(revoke(vic, bot.key)).toMatchObject({ result: "write" });
  expect(m.item(bot.key).state).toBe("retired");
  expect(m.act(una, "remove-member", { ...on(m, bot.member) })).toMatchObject({ result: "refused", reason: "unauthorized" });
  // The own-agent branch removes only an agent that the signer controls.
  expect(m.act(vic, "remove-member", { ...on(m, unaAt.member) })).toMatchObject({ result: "refused", reason: "unauthorized" });
  for (let n = 2; n <= 8; n++) m.did(vic, "add-own-agent", { fields: { handle: `@bot-${n}`, kind: "agent", controller: ref("@vic") } });
  expect(m.act(vic, "add-own-agent", { fields: { handle: "@bot-9", kind: "agent", controller: ref("@vic") } })).toMatchObject({ result: "refused", name: "own-agent-limit" });
  expect(m.act(vic, "remove-member", { ...on(m, bot.member) })).toMatchObject({ result: "write" });
  expect(m.item(bot.member).state).toBe("removed");
  expect(m.act(vic, "add-own-agent", { fields: { handle: "@bot-9", kind: "agent", controller: ref("@vic") } })).toMatchObject({ result: "write" });
});

test("an own agent holds four invited or active keys, and a lapsed invitation frees a place", () => {
  const { m, ref } = room();
  const member = m.did(vic, "add-own-agent", { fields: { handle: "@bot", kind: "agent", controller: ref("@vic") } }).seq;
  const invite = (n: number, ends = t(600)) => m.act(vic, "invite-own-agent-key", { expected: { member: m.item(member).revision },
    fields: { member, kind: "agent", inviteKey: keyIdOfSecret(new Uint8Array(32).fill(n)), inviteEnds: ends } });
  expect(OWN_AGENT_KEYS).toBe(4);
  const first = invite(1, t(60));
  expect(first).toMatchObject({ result: "write" });
  for (let n = 2; n <= OWN_AGENT_KEYS; n++) expect(invite(n)).toMatchObject({ result: "write" });
  expect(invite(9)).toMatchObject({ result: "refused", name: "own-agent-key-limit" });
  m.now = t(61);
  expect(m.drain().map(judgment => judgment.result)).toEqual(["write"]);
  expect(invite(9)).toMatchObject({ result: "write" });
});
