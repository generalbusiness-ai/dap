/** Positive raw Scope capacity/floor declarations; no Native setup or eager validation. */
import { PROPOSED_BOUNDS, type Digest, type PlatformData } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import { PROFILES } from "../../src/validate/index.ts";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import { ticket, desk } from "./fixture-data.ts";
import { receiverPinData, PIN_BOUNDS } from "./receiver-pins-data.ts";
import { boundRecordData } from "./bound-records-data.ts";
import { standingData } from "../fixtures-standing.ts";
import type { DefinitionCorpusRow } from "./row.ts";

export function capacityBoundSenderData(under: string) {
  const sourceData = receiverPinData();
  delete sourceData.capacity;
  sourceData.name = "bound-sender"; sourceData.capabilities = []; sourceData.receives = {};
  sourceData.items["intent"]!.refs["peer"] = { fixed: false, required: false, to: { type: "scope", kind: "directory" } };
  const touch = sourceData.acts["touch"]!;
  sourceData.acts = { file: sourceData.acts["file"]!, connect: {
    ...touch, fields: { peer: { type: "scope", kind: "directory", required: true } }, effects: [{ ref: { slot: "peer", from: { field: "peer" } } }],
  }, stop: {
    ...touch, fields: { job: { type: "fact", kind: ["open-job"], under: under, required: true } },
    sends: [{ tell: { to: { slot: "peer" }, message: "stop", fields: { job: { field: "job" } }, result: {} } }],
  } };
  return sourceData;
}

export function capacityConfirmationChildData(whole: boolean) {
  const childData = structuredClone(ticket);
  if (whole) childData.capacity = { name: "whole-scope", version: 1 };
  return childData;
}

export function capacityConfirmationParentData(childDigest: Digest) {
  const parentData = structuredClone(desk);
  parentData.items["issue"]!.values["padding"] = { fixed: false, required: false, of: { type: "text", max: 4096 } };
  const send = parentData.acts["open-issue"]!.sends[0]!;
  if (!("create" in send)) throw new Error("the fixture must create its ticket");
  send.create.definition = childDigest;
  send.create.result.applied = [...(send.create.result.applied ?? []), { value: { slot: "padding", from: { const: "x".repeat(1800) } } }];
  return parentData;
}

export const capacityPinBodySlot = () => ({ fixed: false, required: false, of: { type: "text" as const, detached: true as const, max: PIN_BOUNDS.textBytes } });

export function capacityPinChildData() {
  const childData = receiverPinData() as unknown as PlatformData;
  delete childData.capacity;
  childData.name = "platform:task"; childData.capabilities = []; childData.receives = {}; childData.outcomes = {};
  childData.acts = { file: childData.acts["file"]! };
  return childData;
}

export function capacityPinReceiverData(bodySlot = capacityPinBodySlot()) {
  const data = receiverPinData();
  const peer = data.acts["license"]!.fields["peer"]!;
  if (peer.type !== "scope") throw new Error("fixture peer type missing");
  peer.kind = "directory";
  data.receives["license"]!.from.kind = "directory";
  const request = { create: { kind: "lane" as const, definition: "platform:task@1" as const, fields: {}, result: {} } };
  data.items["job"] = { many: true, max: 4, initial: "pending", states: { pending: { final: false }, done: { final: true } }, parties: {}, refs: {}, values: {} };
  data.items["ballast"] = { many: false, max: 1, initial: "kept", states: { kept: { final: true } }, parties: {}, refs: {}, values: {} };
  data.receives["license"]!.opens = "job";
  data.acts["finish"] = { ...data.acts["touch"]!, on: "job", guards: [{ state: ["pending"] }], settles: { of: "on", in: ["pending"] }, effects: [{ state: "done" }], sends: [request] };
  data.acts["ballast"] = { ...data.acts["touch"]!, step: "open", on: "ballast", sends: [request] };

  data.items["intent"]!.values["body"] = bodySlot;
  data.acts["attach"] = { ...data.acts["touch"]!, fields: { body: { ...bodySlot.of, required: true } }, guards: [{ state: ["open"] }], effects: [{ value: { slot: "body", from: { field: "body" } } }] };
  data.acts["erase"] = { ...data.acts["touch"]!, guards: [{ state: ["open"] }], effects: [{ state: "closed" }, { redact: { slot: "body" } }] };
  return data;
}

