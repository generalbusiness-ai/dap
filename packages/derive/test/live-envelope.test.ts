import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type FieldType } from "@generalbusiness/dap-contract";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { LiveBindings } from "../src/live-binding.ts";
import type { Type } from "../src/validate/context.ts";
import { liveHeldItemEnvelope, livePermanentMetadata, liveStateBuckets } from "../src/validate/live-envelope.ts";
import { memberBytes } from "../src/validate/sizes.ts";
import { keys, Scope, valid } from "./fixtures.ts";
import { liveBase } from "./definition-corpus/live-data.ts";
import { validateDefinition } from "../src/index.ts";

const nested: FieldType = { type: "record", of: { 'q"\\\n': { type: "list", max: 2, required: true, of: { type: "reference", fragment: 8 } } } };
const type: Type = { name: 'type"\\', initial: "open", states: new Map([["open", false], ["ended", true]]), slots: new Map([
  ['slot"\\', { kind: "value", fixed: true, required: false, list: false, type: nested, hasDefault: false }],
]) };
const cost = (name: string, key: unknown, value: unknown): number => utf8(canonicalize([name, key, value])).length;

test("the item envelope covers nested escaped fixed rows and both dependency directions", () => {
  const declared = liveBase(false);
  declared.items["tally"]!.values['slot"\\'] = { fixed: true, required: false, of: nested };
  const definition = valid(validateDefinition(declared, PROPOSED_BOUNDS));
  const scope = new Scope(definition, keys.rita.member);
  const ref = { at: scope.at, seq: 100, hash: scope.head.hash };
  const raw = { 'q"\\\n': [{ entry: ref, fragment: '\n"\\' }, { entry: { ...ref, seq: 101 } }] };
  const name = 'slot"\\', actualType = { ...type, name: "tally" }, id = canonicalize([0, 0, 1]), state = "open";
  const bindings = new LiveBindings(new Map([["tally", actualType]]));
  const rawKey = canonicalize(raw), dep = [100, 101].map(seq => canonicalize([seq, ref.hash]));
  const item = { ...scope.state.item(0)!, id: 1, type: actualType.name, state, values: { ...scope.state.item(0)!.values, [name]: raw } };
  const fixed = { item: 1, state: 0, raw, key: rawKey };
  const records = [cost("index-edge", canonicalize([0, 0]), 1),
    cost("fixedRows", id, fixed), cost("fixedRaw", id, rawKey),
    cost("fixedCounts", canonicalize([0, 0, 0, rawKey, 0]), 1),
    cost("fixedCounts", canonicalize([1, 0, 0, rawKey, 0]), 1),
    cost("fixedRowDependencies", id, [])];
  for (const key of dep) records.push(cost("fixedRowDependency-edge", id, key), cost("fixedDependencies", key, []), cost("fixedDependency-edge", key, id));
  expect(records.reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(liveHeldItemEnvelope(definition, actualType, item, scope.at, bindings));
});

test("empty buckets and permanent active metadata fit their separately charged envelopes", () => {
  const scope = new Scope(valid(validateDefinition(liveBase(false), PROPOSED_BOUNDS)), keys.rita.member);
  const state = scope.state.scope()!;
  const bindings = new LiveBindings(new Map([[type.name, type]]));
  const buckets = [...type.states.keys()].reduce((sum, name) => {
    const ordinal = bindings.state(type.name, name), key = canonicalize([0, ordinal]);
    return sum + cost("index-bucket", key, []) + cost("counts", key, [0, ordinal, 0]);
  }, 0);
  expect(buckets).toBeLessThanOrEqual(liveStateBuckets(type, bindings));
  const future = { ...state, head: { seq: Number.MAX_SAFE_INTEGER, hash: state.head.hash }, time: state.time };
  expect(cost("scope", null, future)).toBeLessThanOrEqual(livePermanentMetadata(state, scope.definition.digest));
});

test("unsafe timer arithmetic is refused by the pure envelope", async () => {
  const { liveTimedAppend } = await import("../src/validate/live-envelope.ts");
  expect(() => liveTimedAppend(type, [], { ...PROPOSED_BOUNDS, entryBytes: Number.MAX_SAFE_INTEGER })).toThrow(RangeError);
});

test("a timed hash and a detached digest fit the type's append allowance", async () => {
  const { liveTimedAppend } = await import("../src/validate/live-envelope.ts");
  const withText: Type = { ...type, slots: new Map([["text", { kind: "value", fixed: false, required: false, list: false,
    type: { type: "text", max: 32, detached: true }, hasDefault: false }]]) };
  const rule = { on: type.name, states: ["open"], deadline: "until", effects: [{ value: { slot: "text", from: { const: "digest" } } }, { state: "ended" }], attention: [] } as const;
  const allowance = liveTimedAppend(withText, [rule], PROPOSED_BOUNDS);
  const digest = "a".repeat(72), key = canonicalize([1, "text"]);
  expect(cost("fixedHashes", 2, digest) + cost("texts", key, [1, "text", [digest]])).toBeLessThanOrEqual(allowance);
  expect(allowance).toBeGreaterThan(liveTimedAppend(withText, [], PROPOSED_BOUNDS));
});

test("an admitted timed author copy reserves the member carried by its entry", async () => {
  const { liveTimedAppend } = await import("../src/validate/live-envelope.ts");
  const { liveForms } = await import("./definition-corpus/live-data.ts");
  const declaration = liveForms.timed();
  declaration.items["lease"]!.parties = {
    source: { fixed: false, required: false, list: false, author: false },
    author: { fixed: false, required: false, list: false, author: true },
  };
  declaration.acts["lease"]!.effects = [...declaration.acts["lease"]!.effects, { party: { slot: "source", from: { signer: true } } }];
  declaration.timed["expire"]!.effects = [{ party: { slot: "author", from: { slot: "source" } } }, { state: "ended" }];
  expect(validateDefinition(declaration, PROPOSED_BOUNDS).ok).toBe(true);
  const lease: Type = { name: "lease", initial: "open", states: new Map([["open", false], ["ended", true]]), slots: new Map([
    ["source", { kind: "party", fixed: false, required: false, list: false, type: { type: "member" }, hasDefault: false }],
    ["author", { kind: "party", fixed: false, required: false, list: false, type: { type: "member" }, hasDefault: false }],
  ]) };
  const none = liveTimedAppend(lease, [], PROPOSED_BOUNDS);
  expect(liveTimedAppend(lease, [declaration.timed["expire"]!], PROPOSED_BOUNDS) - none).toBe(memberBytes(PROPOSED_BOUNDS) + 1);
});

test("an unset optional fixed reference list can have an envelope above one GiB", () => {
  const declared = liveBase();
  declared.items["tally"]!.values["references"] = { fixed: true, required: false, of: {
    type: "list", max: 64, of: { type: "reference", fragment: 65_536 },
  } };
  expect(validateDefinition(declared, PROPOSED_BOUNDS).ok).toBe(true);
  const wide: Type = { name: "tally", initial: "open", states: new Map([["open", false], ["closed", true]]), slots: new Map([
    ["references", { kind: "value", fixed: true, required: false, list: false, type: { type: "list", max: 64, of: { type: "reference", fragment: 65_536 } }, hasDefault: false }],
  ]) };
  // The slot is absent from the opening act, yet the static envelope pays its maximum.
  expect(declared.acts["found"]!.effects).toEqual([]);
  const raw = 2 + 64 * (1 + 32 + 288 + 6 * 65_536);
  // The former two nested 6x JSON-string estimates for two count keys.
  const oldCounts = 2 * (2 + 6 * (2 + 6 * raw));
  expect(oldCounts).toBeGreaterThan(1024 ** 3);
  const definition = valid(validateDefinition(declared, PROPOSED_BOUNDS));
  const scope = new Scope(definition);
  const held = scope.state.item(0)!;
  expect(held.values["references"]).toBeNull();
  expect(liveHeldItemEnvelope(definition, wide, held, scope.at, new LiveBindings(new Map([["tally", wide]])))).toBeLessThan(1024 ** 3);
});
