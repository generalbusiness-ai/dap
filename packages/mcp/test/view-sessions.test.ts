import { expect, test } from "vitest";
import { TOOL_WAIT_MS } from "../src/views/waits.ts";
import { REPLY_SECONDS } from "@generalbusiness/dap-client";
import { readFileSync } from "node:fs";
import { VIEW_DIFF_POLLS, type CallResult } from "../src/service.ts";
import type { DispatchContext } from "../src/results.ts";
import { cardOpens } from "../src/views/opens.ts";
import { actSigner } from "../src/views/actor.ts";
import { ViewSessions } from "../src/views/session.ts";
import { viewTools } from "../src/views/tools.ts";
import type { Card, Display, LocalReviewCapture, Projection, ViewSource } from "../src/views/types.ts";
import { digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { fixedSigner } from "./fixtures.ts";
import { StandIn, SERVICE } from "./support/standin.ts";

const answer = (value: string): CallResult => ({ content: [{ type: "text", text: value }], structuredContent: { answer: value }, isError: false });

// Invariant: a full mounted-view cache refuses another write before dispatch, but can still check the original requests
// already admitted. This is the session/cache boundary; scope answers and custody below it are explicit test doubles.
test("a full view retains original-request checks without admitting another write", async () => {
  const source: ViewSource = { read: async (query, access) => {
    await access.call("inspect", { target: "fixture-scope" });
    return ({ status: "ready", position: query.position, count: 33, fallback: "Inspect the item.", card: {
    identity: { kind: "fixture", item: String(query.position), revision: "0", subject: { scope: "fixture-scope", item: query.position }, at: { on: 0 } },
    title: "Fixture item", summary: "A cache boundary fixture", actor: { kind: "person", name: "Fixture" }, reasons: [],
    projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "Inspect the item.",
    actions: [{ id: "apply", label: "Apply", purpose: "act", kind: "apply", args: { target: "fixture-scope", on: query.position, at: { on: 0 } } }],
  } }); } };
  const sent: Record<string, unknown>[] = [], checked: Record<string, unknown>[] = [];
  // Context identity witnesses private plumbing, not Hosted admission.
  const opened: DispatchContext = { prepare: async () => () => null }, reading: DispatchContext = { prepare: async () => () => null };
  const writing: DispatchContext = { prepare: async () => () => null }, checking: DispatchContext = { prepare: async () => () => null };
  const replaying: DispatchContext = { prepare: async () => () => null };
  const nested: (DispatchContext | undefined)[] = [], performed: (DispatchContext | undefined)[] = [], settledContexts: (DispatchContext | undefined)[] = [];
  const sessions = new ViewSessions(source, dispatchContext => ({ call: async () => { nested.push(dispatchContext); return answer("read"); } }), async (_kind, args, admit, dispatchContext) => {
    await admit(); performed.push(dispatchContext); sent.push(structuredClone(args)); return answer("unavailable");
  }, async (args, dispatchContext) => { settledContexts.push(dispatchContext); checked.push(structuredClone(args)); return answer("accepted"); });
  const tools = viewTools(sessions);
  await tools["view_needs_you"]!.run({ view: "bounded" }, opened);
  expect(nested.at(-1)).toBe(opened);
  let display = sessions.display("bounded");
  for (let position = 0; position < 32; position++) {
    const read = await tools["view_read"]!.run({ view: "bounded", cut: display.cut, page: "item", position }, reading);
    display = read.structuredContent["display"] as Display;
    expect(nested.at(-1)).toBe(reading);
    const cut = display.cut;
    const result = await tools["view_act"]!.run({ view: "bounded", cut, action: "apply" }, writing);
    display = result.structuredContent["display"] as Display;
    expect(performed.at(-1)).toBe(writing);
    const beforeReplay = performed.length;
    await tools["view_act"]!.run({ view: "bounded", cut, action: "apply" }, replaying);
    expect(performed).toHaveLength(beforeReplay);
    expect(display.card!.actions.map((action) => action.purpose)).toEqual(["check-original"]);
  }
  display = await sessions.read("bounded", display.cut, { page: "item", position: 32 });
  await expect(sessions.act("bounded", display.cut, "apply")).rejects.toMatchObject({ reason: "busy" });
  expect(sent).toHaveLength(32);
  display = await sessions.read("bounded", display.cut, { page: "item", position: 0 });
  const original = display.card!.actions[0]!;
  expect(original.purpose).toBe("check-original");
  const settled = await sessions.act("bounded", display.cut, original.id, checking);
  expect(settledContexts).toEqual([checking]);
  expect(settled.result.structuredContent["answer"]).toBe("accepted");
  expect(checked).toHaveLength(1);
  expect(checked[0]!["idempotencyKey"]).toBe(sent[0]!["idempotencyKey"]);
  expect(sent).toHaveLength(32);
  expect(JSON.stringify(settled.display)).not.toContain("prepare");

  // These two results have equal JSON. Only the exact privately marked object
  // came from a stopped delivery; arbitrary error fields do not mean unknown.
  for (const error of ["unauthorized", "unavailable"]) {
    const marked: CallResult = { content: [{ type: "text", text: "TEST local stop" }],
      structuredContent: { error, message: "TEST local stop", next: "TEST check the original" }, isError: true };
    const unmarked = structuredClone(marked), stopped = new WeakSet([marked]);
    expect(JSON.stringify(marked)).toBe(JSON.stringify(unmarked));
    let returned = marked, classifications = 0;
    const checkArgs: Record<string, unknown>[] = [];
    const declared = new ViewSessions({ ...source, declared: true }, () => ({ call: async () => answer("read") }),
      async () => answer("unavailable"), async args => { checkArgs.push(structuredClone(args)); return returned; }, () => null,
      { dispatchStopped: result => { classifications++; return stopped.has(result); } });
    await declared.open(`marked-${error}`, "needs-you");
    const detail = await declared.read(`marked-${error}`, declared.display(`marked-${error}`).cut, { page: "item" });
    const pending = await declared.act(`marked-${error}`, detail.cut, "apply");
    const check = pending.display.card!.actions[0]!;
    expect(check.purpose).toBe("check-original");
    const beforeMarked = classifications;
    const held = await declared.act(`marked-${error}`, pending.display.cut, check.id);
    expect(classifications).toBe(beforeMarked + 1);
    expect(held.result).toBe(marked);
    expect(held.display.receipt).toContain("outcome unknown; check the original request");
    expect(held.display.card!.actions.map(action => action.purpose)).toEqual(["check-original"]);
    returned = unmarked;
    const beforeUnmarked = classifications;
    const plain = await declared.act(`marked-${error}`, held.display.cut, held.display.card!.actions[0]!.id);
    expect(classifications).toBe(beforeUnmarked + 1);
    expect(plain.result).toBe(unmarked);
    expect(plain.display.receipt).not.toContain("outcome unknown");
    expect(plain.display.card!.actions).toEqual([]);
    expect(checkArgs[1]).toEqual(checkArgs[0]);
  }
});

function reviewedFixture() {
  const signer = fixedSigner(35), native = new StandIn(signer.key);
  const lane = native.add("lane", digestBytes(utf8("local-review-fixture")), []), head = { seq: 2, hash: digestBytes(utf8("displayed-head")) };
  const capture: LocalReviewCapture = { service: SERVICE, directory: native.directory, viewer: { membership: native.membership, member: "@viewer" }, key: signer.key,
    heads: [{ scope: lane, head }], ranges: [{ scope: lane.scope, from: 1, to: 2 }] };
  const projection: Projection = { status: "ready", position: 0, count: 1, fallback: "Review the displayed entries.", card: {
    identity: { kind: "fixture", item: "1", revision: "1", subject: { scope: lane.scope, item: 1 }, at: { on: 1 } },
    title: "Updates", summary: "Two displayed entries", reasons: [], projection: [{ scope: lane.scope, ...head }],
    reviewIntended: [...capture.ranges], unavailable: [], waitsOn: [], settles: [],
    entries: [{ scope: lane.scope, seq: 1, text: "First" }, { scope: lane.scope, seq: 2, text: "Second" }],
    actions: [{ id: "review", label: "Mark reviewed", purpose: "mark-reviewed", local: true, capture }], fallback: "Review the entries.",
  } };
  return { capture, projection };
}
const localAnswer = (capture: LocalReviewCapture): CallResult => ({ content: [{ type: "text", text: "Local review marked." }], structuredContent: { localStatus: "marked", heads: capture.heads }, isError: false });

// Invariant: only the new local variant uses the local callback; no native perform/settle or captured inputs cross that boundary.
// Native rows and callback storage are stand-ins here; the application owns real authenticated rereads and filesystem publication.
test("local Mark reviewed retains its exact cut without native custody and keeps legacy native behavior", async () => {
  const { capture, projection } = reviewedFixture();
  let performed = 0, settled = 0, marks = 0;
  const seen: unknown[] = [];
  const source: ViewSource = { initialPage: () => "updates", read: async () => structuredClone(projection), markReviewed: async (held, context) => {
    await context.admit(); marks++; seen.push({ capture: held, view: context.view, cut: context.cut }); return localAnswer(held);
  } };
  const access = { call: async () => { throw Error("No native tool read."); } };
  const sessions = new ViewSessions(source, () => access, async () => { performed++; return answer("accepted"); }, async () => { settled++; return answer("accepted"); });
  await sessions.open("local", "needs-you");
  const display = sessions.display("local");
  expect(display.card!.actions).toEqual([{ id: "review", label: "Mark reviewed", purpose: "mark-reviewed" }]);
  const first = await sessions.act("local", display.cut, "review"), duplicate = await sessions.act("local", display.cut, "review");
  expect(first.result.structuredContent).toEqual({ localStatus: "marked", heads: capture.heads });
  expect(duplicate.result).toEqual(first.result);
  expect(seen).toEqual([{ capture, view: "local", cut: display.cut }]);
  expect(first.display.receipt).toBe("Local review: marked. This is not a native journal receipt.");
  expect(first.result.structuredContent).not.toHaveProperty("answer");
  expect(first.result.structuredContent).not.toHaveProperty("fact");
  expect({ marks, performed, settled }).toEqual({ marks: 1, performed: 0, settled: 0 });

  const absent = new ViewSessions({ initialPage: () => "updates", read: source.read }, () => access, async () => { performed++; return answer("accepted"); }, async () => answer("accepted"));
  await absent.open("absent", "needs-you");
  await expect(absent.act("absent", 0, "review")).rejects.toMatchObject({ reason: "unavailable" });
  expect(performed).toBe(0);

  const legacy = structuredClone(projection);
  legacy.card!.actions = [{ id: "native-review", label: "Mark reviewed", purpose: "mark-reviewed", kind: "review", args: { target: capture.heads[0]!.scope.scope, at: { on: 1 } } }];
  const nativeCalls: { kind: string; args: Record<string, unknown> }[] = [];
  const native = new ViewSessions({ ...source, read: async () => legacy }, () => access, async (kind, args, admit) => { await admit(); nativeCalls.push({ kind, args }); return answer("accepted"); }, async () => answer("accepted"));
  await native.open("legacy", "needs-you");
  expect((await native.act("legacy", 0, "native-review")).result.structuredContent["answer"]).toBe("accepted");
  expect(nativeCalls).toHaveLength(1);
  expect(nativeCalls[0]).toMatchObject({ kind: "review", args: { at: { on: 1 }, idempotencyKey: expect.stringMatching(/^view-/) } });
  expect(marks).toBe(1);
});

// Invariant: a superseded cut cannot publish a local mark after awaited rereads.
test("a local callback must re-admit the active cut before writing", async () => {
  const { projection } = reviewedFixture();
  let release!: () => void, entered!: () => void, writes = 0, native = 0;
  const waiting = new Promise<void>(resolve => { release = resolve; }), started = new Promise<void>(resolve => { entered = resolve; });
  const sessions = new ViewSessions({ initialPage: () => "updates", read: async () => structuredClone(projection), markReviewed: async (capture, { admit }) => {
    entered(); await waiting; await admit(); writes++; return localAnswer(capture);
  } }, () => ({ call: async () => { throw Error("No native read."); } }), async () => { native++; return answer("accepted"); }, async () => { native++; return answer("accepted"); });
  await sessions.open("old", "needs-you");
  const dispatch = sessions.act("old", 0, "review");
  await started;
  await sessions.open("new", "needs-you");
  release();
  await expect(dispatch).rejects.toMatchObject({ reason: "superseded" });
  expect({ writes, native }).toEqual({ writes: 0, native: 0 });
});

// Invariant: local marks cover the exact presented range and cannot return fabricated native answers.
test("malformed captures and native-shaped callback answers cannot pass as local marks", async () => {
  const { projection } = reviewedFixture();
  let marks = 0, native = 0;
  const make = (read: ViewSource["read"], markReviewed: NonNullable<ViewSource["markReviewed"]>) => new ViewSessions({ initialPage: () => "updates", read, markReviewed },
    () => ({ call: async () => { throw Error("No native read."); } }), async () => { native++; return answer("accepted"); }, async () => { native++; return answer("accepted"); });
  const malformed = structuredClone(projection), action = malformed.card!.actions[0]!;
  if (!action.local) throw Error("Fixture needs the local variant.");
  action.capture = { ...action.capture, ranges: [{ ...action.capture.ranges[0]!, to: 1 }] };
  const invalid = make(async () => malformed, async capture => { marks++; return localAnswer(capture); });
  await invalid.open("invalid", "needs-you");
  expect(invalid.display("invalid").status).toBe("unavailable");
  const forged = make(async () => structuredClone(projection), async (_capture, { admit }) => { await admit(); return answer("accepted"); });
  await forged.open("forged", "needs-you");
  await expect(forged.act("forged", 0, "review")).rejects.toMatchObject({ reason: "unavailable" });
  expect({ marks, native }).toEqual({ marks: 0, native: 0 });
});

// Invariant: the generic card never presents an agent as ready without a
// controller. The projection is a stand-in, not membership authority.
test("an agent card needs its controller before it can offer a write", async () => {
  const performed: string[] = [];
  const source: ViewSource = { read: async query => ({ status: "ready", count: 1, position: 0, fallback: "Inspect the item.", card: {
    identity: { kind: "fixture", item: "q1", revision: "0", subject: { scope: "fixture-scope", item: 0 }, at: { on: 0 } },
    title: "Fixture question", summary: "A controlled agent", actor: { kind: "agent", name: "Builder", ...(query.subject === "controlled" ? { controller: "Rita" } : {}) },
    reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "Inspect the item.",
    actions: [{ id: "apply", label: "Apply", purpose: "act", kind: "apply", args: { target: "fixture-scope", on: 0, at: { on: 0 } } }],
  } }) };
  const sessions = new ViewSessions(source, () => ({ call: async () => { throw Error("No native read belongs to this projection fixture."); } }),
    async kind => { performed.push(kind); return answer("accepted"); }, async () => { throw Error("No original request exists."); });
  await sessions.open("controlled", "work", "controlled");
  const controlled = await sessions.read("controlled", sessions.display("controlled").cut, { page: "item" });
  expect(controlled.status).toBe("ready");
  expect(controlled.card!.actor).toEqual({ kind: "agent", name: "Builder", controller: "Rita" });
  expect(controlled.card!.actions.map(action => action.id)).toEqual(["apply"]);
  await sessions.open("unbound", "work", "unbound");
  const refused = sessions.display("unbound");
  expect(refused.status).toBe("unavailable");
  expect(refused.card).toBeUndefined();
  await expect(sessions.act("unbound", refused.cut, "apply")).rejects.toMatchObject({ reason: "shape" });
  expect(performed).toEqual([]);
});

// Invariant: each act of a card signs its own captured revisions. A revision the card did not display retires the card.
test("an action's own at signs, a card's at fills in for none, and an at the card did not display makes the card unavailable", async () => {
  const card = (actions: Record<string, unknown>[]): Projection => ({ status: "ready", position: 0, count: 1, fallback: "TEST", card: { identity: { item: "1", kind: "manifest", revision: "2", subject: { scope: "sc_a" }, at: { manifest: 2, proposal: 3, rules: 4 } }, title: "TEST", summary: "TEST", reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "TEST", actions: actions.map(action => ({ label: "TEST", purpose: "act", kind: "k", ...action })) as Card["actions"] } });
  const signed: unknown[] = [];
  const session = (projection: Projection) => new ViewSessions({ initialPage: () => "item", read: async () => structuredClone(projection) }, () => ({ call: async () => { throw Error("No native tool read."); } }), async (_kind, args, admit) => { await admit(); signed.push(args["at"]); return answer("accepted"); }, async () => answer("accepted"));
  const good = session(card([{ id: "own", args: { target: "sc_a", at: { manifest: 2, proposal: 3 } } }, { id: "none", args: { target: "sc_a" } }]));
  await good.open("v", "change");
  await good.act("v", 0, "own");
  await good.act("v", 0, "none");
  expect(signed).toEqual([{ manifest: 2, proposal: 3 }, { manifest: 2, proposal: 3, rules: 4 }]);
  for (const at of [{ manifest: 9 }, { other: 2 }]) {
    const bad = session(card([{ id: "own", args: { target: "sc_a", at } }]));
    await bad.open("v", "change");
    expect(bad.display("v").status).toBe("unavailable");
    expect(bad.display("v").card).toBeUndefined();
  }
});

// Invariant: reading a diff signs nothing on the read path. Only the card's View diff action reads it, once for one cut.
test("View diff goes through its port once per cut, keeps the card's two acts, and a failure stays on the item page", async () => {
  const projection = (): Projection => ({ status: "ready", position: 0, count: 1, fallback: "TEST", card: { identity: { item: "1", kind: "manifest", revision: "2", subject: { scope: "sc_a" }, at: { manifest: 2 } }, title: "TEST", summary: "TEST", body: "TEST body", reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "TEST", diffAvailable: true, diffRead: { target: "sc_d", base: "a", integration: "b" },
    actions: [{ id: "one", label: "TEST", purpose: "act", kind: "k", args: { target: "sc_a" } }, { id: "two", label: "TEST", purpose: "act", kind: "k", args: { target: "sc_a" } }] } });
  const reads: unknown[] = []; let fail = true;
  const sessions = new ViewSessions({ initialPage: () => "item", read: async () => projection() }, () => ({ call: async () => { throw Error("No native tool read."); } }), async () => answer("accepted"), async () => answer("accepted"), () => null, { readExact: async (read, admit) => { await admit(); reads.push(read); return fail ? { content: [], isError: true, structuredContent: { error: "diff", message: "TEST no diff." } } : { content: [], isError: false, structuredContent: { text: "TEST text\ntruncated: TEST\n", truncated: true } }; } });
  await sessions.open("v", "change");
  const item = sessions.display("v");
  expect(item.card!.actions.map(action => action.id)).toEqual(["one", "two"]);
  expect(item.card).toMatchObject({ diffSigned: true });
  expect(JSON.stringify(item)).not.toContain("diffRead");
  await expect(sessions.read("v", item.cut, { page: "diff" })).rejects.toMatchObject({ reason: "shape" });
  expect(reads).toEqual([]);
  const failed = await sessions.act("v", item.cut, "view-diff");
  expect([failed.display.query.page, failed.display.cut, failed.display.receipt]).toEqual(["item", item.cut, "Diff not shown: TEST no diff."]);
  fail = false;
  const shown = await sessions.act("v", item.cut, "view-diff");
  expect([shown.display.query.page, shown.display.card!.body, shown.display.card!.actions]).toEqual(["diff", "TEST text\ntruncated: TEST\n", []]);
  await expect(sessions.act("v", item.cut, "view-diff")).rejects.toMatchObject({ reason: "stale" });
  expect(reads).toHaveLength(2);
  const back = await sessions.read("v", shown.display.cut, { page: "item" });
  expect(back.card!.actions.map(action => action.id)).toEqual(["one", "two"]);
  const again = await sessions.read("v", back.cut, { page: "diff" });
  expect(again.card!.body).toBe("TEST text\ntruncated: TEST\n");
  expect(reads).toHaveLength(2);
});

// Invariant: a stopped exact read can run again through the same card, while a complete answer replays without another port call.
// The projections and bounded read answers are scripted; the production view session owns retention and dispatch.
test("a stopped interdiff runs again on the next press and its complete answer then replays", async () => {
  const from = { label: "Version 1", base: "a".repeat(40), integration: "b".repeat(40) };
  const to = { label: "Version 2", base: "a".repeat(40), integration: "c".repeat(40) };
  const projection: Projection = { status: "ready", position: 0, count: 1, fallback: "TEST", card: {
    identity: { item: "1", kind: "manifest", revision: "2", subject: { scope: "sc_a" }, at: { manifest: 2 } },
    title: "TEST", summary: "TEST", reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "TEST", actions: [],
    diffAvailable: true, diffRead: { target: "sc_d", ...to }, interdiffReads: [{ target: "sc_d", from, to }],
  } };
  const stopped = "TEST interdiff stopped at its time bound.\nNo changed path was reached.\n";
  const leftOut = "every changed path, because the read stopped before it reached one";
  const complete = "@@ TEST complete interdiff @@\n-before\n+after\n";
  const reads: unknown[] = [];
  const firstContext: DispatchContext = { prepare: async () => () => null }, nextContext: DispatchContext = { prepare: async () => () => null }, replayContext: DispatchContext = { prepare: async () => () => null };
  const readContexts: (DispatchContext | undefined)[] = [];
  const views = new ViewSessions({ initialPage: () => "item", read: async () => structuredClone(projection) }, () => ({ call: async () => { throw Error("No scope read in this stand-in."); } }), async () => answer("accepted"), async () => answer("accepted"), () => null, {
    readExact: async (read, admit, dispatchContext) => {
      await admit(); readContexts.push(dispatchContext); reads.push(read);
      return { content: [], isError: false, structuredContent: reads.length === 1
        ? { text: stopped, truncated: true, paths: [], leftOut, commits: [from, to].map(value => ({ label: value.label, id: value.integration })) }
        : { text: complete, truncated: false, paths: [{ path: "file.txt", shown: "file.txt", commit: to.integration }], commits: [from, to].map(value => ({ label: value.label, id: value.integration })) } };
    },
  });
  await views.open("v", "change");
  const first = await views.act("v", views.display("v").cut, "view-interdiff-0", firstContext);
  expect(first.display.card!.body).toBe(stopped);
  expect(first.display.card!.shownRead).toMatchObject({ truncated: true, leftOut, files: [] });
  expect(first.display.card!.readers).toContainEqual({ action: "view-interdiff-0", label: "Interdiff from Version 1", current: true });
  const again = await views.act("v", first.display.cut, "view-interdiff-0", nextContext);
  expect(reads).toEqual([{ kind: "interdiff", target: "sc_d", from, to }, { kind: "interdiff", target: "sc_d", from, to }]);
  expect(again.result.structuredContent).not.toHaveProperty("held");
  expect(again.display.card!.body).toBe(complete);
  expect(again.display.card!.shownRead).toMatchObject({ truncated: false, leftOut: null });
  const item = await views.read("v", again.display.cut, { page: "item" });
  const replay = await views.act("v", item.cut, "view-interdiff-0", replayContext);
  expect(replay.result.structuredContent).toMatchObject({ held: true, truncated: false });
  expect(replay.display.card!.body).toBe(complete);
  expect(reads).toHaveLength(2);
  expect(readContexts).toEqual([firstContext, nextContext]);
});

// Invariant: an answer that no longer fits is not reported as shown, and replay failure spends no new credential.
// The source grows only its summary without changing the exact read's identity; the read port is a stand-in.
test("a retained answer that no longer fits reports no new signature and can replay when it fits again", async () => {
  let summary = "TEST short summary", reads = 0;
  const text = "t".repeat(32 * 1024);
  const views = new ViewSessions({ initialPage: () => "item", read: async () => ({ status: "ready", position: 0, count: 1, fallback: "TEST", card: {
    identity: { item: "1", kind: "manifest", revision: "2", subject: { scope: "sc_a" }, at: { manifest: 2 } },
    title: "TEST", summary, reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "TEST", actions: [],
    diffAvailable: true, diffRead: { target: "sc_d", base: "a".repeat(40), integration: "b".repeat(40) },
  } }) }, () => ({ call: async () => { throw Error("No scope read in this stand-in."); } }), async () => answer("accepted"), async () => answer("accepted"), () => null, {
    readExact: async (_read, admit) => { await admit(); reads++; return { content: [], structuredContent: { text, truncated: false }, isError: false }; },
  });
  await views.open("v", "change");
  const first = await views.act("v", views.display("v").cut, "view-diff");
  expect(first.display.card!.body).toBe(text);
  summary = "s".repeat(40 * 1024);
  const item = await views.read("v", first.display.cut, { page: "item" });
  const refused = await views.act("v", item.cut, "view-diff");
  expect(refused.result.isError).toBe(true);
  expect(refused.result.structuredContent).not.toHaveProperty("held");
  expect(refused.display.receipt).toBe("Diff not shown: the card cannot hold the retained answer. No new request was signed.");
  expect([refused.display.query.page, refused.display.cut, reads]).toEqual(["item", item.cut, 1]);
  summary = "TEST short summary";
  const small = await views.read("v", refused.display.cut, { page: "item" });
  const replay = await views.act("v", small.cut, "view-diff");
  expect(replay.result.structuredContent).toMatchObject({ held: true, truncated: false });
  expect(replay.display.card!.body).toBe(text);
  expect(replay.display.receipt).toBeUndefined();
  expect(reads).toBe(1);
});

// Invariant: one view_act frame holds a read's text once, so an answer at the read's bound stays near that bound.
test("a view_act frame and a view_read frame hold a read's text once", async () => {
  const MARK = "TEST-LINE-OF-THE-READ", body = `${MARK}\n`.repeat(1800);
  const projection = (): Projection => ({ status: "ready", position: 0, count: 1, fallback: "TEST", card: { identity: { item: "1", kind: "manifest", revision: "2", subject: { scope: "sc_a" }, at: { manifest: 2 } }, title: "TEST", summary: "TEST", actor: { kind: "person", name: "TEST" }, reasons: [],
    projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "TEST", actions: [], diffAvailable: true, diffRead: { target: "sc_a", base: "a".repeat(40), integration: "b".repeat(40) } } });
  const sessions = new ViewSessions({ initialPage: () => "item", read: async () => projection() }, () => ({ call: async () => { throw Error("No native tool read."); } }), async () => answer("accepted"), async () => answer("accepted"), () => null,
    { readExact: async () => ({ content: [{ type: "text", text: JSON.stringify({ text: body }) }], structuredContent: { text: body, files: 1, truncated: false, commits: [{ label: "Base", id: "a".repeat(40) }] }, isError: false }) });
  await sessions.open("v", "change");
  const tools = viewTools(sessions), copies = (frame: unknown) => JSON.stringify(frame).split(MARK).length - 1;
  const acted = await tools["view_act"]!.run({ view: "v", cut: sessions.display("v").cut, action: "view-diff" });
  expect(copies(acted)).toBe(1800);
  expect(JSON.stringify(acted).length).toBeLessThan(44 * 1024);
  const said = acted.structuredContent as { result: { structuredContent: Record<string, unknown>; content: { text: string }[] }; display: Display };
  expect(said.display.card!.body).toBe(body);
  expect(said.result.structuredContent).toMatchObject({ files: 1, truncated: false, commits: [{ label: "Base", id: "a".repeat(40) }] });
  expect(said.result.content[0]!.text).toBe("Diff shown on the page.");
  expect((acted.content[0] as { text: string }).text).toMatch(/^The result is in structuredContent: \d+ bytes of JSON/);
  const read = await tools["view_read"]!.run({ view: "v" });
  expect(copies(read)).toBe(1800);
});

// Invariant: an exact read's action IDs are reserved only on a card that offers exact reads. Another card's act keeps its own ID.
test("a card with no exact read dispatches its own act whose ID resembles a read", async () => {
  const projection = (): Projection => ({ status: "ready", position: 0, count: 1, fallback: "TEST", card: { identity: { item: "1", kind: "manifest", revision: "2", subject: { scope: "sc_a" }, at: { manifest: 2 } }, title: "TEST", summary: "TEST", reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "TEST",
    actions: [{ id: "view-file-report", label: "TEST", purpose: "act", kind: "k", args: { target: "sc_a", at: { manifest: 2 } } }] } });
  const acts: unknown[] = [];
  const sessions = new ViewSessions({ initialPage: () => "item", read: async () => projection() }, () => ({ call: async () => { throw Error("No native tool read."); } }), async (args) => { acts.push(args); return answer("accepted"); }, async () => answer("accepted"), () => null, {});
  await sessions.open("v", "change");
  const said = await sessions.act("v", sessions.display("v").cut, "view-file-report").then(() => "dispatched", (error: { reason?: string }) => error.reason);
  expect([said, acts.length]).toEqual(["dispatched", 1]);
});

// Invariant: a file action names a read this view holds. With no read held, it is the ordinary refusal and signs nothing.
test("a file action before any read is refused as no such read", async () => {
  const projection = (): Projection => ({ status: "ready", position: 0, count: 1, fallback: "TEST", card: { identity: { item: "1", kind: "manifest", revision: "2", subject: { scope: "sc_a" }, at: { manifest: 2 } }, title: "TEST", summary: "TEST", actor: { kind: "person", name: "TEST" }, reasons: [],
    projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "TEST", actions: [], diffAvailable: true, diffRead: { target: "sc_a", base: "a".repeat(40), integration: "b".repeat(40) } } });
  let reads = 0;
  const sessions = new ViewSessions({ initialPage: () => "item", read: async () => projection() }, () => ({ call: async () => { throw Error("No native tool read."); } }), async () => answer("accepted"), async () => answer("accepted"), () => null, { readExact: async () => { reads++; return answer("read"); } });
  await sessions.open("v", "change");
  for (const action of ["view-file", "view-file-0"]) {
    const said = await sessions.act("v", sessions.display("v").cut, action).then(() => "dispatched", (error: { reason?: string }) => error.reason);
    expect([action, said]).toEqual([action, "shape"]);
  }
  expect(reads).toBe(0);
});

// Invariant: View diff signs nothing while custody holds an earlier act open, and an answer the card cannot hold says the credential is spent.
test("View diff: a retained card admits nothing while an original is open, and an oversized answer says spent", async () => {
  let open = false;
  const source: ViewSource = { checksOriginals: () => true, read: async (query) => ({ status: "ready", position: query.position, count: 1, fallback: "Inspect the item.", card: {
    identity: { kind: "fixture", item: "1", revision: "0", subject: { scope: "fixture-scope", item: 1 }, at: { on: 0 } },
    title: "Fixture item", summary: "s".repeat(40 * 1024), actor: { kind: "person", name: "Fixture" }, reasons: [],
    projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "Inspect the item.", actions: [],
    diffAvailable: true, diffRead: { target: "destination", base: "a".repeat(40), integration: "b".repeat(40) },
  } }) };
  let spends = 0;
  const views = new ViewSessions(source, () => ({ call: async () => answer("read") }), async () => answer("accepted"), async () => answer("accepted"), () => null, {
    unresolved: async () => open ? { idempotencyKey: "open" } : null,
    readExact: async (_read, admit) => { await admit(); spends++; return { content: [], structuredContent: { text: "t".repeat(32 * 1024) }, isError: false }; },
  });
  await views.open("v", "change", "subject");
  const { cut } = await views.read("v");
  open = true;
  const held = await views.act("v", cut, "view-diff").then(() => "signed", (error: { reason?: string }) => error.reason);
  expect([held, spends]).toEqual(["stale", 0]);
  open = false;
  const said = await views.act("v", cut, "view-diff").then(({ display }) => display.receipt, (error: unknown) => String(error));
  expect(spends).toBe(1);
  expect(said).toContain("The one-time credential is spent.");
  expect(views.display("v").query.page).not.toBe("diff");
});

// Invariant: a card never says that nothing was sent after a read has signed.
// The sources and the read port are stand-ins; session.ts is the production code.
test("a read that a newer card supersedes says that it signed", async () => {
  const source: ViewSource = { read: async (query) => ({ status: "ready", position: query.position, count: 1, fallback: "Inspect the item.", card: {
    identity: { kind: "fixture", item: "1", revision: "0", subject: { scope: "fixture-scope", item: 1 }, at: { on: 0 } },
    title: "Fixture item", summary: "s", actor: { kind: "person", name: "Fixture" }, reasons: [],
    projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "Inspect the item.", actions: [],
    diffAvailable: true, diffRead: { target: "destination", base: "a".repeat(40), integration: "b".repeat(40) },
  } }) };
  let answer_: CallResult = { content: [], structuredContent: { text: "the diff" }, isError: false };
  let signed = 0;
  const views: ViewSessions = new ViewSessions(source, () => ({ call: async () => answer("read") }), async () => answer("accepted"), async () => answer("accepted"), () => null, {
    readExact: async (_read, admit) => { await admit(); signed++; await views.open(`newer-${signed}`, "change", "subject"); return answer_; },
  });
  await views.open("v", "change", "subject");
  const { cut } = await views.read("v");
  const said = await views.act("v", cut, "view-diff").then(() => "no refusal", (error: { reason?: string; message: string }) => [error.reason, error.message]);
  expect(signed).toBe(1);
  expect(said).toEqual(["superseded", "A newer card replaced this one during the read. The read was signed, and this card does not show its answer."]);

  // A read that ended with no text may or may not have signed, so the words say "may".
  answer_ = { content: [], structuredContent: { answer: "refused" }, isError: true };
  await views.open("w", "change", "subject");
  const again = await views.act("w", (await views.read("w")).cut, "view-diff").then(() => "no refusal", (error: { reason?: string; message: string }) => [error.reason, error.message]);
  expect(again).toEqual(["superseded", "A newer card replaced this one during the read. The read may have been signed, and this card does not show its answer."]);
});

// Invariant: a person can read what an incomplete card holds, and that read offers no act. An unavailable placeholder has no detail to open.
// The source is a stand-in that returns one scripted card; session.ts and the browser's open rule are the production code.
test("an incomplete card opens its available entries and offers no act", async () => {
  expect(cardOpens("incomplete")).toBe(true);
  expect(cardOpens("ready")).toBe(true);
  expect(cardOpens("unavailable")).toBe(false);
  const source: ViewSource = { read: async (query) => ({ status: "incomplete", position: 0, count: 1, fallback: "Inspect the scope.", card: {
    identity: { kind: "updates", item: "q7", revision: "v2", subject: { scope: "fixture-scope", item: 0 }, at: { on: 0 } },
    title: "6 updates", summary: "One scope is unread.", actor: { kind: "person", name: "Fixture" }, reasons: [], detailPage: "updates",
    projection: [], reviewIntended: [{ scope: "fixture-scope", from: 1, to: 1 }, { scope: "change-9", from: 9, to: 9 }], unavailable: [{ scope: "change-9", from: 9, to: 9 }], waitsOn: [], settles: [], fallback: "Inspect the scope.",
    ...(query.page === "updates" ? { entries: [{ scope: "fixture-scope", seq: 1, text: "Entry 1" }] } : {}),
    actions: [{ id: "primary", label: "Mark reviewed", purpose: "mark-reviewed", kind: "publish", args: { target: "fixture-scope", on: 0, at: { on: 0 } } }],
  } }) };
  const sessions = new ViewSessions(source, () => ({ call: async () => { throw new Error("The fixture reads no scope."); } }), async () => answer("unavailable"), async () => answer("unavailable"));
  await sessions.open("partial", "needs-you");
  const detail = await sessions.read("partial", sessions.display("partial").cut, { page: "updates" });
  expect(detail.status).toBe("incomplete");
  expect(detail.card!.entries!.map(entry => entry.text)).toEqual(["Entry 1"]);
  expect(detail.card!.actions).toEqual([]);
});

// Invariant: acts reach a summary page only with the card's whole text, and a person's receipt line leaves the entry to the model's context.
test("a first card offers acts only with its whole text; a person reads the act's words and the model's context keeps the entry", async () => {
  const projection = (wholeText: boolean, body: string | undefined, page: string): Projection => ({ status: "ready", position: 0, count: 1, fallback: "TEST", card: { identity: { item: "1", kind: "manifest", revision: "2", subject: { scope: "sc_a" }, at: { manifest: 2 } }, kicker: "Change 2, version 3", title: "TEST", summary: "TEST", actor: { kind: "person", name: "TEST" }, reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "TEST", ...(body === undefined ? {} : { body }), ...(wholeText ? { wholeText: true as const } : {}),
    actions: page === "summary" && !wholeText ? [] : [{ id: "approve", label: "Approve", purpose: "approve", kind: "k", done: "Review recorded: approved.", args: { target: "sc_a", at: { manifest: 2 } } }, { id: "plain", label: "Plain", purpose: "act", kind: "k", args: { target: "sc_a", at: { manifest: 2 } } }] } });
  const sessionOf = (wholeText: boolean, body: string | undefined) => new ViewSessions({ read: async query => projection(wholeText, body, query.page) }, () => ({ call: async () => { throw Error("No native tool read."); } }), async () => ({ content: [{ type: "text", text: "accepted" }], structuredContent: { answer: "accepted", fact: { seq: 39 } }, isError: false }), async () => { throw Error("No settlement here."); });

  const whole = sessionOf(true, "TEST text");
  await whole.open("v", "decision");
  const first = whole.display("v");
  expect(first.card!.actions.map(action => action.id), "THE WHOLE TEXT: the first card offers the acts").toEqual(["approve", "plain"]);
  const done = await whole.act("v", first.cut, "approve");
  expect(done.display.receipt, "A PERSON reads the act's words").toBe("Review recorded: approved.");
  expect(done.display.context.receipt, "THE MODEL'S CONTEXT keeps the entry").toBe("Review recorded: approved. Entry 39.");

  const noBody = sessionOf(true, undefined);
  await noBody.open("v", "decision");
  expect(noBody.display("v").status, "A CARD THAT CLAIMS THE WHOLE TEXT must hold a text").toBe("unavailable");

  const plain = sessionOf(true, "TEST text");
  await plain.open("v", "decision");
  const pressed = await plain.act("v", plain.display("v").cut, "plain");
  expect(pressed.display.receipt, "AN ACT WITH NO WORDS of its own takes the card's kicker").toBe("Change 2, version 3: accepted (entry 39).");
});

// Invariant: an act from a first card whose outcome is unknown leaves that item offering the check of the original, even after a person pages away and back. A second press could not tell a person what the first one did.
test("a first card's press with an unknown outcome offers only the check of the original, and paging away and back keeps it so", async () => {
  const projection = (position: number): Projection => ({ status: "ready", position, count: 2, fallback: "TEST", card: { identity: { item: String(position + 1), kind: "ask", revision: "2", subject: { scope: "sc_a", item: position + 1 }, at: { on: 2 } }, kicker: `Question ${position + 1}`, title: "TEST", summary: "TEST", actor: { kind: "person", name: "TEST" }, reasons: [], projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "TEST", body: "TEST text", wholeText: true,
    actions: [{ id: "approve", label: "Approve", purpose: "approve", kind: "k", done: "Review recorded: approved.", args: { target: "sc_a", at: { on: 2 } } }] } });
  const sessions = new ViewSessions({ read: async query => projection(query.position) }, () => ({ call: async () => { throw Error("No native tool read."); } }), async () => ({ content: [{ type: "text", text: "unknown" }], structuredContent: { answer: "unknown" }, isError: false }), async () => { throw Error("No settlement here."); });
  await sessions.open("v", "decision");
  const pressed = await sessions.act("v", sessions.display("v").cut, "approve");
  expect(pressed.display.card!.actions.map(action => action.purpose), "UNKNOWN: the card offers the check").toEqual(["check-original"]);
  expect(pressed.display.receipt, "UNKNOWN: the receipt does not say it was recorded").toContain("outcome unknown");
  const away = await sessions.read("v", pressed.display.cut, { position: 1 });
  expect(away.card!.actions.map(action => action.purpose), "ANOTHER ITEM keeps its own act").toEqual(["approve"]);
  const back = await sessions.read("v", away.cut, { position: 0 });
  expect(back.card!.actions.map(action => action.purpose), "BACK ON THE ITEM: the check, and no second Approve").toEqual(["check-original"]);
});

// Invariant: the card's wait covers one stalled request at each stage of the slowest press. The session, the act and the read of the mint each wait REPLY_SECONDS.
test("a press's wait outlasts one stalled request at each stage of a signed read", () => {
  // This package's tests do not import the Git package, so the test reads the bound from its source.
  const gitRead = /const DIFF_READ_MS = ([\d_]+);/.exec(readFileSync(new URL("../../git/src/diff.ts", import.meta.url), "utf8"))!;
  expect(TOOL_WAIT_MS).toBeGreaterThanOrEqual(3 * REPLY_SECONDS * 1000 + VIEW_DIFF_POLLS * 1000 + Number(gitRead[1]!.replaceAll("_", "")));
});


// Invariant: a key or agent controller absent from this exact membership stays unknown, rather than borrowing an identity from another room or a removed person.
test("signer display keeps an unverified key or controller unknown (membership rows are stand-ins)", () => {
  const key = fixedSigner(89).key, peer = new StandIn(key), ref = { membership: peer.membership, member: "@una" as const };
  const originals = peer.scopes.get(peer.membership.scope)!.items;
  const controller = { membership: peer.membership, member: "@rita" as const };
  const agent = { ...originals.find(item => item.type === "member")!, values: { kind: "agent", handle: "@una" }, parties: { member: ref, controller } };
  const person = { ...agent, id: 3, values: { kind: "person", handle: "@rita" }, parties: { member: controller, controller: null } };
  const items = [...originals.filter(item => item.type !== "member"), agent, person];
  expect(actSigner(items, peer.membership, key).actor).toEqual({ kind: "agent", name: "@una", controller: "@rita" });
  person.state = "removed";
  expect(actSigner(items, peer.membership, key), "A REMOVED CONTROLLER is not the active person this display claims").toEqual({ key, actor: null });
  person.state = "active";
  const elsewhere = { ...peer.membership, scope: "sc_elsewhere" as const };
  expect(actSigner(items, elsewhere, key), "ANOTHER MEMBERSHIP cannot supply the key's display").toEqual({ key, actor: null });
  expect(actSigner(items.map(item => item.type === "key" ? { ...item, state: "revoked" } : item), peer.membership, key), "A REVOKED KEY has no current holder to invent").toEqual({ key, actor: null });
});
