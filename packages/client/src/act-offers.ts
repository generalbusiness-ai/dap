/** Describe actual rows; only an explicit caller key/context judges an offer. */
import type { DeclaredDefinition } from "@generalbusiness/dap-contract";
import type { StateView, ValidDefinition } from "@generalbusiness/dap-derive";
import type { Kind } from "./declared.ts";
import { actsOn, type FormContext } from "./forms.ts";
import { actExplore } from "./act-explore.ts";
import type { ExplorationContext } from "./act-context.ts";
import { actTemplate, missingActInputs, type ActTemplate } from "./act-input.ts";
import { presentActRows } from "./act-rows.ts";
import type { ActRef, ActView, Exploration } from "./act-types.ts";

export interface ActOffer<D extends DeclaredDefinition, K extends Kind<D>> {
  readonly template: ActTemplate<D, K>;
  readonly exploration?: Exploration<D, K>;
}

/** Supply both members to judge complete alternatives, or neither for templates. */
export interface OfferContext {
  readonly key?: string;
  readonly context?: ExplorationContext;
}

/** A missing row has no type/state from which to enumerate alternatives.
 * Symbolic names resolve only through the supplied hypothetical view. */
export function actOffers<D extends DeclaredDefinition>(definition: ValidDefinition,
  view: StateView | ActView<D>, ref: ActRef, form: FormContext, input: OfferContext = {}): readonly ActOffer<D, Kind<D>>[] {
  const keyed = Object.hasOwn(input, "key"), checked = Object.hasOwn(input, "context");
  if (keyed !== checked) throw new TypeError("offer key and checked context must be supplied together");
  let judgment: { key: string; context: ExplorationContext } | null = null;
  if (keyed) {
    const { key, context } = input;
    if (key === undefined || context === undefined) throw new TypeError("offer key and checked context must be supplied together");
    judgment = { key, context };
  }
  // As in actExplore, the checked caller associates these literals with the
  // actual compiled definition. Keep its object and digest unchanged.
  const data = definition.declared as D;
  const row = "all" in view ? (() => {
    const item = typeof ref.name === "number" ? view.item(ref.name) : null;
    return item ? presentActRows(data, [item], held => ({ name: held.id, seen: held.revision, assumes: [] }),
      held => held, () => null).row(ref.name) : null;
  })() : view.row(ref.name);
  if (!row) return [];
  return actsOn(data, row.type, row.state).map(kind => {
    const described = actTemplate(data, kind, ref.name, form);
    const template = { ...described, act: { ...described.act, expected: { on: ref.seen } } };
    if (!judgment || missingActInputs(data, template.act).length > 0) return { template };
    const { key, context } = judgment;
    return { template, exploration: actExplore<D, typeof kind>(definition, view, { key, context, act: template.act }) };
  });
}
