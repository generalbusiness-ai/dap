import { probingData, guardRows0, guardRows1, guardRows2, timedGuardData, auditingGuardData, guardedOtherChange, deep, type Row } from "./definition-corpus/forms-guards-variants.ts";
import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Bounds, FieldValue, Guard, Operand, Send } from "@generalbusiness/dap-contract";
import { factRefOf } from "@generalbusiness/artroom-bytes";
import { judgeDelivery, validateDefinition, type ActJudgment, type Fetched, type ProblemCode } from "../src/index.ts";
import { Scope, arriving, fields, forged, created, keys, on, t, ticketDefinition, valid } from "./fixtures-entry.ts";

const { rita } = keys;

/**
 * A board with jobs, made up for these tests. The board keeps the names of
 * the checks it requires, and a number of approvals. A job has a name, and
 * is requested, then passed or failed. `merge` needs, for each required
 * check, no failed job and a passed job of that name.
 */
import { named, jobs } from "./definition-corpus/forms-guards-data.ts";

/** A board that requires those checks, with those jobs in the order given, each left requested or settled. `ordinal` tells two boards apart. */
function board(definition: ReturnType<typeof valid>, required: string[], made: [name: string, end: "pass" | "fail" | null][], ordinal = 0): Scope {
  const s = new Scope(definition, rita.member, true, ordinal);
  s.did(rita, "rule", { ...on(s, 0), ...fields({ required, approvals: 4 }) });
  for (const [name, end] of made) {
    const job = s.did(rita, "request", fields({ name })).seq;
    if (end) s.did(rita, end, on(s, job));
  }
  return s;
}
/** What a judgment says: that the act is written, the name or the code of its refusal, or why it is not judged. */
const said = (j: ActJudgment) => (j.result === "write" ? "passes" : j.result === "refused" ? (j.name ?? j.reason) : j.result === "unavailable" ? j.reason : j.result);
/** A scan that stops after three items. */
const stopped: Bounds = { ...PROPOSED_BOUNDS, guardPage: 2, guardScan: 3 };

describe("list guards with an unfinished scan (section 6.5; witness 18.2)", () => {
  test("each required check needs a passed job: both pass; one has none, on complete evidence; one read stops with no witness; one is false and another's read stops", () => {
    const definition = valid(validateDefinition(jobs, PROPOSED_BOUNDS));
    const merge = (required: string[], made: Parameters<typeof board>[2], bounds = PROPOSED_BOUNDS) => {
      const s = board(definition, required, made);
      const j = s.judge(s.intent(rita, "merge", on(s, 0)), { bounds });
      return j.result === "refused" ? [said(j), j.reason, j.detail] : said(j);
    };
    const others: Parameters<typeof board>[2] = [["x", "pass"], ["x", "pass"], ["x", "pass"]];
    const refused = ["required-check-not-passed", "guard-failed", "guards.0"];
    expect([
      // Case 1: `a` passed and `b` passed. Each `some` holds by one witness.
      merge(["a", "b"], [["a", "pass"], ["b", "pass"]]),
      // Case 2: `b` has no passed job. Every page was read, so that is complete evidence, and the refusal carries the guard's name.
      merge(["a", "b"], [["a", "pass"], ["b", null]]),
      // Case 3: `a` passed, by a witness in the first page. The read for `b` stops at the work limit with no witness. No guard is false.
      merge(["a", "b"], [["a", "pass"], ...others], stopped),
      merge(["a", "b"], [["a", "pass"], ...others]),
      // Case 4: the read for `b` stops, and then `a` has a failed job, by one witness. One guard of the list is false on a completed
      // evaluation, and the unfinished read before it cannot change that.
      merge(["b", "a"], [["a", "fail"], ...others], stopped),
    ]).toEqual(["passes", refused, "guard-incomplete", refused, refused]);
  });
});

// One row of a table: an act with these guards, judged on the shared board with these fields. `job`: the item its `also.job` names.
const probing = (rows: readonly Row[]) => valid(validateDefinition(probingData(rows), PROPOSED_BOUNDS));
/**
 * The shared board. Entry 2 sets the rules. Jobs 3 to 8 are named a, x, x,
 * x, f and r. Entries 9 to 12 pass jobs 3 to 6, and entry 13 fails job 7.
 * Job 8 stays requested. Nothing is written after that: every row is judged
 * and not sealed. Returns the name of each row whose result is not the one
 * expected, with what it was.
 */
