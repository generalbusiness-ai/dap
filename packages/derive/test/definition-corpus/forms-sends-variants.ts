/** Actual positive runtime variants, shared with their unchanged validation wrappers. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DefinitionCorpusRow } from "./row.ts";
import { desk } from "./fixture-data.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export const forms_sends_change0 = (d: any) => { d.acts["found"].sends = [{ index: { fields: {} } }]; };
export const formssendsRuntimeDefinitions: readonly DefinitionCorpusRow[] = [
  { name: "derive/forms-sends/forms_sends_change0", origins: ["packages/derive/test/forms-sends.test.ts#variant occurrence 0"], declaration: () => { const data = structuredClone(desk); forms_sends_change0(data); return data; }, bounds: PROPOSED_BOUNDS },
];
