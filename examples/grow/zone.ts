/** G0 recorded zone evidence. Temperatures are integer centidegrees Celsius;
 * summaries are comments, and only sensors classify a recorded band crossing. */
import type { ActType, FieldType, ItemType } from "@generalbusiness/dap-contract";

const temperature = { type: "int", min: -4000, max: 8000 } as const;
const count = { type: "int", min: 0, max: 25 } as const;
const band = { type: "int", min: 1, max: 2000 } as const;
const mutable = { fixed: false, required: true } as const;
const optional = { fixed: false, required: false } as const;
const act = (body: Pick<ActType, "step" | "on" | "grant"> & Partial<ActType>): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...body });
const zones: FieldType = { type: "list", max: 4, of: { type: "record", of: {
  zone: { type: "item", of: "zone", required: true }, min: { ...temperature, required: true }, max: { ...temperature, required: true }, mean: { ...temperature, required: true }, inBand: { ...count, required: true },
} } };

export function zoneForms(under: string): { item: ItemType; acts: Record<string, ActType>; rules: Record<string, string> } {
  const allIn = { equals: { a: { field: "inBand" }, b: { const: 25 } } } as const;
  return {
    item: { many: true, max: 4, initial: "unobserved", states: { unobserved: { final: false }, "in-band": { final: false }, "out-of-band": { final: false } }, parties: {},
      refs: { summary: { ...optional, to: { type: "fact", under, kind: ["observe"] } } },
      values: { label: { fixed: true, required: true, of: { type: "text", max: 80 } }, setpoint: { ...mutable, of: temperature }, band: { ...mutable, of: band },
        min: { ...optional, of: temperature }, max: { ...optional, of: temperature }, mean: { ...optional, of: temperature }, inBand: { ...optional, of: count }, summaryTime: { ...optional, of: { type: "time" } },
      },
    },
    acts: {
      "commission-zone": act({ step: "open", on: "zone", grant: "grow.configure", fields: { label: { type: "text", max: 80, required: true }, setpoint: { ...temperature, required: true }, band: { ...band, required: true } },
        effects: ["label", "setpoint", "band"].map(slot => ({ value: { slot, from: { field: slot } } })),
      }),
      observe: act({ step: "comment", on: null, grant: "grow.sense", fields: { sampledAt: { type: "time", required: true }, zones: { ...zones, required: true } } }),
      "report-zone": act({ step: "transition", on: "zone", grant: "grow.sense",
        fields: { summary: { type: "fact", under, kind: ["observe"], required: true }, sampledAt: { type: "time", required: true }, zones: { ...zones, required: true },
          min: { ...temperature, required: true }, max: { ...temperature, required: true }, mean: { ...temperature, required: true }, inBand: { ...count, required: true } },
        guards: [{ state: ["unobserved", "in-band", "out-of-band"] }, { fact: { field: "summary" } },
          { equals: { a: { field: "summary", part: "scope" }, b: { scope: true } }, reason: "wrong-summary-room" },
          { equals: { a: { field: "summary", part: { field: "zones" } }, b: { field: "zones" } }, reason: "summary-mismatch" },
          { equals: { a: { field: "summary", part: { field: "sampledAt" } }, b: { field: "sampledAt" } }, reason: "summary-mismatch" },
          { rule: "zone-evidence", reason: "invalid-zone-evidence" }, { rule: "zone-order", reason: "stale-zone-summary" }, { rule: "zone-crossing", reason: "no-band-crossing" }],
        effects: [{ state: "in-band", if: [allIn] }, { state: "out-of-band", unless: [allIn] },
          ...["min", "max", "mean", "inBand"].map(slot => ({ value: { slot, from: { field: slot } } })),
          { value: { slot: "summaryTime", from: { field: "sampledAt" } } }, { ref: { slot: "summary", from: { field: "summary" } } }],
      }),
      "set-band": act({ step: "transition", on: "zone", grant: "grow.heat", fields: { setpoint: { ...temperature, required: true }, band: { ...band, required: true } },
        guards: [{ state: ["unobserved", "in-band", "out-of-band"] }],
        // Old summary bytes remain evidence of the old classification. They
        // cannot establish the new band's state until sensors report it.
        effects: [{ value: { slot: "setpoint", from: { field: "setpoint" } } }, { value: { slot: "band", from: { field: "band" } } }, { state: "unobserved" }],
      }),
    },
    rules: {
      "zone-evidence": "($id := subjects.on.id; $z := fields.zones[zone = $id]; $lo := subjects.on.values.setpoint - subjects.on.values.band; $hi := subjects.on.values.setpoint + subjects.on.values.band; $count($z) = 1 and fields.min = $z.min and fields.max = $z.max and fields.mean = $z.mean and fields.inBand = $z.inBand and fields.min <= fields.mean and fields.mean <= fields.max and ((fields.min >= $lo and fields.max <= $hi) ? fields.inBand = 25 : ((fields.max < $lo or fields.min > $hi) ? fields.inBand = 0 : ((fields.min < $lo and fields.max > $hi) ? fields.inBand <= 23 : (fields.inBand >= 1 and fields.inBand <= 24)))))",
      "zone-crossing": "subjects.on.state = 'unobserved' or (fields.inBand = 25 ? subjects.on.state = 'out-of-band' : subjects.on.state = 'in-band')",
      "zone-order": "subjects.on.refs.summary = null or (fields.sampledAt >= subjects.on.values.summaryTime and (fields.summary > subjects.on.refs.summary or (fields.summary = subjects.on.refs.summary and subjects.on.state = 'unobserved')))",
    },
  };
}
