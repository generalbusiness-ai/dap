/* eslint-disable @typescript-eslint/no-explicit-any */
import { PROPOSED_BOUNDS, type Bounds, type FieldValue, type Guard, type Operand, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import type { Scope } from "../fixtures-entry.ts";
import { jobs, act, text, named } from "./forms-guards-data.ts";
import { desk } from "./fixture-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";
const stopped: Bounds = { ...PROPOSED_BOUNDS, guardPage: 2, guardScan: 3 };
export type Row = [name: string, guards: Guard[], given: (s: Scope) => Record<string, FieldValue>, expected: string, more?: { job?: number; bounds?: Bounds }];
const facts = (...kind: string[]) => ({ type: "list", of: { type: "fact", kind, under: "jobs" }, max: 8, required: false }) as const;

const none = () => ({});
const some = (states: string[], name: Operand): Guard => ({ some: named(states, name) });
// Over the passed jobs, a witness for `a` is in the first page; a scan for a name that no job has does not finish when it stops after three.
const holds = some(["passed"], { const: "a" });
const fails = some(["failed"], { const: "zz" });
const open = some(["passed"], { const: "zz" });

export function probingData(rows: readonly Row[]): DeclaredDefinition {
  const d: any = structuredClone(jobs);
  ((d) => rows.forEach(([, guards, , , more], i) => {
  d.acts[`probe-${i}`] = act({
    step: "transition", on: "board", grant: "merge", guards, also: more?.job === undefined ? {} : { job: { item: "job", by: "job" } },
    fields: {
      names: { type: "list", of: text, max: 8, required: false }, listed: { type: "list", of: { type: "item", of: "job" }, max: 8, required: false },
      stated: facts("request", "pass"), proofs: facts("pass"), ...(more?.job === undefined ? {} : { job: { type: "item", of: "job", required: true } }),
    },
  });
}))(d);
  return d;
}
export function guardRows0(): Row[] {
    const n: Operand = { element: "n" };
    const kept = [{ differs: { a: n, b: { const: "skip" } } }];
    const has: Guard[] = [{ has: { list: { field: "names" }, as: "n", where: kept, guards: [some(["passed"], n)] } }];
    const each: Guard[] = [{ each: { list: { field: "names" }, as: "n", where: kept, guards: [some(["passed"], n)] } }];
    const names = (...list: string[]) => () => ({ names: list });
    return [
      // The guards of an act are one list: the first is not completed, and the second is false on complete evidence.
      ["a guard that is false refuses, after one that is not completed", [open, { ...fails, reason: "later" }], none, "later", { bounds: stopped }],
      ["an alternative holds beside one that is not completed", [{ anyOf: [[open], [holds]] }], none, "passes", { bounds: stopped }],
      ["no alternative holds, and one is not completed", [{ anyOf: [[open], [fails]] }], none, "guard-incomplete", { bounds: stopped }],
      ["an alternative with a false guard is false, whatever its other guards are", [{ anyOf: [[open, fails]], reason: "no-alternative" }], none, "no-alternative", { bounds: stopped }],
      ["every alternative is false", [{ anyOf: [[fails], [holds, fails]] }], none, "guard-failed"],
      ["`has`: an element holds beside one that is not completed", has, names("zz", "a"), "passes", { bounds: stopped }],
      ["`has`: no element holds, and one is not completed", has, names("zz"), "guard-incomplete", { bounds: stopped }],
      ["`has`: an empty list fails", has, names(), "guard-failed"],
      ["`has`: a field that is absent is an empty list", has, none, "guard-failed"],
      ["`has`: an element that the `where` leaves out is not judged", [{ has: { list: { field: "names" }, as: "n", where: [{ differs: { a: n, b: { const: "a" } } }], guards: [some(["passed"], n)] } }], names("a"), "guard-failed"],
      ["`each`: an empty list holds", each, names(), "passes"],
      ["`each`: an element that the `where` leaves out is not judged", each, names("skip", "a"), "passes"],
      ["`each`: every other element is judged", each, names("skip", "a", "f"), "guard-failed"],
      // The nested guard reads the state of the job, which is the subject of the guard that holds it.
      ["a nested guard takes the subject of the guard that holds it", [{ of: "also.job", anyOf: [[{ state: ["failed"] }]] }], none, "passes", { job: 7 }],
      ["and fails on that subject", [{ of: "also.job", anyOf: [[{ state: ["failed"] }]] }], none, "guard-failed", { job: 8 }],
    ];
}
export function guardRows1(): Row[] {
    const key: Operand = { element: "f", part: { field: "name" } };
    const distinct: Guard[] = [{ distinct: { list: { field: "stated" }, as: "f", key } }];
    const stated = (...seqs: number[]) => (s: Scope) => ({ stated: seqs.map((seq) => s.fact(seq)) });
    const same = (states: string[], more: object = {}): Guard[] => [{ sameSet: { list: { field: "listed" }, as: "j", key: { element: "j" }, items: { type: "job", states }, ...more } }];
    const listed = (...ids: number[]) => () => ({ listed: ids });
    const unsettled = ["failed", "requested"];
    return [
      // From the exact counts: one job is requested, and it is the one left out.
      ["a range with no `where` leaves out the `except` subject", [{ none: { type: "job", states: ["requested"], except: ["also.job"] } }], none, "passes", { job: 8 }],
      ["an `except` subject in another state leaves nothing out", [{ none: { type: "job", states: ["requested"], except: ["also.job"] } }], none, "guard-failed", { job: 7 }],
      ["a range with a `where` leaves out the `except` subject", [{ none: named(["failed"], { const: "f" }, { except: ["also.job"] }) }], none, "passes", { job: 7 }],
      ["a range with a `where` keeps every other item", [{ none: named(["failed"], { const: "f" }, { except: ["also.job"] }) }], none, "guard-failed", { job: 8 }],
      ["a `where` takes `differs`", [{ some: { type: "job", states: ["failed"], where: [{ differs: { a: { slot: "name" }, b: { const: "f" } } }] } }], none, "guard-failed"],
      // The board's `approvals` is 4, and four jobs passed.
      ["a `min` read from a slot is met", [{ count: { type: "job", states: ["passed"], min: { slot: "approvals" } } }], none, "passes"],
      ["a `max` read from a slot is broken", [{ count: { type: "job", states: ["passed", "failed"], max: { slot: "approvals" } } }], none, "guard-failed"],
      ["a bound read from an empty slot fails the guard", [{ count: { type: "job", states: ["passed"], min: { slot: "spare" } } }], none, "guard-failed"],
      // The key is the `name` field of each entry, read from this scope's own history. Entry 9 is a `pass`, which has none.
      ["`distinct`: two keys", distinct, stated(3, 4), "passes"],
      ["`distinct`: two elements with one key", distinct, stated(4, 5), "guard-failed"],
      ["`distinct`: a key that is none", distinct, stated(3, 9), "guard-failed"],
      ["`sameSet`: the keys are the items of the range", same(unsettled, { ordered: true }), listed(7, 8), "passes"],
      ["`sameSet`: with `ordered`, the keys ascend", same(unsettled, { ordered: true }), listed(8, 7), "guard-failed"],
      ["`sameSet`: in any order without it", same(unsettled), listed(8, 7), "passes"],
      ["`sameSet`: an item with no key", same(unsettled), listed(7), "guard-failed"],
      ["`sameSet`: a key with no item", same(["failed"]), listed(7, 8), "guard-failed"],
      ["`sameSet`: a key twice", same(["failed"]), listed(7, 7), "guard-failed"],
      ["`sameSet`: `match` holds between each element and its own item", same(unsettled, { match: [{ differs: { a: { slot: "name" }, b: { const: "q" } } }] }), listed(7, 8), "passes"],
      ["`sameSet`: `match` fails on one item", same(unsettled, { match: [{ differs: { a: { slot: "name" }, b: { const: "r" } } }] }), listed(7, 8), "guard-failed"],
      ["`sameSet`: the range is not read whole", same(["passed"]), listed(3, 4, 5, 6), "guard-incomplete", { bounds: stopped }],
      ["`sameSet`: the same range, read whole", same(["passed"]), listed(3, 4, 5, 6), "passes"],
    ];
}
export const guardRows2 = (): Row[] => [["each proof is a `pass`", [{ each: { list: { field: "proofs" }, as: "p", guards: [{ fact: { element: "p" } }] }, reason: "not-a-pass" }], none, "passes"]];
export function timedGuardData(second: Guard): DeclaredDefinition { const d: any=structuredClone(desk); ((d) => {
      d.items.repo.values.due = { fixed: false, required: false, of: { type: "time" } };
      d.receives.audit = { message: "audit", class: "tell", from: { kind: "lane" }, fields: {}, opens: null, also: { repo: { item: "repo", one: true } }, guards: [{ of: "also.repo", anyOf: [[{ set: "source" }], [second]] }], effects: [], sends: [], attention: [] };
    })(d); return d; }
export function auditingGuardData(): DeclaredDefinition {
    const checked = (name: Operand): Guard => ({ each: { list: { field: "checks" }, as: "k", where: [{ equals: { a: { element: "k.required" }, b: { const: true } } }], guards: [{ differs: { a: { element: "k.name" }, b: name } }] }, reason: "required" });
    // Row I3-49 (the contract's section 6.2, point DF1, and section 15.3g, "A list inside a record"): a member of a record may be a
    // list, and the `list` of an `each` may name that member of an element. No path of any check is the barred name.
    const pathed: Guard = { each: { list: { field: "checks" }, as: "k", guards: [{ each: { list: { element: "k.paths" }, as: "p", guards: [{ differs: { a: { element: "p" }, b: { field: "barred" } } }] } }] }, reason: "path" };
 const d: any=structuredClone(desk); ((d) => {
      const check = { type: "record", of: { name: { type: "text", max: 16, required: true }, required: { type: "bool", required: true }, paths: { type: "list", of: { type: "text", max: 16 }, max: 4, required: false } } };
      d.receives.audit = {
        message: "audit", class: "tell", from: { kind: "lane" }, fields: { barred: { type: "text", max: 16, required: true }, checks: { type: "list", of: check, max: 4, required: true } }, opens: null,
        also: {}, guards: [checked({ field: "barred" }), pathed], effects: [], sends: [], attention: [],
      };
    })(d); return d;
}
export const guardedOtherChange = (d: any) => {
        Object.assign(d.acts.request, { also: { other: { item: "job", by: "other" } }, fields: { ...d.acts.request.fields, other: { type: "item", of: "job", required: true } } });
        d.acts.request.guards.push({ of: "also.other", anyOf: [[{ set: "name" }]] });
      };
export const deep = (depth: number): unknown => (depth === 1 ? { state: ["open"] } : { anyOf: [[deep(depth - 1)]] });
export const guardAdditionalDefinitions: readonly DefinitionCorpusRow[] = [
  ...[guardRows0,guardRows1,guardRows2].map((rows,i)=>({name:`derive/guards/probing group ${i}`,origins:[`packages/derive/test/forms-guards.test.ts#judged group ${i}`],declaration:()=>probingData(rows()),bounds:PROPOSED_BOUNDS})),
  ...([{unset:"due"},{before:{slot:"due"}}] as const).map((guard,i)=>({name:`derive/guards/timed ${i}`,origins:[`packages/derive/test/forms-guards.test.ts#timed ${i}`],declaration:()=>timedGuardData(guard),bounds:PROPOSED_BOUNDS})),
  {name:"derive/guards/auditing",origins:["packages/derive/test/forms-guards.test.ts#auditing"],declaration:auditingGuardData,bounds:PROPOSED_BOUNDS},
  {name:"derive/guards/nascent other",origins:["packages/derive/test/forms-guards.test.ts#nested guard other"],declaration:()=>{const d: any=structuredClone(jobs);guardedOtherChange(d);return d;},bounds:PROPOSED_BOUNDS},
  ...([{depth:3,bounds:{...PROPOSED_BOUNDS,guardDepth:3}},{depth:2,bounds:{...PROPOSED_BOUNDS,nestedGuards:5}}]).map(({depth,bounds})=>({name:`derive/guards/deep ${depth}`,origins:[`packages/derive/test/forms-guards.test.ts#deep ${depth}`],declaration:()=>{const d: any=structuredClone(jobs); d.acts.merge.guards.push(deep(depth));return d;},bounds})),
];
