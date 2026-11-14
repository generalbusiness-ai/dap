import { expect, test } from "vitest";
import { DEVICE_COMMAND, PROPOSED_BOUNDS, type DeclaredDefinition, type Effect, type ScopeRef } from "@generalbusiness/dap-contract";
import { textDigest } from "@generalbusiness/dap-bytes";
import { bindActBasis } from "../src/act-basis.ts";
import { actVersion } from "../src/act-version.ts";
import type { Act, Source } from "../src/act-types.ts";
import { ActRecords } from "../src/act-records.ts";
import { lowerActBasis, lowerActNames, type ActSymbols } from "../src/act-symbols.ts";
import { shapeFieldsOf } from "../src/declared.ts";
import { copyActState } from "../src/act-state.ts";
import { projectActItems } from "../src/act-items.ts";
import { presentActRows } from "../src/act-rows.ts";
import { fixedRowsOf, MemoryState, newItem, validateDefinition } from "@generalbusiness/dap-derive";
import { clientNotes as notes } from "./definition-corpus-data.ts";

test("binding preserves written text and symbolic names while capturing only missing subject revisions", () => {
  const at: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"a".repeat(64)}` };
  const prior: Source = {
    key: "earlier-note",
    version: actVersion({ kind: "start", on: null, fields: {}, expected: {} }),
  };
  const body = "Text remains the authority's value.";
  const act: Act<typeof notes, "write"> = { kind: "write", on: { output: prior }, fields: { body } };
  // An internal alias and detached-text digest serve judgment only. Neither
  // becomes the author's act or the source version that names it.
  const symbols: ActSymbols = {
    item: name => typeof name === "number" ? name : name.output.key === prior.key && name.output.version === prior.version ? 17 : null,
    revision: (source, id) => source.key === prior.key && source.version === prior.version && id === 17 ? 1 : null,
  };
  const names = lowerActNames(act, notes.acts.write.fields, symbols);
  const shaped = shapeFieldsOf(notes.acts.write.fields, names.fields);
  const lowered = { on: names.on, fields: shaped.fields };
  expect([lowered, shaped.texts]).toEqual([{ on: 17, fields: { body: textDigest(body) } }, [body]]);
  const subjects = [{ id: 17, type: "note", refs: {}, revision: { after: prior } }];
  const captureName = Object.freeze({});
  const captureSubjects = [{ id: 3, type: "note", refs: {}, revision: 1 },
    { id: captureName, type: "note", refs: {}, revision: { after: prior } }];
  const capture = { on: captureName, fields: lowered.fields };
  const bound = bindActBasis(notes, act, captureSubjects, capture, at);
  expect(bound).toEqual({ act: { ...act, expected: { on: { after: prior } } }, bound: ["on"] });
  expect(lowerActBasis(notes.acts.write, subjects, lowered.on, lowered.fields, at, bound.act.expected, symbols)).toEqual({ on: 1 });
  expect(act.expected).toBeUndefined();
  const source: Source = { key: "write-note", version: actVersion(bound.act) };
  expect(source.version).not.toBe(actVersion({ ...lowered, kind: "write", expected: { on: 1 } }));
  expect(actVersion({ ...bound.act, fields: { body: `${body}!` } })).not.toBe(source.version);
  expect(actVersion({ ...bound.act, on: { output: { ...prior, key: "another-note" } } })).not.toBe(source.version);

  const captured = bindActBasis(notes, { ...act, expected: { on: 3 } }, captureSubjects, capture, at);
  expect(captured.act.expected).toEqual({ on: 3 });
  expect(captured.bound).toEqual([]);
  expect(lowerActBasis(notes.acts.write, subjects, lowered.on, lowered.fields, at, captured.act.expected, symbols)).toEqual({ on: 3 });
  const unrecorded = bindActBasis(notes, { ...act, on: 17 }, captureSubjects, { ...capture, on: 17 }, at);
  expect([unrecorded.act.on, unrecorded.act.expected, unrecorded.bound]).toEqual([17, {}, []]);
});

test("private state and public rows retain recorded knowledge without exposing pending item aliases", () => {
  const declaration = { ...notes, items: { note: { ...notes.items.note,
    refs: { me: { fixed: false, required: false, to: { type: "item", of: "note" } } },
    values: { ...notes.items.note.values, code: { fixed: true, required: false, default: 17, of: { type: "int", min: 0, max: 20 } } },
  } }, acts: { ...notes.acts, add: { ...notes.acts.start, grant: "add", effects: [{ ref: { slot: "me", from: "self" } }] } } } as const satisfies DeclaredDefinition;
  const checked = validateDefinition(declaration, PROPOSED_BOUNDS);
  if (!checked.ok) throw new Error("the state-copy fixture definition is invalid");
  const definition = checked.definition;
  const at: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"a".repeat(64)}` };
  const head = { seq: 3, hash: `sha256:${"b".repeat(64)}` as const };
  // This component fixture supplies a state; real submission parity is a
  // separate invariant. It creates no journal or signature for the copy.
  const base = new MemoryState();
  base.setScope({ at, kind: "lane", creator: null, status: "active", head, time: "2026-11-14T12:00:00Z",
    genesis: { hash: at.genesis, source: null, n: null }, held: [] });
  const item = newItem({ effect: "open", item: 3, type: "note", state: "kept" }, declaration.items.note, head.hash);
  base.putItem(item);
  base.addCount("note", "kept", 1);
  base.putFixedHash(3, head.hash);
  for (const fixed of fixedRowsOf(definition, item, at, seq => base.fixedHash(seq))) base.putFixed(fixed.row, fixed.dependencies);
  base.finishFixed(definition.digest, at, head);
  const copy = copyActState(base, definition);
  expect(copy.view.fixedCount("note", "code", "17", ["kept"], "raw")).toBe(1);
  expect(copy.view.fixedCount("note", "code", "17", ["kept"], "normalized")).toBe(1);
  expect(copy.view.fixedReady(definition.digest, at, head)).toBe(true);
  expect([copy.view.fixedHash(3), copy.view.fixedHash(4)]).toEqual([head.hash, null]);
  const source: Source = { key: "added-note", version: actVersion({ kind: "add", on: null, fields: {}, expected: {} }) };
  const effects: readonly Effect[] = [{ effect: "open", item: 4, type: "note", state: "kept" }, { effect: "ref", item: 4, slot: "me", to: 4 }];
  const projected = projectActItems(copy.view, definition, effects, null, source, [1], 17);
  const opened = projected.items.get(17);
  if (!opened) throw new Error("the projected opening is absent");
  const publicView = presentActRows(declaration, [...copy.view.all().items, ...projected.items.values()],
    row => row === opened ? { name: { output: source }, seen: { after: source }, assumes: [source] }
      : { name: row.id, seen: row.revision, assumes: [] },
    row => row === opened ? null : base.item(row.id),
    (row, space, path) => row === opened && space === "refs" && path.length === 1 && path[0] === "me" ? { output: source } : null);
  const pending = publicView.row({ output: source });
  if (!pending) throw new Error("the public pending note is absent");
  expect([pending.ref.name, pending.ref.seen, pending.refs.me, pending.values.code, pending.recorded]).toEqual([
    { output: source }, { after: source }, { output: source }, 17, null,
  ]);
  expect([Object.hasOwn(pending, "id"), Object.hasOwn(pending, "revision")]).toEqual([false, false]);
  expect(publicView.row(3)?.recorded?.revision).toBe(1);
  copy.writer.putItem({ ...item, revision: 2 });
  expect([base.item(3)?.revision, copy.view.item(3)?.revision]).toEqual([1, 2]);
  expect(copy.view.scope()?.head).toEqual(head);
  expect(publicView.row(3)?.ref.seen).toBe(1);
});

