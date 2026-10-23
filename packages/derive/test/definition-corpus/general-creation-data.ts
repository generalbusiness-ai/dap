/** Raw positive declarations shared with their original validator/judge witnesses. */
import type { DeclaredDefinition, Digest, ScopeKind } from "@generalbusiness/dap-contract";
import { desk } from "./fixture-data.ts";
import { board } from "./forms-data.ts";
import { sourceOrderDefinition } from "./source-order-data.ts";
import { receiverPinData } from "./receiver-pins-data.ts";
import { boundRecordData } from "./bound-records-data.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export const directCreationPins = (data: any) => {
  data.acts["open-issue"].sends[0].create.definition = `sha256:${"b".repeat(64)}`;
  data.receives["spawn"].sends[0].create.definition = `sha256:${"a".repeat(64)}`;
};
export const indirectCreationPins = (data: any) => {
  data.acts["open-issue"].sends[0].create.definition = "self";
  data.receives["spawn"].sends[0].create.definition = "platform:directory@1";
  data.rules["unused"] = JSON.stringify(`sha256:${"c".repeat(64)}`);
};
export const lateCreationPin = (data: any, create: any) => {
  data.receives["spawn"].late = { within: { seconds: 30 }, reason: "old-spawn", then: { sends: [{ create: { ...create, definition: `sha256:${"c".repeat(64)}` } }] } };
};
export function createdEdgesData(stage: "base" | "direct" | "indirect" | "late"): DeclaredDefinition {
  const data = structuredClone(desk);
  if (stage === "base") return data;
  directCreationPins(data);
  if (stage === "direct") return data;
  indirectCreationPins(data);
  if (stage === "late") lateCreationPin(data, (data.receives["spawn"]!.sends[0] as any).create);
  return data;
}
export const contextCreate = { create: { kind: "lane" as const, definition: "self" as const, fields: { creationContext: { const: { v: 99 } } }, result: {} } };
export const contextRow = { step: "open" as const, on: "root", grant: "open", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
export const contextDeclared: DeclaredDefinition = {
  format: "artroom-definition-1", name: "context-child", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "open",
  items: { root: { many: false, max: 1, initial: "ready", states: { ready: { final: false } }, parties: {}, refs: {}, values: {} } },
  acts: {
    open: { ...contextRow, fields: { creationContext: { type: "record", of: { v: { type: "int", min: 1, max: 99, required: true } }, required: false } }, sends: [contextCreate] },
    spawn: { ...contextRow, step: "transition", sends: [contextCreate] },
  }, receives: {}, timed: {}, rules: {},
};
export function contextParentData(digest: Digest, kind: ScopeKind): DeclaredDefinition {
  return { ...contextDeclared, name: "context-parent", acts: {
    open: contextRow, spawn: { ...contextRow, step: "transition", sends: [{ create: { ...contextCreate.create, kind, definition: digest } }] },
  } };
}
export function contextPlatformData(): DeclaredDefinition {
  return { ...contextDeclared, acts: { ...contextDeclared.acts, open: { ...contextDeclared.acts["open"]!, sends: [{ create: { kind: "rules", definition: "platform:rules@2", fields: {}, result: {} } }] } } };
}
export const contextNamedData = (name: string): DeclaredDefinition => ({ ...contextDeclared, name });
export const standingWhole = (data: any) => { data.capacity = { name: "whole-scope", version: 1 }; };
export const standingNoDefault = (d: any) => { delete d.items.repo.values.count.default; d.acts["found"].effects.push({ value: { slot: "count", from: { const: 0 } } }); };
export const standingZero = (d: any) => { d.standing.max = 0; d.items.repo.values.count.of.max = 0; d.acts.set.fields.next.max = 0; d.acts.advance.fields.next.max = 0; };
export const standingSingleton = (d: any) => {
    d.standing.item = "issue";
    d.items.issue.many = false; d.items.issue.max = 1;
    d.items.issue.values.count = { fixed: false, required: true, default: 0, of: { type: "int", min: 0, max: 2 } };
  };
export function timedByteOrderData(): DeclaredDefinition {
  const rule = { ...board.timed["job-deadline"]!, effects: [{ state: "timed-out" }] };
  return { ...board, timed: { "\u{1F600}": rule, "": rule } };
}
export const timedOwnNamesData = () => JSON.parse(`{
    "format": "artroom-definition-1", "name": "constructor", "profile": { "name": "restricted", "version": 1 }, "capabilities": [], "genesis": "start", "receives": {}, "rules": {},
    "items": {
      "root": { "many": false, "max": 1, "states": { "open": { "final": false } }, "initial": "open", "parties": { "owner": { "fixed": true, "required": true, "list": false, "author": false } }, "refs": {}, "values": {} },
      "__proto__": {
        "many": true, "max": 4, "states": { "__proto__": { "final": false }, "constructor": { "final": false }, "done": { "final": true } }, "initial": "__proto__", "parties": {}, "refs": {},
        "values": { "__proto__": { "fixed": false, "required": true, "of": { "type": "text", "max": 20 } }, "until": { "fixed": false, "required": true, "of": { "type": "time" } } }
      }
    },
    "acts": {
      "start": { "step": "open", "on": "root", "grant": "start", "also": {}, "fields": { "opener": { "type": "member", "required": true } }, "guards": [], "effects": [{ "party": { "slot": "owner", "from": { "field": "opener" } } }], "sends": [], "attention": [] },
      "__proto__": {
        "step": "open", "on": "__proto__", "grant": "note", "also": {}, "fields": { "__proto__": { "type": "text", "max": 20, "required": true }, "until": { "type": "time", "required": true } }, "guards": [],
        "effects": [{ "value": { "slot": "__proto__", "from": { "field": "__proto__" } } }, { "value": { "slot": "until", "from": { "field": "until" } } }], "sends": [], "attention": []
      }
    },
    "timed": {
      "__proto__": { "on": "__proto__", "states": ["__proto__"], "deadline": "until", "effects": [{ "state": "constructor" }], "attention": [] },
      "constructor": { "on": "__proto__", "states": ["constructor"], "deadline": "until", "effects": [{ "state": "done" }], "attention": [] }
    }
  }`);
export const sourceArrival = (data: DeclaredDefinition) => { data.receives["sample"]!.order = "arrival"; };
export const sourceTime = (declaration: DeclaredDefinition) => {
  declaration.items["board"]!.values["sampledAt"] = { fixed: false, required: false, of: { type: "time" } };
  declaration.receives["sample"]!.effects = [...declaration.receives["sample"]!.effects, { of: "also.board", value: { slot: "sampledAt", from: { source: "time" } } }];
};
export const sourceOnlyOne = (declaration: DeclaredDefinition) => { declaration.receives["sample"]!.guards = [{ equals: { a: { field: "value" }, b: { const: 1 } }, reason: "not-one" }]; };
export function reservedOrderData(order: "source" | "arrival"): DeclaredDefinition {
    const data = receiverPinData(); data.receives["license"]!.order = order;
    data.items["intent"]!.many = true; data.items["intent"]!.max = 2;
    data.acts["open-export"] = structuredClone(data.acts["file"]!);
    data.acts["license"]!.fields["export"] = { type: "item", of: "intent", required: true };
    const effect = data.acts["license"]!.effects[0]!;
    if (!("capability" in effect)) throw Error("The fixture must use the native hold license effect.");
    effect.capability.with["export"] = { field: "export" };
  return data;
}
export function reservedArrivalData() {
  const data = boundRecordData(); data.receives["stop"]!.order = "arrival";
  return data;
}
export function sourceVariant(change: (data: DeclaredDefinition) => void): DeclaredDefinition {
  const data = structuredClone(sourceOrderDefinition); change(data); return data;
}
