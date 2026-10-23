/** Raw values shared with the format corpus; no validation or test registration. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/artroom-bytes";
import type { ApplicationDefinition } from "../src/index.ts";

export const clientNotes = {
  format: "artroom-definition-1", name: "notes", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "start",
  items: {
    note: { many: true, max: 8, states: { kept: { final: false } }, initial: "kept", parties: {}, refs: {}, values: { body: { fixed: false, required: false, of: { type: "text", max: 40, detached: true } } } },
  },
  acts: {
    start: { step: "open", on: "note", also: {}, fields: {}, grant: "start", guards: [], effects: [], sends: [], attention: [] },
    write: {
      step: "transition", on: "note", also: {}, grant: "write",
      fields: {
        body: { type: "text", max: 40, detached: true, required: true }, title: { type: "text", max: 10, required: false },
        weight: { type: "int", min: 1, max: 3, required: false }, tone: { type: "enum", of: ["plain", "loud"], required: false },
      },
      presents: { proof: { kind: ["write"], under: "notes", required: false } },
      guards: [{ state: ["kept"] }], effects: [{ value: { slot: "body", from: { field: "body" } } }], sends: [], attention: [],
    },
  },
  receives: {}, timed: {}, rules: {},
} as const satisfies DeclaredDefinition;
export const clientNotesWithMax = () => ({ ...clientNotes, items: { note: { ...clientNotes.items.note, max: 9 } } } as const satisfies DeclaredDefinition);

export function packageDeclaration(name: string, child?: ApplicationDefinition, capability = false): ApplicationDefinition {
  const common = { also: {}, fields: {}, guards: [], effects: [], attention: [] };
  const body: DeclaredDefinition = {
    format: "artroom-definition-1", name, profile: { name: "restricted", version: 1 }, capabilities: capability ? [{ name: "hold", version: 1 }] : [],
    genesis: "found", items: { record: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: {} } },
    acts: { found: { ...common, step: "open", on: "record", grant: "app.found", sends: child ? [{ create: { kind: "lane", definition: child.id, fields: {}, result: {} } }] : [] },
      touch: { ...common, step: "transition", on: "record", grant: "app.edit", sends: [] } }, receives: {}, timed: {}, rules: {},
  };
  return { id: definitionDigest(body), bytes: canonicalize(body) };
}
