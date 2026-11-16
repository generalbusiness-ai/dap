/** Pure Slot values and a read-only draft index. */
import type { ActType, DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, parseStrict } from "@generalbusiness/dap-bytes";
import type { ActFields, ActRef, ItemName } from "./act-types.ts";
import { ShapeError, type Kind } from "./declared.ts";
import { readDraftRef, type DraftSlot } from "./draft-store.ts";

type Fields<D extends DeclaredDefinition, K extends Kind<D>> = D["acts"][K]["fields"];
export type SlotItemKeys<D extends DeclaredDefinition, K extends Kind<D>> = {
  [N in keyof Fields<D, K>]: Fields<D, K>[N] extends { type: "item" } ? N : never
}[keyof Fields<D, K>];
type RequiredItemKeys<D extends DeclaredDefinition, K extends Kind<D>> = {
  [N in SlotItemKeys<D, K>]: Fields<D, K>[N] extends { required: true } ? N : never
}[SlotItemKeys<D, K>];
type ItemRefs<D extends DeclaredDefinition, K extends Kind<D>> =
  { readonly [N in RequiredItemKeys<D, K>]: ActRef }
  & { readonly [N in Exclude<SlotItemKeys<D, K>, RequiredItemKeys<D, K>>]?: ActRef };
type OnInput<A extends Pick<ActType, "step" | "on">> = A["step"] extends "open" ? { readonly on?: null }
  : A["on"] extends null ? { readonly on?: null } : { readonly on: ActRef };
type ItemInputs<D extends DeclaredDefinition, K extends Kind<D>> = RequiredItemKeys<D, K> extends never
  ? { readonly fields?: ItemRefs<D, K> } : { readonly fields: ItemRefs<D, K> };
export type SlotInput<D extends DeclaredDefinition, K extends Kind<D>> = OnInput<D["acts"][K]> & ItemInputs<D, K>;
export type Slot<D extends DeclaredDefinition, K extends Kind<D>> = {
  readonly kind: K;
  readonly on: D["acts"][K]["step"] extends "open" ? null : D["acts"][K]["on"] extends null ? null : ActRef;
  readonly fields: ItemRefs<D, K>;
};
type EditableFields<D extends DeclaredDefinition, K extends Kind<D>> = Omit<ActFields<D, K>, SlotItemKeys<D, K>>;
/** Stored/view values contain no own undefined. Required fields can remain absent while editing. */
export type EditableValues<D extends DeclaredDefinition, K extends Kind<D>> = Partial<EditableFields<D, K>>;
/** Transient top-level own undefined means omitted from this patch, never clear. */
export type EditPatch<D extends DeclaredDefinition, K extends Kind<D>> = {
  readonly [N in keyof EditableFields<D, K>]?: EditableFields<D, K>[N] | undefined;
};
export type ClearField<D extends DeclaredDefinition, K extends Kind<D>> = keyof EditableFields<D, K> & string;
export type AnySlot<D extends DeclaredDefinition> = { [K in Kind<D>]: Slot<D, K> }[Kind<D>];
/** The later projector supplies its actual per-kind view fields; this adapter invents none. */
export type DraftViewKinds<D extends DeclaredDefinition> = { [K in Kind<D>]: { readonly slot: Slot<D, K> } };
export interface DraftIndex<D extends DeclaredDefinition, Views extends DraftViewKinds<D>> {
  get<K extends Kind<D>>(slot: Slot<D, K>): Views[K] | undefined;
  [Symbol.iterator](): IterableIterator<readonly [AnySlot<D>, Views[Kind<D>]]>;
}

interface SlotValue {
  readonly kind: string;
  readonly on: ActRef | null;
  readonly fields: Readonly<Record<string, ActRef>>;
}
function bad(path: string, message: string): never { throw new ShapeError(path, message); }
function owned(value: unknown): unknown {
  try { return parseStrict(canonicalize(value)); }
  catch { return bad("slot", "must contain plain owned data"); }
}
function object(value: unknown, path: string): Record<string, unknown> {
  return isRecord(value) ? value : bad(path, "must be an object");
}
function keys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  if (Object.keys(value).some(name => !allowed.includes(name))) bad(path, "has an undeclared member");
}

