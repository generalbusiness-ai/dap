/** Actual positive runtime variants, shared with their unchanged validation wrappers. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DefinitionCorpusRow } from "./row.ts";
import { ticket } from "./fixture-data.ts";
import { board } from "./forms-handlers-data.ts";
/* eslint-disable @typescript-eslint/no-explicit-any */
export const forms_handlers_change0 = (d: any) => {
      d.receives.closes.copies = 1;
      d.acts.follow = structuredClone(d.acts.link);
      d.acts.follow.sends[0].relate.name = "follows";
      // A `tell` of the same name is another message, with its own handler, which takes no field.
      const { copies: _, ...closes } = structuredClone(d.receives.closes);
      d.receives = { told: { ...closes, class: "tell", fields: {}, effects: [] }, ...d.receives };
    };

export const forms_handlers_change1 = (d: any) => { d.receives.closes.from.under = "board"; };

export const forms_handlers_change2 = (d: any) => { d.receives.post.from.under = "ticket"; };
export const formshandlersRuntimeDefinitions: readonly DefinitionCorpusRow[] = [
  { name: "derive/forms-handlers/forms_handlers_change0", origins: ["packages/derive/test/forms-handlers.test.ts#variant occurrence 0"], declaration: () => { const data = structuredClone(ticket); forms_handlers_change0(data); return data; }, bounds: PROPOSED_BOUNDS },
  { name: "derive/forms-handlers/forms_handlers_change1", origins: ["packages/derive/test/forms-handlers.test.ts#variant occurrence 1"], declaration: () => { const data = structuredClone(ticket); forms_handlers_change1(data); return data; }, bounds: PROPOSED_BOUNDS },
  { name: "derive/forms-handlers/forms_handlers_change2", origins: ["packages/derive/test/forms-handlers.test.ts#variant occurrence 2"], declaration: () => { const data = structuredClone(board); forms_handlers_change2(data); return data; }, bounds: PROPOSED_BOUNDS },
];
