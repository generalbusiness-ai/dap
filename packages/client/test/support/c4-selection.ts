/** Fixed C4 TEST declaration. Native validates/judges it in the fixture;
 * this source makes no hosted installation or published-release claim. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";

export const selection = {
  format: "artroom-definition-1",
  name: "c4-selection",
  profile: { name: "restricted", version: 1 },
  capabilities: [],
  genesis: "establish",
  items: {
    anchor: {
      many: false, max: 1, initial: "open", states: { open: { final: false } },
      parties: { founder: { fixed: true, required: true, list: false, author: false } },
      refs: { destination: { fixed: true, required: true, to: { type: "scope", kind: "destination" } } },
      values: {
        label: { fixed: false, required: false, of: { type: "text", max: 16 } },
        target: { fixed: false, required: false, of: { type: "item", of: "target" } },
      },
    },
    target: {
      many: true, max: 2, initial: "open", states: { open: { final: false } },
      parties: {}, refs: {},
      values: { n: { fixed: false, required: true, of: { type: "int", min: 0, max: 9 } } },
    },
    note: {
      many: true, max: 2, initial: "open", states: { open: { final: false } },
      parties: {}, refs: {},
      values: { label: { fixed: false, required: true, of: { type: "text", max: 16 } } },
    },
  },
  acts: {
    establish: {
      step: "open", on: "anchor", grant: "c4-selection.establish", also: {},
      fields: { opener: { type: "member", required: true }, destination: { type: "scope", kind: "destination", required: true } },
      guards: [], effects: [
        { party: { slot: "founder", from: { field: "opener" } } },
        { ref: { slot: "destination", from: { field: "destination" } } },
      ], sends: [], attention: [],
    },
    "make-target": {
      step: "open", on: "target", grant: "c4-selection.member", also: {},
      fields: { n: { type: "int", min: 0, max: 9, required: true } },
      guards: [], effects: [{ value: { slot: "n", from: { field: "n" } } }], sends: [], attention: [],
    },
    "rename-anchor": {
      step: "transition", on: "anchor", grant: "c4-selection.member", also: {},
      fields: { label: { type: "text", max: 16, required: true } },
      guards: [], effects: [{ value: { slot: "label", from: { field: "label" } } }], sends: [], attention: [],
    },
    point: {
      step: "transition", on: "anchor", grant: "c4-selection.member", also: {},
      fields: { target: { type: "item", of: "target", required: true } },
      guards: [], effects: [{ value: { slot: "target", from: { field: "target" } } }], sends: [], attention: [],
    },
    "revise-target": {
      step: "transition", on: "target", grant: "c4-selection.member", also: {},
      fields: { n: { type: "int", min: 0, max: 9, required: true } },
      guards: [], effects: [{ value: { slot: "n", from: { field: "n" } } }], sends: [], attention: [],
    },
    touch: {
      step: "transition", on: "anchor", grant: "c4-selection.member",
      also: { target: { item: "target", via: { of: "on", slot: "target" } } },
      fields: { label: { type: "text", max: 16, required: true } },
      guards: [], effects: [{ value: { slot: "label", from: { field: "label" } } }], sends: [], attention: [],
    },
    "make-note": {
      step: "open", on: "note", grant: "c4-selection.member",
      also: { anchor: { item: "anchor", one: true }, target: { item: "target", via: { of: "also.anchor", slot: "target" } } },
      fields: { label: { type: "text", max: 16, required: true } },
      guards: [], effects: [{ value: { slot: "label", from: { field: "label" } } }], sends: [], attention: [],
    },
  },
  receives: {}, timed: {}, rules: {},
} as const satisfies DeclaredDefinition;

/** Only these fixed TEST packet fields enter the selection preset. */
export const selectionMetadata = {
  name: "ai.generalbusiness.c4-selection", version: "0.1.0",
  host: { execution: "recorded-do", profiles: ["restricted@1"] },
  roles: { admin: ["c4-selection.establish", "c4-selection.member"] },
  capabilities: [],
} as const;
