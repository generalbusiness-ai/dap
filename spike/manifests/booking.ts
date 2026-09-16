// The machine-readable part of the Booking manifest (booking.md): bounds,
// seeds, the cast and base context, invariants over recorded events and
// verdicts, the privacy budget over observations, and the generator's
// payload builders including the clock. Nothing here reads the candidate
// model's state shape: the manifest is written independently of the
// fold and frozen before the baseline. The manifest identity binds the
// prose and this module; the package under test is cited beside it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contentId } from '../src/canon.ts';
import { descriptorId, moduleHash, type PackageDescriptor } from '../src/descriptor.ts';
import { CAP, K, heldAt, type FoundationState } from '../src/foundation.ts';
import type { GeneratorSpec } from '../src/generate.ts';
import type { Observation } from '../src/observe.ts';
import type { Script, Step } from '../src/script.ts';
import { MEMBERS, type Entry, type EventBody, type Principal } from '../src/types.ts';
import { BOOKING, bookingPackage } from '../fixtures/booking.ts';

export const bookingBounds = { maxParticipants: 6, maxPositions: 60, seeds: Array.from({ length: 200 }, (_, i) => i + 1) };
export const ROOM = 'room-1';

const proseUrl = new URL('./booking.md', import.meta.url);
export const BOOKING_PROSE = readFileSync(fileURLToPath(proseUrl), 'utf8');

/** The experiment identity: the prose and this module. The package under test is cited separately. */
export const BOOKING_MANIFEST_ID = contentId({ prose: contentId(BOOKING_PROSE), executable: moduleHash(import.meta.url) });

export function proseBounds(): { maxParticipants: number; maxPositions: number; seeds: number[] } {
  const m = /At most (\d+) participants, at most (\d+) positions, seeds (\d+) to (\d+)/.exec(BOOKING_PROSE);
  if (!m) throw new Error('booking.md does not state its bounds');
  const from = Number(m[3]);
  const to = Number(m[4]);
  return { maxParticipants: Number(m[1]), maxPositions: Number(m[2]), seeds: Array.from({ length: to - from + 1 }, (_, i) => from + i) };
}

// ----- the cast and the base context -----

export const ADMIN = 'alice';
export const CLOCK = 'clock';
export const BOB = 'bob';
export const CAROL = 'carol';
export const DANA = 'dana';
export const ERIN = 'erin';
export const ADMIN_CAPS = [CAP.invite, CAP.attach, CAP.grant, CAP.disclose, CAP.close];

/** The base every Booking series starts from: the admin's genesis binding the package under test. */
export function bookingBase(pkg: PackageDescriptor = bookingPackage): Script['base'] {
  return {
    creator: ADMIN,
    packages: { [pkg.id]: pkg },
    bindings: [{ package: pkg.id }],
    grants: [{ principal: ADMIN, roles: ['Admin'], capabilities: ADMIN_CAPS }],
    referents: [ROOM],
    route: 'route:booking',
  };
}

/** The clock joins first, holding dap.observe: positions 1 and 2 of every series. */
export function clockPrelude(): Step[] {
  return [
    { type: 'invite', inviter: ADMIN, invitee: CLOCK, grants: { capabilities: [CAP.observe] } },
    { type: 'accept', invitee: CLOCK },
  ];
}

export function tick(clock: number): { fact: { clock: number } } {
  return { fact: { clock } };
}

// ----- invariants over recorded events and the oracle's verdicts -----

type Occ = { id: string; start: number; end: number; position: number; freedAt?: number };

function effective(state: FoundationState, i: number): boolean {
  return state.verdicts[i]?.effective === true;
}

function clockAt(entries: readonly Entry[], state: FoundationState, before: number): number | null {
  let now: number | null = null;
  for (let i = 1; i < before && i < entries.length; i++) {
    const e = entries[i]!.event;
    if (e.kind !== K.observe || !effective(state, i)) continue;
    const c = (e.payload as { fact?: { clock?: unknown } })?.fact?.clock;
    if (typeof c === 'number') now = c;
  }
  return now;
}

/** Invariants of booking.md, evaluated on the oracle's state and the recorded entries; they never read the model's state. */
export function bookingInvariants(state: FoundationState, frontier: number, entries: readonly Entry[]): string[] {
  const out: string[] = [];
  const occupancies: Occ[] = [];
  const requests = new Map<string, Principal>();
  for (let i = 0; i <= frontier && i < entries.length; i++) {
    const entry = entries[i]!;
    const e = entry.event;
    if (e.kind === BOOKING + 'request' && effective(state, i)) requests.set(entry.id, e.actor);
    if (!e.kind.startsWith(BOOKING) || !effective(state, i)) continue;
    const p = e.payload as { booking_id?: string; start?: number; end?: number };
    switch (e.kind) {
      case BOOKING + 'occupancy': {
        if (!heldAt(state, e.actor, BOOKING + 'publish', i)) out.push(`occupancy at ${i} by ${e.actor} without publish`);
        if (typeof p.booking_id !== 'string' || typeof p.start !== 'number' || typeof p.end !== 'number') break;
        if (occupancies.some((o) => o.id === p.booking_id)) out.push(`duplicate booking id ${p.booking_id} effective at ${i}`);
        const now = clockAt(entries, state, i);
        for (const o of occupancies) {
          const live = o.freedAt === undefined && !(now !== null && now >= o.end);
          if (live && o.start < p.end && p.start < o.end) out.push(`occupancy at ${i} overlaps the live occupancy at ${o.position}`);
        }
        occupancies.push({ id: p.booking_id, start: p.start, end: p.end, position: i });
        break;
      }
      case BOOKING + 'free': {
        if (!heldAt(state, e.actor, BOOKING + 'publish', i)) out.push(`free at ${i} by ${e.actor} without publish`);
        const o = occupancies.find((x) => x.id === p.booking_id);
        if (!o) out.push(`free at ${i} of unknown occupancy ${p.booking_id}`);
        else if (o.freedAt !== undefined) out.push(`free at ${i} of already freed occupancy ${p.booking_id}`);
        else o.freedAt = i;
        break;
      }
      case BOOKING + 'cancel_request': {
        const booker = p.booking_id !== undefined ? requests.get(p.booking_id) : undefined;
        if (booker === undefined) out.push(`cancel at ${i} of unknown request ${p.booking_id}`);
        else if (booker !== e.actor) out.push(`cancel at ${i} by ${e.actor}, not the booker ${booker}`);
        break;
      }
      default:
        break;
    }
  }
  return out;
}

