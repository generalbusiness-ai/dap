/** Raw declarations and constructors from forms-guards.test.ts; no validator runs on import. */
import type { ActType, DeclaredDefinition, Operand, Range } from "@generalbusiness/dap-contract";

export const text = { type: "text", max: 40 } as const;
export const count = { type: "int", min: 0, max: 9 } as const;
export const slot = { fixed: false, required: false } as const;
export const act = (a: Partial<ActType> & Pick<ActType, "step" | "on" | "grant">): ActType => ({ also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...a });
/** The jobs in those states with that name. */
export const named = (states: string[], name: Operand, more: Partial<Range> = {}): Range => ({ type: "job", states, where: [{ equals: { a: { slot: "name" }, b: name } }], ...more });
export const settle = (state: string) => act({ step: "transition", on: "job", grant: "check", guards: [{ state: ["requested"] }], effects: [{ state }] });
export const jobs: DeclaredDefinition = {
  format: "artroom-definition-1", name: "jobs", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "start",
  items: {
    board: {
      many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: { owner: { fixed: true, required: true, list: false, author: false } }, refs: {},
      values: { required: { ...slot, of: { type: "list", of: text, max: 8 } }, approvals: { ...slot, of: count }, spare: { ...slot, of: count } },
    },
    job: { many: true, max: 16, states: { requested: { final: false }, passed: { final: true }, failed: { final: true } }, initial: "requested", parties: {}, refs: {}, values: { name: { fixed: true, required: true, of: text } } },
  },
  acts: {
    start: act({ step: "open", on: "board", grant: "start", fields: { opener: { type: "member", required: true } }, effects: [{ party: { slot: "owner", from: { field: "opener" } } }] }),
    rule: act({
      step: "transition", on: "board", grant: "rule", fields: { required: { type: "list", of: text, max: 8, required: true }, approvals: { ...count, required: true } },
      effects: [{ value: { slot: "required", from: { field: "required" } } }, { value: { slot: "approvals", from: { field: "approvals" } } }],
    }),
    request: act({ step: "open", on: "job", grant: "request", fields: { name: { ...text, required: true } }, effects: [{ value: { slot: "name", from: { field: "name" } } }] }),
    pass: settle("passed"),
    fail: settle("failed"),
    merge: act({
      step: "transition", on: "board", grant: "merge",
      guards: [{ each: { list: { slot: "required" }, as: "k", guards: [{ none: named(["failed"], { element: "k" }) }, { some: named(["passed"], { element: "k" }) }] }, reason: "required-check-not-passed" }],
    }),
  },
  receives: {}, timed: {}, rules: {},
};
