// The consistency checker (views note, What the spike tests).
//
// For every participant and frontier: on an interpreted result,
// observe(p, I(p, V(p,n), n)) must equal observe(p, fold(S[0..n]), n); on
// a paused result, `last` must equal the oracle through at-1 under the
// same basis, and equality must resume once the missing dependency is
// supplied. Invariants are declared independently of any fold and are
// evaluated on the oracle's state. A failing series is shrunk to a
// deletion-minimal one, and the mutation runner confirms the checker
// finds a planted audience bug.

import { isDeepStrictEqual } from 'node:util';
import type { Context } from './context.ts';
import { descriptorId, type PackageDescriptor } from './descriptor.ts';
import type { FoundationState } from './foundation.ts';
import { interpretView, type Interpreted } from './interpret.ts';
import { observe, type Observation } from './observe.ts';
import { foldPrefix, oracleObserve } from './oracle.ts';
import type { Entry, Principal } from './types.ts';

export interface Violation {
  participant: Principal;
  frontier: number;
  kind: 'mismatch' | 'pause_rule' | 'pause_resume' | 'invariant' | 'budget';
  detail: string;
  expected?: Observation;
  actual?: Observation;
}

export interface CheckOptions {
  participants?: Principal[];
  /** what each participant's client can fetch; default: everything the context knows */
  available?: (p: Principal) => Record<string, PackageDescriptor>;
  /** invariants over the oracle's state and the recorded entries, declared independently of the folds */
  invariants?: (state: FoundationState, frontier: number, entries: readonly Entry[]) => string[];
  /** a privacy budget over the oracle's observation for a principal, declared independently of the folds */
  budget?: (obs: Observation, p: Principal, frontier: number) => string[];
  /** frontiers to check; default: every position */
  frontiers?: number[];
}

function viewVisibility(view: { event?: unknown }[]): (i: number) => boolean {
  return (i) => view[i]?.event !== undefined;
}

/** Observe an interpreted result: the projection over the interpreter's own state, with the view's own visibility. */
export function observeInterpreted(r: Interpreted, view: { event?: unknown }[]): Observation {
  return observe(r.state, r.principal, r.basis, viewVisibility(view));
}

export function checkContext(ctx: Context, opts: CheckOptions = {}): Violation[] {
  const participants = opts.participants ?? [...ctx.state.participants];
  const available = opts.available ?? (() => ctx.packages);
  const frontiers = opts.frontiers ?? Array.from({ length: ctx.head + 1 }, (_, i) => i);
  const out: Violation[] = [];
  for (const n of frontiers) {
    if (opts.invariants) {
      const s = foldPrefix(ctx, n);
      for (const detail of opts.invariants(s, n, ctx.entries)) out.push({ participant: '*', frontier: n, kind: 'invariant', detail });
    }
    for (const p of participants) {
      const view = ctx.view(p, n);
      const r = interpretView(p, view, n, available(p));
      if (opts.budget) {
        for (const detail of opts.budget(oracleObserve(ctx, p, n, n), p, n)) out.push({ participant: p, frontier: n, kind: 'budget', detail });
      }
      if (r.kind === 'interpreted') {
        const actual = observeInterpreted(r, view);
        const expected = oracleObserve(ctx, p, n, n);
        if (!isDeepStrictEqual(actual, expected)) out.push({ participant: p, frontier: n, kind: 'mismatch', detail: `observe differs at ${n}`, expected, actual });
      } else {
        // Pause rule: last equals the oracle through at-1 under basis n.
        const actual = observeInterpreted(r.last, view);
        const expected = oracleObserve(ctx, p, r.at - 1, n);
        if (!isDeepStrictEqual(actual, expected)) out.push({ participant: p, frontier: n, kind: 'pause_rule', detail: `paused at ${r.at} (${r.reason}); last differs from the oracle through ${r.at - 1}`, expected, actual });
        // Resume: with everything available, equality holds at n.
        if (r.reason === 'package_unavailable') {
          const resumed = interpretView(p, view, n, ctx.packages);
          if (resumed.kind !== 'interpreted') {
            out.push({ participant: p, frontier: n, kind: 'pause_resume', detail: `still paused at ${resumed.at} (${resumed.reason}) with every package available` });
          } else {
            const a2 = observeInterpreted(resumed, view);
            const e2 = oracleObserve(ctx, p, n, n);
            if (!isDeepStrictEqual(a2, e2)) out.push({ participant: p, frontier: n, kind: 'pause_resume', detail: `after resume, observe differs at ${n}`, expected: e2, actual: a2 });
          }
        }
      }
    }
  }
  return out;
}

/** A package with one kind's audience policy replaced: the mutation runner's planted bug. It is a new package with its own identity and no pinned module. */
export function withAudience(pkg: PackageDescriptor, kind: string, audienceId: string, audience: PackageDescriptor['kinds'][string]['audience']): PackageDescriptor {
  const { id: _id, module: _module, ...surface } = pkg;
  const kinds = { ...surface.kinds, [kind]: { ...surface.kinds[kind]!, audienceId, audience } };
  const base: Omit<PackageDescriptor, 'id'> = { ...surface, kinds };
  return { id: descriptorId(base), ...base };
}
