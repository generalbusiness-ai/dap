// observe(p, state, n): the projection the property compares (design note
// §1; views note, The property). It is declared by each model separately
// from its fold, and computed here for a whole foundation state: the
// foundation's own public facts, each model's projection for the
// principal, and the affordances the principal holds.

import type { Json } from './canon.ts';
import { bindingIdOf, findModel, visibleBinding, type ObserveCtx } from './descriptor.ts';
import { K, SYSTEM_KINDS, holdsNow, type FoundationState } from './foundation.ts';
import type { Principal } from './types.ts';

export interface Observation {
  participants: Principal[];
  closed: boolean;
  /** kinds bound in the environment the principal can resolve */
  kinds: string[];
  /** the expected-binding identity of each such kind: the semantics the principal would judge an event by */
  bindings: Record<string, string>;
  /** the outcome of every event the principal can see: effective or not, and why */
  outcomes: Record<string, { effective: boolean; reason: string | null }>;
  models: Record<string, Json>;
  affordances: string[];
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

/** Whether the principal can see the attach that installed a package, so the package is part of their environment. */
function packageVisible(state: FoundationState, pkgId: string, visible: VisibilityFn): boolean {
  const at = state.env.attachedAt[pkgId];
  return at !== undefined && visible(at);
}

/** The application kinds the principal may emit now, by the models' own rule or the default capability rule. */
export function modelAffordances(state: FoundationState, p: Principal, ctx: ObserveCtx): string[] {
  const out = new Set<string>();
  if (state.closed) return [];
  const byModel = new Map<string, string[]>();
  for (const [kind, b] of Object.entries(state.env.kinds)) {
    if (!packageVisible(state, b.packageId, ctx.visible)) continue;
    for (const h of b.handlers) byModel.set(h, [...(byModel.get(h) ?? []), kind]);
  }
  for (const [modelId, kinds] of byModel) {
    const model = findModel(state.env, modelId);
    if (!model) continue;
    const mstate = state.models[modelId] ?? model.init(model.config);
    if (model.affordances) {
      for (const k of model.affordances(p, mstate, ctx, model.config)) out.add(k);
    } else {
      for (const k of kinds) {
        const cap = state.env.kinds[k]!.capability;
        if (!cap || ctx.holds(cap)) out.add(k);
      }
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
      const mstate = state.models[m.id] ?? m.init(m.config);
      models[m.id] = m.observe ? m.observe(p, mstate, ctx, m.config) : mstate;
    }
  }
  const kinds = Object.keys(state.env.kinds).filter((k) => packageVisible(state, state.env.kinds[k]!.packageId, visible)).sort();
  const bindings: Record<string, string> = {};
  for (const k of kinds) {
    const b = visibleBinding(state.env, k, visible);
    if (b) bindings[k] = bindingIdOf(state.env, k, b);
  }
  const outcomes: Observation['outcomes'] = {};
  for (let i = 0; i < state.verdicts.length; i++) {
    const v = state.verdicts[i];
    if (!v || !visible(i)) continue;
    outcomes[String(i)] = { effective: v.effective, reason: v.reason ?? null };
  }
  return {
    participants: [...state.participants],
    closed: state.closed,
    kinds,
    bindings,
    outcomes,
    models,
    affordances: [...new Set([...foundationAffordances(state, p), ...modelAffordances(state, p, ctx)])].sort(),
  };
}
