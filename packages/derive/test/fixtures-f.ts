/**
 * Fixtures for the forms of fields and of the hold type (scope contract,
 * sections 6.2 and 6.8). `board` is made up for the tests of fields: a job
 * that a timed rule decides, and a plan whose rows are records. `works` is
 * the lane of the shared fixtures with the acts that end a commitment and a
 * hold.
 */

import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { validateDefinition } from "../src/index.ts";
import { valid } from "./fixtures.ts";

import { board, works } from "./definition-corpus/forms-data.ts";
export { board, works } from "./definition-corpus/forms-data.ts";

export const boardDefinition = valid(validateDefinition(board, PROPOSED_BOUNDS));
export const worksDefinition = valid(validateDefinition(works, PROPOSED_BOUNDS));
