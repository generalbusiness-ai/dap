/** Opt-in item duties keep their admitted Amount until their own settling
 * entry. They are derived bookkeeping, rebuilt by folding the journal. */
import type { Entry } from "@generalbusiness/dap-contract";
import { amountMath, NOTHING, type Amount } from "./held.ts";
import { markerReservations, marksDone } from "./markers.ts";
import type { Item, StateWriter } from "./state.ts";
import type { ValidDefinition } from "./validate/index.ts";
import { own } from "./values.ts";

export interface ItemDuty { item: number; kind: "state" | "mark" | "deadline"; slot: string | null; amount: Amount }
const key = (duty: Pick<ItemDuty, "kind" | "slot">) => JSON.stringify([duty.kind, duty.slot]);

/** A projection of the existing item/marker Amounts, never a new closure. */
function current(definition: ValidDefinition, item: Item): ItemDuty[] {
  const duties: ItemDuty[] = [];
  const add = (kind: ItemDuty["kind"], slot: string | null, amount: Amount) => {
    const checked = amountMath(true).sum(amount);
    if (Object.values(checked).some(n => n !== 0)) duties.push({ item: item.id, kind, slot, amount: checked });
  };
  add("deadline", null, own(own(definition.pendingWorkAmounts.deadlines, item.type), item.state) ?? NOTHING);
  const marked = own(definition.markers, item.type);
  if (marked) {
    const amounts = markerReservations(definition.markers!, undefined, undefined, true);
    const done = marksDone(marked, item);
    add("state", null, amounts.task(item.type, null, item.state, done));
    for (const slot of marked.marks) if (!done.includes(slot)) add("mark", slot, amounts.task(item.type, slot, item.state, done));
  } else add("state", null, own(own(definition.pendingWorkAmounts.pending, item.type), item.state) ?? NOTHING);
  return duties;
}

/** Primary-act and timed settlement identities. Other subject selectors
 * and delivery bindings are deliberately still conservative in this WIP:
 * they cannot release a reservation merely because a state/mark changed. */
function settled(definition: ValidDefinition, entry: Entry, before: Item | null, after: Item): string | null {
  if (!before) return null;
  const input = entry.input;
  if (input.type === "timed" && input.item === after.id) {
    const rule = own(definition.declared.timed, input.rule);
    return rule?.on === before.type && rule.states.includes(before.state) ? key({ kind: "deadline", slot: null }) : null;
  }
  if (input.type !== "act" || input.signed.intent.on !== after.id) return null;
  const form = own(definition.declared.acts, input.signed.intent.kind)?.settles;
  if (!form || !("of" in form) || form.of !== "on" || !form.in.includes(before.state)) return null;
  if ("sets" in form) return own(before.values, form.sets) === false && own(after.values, form.sets) === true ? key({ kind: "mark", slot: form.sets }) : null;
  return !form.in.includes(after.state) ? key({ kind: "state", slot: null }) : null;
}

export function updateItemDuties(writer: StateWriter, definition: ValidDefinition, entry: Entry, before: Item | null, after: Item): void {
  if (definition.declared.capacity?.name !== "whole-scope") return;
  const { largest } = amountMath(true);
  const released = settled(definition, entry, before, after);
  const held = new Map(writer.itemDuties(after.id).filter(duty => key(duty) !== released).map(duty => [key(duty), duty]));
  for (const duty of current(definition, after)) {
    const previous = held.get(key(duty));
    held.set(key(duty), previous ? { ...duty, amount: largest(previous.amount, duty.amount) } : duty);
  }
  writer.putItemDuties(after.id, [...held.values()]);
}
