/** Bounded presentation inputs. They become ordinary native scalar fields;
 * this module grants neither a subject selection nor signing authority. */
import type { FieldType, FieldValue } from "@generalbusiness/dap-contract";
import { isRecord } from "./records.ts";
import { parseStrict, utf8, wellFormed } from "./canonical.ts";
import { applicationJson } from "./application-json.ts";
interface Base { readonly label: string; readonly required: boolean }
export type ApplicationViewParameter = Base & (
  | { readonly kind: "int"; readonly unit: string; readonly min: number; readonly max: number }
  | { readonly kind: "decimal"; readonly unit: string; readonly scale: number; readonly min: number; readonly max: number }
  | { readonly kind: "text"; readonly max: number }
  | { readonly kind: "enum"; readonly of: readonly string[] }
);
export type ApplicationViewParameters = Readonly<Record<string, ApplicationViewParameter>>;
export class ApplicationViewParameterError extends Error {
  constructor(readonly field: string, readonly reason: "invalid" | "limit" = "invalid") { super(`Invalid declared input ${field}.`); }
}
const fail = (field: string, reason: "invalid" | "limit" = "invalid"): never => { throw new ApplicationViewParameterError(field, reason); };
/** Decimal input is shifted in base ten and never rounded. JSON's number
 * spelling is bounded; the native result must remain a safe integer. */
export function viewScaledInteger(value: unknown, scale: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0) || !Number.isInteger(scale) || scale < 0 || scale > 6) return null;
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(value));
  if (!match) return null;
  const fraction = match[3] ?? "", shift = scale + Number(match[4] ?? 0) - fraction.length;
  let integer = BigInt(match[2]! + fraction);
  if (shift >= 0) integer *= 10n ** BigInt(shift);
  else { const divisor = 10n ** BigInt(-shift); if (integer % divisor !== 0n) return null; integer /= divisor; }
  if (match[1]) integer = -integer;
  return integer >= -BigInt(Number.MAX_SAFE_INTEGER) && integer <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(integer) : null;
}
export function readViewParameters(value: unknown): ApplicationViewParameters {
  let owned: unknown;
  try { owned = parseStrict(applicationJson(value, 64 * 1024)); }
  catch { return fail("parameters"); }
  if (!isRecord(owned) || !Object.keys(owned).length) return fail("parameters");
  if (Object.keys(owned).length > 16) return fail("parameters", "limit");
  for (const [name, given] of Object.entries(owned)) {
    if (!name.length || !wellFormed(name) || utf8(name).length > 128 || !isRecord(given)) return fail(name);
    const kind = given["kind"], keys = kind === "int" ? "kind,label,max,min,required,unit" : kind === "decimal" ? "kind,label,max,min,required,scale,unit"
      : kind === "text" ? "kind,label,max,required" : kind === "enum" ? "kind,label,of,required" : "";
    if (!keys || Object.keys(given).sort().join() !== keys || typeof given["label"] !== "string" || !given["label"].length || utf8(given["label"]).length > 80 || typeof given["required"] !== "boolean") return fail(name);
    if (kind === "text") {
      if (typeof given["max"] !== "number" || !Number.isSafeInteger(given["max"]) || given["max"] < 1 || given["max"] > 64 * 1024) return fail(name);
    } else if (kind === "enum") {
      const words = given["of"];
      if (!Array.isArray(words) || !words.length || words.length > 64 || words.some(word => typeof word !== "string" || !word.length || !wellFormed(word) || utf8(word).length > 128) || new Set(words).size !== words.length) return fail(name);
    } else {
      if (typeof given["unit"] !== "string" || utf8(given["unit"]).length > 32 || given["unit"].trim() !== given["unit"]) return fail(name);
      const scale = kind === "int" ? 0 : given["scale"], low = given["min"], high = given["max"];
      // Package bytes keep native integer bounds; scale describes the
      // human input unit. Decimal numbers never enter native declarations.
      if (typeof scale !== "number" || !Number.isInteger(scale) || scale < 0 || scale > 6
        || typeof low !== "number" || !Number.isSafeInteger(low) || typeof high !== "number" || !Number.isSafeInteger(high) || low > high) return fail(name);
      // The tool's human-unit endpoints must round-trip to these exact
      // native bounds, rather than advertising a rounded maximum/minimum.
      if (viewScaledInteger(low / 10 ** scale, scale) !== low || viewScaledInteger(high / 10 ** scale, scale) !== high) return fail(name);
    }
  }
  return owned as ApplicationViewParameters;
}
export function viewParameterFits(parameter: ApplicationViewParameter, field: FieldType): boolean {
  if (parameter.kind === "text") return field.type === "text" && !field.detached && parameter.max <= field.max;
  if (parameter.kind === "enum") return field.type === "enum" && parameter.of.every(word => field.of.includes(word));
  return field.type === "int" && parameter.min >= field.min && parameter.max <= field.max;
}
export function decodeViewParameters(parameters: ApplicationViewParameters, value: unknown): Record<string, FieldValue> {
  // Model input is transient JSON and may contain decimal numbers. Own
  // its flat scalar properties without getters; only converted integers
  // subsequently enter the native envelope/canonical byte language.
  if (!isRecord(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail("parameters");
  const descriptors = Object.getOwnPropertyDescriptors(value), keys = Reflect.ownKeys(descriptors);
  if (!keys.length || keys.length > 16 || keys.some(key => typeof key !== "string")) return fail("parameters");
  const entries: [string, unknown][] = []; let bytes = 2;
  for (const key of keys as string[]) {
    const property = descriptors[key]!;
    if (!("value" in property) || !property.enumerable || typeof property.value !== "string" && typeof property.value !== "number") return fail(key);
    bytes += utf8(key).length + (typeof property.value === "string" ? utf8(property.value).length : 32) + 6;
    if (bytes > 64 * 1024) return fail("parameters", "limit");
    entries.push([key, property.value]);
  }
  const given = Object.fromEntries(entries);
  for (const key of Object.keys(given)) if (!Object.hasOwn(parameters, key)) return fail(key);
  const output: [string, FieldValue][] = [];
  for (const [name, parameter] of Object.entries(parameters)) {
    if (!Object.hasOwn(given, name)) { if (parameter.required) return fail(name); continue; }
    const value = given[name];
    if (parameter.kind === "text") {
      if (typeof value !== "string" || !wellFormed(value) || utf8(value).length > parameter.max) return fail(name);
      output.push([name, value]);
    } else if (parameter.kind === "enum") {
      if (typeof value !== "string" || !parameter.of.includes(value)) return fail(name);
      output.push([name, value]);
    } else {
      const scale = parameter.kind === "int" ? 0 : parameter.scale, integer = viewScaledInteger(value, scale);
      if (integer === null || integer < parameter.min || integer > parameter.max) return fail(name);
      output.push([name, integer]);
    }
  }
  return Object.fromEntries(output);
}
