// The Booking package: the kinds of the spike plan's §4.1 split schema,
// declared with their audiences, capability contracts and roles so that
// binding identities exist. This file is the predeclared surface; the
// fold, projection and affordances are V4's, authored by an agent from
// the manifest. Until then every event is unhandled.
//
// The clock is a designated actor holding `dap.observe`; the model opts
// in to ambient facts with `ambient: true`, and receives every effective
// `dap.observe` in its fold.

import { descriptorId, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
import { MEMBERS, named, type EventBody } from '../src/types.ts';

const NS = 'com.example.booking.';

export interface BookingState {
  // authored in V4
  placeholder?: true;
}

export const bookingModel: ModelSpec<BookingState, { room: string }> = {
  id: 'booking',
  config: { room: 'room-1' },
  ambient: true,
  init: () => ({}),
  roles: {
    Admin: [NS + 'publish'],
    Booker: [NS + 'request'],
  },
  fold(state, _event: EventBody) {
    return { effective: false, state, reason: 'unhandled' };
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
