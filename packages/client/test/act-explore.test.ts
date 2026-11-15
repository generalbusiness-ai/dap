import { expect, test } from "vitest";
import { DEVICE_COMMAND, PROPOSED_BOUNDS, type DeclaredDefinition, type Effect, type ScopeRef } from "@generalbusiness/dap-contract";
import { textDigest, utf8 } from "@generalbusiness/dap-bytes";
import { bindActBasis } from "../src/act-basis.ts";
import { actVersion } from "../src/act-version.ts";
import { actExplore } from "../src/act-explore.ts";
import type { Act, Source } from "../src/act-types.ts";
import { ActRecords } from "../src/act-records.ts";
import { lowerActBasis, lowerActNames, type ActSymbols } from "../src/act-symbols.ts";
import { shapeFieldsOf } from "../src/declared.ts";
import { copyActState } from "../src/act-state.ts";
import { projectActItems } from "../src/act-items.ts";
import { presentActRows } from "../src/act-rows.ts";
import { fixedRowsOf, MemoryState, newItem, reserved, validateDefinition } from "@generalbusiness/dap-derive";
import { created, grantOf, keys, lane, laneDefinition, Scope, t, valid } from "@generalbusiness/dap-derive/testing";
import { clientNotes as notes } from "./definition-corpus-data.ts";
import { room } from "../../../examples/grow/room.ts";
import { growExploreCommand } from "./support/act-explore-grow.ts";
import { actOffers } from "../src/act-offers.ts";
import { descriptionsOf } from "../src/describe.ts";
import type { FormContext } from "../src/forms.ts";

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
  expect(lowerActBasis(notes.acts.write, captureSubjects, capture.on, capture.fields, at, bound.act.expected, {
    revision: (source, subject) => subject === captureName && source.key === prior.key && source.version === prior.version ? 1 : null,
  })).toEqual({ on: 1 });
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
  expect(() => reader.record(DEVICE_COMMAND, "command", [17])).toThrow("the command entry has not recorded");
  const command = reader.records(DEVICE_COMMAND, "command")[0];
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

const explorationNotes = { ...notes, acts: { ...notes.acts, add: { ...notes.acts.start, grant: "write",
  fields: { title: { type: "text", max: 10, required: false } },
} } } as const satisfies DeclaredDefinition;

function explorationScope(key: string) {
  const ledger = created(valid(validateDefinition(explorationNotes, PROPOSED_BOUNDS)), {}, key);
  const context = { ...ledger.context(), actor: keys.rita.key, scope: ledger.at, evidence: [], owners: null };
  return { ledger, context };
}

test("undefined Owners is a programming fault before incomplete input or state reads", () => {
  const { ledger, context } = explorationScope("E1-owner-input");
  const before = structuredClone(ledger.state.all()), entries = ledger.entries.length;
  let reads = 0;
  const view = new Proxy(ledger.state, { get: (target, key, receiver) => {
    reads++;
    return Reflect.get(target, key, receiver);
  } });
  const input = { key: "write", act: { kind: "write", on: 0, fields: {} }, context: { ...context, owners: undefined } };
  // Reflect.apply represents an untyped caller; the typed context requires Owners|null.
  expect(() => Reflect.apply(actExplore, undefined, [ledger.definition, view, input]))
    .toThrow(new TypeError("owners must be supplied explicitly; use null for checked absence"));
  const incomplete = actExplore<typeof explorationNotes, "write">(ledger.definition, view,
    { key: "write", act: { kind: "write", on: 0, fields: {} }, context });
  expect(incomplete).toEqual({ is: "incomplete", act: { kind: "write", on: 0, fields: {} }, missing: ["fields.body"] });
  expect(reads).toBe(0);
  expect([ledger.state.all(), ledger.entries.length]).toEqual([before, entries]);
});

test("an after view rejects its exact assumed Source while retaining distinct versions of one key", () => {
  const { ledger, context } = explorationScope("E1-duplicate-source");
  const before = structuredClone(ledger.state.all()), entries = ledger.entries.length;
  const first = actExplore<typeof explorationNotes, "add">(ledger.definition, ledger.state,
    { key: "add-note", act: { kind: "add", on: null, fields: { title: "First" } }, context });
  expect(first.is).toBe("admitted");
  if (first.is !== "admitted") throw new Error("the actual first opening was not admitted");
  const rows = structuredClone(first.after.rows("note")), head = structuredClone(first.after.head);
  const count = first.after.count("note", "kept");
  expect(first.opens).toEqual({ output: first.source });
  expect(() => actExplore(ledger.definition, first.after, { key: first.source.key, act: first.act, context }))
    .toThrow(new TypeError("the exploration already assumes this source"));
  expect([first.after.rows("note"), first.after.head, first.after.count("note", "kept")]).toEqual([rows, head, count]);
  const another = actExplore<typeof explorationNotes, "add">(ledger.definition, first.after,
    { key: first.source.key, act: { kind: "add", on: null, fields: { title: "Second" } }, context });
  expect(another.is).toBe("admitted");
  if (another.is !== "admitted") throw new Error("the distinct version was not admitted");
  expect(another.source.key).toBe(first.source.key);
  expect(another.source.version).not.toBe(first.source.version);
  expect(another.after.rows("note")).toHaveLength(rows.length + 1);
  expect([ledger.state.all(), ledger.entries.length]).toEqual([before, entries]);
});

