/** Raw declarations and constructors from forms-settles.test.ts; no validator runs on import. */
import type { DeclaredDefinition, Subject } from "@generalbusiness/dap-contract";

export const act = (a: Record<string, unknown>) => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...a });
export const MARK = { fixed: false, required: true, of: { type: "bool" }, default: false } as const;
export const set = (slot: string, of?: Subject) => ({ ...(of ? { of } : {}), value: { slot, from: { const: true } } });
export const M: DeclaredDefinition = {
  format: "artroom-definition-1", name: "marks", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "file",
  items: {
    root: { many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: { opener: { fixed: true, required: true, list: false, author: false } }, refs: {}, values: {} },
    job: {
      many: true, max: 8, states: { open: { final: false }, held: { final: false }, done: { final: true } }, initial: "open", parties: {},
      refs: { desk: { fixed: true, required: true, to: { type: "scope", kind: "directory" } } }, values: { a: { ...MARK }, b: { ...MARK } },
    },
  },
  acts: {
    file: act({ step: "open", on: "root", grant: "file", fields: { opener: { type: "member", required: true } }, effects: [{ party: { slot: "opener", from: { field: "opener" } } }] }),
    start: act({ step: "open", on: "job", grant: "start", fields: { desk: { type: "scope", kind: "directory", required: true } }, effects: [{ ref: { slot: "desk", from: { field: "desk" } } }] }),
    "mark-a": act({ step: "transition", on: "job", grant: "mark", settles: { of: "on", sets: "a", in: ["open", "held"] }, effects: [set("a")] }),
    "mark-a-far": act({
      step: "transition", on: "job", grant: "mark", settles: { of: "on", sets: "a", in: ["open"] }, effects: [set("a")],
      sends: [{ tell: { to: { slot: "desk" }, message: "marked", fields: {}, result: {} } }],
    }),
    "mark-b": act({ step: "transition", on: "job", grant: "mark", settles: { of: "on", sets: "b", in: ["open", "held"] }, effects: [set("b")] }),
    close: act({ step: "transition", on: "job", grant: "close", settles: { of: "on", in: ["open"] }, guards: [{ state: ["open"] }], effects: [{ state: "done" }] }),
  },
  receives: {}, timed: {}, rules: {},
} as unknown as DeclaredDefinition;
