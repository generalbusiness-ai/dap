/** Local W1: real R23/D22/M9/Rules14/Commons1, native authority, turns,
 * SQLite and retained text. Clock, setup inspector and unused provider are
 * fixtures. host:none makes no repository call. No hosted W1 is claimed. */
import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import type { FactRef, Receipt, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, entryHash, factRefOf, intentDigest, isSeed, same, scopeIdOf, textDigest, timeOf, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { ScopeHandle, invitationIssueFields, invitationRedemptionFields, loadCommons, notesAbout, sessionRequest } from "@generalbusiness/dap-client";
import { COMMONS_COHORT as C } from "@generalbusiness/dap-platform";
import { DOCUMENTS, DOCUMENT_DIGESTS, MARKED, ROWS, STEPS, noteFor, noteKey } from "../../../examples/commons-bill/documents.ts";
import { api } from "../src/worker.ts";
import type { SessionIssueAnswer } from "../src/sessions.ts";
import { rita, una, vic } from "./repository.ts";
import { soon } from "./net.ts";
import { reader } from "./support.ts";
import { sessionRoom, dispatchFixture, drainScheduledFixture } from "./fixtures-native.ts";

test("native W1 retains 23 bill notes from a person and controlled agent with exact texts, authors and citation graph", async () => {
  const room = await sessionRoom(C.register, undefined, { host: "none", namespace: "" });
  const { life, R, D, children } = room, [M, A, G] = children;
  if (!M || !A || !G) { life.release(); return expect.fail("The actual Commons cohort requires its native siblings."); }
  try {
    const create = (await D.entries())[0]!.sends.find(send => isSeed(send.to) && send.to.kind === "commons");
    if (!create || !isSeed(create.to)) return expect.fail("Native Directory22 must create Commons1.");
    const Q = life.platform(scopeIdOf(create.to));
    await dispatchFixture([R, D, ...children, Q], life.wait);
    for (const [node, definition] of [[R, C.register], [D, C.directory], [M, C.membership], [A, C.rules], [G, C.destination], [Q, C.commons]] as const) {
      expect((await life.wait(() => node.summary())).value).toMatchObject({ definition, status: "active" });
    }
    const scope = await life.wait(() => Q.at()), membership = await life.wait(() => M.at());
    expect((await life.wait(() => D.item(0))).refs["commons"]).toEqual(scope);
    const person = { membership, member: "@rita" as const }, agent = { membership, member: "@bill-agent" as const };
    const seat = await life.wait(async () => M.did(rita, "seat", { expected: await M.expected({ roster: 0 }) }));
    await life.wait(async () => M.did(rita, "first-key", { fields: { member: seat }, expected: await M.expected({ roster: 0, member: seat }) }));
    const agentItem = await life.wait(() => M.did(rita, "add-member", { fields: { handle: agent.member, kind: "agent", controller: person } }));
    const inviteSecret = b64url(new Uint8Array(32).fill(114));
    const invitation = await life.wait(async () => M.did(rita, "invite-key", { fields: { member: agentItem, kind: "agent", inviteEnds: timeOf(life.now() + 3_600_000), ...invitationIssueFields(C.membership, inviteSecret) }, expected: await M.expected({ member: agentItem }) }));
    await life.wait(async () => M.did(una, "enrol", { on: 0, fields: invitationRedemptionFields(C.membership, membership, invitation, una.key, inviteSecret), expected: await M.expected({ on: 0, member: agentItem }) }));
    const roster = (await life.wait(() => M.summary())).value;
    expect(roster.items.find(item => item.id === seat)).toMatchObject({ type: "member", state: "active", values: { kind: "person", role: "admin" }, parties: { member: person } });
    expect(roster.items.find(item => item.id === agentItem)).toMatchObject({ type: "member", state: "active", values: { kind: "agent", role: "agent" }, parties: { member: agent, controller: person } });
    for (const [key, member] of [[rita.key, seat], [una.key, agentItem]] as const) expect(roster.items.filter(item => item.type === "key" && item.state === "active" && item.values["id"] === key)).toMatchObject([{ refs: { member } }]);
    expect(rita.key).not.toBe(una.key);
    // Deliver the two actual native inbox births before issuing real sessions.
    const inboxes = (await life.wait(() => M.entries())).flatMap(entry => entry.sends.flatMap(send => isSeed(send.to) && send.to.kind === "inbox" ? [life.platform(scopeIdOf(send.to))] : []));
    await dispatchFixture([M, ...inboxes], life.wait);
    life.owner.configure({ sessions: true, inspector: reader });
    const transport = api(env.PLATFORM);
    const handles = new Map<"member" | "agent", ScopeHandle>();
    for (const [who, signer] of [["member", rita], ["agent", una]] as const) {
      const issued = await life.wait(() => (M.stub as unknown as { session(request: unknown): Promise<SessionIssueAnswer> }).session(sessionRequest(membership, signer.secret, soon(60), `bo1-bill-${who}`)));
      if (!issued.ok) return expect.fail(`Native session issuance refused for ${who}: ${issued.reason}`);
      const handle = new ScopeHandle(transport, Q.name, `Session ${issued.token}`);
      expect(await life.wait(() => handle.summary())).toMatchObject({ ok: true, value: { scope } });
      handles.set(who, handle);
    }
    const facts = new Map<string, FactRef>(), originals = new Map<string, { signed: SignedIntent; receipt: Receipt }>();
    for (const step of STEPS) {
      // Reuse the operator's exact producer; later refs come from accepted
      // native receipts, never guessed sequence numbers or scripted entries.
      const note = noteFor(step, facts), signer = note.actor === "member" ? rita : una;
      const signed = await life.wait(() => Q.intent(signer, "note", { idempotencyKey: noteKey(step), fields: { text: textDigest(note.body), media: note.media, about: note.about } }));
      const answer = await life.wait(() => handles.get(note.actor)!.submit(signed, [], { texts: [note.body] }));
      expect(answer.answer, step).toBe("accepted");
      if (answer.answer !== "accepted") return expect.fail(`The native W1 step ${step} must be accepted.`);
      expect(answer.receipt).toMatchObject({ definition: C.commons, intent: intentDigest(signed.intent), fact: { at: scope } });
      facts.set(step, answer.receipt.fact); originals.set(step, { signed, receipt: answer.receipt });
    }
    expect(facts.size).toBe(23);
    const handle = handles.get("member")!, view = await life.wait(() => loadCommons(handle, scope));
    expect(view).toMatchObject({ complete: true, unreadable: [] });
    expect(view.next).toBeUndefined(); expect(view.notes).toHaveLength(23);
    for (const step of STEPS) {
      const note = noteFor(step, facts), original = originals.get(step)!, actor = note.actor === "member" ? person : agent, key = note.actor === "member" ? rita.key : una.key;
      const read = await life.wait(() => handle.entry(original.receipt.fact.seq));
      if (!read.ok) return expect.fail(`Accepted native note ${step} must remain readable.`);
      expect(read.value.hash).toBe(entryHash(read.value.entry));
      expect(factRefOf(read.value.entry)).toEqual(original.receipt.fact);
      const input = read.value.entry.input;
      if (input.type !== "act") return expect.fail("The note must be an actual signed native act.");
      expect(input.signed).toEqual(original.signed); expect(verifySignedIntent(input.signed)).toBe(true);
      const grants = input.authority.filter(grant => grant.key === key);
      expect(grants).toHaveLength(1); expect(grants[0]!.subject).toEqual(actor);
      if (note.actor === "agent") expect(same(grants[0]!.subject, person)).toBe(false);
      const projected = view.notes.find(note => same(note.fact, original.receipt.fact));
      expect(projected).toMatchObject({ author: actor, key, text: note.body, textDigest: textDigest(note.body), media: note.media, about: note.about });
      expect(await life.wait(() => handle.text(textDigest(note.body)))).toMatchObject({ ok: true, value: note.body });
    }
    expect(view.notes.filter(note => same(note.author, person))).toHaveLength(4);
    expect(view.notes.filter(note => same(note.author, agent))).toHaveLength(19);
    const rows = STEPS.filter(step => step.startsWith("row-")).map(step => view.notes.find(note => same(note.fact, facts.get(step)))!);
    expect(rows).toHaveLength(14);
    expect(rows.map(row => JSON.parse(row.text!))).toEqual(ROWS.map(([id, description, charged, paid]) => ({ id, description, charged, paid, difference: charged - paid })));
    for (const name of ["bill", "statement", "question"] as const) {
      const carrier = view.notes.find(note => same(note.fact, facts.get(`carrier-${name}`)))!;
      expect([carrier.textDigest, carrier.media, carrier.text]).toEqual([DOCUMENT_DIGESTS[name], "text/plain", DOCUMENTS[name]]);
    }
    for (const name of ["bill", "statement"] as const) {
      const related = notesAbout(view, { document: DOCUMENT_DIGESTS[name] });
      expect(related).toHaveLength(20);
      expect(related.filter(note => note.media === "application/json" && !Array.isArray(JSON.parse(note.text!)))).toHaveLength(14);
      expect(related.filter(note => same(note.author, person))).toHaveLength(4);
      expect(related.some(note => same(note.fact, facts.get("question-links")))).toBe(true);
    }
    for (const [index, n] of MARKED.entries()) {
      const row = facts.get(`row-${String(n).padStart(2, "0")}`)!, mark = facts.get(`mark-${String(index + 1).padStart(2, "0")}`)!;
      const related = notesAbout(view, { entry: row });
      expect(related.some(note => same(note.fact, mark) && same(note.author, person))).toBe(true);
      expect(related.some(note => same(note.fact, facts.get("question-links")) && same(note.author, agent))).toBe(true);
    }
    // Named refusals each leave the journal head unchanged. The separate
    // commons-install owner witnesses commons-missing on the native path.
    const badBefore = await life.wait(() => handle.summary());
    const malformed = await life.wait(() => Q.intent(una, "note", { fields: { text: textDigest("refused"), media: "text/plain", about: [{ document: DOCUMENT_DIGESTS.bill, fragment: "é".repeat(257) }] } }));
    expect(await life.wait(() => handle.submit(malformed, [], { texts: ["refused"] }))).toMatchObject({ answer: "refused", reason: "bad-field" });
    expect(await life.wait(() => handle.summary())).toEqual(badBefore);
    const unauthorizedBefore = await life.wait(() => handle.summary());
    const unauthorized = await life.wait(() => Q.intent(vic, "note", { fields: { text: textDigest("not a room member"), media: "text/plain", about: [] } }));
    expect(await life.wait(() => handle.submit(unauthorized, [], { texts: ["not a room member"] }))).toMatchObject({ answer: "refused", reason: "unauthorized" });
    expect(await life.wait(() => handle.summary())).toEqual(unauthorizedBefore);
    expect((await life.wait(() => loadCommons(handles.get("agent")!, scope))).notes).toEqual(view.notes);
  } finally {
    await drainScheduledFixture(() => life.platforms(), life.wait);
    life.release();
  }
});
