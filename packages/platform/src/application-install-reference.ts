/** Rules opt in to reference fields by exact native pin. This gate follows
 * whole-definition validation and leaves declaration bytes unchanged. */
import type { DeclaredDefinition, FieldType, PlatformDefinition } from "@generalbusiness/dap-contract";
import { COMMONS_COHORT } from "./commons-cohort.ts";

export const REFERENCE_INSTALL_REFUSAL = "reference-requires-rules14" as const;
export class ReferenceInstallRefusal extends Error {
  constructor() { super(REFERENCE_INSTALL_REFUSAL); }
}
function reference(type: FieldType): boolean {
  switch (type.type) {
    case "reference": return true;
    case "list": return reference(type.of);
    case "record": return Object.values(type.of).some(reference);
    default: return false;
  }
}
function containsReference(definition: DeclaredDefinition): boolean {
  return Object.values(definition.items).some(item => Object.values(item.values).some(slot => reference(slot.of))
    || Object.values(item.refs).some(slot => reference(slot.to)))
    || Object.values(definition.acts).some(act => Object.values(act.fields).some(reference))
    || Object.values(definition.receives).some(receive => Object.values(receive.fields).some(reference));
}
export function requireReferenceInstall(definition: DeclaredDefinition, rules: PlatformDefinition): void {
  // Future native Rules versions must opt in explicitly after review. A
  // numeric suffix alone does not establish that version's install contract.
  if (rules !== COMMONS_COHORT.rules && containsReference(definition)) throw new ReferenceInstallRefusal();
}
