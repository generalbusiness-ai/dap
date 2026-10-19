/** Plain text presentation of parsed, schema-bound declared facts. */
import type { FieldValue } from "@generalbusiness/dap-contract";
import { canonicalize, timeMs } from "@generalbusiness/artroom-bytes";
import type { ApplicationViewFact } from "@generalbusiness/artroom-bytes/application-v2";
import { formatInteger } from "./numbers.ts";
import { ViewError } from "./session.ts";
export function formatFact(fact: ApplicationViewFact, values: Record<string, FieldValue | null>, now = Date.now()): string {
  if (typeof fact === "string") {
    const value = values[fact];
    return `${fact}: ${value === null || value === undefined ? "—" : typeof value === "string" ? value : canonicalize(value)}`;
  }
  const value = values[fact.field];
  if (value === null || value === undefined) return `${fact.label}: —`;
  if ("format" in fact) {
    const time = timeMs(value);
    if (time === null || !Number.isFinite(now)) throw new ViewError("unavailable", "An age needs its native timestamp and an available host clock.");
    if (now < time) return `${fact.label}: clock before reading (${value})`;
    const minutes = Math.floor((now - time) / 60_000), hours = Math.floor(minutes / 60), days = Math.floor(hours / 24);
    const age = days ? `${days} day${days === 1 ? "" : "s"}` : hours ? `${hours} h` : `${minutes} min`;
    return `${fact.label}: ${age} ago (${value})`;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new ViewError("unavailable", "A formatted fact needs its declared integer value.");
  return `${fact.label}: ${formatInteger(value, fact.scale, fact.unit)}`;
}
