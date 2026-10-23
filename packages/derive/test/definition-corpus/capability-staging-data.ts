/** Raw forms-capability declaration; its test retains the validated wrapper. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { small } from "./fixture-data.ts";
export const [C1, C2] = ["a".repeat(40), "b".repeat(40)];
export const act = (a: object) => ({ step: "transition", on: "note", grant: "edit", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...a });
/* eslint-disable @typescript-eslint/no-explicit-any */
export function capabilityStagingData(): DeclaredDefinition {
  const def = structuredClone(small) as any;
  def.capabilities = [{ name: "hold", version: 1 }, { name: "git-read", version: 1 }];
  def.acts.stage = act({
    fields: { commit: { type: "commit", required: true }, earlier: { type: "list", of: { type: "commit" }, max: 4, required: false } },
    guards: [
      { state: ["draft"] },
      { capability: { name: "hold", guard: "staged", with: { commit: { field: "commit" }, under: { item: "on" } } } },
      { capability: { name: "git-read", guard: "ancestry", with: {
        commit: { field: "commit" }, row: { const: "report" },
        selected: { each: { field: "earlier" }, as: "c", value: { element: "c" } }, earlier: { items: { type: "note", states: ["draft"] }, slot: "text" },
      } } },
    ],
    effects: [{ capability: { name: "hold", do: "pin-hold", with: { commit: { field: "commit" } } } }, { value: { slot: "text", from: { const: "staged" } } }],
  });
  def.acts.check = act({
    fields: { pin: { type: "fact", kind: ["stage"], under: "small", required: true } },
    guards: [{ equals: { a: { field: "pin", part: { carried: "pin.commit" } }, b: { const: C1 } }, reason: "pin-mismatch" }],
  });
  def.acts.ask = act({ guards: [{ capability: { name: "hold", guard: "staged", with: {} } }] });
  return def;
}

/** Positive validator-table variation in forms-capability.test.ts. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const capabilityStepFactChange = (def: any) => {
  def.acts.check.fields.other = { type: "fact", kind: ["hold@1:check"], under: "lane", required: false };
};
