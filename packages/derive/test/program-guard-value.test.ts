/** Concrete guard decisions over real in-memory ledger state. Public callers have separate witnesses. */
import { expect, test, vi } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Guard } from "@generalbusiness/dap-contract";
import type { Judging } from "../src/guards.ts";
import { judgeGuardNodes } from "../src/program/guard-value.ts";
import { bodyStructure, type GuardNode } from "../src/program/structure.ts";
import { validateDefinition } from "../src/validate/index.ts";
import { Scope, fields, keys, small, t, valid } from "./fixtures.ts";

function fixture(guards: readonly Guard[], change?: (data: DeclaredDefinition) => void) {
  const data = structuredClone(small), act = data.acts["edit"]!;
  act.guards = [...guards]; act.effects = []; act.sends = []; act.attention = [];
  act.fields["outer"] = { type: "list", of: { type: "int", min: 0, max: 9 }, max: 4, required: false };
  act.fields["inner"] = { type: "list", of: { type: "int", min: 0, max: 9 }, max: 4, required: false };
  act.fields["rows"] = { type: "list", of: { type: "item", of: "note" }, max: 10, required: false };
  data.rules["ready"] = "true";
  change?.(data);
  const definition = valid(validateDefinition(data, PROPOSED_BOUNDS)), scope = new Scope(definition);
  const extra = Object.hasOwn(data.acts["write"]!.fields, "tag") ? { tag: "held" } : {};
  const on = scope.did(keys.rita, "write", fields({ text: "first", owner: keys.rita.member, ...extra })).seq;
  const j: Judging = { definition, view: scope.state, bounds: PROPOSED_BOUNDS, clock: { reading: t(100), asOf: t(100), behind: false },
    scope: scope.state.scope()!, self: scope.head.seq + 1, kind: "edit", fields: {}, fieldTypes: act.fields,
    subjects: new Map([["on", scope.item(on)]]), signer: { member: keys.rita.member, principal: null }, facts: new Map(), prepared: [], used: [], own: scope.own };
  const body = bodyStructure(definition, act, "edit")!, nodes = body.nodes.filter((node): node is GuardNode => node.category === "guard");
  return { j, body, nodes, scope, run: () => judgeGuardNodes(j, body, nodes) };
}
const incomplete: Guard = { some: { type: "note", states: ["draft"], where: [{ equals: { a: { slot: "text" }, b: { const: "missing" } } }] } };

test("a later completed failure wins over unavailable and a later alternative pass wins over unavailable", () => {
  const fail = fixture([incomplete, { state: ["kept"] }]), pass = fixture([{ anyOf: [[incomplete], [{ state: ["draft"] }]] }]), open = fixture([incomplete]);
  for (const { j } of [fail, pass, open]) j.bounds = { ...PROPOSED_BOUNDS, guardPage: 1, guardScan: 1 };
  expect([fail.run(), pass.run(), open.run()]).toEqual([
    { result: "fail", at: 1 }, { result: "pass", at: -1 }, { result: "guard-incomplete", at: -1 },
  ]);
});

test("nested list execution restores the outer binding after an inner declaration shadows its name", () => {
  const outer: Guard = { equals: { a: { element: "row" }, b: { const: 1 } } };
  const f = fixture([{ each: { list: { field: "outer" }, as: "row", guards: [outer,
    { each: { list: { field: "inner" }, as: "row", guards: [{ equals: { a: { element: "row" }, b: { const: 3 } } }] } }, outer,
  ] } }]);
  f.j.fields = { outer: [1], inner: [3] };
  expect(f.run()).toEqual({ result: "pass", at: -1 });
  f.j.fields = { outer: [1], inner: [4] };
  expect(f.run()).toEqual({ result: "fail", at: 0 });
});

test("fixed-slot range evidence stays exact when the scan budget cannot read a page", () => {
  const f = fixture([{ some: { type: "note", states: ["draft"], where: [{ equals: { a: { slot: "tag" }, b: { const: "held" } } }] } }], data => {
    data.items["note"]!.values["tag"] = { fixed: true, required: false, of: { type: "text", max: 10 } };
    data.acts["write"]!.fields["tag"] = { type: "text", max: 10, required: false };
    data.acts["write"]!.effects = [...data.acts["write"]!.effects, { value: { slot: "tag", from: { field: "tag" } } }];
  });
  f.j.bounds = { ...PROPOSED_BOUNDS, guardPage: 1, guardScan: 0 };
  const count = vi.spyOn(f.scope.state, "fixedCount");
  try { expect(f.run()).toEqual({ result: "pass", at: -1 }); expect(count).toHaveBeenCalledTimes(1); }
  finally { count.mockRestore(); }
});

test("sameSet requires complete evidence, distinct keys and the declared order", () => {
  const f = fixture([{ sameSet: { list: { field: "rows" }, as: "row", key: { element: "row" }, items: { type: "note", states: ["draft"] }, ordered: true } }]);
  const rows = f.scope.state.page("note", ["draft"], null, 10).items.map(item => item.id);
  f.j.fields = { rows }; expect(f.run()).toEqual({ result: "pass", at: -1 });
  f.j.fields = { rows: [...rows].reverse() }; expect(f.run()).toEqual({ result: "fail", at: 0 });
  f.j.fields = { rows: rows.map(() => rows[0]!) }; expect(f.run()).toEqual({ result: "fail", at: 0 });
  f.j.fields = { rows }; f.j.bounds = { ...PROPOSED_BOUNDS, guardScan: 0 };
  expect(f.run()).toEqual({ result: "guard-incomplete", at: -1 });
});

test("the complete guard list is checked before preparation runs, including empty borrowed bodies", () => {
  const f = fixture([{ rule: "ready" }, { after: { slot: "due" } }]); f.j.asked = [];
  expect(() => judgeGuardNodes(f.j, f.body, [f.nodes[0]!, { ...f.nodes[1]! }])).toThrow("another admitted body");
  expect(f.j.asked).toEqual([]);
  expect(() => judgeGuardNodes(f.j, { ...f.body }, [])).toThrow("another validation");
  expect(f.run()).toEqual({ result: "fail", at: 1 });
  expect(f.j.asked).toHaveLength(1);
});

test("ifPresent keeps direct set skips separate from projected historical set reads", () => {
  const set = { set: { item: { field: "selected", part: "on" }, slot: "text" } } as const;
  const guard = (projected: boolean): Guard => ({ ifPresent: true,
    equals: { a: { field: "proof", part: projected ? { of: set, then: "seq" } : set }, b: { const: 99 } },
  });
  const make = (projected: boolean) => fixture([guard(projected)], data => {
    const fields = data.acts["edit"]!.fields;
    fields["proof"] = { type: "fact", kind: ["write"], under: data.name, required: true };
    fields["selected"] = { type: "fact", kind: ["write"], under: data.name, required: false };
  });
  const direct = make(false), projected = make(true);
  for (const f of [direct, projected]) f.j.fields = { proof: f.j.subjects.get("on")!.id };
  // Only a direct set's selector participates in the original skip rule.
  // A projected set still evaluates to none and fails this comparison.
  expect([direct.run(), projected.run()]).toEqual([{ result: "pass", at: -1 }, { result: "fail", at: 0 }]);
  for (const f of [direct, projected]) f.j.fields = {};
  expect([direct.run(), projected.run()]).toEqual([{ result: "pass", at: -1 }, { result: "pass", at: -1 }]);
});
