/** Reserved native create metadata. Domain fields do not select this protocol. */
import type { DeviceCommandGrant, Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { utf8 } from "@generalbusiness/dap-bytes";
import { isObject, isScopeRef } from "./values.ts";
import { readDeviceCommandGrant } from "./device-command-grant.ts";

export type CreationContext = { kind: "legacy" } | { kind: "invalid" }
  | { kind: "marked"; membership: ScopeRef; deviceCommand?: DeviceCommandGrant; delegate?: boolean; publication?: readonly string[] };

/** The shape of a v3 marker's `publication`: one to eight distinct texts in ascending order, each at most 256 UTF-8 bytes.
 * The Rules that admitted the package judged each prefix; this reads the shape only. */
function publicationOf(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) return null;
  for (let index = 0; index < value.length; index++) {
    const prefix: unknown = value[index];
    if (typeof prefix !== "string" || prefix === "" || utf8(prefix).length > 256 || index > 0 && !((value[index - 1] as string) < prefix)) return null;
  }
  return [...value] as string[];
}

/** Read only after source/message/seed proof, or from the scope's retained genesis. */
export function creationContextOf(body: unknown, definition: Digest): CreationContext {
  if (!isObject(body) || !Object.hasOwn(body, "creationContext")) return { kind: "legacy" };
  const marker = body["creationContext"], membership = body["membership"];
  if (!isObject(marker) || !isScopeRef(membership)) return { kind: "invalid" };
  if (Object.keys(marker).length === 1 && Object.hasOwn(marker, "v") && marker["v"] === 1) return { kind: "marked", membership };
  // Ruling bccd8dd1, Q2: v3 carries the declared publication prefixes, alone or with the device grant. A device grant alone stays v2.
  if (marker["v"] === 3) {
    const publication = publicationOf(marker["publication"]);
    if (!publication) return { kind: "invalid" };
    if (Object.keys(marker).length === 2) return { kind: "marked", membership, publication };
    if (Object.keys(marker).length !== 4 || typeof marker["delegate"] !== "boolean" || !Object.hasOwn(marker, "deviceCommand")) return { kind: "invalid" };
    const deviceCommand = readDeviceCommandGrant(marker["deviceCommand"], membership);
    if (!deviceCommand || (marker["delegate"] ? deviceCommand.root !== definition : !deviceCommand.definitions.includes(definition))) return { kind: "invalid" };
    return { kind: "marked", membership, deviceCommand, delegate: marker["delegate"], publication };
  }
  if (Object.keys(marker).length !== 3 || marker["v"] !== 2 || typeof marker["delegate"] !== "boolean" || !Object.hasOwn(marker, "deviceCommand")) return { kind: "invalid" };
  const deviceCommand = readDeviceCommandGrant(marker["deviceCommand"], membership);
  if (deviceCommand && (marker["delegate"] ? deviceCommand.root !== definition : !deviceCommand.definitions.includes(definition))) return { kind: "invalid" };
  return deviceCommand ? { kind: "marked", membership, deviceCommand, delegate: marker["delegate"] } : { kind: "invalid" };
}
