/** Made-up platform data and code for request Amount witnesses. */
import { PROPOSED_BOUNDS, type PlatformData } from "@generalbusiness/dap-contract";
import { validateDefinition, type PlatformRules } from "../src/index.ts";
import { valid } from "./fixtures.ts";
import { platformRequestData, futurePlatformRequestData, settlingPlatformMarksData } from "./definition-corpus/platform-requests-data.ts";

export function platformRequests(whole = true, withKind = false) {
  return valid(validateDefinition(platformRequestData(whole, withKind), PROPOSED_BOUNDS, undefined, { platform: true }));
}
export function futurePlatformRequests(withKind = false) {
  const base = platformRequests(true, withKind).declared as PlatformData;
  return valid(validateDefinition(futurePlatformRequestData(withKind, base), PROPOSED_BOUNDS, undefined, { platform: true }));
}
export function settlingPlatformMarks(marker = false) {
  const base = futurePlatformRequests(true).declared as PlatformData;
  return valid(validateDefinition(settlingPlatformMarksData(marker, base), PROPOSED_BOUNDS, undefined, { platform: true }));
}

export const platformRequestRules: PlatformRules = { named: "platform:task@1", rules: {
  "open-row": { place: "effect", most: 1, run: given => [{ effect: "open", item: given.resolved.self, type: "row", state: "pending" }] },
  "open-tail": { place: "effect", most: 1, run: given => [{ effect: "open", item: given.resolved.self, type: "tail", state: "pending" }] },
  "two-changes": { place: "effect", most: 2, run: () => [] },
  noop: { place: "outcome", rules: { selects: false, read: false, retries: () => false } },
} };
