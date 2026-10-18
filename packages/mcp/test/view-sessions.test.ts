import { expect, test } from "vitest";
import type { CallResult } from "../src/service.ts";
import { ViewSessions } from "../src/views/session.ts";
import type { ViewSource } from "../src/views/types.ts";

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
    admit(); sent.push(structuredClone(args)); return answer("unavailable");
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
