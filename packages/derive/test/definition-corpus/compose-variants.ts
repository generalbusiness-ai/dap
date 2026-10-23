/* eslint-disable @typescript-eslint/no-explicit-any */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { ticket } from "./fixture-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";
export const pausing = (d: any) => {
    d.items.request.states.paused = { final: false };
    d.items.request.values.until = { fixed: false, required: false, of: { type: "time" } };
    d.timed.pause = { on: "request", states: ["asked"], deadline: "until", effects: [{ state: "paused" }], attention: [] };
    d.acts.ask.fields.until = { type: "time", required: true };
    d.acts.ask.effects.push({ value: { slot: "until", from: { field: "until" } } });
  };
export const composeChange0 = (t:any) => { t.acts.file.fields.claim = { type: "fact", kind: ["open-issue"], under: "desk", required: true }; };
export const composeChange1 = (def:any) => {
      def.rules.never = "false";
      def.acts.file.guards.push({ rule: "never" });
      def.receives.closes.guards.push({ rule: "never" });
    };
export const composeChange2 = (proof:object) => (def:any) => {
      def.acts.file.fields.proof = proof;
      def.acts.file.guards.push({ fact: { field: "proof", where: [{ equals: { a: { field: "performer" }, b: { field: "opener" } } }] } });
    };
export const composeChange3 = (proof:object) => (def:any) => {
      def.acts.file.fields.proof = proof;
      def.acts.file.fields.zItem = { type: "item", of: "intent", required: true };
    };
export const composeChange4 = (proof:object) => (def:any) => { def.acts.ask.fields.proof = proof; };
export const composeChange5 = (def:any) => {
      def.items.request.parties = { owner: { fixed: false, required: false, list: false, author: true }, authors: { fixed: false, required: false, list: true, max: 4, author: false } };
      def.acts.ask.sends[0].tell.result.applied = [{ state: "answered" }, { party: { slot: "owner", from: { signer: true } } }, { attribute: { slot: "authors", of: "on" } }];
    };
export const composeChange6 = (cohort:"legacy"|"whole-scope") => (d:any) => {
      if (cohort === "whole-scope") d.capacity = { name: "whole-scope", version: 1 };
      pausing(d);
      d.acts.ask.sends[0].tell.result = { applied: [{ state: "asked" }] };
      d.acts.ask.sends.push(structuredClone(d.acts.ask.sends[0]));
    };
export const composeChange7 = (cohort:"legacy"|"whole-scope",listed:string[]) => (d:any) => {
 const form={also:{},fields:{},guards:[],effects:[],sends:[],attention:[]};
      if (cohort === "whole-scope") d.capacity = { name: "whole-scope", version: 1 };
      pausing(d);
      d.acts.ask.sends[0].tell.result = { applied: [{ state: "asked" }] };
      d.items.job = {
        many: true, max: 4, states: { requested: { final: false }, "timed-out": { final: false }, passed: { final: false } }, initial: "requested", parties: {},
        refs: { desk: { fixed: true, required: true, to: { type: "scope", kind: "directory" } } }, values: { until: { fixed: false, required: true, of: { type: "time" } } },
      };
      d.acts.request = {
        ...form, step: "open", on: "job", grant: "request", fields: { until: { type: "time", required: true }, desk: { type: "scope", kind: "directory", required: true } },
        effects: [{ value: { slot: "until", from: { field: "until" } } }, { ref: { slot: "desk", from: { field: "desk" } } }],
      };
      d.acts.check = {
        ...form, step: "transition", on: "job", grant: "check", settles: { of: "on", in: listed }, fields: { ok: { type: "bool", required: true } },
        guards: [{ state: ["requested", "timed-out", "passed"] }], effects: [{ state: "passed", if: [{ equals: { a: { field: "ok" }, b: { const: true } } }] }],
        sends: [{ tell: { to: { slot: "desk" }, message: "checked", fields: {}, result: {} } }],
      };
      d.acts.note = { ...form, step: "comment", on: null, grant: "note" };
      d.timed.deadline = { on: "job", states: ["requested"], deadline: "until", effects: [{ state: "timed-out" }], attention: [] };
      d.receives.closes.settles = { copy: ["set"] };
    };
export const composeChange8 = (d:any) => {
 const form={also:{},fields:{},guards:[],effects:[],sends:[],attention:[]};
      // Defined, not assigned: an assignment to `__proto__` would set the prototype.
      const proto = { many: true, max: 4, states: { open: { final: false }, done: { final: true } }, initial: "open", parties: {}, refs: {}, values: {} };
      Object.defineProperty(d.items, "__proto__", { value: proto, enumerable: true, writable: true, configurable: true });
      Object.assign(d.acts, {
        start: { ...form, step: "open", on: "__proto__", grant: "start" },
        finish: { ...form, step: "transition", on: "__proto__", grant: "finish", settles: { of: "on", in: ["open"] }, guards: [{ state: ["open"] }], effects: [{ state: "done" }] },
        note: { ...form, step: "comment", on: null, grant: "note" },
      });
    };
export const composeChange9 = (d:any) => { pausing(d); d.timed.lapse = { ...d.timed.pause, states: ["paused"], effects: [{ state: "failed" }] }; };
const proof={type:"fact",kind:["assign"],under:"lane",required:true};
const raw=(change:(d:any)=>void)=>()=>{const d=structuredClone(ticket);change(d);return d;};
export const composeVariantDefinitions:readonly DefinitionCorpusRow[]=[
 {name:"derive/compose/variant 0",origins:["packages/derive/test/compose.test.ts#variant occurrence 0"],declaration:raw(composeChange0),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 1",origins:["packages/derive/test/compose.test.ts#variant occurrence 1"],declaration:raw(composeChange1),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 2",origins:["packages/derive/test/compose.test.ts#variant occurrence 2"],declaration:raw(composeChange2(proof)),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 3",origins:["packages/derive/test/compose.test.ts#variant occurrence 3"],declaration:raw(composeChange3(proof)),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 4",origins:["packages/derive/test/compose.test.ts#variant occurrence 4"],declaration:raw(composeChange4(proof)),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 5",origins:["packages/derive/test/compose.test.ts#variant occurrence 5"],declaration:raw(composeChange5),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 6 legacy 0",origins:["packages/derive/test/compose.test.ts#variant occurrence 6 legacy 0"],declaration:raw(composeChange6("legacy")),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 6 whole-scope 0",origins:["packages/derive/test/compose.test.ts#variant occurrence 6 whole-scope 0"],declaration:raw(composeChange6("whole-scope")),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 7 legacy 0",origins:["packages/derive/test/compose.test.ts#variant occurrence 7 legacy 0"],declaration:raw(composeChange7("legacy",["requested","timed-out"])),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 7 legacy 1",origins:["packages/derive/test/compose.test.ts#variant occurrence 7 legacy 1"],declaration:raw(composeChange7("legacy",["timed-out"])),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 7 whole-scope 0",origins:["packages/derive/test/compose.test.ts#variant occurrence 7 whole-scope 0"],declaration:raw(composeChange7("whole-scope",["requested","timed-out"])),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 7 whole-scope 1",origins:["packages/derive/test/compose.test.ts#variant occurrence 7 whole-scope 1"],declaration:raw(composeChange7("whole-scope",["timed-out"])),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 8",origins:["packages/derive/test/compose.test.ts#variant occurrence 8"],declaration:raw(composeChange8),bounds:PROPOSED_BOUNDS},
 {name:"derive/compose/variant 9",origins:["packages/derive/test/compose.test.ts#variant occurrence 9"],declaration:raw(composeChange9),bounds:PROPOSED_BOUNDS},
];
