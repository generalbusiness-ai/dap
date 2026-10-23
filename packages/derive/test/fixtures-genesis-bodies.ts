/** Made-up birth fields, without a registry or outside provider. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { validateDefinition, type ValidDefinition } from "../src/index.ts";
import { notesDefinition, valid } from "./fixtures.ts";
import { genesisBodyData } from "./definition-corpus/genesis-bodies-data.ts";

export function genesisBodyDefinition(whole = true, base: ValidDefinition = notesDefinition) {
  return valid(validateDefinition(genesisBodyData(whole, base.declared), PROPOSED_BOUNDS));
}
