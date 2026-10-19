import { expect, test } from "vitest";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "../src/index.ts";
import { definition as empty } from "./fixtures.ts";
import { readApplicationProjection } from "../src/application-projection.ts";
import { bindApplicationViews } from "../src/application-view-binding.ts";
import { ApplicationViewError, readApplicationViews } from "../src/application-view.ts";

// Made-up declarations. This tests no native admission, current authority,
// when evaluation, renderer, host route or actual signing operation.
const definition: DeclaredDefinition = { ...empty, items: { note: {
  many: true, max: 10, initial: "open", states: { open: { final: false }, held: { final: false } }, refs: {},
  parties: { author: { required: true, fixed: true, author: true, list: false } },
  values: { text: { required: true, fixed: false, of: { type: "text", max: 100 } } },
} }, acts: { hold: { step: "transition", on: "note", grant: "app.edit", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] } } };
const projection = readApplicationProjection({ v: 1, definition: definitionDigest(definition), revision: "revision", sources: {
  note: { item: "note", read: "item", states: ["held", "open"], limit: 1, fields: {
    text: { from: { kind: "value", name: "text" }, of: { type: "text", max: 100 }, nullable: false },
    actor: { from: { kind: "party", name: "author" }, of: { type: "member" }, nullable: false },
  } },
} });
const parts = [{ id: definitionDigest(definition), bytes: canonicalize(definition) }];
const views = () => ({ note: {
  kind: "card", projection: "room.note", item: "note", revision: "revision", title: "text", summary: null, actor: "actor", facts: ["state"],
  acts: [{ act: "hold", label: "Hold", needs: "app.edit", when: "state = 'open'" }],
  context: "Note {id} v{revision}: {waiting}", fallback: "Note {id} ({state}): {text} {waiting}", waiting: { open: "Needs attention", held: "Held" },
  refresh: 2000, display: "inline", back: null,
}, grid: {
  kind: "surface", projection: "room.note", item: "note", revision: "revision", resource: "ui://example/grid", opens: { note: "note" }, acts: [],
  context: "Note {id}", fallback: "Note {id}: {text}", waiting: {}, refresh: 2000, display: "inline", back: "note",
} });

test("carousel order binds only to a complete item source's integer or timestamp fields", () => {
  const timed = { ...definition, items: { ...definition.items, note: { ...definition.items["note"]!, values: {
    ...definition.items["note"]!.values, seen: { required: false, fixed: false, of: { type: "time" as const } },
  } } } };
  const many = readApplicationProjection({ ...projection, definition: definitionDigest(timed), sources: { note: {
    ...projection.sources["note"]!, read: "many", limit: 10, fields: { ...projection.sources["note"]!.fields,
      seen: { from: { kind: "value", name: "seen" }, of: { type: "time" }, nullable: true },
    },
  } } });
  const declaration = (order: unknown, kind = "carousel") => ({ note: { ...views().note, kind, order } });
  const order = { field: "seen", direction: "asc", missing: "first" }, parts = [{ id: definitionDigest(timed), bytes: canonicalize(timed) }];
  expect(bindApplicationViews(declaration(order), { "room.note": many }, parts)["note"]).toMatchObject({ order });
  for (const bad of [{ ...order, field: "text" }, { ...order, field: "absent" }, { ...order, direction: "random" }, { ...order, missing: "hide" }, { ...order, script: "sort()" }]) {
    expect(() => bindApplicationViews(declaration(bad), { "room.note": many }, parts)).toThrow(ApplicationViewError);
  }
  expect(() => bindApplicationViews(declaration(order, "card"), { "room.note": many }, parts)).toThrow(ApplicationViewError);
  const one = readApplicationProjection({ ...many, sources: { note: { ...many.sources["note"]!, read: "item", limit: 1 } } });
  expect(() => bindApplicationViews(declaration(order), { "room.note": one }, parts)).toThrow(ApplicationViewError);
});

