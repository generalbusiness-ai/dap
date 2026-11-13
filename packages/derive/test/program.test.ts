/** Admitted bodies over scripted resolved state; public Grow judgments run in watering.test.ts. */
import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS, type ActType, type DeclaredDefinition, type ItemType, type PlatformData, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalBytes, digestBytes, signIntent } from "@generalbusiness/dap-bytes";
import { room } from "../../../examples/grow/room.ts";
import { executeBody, type Ran } from "../src/program/body.ts";
import { checkedBody, guardPlan, namedBody, type BodyStructure, type GuardNode } from "../src/program/structure.ts";
import { ruleInput, type Judging } from "../src/guards.ts";
import { newItem } from "../src/fold.ts";
import { MemoryState } from "../src/state.ts";
import { validateDefinition, type ValidDefinition } from "../src/validate/index.ts";
import { evaluateRules } from "../src/rule/index.ts";
import { evaluateAdmitted, explainAdmitted as explain } from "../src/program/interpret.ts";
import { requirements } from "../src/program/requirements.ts";
import { observeProgram } from "../src/program/observe.ts";
import { judgeGuardNodes } from "../src/program/guard-value.ts";
import { readValue } from "../src/program/read-value.ts";
import { resolvedReads, type OperandRead } from "../src/program/reads.ts";
import type { GuardSite } from "../src/program/guard-plan.ts";
import type { Defining } from "../src/validate/context.ts";
import { copy } from "../src/validate/operands.ts";
import { C1, capabilityStagingData } from "./definition-corpus/capability-staging-data.ts";
import { d, directory, keys, t, valid, variant } from "./fixtures.ts";

const bounds = PROPOSED_BOUNDS, cause = d("a"), grow = valid(validateDefinition(room, bounds));
const act = (body: Partial<ActType> & Pick<ActType, "step" | "on">): ActType => ({ grant: "test", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...body });
const note: ItemType = { many: true, max: 3, initial: "live", states: { live: { final: false }, done: { final: true } }, parties: {},
  refs: { peer: { fixed: false, required: false, to: { type: "scope", kind: "directory" } } },
  values: { text: { fixed: false, required: false, of: { type: "text", max: 50 }, default: "old" }, until: { fixed: false, required: false, of: { type: "time" } } } };
