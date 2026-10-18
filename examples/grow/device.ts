/** G0 device declarations, composed into the room later. Targets and reports
 * have separate writers. Command outcomes belong only to the separately
 * labelled scenario owner until the commissioned G5a native form exists. */
import type { ActType, Guard, ItemType, Subject } from "@generalbusiness/dap-contract";

const act = (body: Pick<ActType, "step" | "on" | "grant"> & Partial<ActType>): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...body });
const level = { type: "int", min: 0, max: 100 } as const;
const kinds = { type: "enum", of: ["vent", "fan", "heater"] } as const;
const targets = { type: "enum", of: ["open", "closed", "on", "off"] } as const;
const reported = { type: "enum", of: [...targets.of, "error"] } as const;
const fixed = { fixed: true, required: true } as const;
const mutable = { fixed: false, required: true } as const;
const optional = { fixed: false, required: false } as const;

function validTarget(kind: string, minimum: string, maximum: string): string {
  return `(((${kind} = 'vent') and fields.target in ['open', 'closed']) or ((${kind} in ['fan', 'heater']) and fields.target in ['on', 'off'])) and ((fields.target in ['closed', 'off'] and fields.level = 0) or (fields.target in ['open', 'on'] and fields.level >= 1 and fields.level >= ${minimum} and fields.level <= ${maximum} and (${kind} != 'heater' or fields.level = 100)))`;
}

export const deviceNotFailed = (of: Subject): Guard => ({ reason: "device-error", anyOf: [[{ of, unset: "reported" }], [{ of, differs: { a: { slot: "reported" }, b: { const: "error" } } }]] });
export function deviceForms(under: string, additionalTargetActs: readonly string[] = []): { item: ItemType; acts: Record<string, ActType>; rules: Record<string, string> } {
  const notFailed = deviceNotFailed("on");
  const command = (kind: "vent" | "fan" | "heater", grant: string): ActType => act({
    step: "transition", on: "device", grant,
    fields: { target: { ...targets, required: true }, level: { ...level, required: true } },
    guards: [{ state: ["active"] }, { equals: { a: { slot: "kind" }, b: { const: kind } }, reason: "wrong-device-kind" }, notFailed, { rule: "device-target", reason: "device-limit" }],
    effects: [{ value: { slot: "target", from: { field: "target" } } }, { value: { slot: "level", from: { field: "level" } } }, { ref: { slot: "targetAt", from: "self" } }],
  });
  return {
    item: { many: true, max: 12, initial: "active", states: { active: { final: false } }, parties: {},
      refs: {
        targetAt: { ...mutable, to: { type: "fact", under, kind: ["commission-device", "set-vent", "set-fan", "set-heater", ...additionalTargetActs] } },
        reportedAt: { ...optional, to: { type: "fact", under, kind: ["report-device"] } },
      },
      values: { kind: { ...fixed, of: kinds }, label: { ...fixed, of: { type: "text", max: 80 } },
        minLevel: { ...fixed, of: level }, maxLevel: { ...fixed, of: level },
        target: { ...mutable, of: targets }, level: { ...mutable, of: level },
        reported: { ...optional, of: reported }, reportedLevel: { ...optional, of: level },
        description: { ...optional, of: { type: "text", max: 1024 } }, reportedTime: { ...optional, of: { type: "time" } },
      },
    },
    acts: {
      "commission-device": act({ step: "open", on: "device", grant: "grow.configure",
        fields: { kind: { ...kinds, required: true }, label: { type: "text", max: 80, required: true }, minLevel: { ...level, required: true }, maxLevel: { ...level, required: true }, target: { ...targets, required: true }, level: { ...level, required: true } },
        guards: [{ rule: "device-setup", reason: "device-limit" }],
        effects: [...["kind", "label", "minLevel", "maxLevel", "target", "level"].map(slot => ({ value: { slot, from: { field: slot } } })), { ref: { slot: "targetAt", from: "self" } }],
      }),
      "set-vent": command("vent", "grow.climate"), "set-fan": command("fan", "grow.climate"), "set-heater": command("heater", "grow.heat"),
      "report-device": act({ step: "transition", on: "device", grant: "grow.sense",
        fields: { reported: { ...reported, required: true }, level: { ...level, required: true }, description: { type: "text", max: 1024, required: true } },
        guards: [{ state: ["active"] }, { rule: "device-report", reason: "invalid-device-report" }],
        effects: [{ value: { slot: "reported", from: { field: "reported" } } }, { value: { slot: "reportedLevel", from: { field: "level" } } },
          { value: { slot: "description", from: { field: "description" } } }, { value: { slot: "reportedTime", from: { time: { plusSeconds: 0 } } } }, { ref: { slot: "reportedAt", from: "self" } }],
      }),
    },
    rules: {
      "device-setup": `fields.minLevel <= fields.maxLevel and (${validTarget("fields.kind", "fields.minLevel", "fields.maxLevel")})`,
      "device-target": validTarget("subjects.on.values.kind", "subjects.on.values.minLevel", "subjects.on.values.maxLevel"),
      "device-report": "(fields.reported = 'error' and $length(fields.description) > 0) or (fields.description = '' and (((subjects.on.values.kind = 'vent') and fields.reported in ['open', 'closed']) or ((subjects.on.values.kind in ['fan', 'heater']) and fields.reported in ['on', 'off'])) and ((fields.reported in ['closed', 'off'] and fields.level = 0) or (fields.reported in ['open', 'on'] and fields.level >= 1 and (subjects.on.values.kind != 'heater' or fields.level = 100))))",
    },
  };
}
