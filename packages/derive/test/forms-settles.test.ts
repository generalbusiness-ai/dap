import { settlesChanges, settlesThreeChange, settlesTimedData, settlesHolderData, settlesOwnCopyChange, settlesMarkedCopyChange } from "./definition-corpus/settles-variants.ts";
import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { PlatformData, PlatformDefinition } from "@generalbusiness/dap-contract";
import { canonicalBytes, entryHash, factRefOf, parseStrictBytes } from "@generalbusiness/dap-bytes";
import { AmountError, PROFILES, applyEntry, clockOf, entryOf, fits, itemAwaits, judgeDelivery, markerAmounts, markerReservations, owed, reserved, validateDefinition } from "../src/index.ts";
import type { Draft, PlatformRules, RuleEffect, ValidDefinition } from "../src/index.ts";
import { Scope, arriving, directory, fields, forged, keys, on, valid, type Over } from "./fixtures-entry.ts";

/**
 * Settlement by a mark, and pending marker work (scope contract, revision 22,
 * sections 6.4 and 17.2; rows I3-54 and I3-59; witnesses 18.54 and 18.51).
 * Every definition here is made up, and every number is the witness's.
 *
 * M, of witness 18.54: a `job` is `open`, `held` or `done`, and has two
 * marks, `a` and `b`. `mark-a` and `mark-a-far` each set `a`, and the
 * second also sends one request. `mark-b` sets `b`. `close` settles the job
 * by state.
 */
import { M } from "./definition-corpus/forms-settles-data.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const changed = (base: unknown, change: (d: any) => void, platform = false) => {
  const data = structuredClone(base);
  change(data);
  return validateDefinition(data, PROPOSED_BOUNDS, PROFILES, { platform });
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const refusals = (base: unknown, change: (d: any) => void, platform = false): string[] => {
  const v = changed(base, change, platform);
  return v.ok ? [] : v.problems.map((p) => `${p.code} ${p.path}`);
};
const m = valid(validateDefinition(M, PROPOSED_BOUNDS));
/** What a job reserves beside its deadline, in entries: in that state, with those marks `true`. */
const job = (definition: ValidDefinition, state: string, done: readonly string[] = []) => markerAmounts(definition.markers!).awaits("job", state, done);

/** A scope under a definition of this file, with a budget of entries that a test sets. `row` is used and reserved. */
class Full extends Scope {
  budget = 0;
  row() { return [this.head.seq + 1, owed(this.state, this.definition, this.last.input)] as const; }
  /** The budget that leaves that many entries free at this head. */
  free(entries: number) { const [used, reserved] = this.row(); this.budget = used + reserved + entries; return this; }
  /** What the commit does with a judged input at the budget: the entry is folded into a copy of the state, and is kept only if it fits. */
  commit(j: { result: string; draft?: Draft }): string {
    if (j.result !== "write" || !j.draft) return j.result;
    const [copy, entry] = [this.replay(), entryOf(this.state, j.draft, clockOf(this.state, this.now))];
    applyEntry(copy, this.definition, entry, entryHash(entry));
    if (!fits(copy, this.definition, { scopeEntries: this.budget }, entry.input, j.draft.settles)) return "scope-full";
    this.seal(j.draft);
    return j.draft.settles ? "settles" : "new work";
  }
  does(kind: string, over: Over = {}) { return this.commit(this.judge(this.intent(keys.una, kind, over))); }
  /** A job, opened with room for it. Its ID. */
  started() { this.free(6); expect(this.does("start", fields({ desk: directory }))).toBe("new work"); return this.head.seq; }
  awaits(id: number) { return itemAwaits(this.definition, this.item(id)); }
}