test("pending command records retain exact counts and guard only marked entry values", () => {
  const source: Source = { key: "command", version: actVersion({ kind: "set-fan", on: 4, fields: {}, expected: { on: 1 } }) };
  const effects: readonly Effect[] = [{ effect: "record", capability: DEVICE_COMMAND, kind: "command", key: [11], state: "open",
    values: { targetAt: 11, device: 11 } }];
  const refs = [{ effect: 0, path: ["key", 0] }, { effect: 0, path: ["values", "targetAt"] }];
  const projected = new ActRecords([]).project(effects, refs, source, 17);
  expect(projected.effects).toEqual([{ ...effects[0], key: [{ entry: source }], values: { targetAt: { entry: source }, device: 11 } }]);
  const reader = projected.records.reader(() => { throw new Error("the command entry has not recorded"); });
  expect([reader.recordCount(DEVICE_COMMAND, "command", "open"), reader.records(DEVICE_COMMAND, "command").length]).toEqual([1, 1]);
  const command = reader.record(DEVICE_COMMAND, "command", [17]);
  if (!command) throw new Error("the hypothetical command is absent");
  expect([command.state, command.values["device"]]).toEqual(["open", 11]);
  expect(() => command.key[0]).toThrow("the command entry has not recorded");
  expect(() => command.values["targetAt"]).toThrow("the command entry has not recorded");
  expect(() => command.seq).toThrow("the command entry has not recorded");
  expect(reader.recordCount(DEVICE_COMMAND, "command", "open")).toBe(1);
  const next = projected.records.project(effects, refs, { ...source, key: "next-command" }, 18);
  expect(next.records.reader(() => { throw new Error("entry absent"); }).recordCount(DEVICE_COMMAND, "command", "open")).toBe(2);
  expect(reader.recordCount(DEVICE_COMMAND, "command", "open")).toBe(1);
});
