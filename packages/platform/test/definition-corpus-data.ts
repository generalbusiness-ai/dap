/** Raw platform-test declarations, without checked wrappers or history construction. */
import type { DeclaredDefinition, Digest, PlatformDefinition } from "@generalbusiness/dap-contract";
import { MEMBERSHIP, membership, FIRST_ACTIONS, ROLE_LISTS } from "../src/membership.ts";
import { RULES_SCOPE } from "../src/rules-scope.ts";
import { DESTINATION } from "../src/destination.ts";
import { APPLICATION_VALUES_BYTES } from "../src/application.ts";
const NAME = { type: "text", max: 256 } as const;
export const office: DeclaredDefinition = {
  format: "artroom-definition-1",
  name: "office",
  profile: { name: "restricted", version: 1 },
  capabilities: [],
  genesis: "open",
  items: {
    repository: {
      many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {},
      refs: { membership: { fixed: false, required: false, to: { type: "scope", kind: "membership" } } },
      values: {},
    },
  },
  acts: {
    open: {
      step: "open", on: "repository", grant: "office.open", also: {},
      fields: { "founder": { type: "text", max: 64, required: true }, "founderHandle": { type: "text", max: 256, required: true }, recoveryKey: { type: "text", max: 64, required: true } },
      guards: [], effects: [],
      sends: [{
        create: {
          kind: "membership", definition: MEMBERSHIP,
          fields: { "founder": { field: "founder" }, "founderHandle": { field: "founderHandle" }, recoveryKey: { field: "recoveryKey" }, directory: { scope: true } },
          result: { applied: [{ ref: { slot: "membership", from: { sender: true } } }] },
        },
      }],
      attention: [],
    },
  },
  receives: {},
  timed: {},
  rules: {},
};
export const officeDataFor = (named: PlatformDefinition): DeclaredDefinition => ({ ...office, acts: { ...office.acts, open: { ...office.acts["open"]!, sends: office.acts["open"]!.sends.map(send => "create" in send ? { create: { ...send.create, definition: named } } : send) } } });
export const bureau: DeclaredDefinition = {
  format: "artroom-definition-1",
  name: "bureau",
  profile: { name: "restricted", version: 1 },
  capabilities: [],
  genesis: "open",
  items: {
    repository: {
      many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {},
      refs: { destination: { fixed: false, required: false, to: { type: "scope", kind: "destination" } } },
      values: {},
    },
  },
  acts: {
    open: {
      step: "open", on: "repository", grant: "bureau.open", also: {},
      fields: {
        repository: { type: "record", of: { host: { ...NAME, required: true }, namespace: { ...NAME, required: true }, name: { ...NAME, required: true }, id: { ...NAME, required: true } }, required: true },
        branch: { ...NAME, required: true },
        import: { type: "bool", required: true },
        claim: { type: "fact", kind: ["found"], under: "platform:register", required: true },
        membership: { type: "text", max: 64, required: true },
        rules: { type: "text", max: 64, required: true },
        "founderHandle": { ...NAME, required: true },
      },
      guards: [], effects: [],
      sends: [{
        create: {
          kind: "destination", definition: DESTINATION,
          fields: {
            repository: { field: "repository" }, branch: { field: "branch" }, import: { field: "import" }, claim: { field: "claim" },
            directory: { scope: true }, membership: { field: "membership" }, rules: { field: "rules" }, "founderHandle": { field: "founderHandle" },
          },
          result: { applied: [{ ref: { slot: "destination", from: { sender: true } } }] },
        },
      }],
      attention: [],
    },
  },
  receives: {},
  timed: {},
  rules: {},
};
export const registrar: DeclaredDefinition = {
  format: "artroom-definition-1",
  name: "registrar",
  profile: { name: "restricted", version: 1 },
  capabilities: [],
  genesis: "open",
  items: {
    repository: {
      many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {},
      refs: { rules: { fixed: false, required: false, to: { type: "scope", kind: "rules" } } },
      values: {},
    },
  },
  acts: {
    open: {
      step: "open", on: "repository", grant: "registrar.open", also: {},
      fields: { branch: { type: "text", max: 256, required: true }, membership: { type: "text", max: 64, required: true } },
      guards: [], effects: [],
      sends: [{
        create: {
          kind: "rules", definition: RULES_SCOPE,
          fields: { branch: { field: "branch" }, directory: { scope: true }, membership: { field: "membership" } },
          result: { applied: [{ ref: { slot: "rules", from: { sender: true } } }] },
        },
      }],
      attention: [],
    },
  },
  receives: {},
  timed: {},
  rules: {},
};
export const asker: DeclaredDefinition = {
  format: "artroom-definition-1",
  name: "asker",
  profile: { name: "restricted", version: 1 },
  capabilities: [],
  genesis: "start",
  items: {
    ask: {
      many: false, max: 1, initial: "open", states: { open: { final: false } },
      parties: { opener: { fixed: true, required: true, list: false, author: false } },
      refs: { rulesScope: { fixed: false, required: false, to: { type: "scope", kind: "rules" } } },
      values: {},
    },
  },
  acts: {
    start: { step: "open", on: "ask", grant: "asker.start", also: {}, fields: { opener: { type: "member", required: true } }, guards: [], effects: [{ party: { slot: "opener", from: { field: "opener" } } }], sends: [], attention: [] },
    point: { step: "transition", on: "ask", grant: "asker.point", also: {}, fields: { rules: { type: "scope", kind: "rules", required: true } }, guards: [], effects: [{ ref: { slot: "rulesScope", from: { field: "rules" } } }], sends: [], attention: [] },
    want: { step: "transition", on: "ask", grant: "asker.want", also: {}, fields: {}, guards: [], effects: [], sends: [{ tell: { to: { slot: "rulesScope" }, message: "rules-wanted", fields: {}, result: {} } }], attention: [] },
  },
  receives: {},
  timed: {},
  rules: {},
};
export const registrarDataFor = (named: PlatformDefinition): DeclaredDefinition => ({
      ...registrar, acts: { ...registrar.acts, open: { ...registrar.acts["open"]!, sends: registrar.acts["open"]!.sends.map(send => "create" in send ? { create: { ...send.create, definition: named } } : send) } },
    });
