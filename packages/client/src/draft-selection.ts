/** Select draft subject identities from owned checked data. No live read or judgment. */
import type { ActType, FieldValue, Item, ScopeRef } from "@generalbusiness/dap-contract";
import { expectedKeys } from "@generalbusiness/dap-derive";
import type { ItemName } from "./act-types.ts";
import { lowerActNames } from "./act-symbols.ts";
import { ShapeError, shapeFieldsOf, type ShapeField } from "./declared.ts";
import { effectiveFields, expectedOf } from "./expected.ts";

export type DraftSelectionRow = Pick<Item, "id" | "type" | "revision" | "values" | "refs">;
export interface DraftSelectionInput {
  readonly declaration: ActType;
  readonly scope: ScopeRef;
  readonly rows: readonly DraftSelectionRow[];
  readonly values: { readonly on: ItemName | null; readonly fields: Readonly<Record<string, unknown>> };
}
export interface DraftSubjects {
  readonly on: number | null;
  readonly names: readonly string[];
  readonly selected: Readonly<Record<string, number>>;
  /** Selection-only normalized fields; never replace authored fields with these values. */
  readonly effectiveFields: Readonly<Record<string, FieldValue>>;
}

/** The caller supplies one actual checked cut. This helper creates no basis or authority.
 * Incomplete fields remain incomplete; only present declared fields are shaped. */
export function selectDraftSubjects(input: DraftSelectionInput): DraftSubjects {
  const { declaration, scope, rows, values } = structuredClone(input);
  const present: Record<string, ShapeField> = Object.fromEntries(Object.keys(values.fields).map((name): [string, ShapeField] => {
    const field = Object.hasOwn(declaration.fields, name) ? declaration.fields[name] : undefined;
    if (!field) throw new ShapeError("fields", "contains an undeclared field");
    return [name, field];
  }));
  // An unheld symbolic name throws the existing UnavailableActSource. The
  // caller maps that condition; this module has no materializer or callback.
  const lowered = lowerActNames(values, declaration.fields, { item: name => typeof name === "number" ? name : null });
  const shaped = shapeFieldsOf(present, lowered.fields);
  const effective = effectiveFields(declaration, shaped.fields, scope);
  // Existing E4 identity technique: expectedOf returns the row IDs here.
  // Shared via reads value/ref slots; checked declarations make them disjoint.
  const selected = expectedOf(declaration, rows.map(row => ({ ...row, revision: row.id, refs: { ...row.values, ...row.refs } })),
    lowered.on, effective);
  const names = expectedKeys(declaration, Object.entries(declaration.also)
    .filter(([, rule]) => !("code" in rule) || rule.code === undefined).map(([name]) => name));
  return { on: lowered.on, names, selected, effectiveFields: effective };
}
