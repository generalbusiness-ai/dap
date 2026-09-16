// The run-2 readable-events guard, preserved before the V4-F1/F2 amendment.
import type { Observation } from '../../../src/observe.ts';
import type { EventBody, Principal } from '../../../src/types.ts';
import { BOOKING } from '../../../fixtures/booking.ts';

/** The parties who may read a private Booking event, from recorded facts: the booker (its actor) and the admin. */
export function privateParties(view: readonly { position: number; event?: EventBody }[], i: number, admin: Principal): Principal[] | undefined {
  const ev = view[i]?.event;
  if (!ev) return undefined;
  if (ev.kind === BOOKING + 'request' || ev.kind === BOOKING + 'cancel_request') return [ev.actor, admin];
  return undefined;
}

/**
 * Violations of the privacy budget: on what p can actually read, a request
 * or cancel whose parties (its booker and the admin) do not include p; and
 * on the projection, others' requests, or a booker or purpose on an
 * occupancy.
 */
export function bookingBudgetViolations(obs: Observation, p: Principal, admin: Principal, view: readonly { position: number; event?: EventBody }[] = []): string[] {
  const out: string[] = [];
  for (const v of view) {
    if (!v.event) continue;
    const parties = privateParties(view, v.position, admin);
    if (parties && !parties.includes(p)) out.push(`${p} can read the ${v.event.kind.replace(/^com\.example\./, '')} at ${v.position}, whose parties are ${parties.join('+')}`);
  }
  const b = obs.models['booking'] as { occupancies?: Record<string, unknown>[]; requests?: { booker?: string; id?: string; position?: number }[] } | undefined;
  for (const o of b?.occupancies ?? []) {
    if ('purpose' in o || 'booker' in o) out.push(`${p} sees a booker or purpose on the occupancy at ${String(o['position'])}`);
  }
  if (p !== admin) {
    for (const r of b?.requests ?? []) if (r.booker !== p) out.push(`${p} sees the request at ${r.position} by ${r.booker}`);
  }
  return out;
}

