/** Private ordered retention for a checked sequence of authored acts. */
import type { AuthorizationPosition, AuthorizedAct } from "./authorization.ts";
import type { Source } from "./act-types.ts";

export interface CompositionStep { readonly source: Source; readonly act: AuthorizedAct }
type Operation = (steps: readonly CompositionStep[]) => Promise<readonly AuthorizationPosition[]>;
const operations = new WeakMap<object, Operation>();
export function registerComposition(owner: object, operation: Operation): void { operations.set(owner, operation); }
export function retainComposition(owner: object, steps: readonly CompositionStep[]): Promise<readonly AuthorizationPosition[]> {
  const operation = operations.get(owner);
  if (!operation) throw new TypeError("composition requires its constructor identity binding");
  return operation(steps);
}
