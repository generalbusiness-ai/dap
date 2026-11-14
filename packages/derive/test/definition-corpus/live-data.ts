/** Raw live-version-1 forms and paired recorded declarations. Importing them runs no judge or validator. */
import type { ActType, DeclaredDefinition, FieldType, PlatformData, ReceiveType } from "@generalbusiness/dap-contract";
import { lane } from "./fixture-data.ts";
import { checkingData } from "./checking-data.ts";

const act = (row: Partial<ActType> & Pick<ActType, "step" | "on" | "grant">): ActType =>
  ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...row });

export function liveBase(live = true): DeclaredDefinition {
  return {
    format: "artroom-definition-1", name: "live-tally", profile: { name: "restricted", version: 1 },
    ...(live ? { level: { name: "live", version: 1 } as const } : {}), capabilities: [], genesis: "found",
    items: { tally: {
      many: false, max: 1, initial: "open", states: { open: { final: false }, closed: { final: true } },
      parties: { owner: { fixed: false, required: false, list: false, author: false } },
      refs: { peer: { fixed: false, required: false, to: { type: "scope", kind: "lane" } }, local: { fixed: false, required: false, to: { type: "item", of: "tally" } } },
      values: { count: { fixed: false, required: true, default: 0, of: { type: "int", min: 0, max: 100 } } },
    } },
    acts: {
      found: act({ step: "open", on: "tally", grant: "found" }),
      count: act({ step: "transition", on: "tally", grant: "count", fields: { next: { type: "int", min: 0, max: 100, required: true } },
        guards: [{ state: ["open"] }], effects: [{ value: { slot: "count", from: { field: "next" } } }] }),
    },
    receives: {}, timed: {}, rules: {},
  };
}

export const liveForms = {
  level: () => liveBase(),
  rule: () => {
    const d = liveBase(); d.rules = { ready: "true" };
    d.acts["count"]!.guards = [{ state: ["open"] }, { rule: "ready" }]; return d;
  },
  conditionalEffect: () => {
    const d = liveBase();
    d.acts["count"]!.effects = [{ value: { slot: "count", from: { field: "next" } }, if: [{ equals: { a: { field: "next" }, b: { const: 1 } } }] }]; return d;
  },
  nestedFields: () => {
    const d = liveBase();
    d.acts["count"]!.fields = { ...d.acts["count"]!.fields, names: { type: "list", max: 4, required: false,
      of: { type: "record", of: { name: { type: "text", max: 20, required: true }, member: { type: "member", required: false } } } } };
    return d;
  },
  timed: () => {
    const d = liveBase();
    d.items["lease"] = { many: true, max: 4, initial: "open", states: { open: { final: false }, ended: { final: true } },
      parties: {}, refs: {}, values: { until: { fixed: false, required: true, of: { type: "time" } } } };
    d.acts["lease"] = act({ step: "open", on: "lease", grant: "lease", effects: [{ value: { slot: "until", from: { time: { plusSeconds: 60 } } } }] });
    d.timed = { expire: { on: "lease", states: ["open"], deadline: "until", effects: [{ state: "ended" }], attention: [] } };
    return d;
  },
};

const handler = (): ReceiveType => ({ message: "count", class: "tell", from: { kind: "lane" }, fields: {}, opens: null,
  also: {}, guards: [], effects: [], sends: [], attention: [] });
const changed = (change: (d: DeclaredDefinition) => void): DeclaredDefinition => { const d = liveBase(false); change(d); return d; };
const field = (type: FieldType): DeclaredDefinition => changed(d => { d.acts["count"]!.fields = { ...d.acts["count"]!.fields, proof: { ...type, required: false } }; });
const fact = { type: "fact", kind: ["count"], under: "live-tally" } as const;

/** Each factory is admitted as recorded and refused after changing only its level to live. */
export const liveDurableForms = {
  handler: () => changed(d => { d.receives = { count: handler() }; }),
  create: () => changed(d => { d.acts["count"]!.sends = [{ create: { kind: "lane", definition: "self", fields: {}, result: {} } }]; }),
  tell: () => changed(d => { d.acts["count"]!.sends = [{ tell: { to: { slot: "peer" }, message: "count", fields: {}, result: {} } }]; }),
  relate: () => changed(d => { d.acts["count"]!.sends = [{ relate: { to: { slot: "peer" }, name: "count", item: { item: "on" }, state: "set", detail: {}, result: {} } }]; }),
  index: () => changed(d => { d.acts["count"]!.sends = [{ index: { fields: { count: { slot: "count" } } } }]; }),
  genesisSend: () => changed(d => { d.acts["found"]!.sends = [{ index: { fields: {} } }]; }),
  capability: () => changed(d => { d.capabilities = [{ name: "git-read", version: 1 }]; }),
  hold: () => structuredClone(lane),
  preparation: checkingData,
  presents: () => changed(d => { d.acts["count"]!.presents = {}; }),
  factField: () => field(fact),
  factList: () => field({ type: "list", max: 4, of: fact }),
  factRecord: () => field({ type: "record", of: { proof: { ...fact, required: true } } }),
  factListRecord: () => field({ type: "list", max: 4, of: { type: "record", of: { proof: { ...fact, required: true } } } }),
  factSlot: () => changed(d => { d.items["tally"]!.refs = { ...d.items["tally"]!.refs, proof: { fixed: false, required: false, to: fact } }; }),
  factValue: () => changed(d => { d.items["tally"]!.values = { ...d.items["tally"]!.values, proof: { fixed: false, required: false, of: fact } }; }),
  factOperand: () => {
    const d = field(fact);
    d.acts["count"]!.guards = [{ state: ["open"] }, { fact: { field: "proof" } }]; return d;
  },
  presentedFact: () => changed(d => {
    d.acts["count"]!.presents = { proof: { kind: ["count"], under: d.name, required: true } };
    d.acts["count"]!.guards = [{ state: ["open"] }, { fact: { presented: "proof" } }];
  }),
  attention: () => changed(d => { d.acts["count"]!.attention = [{ notify: { slot: "owner", of: "on", when: "after", reason: "counted" } }]; }),
  timedAttention: () => {
    const d = liveForms.timed(); delete d.level;
    d.items["lease"]!.parties = { owner: { fixed: false, required: false, list: false, author: false } };
    d.timed["expire"]!.attention = [{ notify: { slot: "owner", of: "on", when: "after", reason: "expired" } }];
    return d;
  },
};

export function liveOutcomeSend(): PlatformData {
  return { ...liveBase(false), outcomes: { probe: { code: "probe", row: "P16", send: { code: "report", row: "P16", result: {} } } } };
}
