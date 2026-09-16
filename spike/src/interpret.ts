// The view interpreter I(p, V(p,n), n) (design note §1; views note, The
// property; spike plan simplification 2).
//
// Cold replay from genesis over the principal's view under basis n. The
// interpreter never sees a hidden payload: hidden positions enter as
// headers and leave a placeholder. It pauses when a package it needs is
// not available, or when a disclosed position depends on semantics it
// cannot resolve; a pause carries `last`, the result through the position
// before, under the same basis. The pause is a diagnostic, never a
// verdict on any event.

import type { PackageDescriptor } from './descriptor.ts';
import { bindingId } from './descriptor.ts';
import { K, foldEntry, initialFoundationState, originsCount, type AttachPayload, type FoundationState } from './foundation.ts';
import type { ViewEntry } from './context.ts';
import { SYSTEM_PREFIX, named, type Entry, type Principal, type Verdict } from './types.ts';

export interface Interpreted {
  kind: 'interpreted';
  principal: Principal;
  basis: number;
  /** the last position installed */
  frontier: number;
  state: FoundationState;
  /** one verdict per position; hidden positions carry a placeholder */
  outcomes: Verdict[];
  /** the expected-binding identity of every kind the principal can resolve */
  bindings: Record<string, string>;
}

export interface Paused {
  kind: 'paused';
  principal: Principal;
  basis: number;
  at: number;
  reason: 'package_unavailable' | 'dependency_missing';
  /** the interpreted result through at-1 under the same basis */
  last: Interpreted;
}

export type Interpretation = Interpreted | Paused;

const HIDDEN: Verdict = { known: false, authorized: false, effective: false, reason: 'hidden' };

function asEntry(v: ViewEntry): Entry {
  if (!v.event) throw new Error(`position ${v.position} is hidden`);
  return { position: v.position, event: v.event, id: v.header.commitment, header: v.header, headerHash: v.headerHash };
}

/** Entries as the fold needs them for chain verification: id and header hash for every position, event only where visible. */
function chainOf(view: ViewEntry[]): Entry[] {
  return view.map((v) => ({
    position: v.position,
    event: v.event ?? { kind: 'hidden', payload: null, actor: '', nonce: '' },
    id: v.header.commitment,
    header: v.header,
    headerHash: v.headerHash,
  }));
}

function bindingsOf(state: FoundationState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(state.env.kinds).sort()) out[k] = bindingId(state.env, k)!;
  return out;
}

/**
 * Interpret a view. `available` is what the principal's client can fetch;
 * `limit` interprets a prefix (used for `last`).
 */
export function interpretView(p: Principal, view: ViewEntry[], basis: number, available: Record<string, PackageDescriptor>, limit: number = view.length - 1): Interpretation {
  const genesis = view[0];
  if (!genesis?.event) throw new Error('the genesis is always visible');
  const state = initialFoundationState(genesis.header.commitment);
  const chain = chainOf(view);
  const origins = originsCount(genesis.event);
  const outcomes: Verdict[] = [];

  const paused = (at: number, reason: Paused['reason']): Paused => ({
    kind: 'paused',
    principal: p,
    basis,
    at,
    reason,
    last: interpretView(p, view, basis, available, at - 1) as Interpreted,
  });

  for (let i = 0; i <= limit && i < view.length; i++) {
    const v = view[i]!;
    if (!v.event) {
      // A hidden position: header only. It occupies its place and reveals nothing.
      state.audiences[i] = named();
      state.membersAt[i] = [...state.participants];
      state.verdicts[i] = HIDDEN;
      outcomes[i] = HIDDEN;
      continue;
    }
    const ev = v.event;
    // Pauses are decided before the position is installed.
    if (ev.kind === K.attach && i > 0) {
      const pkg = (ev.payload as unknown as AttachPayload)?.package;
      if (typeof pkg === 'string' && !available[pkg]) return paused(i, 'package_unavailable');
    }
    if (i === 0) {
      const gp = ev.payload as unknown as { bindings?: { package: string }[] };
      for (const b of gp.bindings ?? []) if (!available[b.package]) return paused(i, 'package_unavailable');
    }
    if (v.via === 'disclosure' && !ev.kind.startsWith(SYSTEM_PREFIX) && !state.env.kinds[ev.kind]) {
      // Disclosed, but the semantics it needs were not: the disclosure was dependency-incomplete.
      return paused(i, 'dependency_missing');
    }
    const origin = i > 0 && i <= origins;
    const verdict = foldEntry(state, { entry: asEntry(v), origin, packages: available, entries: chain });
    outcomes[i] = verdict;
  }
  return { kind: 'interpreted', principal: p, basis, frontier: Math.min(limit, view.length - 1), state, outcomes, bindings: bindingsOf(state) };
}

/** A cached interpretation is valid only under the basis it was built for (views note: an invalidated cache is discarded and rebuilt). */
export interface InterpretationCache {
  basis: number;
  frontier: number;
  result: Interpretation;
}

export function interpretCached(
  cache: InterpretationCache | undefined,
  p: Principal,
  view: ViewEntry[],
  basis: number,
  available: Record<string, PackageDescriptor>,
): { result: Interpretation; reused: boolean; cache: InterpretationCache } {
  const frontier = view.length - 1;
  if (cache && cache.basis === basis && cache.frontier === frontier) return { result: cache.result, reused: true, cache };
  const result = interpretView(p, view, basis, available);
  return { result, reused: false, cache: { basis, frontier, result } };
}
