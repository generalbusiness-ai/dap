/** Capture only missing subjects, without changing the author's values or basis. */
import type { DeclaredDefinition, FieldValue, Item, ScopeRef } from "@generalbusiness/dap-contract";
import type { Act, BoundAct, Revision } from "./act-types.ts";
import type { Kind } from "./declared.ts";
import { effectiveFields, expectedOf } from "./expected.ts";

type Subject = Pick<Item, "id" | "type" | "refs"> & { readonly revision: Revision };

/** `lowered` belongs only to judgment; the returned act keeps symbolic names and text as written. */
export function bindActBasis<D extends DeclaredDefinition, K extends Kind<D>>(
  definition: D,
  act: Act<D, K>,
  items: readonly Subject[],
  lowered: { readonly on: number | null; readonly fields: Readonly<Record<string, FieldValue>> },
  at: ScopeRef,
): { act: BoundAct<D, K>; bound: readonly string[] } {
  const declared = Object.hasOwn(definition.acts, act.kind) ? definition.acts[act.kind] : undefined;
  const expected: Record<string, Revision> = { ...act.expected };
  const bound: string[] = [];
  if (declared) {
    const effective = effectiveFields(declared, lowered.fields, at);
    for (const [name, revision] of Object.entries(expectedOf(declared, items, lowered.on, effective))) {
      if (Object.hasOwn(expected, name)) continue;
      Object.defineProperty(expected, name, { value: revision, enumerable: true, writable: true, configurable: true });
      bound.push(name);
    }
  }
  return { act: { ...act, expected }, bound };
}
