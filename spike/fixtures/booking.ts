// The Booking package: the field-split-plus-time shape of the views note
// (cliffs 4 and 6), on the split schema of spike plan §4.1.
//
// A booker's request is private to the booker and the admin it names; the
// booking id is the content id of the request. The admin publishes the
// public fact, an occupancy naming that id, to every member. One rule
// spans the partitions: no two live occupancies overlap. Expiry comes
// from an ambient clock, `dap.observe{fact: {clock}}`, folded because the
// model declares `ambient: true`.
//
// The fold runs over each participant's own view, so its state holds only
// what that participant could read. Every rule below therefore reads only
// facts that every reader of the judged event necessarily saw:
//
// - `overlap`, `duplicate_id`, `no_such_occupancy` and `already_free` read
//   occupancies, frees and clock ticks. All three are members kinds, so a
//   member who joins later holds only their headers. The model declares a
//   dependency for newcomers (`config.joinDisclosure`, a design choice in
//   the baseline, not a fix): on every join, the admin discloses to the
//   newcomer every effective occupancy, free and clock tick recorded
//   before the join. Occupancies and frees carry no booker and no purpose,
//   and the clock carries nothing private, so the disclosure stays inside
//   the privacy budget. Without the clock a disclosed occupancy would look
//   unexpired to the newcomer and the overlap verdict would diverge.
// - `not_booker` and `already_cancelled` read requests and cancels, which
//   are private to the booker and the admin. A cancel's readers are its
//   actor and the admin it names; the request it cancels is readable by
//   its booker and the admin it names. A reader who cannot see a request
//   carrying the id is, by construction, not its booker, so an unknown id
//   is `not_booker` and reads the same everywhere the two admins agree.
// - Time only moves forward under the domain; the fold takes the maximum
//   of the ticks it has seen, so it never depends on their order.
// - A client, not the model, decides what to disclose. The model declares
//   which kinds a client may disclose beyond their audience
//   (`config.disclosurePolicy`, fix 1): occupancies, frees, clock ticks
//   and attaches. Requests and cancels carry the booker and the purpose,
//   whose readers the privacy budget fixes at the booker and the admin.
//   Fix 2 also requires an authorized verdict before client disclosure:
//   an unauthorized public-kind attempt has an actor-only initial audience.
//
// The projection derives every row from the position of the event that
// produced it and shows it only when that position is visible to the
// principal. Requests go only to their booker and the admin they name;
// occupancies never carry a booker or a purpose.

