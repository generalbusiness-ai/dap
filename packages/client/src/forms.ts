/** Shared declared forms and conservative state candidates. The scope still judges every act. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import { actSentence, besideOf, onOf, type DefinitionLike, type Setting, type Who, type descriptionsOf } from "./describe.ts";
import type { Kind } from "./declared.ts";

/** The same bound description functions and context the consumer already holds. This performs no membership read. */
export interface FormContext {
  describe: ReturnType<typeof descriptionsOf>;
  setting: Setting;
  who: Who;
}

export interface Form<D extends DefinitionLike, K extends keyof D["acts"] & string> {
  kind: K;
  on: "required" | "absent";
  fields: D["acts"][K]["fields"];
  sentence: string;
  fieldLines: string[];
  guards: ReturnType<FormContext["describe"]["guardSentences"]>;
  presents: NonNullable<D["acts"][K]["presents"]>;
  beside: ReturnType<typeof besideOf>;
}

/** Wrap the shared description derivation. Field declarations retain their literal names and bounds. */
export function formFor<const D extends DefinitionLike, const K extends keyof D["acts"] & string>(definition: D, kind: K, context: FormContext): Form<D, K> {
  const act = Object.hasOwn(definition.acts, kind) ? definition.acts[kind] : undefined;
  if (!act) throw new RangeError(`no declared act ${kind}`);
  return {
    kind, on: onOf(act), fields: act.fields as D["acts"][K]["fields"], sentence: actSentence(kind, act, context.who),
    fieldLines: context.describe.fieldLines(act, context.setting),
    guards: context.describe.guardSentences(definition, act, context.setting),
    presents: (act.presents ?? {}) as NonNullable<D["acts"][K]["presents"]>,
    beside: besideOf(act),
  };
}

/** Declared slot groups only. Labels, live values and nullability policy belong to their consumers. */
export function slotsFor<const D extends DeclaredDefinition, const I extends keyof D["items"] & string>(definition: D, item: I): Pick<D["items"][I], "parties" | "values" | "refs"> {
  const declared = Object.hasOwn(definition.items, item) ? definition.items[item] : undefined;
  if (!declared) throw new RangeError(`no declared item ${item}`);
  return { parties: declared.parties, values: declared.values, refs: declared.refs } as Pick<D["items"][I], "parties" | "values" | "refs">;
}

/** Sorted state candidates on an existing item. These kinds grant nothing and establish no availability. Only an unconditional top-level state guard on the primary subject can exclude one. */
export function actsOn<const D extends DeclaredDefinition, const I extends keyof D["items"] & string>(definition: D, item: I, state: keyof D["items"][I]["states"] & string): Kind<D>[] {
  return Object.entries(definition.acts).filter(([kind, act]) =>
    kind !== definition.genesis && act.on === item && (act.step === "transition" || act.step === "comment") &&
    act.guards.every((guard) => !("state" in guard) || !Object.hasOwn(guard, "state") ||
      guard.ifPresent === true || (guard.of !== undefined && guard.of !== "on") || guard.state.includes(state)),
  ).map(([kind]) => kind as Kind<D>).sort();
}