// ----- the privacy budget over observations -----

/** Violations of the privacy budget in one observation: others' requests, or a booker or purpose on an occupancy. */
export function bookingBudgetViolations(obs: Observation, p: Principal, admin: Principal): string[] {
  const out: string[] = [];
  const b = obs.models['booking'] as { occupancies?: Record<string, unknown>[]; requests?: { booker?: string; id?: string; position?: number }[] } | undefined;
  for (const o of b?.occupancies ?? []) {
    if ('purpose' in o || 'booker' in o) out.push(`${p} sees a booker or purpose on the occupancy at ${String(o['position'])}`);
  }
  if (p !== admin) {
    for (const r of b?.requests ?? []) if (r.booker !== p) out.push(`${p} sees the request at ${r.position} by ${r.booker}`);
  }
  return out;
}

// ----- the generator's payload builders -----

function pick<T>(r: () => number, xs: T[]): T | undefined {
  return xs.length ? xs[Math.floor(r() * xs.length)] : undefined;
}

function requestEntries(entries: readonly Entry[], actor?: Principal): Entry[] {
  return entries.filter((e) => e.event.kind === BOOKING + 'request' && (actor === undefined || e.event.actor === actor));
}

function occupancyIds(entries: readonly Entry[]): string[] {
  return entries.filter((e) => e.event.kind === BOOKING + 'occupancy').map((e) => (e.event.payload as { booking_id?: string }).booking_id ?? 'none');
}

/** An unrelated package for the generator's narrow attach. */
const sideBase: Omit<PackageDescriptor, 'id'> = {
  name: 'com.example.side',
  models: {
    side: {
      id: 'side',
      config: {},
      init: () => ({ notes: [] }),
      fold: (s: { notes: number[] }, _ev: EventBody, ctx: { position: number }) => ({ effective: true, state: { notes: [...s.notes, ctx.position] } }),
      observe: (_p: Principal, s: { notes: number[] }, ctx: { visible(i: number): boolean }) => ({ notes: s.notes.filter((i) => ctx.visible(i)).length }),
    } as never,
  },
  capabilities: [],
  kinds: { 'com.example.side.note': { kind: 'com.example.side.note', schema: { text: 'string' }, handlers: ['side'], audienceId: 'members', audience: () => MEMBERS } },
};
export const sidePackage: PackageDescriptor = { id: descriptorId(sideBase), ...sideBase };

/** The generator spec for the Booking campaign over a package under test. */
export function bookingGeneratorSpec(pkg: PackageDescriptor): GeneratorSpec {
  return {
    base: bookingBase(pkg),
    prelude: clockPrelude(),
    newcomers: [BOB, CAROL, DANA, ERIN],
    newcomerRoles: ['Booker'],
    payloads: {
      [BOOKING + 'request']: (r, { step }) => {
        const start = Math.floor(r() * 40);
        return { room: ROOM, start, end: start + 1 + Math.floor(r() * 6), purpose: 'purpose ' + step, admin: ADMIN };
      },
      [BOOKING + 'occupancy']: (r, { entries }) => {
        const req = pick(r, requestEntries(entries));
        if (!req) return { booking_id: 'none', room: ROOM, start: 0, end: 1 };
        const p = req.event.payload as { room: string; start: number; end: number };
        return { booking_id: req.id, room: p.room, start: p.start, end: p.end };
      },
      [BOOKING + 'cancel_request']: (r, { actor, entries }) => ({ booking_id: pick(r, requestEntries(entries, actor))?.id ?? 'none', admin: ADMIN }),
      [BOOKING + 'free']: (r, { entries }) => ({ booking_id: pick(r, occupancyIds(entries)) ?? 'none' }),
      [K.observe]: (r, { state, entries }) => tick((clockAt(entries, state, entries.length) ?? 0) + 1 + Math.floor(r() * 3)),
      'com.example.side.note': (_r, { step }) => ({ text: 'note ' + step }),
    },
    sidePackage,
    ineffectiveRate: 0.06,
    weights: { [BOOKING + 'request']: 2, [BOOKING + 'occupancy']: 1.5, [BOOKING + 'free']: 0.5, [BOOKING + 'cancel_request']: 0.4, [K.observe]: 0.8, 'com.example.side.note': 0.3 },
    bounds: { maxPositions: bookingBounds.maxPositions, maxParticipants: bookingBounds.maxParticipants },
  };
}
