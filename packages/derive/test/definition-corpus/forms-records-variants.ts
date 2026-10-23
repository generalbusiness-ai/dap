/** Actual positive variant callbacks shared with their original owning tests. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DefinitionCorpusRow } from "./row.ts";
import { lane } from "./fixture-data.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export const forms_records_change0 = (def: any) => { def.capabilities.push({ name: "git-read", version: 1 }); def.acts.report.guards.push({ capability: { name: "git-read", guard: "ancestry", with: { row: { const: "report" } } } }); };
export const formsrecordsVariantDefinitions: readonly DefinitionCorpusRow[] = [
  { name: "derive/forms-records/forms_records_change0", origins: ["packages/derive/test/forms-records.test.ts#variant occurrence 0"], declaration: () => { const data = structuredClone(lane); forms_records_change0(data); return data; }, bounds: PROPOSED_BOUNDS },
];