import { descriptorId, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
import { MEMBERS, named, type EventBody } from '../src/types.ts';

const NS = 'com.example.booking.';
/** The system kind of an ambient fact; the clock arrives as `{fact: {clock}}`. */
const OBSERVE = 'ai.generalbusiness.dap.observe';
/** The system kind that installs a package; part of any disclosure's dependency closure. */
const ATTACH = 'ai.generalbusiness.dap.attach';

export interface BookingRequest {
  /** the booking id: the content id of the request event */
  id: string;
  booker: string;
  /** the admin the booker addressed, as the audience rule read it */
  admin: string;
  room: string;
  start: number;
  end: number;
  purpose: string;
  position: number;
}

export interface Occupancy {
  id: string;
  room: string;
  start: number;
  end: number;
  position: number;
}

export interface Cancel {
  id: string;
  position: number;
}

export interface Free {
  id: string;
  position: number;
}

export interface Tick {
  position: number;
  clock: number;
}

export interface BookingState {
  /** the latest clock folded, or null before the first tick */
  now: number | null;
  /** every effective clock tick, in position order */
  ticks: Tick[];
  /** effective requests, in position order; at most one per id */
  requests: BookingRequest[];
  /** effective cancels, in position order; at most one per id */
  cancels: Cancel[];
  /** effective occupancies, in position order; at most one per id, ever */
  occupancies: Occupancy[];
  /** effective frees, in position order; at most one per id */
  frees: Free[];
}

/**
 * The model's declared dependency for newcomers (views note cliff 3). A
 * member who joins after an occupancy, a free or a clock tick was
 * recorded must judge later publications and frees as the oracle does,
 * and nothing they can read says the earlier facts exist. So on every
 * join, the admin discloses to the newcomer every effective event of
 * these kinds recorded before the join. The harness honours this; the
 * model cannot emit `dap.disclose` itself.
 */
export type BookingConfig = {
  room: string;
  joinDisclosure: {
    by: 'admin';
    kinds: string[];
    effectiveOnly: true;
  };
  /**
   * The model's declared disclosure policy (fix 1): the kinds a client may
   * disclose beyond their audience. Occupancies, frees and clock ticks are
   * public facts; an attach is part of any disclosure's dependency closure
   * (design note §8). Requests and cancels are never on the list: a client
   * that discloses one widens the booker and the purpose past the budget.
   */
  disclosurePolicy: {
    kinds: string[];
    authorizedOnly: true;
  };
};

type OccupancyStatus = 'active' | 'expired' | 'freed';
type RequestStatus = 'pending' | 'published' | 'cancelled';
type Visible = (position: number) => boolean;

/** In the fold, everything in the state was read; only observe narrows. */
const everything: Visible = () => true;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isId(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0;
}

/** A half-open interval `[start, end)` in integer ticks. */
function isInterval(start: unknown, end: unknown): boolean {
  return Number.isInteger(start) && Number.isInteger(end) && (start as number) < (end as number);
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

/** The latest clock among the visible ticks, or null. */
function nowOf(state: BookingState, visible: Visible): number | null {
  let now: number | null = null;
  for (const t of state.ticks) if (visible(t.position) && (now === null || t.clock > now)) now = t.clock;
  return now;
}

function occupancyOf(state: BookingState, id: string): Occupancy | undefined {
  return state.occupancies.find((o) => o.id === id);
}

function freeOf(state: BookingState, id: string, visible: Visible): Free | undefined {
  return state.frees.find((f) => f.id === id && visible(f.position));
}

function cancelOf(state: BookingState, id: string, visible: Visible): Cancel | undefined {
  return state.cancels.find((c) => c.id === id && visible(c.position));
}

function requestOf(state: BookingState, id: string): BookingRequest | undefined {
  return state.requests.find((r) => r.id === id);
}

/** An occupancy's status under this visibility: an explicit free stands over expiry. */
function occupancyStatus(state: BookingState, o: Occupancy, now: number | null, visible: Visible): OccupancyStatus {
  if (freeOf(state, o.id, visible)) return 'freed';
  if (now !== null && now >= o.end) return 'expired';
  return 'active';
}

/** A request's status under this visibility: the booker's cancel stands over a publication. */
function requestStatus(state: BookingState, r: BookingRequest, visible: Visible): RequestStatus {
  if (cancelOf(state, r.id, visible)) return 'cancelled';
  const o = occupancyOf(state, r.id);
  if (o && visible(o.position)) return 'published';
  return 'pending';
}

/** Whether an occupancy occupies the room at the fold's frontier: neither freed nor expired. */
function occupies(state: BookingState, o: Occupancy): boolean {
  return occupancyStatus(state, o, state.now, everything) === 'active';
}

function refuse(state: BookingState, reason: string) {
  return { effective: false, state, reason };
}

export const bookingModel: ModelSpec<BookingState, BookingConfig> = {
  id: 'booking',
  config: {
    room: 'room-1',
    joinDisclosure: { by: 'admin', kinds: [NS + 'occupancy', NS + 'free', OBSERVE], effectiveOnly: true },
    disclosurePolicy: { kinds: [NS + 'occupancy', NS + 'free', OBSERVE, ATTACH], authorizedOnly: true },
  },
  ambient: true,
  init: () => ({ now: null, ticks: [], requests: [], cancels: [], occupancies: [], frees: [] }),
  roles: {
    Admin: [NS + 'publish'],
    Booker: [NS + 'request'],
  },
  fold(state, event: EventBody, ctx, config) {
    const kind = event.kind;
    if (kind !== OBSERVE && kind !== NS + 'request' && kind !== NS + 'occupancy' && kind !== NS + 'cancel_request' && kind !== NS + 'free') {
      return refuse(state, 'unhandled');
    }
    const p = event.payload;
    if (!isRecord(p)) return refuse(state, 'malformed');

    switch (kind) {
      case OBSERVE: {
        // The clock. A fact that is not a clock is another model's business.
        if (!isRecord(p.fact)) return refuse(state, 'malformed');
        if (!('clock' in p.fact)) return refuse(state, 'unhandled');
        const clock = p.fact.clock;
        if (!Number.isInteger(clock) || (clock as number) < 0) return refuse(state, 'malformed');
        const now = state.now === null || (clock as number) > state.now ? (clock as number) : state.now;
        return { effective: true, state: { ...state, now, ticks: [...state.ticks, { position: ctx.position, clock: clock as number }] } };
      }
      case NS + 'request': {
        if (p.room !== config.room || !isInterval(p.start, p.end) || typeof p.purpose !== 'string' || typeof p.admin !== 'string') return refuse(state, 'malformed');
        // The booking id is the content id of this event; it is unique by construction.
        if (requestOf(state, ctx.id)) return refuse(state, 'malformed');
        const r: BookingRequest = {
          id: ctx.id,
          booker: event.actor,
          admin: p.admin,
          room: p.room,
          start: p.start as number,
          end: p.end as number,
          purpose: p.purpose,
          position: ctx.position,
        };
        return { effective: true, state: { ...state, requests: [...state.requests, r] } };
      }
      case NS + 'occupancy': {
        if (!isId(p.booking_id) || p.room !== config.room || !isInterval(p.start, p.end)) return refuse(state, 'malformed');
        // Public state alone: whether a request exists is not a precondition.
        if (occupancyOf(state, p.booking_id)) return refuse(state, 'duplicate_id');
        const o: Occupancy = { id: p.booking_id, room: p.room, start: p.start as number, end: p.end as number, position: ctx.position };
        if (state.occupancies.some((x) => x.room === o.room && occupies(state, x) && overlaps(x, o))) return refuse(state, 'overlap');
        return { effective: true, state: { ...state, occupancies: [...state.occupancies, o] } };
      }
      case NS + 'cancel_request': {
        if (!isId(p.booking_id) || typeof p.admin !== 'string') return refuse(state, 'malformed');
        // A reader who cannot see a request carrying the id is not its booker.
        const r = requestOf(state, p.booking_id);
        if (!r || r.booker !== event.actor) return refuse(state, 'not_booker');
        if (cancelOf(state, r.id, everything)) return refuse(state, 'already_cancelled');
        return { effective: true, state: { ...state, cancels: [...state.cancels, { id: r.id, position: ctx.position }] } };
      }
      case NS + 'free': {
        if (!isId(p.booking_id)) return refuse(state, 'malformed');
        const o = occupancyOf(state, p.booking_id);
        if (!o) return refuse(state, 'no_such_occupancy');
        if (freeOf(state, o.id, everything)) return refuse(state, 'already_free');
        return { effective: true, state: { ...state, frees: [...state.frees, { id: o.id, position: ctx.position }] } };
      }
      default:
        return refuse(state, 'unhandled');
    }
  },
  observe(p, state, ctx) {
    const visible = ctx.visible;
    const now = nowOf(state, visible);
    const occupancies = state.occupancies
      .filter((o) => visible(o.position))
      .map((o) => ({ id: o.id, room: o.room, start: o.start, end: o.end, position: o.position, status: occupancyStatus(state, o, now, visible) }));
    const requests = state.requests
      .filter((r) => visible(r.position) && (p === r.booker || p === r.admin))
      .map((r) => ({
        id: r.id,
        room: r.room,
        start: r.start,
        end: r.end,
        purpose: r.purpose,
        booker: r.booker,
        position: r.position,
        status: requestStatus(state, r, visible),
      }));
    return { now, occupancies, requests };
  },
  affordances(p, state, ctx) {
    const visible = ctx.visible;
    const out: string[] = [];
    if (ctx.holds(NS + 'request')) {
      out.push(NS + 'request');
      const mine = state.requests.filter((r) => visible(r.position) && r.booker === p && requestStatus(state, r, visible) !== 'cancelled');
      if (mine.length > 0) out.push(NS + 'cancel_request');
    }
    if (ctx.holds(NS + 'publish')) {
      out.push(NS + 'occupancy');
      const unfreed = state.occupancies.filter((o) => visible(o.position) && !freeOf(state, o.id, visible));
      if (unfreed.length > 0) out.push(NS + 'free');
    }
    return out.sort();
  },
};

/** A booker's private events name the admin, so the audience can. */
function bookerAndAdmin(_: unknown, ev: EventBody) {
  return named(ev.actor, (ev.payload as { admin?: string }).admin ?? ev.actor);
}
const membersAudience = () => MEMBERS;

const base: Omit<PackageDescriptor, 'id'> = {
  name: 'com.example.booking',
  module: import.meta.url,
  models: { booking: bookingModel as unknown as ModelSpec },
  capabilities: [NS + 'request', NS + 'publish'],
  kinds: {
    [NS + 'request']: { kind: NS + 'request', schema: { room: 'string', start: 'integer', end: 'integer', purpose: 'string', admin: 'string' }, handlers: ['booking'], audienceId: 'booker+admin', audience: bookerAndAdmin, capability: NS + 'request' },
    [NS + 'occupancy']: { kind: NS + 'occupancy', schema: { booking_id: 'string', room: 'string', start: 'integer', end: 'integer' }, handlers: ['booking'], audienceId: 'members', audience: membersAudience, capability: NS + 'publish' },
    [NS + 'cancel_request']: { kind: NS + 'cancel_request', schema: { booking_id: 'string', admin: 'string' }, handlers: ['booking'], audienceId: 'booker+admin', audience: bookerAndAdmin, capability: NS + 'request' },
    [NS + 'free']: { kind: NS + 'free', schema: { booking_id: 'string' }, handlers: ['booking'], audienceId: 'members', audience: membersAudience, capability: NS + 'publish' },
  },
};

export const bookingPackage: PackageDescriptor = { id: descriptorId(base), ...base };
export const BOOKING = NS;
