/** Refuse oversized raw declarations before graph joins or recursive typing.
 * This is a work budget, not whole native definition validation. */
import type { Bounds } from "@generalbusiness/dap-contract";
import type { PackageFinding, PackageGraphDefinition } from "./types.ts";
import { array, record } from "./model.ts";
export function graphBudget(definitions: readonly PackageGraphDefinition[], bounds: Bounds): PackageFinding[] {
  const findings: PackageFinding[] = [];
  for (const part of definitions) {
    const bad = (row: string, message: string) => findings.push({ definition: part.id, row, check: "graph-budget", reason: "bounds" as const, severity: "refusal" as const, message });
    const stack: { value: unknown; depth: number }[] = [{ value: part.definition, depth: 0 }];
    let nodes = 0;
    while (stack.length) {
      const { value, depth } = stack.pop()!;
      if (++nodes > bounds.definitionBytes || depth > 64) { bad("definition", "The graph input exceeds the definition node or depth allowance (64)."); break; }
      if (value !== null && typeof value === "object") for (const child of Object.values(value)) stack.push({ value: child, depth: depth + 1 });
    }
    for (const [family, most] of [["items", bounds.items], ["acts", bounds.acts], ["receives", bounds.receives], ["timed", bounds.timedRules]] as const) {
      const value = record(part.definition)[family];
      if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > most) bad(family, `The graph requires an object with at most ${most} ${family}.`);
    }
    if (findings.some(finding => finding.definition === part.id)) continue;
    for (const family of ["acts", "receives", "timed"] as const) for (const [name, value] of Object.entries(part.definition[family])) {
      const row = record(value), late = record(record(row["late"])["then"]), bodies = [row, ...(Object.hasOwn(record(row["late"]), "then") ? [late] : [])];
      for (const body of bodies) {
        if (array(body["effects"]).length > bounds.effects || array(body["sends"]).length > bounds.sends) bad(`${family}.${name}`, "The row exceeds the native effect or send-form bound.");
        for (const send of array(body["sends"])) for (const data of Object.values(record(send))) {
          const written = record(data);
          if (Object.keys(record(written["fields"] ?? written["detail"])).length > bounds.sendFields
            || Object.values(record(written["result"])).some(effects => array(effects).length > bounds.effects)) bad(`${family}.${name}`, "The send exceeds its field or result-effect bound.");
        }
      }
    }
  }
  return findings;
}
