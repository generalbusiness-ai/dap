/** Pure Slot/index value semantics over TEST declaration data. No definition validator,
 * journal, authority, session, draft operation, signature or persistence runs. */
import { expect, test } from "vitest";
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { ShapeError, type Kind } from "../src/declared.ts";
import { slotFor, slotAddress, draftIndex, type EditableValues, type Slot, type SlotInput } from "../src/draft-slot.ts";
import { selection } from "./support/c4-selection.ts";

// `on` is a legal item-field name as well as the separate primary-input name.
// Its optional default is declaration data only: Slot never evaluates it.
const definition = {
  ...selection,
  acts: { ...selection.acts,
    choose: {
      step: "transition", on: "anchor", grant: "c4-selection.member",
      also: { target: { item: "target", by: "on" } },
      fields: { on: { type: "item", of: "target", required: false, default: 2 },
        text: { type: "text", max: 16, required: false } },
      guards: [], effects: [{ value: { slot: "target", from: { field: "on" } } }], sends: [], attention: [],
    },
  },
} as const satisfies DeclaredDefinition;
type Definition = typeof definition;
type Views = { [K in Kind<Definition>]: {
  readonly key: string; readonly slot: Slot<Definition, K>;
  readonly values: Readonly<EditableValues<Definition, K>>;
  readonly state: "editing";
} };
const primary = () => ({ name: 0, seen: 1, assumes: [] });

// Invariant: equal item names locate one draft even after ref/Slot copies and
// new seen values; neither caller mutations nor reading changes the retained view.
test("copied Slot values and newer refs locate the original owned draft by names", () => {
  const supplied = { on: primary(), fields: { on: { name: 2, seen: 3, assumes: [] } } };
  const slot = slotFor(definition, "choose", supplied);
  supplied.on.seen = 8; supplied.fields.on.seen = 9;
  expect(slot.on.seen).toBe(1);
  expect(slot.fields.on?.seen).toBe(3);
  expect(slotAddress(definition, slot)).toEqual({ kind: "choose", on: 0, items: { on: 2 } });

  const view: Views["choose"] = { key: "first", slot, values: { text: "words" }, state: "editing" };
  const index = draftIndex<Definition, Views>(definition, [view]);
  Object.defineProperty(view, "key", { value: "caller changed input" });
  const copied: Slot<Definition, "choose"> = JSON.parse(JSON.stringify(slot));
  const newer = slotFor(definition, "choose", { on: { name: 0, seen: 20, assumes: [] },
    fields: { on: { name: 2, seen: 30, assumes: [] } } });
  expect(index.get(copied)?.key).toBe("first");
  const held = index.get(newer);
  expect(held?.values.text).toBe("words");
  expect(held?.slot.on.seen).toBe(1);
  expect(held?.slot.fields.on?.seen).toBe(3);
  if (!held) return expect.fail("equal names must locate the existing draft");
  Object.defineProperty(held, "key", { value: "caller changed result" });
  Object.defineProperty(held.slot.on, "seen", { value: 99 });
  const first = [...index][0];
  if (!first) return expect.fail("the owned index must iterate its actual draft");
  const [iteratedSlot, iterated] = first;
  expect(iterated.key).toBe("first");
  expect(iteratedSlot.on?.seen).toBe(1);
  Object.defineProperty(iterated, "key", { value: "caller changed iteration" });
  expect(index.get(slot)?.key).toBe("first");
});

// Invariant: supplied optional item refs define the address, while malformed
// or duplicate addresses never become a silently repaired/overwritten index.
test("optional presence stays distinct from its default ref and bad selectors reject", () => {
  const absent = slotFor(definition, "choose", { on: primary() });
  const explicit = slotFor(definition, "choose", { on: primary(), fields: { on: { name: 2, seen: 3, assumes: [] } } });
  expect(slotAddress(definition, absent)).toEqual({ kind: "choose", on: 0, items: {} });
  expect(slotAddress(definition, explicit)).toEqual({ kind: "choose", on: 0, items: { on: 2 } });
  const empty: Views["choose"] = { key: "absent", slot: absent, values: {}, state: "editing" };
  const given: Views["choose"] = { key: "explicit", slot: explicit, values: {}, state: "editing" };
  const index = draftIndex<Definition, Views>(definition, [empty, given]);
  expect(index.get(absent)?.key).toBe("absent");
  expect(index.get(explicit)?.key).toBe("explicit");
  expect([...index]).toHaveLength(2);

  const bad: unknown[] = [
    { on: primary() },
    { on: primary(), fields: { target: null } },
    { on: primary(), fields: { target: { name: 2, seen: 1, assumes: [] }, text: "outside address" } },
  ];
  for (const input of bad) expect(() => slotFor(definition, "point", input as SlotInput<Definition, "point">)).toThrow(ShapeError);
  expect(() => slotFor(definition, "choose", { on: primary(), fields: { on: null } } as unknown as SlotInput<Definition, "choose">)).toThrow(ShapeError);
  const duplicate = { ...given, key: "another", slot: slotFor(definition, "choose", { on: primary(),
    fields: { on: { name: 2, seen: 7, assumes: [] } } }) };
  expect(() => draftIndex<Definition, Views>(definition, [given, duplicate])).toThrow(ShapeError);
  // Rejection creates no partially updated public index and does not mutate the old one.
  expect(index.get(absent)?.key).toBe("absent");
  expect(index.get(explicit)?.key).toBe("explicit");
});
