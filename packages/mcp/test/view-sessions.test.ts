import { expect, test } from "vitest";
import type { CallResult } from "../src/service.ts";
import { ViewSessions } from "../src/views/session.ts";
import type { Card, LocalReviewCapture, Projection, ViewSource } from "../src/views/types.ts";
import { digestBytes, utf8 } from "@generalbusiness/dap-bytes";
import { fixedSigner } from "./fixtures.ts";
import { StandIn, SERVICE } from "./support/standin.ts";

const answer = (value: string): CallResult => ({ content: [{ type: "text", text: value }], structuredContent: { answer: value }, isError: false });

// Invariant: a full mounted-view cache refuses another write before dispatch, but can still check the original requests
// already admitted. This is the session/cache boundary; scope answers and custody below it are explicit test doubles.
test("a full view retains original-request checks without admitting another write", async () => {
  const source: ViewSource = { read: async (query) => ({ status: "ready", position: query.position, count: 33, fallback: "Inspect the item.", card: {
    identity: { kind: "fixture", item: String(query.position), revision: "0", subject: { scope: "fixture-scope", item: query.position }, at: { on: 0 } },
    title: "Fixture item", summary: "A cache boundary fixture", actor: { kind: "person", name: "Fixture" }, reasons: [],
    projection: [], reviewIntended: [], unavailable: [], waitsOn: [], settles: [], fallback: "Inspect the item.",
    actions: [{ id: "apply", label: "Apply", purpose: "act", kind: "apply", args: { target: "fixture-scope", on: query.position, at: { on: 0 } } }],
  } }) };
  const sent: Record<string, unknown>[] = [], checked: Record<string, unknown>[] = [];
  const sessions = new ViewSessions(source, { call: async () => { throw new Error("The fixture reads no scope."); } }, async (_kind, args, admit) => {
    await admit(); sent.push(structuredClone(args)); return answer("unavailable");
  }, async (args) => { checked.push(structuredClone(args)); return answer("accepted"); });
  await sessions.open("bounded", "needs-you");
  let display = sessions.display("bounded");
  for (let position = 0; position < 32; position++) {
    display = await sessions.read("bounded", display.cut, { page: "item", position });
    const result = await sessions.act("bounded", display.cut, "apply");
    display = result.display;
    expect(display.card!.actions.map((action) => action.purpose)).toEqual(["check-original"]);
  }
  display = await sessions.read("bounded", display.cut, { page: "item", position: 32 });
  await expect(sessions.act("bounded", display.cut, "apply")).rejects.toMatchObject({ reason: "busy" });
  expect(sent).toHaveLength(32);
  display = await sessions.read("bounded", display.cut, { page: "item", position: 0 });
  const original = display.card!.actions[0]!;
  expect(original.purpose).toBe("check-original");
  const settled = await sessions.act("bounded", display.cut, original.id);
  expect(settled.result.structuredContent["answer"]).toBe("accepted");
  expect(checked).toHaveLength(1);
  expect(checked[0]!["idempotencyKey"]).toBe(sent[0]!["idempotencyKey"]);
  expect(sent).toHaveLength(32);
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
  const sessions = new ViewSessions(source, access, async () => { performed++; return answer("accepted"); }, async () => { settled++; return answer("accepted"); });
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

  const absent = new ViewSessions({ initialPage: () => "updates", read: source.read }, access, async () => { performed++; return answer("accepted"); }, async () => answer("accepted"));
  await absent.open("absent", "needs-you");
  await expect(absent.act("absent", 0, "review")).rejects.toMatchObject({ reason: "unavailable" });
  expect(performed).toBe(0);

  const legacy = structuredClone(projection);
  legacy.card!.actions = [{ id: "native-review", label: "Mark reviewed", purpose: "mark-reviewed", kind: "review", args: { target: capture.heads[0]!.scope.scope, at: { on: 1 } } }];
  const nativeCalls: { kind: string; args: Record<string, unknown> }[] = [];
  const native = new ViewSessions({ ...source, read: async () => legacy }, access, async (kind, args, admit) => { await admit(); nativeCalls.push({ kind, args }); return answer("accepted"); }, async () => answer("accepted"));
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
  } }, { call: async () => { throw Error("No native read."); } }, async () => { native++; return answer("accepted"); }, async () => { native++; return answer("accepted"); });
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
    { call: async () => { throw Error("No native read."); } }, async () => { native++; return answer("accepted"); }, async () => { native++; return answer("accepted"); });
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
  const sessions = new ViewSessions(source, { call: async () => { throw Error("No native read belongs to this projection fixture."); } },
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
  const session = (projection: Projection) => new ViewSessions({ initialPage: () => "item", read: async () => structuredClone(projection) }, { call: async () => { throw Error("No native tool read."); } }, async (_kind, args, admit) => { await admit(); signed.push(args["at"]); return answer("accepted"); }, async () => answer("accepted"));
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
  const sessions = new ViewSessions({ initialPage: () => "item", read: async () => projection() }, { call: async () => { throw Error("No native tool read."); } }, async () => answer("accepted"), async () => answer("accepted"), () => null, { readDiff: async (read, admit) => { await admit(); reads.push(read); return fail ? { content: [], isError: true, structuredContent: { error: "diff", message: "TEST no diff." } } : { content: [], isError: false, structuredContent: { text: "TEST text\ntruncated: TEST\n", truncated: true } }; } });
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
  const views = new ViewSessions(source, { call: async () => answer("read") }, async () => answer("accepted"), async () => answer("accepted"), () => null, {
    unresolved: async () => open ? { idempotencyKey: "open" } : null,
    readDiff: async (_read, admit) => { await admit(); spends++; return { content: [], structuredContent: { text: "t".repeat(32 * 1024) }, isError: false }; },
  });
  await views.open("v", "change", "subject");
  const { cut } = await views.read("v");
  open = true;
  await expect(views.act("v", cut, "view-diff")).rejects.toMatchObject({ reason: "stale" });
  expect(spends).toBe(0);
  open = false;
  const { display } = await views.act("v", cut, "view-diff");
  expect(spends).toBe(1);
  expect(display.receipt).toContain("The one-time credential is spent.");
  expect(display.query.page).not.toBe("diff");
});
