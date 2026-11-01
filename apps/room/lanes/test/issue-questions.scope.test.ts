import { expect, test } from "vitest";
import type { Answer, Receipt } from "@generalbusiness/dap-contract";
import { digestBytes, isSeed, keyIdOfSecret, scopeIdOf, signInvitationProof, textDigest, utf8 } from "@generalbusiness/dap-bytes";
import type { AskedOf, Kind } from "@generalbusiness/dap-client";
import { ROLE_LISTS } from "@generalbusiness/dap-platform";
import { drainScheduledFixture } from "../../../../packages/scope/test/support/native-fixture-lifetime.ts";
import { changeDemo, DEMO_DIGESTS, issueQuestions, QUESTION_DIGESTS } from "../src/index.ts";
import { Platform, paul, rita, room, soon, una, vic } from "./support/room.ts";

// Native Membership8, Rules, Directory and issue judgments/storage. Git setup
// replies, the clock and transport are fixture stand-ins; no provider runs.
// Empty caller grants below force production authority to read Membership.
test("current question text needs a requested person's approval and person-role decision; another question cannot release its block", async () => {
  const r = await room({ workspaceCohort: true, roster: [] });
  const inboxes = new Map<string, Platform>();
  const discoverInboxes = async () => {
    for (const entry of await r.M.entries()) for (const send of entry.sends) {
      if (isSeed(send.to) && send.to.kind === "inbox") {
        const name = scopeIdOf(send.to);
        if (!inboxes.has(name)) inboxes.set(name, new Platform(name));
      }
    }
  };
  try {
    expect((await r.M.summary()).value.definition).toBe("platform:membership@8");
    const owner = await r.member("@rita");
    expect(await r.M.item(r.members["@rita"]!)).toMatchObject({ state: "active", values: { kind: "person", role: "admin" } });

    // A person joins through the real public-key invitation, not add-member.
    for (const [who, handle, byte] of [[una, "@una", 41], [vic, "@vic", 42]] as const) {
      const seed = new Uint8Array(32).fill(byte);
      const member = await r.M.did(rita, "invite-member", { fields: {
        handle, role: "member", inviteKey: keyIdOfSecret(seed), inviteEnds: soon(3600),
      } });
      const key = await r.M.did(who, "join", { fields: {
        invitation: member, proof: signInvitationProof(seed, await r.M.at(), member, who.key),
      } });
      expect(await r.M.item(member)).toMatchObject({ state: "active", values: { kind: "person", role: "member" }, parties: { controller: null } });
      // A person's key is kind device; member.kind carries person identity.
      expect(await r.M.item(key)).toMatchObject({ state: "active", values: { id: who.key, kind: "device" }, refs: { member } });
    }
    const agent = await r.M.did(rita, "add-member", { fields: { handle: "@paul", kind: "agent", controller: owner } });
    const agentSeed = new Uint8Array(32).fill(43);
    const agentKey = await r.M.did(rita, "invite-key", { expected: await r.M.expected({ member: agent }), fields: {
      member: agent, kind: "agent", inviteKey: keyIdOfSecret(agentSeed), inviteEnds: soon(3600),
    } });
    await r.M.did(paul, "enrol", { on: 0, expected: await r.M.expected({ on: 0, member: agent }), fields: {
      invitation: agentKey, proof: signInvitationProof(agentSeed, await r.M.at(), agentKey, paul.key),
    } });
    expect(await r.M.item(agent)).toMatchObject({ state: "active", values: { kind: "agent", role: "agent" }, parties: { controller: owner } });
    expect(await r.M.item(agentKey)).toMatchObject({ state: "active", values: { id: paul.key, kind: "agent" }, refs: { member: agent } });

    const otherSecret = new Uint8Array(32).fill(44);
    const quinn = { ...paul, secret: otherSecret, key: keyIdOfSecret(otherSecret), member: { ...paul.member, member: "@quinn" as const } };
    const otherMember = await r.M.did(rita, "add-member", { fields: { handle: "@quinn", kind: "agent", controller: owner } });
    const otherInvitationSeed = new Uint8Array(32).fill(45);
    const otherInvitation = await r.M.did(rita, "invite-key", { expected: await r.M.expected({ member: otherMember }), fields: {
      member: otherMember, kind: "agent", inviteKey: keyIdOfSecret(otherInvitationSeed), inviteEnds: soon(3600),
    } });
    await r.M.did(quinn, "enrol", { on: 0, expected: await r.M.expected({ on: 0, member: otherMember }), fields: {
      invitation: otherInvitation, proof: signInvitationProof(otherInvitationSeed, await r.M.at(), otherInvitation, quinn.key),
    } });
    expect(await r.M.item(otherMember)).toMatchObject({ state: "active", values: { kind: "agent", role: "agent" }, parties: { controller: owner } });

    // Preserve each whole role list. The adopted boundary is role grants;
    // this does not claim protection against granting a person role to an agent.
    const before = await r.M.item(0), added = ["issue.approve", "issue.decide"];
    for (const role of ["admin", "maintainer", "member"] as const) {
      const current = before.values[ROLE_LISTS[role]];
      if (!Array.isArray(current) || current.some(value => typeof value !== "string")) throw new Error("The actual roster action list is unavailable.");
      const actions = [...current, ...added.filter(action => !current.includes(action))];
      await r.M.did(rita, "set-actions", { on: 0, expected: await r.M.expected({ on: 0 }), fields: { role, actions } });
      expect((await r.M.item(0)).values[ROLE_LISTS[role]]).toEqual(actions);
    }
    for (const role of ["agent", "checker"] as const) {
      const actions = (await r.M.item(0)).values[ROLE_LISTS[role]];
      expect(actions).toEqual(before.values[ROLE_LISTS[role]]);
      for (const action of added) expect(actions).not.toContain(action);
    }
    await discoverInboxes();
    await r.settle();
    await r.activate(issueQuestions, QUESTION_DIGESTS.issue);
    const I = await r.lane(rita, "open-issue", issueQuestions, QUESTION_DIGESTS.issue, {
      title: "TEST versioned question approvals", conditions: ["A person decides the current text"],
    });
    type Kinds = Kind<typeof issueQuestions>;
    const submit = async <K extends Kinds>(who: typeof una, kind: K, asked: AskedOf<typeof issueQuestions, K>): Promise<Answer> => {
      const original = await I.signed(who, kind, asked);
      return I.handle.submit(original.signed, [], original.beside);
    };
    const did = async <K extends Kinds>(who: typeof una, kind: K, asked: AskedOf<typeof issueQuestions, K>): Promise<Receipt> => {
      const answer = await submit(who, kind, asked);
      expect(answer).toMatchObject({ answer: "accepted" });
      if (answer.answer !== "accepted") throw new Error("The native question act was not accepted.");
      return answer.receipt;
    };
    const head = async () => {
      const read = await I.handle.scope.summary();
      if (!read.ok) throw new Error("The native issue head is unavailable.");
      return read.at;
    };
    const refused = async <K extends Kinds>(who: typeof una, kind: K, asked: AskedOf<typeof issueQuestions, K>, reason: string, name?: string) => {
      const before = await head();
      expect(await submit(who, kind, asked)).toMatchObject({ answer: "refused", reason, ...(name ? { name } : {}) });
      expect(await head()).toEqual(before);
    };
    const text = async (body: string) => {
      expect(await I.handle.scope.text(textDigest(body))).toMatchObject({ ok: true, complete: true, value: body });
    };

    const person = await r.member("@una"), controlled = await r.member("@paul");
    const body1 = "TEST first text\nApprove the initial wording.\n";
    const ask = (await did(rita, "ask", { fields: { question: "May we publish?", body: body1 } })).fact;
    expect(await I.item(ask.seq)).toMatchObject({ state: "asked", refs: { bodyAt: ask.seq }, values: { body: textDigest(body1) } });
    await text(body1);
    const offer = (await did(rita, "offer", { fields: { offeree: person } })).fact;
    await did(una, "accept", { on: offer.seq, fields: { terms: await I.fact(0) } });
    const block = (await did(una, "block", { fields: { commitment: offer.seq, on: ask } })).fact;

    // S5: a controlled agent's block is local to its commitment. The other
    // controlled agent can record a real Change proposal while it remains.
    const agentOffer = (await did(rita, "offer", { fields: { offeree: controlled } })).fact;
    await did(paul, "accept", { on: agentOffer.seq, fields: { terms: await I.fact(0) } });
    const agentBlock = (await did(paul, "block", { fields: { commitment: agentOffer.seq, on: ask } })).fact;
    await r.activate(changeDemo, DEMO_DIGESTS.change);
    const C = await r.lane(quinn, "open-pr", changeDemo, DEMO_DIGESTS.change, { title: "TEST independent agent change", draft: false });
    const content = "TEST independent change\n";
    const proposed = await C.signed(quinn, "propose-file", { fields: {
      base: r.firstHead, path: "TEST.txt", digest: digestBytes(utf8(content)), size: utf8(content).length, content,
    } });
    const proposedAnswer = await C.handle.submit(proposed.signed, [], proposed.beside);
    expect(proposedAnswer).toMatchObject({ answer: "accepted" });
    if (proposedAnswer.answer !== "accepted") throw new Error("The other controlled agent's native Change proposal must be accepted.");
    expect(await C.item(proposedAnswer.receipt.fact.seq)).toMatchObject({ type: "manifest", state: "current", parties: { integrator: await r.member("@quinn") } });
    expect(await I.item(agentBlock.seq)).toMatchObject({ state: "blocked", refs: { commitment: agentOffer.seq } });

    const agentRequest = (await did(rita, "request-approval", { fields: { ask: ask.seq, bodyAt: ask, requested: controlled } })).fact;
    const personRequest = (await did(rita, "request-approval", { fields: { ask: ask.seq, bodyAt: ask, requested: person } })).fact;
    // Both requests name this body; only the person role has the grant.
    await refused(paul, "approve", { fields: { request: agentRequest.seq, bodyAt: ask, verdict: "approve" } }, "unauthorized");
    await refused(vic, "approve", { fields: { request: personRequest.seq, bodyAt: ask, verdict: "approve" } }, "guard-failed", "not-requested");
    const approvalComment = "TEST person approval of the first text.";
    const oldApproval = (await did(una, "approve", { fields: { request: personRequest.seq, bodyAt: ask, verdict: "approve", comment: approvalComment } })).fact;
    expect(await I.item(oldApproval.seq)).toMatchObject({ refs: { ask: ask.seq, bodyAt: ask.seq, request: personRequest.seq }, parties: { approver: person } });
    expect((await I.item(personRequest.seq)).state).toBe("met");
    await text(approvalComment);
    await refused(rita, "decide", { on: ask.seq, fields: { bodyAt: ask } }, "guard-failed", "approval-pending");
    const oldPersonRequest = (await did(rita, "request-approval", { fields: { ask: ask.seq, bodyAt: ask, requested: await r.member("@vic") } })).fact;

    const body2 = "TEST revised text\nThe first approval no longer counts.\n";
    const revision = (await did(rita, "revise-ask", { on: ask.seq, fields: { bodyAt: ask, body: body2 } })).fact;
    expect(await I.item(ask.seq)).toMatchObject({ refs: { bodyAt: revision.seq }, values: { body: textDigest(body2) } });
    await text(body1); await text(body2);
    // The old approval cannot satisfy decide; the old agent request cannot block it.
    expect((await I.item(agentRequest.seq)).state).toBe("open");
    expect(await I.item(oldPersonRequest.seq)).toMatchObject({ state: "open", refs: { bodyAt: ask.seq } });
    await refused(vic, "approve", { fields: { request: oldPersonRequest.seq, bodyAt: ask, verdict: "approve" } }, "guard-failed", "stale-question");
    // Withdrawal binds the request's own text, even after the ask moves on.
    await refused(vic, "withdraw-approval-request", { on: oldPersonRequest.seq, fields: { bodyAt: ask } }, "guard-failed");
    await refused(rita, "withdraw-approval-request", { on: oldPersonRequest.seq, fields: { bodyAt: revision } }, "guard-failed", "stale-question");
    await did(rita, "withdraw-approval-request", { on: oldPersonRequest.seq, fields: { bodyAt: ask } });
    expect(await I.item(oldPersonRequest.seq)).toMatchObject({ state: "withdrawn", refs: { ask: ask.seq, bodyAt: ask.seq } });
    await refused(rita, "decide", { on: ask.seq, fields: { bodyAt: revision } }, "guard-failed", "approval-needed");
    const currentRequest = (await did(rita, "request-approval", { fields: { ask: ask.seq, bodyAt: revision, requested: person } })).fact;
    await refused(una, "approve", { fields: { request: currentRequest.seq, bodyAt: ask, verdict: "approve" } }, "guard-failed", "stale-question");
    await refused(rita, "decide", { on: ask.seq, fields: { bodyAt: revision } }, "guard-failed", "approval-pending");
    await did(una, "approve", { fields: { request: currentRequest.seq, bodyAt: revision, verdict: "request-changes", comment: "TEST clarify the final wording." } });
    const secondRequest = (await did(rita, "request-approval", { fields: { ask: ask.seq, bodyAt: revision, requested: await r.member("@vic") } })).fact;
    await did(vic, "approve", { fields: { request: secondRequest.seq, bodyAt: revision, verdict: "approve" } });
    // No request is open and an approval exists; request-changes still bars decide.
    await refused(rita, "decide", { on: ask.seq, fields: { bodyAt: revision } }, "guard-failed", "changes-requested");

    const finalBody = "TEST final text\nOnly this version can be decided.\n";
    const finalRevision = (await did(rita, "revise-ask", { on: ask.seq, fields: { bodyAt: revision, body: finalBody } })).fact;
    await refused(rita, "decide", { on: ask.seq, fields: { bodyAt: finalRevision } }, "guard-failed", "approval-needed");
    const comment = (await did(vic, "comment", { fields: { body: "TEST discussing the exact final revision.", about: finalRevision } })).fact;
    expect((await I.item(comment.seq)).refs["about"]).toBe(finalRevision.seq);
    const finalRequest = (await did(rita, "request-approval", { fields: { ask: ask.seq, bodyAt: finalRevision, requested: person } })).fact;
    await did(una, "approve", { fields: { request: finalRequest.seq, bodyAt: finalRevision, verdict: "approve" } });
    await text(finalBody);
    // All current-text conditions now hold, so this refusal isolates the grant.
    await refused(paul, "decide", { on: ask.seq, fields: { bodyAt: finalRevision } }, "unauthorized");
    const decision = (await did(rita, "decide", { on: ask.seq, fields: { bodyAt: finalRevision, comment: "TEST approved for publication." } })).fact;
    expect(await I.item(ask.seq)).toMatchObject({ state: "decided", refs: { decisionAt: decision.seq } });
    expect((await I.item(agentRequest.seq)).state).toBe("open");
    await did(rita, "withdraw-approval-request", { on: agentRequest.seq, fields: { bodyAt: ask } });
    expect(await I.item(agentRequest.seq)).toMatchObject({ state: "withdrawn", refs: { ask: ask.seq, bodyAt: ask.seq } });

    const other = (await did(rita, "ask", { fields: { question: "A different question", body: "TEST unrelated text." } })).fact;
    const selfRequest = (await did(rita, "request-approval", { fields: { ask: other.seq, bodyAt: other, requested: owner } })).fact;
    await refused(rita, "approve", { fields: { request: selfRequest.seq, bodyAt: other, verdict: "approve" } }, "guard-failed", "asker-cannot-approve");
    await did(rita, "withdraw-approval-request", { on: selfRequest.seq, fields: { bodyAt: other } });
    expect((await I.item(selfRequest.seq)).state).toBe("withdrawn");
    await refused(rita, "decide", { on: other.seq, fields: { bodyAt: other } }, "guard-failed", "approval-needed");
    const otherRequest = (await did(rita, "request-approval", { fields: { ask: other.seq, bodyAt: other, requested: person } })).fact;
    await did(una, "approve", { fields: { request: otherRequest.seq, bodyAt: other, verdict: "approve" } });
    const otherDecision = (await did(rita, "decide", { on: other.seq, fields: { bodyAt: other } })).fact;
    await refused(una, "release-block", { on: block.seq, fields: { commitment: offer.seq, answer: otherDecision } }, "guard-failed", "not-this-ask");
    await did(una, "release-block", { on: block.seq, fields: { commitment: offer.seq, answer: decision } });
    expect(await I.item(block.seq)).toMatchObject({ state: "released", refs: { releasedBy: decision.seq } });

    // Old offers keep their terms. Only the NEW offer names the revision.
    const oldTerms = await I.fact(0);
    const changedTerms = (await did(rita, "revise", { on: 0, fields: { conditions: ["TEST revised conditions for new work"] } })).fact;
    const newOffer = (await did(rita, "offer", { fields: { offeree: controlled } })).fact;
    const beforeOffer = await I.item(newOffer.seq);
    await refused(paul, "accept", { on: newOffer.seq, fields: { terms: oldTerms } }, "guard-failed", "terms-differ");
    expect(await I.item(newOffer.seq)).toEqual(beforeOffer);
    await did(paul, "accept", { on: newOffer.seq, fields: { terms: changedTerms } });
    expect(await I.item(newOffer.seq)).toMatchObject({ state: "accepted", refs: { termsAt: changedTerms.seq } });
    expect(await I.item(agentOffer.seq)).toMatchObject({ state: "accepted", refs: { termsAt: oldTerms.seq } });
    await did(paul, "release-block", { on: agentBlock.seq, fields: { commitment: agentOffer.seq, answer: decision } });
    expect(await I.item(agentBlock.seq)).toMatchObject({ state: "released", refs: { releasedBy: decision.seq } });
  } finally {
    // Discover only actual Membership-created Inboxes. Join their callbacks
    // with the room's before this scenario returns; no physical-drain claim.
    await discoverInboxes();
    await drainScheduledFixture(() => [...r.scopes, ...inboxes.values()]);
  }
}, 90_000);