// Invariant 9 compares scope judgment consequences. Envelope checks and
// physical room stops before or after judgment lie outside this comparison.
test("equal recorded heads retain the standing and clock of each exploration", () => {
  const ledger = new Scope(laneDefinition);
  const before = structuredClone(ledger.state.all()), entries = ledger.entries.length;
  const act = { kind: "offer", on: null, fields: { intent: 0 } } as const;
  const context = { ...ledger.context(), actor: keys.rita.key, scope: ledger.at, evidence: [], owners: null };
  const granted = actExplore<typeof lane, "offer">(ledger.definition, ledger.state, {
    key: "E1-standing", act, context: { ...context, grants: [{ grant: grantOf(keys.rita, ledger.at, ["offer"]), current: true }] },
  });
  const refused = actExplore<typeof lane, "offer">(ledger.definition, ledger.state, {
    key: "E1-standing", act, context: { ...context, grants: [] },
  });
  expect(granted.is).toBe("admitted");
  expect(refused).toMatchObject({ is: "refused", reason: "unauthorized" });
  if (granted.is !== "admitted" || refused.is !== "refused") throw new Error("the standing pair did not reach its judgments");
  expect(granted.context.standing).toEqual([grantOf(keys.rita, ledger.at, ["offer"]).issued]);
  expect(refused.context.standing).toEqual([]);
  expect([granted.context.head, refused.context.head]).toEqual([ledger.head, ledger.head]);

  const grants = [{ grant: grantOf(keys.rita, ledger.at, ["offer"], t(10)), current: true }];
  const early = actExplore<typeof lane, "offer">(ledger.definition, ledger.state, {
    key: "E1-clock", act, context: { ...context, grants },
  });
  const late = actExplore<typeof lane, "offer">(ledger.definition, ledger.state, {
    key: "E1-clock", act, context: { ...context, ...ledger.context({ reading: t(10), grants }) },
  });
  expect(early.is).toBe("admitted");
  expect(late).toMatchObject({ is: "refused", reason: "unauthorized" });
  if (early.is !== "admitted" || late.is !== "refused") throw new Error("the clock pair did not reach its judgments");
  expect([early.context.clock, late.context.clock]).toEqual([ledger.now, t(10)]);
  expect([early.context.head, late.context.head]).toEqual([ledger.head, ledger.head]);
  expect([ledger.state.all(), ledger.entries.length]).toEqual([before, entries]);
});

test("a missing subject selector stays incomplete without reading or changing the scope", () => {
  const ledger = new Scope(laneDefinition);
  const context = { ...ledger.context(), actor: keys.rita.key, scope: ledger.at, evidence: [], owners: null };
  const before = structuredClone(ledger.state.all()), entries = ledger.entries.length;
  let reads = 0;
  const view = new Proxy(ledger.state, { get(target, key, receiver) {
    reads++;
    return Reflect.get(target, key, receiver);
  } });
  const act = { kind: "offer", on: null, fields: {} } as const;
  expect(actExplore<typeof lane, "offer">(ledger.definition, view, { key: "E1-missing-selector", act, context }))
    .toEqual({ is: "incomplete", act, missing: ["fields.intent"] });
  expect(reads).toBe(0);
  expect([ledger.state.all(), ledger.entries.length]).toEqual([before, entries]);
});

