// The oracle: fold(S[0..m]) over the complete series with every package
// available, and observe(p, state, n) under basis n (views note, The
// property). It is a specification oracle for the checker and is never
// available to a model or to a participant's client.

import type { Context } from './context.ts';
import { foldEntry, initialFoundationState, visibleTo, type FoundationState } from './foundation.ts';
import { observe, type Observation } from './observe.ts';
import type { Principal } from './types.ts';

/** Cold replay of the complete series through position m. */
export function foldPrefix(ctx: Context, m: number): FoundationState {
  const entries = ctx.entries;
  const state = initialFoundationState(ctx.genesisId);
  const origins = ctx.origins;
  for (let i = 0; i <= m && i < entries.length; i++) {
    foldEntry(state, { entry: entries[i]!, origin: i > 0 && i <= origins, packages: ctx.packages, entries });
  }
  return state;
}

/** observe(p, fold(S[0..m]), n): the full fold through m, observed by p under basis n. */
export function oracleObserve(ctx: Context, p: Principal, m: number, basis: number): Observation {
  const state = m === ctx.head ? ctx.state : foldPrefix(ctx, m);
  // Visibility under the basis comes from the audiences at each position and disclosures up to the basis.
  return observe(state, p, basis, (i) => i <= m && visibleTo(ctx.state, p, i, basis));
}
