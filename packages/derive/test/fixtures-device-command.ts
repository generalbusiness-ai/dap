/** Small device schema for pure judgments and native storage witnesses. */
import { DEVICE_COMMAND, type ActType, type DeclaredDefinition } from "@generalbusiness/dap-contract";

const fixed = { fixed: true, required: true }, mutable = { fixed: false, required: true }, optional = { fixed: false, required: false };
const level = { type: "int", min: 0, max: 100 } as const;
const target = { type: "enum", of: ["open", "closed", "on", "off"] } as const;
export const deviceCommandRow = (over: Partial<ActType>): ActType => ({ step: "transition", on: "device", grant: "command", also: {}, fields: {}, guards: [{ state: ["active"] }], effects: [], sends: [], attention: [], ...over });
export const deviceCommandFixture: DeclaredDefinition = {
  format: "artroom-definition-1", name: "command-fixture", profile: { name: "restricted", version: 1 },
  capabilities: [{ name: "device-command", version: 1 }], genesis: "start",
  items: {
    root: { many: false, max: 1, initial: "ready", states: { ready: { final: false } }, parties: {}, refs: {}, values: {} },
    device: { many: true, max: 2, initial: "active", states: { active: { final: false }, closed: { final: true } }, parties: {},
      refs: { targetAt: { ...mutable, to: { type: "fact", under: "command-fixture", kind: ["commission", "command"] } },
        outcomeAt: { ...optional, capability: DEVICE_COMMAND, to: { type: "fact", under: "command-fixture", kind: ["device-command@1:answer"] } } },
      values: { kind: { ...fixed, of: { type: "enum", of: ["fan", "heater", "vent"] } }, target: { ...mutable, of: target }, level: { ...mutable, of: level },
        due: { ...optional, of: { type: "time" } }, reported: { ...optional, of: level }, outcome: { ...optional, capability: DEVICE_COMMAND, of: { type: "enum", of: ["confirmed", "refused", "unknown"] } } },
    },
  },
  acts: {
    start: deviceCommandRow({ step: "open", on: "root", grant: "start", guards: [] }),
    commission: deviceCommandRow({ step: "open", guards: [], fields: { kind: { type: "enum", of: ["fan", "heater", "vent"], required: true } },
      effects: [{ value: { slot: "kind", from: { field: "kind" } } }, { value: { slot: "target", from: { const: "off" } } },
        { value: { slot: "level", from: { const: 0 } } }, { ref: { slot: "targetAt", from: "self" } }] }),
    command: deviceCommandRow({ fields: { target: { ...target, required: true }, level: { ...level, required: true } },
      guards: [{ state: ["active"] }, { capability: { name: "device-command", guard: "allowed", with: { kind: { slot: "kind" } } } }],
      effects: [{ value: { slot: "target", from: { field: "target" } } }, { value: { slot: "level", from: { field: "level" } } },
        { ref: { slot: "targetAt", from: "self" } }, { capability: { name: "device-command", do: "open", with: { device: { slot: "kind" } } } }] }),
    report: deviceCommandRow({ fields: { reported: { ...level, required: true } }, effects: [{ value: { slot: "reported", from: { field: "reported" } } }] }),
  },
  receives: { update: { message: "update", class: "tell", from: { kind: "lane" }, opens: null,
    fields: { device: { type: "item", of: "device", required: true } }, also: { device: { item: "device", by: "device" } }, guards: [], effects: [], sends: [], attention: [] } },
  timed: { expire: { on: "device", states: ["active"], deadline: "due", effects: [{ state: "closed" }], attention: [] } }, rules: {},
};
