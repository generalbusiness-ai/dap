/** Scripted resolved state exposes the pure admitted body and its diagnostic traversal. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type ActType, type Guard, type PlatformData, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalBytes, digestBytes, signIntent } from "@generalbusiness/dap-bytes";
import { newItem } from "../src/item-effects.ts";
import type { Judging } from "../src/guards.ts";
import { ruleInput } from "../src/guards.ts";
import { MemoryState } from "../src/state.ts";
import type { Capabilities } from "../src/capability.ts";
import { validateDefinition, type ValidDefinition } from "../src/validate/index.ts";
import { evaluateRules } from "../src/rule/index.ts";
import { evaluateAdmitted, explainAdmitted } from "../src/program/interpret.ts";
import { observeProgram } from "../src/program/observe.ts";
import { requirements } from "../src/program/requirements.ts";
import { namedBody } from "../src/program/structure.ts";
import { declarationOf } from "../src/program/declaration.ts";
import { nativeClockCutoverData } from "./definition-corpus/clock-cutover-data.ts";
import { C1, capabilityStagingData } from "./definition-corpus/capability-staging-data.ts";
import { clockScene } from "./fixtures-clock-cutover.ts";
import { d, keys, lane, otherLane, small, t, valid } from "./fixtures.ts";

function fixture(change: (act: ActType) => void) {
  const input = structuredClone(small), act = input.acts["edit"]!;
  act.also = {}; act.fields = {}; act.guards = [{ state: ["draft"] }]; act.effects = []; act.sends = []; act.attention = [];
  input.rules["ready"] = "false";
  change(act);
  const definition = valid(validateDefinition(input, PROPOSED_BOUNDS)), body = namedBody(definition, "act", "edit", "act")!;
  return { definition, body };
}
function context(definition: ValidDefinition): Judging {
  const view = new MemoryState(), declared = declarationOf(definition), type = declared.items["note"]!;
  const on = { ...newItem({ effect: "open", item: 1, type: "note", state: "draft" }, type, d("b")),
    parties: { owner: keys.rita.member, readers: [] }, refs: { peer: otherLane, me: null }, values: { text: "before", due: t(100) } };
  view.putItem(on);
  return { view, definition, bounds: PROPOSED_BOUNDS, clock: { reading: t(101), asOf: t(101), behind: false },
    scope: { at: otherLane, kind: "lane", creator: null }, self: 20, kind: "edit", fields: {}, fieldTypes: declared.acts["edit"]!.fields,
    subjects: new Map([["on", on]]), signer: { member: keys.rita.member, principal: null }, facts: new Map(), prepared: [], used: [], ran: { clock: false } };
}

test("complete admitted guards keep literal results, actual ownership and primitive counts at every trace budget", () => {
  const { definition, body } = fixture(act => { act.guards = [...act.guards, { set: "text" }]; act.effects = [{ state: "kept" }]; });
  const j = context(definition), plain = evaluateAdmitted(body, j, d("a")), traced = evaluateAdmitted(body, j, d("a"), {}, 100), exhausted = evaluateAdmitted(body, j, d("a"), {}, 0);
  const expected = { result: "ran", effects: [{ effect: "state", item: 1, state: "kept" }], sends: [], prepared: [], judgesTime: false, settles: false };
  expect(plain.ran).toEqual(expected); expect(traced.ran).toEqual(expected); expect(exhausted.ran).toEqual(expected);
  expect(canonicalBytes(exhausted.ran)).toEqual(canonicalBytes(plain.ran));
  expect(traced.primitives).toEqual(plain.primitives); expect(exhausted.primitives).toEqual(plain.primitives);
  expect(traced.primitives).toMatchObject({ guards: 2, effects: 1, prepared: 0, native: 0 });
  expect([plain.trace.length, traced.truncated, exhausted.trace.length, exhausted.truncated]).toEqual([0, false, 0, true]);
  expect(j.used).toEqual([]); expect(j.subjects.get("on")?.state).toBe("draft");
  expect(() => evaluateAdmitted({ ...body }, j, d("a"))).toThrow("another validation");
  expect(() => evaluateAdmitted(body, { ...j, definition: { ...definition } }, d("a"))).toThrow("another validation");
  expect(() => explainAdmitted({ ...body }, traced)).toThrow("another admitted body");
});

test("static reads include skipped conditions and distinct future state without inventing actual reads of unused input", () => {
  const { definition, body } = fixture(act => {
    act.also = { other: { item: "note", by: "other" } };
    act.fields = { text: { type: "text", max: 200, required: true }, other: { type: "item", of: "note", required: false }, unused: { type: "bool", required: false } };
    act.effects = [{ value: { slot: "text", from: { field: "text" } } },
      { value: { slot: "due", from: { time: { plusSeconds: 1 } } }, if: [{ of: "also.other", state: ["draft"] }, { after: { slot: "due" } }] }];
    act.sends = [{ tell: { to: { slot: "peer" }, message: "record", fields: { text: { slot: "text" } }, result: { applied: [{ value: { slot: "text", from: { const: "future" } } }] } } }];
  });
  const j = context(definition); j.fields = { text: "after", unused: true };
  const observed = evaluateAdmitted(body, j, d("a"), {}, 100), staticReads = requirements(definition, body);
  expect(observed.ran).toEqual({ result: "ran", effects: [{ effect: "value", item: 1, slot: "text", value: "after" }],
    sends: [{ n: 0, to: otherLane, message: { class: "request", type: "tell", body: { message: "record", fields: { text: "after" } } } }], prepared: [], judgesTime: true, settles: false });
  expect(observed.trace.some(event => event.op === "after" || event.op === "time")).toBe(false);
  expect(staticReads.reads).toContainEqual({ kind: "clock" });
  expect(staticReads.reads).toContainEqual({ kind: "subject", name: "on", phase: "before", part: "slot:value:due" });
  expect(staticReads.reads).not.toContainEqual({ kind: "field", name: "unused", presence: true });
  expect(staticReads.future).toHaveLength(1);
  const future = staticReads.future[0]!;
  expect(future.clause).toBe("applied"); expect(future.requirements.body.origin).toBe(body.id); expect(future.requirements.body.frame.kind).toBe("clause");
  const current = { ...j.subjects.get("on")!, values: { text: "later", due: t(500) } };
  expect(evaluateAdmitted(future.requirements.body, { ...j, subjects: new Map([["on", current]]) }, d("a")).ran).toEqual({ result: "ran",
    effects: [{ effect: "value", item: 1, slot: "text", value: "future" }], sends: [], prepared: [], judgesTime: false, settles: false });
  expect(() => requirements({ ...definition }, body)).toThrow("another validation");
});

test("explanation retains the actual deadline and opaque prepared input without another guard evaluation", async () => {
  const { definition, body } = fixture(act => { act.guards = [...act.guards, { after: { slot: "due" } }, { rule: "ready" }]; });
  const j = context(definition); j.clock = { reading: t(100), asOf: t(100), behind: false };
  const refused = evaluateAdmitted(body, j, d("a"), {}, 100);
  expect(refused.ran).toEqual({ result: "refused", reason: "guard-failed", detail: "guards.1", prepared: [] });
  expect(explainAdmitted(body, refused)).toEqual({ sourcePath: "acts.edit.guards.1", values: { subject: "on", deadline: t(100), clock: t(100) }, opaque: false, incomplete: false,
    text: `acts.edit.guards.1: after failed (subject="on", deadline=${JSON.stringify(t(100))}, clock=${JSON.stringify(t(100))}).` });
  expect(explainAdmitted(body, evaluateAdmitted(body, j, d("a"), {}, 0))).toMatchObject({ sourcePath: "acts.edit.guards.1", values: {}, incomplete: true });
  j.clock = { reading: t(101), asOf: t(101), behind: false };
  const input = ruleInput(j);
  j.prepared = await evaluateRules([{ rule: "ready", source: "false", input, digest: digestBytes(canonicalBytes(input)) }]);
  const opaque = evaluateAdmitted(body, j, d("a"), {}, 100), exhausted = evaluateAdmitted(body, j, d("a"), {}, 0);
  expect(opaque.ran).toEqual({ result: "refused", reason: "guard-failed", detail: "guards.2", prepared: [...j.prepared] });
  expect(exhausted.ran).toEqual(opaque.ran); expect(exhausted.primitives).toEqual(opaque.primitives); expect(opaque.primitives.prepared).toBe(1);
  expect(explainAdmitted(body, opaque)).toMatchObject({ sourcePath: "acts.edit.guards.2", opaque: true, values: { rule: "ready", input } });
  expect(requirements(definition, body).reads).toContainEqual({ kind: "prepared-input", rule: "ready", parts: ["kind", "fields", "signer", "subjects", "facts"] });
  expect(j.used).toEqual([]);
  const comparison = fixture(act => {
    act.fields = { wanted: { type: "text", max: 200, required: true } };
    act.guards = [{ state: ["draft"] }, { equals: { a: { slot: "text" }, b: { field: "wanted" } } }];
  });
  const comparing = context(comparison.definition); comparing.fields = { wanted: "wanted" };
  const compared = evaluateAdmitted(comparison.body, comparing, d("a"), {}, 100);
  expect(compared.ran).toEqual({ result: "refused", reason: "guard-failed", detail: "guards.1", prepared: [] });
  expect(explainAdmitted(comparison.body, compared)).toMatchObject({ sourcePath: "acts.edit.guards.1", opaque: false, incomplete: false, values: {
    "acts.edit.guards.1.equals.a": "before", "acts.edit.guards.1.equals.b": "wanted",
  } });
  expect(compared.primitives).toMatchObject({ guards: 2, expressions: 2 });
});

test("public Native header observation preserves callback receiver, once count and actual clock outcome with an exhausted trace", () => {
  const definition = valid(validateDefinition(nativeClockCutoverData(), PROPOSED_BOUNDS, undefined, { platform: true }));
  let calls = 0, receiver: unknown;
  const hook = { place: "type" as const, clock: true, run(_given: unknown, value: unknown) { calls++; receiver = this; return typeof value === "number" && value % 2 === 0; } };
  const scene = clockScene(definition, { note: 2 }, { named: "platform:m3-clock@1" as PlatformDefinition, rules: { "clock-value": hook } });
  for (const budget of [undefined, 0, 1]) {
    calls = 0; receiver = null;
    const observed = observeProgram(definition, budget, () => scene.judge());
    expect(observed.value).toMatchObject({ result: "unavailable", reason: "clock-behind" });
    expect(calls).toBe(1); expect(receiver).toBe(hook); expect(observed.primitives.native).toBe(1);
    expect(observed.truncated).toBe(budget === 0);
    expect(observed.trace).toHaveLength(budget === 1 ? 1 : 0);
  }
});

test("scripted implicit hold endings retain unknown workspace requirements and one actual callback and scan across budgets and faults", () => {
  const input = structuredClone(lane);
  input.acts["finish"] = { step: "transition", on: "commitment", grant: "finish", also: {}, fields: {}, guards: [{ state: ["accepted"] }],
    effects: [{ state: "done" }], sends: [], attention: [] };
  const definition = valid(validateDefinition(input, PROPOSED_BOUNDS)), declared = declarationOf(definition);
  const body = namedBody(definition, "act", "finish", "act")!, view = new MemoryState();
  const intent = { ...newItem({ effect: "open", item: 0, type: "intent", state: "open" }, declared.items["intent"]!, d("b")), parties: { requester: keys.rita.member } };
  const commitment = { ...newItem({ effect: "open", item: 1, type: "commitment", state: "accepted" }, declared.items["commitment"]!, d("c")),
    parties: { requester: keys.rita.member, performer: keys.rita.member }, refs: { intent: 0 } };
  const hold = { ...newItem({ effect: "open", item: 2, type: "hold", state: "held" }, declared.items["hold"]!, d("d")),
    parties: { holder: keys.rita.member }, refs: { under: 1 }, values: { until: t(200), epoch: 1 } };
  view.putItem(intent); view.putItem(commitment); view.putItem(hold);
  let calls = 0, receiver: unknown, pages = 0;
  const seen: unknown[] = [], originalPage = view.page.bind(view);
  view.page = (...args) => { pages++; return originalPage(...args); };
  // This dispatcher stands in for the workspace interface, not a real provider or its records.
  const code: Capabilities = {
    implements: () => true,
    guard: () => { throw new Error("unexpected capability guard"); },
    effect: () => { throw new Error("unexpected capability effect"); },
    workspace(givenView, givenDefinition, self, k, holds, working) {
      calls++; receiver = this;
      seen.push([givenView === view, givenDefinition === definition, self, k, holds, working(1)?.state, working(2)]);
      return [];
    },
  };
  const j: Judging = { view, definition, bounds: PROPOSED_BOUNDS, clock: { reading: t(101), asOf: t(101), behind: false },
    scope: { at: otherLane, kind: "lane", creator: null }, self: 20, kind: "finish", fields: {}, fieldTypes: {}, subjects: new Map([["on", commitment]]),
    signer: { member: keys.rita.member, principal: null }, facts: new Map(), prepared: [], used: [], ran: { clock: false }, capabilities: code };
  const expected = { result: "ran", effects: [{ effect: "state", item: 1, state: "done" }, { effect: "hold", item: 2, change: "end", epoch: 2 }],
    sends: [], prepared: [], judgesTime: false, settles: false };
  const required = requirements(definition, body);
  expect(required.reads).toContainEqual({ kind: "opaque", reason: "capability workspace: unknown interior requirements" });
  expect(required.reads).toContainEqual({ kind: "scan", type: "hold", states: ["held"] });
  expect(required.reads).toContainEqual({ kind: "bounds" });
  for (const budget of [undefined, 0, 100]) {
    calls = 0; pages = 0; receiver = null; seen.length = 0;
    const observed = evaluateAdmitted(body, j, d("a"), {}, budget);
    expect(observed.ran).toEqual(expected);
    expect(calls).toBe(1); expect(receiver).toBe(code); expect(pages).toBe(1);
    expect(seen).toEqual([[true, true, 20, 0, [{ effect: "hold", item: 2, change: "end", epoch: 2 }], "done", null]]);
    expect(observed.primitives).toMatchObject({ bodies: 1, guards: 1, effects: 1, capabilities: 1, native: 0 });
    expect(observed.truncated).toBe(budget === 0);
    if (budget === 100) expect(observed.trace.find(event => event.primitive === "capabilities" && event.op === "workspace"))
      .toMatchObject({ body, result: "returned", reads: { opaque: true, dependencies: "unknown", hook: "workspace" } });
    expect(view.item(1)?.state).toBe("accepted"); expect(view.item(2)?.values["epoch"]).toBe(1);
  }
  const hook = code.workspace!;
  code.workspace = function () { calls++; throw new Error("workspace fault"); };
  calls = 0;
  expect(() => evaluateAdmitted(body, j, d("a"), {}, 1)).toThrow("workspace fault");
  expect(calls).toBe(1);
  code.workspace = hook; calls = 0; seen.length = 0;
  expect(evaluateAdmitted(body, j, d("a"), {}, 0).ran).toEqual(expected);
  expect(calls).toBe(1);
});

test("scripted opaque refusals name the actual Native or capability boundary and explaining a nested guard never repeats its callback", () => {
  // These local dispatchers prove captured diagnostics, not a provider, authority check or journal.
  for (const [kind, nested] of [["capability", false], ["capability", true], ["Native", false]] as const) {
    const native = kind === "Native", input = structuredClone(native ? small : capabilityStagingData()) as PlatformData;
    if (native) { input.name = "platform:opaque-diagnostics"; input.outcomes = {}; }
    const act = input.acts["edit"]!, capability: Guard = { capability: { name: "hold", guard: "staged", with: { commit: { const: C1 }, under: { item: "on" } } } };
    // Native marks belong only in the written top-level list. The admitted capability guard also nests.
    act.guards = native ? [{ code: "opaque", row: "diagnostic" }] : nested ? [{ anyOf: [[capability]] }] : [capability];
    act.effects = []; act.sends = []; act.attention = [];
    const definition = valid(validateDefinition(input, PROPOSED_BOUNDS, undefined, { platform: native })), body = namedBody(definition, "act", "edit", "act")!, j = context(definition);
    let calls = 0, receiver: unknown;
    const nativeRule = { place: "guard" as const, refusals: ["blocked"], run() { calls++; receiver = this; return { holds: false as const, name: "blocked" }; } };
    const capabilities: Capabilities = { implements: () => true,
      guard() { calls++; receiver = this; return "not-staged"; },
      effect() { throw new Error("a refused guard must not reach effects"); } };
    j.judged = { type: "act", signed: signIntent({ v: 1, to: otherLane, actor: keys.rita.key, kind: "edit", on: 1, expected: {}, fields: {}, idempotencyKey: "opaque", notAfter: t(200) }, keys.rita.secret), grant: null, presented: {} };
    if (native) j.platform = { named: "platform:opaque-diagnostics@1" as PlatformDefinition, rules: { opaque: nativeRule } };
    else j.capabilities = capabilities;
    const expected = nested ? { result: "refused", reason: "guard-failed", detail: "guards.0", prepared: [] }
      : { result: "refused", reason: native ? "guard-failed" : "capability-refused", name: native ? "blocked" : "not-staged", detail: "guards.0", prepared: [] };
    for (const budget of [0, 100]) {
      calls = 0; receiver = null;
      const evaluated = evaluateAdmitted(body, j, d("a"), {}, budget);
      expect(evaluated.ran).toEqual(expected); expect(calls).toBe(1); expect(receiver).toBe(native ? nativeRule : capabilities);
      const explained = explainAdmitted(body, evaluated);
      expect(explainAdmitted(body, evaluated)).toEqual(explained); expect(calls).toBe(1);
      expect(explained.sourcePath).toBe("acts.edit.guards.0"); expect(explained.incomplete).toBe(budget === 0);
      if (budget === 100) {
        expect(explained.opaque).toBe(true);
        expect(explained.text).toContain(native ? "The Native rule body is opaque." : "The capability body is opaque.");
      }
    }
  }
});
