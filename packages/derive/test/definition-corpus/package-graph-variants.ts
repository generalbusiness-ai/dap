/** Shared raw Grow graph variants; importing this module performs no validation. */
import { expect } from "vitest";
import type { DeclaredDefinition, Guard } from "@generalbusiness/dap-contract";
import type { PackageGraphInput } from "@generalbusiness/artroom-package-graph";
import { room } from "../../../../examples/grow/room.ts";
import { growData as grow } from "./package-graph-data.ts";
type GraphChange = (parent: DeclaredDefinition, child: DeclaredDefinition) => void;
export function lifetimeVariantsData(): { name: string; input: PackageGraphInput }[] {
  const backup = (parent: DeclaredDefinition) => {
    const opening = parent.acts["create-room"]!;
    parent.acts["open-backup-slot"] = { ...structuredClone(opening), sends: [] };
  };
  const birthKinds = (child: DeclaredDefinition, kinds: string[]) => {
    const field = child.acts["establish"]!.fields["siteRoom"]!;
    if (field.type !== "fact") return expect.fail("Grow siteRoom must be a fact.");
    field.kind = kinds;
    const slot = child.items["room"]!.refs["siteRoom"]!.to;
    if (slot.type !== "fact") return expect.fail("Grow siteRoom slot must be a fact.");
    slot.kind = kinds;
  };
  return [
    { name: "retiring a confirmed backing slot", input: grow(parent => {
      parent.acts["retire"] = { step: "transition", on: "room", grant: "grow.configure", fields: {}, also: {},
        guards: [{ state: ["active"] }], effects: [{ state: "failed" }], sends: [], attention: [] };
    }) },
    { name: "retiring a backing slot through the Site's selected room", input: grow(parent => {
      parent.items["site"]!.refs["selected"] = { fixed: false, required: false, to: { type: "item", of: "room" } };
      parent.acts["select-room"] = { step: "transition", on: "site", grant: "grow.configure",
        fields: { room: { type: "item", of: "room", required: true } }, also: {}, guards: [],
        effects: [{ ref: { slot: "selected", from: { field: "room" } } }], sends: [], attention: [] };
      parent.acts["retire-selected-room"] = { step: "transition", on: "site", grant: "grow.configure", fields: {},
        also: { selected: { item: "room", via: { of: "on", slot: "selected" } } },
        guards: [{ of: "also.selected", state: ["active"] }],
        effects: [{ of: "also.selected", state: "failed" }], sends: [], attention: [] };
    }) },
    { name: "repeated creation from the singleton Site", input: grow((parent, child) => {
      backup(parent); birthKinds(child, ["open-backup-slot"]);
      const creator = parent.acts["create-room"]!;
      creator.step = "transition"; creator.on = "site"; creator.effects = [];
      creator.fields["slot"] = { type: "item", of: "room", required: true };
      creator.also = { slot: { item: "room", by: "slot" } };
      const send = creator.sends[0]!;
      if (!("create" in send)) return expect.fail("Grow requires its creation.");
      send.create.fields["siteRoom"] = { item: "also.slot" };
      for (const [name, effects] of Object.entries(send.create.result)) send.create.result[name as keyof typeof send.create.result] = effects.map(effect => ({ ...effect, of: "also.slot" }));
    }) },
    { name: "refusal also frees a previous confirmed slot", input: grow((parent, child) => {
      backup(parent); birthKinds(child, ["create-room", "open-backup-slot"]);
      const creator = parent.acts["create-room"]!;
      creator.fields["previous"] = { type: "item", of: "room", required: true };
      creator.also = { previous: { item: "room", by: "previous" } };
      const send = creator.sends[0]!;
      if ("create" in send) send.create.result.refused = [{ state: "failed" }, { of: "also.previous", state: "failed" }];
    }) },
    { name: "recyclable related items", input: grow((_parent, child) => { child.items["room"]!.states["ended"] = { final: true }; }) },
    { name: "a creation conflict frees its backing slot", input: grow(parent => {
      const send = parent.acts["create-room"]!.sends[0]!;
      if ("create" in send) send.create.result.conflict = [{ state: "failed" }];
    }) },
  ];
}

