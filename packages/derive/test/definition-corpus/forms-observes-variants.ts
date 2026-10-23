/** Actual positive runtime observation mutations, before any validation/history. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { PROFILES } from "../../src/index.ts";
import { weigher, EXTENTS, STEP_ROWS } from "./observes-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export function observationRuntimeChange0(d: any) { delete d.acts.go.sends[0].tell.observes;
}
export function observationRuntimeChange1(d: any) { d.acts.go.sends[0].tell.observes = { refused: [{ of: "rules", window: 10, use: "once", without: "wait", retains: [{ domain: EXTENTS, max: 7 }, { domain: "x-other-1", max: 5 }] }] };
}
export function observationRuntimeChange2(data: any) { data.acts["own"] = { ...data.acts["peek"]!, observes: data.acts["set"]!.observes };
}
export function observationRuntimeChange3(data: any) { data.acts["own"] = { ...data.acts["peek"]!, observes: data.acts["set"]!.observes }; data.acts["own"]!.observes![0]!.use = "once";
}
export function observationRuntimeChange4(data: any) { data.outcomes.weigh.observes = [
      { of: "key", from: "rule", max: 1, window: 300, use: "reuse", without: "write" },
      { of: "key", from: "rule", max: 1, second: true, window: 10, use: "once", without: "write" },
    ];
}
export function observationRuntimeChange5(d: any) { d.outcomes.weigh.observes[1].use = "reuse";
}
export function observationRuntimeChange6(d: any) { d.acts.go.sends[0].tell.observes.applied[0].without = "write";
}
export function observationRuntimeChange7(d: any) { delete d.acts.go.sends[0].tell.observes;
}
const changes = [observationRuntimeChange0, observationRuntimeChange1, observationRuntimeChange2, observationRuntimeChange3, observationRuntimeChange4, observationRuntimeChange5, observationRuntimeChange6, observationRuntimeChange7];
export const observationRuntimeDefinitions: readonly DefinitionCorpusRow[] = changes.map((change, index) => ({
  name: `derive/observes/runtime-${index}`, origins: [`packages/derive/test/forms-observes.test.ts#runtime change ${index}`],
  declaration: () => { const data = structuredClone(weigher); change(data); return data; },
  bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true },
}));

export const row = (over: object = {}) => ({ of: "member", from: { field: "a" }, max: 1, window: 300, use: "reuse", ...over });
export function openingObservationRows(data: any) { data.outcomes.weigh.origin = "opening"; data.outcomes.weigh.observes = STEP_ROWS; }
export function narrowRetainedLimit(data: any) { data.acts.go.sends[0].tell.observes.applied[0].retains[0].max = 8; }
export function withoutRetainedPlace(data: any) { delete data.acts.go.sends[0].tell.observes.applied[0].retains; }
export function adoptedObservationRows() { return [
      { of: "rules", window: 10, use: "once", without: "write" },
      { of: "key", from: "rule", max: 1, window: 10, use: "once", without: "write" },
      { of: "holders", action: "rules.publish", most: 1, window: 10, use: "once", without: "write" },
      { of: "member", from: "rule", max: 65, second: true, window: 10, use: "once", without: "write" },
      { of: "key", from: "rule", max: 8, second: true, window: 10, use: "once", without: "write" },
    ]; }
export const observationAdditionalDefinitions: readonly DefinitionCorpusRow[] = [
  { name: "derive/observes/usesPerEntry5", origins: ["packages/derive/test/forms-observes.test.ts#check6 usesPerEntry5"],
    declaration: () => structuredClone(weigher), bounds: { ...PROPOSED_BOUNDS, usesPerEntry: 5 }, profiles: PROFILES, options: { platform: true } },
  ...([
    ["opening STEP_ROWS", openingObservationRows], ["narrow retained limit", narrowRetainedLimit], ["without retained place", withoutRetainedPlace],
    ["act max120", (data: any) => { data.acts.set.observes = [row({ max: 120 })]; }],
    ["adopted observation rows", (data: any) => { data.outcomes.weigh.observes = adoptedObservationRows(); }],
  ] as const).map(([name, change]) => ({ name: `derive/observes/${String(name)}`, origins: [`packages/derive/test/forms-observes.test.ts#${String(name)}`],
    declaration: () => { const data = structuredClone(weigher); change(data); return data; },
    bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } })),
];
