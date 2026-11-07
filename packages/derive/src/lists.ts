/** Ranges, shared three-outcome strategies, and opaque capability argument bindings. */

import type { FieldType, Operand, Range } from "@generalbusiness/dap-contract";
import type { GuardResult, Judging } from "./guards.ts";
import { operand } from "./operand.ts";
import type { Item } from "./state.ts";
import { own } from "./values.ts";
import { whereMatches, type ElementValues } from "./program/read-value.ts";
import type { RangePlan } from "./program/guard-plan.ts";
import { rangePlan, type FormContext, type RangeUse } from "./program/structure.ts";

// ---------------------------------------------------------------- three results

/**
 * A list of guards: false when one is false on a completed evaluation;
 * otherwise not completed when one is not; otherwise true. So every guard
 * is evaluated until one is false: a guard that is not completed does not
 * end the list, because a later one may still be false.
 */
export function all(results: Iterable<() => GuardResult>): GuardResult {
  let open: GuardResult | null = null;
  for (const result of results) {
    const r = result();
    if (r === "fail") return "fail";
    if (r !== "pass") open ??= r;
  }
  return open ?? "pass";
}

/** Alternatives, or the elements of a `has`: true when one is true; otherwise not completed when one is not; otherwise false. */
export function any(results: Iterable<() => GuardResult>): GuardResult {
  let open: GuardResult | null = null;
  for (const result of results) {
    const r = result();
    if (r === "pass") return "pass";
    if (r !== "fail") open ??= r;
  }
  return open ?? "fail";
}

// ---------------------------------------------------------------- ranges

/** The items of the `except` subjects, once each. An unbound subject leaves nothing out. */
export function excepted(j: Judging, r: Pick<Range, "except">): Item[] {
  const left = new Map<number, Item>();
  for (const s of r.except ?? []) {
    const item = j.subjects.get(s);
    if (item) left.set(item.id, item);
  }
  return [...left.values()];
}

/**
 * Reads the items a range covers, in ascending order of item ID, a page at
 * a time, up to the work limit. `each` returns true when its result is
 * completed and no further item could change it. `all`: every covered item
 * was read, which is complete evidence. `stopped`: `each` said so.
 * `unfinished`: the scan stopped at the work limit, and completes nothing.
 */
export function scanItems(j: Judging, r: Pick<Range, "type" | "states" | "except">, matches: (item: Item) => boolean, each: (item: Item) => boolean): "all" | "stopped" | "unfinished" {
  const states = [...new Set(r.states)];
  const left = new Set(excepted(j, r).map((i) => i.id));
  let read = 0;
  let after: number | null = null;
  for (;;) {
    const limit = Math.min(j.bounds.guardPage, j.bounds.guardScan - read);
    if (limit <= 0) return "unfinished";
    const page = j.view.page(r.type, states, after, limit);
    for (const item of page.items) {
      read++;
      after = item.id;
      if (left.has(item.id) || !matches(item)) continue;
      if (each(item)) return "stopped";
    }
    if (!page.more) return "all";
    if (page.items.length === 0) return "unfinished";
  }
}

/** Every item a range covers, from complete evidence. Null: the scan did not finish, so the set is not known. */
export function covered(j: Judging, r: Range, context: FormContext, use: RangeUse, elements?: ElementValues): Item[] | null {
  const plan = rangePlan(j.definition, context.body, context.owner, r, use);
  if (!plan) throw new TypeError("range has no admitted caller context");
  return coveredItems(j, plan, elements);
}
/** Shared complete-range strategy after the caller selects its admitted plan. */
export function coveredItems(j: Judging, plan: RangePlan, elements?: ElementValues): Item[] | null {
  const items: Item[] = [];
  return scanItems(j, plan, item => whereMatches(j, plan.where, item, elements),
    item => { items.push(item); return false; }) === "all" ? items : null;
}

// ---------------------------------------------------------------- elements

/** The type of the element a list form binds under that name, or of a member of it, when the definition states it. */
export function typeOfElement(j: Judging, name: string): FieldType | null {
  const [as, ...members] = name.split(".");
  let type: FieldType | null = j.elementTypes?.get(as!) ?? null;
  for (const m of members) type = type?.type === "record" ? (own(type.of, m) ?? null) : null;
  return type;
}

/** The type of the elements of the list an operand reads, when the definition states it, as the validator derived it. */
function elementType(j: Judging, list: Operand, item: Item | null): FieldType | null {
  let type: FieldType | null | undefined = null;
  if ("part" in list && list.part !== undefined) return null;
  if ("field" in list) type = own(j.fieldTypes, list.field);
  else if ("element" in list) type = typeOfElement(j, list.element);
  else if ("slot" in list) {
    const of = list.of === undefined ? item : list.of === "each" ? j.each : j.subjects.get(list.of);
    const declared = of ? own(j.definition.declared.items, of.type) : undefined;
    type = own(declared?.refs, list.slot)?.to ?? own(declared?.values, list.slot)?.of;
  }
  return type?.type === "list" ? type.of : null;
}

/**
 * One judging for each element of the list an operand reads, with the
 * element bound to `as`. An absent field, an empty slot and an unbound
 * subject are the empty list. Null: the value is not a list, which only a
 * value the definition gives no type can be.
 */
export function bindEach(j: Judging, list: Operand, as: string, item: Item | null): Judging[] | null {
  const value = operand(j, list, item);
  if (value !== null && !Array.isArray(value)) return null;
  const type = elementType(j, list, item);
  return ((value ?? []) as readonly unknown[]).map((element) => ({ ...j, elements: new Map(j.elements).set(as, element), elementTypes: new Map(j.elementTypes).set(as, type) }));
}
