import { expect, test } from "vitest";
import type { Answer, Receipt } from "@generalbusiness/dap-contract";
import { digestBytes, isSeed, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import type { AskedOf, Kind } from "@generalbusiness/dap-client";
import { drainScheduledFixture } from "../../../../packages/scope/test/support/native-fixture-lifetime.ts";
import { issueQuestionsBrief, QUESTION_BRIEF_DIGESTS } from "../src/index.ts";
import { Platform, rita, room } from "./support/room.ts";

// Real Membership8, Rules, Directory and lane judgments with SQLite storage.
// The existing room fixture supplies the clock, Git replies and transport.
// No provider, package resource or browser runs in this profile owner.
test("a native question keeps Brief A when a revision refuses B, compares A or omits the comparison", async () => {
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
    expect(await r.M.item(r.members["@rita"]!)).toMatchObject({ state: "active", values: { kind: "person", role: "admin" } });
    await r.activate(issueQuestionsBrief, QUESTION_BRIEF_DIGESTS.issue);
    const I = await r.lane(rita, "open-issue", issueQuestionsBrief, QUESTION_BRIEF_DIGESTS.issue, {
      title: "TEST fixed Brief", conditions: ["Question revisions retain their original Brief"],
    });
    type Kinds = Kind<typeof issueQuestionsBrief>;
    const submit = async <K extends Kinds>(kind: K, asked: AskedOf<typeof issueQuestionsBrief, K>): Promise<Answer> => {
      const original = await I.signed(rita, kind, asked);
      // Empty grants force Native authority to resolve the actual Membership.
      return I.handle.submit(original.signed, [], original.beside);
    };
    const did = async <K extends Kinds>(kind: K, asked: AskedOf<typeof issueQuestionsBrief, K>): Promise<Receipt> => {
      const answer = await submit(kind, asked);
      expect(answer).toMatchObject({ answer: "accepted" });
      if (answer.answer !== "accepted") return expect.fail("The native Brief act was not accepted.");
      return answer.receipt;
    };
    const head = async () => {
      const answer = await I.handle.scope.summary();
      if (!answer.ok) return expect.fail("The native issue head is unavailable.");
      return answer.at;
    };
    const briefA = digestBytes(new TextEncoder().encode("TEST Brief A\n"));
    const briefB = digestBytes(new TextEncoder().encode("TEST Brief B\n"));
    const initialBody = "TEST initial question wording.";
    const ask = (await did("ask", { fields: { question: "May we proceed?", body: initialBody, brief: briefA } })).fact;
    const initial = await I.item(ask.seq);
    expect(initial).toMatchObject({ state: "asked", refs: { bodyAt: ask.seq }, values: { brief: briefA, body: textDigest(initialBody) } });

    const before = await head();
    expect(await submit("revise-ask", { on: ask.seq, fields: { bodyAt: ask, body: "TEST forbidden replacement.", brief: briefB } }))
      .toMatchObject({ answer: "refused", reason: "guard-failed", name: "brief-fixed" });
    expect(await head()).toEqual(before);
    expect(await I.item(ask.seq)).toEqual(initial);

    const comparedBody = "TEST revised wording under Brief A.";
    const compared = (await did("revise-ask", { on: ask.seq, fields: { bodyAt: ask, body: comparedBody, brief: briefA } })).fact;
    expect(await I.item(ask.seq)).toMatchObject({ refs: { bodyAt: compared.seq }, values: { brief: briefA, body: textDigest(comparedBody) } });
    const omittedBody = "TEST later wording without a Brief comparison.";
    const omitted = (await did("revise-ask", { on: ask.seq, fields: { bodyAt: compared, body: omittedBody } })).fact;
    expect(await I.item(ask.seq)).toMatchObject({ refs: { bodyAt: omitted.seq }, values: { brief: briefA, body: textDigest(omittedBody) } });
    for (const body of [initialBody, comparedBody, omittedBody]) {
      expect(await I.handle.scope.text(textDigest(body))).toMatchObject({ ok: true, complete: true, value: body });
    }
  } finally {
    await discoverInboxes();
    await drainScheduledFixture(() => [...r.scopes, ...inboxes.values()]);
  }
}, 60_000);
