/** Actual positive variant callbacks shared with their original owning tests. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DefinitionCorpusRow } from "./row.ts";
import { checkingData } from "./checking-data.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export const forms_prepare_change0 = (data: any) => { data.capacity = { name: "whole-scope", version: 1 }; };
export const formsprepareVariantDefinitions: readonly DefinitionCorpusRow[] = [
  { name: "derive/forms-prepare/forms_prepare_change0", origins: ["packages/derive/test/forms-prepare.test.ts#variant occurrence 0"], declaration: () => { const data = structuredClone(checkingData()); forms_prepare_change0(data); return data; }, bounds: PROPOSED_BOUNDS },
];
