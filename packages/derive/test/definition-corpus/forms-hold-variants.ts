/* eslint-disable @typescript-eslint/no-explicit-any */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { ProblemCode } from "../../src/index.ts";
import { works } from "./forms-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";
type Change=(d:any)=>void;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
  const onHold = (effects: unknown[], more: object = {}) => ({ step: "transition", on: "hold", grant: "hold", also: {}, fields: {}, guards: [{ state: ["held"] }], effects, sends: [], attention: [], ...more });
  /** The lane's creation request, with those result clauses. */
  const asking = (d: any, result: object) => ({ create: { ...d.acts.link.sends[1].create, result } });
export const holdFormCases: readonly (readonly [string, Change, ProblemCode | readonly ProblemCode[] | null])[] = [
    ["the lane passes", () => {}, null],
    ["a hold's extent is any operand its act has", (d) => { d.acts["take-hold"].effects[2].hold.extent = { item: "also.commitment" }; }, null],
    ["a hold's extent that names no field", (d) => { d.acts["take-hold"].effects[2].hold.extent = { field: "none" }; }, "name"],
    ["a hold type with three states", (d) => { d.items.hold.states.paused = { final: false }; }, ["hold", "timed"]],
    ["a holder that is fixed", (d) => { d.items.hold.parties.holder.fixed = true; }, "hold"],
    ["an `under` that is not required", (d) => { d.items.hold.refs.under.required = false; }, "hold"],
    ["a hold under a hold", (d) => { d.items.hold.refs.under.to.of = "hold"; }, ["bound", "hold"]],
    ["an epoch that is no integer", (d) => { d.items.hold.values.epoch.of = { type: "text", max: 4 }; }, "hold"],
    ["an epoch that cannot rise from 1", (d) => { d.items.hold.values.epoch.of.max = 1; }, "hold"],
    ["an epoch with a default", (d) => { d.items.hold.values.epoch.default = 1; }, "hold"],
    ["two timed rules that end a hold", (d) => { d.timed.again = clone(d.timed["hold-end"]); }, "hold"],
    ["an end time that is not required", (d) => { d.items.hold.values.until.required = false; }, "hold"],
    ["two grants among the acts that open a hold", (d) => { d.acts["take-again"] = { ...clone(d.acts["take-hold"]), grant: "other" }; }, "hold"],
    ["an act that opens a hold type with no hold: open", (d) => { d.acts.sneak = clone(d.acts["take-hold"]); d.acts.sneak.effects.pop(); }, "hold"],
    ["a handler that opens a hold type", (d) => { d.receives.late = { message: "late", class: "tell", from: { kind: "lane" }, fields: clone(d.acts["take-hold"].fields), opens: "hold", also: {}, guards: [], effects: clone(d.acts["take-hold"].effects), sends: [], attention: [] }; }, "hold"],
    ["a state effect on a hold", (d) => { d.acts.stop = onHold([{ state: "ended" }]); }, "hold"],
    ["a party effect on a hold's holder", (d) => { d.acts.hand = onHold([{ party: { slot: "holder", from: { signer: true } } }]); }, "hold"],
    ["a value effect on a hold's epoch", (d) => { d.acts.reset = onHold([{ value: { slot: "epoch", from: { const: 1 } } }]); }, "hold"],
    ["an end time set from a field", (d) => { d.acts.extend = onHold([{ value: { slot: "until", from: { field: "until" } } }], { fields: { until: { type: "time", required: true } } }); }, "hold"],
    ["two hold effects on one hold", (d) => d.acts.renew.effects.push({ hold: { do: "end" } }), "conflict"],
    ["a renewal that sets no end", (d) => d.acts.renew.effects.shift(), "hold"],
    ["a renewal by a handler, which has no signer", (d) => {
      d.receives.late = { message: "late", class: "tell", from: { kind: "lane" }, fields: { hold: { type: "item", of: "hold", required: true } }, opens: null, also: { hold: { item: "hold", by: "hold" } }, guards: [], effects: [{ of: "also.hold", hold: { do: "renew" } }], sends: [], attention: [] };
    }, "hold"],
    ["hold: end with no guard that its hold is live", (d) => d.acts.release.guards.shift(), "final"],
    // A result clause runs in a later entry, which has no signer. It may end a hold, and its hold is checked when it runs.
    ["a result clause that ends a hold, of an act that opens it and so has no guard on it", (d) => { d.acts["take-hold"].sends = [asking(d, { refused: [{ hold: { do: "end" } }] })]; }, null],
    ["a result clause that renews a hold", (d) => { d.acts.release.sends = [asking(d, { refused: [{ hold: { do: "renew" } }] })]; }, "hold"],
    ["a timed rule that ends an item which more holds may be under than its entry could record", (d) => {
      d.items.hold.max = 2000;
      d.items.commitment.values.due = { fixed: false, required: false, of: { type: "time" } };
      d.timed.lapse = { on: "commitment", states: ["offered"], deadline: "due", effects: [{ state: "withdrawn" }], attention: [] };
    }, "bound"],
  ];
export const shortEpochChange=(def:any)=>{ def.items.hold.values.epoch.of.max = 3; };
export const holdFormDefinitions: readonly DefinitionCorpusRow[]=[
  ...holdFormCases.filter(([, , code])=>code===null).map(([name,change])=>({name:`derive/hold/${name}`,origins:[`packages/derive/test/forms-hold.test.ts#rows:${name}`],declaration:()=>{const d=clone(works);change(d);return d;},bounds:PROPOSED_BOUNDS})),
  {name:"derive/hold/short epoch",origins:["packages/derive/test/forms-hold.test.ts#a renewal by another member"],declaration:()=>{const d=clone(works);shortEpochChange(d);return d;},bounds:PROPOSED_BOUNDS},
];
