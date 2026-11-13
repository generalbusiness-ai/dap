/**
 * A room on real Native M8 with the people and agent of the J5 scene: @ana, who decides, with one key and one more device key to enrol; @vic, a teammate; @una, an agent @ana controls.
 * @rita founded the room. An issue with the question profile is open. STAND-INS, as in the room fixture: the Git host, the scripted clock and the pause scheduler.
 */
import { expect } from "vitest";
import type { Entry, FactRef, MemberRef, ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, isScopeId, keyIdOfSecret, signInvitationProof, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { INVITATION_LINK, invitationIssueFields } from "@generalbusiness/dap-client";
import { keys } from "@generalbusiness/dap-derive/testing";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, ROLE_LISTS } from "@generalbusiness/dap-platform";
import { QUESTION_DIGESTS, issueQuestions } from "@generalbusiness/dap-lanes";
import { created, mcpRoom, type Agent, type Room } from "../fixtures-native.ts";
import { drainScheduledFixture, nativeFixtureLifetime } from "../../../scope/test/support/native-fixture-lifetime.ts";

export const act = async (agent: Pick<Agent, "ok">, target: string, kind: string, args: Record<string, unknown> = {}): Promise<FactRef> => {
  const actions = await agent.ok("actions", { scope: target });
  const answer = await agent.ok("act", { target, kind, digest: actions["digest"], ...args, idempotencyKey: crypto.randomUUID() });
  expect(answer["answer"], `${kind}: ${JSON.stringify(answer)}`).toBe("accepted");
  return answer["fact"] as FactRef;
};
export const factOf = async (agent: Pick<Agent, "ok">, scope: string, seq: number): Promise<FactRef> => {
  const step = await agent.ok("step", { scope, seq });
  const entry = step["entry"] as Entry, hash = step["hash"] as FactRef["hash"];
  if (!isScopeId(scope)) throw Error("A step names a scope ID");
  return { at: { scope, genesis: "genesis" in entry ? entry.genesis : hash }, seq, hash };
};

export interface AskingRoom {
  room: Room; rita: Agent; ana: Agent; vic: Agent; una: Agent; anaSecret: Uint8Array; unaSecret: Uint8Array; issue: ScopeId; issueRef: ScopeRef;
  anaRef: MemberRef; unaRef: MemberRef; membership: ScopeRef;
  /** A new key that the Page's Add a device would enrol: an admin signs `invite-key` of kind device, and the new key signs `enrol`. */
  enrolAnaDevice(): Promise<Uint8Array>;
  /** @una accepts offered work, asks a question, asks @ana by name to approve its text, and blocks its own commitment on it. */
  agentAsks(question?: string): Promise<{ commitment: number; ask: FactRef; request: FactRef; block: FactRef }>;
  settle(): Promise<void>;
  finish(): Promise<void>;
}