// Invariant: the immutable view binds only to declared fields and native acts
// of its own definition, using that act's actual required action.
test("fixed-point fact descriptors bind only to selected integers with bounded decimal shifts and unique fields", () => {
  const fact = { field: "revision", label: "Revision", scale: 0, unit: "" };
  const declaration = (facts: unknown[]) => ({ ...views(), note: { ...views().note, facts } });
  expect(bindApplicationViews(declaration([fact]), { "room.note": projection }, parts)["note"]).toMatchObject({ facts: [fact] });
  for (const invalid of [{ ...fact, field: "text" }, { ...fact, scale: 7 }, { ...fact, scale: -1 }, { ...fact, scale: 0.5 }, { ...fact, unit: "x".repeat(17) }, { ...fact, label: "" }, { ...fact, extra: true }]) {
    expect(() => bindApplicationViews(declaration([invalid]), { "room.note": projection }, parts)).toThrow(ApplicationViewError);
  }
  expect(() => readApplicationViews(declaration([fact, "revision"]))).toThrow(ApplicationViewError);
});

test("owned item and read-only surface views bind to their declared projection and native acts", () => {
  const input = views(), bound = bindApplicationViews(input, { "room.note": projection }, parts);
  expect(bound).toEqual(input); expect(Object.isFrozen(bound["note"]!.acts)).toBe(true);
  input.note.acts[0]!.needs = "room.admin";
  expect(bound["note"]!.acts[0]!.needs).toBe("app.edit");
  const refusal = (change: (value: ReturnType<typeof views>) => void) => {
    const value = views(); change(value);
    expect(() => bindApplicationViews(value, { "room.note": projection }, parts)).toThrow("application-view-binding");
  };
  refusal(v => { v.note.acts[0]!.needs = "room.admin"; });
  refusal(v => { v.note.acts[0]!.act = "missing"; });
  refusal(v => { v.note.title = "unselected"; });
  refusal(v => { v.note.fallback = "Note {hidden}"; });
  refusal(v => { v.grid.opens.note = "missing"; });
});

test("unknown syntax, extra controls, signing surfaces and executable inputs refuse", () => {
  const bad = views(); let calls = 0;
  Object.defineProperty(bad.note, "fallback", { enumerable: true, get() { calls++; return "text"; } });
  expect(() => readApplicationViews(bad)).toThrow(ApplicationViewError); expect(calls).toBe(0);
  for (const value of [
    { ...views(), note: { ...views().note, display: ["inline"] } },
    { ...views(), note: { ...views().note, extra: true } },
    { ...views(), note: { ...views().note, refresh: 0 } },
    { ...views(), note: { ...views().note, context: "{unclosed" } },
    { ...views(), note: { ...views().note, acts: Array(3).fill(views().note.acts[0]) } },
    { ...views(), grid: { ...views().grid, acts: views().note.acts } },
    { ...views(), grid: { ...views().grid, resource: "ui://example/../escape" } },
  ]) expect(() => readApplicationViews(value)).toThrow(ApplicationViewError);
});

// Invariant: two fixed choices may name one native act, but every constant
// must fit a declared native field before the signed presentation is admitted.
test("constant native arguments bind two choices without accepting invented or ill-typed fields", () => {
  const changed = structuredClone(definition);
  changed.acts["hold"] = { ...changed.acts["hold"]!, fields: {
    target: { type: "enum", of: ["on", "off"], required: true },
    level: { type: "int", min: 0, max: 100, required: true },
  } };
  const id = definitionDigest(changed), selected = { ...projection, definition: id };
  const choices = [{ act: "hold", label: "Off", needs: "app.edit", when: "state = 'open'", args: { target: "off", level: 0 } },
    { act: "hold", label: "On", needs: "app.edit", when: "state = 'open'", args: { target: "on", level: 100 } }];
  const bind = (acts: unknown[]) => bindApplicationViews({ ...views(), note: { ...views().note, acts } },
    { "room.note": selected }, [{ id, bytes: canonicalize(changed) }]);
  expect(bind(choices)["note"]!.acts).toEqual(choices);
  for (const args of [{ target: "on" }, { target: "other", level: 100 }, { target: "on", level: 101 },
    { target: "on", level: 1.5 }, { target: "on", level: 100, invented: true }]) {
    expect(() => bind([{ ...choices[0], args }])).toThrow(ApplicationViewError);
  }
  expect(() => bind([choices[0], choices[0]])).toThrow(ApplicationViewError);
});

