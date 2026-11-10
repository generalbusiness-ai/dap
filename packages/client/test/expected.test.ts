import { expect, test } from "vitest";
import type { FactRef } from "@generalbusiness/dap-contract";
import { expectedOf, viaLeft } from "../src/index.ts";

type Act = Parameters<typeof expectedOf>[0];
type Item = Parameters<typeof expectedOf>[1][number];
const item = (id: number, type: string, revision: number, refs: Item["refs"] = {}): Item => ({ id, type, revision, refs });

// Pure derivation over supplied item records. These fixtures prove no read,
// signature, Membership standing or native scope outcome.
test("expected revisions resolve one, by and chained via subjects, omit code and missing subjects, and stop cycles", () => {
  const act: Act = { step: "transition", also: {
    board: { item: "board", one: true },
    participant: { item: "participant", by: "participant" },
    promise: { item: "promise", via: { of: "also.board", slot: "promise" } },
    owner: { item: "participant", via: { of: "promise", slot: "participant" } },
    computed: { item: "participant", code: "select-owner" },
    absent: { item: "absent", one: true },
    cycleA: { item: "cycle", via: { of: "cycleB", slot: "next" } },
    cycleB: { item: "cycle", via: { of: "cycleA", slot: "next" } },
  } };
  const opened = { at: {}, seq: 4, hash: "h" } as unknown as FactRef;
  const items = [item(0, "configuration", 2), item(1, "board", 3, { promise: opened }), item(4, "promise", 6, { participant: 7 }), item(7, "participant", 8)];
  expect(expectedOf(act, items, 0, { participant: 7 })).toEqual({ on: 2, board: 3, participant: 8, promise: 6, owner: 8 });
  expect(expectedOf({ ...act, step: "open" }, items, 0, { participant: 7 })).toEqual({ board: 3, participant: 8, promise: 6, owner: 8 });
  expect(expectedOf({ step: "comment", on: "configuration", fields: {}, also: {} }, items, 0, {})).toEqual({});
});

test("prototype-like aliases remain signed own fields while inherited fields and aliases select no item", () => {
  const also = Object.create({ inheritedAlias: { item: "participant", by: "constructor" } },
    Object.getOwnPropertyDescriptors(JSON.parse('{"__proto__":{"item":"participant","by":"constructor"},"missing":{"item":"participant","by":"inheritedField"},"constructor":{"item":"participant","one":true}}')));
  expect(Object.hasOwn(also, "__proto__")).toBe(true);
  const fields = Object.assign(Object.create({ inheritedField: 7 }), JSON.parse('{"constructor":7}'));
  const result = expectedOf({ step: "open", also }, [item(7, "participant", 8)], null, fields);
  expect(result).toEqual(JSON.parse('{"__proto__":8,"constructor":8}'));
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(JSON.stringify(result)).toBe('{"__proto__":8,"constructor":8}');
  const inherited = Object.create({ constructor: 7 });
  expect(expectedOf({ step: "open", also: { participant: { item: "participant", by: "constructor" } } }, [item(7, "participant", 8)], null, inherited)).toEqual({});
});

test("viaLeft and expected revisions share the same resolution when a linked final item needs a separate read", () => {
  const act: Act = { step: "transition", also: {
    version: { item: "manifest", via: { of: "on", slot: "version" } },
    plan: { item: "plan", via: { of: "also.version", slot: "plan" } },
    named: { item: "job", by: "job" },
    computed: { item: "key", code: "select-key" },
  } };
  const finding = item(9, "finding", 1, { version: 4 }), version = item(4, "manifest", 2, { plan: 7 });
  expect(viaLeft(act, [finding], 9, { job: 5 })).toEqual([{ type: "manifest", id: 4 }]);
  expect(expectedOf(act, [finding], 9, { job: 5 })).toEqual({ on: 1 });
  expect(viaLeft(act, [finding, version], 9, { job: 5 })).toEqual([{ type: "plan", id: 7 }]);
  expect(expectedOf(act, [finding, version], 9, { job: 5 })).toEqual({ on: 1, version: 2 });
});
