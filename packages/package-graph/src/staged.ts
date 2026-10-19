/** Recognize planned forms without silently dropping them during P1. Native
 * admission remains separate; this does not implement any later slice. */
import { record } from "./model.ts";
import type { PackageFinding, PackageGraphDefinition } from "./types.ts";
export function stagedFindings(definitions: readonly PackageGraphDefinition[]): PackageFinding[] {
  const findings: PackageFinding[] = [];
  const add = (definition: PackageGraphDefinition, row: string, slice: string) => findings.push({
    definition: definition.id, row, check: "staged-form", reason: "unsupported-form", severity: "refusal",
    message: `This declaration needs ${slice}; P1 does not interpret it.`,
  });
  for (const owner of definitions) {
    if (record(owner.definition)["level"] === "sequenced") add(owner, "level", "S3 and P1g");
    for (const family of ["acts", "receives", "timed"] as const) {
      for (const [name, written] of Object.entries(owner.definition[family])) {
        const row = record(written), path = `${family}.${name}`;
        if (family !== "timed") {
          if (Object.hasOwn(row, "states")) add(owner, `${path}.states`, "P4");
          if (Object.hasOwn(row, "reads")) add(owner, `${path}.reads`, "P1g");
        }
        if (family === "receives" && Object.hasOwn(row, "spacing")) add(owner, `${path}.spacing`, "P2");
        if (family === "timed" && Object.hasOwn(row, "sends")) add(owner, `${path}.sends`, "P3");
      }
    }
  }
  return findings;
}