// Invariant: a record link selects only a projected native local-item field,
// under the same definition, into an explicitly selected record source.
test("related records bind to typed local-item references and selected record targets", () => {
  const changed = structuredClone(definition);
  changed.items["note"]!.refs = { related: { required: false, fixed: false, to: { type: "item", of: "note" } } };
  const id = definitionDigest(changed), source = projection.sources["note"]!;
  if (source.read === "entries" || source.read === "latest-entry") throw Error("Item fixture required.");
  const selected = readApplicationProjection({ ...projection, definition: id, sources: { note: { ...source, read: "item", fields: {
    ...source.fields, related: { from: { kind: "ref", name: "related" }, of: { type: "item", of: "note" }, nullable: true },
  } } } });
  const link = { view: "record", field: "related", label: "Open related note" };
  const input = (links: unknown[]) => ({ note: { ...views().note, links }, record: { ...views().note, kind: "record" } });
  const bind = (links: unknown[]) => bindApplicationViews(input(links), { "room.note": selected }, [{ id, bytes: canonicalize(changed) }]);
  expect(bind([link])["note"]).toMatchObject({ links: [link] });
  for (const invalid of [{ ...link, field: "text" }, { ...link, field: "missing" }, { ...link, view: "missing" }, { ...link, view: "note" }]) {
    expect(() => bind([invalid])).toThrow(ApplicationViewError);
  }
});

// Invariant: a bounded record series uses complete native journal samples
// whose declared acts transition the selected item type.
test("record series bind only bounded integer history on the selected native item type", () => {
  const changed = structuredClone(definition);
  changed.acts["hold"] = { ...changed.acts["hold"]!, fields: { mean: { type: "int", min: -4000, max: 8000, required: true } } };
  const id = definitionDigest(changed), series = { source: "history", field: "mean", label: "Mean", scale: 2, unit: "°C", last: 64 };
  const history = { read: "entries", acts: ["hold"], window: 100, limit: 100, latestBy: null, fields: {
    mean: { from: { kind: "field", name: "mean" }, of: { type: "int", min: -4000, max: 8000 }, nullable: false },
  } };
  const selected = readApplicationProjection({ ...projection, definition: id, sources: { ...projection.sources, history } });
  const bind = (value: unknown) => bindApplicationViews({ record: { ...views().note, kind: "record", acts: [], series: value } },
    { "room.note": selected }, [{ id, bytes: canonicalize(changed) }]);
  expect(bind(series)["record"]).toMatchObject({ series });
  for (const invalid of [{ ...series, source: "note" }, { ...series, field: "missing" }, { ...series, last: 65 },
    { ...series, last: 0 }, { ...series, scale: 7 }, { ...series, unit: "x".repeat(17) }]) {
    expect(() => bind(invalid)).toThrow(ApplicationViewError);
  }
  const wrong = structuredClone(changed); wrong.acts["hold"] = { ...wrong.acts["hold"]!, on: null, step: "comment" };
  const wrongId = definitionDigest(wrong);
  expect(() => bindApplicationViews({ record: { ...views().note, kind: "record", acts: [], series } },
    { "room.note": { ...selected, definition: wrongId } }, [{ id: wrongId, bytes: canonicalize(wrong) }])).toThrow(ApplicationViewError);
});

// One native act may combine fixed fields with bounded human scalar inputs;
// required fields cannot disappear or be overridden by the model.
test("declared parameters bind to native fields beside constants without overlap or wider ranges", () => {
  const changed = structuredClone(definition);
  changed.acts["hold"] = { ...changed.acts["hold"]!, fields: {
    target: { type: "enum", of: ["on", "off"], required: true }, level: { type: "int", min: 0, max: 10000, required: true },
  } };
  const id = definitionDigest(changed), selected = { ...projection, definition: id };
  const parameter = { kind: "decimal", label: "Level", unit: "units", min: 0, max: 10000, scale: 3, required: true };
  const act = { act: "hold", label: "Set level from chat", needs: "app.edit", when: "state = 'open'", args: { target: "off" }, parameters: { level: parameter } };
  const bind = (offered: unknown) => bindApplicationViews({ ...views(), note: { ...views().note, acts: [offered] } },
    { "room.note": selected }, [{ id, bytes: canonicalize(changed) }]);
  expect(bind(act)["note"]!.acts[0]).toEqual(act);
  for (const bad of [
    { ...act, args: { target: "off", level: 0 } },
    { ...act, parameters: { level: { ...parameter, required: false } } },
    { ...act, parameters: { level: { ...parameter, max: 10001 } } },
    { ...act, parameters: { invented: parameter } },
    { ...act, parameters: { level: { kind: "text", label: "Level", max: 10, required: true } } },
  ]) expect(() => bind(bad)).toThrow(ApplicationViewError);
});