test("a shipped Grow command exploration matches normal judgment, records and full reservation Amount", async () => {
  const fixture = await growExploreCommand();
  const { ledger, capabilities, fan, key, command, over, context, actor, evidence } = fixture;
  const before = structuredClone(ledger.state.all()), entries = ledger.entries.length;
  const explored = actExplore<typeof room, "set-fan">(ledger.definition, ledger.state, {
    key, act: { kind: "set-fan", on: fan, fields: { target: "on", level: 100 }, expected: command.intent.expected },
    context: { ...context, actor, scope: ledger.at, evidence, owners: capabilities },
  });
  expect(explored.is).toBe("admitted");
  if (explored.is !== "admitted") throw new Error("the shipped Grow command was not admitted");
  const afterRows = structuredClone(explored.after.rows("device"));
  const pending = explored.after.rows("device").find(row => row.ref.name === fan);
  expect([ledger.state.all(), ledger.entries.length]).toEqual([before, entries]);
  expect(pending?.refs["targetAt"]).toEqual({ entry: explored.source });
  expect(explored.after.recordCount(DEVICE_COMMAND, "command", "open")).toBe(1);

  // Section 12 case 9: the fan's new entry-valued slot is not a fact yet.
  const later = actExplore<typeof room, "set-fan">(ledger.definition, explored.after, {
    key: "E1-grow-later", act: { kind: "set-fan", on: fan, fields: { target: "off", level: 0 } },
    context: { ...context, actor, scope: ledger.at, evidence, owners: capabilities },
  });
  expect(later).toMatchObject({ is: "unavailable", lacks: ["entry"] });
  expect([ledger.state.all(), ledger.entries.length, explored.after.rows("device")]).toEqual([before, entries, afterRows]);

  const submitted = ledger.submit(command, over);
  expect(submitted.result).toBe("write");
  if (submitted.result !== "write") throw new Error("the normal Grow command did not write");
  // Normalize only the three declared entry positions, after checking their
  // actual recorded values. No other equal number acquires a Source.
  const consequences = submitted.draft.effects.map(effect => {
    if (effect.effect === "ref" && effect.item === fan && effect.slot === "targetAt") {
      expect(effect.to).toBe(ledger.last.seq);
      return { ...effect, to: { entry: explored.source } };
    }
    if (effect.effect === "record" && effect.capability === DEVICE_COMMAND && effect.kind === "command") {
      expect([effect.key, effect.values["targetAt"]]).toEqual([[ledger.last.seq], ledger.last.seq]);
      return { ...effect, key: [{ entry: explored.source }], values: { ...effect.values, targetAt: { entry: explored.source } } };
    }
    return effect;
  });
  expect(explored.effects).toEqual(consequences);
  expect(explored.sends).toBe(submitted.draft.sends.length);
  expect(explored.after.recordCount(DEVICE_COMMAND, "command", "open"))
    .toBe(ledger.state.recordCount(DEVICE_COMMAND, "command", "open"));
  expect(explored.after.reservations).toEqual(reserved(ledger.state, ledger.definition, { type: "act" }, capabilities));
  const actual = ledger.item(fan), projected = explored.after.rows("device").find(row => row.ref.name === fan);
  expect([projected?.values["target"], projected?.values["level"], projected?.refs["targetAt"]])
    .toEqual([actual.values["target"], actual.values["level"], { entry: explored.source }]);
  expect(actual.refs["targetAt"]).toBe(ledger.last.seq);
  expect(explored.after.head).toEqual(before.scope?.head);
  expect(explored.after.rows("device")).toEqual(afterRows);
});

test("written detached text keeps its Source version while Explore and submit derive equal changes", () => {
  const { ledger, context } = explorationScope("E1-text-parity");
  const written = "Actual detached text.", digest = textDigest(written), key = "E1-text-write";
  const before = structuredClone(ledger.state.all()), entries = ledger.entries.length;
  const basis = { on: ledger.item(0).revision };
  const texts = (value: typeof digest) => value === digest ? utf8(written).length : undefined;
  const explored = actExplore<typeof explorationNotes, "write">(ledger.definition, ledger.state, {
    key, act: { kind: "write", on: 0, fields: { body: written } }, context: { ...context, texts },
  });
  expect(explored.is).toBe("admitted");
  if (explored.is !== "admitted") throw new Error("the written detached text was not admitted");
  expect(explored.act.fields.body).toBe(written);
  expect(explored.act.expected).toEqual(basis);
  expect(explored.context.evidence).toEqual([digest]);
  const shaped = shapeFieldsOf(explorationNotes.acts.write.fields, { body: written });
  expect(explored.source.version).not.toBe(actVersion({ kind: "write", on: 0, fields: shaped.fields, expected: basis }));
  expect([ledger.state.all(), ledger.entries.length]).toEqual([before, entries]);
  const signed = ledger.intent(keys.rita, "write", { on: 0, expected: basis, fields: shaped.fields, idempotencyKey: key });
  const submitted = ledger.submit(signed, { texts });
  expect(submitted.result).toBe("write");
  if (submitted.result !== "write") throw new Error("the normal detached-text intent did not write");
  expect(explored.effects).toEqual(submitted.draft.effects);
  expect(explored.sends).toBe(submitted.draft.sends.length);
  expect(explored.after.row(0)?.values.body).toBe(ledger.item(0).values["body"]);
  expect(ledger.item(0).values["body"]).toBe(digest);
  expect(explored.after.head).toEqual(before.scope?.head);
});

