/** Describe and check presence only. No incomplete act reaches the judge. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { isRecord } from "@generalbusiness/dap-bytes";
import type { Kind, ShapeField } from "./declared.ts";
import { formFor, type Form, type FormContext } from "./forms.ts";
import type { ItemName, PartialAct } from "./act-types.ts";

/** A template keeps the declared fields and guard sentences beside a partial act. */
export interface ActTemplate<D extends DeclaredDefinition, K extends Kind<D>> {
  readonly form: Form<D, K>;
  readonly act: PartialAct<D, K>;
}

export function actTemplate<const D extends DeclaredDefinition, const K extends Kind<D>>(
  definition: D, kind: K, on: ItemName | null, context: FormContext,
): ActTemplate<D, K> {
  return { form: formFor(definition, kind, context), act: { kind, on, fields: {} } };
}

/** Required presence uses the same declarations as shapeDeclaredAct; value checks wait for a complete act. */
export function missingActInputs(definition: DeclaredDefinition, act: {
  readonly kind?: string;
  readonly on?: ItemName | null;
  readonly fields?: Readonly<Record<string, unknown>>;
}): readonly string[] {
  if (act.kind === undefined) return ["kind"];
  const declared = Object.hasOwn(definition.acts, act.kind) ? definition.acts[act.kind] : undefined;
  if (!declared) return [];
  const missing: string[] = [];
  if (declared.step !== "open" && declared.on !== null && (act.on === undefined || act.on === null)) missing.push("on");
  const visit = (type: ShapeField, value: unknown, path: string): void => {
    if (value === undefined) {
      if (type.required) missing.push(path);
      return;
    }
    if (type.type === "record" && isRecord(value)) {
      for (const [name, member] of Object.entries(type.of)) visit(member, Object.hasOwn(value, name) ? value[name] : undefined, `${path}.${name}`);
    } else if (type.type === "list" && Array.isArray(value)) {
      value.forEach((member, index) => visit(type.of, member, `${path}.${index}`));
    }
  };
  for (const [name, field] of Object.entries(declared.fields)) {
    const value = act.fields !== undefined && Object.hasOwn(act.fields, name) ? act.fields[name] : undefined;
    visit(field, value, `fields.${name}`);
  }
  return missing;
}
