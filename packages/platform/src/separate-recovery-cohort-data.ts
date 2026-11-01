/**
 * Register 24, Directory 23 and Membership 10: Register 18, Directory 17 and
 * Membership 8 of the publication cohort, with one key in one place. `join`
 * and `enrol` already refuse a recovery key. These two acts were the others
 * that enrol or name a founder key, and each refuses by the same name.
 *
 * - `found` refuses a `recoveryKey` that is its signing key. The check is a
 *   mark, because no written guard reads the signing key as a value (P14).
 * - `first-key` refuses a founding key that is the roster's recovery key. A
 *   signed `found` does not settle this: the recovery key can rotate to the
 *   founding key between `seat` and `first-key`, while no key item holds it.
 *
 * Only the first key of a member matters here. `seat` enrols no key, so a key
 * that holds a seat and the recovery key holds one authority. `rotate-recovery`
 * refuses an enrolled key as `key-in-use`.
 */
import type { PlatformData } from "@generalbusiness/dap-contract";
import type { Rules } from "@generalbusiness/dap-derive";
import { membership7, membershipRules7 } from "./application-install-grants.ts";
import { archiveDeviceDirectory, archiveRegister } from "./archive-binding.ts";
import { deviceApplicationDirectoryRules } from "./device-application-directory.ts";
import { registerRules } from "./register.ts";
import { SEPARATE_RECOVERY_COHORT as S } from "./separate-recovery-cohort.ts";

const found = archiveRegister.acts["found"]!;
export const separateRecoveryRegister: PlatformData = { ...archiveRegister, acts: { ...archiveRegister.acts,
  found: { ...found, guards: [...found.guards, { code: "founder-not-recovery", row: "SR1" }] },
} };
export const separateRecoveryRegisterRules: Rules = { ...registerRules,
  "founder-not-recovery": { place: "guard", refusals: ["recovery-key"], run: ({ input, resolved }) => {
    if (input.type !== "act") throw Error("founder-not-recovery stands in the act found");
    return resolved.fields["recoveryKey"] === input.signed.intent.actor ? { holds: false, name: "recovery-key" } : { holds: true };
  } },
};

const establish = archiveDeviceDirectory.acts["establish"]!;
export const separateRecoveryDirectory: PlatformData = { ...archiveDeviceDirectory, acts: { ...archiveDeviceDirectory.acts,
  establish: { ...establish, sends: establish.sends.map(send => "create" in send && send.create.kind === "membership"
    ? { create: { ...send.create, definition: S.membership } } : send) },
} };
export const separateRecoveryDirectoryRules: Rules = deviceApplicationDirectoryRules;

const firstKey = membership7.acts["first-key"]!;
export const separateRecoveryMembership: PlatformData = { ...membership7, acts: { ...membership7.acts,
  "first-key": { ...firstKey, guards: [...firstKey.guards,
    { differs: { a: { slot: "foundingKey", of: "also.roster" }, b: { slot: "recoveryKey", of: "also.roster" } }, reason: "recovery-key" }] },
} };
export const separateRecoveryMembershipRules: Rules = membershipRules7;
