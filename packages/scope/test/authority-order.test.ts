import { expect, onTestFinished, test, vi } from "vitest";
import { entryHash } from "@generalbusiness/dap-bytes";
import { variant, d, membership } from "@generalbusiness/dap-derive/testing";
import { ReceiverReads } from "../src/receiver-reads.ts";
import { HOLD, at, create, definition, foreignOf, rita, una } from "./fixtures-native.ts";
import { wired } from "./outside.ts";

// Real ScopeObject, judgments, SQLite, foreign entry and timed alarm. Membership,
// release admission and the final port-limit answer are scripted. No live room
// or provider runs.
test("a failed authority observation reaches no receiver or foreign work and drains no timer; only the alarm drains before an authorized retry", async () => {
  const under = variant(definition.declared, data => {
    data.acts.remark.fields.proof = { type: "fact", kind: ["remark"], under: data.name, required: false };
  });
  const source = await create();
  const fact = (await source.did(rita, "remark", { on: 0, fields: { text: "real foreign entry" } })).fact;
  const entry = (await source.entries(fact.seq))[0]!;
  expect(entryHash(entry)).toBe(fact.hash);
  const scope = await create({}, {}, under);
  await scope.holds(2);
  const calls = { membership: 0, provenance: 0, receiver: 0, foreign: 0 };
  const actions = Object.values(under.declared.acts).map(act => act.grant);
  scope.c.membership = { at: membership, answers: request => {
    calls.membership++;
    if (!("key" in request)) return null;
    const denied = request.key === rita.key;
    return { of: membership, head: { seq: 40, hash: d("4") }, key: request.key, keyState: "active",
      member: denied ? rita.member.member : una.member.member, memberState: "active", role: "member",
      actions: denied ? [] : actions, within: { membership }, controller: null, controllerActive: null,
      notAfter: null, definition: "platform:membership@1" };
  } };
  let bounded = false;
  wired.set(scope.name, () => ({
    ...(bounded ? { authority: { read: async () => "limit" as const } } : {}),
    freshActAdmission: { read: async () => { calls.provenance++; return { current: () => "allowed" as const }; } },
    resolver: { read: async asked => {
      calls.foreign++;
      return asked.hash === fact.hash ? foreignOf(fact, definition.declared.name) : null;
    } },
  }));
  onTestFinished(() => { wired.delete(scope.name); });
  const original = ReceiverReads.forReceiver;
  const receiver = vi.spyOn(ReceiverReads, "forReceiver").mockImplementation(async (...args) => {
    if (args[1].scope === scope.name) calls.receiver++;
    return original(...args);
  });
  onTestFinished(() => { receiver.mockRestore(); });
  await scope.restart();
  scope.c.clock.now = at(HOLD);
  const before = await scope.head();
  const denied = scope.intent(rita, "remark", { on: 0, fields: { text: "denied", proof: fact } });
  expect(await scope.submit(denied)).toEqual({ answer: "refused", reason: "unauthorized", judgedAt: before });
  expect(calls).toEqual({ membership: 1, provenance: 0, receiver: 0, foreign: 0 });
  expect(await scope.head()).toEqual(before);

  const allowed = scope.intent(una, "remark", { on: 0, fields: { text: "after the alarm", proof: fact } });
  expect(await scope.submit(allowed)).toMatchObject({ answer: "unavailable", reason: "busy" });
  expect(calls).toEqual({ membership: 2, provenance: 1, receiver: 1, foreign: 1 });
  expect(await scope.head()).toEqual(before);
  await scope.alarm();
  expect((await scope.entries(before.seq + 1)).map(value => value.input.type)).toEqual(["timed", "timed"]);
  expect(await scope.submit(allowed)).toMatchObject({ answer: "accepted", receipt: { fact: { seq: before.seq + 3 } } });
  expect(calls.provenance).toBe(2);
  expect(calls.receiver).toBe(2);
  expect(calls.foreign).toBe(2);

  // The port's key bound reaches the signed Core boundary without another
  // provenance, receiver or foreign read. The separate owner fills the real map.
  bounded = true;
  await scope.restart();
  const atBound = await scope.head(), beforeLimit = { ...calls };
  const over = scope.intent(una, "remark", { on: 0, fields: { text: "new key at the bound", proof: fact } });
  expect(await scope.submit(over)).toEqual({ answer: "refused", reason: "limit", judgedAt: atBound });
  expect(calls).toEqual(beforeLimit);
  expect(await scope.head()).toEqual(atBound);
});
