/** device-command@1's finite install grant. A package names bounds, never a member. */
import type { Digest, MemberRef } from "./scope.ts";

export const DEVICE_COMMAND = "device-command@1" as const;
export const DEVICE_COMMAND_KINDS = ["fan", "heater", "vent"] as const;
export const DEVICE_COMMAND_DEFINITIONS = 8;
export type DeviceCommandKind = typeof DEVICE_COMMAND_KINDS[number];
export type DeviceCommandOutcome = "confirmed" | "refused" | "unknown";

export interface DeviceCommandBounds {
  readonly kinds: readonly DeviceCommandKind[];
  readonly owners: 1;
}

/** Retained by native installation and creation proofs, outside domain fields. */
export interface DeviceCommandGrant {
  readonly capability: typeof DEVICE_COMMAND;
  readonly owner: MemberRef;
  readonly bounds: DeviceCommandBounds;
  readonly root: Digest;
  readonly definitions: readonly Digest[];
}
