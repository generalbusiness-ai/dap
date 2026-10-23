/** Actual gateWith mutations, shared with every original runtime callsite. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { PROFILES } from "../../src/index.ts";
import { gate } from "./marks-data.ts";
import { PLACE } from "./forms-marks-cases.ts";
import type { DefinitionCorpusRow } from "./row.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export function markRuntimeChange0(d: any) { d.acts.enter.grant = "gate.enter";
}

export function markRuntimeChange1(_d: any) {
}

export function markRuntimeChange2(d: any) { d.acts.enter.grant.grant = "gate.enter";
}

export function markRuntimeChange3(d: any) {
      d.acts.enter.grant = "gate.enter";
      d.capabilities.push({ name: "hold", version: 1 });
      d.items.ticket.parties = { seen: { fixed: false, required: false, list: true, max: 2, author: false } };
      d.items.pass = {
        many: true, max: 2, initial: "held", states: { held: { final: false }, ended: { final: true } },
        parties: { holder: { fixed: false, required: true, list: false, author: false } }, refs: { under: { fixed: true, required: true, to: { type: "item", of: "ticket" } } },
        values: { until: { fixed: false, required: true, of: { type: "time" } }, epoch: { fixed: false, required: true, of: { type: "int", min: 1, max: 9 } } },
      };
      d.acts.take = {
        step: "open", on: "pass", grant: "gate.take", also: {}, fields: { ticket: { type: "item", of: "ticket", required: true } }, guards: [], sends: [], attention: [],
        effects: [{ ref: { slot: "under", from: { field: "ticket" } } }, { value: { slot: "until", from: { time: { plusSeconds: 600 } } } }, { hold: { do: "open" } }],
      };
      d.timed["pass-end"] = { on: "pass", states: ["held"], deadline: "until", effects: [{ hold: { do: "end" } }], attention: [] };

}

export function markRuntimeChange4(d: any) { d.acts.enter.grant = "gate.enter"; d.acts.enter.effects.push({ code: "then", row: "P14" });
}

export function markRuntimeChange5(d: any) { d.acts.issue.fields.hash.value = PLACE; d.acts.issue.effects.push({ code: "seen", row: "P21" });
}

export function markRuntimeChange6(d: any, first = false, second = false) {
      d.acts.enter.grant = "gate.enter";
      d.acts.enter.sends = [
        { create: { kind: "inbox", definition: "platform:inbox@1", fields: {}, result: { applied: [{ code: "noted-w", row: "P16" }] } } },
        { code: "refer", row: "P21", result: { applied: [{ code: "noted-a", row: "P16" }] }, ...(first ? { always: true } : {}) },
        { code: "again", row: "P21", result: { applied: [{ code: "noted-b", row: "P16" }] }, ...(second ? { always: true } : {}) },
      ];

}

export function markRuntimeChange7(d: any) { d.acts.enter.grant = "gate.enter";
}

export function markRuntimeChange8(d: any) { d.acts.enter.grant = "gate.enter"; d.acts.enter.sends[0].result.applied = [{ code: "noted", row: "P16" }];
}

export function markRuntimeChange9(d: any) { d.acts.enter.grant = "gate.enter"; const send = { code: "create-child", row: "P16", result: { applied: [{ code: "noted", row: "P16" }] } }; d.outcomes.probe.send = send; d.outcomes.later = { code: "later", row: "P16", send };
}

export function markRuntimeChange10(d: any) { d.acts.enter.grant = "gate.enter"; d.outcomes.probe.send = { code: "tell-other", row: "P16", result: { applied: [{ code: "noted", row: "P16" }] } };
}
const changes: readonly ((data: any, first?: boolean, second?: boolean) => void)[] = [
markRuntimeChange0, markRuntimeChange1, markRuntimeChange2, markRuntimeChange3, markRuntimeChange4, markRuntimeChange5, markRuntimeChange6, markRuntimeChange7, markRuntimeChange8, markRuntimeChange9, markRuntimeChange10];
function declaration(index: number, first = false, second = false) {
  const data = structuredClone(gate);
  changes[index]!(data, first, second);
  return data;
}
export const markRuntimeDefinitions: readonly DefinitionCorpusRow[] = [
  ...changes.flatMap((_, index) => index === 6 ? [] : [{ name: `derive/marks/runtime-${index}`,
    origins: [`packages/derive/test/forms-marks.test.ts#gateWith occurrence ${index}`], declaration: () => declaration(index),
    bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } }]),
  ...([[true, true], [true, false], [false, true]] as const).map(([first, second]) => ({ name: `derive/marks/listed(${first},${second})`,
    origins: [`packages/derive/test/forms-marks.test.ts#listed(${first},${second})`], declaration: () => declaration(6, first, second),
    bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } })),
];