export const smallApplication: DeclaredDefinition = {
  format: "artroom-definition-1", name: "small-application", profile: { name: "restricted", version: 1 },
  capabilities: [], genesis: "establish",
  items: { configuration: { many: false, max: 1, initial: "ready", states: { ready: { final: false } },
    parties: { controller: { fixed: true, required: true, list: false, author: false } }, refs: {},
    values: { target: { fixed: true, required: true, of: { type: "int", min: 1, max: 100 } } } } },
  acts: { establish: { step: "open", on: "configuration", grant: "small.establish", also: {},
    fields: { opener: { type: "member", required: true }, target: { type: "int", min: 1, max: 100, required: true },
      note: { type: "text", max: APPLICATION_VALUES_BYTES, required: false },
      peer: { type: "member", required: false },
      membership: { type: "member", required: false } },
    guards: [], effects: [{ party: { slot: "controller", from: { field: "opener" } } }, { value: { slot: "target", from: { field: "target" } } }], sends: [], attention: [] } },
  receives: {}, timed: {}, rules: { supported: "true" },
};
const declaration = smallApplication;
export const applicationChild = () => ({ ...declaration, name: "small-child" });
export function applicationRoot(childDigest: Digest): DeclaredDefinition {
  return { ...declaration, acts: { ...declaration.acts, establish: { ...declaration.acts["establish"]!,
    sends: [{ create: { kind: "lane", definition: childDigest, fields: { opener: { field: "opener" }, target: { field: "target" } }, result: {} } }] } } };
}
export function applicationDestination(): DeclaredDefinition {
  return { ...declaration, acts: { ...declaration.acts, establish: { ...declaration.acts["establish"]!,
    fields: { ...declaration.acts["establish"]!.fields, destination: { type: "scope", kind: "destination", required: true } } } } };
}
export function applicationWrongDestination(declared: DeclaredDefinition): DeclaredDefinition {
  return { ...declared, acts: { ...declared.acts, establish: { ...declared.acts["establish"]!, fields: { ...declared.acts["establish"]!.fields, destination: { type: "scope", kind: "directory", required: false } } } } };
}
export function membershipWrittenRoles() {
  const asData = JSON.parse(JSON.stringify(membership));
  // A constant is of no marked type, so the five slots take the written list type that they had before the mark `action-list`.
  for (const slot of Object.values(ROLE_LISTS)) asData.items.roster.values[slot].of = { type: "list", of: { type: "text", max: 64 }, max: 64 };
  asData.acts["set-actions"].fields.actions = { type: "list", of: { type: "text", max: 64 }, max: 64, required: true };
  asData.acts.establish.effects = [...asData.acts.establish.effects.filter((effect: object) => !("code" in effect)), ...Object.entries(ROLE_LISTS).map(([role, slot]) => ({ value: { slot, from: { const: FIRST_ACTIONS[role as keyof typeof ROLE_LISTS] } } }))];
  return asData;
}
