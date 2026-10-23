/** Raw scripted parent only; native judging stays in the existing fixture. */
import type { DeclaredDefinition, Digest } from "@generalbusiness/dap-contract";
export function scriptedDeviceParentDefinition(selected: Digest, fields: DeclaredDefinition["acts"][string]["fields"]): DeclaredDefinition {
  return {
    format: "artroom-definition-1", name: "test.scripted-device-parent", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
    items: { root: { many: false, max: 1, initial: "ready", states: { ready: { final: false } }, parties: {}, refs: {}, values: {} } },
    acts: { establish: { step: "open", on: "root", grant: "fixture.create", also: {}, fields, guards: [], effects: [], attention: [],
      sends: [{ create: { kind: "lane", definition: selected, fields: Object.fromEntries(Object.keys(fields).map(name => [name, { field: name }])), result: {} } }],
    } }, receives: {}, timed: {}, rules: {},
  };
}
