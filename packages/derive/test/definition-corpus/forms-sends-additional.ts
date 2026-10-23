import { PROPOSED_BOUNDS, type DeclaredDefinition, type SendForm } from "@generalbusiness/dap-contract";
import { pull, act } from "./forms-sends-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";
export const wholePullData = (): DeclaredDefinition => ({ ...pull, capacity: { name: "whole-scope", version: 1 } });
export function repeatedPullData(): DeclaredDefinition {
  const first = pull.receives["published"]!.sends[0] as Extract<SendForm, { relate: unknown }>;
  return { ...pull, receives: { published: { ...pull.receives["published"]!, sends: [{ relate: { ...first.relate, item: { item: "also.proposal" }, result: {} } }] } } };
}
export function citedPullData(): DeclaredDefinition {
    const proof = { type: "fact", kind: ["note"], under: "pull" } as const;
    const evidence = { type: "record", of: { proof: { ...proof, required: true } } } as const;
  return (() => {
      const d = structuredClone(pull) as any;   // eslint-disable-line @typescript-eslint/no-explicit-any
      d.acts.note = act({ step: "comment", on: null, grant: "write" });
      d.acts.cite = act({
        step: "transition", on: "proposal", grant: "write", fields: { evidence: { ...evidence, required: true } }, guards: [{ state: ["open"] }],
        sends: [{ tell: { to: { slot: "staging" }, message: "evidence", fields: { evidence: { field: "evidence" } }, result: {} } }],
      });
      d.receives.evidence = { message: "evidence", class: "tell", from: { kind: "lane" }, opens: null, fields: { evidence: { ...evidence, required: true } }, also: {}, guards: [], effects: [], sends: [], attention: [] };
      d.receives.flag = { ...d.receives.evidence, message: "flag", fields: { tag: { type: "record", of: { self: { type: "bool", required: true } }, required: true } } };
      return d as DeclaredDefinition;
    })();
}
export const sendAdditionalDefinitions: readonly DefinitionCorpusRow[] = [
  ...([ ["whole-scope", wholePullData], ["repeated relation", repeatedPullData], ["cited record", citedPullData] ] as const).map(([name,declaration]) => ({name:`derive/sends/${name}`,origins:[`packages/derive/test/forms-sends.test.ts#${name}`],declaration,bounds:{...PROPOSED_BOUNDS,fanOut:3}})),
  {name:"derive/sends/at all send limits",origins:["packages/derive/test/forms-sends.test.ts#at the limit itself"],declaration:()=>structuredClone(pull),bounds:{...PROPOSED_BOUNDS,fanOut:3,attentionMembers:2,sendsPerEntry:8}},
];
