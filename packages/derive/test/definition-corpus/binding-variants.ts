/** Exact positive callbacks from forms-binding.test.ts, without eager validation. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalBytes, parseStrictBytes } from "@generalbusiness/artroom-bytes";
import { PROFILES } from "../../src/validate/index.ts";
import { M, M51, TICKET, OWNER, JOB_OF } from "./forms-binding-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";

export const bindingChanges = {
  wholeSettlement: (data: any) => {
    data.capacity = { name: "whole-scope", version: 1 };
    data.items.job.holds.items = 1;
    data.items.result = { many: true, max: 8, states: { done: { final: true } }, initial: "done", parties: {}, refs: {}, values: {} };
    data.receives.stop.settles = { of: "also.job", in: ["queued"] };
    data.receives.stop.effects[1].most = { effects: 2, operations: [], opens: "result" };
  },
  ticketKinds: (data: any) => { data.items.job.refs.ticket.to = { ...TICKET, kind: ["merge", "land"] }; data.receives.start.fields.ticket.kind = ["merge", "land"]; data.receives.stop.fields.ticket.kind = ["land", "merge"]; },
  unusedIndex: (data: any) => { data.items.job.indexes = ["ticket", "owner"]; },
  writtenBinding: (data: any) => { data.receives.stop.fields.job = { type: "item", of: "job", required: true }; data.receives.stop.also.job = { item: "job", by: "job" }; },
  boundWhere: (handler: any) => { handler.bound.where = [OWNER, { differs: { a: { field: "ticket" }, b: { slot: "ticket", of: "also.job" } } }]; },
};

export function bindingBoundOperandsData() {
  const data = structuredClone(M);
  const bound: { of: string; where: unknown[] } = data.receives.stop.bound;
  bound.where = [OWNER, { differs: { a: { slot: "ticket", of: "also.job" }, b: { field: "ticket" } } }];
  return data;
}

export function bindingWhereData() { const data = structuredClone(M); bindingChanges.boundWhere(data.receives.stop); return data; }

export function bindingLateGuardData() {
  const data = structuredClone(M) as unknown as import("@generalbusiness/dap-contract").PlatformData;
  data.receives["stop"]!.fields["amount"] = { type: "int", min: 0, max: 1, required: true };
  data.receives["stop"]!.guards = [{ code: "decline", row: "P15" }];
  data.receives["stop"]!.effects = [];
  return data;
}

export function bindingLateEffectData() {
  const data = structuredClone(M) as unknown as import("@generalbusiness/dap-contract").PlatformData;
  data.items["job"]!.values["amount"] = { fixed: false, required: true, default: 0, of: { type: "int", min: 0, max: 1 } };
  data.receives["stop"]!.guards = [];
  data.receives["stop"]!.effects = [{ code: "invalid-value", row: "P15" }];
  return data;
}

export function bindingPreFailureData(failure: string) {
  const data = structuredClone(M51) as unknown as import("@generalbusiness/dap-contract").PlatformData;
  data.receives["stop"]!.effects = [];
  data.receives["stop"]!.guards = [{ code: "decline", row: "P15" }];
  if (failure === "fact-mismatch") data.receives["stop"]!.fields = { job: { type: "fact", kind: ["start"], under: data.name, required: true } };
  if (failure === "alias") data.receives["stop"]!.also["duplicate"] = { item: "job", by: "job" };

  return data;
}


export function bindingClockData(phase: string) {
  const data = structuredClone(M) as unknown as import("@generalbusiness/dap-contract").PlatformData;
  data.receives["stop"]!.effects = [];
  data.receives["stop"]!.guards = [{ code: "decline", row: "P15" }];
  if (phase === "type") data.receives["stop"]!.fields["amount"] = { type: "code", code: "typed", row: "P15", required: true };

  return data;
}


export function bindingAuditData() {
  const data = structuredClone(M) as unknown as import("@generalbusiness/dap-contract").PlatformData;
  data.outcomes["audit"] = { code: "audit", row: "P16", attempts: 1 };
  data.receives["stop"]!.effects = [{ code: "open-audit", row: "P16", most: { effects: 0, operations: ["audit"] } }];
  return data;
}

export function bindingCountsData() {
  const data = structuredClone(M) as unknown as import("@generalbusiness/dap-contract").PlatformData;
  data.items["job"]!.holds = { decisions: { stop: 2 } };
  data.acts["take"]!.adds = { decisions: { stop: 1 } };
  data.acts["finish"] = { ...M.acts.take, step: "transition", grant: "finish", guards: [{ state: ["taken"] }], effects: [{ state: "done" }] };
  return data;
}

export function bindingRequestData() {
  const data = structuredClone(M) as unknown as import("@generalbusiness/dap-contract").PlatformData;
  data.items["job"]!.holds = { decisions: { stop: 1 }, requests: 1 };
  data.receives["stop"]!.sends = [{ tell: { to: { slot: "owner", of: "also.job" }, message: "notice", fields: {}, result: {} } }];
  return data;
}

export function bindingProtoData() {
  const data = structuredClone(M51) as unknown as import("@generalbusiness/dap-contract").PlatformData;
  data.receives["stop"] = JSON.parse(JSON.stringify(data.receives["stop"]).replaceAll("also.job", "also.__proto__"));
  data.receives["stop"]!.also = Object.fromEntries([["__proto__", { item: "job", by: "job" }]]);
  return data;
}

export function bindingLocalFactData() {
  const data = structuredClone(M51) as unknown as import("@generalbusiness/dap-contract").PlatformData;
  data.receives["stop"]!.fields = { job: { type: "fact", kind: ["start"], under: data.name, required: true } };
  return data;
}

export function bindingIntegerData(min = -10, max = 10) {
  const integer = { type: "int", min, max };
  const data: any = structuredClone(M);
  {
    data.items.job.values.number = { fixed: true, required: true, of: integer };
    data.items.job.indexes = ["number"];
    data.receives.start.fields.number = { ...integer, required: true };
    data.receives.start.effects.push({ value: { slot: "number", from: { field: "number" } } });
    data.receives.stop.fields.number = { ...integer, required: true };
    data.receives.stop.also.job = { ...JOB_OF, index: "number", key: "number" };
  }
  return data;
}

const changed = (base: unknown, change: (data: any) => void) => { const data = structuredClone(base); change(data); return data; };
const row = (name: string, declaration: () => unknown, origin: string): DefinitionCorpusRow => ({
  name: `derive/forms-binding/${name}`, origins: [`packages/derive/test/forms-binding.test.ts#${origin}`], declaration,
  bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true },
});
export const bindingVariantDefinitions: readonly DefinitionCorpusRow[] = [
  row("base-M", () => structuredClone(M), "m/base and three() scripted jobs"),
  row("base-M51", () => structuredClone(M51), "m51/base and started()"),
  row("wholeSettlement", () => changed(M, bindingChanges.wholeSettlement), "opt-in bound settlement"),
  row("ticketKinds", () => changed(M, bindingChanges.ticketKinds), "kinds compared as sets"),
  row("unusedIndex", () => changed(M, bindingChanges.unusedIndex), "unused owner index"),
  row("writtenBinding", () => changed(M, bindingChanges.writtenBinding), "written item binding"),
  row("boundOperands", () => parseStrictBytes(canonicalBytes(bindingBoundOperandsData())), "canonical bound operands"),
  row("boundWhere", bindingWhereData, "bound where operands"),
  row("bindingLateGuardData", bindingLateGuardData, "late guard"),
  row("bindingLateEffectData", bindingLateEffectData, "late effect"),
  row("bindingAuditData", bindingAuditData, "audit closure"),
  row("bindingCountsData", bindingCountsData, "decision counts"),
  row("bindingRequestData", bindingRequestData, "bound request"),
  row("bindingProtoData", bindingProtoData, "own proto subject"),
  row("bindingLocalFactData", bindingLocalFactData, "local fact field"),
  ...["no-item", "fact-mismatch", "alias"].map(failure => row(`prebinding-${failure}`, () => bindingPreFailureData(failure), `prebinding failures/${failure}`)),
  ...["type", "guard"].map(phase => row(`clock-${phase}`, () => bindingClockData(phase), `clock phases/${phase}`)),
  row("integer-default", () => bindingIntegerData(), "integer indexes default and replay"),
  row("integer-safe-range", () => bindingIntegerData(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), "integer indexes safe range"),
];
