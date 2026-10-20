/** Internal case fixture entry. Domain modules keep their own data and use
 * the existing core directly; public testing exports remain unchanged. */
export * from "./fixtures.ts";
export { paul as creationPaul, rita as creationRita, sam as creationSam, una as creationUna, vic as creationVic, Directory, directoryDefinition, installing, Register, registerDefinition, registerPlatform, registerSeed, scripted } from "./support-creation.ts";
export { Branch, CREATED, destinationDefinition, rita as destinationRita, una as destinationUna, fetched, handMade, HEAD, keyObserved, listed, MEMBERSHIP, NEXT, OTHER, reading, RECEIPT, reportMade, retained, rulesObserved, said, TREE } from "./support-destination.ts";
export { scriptedApplicationOrigin, scriptedOrigin } from "./support-origin.ts";
export { scriptedPartitionOrigin } from "./support-partition-origin.ts";
export { publicationJourney } from "./support-publication-journey.ts";
export { BRANCH, lanePointingAt, memberOf, Rulebook, rulesScopeDefinition, rules as rulesScopeRules, standing } from "./support-rules.ts";
export { paul as membershipPaul, rita as membershipRita, sam as membershipSam, una as membershipUna, vic as membershipVic, Roster } from "./support.ts";
