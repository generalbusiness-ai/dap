/** Bind presentation data to declared reads and native acts. Restricted rule
 * admission/evaluation and current viewer authority belong to the host. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { isRecord, parseStrict } from "./index.ts";
import { applicationJson } from "./application-json.ts";
import { APPLICATION_PACKAGE_LIMITS, type ApplicationDefinition } from "./application-types.ts";
import { bindApplicationProjection } from "./application-projection-binding.ts";
import { isApplicationJournalSource } from "./application-projection-types.ts";
import type { ApplicationReadProjection } from "./application-projection-types.ts";
import { applicationViewTemplateFields, ApplicationViewError, readApplicationViews, type ApplicationViews } from "./application-view.ts";

export function bindApplicationViews(value: unknown, projections: Readonly<Record<string, ApplicationReadProjection>>,
  definitions: readonly ApplicationDefinition[]): ApplicationViews {
  const views = readApplicationViews(value), fail = (): never => { throw new ApplicationViewError("binding"); };
  try {
    const owned = parseStrict(applicationJson({ projections, definitions }, APPLICATION_PACKAGE_LIMITS.bytes)) as {
      projections: Readonly<Record<string, ApplicationReadProjection>>; definitions: readonly ApplicationDefinition[];
    };
    for (const view of Object.values(views)) {
      if (!Object.hasOwn(owned.projections, view.projection)) return fail();
      const projection = owned.projections[view.projection]!;
      const part = owned.definitions.find(part => part.id === projection.definition);
      if (!part) return fail();
      const definition = parseStrict(part.bytes) as DeclaredDefinition;
      const bound = bindApplicationProjection(projection, definition);
      if (!Object.hasOwn(bound.sources, view.item)) return fail();
      const source = bound.sources[view.item]!, journal = isApplicationJournalSource(source);
      const item = journal ? null : definition.items[source.item]!;
      if (view.kind === "log" && !journal || journal && view.acts.length) return fail();
      const fields = new Set(["id", "type", "state", "revision", ...(journal ? ["time", "on"] : []), ...Object.keys(source.fields)]);
      const template = (text: string, waiting: boolean) => {
        if (applicationViewTemplateFields(text).some(name => !fields.has(name) && !(waiting && name === "waiting"))) return fail();
      };
      template(view.context, true); template(view.fallback, true);
      for (const [state, text] of Object.entries(view.waiting)) {
        if (item ? !Object.hasOwn(item.states, state) : state !== "sealed") return fail();
        template(text, false);
      }
      if (view.back !== null && !Object.hasOwn(views, view.back)) return fail();
      if (view.kind === "surface") {
        if (Object.values(view.opens).some(target => !Object.hasOwn(views, target))) return fail();
      } else {
        for (const name of [view.title, view.summary, ...view.facts]) if (name !== null && !fields.has(name)) return fail();
        if (view.actor !== null && (!Object.hasOwn(source.fields, view.actor) || source.fields[view.actor]!.of.type !== "member")) return fail();
        for (const offered of view.acts) {
          const act = Object.hasOwn(definition.acts, offered.act) ? definition.acts[offered.act] : undefined;
          if (isApplicationJournalSource(source) || !act || act.on !== source.item || act.grant !== offered.needs || !isRecord(act.fields)) return fail();
          // Compact controls have no field editor or undisclosed arguments.
          if (Object.values(act.fields).some(field => field.required && !Object.hasOwn(field, "default"))) return fail();
        }
      }
    }
    return views;
  } catch { return fail(); }
}
