import { expect, test } from "vitest";
import { factRefOf, isEntry } from "@generalbusiness/artroom-bytes";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { PlatformData } from "@generalbusiness/dap-contract";
import { holdCapability, judgeDelivery, ownerReservations, prepareRules, validateDefinition } from "../src/index.ts";
import { RULE_PROFILES } from "../src/rule/index.ts";
import { arriving, created, deliver, forged, keys, sent, t, valid } from "./fixtures.ts";
import { sourceOrderDefinition, sourceOrderFixture } from "./fixtures-source-order.ts";
import { lateDefinition, lateFixture } from "./fixtures-late.ts";
import { boundRecordData } from "./fixtures-bound-records.ts";
import { PIN_BOUNDS, receiverPinData } from "./fixtures-receiver-pins.ts";

test.each([false, true])("late branch=%s: fresh and boundary run normal forms; strictly late replaces or refuses with an authenticated result", branch => {
  for (const seconds of [29.999, 30, 30.001]) {
    const { sender, receiver } = lateFixture(branch); receiver.now = t(seconds);
    const result = deliver(receiver, sender, 1, 0);
    expect(result).toMatchObject({ result: "write", draft: { judgesTime: true } });
    expect(isEntry(receiver.last)).toBe(true);
    const late = seconds > 30, refused = late && !branch;
    expect(receiver.last.input).toMatchObject({ type: "delivery", decision: refused ? "refused" : "applied" });
    expect(receiver.item(0).values["last"]).toBe(refused ? 0 : late ? 99 : 1);
    if (late && branch) expect(receiver.last.input).toHaveProperty("late", { reason: "old-sample" });
    else expect(receiver.last.input).not.toHaveProperty("late");
    expect(receiver.last.sends).toHaveLength(1);
    expect(receiver.last.sends[0]!.message).toMatchObject({ class: "result", of: { from: sender.fact(1), n: 0 }, outcome: refused ? "refused" : "applied" });
    if (refused) {
      expect(receiver.last.effects).toEqual([]);
      expect(receiver.last.input).toHaveProperty("reason", { code: "late", name: "old-sample" });
      expect(receiver.last.sends[0]!.message).toHaveProperty("reason", { code: "late", name: "old-sample" });
      expect(receiver.state.sourceOrder(sender.at, "sample")).toBeNull();
      // The sender consumes the authentic result from the deciding entry.
      expect(deliver(sender, receiver, receiver.last.seq, 0)).toMatchObject({ result: "write", draft: { input: { clause: "refused" } } });
      expect(sender.state.request(1, 0)?.result).toMatchObject({ clause: "refused" });
    }
    const count = receiver.entries.length;
    expect(deliver(receiver, sender, 1, 0)).toMatchObject({ result: "repeat" });
    expect(receiver.entries).toHaveLength(count);
  }
});

test("late time judgments refuse clock-behind before any entry in both branches", () => {
  for (const branch of [false, true]) {
    const { sender, receiver } = lateFixture(branch); receiver.now = t(40);
    expect(deliver(receiver, sender, 1, 0)).toMatchObject({ result: "write" });
    receiver.now = t(39); const count = receiver.entries.length;
    expect(deliver(receiver, sender, 1, 1)).toEqual({ result: "unavailable", reason: "clock-behind" });
    expect(receiver.entries).toHaveLength(count);
  }
});

test("a late replacement does not evaluate the normal handler's failing guard", () => {
  const definition = structuredClone(sourceOrderDefinition);
  definition.receives["sample"]!.guards = [{ equals: { a: { const: 1 }, b: { const: 2 } }, reason: "normal-only" }];
  definition.receives["sample"]!.late = { within: { seconds: 30 }, reason: "old-sample", then: {} };
  const { sender, receiver } = sourceOrderFixture(definition); receiver.now = t(31);
  expect(deliver(receiver, sender, 1, 0)).toMatchObject({ result: "write", draft: { input: { decision: "applied", late: { reason: "old-sample" } }, effects: [] } });
  expect(receiver.item(0).values["last"]).toBe(0);
});

