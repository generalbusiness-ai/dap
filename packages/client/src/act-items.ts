/** Item consequences reuse the recorded fold's slot and attribution helpers. */
import type { Digest, Effect, Item } from "@generalbusiness/dap-contract";
import { canonicalize, isDigest } from "@generalbusiness/dap-bytes";
import { changeItem, historyOf, isItemEffect, newItem, UNDER, type Signer, type StateView, type ValidDefinition } from "@generalbusiness/dap-derive";
import type { Source } from "./act-types.ts";

export interface ProjectedItems {
  readonly before: ReadonlyMap<number, Item | null>;
  readonly items: ReadonlyMap<number, Item>;
  readonly texts: ReadonlyMap<string, readonly Digest[]>;
  readonly entrySlots: ReadonlyMap<number, ReadonlySet<string>>;
  /** Actual item consequences change revision; attribution alone does not. */
  readonly revised: ReadonlySet<number>;
  /** The caller must account for non-item consequences separately. */
  readonly remaining: readonly Effect[];
}

export function textSlot(item: number, slot: string): string { return canonicalize([item, slot]); }

/** `opening` is a private alias, never a predicted item ID or recorded head. */
export function projectActItems(view: StateView, definition: ValidDefinition, effects: readonly Effect[],
  signer: Signer | null, source: Source, selfRefs: readonly number[], opening: number | null): ProjectedItems {
  const before = new Map<number, Item | null>();
  const items = new Map<number, Item>();
  const texts = new Map<string, readonly Digest[]>();
  const entrySlots = new Map<number, Set<string>>();
  const remaining: Effect[] = [];
  const annotated = new Set(selfRefs);
  const opened = effects.find(effect => effect.effect === "open");
  const idOf = (id: number): number => opened && id === opened.item && opening !== null ? opening : id;
  const touch = (id: number): Item => {
    const changed = items.get(id);
    if (changed) return changed;
    const held = view.item(id);
    if (!held) throw new TypeError("an admitted effect names no item");
    before.set(id, held);
    return held;
  };
  for (const [index, effect] of effects.entries()) {
    if (effect.effect === "open") {
      const type = Object.hasOwn(definition.declared.items, effect.type) ? definition.declared.items[effect.type] : undefined;
      if (!type || opening === null) throw new TypeError("an admitted opening has no declared type or private name");
      before.set(opening, null);
      items.set(opening, newItem({ ...effect, item: opening }, type, null));
      continue;
    }
    if (isItemEffect(effect)) {
      const id = idOf(effect.item);
      const item = touch(id);
      let applied = { ...effect, item: id };
      if (applied.effect === "ref") entrySlots.get(id)?.delete(applied.slot);
      if (applied.effect === "ref" && annotated.has(index)) {
        const slot = definition.declared.items[item.type]?.refs[applied.slot];
        if (slot?.to.type === "item") {
          if (opening === null) throw new TypeError("an item self-reference has no opening");
          applied = { ...applied, to: opening };
        } else if (slot?.to.type === "fact") {
          applied = { ...applied, to: { entry: { key: source.key, version: source.version } } };
          const slots = entrySlots.get(id) ?? new Set<string>();
          slots.add(applied.slot);
          entrySlots.set(id, slots);
        } else throw new TypeError("an annotated self-reference has no item or fact slot");
      }
      items.set(id, changeItem(item, applied, definition, signer));
      if (applied.effect === "value") {
        const of = definition.declared.items[item.type]?.values[applied.slot]?.of;
        if (of?.type === "text" && of.detached && typeof applied.value === "string") {
          const key = textSlot(id, applied.slot);
          const held = texts.get(key) ?? view.texts(id, applied.slot);
          if (!isDigest(applied.value)) throw new TypeError("an admitted detached-text effect has no digest");
          const digest = applied.value;
          if (!held.includes(digest)) texts.set(key, [...held, digest]);
        }
      }
    } else if (effect.effect === "redact") {
      const id = idOf(effect.item);
      items.set(id, touch(id));
      texts.set(textSlot(id, effect.slot), []);
    } else remaining.push(effect);
  }
  for (const [id, item] of items) {
    const was = before.get(id);
    if (was) items.set(id, { ...item, revision: was.revision + 1 });
  }
  const revised = new Set(items.keys());
  // A changed hold contributes attribution to its underlying item without
  // changing that item's revision, as the recorded fold does.
  for (const hold of [...items.values()]) {
    const under = definition.holdTypes.includes(hold.type) ? hold.refs[UNDER] : null;
    const target = typeof under === "number" && under !== hold.id ? items.get(under) ?? view.item(under) : null;
    if (!target) continue;
    const attributed = historyOf(target, [hold], definition, signer);
    if (attributed === target.attributed) continue;
    if (!before.has(target.id)) before.set(target.id, target);
    items.set(target.id, { ...target, attributed });
  }
  return { before, items, texts, entrySlots, revised, remaining };
}
