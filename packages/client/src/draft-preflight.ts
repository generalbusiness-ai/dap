/** Private synchronous ownership and supplied-value validation before a member call waits. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { ShapeError, shapeFieldsOf, type ShapeField } from "./declared-shape.ts";
import type { Kind } from "./declared.ts";
import { ownDraftClearNames, ownDraftPatch } from "./draft-edit.ts";
import { ownDraftSlot, type Slot } from "./draft-slot.ts";

/** Omitted required fields stay omitted. The shared checker owns every present value's grammar. */
export function ownDraftEditInputs<D extends DeclaredDefinition, K extends Kind<D>>(
  definition: D, supplied: Slot<D, K>, input: unknown,
): { readonly slot: Slot<D, K>; readonly patch: Readonly<Record<string, unknown>> } {
  const slot = ownDraftSlot(definition, supplied), declared = definition.acts[slot.kind];
  if (!declared) throw new ShapeError("slot.kind", "must name an ordinary act");
  const patch = ownDraftPatch(declared, input);
  // ownDraftPatch has already proved that each retained name is declared and editable.
  const types: Record<string, ShapeField> = Object.fromEntries(Object.keys(patch).map((name): [string, ShapeField] =>
    [name, declared.fields[name]!]));
  shapeFieldsOf(types, patch);
  // Detached-text lowering and other shaped outputs do not replace authored values.
  return { slot, patch };
}

/** Clearing names uses the same address and editable-name readers, without shaping any value. */
export function ownDraftClearInputs<D extends DeclaredDefinition, K extends Kind<D>>(
  definition: D, supplied: Slot<D, K>, input: unknown,
): { readonly slot: Slot<D, K>; readonly names: readonly string[] } {
  const slot = ownDraftSlot(definition, supplied), declared = definition.acts[slot.kind];
  if (!declared) throw new ShapeError("slot.kind", "must name an ordinary act");
  return { slot, names: ownDraftClearNames(declared, input) };
}
