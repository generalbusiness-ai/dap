/** Raw lane fixture declarations; importing this module creates no scope or validation result. */
import type { Bounds, DeclaredDefinition } from "@generalbusiness/dap-contract";
import { DIGESTS } from "../../src/digests.ts";
import { changeDemo3 } from "../../src/change3.ts";

const creation = { applied: [{ state: "created" }, { ref: { slot: "child", from: { sender: true } } }], refused: [{ state: "refused" }], conflict: [{ state: "conflict" }] } as const;
export const officeDefinition = {
  format: "artroom-definition-1",
  name: "office",
  profile: { name: "restricted", version: 1 },
  capabilities: [],
  genesis: "found",
  items: {
    repository: {
      many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {},
      values: { readme: { fixed: false, required: false, of: { type: "text", max: 4096, detached: true } } },
    },
    lane: {
      many: true, max: 16, initial: "asked", states: { asked: { final: false }, created: { final: false }, refused: { final: true }, conflict: { final: true } },
      parties: {}, refs: { child: { fixed: false, required: false, to: { type: "scope", kind: "lane" } } }, values: {},
    },
  },
  acts: {
    "found": {
      step: "open", on: "repository", grant: "office.found", also: {},
      fields: { readme: { type: "text", max: 4096, detached: true, required: false } },
      guards: [], effects: [{ value: { slot: "readme", from: { field: "readme" } } }], sends: [], attention: [],
    },
    "open-issue": {
      step: "open", on: "lane", grant: "office.open", also: {},
      fields: { title: { type: "text", max: 256, required: true }, conditions: { type: "list", of: { type: "text", max: 4096 }, max: 16, required: true } },
      guards: [], effects: [], attention: [],
      sends: [{ create: { kind: "lane", definition: DIGESTS.issue, fields: { opener: { signer: true }, title: { field: "title" }, conditions: { field: "conditions" } }, result: creation } }],
    },
    "open-change": {
      step: "open", on: "lane", grant: "office.open", also: {},
      fields: { title: { type: "text", max: 256, required: true }, destination: { type: "scope", kind: "destination", required: true }, rules: { type: "scope", kind: "rules", required: true } },
      guards: [], effects: [], attention: [],
      sends: [{
        create: {
          kind: "lane", definition: DIGESTS.change,
          fields: { opener: { signer: true }, title: { field: "title" }, destination: { field: "destination" }, rules: { field: "rules" }, draft: { const: false } },
          result: creation,
        },
      }],
    },
  },
  receives: {},
  timed: {},
  rules: {},
} as const satisfies DeclaredDefinition;

export function customRequiredChangeData() {
  const custom = structuredClone(changeDemo3);
  custom.acts["ask-rules"]!.fields["requiredNote"] = { type: "text", max: 32, required: true };
  return custom;
}

/** Existing positive single-bound matrix; one-less controls stay in the owning test. */
export const laneShapeBounds: Record<"issue" | "change", Partial<Bounds>> = {
  issue: { items: 12, acts: 50, timedRules: 1, receives: 7, values: 10, also: 4 },
  change: { items: 14, acts: 54, timedRules: 2, receives: 4, also: 4, presents: 1, guards: 24, nestedGuards: 73, guardDepth: 8, effects: 16 },
};
