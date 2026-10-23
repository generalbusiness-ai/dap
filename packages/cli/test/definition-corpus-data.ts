/** Raw test declarations and exact local mutations; no SQLite, validator or filesystem work. */
import type { DeclaredDefinition, Digest } from "@generalbusiness/dap-contract";
export function clockDefinition(): DeclaredDefinition {
  return {
    format: "artroom-definition-1", name: "clock-fixture", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
    items: { root: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: {} },
      notice: { many: true, max: 1, initial: "waiting", states: { waiting: { final: false }, done: { final: true } }, parties: {}, refs: {},
      values: { until: { fixed: true, required: true, of: { type: "time" } } } } },
    acts: { establish: { step: "open", on: "root", grant: "clock.establish", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] },
      schedule: { step: "open", on: "notice", grant: "clock.schedule", also: {}, fields: { until: { type: "time", required: true } }, guards: [],
      effects: [{ value: { slot: "until", from: { field: "until" } } }], sends: [], attention: [] } },
    receives: {}, timed: { expire: { on: "notice", states: ["waiting"], deadline: "until", effects: [{ state: "done" }], attention: [] } }, rules: {},
  };
}
export function addCounterCitation(declaration: DeclaredDefinition): void {
  declaration.acts["cite"] = { step: "comment", on: null, grant: "counting.control", also: {}, fields: { source: { type: "fact", kind: ["initialize"], under: declaration.name, required: true } }, guards: [], effects: [], sends: [], attention: [] };
}
export function scenarioParent(id: Digest): DeclaredDefinition {
  return {
    format: "artroom-definition-1", name: "parent-fixture", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
    items: { root: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: {} } },
    acts: {
      establish: { step: "open", on: "root", grant: "fixture.create", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] },
      spawn: { step: "transition", on: "root", grant: "fixture.create", also: {}, fields: {}, guards: [], effects: [], attention: [],
        sends: [{ create: { kind: "lane", definition: id, fields: { opener: { signer: true }, target: { const: 10 } }, result: {} } }] },
    }, receives: {}, timed: {}, rules: {},
  };
}
export function packageReportDefinition() {
  return { format: "artroom-definition-1", name: "test.package-report", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "found",
      items: { note: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {},
        values: { label: { fixed: true, required: true, of: { type: "text", max: 80 } } } } },
      acts: {
        found: { step: "open", on: "note", grant: "app.configure", fields: { label: { type: "text", max: 80, required: true } }, also: {}, guards: [], effects: [{ value: { slot: "label", from: { field: "label" } } }], sends: [], attention: [] },
        note: { step: "comment", on: "note", grant: "app.comment", fields: { text: { type: "text", max: 80, required: true } }, also: {}, guards: [], effects: [], sends: [], attention: [] },
      } as Record<string, unknown>, receives: {}, timed: {}, rules: {},
    };
}
export function shortenNotesText(definition: DeclaredDefinition): void {
  Object.assign(definition.items["note"]!.values["text"]!.of, { max: 200 });
  Object.assign(definition.acts["add"]!.fields["text"]!, { max: 200 });
}