export function repeatedReporterData(copies = 3) {
  return grow((parent, child) => {
    parent.receives["room-summary"]!.copies = copies;
    child.acts["report-again"] = { ...structuredClone(child.acts["report-site"]!), effects: [] };
    const summary = parent.items["room"]!.refs["summaryAt"]!.to;
    if (summary.type === "fact") summary.kind = [...summary.kind, "report-again"];
  });
}

export function automaticCycleData(guarded: boolean, additional: readonly Guard[] = []) {
  const input = grow((parent, child) => {
    const creator = structuredClone(parent.acts["create-room"]!.sends[0]!);
    parent.acts["create-room"]!.sends = [];
    const handler = parent.receives["room-summary"]!;
    handler.opens = "room"; handler.copies = 6;
    handler.fields["label"] = { type: "text", max: 80, required: true };
    handler.effects = [{ value: { slot: "label", from: { field: "label" } } }, ...handler.effects];
    handler.sends = [creator];
    if (!guarded) handler.guards = handler.guards.filter(guard => !("state" in guard));
    handler.guards = [...handler.guards, ...additional];
    const siteRoom = child.items["room"]!.refs["siteRoom"]!.to, incoming = child.acts["establish"]!.fields["siteRoom"]!;
    if (siteRoom.type === "fact") siteRoom.kind = ["create-room", "room-summary"];
    if (incoming.type === "fact") { incoming.kind = ["create-room", "room-summary"]; incoming.required = true; }
    const summary = parent.items["room"]!.refs["summaryAt"]!.to;
    if (summary.type === "fact") summary.kind = ["establish", "report-site"];
    const report = child.acts["report-site"]!.sends[0]!;
    if (!("relate" in report)) throw new Error("Grow report must relate");
    report.relate.detail["label"] = { slot: "label" };
    const atBirth = structuredClone(report);
    atBirth.relate.detail = { room: { field: "siteRoom" }, openAlerts: { const: 0 }, label: { field: "label" } };
    child.acts["establish"]!.sends = [atBirth];
  });
  return { ...input, composition: { ...input.composition, rights: { rooms: { owner: input.entry } }, exercises: [{ definition: input.entry, row: "receives.room-summary", right: "rooms" }] } };
}

export function cycleAlternativesData() {
  const state: Guard = { of: "also.room", state: ["active"] };
  const always: Guard = { equals: { a: { const: true }, b: { const: true } } };
  return [
    { name: "one unconditional alternative",
      good: automaticCycleData(false, [{ anyOf: [[state], [state]] }]),
      bad: automaticCycleData(false, [{ anyOf: [[state], [always]] }]) },
    { name: "a nested unconditional alternative",
      good: automaticCycleData(false, [{ anyOf: [[state], [{ anyOf: [[state], [state]] }]] }]),
      bad: automaticCycleData(false, [{ anyOf: [[state], [{ anyOf: [[state], [always]] }]] }]) },
    { name: "an empty universal list",
      good: automaticCycleData(false, [{ each: { list: { const: [true] }, as: "x", guards: [state] } }]),
      bad: automaticCycleData(false, [{ each: { list: { const: [] }, as: "x", guards: [state] } }]) },
    { name: "a universal list filtered to empty",
      good: automaticCycleData(false, [{ each: { list: { const: [true] }, as: "x", guards: [state] } }]),
      bad: automaticCycleData(false, [{ each: { list: { const: [true] }, as: "x",
        where: [{ equals: { a: { const: true }, b: { const: false } } }], guards: [state] } }]) },
  ];
}

export function pendingCreationData(timer: boolean) {
  return grow(parent => {
  parent.items["room"]!.values["deadline"] = { fixed: false, required: false, of: { type: "time" } };
  const create = parent.acts["create-room"]!;
  create.effects = [...create.effects, { value: { slot: "deadline", from: { time: { plusSeconds: 30 } } } }];
  parent.acts["settle-room"] = { step: "transition", on: "room", grant: "grow.configure", also: {}, fields: {},
    guards: [{ state: ["pending"] }], settles: { of: "on", in: ["pending"] }, effects: [{ state: "active" }], sends: [], attention: [] };
  if (timer) parent.timed["creation-expired"] = { on: "room", states: ["pending"], deadline: "deadline", effects: [{ state: "conflicted" }], attention: [] };
  });
}

