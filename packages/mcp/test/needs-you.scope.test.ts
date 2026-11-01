import { expect, test } from "vitest";
import { DOMAINS, type Intent, type Item } from "@generalbusiness/dap-contract";
import { digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { secretSigner } from "@generalbusiness/dap-client";
import { QUESTION_DIGESTS, issueQuestions } from "@generalbusiness/dap-lanes";
import { decisionSource, questionSubject } from "../../../apps/views/src/decision.ts";
import { RepoInAi, type Row } from "../../../apps/views/src/repo-in-ai.ts";
import type { ReviewStore } from "../../../apps/views/src/review-store.ts";
import { act, askingRoom, factOf, type AskingRoom } from "./support/asking-room.ts";

// Real: Native M8 authority, the question lane's judgments, SQLite, Worker HTTP, read sessions under a TEST secret, the adapter and its Collection reads.
// STAND-INS: the Git host, the scripted clock, the pause scheduler, and this store in memory for the owner-only file. `apps/views/test/j5.test.mjs` runs the real file store.
const BRIEF = { bytes: utf8("TEST Brief"), digest: digestBytes(utf8("TEST Brief")) };
const memoryMarks = () => {
  const held = new Map<string, { scope: unknown; head: unknown }>();
  return { read: () => [...held.values()], mark: async (capture: { heads: { scope: { scope: string }; head: unknown }[] }, admit: () => void) => { admit(); for (const point of capture.heads) held.set(point.scope.scope, point); return "marked"; } } as unknown as ReviewStore;
};

/** One device of @ana: the same member under its own key, with its own place in the local store. */
function deviceOf(f: AskingRoom, secret: Uint8Array) {
  const config = structuredClone(f.ana.config), signer = secretSigner(secret), signed: Intent[] = [];
  const app = new RepoInAi({ service: config.service, config: async () => structuredClone(config), fetch: f.room.fetch, now: f.room.now, reviewStore: memoryMarks(), brief: BRIEF,
    signer: { key: signer.key, sign: bytes => { const text = new TextDecoder().decode(bytes), prefix = `${DOMAINS.intent}\n`; if (text.startsWith(prefix)) signed.push(JSON.parse(text.slice(prefix.length)) as Intent); return signer.sign(bytes); } } });
  const source = decisionSource(app), noTools = { call: async () => { throw new Error("These cards read through the adapter."); } };
  const read = async (query: Parameters<typeof source.read>[0]) => (await f.room.wait(() => source.read(query, noTools))).card!;
  const rows = async () => (await f.room.wait(() => app.needsYou())).structuredContent as unknown as { rows: Row[]; unread: unknown[]; omittedRows: number };
  const since = async () => ((await f.room.wait(() => app.since())).structuredContent as unknown as { rows: (Row & { changed: { seq: number; what: string }[]; earlier: number; name: string })[] }).rows;
  return { app, source, read, signed, rows, since };
}
const finalAsk = async (f: AskingRoom, id: number) => ((await f.ana.ok("items", { scope: f.issue, type: "ask", final: true }))["items"] as Item[]).find(item => item.id === id);
const local = (ref: unknown) => typeof ref === "number" ? ref : (ref as { seq: number }).seq;

test("@ana comes back on a second device and sees every item with its rule and the act that settles it; reading and marking leave each one open; the settling act closes it", async () => {
  const f = await askingRoom();
  try {
    const agent = await f.agentAsks();
    const teammate = await act(f.vic, f.issue, "ask", { fields: { question: "TEST may the import drop old rows?", body: "TEST a teammate's question." } });
    const asked = await act(f.vic, f.issue, "request-approval", { fields: { ask: teammate.seq, bodyAt: teammate, requested: f.anaRef } });
    await f.settle();

    // The other device. Its key signed nothing before it came back.
    const first = deviceOf(f, f.anaSecret), second = deviceOf(f, await f.enrolAnaDevice());
    const shown = await second.rows();
    expect(shown.unread, "EVERY ITEM: no lane is left unread").toEqual([]);
    expect(shown.omittedRows, "EVERY ITEM: no row is left out").toBe(0);
    expect(shown.rows.map(row => row.item).sort((a, b) => a - b), "EVERY ITEM: both requests that arrived are listed").toEqual([agent.request.seq, asked.seq].sort((a, b) => a - b));
    expect(shown.rows, "ANOTHER DEVICE: the second key sees the rows the first key sees").toEqual((await first.rows()).rows);
    for (const row of shown.rows) {
      expect(row.rule, "NAMES ITS RULE").toEqual({ definition: QUESTION_DIGESTS.issue, clause: "acts.request-approval;items.approval-request" });
      expect(row["settledBy"], "NAMES THE SETTLING ACT").toEqual(["approve"]);
      expect(issueQuestions.acts["approve"], "NAMES THE SETTLING ACT: the pinned definition holds that act").toBeDefined();
    }
    const ofAgent = shown.rows.find(row => row.item === agent.request.seq)!, ofTeammate = shown.rows.find(row => row.item === asked.seq)!;
    expect(ofAgent["waiting"], "WAITS ON THIS: the row names the agent blocked on the question").toEqual(["@una"]);
    expect(ofTeammate["waiting"], "WAITS ON THIS: no agent waits on the teammate's question").toBeUndefined();
    expect(ofTeammate["why"], "WHY YOURS: the row names who asked").toBe("@vic asked you by name.");

    // Reading an item leaves it open.
    const platform = f.room.platform(f.issue), head = (await platform.summary()).at, length = (await platform.entries()).length;
    const position = shown.rows.indexOf(ofAgent);
    const summary = await second.read({ screen: "needs-you", position, page: "summary" });
    expect([summary.title, summary.settles, summary.waitsOn], "THE CARD says what needs you, what settles it and who waits").toEqual([ofAgent["needs"], ["approve"], ["@una"]]);
    await second.read({ screen: "needs-you", position, page: "item" });
    await second.read({ screen: "decision", subject: questionSubject(f.issueRef, agent.ask.seq), position: 0, page: "item" });
    await f.room.wait(() => second.app.context({ question: { scope: f.issueRef, ask: agent.ask.seq } }));
    await f.settle();
    expect([(await platform.summary()).at, (await platform.entries()).length], "READING LEAVES IT OPEN: the lane has no new entry").toEqual([head, length]);
    expect(second.signed, "READING LEAVES IT OPEN: reading signed no act").toEqual([]);
    expect((await second.rows()).rows, "READING LEAVES IT OPEN: the rows are the same").toEqual(shown.rows);

    // Mark reviewed moves a place on this device and closes nothing.
    const updates = await second.read({ screen: "change", position: 0, page: "updates" });
    const mark = updates.actions.find(action => action.id === "mark-reviewed");
    expect(mark, "MARK: the updates card offers Mark reviewed").toBeDefined();
    expect((await f.room.wait(() => second.source.markReviewed!((mark as unknown as { capture: never }).capture, { view: "TEST", cut: 1, admit() {} }))).structuredContent, "MARK: the local mark holds").toEqual({ localStatus: "marked" });
    expect((await second.rows()).rows, "MARK CLOSES NOTHING: both items stay open").toEqual(shown.rows);
    expect([(await platform.summary()).at, second.signed], "MARK CLOSES NOTHING: the lane has no new entry and no act was signed").toEqual([head, []]);
    expect(await second.since(), "NEXT VISIT: nothing has changed yet").toEqual([]);

    // The next visit shows what changed since the mark, and the first device keeps its own place.
    const comment = await act(f.una, f.issue, "comment", { fields: { body: "TEST a note while @ana was away." } });
    await f.settle();
    const changed = await second.since();
    expect(changed.map(row => row.changed), "NEXT VISIT: the row lists the new entry, with who did it").toEqual([[{ seq: comment.seq, what: "comment by @una (agent of @ana)" }]]);
    expect(changed[0]!.earlier, "NEXT VISIT: no entry is left out").toBe(0);
    expect((await first.since()).some(row => row.scope.scope === f.issue && row["since"] === null), "A DEVICE'S OWN PLACE: the first device has marked nothing, so it shows the lane from the start").toBe(true);

    // The settling acts, by the real lane. While a request is open the lane refuses a decision and the list shows none.
    const asks = (await f.ana.ok("inspect", { scope: f.issue }))["items"] as Item[];
    const ask = asks.find(item => item.type === "ask" && item.id === agent.ask.seq)!, bodyAt = await factOf(f.ana, f.issue, local(ask.refs["bodyAt"]));
    const refused = await f.ana.ok("act", { target: f.issue, kind: "decide", on: ask.id, digest: (await f.ana.ok("actions", { scope: f.issue }))["digest"], fields: { bodyAt }, idempotencyKey: crypto.randomUUID() });
    expect(refused["answer"], "A DUE DECISION IS REAL: the lane refuses a decision while the request is open").toBe("refused");
    expect((await second.rows()).rows.some(row => row["category"] === "decision-due"), "A DUE DECISION IS REAL: the list shows none while the lane refuses").toBe(false);

    await act(f.ana, f.issue, "approve", { fields: { request: agent.request.seq, bodyAt, verdict: "approve" } });
    await f.settle();
    const approved = (await second.rows()).rows;
    expect(approved.some(row => row.item === agent.request.seq), "THE SETTLING ACT CLOSES IT: approve closes the request").toBe(false);
    const due = approved.find(row => row["category"] === "decision-due")!;
    expect([due?.item, due?.rule.clause, due?.["settledBy"], due?.["waiting"]], "NOTHING DROPS: the question that waits for a decision has its own row").toEqual([ask.id, "acts.decide", ["decide"], ["@una"]]);

    const teammateBody = await factOf(f.ana, f.issue, teammate.seq);
    await act(f.ana, f.issue, "approve", { fields: { request: asked.seq, bodyAt: teammateBody, verdict: "request-changes" } });
    await f.settle();
    const held = (await second.rows()).rows;
    expect(held.some(row => row.item === teammate.seq && row["category"] === "decision-due"), "A DUE DECISION IS REAL: a request for changes on the current text leaves no decision due").toBe(false);
    const stillRefused = await f.ana.ok("act", { target: f.issue, kind: "decide", on: teammate.seq, digest: (await f.ana.ok("actions", { scope: f.issue }))["digest"], fields: { bodyAt: teammateBody }, idempotencyKey: crypto.randomUUID() });
    expect(stillRefused["answer"], "A DUE DECISION IS REAL: the lane agrees").toBe("refused");

    await act(f.ana, f.issue, "decide", { on: ask.id, fields: { bodyAt } });
    await f.settle();
    expect((await second.rows()).rows, "THE SETTLING ACT CLOSES IT: decide closes the question and its row leaves").toEqual([]);
    expect((await finalAsk(f, ask.id))?.state, "THE SETTLING ACT CLOSES IT: the question is decided").toBe("decided");
  } finally { await f.finish(); }
}, 120_000);