function judged(rows: readonly Row[]): [string, string][] {
  const s = board(probing(rows), ["a"], [["a", null], ["x", null], ["x", null], ["x", null], ["f", null], ["r", null]]);
  for (const job of [3, 4, 5, 6]) s.did(rita, "pass", on(s, job));
  s.did(rita, "fail", on(s, 7));
  return rows.flatMap(([name, , given, expected, more], i): [string, string][] => {
    const job = more?.job;
    const result = said(s.judge(s.intent(rita, `probe-${i}`, { ...on(s, 0, job === undefined ? {} : { job }), ...fields({ ...given(s), ...(job === undefined ? {} : { job }) }) }), { bounds: more?.bounds ?? PROPOSED_BOUNDS }));
    return result === expected ? [] : [[name, result]];
  });
}

describe("the list forms (section 6.5)", () => {
  test("`anyOf`, `has` and `each` have three results: an alternative or an element that holds completes the form, and one that is not completed leaves it so only when nothing else decides", () => {
    expect(judged(guardRows0())).toEqual([]);
  });

  test("a range leaves out the `except` subjects and takes `differs`; a count takes its bound from a slot; `distinct` and `sameSet` compare keys, and `sameSet` is an exact set on complete evidence", () => {
    expect(judged(guardRows1())).toEqual([]);
  });

  test("a `fact` guard over an element holds for each fact of a list: a local entry of a kind the list states, and a fetched entry, which is then in `uses`", () => {
    const rows: Row[] = guardRows2();
    const definition = probing(rows);
    const s = board(definition, [], [["a", "pass"], ["b", null]]);   // entry 3 requests job 3, entry 4 passes it, and entry 5 requests job 5
    const m = board(definition, [], [["c", "pass"]], 1);
    const fetched: Fetched = { fact: m.fact(4), entry: m.entries[4]!.entry, under: m.under };
    const probe = (proofs: FieldValue[], facts: Fetched[] = []) => s.judge(s.intent(rita, "probe-0", { ...on(s, 0), ...fields({ proofs }) }), { facts });
    const foreign = probe([s.fact(4), m.fact(4)], [fetched]);
    expect([said(foreign), foreign.result === "write" && foreign.draft.uses.map((u) => u.fact)]).toEqual(["passes", [m.fact(4)]]);
    // Entry 5 is this scope's own, and is a `request`: a value of the field's type, and not an entry of the kind that the type states.
    expect(said(probe([s.fact(4), s.fact(5)]))).toBe("not-a-pass");
  });

  test("an entry whose guards read the clock, also inside a list form, is not written while the clock is behind", () => {
    // A delivery may be written clamped when it judges no time (section 5.3). The first alternative holds, so the second is not evaluated.
    const timed = (second: Guard) => valid(validateDefinition(timedGuardData(second), PROPOSED_BOUNDS));
    const D = created();
    const tell: Send = { n: 0, to: D.at, message: { class: "request", type: "tell", body: { message: "audit", fields: {} } } };
    const source = forged(new Scope(ticketDefinition).at, 1, D.entries[0]!.entry.input, [tell]);
    const arrival = { ...tell, from: factRefOf(source.entry) };
    D.now = t(-10);
    const judged = (second: Guard) => { const j = judgeDelivery(D.state, timed(second), arrival, arriving(D, arrival, source)); return j.result === "unavailable" ? j.reason : j.result; };
    expect([judged({ unset: "due" }), judged({ before: { slot: "due" } })]).toEqual(["write", "clock-behind"]);
  });

  test("a handler reads the members of a record element of a list in its message, and a list that is a member of such an element", () => {
    const auditing = valid(validateDefinition(auditingGuardData(), PROPOSED_BOUNDS));
    const D = created();
    const X = new Scope(ticketDefinition);
    const decision = (barred: string, checks: unknown = [{ name: "lint", required: true }, { name: "docs", required: false }]) => {
      const tell: Send = { n: 0, to: D.at, message: { class: "request", type: "tell", body: { message: "audit", fields: { barred, checks } } } };
      const source = forged(X.at, 1, X.entries[1]!.entry.input, [tell]);
      const arrival = { ...tell, from: factRefOf(source.entry) };
      const j = judgeDelivery(D.state, auditing, arrival, arriving(D, arrival, source));
      return j.result === "write" && j.draft.input.type === "delivery" && "decision" in j.draft.input ? [j.draft.input.decision, j.draft.input.reason] : j.result;
    };
    // `docs` is not required, so the `where` leaves it out. `lint` is required, and is judged.
    expect([decision("docs"), decision("lint")]).toEqual([["applied", undefined], ["refused", { code: "guard-failed", name: "required" }]]);
    // The inner list is read from each element: a path of the second check is the barred name. A list of five is past its `max`.
    const paths = (...of: string[]) => [{ name: "lint", required: false, paths: ["src"] }, { name: "docs", required: false, paths: of }];
    expect([decision("a", paths("b", "c")), decision("c", paths("b", "c")), decision("a", paths("1", "2", "3", "4", "5"))]).toEqual([["applied", undefined], ["refused", { code: "guard-failed", name: "path" }], ["refused", { code: "bad-field" }]]);
    // A handler declares the fields of its message, so a value that is no list of such records is no value of the field.
    expect(decision("docs", "lint")).toEqual(["refused", { code: "bad-field" }]);
  });

  test("the validator refuses a list form that names what it does not have, and a nesting past the bounds", () => {
    const refusal = (change: (d: any) => void, bounds = PROPOSED_BOUNDS) => {   // eslint-disable-line @typescript-eslint/no-explicit-any
      const d = structuredClone(jobs);
      change(d);
      const result = validateDefinition(d, bounds);
      return result.ok ? null : [...new Set(result.problems.map((p) => p.code))];
    };
    const inMerge = (guard: unknown, bounds = PROPOSED_BOUNDS) => refusal((d) => d.acts.merge.guards.push(guard), bounds);
    const k: Operand = { element: "k" };
    const each = (guards: unknown[], list: unknown = { slot: "required" }) => ({ each: { list, as: "k", guards } });
    /** A guard nested that many deep: an `anyOf` in an `anyOf`, and so on. */

    const rows: [string, ProblemCode[] | null, ProblemCode | null][] = [
      ["an element outside the form that binds it", inMerge({ anyOf: [[each([]), { equals: { a: k, b: { const: "a" } } }]] }), "name"],
      ["a list form over a value that is no list", inMerge(each([], { slot: "approvals" })), "name"],
      ["a member of an element that is no record", inMerge(each([{ equals: { a: { element: "k.name" }, b: { const: "a" } } }])), "name"],
      ["a name for an element with a dot in it", inMerge({ each: { list: { slot: "required" }, as: "k.name", guards: [] } }), "shape"],
      ["a `fact` guard over an element that is not a fact", inMerge(each([{ fact: { element: "k" } }])), "name"],
      ["a `where` on a `fact` guard over an element", inMerge(each([{ fact: { element: "k", where: [] } }])), "shape"],
      ["`ifPresent` on a guard that names no field", inMerge({ ...each([]), ifPresent: true }), "shape"],
      ["an `anyOf` with no alternative", inMerge({ anyOf: [] }), "shape"],
      ["a `has` with no `where`", inMerge({ has: { list: { slot: "required" }, as: "k" } }), "shape"],
      ["an `except` subject of another type", inMerge({ none: { type: "job", states: ["requested"], except: ["on"] } }), "name"],
      ["an `except` subject that is the item its act opens", refusal((d) => d.acts.request.guards.push({ none: { type: "job", states: ["requested"], except: ["on"] } })), "nascent-guard"],
      ["a `sameSet` range that names the element", inMerge({ sameSet: { list: { slot: "required" }, as: "k", key: k, items: named(["requested"], k) } }), "name"],
      ["a count bound from a slot that is no number", inMerge({ count: { type: "job", states: ["passed"], min: { slot: "required" } } }), "name"],
      ["a nested guard that reads the item its act opens", refusal((d) => d.acts.request.guards.push({ anyOf: [[{ set: "name" }]] })), "nascent-guard"],
      ["a nested guard that reads the subject of the guard that holds it, in an act that opens an item", refusal(guardedOtherChange), null],
      ["a state effect whose only live-state guard is inside an alternative", refusal((d) => { d.acts.pass.guards = [{ anyOf: [[{ state: ["requested"] }]] }]; }), "final"],
      // Section 6.1, at small configured bounds: three deep, and five guards counting those nested. `merge` has three as it stands.
      ["a guard nested as deep as the bound", inMerge(deep(3), { ...PROPOSED_BOUNDS, guardDepth: 3 }), null],
      ["a guard nested deeper than the bound", inMerge(deep(4), { ...PROPOSED_BOUNDS, guardDepth: 3 }), "bound"],
      ["as many guards as the bound, counting those nested", inMerge(deep(2), { ...PROPOSED_BOUNDS, nestedGuards: 5 }), null],
      ["more guards than the bound, counting those nested", inMerge(deep(3), { ...PROPOSED_BOUNDS, nestedGuards: 5 }), "bound"],
    ];
    expect(rows.filter(([, matched, code]) => (code === null ? matched !== null : matched?.length !== 1 || matched[0] !== code)).map(([name, matched]) => [name, matched])).toEqual([]);
  });
});