const raw: DeclaredDefinition = { format: "artroom-definition-1", name: "typed-program-fixture", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "found", items: { note }, receives: {}, timed: {}, rules: { ready: "true" },
  acts: {
    found: act({ step: "open", on: "note" }),
    send: act({ step: "transition", on: "note", also: { other: { item: "note", by: "other" } }, fields: { next: { type: "scope", kind: "directory", required: true }, other: { type: "item", of: "note", required: false }, text: { type: "text", max: 50, required: false }, unused: { type: "bool", required: false } },
      guards: [{ state: ["live"] }], effects: [{ state: "done" }, { ref: { slot: "peer", from: { field: "next" } } }, { value: { slot: "text", from: { field: "text" } } }],
      sends: [{ tell: { to: { slot: "peer", of: "also.other" }, message: "omitted", fields: {}, result: {} } }, { tell: { to: { slot: "peer" }, message: "changed", if: [{ state: ["live"] }], fields: { text: { slot: "text" }, self: "self" }, result: {} } }],
    }),
    window: act({ step: "transition", on: "note", guards: [{ state: ["live"] }, { after: { slot: "until" } }, { rule: "ready" }] }),
    open: act({ step: "open", on: "note", fields: { peer: { type: "scope", kind: "directory", required: false } }, effects: [{ ref: { slot: "peer", from: { field: "peer" } } }], sends: [{ tell: { to: { slot: "peer" }, message: "opened", fields: {}, result: {} } }] }),
  },
};
const fixture = valid(validateDefinition(raw, bounds));
function program(definition: ValidDefinition, kind: string): BodyStructure {
  const body = namedBody(definition, "act", kind, "act");
  if (!body) return expect.fail(`the admitted act must have a complete program: acts.${kind}`);
  checkedBody(definition, body);
  return body;
}
const evaluate = (body: BodyStructure, j: Judging, first = 0, budget?: number) => evaluateAdmitted(body, j, cause, { first }, budget);
function context(definition: ValidDefinition, kind: string): Judging {
  const view = new MemoryState();
  return { view, definition, bounds, clock: { reading: t(101), behind: false, asOf: t(101) }, scope: { at: directory, kind: "directory", creator: null }, self: 20, kind,
    fields: {}, fieldTypes: definition.declared.acts[kind]!.fields, subjects: new Map(), signer: { member: keys.rita.member, principal: null }, facts: new Map(), prepared: [], used: [], ran: { clock: false } };
}
function item(definition: ValidDefinition, type: string, id: number) {
  const declaration = definition.declared.items[type]!;
  return newItem({ effect: "open", item: id, type, state: declaration.initial }, declaration, d("b"));
}
async function water(amount = 400, time = 101, policyPresent = true): Promise<Judging> {
  const j = context(grow, "water"), zone = item(grow, "zone", 1), policy = { ...item(grow, "water-policy", 2), values: { opensAt: t(100), closesAt: t(200), maxMl: 400 } };
  j.clock = { reading: t(time), asOf: t(time), behind: false }; j.fields = { zone: 1, amountMl: amount, reason: "Scheduled irrigation." };
  j.subjects = new Map([...[ ["also.zone", zone] as const ], ...(policyPresent ? [["also.policy", policy] as const] : [])]);
  (j.view as MemoryState).putItem(zone);
  const input = ruleInput(j);
  j.prepared = await evaluateRules([{ rule: "water-amount", source: grow.declared.rules["water-amount"]!, input, digest: digestBytes(canonicalBytes(input)) }]);
  return j;
}
function agree(j: Judging, body = program(j.definition, j.kind), first = 0): Ran {
  const runtime = { ...j, used: [], ...(j.asked === undefined ? {} : { asked: [] }), ran: { clock: j.ran?.clock === true } };
  const expected = executeBody(runtime, namedBody(j.definition, "act", j.kind, "act"), cause, { first });
  const plain = evaluate(body, j, first), traced = evaluate(body, j, first, 10000), exhausted = evaluate(body, j, first, 0);
  expect(plain.ran).toEqual(expected); expect(traced.ran).toEqual(expected); expect(exhausted.ran).toEqual(expected);
  expect(canonicalBytes(exhausted.ran)).toEqual(canonicalBytes(plain.ran));
  expect(traced.asked).toEqual(runtime.asked ?? []); expect(traced.primitives).toEqual(plain.primitives); expect(exhausted.primitives).toEqual(plain.primitives);
  expect(j.used).toEqual([]); if (j.asked) expect(j.asked).toEqual([]);
  expect(exhausted.truncated).toBe(traced.trace.length > 0);
  return plain.ran;
}

