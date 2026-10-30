import { expect, test } from "vitest";
import type { Entry, Grant, Head, MemberRef, ReferenceValue, ScopeRef, Sealed, Summary } from "@generalbusiness/dap-contract";
import { entryHash, factRefOf, newIncarnation, scopeIdOf, textDigest, timeOf } from "@generalbusiness/dap-bytes";
import { secretSigner, signedIntent } from "../src/intent.ts";
import type { ScopeHandle } from "../src/handle.ts";
import { commonsAuthorLabels, commonsInstallCheck, loadCommons, notesAbout } from "../src/commons.ts";

// Actual signatures/hashes and reader, with scripted authority/history/text
// ports. Native creation and authority are separate witnesses.
async function reading() {
  const scope: ScopeRef = { scope: scopeIdOf({ v: 1, kind: "commons", definition: "platform:commons@1", creator: null, cause: textDigest("SCRIPTED commons"), ordinal: 0 }), kind: "commons", inc: newIncarnation(new Uint8Array(16).fill(7)) };
  const membership: ScopeRef = { ...scope, kind: "membership" }, owner = { membership, member: "@person" as const }, agent = { membership, member: "@agent" as const };
  const agentSigner = secretSigner(new Uint8Array(32).fill(7)), personSigner = secretSigner(new Uint8Array(32).fill(8)), entries: Sealed[] = [], bodies = new Map<string, string>();
  const genesis: Entry = { v: 1, at: scope, seq: 0, prev: null, time: timeOf(Date.parse("2030-01-01T00:00:00Z")), clamped: false, epoch: 0,
    input: { type: "genesis", seed: { v: 1, kind: "commons", definition: "platform:commons@1", creator: null, cause: textDigest("SCRIPTED commons"), ordinal: 0 }, inc: scope.inc, kind: "establish", founding: null, source: null, n: null, message: null, decision: "applied" }, uses: [], prepared: [], effects: [], sends: [] };
  entries.push({ entry: genesis, hash: entryHash(genesis) });
  const add = async (text: string, media: string, about: ReferenceValue[], member: MemberRef = agent) => {
    const digest = textDigest(text), seq = entries.length, signer = member.member === owner.member ? personSigner : agentSigner;
    const signed = await signedIntent(signer, { to: scope, kind: "note", fields: { text: digest, media, about }, expected: {} }, { now: Date.parse("2030-01-01T00:00:00Z") });
    // principal deliberately differs: attribution must use subject, not owner.
    const at = timeOf(Date.parse("2030-01-01T00:00:00Z"));
    const authority: Grant[] = [{ key: signer.key, subject: member, principal: member.member === agent.member ? owner : null,
      issued: { at: membership, seq: 1, hash: textDigest("SCRIPTED grant") }, actions: ["commons.write"], within: { membership }, notAfter: null,
      fresh: { read: { run: "SCRIPTED", n: seq }, use: "fresh", prior: null, observation: { of: membership, head: { seq: 1, hash: textDigest("SCRIPTED membership head") }, key: signer.key, keyState: "active", member: member.member, memberState: "active", role: member.member === agent.member ? "agent" : "member", actions: ["commons.write"], within: { membership }, controller: member.member === agent.member ? owner.member : null, controllerActive: member.member === agent.member ? true : null, notAfter: null, definition: "platform:membership@9", at } } }];
    const entry: Entry = { v: 1, at: scope, seq, prev: entries.at(-1)?.hash ?? null, time: timeOf(Date.parse("2030-01-01T00:00:00Z")), clamped: false, epoch: 0,
      input: { type: "act", signed, authority, presented: {} }, uses: [], prepared: [], effects: [], sends: [] };
    const sealed = { entry, hash: entryHash(entry) }; entries.push(sealed); bodies.set(digest, text); return factRefOf(entry);
  };
  const bill = textDigest("bill"), statement = textDigest("statement");
  await add("bill", "text/plain", []); await add("statement", "text/plain", []);
  const rows = [];
  for (let n = 0; n < 14; n++) rows.push(await add(JSON.stringify({ charge: n + 1, amount: 20 + n }), "application/json", [{ document: bill, fragment: `line=${n},${n + 1}` }, { document: statement, fragment: "line=0,1" }]));
  await add(JSON.stringify(rows), "application/json", rows.map(entry => ({ entry })));
  for (const row of rows.slice(0, 4)) await add("Ask about this", "text/plain", [{ entry: row }], owner);
  const question = textDigest("question"); await add("question", "text/plain", []);
  const asked = await add("Question about four charges", "text/plain", [{ document: question }, ...rows.slice(0, 4).map(entry => ({ entry }))]);
  const head: Head = { seq: entries.length - 1, hash: entries.at(-1)!.hash };
  const summary: Summary = { scope, definition: "platform:commons@1", status: "active", time: timeOf(Date.parse("2030-01-01T00:00:00Z")), items: [], counts: [] };
  let textCalls = 0;
  const handle = {
    summary: async () => ({ ok: true, at: head, value: summary, complete: true }),
    history: async () => ({ ok: true, at: head, value: entries, complete: true }),
    text: async (digest: string) => { textCalls++; const text = bodies.get(digest); return text === undefined ? { ok: false, reason: "not-found" } : { ok: true, at: head, value: text, complete: true }; },
  } as unknown as ScopeHandle;
  return { scope, owner, agent, bill, statement, asked, head, summary, handle, entries, textCalls: () => textCalls };
}

