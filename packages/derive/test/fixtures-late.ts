import { sourceOrderDefinition, sourceOrderFixture } from "./fixtures-source-order.ts";
export function lateDefinition(branch: boolean) {
  const definition = structuredClone(sourceOrderDefinition);
  definition.receives["sample"]!.late = { within: { seconds: 30 }, reason: "old-sample", ...(branch ? { then: { effects: [{ of: "also.board" as const, value: { slot: "last", from: { const: 99 } } }] } } : {}) };
  return definition;
}
export const lateFixture = (branch: boolean) => sourceOrderFixture(lateDefinition(branch));
