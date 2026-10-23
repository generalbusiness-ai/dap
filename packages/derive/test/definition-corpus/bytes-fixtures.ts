import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { journalProjectionDefinition } from "../../../bytes/test/definition-corpus-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";

/** The complete schema used by canonical signed-tail fixtures. Its original
 * caller binds a projection, not a native history; validation uses defaults.
 * The bytes package's generic empty-items/acts definition is a byte-shape
 * stub, not a positive definition (its genesis has no act), and is excluded. */
export const bytesFixtureDefinitions: readonly DefinitionCorpusRow[] = [{
  name: "bytes/journal-projection", origins: ["packages/bytes/test/application-journal-projection.test.ts#definition"],
  declaration: () => structuredClone(journalProjectionDefinition), bounds: PROPOSED_BOUNDS,
}];
