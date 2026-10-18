/** Bench and tender-work data. Each supplied reading keeps its own entry
 * reference; absent readings are never invented or made newly fresh. */
import type { ActType, DeclaredDefinition, EffectForm, FieldType, Guard, ItemType } from "@generalbusiness/dap-contract";
const act = (body: Pick<ActType, "step" | "on" | "grant"> & Partial<ActType>): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...body });
const fixed = { fixed: true, required: true } as const, optional = { fixed: false, required: false } as const;
const metrics: Record<string, FieldType> = {
  moisture: { type: "int", min: 0, max: 100 }, ec: { type: "int", min: 0, max: 10000 }, ph: { type: "int", min: 0, max: 1400 },
  height: { type: "int", min: 0, max: 5000 }, insects: { type: "int", min: 0, max: 10000 }, note: { type: "text", max: 1024 },
};
export function workForms(under: string): Pick<DeclaredDefinition, "items" | "acts" | "rules" | "timed"> {
  const fact = (kinds: readonly string[]): FieldType => ({ type: "fact", under, kind: kinds });
  const bench: ItemType = { many: true, max: 100, initial: "stale", states: { stale: { final: false }, fresh: { final: false } }, parties: {},
    refs: { zone: { ...fixed, to: { type: "item", of: "zone" } }, lastProbe: { ...optional, to: fact(["probe"]) }, ...Object.fromEntries(Object.keys(metrics).map(metric => [`${metric}At`, { ...optional, to: fact(["probe"]) }])) },
    values: { label: { ...fixed, of: { type: "text", max: 80 } }, row: { ...fixed, of: { type: "enum", of: [..."ABCDEFGHIJ"] } }, column: { ...fixed, of: { type: "int", min: 1, max: 10 } },
      ...Object.fromEntries(Object.entries(metrics).map(([name, of]) => [name, { ...optional, of }])), probeTime: { ...optional, of: { type: "time" } }, staleAt: { ...optional, of: { type: "time" } } },
  };
  const effects: EffectForm[] = [];
  for (const metric of Object.keys(metrics)) {
    const present: Guard = { differs: { a: { field: metric }, b: { none: true } } };
    effects.push({ value: { slot: metric, from: { field: metric } }, if: [present] }, { ref: { slot: `${metric}At`, from: "self" }, if: [present] });
  }
  effects.push({ state: "fresh" }, { value: { slot: "probeTime", from: { time: { plusSeconds: 0 } } } }, { value: { slot: "staleAt", from: { time: { plusSeconds: 172800 } } } }, { ref: { slot: "lastProbe", from: "self" } });
  const task: ItemType = { many: true, max: 32, initial: "offered", states: { offered: { final: false }, taken: { final: false }, done: { final: true } },
    parties: { performer: { ...optional, list: false, author: true } },
    refs: { device: { ...fixed, to: { type: "item", of: "device" } }, zone: { ...fixed, to: { type: "item", of: "zone" } }, alert: { ...fixed, to: { type: "item", of: "alert" } }, reportAt: { ...optional, to: fact(["report-task"]) } },
    values: { text: { ...fixed, of: { type: "text", max: 1024 } }, report: { ...optional, of: { type: "text", max: 2048 } }, reportTime: { ...optional, of: { type: "time" } } },
  };
  return {
    items: { bench, task },
    acts: {
      "commission-bench": act({ step: "open", on: "bench", grant: "grow.configure", also: { zone: { item: "zone", by: "zone" } },
        fields: { zone: { type: "item", of: "zone", required: true }, label: { type: "text", max: 80, required: true }, row: { type: "enum", of: [..."ABCDEFGHIJ"], required: true }, column: { type: "int", min: 1, max: 10, required: true } },
        guards: [{ none: { type: "bench", states: ["stale", "fresh"], where: [{ equals: { a: { slot: "row" }, b: { field: "row" } } }, { equals: { a: { slot: "column" }, b: { field: "column" } } }] }, reason: "bench-exists" }],
        effects: [...["label", "row", "column"].map(slot => ({ value: { slot, from: { field: slot } } })), { ref: { slot: "zone", from: { field: "zone" } } }],
      }),
      probe: act({ step: "transition", on: "bench", grant: "grow.tend", fields: Object.fromEntries(Object.entries(metrics).map(([name, type]) => [name, { ...type, required: false }])),
        guards: [{ state: ["stale", "fresh"] }, { rule: "probe-content", reason: "empty-probe" }], effects,
      }),
      "offer-task": act({ step: "open", on: "task", grant: "grow.climate", fields: { device: { type: "item", of: "device", required: true }, alert: { type: "item", of: "alert", required: true }, text: { type: "text", max: 1024, required: true } },
        also: { device: { item: "device", by: "device" }, alert: { item: "alert", by: "alert" } },
        guards: [{ of: "also.device", state: ["active"] }, { of: "also.alert", state: ["open", "held", "authorized"] }, { equals: { a: { slot: "zone", of: "also.device" }, b: { slot: "zone", of: "also.alert" } }, reason: "wrong-task-zone" }],
        effects: [{ ref: { slot: "device", from: { field: "device" } } }, { ref: { slot: "alert", from: { field: "alert" } } }, { ref: { slot: "zone", from: { slot: "zone", of: "also.device" } } }, { value: { slot: "text", from: { field: "text" } } }],
      }),
      "take-task": act({ step: "transition", on: "task", grant: "grow.tend", guards: [{ state: ["offered"] }], effects: [{ state: "taken" }, { party: { slot: "performer", from: { signer: true } } }] }),
      "report-task": act({ step: "transition", on: "task", grant: "grow.tend", fields: { report: { type: "text", max: 2048, required: true } }, guards: [{ state: ["taken"] }, { signer: ["performer"] }, { rule: "task-report-content", reason: "empty-task-report" }],
        effects: [{ state: "done" }, { value: { slot: "report", from: { field: "report" } } }, { value: { slot: "reportTime", from: { time: { plusSeconds: 0 } } } }, { ref: { slot: "reportAt", from: "self" } }],
      }),
    },
    rules: { "probe-content": "$exists(fields.moisture) or $exists(fields.ec) or $exists(fields.ph) or $exists(fields.height) or $exists(fields.insects) or ($length(fields.note) > 0 and $not($contains(\" \\t\\r\\n\", $substring(fields.note, 0, 1))))", "task-report-content": "$length(fields.report) > 0 and $not($contains(\" \\t\\r\\n\", $substring(fields.report, 0, 1)))" },
    timed: { "bench-stale": { on: "bench", states: ["fresh"], deadline: "staleAt", effects: [{ state: "stale" }], attention: [] } },
  };
}
