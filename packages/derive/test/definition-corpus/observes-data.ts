/** Raw made-up observation declaration and exact row constants. */
import type { Observe, PlatformData } from "@generalbusiness/dap-contract";

const MEMBER = { type: "member" } as const;
const LANE_FACT = { type: "fact", kind: ["decide"], under: "lane" } as const;

/** The domain of the extents, and the bound on one value of it, as the row of `go` states them. Both are made up (witness 18.48). */
export const EXTENTS = "x-extents-1";
export const EXTENTS_MAX = 400_000;

/** The three rows of `weigh` in witness 18.46. */
export const WEIGH_ROWS: readonly Observe[] = [
  { of: "rules", window: 10, use: "once", without: "wait" },
  { of: "key", from: "rule", max: 3, window: 10, use: "once", without: "wait" },
  { of: "holders", action: "x.do", most: 2, window: 10, use: "once", without: "write" },
];

/** The three rows of `weigh` in witness 18.52: R1, R2 and R3. */
export const STEP_ROWS: readonly Observe[] = [
  { of: "rules", window: 10, use: "once", without: "wait" },
  { of: "key", from: "rule", max: 3, second: true, window: 10, use: "once", without: "wait" },
  { of: "key", from: "rule", max: 2, window: 10, use: "once", without: "write" },
];

export const weigher: PlatformData = {
  format: "artroom-definition-1",
  // The name of a platform definition is one of seven (the bytes package's `isPlatformDefinition`). This made-up data takes the name
  // of one that the platform package does not hold, as derive's fixture `gate` does in a test of an operation.
  name: "platform:task",
  profile: { name: "restricted", version: 1 },
  capabilities: [],
  genesis: "establish",
  items: {
    desk: {
      many: false, max: 1, initial: "open", states: { open: { final: false } },
      parties: { opener: { fixed: true, required: true, list: false, author: false } },
      refs: { peer: { fixed: false, required: false, to: { type: "scope", kind: "lane" } } },
      values: {
        note: { fixed: false, required: false, of: { type: "text", max: 64 } },
        // What the stand-in rule of `weigh` names beside the keys of the entries in `uses`: more keys, as texts.
        more: { fixed: false, required: false, of: { type: "list", of: { type: "text", max: 80 }, max: 8 } },
      },
    },
  },
  acts: {
    establish: {
      step: "open", on: "desk", grant: "weigher.establish", also: {}, fields: { opener: { ...MEMBER, required: true } },
      guards: [], effects: [{ party: { slot: "opener", from: { field: "opener" } } }], sends: [], attention: [],
    },
    point: {
      step: "transition", on: "desk", grant: "weigher.point", also: {}, fields: { peer: { type: "scope", kind: "lane", required: true } },
      guards: [], effects: [{ ref: { slot: "peer", from: { field: "peer" } } }], sends: [], attention: [],
    },
    more: {
      step: "transition", on: "desk", grant: "weigher.point", also: {}, fields: { more: { type: "list", of: { type: "text", max: 80 }, max: 8, required: true } },
      guards: [], effects: [{ value: { slot: "more", from: { field: "more" } } }], sends: [], attention: [],
    },
    "set-checks": {
      step: "comment", on: null, grant: "weigher.set", also: {},
      fields: { checks: { type: "list", of: { type: "record", of: { name: { type: "text", max: 32, required: true }, checker: { ...MEMBER, required: true } } }, max: 8, required: true } },
      guards: [], effects: [], sends: [], attention: [],
      observes: [{ of: "member", from: { each: { field: "checks" }, as: "c", value: { element: "c.checker" } }, max: 4, window: 300, use: "reuse" }],
    },
    set: {
      step: "comment", on: null, grant: "weigher.set", also: {}, fields: { a: { ...MEMBER, required: true } },
      guards: [], effects: [], sends: [], attention: [],
      observes: [{ of: "member", from: { field: "a" }, max: 1, window: 300, use: "reuse" }],
    },
    // An act whose form states no row. Its guard mark reads an observation, which is a fault (witness 18.46, case 16).
    peek: {
      step: "transition", on: "desk", grant: "weigher.set", also: {}, fields: { a: { ...MEMBER, required: true } },
      guards: [{ code: "sees", row: "M2" }], effects: [], sends: [], attention: [],
    },
    start: {
      step: "transition", on: "desk", grant: "weigher.start", also: {}, fields: { first: { ...LANE_FACT, required: false }, second: { ...LANE_FACT, required: false } },
      guards: [], effects: [{ code: "opens", row: "M1" }], sends: [], attention: [],
    },
    go: {
      step: "transition", on: "desk", grant: "weigher.go", also: {}, fields: {},
      guards: [], effects: [],
      sends: [{
        tell: {
          to: { slot: "peer" }, message: "ask", fields: {},
          result: { applied: [{ value: { slot: "note", from: { const: "done" } } }], refused: [], superseded: [] },
          observes: { applied: [{ of: "rules", window: 10, use: "once", without: "wait", retains: [{ domain: EXTENTS, max: EXTENTS_MAX }] }] },
        },
      }],
      attention: [],
    },
  },
  receives: {},
  timed: {},
  rules: {},
  outcomes: { weigh: { code: "weigh", row: "M1", origin: "rule", observes: WEIGH_ROWS } },
};
