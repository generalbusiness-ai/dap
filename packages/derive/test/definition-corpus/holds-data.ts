/** Raw made-up hold declarations; no validation or history construction. */
import type { PlatformData } from "@generalbusiness/dap-contract";

const OPENER = { opener: { fixed: true, required: true, list: false, author: false } } as const;
const NO = { parties: {}, refs: {}, values: {} } as const;
const ACT = { also: {}, fields: {}, guards: [], sends: [], attention: [] } as const;

const base = (name: string): Omit<PlatformData, "outcomes"> => ({
  format: "artroom-definition-1", name, profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "establish",
  items: {
    works: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: OPENER, refs: {}, values: {} },
    job: { ...NO, many: true, max: 100, initial: "open", states: { open: { final: false }, done: { final: true } } },
  },
  acts: {
    establish: { ...ACT, step: "open", on: "works", grant: "works.establish", fields: { opener: { type: "member", required: true } }, effects: [{ party: { slot: "opener", from: { field: "opener" } } }] },
    finish: { ...ACT, step: "transition", on: "job", grant: "works.finish", guards: [{ state: ["open"] }], effects: [{ state: "done" }] },
  },
  receives: {
    // A request that opens a job: the taking entry. Its rule `begin` opens what the test says.
    start: { message: "start", class: "tell", from: { kind: "lane" }, fields: {}, opens: "job", also: {}, guards: [], effects: [{ code: "begin", row: "P16" }], sends: [], attention: [] },
  },
  timed: {}, rules: {},
});

/** The M of witness 18.47. */
export const works: PlatformData = (() => {
  const data = base("platform:works");
  return {
    ...data,
    items: { ...data.items, job: { ...data.items["job"]!, holds: { operations: { step: 2, tidy: 1 }, requests: 1 } } },
    acts: { ...data.acts, again: { ...ACT, step: "transition", on: "job", grant: "works.again", effects: [], adds: { operations: { step: 1 } } } },
    outcomes: {
      step: { code: "step", row: "P16", attempts: 1, most: { effects: 0, operations: ["step", "tidy"] }, send: { code: "report", row: "P16", result: {} } },
      tidy: { code: "tidy", row: "P16", attempts: 1 },
    },
  };
})();

/** The M of witness 18.49. */
export const chain: PlatformData = (() => {
  const data = base("platform:chain");
  return {
    ...data,
    items: { ...data.items, job: { ...data.items["job"]!, holds: { operations: { k: 1 } } } },
    outcomes: {
      k: { code: "k", row: "P16", attempts: 1, most: { effects: 0, operations: ["u"] } },
      u: { code: "u", row: "P16", attempts: 3 },
    },
  };
})();
