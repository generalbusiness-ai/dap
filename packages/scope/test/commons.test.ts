import { expect, test } from "vitest";
import type { FieldValue, ScopeRef, Seed } from "@generalbusiness/dap-contract";
import { factRefOf, isSeed, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { sessionRequest } from "@generalbusiness/dap-client";
import { COMMONS_COHORT as C, FIRST_ACTIONS_OF, ROLE_LISTS } from "@generalbusiness/dap-platform";
import type { SessionIssueAnswer } from "../src/sessions.ts";
import { rita } from "./repository.ts";
import { soon } from "./net.ts";
import { reader } from "./support.ts";
import { sessionRoom, dispatchFixture, drainScheduledFixture } from "./fixtures-native.ts";

// Actual native Register23, Directory22, Membership9, Rules14, Destination16
// and Commons1, with production authority, dispatch and SQLite. sessionRoom
// owns a scripted clock, setup inspector and an unused provider stand-in:
// host:none makes no repository request. This is no hosted W1 observation.
test("new-room Commons notes preserve opaque citations and signer identity; native role lists and read authority use Membership9", async () => {
  const room = await sessionRoom(C.register, undefined, { host: "none", namespace: "" });
  const { life, R, D, children } = room, M = children[0]!;
  try {
    const birth = (await D.entries())[0]!;
    const create = birth.sends.find(send => isSeed(send.to) && send.to.kind === "commons");
    if (!create || !isSeed(create.to)) return expect.fail("Directory genesis emitted no Commons create");
    expect(create.to).toMatchObject({ kind: "commons", definition: C.commons, creator: await D.at(), ordinal: 3 });
    const Q = life.platform(scopeIdOf(create.to));
    await dispatchFixture([R, D, ...children, Q], life.wait);
    expect((await Q.summary()).value).toMatchObject({ definition: C.commons, status: "active" });
    expect((await D.item(0)).refs["commons"]).toEqual(await Q.at());
    expect(await (D.stub as unknown as { applicationRoom(): Promise<unknown> }).applicationRoom()).toEqual({ directory: await D.at(), rules: (await D.item(0)).refs["rules"] as ScopeRef });
    const commons = await Q.item(0);
    expect(commons.refs["directory"]).toEqual(await D.at());
    expect(commons.values["membership"]).toBe(M.name);
    const roster = await M.item(0);
    for (const [role, slot] of Object.entries(ROLE_LISTS)) {
      expect(roster.values[slot]).toEqual([...FIRST_ACTIONS_OF["platform:membership@8"]![role as keyof typeof ROLE_LISTS], "commons.write"]);
    }
    const member = await M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) });
    await M.did(rita, "first-key", { fields: { member }, expected: await M.expected({ roster: 0, member }) });
    const inboxSend = (await M.entries())[member]!.sends.find(send => isSeed(send.to) && send.to.kind === "inbox");
    if (!inboxSend || !isSeed(inboxSend.to)) return expect.fail("Native seat emitted no inbox create");
    const inbox = life.platform(scopeIdOf(inboxSend.to as Seed));
    await dispatchFixture([M, inbox], life.wait);
    life.owner.configure({ sessions: true, inspector: reader });
    const issued = await (M.stub as unknown as { session(request: unknown): Promise<SessionIssueAnswer> }).session(sessionRequest(await M.at(), rita.secret, soon(60), "commons-read"));
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    // Before any note has fixed Membership's incarnation in an observation,
    // real session preparation must follow this exact Directory's Commons ref.
    expect(await Q.stub.summary(`Session ${issued.token}`)).toMatchObject({ ok: true, value: { scope: await Q.at() } });
    const text = "A reading stays its signer's own statement.";
    const note = async (about: FieldValue[]) => Q.stub.submit(await Q.intent(rita, "note", { fields: { text: textDigest(text), media: "text/plain", about } }), [], { texts: [text] });
    const earlier = await note([]);
    expect(earlier.answer).toBe("accepted");
    if (earlier.answer !== "accepted") return;
    const citations = [{ document: textDigest("TEST document bytes"), fragment: "page=3" }, { entry: earlier.receipt.fact, fragment: "row=7" }];
    const written = await note(citations);
    expect(written.answer).toBe("accepted");
    if (written.answer !== "accepted") return;
    const entry = (await Q.entries()).find(row => row.seq === written.receipt.fact.seq)!;
    expect(factRefOf(entry)).toEqual(written.receipt.fact);
    expect(entry.input).toMatchObject({ type: "act", signed: { intent: { actor: rita.key, fields: { about: citations } } } });
    expect(entry.effects).toEqual([]); expect(entry.sends).toEqual([]);
    expect(entry.uses.some(use => use.fact.hash === earlier.receipt.fact.hash)).toBe(false);
    expect(await Q.stub.retained(`Session ${issued.token}`, "text", textDigest(text))).toMatchObject({ ok: true });
    const before = (await Q.summary()).at;
    expect(await note([{ document: textDigest("TEST document bytes"), fragment: "é".repeat(257) }])).toMatchObject({ answer: "refused", reason: "bad-field" });
    expect(await note(Array.from({ length: 65 }, () => ({ document: textDigest("TEST document bytes") })))).toMatchObject({ answer: "refused", reason: "bad-field" });
    expect((await Q.summary()).at).toEqual(before);
  } finally {
    await drainScheduledFixture(() => life.platforms(), life.wait);
    life.release();
  }
});
