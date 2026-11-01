import { expect, test } from "vitest";
import { digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { secretSigner } from "@generalbusiness/dap-client";
import type { ScopeId } from "@generalbusiness/dap-contract";
import { QUESTION_DIGESTS } from "@generalbusiness/dap-lanes";
import { loadIssue, loadNeedsYou, openRoom, type Room } from "../../../apps/room/page/src/data.ts";
import { RepoInAi, type Row } from "../../../apps/views/src/repo-in-ai.ts";
import type { ReviewStore } from "../../../apps/views/src/review-store.ts";
import { act, askingRoom, type AskingRoom } from "./support/asking-room.ts";

// Real: Native M8 authority, the question lanes' judgments, SQLite, Worker HTTP, read sessions under a TEST secret, the Page's data functions and the adapter's reads.
// STAND-INS: the Git host, the scripted clock, the pause scheduler, and a review store in memory. `apps/room/page/test/needs-you-browser.mjs` runs the screen in a browser on a real Worker.
const BRIEF = { bytes: utf8("TEST Brief"), digest: digestBytes(utf8("TEST Brief")) };
const noMarks = { read: () => [], mark: async (_capture: unknown, admit: () => void) => { admit(); } } as unknown as ReviewStore;
const pageOf = async (f: AskingRoom, secret: Uint8Array): Promise<Room> => {
  const { service, repository } = f.ana.config;
  return f.room.wait(() => openRoom({ service, secret, fetch: f.room.fetch, now: f.room.now }, { directory: repository!.directory.scope, membership: repository!.membership }));
};
const openIssue = async (f: AskingRoom, title: string): Promise<ScopeId> => {
  const opening = await act(f.rita, "directory", "open-issue", { fields: { definition: QUESTION_DIGESTS.issue, title, conditions: ["TEST"] } });
  const scope = ((await f.rita.ok("wait", { scope: "directory", entry: opening.seq }))["created"] as { scope: ScopeId }[])[0]!.scope;
  f.room.know(scope);
  return scope;
};

test("@ana returns on a second device: one list holds her items of two issues, reading moves no head, and a question decided while she was away stays", async () => {
  const f = await askingRoom();
  try {
    const first = await f.agentAsks();
    const second = await openIssue(f, "TEST the export drops rows");
    const asked = await act(f.vic, second, "ask", { fields: { question: "TEST may the export drop old rows?", body: "TEST the old rows." } });
    const request = await act(f.vic, second, "request-approval", { fields: { ask: asked.seq, bodyAt: asked, requested: f.anaRef } });
    // A question @rita decides while @ana is away.
    const away = await act(f.vic, f.issue, "ask", { fields: { question: "TEST which header stays?", body: "TEST the header text." } });
    const toRita = await act(f.vic, f.issue, "request-approval", { fields: { ask: away.seq, bodyAt: away, requested: { membership: f.membership, member: "@rita" } } });
    await act(f.rita, f.issue, "approve", { fields: { request: toRita.seq, bodyAt: away, verdict: "approve" } });
    const decided = await act(f.rita, f.issue, "decide", { on: away.seq, fields: { bodyAt: away, comment: "TEST keep the first." } });
    await f.settle();

    const secret = await f.enrolAnaDevice(), room = await pageOf(f, secret), signer = secretSigner(secret);
    const app = new RepoInAi({ service: f.ana.config.service, config: async () => structuredClone(f.ana.config), fetch: f.room.fetch, now: f.room.now, reviewStore: noMarks, brief: BRIEF, signer });
    const lanes = [f.issue, second].map(scope => f.room.platform(scope));
    const heads = async () => Promise.all(lanes.map(async lane => [(await lane.summary()).at, (await lane.entries()).length]));
    const before = await heads();

    const page = await f.room.wait(() => loadNeedsYou(room));
    const rows = ((await f.room.wait(() => app.needsYou())).structuredContent as unknown as { rows: Row[] }).rows;
    expect(page.failed).toBeNull();
    expect(page.items.map(one => one.row), "THE SAME ROWS as needs_you").toEqual(rows);
    expect(page.items.map(one => one.item).sort((a, b) => a - b), "EVERY ITEM, IN BOTH ISSUES").toEqual([first.request.seq, request.seq].sort((a, b) => a - b));
    expect(new Set(page.items.map(one => one.scope)), "TWO LANES").toEqual(new Set([f.issue, second]));
    const row = rows.find(one => one.item === first.request.seq)!, shown = page.items.find(one => one.item === first.request.seq)!;
    expect([shown.needs, shown.why, shown.lines], "THE WORDS OF apps/views: what needs Ana, why, what settles it, who waits and the rule").toEqual([row["needs"], `Why it is yours: ${String(row["why"])}`, [`What settles it: ${String(row["settles"])}`, "Waiting on this: @una.", `Rule: ${row.rule.definition} ${row.rule.clause}.`]]);
    expect([page.omittedLanes, page.omittedRows, page.next, page.unread], "NOTHING LEFT OUT").toEqual([0, 0, null, []]);

    const line = `Decided question: TEST which header stays? (entry ${decided.seq})`;
    const listed = page.decided.find(one => one.ask === away.seq)!;
    expect([listed.line, listed.by, listed.comment, listed.scope, typeof listed.at], "DECIDED WHILE AWAY: in the list, with who, when and the comment").toEqual([line, "@rita", "TEST keep the first.", f.issue, "string"]);
    const issue = await f.room.wait(() => loadIssue(room, f.issue));
    expect(issue.questions.map(question => question.ask), "THE OPEN QUESTION stays on the issue").toEqual([first.ask.seq]);
    const onIssue = issue.decided.find(one => one.ask === away.seq)!;
    expect([onIssue.line, onIssue.by, onIssue.body], "DECIDED WHILE AWAY: on the issue's screen, with its text").toEqual([line, "@rita", "TEST the header text."]);
    await f.settle();
    expect(await heads(), "READING LEAVES IT OPEN: no lane has a new entry").toEqual(before);
    expect((await f.room.wait(() => loadNeedsYou(room))).items.length, "IT STAYS IN THE LIST after a read").toBe(2);
  } finally { await f.finish(); }
}, 120_000);
