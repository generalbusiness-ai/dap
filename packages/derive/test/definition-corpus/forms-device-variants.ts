import { definitionDigest } from "@generalbusiness/dap-bytes";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Digest } from "@generalbusiness/dap-contract";
import { deviceCommandFixture as scope, deviceCommandRow as row } from "../fixtures-device-command.ts";
import type { DefinitionCorpusRow } from "./row.ts";
export const deviceConditions=[
    { if: [{ equals: { a: { field: "level" }, b: { const: 80 } } }] },
    { unless: [{ equals: { a: { field: "level" }, b: { const: 30 } } }] },
  ] as const;
export const wholeDeviceData=():DeclaredDefinition=>({ ...scope, capacity: { name: "whole-scope", version: 1 } });
export function conditionalDeviceData(condition:typeof deviceConditions[number]):DeclaredDefinition {
  const conditional=structuredClone(scope);
  conditional.acts["command"]!.effects=conditional.acts["command"]!.effects.map((effect,i)=>i<3?{...effect,...condition}:effect);
  return conditional;
}
export const deviceParentData=(digest:Digest):DeclaredDefinition=>({ ...scope, name: "command-parent", capabilities: [], items: { root: scope.items["root"]! },
    acts: { start: row({ step: "open", on: "root", grant: "start", guards: [] }),
      spawn: row({ on: "root", guards: [], sends: [{ create: { kind: "lane", definition: digest, fields: {}, result: {} } }] }) }, receives: {}, timed: {} });
const variants=[{name:"base",declaration:()=>structuredClone(scope)},{name:"whole-scope",declaration:wholeDeviceData},...deviceConditions.map((condition,i)=>({name:`condition ${i}`,declaration:()=>conditionalDeviceData(condition)}))];
export const deviceFormDefinitions:readonly DefinitionCorpusRow[]=[
  ...variants.slice(1).map(({name,declaration})=>({name:`derive/device/${name}`,origins:[`packages/derive/test/forms-device-command.test.ts#${name}`],declaration,bounds:PROPOSED_BOUNDS})),
  ...variants.map(({name,declaration})=>({name:`derive/device/parent ${name}`,origins:[`packages/derive/test/forms-device-command.test.ts#fixture under ${name}`],declaration:()=>deviceParentData(definitionDigest(declaration())),bounds:PROPOSED_BOUNDS})),
];
