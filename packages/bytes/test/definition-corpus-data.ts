/** Raw declaration shared by signed-tail projection witnesses and format compatibility. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
const common = { also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
export const journalProjectionDefinition: DeclaredDefinition = {
  format: "artroom-definition-1", name: "journal-fixture", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
  items: { root: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: {} } },
  acts: { establish: { ...common, step: "open", on: "root", grant: "journal.write" }, note: { ...common, step: "comment", on: "root", grant: "journal.write",
    fields: { room: { type: "int", min: 0, max: 10, required: true } } }, observe: { ...common, step: "comment", on: null, grant: "journal.write",
    fields: { room: { type: "int", min: 0, max: 10, required: true } } } }, receives: {}, timed: {}, rules: {},
};