/** Validate only declared address inputs, not item existence, freshness, or authority. */
function inputs(definition: DeclaredDefinition, kind: unknown, value: unknown): SlotValue {
  if (typeof kind !== "string" || !Object.hasOwn(definition.acts, kind) || kind === definition.genesis)
    return bad("slot.kind", "must name an ordinary act");
  const declared = definition.acts[kind]!, input = object(owned(value), "slot");
  keys(input, ["on", "fields"], "slot");
  const needs = declared.step !== "open" && declared.on !== null;
  const primary = Object.hasOwn(input, "on") ? input["on"] : null;
  const on = needs ? readDraftRef(primary) : primary === null ? null : bad("slot.on", "names no existing primary item");
  const fields = Object.hasOwn(input, "fields") ? object(input["fields"], "slot.fields") : {};
  const refs = Object.fromEntries(Object.entries(fields).map(([name, value]): [string, ActRef] => {
    const field = Object.hasOwn(declared.fields, name) ? declared.fields[name] : undefined;
    if (field?.type !== "item") return bad("slot.fields", "names a field outside the address");
    return [name, readDraftRef(value)];
  }));
  for (const [name, field] of Object.entries(declared.fields)) {
    if (field.type === "item" && field.required && !Object.hasOwn(refs, name)) bad("slot.fields", "lacks a required item ref");
  }
  return { kind, on, fields: refs };
}
function readSlot(definition: DeclaredDefinition, value: unknown): SlotValue {
  const row = object(owned(value), "slot");
  keys(row, ["kind", "on", "fields"], "slot");
  if (!Object.hasOwn(row, "kind") || !Object.hasOwn(row, "on") || !Object.hasOwn(row, "fields"))
    return bad("slot", "lacks its kind, primary or item fields");
  return inputs(definition, row["kind"], { on: row["on"], fields: row["fields"] });
}
function address(slot: SlotValue): DraftSlot {
  return { kind: slot.kind, on: slot.on?.name ?? null,
    items: Object.fromEntries(Object.entries(slot.fields).map(([name, ref]): [string, ItemName] => [name, ref.name])) };
}

/** Copy refs as values. Address equality never uses seen, assumes, or object identity. */
export function slotFor<const D extends DeclaredDefinition, const K extends Kind<D>>(
  definition: D, kind: K, input: SlotInput<D, K>,
): Slot<D, K> {
  // The runtime declaration check proves this kind's primary and required/optional item-field shape.
  return inputs(definition, kind, input) as Slot<D, K>;
}
/** Private complete-Slot ownership boundary. Reuse the same reader and ShapeError path. */
export function ownDraftSlot<D extends DeclaredDefinition, K extends Kind<D>>(definition: D, supplied: Slot<D, K>): Slot<D, K> {
  // The caller's K and the validated complete ordinary address fix this generic correlation.
  return readSlot(definition, supplied) as Slot<D, K>;
}
/** Internal names-only storage address. No default inserts an item the caller omitted. */
export function slotAddress<D extends DeclaredDefinition, K extends Kind<D>>(definition: D, slot: Slot<D, K>): DraftSlot {
  return address(readSlot(definition, slot));
}

/** Own a complete already-projected slot list. Waiting requests do not belong in this index. */
export function draftIndex<const D extends DeclaredDefinition, Views extends DraftViewKinds<D>>(
  definition: D, views: readonly Views[Kind<D>][],
): DraftIndex<D, Views> {
  const fixed = structuredClone(definition), byAddress = new Map<string, Views[Kind<D>]>();
  for (const supplied of views) {
    const view = structuredClone(supplied), slot = readSlot(fixed, view.slot);
    const key = canonicalize(address(slot));
    if (byAddress.has(key)) bad("drafts", "has more than one draft in a slot");
    byAddress.set(key, view);
  }
  return Object.freeze({
    get<K extends Kind<D>>(slot: Slot<D, K>): Views[K] | undefined {
      const found = byAddress.get(canonicalize(address(readSlot(fixed, slot))));
      // Address includes the validated kind. The matching view belongs to Views[K].
      return found === undefined ? undefined : structuredClone(found) as Views[K];
    },
    *[Symbol.iterator](): IterableIterator<readonly [AnySlot<D>, Views[Kind<D>]]> {
      for (const held of byAddress.values()) {
        const view = structuredClone(held);
        // The constructor checked each row's actual kind/address before indexing.
        yield [view.slot as AnySlot<D>, view];
      }
    },
  });
}