describe("18.54: two marks on one item, and a state settlement beside them", () => {
  test("opt-in alias settlement binds the old target before the same entry changes its selecting reference", () => {
    // Made-up lane data; real in-memory judgments and fold, with fixture
    // authority. The mutable selector makes post-entry binding incorrect.
    const definition = valid(changed(M, settlesChanges.alias));
    const scope = new Scope(definition);
    const start = () => scope.did(keys.una, "start", fields({ desk: directory })).seq;
    const primary = start(), oldTarget = start(), newTarget = start();
    scope.did(keys.una, "point", { ...on(scope, primary), fields: { target: oldTarget } });
    scope.did(keys.una, "mark-target", { ...on(scope, primary, { target: oldTarget }), fields: { next: newTarget } });
    expect(scope.item(primary).refs["target"]).toBe(newTarget);
    expect(scope.item(oldTarget).values["a"]).toBe(true);
    expect(scope.state.itemDuties(oldTarget).some(duty => duty.slot === "a")).toBe(false);
    expect(scope.state.itemDuties(newTarget).some(duty => duty.slot === "a")).toBe(true);
    expect(scope.replay().all()).toEqual(scope.state.all());
  });

  test("opt-in delivered handlers release only their selected item's genuine duty; an ordinary message and a refused advisory retain it", () => {
    // The receiver's judgments/fold are real in memory. Sender entries are
    // made by hand and anchored, not judged foreign histories or authority.
    const definition = valid(changed(M, settlesChanges.handlers));
    const scope = new Scope(definition);
    const first = scope.did(keys.una, "start", fields({ desk: directory })).seq;
    const second = scope.did(keys.una, "start", fields({ desk: directory })).seq;
    const deliver = (name: string, id: number, seq: number, advisory = false) => {
      const message = advisory ? { class: "advisory", type: "index", body: { fields: {} } } as const : { class: "request", type: "tell", body: { message: name, fields: { job: scope.fact(id) } } } as const;
      const send = { n: 0, to: scope.at, message };
      const source = forged(directory, seq, { type: "checkpoint", through: 0, state: entryHash(scope.last) }, [send]);
      const arrival = { ...send, from: factRefOf(source.entry) };
      const judged = judgeDelivery(scope.state, definition, arrival, arriving(scope, arrival, { ...source, under: "desk" }));
      expect(judged.result).toBe("write");
      if (judged.result === "write") scope.seal(judged.draft);
    };
    deliver("note", first, 300);
    deliver("flag", second, 301);
    deliver("advice", second, 302, true); // missing required job: valid no-effect advisory entry
    expect(scope.state.itemDuties(first).some(duty => duty.slot === "a")).toBe(true);
    expect(scope.state.itemDuties(second).some(duty => duty.slot === "a")).toBe(false);
    expect(scope.replay().all()).toEqual(scope.state.all());
  });

  test("an opt-in item keeps each admitted duty through ordinary marker and final-state changes; only its actual settling entry releases that duty", () => {
    const definition = valid(changed(M, settlesChanges.duties));
    const scope = new Full(definition);
    const id = scope.started();
    const held = scope.state.itemDuties(id);
    scope.free(10);
    expect(scope.does("note", on(scope, id))).toBe("new work");
    expect(scope.item(id).values["b"]).toBe(true);
    expect(scope.state.itemDuties(id)).toEqual(held);
    expect(scope.does("mark-a", on(scope, id))).toBe("settles");
    expect(scope.state.itemDuties(id).map(duty => [duty.kind, duty.slot])).toEqual([["mark", "b"], ["state", null]]);
    expect(scope.does("close", on(scope, id))).toBe("settles");
    expect(scope.item(id).state).toBe("done");
    expect(scope.state.itemDuties(id).map(duty => [duty.kind, duty.slot])).toEqual([["mark", "b"]]);
    expect(owed(scope.state, definition, scope.last.input)).toBe(2); // b and the closing checkpoint
    expect(scope.replay().all()).toEqual(scope.state.all());
    expect(Object.hasOwn(new Scope(m).state.all(), "itemDuties")).toBe(false);
  });

  test("whole-scope checks pending Amount operands before a zero live count can hide a fractional record term", () => {
    const definition = valid(changed(M, settlesChanges.removeMarkersWhole));
    const scope = new Full(definition);
    expect(scope.state.count("job", "open")).toBe(0);
    const malformed = { ...definition, pendingWorkAmounts: { ...definition.pendingWorkAmounts, pending: {
      job: { open: { ...definition.pendingWorkAmounts.pending["job"]!["open"]!, records: 0.5 } },
    } } };
    expect(() => reserved(scope.state, malformed, scope.last.input)).toThrow(AmountError);
  });

  test("the shared traversal keeps marker alternatives and future requests as Amounts, then moves a sent request from Reserved to Used", () => {
    // This is the existing made-up marker definition and real judges/fold in
    // memory, not a native scope or a complete byte-admission witness.
    const definition = valid(changed(M, settlesChanges.whole));
    const unit = PROPOSED_BOUNDS.entryBytes;
    const guarded = valid(changed(M, settlesChanges.guarded));
    const withRules = new Full(guarded);
    withRules.started();
    // The three independent duties each reserve one retained rule input,
    // including the larger a alternative. The closing checkpoint has none.
    expect(reserved(withRules.state, guarded, withRules.last.input)).toEqual({ entries: 6, bytes: 10 * unit, items: 0, records: 0, requests: 1 });
    const withFields = valid(changed(M, settlesChanges.fields, true));
    const retained = new Full(withFields);
    retained.started();
    // Three NUL bytes occupy twenty canonical JSON bytes. The field and
    // presented fact may each retain one foreign entry beside that text,
    // and the value place has its own seventeen-byte canonical ceiling.
    expect(canonicalBytes("\0\0\0").length).toBe(20);
    expect(reserved(retained.state, withFields, retained.last.input)).toEqual({ entries: 6, bytes: 9 * unit + 37, items: 0, records: 0, requests: 1 });
    const withRows = valid(changed(M, settlesChanges.rows, true));
    const observed = new Full(withRows);
    const observedJob = observed.started();
    // No outcome kinds or holders: row-only result clauses must still
    // reserve their value. These alternatives take 23, rather than 17+23.
    expect(withRows.reserving!.requests!["acts.mark-a-far.sends.0"]!.bytes).toBe(3 * unit + 23);
    expect(withRows.pendingWorkAmounts.clause.bytes).toBe(23);
    expect(reserved(observed.state, withRows, observed.last.input)).toEqual({ entries: 6, bytes: 7 * unit + 34, items: 0, records: 0, requests: 1 });
    expect(observed.does("mark-a-far", on(observed, observedJob))).toBe("settles");
    expect(reserved(observed.state, withRows, observed.last.input)).toEqual({ entries: 5, bytes: 6 * unit + 34, items: 0, records: 0, requests: 0 });
    for (const far of [false, true]) {
      const scope = new Full(definition);
      const id = scope.started();
      expect(reserved(scope.state, definition, scope.last.input)).toEqual({ entries: 6, bytes: 7 * unit, items: 0, records: 0, requests: 1 });
      expect(scope.does(far ? "mark-a-far" : "mark-a", on(scope, id))).toBe("settles");
      const amount = reserved(scope.state, definition, scope.last.input);
      expect(amount).toEqual({ entries: far ? 5 : 3, bytes: (far ? 6 : 3) * unit, items: 0, records: 0, requests: 0 });
      expect(scope.state.outstanding().requests).toBe(far ? 1 : 0);
      expect(owed(scope.state, definition, scope.last.input)).toBe(amount.entries);
    }
  });

  test("18.54 case 1: a job that is open with both marks false reserves 3 for a, 1 for b and 1 for its state: 5 entries", () => {
    // (job, a) is the larger of its two forms: `mark-a`, 1 entry, and `mark-a-far`, 1 entry and the 2 of its request.
    const forms = Object.fromEntries(m.markers!["job"]!.forms.map((form) => [form.path, [form.slot, form.base]]));
    expect(forms).toEqual({ "acts.mark-a": ["a", 1], "acts.mark-a-far": ["a", 3], "acts.mark-b": ["b", 1], "acts.close": [null, 1] });
    expect(m.markers!["job"]!.marks).toEqual(["a", "b"]);
    expect([job(m, "open"), job(m, "held"), job(m, "done")]).toEqual([5, 2, 0]);
    // A type with marks has no row in `pending`: its items are counted one by one, by their marks.
    expect(m.pending).toEqual({});
  });

  test("18.54 cases 2 to 4: start needs its entry and the 5 of the job; then each mark settles its own duty at a full scope, in either order", () => {
    // Case 2. With room for 5 it is refused `scope-full`. With room for 6 it is written.
    const short = new Full(m).free(5);
    expect(short.does("start", fields({ desk: directory }))).toBe("scope-full");
    for (const [first, second, between] of [["mark-a", "mark-b", 2], ["mark-b", "mark-a", 4]] as const) {
      const G = new Full(m);
      const id = G.started();
      expect([G.awaits(id), G.row()[0] + G.row()[1]]).toEqual([5, G.budget]);
      // Cases 3 and 4. No room is free. After `mark-a` the job reserves 2, for b and for `close`. After `mark-b` it reserves 4.
      expect([G.does(first, on(G, id)), G.awaits(id)]).toEqual(["settles", between]);
      expect([G.does(second, on(G, id)), G.awaits(id)]).toEqual(["settles", 1]);
      expect(G.row()[0] + G.row()[1]).toBeLessThanOrEqual(G.budget);
    }
  });

  test("18.54 case 5, the control: three first settlements of one job write and start 5 entries, which one reservation of the largest form, 3, would not hold", () => {
    const G = new Full(m);
    const id = G.started();
    const largest = Math.max(...m.markers!["job"]!.forms.map((form) => form.base));
    const before = G.row();
    expect(["mark-b", "mark-a-far", "close"].map((kind) => G.does(kind, on(G, id)))).toEqual(["settles", "settles", "settles"]);
    // Three entries are written, and the request of `mark-a-far` holds two more. The job reserved all five, so nothing grew.
    const after = G.row();
    expect([largest, after[0] - before[0], G.state.outstanding().requests, G.awaits(id)]).toEqual([3, 3, 1, 0]);
    expect(after[0] - before[0] + 2 * G.state.outstanding().requests).toBe(5);
    expect(after[0] + after[1]).toBe(G.budget);
  });

  test("18.54 cases 6 to 8: a mark that is true awaits nothing; two forms for one mark are one duty; a state settlement ends both marker duties", () => {
    // Case 6. After `mark-a`, a second `mark-a` is new work, and at a scope with no free room it is refused.
    const six = new Full(m);
    const a = six.started();
    expect(six.does("mark-a", on(six, a))).toBe("settles");
    expect(six.free(0).does("mark-a", on(six, a))).toBe("scope-full");
    // Case 7. `mark-a-far` settles (job, a), which reserved for the larger of its two forms. Its request holds the 2 entries.
    const seven = new Full(m);
    const b = seven.started();
    expect([seven.does("mark-a-far", on(seven, b)), seven.awaits(b), seven.state.outstanding().requests]).toEqual(["settles", 2, 1]);
    expect(seven.row()[0] + seven.row()[1]).toBe(seven.budget);
    // A `mark-a` after it is new work: the task was one, and one form settled it.
    expect(seven.does("mark-a", on(seven, b))).toBe("scope-full");
    // Case 8. `close` settles the state task. The job is `done`, outside the `in` of both marks: their 4 entries are released.
    const eight = new Full(m);
    const c = eight.started();
    const reserved = eight.row()[1];
    expect([eight.does("close", on(eight, c)), eight.awaits(c), [eight.item(c).values["a"], eight.item(c).values["b"]]]).toEqual(["settles", 0, [false, false]]);
    expect(reserved - eight.row()[1]).toBe(5);
  });

  test("18.54 cases 9 to 12: a completed mark is in no later closure, a path by two marks ends, and a form that reaches its own duty on another item is refused", () => {
    // M2: `close` sets `held`, and `finish` settles a job that is `held`.
    const m2 = valid(changed(M, settlesChanges.m2));
    // Case 9. The state task is `close` and what the job reserves in `held`: `finish`, (job, a) by `mark-a`, and (job, b). 1 and 3.
    expect([job(m2, "open"), job(m2, "held")]).toEqual([8, 3]);
    // Case 10. With `a` completed the state task is 1 and 2, and the job reserves 1 and 3. After `close` it reserves 2.
    expect([job(m2, "open", ["a"]), job(m2, "held", ["a"])]).toEqual([4, 2]);

    // M3: `mark-a` lists `open` and sets `held`; `mark-b` lists `held` and sets `open`. The path is a, then b, and it ends.
    const three = settlesThreeChange;
    const m3 = valid(changed(M, three));
    // Case 11. A job that is `open` reserves 2: `mark-a`, and (job, b) in `held`. In `open` again, `a` is completed.
    expect([job(m3, "open"), job(m3, "held", ["a"]), job(m3, "open", ["a", "b"])]).toEqual([2, 1, 0]);

    // Case 12. M4: `mark-b` also sets the state `open` of a second job. That job has no mark completed, and both follow again.
    expect(refusals(M, (d) => {
      three(d);
      Object.assign(d.acts["mark-b"], { also: { other: { item: "job", by: "other" } }, fields: { other: { type: "item", of: "job", required: true } } });
      d.acts["mark-b"].guards.push({ state: ["open", "held"], of: "also.other" });
      d.acts["mark-b"].effects.push({ state: "open", of: "also.other" });
    }).filter((problem) => problem.startsWith("reserve-unbounded"))).toEqual(["reserve-unbounded acts.mark-a"]);
  });

  test("18.54 case 15, as far as the fold goes: the entries of cases 3 and 8, folded again, give the same amounts at each head", () => {
    const G = new Full(m);
    const id = G.started();
    for (const kind of ["mark-a", "mark-b", "close"]) expect(G.does(kind, on(G, id))).toBe("settles");
    const reserved = (count: number) => owed(G.replay(count), m, G.entries[count - 1]!.entry.input);
    // The closing checkpoint is 1 of each. The job: 5, then 2, then 1, then nothing.
    expect([3, 4, 5, 6].map(reserved)).toEqual([6, 3, 2, 1]);
  });
});

