import { EVIDENCE_RULES_COHORT as ERC } from "./evidence-cohort.ts";
/** Explicit pure native binding for the explicit archive/device and certified-rules cohorts.
 * No archive name selects executable code, and no source or anchor is read. */
import type { PlatformDefinition } from "@generalbusiness/dap-contract";
import { CAPABILITY_CODE } from "@generalbusiness/dap-derive";
import { ARCHIVE_DEVICE_APPLICATION_COHORT, ARCHIVE_DEVICE_PUBLICATION_COHORT, ARCHIVE_CERTIFIED_RULES_COHORT, HARDENED_CERTIFIED_RULES_COHORT } from "./archive-binding-wire.ts";
import { platform } from "./native-catalog.ts";

const pins = new Set<string>([...Object.values(ARCHIVE_DEVICE_APPLICATION_COHORT), ...Object.values(ARCHIVE_DEVICE_PUBLICATION_COHORT), ...Object.values(ARCHIVE_CERTIFIED_RULES_COHORT), ...Object.values(HARDENED_CERTIFIED_RULES_COHORT), ...Object.values(ERC)]);
const identity = platform(ARCHIVE_DEVICE_APPLICATION_COHORT.directory);
if (!identity?.sourceName || !identity.receiverIdentity) throw Error("The archive cohort needs explicit native identity code");
for (const pin of pins) {
  const code = platform(pin);
  if (!code || code.sourceName !== identity.sourceName || code.receiverIdentity !== identity.receiverIdentity) throw Error("The archive cohort disagrees on native identity code");
}

export const ARCHIVE_REPLAY_CODE = Object.freeze({
  platform: (named: PlatformDefinition) => pins.has(named) ? platform(named) : null,
  capabilities: CAPABILITY_CODE, owners: CAPABILITY_CODE,
  sourceName: identity.sourceName, receiverIdentity: identity.receiverIdentity,
});
