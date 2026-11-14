/** Present private item aliases as names; the recorded snapshot keeps its IDs. */
import type { DeclaredDefinition, FieldType, FieldValue, Item } from "@generalbusiness/dap-contract";
import { canonicalize, isFieldValue, isRecord } from "@generalbusiness/dap-bytes";
import type { ActRef, ActRow, ActView, ItemName, RecordedActRow } from "./act-types.ts";

/** Convert only declared item-valued leaves, not equal integers in other slots. */
export function presentActValue(type: FieldType, value: FieldValue, nameOf: (id: number) => ItemName): FieldValue {
  if (type.type === "item" && typeof value === "number") {
    const name = nameOf(value);
    return typeof name === "number" ? name : { output: { key: name.output.key, version: name.output.version } };
  }
  if (type.type === "list" && Array.isArray(value)) return value.map(member => presentActValue(type.of, member, nameOf));
  if (type.type === "record" && isRecord(value)) return Object.fromEntries(Object.entries(value).map(([name, member]) => {
    if (!isFieldValue(member)) throw new TypeError("a projected record holds no field value");
    const of = Object.hasOwn(type.of, name) ? type.of[name] : undefined;
    return [name, of ? presentActValue(of, member, nameOf) : member];
  }));
  return value;
}

/** The supplied items come from the checked definition's state and shared
 * projection helpers. The type bridge retains that declaration's literals. */
export function presentActRows<D extends DeclaredDefinition>(definition: D, items: readonly Item[],
  nameOf: (id: number) => ItemName, reference: (id: number, revision: number) => ActRef,
  recorded: (id: number) => Item | null): Pick<ActView<D>, "rows" | "row"> {
  const rows = items.map((item): ActRow<D> => {
    const type = Object.hasOwn(definition.items, item.type) ? definition.items[item.type] : undefined;
    if (!type) throw new TypeError("a hypothetical row names no declared item type");
    const { id, revision, ...held } = item;
    const refs = Object.fromEntries(Object.entries(item.refs).map(([slot, value]) => {
      const rule = Object.hasOwn(type.refs, slot) ? type.refs[slot] : undefined;
      if (!rule) throw new TypeError("a hypothetical row names no declared reference slot");
      return [slot, value === null ? null : presentActValue(rule.to, value, nameOf)];
    }));
    const values = Object.fromEntries(Object.entries(item.values).map(([slot, value]) => {
      const rule = Object.hasOwn(type.values, slot) ? type.values[slot] : undefined;
      if (!rule) throw new TypeError("a hypothetical row names no declared value slot");
      return [slot, value === null ? null : presentActValue(rule.of, value, nameOf)];
    }));
    const original = recorded(id);
    if (original && original.type !== item.type) throw new TypeError("a hypothetical row changed its recorded type");
    return structuredClone({ ...held, refs, values, ref: reference(id, revision),
      recorded: original as RecordedActRow<D> | null }) as ActRow<D>;
  });
  const byName = new Map(rows.map(row => [canonicalize(row.ref.name), row]));
  return {
    rows: type => rows.filter(row => row.type === type) as readonly ActRow<D, typeof type>[],
    row: name => byName.get(canonicalize(name)) ?? null,
  };
}