export function capacityPinSenderData(receiverName: string, bodySlot = capacityPinBodySlot()) {
  const senderData = receiverPinData();
  delete senderData.capacity;
  senderData.name = "pin-sender"; senderData.capabilities = []; senderData.receives = {};
  senderData.items["intent"]!.refs["peer"] = { fixed: false, required: false, to: { type: "scope", kind: "directory" } };
  senderData.items["intent"]!.values["body"] = bodySlot;
  senderData.acts = { file: senderData.acts["file"]!, connect: {
    ...senderData.acts["touch"]!, fields: { peer: { type: "scope", kind: "directory", required: true } }, effects: [{ ref: { slot: "peer", from: { field: "peer" } } }],
  }, send: {
    // The source sends an ordinary digest and holds its matching text in
    // a detached field. The receiver judges that text as a body; it need
    // not have the same field type as the source's digest.
    ...senderData.acts["touch"]!, fields: { target: { type: "fact", kind: ["file"], under: receiverName, required: true }, k: { type: "int", min: 1, max: 3, required: true }, body: { type: "digest", required: false }, kept: { type: "text", detached: true, max: PIN_BOUNDS.textBytes, required: false } },
    guards: [{ state: ["open"] }], effects: [{ value: { slot: "body", from: { field: "kept" } } }],
    sends: [{ tell: { to: { slot: "peer" }, message: "export-license", fields: { export: { field: "target" }, k: { field: "k" }, body: { field: "body" } }, result: {} } }],
  }, erase: { ...senderData.acts["touch"]!, guards: [{ state: ["open"] }], effects: [{ state: "closed" }, { redact: { slot: "body" } }] } };
  return senderData;
}

export function capacityStandingData(whole = true) {
  const data: PlatformData = standingData(data => { data.capacity = { name: "whole-scope", version: 1 }; });
  // Close the fixture's unused dummy child edges. This tests standing slots,
  // not a claim about optional birth declarations or a directory policy.
  for (const form of [...Object.values(data.acts), ...Object.values(data.receives)]) form.sends = form.sends.filter(send => !("create" in send));
  if (!whole) delete data.capacity;
  return data;
}

export function floorRootsData() {
  const form = { also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
  const fact = { type: "fact", kind: ["note"], under: "platform:task" } as const;
  const supplied: PlatformData = {
    format: "artroom-definition-1", name: "platform:task", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "found",
    items: { board: { many: false, max: 1, initial: "open", states: { open: { final: false }, done: { final: true } }, parties: {}, refs: {}, values: { proof: { fixed: false, required: false, of: fact } } } },
    acts: {
      found: { ...form, step: "open", on: "board", grant: "found" },
      start: { ...form, step: "transition", on: "board", grant: "remark", effects: [{ code: "begin", row: "P16" }] },
      note: { ...form, step: "transition", on: "board", grant: "remark" },
      pin: { ...form, step: "transition", on: "board", grant: "remark", fields: { proof: { ...fact, required: true }, memo: { type: "text", max: 32, detached: true, required: true } }, effects: [{ value: { slot: "proof", from: { field: "proof" } } }] },
      finish: { ...form, step: "transition", on: "board", grant: "remark", guards: [{ state: ["open"] }], effects: [{ state: "done" }] },
    }, receives: {}, rules: {}, timed: {}, outcomes: { work: { code: "work", row: "P16", attempts: 1 } },
  };
  return supplied;
}

const form = { also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
export function floorSizeProofsData(): PlatformData {
  const memo = { type: "text", max: 16, detached: true } as const;
  return {
    format: "artroom-definition-1", name: "platform:task", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "found",
    items: {
      board: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: { memo: { fixed: false, required: true, of: memo } } },
      job: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: { owner: { fixed: false, required: true, to: { type: "scope", kind: "lane" } } }, values: { amount: { fixed: false, required: true, default: 0, of: { type: "int", min: 0, max: 1 } } }, holds: { decisions: { stop: 1 } } },
    },
    acts: {
      found: { ...form, step: "open", on: "board", grant: "found", fields: { memo: { ...memo, required: true } }, effects: [{ value: { slot: "memo", from: { field: "memo" } } }] },
      prove: { ...form, step: "transition", on: "board", grant: "remark", fields: { note: { type: "text", max: 2, detached: true, required: true } } },
      erase: { ...form, step: "transition", on: "board", grant: "remark", effects: [{ redact: { slot: "memo" } }] },
    },
    receives: {
      start: { ...form, class: "tell", message: "start", from: { kind: "lane" }, opens: "job", effects: [{ ref: { slot: "owner", from: { sender: true } } }] },
      stop: { ...form, class: "tell", message: "stop", from: { kind: "lane" }, opens: null, fields: { note: { type: "text", max: 2, detached: true, required: true } }, also: { job: { item: "job", one: true } }, bound: { of: "also.job", where: [{ equals: { a: { sender: true }, b: { slot: "owner", of: "also.job" } } }] }, effects: [{ code: "invalid-value", row: "P15" }] },
    }, outcomes: {}, rules: {}, timed: {},
  };
}

