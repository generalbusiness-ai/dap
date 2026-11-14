/** Capture only missing subjects, without changing the author's values or basis. */
import type { DeclaredDefinition, FieldValue, Item, ScopeRef } from "@generalbusiness/dap-contract";
import type { Act, BoundAct, Revision } from "./act-types.ts";
import type { Kind } from "./declared.ts";
import { effectiveFields, expectedOf } from "./expected.ts";

type Subject<I extends number | object> = Pick<Item, "type" | "refs"> & { readonly id: I; readonly revision: Revision };

/** `capture` uses private selector identities; the act keeps names and text as written. */
export function bindActBasis<D extends DeclaredDefinition, K extends Kind<D>, I extends number | object>(
  definition: D,
  act: Act<D, K>,
  items: readonly Subject<I>[],
  capture: { readonly on: I | null; readonly fields: Readonly<Record<string, FieldValue>> },
  at: ScopeRef,
): { act: BoundAct<D, K>; bound: readonly string[] } {
  const declared = Object.hasOwn(definition.acts, act.kind) ? definition.acts[act.kind] : undefined;
  const expected: Record<string, Revision> = { ...act.expected };
  const bound: string[] = [];
  if (declared) {
    const effective = effectiveFields(declared, capture.fields, at);
    for (const [name, revision] of Object.entries(expectedOf(declared, items, capture.on, effective))) {
      if (Object.hasOwn(expected, name)) continue;
      Object.defineProperty(expected, name, { value: revision, enumerable: true, writable: true, configurable: true });
      bound.push(name);
    }
  }
  return { act: { ...act, expected }, bound };
}
