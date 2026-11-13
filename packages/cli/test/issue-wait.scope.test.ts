import { expect, test } from "vitest";
import type { FactRef, Item } from "@generalbusiness/dap-contract";
import type { Fetch } from "@generalbusiness/dap-client";
import { act, askingRoom, factOf, type AskingRoom } from "../../mcp/test/support/asking-room.ts";
import { ISSUE_WAIT_BOUND_EXIT, command, issueWait, memoryStore, type Config, type Context, type Outcome } from "../src/index.ts";

// Real: `dap issue wait` from the command line's parser down, the client's observation and head stream, the Worker's stream route, Native M8 authority, the lane's judgments and read sessions under a TEST secret.
// STAND-INS: the Git host, the scripted clock, the pause scheduler. On the stream request, the fixture's route replies with no `url` and its runtime takes no `redirect: "error"`, so this fetch drops the one and sets the other, as Node's does.
const STREAM = /\/stream$/;
const tick = () => new Promise(resolve => setTimeout(resolve, 150));

/** @una's command line in a new process: the room's public configuration and the key, and no memory of the conversation. */
async function agentLine(f: AskingRoom, secret = f.unaSecret, handle = "@una") {
  const store = memoryStore(), requests: string[] = [];
  const { inbox: _inbox, ...repository } = f.rita.config.repository!;
  await store.keep("agent", secret);
  await store.save({ v: 2, service: f.rita.config.service, key: "agent", repository, handle } as Config);
  const fetch: Fetch = async (url, init) => {
    requests.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`);
    if (!STREAM.test(new URL(url).pathname)) return f.room.fetch(url, init);
    const { redirect: _redirect, ...rest } = init as RequestInit;
    const reply = await f.room.fetch(url, rest as never);
    Object.defineProperty(reply, "url", { value: url });
    return reply;
  };
  const ctx: Context = { store, fetch, now: f.room.now };
  return { ctx, requests, opened: () => requests.filter(request => STREAM.test(request)).length, reads: () => requests.filter(request => !STREAM.test(request) && !request.endsWith("/sessions")).length, wrote: () => requests.filter(request => request.startsWith("POST ") && !request.endsWith("/sessions")) };
}
/** A wait in progress: whether it ended, and its outcome. */
function waiting(run: Promise<Outcome>) {
  let ended: Outcome | null = null;
  void run.then(outcome => { ended = outcome; });
  return { ended: () => ended, outcome: run };
}
const until = async (holds: () => boolean, what: string) => { for (let n = 0; n < 200 && !holds(); n++) await new Promise(resolve => setTimeout(resolve, 25)); expect(holds(), what).toBe(true); };
const bodyOf = async (f: AskingRoom, ask: number): Promise<FactRef> => { const items = (await f.ana.ok("inspect", { scope: f.issue }))["items"] as Item[]; const row = items.find(item => item.type === "ask" && item.id === ask)!; return factOf(f.ana, f.issue, typeof row.refs["bodyAt"] === "number" ? row.refs["bodyAt"] : (row.refs["bodyAt"] as FactRef).seq); };
const entries = async (f: AskingRoom) => (await f.room.platform(f.issue).entries()).length;

test("an agent that waits on @ana stays stopped through a comment and an approval, reads nothing while nothing moves, and wakes on the decision and resumes from the record; the wait signs no act", async () => {
  const f = await askingRoom();
  try {
    const asked = await f.agentAsks(), line = await agentLine(f);
    await f.settle();
    const wait = waiting(command(line.ctx, ["issue", "wait", f.issue, String(asked.ask.seq)]));
    await until(() => line.opened() === 1 && line.reads() > 0, "THE FEED: the wait opens the lane's stream");

    // Nothing moves. The feed costs no reads.
    await tick(); const quiet = line.reads(); await tick(); await tick();
    expect(wait.ended(), "STOPPED: the question is open, so the wait goes on").toBeNull();
    expect(line.reads(), "NO POLLING: no read while nothing moves").toBe(quiet);
    expect(line.opened(), "NO POLLING: the stream stays open").toBe(1);

    // A comment moves the head. The wait reads once and goes on.
    await act(f.rita, f.issue, "comment", { fields: { body: "TEST an unrelated note." } });
    await f.settle();
    await until(() => line.reads() > quiet, "THE FEED: a new head makes the wait read the record");
    await tick();
    expect(wait.ended(), "NOT A WAKE: an unrelated comment wakes nothing").toBeNull();

    // An approval is not a decision.
    const bodyAt = await bodyOf(f, asked.ask.seq), beforeApprove = line.reads();
    await act(f.ana, f.issue, "approve", { fields: { request: asked.request.seq, bodyAt, verdict: "approve" } });
    await f.settle();
    await until(() => line.reads() > beforeApprove, "THE FEED: the approval moves the head");
    await tick();
    expect(wait.ended(), "NOT A WAKE: an approval is not a decision").toBeNull();

    const decision = await act(f.ana, f.issue, "decide", { on: asked.ask.seq, fields: { bodyAt } });
    await f.settle();
    await until(() => wait.ended() !== null, "THE WAKE: the decision ends the wait");
    const outcome = await wait.outcome;
    expect(outcome.code, "THE WAKE: a wake exits 0").toBe(0);
    expect(outcome.lines.join("\n"), "THE WAKE: the line names the question and the decision to read").toContain(`Question ${asked.ask.seq} is decided`);
    expect(outcome.lines.join("\n"), "THE WAKE: the line names the decision entry").toContain(`dap show ${f.issue}:${decision.seq}`);
    expect(line.wrote(), "SIGNS NOTHING: the wait posted no act").toEqual([]);

    // A later start finds the decision at once, from the record alone: the case of a wake missed while the agent was down.
    const fresh = await agentLine(f);
    const started = waiting(command(fresh.ctx, ["issue", "wait", f.issue, String(asked.ask.seq)]));
    await until(() => started.ended() !== null, "A MISSED WAKE: a later start wakes at once");
    const late = await started.outcome;
    expect([late.code, fresh.opened()], "A MISSED WAKE: it exits 0 and opens no stream").toEqual([0, 0]);
    expect(late.lines.join("\n"), "A MISSED WAKE: the same line").toContain(`dap show ${f.issue}:${decision.seq}`);

    // Resume from the record, under the same key.
    await act(f.una, f.issue, "release-block", { on: asked.block.seq, fields: { commitment: asked.commitment, answer: await factOf(f.una, f.issue, decision.seq) } });
    const blocks = (await f.una.ok("items", { scope: f.issue, type: "block", final: true }))["items"] as Item[];
    expect(blocks.find(item => item.id === asked.block.seq)?.state, "RESUMES: the agent's block is released on the decision").toBe("released");
  } finally { await f.finish(); }
}, 120_000);

test("a request for changes wakes the waiting agent, since the question then has no decision to wait for; a withdrawal wakes it too", async () => {
  const f = await askingRoom();
  try {
    const asked = await f.agentAsks(), line = await agentLine(f);
    await f.settle();
    const wait = waiting(command(line.ctx, ["issue", "wait", String(1), String(asked.ask.seq)]));
    await until(() => line.opened() === 1, "THE FEED: the wait opens the lane's stream");
    const changes = await act(f.ana, f.issue, "approve", { fields: { request: asked.request.seq, bodyAt: await bodyOf(f, asked.ask.seq), verdict: "request-changes" } });
    await f.settle();
    await until(() => wait.ended() !== null, "THE WAKE: the request for changes ends the wait");
    expect((await wait.outcome).code).toBe(0);
    expect((await wait.outcome).lines.join("\n"), "THE WAKE: the line names who asked for changes and where").toContain(`@ana requested changes on question ${asked.ask.seq}`);
    expect((await wait.outcome).lines.join("\n")).toContain(`dap show ${f.issue}:${changes.seq}`);

    // The agent revises the question. A request for changes on the old text no longer ends a wait on the new text.
    await act(f.una, f.issue, "revise-ask", { on: asked.ask.seq, fields: { bodyAt: await bodyOf(f, asked.ask.seq), body: "TEST the revised body." } });
    const revised = await agentLine(f);
    let reach!: () => void;
    const held = waiting(issueWait(revised.ctx, f.issue, String(asked.ask.seq), { bound: new Promise<void>(resolve => { reach = resolve; }) }));
    await until(() => revised.opened() === 1, "THE FEED: the wait on the revised question holds the stream");
    await tick();
    expect(held.ended(), "OLD TEXT: a request for changes on the old text wakes nothing").toBeNull();
    reach(); await held.outcome;

    const second = await act(f.una, f.issue, "ask", { fields: { question: "TEST a second question", body: "TEST a second body." } });
    const again = await agentLine(f), withdrawal = waiting(command(again.ctx, ["issue", "wait", f.issue, String(second.seq)]));
    await until(() => again.opened() === 1, "THE FEED: the wait opens the lane's stream");
    await act(f.una, f.issue, "withdraw-ask", { on: second.seq, fields: {} });
    await f.settle();
    await until(() => withdrawal.ended() !== null, "THE WAKE: a withdrawal ends the wait");
    expect((await withdrawal.outcome).lines.join("\n"), "THE WAKE: the line says the question was withdrawn").toContain(`Question ${second.seq} was withdrawn`);
  } finally { await f.finish(); }
}, 120_000);

test("the wait stops at its bound with its own exit code and no act; a wrong question, a bad bound and a key outside the room each stop with words and no wake", async () => {
  const f = await askingRoom();
  try {
    const asked = await f.agentAsks(), line = await agentLine(f);
    await f.settle();
    let reach!: () => void;
    const bound = new Promise<void>(resolve => { reach = resolve; });
    const wait = waiting(issueWait(line.ctx, f.issue, String(asked.ask.seq), { hours: 72, bound }));
    await until(() => line.opened() === 1, "THE FEED: the wait opens the lane's stream");
    const length = await entries(f);
    reach();
    await until(() => wait.ended() !== null, "THE BOUND: reaching it ends the wait");
    const stopped = await wait.outcome;
    expect(stopped.code, "THE BOUND: its own exit code").toBe(ISSUE_WAIT_BOUND_EXIT);
    expect(stopped.lines.join("\n"), "THE BOUND: the words say the question still waits and what to do").toContain(`Question ${asked.ask.seq} still waits after 72 hours`);
    expect([await entries(f), line.wrote()], "THE BOUND: no act").toEqual([length, []]);

    expect((await command(line.ctx, ["issue", "wait", f.issue, "99999"])).code, "NO SUCH QUESTION: the command stops").toBe(1);
    expect((await command(line.ctx, ["issue", "wait", f.issue, String(asked.ask.seq), "--hours", "0"])).code, "BAD BOUND: the command stops").toBe(2);
    expect((await command(line.ctx, ["issue", "wait", f.issue, String(asked.ask.seq), "--hours", "100000"])).code, "BAD BOUND: a timer that long would fire at once").toBe(2);
    const outsider = await agentLine(f, crypto.getRandomValues(new Uint8Array(32)), "@nobody");
    const refused = await command(outsider.ctx, ["issue", "wait", f.issue, String(asked.ask.seq)]);
    expect(refused.code, "WHO MAY READ: a key outside the room gets no wake").toBe(1);
    expect(outsider.opened(), "WHO MAY READ: a key outside the room opens no stream").toBe(0);
  } finally { await f.finish(); }
}, 120_000);
