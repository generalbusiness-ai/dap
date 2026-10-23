import { receiverClosureData, receiverExtendChange, receiverInertChange, receiverLegacyCounterChange } from "./definition-corpus/late-pin-variants.ts";
import { expect, test } from "vitest";
import { factRefOf, textDigest } from "@generalbusiness/artroom-bytes";
import { holdCapability, judgeDelivery, ownerReservations, reserved, validateDefinition } from "../src/index.ts";
import { arriving, created, forged, keys, valid, PIN_BOUNDS, receiverPinData, receiverPinDefinition } from "./fixtures-entry.ts";

const owner = holdCapability({ tokensPerHold: 2, rootRetentionSeconds: 600 });
const zero = { entries: 0, items: 0, records: 0, bytes: 0, requests: 0 };

test("native receiver pins reserve their full deciding amount, including an over-limit body's writer ceiling and refused decisions", () => {
  const definition = receiverPinDefinition();
  // Real genesis, act, capability effects and MemoryState. Authority and
  // the arriving task entry are fixtures; no outside owner/provider runs.
  const s = created(definition, { title: "A lane", opener: keys.rita.member });
  s.bounds = PIN_BOUNDS;
  const task = { ...s.at, kind: "task" as const };
  const unit = { ...zero, entries: 1, bytes: 2 * PIN_BOUNDS.entryBytes + 6 * PIN_BOUNDS.textBytes + 2 };
  expect(definition.pendingWorkAmounts.receiverPins).toEqual({ fallback: { ...zero, entries: 1, bytes: 2 * PIN_BOUNDS.entryBytes }, byKind: { task: unit } });
  expect(ownerReservations(owner, s.state, definition)).toEqual(zero);
  expect(s.act(keys.rita, "license", { on: 0, expected: { on: 1 }, fields: { peer: task } }, { capabilities: owner }).result).toBe("write");
  expect(s.state.record("hold@1", "receiver-pin", [0])).toMatchObject({ state: "standing", values: { holder: null, decided: 1, task } });
  expect(ownerReservations(owner, s.state, definition)).toEqual({ ...unit, entries: 2, bytes: 2 * unit.bytes });
  expect(reserved(s.state, definition, s.last.input, owner)).toEqual({ ...unit, entries: 3, bytes: 2 * unit.bytes + PIN_BOUNDS.entryBytes });

  const body = "\u0000".repeat(PIN_BOUNDS.textBytes);
  const send = { n: 0, to: s.at, message: { class: "request", type: "tell", body: { message: "export-license", fields: { export: 0, k: 2, body: textDigest(body) } } } } as const;
  const source = { ...forged(task, 100, { type: "checkpoint", through: 0, state: definition.digest }, [send]), under: "fixture-task" };
  const arrival = { ...send, from: factRefOf(source.entry) };
  const judged = judgeDelivery(s.state, definition, arrival, { ...arriving(s, arrival, source), bounds: PIN_BOUNDS, capabilities: owner, texts: digest => digest === textDigest(body) ? PIN_BOUNDS.textBytes : undefined });
  expect(judged.result).toBe("write");
  if (judged.result !== "write") throw new Error("bound decision must be written");
  expect(judged.draft).toMatchObject({ settles: true, input: { decision: "refused", reason: { code: "bad-field" } }, effects: [{ effect: "record", values: { decided: 2 } }] });
  s.remember([{ ...source, fact: arrival.from }]); s.seal(judged.draft);
  expect(ownerReservations(owner, s.state, definition)).toEqual(unit);
  // No heuristic release for the retained standing state; its final
  // numbered decision is still owed.
  expect(s.state.record("hold@1", "receiver-pin", [0])?.state).toBe("standing");
  const { receiverPins: _missing, ...amounts } = definition.pendingWorkAmounts;
  expect(() => ownerReservations(owner, s.state, { ...definition, pendingWorkAmounts: amounts })).toThrow("hold@1/receiver-pin producer has no complete reservation Amount");
});

test("native receiver-pin quotes use the shared item/request closure and refuse recursive or unknown counter producers", () => {
  const data = receiverClosureData(receiverPinDefinition().digest);
  const definition = valid(validateDefinition(data, PIN_BOUNDS));
  const unit = definition.pendingWorkAmounts.receiverPins!.byKind["task"]!;
  expect(unit).toEqual({ entries: 4, items: 1, records: 0, bytes: 6 * PIN_BOUNDS.entryBytes + 6 * PIN_BOUNDS.textBytes + 2, requests: 1 });
  // Its later result comes from the declared child kind, not from the
  // original handler's task source. That pin has the finite unknown-
  // handler refusal, rather than a false edge back to the task handler.
  receiverExtendChange(data);
  const extended = valid(validateDefinition(data, PIN_BOUNDS));
  expect(extended.pendingWorkAmounts.receiverPins!.byKind["task"]).toEqual({ entries: 6, items: 1, records: 1, bytes: 10 * PIN_BOUNDS.entryBytes + 6 * PIN_BOUNDS.textBytes + 2, requests: 1 });
  // This handler would create a new pin instead of updating the bound key.
  // The same native task would have to fund its own closure again.
  const cyclic = receiverPinData();
  const effect = cyclic.receives["license"]!.effects[0]!;
  if (!("capability" in effect)) throw new Error("native fixture effect missing");
  effect.capability.with["export"] = { const: 99 };
  expect(validateDefinition(cyclic, PIN_BOUNDS)).toMatchObject({ ok: false, problems: [{ code: "reserve-unbounded", message: expect.stringContaining("hold@1/receiver-pin producer has a recursive") }] });
  // A typed integer cannot match a ScopeRef source. The record still
  // costs a key, but it opens no recursively bound decision work.
  receiverInertChange(effect);
  const inert = validateDefinition(cyclic, PIN_BOUNDS);
  expect(inert.ok).toBe(true);
  if (!inert.ok) throw new Error("inert native source must validate");
  expect(inert.definition.pendingWorkAmounts.receiverPins!.byKind["task"]).toEqual({ entries: 1, items: 0, records: 1, bytes: 2 * PIN_BOUNDS.entryBytes + 6 * PIN_BOUNDS.textBytes + 2, requests: 0 });
  const unknown = receiverPinData();
  const opening = unknown.acts["license"]!.effects[0]!;
  if (!("capability" in opening)) throw new Error("native fixture effect missing");
  opening.capability.with["k"] = { const: "unbounded counter" };
  expect(validateDefinition(unknown, PIN_BOUNDS)).toMatchObject({ ok: false, problems: [{ code: "reserve-unbounded", path: "acts.license.effects.0.capability", message: expect.stringContaining("counter producer") }] });
  receiverLegacyCounterChange(unknown);
  expect(validateDefinition(unknown, PIN_BOUNDS).ok).toBe(true);
});
