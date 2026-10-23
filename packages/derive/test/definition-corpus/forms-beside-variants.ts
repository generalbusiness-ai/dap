/** Actual positive variant callbacks shared with their original owning tests. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DefinitionCorpusRow } from "./row.ts";
import { small } from "./fixture-data.ts";
export const act = (a: object) => ({ on: "note", also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [], ...a });
/* eslint-disable @typescript-eslint/no-explicit-any */
export const forms_beside_change0 = (def: any) => {
    def.acts.vouch = act({
      step: "transition", grant: "edit", presents: { proof: { kind: ["assign"], under: "lane", required: false } },
      guards: [
        { state: ["draft"] }, { fact: { presented: "proof" }, ifPresent: true },
        { equals: { a: { presented: "proof", part: { field: "performer" } }, b: { signer: true } }, ifPresent: true, reason: "not-yours" },
      ],
      effects: [{ party: { slot: "readers", from: { presented: "proof", part: { field: "performer" } }, list: "add" } }],
    });
  };
export const formsbesideVariantDefinitions: readonly DefinitionCorpusRow[] = [
  { name: "derive/forms-beside/forms_beside_change0", origins: ["packages/derive/test/forms-beside.test.ts#variant occurrence 0"], declaration: () => { const data = structuredClone(small); forms_beside_change0(data); return data; }, bounds: PROPOSED_BOUNDS },
];
