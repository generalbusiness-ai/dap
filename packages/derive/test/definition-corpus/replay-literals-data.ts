/** Existing replay raw literals; no validation, history or Vitest imports. */
import { DOMAINS, PROPOSED_BOUNDS, type DeclaredDefinition, type PlatformData } from "@generalbusiness/dap-contract";
import { notes, desk, lane } from "./fixture-data.ts";
const form = { also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
const digest = { type: "digest" } as const;

export const replayViewBase: PlatformData = {
  format: "artroom-definition-1", name: "platform:view-index", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "found",
  items: {
    board: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: {} },
    row: {
      many: true, max: 8, initial: "live", states: { live: { final: false }, done: { final: true } }, parties: {},
      refs: { key: { fixed: true, required: true, to: digest } },
      values: { category: { fixed: true, required: true, of: digest }, other: { fixed: true, required: true, of: digest } },
      indexes: ["key", "category"],
    },
  },
  acts: {
    "found": { ...form, step: "open", on: "board", grant: "found" },
    add: {
      ...form, step: "open", on: "row", grant: "add", fields: { key: { ...digest, required: true }, category: { ...digest, required: true } },
      effects: [{ ref: { slot: "key", from: { field: "key" } } }, { value: { slot: "category", from: { field: "category" } } }, { value: { slot: "other", from: { field: "key" } } }],
    },
    finish: { ...form, step: "transition", on: "row", grant: "finish", guards: [{ state: ["live"] }], effects: [{ state: "done" }] },
  },
  receives: {}, timed: {}, rules: {}, outcomes: {},
};

export const replayDecisionBase: PlatformData = {
  format: "artroom-definition-1", name: "platform:task", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "found",
  items: {
    board: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: { opener: { fixed: true, required: true, list: false, author: false } }, refs: {}, values: {} },
    job: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: { owner: { fixed: false, required: true, to: { type: "scope", kind: "lane" } } }, values: {}, holds: { decisions: { stop: 1 } } },
  },
  acts: { "found": { ...form, step: "open", on: "board", grant: "found", fields: { opener: { type: "member", required: true } }, effects: [{ party: { slot: "opener", from: { field: "opener" } } }] } },
  receives: {
    start: { ...form, class: "tell", message: "start", from: { kind: "lane" }, opens: "job", effects: [{ ref: { slot: "owner", from: { sender: true } } }] },
    stop: { ...form, class: "tell", message: "stop", from: { kind: "lane" }, opens: null, also: { job: { item: "job", one: true } }, bound: { of: "also.job", where: [{ equals: { a: { sender: true }, b: { slot: "owner", of: "also.job" } } }] }, guards: [{ of: "also.job", equals: { a: { const: true }, b: { const: false } }, reason: "not-ready" }] },
  },
  outcomes: {}, rules: {}, timed: {},
};

export function replayViewDuty() {
  const declared = structuredClone(replayViewBase);
  declared.name = "duty-replay-fixture";
  delete (declared as Partial<PlatformData>).outcomes;
  delete declared.items["row"]!.indexes;
  declared.capacity = { name: "whole-scope", version: 1 };
  declared.items["row"]!.refs["peer"] = { fixed: true, required: true, to: { type: "scope", kind: "lane" } };
  declared.acts["add"]!.fields["peer"] = { type: "scope", kind: "lane", required: true };
  declared.acts["add"]!.effects = [...declared.acts["add"]!.effects, { ref: { slot: "peer", from: { field: "peer" } } }];
  declared.acts["add"]!.sends = [{ tell: { to: { slot: "peer" }, message: "note", fields: {}, result: {} } }];
  declared.acts["finish"]!.settles = { of: "on", in: ["live"] };
  const other = structuredClone(declared.acts["finish"]!);
  other.fields = { target: { type: "item", of: "row", required: true } };
  other.also = { other: { item: "row", by: "target" } };
  other.settles = { of: "also.other", in: ["live"] };
  other.guards = [{ state: ["live"] }, { of: "also.other", state: ["live"] }];
  other.effects = [{ state: "done" }, { of: "also.other", state: "done" }];
  declared.acts["finish-other"] = other;
  return declared;
}

export function replayViewHeld() {
  const declared = structuredClone(replayViewBase);
  declared.capacity = { name: "whole-scope", version: 1 };
  declared.items["row"]!.holds = { requests: 1 };
  declared.acts["finish"]!.settles = { of: "on", in: ["live"] };
  declared.acts["discard"] = structuredClone(replayViewBase.acts["finish"]!);
  return declared;
}

export function replayChildAlias(root: DeclaredDefinition) {
  const data: PlatformData = { ...structuredClone(root), name: "platform:task", outcomes: {} };
  data.acts["retain"] = { ...structuredClone(data.acts["children"]!), sends: [], fields: { declaration: { type: "digest", required: true, value: { domain: DOMAINS.definition, max: PROPOSED_BOUNDS.definitionBytes } } } };
  return data;
}

