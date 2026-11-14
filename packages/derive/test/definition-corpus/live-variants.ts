/** LV1's admitted live forms and the recorded half of every durable-form refusal pair. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { liveDurableForms, liveForms, liveOutcomeSend } from "./live-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";

const origin = (name: string) => `packages/derive/test/forms-live.test.ts#${name}`;
export const liveVariantDefinitions: readonly DefinitionCorpusRow[] = [
  ...Object.entries(liveForms).map(([name, declaration]) => ({ name: `derive/live/${name}`, origins: [origin(name)], declaration, bounds: PROPOSED_BOUNDS })),
  ...Object.entries(liveDurableForms).map(([name, declaration]) => ({ name: `derive/live/${name}/recorded`, origins: [origin(`${name}.recorded`)], declaration, bounds: PROPOSED_BOUNDS })),
  { name: "derive/live/outcomeSend/recorded", origins: [origin("outcomeSend.recorded")], declaration: liveOutcomeSend, bounds: PROPOSED_BOUNDS, options: { platform: true } },
];
