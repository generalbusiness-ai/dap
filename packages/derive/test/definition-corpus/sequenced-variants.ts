/** Version 1 of the sequenced level: one positive row for each admitted form, and the admitted half of each refusal pair. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { sequencedForms, sequencedMisuses } from "./sequenced-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";

const origin = (name: string) => `packages/derive/test/forms-sequenced.test.ts#${name}`;

export const sequencedVariantDefinitions: readonly DefinitionCorpusRow[] = [
  ...Object.entries(sequencedForms).map(([name, declaration]) => ({ name: `derive/sequenced/${name}`, origins: [origin(name)], declaration, bounds: PROPOSED_BOUNDS })),
  ...Object.entries(sequencedMisuses).map(([name, pair]) => ({ name: `derive/sequenced/${name}/admitted`, origins: [origin(`${name}.admitted`)], declaration: pair.admitted, bounds: PROPOSED_BOUNDS })),
];
