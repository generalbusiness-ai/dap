import { receiverClosureData, receiverExtendChange, receiverInertChange, receiverLegacyCounterChange } from "./definition-corpus/late-pin-variants.ts";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type GenesisEntry, type ScopeKind, type Seed } from "@generalbusiness/dap-contract";
import { admitSequenceGenesis, canonicalize, entryHash, factRefOf, newGenesisNonce, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { holdCapability, judgeDelivery, ownerReservations, reserved, validateDefinition, type Fetched } from "../src/index.ts";
import { arriving, created, forged, keys, valid, PIN_BOUNDS, receiverPinData, receiverPinDefinition, Staging, staging, cap, t } from "./fixtures-entry.ts";

const owner = holdCapability({ tokensPerHold: 2, rootRetentionSeconds: 600 });
const zero = { entries: 0, items: 0, records: 0, bytes: 0, requests: 0 };

/** Canonical original bytes bind the TEST source; no Native birth is claimed. */
function sourceFixture(kind: ScopeKind, n: number) {
  const seed: Seed = { v: 1, kind, definition: textDigest("TEST receiver source definition"), creator: null, cause: textDigest("TEST receiver source cause"), ordinal: n };
  const entry: GenesisEntry = { v: 1, seq: 0, prev: null, time: "2026-10-04T12:00:00Z", clamped: false, epoch: 0,
    input: { type: "genesis", seed, nonce: newGenesisNonce(new Uint8Array(16).fill(n)), kind: "TEST source", founding: null, source: null, sourceKind: null, n: null, message: null, decision: "applied" },
    uses: [], prepared: [], effects: [], sends: [] };
  const at = { scope: scopeIdOf(seed), genesis: entryHash(entry) };
  const sequence = admitSequenceGenesis(canonicalize(entry), at, PIN_BOUNDS.entryBytes);
  if (!sequence) throw new Error("the TEST source must bind its original genesis bytes");
  return { at, sequence };
}

test("native receiver pins reserve their full deciding amount, including an over-limit body's writer ceiling and refused decisions", () => {
  const definition = receiverPinDefinition();
  // Real genesis, act, capability effects and MemoryState. Authority and
  // the arriving task entry are fixtures; no outside owner/provider runs.
  const s = created(definition, { title: "A lane", opener: keys.rita.member });
  s.bounds = PIN_BOUNDS;
  const taskSource = sourceFixture("task", 22), task = taskSource.at;
  const unit = { ...zero, entries: 1, bytes: 2 * PIN_BOUNDS.entryBytes + 6 * PIN_BOUNDS.textBytes + 2 };
  expect(definition.pendingWorkAmounts.receiverPins).toEqual({ fallback: { ...zero, entries: 1, bytes: 2 * PIN_BOUNDS.entryBytes }, byKind: { task: unit } });
  expect(ownerReservations(owner, s.state, definition)).toEqual(zero);
  expect(s.act(keys.rita, "license", { on: 0, expected: { on: 1 }, fields: { peer: task } }, { capabilities: owner }).result).toBe("write");
  expect(s.state.record("hold@1", "receiver-pin", [0])).toMatchObject({ state: "standing", values: { holder: null, decided: 1, task, taskKind: "task", taskKindBasis: "declared" } });
  expect(ownerReservations(owner, s.state, definition)).toEqual({ ...unit, entries: 2, bytes: 2 * unit.bytes });
  expect(reserved(s.state, definition, s.last.input, owner)).toEqual({ ...unit, entries: 3, bytes: 2 * unit.bytes + PIN_BOUNDS.entryBytes });
  const pin = s.state.record("hold@1", "receiver-pin", [0])!;
  for (const missing of ["taskKind", "taskKindBasis"]) {
    const values = { ...pin.values }; delete values[missing];
    s.state.putRecord({ ...pin, values });
    expect(() => ownerReservations(owner, s.state, definition)).toThrow("hold@1/receiver-pin has no recorded task kind and basis");
    s.state.putRecord(pin);
  }

  const body = "\u0000".repeat(PIN_BOUNDS.textBytes);
  const send = { n: 0, to: s.at, message: { class: "request", type: "tell", body: { message: "export-license", fields: { export: 0, k: 2, body: textDigest(body) } } } } as const;
  const source = { ...forged(taskSource.sequence, 100, { type: "checkpoint", through: 0, state: definition.digest }, [send]), under: "fixture-task" };
  const arrival = { ...send, from: factRefOf(source.entry, task) };
  const judged = judgeDelivery(s.state, definition, arrival, { ...arriving(s, arrival, source), bounds: PIN_BOUNDS, capabilities: owner, texts: digest => digest === textDigest(body) ? PIN_BOUNDS.textBytes : undefined });
  expect(judged.result).toBe("write");
  if (judged.result !== "write") throw new Error("bound decision must be written");
  expect(judged.draft).toMatchObject({ settles: true, input: { decision: "refused", reason: { code: "bad-field" } }, effects: [{ effect: "record", values: { decided: 2 } }] });
  s.remember([{ ...source, fact: arrival.from }]); s.seal(judged.draft);
  expect(ownerReservations(owner, s.state, definition)).toEqual(unit);
  expect(s.state.record("hold@1", "receiver-pin", [0])?.values).toMatchObject({ task, taskKind: "task", taskKindBasis: "declared", k: 1, decided: 2 });
  // No heuristic release for the retained standing state; its final
  // numbered decision is still owed.
  expect(s.state.record("hold@1", "receiver-pin", [0])?.state).toBe("standing");
  const { receiverPins: _missing, ...amounts } = definition.pendingWorkAmounts;
  expect(() => ownerReservations(owner, s.state, { ...definition, pendingWorkAmounts: amounts })).toThrow("hold@1/receiver-pin producer has no complete reservation Amount");
});

test("an ACT pin's declared kind does not consume a differently typed actual delivery", () => {
  const definition = receiverPinDefinition(), peer = sourceFixture("directory", 23);
  const s = created(definition, { title: "A lane", opener: keys.rita.member });
  s.bounds = PIN_BOUNDS;
  // The ACT declares a Task expectation. A scope field checks structure,
  // not the remote genesis, so this actual Directory still fits that field.
  expect(s.act(keys.rita, "license", { on: 0, expected: { on: 1 }, fields: { peer: peer.at } }, { capabilities: owner }).result).toBe("write");
  const pin = s.state.record("hold@1", "receiver-pin", [0])!, amount = ownerReservations(owner, s.state, definition);
  expect(pin).toMatchObject({ state: "standing", values: { task: peer.at, taskKind: "task", taskKindBasis: "declared", decided: 1 } });
  const unit = definition.pendingWorkAmounts.receiverPins!.byKind["task"]!;
  expect(amount).toEqual({ entries: 2 * unit.entries, items: 2 * unit.items, records: 2 * unit.records, bytes: 2 * unit.bytes, requests: 2 * unit.requests });
  const send = { n: 0, to: s.at, message: { class: "request", type: "tell", body: { message: "export-license", fields: { export: 0, k: 2 } } } } as const;
  const source = { ...forged(peer.sequence, 100, { type: "checkpoint", through: 0, state: definition.digest }, [send]), under: "fixture-directory" };
  const arrival = { ...send, from: factRefOf(source.entry, peer.at) };
  const context = arriving(s, arrival, source);
  const kindContext = { source: { at: peer.at, kind: peer.sequence.kind }, declared: {} };
  const reading = { view: s.state, definition, scope: s.state.scope()!, self: s.head.seq + 1, kind: "", fields: {}, signer: null, facts: new Map(), clock: context.clock, kindContext };
  expect(owner.effect("hold@1", "license", { export: 0, from: peer.at, k: 2 }, reading)).toEqual([]);
  expect(owner.effect("hold@1", "settle", { export: 0, by: arrival.from }, reading)).toEqual([]);
  const judged = judgeDelivery(s.state, definition, arrival, { ...context, capabilities: owner });
  const unlicensed = created(definition, { title: "A lane", opener: keys.rita.member }); unlicensed.bounds = PIN_BOUNDS;
  expect(unlicensed.at).toEqual(s.at);
  const ordinary = judgeDelivery(unlicensed.state, definition, arrival, { ...arriving(unlicensed, arrival, source), capabilities: owner });
  expect(ordinary).toMatchObject({ result: "write", draft: { input: { decision: "refused", reason: { code: "unknown-message" } }, effects: [], settles: false } });
  expect(judged).toMatchObject({ result: "write", draft: { input: { decision: "refused", reason: { code: "unknown-message" }, sourceKind: "directory" }, effects: [], settles: false } });
  if (judged.result !== "write" || ordinary.result !== "write") throw new Error("both deliveries must take the ordinary no-pin path");
  expect(judged.draft.effects).toEqual(ordinary.draft.effects);
  expect(judged.draft.uses).toContainEqual(expect.objectContaining({ fact: arrival.from, kind: "directory" }));
  s.seal(judged.draft);
  expect(s.state.record("hold@1", "receiver-pin", [0])).toEqual(pin);
  expect(ownerReservations(owner, s.state, definition)).toEqual(amount);

  // The Task-only scene above stops before a handler. Reuse the admitted
  // staging handler and real T28 prerequisites to reach both ordinary guards.
  // Staging's authority, workspace and source entries remain labelled test
  // stand-ins. No Native task, provider or host admission is claimed.
  const data = structuredClone(staging.declared), checkpoint = textDigest("TEST ordinary guard checkpoint");
  data.receives["directory-license"] = { ...structuredClone(data.receives["export-license"]!), from: { kind: "directory" } };
  data.acts["license-expectation"] = {
    step: "transition", on: "export", grant: "export", also: {},
    fields: { peer: { type: "scope", kind: "task", required: true }, target: { type: "item", of: "hold", required: true }, instance: { type: "text", max: 128, required: true } },
    guards: [], effects: [{ capability: { name: "hold", do: "license", with: {
      export: { item: "on" }, from: { field: "peer" }, checkpoint: { const: checkpoint },
      hold: { field: "target" }, instance: { field: "instance" }, k: { const: 1 },
    } } }], sends: [], attention: [],
  };
  const guardedDefinition = valid(validateDefinition(data, PROPOSED_BOUNDS));
  const prepared = () => {
    const lane = new Staging(guardedDefinition);
    expect(lane.prepare(keys.una, "instance", { hold: lane.hold, task: peer.at, instance: "i1" })).not.toBeTypeOf("string");
    lane.now = t(700); lane.drain(); lane.derived();
    const exported = lane.did(keys.rita, "authorize", { expected: { hold: lane.item(lane.hold).revision }, fields: { hold: lane.hold } }).seq;
    const target = lane.take(keys.una);
    expect(lane.prepare(keys.una, "instance", { hold: target, task: peer.at, instance: "i2" })).not.toBeTypeOf("string");
    return { lane, exported, target };
  };
  const covered = prepared(), uncovered = prepared();
  expect(covered.lane.at).toEqual(uncovered.lane.at);
  expect([covered.exported, covered.target, covered.lane.item(covered.exported), covered.lane.item(covered.target), covered.lane.record("instance", covered.target, "i2")])
    .toEqual([uncovered.exported, uncovered.target, uncovered.lane.item(uncovered.exported), uncovered.lane.item(uncovered.target), uncovered.lane.record("instance", uncovered.target, "i2")]);
  expect(covered.lane.act(keys.rita, "license-expectation", {
    on: covered.exported, expected: { on: covered.lane.item(covered.exported).revision }, fields: { peer: peer.at, target: covered.target, instance: "i2" },
  }, { capabilities: cap }).result).toBe("write");
  const stored = structuredClone(covered.lane.state.record("hold@1", "receiver-pin", [covered.exported]));
  expect(stored).toMatchObject({ state: "standing", values: { task: peer.at, taskKind: "task", taskKindBasis: "declared", k: 1, decided: 1 } });
  expect(uncovered.lane.state.record("hold@1", "receiver-pin", [uncovered.exported])).toBeNull();
  const remaining = covered.lane.reserved(); // Legacy entry-count projection, not a complete Amount.
  const request = { n: 0, to: covered.lane.at, message: { class: "request", type: "tell", body: { message: "export-license",
    fields: { export: covered.exported, k: 2, checkpoint, hold: covered.target, instance: "i2" } } } } as const;
  const actual = { ...forged(peer.sequence, 101, { type: "checkpoint", through: 0, state: guardedDefinition.digest }, [request]), under: "fixture-directory" };
  const delivered = { ...request, from: factRefOf(actual.entry, peer.at) };
  const fetched: Fetched = { fact: delivered.from, entry: actual.entry, sequence: peer.sequence, under: actual.under };
  const ordinaryArgs = { export: covered.exported, from: peer.at, checkpoint, hold: covered.target, instance: "i2" };
  const given = (lane: Staging, source: Fetched = fetched) => lane.given({ source, kindContext });
  expect(cap.guard("hold@1", "license", ordinaryArgs, given(uncovered.lane))).toBe(true);
  expect(cap.guard("hold@1", "license", ordinaryArgs, given(covered.lane))).toBe(true);
  expect(cap.effect("hold@1", "license", { ...ordinaryArgs, k: 2 }, given(covered.lane))).toEqual([]);
  const receiving = (lane: Staging) => judgeDelivery(lane.state, guardedDefinition, delivered, { ...arriving(lane, delivered, actual), capabilities: cap });
  const ordinaryDelivery = receiving(uncovered.lane), mismatchedDelivery = receiving(covered.lane);
  expect(ordinaryDelivery).toMatchObject({ result: "write", draft: { input: { decision: "applied", sourceKind: "directory" }, settles: false } });
  expect(mismatchedDelivery).toMatchObject({ result: "write", draft: { input: { decision: "applied", sourceKind: "directory" }, effects: [], settles: false } });
  if (ordinaryDelivery.result !== "write" || mismatchedDelivery.result !== "write") throw new Error("both actual-kind handlers must write their ordinary applied answer");
  expect(ordinaryDelivery.draft.effects).toContainEqual(expect.objectContaining({ effect: "record", kind: "receiver-pin", values: expect.objectContaining({ task: peer.at, taskKind: "directory", taskKindBasis: "checked" }) }));
  const nonPinEffects = (entry: typeof ordinaryDelivery.draft) => entry.effects.filter(effect => !(effect.effect === "record" && effect.kind === "receiver-pin"));
  expect(nonPinEffects(mismatchedDelivery.draft)).toEqual(nonPinEffects(ordinaryDelivery.draft));
  expect(mismatchedDelivery.draft.uses).toContainEqual(expect.objectContaining({ fact: delivered.from, kind: "directory" }));

  // Leave both judgments unconsumed while comparing the ordinary withheld
  // final-source guard. The association and by hash still need actual bytes.
  const final = forged(peer.sequence, 102, { type: "checkpoint", through: 0, state: guardedDefinition.digest }, []);
  const finalEntry: Entry = { ...final.entry, effects: [{ effect: "state", item: 3, state: "withheld" }] };
  const ended: Fetched = { fact: factRefOf(finalEntry, peer.at), entry: finalEntry, sequence: peer.sequence, under: actual.under };
  const settledArgs = { export: covered.exported, from: peer.at, final: "withheld", by: ended.fact };
  expect(cap.guard("hold@1", "settled", settledArgs, given(uncovered.lane, ended))).toBe(true);
  expect(cap.guard("hold@1", "settled", settledArgs, given(covered.lane, ended))).toBe(true);
  const wrongHash: Fetched = { ...ended, fact: { ...ended.fact, hash: textDigest("TEST wrong final-source hash") } };
  for (const lane of [uncovered.lane, covered.lane]) expect(cap.guard("hold@1", "settled", { ...settledArgs, by: wrongHash.fact }, given(lane, wrongHash))).toBe("not-final");
  expect(cap.effect("hold@1", "settle", { export: covered.exported, by: ended.fact }, given(covered.lane, ended))).toEqual([]);
  covered.lane.remember([fetched]); covered.lane.seal(mismatchedDelivery.draft);
  expect(covered.lane.state.record("hold@1", "receiver-pin", [covered.exported])).toEqual(stored);
  expect(covered.lane.reserved()).toBe(remaining);
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
