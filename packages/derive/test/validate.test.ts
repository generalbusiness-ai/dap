import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";

import { canonicalBytes, definitionDigest } from "@generalbusiness/dap-bytes";
import { timedGraph, validateDefinition } from "../src/index.ts";
import { Scope, fields, keys, lane, laneDefinition, member, on, small, smallDefinition, t, ticket, valid } from "./fixtures-entry.ts";

import { rows, clone, type Change } from "./definition-corpus/validate-table-data.ts";

describe("the definition validator", () => {
  for (const [name, base, change, code] of rows) test(name, () => {
    const definition = clone(base);
    change(definition);
    const result = validateDefinition(definition, PROPOSED_BOUNDS);
    expect(result.ok ? null : [...new Set(result.problems.map((p) => p.code))]).toEqual(code === null ? null : [code]);
    // A problem says where it is.
    if (!result.ok) for (const p of result.problems) expect(p.path + p.message).not.toBe("");
  });

  test("capacity is a pinned opt-in: omission keeps the legacy bytes, the supported rule has its own digest, and unknown rules cannot fall back", () => {
    const original = clone(small);
    const bytes = canonicalBytes(original);
    const legacy = validateDefinition(original, PROPOSED_BOUNDS);
    expect(legacy.ok).toBe(true);
    if (!legacy.ok) throw new Error("the legacy fixture must validate");
    expect(canonicalBytes(legacy.definition.declared)).toEqual(bytes);
    expect(Object.hasOwn(legacy.definition.declared, "capacity")).toBe(false);

    const declared = { ...clone(small), capacity: { name: "whole-scope" as const, version: 1 as const } };
    const opted = validateDefinition(declared, PROPOSED_BOUNDS);
    expect(opted.ok).toBe(true);
    if (!opted.ok) throw new Error("the supported capacity rule must validate");
    expect(opted.definition.declared.capacity).toEqual({ name: "whole-scope", version: 1 });
    expect(opted.definition.digest).toBe(definitionDigest(declared));
    expect(opted.definition.digest).not.toBe(legacy.definition.digest);
    for (const capacity of [{ name: "whole-scope", version: 2 }, { name: "entries", version: 1 }]) {
      const unknown = validateDefinition({ ...clone(small), capacity }, PROPOSED_BOUNDS);
      expect(unknown.ok ? [] : unknown.problems).toEqual([expect.objectContaining({ code: "unsupported-definition", path: "capacity" })]);
    }
    expect(canonicalBytes(original)).toEqual(bytes);
  });

  test("an opted-in retained rule-input producer requires a finite profile ceiling while legacy profiles keep their interpretation", () => {
    const data = { ...clone(ticket), capacity: { name: "whole-scope" as const, version: 1 as const } };
    expect(validateDefinition(ticket, PROPOSED_BOUNDS, { "restricted@1": {} }).ok).toBe(true);
    for (const inputBytes of [undefined, 0, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      const checked = validateDefinition(data, PROPOSED_BOUNDS, { "restricted@1": inputBytes === undefined ? {} : { inputBytes } });
      expect(checked.ok ? [] : checked.problems).toContainEqual(expect.objectContaining({ code: "reserve-unbounded", path: "profile", message: expect.stringContaining("rule-input producer") }));
    }
    const checked = validateDefinition(data, PROPOSED_BOUNDS);
    expect(checked.ok && checked.definition.ruleInputBytes).toBe(262_144);
  });

  test("whole-scope refuses the reachable native ancestry-snapshot producer without treating a read ceiling as its maximum", () => {
    // The native workspace predicate enables instance -> stage -> check
    // independently of whether this particular guard can pass. No writer
    // ceiling exists for check's separate retained snapshot.
    const data = clone(lane);
    data.acts["renew"]!.guards = [...data.acts["renew"]!.guards, { capability: { name: "hold", guard: "staged", with: {} } }];
    const bytes = canonicalBytes(data);
    const legacy = validateDefinition(data, PROPOSED_BOUNDS);
    expect(legacy.ok ? [] : legacy.problems).toEqual([]);
    expect(legacy.ok && canonicalBytes(legacy.definition.declared)).toEqual(bytes);
    const checked = validateDefinition({ ...data, capacity: { name: "whole-scope", version: 1 } }, PROPOSED_BOUNDS);
    expect(checked.ok ? [] : checked.problems).toEqual([expect.objectContaining({ code: "reserve-unbounded", path: "capacity", message: expect.stringContaining("hold@1/check ancestry-snapshot producer") })]);
    // Merely listing hold@1 and using its item-form hold effects cannot
    // create the workspace instance which staging requires.
    expect(validateDefinition({ ...clone(lane), capacity: { name: "whole-scope", version: 1 } }, PROPOSED_BOUNDS).ok).toBe(true);
    // Native guard usage without any local hold type cannot stage either.
    const noHolds = clone(small);
    noHolds.capabilities = [{ name: "hold", version: 1 }];
    noHolds.acts["edit"]!.guards = [...noHolds.acts["edit"]!.guards, { capability: { name: "hold", guard: "staged", with: {} } }];
    expect(validateDefinition({ ...noHolds, capacity: { name: "whole-scope", version: 1 } }, PROPOSED_BOUNDS).ok).toBe(true);
    expect(canonicalBytes(data)).toEqual(bytes);
  });

  test("a definition that passes carries its digest, its timed and hold types, and the slots each `where` reads", () => {
    expect(laneDefinition.digest).toBe(definitionDigest(lane));
    expect(laneDefinition.timedTypes).toEqual(["hold"]);
    expect(laneDefinition.holdTypes).toEqual(["hold"]);
    expect(laneDefinition.indexes).toEqual([{ path: "acts.take-hold.guards.2.none", type: "hold", slots: ["under"] }]);
    expect(smallDefinition.timedTypes).toEqual([]);
    expect(smallDefinition.indexes.map((i) => [i.type, i.slots])).toEqual(Array(4).fill(["note", ["text"]]));
  });

  test("timed rules that part and join again: 60 rules over 16 states are read by rules and leads, not by paths; each chain is exact, and one rule back to the start is a cycle", () => {
    // A type apart from the genesis type, with states s0 to s15. Four rules take it from each state to the next: 4^14 paths from one rule, 60 rules.
    const stepped = (back: boolean) => {
      const d = clone(small) as any;
      d.items.step = { many: true, max: 1, states: Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`s${i}`, { final: i === 15 }])), initial: "s0", parties: {}, refs: {}, values: { due: { fixed: false, required: false, of: { type: "time" } } } };
      for (let i = 0; i < 15; i++) for (const r of "abcd") d.timed[`s${i}${r}`] = { on: "step", states: [`s${i}`], deadline: "due", effects: [{ state: `s${i + 1}` }], attention: [] };
      if (back) d.timed.back = { on: "step", states: ["s14"], deadline: "due", effects: [{ state: "s0" }], attention: [] };
      return d;
    };
    const graphOf = (d: any) => timedGraph(Object.entries<any>(d.timed).map(([name, r]) => ({ name, type: r.on, states: r.states, to: r.effects[0].state, deadline: r.deadline })));
    // The contract's bound is 8 timed rules. The work of the graph is shown past it, at a configured bound that takes these.
    const roomy = { ...PROPOSED_BOUNDS, timedRules: 61 };

    const result = validateDefinition(stepped(false), roomy);
    // The reserve of a state is its longest chain: 15 rules from s0, one from s14.
    expect(result.ok ? result.definition.deadlines : result.problems).toEqual({ step: Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`s${i}`, 15 - i])) });
    const graph = graphOf(stepped(false));
    expect([graph.cyclic.size, graph.chain.get("s0a"), graph.chain.get("s7d"), graph.chain.get("s14b"), graph.fromSlot.get("step")?.get("due")]).toEqual([0, 15, 8, 1, 15]);
    // Each rule is entered once. Each of the 56 rules before s14 leads to the four rules of the next state: 224 leads, each followed once.
    expect(graph.work).toEqual({ rules: 60, edges: 224 });

    // With a rule from s14 back to s0, each of the other 57 rules leads back to itself. The four rules into the final state lead nowhere, and are not refused.
    const cyclic = validateDefinition(stepped(true), roomy);
    expect(cyclic.ok ? null : [[...new Set(cyclic.problems.map((p) => p.code))], cyclic.problems.length]).toEqual([["reserve-unbounded"], 57]);
    expect(cyclic.ok ? null : cyclic.problems.map((p) => p.path)).not.toContain("timed.s14a");
    // One more rule, and eight more leads: four into it and four out of it.
    expect(graphOf(stepped(true)).work).toEqual({ rules: 61, edges: 232 });
  });

  test("a definition is held to its bounds as a whole: its timed rules, its rules, its canonical bytes, and the members of a party list", () => {
    const refusal = (change: Change, bounds = PROPOSED_BOUNDS) => {
      const definition = clone(lane) as any;
      change(definition);
      const result = validateDefinition(definition, bounds);
      return result.ok ? null : result.problems.map((p) => [p.code, p.path]);
    };
    // Each at a small configured limit: the lane has one timed rule and no rule, and is a few thousand bytes.
    expect(refusal(() => {}, { ...PROPOSED_BOUNDS, timedRules: 0 })).toEqual([["bound", "timed"]]);
    expect(refusal((d) => { d.rules = { a: "true", b: "true" }; }, { ...PROPOSED_BOUNDS, rules: 1 })).toEqual([["bound", "rules"]]);
    expect(refusal(() => {}, { ...PROPOSED_BOUNDS, definitionBytes: 1000 })).toEqual([["bound", ""]]);
    // Section 6.1, "The bound on the elements of a list" (witness 18.44, cases 1 to 3): each list type states its own `max`, and the
    // configured bound is the most that it may state. 64 validates at the bound 64; 65 does not; and 64 does not at a bound of 32.
    const listed = (max: number): Change => (d) => { d.items.hold.values.tags = { fixed: false, required: false, of: { type: "list", of: { type: "text", max: 64 }, max } }; };
    expect([PROPOSED_BOUNDS.listElements, refusal(listed(64)), refusal(listed(65)), refusal(listed(64), { ...PROPOSED_BOUNDS, listElements: 32 })])
      .toEqual([64, null, [["bound", "items.hold.values.tags.of.max"]], [["bound", "items.hold.values.tags.of.max"]]]);
    // A party list holds at most 64 members, which is more than a list value holds. The rule tells that list and nobody else:
    // one entry tells at most 64 members.
    const watched = (max: number): Change => (d) => {
      d.items.hold.parties.watchers = { fixed: false, required: false, list: true, max, author: false };
      d.timed["hold-end"].attention = [{ notify: { slot: "watchers", of: "on", when: "after", reason: "hold ended" } }];
    };
    expect(refusal(watched(PROPOSED_BOUNDS.partyMembers))).toBeNull();
    expect(refusal(watched(PROPOSED_BOUNDS.partyMembers + 1))).toEqual([["bound", "items.hold.parties.watchers.max"]]);
    // The entry that tells such a list is counted at every member it can hold: more than 64 handles, each byte as a six-byte escape.
    const tight = validateDefinition((() => { const d = clone(lane) as any; watched(PROPOSED_BOUNDS.partyMembers)(d); return d; })(), { ...PROPOSED_BOUNDS, entryBytes: 1 });
    const most = Number(/could take (\d+) bytes/.exec(tight.ok ? "" : tight.problems[0]!.message)![1]);
    expect(most).toBeGreaterThan(PROPOSED_BOUNDS.partyMembers * 6 * PROPOSED_BOUNDS.memberBytes);
  });

  test("a timed rule that copies a party list is counted at every member the list can hold, so the entry of an admitted rule fits the entry size bound", () => {
    // A hold with a list of four watchers, which its end copies into a reference slot.
    const watched = clone(lane) as any;
    watched.items.hold.parties.watchers = { fixed: false, required: false, list: true, max: 4, author: false };
    watched.items.hold.refs.saved = { fixed: false, required: false, to: { type: "list", of: { type: "member" }, max: 4 } };
    watched.acts.watch = { ...clone(lane.acts["renew"]), fields: { who: { type: "member", required: true } }, effects: [{ party: { slot: "watchers", from: { field: "who" }, list: "add" } }] };
    watched.timed["hold-end"].effects.push({ ref: { slot: "saved", from: { slot: "watchers" } } });
    // With the list counted as one member the bound came to under 6,000 bytes, and this definition passed there.
    const tight = validateDefinition(watched, { ...PROPOSED_BOUNDS, entryBytes: 6000 });
    expect(tight.ok ? null : tight.problems.map((p) => [p.code, p.path])).toEqual([["bound", "timed.hold-end"]]);
    const most = Number(/could take (\d+) bytes/.exec(tight.ok ? "" : tight.problems[0]!.message)![1]);

    // The entry itself, with the list full of the longest handles, each byte of which is written as a six-byte escape.
    const s = new Scope(valid(validateDefinition(watched, PROPOSED_BOUNDS)));
    const commitment = s.did(keys.rita, "offer", { fields: { intent: 0 }, expected: { intent: 1 } }).seq;
    s.did(keys.rita, "assign", { ...on(s, commitment), ...fields({ performer: keys.una.member }) });
    const hold = s.did(keys.una, "take-hold", { fields: { commitment }, expected: { commitment: 2 } }).seq;
    for (let i = 0; i < 4; i++) s.did(keys.una, "watch", { ...on(s, hold), ...fields({ who: member(String(i) + "\u0001".repeat(PROPOSED_BOUNDS.memberBytes - 2)) }) });
    s.now = t(600);
    expect(s.drain().map((j) => j.result)).toEqual(["write"]);
    const size = canonicalBytes(s.last).length;
    expect(size).toBeGreaterThan(6000);
    expect(size).toBeLessThanOrEqual(most);
  });
});
