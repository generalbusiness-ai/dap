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
