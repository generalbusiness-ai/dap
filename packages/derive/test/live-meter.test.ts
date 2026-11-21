import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { validateDefinition } from "../src/index.ts";
import type { StageChange } from "../src/live-stage.ts";
import { LiveBindings } from "../src/live-binding.ts";
import type { Type } from "../src/validate/context.ts";
import { liveCreation, liveDelta, type LiveMeterSpec } from "../src/validate/live-meter.ts";
import { liveBase } from "./definition-corpus/live-data.ts";
import { Scope, valid } from "./fixtures.ts";

const tally: Type = { name: "tally", initial: "open", states: new Map([["open", false], ["closed", true]]), slots: new Map([
  ["owner", { kind: "party", fixed: false, required: false, list: false, type: { type: "member" }, hasDefault: false }],
  ["peer", { kind: "ref", fixed: false, required: false, list: false, type: { type: "scope", kind: "lane" }, hasDefault: false }],
  ["local", { kind: "ref", fixed: false, required: false, list: false, type: { type: "item", of: "tally" }, hasDefault: false }],
  ["count", { kind: "value", fixed: false, required: true, list: false, type: { type: "int", min: 0, max: 100 }, hasDefault: true }],
]) };
const definition = valid(validateDefinition(liveBase(), PROPOSED_BOUNDS));
const fixture = new Scope(definition);
const spec: LiveMeterSpec = { definition, bindings: new LiveBindings(new Map([["tally", tally]])), types: new Map([["tally", tally]]), bounds: PROPOSED_BOUNDS, deadlines: { tally: { open: 2 } }, timed: [] };
const change = (collection: string, key: unknown, before: unknown, after: unknown): StageChange =>
  ({ collection, key, before, after, hadBefore: before !== undefined, hasAfter: after !== undefined });

test("a state change adjusts dynamic attribution and timed potential without charging an item twice", () => {
  const scope = new Scope(valid(validateDefinition(liveBase(), PROPOSED_BOUNDS)));
  const item = scope.state.item(0)!;
  const start = liveDelta([change("items", 0, undefined, item)], spec, scope.at);
  expect(start.items).toBeGreaterThan(0);
  expect(start.timers).toBeGreaterThan(0);
  const ended = liveDelta([change("items", 0, item, { ...item, state: "closed" })], spec, scope.at);
  expect(ended.items).toBe(0);
  expect(ended.timers).toBe(-start.timers);
  expect(ended.dynamic).not.toBe(0);
});

test("dynamic rows charge histories by bounded digest count and reject an unknown collection", () => {
  const one = "a".repeat(72), two = "b".repeat(72);
  const added = liveDelta([change("texts", "key", [1, "body", [one]], [1, "body", [one, two]]),
    change("geneses", "scope", [one], [one, two]), change("accepted", "key", undefined, ["actor", "key", { seq: 1, intent: one }])], spec, fixture.at);
  expect(added.dynamic).toBeGreaterThanOrEqual(148);
  expect(() => liveDelta([change("unregistered", "k", undefined, 1)], spec, fixture.at)).toThrow(/unaccounted live collection/);
});

test("creation measures the actual genesis and confirmation through staged deltas", () => {
  const definition = valid(validateDefinition(liveBase(), PROPOSED_BOUNDS)), fixture = new Scope(definition);
  const created = liveCreation(definition, fixture.entries, spec, fixture.foldOptions);
  expect(created.state.all()).toEqual(fixture.state.all());
  expect(created.charge.dynamic).toBeGreaterThan(0);
  expect(created.charge.items).toBeGreaterThan(0);
  expect(created.charge.timers).toBeGreaterThan(0);
  expect(created.fixed).toBeGreaterThan(0);
});