describe("typed derivation program", () => {
  test("Grow water produces the complete literal Ran and consumes one real prepared Boolean", async () => {
    const j = await water(), prepared = j.prepared[0]!;
    expect(prepared.result).toBe(true);
    expect(agree(j)).toEqual({ result: "ran", effects: [
      { effect: "open", item: 20, type: "watering", state: "asked" }, { effect: "state", item: 20, state: "done" },
      { effect: "ref", item: 20, slot: "zone", to: 1 }, { effect: "value", item: 20, slot: "amountMl", value: 400 },
      { effect: "value", item: 20, slot: "mode", value: "scheduled" }, { effect: "value", item: 20, slot: "reason", value: "Scheduled irrigation." },
      { effect: "party", item: 20, slot: "performedBy", member: keys.rita.member }, { effect: "value", item: 20, slot: "performedTime", value: t(101) },
      { effect: "ref", item: 20, slot: "performedAt", to: 20 },
    ], sends: [], prepared: [prepared], judgesTime: true, settles: false });
  });
  test.each([[99, "guards.1"], [100, "guards.1"], [200, "guards.2"]] as const)("Grow water at %i refuses at %s before consuming preparation", async (time, detail) => {
    expect(agree(await water(400, time))).toEqual({ result: "refused", reason: "guard-failed", detail, prepared: [] });
  });
  test("Grow amount refusal names its opaque rule and missing policy skips time guards", async () => {
    for (const j of [await water(401), await water(400, 101, false)]) {
      expect(j.prepared[0]!.result).toBe(false);
      expect(agree(j)).toEqual({ result: "refused", reason: "guard-failed", name: "watering-exceeds-schedule", detail: "guards.3", prepared: [j.prepared[0]] });
    }
  });
  test("a stale prepared digest and a clock behind history preserve unavailable reasons", async () => {
    const j = await water(); j.prepared = [{ ...j.prepared[0]!, input: d("c") }];
    expect(agree(j)).toEqual({ result: "unavailable", reason: "unavailable" });
    j.clock = { ...j.clock, behind: true };
    expect(agree(j)).toEqual({ result: "unavailable", reason: "clock-behind" });
  });
  test("a tell tests the before state, reads the working payload, and skips no ordinal", () => {
    const j = context(fixture, "send"), on = item(fixture, "note", 1); j.subjects = new Map([["on", on]]); (j.view as MemoryState).putItem(on);
    j.fields = { next: directory, text: "new" };
    const expected = { result: "ran", effects: [{ effect: "state", item: 1, state: "done" }, { effect: "ref", item: 1, slot: "peer", to: directory }, { effect: "value", item: 1, slot: "text", value: "new" }],
      sends: [{ n: 4, to: directory, message: { class: "request", type: "tell", body: { message: "changed", fields: { text: "new", self: { self: true } } } } }], prepared: [], judgesTime: false, settles: false };
    expect(agree(j, undefined, 4)).toEqual(expected);
    j.fields = { ...j.fields, unused: true }; expect(agree(j, undefined, 4)).toEqual(expected);
    expect(requirements(fixture, program(fixture, "send")).reads).toContainEqual({ kind: "field", name: "text", presence: true });
    j.fields = { ...j.fields, text: "changed" };
    expect(agree(j, undefined, 4)).toEqual({ result: "ran", effects: [{ effect: "state", item: 1, state: "done" }, { effect: "ref", item: 1, slot: "peer", to: directory }, { effect: "value", item: 1, slot: "text", value: "changed" }],
      sends: [{ n: 4, to: directory, message: { class: "request", type: "tell", body: { message: "changed", fields: { text: "changed", self: { self: true } } } } }], prepared: [], judgesTime: false, settles: false });
  });
  test("an absent source leaves the default and an explicit clear records null", () => {
    const j = context(fixture, "send"), on = item(fixture, "note", 1); j.subjects = new Map([["on", on]]); j.fields = { next: directory };
    const result = agree(j); expect(result).toEqual({ result: "ran", effects: [{ effect: "state", item: 1, state: "done" }, { effect: "ref", item: 1, slot: "peer", to: directory }],
      sends: [{ n: 0, to: directory, message: { class: "request", type: "tell", body: { message: "changed", fields: { text: "old", self: { self: true } } } } }], prepared: [], judgesTime: false, settles: false });
    const cleared = variant(raw, data => { data.acts.send.effects[2].value.from = null; });
    const clear = agree({ ...j, definition: cleared });
    expect(clear).toEqual({ result: "ran", effects: [{ effect: "state", item: 1, state: "done" }, { effect: "ref", item: 1, slot: "peer", to: directory }, { effect: "value", item: 1, slot: "text", value: null }],
      sends: [{ n: 0, to: directory, message: { class: "request", type: "tell", body: { message: "changed", fields: { self: { self: true } } } } }], prepared: [], judgesTime: false, settles: false });
    if (clear.result === "ran") {
      const message = clear.sends[0]!.message;
      expect(message.class).toBe("request");
      if (message.class === "request") expect((message.body as { fields: object }).fields).not.toHaveProperty("text");
    }
  });
  test("a non-final opening checks the live limit after sends", () => {
    const j = context(fixture, "open"); (j.view as MemoryState).addCount("note", "live", 3);
    expect(agree(j)).toEqual({ result: "refused", reason: "send-unresolved", detail: "sends.0: the slot peer holds no scope", prepared: [] });
    j.fields = { peer: directory };
    expect(agree(j)).toEqual({ result: "refused", reason: "type-full", detail: "note has 3 live items", prepared: [] });
  });
  test("preparation collects once, unavailable does not hide a later false guard, and structural time includes skipped reads", () => {
    const definition = variant(raw, data => { data.acts.window.guards = [{ rule: "ready" }, { state: ["live"] }, { after: { slot: "until" } }, { rule: "ready" }]; });
    const j = context(definition, "window"), on = { ...item(definition, "note", 1), values: { until: t(100), text: "old" } }; j.subjects = new Map([["on", on]]);
    j.asked = []; expect(agree(j)).toEqual({ result: "ran", effects: [], sends: [], prepared: [], judgesTime: true, settles: false });
    const collected = evaluate(program(definition, "window"), j); expect(collected.asked).toHaveLength(1);
    delete j.asked; j.subjects = new Map([["on", { ...on, state: "done" }]]);
    expect(agree(j)).toEqual({ result: "refused", reason: "guard-failed", detail: "guards.1", prepared: [] });
  });
  test("complete set guards run and unadmitted programs refuse at their declaration path before any primitive or callback", () => {
    const set = variant(raw, data => { data.acts.window.guards = [{ state: ["live"] }, { set: "text" }]; });
    const setting = context(set, "window"); setting.subjects = new Map([["on", item(set, "note", 1)]]);
    expect(agree(setting)).toEqual({ result: "ran", effects: [], sends: [], prepared: [], judgesTime: false, settles: false });
    // These dispatchers expose callback counts at the resolved body boundary.
    // They establish no native authority, provider or journal outcome.
    for (const prefix of ["Native", "capability"] as const) {
      const input = structuredClone(capabilityStagingData()) as PlatformData;
      input.name = "platform:coverage-refusal"; input.outcomes = {};
      const act = input.acts["edit"]!;
      const native = { code: "first", row: "coverage" } as const, capability = { capability: { name: "hold", guard: "staged", with: { commit: { const: C1 }, under: { item: "on" } } } } as const;
      act.guards = prefix === "Native" ? [native, capability] : [capability, native];
      act.effects = []; act.sends = []; act.attention = [];
      const definition = valid(validateDefinition(input, bounds, undefined, { platform: true })), body = program(definition, "edit"), j = context(definition, "edit");
      j.subjects = new Map([["on", item(definition, "note", 1)]]);
      let nativeCalls = 0, capabilityCalls = 0;
      j.platform = { named: "platform:coverage-refusal@1" as PlatformDefinition, rules: { first: { place: "guard", refusals: [], run() { nativeCalls++; return { holds: true as const }; } } } };
      j.capabilities = { implements: () => true, guard() { capabilityCalls++; return true as const; }, effect() { throw new Error("no effect may run"); } };
      j.judged = { type: "act", signed: signIntent({ v: 1, to: directory, actor: keys.rita.key, kind: "edit", on: 1, expected: {}, fields: {}, idempotencyKey: "coverage", notAfter: t(200) }, keys.rita.secret), grant: null, presented: {} };
      const nodes = body.nodes.filter((node): node is GuardNode => node.category === "guard");
      const observed = observeProgram(definition, 100, () => {
        let refusal: unknown;
        try { judgeGuardNodes(j, body, [nodes[0]!, { ...nodes[1]! }]); } catch (error) { refusal = error; }
        return refusal;
      });
      expect(observed.value).toBeInstanceOf(TypeError);
      expect((observed.value as Error).message).toContain("at acts.edit.guards.1");
      expect(observed.primitives).toEqual({ bodies: 0, expressions: 0, guards: 0, effects: 0, sends: 0, prepared: 0, scans: 0, native: 0, capabilities: 0 });
      expect([nativeCalls, capabilityCalls]).toEqual([0, 0]); expect(observed.trace).toEqual([]);
      const incomplete = { ...body, nodes: body.nodes.slice(0, 1) };
      const refused = observeProgram(definition, 100, () => {
        let refusal: unknown;
        try { evaluate(incomplete, j); } catch (error) { refusal = error; }
        return refusal;
      });
      expect(refused.value).toBeInstanceOf(TypeError);
      expect((refused.value as Error).message).toContain("at acts.edit");
      expect(refused.primitives).toEqual(observed.primitives);
      expect([nativeCalls, capabilityCalls]).toEqual([0, 0]);
    }
  });
  test("admission and owned instructions reject forged reads, incompatible assignment, invalid literals and working-phase guards", () => {
    const read = resolvedReads(fixture)!.operands.find(read => read.path === "acts.send.effects.2.value.from")!, j = context(fixture, "send");
    let reads = 0;
    Object.defineProperty(j, "fields", { get() { reads++; return { text: "current" }; } });
    expect(() => readValue(j, { ...read }, null)).toThrow("not admitted"); expect(reads).toBe(0);
    const body = program(fixture, "window"), node = body.nodes[1]!;
    if (node.category !== "guard") return expect.fail("expected the admitted time guard");
    const plan = guardPlan(fixture, body, node)!;
    expect(plan.site.phase).toBe("before");
    expect(() => Object.assign(plan.site, { phase: "working" })).toThrow(TypeError);
    const assignment = structuredClone(raw);
    assignment.acts["window"]!.fields["bad"] = { type: "bool", required: true };
    assignment.acts["window"]!.effects = [{ value: { slot: "until", from: { field: "bad" } } }];
    expect(validateDefinition(assignment, bounds)).toEqual({ ok: false, problems: [{ code: "name", path: "acts.window.effects.0.value.from", message: "names no source of the slot's type" }] });
    const literal = structuredClone(raw);
    literal.items["note"]!.values["limited"] = { fixed: false, required: false, of: { type: "int", min: 1, max: 2 } };
    literal.acts["window"]!.effects = [{ value: { slot: "limited", from: { const: 3 } } }];
    expect(validateDefinition(literal, bounds)).toEqual({ ok: false, problems: [{ code: "shape", path: "acts.window.effects.0.value.from", message: "is not a value of the slot's type" }] });
  });
  test.each([
    { type: "fact", kind: ["found"], under: raw.name },
    { type: "fact", kind: ["send"], under: "another-definition" },
  ] as const)("admission refuses self under the incompatible nominal fact type %j", descriptor => {
    const input = structuredClone(raw);
    input.items["note"]!.refs["record"] = { fixed: false, required: false, to: descriptor };
    input.acts["send"]!.effects = [{ ref: { slot: "record", from: "self" } }];
    expect(validateDefinition(input, bounds)).toEqual({ ok: false, problems: [{ code: "name", path: "acts.send.effects.0.ref.from",
      message: "self is the item this entry opens, in a slot that refers to an item of that type; or this entry, in a slot for a fact of its kind under this definition" }] });
  });
  test("an admitted program owns its frozen guard and keeps the same literal result after caller mutation", () => {
    const input = structuredClone(raw), act = input.acts["send"]!;
    const states = ["live"]; act.guards = [{ state: states }]; act.effects = []; act.sends = [];
    const definition = valid(validateDefinition(input, bounds)), body = program(definition, "send"), j = context(definition, "send");
    j.subjects = new Map([["on", item(definition, "note", 1)]]);
    const before = evaluate(body, j).ran;
    expect(before).toEqual({ result: "ran", effects: [], sends: [], prepared: [], judgesTime: false, settles: false });
    const guard = body.nodes[0]!;
    if (guard.category !== "guard" || guard.op !== "state") return expect.fail("expected the admitted state guard");
    expect([Object.isFrozen(body), Object.isFrozen(guard.data.state), Object.isFrozen(states)]).toEqual([true, true, false]);
    expect(() => { (guard.data.state as string[])[0] = "done"; }).toThrow(TypeError);
    states[0] = "done";
    expect(evaluate(body, j).ran).toEqual(before);
  });
  test("a Grow refusal display names the source and the actual deadline and supplied time", async () => {
    const j = await water(400, 100), body = program(grow, "water"), result = evaluate(body, j, 0, 100);
    expect(explain(body, result)).toEqual({ sourcePath: "acts.water.guards.1", values: { subject: "also.policy", deadline: t(100), clock: t(100) }, opaque: false, incomplete: false,
      text: `acts.water.guards.1: after failed (subject="also.policy", deadline=${JSON.stringify(t(100))}, clock=${JSON.stringify(t(100))}).` });
    expect(explain(body, evaluate(body, j, 0, 0))).toMatchObject({ incomplete: true, values: {}, sourcePath: "acts.water.guards.1" });
    const amount = await water(401), opaque = explain(body, evaluate(body, amount, 0, 100));
    expect(opaque).toMatchObject({ sourcePath: "acts.water.guards.3", opaque: true, values: { input: ruleInput(amount) } });
    expect(opaque.text).toContain("The prepared rule body is opaque.");
  });
  test("the structural visitor includes skipped clock reads and the complete opaque input", async () => {
    const definition = variant(raw, data => { data.acts.send.effects.push({ value: { slot: "until", from: { time: { plusSeconds: 1 } } }, if: [{ of: "also.other", state: ["live"] }, { after: { slot: "until" } }] }); });
    const j = context(definition, "send"), on = item(definition, "note", 1); j.subjects = new Map([["on", on]]); j.fields = { next: directory, text: "new" };
    expect(agree(j)).toEqual({ result: "ran", effects: [{ effect: "state", item: 1, state: "done" }, { effect: "ref", item: 1, slot: "peer", to: directory }, { effect: "value", item: 1, slot: "text", value: "new" }],
      sends: [{ n: 0, to: directory, message: { class: "request", type: "tell", body: { message: "changed", fields: { text: "new", self: { self: true } } } } }], prepared: [], judgesTime: true, settles: false });
    const body = program(definition, "send"), captured = evaluate(body, j, 0, 100);
    expect(captured.trace.some(event => event.op === "after" || event.op === "time")).toBe(false);
    expect(requirements(definition, body).reads).toContainEqual({ kind: "clock" });
    expect(requirements(definition, body).reads).toContainEqual({ kind: "subject", name: "on", phase: "before", part: "slot:value:until" });
    expect(requirements(definition, body).reads).not.toContainEqual({ kind: "field", name: "unused", presence: true });
    const waterBody = program(grow, "water"), reads = requirements(grow, waterBody).reads;
    expect(reads).toContainEqual({ kind: "prepared-input", rule: "water-amount", parts: ["kind", "fields", "signer", "subjects", "facts"] });
    expect(reads.some(read => read.kind === "opaque")).toBe(true);
    expect(reads).toContainEqual({ kind: "live-count", type: "watering", state: "asked" });
    const incoming = await water(); incoming.ran = { clock: true }; expect(agree(incoming)).toEqual({ result: "ran", effects: [
      { effect: "open", item: 20, type: "watering", state: "asked" },
      { effect: "state", item: 20, state: "done" },
      { effect: "ref", item: 20, slot: "zone", to: 1 },
      { effect: "value", item: 20, slot: "amountMl", value: 400 },
      { effect: "value", item: 20, slot: "mode", value: "scheduled" },
      { effect: "value", item: 20, slot: "reason", value: "Scheduled irrigation." },
      { effect: "party", item: 20, slot: "performedBy", member: keys.rita.member },
      { effect: "value", item: 20, slot: "performedTime", value: t(101) },
      { effect: "ref", item: 20, slot: "performedAt", to: 20 },
    ],
      sends: [], prepared: [{ rule: "water-amount", input: "sha256:c8e36a7d2bf533d8e3d29cb812c936224dfa3a3aef8b4c68db28c6616605e58f", result: true }], judgesTime: true, settles: false });
    const noClock = context(fixture, "found"); noClock.ran = { clock: true }; expect(agree(noClock)).toEqual({ result: "ran", effects: [{ effect: "open", item: 20, type: "note", state: "live" }], sends: [], prepared: [], judgesTime: true, settles: false });
  });
  test("effect conditions evaluate unless after false if and retain unavailable precedence", async () => {
    const definition = variant(raw, data => { data.acts.window.guards = [{ state: ["live"] }]; data.acts.window.effects = [{ value: { slot: "text", from: { const: "ignored" } }, if: [{ state: ["done"] }], unless: [{ rule: "ready" }] }]; });
    const j = context(definition, "window"), on = item(definition, "note", 1); j.subjects = new Map([["on", on]]);
    const input = ruleInput(j); j.prepared = await evaluateRules([{ rule: "ready", source: "true", input, digest: digestBytes(canonicalBytes(input)) }]);
    expect(agree(j)).toEqual({ result: "ran", effects: [], sends: [], prepared: [...j.prepared], judgesTime: false, settles: false });
    const precedence = variant(raw, data => { data.acts.window.guards = [{ state: ["live"] }]; data.acts.window.effects = [{ value: { slot: "text", from: { const: "ignored" } }, if: [{ rule: "ready" }], unless: [{ after: { slot: "until" } }] }]; });
    const pending = context(precedence, "window"); pending.subjects = j.subjects; pending.clock = { ...pending.clock, behind: true };
    expect(agree(pending)).toEqual({ result: "unavailable", reason: "unavailable" });
    const suppressed = variant(raw, data => { data.acts.window.guards = [{ state: ["live"] }]; data.acts.window.effects = [{ value: { slot: "text", from: { const: "ignored" } }, if: [{ rule: "ready" }], unless: [{ state: ["live"] }] }]; });
    expect(agree({ ...context(suppressed, "window"), subjects: j.subjects })).toEqual({ result: "ran", effects: [], sends: [], prepared: [], judgesTime: false, settles: false });
  });
});

// Compile-only obligations. The invariant descriptor and phase parameters must stay incompatible.
function typeObligations(defining: Defining, time: { type: "time" }, bool: { type: "bool" }, working: OperandRead & { phase: "working" }, site: GuardSite) {
  // @ts-expect-error A Boolean cannot enter a time slot.
  copy(defining, bool, time, "assignment", "source");
  // @ts-expect-error A working read cannot become a before-state guard.
  const before: GuardSite = { ...site, phase: working.phase };
  void before;
}
void typeObligations;
