import { expect, test } from "vitest";
import { digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import type { FieldValue } from "@generalbusiness/dap-contract";
import { secretSigner } from "@generalbusiness/dap-client";
import { act as pageAct, actsOn, fieldValue, loadIssue, openRoom, type QuestionAnswer, type Room } from "../../../apps/room/page/src/data.ts";
import { RepoInAi, type Row } from "../../../apps/views/src/repo-in-ai.ts";
import type { ReviewStore } from "../../../apps/views/src/review-store.ts";
import { act, askingRoom, type AskingRoom } from "./support/asking-room.ts";

// Real: Native M8 authority, the question lane's judgments, SQLite, Worker HTTP, read sessions under a TEST secret, the Page's data functions and the adapter's reads.
// STAND-INS: the Git host, the scripted clock, the pause scheduler, and a review store in memory. `apps/room/page/test/issue-questions-browser.mjs` runs the screen in a browser on a real Worker.
const BRIEF = { bytes: utf8("TEST Brief"), digest: digestBytes(utf8("TEST Brief")) };
const noMarks = { read: () => [], mark: async (_capture: unknown, admit: () => void) => { admit(); } } as unknown as ReviewStore;

const pageOf = async (f: AskingRoom, secret: Uint8Array): Promise<Room> => {
  const { service, repository } = f.ana.config;
  return f.room.wait(() => openRoom({ service, secret, fetch: f.room.fetch, now: f.room.now }, { directory: repository!.directory.scope, membership: repository!.membership }));
};
/** The same conversion as the Page's `send`: each value goes through the type that the offered act declares. */
const press = async (f: AskingRoom, room: Room, answer: QuestionAnswer) => {
  const offered = (await f.room.wait(() => actsOn(room, f.issue))).acts.find(act => act.kind === answer.kind)!;
  const fields: Record<string, FieldValue> = Object.fromEntries(Object.entries(answer.typed).map(([name, text]) => [name, fieldValue(room, offered.fields.find(field => field.name === name)!.type, text)]));
  return f.room.wait(() => pageAct(room, f.issue, answer.kind, { on: answer.on === "" ? null : Number(answer.on), fields }));
};

test("@ana opens the issue on a second device: each question reads in the words of apps/views, reading leaves it open, and the filled answers land", async () => {
  const f = await askingRoom();
  try {
    const agent = await f.agentAsks();
    const teammate = await act(f.vic, f.issue, "ask", { fields: { question: "TEST may the import drop old rows?", body: "TEST the old rows." } });
    const elsewhere = await act(f.vic, f.issue, "request-approval", { fields: { ask: teammate.seq, bodyAt: teammate, requested: f.unaRef } });
    await f.settle();

    const secret = await f.enrolAnaDevice(), room = await pageOf(f, secret), signer = secretSigner(secret);
    const app = new RepoInAi({ service: f.ana.config.service, config: async () => structuredClone(f.ana.config), fetch: f.room.fetch, now: f.room.now, reviewStore: noMarks, brief: BRIEF, signer });
    const rows = async () => ((await f.room.wait(() => app.needsYou())).structuredContent as unknown as { rows: Row[] }).rows;
    const platform = f.room.platform(f.issue), before = (await platform.summary()).at, length = (await platform.entries()).length;

    const issue = await f.room.wait(() => loadIssue(room, f.issue));
    expect(issue.questions.map(question => question.ask), "EACH OPEN QUESTION: both are listed").toEqual([agent.ask.seq, teammate.seq]);
    const [asked, other] = issue.questions as [typeof issue.questions[0], typeof issue.questions[0]];
    const row = (await rows()).find(one => one.item === agent.request.seq)!;
    expect(asked.rows, "THE WORDS OF apps/views: what needs Ana, why, what settles it, who waits and the rule").toEqual([{ item: agent.request.seq, needs: row["needs"], why: `Why it is yours: ${String(row["why"])}`, exact: `Definition ${row.rule.definition}, clause ${row.rule.clause}.`,
      lines: [`What settles it: ${String(row["settles"])}`, "Waiting on this: @una.", "Rule: this lane's rule for an approval request."] }]);
    expect(asked.body, "THE TEXT: the question's body").toBeTruthy();
    expect(asked.answers.map(answer => answer.label), "THE ANSWERS: the labels of the card").toEqual(["Approve", "Request changes"]);
    expect(other.rows, "ANOTHER MEMBER'S REQUEST: nothing here is Ana's").toEqual([]);
    expect(other.others, "ANOTHER MEMBER'S REQUEST: it names who was asked").toEqual(["@vic asked @una to approve this question."]);
    expect(other.answers, "ANOTHER MEMBER'S REQUEST: no answer").toEqual([]);
    expect(elsewhere.seq).toBeGreaterThan(teammate.seq);
    await f.settle();
    expect([(await platform.summary()).at, (await platform.entries()).length], "READING LEAVES IT OPEN: the lane has no new entry").toEqual([before, length]);

    const approved = await press(f, room, asked.answers[0]!);
    expect(approved.answer.answer, "APPROVE LANDS with the filled values").toBe("accepted");
    await f.settle();

    const due = await f.room.wait(() => loadIssue(room, f.issue));
    const dueRow = (await rows()).find(one => one.item === agent.ask.seq)!;
    expect(due.questions[0]!.rows.map(one => one.needs), "THE NEXT ROW: the question is due, in the same words").toEqual([dueRow["needs"]]);
    expect(due.questions[0]!.answers.map(answer => answer.label), "THE NEXT ANSWER").toEqual(["Decide"]);
    const decided = await press(f, room, due.questions[0]!.answers[0]!);
    expect(decided.answer.answer, "DECIDE LANDS with the filled values").toBe("accepted");
    await f.settle();

    const after = await f.room.wait(() => loadIssue(room, f.issue));
    expect(after.questions.map(question => question.ask), "A DECIDED QUESTION leaves the list").toEqual([teammate.seq]);
  } finally { await f.finish(); }
}, 120_000);

test("a question that changed after the request offers no answer, and the row says so", async () => {
  const f = await askingRoom();
  try {
    const agent = await f.agentAsks();
    await act(f.una, f.issue, "revise-ask", { on: agent.ask.seq, fields: { bodyAt: agent.ask, body: "TEST a later text." } });
    await f.settle();
    const room = await pageOf(f, await f.enrolAnaDevice());
    const issue = await f.room.wait(() => loadIssue(room, f.issue));
    expect(issue.questions[0]!.rows[0]!.needs, "THE WORDS OF apps/views").toMatch(/changed after @una asked you/);
    expect(issue.questions[0]!.answers, "NO ANSWER on a request for older text").toEqual([]);
  } finally { await f.finish(); }
}, 120_000);
