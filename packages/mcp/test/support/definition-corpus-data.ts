/** Raw mutations shared by the original packed-view fixtures and the format corpus. */
import type { DeclaredDefinition, Digest } from "@generalbusiness/dap-contract";
import { counting } from "../../../../apps/counter/definition.ts";
export function configureInputDefinition(definition: DeclaredDefinition, ordered: boolean): void {
  definition.acts["pause"] = { ...definition.acts["pause"]!, fields: {
    tag: { type: "enum", of: ["manual"], required: true }, moisture: { type: "int", min: 0, max: 100, required: false },
    ec: { type: "int", min: 0, max: 10000, required: false }, note: { type: "text", max: 64, required: false },
  } };
  if (ordered) definition.items["board"] = { ...definition.items["board"]!, many: true, max: 4,
    values: { ...definition.items["board"]!.values, probeTime: { required: false, fixed: false, of: { type: "time" } } } };
}
export function configureRoutingDefinition(definition: DeclaredDefinition, withMembers: boolean): void {
  definition.items["board"] = { ...definition.items["board"]!, many: true, max: 4 };
  if (withMembers) definition.items["board"]!.parties = { ...definition.items["board"]!.parties,
    worker: { fixed: false, required: false, list: false, author: false } };
}
export function configurePledgeDefinition(definition: DeclaredDefinition): void {
  definition.acts["hold-pledge"] = { ...definition.acts["pause"]!, also: { pledge: { item: "promise", via: { of: "on", slot: "pledge" } } } };
}
export function configureConstantDefinition(definition: DeclaredDefinition): void {
  definition.acts["pause"] = { ...definition.acts["pause"]!, fields: {
    target: { type: "enum", of: ["on", "off"], required: true }, level: { type: "int", min: 0, max: 100, required: true },
  } };
}
export function configureSeriesDefinition(definition: DeclaredDefinition): void {
  definition.acts["pause"] = { ...definition.acts["pause"]!, fields: { mean: { type: "int", min: -4000, max: 8000, required: true } } };
}
export const relaxedCounting = () => ({ ...counting, rules: { ...counting.rules, "spoken-plan": "true" } });
export function growLauncherDefinition(entry: Digest): DeclaredDefinition {
  return { format: "artroom-definition-1", name: "test.grow-directory-launcher", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
        items: { launcher: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: {} } },
        acts: { establish: { step: "open", on: "launcher", grant: "grow.configure", also: {}, fields: { label: { type: "text", max: 80, required: true } }, guards: [], effects: [],
          sends: [{ create: { kind: "lane", definition: entry, fields: { label: { const: "Grow site" } }, result: { applied: [], refused: [], undelivered: [], conflict: [] } } }], attention: [] } },
        receives: {}, timed: {}, rules: {},
      };
}
