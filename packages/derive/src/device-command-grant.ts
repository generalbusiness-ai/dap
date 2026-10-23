/** Pure reading of already authenticated native metadata, never an authority source. */
import { DEVICE_COMMAND, DEVICE_COMMAND_DEFINITIONS, DEVICE_COMMAND_KINDS, type DeviceCommandBounds, type DeviceCommandGrant, type DeviceCommandKind, type ScopeRef } from "@generalbusiness/dap-contract";
import { isDigest } from "@generalbusiness/dap-bytes";
import { isMemberRef, isObject, same } from "./values.ts";

const shape = (value: unknown, names: readonly string[]): value is Record<string, unknown> =>
  isObject(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const ordered = (values: readonly string[]): boolean => values.every((value, index) => index === 0 || values[index - 1]! < value);

export function readDeviceCommandBounds(value: unknown): DeviceCommandBounds | null {
  if (!shape(value, ["kinds", "owners"]) || value["owners"] !== 1) return null;
  const kinds = value["kinds"];
  return Array.isArray(kinds) && kinds.length >= 1 && kinds.length <= DEVICE_COMMAND_KINDS.length
    && kinds.every(kind => typeof kind === "string" && DEVICE_COMMAND_KINDS.includes(kind as DeviceCommandKind)) && ordered(kinds)
    ? { kinds: [...kinds], owners: 1 } : null;
}

/** Call only after the native source/message/seed proof, or on retained genesis. */
export function readDeviceCommandGrant(value: unknown, membership: ScopeRef): DeviceCommandGrant | null {
  if (!shape(value, ["capability", "owner", "bounds", "root", "definitions"]) || value["capability"] !== DEVICE_COMMAND
    || !isMemberRef(value["owner"]) || membership.kind !== "membership" || !same(value["owner"].membership, membership)
    || !isDigest(value["root"])) return null;
  const bounds = readDeviceCommandBounds(value["bounds"]), definitions = value["definitions"];
  if (!bounds || !Array.isArray(definitions) || definitions.length < 1 || definitions.length > DEVICE_COMMAND_DEFINITIONS
    || !definitions.every(isDigest) || !ordered(definitions)) return null;
  return { capability: DEVICE_COMMAND, owner: value["owner"], bounds, root: value["root"], definitions: [...definitions] };
}
