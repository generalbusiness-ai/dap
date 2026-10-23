import { finalHolderChange0, finalHolderChange1 } from "./definition-corpus/derive-reservation-variants.ts";
import { expect, test } from "vitest";
import type { Entry } from "@generalbusiness/dap-contract";
import { entryHash } from "@generalbusiness/artroom-bytes";
import { FoldError, applyEntry, drawsOf, heldReserved, stateDigest } from "../src/index.ts";
import { on, valid, HOLDS_OWNER as OWNER, TELL, HoldsWorks as Works, changed, opened, holdsWorks as works } from "./fixtures-entry.ts";

// Made-up platform data and callback rules in memory. These witnesses run
// the real judges, admission and fold; no Artroom platform scope or host is reached.

const definition = valid(changed(works, finalHolderChange0));
const started = () => {
  const s = new Works(definition);
  s.script.begin = ({ resolved }) => opened(0, "step", 1, resolved.self);
  expect(s.start()).toBe("written");
  const job = s.last.seq;
  return { s, job, step: s.opened()[0]! };
};

test("opt-in holder room survives an ordinary final transition and late outcomes; only its own final settlement permits release", () => {
  // Invariant: a final state alone never discards admitted holder room.
  // Real in-memory judges/fold; all platform data, callbacks, source
  // entries and authority are the explicitly made-up Works fixture.
  const under = valid(changed(works, finalHolderChange1));
  const run = (kind: string) => {
    const s = new Works(under);
    s.script.begin = ({ resolved }) => opened(0, "step", 1, resolved.self);
    expect(s.start()).toBe("written");
    const job = s.last.seq, step = s.opened()[0]!;
    const before = s.state.holder(job);
    expect(s.does(kind, on(s, job))).toBe("written");
    expect(s.item(job).state).toBe("done");
    expect(s.state.holder(job)).toEqual(before); // open work still reaches these kinds
    expect(s.outcome(step, 1, "confirmed")).toBe("written");
    expect(s.replay().all()).toEqual(s.state.all());
    return { s, job, before };
  };
  const ordinary = run("finish"), marked = run("mark-final"), settled = run("settle");
  expect(ordinary.s.state.holder(ordinary.job)).toEqual(ordinary.before);
  expect(ordinary.s.state.holderSettled(ordinary.job)).toBe(false);
  expect(heldReserved(ordinary.s.state, under).entries).toBeGreaterThan(0);
  expect([marked.s.state.holderSettled(marked.job), marked.s.state.holder(marked.job)]).toEqual([false, marked.before]);
  expect(settled.s.state.holder(settled.job)).toBeNull();
  expect(settled.s.state.holderSettled(settled.job)).toBe(true);
  expect(heldReserved(settled.s.state, under)).toEqual({ entries: 0, items: 0, records: 0, bytes: 0, requests: 0 });
});

test("a no-account result clause cannot draw a retained positive count from a final holder: nothing is written, the result stays offered, and the fold rejects the same draw", () => {
  const { s, job, step } = started();
  expect(s.outcome(step, 1, "unknown")).toBe("written");
  expect(s.does("finish", on(s, job))).toBe("written");
  const sent = s.last.seq;
  expect([s.state.account(sent, 0), s.item(job).state, s.state.holder(job)?.operations?.["tidy"]]).toEqual([null, "done", 1]);
  s.script.after = () => opened(0, "tidy", 1, job);
  const before = [s.entries.length, stateDigest(s.state.all())];
  expect([s.answered(sent), s.entries.length, stateDigest(s.state.all()), s.state.request(sent, 0)!.result]).toEqual(["unavailable", ...before, null]);

  // The fold and a replay use the same boundary: even this sealed-looking result cannot spend the final holder's count.
  const seq = s.last.seq + 1;
  const invalid: Entry = { ...s.last, seq, prev: s.head.hash, input: { type: "delivery", from: s.fact(0), n: 0, message: { class: "result", of: { from: s.fact(sent), n: 0 }, outcome: "applied" }, clause: "applied" },
    effects: [{ effect: "operation", k: 0, owner: OWNER, kind: "tidy", attempts: 1, for: job }, { effect: "attempt", operation: `${seq}:0`, attempt: 1, result: "opened", selected: null }], sends: [] };
  const copy = s.replay();
  expect(drawsOf(copy, definition, invalid)).toMatchObject({ fault: "no-holder" });
  expect(() => applyEntry(copy, definition, invalid, entryHash(invalid))).toThrow(FoldError);
  expect(stateDigest(copy.all())).toBe(before[1]);
});

test("a no-account result clause may draw from a holder that is still open", () => {
  const { s, job } = started();
  expect(s.does("ask", on(s, job))).toBe("written");
  const sent = s.last.seq;
  expect([s.state.account(sent, 0), s.item(job).state]).toEqual([null, "open"]);
  s.script.after = () => opened(0, "tidy", 1, job);
  expect([s.answered(sent), s.state.operation(s.opened()[0]!)!.for, s.state.holder(job)?.operations?.["tidy"] ?? 0]).toEqual(["written", job, 0]);
});

test("a final holder still funds an own-account result clause and its own outcome's late cleanup", () => {
  const answered = started();
  answered.s.script.report = () => TELL;
  expect(answered.s.does("finish", on(answered.s, answered.job))).toBe("written");
  expect(answered.s.outcome(answered.step, 1, "confirmed")).toBe("written");
  const sent = answered.s.last.seq;
  expect(answered.s.state.account(sent, 0)).toBe(answered.job);
  answered.s.script.after = () => opened(0, "tidy", 1, answered.job);
  expect([answered.s.answered(sent), answered.s.state.operation(answered.s.opened()[0]!)!.for]).toEqual(["written", answered.job]);

  const late = started();
  expect(late.s.outcome(late.step, 1, "unknown")).toBe("written");
  expect(late.s.does("finish", on(late.s, late.job))).toBe("written");
  late.s.script.derives = (_kind, _given, operation) => ({ effects: [], sends: [], opens: [{ owner: OWNER, kind: "tidy", attempts: 1, for: operation.for! }] });
  expect([late.s.outcome(late.step, 1, "confirmed"), late.s.state.operation(late.s.opened()[0]!)!.for]).toEqual(["written", late.job]);
});
