/** Shared live-item bound over the admission's immutable item declarations. */
import type { StateView } from "../state.ts";
import type { ValidDefinition } from "../validate/index.ts";
import { own } from "../values.ts";
import { declarationOf } from "./declaration.ts";

export function overMax(view: StateView, definition: ValidDefinition, type: string, state: string): string | null {
  const declared = own(declarationOf(definition).items, type)!;
  const live = Object.entries(declared.states).reduce((n, [s, { final }]) => (final ? n : n + view.count(type, s)), 0);
  return !own(declared.states, state)?.final && live + 1 > declared.max ? `${type} has ${live} live items` : null;
}