test("a document reading includes all fourteen source-line rows, indirect marks and question with the actual native subjects, not the agent's controller", async () => {
  const fixture = await reading(), view = await loadCommons(fixture.handle, fixture.scope);
  expect([view.complete, view.notes.length, fixture.textCalls()]).toEqual([true, 23, 23]);
  for (const document of [fixture.bill, fixture.statement]) {
    const related = notesAbout(view, { document });
    expect(related.length).toBe(20); // 14 rows, list, four marks, question.
    expect(related.filter(note => note.media === "application/json" && note.about.some(ref => "document" in ref)).length).toBe(14);
    expect(related.filter(note => note.text === "Ask about this").map(note => note.author)).toEqual(Array(4).fill(fixture.owner));
    expect(related.filter(note => note.text !== "Ask about this").every(note => JSON.stringify(note.author) === JSON.stringify(fixture.agent))).toBe(true);
    expect(related.at(-1)?.fact).toEqual(fixture.asked);
  }
  expect(notesAbout(view, { entry: { ...fixture.asked, at: { ...fixture.scope, inc: newIncarnation(new Uint8Array(16).fill(8)) } } })).toEqual([]);
  expect(view.notes[2]!.about[0]).toMatchObject({ fragment: "line=0,1" });
  const membership = { ...fixture.summary, scope: fixture.owner.membership, definition: "platform:membership@9", items: [
    { type: "member", parties: { member: fixture.agent, controller: fixture.owner }, values: { handle: fixture.agent.member, kind: "agent", role: "agent" } },
    { type: "member", parties: { member: fixture.owner, controller: null }, values: { handle: fixture.owner.member, kind: "person", role: "agent" } },
  ] } as unknown as Summary;
  expect(Object.values(commonsAuthorLabels(view, membership))).toEqual([{ handle: "@agent", kind: "agent" }, { handle: "@person", kind: "person" }]);

});

test("incomplete history, missing detached text and missing Commons remain explicit", async () => {
  const fixture = await reading();
  const missing = { ...fixture.handle, text: async () => ({ ok: false, reason: "forbidden" }) } as unknown as ScopeHandle;
  const view = await loadCommons(missing, fixture.scope);
  expect(view.complete).toBe(false); expect(view.notes.every(note => note.text === null)).toBe(true); expect(view.unreadable.length).toBeGreaterThan(0);
  const refused = { ...fixture.handle, history: async () => ({ ok: false, reason: "forbidden" }) } as unknown as ScopeHandle;
  expect(await loadCommons(refused, fixture.scope)).toMatchObject({ complete: false, notes: [], unreadable: ["The history read refused: forbidden."] });
  expect(commonsInstallCheck(fixture.summary, ["commons"])).toEqual({ ok: false, reason: "commons-missing" });
  expect(commonsInstallCheck(fixture.summary, undefined)).toEqual({ ok: true, commons: null });
  const directory = { ...fixture.summary, items: [{ type: "repository", refs: { commons: fixture.scope } }] } as unknown as Summary;
  expect(commonsInstallCheck(directory, ["commons"])).toEqual({ ok: true, commons: fixture.scope });
});

test("a complete flag cannot conceal a missing middle history entry", async () => {
  const fixture = await reading();
  const gap = { ...fixture.handle, history: async () => ({ ok: true, at: fixture.head, complete: true, value: [fixture.entries[0]!, ...fixture.entries.slice(2)] }) } as unknown as ScopeHandle;
  const view = await loadCommons(gap, fixture.scope);
  expect(view.complete).toBe(false);
  expect(view.unreadable.join(" ")).toContain("history has a gap");
});