test("long admitted type names expose the actual logical baseline", async () => {
  const { liveMeterSpec } = await import("../src/validate/live-meter.ts");
  const { canonicalize, utf8 } = await import("@generalbusiness/dap-bytes");
  const declared = liveBase(), name = "t".repeat(100_000), tally = declared.items["tally"]!;
  tally.parties = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`p${i}`, { fixed: true, required: false, list: false, author: false }]));
  tally.refs = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`r${i}`, { fixed: true, required: false, to: { type: "digest" as const } }]));
  tally.values = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`v${i}`, { fixed: true, required: false, of: { type: "bool" as const } }]));
  delete declared.items["tally"]; declared.items[name] = tally;
  declared.acts["found"]!.on = name; delete declared.acts["count"];
  const definition = valid(validateDefinition(declared, PROPOSED_BOUNDS)), fixture = new Scope(definition);
  const measured = liveCreation(definition, fixture.entries, liveMeterSpec(definition, PROPOSED_BOUNDS), fixture.foldOptions);
  expect(measured.state.all()).toEqual(fixture.state.all());
  expect(measured.state.count(name, "open")).toBe(fixture.state.count(name, "open"));
  expect(measured.state.count("unknown", "open")).toBe(0);
  const definitionBytes = utf8(canonicalize(declared)).length;
  const genesisBytes = utf8(canonicalize(fixture.entries[0]!.entry)).length;
  const logical = measured.fixed + measured.charge.dynamic + measured.charge.items + measured.charge.timers;
  console.log("long-type-baseline", { definitionBytes, genesisBytes, logical });
  expect(definitionBytes).toBeLessThan(PROPOSED_BOUNDS.definitionBytes);
  expect(genesisBytes).toBeLessThan(PROPOSED_BOUNDS.entryBytes);
  expect(logical).toBeLessThan(19_200_000);
});

test("the live limit reserves four entry widths when no declared item growth is counted", async () => {
  const { liveLimit, liveMeterSpec } = await import("../src/validate/live-meter.ts");
  const bounds = { ...PROPOSED_BOUNDS, entryBytes: 4096, scopeItems: 0 };
  const validSpec = liveMeterSpec(definition, bounds);
  expect(liveLimit(1234, validSpec)).toBe(1234 + 4 * 4096);
});

test("the live limit saturates at 32 MiB without overflowing", async () => {
  const { LIVE_LIMIT, liveLimit, liveMeterSpec } = await import("../src/validate/live-meter.ts");
  const bounds = { ...PROPOSED_BOUNDS, scopeItems: Number.MAX_SAFE_INTEGER };
  const validSpec = liveMeterSpec(definition, bounds);
  const huge = { ...validSpec, definition: { ...definition, declared: { ...definition.declared,
    items: { tally: { ...definition.declared.items["tally"]!, max: Number.MAX_SAFE_INTEGER } } } } };
  expect(liveLimit(1000, huge)).toBe(LIVE_LIMIT);
  expect(liveLimit(LIVE_LIMIT - 1, validSpec)).toBe(LIVE_LIMIT);
});

test("a live item named constructor in state name initializes without an inherited deadline", async () => {
  const { liveMeterSpec, liveLimit } = await import("../src/validate/live-meter.ts");
  const declared = liveBase(), item = declared.items["tally"]!;
  item.states = { name: { final: false } }; item.initial = "name";
  item.refs["local"] = { fixed: false, required: false, to: { type: "item", of: "constructor" } };
  delete declared.items["tally"]; declared.items["constructor"] = item;
  declared.acts["found"]!.on = "constructor"; declared.acts["count"]!.on = "constructor";
  declared.acts["count"]!.guards = [{ state: ["name"] }];
  const definition = valid(validateDefinition(declared, PROPOSED_BOUNDS)), fixture = new Scope(definition);
  const spec = liveMeterSpec(definition, PROPOSED_BOUNDS);
  const created = liveCreation(definition, fixture.entries, spec, fixture.foldOptions);
  expect(created.state.item(0)).toMatchObject({ type: "constructor", state: "name" });
  expect(created.charge.timers).toBe(0);
  expect(liveLimit(created.fixed + created.charge.dynamic + created.charge.items, spec)).toBeGreaterThan(0);
});
