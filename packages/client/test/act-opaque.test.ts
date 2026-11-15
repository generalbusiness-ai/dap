import { expect, test } from "vitest";
import { DEVICE_COMMAND, PROPOSED_BOUNDS, type Effect } from "@generalbusiness/dap-contract";
import { judgeActBody, reserved, validateDefinition, type Owners } from "@generalbusiness/dap-derive";
import { created, keys, otherLane, valid } from "@generalbusiness/dap-derive/testing";
import { ActOpaque } from "../src/act-opaque.ts";
import { ActProjection, UnavailableEntryValue } from "../src/act-projection.ts";
import { ActRecords } from "../src/act-records.ts";
import { actVersion } from "../src/act-version.ts";
import type { Source } from "../src/act-types.ts";
import { clientNotes as notes } from "./definition-corpus-data.ts";

function requestProjection() {
  const declaration = { ...notes,
    items: { note: { ...notes.items.note, holds: { requests: 1 }, refs: { peer: { fixed: false, required: false, to: { type: "scope", kind: "lane" } } } } },
    outcomes: {},
    acts: { ...notes.acts, take: { ...notes.acts.start, grant: "take" }, send: { ...notes.acts.start, grant: "send", fields: { peer: { type: "scope", kind: "lane", required: true } },
      effects: [{ ref: { slot: "peer", from: { field: "peer" } } }],
      sends: [{ tell: { to: { slot: "peer" }, message: "hello", fields: {}, result: {} } }] } },
  };
  const definition = valid(validateDefinition(declaration, PROPOSED_BOUNDS, undefined, { platform: true }));
  const ledger = created(definition, {}, "TEST opaque request");
  const input = { kind: "send", on: null, fields: { peer: otherLane }, expected: {} };
  const body = judgeActBody(ledger.state, definition, input, { ...ledger.context(), actor: keys.rita.key });
  if (body.result !== "write") throw new Error("the real request body did not write");
  const source: Source = { key: "send", version: actVersion(input) };
  const base = new ActProjection(definition, ledger.state);
  const next = base.project(source, body, null).projection;
  const opaque = new ActOpaque(next, missing => { throw new UnavailableEntryValue(missing); });
  return { ledger, definition, base, body, source, next, opaque };
}

test("opaque request selections stop before alias lookup while shared reservations still use the actual Amount", () => {
  const { ledger, definition, base, body, source, next, opaque } = requestProjection();
  const reader = next.reader(), view = opaque.view(reader), request = reader.pendingRequests()[0];
  if (!request) throw new Error("the actual body sent no request");
  expect(Number.isSafeInteger(reserved(reader, definition, { type: "act" }, null).entries)).toBe(true);
  expect(view.recordCount(DEVICE_COMMAND, "command")).toBe(0);
  expect(() => view.pendingRequests()).toThrow(UnavailableEntryValue);
  expect(() => view.request(request.seq, request.n)).toThrow(UnavailableEntryValue);
  expect(() => view.request(request.seq + 100, request.n)).toThrow(UnavailableEntryValue);
  expect(() => view.account(request.seq, request.n)).toThrow(UnavailableEntryValue);
  expect(() => view.account(request.seq + 100, request.n)).toThrow(UnavailableEntryValue);
  expect(() => view.all().accounts).toThrow(UnavailableEntryValue);
  expect(view.request(ledger.head.seq, 0)).toBeNull();
  expect(() => view.all().requests).toThrow(UnavailableEntryValue);
  expect(() => Object.getOwnPropertyDescriptor(view.all(), "requests")?.value).toThrow(UnavailableEntryValue);
  expect(() => JSON.stringify(view.all())).toThrow(UnavailableEntryValue);
  let calls = 0;
  const owners: Owners = { rules: () => null, reserves(actual) { calls++; return actual.pendingRequests()[0]!.seq; } };
  expect(() => base.project(source, body, owners)).toThrow(UnavailableEntryValue);
  expect(calls).toBe(1);
  const full: Owners = { rules: () => null, reservations(actual) {
    calls++; const amount = reserved(reader, definition, { type: "act" }, null);
    return { ...amount, entries: actual.pendingRequests()[0]!.seq };
  } };
  expect(() => opaque.owners(full)?.reservations?.(reader, definition)).toThrow(UnavailableEntryValue);
  expect(calls).toBe(2);
  expect(ledger.entries).toHaveLength(1);
});

