import { peerNativePinData } from "./definition-corpus/late-pin-variants.ts";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { factRefOf } from "@generalbusiness/dap-bytes";
import { holdCapability, judgeDelivery, ownerReservations, validateDefinition } from "../src/index.ts";
import { arriving, created, d, deliver, forged, keys, valid } from "./fixtures.ts";
import { boundRecordData } from "./fixtures-bound-records.ts";
import { PIN_BOUNDS } from "./fixtures-receiver-pins.ts";
import { peerPinFixture, receivePeerPin } from "./fixtures-peer-pin.ts";

test("the declared digest applies; a second digest with the same name gets one authenticated wrong-pin result", () => {
  const { receiver, sender, other } = peerPinFixture();
  expect(other.definition.declared.name).toBe(sender.definition.declared.name);
  expect(other.definition.digest).not.toBe(sender.definition.digest);
  expect(receivePeerPin(receiver, other)).toMatchObject({ result: "write", draft: { input: { decision: "refused", reason: { code: "wrong-pin" } }, effects: [] } });
  const deciding = receiver.last.seq;
  expect(receiver.last.sends).toHaveLength(1);
  expect(receiver.last.sends[0]!.message).toMatchObject({ class: "result", outcome: "refused", reason: { code: "wrong-pin" }, of: { from: other.fact(1), n: 0 } });
  expect(receiver.state.sourceOrder(other.at, "sample")).toBeNull();
  expect(deliver(other, receiver, deciding, 0)).toMatchObject({ result: "write" });
  expect(other.state.request(1, 0)?.result).toMatchObject({ clause: "refused" });
  expect(receivePeerPin(receiver, other, false)).toMatchObject({ result: "repeat" });
  expect(receiver.last.seq).toBe(deciding);
  expect(receivePeerPin(receiver, sender)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
  expect(receiver.item(0).values["last"]).toBe(17);
});

test("a pin needs verified birth metadata and its declaration admits only an actual digest", () => {
  const { receiver, sender } = peerPinFixture(), before = receiver.entries.length;
  expect(receivePeerPin(receiver, sender, false)).toEqual({ result: "unavailable", reason: "dependency-unavailable" });
  expect(receiver.entries).toHaveLength(before);
  expect(receivePeerPin(receiver, sender)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
  const invalid = structuredClone(receiver.definition.declared);
  Reflect.set(invalid.receives["sample"]!.from, "pin", sender.definition.declared.name);
  expect(validateDefinition(invalid, PROPOSED_BOUNDS).ok).toBe(false);
});

test("native item-bound handlers reject the unsupported early pin-refusal composition", () => {
  const declaration = boundRecordData();
  expect(validateDefinition(declaration, PIN_BOUNDS, undefined, { platform: true }).ok).toBe(true);
  declaration.receives["stop"]!.from.pin = d("a");
  const checked = validateDefinition(declaration, PIN_BOUNDS, undefined, { platform: true });
  expect(checked.ok).toBe(false);
  if (!checked.ok) expect(checked.problems.some(problem => problem.path === "receives.stop.from.pin")).toBe(true);
});

test("wrong-pin refusal consumes a native receiver reservation without licensing the sender", () => {
  // Native hold/judge/fold/MemoryState; task source and its pin metadata
  // are scripted inputs, not native birth, authority or provider evidence.
  const declaration = peerNativePinData(d("a"));
  const definition = valid(validateDefinition(declaration, PIN_BOUNDS)), owner = holdCapability({ tokensPerHold: 2, rootRetentionSeconds: 600 });
  const ledger = created(definition, { title: "A", opener: keys.rita.member }); ledger.bounds = PIN_BOUNDS;
  const task = { ...ledger.at, kind: "task" as const };
  expect(ledger.act(keys.rita, "license", { on: 0, expected: { on: ledger.item(0).revision }, fields: { peer: task } }, { capabilities: owner })).toMatchObject({ result: "write" });
  const send = { n: 0, to: ledger.at, message: { class: "request" as const, type: "tell" as const, body: { message: "export-license", fields: { export: 0, k: 2 } } } };
  const source = { ...forged(task, 100, { type: "checkpoint", through: 0, state: definition.digest }, [send]), pin: d("b") };
  const arrival = { ...send, from: factRefOf(source.entry) }, context = { ...arriving(ledger, arrival, source), capabilities: owner, bounds: PIN_BOUNDS };
  const result = judgeDelivery(ledger.state, definition, arrival, context);
  expect(result).toMatchObject({ result: "write", draft: { settles: true, input: { decision: "refused", reason: { code: "wrong-pin" } } } });
  if (result.result !== "write") return expect.fail("expected the reserved decision");
  ledger.seal(result.draft);
  expect(ledger.state.record("hold@1", "receiver-pin", [0])?.values).toMatchObject({ k: 1, decided: 2 });
  const remaining = ownerReservations(owner, ledger.state, definition);
  expect(remaining.entries).toBe(1);
  expect(judgeDelivery(ledger.state, definition, arrival, context)).toMatchObject({ result: "repeat" });
  expect(ownerReservations(owner, ledger.state, definition)).toEqual(remaining);
});
