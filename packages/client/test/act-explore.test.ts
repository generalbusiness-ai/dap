import { expect, test } from "vitest";
import { DEVICE_COMMAND, type Effect, type ScopeRef } from "@generalbusiness/dap-contract";
import { textDigest } from "@generalbusiness/dap-bytes";
import { bindActBasis } from "../src/act-basis.ts";
import { actVersion } from "../src/act-version.ts";
import type { Act, Source } from "../src/act-types.ts";
import { ActRecords } from "../src/act-records.ts";
import { lowerActBasis, lowerActNames, type ActSymbols } from "../src/act-symbols.ts";
import { shapeFieldsOf } from "../src/declared.ts";
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
  const bound = bindActBasis(notes, act, subjects, lowered, at);
  expect(bound).toEqual({ act: { ...act, expected: { on: { after: prior } } }, bound: ["on"] });
  expect(lowerActBasis(notes.acts.write, subjects, lowered.on, lowered.fields, at, bound.act.expected, symbols)).toEqual({ on: 1 });
  expect(act.expected).toBeUndefined();
  const source: Source = { key: "write-note", version: actVersion(bound.act) };
  expect(source.version).not.toBe(actVersion({ ...lowered, kind: "write", expected: { on: 1 } }));
  expect(actVersion({ ...bound.act, fields: { body: `${body}!` } })).not.toBe(source.version);
  expect(actVersion({ ...bound.act, on: { output: { ...prior, key: "another-note" } } })).not.toBe(source.version);

  const captured = bindActBasis(notes, { ...act, expected: { on: 3 } }, subjects, lowered, at);
  expect(captured.act.expected).toEqual({ on: 3 });
  expect(captured.bound).toEqual([]);
  expect(lowerActBasis(notes.acts.write, subjects, lowered.on, lowered.fields, at, captured.act.expected, symbols)).toEqual({ on: 3 });
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
