/** Match a projection to the exact native schema it names. This does not
 * replace native whole-definition admission, authenticate or perform a read. */
import type { DeclaredDefinition, FieldType } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, parseStrict } from "./index.ts";
import { applicationJson } from "./application-json.ts";
import { APPLICATION_PACKAGE_LIMITS } from "./application-types.ts";
import { ApplicationProjectionError, readApplicationProjection, type ApplicationReadProjection } from "./application-projection.ts";

/** Both arguments are owned before inspection. The definition must also pass
 * the native validator at admission; this check adds the projection binding.
 * Detached text is not an inline value and is deliberately unsupported here. */
export function bindApplicationProjection(value: unknown, definition: DeclaredDefinition): ApplicationReadProjection {
  const projection = readApplicationProjection(value);
  const fail = (): never => { throw new ApplicationProjectionError("binding"); };
  try {
    const owned = parseStrict(applicationJson(definition, APPLICATION_PACKAGE_LIMITS.definitionBytes)) as DeclaredDefinition;
    if (definitionDigest(owned) !== projection.definition) return fail();
    for (const source of Object.values(projection.sources)) {
      const item = Object.hasOwn(owned.items, source.item) ? owned.items[source.item] : undefined;
      if (!item || source.states.some(state => !Object.hasOwn(item.states, state))) return fail();
      for (const field of Object.values(source.fields)) {
        const { kind, name } = field.from;
        let type: FieldType, required: boolean;
        if (kind === "party") {
          const slot = Object.hasOwn(item.parties, name) ? item.parties[name] : undefined;
          if (!slot) return fail();
          type = slot.list ? { type: "list", of: { type: "member" }, max: slot.max ?? 64 } : { type: "member" };
          required = slot.required;
        } else if (kind === "ref") {
          const slot = Object.hasOwn(item.refs, name) ? item.refs[name] : undefined;
          if (!slot) return fail();
          type = slot.to; required = slot.required;
        } else {
          const slot = Object.hasOwn(item.values, name) ? item.values[name] : undefined;
          if (!slot || slot.of.type === "text" && slot.of.detached) return fail();
          type = slot.of; required = slot.required;
        }
        if (field.nullable !== !required || canonicalize(field.of) !== canonicalize(type)) return fail();
      }
    }
    return projection;
  } catch { return fail(); }
}
