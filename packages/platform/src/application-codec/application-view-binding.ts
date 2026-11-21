/** Bind presentation data to declared reads and native acts. Restricted rule
 * admission/evaluation and current viewer authority belong to the host. */
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Digest } from "@generalbusiness/dap-contract";
import { canonicalize, fitsFieldType, isRecord, parseStrict } from "@generalbusiness/dap-bytes";
import { viewParameterFits } from "./application-view-parameters.ts";
import { applicationJson } from "./application-json.ts";
import { APPLICATION_PACKAGE_LIMITS, type ApplicationDefinition } from "./application-types.ts";
import { bindApplicationProjection } from "./application-projection-binding.ts";
import { isApplicationJournalSource } from "./application-projection-types.ts";
import type { ApplicationReadProjection } from "./application-projection-types.ts";
import { applicationViewFactField, applicationViewTemplateFields, ApplicationViewError, readApplicationViews, type ApplicationViews } from "./application-view.ts";

export function bindApplicationViews(value: unknown, projections: Readonly<Record<string, ApplicationReadProjection>>,
  definitions: readonly ApplicationDefinition[], entry?: Digest): ApplicationViews {
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
        if (view.for && (journal || source.read !== "many")) return fail();
        for (const read of Object.values(view.reads ?? {})) {
          const related = Object.hasOwn(owned.projections, read.projection) ? owned.projections[read.projection] : undefined;
          if (!entry || !related || related.definition !== entry) return fail();
          const part = owned.definitions.find(part => part.id === entry);
          if (!part) return fail();
          const bound = bindApplicationProjection(related, parseStrict(part.bytes) as DeclaredDefinition);
          if (Object.values(bound.sources).some(source => !isApplicationJournalSource(source) && source.read === "item")) return fail();
        }
        if (view.order) {
          const field = source.fields[view.order.field];
          if (journal || source.read !== "many" || !field || field.of.type !== "time" && field.of.type !== "int") return fail();
        }
        for (const name of [view.title, view.summary, ...view.facts.map(applicationViewFactField)]) if (name !== null && !fields.has(name)) return fail();
        for (const fact of view.facts) if (typeof fact !== "string") {
          if ("format" in fact) { if (!(journal && fact.field === "time") && source.fields[fact.field]?.of.type !== "time") return fail(); }
          else if (fact.field !== "id" && fact.field !== "revision" && source.fields[fact.field]?.of.type !== "int") return fail();
        }
        if (view.actor !== null && (!Object.hasOwn(source.fields, view.actor) || source.fields[view.actor]!.of.type !== "member")) return fail();
        if (view.series) {
          const series = view.series, history = Object.hasOwn(bound.sources, series.source) ? bound.sources[series.source] : undefined;
          if (journal || !history || !isApplicationJournalSource(history) || history.read !== "entries" || history.latestBy !== null
            || history.limit < series.last || !Object.hasOwn(history.fields, series.field) || history.fields[series.field]!.of.type !== "int"
            || history.fields[series.field]!.nullable || history.acts.some(name => definition.acts[name]?.on !== source.item)) return fail();
        }
        for (const link of view.links ?? []) {
          const target = Object.hasOwn(views, link.view) ? views[link.view] : undefined;
          const targetProjection = target ? owned.projections[target.projection] : undefined;
          const selected = target && targetProjection ? targetProjection.sources[target.item] : undefined;
          const field = source.fields[link.field];
          if (journal || !target || target.kind !== "record" || !targetProjection || targetProjection.definition !== projection.definition
            || !selected || isApplicationJournalSource(selected) || selected.read !== "item" || !field || field.of.type !== "item" || field.of.of !== selected.item) return fail();
        }
        if (view.presence) {
          const p = view.presence;
          if (journal || source.read !== "many" || Object.keys(bound.sources).length !== 1
            || definition.level?.name !== "live" || definition.level.version !== 1 || source.states.length !== 1
            || !item || item.states[source.states[0]!]?.final !== false) return fail();
          const member = source.fields[p.member], focus = source.fields[p.focus], expires = source.fields[p.expires];
          if (!member || member.nullable || member.of.type !== "member" || member.from.kind !== "party"
            || !focus || focus.nullable || focus.of.type !== "scope" || focus.from.kind !== "ref"
            || !expires || expires.nullable || expires.of.type !== "time" || expires.from.kind !== "value") return fail();
          const controls = [p.enter, p.renew, p.leave].map(name => view.acts.filter(act => act.act === name));
          if (view.acts.length !== 3 || controls.some(found => found.length !== 1)) return fail();
          const [enter, renew, leave] = controls.map(found => found[0]!);
          if (enter!.when !== "true" || [enter, renew, leave].some(offered => Object.keys(offered!.args ?? {}).length || Object.keys(offered!.parameters ?? {}).length)) return fail();
          const open = definition.acts[p.enter], update = definition.acts[p.renew], end = definition.acts[p.leave];
          const focusInput = open?.fields[p.focusField];
          if (!open || !update || !end || open.step !== "open" || update.step !== "transition" || end.step !== "transition"
            || [open, update, end].some(act => act.on !== source.item || act.grant !== open.grant || Object.keys(act.also).length)
            || !Object.hasOwn(open.fields, p.focusField) || Object.keys(open.fields).length !== 1
            || focusInput?.type !== "scope" || !focusInput.required
            || Object.keys(update.fields).length || Object.keys(end.fields).length
            || [open, update, end].some(act => act.sends.length || act.attention.length)
            || focusInput.kind !== focus.of.kind) return fail();
          const same = (a: unknown, b: unknown) => canonicalize(a) === canonicalize(b);
          const unique = { type: source.item, states: source.states, where: [
            { equals: { a: { slot: member.from.name }, b: { signer: true } } },
            { equals: { a: { slot: focus.from.name }, b: { field: p.focusField } } },
          ] };
          if (!open.guards.some(guard => "none" in guard && same(guard.none, unique))) return fail();
          const signerGuard = { equals: { a: { slot: member.from.name }, b: { signer: true } } };
          if (![update, end].every(act => act.guards.some(guard => "equals" in guard && same(guard.equals, signerGuard.equals)))) return fail();
          if (!open.effects.some(effect => "party" in effect && same(effect.party, { slot: member.from.name, from: { signer: true } }))
            || !open.effects.some(effect => "ref" in effect && same(effect.ref, { slot: focus.from.name, from: { field: p.focusField } }))) return fail();
          const leaseEffect = (effect: typeof open.effects[number]) => "value" in effect && effect.value.slot === expires.from.name
            && isRecord(effect.value.from) && "time" in effect.value.from && isRecord(effect.value.from.time)
            && typeof effect.value.from.time["plusSeconds"] === "number" && effect.value.from.time["plusSeconds"] > 0;
          const lease = open.effects.find(leaseEffect);
          const seconds = lease && "value" in lease && isRecord(lease.value.from) && "time" in lease.value.from && isRecord(lease.value.from.time)
            ? lease.value.from.time["plusSeconds"] : null;
          // View refresh is milliseconds; lease duration is whole seconds.
          // Two refresh intervals must fit within the validated lease.
          if (typeof seconds !== "number" || !Number.isSafeInteger(seconds) || seconds <= 0 || view.refresh / 500 > seconds) return fail();
          const finalEffect = end.effects[0];
          if ([open, update, end].some(act => act.effects.some(effect => Object.keys(effect).length !== 1))
            || open.effects.length !== 3 || open.effects.filter(leaseEffect).length !== 1
            || update.effects.length !== 1 || !leaseEffect(update.effects[0]!)
            || !same(open.effects.find(leaseEffect), update.effects[0])
            || end.effects.length !== 1 || !finalEffect || !("state" in finalEffect) || !item.states[finalEffect.state]?.final
            || !Object.values(definition.timed).some(rule => rule.on === source.item && rule.deadline === expires.from.name
              && rule.states.length === 1 && rule.states[0] === source.states[0]
              && rule.effects.length === 1 && same(rule.effects[0], finalEffect))) return fail();
        }
        for (const offered of view.acts) {
          const act = Object.hasOwn(definition.acts, offered.act) ? definition.acts[offered.act] : undefined;
          if (isApplicationJournalSource(source) || !act || act.on !== source.item || act.grant !== offered.needs || !isRecord(act.fields)) return fail();
          // Constants are validated against the same native literal guard.
          // Local item existence and all guards still belong to native submit.
          const args = offered.args ?? {};
          for (const [name, value] of Object.entries(args)) {
            const field = Object.hasOwn(act.fields, name) ? act.fields[name] : undefined;
            if (!field || !("type" in field) || !fitsFieldType(field, value, PROPOSED_BOUNDS)) return fail();
          }
          const parameters = offered.parameters ?? {};
          for (const [name, parameter] of Object.entries(parameters)) {
            const field = Object.hasOwn(act.fields, name) ? act.fields[name] : undefined;
            if (Object.hasOwn(args, name) || !field || !("type" in field) || !viewParameterFits(parameter, field)) return fail();
          }
          if (Object.entries(act.fields).some(([name, field]) => field.required && !Object.hasOwn(field, "default") && !Object.hasOwn(args, name)
            && !(view.presence && offered.act === view.presence.enter && name === view.presence.focusField)
            && (!Object.hasOwn(parameters, name) || !parameters[name]!.required))) return fail();
        }
      }
    }
    return views;
  } catch { return fail(); }
}
