/** Complete ranges and shared three-outcome strategies. */

import type { Range } from "@generalbusiness/dap-contract";
import type { GuardResult, Judging } from "./guards.ts";
import type { Item } from "./state.ts";
import { whereMatches, type ElementValues } from "./program/read-value.ts";
import type { RangePlan } from "./program/guard-plan.ts";

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

/** Shared complete-range strategy after the caller selects its admitted plan. */
export function coveredItems(j: Judging, plan: RangePlan, elements?: ElementValues): Item[] | null {
  const items: Item[] = [];
  return scanItems(j, plan, item => whereMatches(j, plan.where, item, elements),
    item => { items.push(item); return false; }) === "all" ? items : null;
}