const offerNotes = { ...notes,
  items: { note: { ...notes.items.note, parties: { author: { fixed: true, required: true, list: false, author: true } } } },
  acts: { ...notes.acts,
    start: { ...notes.acts.start, effects: [{ party: { slot: "author", from: { signer: true } } }] },
    remove: { ...notes.acts.write, fields: {}, presents: {},
      guards: [{ signer: ["author"], reason: "not-your-note" }], effects: [] },
    touch: { ...notes.acts.write, fields: {}, presents: {}, guards: [], effects: [] },
  },
} as const satisfies DeclaredDefinition;

function offerScope(key: string) {
  const ledger = created(valid(validateDefinition(offerNotes, PROPOSED_BOUNDS)), {}, key);
  const context = { ...ledger.context(), actor: keys.sam.key, scope: ledger.at, evidence: [], owners: null };
  const ref = { name: 0, seen: ledger.item(0).revision, assumes: [] };
  const form: FormContext = { describe: descriptionsOf({}), setting: { pinned: ledger.definition.digest }, who: { standing: "unknown" } };
  return { ledger, context, ref, form };
}

test("Describe judges fieldless alternatives under one caller key and names a refusal before the click", () => {
  const { ledger, context, ref, form } = offerScope("E1-offer-guard");
  const before = structuredClone(ledger.state.all()), entries = ledger.entries.length;
  const offers = actOffers<typeof offerNotes>(ledger.definition, ledger.state, ref, form, { key: "E1-offer", context });
  expect(offers.map(offer => offer.template.act.kind)).toEqual(["remove", "touch", "write"]);
  const removed = offers.find(offer => offer.template.act.kind === "remove")?.exploration;
  expect(removed).toMatchObject({ is: "refused", reason: "guard-failed", name: "not-your-note" });
  expect(offers.find(offer => offer.template.act.kind === "write")?.exploration).toBeUndefined();
  const allowed = actOffers<typeof offerNotes>(ledger.definition, ledger.state, ref, form,
    { key: "E1-offer", context: { ...context, actor: keys.rita.key } });
  const remove = allowed.find(offer => offer.template.act.kind === "remove")?.exploration;
  const touch = allowed.find(offer => offer.template.act.kind === "touch")?.exploration;
  expect([remove?.is, touch?.is]).toEqual(["admitted", "admitted"]);
  if (remove?.is !== "admitted" || touch?.is !== "admitted") throw new Error("the fieldless alternatives did not admit");
  expect([remove.source.key, touch.source.key]).toEqual(["E1-offer", "E1-offer"]);
  expect(remove.source.version).not.toBe(touch.source.version);
  expect([remove.act.expected, touch.act.expected]).toEqual([{ on: ref.seen }, { on: ref.seen }]);
  expect([ledger.state.all(), ledger.entries.length]).toEqual([before, entries]);
});

test("Describe without a key returns templates without reading a checked context", () => {
  const { ledger, ref, form } = offerScope("E1-offer-template");
  const before = structuredClone(ledger.state.all()), entries = ledger.entries.length;
  const noContext = new Proxy({}, { get(target, key, receiver) {
    if (key === "context") throw new Error("template code read a checked context");
    return Reflect.get(target, key, receiver);
  } });
  const offers = actOffers<typeof offerNotes>(ledger.definition, ledger.state, ref, form, noContext);
  expect(offers.map(offer => offer.template.act.kind)).toEqual(["remove", "touch", "write"]);
  expect(offers.every(offer => !Object.hasOwn(offer, "exploration"))).toBe(true);
  expect(offers.find(offer => offer.template.act.kind === "remove")?.template.form.guards).toHaveLength(1);
  expect(actOffers<typeof offerNotes>(ledger.definition, ledger.state, { ...ref, name: 999 }, form)).toEqual([]);
  const missing: Source = { key: "absent-offer", version: actVersion({ kind: "touch", on: 0, fields: {}, expected: { on: ref.seen } }) };
  expect(actOffers<typeof offerNotes>(ledger.definition, ledger.state,
    { name: { output: missing }, seen: { after: missing }, assumes: [missing] }, form)).toEqual([]);
  expect([ledger.state.all(), ledger.entries.length]).toEqual([before, entries]);
});

test("Describe rejects a key or checked context alone before looking up the row", () => {
  const { ledger, context, ref, form } = offerScope("E1-offer-pair");
  const before = structuredClone(ledger.state.all()), entries = ledger.entries.length;
  const view = new Proxy(ledger.state, { get() { throw new Error("an incomplete pair read the view"); } });
  const diagnostic = new TypeError("offer key and checked context must be supplied together");
  expect(() => actOffers<typeof offerNotes>(ledger.definition, view, ref, form, { key: "E1-offer" })).toThrow(diagnostic);
  expect(() => actOffers<typeof offerNotes>(ledger.definition, view, ref, form, { context })).toThrow(diagnostic);
  expect([ledger.state.all(), ledger.entries.length]).toEqual([before, entries]);
});
