/* eslint-disable @typescript-eslint/no-explicit-any */
import { PROPOSED_BOUNDS, type PlatformData } from "@generalbusiness/dap-contract";
import { PROFILES } from "../../src/index.ts";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import { works } from "./holds-data.ts";
import { weigher } from "./observes-data.ts";
import { ticket } from "./fixture-data.ts";
import { settlingPlatformMarksData } from "./platform-requests-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";
const clause = { applied: [{ code: "after", row: "P16", most: { effects: 0, operations: ["tidy"] } }] };
export const finalHolderChange0 = (data:any) => {
  data.items.job.refs.peer = { fixed: true, required: true, to: { type: "scope", kind: "lane" } };
  data.receives.start.effects.push({ ref: { slot: "peer", from: { sender: true } } });
  data.acts.finish.sends = [{ tell: { to: { slot: "peer" }, message: "hello", fields: {}, result: clause } }];
  data.acts.ask = { ...data.acts.finish, effects: [] };
  data.outcomes.step.send.result = clause;
};
export const finalHolderChange1 = (data:any) => {
    data.capacity = { name: "whole-scope", version: 1 };
    data.acts.settle = structuredClone(data.acts.finish);
    data.acts.settle.settles = { of: "on", in: ["open"] };
    data.items.job.values.mark = { fixed: false, required: true, of: { type: "bool" }, default: false };
    data.acts["mark-final"] = structuredClone(data.acts.finish);
    data.acts["mark-final"].settles = { of: "on", sets: "mark", in: ["open"] };
    data.acts["mark-final"].effects.unshift({ value: { slot: "mark", from: { const: true } } });
  };
export const clauseSends = (identical = false, distinct = false, conditional = true, effects = false) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data: any) => {
    data.acts.go.fields = {
      choice: { type: "bool", required: true },
      first: { type: "member", required: true }, second: { type: "member", required: true },
    };
    data.acts.go.sends = [false, true].map((choice) => {
      const second = choice && !identical;
      return { tell: {
        to: { slot: "peer" }, message: distinct && choice ? "ask-second" : "ask", fields: {},
        ...(conditional ? { if: [{ equals: { a: { field: "choice" }, b: { const: choice } } }] } : {}),
        result: { applied: effects ? [{ value: { slot: "note", from: { const: second ? "second" : "first" } } }] : [] },
        observes: { applied: [{ of: "member", from: { field: second ? "second" : "first" }, max: 1,
          window: second ? 300 : 10, use: second ? "reuse" : "once", without: second ? "write" : "wait" }] },
      } };
    });
  };
};
export const clauseMatrices=[
  { name: "conditional same-name sends with identical results", identical: true, distinct: false, conditional: true, choices: [false, true] },
  { name: "conditional distinct-name sends with differing results", identical: false, distinct: true, conditional: true, choices: [false, true] },
  { name: "unconditional same-name sends with differing results", identical: false, distinct: false, conditional: false, choices: [true] },
];
export const clauseIdentityChange=(identical:boolean,distinct:boolean,conditional:boolean,cohort:"legacy"|"whole-scope")=>(data:any)=>{
    clauseSends(identical, distinct, conditional, true)(data);
    if (cohort === "whole-scope") data.capacity = { name: "whole-scope", version: 1 };
};
export function platformOperationRequestData(): PlatformData {
  const operations = settlingPlatformMarksData();
  operations.acts["resolve-note"]!.effects = [...operations.acts["resolve-note"]!.effects, { code: "open-noop", row: "P5", most: { effects: 2, operations: ["noop"] } }];
return operations;
}
const changed=<T>(base:T,change:(data:any)=>void)=>{const data=structuredClone(base);change(data);return data;};
export const reservationVariantDefinitions:readonly DefinitionCorpusRow[]=[
 ...[finalHolderChange0,finalHolderChange1].map((change,i)=>({name:`derive/final-holder/variant ${i}`,origins:[`packages/derive/test/forms-final-holder.test.ts#changed occurrence ${i}`],declaration:()=>changed(works,change),bounds:PROPOSED_BOUNDS,profiles:PROFILES,options:{platform:true}})),
 ...clauseMatrices.flatMap(({name,identical,distinct,conditional})=>(["legacy","whole-scope"] as const).map(cohort=>({name:`derive/clause-identity/${cohort}/${name}`,origins:[`packages/derive/test/clause-identity.test.ts#${cohort}: ${name}`],declaration:()=>changed(weigher,clauseIdentityChange(identical,distinct,conditional,cohort)),bounds:PROPOSED_BOUNDS,profiles:PROFILES,options:{platform:true}}))),
 {name:"derive/platform-request/operation mark",origins:["packages/derive/test/platform-request-amounts.test.ts#counted"],declaration:platformOperationRequestData,bounds:PROPOSED_BOUNDS,options:{platform:true}},
 {name:"derive/rule/ticket",origins:["packages/derive/test/rule.test.ts#current engine accepts ticket"],declaration:()=>structuredClone(ticket),bounds:PROPOSED_BOUNDS,profiles:RULE_PROFILES},
];