describe("the form `{ of, sets, in }` at the validator", () => {
  test("a canonical settling closure that returns through a timed state with no settler is refused; the finite path retains its whole duty", () => {
    // Made-up data. Settling the root's mark can put a job in held. Its timer leads to open, where close either ends it or
    // puts it back in held. The timed graph alone is acyclic, and no form settles held; the repeated job task is not finite.
    const load = (to: "held" | "done") => validateDefinition(parseStrictBytes(canonicalBytes(settlesTimedData(to))), PROPOSED_BOUNDS);
    const finite = load("done");
    expect(finite.ok).toBe(true);
    if (finite.ok) expect([finite.definition.pending, markerAmounts(finite.definition.markers!).awaits("root", "open", [])]).toEqual([{ job: { open: 1, held: 1 } }, 3]);
    const cyclic = load("held");
    expect(cyclic).toMatchObject({ ok: false, problems: expect.arrayContaining([expect.objectContaining({ code: "reserve-unbounded", path: "acts.close" })]) });
  });

  test("canonical holder amounts count an unnamed item's deadline, state duty and every pending mark in initial, changed and clause states", () => {
    // Made-up platform data: pulse can change one item and open one job. The opening draws on the holder's item count.
    // A job in open reserves its deadline (1), mark a (the larger alternative, 3), mark b (1), and its state settlement (1).
    const data = settlesHolderData();
    const checked = validateDefinition(parseStrictBytes(canonicalBytes(data)), PROPOSED_BOUNDS, PROFILES, { platform: true });
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    const definition = checked.definition;
    const r = definition.reserving!;
    expect([definition.pending, definition.clauseEntries, r.itm.entries, r.req.entries, r.kinds["pulse"]!.whole.entries, r.kinds["spawn"]!.whole.entries]).toEqual([{}, 6, 6, 8, 14, 14]);
    // Each possible settlement of a reserves its future request, including its result's foreign source entry. The two outcome
    // entries of pulse/spawn each count it; itm counts it once, and req counts it beside its own future pending-request unit.
    const amounts = [r.itm, r.req, r.kinds["pulse"]!.whole, r.kinds["spawn"]!.whole, r.holders["root"]!.amount];
    expect(amounts.map((amount) => amount.requests)).toEqual([1, 2, 2, 2, 5]);
    expect(amounts.map((amount) => amount.bytes)).toEqual([7, 10, 16, 16, 33].map((units) => units * PROPOSED_BOUNDS.entryBytes));
    expect(r.holders["root"]!.amount.entries).toBe(28);
    expect(amounts.map(({ items, records }) => [items, records])).toEqual([[2, 1], [1, 1], [2, 2], [4, 2], [5, 4]]);
    // The shared marker sum already includes the state task. Adding the pending table again would double-count it.
    expect(markerAmounts(definition.markers!).awaits("job", "open", [])).toBe(5);
    const marks = markerReservations(definition.markers!);
    expect([marks.awaits("job", "open", []).requests, marks.awaits("job", "open", ["a"]).requests]).toEqual([1, 0]);
    expect([marks.awaits("job", "open", []), marks.awaits("job", "open", ["a"])].map(({ items, records }) => [items, records])).toEqual([[1, 1], [0, 0]]);
    // Slot/state updates on existing subjects open neither items nor copies. The finite copy-settlement control can open a
    // result item, but its own relationship key exists already, so it reserves no new record for that update.
    expect(definition.markers!["job"]!.forms.filter((form) => ["acts.mark-a", "acts.mark-b", "acts.close"].includes(form.path)).map(({ amount }) => [amount.items, amount.records])).toEqual([[0, 0], [0, 0], [0, 0]]);
    const ownCopy = structuredClone(data);
    settlesOwnCopyChange(ownCopy);
    const checkedCopy = validateDefinition(parseStrictBytes(canonicalBytes(ownCopy)), PROPOSED_BOUNDS, PROFILES, { platform: true });
    expect(checkedCopy.ok).toBe(true);
    if (checkedCopy.ok) expect(checkedCopy.definition.pendingWorkAmounts.pendingCopies.map(({ amount }) => [amount.entries, amount.items, amount.records])).toEqual([[1, 1, 0]]);
    // The opt-in copy duty also counts a rule's opening, without charging
    // arbitrary state changes that a settling rule is forbidden to return.
    settlesMarkedCopyChange(ownCopy);
    const markedCopy = validateDefinition(parseStrictBytes(canonicalBytes(ownCopy)), PROPOSED_BOUNDS, PROFILES, { platform: true });
    expect(markedCopy.ok).toBe(true);
    // The handler also reserves its retained foreign source entry.
    if (markedCopy.ok) expect(markedCopy.definition.pendingWorkAmounts.pendingCopies.map(({ amount }) => amount)).toEqual([{ entries: 1, items: 1, records: 0, bytes: 2 * PROPOSED_BOUNDS.entryBytes, requests: 0 }]);

    const holder = structuredClone(ownCopy);
    holder.items["result"]!.holds = { requests: 1 };
    delete holder.acts["mark-a-far"];
    holder.receives["record-a"]!.opens = "result";
    holder.receives["record-a"]!.effects = holder.receives["record-a"]!.effects.filter(effect => !("code" in effect));
    const copyHolder = validateDefinition(holder, PROPOSED_BOUNDS, PROFILES, { platform: true });
    expect(copyHolder).toMatchObject({ ok: false, problems: expect.arrayContaining([expect.objectContaining({ code: "holds", path: "receives.record-a.opens" })]) });
    holder.receives["record-a"]!.opens = null;
    holder.acts["mark-a-far"] = structuredClone(ownCopy.acts["mark-a-far"]!);
    const actHolder = validateDefinition(holder, PROPOSED_BOUNDS, PROFILES, { platform: true });
    expect(actHolder).toMatchObject({ ok: false, problems: expect.arrayContaining([expect.objectContaining({ code: "holds", path: "acts.mark-a-far.on" })]) });
  });

  test("18.51 cases 2 and 3, and the grammar: the mark is a required truth value with the default false that is not fixed, `in` lists no final state, and no written effect sets the mark but to true", () => {
    const settles = (change: Record<string, unknown>) => (d: { acts: Record<string, { settles: unknown }> }) => { d.acts["mark-b"]!.settles = { of: "on", sets: "b", in: ["open", "held"], ...change }; };
    // Case 2: `in` lists a final state.
    expect(refusals(M, settles({ in: ["open", "done"] }))).toEqual(["final acts.mark-b.settles.in.1"]);
    // Case 3: an act sets the mark from a field. So does one that sets it to `false`, and one that empties it.
    for (const from of [{ field: "flag" }, { const: false }, null]) {
      expect(refusals(M, (d) => { d.acts.start.fields.flag = { type: "bool", required: true }; d.acts.start.effects.push({ value: { slot: "b", from } }); }), JSON.stringify(from)).toEqual(["shape acts.start.effects.1.value"]);
    }
    // The slot: not a truth value, not required, with no default, with the default `true`, fixed, or no value slot.
    const slot = (change: Record<string, unknown> | null) => (d: { items: { job: { values: Record<string, unknown> } }; acts: Record<string, { settles: unknown; effects: unknown[] }> }) => {
      if (change === null) delete (d.items.job.values["b"] as { default?: boolean }).default;
      else Object.assign(d.items.job.values["b"] as object, change);
      // A fixed slot is set by no transition, so the form's own effect is left out there.
      if (change?.["fixed"]) d.acts["mark-b"]!.effects = [];
    };
    for (const change of [{ required: false }, null, { default: true }, { fixed: true }]) expect(refusals(M, slot(change)), JSON.stringify(change)).toContain("name acts.mark-b.settles.sets");
    expect(refusals(M, settles({ sets: "desk" }))).toEqual(["name acts.mark-b.settles.sets"]);
    expect(refusals(M, settles({ sets: "none" }))).toEqual(["name acts.mark-b.settles.sets"]);
    // `of` follows the rule of the first form: it is not the item that the entry opens.
    expect(refusals(M, (d) => { d.acts.start.settles = { of: "on", sets: "a", in: ["open"] }; })).toEqual(["name acts.start.settles.of"]);
    // A form states one `settles`, of one form.
    expect(refusals(M, settles({ copy: ["set"] }))).toEqual(["shape acts.mark-b.settles"]);
  });

  test("a definition with no settlement by a mark has no marker data, and counts as it did", () => {
    const plain = valid(changed(M, settlesChanges.plain));
    expect([plain.markers, plain.pending]).toEqual([undefined, { job: { open: 1 } }]);
    expect(itemAwaits(plain, { type: "job", state: "open", values: {} })).toBe(0);
  });
});

