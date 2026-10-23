/** Raw late/pin variants shared by the original witnesses and positive corpus. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PROPOSED_BOUNDS, type DeclaredDefinition, type PlatformData, type Digest, type EffectForm } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import { sourceOrderDefinition, lateDefinition } from "./source-order-data.ts";
import { receiverPinData, PIN_BOUNDS } from "./receiver-pins-data.ts";
import { boundRecordData } from "./bound-records-data.ts";
import { childDefinitionsData } from "./child-definitions-data.ts";
import { peerPinData } from "./peer-pin-data.ts";
import { d } from "./fixture-identities.ts";
import type { DefinitionCorpusRow } from "./row.ts";

export function lateIgnoredGuardData() {
  const definition = structuredClone(sourceOrderDefinition);
  definition.receives["sample"]!.guards = [{ equals: { a: { const: 1 }, b: { const: 2 } }, reason: "normal-only" }];
  definition.receives["sample"]!.late = { within: { seconds: 30 }, reason: "old-sample", then: {} };
  return definition;
}

export function lateRelationshipData(branch: boolean) {
  const declaration = lateDefinition(branch), handler = declaration.receives["sample"]!;
  handler.class = "relate"; handler.copies = 4; delete handler.order;
  declaration.items["board"]!.refs["me"] = { fixed: true, required: true, to: { type: "item", of: "board" } };
  declaration.acts["found"]!.effects = [...declaration.acts["found"]!.effects, { ref: { slot: "me", from: "self" } }];
  declaration.acts["emit"]!.sends = [{ relate: { to: { slot: "peer" }, name: "sample", item: { slot: "me" }, state: "set", detail: { value: { field: "first" } }, result: {} } }];
  return declaration;
}

export function lateResultData() {
  const definition = lateDefinition(true), handler = definition.receives["sample"]!;
  definition.capacity = { name: "whole-scope", version: 1 };
  handler.effects = [...handler.effects, { of: "also.board", ref: { slot: "peer", from: { sender: true } } }];
  handler.sends = [{ tell: { to: { slot: "peer", of: "also.board" }, message: "other", fields: { value: { const: 11 } }, result: { applied: [{ of: "also.board", value: { slot: "last", from: { const: 12 } } }] } } }];
  handler.late!.then!.effects = [...handler.late!.then!.effects!, { of: "also.board", ref: { slot: "peer", from: { sender: true } } }];
  handler.late!.then!.sends = [{ tell: { to: { slot: "peer", of: "also.board" }, message: "other", fields: { value: { const: 21 } }, result: { applied: [{ of: "also.board", value: { slot: "last", from: { const: 22 } } }] } } }];
  return definition;
}

export function lateRenamedPinData() {
  const data = receiverPinData(), handler = data.receives["license"]!;
  delete data.receives["license"]; data.receives["renamed"] = handler;
  handler.late = { within: { seconds: 30 }, reason: "old-license" };
  return data;
}

export function lateOrdinaryLicenseData() {
  const ordinary = lateDefinition(true);
  ordinary.receives["sample"]!.message = "export-license";
  return ordinary;
}

export function lateTrustedData() {
  const declaration = { ...lateDefinition(true), name: "platform:late-fixture", outcomes: {} } as PlatformData;
  declaration.name = "platform:late-fixture"; declaration.outcomes = {};
  declaration.capacity = { name: "whole-scope", version: 1 };
  declaration.receives["sample"]!.late!.then!.effects = [{ of: "also.board", ref: { slot: "peer", from: { sender: true } } }];
  declaration.receives["sample"]!.late!.then!.sends = [{ tell: { to: { slot: "peer", of: "also.board" }, message: "other", fields: { value: { const: 21 } }, result: {} } }];
  return declaration;
}

export function lateNativePinData() {
  const data = receiverPinData(); data.receives["license"]!.late = { within: { seconds: 30 }, reason: "old-license" };
  return data;
}

export function lateNormalRuleData() {
  const declaration = lateDefinition(true);
  declaration.rules = { normal: "false" }; declaration.receives["sample"]!.guards = [{ rule: "normal", reason: "normal-only" }];
  return declaration;
}

export function lateOpeningData() {
  const declaration = lateDefinition(true), handler = declaration.receives["sample"]!;
  declaration.items["row"] = { many: true, max: 3, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: { value: { fixed: true, required: true, of: { type: "int", min: 0, max: 100 } } } };
  handler.opens = "row"; handler.effects = [{ value: { slot: "value", from: { field: "value" } } }];
  handler.late!.then!.effects = [];
  return declaration;
}

export const lateOpeningEffects = (): readonly EffectForm[] => [{ value: { slot: "value", from: { const: 42 } } }];

export function lateCollisionData(platform: boolean, collision: boolean) {
  const data = { ...lateDefinition(true), name: platform ? "platform:late-collision" : "test.late-collision",
    capacity: { name: "whole-scope" as const, version: 1 as const }, capabilities: [{ name: "hold", version: 1 }], ...(platform ? { outcomes: {} } : {}) };
  const peer = { of: "also.board" as const, ref: { slot: "peer", from: { sender: true as const } } };
  data.receives["sample"]!.late!.then = { effects: [peer], sends: [{ tell: {
    to: { slot: "peer", of: "also.board" }, message: "other", fields: { value: { const: 21 } },
    result: { applied: [{ capability: { name: "hold", do: "license", with: {
      export: { const: 99 }, from: { none: true }, checkpoint: { const: "fixture" }, hold: { const: 0 }, instance: { const: "i" }, k: { const: 3 },
    } } }] },
  } }] };
  const cheap = structuredClone(data.receives["other"]!);
  cheap.message = "cheap"; cheap.effects = [peer]; cheap.sends = [{ tell: {
    to: { slot: "peer", of: "also.board" }, message: "other", fields: { value: { const: 21 } }, result: {},
  } }];
  data.receives[collision ? "sample.late.then" : "cheap-handler"] = cheap;
  return data;
}

export function peerNativePinData(pin: Digest) {
  const declaration = receiverPinData(); declaration.receives["license"]!.from.pin = pin;
  return declaration;
}

export function receiverClosureData(childDigest: Digest) {
  const data = receiverPinData();
  data.items["job"] = { many: true, max: 4, initial: "pending", states: { pending: { final: false }, done: { final: true } }, parties: {}, refs: {}, values: {} };
  data.receives["license"]!.opens = "job";
  data.acts["finish"] = { ...data.acts["touch"]!, on: "job", guards: [{ state: ["pending"] }], settles: { of: "on", in: ["pending"] }, effects: [{ state: "done" }], sends: [{ create: { kind: "lane", definition: childDigest, fields: {}, result: {} } }] };
  return data;
}

export function receiverExtendChange(data: DeclaredDefinition) {
  const request = data.acts["finish"]!.sends[0]!;
  if (!("create" in request)) throw new Error("fixture request missing");
  request.create.result = { refused: [{ capability: { name: "hold", do: "license", with: { export: { const: 99 }, from: { sender: true }, checkpoint: { const: "fixture" }, hold: { const: 0 }, instance: { const: "i" }, k: { const: 1 } } } }] };

}

export const receiverInertChange = (effect: any) => { effect.capability.with["from"] = { field: "k" }; };

export const receiverLegacyCounterChange = (unknown: DeclaredDefinition) => { delete unknown.capacity; };

const row = (name: string, file: string, origin: string, declaration: () => unknown, bounds = PROPOSED_BOUNDS): DefinitionCorpusRow => ({
 name: `derive/late-pin/${name}`, origins: [`packages/derive/test/${file}.test.ts#${origin}`], declaration, bounds,
});
export const latePinVariantDefinitions: readonly DefinitionCorpusRow[] = [
 ...[false, true].map(branch => row(`base-${branch}`, "late", `lateFixture(${branch})`, () => lateDefinition(branch))),
 row("ignored-normal-guard", "late", "ignored normal handler guard", lateIgnoredGuardData),
 ...[false, true].map(branch => row(`relationship-${branch}`, "late", `late relationship(${branch})`, () => lateRelationshipData(branch))),
 { ...row("normal-and-late-result", "late", "actual normal or late send clause", lateResultData), origins: ["packages/derive/test/late.test.ts#normal-result(false)", "packages/derive/test/late.test.ts#late-result(true)"] },
 row("renamed-native-handler", "late", "renamed receiver before invalid .then", lateRenamedPinData, PIN_BOUNDS),
 row("ordinary-export-license", "late", "ordinary same-name request", lateOrdinaryLicenseData),
 { ...row("trusted-platform", "late", "trusted platform capacity", lateTrustedData), options: { platform: true } },
 row("native-late-pin", "late", "native late refusal", lateNativePinData, PIN_BOUNDS),
 { ...row("normal-rule", "late", "normal rule preparation", lateNormalRuleData), profiles: RULE_PROFILES },
 row("corrected-opening", "late", "corrected required replacement slot", () => { const data = lateOpeningData(); data.receives["sample"]!.late!.then!.effects = lateOpeningEffects(); return data; }),
 ...[false, true].flatMap(platform => [
  { ...row(`collision-${platform}-false`, "late-reservation-identity", `declaration(${platform},false)`, () => lateCollisionData(platform, false)), options: { platform } },
  { ...row(`collision-${platform}-true-without-then`, "late-reservation-identity", `declaration(${platform},true) after deleting .then`, () => { const data = lateCollisionData(platform, true); delete data.receives["sample"]!.late!.then; return data; }), options: { platform } },
 ]),
 row("fixed-native-peer-pin", "peer-pin", "wrong pin native refusal", () => peerNativePinData(d("a")), PIN_BOUNDS),
 ...(["sender", "alternate", "receiver"] as const).map(part => row(`peer-${part}`, "peer-pin", `peerPinDefinitions().${part}`, () => peerPinData()[part])),
 row("receiver-base", "receiver-pins", "receiverPinDefinition()", receiverPinData, PIN_BOUNDS),
 row("receiver-closure", "receiver-pins", "shared item/request closure", () => receiverClosureData(definitionDigest(receiverPinData())), PIN_BOUNDS),
 row("receiver-extended", "receiver-pins", "extended result closure", () => { const data = receiverClosureData(definitionDigest(receiverPinData())); receiverExtendChange(data); return data; }, PIN_BOUNDS),
 row("receiver-inert-source", "receiver-pins", "recursive source made inert by integer from", () => { const data = receiverPinData(); const effect = data.receives["license"]!.effects[0]!; if (!("capability" in effect)) throw new Error("native fixture effect missing"); effect.capability.with["export"] = { const: 99 }; receiverInertChange(effect); return data; }, PIN_BOUNDS),
 row("receiver-legacy-counter", "receiver-pins", "unknown counter after deleting capacity", () => { const data = receiverPinData(); const effect = data.acts["license"]!.effects[0]!; if (!("capability" in effect)) throw new Error("native fixture effect missing"); effect.capability.with["k"] = { const: "unbounded counter" }; receiverLegacyCounterChange(data); return data; }, PIN_BOUNDS),
 ...[false, true].flatMap(firstKey => [false, true].map(whole => ({
  ...row(`bound-${firstKey}-${whole}`, "bound-records", `boundRecordDefinition(${firstKey},${whole})`, () => boundRecordData(firstKey, whole), PIN_BOUNDS),
  origins: [`packages/derive/test/bound-records.test.ts#boundRecordDefinition(${firstKey},${whole})`,
    ...(!whole ? [`packages/derive/test/bound-records.test.ts#boundRecordData(${firstKey},false)`] : []),
    ...(!firstKey && whole ? ["packages/derive/test/late.test.ts#boundRecordData() before invalid late", "packages/derive/test/peer-pin.test.ts#boundRecordData() before invalid pin"] : [])],
  options: { platform: true },
 }))),
 ...[false, true].flatMap(whole => (["root", "branch", "leaf", "extra"] as const).map(part => row(`child-${whole}-${part}`, "child-definitions", `childDefinitions(${whole}).${part}`, () => childDefinitionsData(whole)[part]))),
];
