/** Declaration metadata belongs to the actual successful validation. */
import type { ValidDefinition } from "../validate/index.ts";
import { immutable } from "./model.ts";

interface AdmittedDeclaration {
  readonly data: ValidDefinition["declared"];
  readonly origins: WeakMap<object, object>;
  readonly owners: WeakMap<object, Readonly<object>>;
}
const declarations = new WeakMap<ValidDefinition, AdmittedDeclaration>();

/** Capture only after final admission, without freezing the caller's input. */
export function bindDeclaration(definition: ValidDefinition): void {
  if (declarations.has(definition)) throw new TypeError("declaration was already admitted");
  const origins = new WeakMap<object, object>();
  declarations.set(definition, { data: immutable(definition.declared, origins), origins, owners: new WeakMap() });
}

export function declarationOf(definition: ValidDefinition): ValidDefinition["declared"] {
  const found = declarations.get(definition);
  if (!found) throw new TypeError("declaration was not admitted by this validation");
  return found.data;
}

/** Copies from another validation do not acquire a source in this one. */
export function declarationSource(definition: ValidDefinition, value: object): object {
  return declarations.get(definition)?.origins.get(value) ?? value;
}

/** Only copies in this admission can acquire an actual declaration-row owner. */
export function bindDeclarationRow(definition: ValidDefinition, value: object, owner: Readonly<object>): void {
  const found = declarations.get(definition);
  if (!found) throw new TypeError("declaration was not admitted by this validation");
  const visit = (value: object): void => {
    if (!found.origins.has(value)) throw new TypeError("row metadata has no owned declaration source");
    const previous = found.owners.get(value);
    if (previous && previous !== owner) throw new TypeError("declaration metadata belongs to another row");
    if (previous) return;
    found.owners.set(value, owner);
    for (const child of Object.values(value)) if (typeof child === "object" && child !== null) visit(child);
  };
  visit(value);
}
export const declarationOwner = (definition: ValidDefinition, value: object): Readonly<object> | null =>
  declarations.get(definition)?.owners.get(value) ?? null;
