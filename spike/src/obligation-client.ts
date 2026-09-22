// A conforming fixture client, separate from the fold. It reads only the
// performer's view and interpreted state; no oracle or private other view.
import type { Json } from './canon.ts';
import type { Context } from './context.ts';
import { holdsObligationRole } from './foundation.ts';
import { interpretView } from './interpret.ts';
import { observe } from './observe.ts';
import type { ObligationRecord } from './descriptor.ts';

export function obligationPerformance(ctx: Context, actor: string, owed: ObligationRecord): Json | undefined {
  const view = ctx.view(actor);
  const interpreted = interpretView(actor, view, ctx.head, ctx.packages);
  if (interpreted.kind !== 'interpreted') return undefined;
  const state = interpreted.state;
  const card = state.obligations.find((o) => o.id === owed.id && o.status === 'open');
  if (!card || !holdsObligationRole(state, actor, card)) return undefined;
  const input = card.act.input as Record<string, Json>;
  if (input.recipe === 'backlog') {
    const kinds = input.kinds as string[];
    const positions = view.filter((v) => v.position < (input.before as number) && v.event && kinds.includes(v.event.kind) && state.verdicts[v.position]?.effective).map((v) => v.position);
    return { positions, to: [input.to], obligation: card.id };
  }
  if (input.recipe === 'grant-target') {
    const target = view.find((v) => v.event && v.header.commitment === input.target);
    return target?.event ? { principal: target.event.actor, roles: ['Member'], obligation: card.id } : undefined;
  }
  return { ...input, obligation: card.id };
}

/** Called between fixture steps, never by foldEntry. */
export function performObligations(ctx: Context): void {
  for (const actor of [...ctx.state.participants]) {
    const view = ctx.view(actor);
    const interpreted = interpretView(actor, view, ctx.head, ctx.packages);
    if (interpreted.kind !== 'interpreted') continue;
    const obs = observe(interpreted.state, actor, ctx.head, (i) => !!view[i]?.event);
    for (const id of obs.obligationAffordances ?? []) {
      const card = obs.obligations!.find((o) => o.id === id)!;
      if (!obs.affordances.includes(card.act.kind)) continue;
      const payload = obligationPerformance(ctx, actor, card);
      if (payload) ctx.act(actor, card.act.kind, payload, { nonce: 'obligation:' + (ctx.head + 1) });
    }
  }
}