export function replayRecoveredAlias() {
  const data: PlatformData = { ...structuredClone(notes), name: "platform:task", capacity: { name: "whole-scope", version: 1 }, outcomes: {} };
  data.acts["retain"] = { ...structuredClone(data.acts["vouch"]!), presents: {}, guards: [], fields: { proof: { type: "digest", required: true, value: { domain: DOMAINS.text, max: 32768 } } }, effects: [], sends: [] };
  return data;
}

export function replayGenesisAlias() {
  const data: PlatformData = { ...structuredClone(notes), name: "platform:task", capacity: { name: "whole-scope", version: 1 }, outcomes: {} };
  data.acts["retain"] = { ...structuredClone(data.acts["vouch"]!), presents: {}, guards: [], sends: [], effects: [], fields: {
    birth: { type: "fact", under: "notes", kind: ["start"], required: true },
    body: { type: "digest", value: { domain: DOMAINS.text, max: 32768 }, required: true },
  } };
  return data;
}

export function replayAnchorRemarks() {
  const data: PlatformData = { ...desk, name: "platform:task", receives: {}, outcomes: {},
    acts: { found: desk.acts["found"]!, remark: { ...lane.acts["remark"]!, on: "repo" },
      vouch: { ...lane.acts["remark"]!, step: "transition", on: "repo", fields: {},
        presents: { proof: { kind: ["remark"], under: "platform:task", required: true } }, guards: [{ fact: { presented: "proof" } }] } } };
  return data;
}

export function replayDecisionFields() {
  const data = structuredClone(replayDecisionBase);
  data.receives["stop"]!.fields = { ...data.receives["stop"]!.fields, amount: { type: "int", min: 0, max: 1, required: true } };
  data.receives["stop"]!.guards = [{ code: "decline", row: "P15" }];
  return data;
}

export function replayDecisionText(decision: string) {
  const data = structuredClone(replayDecisionBase);
  const memo = { type: "text", max: 16, detached: true } as const;
  data.items["board"]!.values["memo"] = { fixed: false, required: true, of: memo };
  data.items["job"]!.values["amount"] = { fixed: false, required: true, default: 0, of: { type: "int", min: 0, max: 1 } };
  data.acts["found"]!.fields = { ...data.acts["found"]!.fields, memo: { ...memo, required: true } };
  data.acts["found"]!.effects = [...data.acts["found"]!.effects, { value: { slot: "memo", from: { field: "memo" } } }];
  data.acts["redact"] = { ...form, step: "transition", on: "board", grant: "redact", guards: [{ state: ["open"] }], effects: [{ redact: { slot: "memo" } }] };
  if (decision === "known") data.items["job"]!.holds = { decisions: { stop: 2 } };
  data.receives["stop"]!.fields = { note: { type: "text", max: 2, detached: true, required: true }, reject: { type: "bool", required: true } };
  data.receives["stop"]!.guards = decision === "named" ? [{ code: "decline", row: "P15" }] : decision === "other" ? [{ of: "also.job", equals: { a: { const: true }, b: { const: false } } }] : [];
  data.receives["stop"]!.effects = [{ code: "effect", row: "P15" }];
  return data;
}

export function replayDecisionFloor() {
    const data = structuredClone(replayDecisionBase);
    const memo = { type: "text", max: 16, detached: true } as const;
    data.items["board"]!.values["memo"] = { fixed: false, required: true, of: memo };
    data.items["job"]!.values["amount"] = { fixed: false, required: true, default: 0, of: { type: "int", min: 0, max: 1 } };
    data.acts["found"]!.fields = { ...data.acts["found"]!.fields, memo: { ...memo, required: true } };
    data.acts["found"]!.effects = [...data.acts["found"]!.effects, { value: { slot: "memo", from: { field: "memo" } } }];
    data.acts["prove"] = { ...form, step: "transition", on: "board", grant: "prove", fields: { note: { type: "text", max: 2, detached: true, required: true } } };
    data.acts["erase"] = { ...form, step: "transition", on: "board", grant: "erase", effects: [{ redact: { slot: "memo" } }] };
    data.receives["stop"]!.fields = { note: { type: "text", max: 2, detached: true, required: true } };
    data.receives["stop"]!.guards = [];
    data.receives["stop"]!.effects = [{ code: "invalid-value", row: "P15" }];
  return data;
}

export const replayReservedSource = (): DeclaredDefinition => ({ ...notes, name: "change" });

export const replayReservedReceiver = (): DeclaredDefinition => ({ ...notes, acts: { ...notes.acts,
    vouch: { ...notes.acts["vouch"]!, presents: { proof: { kind: ["write"], under: "change", required: true } } } } });

export const replayQualifiedReceiver = (): DeclaredDefinition => ({ ...notes, acts: { ...notes.acts,
    vouch: { ...notes.acts["vouch"]!, presents: { proof: { kind: ["write"], under: "declared:change", required: true } } } } });
