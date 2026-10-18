/** Recorded watering/chemical work on current forms. A member's statement
 * records intended/performed work; no pump, chemical or provider is actuated. */
import type { ActType, DeclaredDefinition, ItemType } from "@generalbusiness/dap-contract";
const fixed = { fixed: true, required: true } as const, mutable = { fixed: false, required: true } as const, optional = { fixed: false, required: false } as const;
const act = (body: Pick<ActType, "step" | "on" | "grant"> & Partial<ActType>): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...body });
const policyFields = { opensAt: { type: "time", required: true }, closesAt: { type: "time", required: true }, maxMl: { type: "int", min: 1, max: 10000, required: true } } as const;
export function wateringForms(under: string): Pick<DeclaredDefinition, "items" | "acts" | "rules"> {
  const record: ItemType = { many: true, max: 32, initial: "asked", states: { asked: { final: false }, approved: { final: false }, declined: { final: true }, done: { final: true } },
    parties: { decidedBy: { ...optional, list: false, author: false }, performedBy: { ...optional, list: false, author: true } },
    refs: { zone: { ...fixed, to: { type: "item", of: "zone" } }, bench: { ...optional, to: { type: "item", of: "bench" } }, basis: { ...optional, to: { type: "fact", under, kind: ["probe"] } },
      decisionAt: { ...optional, to: { type: "fact", under, kind: ["approve-watering", "decline-watering"] } }, performedAt: { ...optional, to: { type: "fact", under, kind: ["water", "fulfill-watering"] } } },
    values: { amountMl: { ...fixed, of: { type: "int", min: 1, max: 10000 } }, mode: { ...fixed, of: { type: "enum", of: ["scheduled", "requested"] } }, reason: { ...fixed, of: { type: "text", max: 1024 } }, decision: { ...optional, of: { type: "text", max: 1024 } }, performedTime: { ...optional, of: { type: "time" } } },
  };
  const policy = act({ step: "open", on: "water-policy", grant: "grow.configure", fields: policyFields, guards: [{ rule: "water-window", reason: "invalid-water-window" }], effects: ["opensAt", "closesAt", "maxMl"].map(slot => ({ value: { slot, from: { field: slot } } })) });
  const decide = (state: "approved" | "declined") => act({ step: "transition", on: "watering", grant: "grow.water-more", fields: { decision: { type: "text", max: 1024, required: true } }, guards: [{ state: ["asked"] }],
    effects: [{ state }, { party: { slot: "decidedBy", from: { signer: true } } }, { value: { slot: "decision", from: { field: "decision" } } }, { ref: { slot: "decisionAt", from: "self" } }],
  });
  return {
    items: { "water-policy": { many: false, max: 1, initial: "active", states: { active: { final: false } }, parties: {}, refs: {}, values: { opensAt: { ...mutable, of: { type: "time" } }, closesAt: { ...mutable, of: { type: "time" } }, maxMl: { ...mutable, of: { type: "int", min: 1, max: 10000 } } } }, watering: record },
    acts: {
      "configure-watering": policy,
      "set-water-policy": { ...policy, step: "transition", grant: "grow.water-more", guards: [{ state: ["active"] }, ...policy.guards] },
      water: act({ step: "open", on: "watering", grant: "grow.water", fields: { zone: { type: "item", of: "zone", required: true }, amountMl: { type: "int", min: 1, max: 10000, required: true }, reason: { type: "text", max: 1024, required: true } }, also: { zone: { item: "zone", by: "zone" }, policy: { item: "water-policy", one: true } },
        guards: [{ of: "also.policy", state: ["active"] }, { of: "also.policy", after: { slot: "opensAt" } }, { of: "also.policy", before: { slot: "closesAt" } }, { rule: "water-amount", reason: "watering-exceeds-schedule" }],
        effects: [{ state: "done" }, { ref: { slot: "zone", from: { field: "zone" } } }, { value: { slot: "amountMl", from: { field: "amountMl" } } }, { value: { slot: "mode", from: { const: "scheduled" } } }, { value: { slot: "reason", from: { field: "reason" } } },
          { party: { slot: "performedBy", from: { signer: true } } }, { value: { slot: "performedTime", from: { time: { plusSeconds: 0 } } } }, { ref: { slot: "performedAt", from: "self" } }],
      }),
      "request-watering": act({ step: "open", on: "watering", grant: "grow.water", fields: { zone: { type: "item", of: "zone", required: true }, amountMl: { type: "int", min: 1, max: 10000, required: true }, reason: { type: "text", max: 1024, required: true }, bench: { type: "item", of: "bench", required: true }, basis: { type: "fact", under, kind: ["probe"], required: true } }, also: { zone: { item: "zone", by: "zone" }, bench: { item: "bench", by: "bench" } },
        guards: [{ fact: { field: "basis" } }, { equals: { a: { field: "basis", part: "scope" }, b: { scope: true } }, reason: "wrong-watering-room" }, { equals: { a: { field: "basis", part: "on" }, b: { field: "bench" } }, reason: "wrong-watering-bench" }, { equals: { a: { slot: "zone", of: "also.bench" }, b: { field: "zone" } }, reason: "wrong-watering-zone" }, { rule: "water-request-content", reason: "empty-watering-reason" }],
        effects: [{ ref: { slot: "zone", from: { field: "zone" } } }, { ref: { slot: "bench", from: { field: "bench" } } }, { ref: { slot: "basis", from: { field: "basis" } } }, { value: { slot: "amountMl", from: { field: "amountMl" } } }, { value: { slot: "mode", from: { const: "requested" } } }, { value: { slot: "reason", from: { field: "reason" } } }],
      }),
      "approve-watering": decide("approved"), "decline-watering": decide("declined"),
      "fulfill-watering": act({ step: "transition", on: "watering", grant: "grow.water", guards: [{ state: ["approved"] }], effects: [{ state: "done" }, { party: { slot: "performedBy", from: { signer: true } } }, { value: { slot: "performedTime", from: { time: { plusSeconds: 0 } } } }, { ref: { slot: "performedAt", from: "self" } }], }),
      apply: act({ step: "comment", on: null, grant: "grow.apply", fields: { zone: { type: "item", of: "zone", required: true }, product: { type: "text", max: 80, required: true }, rate: { type: "text", max: 80, required: true }, reason: { type: "text", max: 1024, required: true } } }),
    },
    rules: { "water-window": "fields.opensAt < fields.closesAt", "water-amount": "$exists(subjects.`also.policy`) and fields.amountMl <= subjects.`also.policy`.values.maxMl",
      "water-request-content": "$length(fields.reason) > 0 and $not($contains(\" \\t\\r\\n\", $substring(fields.reason, 0, 1)))" },
  };
}