/**
 * M5, of witness 18.54, cases 13 and 14: made-up platform data, in which
 * the handler `flag` settles a job by the mark `a`, has no written effect,
 * and has an effect mark whose rule sets `a` to `true`. The rule is a
 * STAND-IN. The witness's mark states `most: { effects: 2 }`: the member
 * `most` of a mark is row I3-52's, so here the rule's code states it.
 */
const M5 = "platform:marks@1" as PlatformDefinition;
const m5 = () => valid(changed(M, settlesChanges.m5, true));
const raising = (effects: (item: number) => RuleEffect[]): PlatformRules =>
  ({ named: M5, rules: { raise: { place: "effect", most: 2, run: ({ resolved }) => effects(resolved.subjects.get("also.job")!.id) } } });

describe("18.54 cases 13 and 14: a rule of a form that declares settles", () => {
  /** A `flag` for that job, from the directory, in an entry made by hand that nothing judged. */
  const flag = (G: Full, id: number, platform: PlatformRules, seq: number) => {
    const send = { n: 0, to: G.at, message: { class: "request", type: "tell", body: { message: "flag", fields: { job: G.fact(id) } } } } as const;
    const source = forged(directory, seq, { type: "checkpoint", through: 0, state: entryHash(G.last) }, [send]);
    const arrival = { ...send, from: factRefOf(source.entry) };
    return G.commit(judgeDelivery(G.state, G.definition, arrival, { ...arriving(G, arrival, { ...source, under: "desk" }), platform }));
  };

  test("18.54 case 13: the mark of a settling form counts no change of state, so (job, a) reserves 1 entry, and a flag at a full scope is settling and is written", () => {
    const definition = m5();
    expect([job(definition, "open"), definition.markers!["job"]!.forms.map((form) => form.base)]).toEqual([1, [1]]);
    const G = new Full(definition);
    const id = G.started();
    const set = raising((item) => [{ effect: "value", item, slot: "a", value: true }]);
    expect([G.free(0).budget > 0, flag(G, id, set, 300), G.item(id).values["a"], G.awaits(id)]).toEqual([true, "settles", true, 0]);
    // A second flag finds the mark `true`: the job awaits nothing, and the entry is new work.
    expect(flag(G.free(0), id, set, 301)).toBe("scope-full");
  });

  test("18.54 case 14: a rule of a settling form that returns a state effect, a deadline, or a mark that is not true, has a fault, and nothing is written", () => {
    const G = new Full(m5());
    const id = G.started();
    const head = G.head.seq;
    const faults: ((item: number) => RuleEffect[])[] = [
      (item) => [{ effect: "value", item, slot: "a", value: true }, { effect: "state", item, state: "held" }],
      (item) => [{ effect: "value", item, slot: "until", value: "2026-10-04T13:00:00Z" }],
      (item) => [{ effect: "value", item, slot: "a", value: false }],
      (item) => [{ effect: "value", item, slot: "a", value: null }],
    ];
    faults.forEach((rule, i) => expect(flag(G.free(9), id, raising(rule), 310 + i), String(i)).toBe("unavailable"));
    expect([G.head.seq, G.item(id).state, G.item(id).values["a"]]).toEqual([head, "open", false]);
  });
});

// The made-up platform data is typed as data: no runtime holds it.
void (M as unknown as PlatformData);