export const scopeCapacityFloorDefinitions: readonly DefinitionCorpusRow[] = [
 ...[false, true].flatMap(whole => [
  { name: `scope/capacity-confirmation/child-${whole}`, origins: [`packages/scope/test/capacity-confirmation.test.ts#definitions(${whole}).child`], declaration: () => capacityConfirmationChildData(whole), bounds: { ...PROPOSED_BOUNDS, entryBytes: 4096 } },
  { name: `scope/capacity-confirmation/parent-${whole}`, origins: [`packages/scope/test/capacity-confirmation.test.ts#definitions(${whole}).parent`], declaration: () => capacityConfirmationParentData(definitionDigest(capacityConfirmationChildData(whole))), bounds: { ...PROPOSED_BOUNDS, entryBytes: 4096 } },
 ]),
 ...[false, true].flatMap(firstKey => [
  { name: `scope/capacity-bound-records/receiver-${firstKey}`, origins: [`packages/scope/test/capacity-bound-records.test.ts#boundRecordDefinition(${firstKey})`], declaration: () => boundRecordData(firstKey), bounds: PIN_BOUNDS, options: { platform: true } },
  { name: `scope/capacity-bound-records/sender-${firstKey}`, origins: [`packages/scope/test/capacity-bound-records.test.ts#sourceData(firstKey=${firstKey})`], declaration: () => capacityBoundSenderData(boundRecordData(firstKey).name), bounds: PIN_BOUNDS },
 ]),
 { name: "scope/capacity-receiver-pins/child", origins: ["packages/scope/test/capacity-receiver-pins.test.ts#childData"], declaration: capacityPinChildData, bounds: PIN_BOUNDS, options: { platform: true } },
 { name: "scope/capacity-receiver-pins/receiver", origins: ["packages/scope/test/capacity-receiver-pins.test.ts#data"], declaration: capacityPinReceiverData, bounds: PIN_BOUNDS },
 { name: "scope/capacity-receiver-pins/sender", origins: ["packages/scope/test/capacity-receiver-pins.test.ts#senderData"], declaration: () => capacityPinSenderData(capacityPinReceiverData().name), bounds: PIN_BOUNDS },
 ...[false, true].map(whole => ({ name: `scope/capacity-standing/${whole}`, origins: [`packages/scope/test/capacity-standing.test.ts#${whole ? "data" : "oldData"}`], declaration: () => capacityStandingData(whole), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } })),
 { name: "scope/floor-roots/supplied", origins: ["packages/scope/test/floor-roots.test.ts#supplied"], declaration: floorRootsData, bounds: PROPOSED_BOUNDS, options: { platform: true } },
 { name: "scope/floor-size-proofs/data", origins: ["packages/scope/test/floor-size-proofs.test.ts#data()/proving200", "packages/scope/test/floor-size-proofs.test.ts#data()/proving50"], declaration: floorSizeProofsData, bounds: PROPOSED_BOUNDS, options: { platform: true } },
 // Core.validate and Replay's retained-declaration reader explicitly use
 // RULE_PROFILES. Platform readers also pass the rule-derived value domains.
 // These fixtures have no outcome value provider, so that exact map is {}.
 { name: "scope/capacity-confirmation/native-child-true", origins: ["packages/scope/test/capacity-confirmation.test.ts#history(true).child/default-ceiling"], declaration: () => capacityConfirmationChildData(true), bounds: { ...PROPOSED_BOUNDS, entryBytes: 4096 }, profiles: RULE_PROFILES },
 ...[false, true].map(whole => ({ name: `scope/capacity-confirmation/native-parent-${whole}`, origins: [`packages/scope/test/capacity-confirmation.test.ts#history(${whole}).parent`], declaration: () => capacityConfirmationParentData(definitionDigest(capacityConfirmationChildData(whole))), bounds: { ...PROPOSED_BOUNDS, entryBytes: 4096 }, profiles: RULE_PROFILES })),
 { name: "scope/capacity-confirmation/legacy-child-zero-bytes", origins: ["packages/scope/test/capacity-confirmation.test.ts#history(false,0).child", "packages/scope/test/capacity-confirmation.test.ts#verify(old.child)"], declaration: () => capacityConfirmationChildData(false), bounds: { ...PROPOSED_BOUNDS, entryBytes: 4096, scopeBytes: 0 }, profiles: RULE_PROFILES },
 { name: "scope/capacity-confirmation/replay-legacy-parent-zero-bytes", origins: ["packages/scope/test/capacity-confirmation.test.ts#verify(old.child)/parent-proof"], declaration: () => capacityConfirmationParentData(definitionDigest(capacityConfirmationChildData(false))), bounds: { ...PROPOSED_BOUNDS, entryBytes: 4096, scopeBytes: 0 }, profiles: RULE_PROFILES },
 ...[false, true].flatMap(firstKey => [
  { name: `scope/capacity-bound-records/native-receiver-${firstKey}-records-0`, origins: [`packages/scope/test/capacity-bound-records.test.ts#birth(under,true)/firstKey=${firstKey}`], declaration: () => boundRecordData(firstKey), bounds: { ...PIN_BOUNDS, scopeEntries: 8, scopeItems: 2, scopeRecords: 0, scopeRequests: 0 }, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
  { name: `scope/capacity-bound-records/native-sender-${firstKey}`, origins: [`packages/scope/test/capacity-bound-records.test.ts#birth(sourceUnder)/firstKey=${firstKey}`], declaration: () => capacityBoundSenderData(boundRecordData(firstKey).name), bounds: PIN_BOUNDS, profiles: RULE_PROFILES },
  { name: `scope/capacity-bound-records/replay-sender-${firstKey}`, origins: [`packages/scope/test/capacity-bound-records.test.ts#verify(receiver)/source-proof/firstKey=${firstKey}`], declaration: () => capacityBoundSenderData(boundRecordData(firstKey).name), bounds: { ...PIN_BOUNDS, scopeEntries: 8, scopeItems: 2, scopeRecords: firstKey ? 1 : 0, scopeRequests: 0 }, profiles: RULE_PROFILES },
 ]),
 { name: "scope/capacity-bound-records/native-receiver-true-records-1", origins: ["packages/scope/test/capacity-bound-records.test.ts#receiver.restart()/firstKey=true", "packages/scope/test/capacity-bound-records.test.ts#verify(receiver)/firstKey=true"], declaration: () => boundRecordData(true), bounds: { ...PIN_BOUNDS, scopeEntries: 8, scopeItems: 2, scopeRecords: 1, scopeRequests: 0 }, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
 { name: "scope/capacity-receiver-pins/native-child", origins: ["packages/scope/test/capacity-receiver-pins.test.ts#wire(child,childUnder)/platform-reader"], declaration: capacityPinChildData, bounds: PIN_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
 { name: "scope/capacity-receiver-pins/native-receiver", origins: ["packages/scope/test/capacity-receiver-pins.test.ts#birth(under,true)/initial-bounds"], declaration: capacityPinReceiverData, bounds: { ...PIN_BOUNDS, scopeEntries: 15, scopeItems: 3, scopeRecords: 1, scopeRequests: 2 }, profiles: RULE_PROFILES },
 { name: "scope/capacity-receiver-pins/native-sender", origins: ["packages/scope/test/capacity-receiver-pins.test.ts#birth(senderUnder)"], declaration: () => capacityPinSenderData(capacityPinReceiverData().name), bounds: PIN_BOUNDS, profiles: RULE_PROFILES },
 { name: "scope/capacity-standing/native-whole", origins: ["packages/scope/test/capacity-standing.test.ts#setup()/reference"], declaration: capacityStandingData, bounds: { ...PROPOSED_BOUNDS, scopeEntries: 9 }, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
 { name: "scope/capacity-standing/native-legacy-one-byte", origins: ["packages/scope/test/capacity-standing.test.ts#setup(1,oldData)", "packages/scope/test/capacity-standing.test.ts#verify(old.name)"], declaration: () => capacityStandingData(false), bounds: { ...PROPOSED_BOUNDS, scopeEntries: 9, scopeBytes: 1 }, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
 { name: "scope/floor-roots/native-platform", origins: ["packages/scope/test/floor-roots.test.ts#definitions.platform/Core.platform"], declaration: floorRootsData, bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
 { name: "scope/floor-size-proofs/native-platform", origins: ["packages/scope/test/floor-size-proofs.test.ts#definitions.platform/Core.platform"], declaration: floorSizeProofsData, bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
];
