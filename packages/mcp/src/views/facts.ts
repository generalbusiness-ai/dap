/** Plain text presentation of parsed, schema-bound declared facts. */
import type { FieldValue } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/artroom-bytes";
import type { ApplicationViewFact } from "@generalbusiness/artroom-bytes/application-v2";
import { ViewError } from "./session.ts";
export function formatFact(fact: ApplicationViewFact, values: Record<string, FieldValue | null>): string {
  if (typeof fact === "string") {
    const value = values[fact];
    return `${fact}: ${value === null || value === undefined ? "" : typeof value === "string" ? value : canonicalize(value)}`;
  }
  const value = values[fact.field];
  if (value === null || value === undefined) return `${fact.label}: —`;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new ViewError("unavailable", "A formatted fact needs its declared integer value.");
  // Shift decimal digits directly, so a safe integer never loses digits
  // through floating-point division, including at MAX_SAFE_INTEGER.
  const digits = Math.abs(value).toString().padStart(fact.scale + 1, "0"), cut = digits.length - fact.scale;
  const fraction = fact.scale ? digits.slice(cut).replace(/0+$/, "") : "";
  const number = `${value < 0 ? "-" : ""}${digits.slice(0, cut)}${fraction ? `.${fraction}` : ""}`;
  return `${fact.label}: ${number}${fact.unit ? ` ${fact.unit}` : ""}`;
}
