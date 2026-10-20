/** Reserved native create metadata. Domain fields do not select this protocol. */
import type { DeviceCommandGrant, Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { isObject, isScopeRef } from "./values.ts";
import { readDeviceCommandGrant } from "./device-command-grant.ts";

export type CreationContext = { kind: "legacy" } | { kind: "invalid" }
  | { kind: "marked"; membership: ScopeRef; deviceCommand?: DeviceCommandGrant; delegate?: boolean };

/** Read only after source/message/seed proof, or from the scope's retained genesis. */
export function creationContextOf(body: unknown, definition: Digest): CreationContext {
  if (!isObject(body) || !Object.hasOwn(body, "creationContext")) return { kind: "legacy" };
  const marker = body["creationContext"], membership = body["membership"];
  if (!isObject(marker) || !isScopeRef(membership) || membership.kind !== "membership") return { kind: "invalid" };
  if (Object.keys(marker).length === 1 && Object.hasOwn(marker, "v") && marker["v"] === 1) return { kind: "marked", membership };
  if (Object.keys(marker).length !== 3 || marker["v"] !== 2 || typeof marker["delegate"] !== "boolean" || !Object.hasOwn(marker, "deviceCommand")) return { kind: "invalid" };
  const deviceCommand = readDeviceCommandGrant(marker["deviceCommand"], membership);
  if (deviceCommand && (marker["delegate"] ? deviceCommand.root !== definition : !deviceCommand.definitions.includes(definition))) return { kind: "invalid" };
  return deviceCommand ? { kind: "marked", membership, deviceCommand, delegate: marker["delegate"] } : { kind: "invalid" };
}
