/** Fictional trusted platform data: one holder and a written bound stop. */
import { validateDefinition } from "../src/index.ts";
import { valid } from "./fixtures.ts";
import { PIN_BOUNDS } from "./definition-corpus/receiver-pins-data.ts";
import { boundRecordData } from "./definition-corpus/bound-records-data.ts";
export { boundRecordData } from "./definition-corpus/bound-records-data.ts";

export const boundRecordDefinition = (firstKey = false, whole = true) => valid(validateDefinition(boundRecordData(firstKey, whole), PIN_BOUNDS, undefined, { platform: true }));
