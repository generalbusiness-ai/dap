/** Package bounds are requirements, never a member identity or authority. */
import { DEVICE_COMMAND, DEVICE_COMMAND_DEFINITIONS, type DeclaredDefinition, type DeviceCommandBounds, type Digest } from "@generalbusiness/dap-contract";
import { parseStrict } from "@generalbusiness/dap-bytes";
import type { ApplicationSemantics } from "@generalbusiness/dap-bytes/application";
import { readDeviceCommandBounds } from "@generalbusiness/dap-derive";

/** Both package versions have these fields. Only the new native cohort
 * consumes the result as part of its authenticated install proof. */
export function deviceApplicationRequirement(semantic: Pick<ApplicationSemantics, "capabilities" | "definitions">): { bounds: DeviceCommandBounds; definitions: readonly Digest[] } | null {
  if (semantic.capabilities.length !== 1 || semantic.capabilities[0]?.name !== DEVICE_COMMAND) return null;
  const bounds = readDeviceCommandBounds(semantic.capabilities[0].bounds);
  if (!bounds) return null;
  const definitions: Digest[] = [];
  for (const part of semantic.definitions) {
    const declared = parseStrict(part.bytes) as DeclaredDefinition;
    if (declared.capabilities.some(capability => `${capability.name}@${capability.version}` !== DEVICE_COMMAND)) return null;
    if (declared.capabilities.length) definitions.push(part.id);
  }
  return definitions.length >= 1 && definitions.length <= DEVICE_COMMAND_DEFINITIONS ? { bounds, definitions: definitions.sort() } : null;
}