export async function askingRoom(): Promise<AskingRoom> {
  let life!: ReturnType<typeof nativeFixtureLifetime>;
  const room = mcpRoom({ finish: "external", capture: owner => { life = owner; } });
  // A key per room: the register's identity follows from its founder, and these rooms share one isolate.
  const ritaSecret = crypto.getRandomValues(new Uint8Array(32)), founder = { ...keys.rita, secret: ritaSecret, key: keyIdOfSecret(ritaSecret) };
  const rita = room.agent("rita", { mode: "generic", secret: ritaSecret });
  await created(room, rita, "generic", ARCHIVE_DEVICE_APPLICATION_COHORT.register);
  const repository = rita.config.repository!, M = room.platform(repository.membership.scope), { inbox: _inbox, ...shared } = repository;
  const person = async (handle: string, secret: Uint8Array): Promise<Agent> => {
    const inviteSecret = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const invited = await act(rita, "membership", "invite-member", { fields: { handle, role: "member", ...invitationIssueFields("platform:membership@8", inviteSecret), inviteEnds: timeOf(room.now() + 3_600_000) } });
    const link = `${INVITATION_LINK}${b64url(utf8(JSON.stringify({ v: 1, service: rita.config.service, repository: shared, invitation: invited.seq, secret: inviteSecret, handle, definition: "platform:membership@8" })))}`;
    const agent = room.agent(handle, { mode: "generic", secret, config: { service: "" } });
    expect((await agent.ok("join", { link, idempotencyKey: "join" }))["answer"]).toBe("accepted");
    return agent;
  };
  const anaSecret = crypto.getRandomValues(new Uint8Array(32)), unaSecret = crypto.getRandomValues(new Uint8Array(32));
  const ana = await person("@ana", anaSecret), vic = await person("@vic", crypto.getRandomValues(new Uint8Array(32)));
  const anaRef: MemberRef = { membership: repository.membership, member: "@ana" }, unaRef: MemberRef = { membership: repository.membership, member: "@una" };
  const enrolKey = async (member: number, kind: "agent" | "device", secret: Uint8Array) => {
    const seed = crypto.getRandomValues(new Uint8Array(32)), key = keyIdOfSecret(secret);
    const invitation = await M.did(founder, "invite-key", { expected: await M.expected({ member }), fields: { member, kind, inviteKey: keyIdOfSecret(seed), inviteEnds: timeOf(room.now() + 3_600_000) } });
    await M.did({ ...keys.una, secret, key }, "enrol", { on: 0, expected: await M.expected({ on: 0, member }), fields: { invitation, proof: signInvitationProof(seed, repository.membership, invitation, key) } });
  };
  const una$ = await M.did(founder, "add-member", { fields: { handle: "@una", kind: "agent", controller: anaRef } });
  await enrolKey(una$, "agent", unaSecret);
  const roster = await M.item(0), rolesOf = (role: "admin" | "member") => roster.values[ROLE_LISTS[role]] as string[];
  for (const role of ["admin", "member"] as const) await M.did(founder, "set-actions", { on: 0, expected: await M.expected({ on: 0 }), fields: { role, actions: [...rolesOf(role), ...["issue.approve", "issue.decide"].filter(action => !rolesOf(role).includes(action))] } });
  const una = room.agent("una", { mode: "generic", secret: unaSecret, config: { service: rita.config.service, repository: shared, handle: "@una" } });
  await act(rita, "rules", "activate", { fields: { name: "issue", digest: QUESTION_DIGESTS.issue }, values: [canonicalize(issueQuestions)] });
  const opening = await act(rita, "directory", "open-issue", { fields: { definition: QUESTION_DIGESTS.issue, title: "TEST the import fails on large files", conditions: ["TEST initial terms"] } });
  const born = await rita.ok("wait", { scope: "directory", entry: opening.seq });
  const issue = (born["created"] as { scope: ScopeId }[])[0]!.scope;
  room.know(issue);
  const issueRef = (await rita.ok("inspect", { scope: issue }))["ref"] as ScopeRef;
  return { room, rita, ana, vic, una, anaSecret, unaSecret, issue, issueRef, anaRef, unaRef, membership: repository.membership,
    enrolAnaDevice: async () => {
      const secret = crypto.getRandomValues(new Uint8Array(32));
      const member = (await M.summary()).value.items.find(item => item.type === "member" && item.values["handle"] === "@ana")!.id;
      await enrolKey(member, "device", secret);
      return secret;
    },
    agentAsks: async (question = "TEST which format should the import keep?") => {
      const offer = await act(rita, issue, "offer", { fields: { offeree: unaRef } });
      await act(una, issue, "accept", { on: offer.seq, fields: { terms: await factOf(una, issue, 0) } });
      const ask = await act(una, issue, "ask", { fields: { question, body: "TEST a person's decision." } });
      const request = await act(una, issue, "request-approval", { fields: { ask: ask.seq, bodyAt: ask, requested: anaRef } });
      const block = await act(una, issue, "block", { fields: { commitment: offer.seq, on: ask } });
      return { commitment: offer.seq, ask, request, block };
    },
    settle: () => drainScheduledFixture(life.platforms, life.wait),
    finish: async () => { await drainScheduledFixture(life.platforms, life.wait); life.release(); },
  };
}
