/** Small fictional native hold receiver, with no local workspace holds. */
import { validateDefinition } from "../src/index.ts";
import { valid } from "./fixtures.ts";
import { PIN_BOUNDS, receiverPinData } from "./definition-corpus/receiver-pins-data.ts";
export { PIN_BOUNDS, receiverPinData } from "./definition-corpus/receiver-pins-data.ts";

export const receiverPinDefinition = () => valid(validateDefinition(receiverPinData(), PIN_BOUNDS));