test("unknown record keys cannot select an alias or reveal a guessed first state", () => {
  const source: Source = { key: "command", version: actVersion({ kind: "command", on: 0, fields: {}, expected: {} }) };
  const effects: readonly Effect[] = [{ effect: "record", capability: DEVICE_COMMAND, kind: "command", key: [20], state: "open", values: { targetAt: 20 } }];
  const refs = [{ effect: 0, path: ["key", 0] }, { effect: 0, path: ["values", "targetAt"] }];
  const pending = new ActRecords([]).project(effects, refs, source, 17);
  const missing = () => { throw new Error("the entry is not recorded"); };
  const singleton = pending.records.reader(missing);
  expect(singleton.records(DEVICE_COMMAND, "command")[0]?.state).toBe("open");
  expect(() => singleton.record(DEVICE_COMMAND, "command", [17])).toThrow("the entry is not recorded");
  const row = singleton.records(DEVICE_COMMAND, "command")[0]!;
  expect(() => Object.getOwnPropertyDescriptor(row, "key")?.value?.[0]).toThrow("the entry is not recorded");
  expect(() => Object.assign({}, row)).toThrow("the entry is not recorded");
  expect(() => singleton.records(DEVICE_COMMAND, "command", { member: "targetAt", value: 17 })).toThrow("the entry is not recorded");
  const recorded = new ActRecords([{ capability: DEVICE_COMMAND, kind: "command", key: [2], state: "confirmed", values: {}, seq: 2 }]);
  const mixed = recorded.project(effects, refs, source, 17).records.reader(missing);
  expect(mixed.recordCount(DEVICE_COMMAND, "command")).toBe(2);
  expect(() => mixed.records(DEVICE_COMMAND, "command")[0]?.state).toThrow("the entry is not recorded");
  expect(mixed.records(DEVICE_COMMAND, "command", { states: ["confirmed"] })[0]?.state).toBe("confirmed");
  expect(mixed.records(DEVICE_COMMAND, "command", { states: ["missing"] })).toEqual([]);
});

