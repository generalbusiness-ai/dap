/** Node-safe fixture entry. Worker lifetimes and Vitest runtime stay private
 * to the separate native entry; private packet builders share only core. */
export { fixedSigner, applicationTrust, applicationContentBindings, applicationWorkerBindings } from "./fixtures-core.ts";
export { applicationCounterPacket2, applicationCounterNavigationPacket2, applicationCounterJournalPacket2 } from "./support/application-v2-fixture.ts";
export { applicationCounterFactTimePacket2 } from "./support/application-fact-time-fixture.ts";
export { applicationOwnedScopesPacket } from "./support/application-owned-scopes-fixture.ts";
export { deviceApplicationPacket } from "./support/device-application-fixture.ts";