export const publishedCopies: GraphChange = parent => { parent.receives["room-summary"]!.copies = 2; };

export const insufficientCopies: GraphChange = parent => { parent.receives["room-summary"]!.copies = 2; };

export const twoItems = (copies: number): GraphChange => (parent, child) => {
    child.items["room"]!.many = true; child.items["room"]!.max = 2;
    parent.receives["room-summary"]!.copies = copies;
  };

export const conflictFrees: GraphChange = parent => {
    const send = parent.acts["create-room"]!.sends[0]!;
    if ("create" in send) send.create.result["conflict"] = [{ state: "failed" }];
  };

export const recyclable: GraphChange = (_parent, child) => { child.items["room"]!.states["ended"] = { final: true }; };

export const rewritable: GraphChange = parent => {
    parent.acts["rebind-room"] = { step: "transition", on: "room", grant: "grow.configure", fields: { peer: { type: "scope", kind: "lane", required: true } }, also: {},
      guards: [{ state: ["active"] }], effects: [{ ref: { slot: "scope", from: { field: "peer" } } }], sends: [], attention: [] };
  };

export const missingResult: GraphChange = (_parent, child) => {
    const send = child.acts["report-site"]!.sends[0]!;
    if ("relate" in send) delete send.relate.result["undelivered"];
  };

export const openingReport: GraphChange = parent => {
    parent.items["report"] = { many: true, max: 3, initial: "received", states: { received: { final: false } }, parties: {}, refs: {}, values: {} };
    parent.receives["room-summary"]!.opens = "report";
  };

export const narrowField: GraphChange = parent => {
    const field = parent.receives["room-summary"]!.fields["openAlerts"]!;
    if (field.type === "int") field.max = 3;
  };

export const unknownMessage: GraphChange = (_parent, child) => {
    const send = structuredClone(child.acts["report-site"]!.sends[0]!);
    if ("relate" in send) send.relate.name = "unknown-summary";
    child.acts["report-site"]!.sends = [...child.acts["report-site"]!.sends, send];
  };

export const unusedHandler: GraphChange = parent => {
    parent.receives["unused-summary"] = { ...structuredClone(parent.receives["room-summary"]!), message: "unused-summary" };
  };

export const packerCopies: GraphChange = parent => { parent.receives["room-summary"]!.copies = 2; };

export const pairedUnusedHandler: GraphChange = parent => { parent.receives["unused-summary"] = { ...structuredClone(parent.receives["room-summary"]!), message: "unused-summary" }; };

export const pairedCopies: GraphChange = parent => { parent.receives["room-summary"]!.copies = 2; };

export const pairedRebind: GraphChange = parent => {
      parent.acts["rebind-room"] = { step: "transition", on: "room", grant: "grow.configure", fields: { peer: { type: "scope", kind: "lane", required: true } }, also: {},
        guards: [{ state: ["active"] }], effects: [{ ref: { slot: "scope", from: { field: "peer" } } }], sends: [], attention: [] };
    };

export const pairedMissingResult: GraphChange = (_parent, child) => { const send = child.acts["report-site"]!.sends[0]!; if ("relate" in send) delete send.relate.result.undelivered; };

export const pairedUnknownMessage: GraphChange = (_parent, child) => {
      const send = structuredClone(child.acts["report-site"]!.sends[0]!); if ("relate" in send) send.relate.name = "unknown-summary";
      child.acts["report-site"]!.sends = [...child.acts["report-site"]!.sends, send];
    };

export const pairedNarrowField: GraphChange = parent => { const field = parent.receives["room-summary"]!.fields["openAlerts"]!; if (field.type === "int") field.max = 3; };

export function differentRoomData(): DeclaredDefinition {
  const different = structuredClone(room), label = different.items["room"]!.values["label"]!.of;
  if (label.type !== "text") return expect.fail("Grow label must be text");
  label.max = 81;
  return different;
}
