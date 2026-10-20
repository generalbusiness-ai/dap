/** Internal case fixture entry. Domain modules keep their own data and use
 * the existing core directly; public testing exports remain unchanged. */
export * from "./fixtures.ts";
export { boundRecordData, boundRecordDefinition } from "./fixtures-bound-records.ts";
export { childDefinitions } from "./fixtures-child-definitions.ts";
export { board, boardDefinition, works as formsWorks, worksDefinition as formsWorksDefinition } from "./fixtures-f.ts";
export { genesisBodyDefinition } from "./fixtures-genesis-bodies.ts";
export { C, cap, clean, kept, staging, Staging } from "./fixtures-hold.ts";
export { chain, chainDefinition, changed, OWNER as HOLDS_OWNER, works as holdsWorks, Works as HoldsWorks, worksDefinition as holdsWorksDefinition, opened, TELL } from "./fixtures-holds.ts";
export { lateDefinition, lateFixture } from "./fixtures-late.ts";
export { gate, gateRules, gateWith } from "./fixtures-marks.ts";
export { EXTENTS, EXTENTS_MAX, holdersSeen, keySeen, memberSeen, rulebook, RULEBOOK, rulesSeen, type Seen, signers, stating, STEP_ROWS, weighed, weigher, weigherRules, weigherWith } from "./fixtures-observes.ts";
export { futurePlatformRequests, platformRequestRules, platformRequests, settlingPlatformMarks } from "./fixtures-platform-requests.ts";
export { PIN_BOUNDS, receiverPinData, receiverPinDefinition } from "./fixtures-receiver-pins.ts";
export { sourceOrderDefinition, sourceOrderFixture } from "./fixtures-source-order.ts";
export { standingData } from "./fixtures-standing.ts";
