/** Raw receiver declaration with its original fixture bounds. */
import { PROPOSED_BOUNDS, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import { lane } from "./fixture-data.ts";

export const PIN_BOUNDS = { ...PROPOSED_BOUNDS, textBytes: 64 };
export function receiverPinData(): DeclaredDefinition {
  const data = structuredClone(lane);
  data.capacity = { name: "whole-scope", version: 1 };
  data.items = { intent: { ...data.items["intent"]!, values: { title: { fixed: true, required: true, of: { type: "text", max: 64 } } } } };
  const file = data.acts["file"]!;
  file.fields["title"] = { type: "text", max: 64, required: true };
  const form = { also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
  data.acts = {
    file,
    license: { ...form, step: "transition", on: "intent", grant: "report", fields: { peer: { type: "scope", kind: "task", required: true } }, effects: [{ capability: { name: "hold", do: "license", with: {
      export: { const: 0 }, from: { field: "peer" }, checkpoint: { const: "fixture" }, hold: { const: 0 }, instance: { const: "i" }, k: { const: 1 },
    } } }] },
    touch: { ...form, step: "transition", on: "intent", grant: "report" },
  };
  data.receives = {
    license: { ...form, class: "tell", message: "export-license", from: { kind: "task" }, opens: null,
      fields: { export: { type: "item", of: "intent", required: true }, k: { type: "int", min: 1, max: 3, required: true }, body: { type: "text", detached: true, max: 4, required: false } },
      also: { export: { item: "intent", by: "export" } },
      effects: [{ capability: { name: "hold", do: "license", with: {
        export: { item: "also.export" }, from: { sender: true }, checkpoint: { const: "fixture" }, hold: { const: 0 }, instance: { const: "i" }, k: { field: "k" },
      } } }],
    },
  };
  data.rules = {}; data.timed = {};
  return data;
}
