// observe(p, state, n): the projection the property compares (design note
// §1; views note, The property). It is declared by each model separately
// from its fold, and computed here for a whole foundation state: the
// foundation's own public facts, each model's projection for the
// principal, and the affordances the principal holds.

import type { Json } from './canon.ts';
import { own, setOwn, bindingIdOf, findModel, visibleBinding, type ObserveCtx, type ObligationRecord } from './descriptor.ts';
import { K, SYSTEM_KINDS, holdsNow, holdsObligationRole, obligationEnabled, type FoundationState } from './foundation.ts';
import type { Principal } from './types.ts';

export interface Observation {
  participants: Principal[];
  closed: boolean;
  /** kinds bound in the environment the principal can resolve */
  kinds: string[];
  /** the expected-binding identity of each such kind: the semantics the principal would judge an event by */
  bindings: Record<string, string>;
  /**
   * The outcome of every event the principal can see: the verdict, and
   * the per-handler outcome for each handler of the binding the principal
   * resolves (design note §3: effectiveness is per handling model).
   */
  outcomes: Record<string, { effective: boolean; reason: string | null; perModel?: Record<string, { effective: boolean; reason: string | null }> }>;
  models: Record<string, Json>;
  affordances: string[];
  obligations?: ObligationRecord[];
  obligationAffordances?: string[];
}

export interface VisibilityFn {
  (position: number): boolean;
}

export function observeCtx(state: FoundationState, p: Principal, basis: number, visible: VisibilityFn): ObserveCtx {
  return {
    principal: p,
    basis,
    members: [...state.participants],
    visible,
    holds: (cap) => holdsNow(state, p, cap),
  };
}

/** The system kinds the principal may emit now: those whose capability they hold. */
export function foundationAffordances(state: FoundationState, p: Principal): string[] {
  const out: string[] = [];
  for (const [kind, row] of Object.entries(SYSTEM_KINDS)) {
    if (kind === K.genesis || kind === K.accept_invite || kind === K.scope_activate || kind === K.seq_assign || kind === K.seq_seal) continue;
    if (row.requires && holdsNow(state, p, row.requires)) out.push(kind);
  }
  return out.sort();
}

/** The kind recorded at a position, from the foundation's own record of kinds. */
function kindAt(state: FoundationState, i: number): string | undefined {
  return state.kindsAt[i];
}

/** Whether the principal can see the attach that installed a package, so the package is part of their environment. */
function packageVisible(state: FoundationState, pkgId: string, visible: VisibilityFn): boolean {
  const at = own(state.env.attachedAt, pkgId);
  return at !== undefined && visible(at);
}

/** The application kinds the principal may emit now, by the models' own rule or the default capability rule. */
export function modelAffordances(state: FoundationState, p: Principal, ctx: ObserveCtx): string[] {
  const out = new Set<string>();
  if (state.closed) return [];
  // Handlers and capability contracts come from the binding the principal resolves, never from
  // an attach they cannot see, so bindings, models and affordances share one view-specific environment.
  const byModel = new Map<string, { kind: string; capability?: string }[]>();
  for (const kind of Object.keys(state.env.kinds)) {
    const b = visibleBinding(state.env, kind, ctx.visible);
    if (!b || !packageVisible(state, b.packageId, ctx.visible)) continue;
    for (const h of b.handlers) byModel.set(h, [...(byModel.get(h) ?? []), { kind, capability: b.capability }]);
  }
  for (const [modelId, kinds] of byModel) {
    const model = findModel(state.env, modelId);
    if (!model) continue;
    const mstate = own(state.models, modelId) ?? model.init(model.config);
    if (model.affordances) {
      for (const k of model.affordances(p, mstate, ctx, model.config)) out.add(k);
    } else {
      for (const { kind, capability } of kinds) if (!capability || ctx.holds(capability)) out.add(kind);
    }
  }
  return [...out].sort();
}

/** observe(p, state, n) under the given visibility. */
export function observe(state: FoundationState, p: Principal, basis: number, visible: VisibilityFn): Observation {
  const ctx = observeCtx(state, p, basis, visible);
  const models: Record<string, Json> = {};
  for (const pkg of state.env.packages) {
    // A package whose attach the principal cannot see is not in their environment.
    if (!packageVisible(state, pkg.id, visible)) continue;
    for (const m of Object.values(pkg.models)) {
      const mstate = own(state.models, m.id) ?? m.init(m.config);
      setOwn(models, m.id, m.observe ? m.observe(p, mstate, ctx, m.config) : mstate);
    }
  }
  const kinds = Object.keys(state.env.kinds).filter((k) => packageVisible(state, state.env.kinds[k]!.packageId, visible)).sort();
  const bindings: Record<string, string> = {};
  for (const k of kinds) {
    const b = visibleBinding(state.env, k, visible);
    if (b) setOwn(bindings, k, bindingIdOf(state.env, k, b));
  }
  const outcomes: Observation['outcomes'] = {};
  for (let i = 0; i < state.verdicts.length; i++) {
    const v = state.verdicts[i];
    if (!v || !visible(i)) continue;
    const entry: Observation['outcomes'][string] = { effective: v.effective, reason: v.reason ?? null };
    if (v.perModel) {
      // per-handler outcomes, restricted to the handlers of the binding this principal resolves for that kind
      const kind = kindAt(state, i);
      const b = kind ? visibleBinding(state.env, kind, visible) : undefined;
      const handlers = new Set(b?.handlers ?? Object.keys(v.perModel));
      entry.perModel = {};
      for (const [h, r] of Object.entries(v.perModel)) if (handlers.has(h)) setOwn(entry.perModel, h, { effective: r.effective, reason: r.reason ?? null });
    }
    outcomes[String(i)] = entry;
  }
  return {
    participants: [...state.participants],
    closed: state.closed,
    kinds,
    bindings,
    outcomes,
    models,
    affordances: [...new Set([...foundationAffordances(state, p), ...modelAffordances(state, p, ctx)])]
      .filter((kind) => !state.obligations.some((o) => visible(o.source) && o.status !== 'fulfilled' && o.blocks.includes(kind))).sort(),
    ...(obligationEnabled(state) ? {
      obligations: state.obligations.filter((o) => visible(o.source)).map((o) => structuredClone(o)),
      obligationAffordances: state.obligations.filter((o) => visible(o.source) && o.status === 'open' && holdsObligationRole(state, p, o)).map((o) => o.id),
    } : {}),
  };
}
