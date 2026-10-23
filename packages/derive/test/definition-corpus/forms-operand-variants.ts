/* eslint-disable @typescript-eslint/no-explicit-any */
import { PROPOSED_BOUNDS, type DeclaredDefinition, type FieldValue, type Guard, type Operand, type MemberRef } from "@generalbusiness/dap-contract";
import { intentDigest } from "@generalbusiness/dap-bytes";
import type { Scope } from "../fixtures-entry.ts";
import { asks, act, fact } from "./forms-operand-data.ts";
import { ticket } from "./fixture-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";
const equals = (a: Operand, b: Operand, reason: string): Guard => ({ equals: { a, b }, reason });
export function operandParts(M: Pick<Scope,"fact"|"at">, intent: ReturnType<typeof intentDigest>|null, member: MemberRef): Guard[] {
    const proof = (part: NonNullable<Extract<Operand, { field: string }>["part"]>): Operand => ({ field: "proof", part });
    const is = (name: string, a: Operand, value: FieldValue): Guard => equals(a, { const: value }, name);
    const none = (name: string, a: Operand): Guard => equals(a, { none: true }, name);
    // `proof` is M.2, the `ask` that opened ask 2. `second` is M.6, a block whose field `on` names L.2, this scope's own ask. `origin` is M.0, M's genesis.
    const parts: Guard[] = [
      is("ref", proof("ref"), M.fact(2)), is("scope", proof("scope"), M.at), is("seq", proof("seq"), 2),
      is("kind", proof("kind"), "ask"), is("intent", proof("intent"), intent!), is("on", proof("on"), 2),
      is("field", proof({ field: "text" }), "why"),
      is("opened state", proof({ opened: "state" }), "asked"), is("opened party", proof({ opened: "asker" }), member),
      is("opened list", proof({ opened: "watchers" }), [member]), is("opened ref", proof({ opened: "termsAt" }), 2),
      is("set", proof({ set: { item: proof("on"), slot: "text" } }), "why"),
      is("then seq", { field: "second", part: { of: { field: "on" }, then: "seq" } }, 2), equals({ field: "second", part: { of: { field: "on" }, then: "scope" } }, { scope: true }, "then scope"),
      // A fact that a fetched entry holds, and that names this scope's own entry, equals the local reference to that entry in a slot of another subject.
      equals({ field: "second", part: { field: "on" } }, { slot: "termsAt", of: "also.mine" }, "names my entry"),
      // What an entry does not hold is none: an unknown field or slot, an item it did not change, a value that is no fact, and the intent of a created scope.
      none("no field", proof({ field: "title" })), none("no slot", proof({ opened: "title" })), none("no item", proof({ set: { item: { const: 9 }, slot: "text" } })),
      none("no fact", proof({ of: { field: "text" }, then: "seq" })), none("no intent", { field: "origin", part: "intent" }),
      // The block waits on M.3. That fact is held in a slot and is not named by this input, so its bytes were not fetched:
      // its position is read from the reference, and a part of its bytes is none.
      is("slot seq", { slot: "on", part: "seq" }, 3), none("slot bytes", { slot: "on", part: "kind" }),
    ];
  return parts;
}
export function operandProbeData(parts: Guard[]): DeclaredDefinition { const d: any=structuredClone(asks); ((d) => {
      d.acts.probe = act({
        step: "transition", on: "block", grant: "block", also: { mine: { item: "ask", by: "mine" } }, guards: parts,
        fields: { proof: { ...fact("ask"), required: true }, second: { ...fact("block"), required: true }, origin: { ...fact("start"), required: true }, mine: { type: "item", of: "ask", required: true } },
      });
      // On this scope's own entry: the parts are read from its history, and compared with what this scope holds.
      d.acts.own = act({
        step: "transition", on: "ask", grant: "ask", fields: { terms: { ...fact("ask", "revise"), required: true } },
        guards: [
          equals({ field: "terms", part: "kind" }, { const: "ask" }, "kind"), equals({ field: "terms", part: "scope" }, { scope: true }, "scope"),
          equals({ field: "terms", part: "seq" }, { item: "on" }, "seq"), equals({ field: "terms", part: { opened: "termsAt" } }, { slot: "termsAt" }, "opened"),
          equals({ field: "terms", part: { opened: "asker" } }, { signer: true }, "signer"), equals({ field: "terms", part: "intent" }, { intent: true }, "another intent"),
        ],
      });
    })(d); return d; }