test("a negative apparent latency remains fresh without inventing clock tolerance", () => {
  const { receiver, sender } = lateFixture(true);
  sender.now = t(60);
  sender.did(keys.rita, "emit", { on: 0, expected: { on: sender.item(0).revision }, fields: { to: receiver.at, first: 7, second: 8 } });
  receiver.now = t(59);
  expect(deliver(receiver, sender, 3, 0)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
  expect(receiver.last.input).not.toHaveProperty("late");
  expect(receiver.item(0).values["last"]).toBe(7);
});

test("a late relationship refusal writes no copy; an applied replacement advances the actual copy", () => {
  for (const branch of [false, true]) {
    const declaration = lateDefinition(branch), handler = declaration.receives["sample"]!;
    handler.class = "relate"; handler.copies = 4; delete handler.order;
    declaration.items["board"]!.refs["me"] = { fixed: true, required: true, to: { type: "item", of: "board" } };
    declaration.acts["found"]!.effects = [...declaration.acts["found"]!.effects, { ref: { slot: "me", from: "self" } }];
    declaration.acts["emit"]!.sends = [{ relate: { to: { slot: "peer" }, name: "sample", item: { slot: "me" }, state: "set", detail: { value: { field: "first" } }, result: {} } }];
    const { sender, receiver } = sourceOrderFixture(declaration); receiver.now = t(31);
    expect(deliver(receiver, sender, 1, 0)).toMatchObject({ result: "write", draft: { input: { decision: branch ? "applied" : "refused" } } });
    expect(receiver.state.relation(sender.at, "sample", 0)).toEqual(branch ? expect.objectContaining({ revision: 1, state: "set" }) : null);
    expect(receiver.item(0).values["last"]).toBe(branch ? 99 : 0);
  }
});

test("replacement validation cannot borrow normal guards and late is a closed handler-only form", () => {
  const definition = lateDefinition(true), handler = definition.receives["sample"]!;
  definition.items["board"]!.states["done"] = { final: true };
  handler.guards = [{ of: "also.board", state: ["open"] }];
  handler.effects = [{ of: "also.board", state: "done" }];
  handler.late!.then!.effects = [{ of: "also.board", state: "done" }];
  const checked = validateDefinition(definition, PROPOSED_BOUNDS);
  expect(checked.ok).toBe(false);
  if (!checked.ok) expect(checked.problems.some(problem => problem.path.includes("late.then.effects"))).toBe(true);
  for (const invalid of [{ reason: "missing-bound" }, { within: { seconds: -1 }, reason: "negative" }, { within: { seconds: 0.5 }, reason: "fraction" }, { within: { seconds: 30 }, reason: "old", then: { guards: [] } }]) {
    const value = lateDefinition(true); Reflect.set(value.receives["sample"]!, "late", invalid);
    expect(validateDefinition(value, PROPOSED_BOUNDS).ok).toBe(false);
  }
  const act = lateDefinition(true); Reflect.set(act.acts["emit"]!, "late", { within: { seconds: 30 }, reason: "act" });
  expect(validateDefinition(act, PROPOSED_BOUNDS).ok).toBe(false);
});

test("a result reconstructs the actual normal or late send clause from its deciding entry", () => {
  for (const late of [false, true]) {
    const definition = lateDefinition(true), handler = definition.receives["sample"]!;
    definition.capacity = { name: "whole-scope", version: 1 };
    handler.effects = [...handler.effects, { of: "also.board", ref: { slot: "peer", from: { sender: true } } }];
    handler.sends = [{ tell: { to: { slot: "peer", of: "also.board" }, message: "other", fields: { value: { const: 11 } }, result: { applied: [{ of: "also.board", value: { slot: "last", from: { const: 12 } } }] } } }];
    handler.late!.then!.effects = [...handler.late!.then!.effects!, { of: "also.board", ref: { slot: "peer", from: { sender: true } } }];
    handler.late!.then!.sends = [{ tell: { to: { slot: "peer", of: "also.board" }, message: "other", fields: { value: { const: 21 } }, result: { applied: [{ of: "also.board", value: { slot: "last", from: { const: 22 } } }] } } }];
    const { receiver, sender } = sourceOrderFixture(definition); receiver.now = t(late ? 31 : 29);
    expect(deliver(receiver, sender, 1, 0)).toMatchObject({ result: "write" });
    const deciding = receiver.last.seq;
    expect(receiver.last.sends).toHaveLength(2);
    expect(deliver(sender, receiver, deciding, 0)).toMatchObject({ result: "write" });
    expect(sender.item(0).values["last"]).toBe(late ? 21 : 11);
    expect(deliver(receiver, sender, sender.last.seq, 0)).toMatchObject({ result: "write", draft: { input: { clause: "applied" } } });
    expect(receiver.item(0).values["last"]).toBe(late ? 22 : 12);
  }
});

test("late refuses the unsupported item-bound native combination while the original handler stays valid", () => {
  const declaration = boundRecordData();
  expect(validateDefinition(declaration, PIN_BOUNDS, undefined, { platform: true }).ok).toBe(true);
  declaration.receives["stop"]!.late = { within: { seconds: 30 }, reason: "old-stop" };
  const checked = validateDefinition(declaration, PIN_BOUNDS, undefined, { platform: true });
  expect(checked.ok).toBe(false);
  if (!checked.ok) expect(checked.problems.some(problem => problem.path === "receives.stop.late")).toBe(true);
});

test("trusted platform capacity includes requests declared only by a late replacement", () => {
  // Trusted fictional data, not production rules or native authority.
  const declaration = { ...lateDefinition(true), name: "platform:late-fixture", outcomes: {} } as PlatformData;
  declaration.name = "platform:late-fixture"; declaration.outcomes = {};
  declaration.capacity = { name: "whole-scope", version: 1 };
  declaration.receives["sample"]!.late!.then!.effects = [{ of: "also.board", ref: { slot: "peer", from: { sender: true } } }];
  declaration.receives["sample"]!.late!.then!.sends = [{ tell: { to: { slot: "peer", of: "also.board" }, message: "other", fields: { value: { const: 21 } }, result: {} } }];
  const checked = validateDefinition(declaration, PROPOSED_BOUNDS, undefined, { platform: true });
  expect(checked.ok, checked.ok ? undefined : JSON.stringify(checked.problems)).toBe(true);
  if (checked.ok) expect(checked.definition.reserving?.requests?.["receives.sample.late.then.sends.0"]?.entries).toBeGreaterThan(0);
});

test("a late refusal consumes a native receiver pin and exact repeat consumes nothing more", () => {
  // Native hold capability, judge and MemoryState; task source and grants
  // are scripted fixture inputs, not native object or provider evidence.
  const data = receiverPinData(); data.receives["license"]!.late = { within: { seconds: 30 }, reason: "old-license" };
  const definition = valid(validateDefinition(data, PIN_BOUNDS)), owner = holdCapability({ tokensPerHold: 2, rootRetentionSeconds: 600 });
  const ledger = created(definition, { title: "A", opener: keys.rita.member }); ledger.bounds = PIN_BOUNDS;
  const task = { ...ledger.at, kind: "task" as const };
  expect(ledger.act(keys.rita, "license", { on: 0, expected: { on: ledger.item(0).revision }, fields: { peer: task } }, { capabilities: owner })).toMatchObject({ result: "write" });
  const send = { n: 0, to: ledger.at, message: { class: "request" as const, type: "tell" as const, body: { message: "export-license", fields: { export: 0, k: 2 } } } };
  const source = forged(task, 100, { type: "checkpoint", through: 0, state: definition.digest }, [send]);
  ledger.now = t(31);
  const arrival = { ...send, from: factRefOf(source.entry) }, context = { ...arriving(ledger, arrival, source), capabilities: owner, bounds: PIN_BOUNDS };
  const result = judgeDelivery(ledger.state, definition, arrival, context);
  expect(result).toMatchObject({ result: "write", draft: { settles: true, judgesTime: true, input: { decision: "refused", reason: { code: "late", name: "old-license" } } } });
  if (result.result !== "write") return expect.fail("expected the reserved deciding entry");
  ledger.remember([{ ...source, fact: arrival.from }]); ledger.seal(result.draft);
  expect(ledger.state.record("hold@1", "receiver-pin", [0])?.values).toMatchObject({ k: 1, decided: 2 });
  const remaining = ownerReservations(owner, ledger.state, definition);
  expect(remaining.entries).toBe(1);
  const count = ledger.entries.length;
  expect(judgeDelivery(ledger.state, definition, arrival, context)).toMatchObject({ result: "repeat" });
  expect(ledger.entries).toHaveLength(count); expect(ownerReservations(owner, ledger.state, definition)).toEqual(remaining);
});

test("rule preparation collects no normal guard input for a late replacement", () => {
  const declaration = lateDefinition(true);
  declaration.rules = { normal: "false" }; declaration.receives["sample"]!.guards = [{ rule: "normal", reason: "normal-only" }];
  const definition = valid(validateDefinition(declaration, PROPOSED_BOUNDS, RULE_PROFILES));
  const receiver = created(definition, {}, "receiver"), sender = created(definition, {}, "sender");
  sender.did(keys.rita, "emit", { on: 0, expected: { on: sender.item(0).revision }, fields: { to: receiver.at, first: 1, second: 2 } });
  const { delivered, source } = sent(sender, 1, 0);
  receiver.now = t(29);
  expect(prepareRules(receiver.state, definition, { delivery: delivered, context: { ...receiver.context(), source } })).toHaveLength(1);
  receiver.now = t(31);
  const context = { ...receiver.context(), source };
  expect(prepareRules(receiver.state, definition, { delivery: delivered, context })).toEqual([]);
  expect(judgeDelivery(receiver.state, definition, delivered, context)).toMatchObject({ result: "write", draft: { input: { decision: "applied", late: { reason: "old-sample" } } } });
});

test("the replacement shares its declared opening context and must set its own required slots", () => {
  const declaration = lateDefinition(true), handler = declaration.receives["sample"]!;
  declaration.items["row"] = { many: true, max: 3, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: { value: { fixed: true, required: true, of: { type: "int", min: 0, max: 100 } } } };
  handler.opens = "row"; handler.effects = [{ value: { slot: "value", from: { field: "value" } } }];
  handler.late!.then!.effects = [];
  expect(validateDefinition(declaration, PROPOSED_BOUNDS).ok).toBe(false);
  handler.late!.then!.effects = [{ value: { slot: "value", from: { const: 42 } } }];
  const { sender, receiver } = sourceOrderFixture(declaration); receiver.now = t(31);
  expect(deliver(receiver, sender, 1, 0)).toMatchObject({ result: "write" });
  expect(receiver.item(1)).toMatchObject({ type: "row", values: { value: 42 } });
});
