import { lateIgnoredGuardData, lateRelationshipData, lateResultData, lateRenamedPinData, lateOrdinaryLicenseData, lateTrustedData, lateNativePinData, lateNormalRuleData, lateOpeningData, lateOpeningEffects } from "./definition-corpus/late-pin-variants.ts";
import { expect, test } from "vitest";
import { factRefOf, isEntry } from "@generalbusiness/dap-bytes";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { holdCapability, judgeDelivery, ownerReservations, prepareRules, validateDefinition } from "../src/index.ts";
import { RULE_PROFILES } from "../src/rule/index.ts";
import { arriving, created, deliver, forged, keys, sent, t, valid, sourceOrderFixture, lateDefinition, lateFixture, boundRecordData, PIN_BOUNDS } from "./fixtures-entry.ts";

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
  const definition = lateIgnoredGuardData();
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
    const declaration = lateRelationshipData(branch);
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
    const definition = lateResultData();
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
  if (!checked.ok) expect(checked.problems).toContainEqual(expect.objectContaining({ code: "late-on-item-bound-handler", path: "receives.stop.late" }));
});

test("late replacement refuses the capability's reserved request regardless of the local handler name", () => {
  const data = lateRenamedPinData(), handler = data.receives["renamed"]!;
  expect(validateDefinition(data, PIN_BOUNDS).ok).toBe(true);
  handler.late!.then = {};
  const checked = validateDefinition(data, PIN_BOUNDS);
  expect(checked.ok).toBe(false);
  if (!checked.ok) expect(checked.problems).toContainEqual(expect.objectContaining({ code: "late-then-on-reserved-handler", path: "receives.renamed.late.then" }));
  // A same-name ordinary message has no native receiver reservation.
  const ordinary = lateOrdinaryLicenseData();
  expect(validateDefinition(ordinary, PROPOSED_BOUNDS).ok).toBe(true);
  const advisory = lateDefinition(false);
  advisory.receives["sample"]!.class = "advisory";
  delete advisory.receives["sample"]!.order;
  const rejected = validateDefinition(advisory, PROPOSED_BOUNDS);
  expect(rejected.ok).toBe(false);
  if (!rejected.ok) expect(rejected.problems).toContainEqual(expect.objectContaining({ code: "late-on-advisory", path: "receives.sample.late" }));
});

test("trusted platform capacity includes requests declared only by a late replacement", () => {
  // Trusted fictional data, not production rules or native authority.
  const declaration = lateTrustedData();
  const checked = validateDefinition(declaration, PROPOSED_BOUNDS, undefined, { platform: true });
  expect(checked.ok, checked.ok ? undefined : JSON.stringify(checked.problems)).toBe(true);
  if (checked.ok) expect(checked.definition.reserving?.requests?.["receives.sample.late.then.sends.0"]?.entries).toBeGreaterThan(0);
});

test("a late refusal consumes a native receiver pin and exact repeat consumes nothing more", () => {
  // Native hold capability, judge and MemoryState; task source and grants
  // are scripted fixture inputs, not native object or provider evidence.
  const data = lateNativePinData();
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
  const declaration = lateNormalRuleData();
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
  const declaration = lateOpeningData(), handler = declaration.receives["sample"]!;
  expect(validateDefinition(declaration, PROPOSED_BOUNDS).ok).toBe(false);
  handler.late!.then!.effects = lateOpeningEffects();
  const { sender, receiver } = sourceOrderFixture(declaration); receiver.now = t(31);
  expect(deliver(receiver, sender, 1, 0)).toMatchObject({ result: "write" });
  expect(receiver.item(1)).toMatchObject({ type: "row", values: { value: 42 } });
});
