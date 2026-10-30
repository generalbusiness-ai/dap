/** Fixed-slot equality counts are derived state, rebuilt from held items and
 * local hash metadata. Raw counts preserve judges which have no Own reader. */
import type { ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { isLocalFact } from "./fields.ts";
import { normalValue, slotOf, type HashOf } from "./operand.ts";
import type { FixedDependency, FixedRow, Item, StateWriter } from "./state.ts";
import type { ValidDefinition } from "./validate/index.ts";
import { isFactRef, isObject, own } from "./values.ts";

export { normalValue, type HashOf } from "./operand.ts";
export interface FixedWrite { row: FixedRow; dependencies: readonly FixedDependency[] }

/** Dependencies include presently unavailable structural local references:
 * a later append can make their actual seq/hash available. */
export function fixedValueOf(raw: unknown, at: ScopeRef, hashOf: HashOf): { key: string; dependencies: readonly FixedDependency[] } {
  const dependencies = new Map<string, FixedDependency>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { for (const part of value) visit(part); }
    else if (isFactRef(value)) {
      if (isLocalFact(value, at)) dependencies.set(canonicalize([value.seq, value.hash]), { seq: value.seq, hash: value.hash });
    } else if (isObject(value)) for (const part of Object.values(value)) visit(part);
  };
  visit(raw);
  return { key: canonicalize(normalValue(raw, at, hashOf)), dependencies: [...dependencies.values()] };
}

/** Every fixed slot, including unset slots, after all effects on an item. */
export function fixedRowsOf(definition: ValidDefinition, item: Item, at: ScopeRef, hashOf: HashOf): readonly FixedWrite[] {
  const type = own(definition.declared.items, item.type);
  if (!type) throw new Error("fixed equality item names no declared type");
  return [type.parties, type.refs, type.values].flatMap(slots => Object.entries(slots).flatMap(([slot, rule]) => {
    if (!rule.fixed) return [];
    const raw = slotOf(item, slot), value = fixedValueOf(raw, at, hashOf);
    return [{ row: { type: item.type, slot, item: item.id, state: item.state, raw, key: value.key }, dependencies: value.dependencies }];
  }));
}

/** Re-key each affected item/slot once, through the absolute writer so a
 * historical view records concrete values rather than an Own closure. */
export function rekeyFixed(writer: StateWriter, at: ScopeRef, changed: Iterable<FixedDependency>, hashOf: HashOf): void {
  const affected = new Map<string, FixedRow>();
  for (const dependency of changed) for (const row of writer.fixedAffected(dependency.seq, dependency.hash)) affected.set(canonicalize([row.type, row.slot, row.item]), row);
  for (const row of affected.values()) {
    const value = fixedValueOf(row.raw, at, hashOf);
    if (value.key !== row.key) writer.putFixed({ ...row, key: value.key }, value.dependencies);
  }
}