test("marked fixed and index keys stop negative queries before the storage lookup", () => {
  const declaration = { ...notes,
    outcomes: {},
    items: { note: { ...notes.items.note, indexes: ["me"], refs: { me: { fixed: true, required: true, to: { type: "item", of: "note" } }, at: { fixed: true, required: false, to: { type: "fact", under: "notes", kind: ["add-fact"] } } } } },
    acts: { ...notes.acts,
      start: { ...notes.acts.start, effects: [{ ref: { slot: "me", from: "self" } }] },
      add: { ...notes.acts.start, grant: "add", effects: [{ ref: { slot: "me", from: "self" } }] },
      "add-fact": { ...notes.acts.start, grant: "add-fact", effects: [{ ref: { slot: "me", from: "self" } }, { ref: { slot: "at", from: "self" } }] },
    },
  };
  // This platform-option fixture exercises the real index builder, not a
  // fabricated lookup result or a claim about any installed platform.
  const definition = valid(validateDefinition(declaration, PROPOSED_BOUNDS, undefined, { platform: true }));
  const ledger = created(definition, {}, "TEST opaque indexed source");
  const input = { kind: "add-fact", on: null, fields: {}, expected: {} };
  const body = judgeActBody(ledger.state, definition, input, { ...ledger.context(), actor: keys.rita.key });
  if (body.result !== "write") throw new Error("the real indexed opening did not write");
  const source: Source = { key: "add", version: actVersion(input) };
  const base = new ActProjection(definition, ledger.state);
  const next = base.project(source, body, null).projection;
  const opaque = new ActOpaque(next, missing => { throw new UnavailableEntryValue(missing); });
  let lookups = 0, affected = 0;
  const checked = new Proxy(next.reader(), { get(target, key) {
    if (key === "lookup") return (...args: Parameters<typeof target.lookup>) => { lookups++; return target.lookup(...args); };
    if (key === "fixedAffected") return (...args: Parameters<typeof target.fixedAffected>) => { affected++; return target.fixedAffected(...args); };
    const value: unknown = Reflect.get(target, key, target);
    return typeof value === "function" ? value.bind(target) : value;
  } });
  const view = opaque.view(checked);
  expect(() => view.lookup("note", "me", "999", 1)).toThrow(UnavailableEntryValue);
  expect(() => view.fixedAffected(999, ledger.head.hash)).toThrow(UnavailableEntryValue);
  expect([lookups, affected]).toEqual([0, 0]);
  const unchanged = new ActOpaque(base, missing => { throw new UnavailableEntryValue(missing); }).view(base.reader());
  expect(unchanged.lookup("note", "me", "999", 1)).toEqual([]);
  expect(unchanged.fixedAffected(999, ledger.head.hash)).toEqual([]);
  // An item-valued marked leaf is structurally not a fact dependency.
  const itemOnly = { ...input, kind: "add" };
  const itemBody = judgeActBody(ledger.state, definition, itemOnly, { ...ledger.context(), actor: keys.rita.key });
  if (itemBody.result !== "write") throw new Error("the item-only opening did not write");
  const itemNext = base.project({ key: "item-only", version: actVersion(itemOnly) }, itemBody, null).projection;
  const complete = new ActOpaque(itemNext, missing => { throw new UnavailableEntryValue(missing); }).view(itemNext.reader());
  expect(complete.fixedAffected(999, ledger.head.hash)).toEqual([]);
});

test("actual Owners see guarded rows without changing shared bookkeeping or complete recorded reads", () => {
  const { definition, next, opaque } = requestProjection();
  const reader = next.reader();
  let read: "state" | "id" | "revision" | "opened" | "descriptor" = "state";
  const owners: Owners = { rules: () => null, reserves(view) {
    expect(this).toBe(owners);
    expect(view.item(0)?.id).toBe(0);
    const row = view.all().items.at(-1);
    if (!row) throw new Error("the actual projected opening is absent");
    if (read === "state") return row.state === "kept" ? 0 : 1;
    if (read === "descriptor") { Object.getOwnPropertyDescriptor(row, "id")?.value; return 0; }
    void row[read];
    return 0;
  } };
  expect(opaque.owners(owners)?.reserves?.(reader, definition)).toBe(0);
  for (const member of ["id", "revision", "opened", "descriptor"] as const) {
    read = member;
    expect(() => opaque.owners(owners)?.reserves?.(reader, definition)).toThrow(UnavailableEntryValue);
  }
  expect(Number.isSafeInteger(reserved(reader, definition, { type: "act" }, null).entries)).toBe(true);
});

test("a real retained hypothetical holder cannot expose its private item number", () => {
  const { ledger, definition, base } = requestProjection();
  const input = { kind: "take", on: null, fields: {}, expected: {} };
  const body = judgeActBody(ledger.state, definition, input, { ...ledger.context(), actor: keys.rita.key });
  if (body.result !== "write") throw new Error("the real holder opening did not write");
  const next = base.project({ key: "take", version: actVersion(input) }, body, null).projection;
  const reader = next.reader();
  expect(reader.holders()).toHaveLength(2);
  expect(Number.isSafeInteger(reserved(reader, definition, { type: "act" }, null).entries)).toBe(true);
  const opaque = new ActOpaque(next, missing => { throw new UnavailableEntryValue(missing); });
  expect(() => opaque.view(reader).holders()).toThrow(UnavailableEntryValue);
  expect(() => opaque.view(reader).all().holders).toThrow(UnavailableEntryValue);
});