export function namedOperandData(name: string, change: (d:any)=>void=()=>{}): DeclaredDefinition { const d:any=structuredClone(asks); ((d) => { d.name = name; d.items.ask.refs.termsAt.to = { ...d.items.ask.refs.termsAt.to, under: name }; change(d); })(d); return d; }
export function elsewhereOperandData(change:(d:any)=>void=()=>{}): DeclaredDefinition { return namedOperandData("elsewhere", (d) => { d.genesis = "begin"; d.acts.begin = d.acts.start; delete d.acts.start; change(d); }); }
export const deliveryOperandChange = (d: any) => {   // eslint-disable-line @typescript-eslint/no-explicit-any
      d.receives.closes.guards = [
        equals({ update: "state" }, { const: "set" }, "not-set"),
        equals({ sender: true }, { source: "scope" }, "sender"), equals({ update: "revision" }, { source: "seq" }, "revision"),
        equals({ update: "item" }, { source: "ref" }, "item"), equals({ source: "kind" }, { const: "link" }, "kind"), equals({ source: { field: "about" } }, { field: "about" }, "about"),
      ];
      // `cite` names a delivery of `closes`, and may compare the `madeAt` that it delivered with a fact, or with a record.
      const madeAt = (b: string): Guard => ({ fact: { field: "closed", where: [{ equals: { a: { field: "madeAt" }, b: { field: b } } }] }, ifPresent: true, reason: b });
      // `peek` compares the same field of an entry whose kind it does not ask for.
      d.acts.peek = act({
        step: "transition", on: "intent", grant: "link", fields: { closed: { type: "fact", kind: ["closes"], under: "ticket", required: true }, by: { type: "fact", kind: ["link"], under: "ticket", required: true } },
        guards: [equals({ field: "closed", part: { field: "madeAt" } }, { field: "by" }, "peek")],
      });
      d.acts.cite = act({
        step: "transition", on: "intent", grant: "link", guards: [{ state: ["open"] }, { fact: { field: "closed" } }, madeAt("by"), madeAt("flag")],
        fields: {
          closed: { type: "fact", kind: ["closes"], under: "ticket", required: true }, by: { type: "fact", kind: ["link"], under: "ticket", required: false },
          flag: { type: "record", of: { self: { type: "bool", required: true } }, required: false },
        },
      });
      // The link keeps the entry that made it, set from `self`, and its update carries that slot, a fact that the act names, and a fact that it is presented.
      d.items.link.refs.madeAt = { fixed: true, required: true, to: { type: "fact", kind: ["link"], under: "ticket" } };
      d.acts.link.fields.because = { type: "fact", kind: ["file"], under: "ticket", required: true };
      d.acts.link.effects.push({ ref: { slot: "madeAt", from: "self" } });
      d.acts.link.presents = { shown: { kind: ["file"], under: "ticket", required: false } };
      Object.assign(d.acts.link.sends[0].relate.detail, { madeAt: { slot: "madeAt" }, because: { field: "because" }, shown: { presented: "shown" } });
      const filed = { type: "fact", kind: ["file"], under: "ticket", required: false };
      Object.assign(d.receives.closes.fields, { madeAt: { type: "fact", kind: ["link"], under: "ticket", required: false }, because: filed, shown: filed });
      d.receives.closes.guards.push(equals({ field: "madeAt" }, { source: "ref" }, "made at"));
    };
export function deliveryOperandData(kind: "base"|"record"|"foreign"="base"): DeclaredDefinition {
  const d:any=structuredClone(ticket); deliveryOperandChange(d);
  if(kind==="record") { d.receives.closes.guards.pop(); d.receives.closes.fields.madeAt={type:"record",of:{self:{type:"bool",required:true}},required:false}; }
  if(kind==="foreign") d.receives.closes.from.under="board";
  return d;
}
/** This one origin embeds facts and an intent from the actual original pure Scope history.
 * Its prerequisite validation is deliberately delayed until this named row runs. */
export async function historicalOperandProbeData(): Promise<DeclaredDefinition> {
  const {Scope,fields,keys,on,valid}=await import("../fixtures-entry.ts");
  const {validateDefinition}=await import("../../src/index.ts");
  const definition=valid(validateDefinition(asks,PROPOSED_BOUNDS));
  const M=new Scope(definition,keys.rita.member,true,1);
  M.did(keys.una,"ask",fields({text:"why"})); M.did(keys.una,"ask",fields({text:"when"}));
  M.did(keys.rita,"answer",on(M,2)); M.did(keys.rita,"answer",on(M,3));
  const asked=M.entries[2]!.entry;
  const intent=asked.input.type==="act"?intentDigest(asked.input.signed.intent):null;
  return operandProbeData(operandParts(M,intent,keys.una.member));
}
export const operandAdditionalDefinitions: readonly DefinitionCorpusRow[] = [
  {name:"derive/operand/parts from actual history",origins:["packages/derive/test/forms-operand.test.ts#each part reads what its entry holds"],declaration:historicalOperandProbeData,bounds:PROPOSED_BOUNDS},
  {name:"derive/operand/elsewhere",origins:["packages/derive/test/forms-operand.test.ts#P"],declaration:()=>elsewhereOperandData(),bounds:PROPOSED_BOUNDS},
  {name:"derive/operand/elsewhere omits start",origins:["packages/derive/test/forms-operand.test.ts#Q"],declaration:()=>elsewhereOperandData(d=>{d.acts.trace.fields.origin.kind=["ask"];}),bounds:PROPOSED_BOUNDS},
  {name:"derive/operand/other",origins:["packages/derive/test/forms-operand.test.ts#O"],declaration:()=>namedOperandData("other"),bounds:PROPOSED_BOUNDS},
  ...(["base","record","foreign"] as const).map(kind=>({name:`derive/operand/delivery ${kind}`,origins:[`packages/derive/test/forms-operand.test.ts#delivery ${kind}`],declaration:()=>deliveryOperandData(kind),bounds:PROPOSED_BOUNDS})),
  {name:"derive/operand/inner unchanged ticket",origins:["packages/derive/test/forms-operand.test.ts#negative update-in-tell prerequisite variant"],declaration:()=>structuredClone(ticket),bounds:PROPOSED_BOUNDS},
];
