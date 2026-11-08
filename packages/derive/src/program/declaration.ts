/** Declaration metadata belongs to the actual successful validation. */
import type { ValidDefinition } from "../validate/index.ts";
import { immutable } from "./model.ts";

interface AdmittedDeclaration {
  readonly data: ValidDefinition["declared"];
  readonly origins: WeakMap<object, object>;
}
const declarations = new WeakMap<ValidDefinition, AdmittedDeclaration>();

/** Capture only after final admission, without freezing the caller's input. */
export function bindDeclaration(definition: ValidDefinition): void {
  if (declarations.has(definition)) throw new TypeError("declaration was already admitted");
  const origins = new WeakMap<object, object>();
  declarations.set(definition, { data: immutable(definition.declared, origins), origins });
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
