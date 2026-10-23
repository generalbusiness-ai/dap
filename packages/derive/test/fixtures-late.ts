import { sourceOrderFixture } from "./fixtures-source-order.ts";
import { lateDefinition } from "./definition-corpus/source-order-data.ts";
export { lateDefinition } from "./definition-corpus/source-order-data.ts";
export const lateFixture = (branch: boolean) => sourceOrderFixture(lateDefinition(branch));
