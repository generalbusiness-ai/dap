/** Retained producers named by typed fields. Bounds are producer maxima,
 * not read limits. Logical text bytes include canonical JSON escaping. */
import type { Bounds, FieldType } from "@generalbusiness/dap-contract";
import { amountMath, NOTHING, retainedBytes } from "./held.ts";
import { isObject } from "./values.ts";

export interface FieldRetained { facts: number; texts: number; values: number }
export interface FieldProducers { fields: readonly FieldType[]; presented: number; source: boolean; observes?: unknown }

/** Legacy callers keep the earlier raw-text terms; opt-in callers use canonical payload maxima. */
export function fieldRetention(fields: readonly FieldType[], bounds: Pick<Bounds, "textBytes" | "listElements">, checked = false): FieldRetained {
  const math = amountMath(checked);
  const add = (...ns: number[]) => math.sum(...ns.map(bytes => ({ ...NOTHING, bytes }))).bytes;
  const multiply = (n: number, bytes: number) => math.times(n, { ...NOTHING, bytes }).bytes;
  const together = (parts: readonly FieldRetained[]): FieldRetained => ({ facts: add(...parts.map(p => p.facts)), texts: add(...parts.map(p => p.texts)), values: add(...parts.map(p => p.values)) });
  const none: FieldRetained = { facts: 0, texts: 0, values: 0 };
  const of = (type: FieldType): FieldRetained => {
    if (type.type === "fact") return { ...none, facts: 1 };
    if (type.type === "text") {
      if (!type.detached) return none;
      const raw = Math.min(multiply(1, type.max), multiply(1, bounds.textBytes));
      return { ...none, texts: checked ? add(multiply(6, raw), 2) : raw };
    }
    if (type.type === "list") {
      const part = of(type.of), n = Math.min(multiply(1, type.max), multiply(1, bounds.listElements));
      return { facts: multiply(n, part.facts), texts: multiply(n, part.texts), values: multiply(n, part.values) };
    }
    if (type.type === "record") return together(Object.values(type.of).map(of));
    // Act value places declare canonical bytes. A marked field does not
    // itself authorize a retained input; its owner's rows declare those.
    const field: unknown = type;
    const placed = isObject(field) && field["type"] === "digest" && isObject(field["value"]) ? field["value"] : null;
    return checked && placed ? { ...none, values: multiply(1, placed["max"] as number) } : none;
  };
  return together(fields.map(of));
}

/** Foreign uses are capped by the entry's actual producer limit. A handler
 * consumes one of those slots for its mandatory source entry. */
export function fieldRetainedBytes(producers: FieldProducers, bounds: Pick<Bounds, "textBytes" | "listElements" | "entryBytes" | "usesPerEntry">): number {
  const { sum, times } = amountMath(true);
  const fields = fieldRetention(producers.fields, bounds, true);
  const facts = sum({ ...NOTHING, entries: fields.facts }, { ...NOTHING, entries: producers.presented }, { ...NOTHING, entries: producers.source ? 1 : 0 }).entries;
  // Validate the cap before min can conceal an invalid configured operand.
  const cap = times(1, { ...NOTHING, entries: bounds.usesPerEntry }).entries;
  return sum(times(Math.min(facts, cap), { ...NOTHING, bytes: bounds.entryBytes }), { ...NOTHING, bytes: fields.texts }, { ...NOTHING, bytes: fields.values }, { ...NOTHING, bytes: retainedBytes(producers.observes) }).bytes;
}
