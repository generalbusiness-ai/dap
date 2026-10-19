/** Plain text presentation of parsed, schema-bound declared facts. */
import type { FieldValue } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/artroom-bytes";
import type { ApplicationViewFact } from "@generalbusiness/artroom-bytes/application-v2";
import { formatInteger } from "./numbers.ts";
import { ViewError } from "./session.ts";
export function formatFact(fact: ApplicationViewFact, values: Record<string, FieldValue | null>): string {
  if (typeof fact === "string") {
    const value = values[fact];
    return `${fact}: ${value === null || value === undefined ? "" : typeof value === "string" ? value : canonicalize(value)}`;
  }
  const value = values[fact.field];
  if (value === null || value === undefined) return `${fact.label}: —`;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new ViewError("unavailable", "A formatted fact needs its declared integer value.");
  return `${fact.label}: ${formatInteger(value, fact.scale, fact.unit)}`;
}
