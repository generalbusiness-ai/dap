// The machine-readable part of the Sale manifest (sale.md): bounds, seeds,
// the trace as a script with its predeclared readability and projections,
// the invariants over recorded events and verdicts, the privacy budget over
// observations, and the generator's payload builders. Nothing here reads
// the candidate model's state shape: the manifest is written independently
// of the fold and frozen before the baseline. The manifest identity binds
// the prose and this module; a run cites it together with the id of the
// package under test, which changes with every fix.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contentId, type Json } from '../src/canon.ts';
import { descriptorId, moduleHash, type PackageDescriptor } from '../src/descriptor.ts';
import { CAP, heldAt, type FoundationState } from '../src/foundation.ts';
import type { GeneratorSpec } from '../src/generate.ts';
import type { Observation } from '../src/observe.ts';
import type { Script, Step } from '../src/script.ts';
import { MEMBERS, type Entry, type EventBody, type Principal } from '../src/types.ts';
import { INSPECTION, inspectionPackage } from '../fixtures/inspection.ts';
import { SALE, salePackage } from '../fixtures/sale.ts';

export const saleBounds = { maxParticipants: 6, maxPositions: 60, seeds: Array.from({ length: 200 }, (_, i) => i + 1) };

const proseUrl = new URL('./sale.md', import.meta.url);
export const SALE_PROSE = readFileSync(fileURLToPath(proseUrl), 'utf8');

/** The experiment identity: the prose and this module. The package under test is cited separately. */
export const SALE_MANIFEST_ID = contentId({ prose: contentId(SALE_PROSE), executable: moduleHash(import.meta.url) });

/** The bounds the prose states, parsed so a test can hold the two parts to the same numbers. */
export function proseBounds(): { maxParticipants: number; maxPositions: number; seeds: number[] } {
  const m = /At most (\d+) participants, at most (\d+) positions, seeds (\d+) to (\d+)/.exec(SALE_PROSE);
  if (!m) throw new Error('sale.md does not state its bounds');
  const from = Number(m[3]);
  const to = Number(m[4]);
  return { maxParticipants: Number(m[1]), maxPositions: Number(m[2]), seeds: Array.from({ length: to - from + 1 }, (_, i) => from + i) };
}

// ----- the cast and the base context -----

export const ALICE = 'alice';
export const BOB = 'bob';
export const CAROL = 'carol';
export const IVAN = 'ivan';
export const DANA = 'dana';
export const ERIN = 'erin';
export const SELLER_CAPS = [CAP.invite, CAP.attach, CAP.grant, CAP.disclose, CAP.close];

export function listingEvent(actor: Principal = ALICE, referent = 'guitar-1', ask = 800): EventBody {
  return { kind: SALE + 'listing', payload: { referent, ask }, actor, nonce: 'listing-nonce' };
}

/** The base every Sale series starts from: Alice's listing adopted by a genesis binding the package under test. */
export function saleBase(pkg: PackageDescriptor = salePackage): Script['base'] {
  return {
    creator: ALICE,
    packages: { [pkg.id]: pkg, [inspectionPackage.id]: inspectionPackage },
    bindings: [{ package: pkg.id }],
    grants: [{ principal: ALICE, roles: ['Seller'], capabilities: SELLER_CAPS }],
    origins: [listingEvent()],
    referents: ['guitar-1'],
    route: 'route:sale',
  };
}

// ----- predeclared case 1: the trace -----

/** The views note's trace, positions 2 to 19, as steps after the genesis (0) and the listing (1). */
export function saleTraceSteps(): Step[] {
  return [
    { type: 'invite', inviter: ALICE, invitee: BOB, grants: { roles: ['Buyer'] } }, // 2
    { type: 'accept', invitee: BOB }, // 3
    { type: 'invite', inviter: ALICE, invitee: CAROL, grants: { roles: ['Buyer'] } }, // 4
    { type: 'accept', invitee: CAROL }, // 5
    { type: 'act', actor: BOB, kind: SALE + 'offer', payload: { offer_id: 'o1' } }, // 6
    { type: 'act', actor: BOB, kind: SALE + 'offer_terms', payload: { offer_id: 'o1', amount: 700, seller: ALICE } }, // 7
    { type: 'act', actor: CAROL, kind: SALE + 'offer', payload: { offer_id: 'o2' } }, // 8
    { type: 'act', actor: CAROL, kind: SALE + 'offer_terms', payload: { offer_id: 'o2', amount: 750, seller: ALICE } }, // 9
    { type: 'act', actor: ALICE, kind: SALE + 'counter', payload: { offer_id: 'o1', amount: 780, author: BOB } }, // 10
    { type: 'attach', actor: ALICE, pkg: inspectionPackage }, // 11
    { type: 'invite', inviter: ALICE, invitee: IVAN, grants: { roles: ['Inspector'] } }, // 12
    { type: 'accept', invitee: IVAN }, // 13
    { type: 'act', actor: CAROL, kind: INSPECTION + 'request', payload: { offer_id: 'o2', seller: ALICE, inspector: IVAN } }, // 14
    { type: 'act', actor: BOB, kind: SALE + 'offer', payload: { offer_id: 'o3', replaces: 'o1' } }, // 15
    { type: 'act', actor: BOB, kind: SALE + 'offer_terms', payload: { offer_id: 'o3', amount: 780, seller: ALICE } }, // 16
    { type: 'act', actor: ALICE, kind: SALE + 'accept', payload: { offer_id: 'o3' } }, // 17
    { type: 'act', actor: ALICE, kind: SALE + 'accept', payload: { offer_id: 'o2' } }, // 18
    { type: 'act', actor: ALICE, kind: SALE + 'close', payload: { outcome: 'sold' } }, // 19
  ];
}

/** Readability of positions 0 to 19 per participant, from the table's audiences: r readable, h header only. */
export const saleTraceReadability: Record<Principal, string> = {
  [ALICE]: 'rrrrrrrrrrrrrrrrrrrr',
  [BOB]: 'rrrrhrrrrhrrhrhrrrrr',
  [CAROL]: 'rrhrrrrhrrhrhrrrhrrr',
  [IVAN]: 'rrhrhrhhhhhrrrrrhrrr',
};

/** The projections of the sale model at position 19, literal, one per participant. */
export const saleTraceProjections: Record<Principal, Json> = {
  [ALICE]: {
    status: 'closed',
    referent: 'guitar-1',
    ask: 800,
    seller: ALICE,
    offers: [
      { id: 'o1', author: BOB, position: 6, status: 'replaced', replaces: null, amount: 700, counter: 780 },
      { id: 'o2', author: CAROL, position: 8, status: 'declined', replaces: null, amount: 750, counter: null },
      { id: 'o3', author: BOB, position: 15, status: 'accepted', replaces: 'o1', amount: 780, counter: null },
    ],
    accepted: 'o3',
    acceptedAmount: 780,
  },
  [BOB]: {
    status: 'closed',
    referent: 'guitar-1',
    ask: 800,
    seller: ALICE,
    offers: [
      { id: 'o1', author: BOB, position: 6, status: 'replaced', replaces: null, amount: 700, counter: 780 },
      { id: 'o2', author: CAROL, position: 8, status: 'declined', replaces: null, amount: null, counter: null },
      { id: 'o3', author: BOB, position: 15, status: 'accepted', replaces: 'o1', amount: 780, counter: null },
    ],
    accepted: 'o3',
    acceptedAmount: 780,
  },
  [CAROL]: {
    status: 'closed',
    referent: 'guitar-1',
    ask: 800,
    seller: ALICE,
    offers: [
      { id: 'o1', author: BOB, position: 6, status: 'replaced', replaces: null, amount: null, counter: null },
      { id: 'o2', author: CAROL, position: 8, status: 'declined', replaces: null, amount: 750, counter: null },
      { id: 'o3', author: BOB, position: 15, status: 'accepted', replaces: 'o1', amount: null, counter: null },
    ],
    accepted: 'o3',
    acceptedAmount: null,
  },
  [IVAN]: {
    status: 'closed',
    referent: 'guitar-1',
    ask: 800,
    seller: ALICE,
    offers: [{ id: 'o3', author: BOB, position: 15, status: 'accepted', replaces: 'o1', amount: null, counter: null }],
    accepted: 'o3',
    acceptedAmount: null,
  },
};

/** The inspection projection at 19: the request at 14 is seen by its three parties only. */
export const saleTraceInspection: Record<Principal, Json> = {
  [ALICE]: { requests: [{ position: 14, offer_id: 'o2', requester: CAROL, seller: ALICE, inspector: IVAN }] },
  [BOB]: { requests: [] },
  [CAROL]: { requests: [{ position: 14, offer_id: 'o2', requester: CAROL, seller: ALICE, inspector: IVAN }] },
  [IVAN]: { requests: [{ position: 14, offer_id: 'o2', requester: CAROL, seller: ALICE, inspector: IVAN }] },
};

// ----- invariants over recorded events and the oracle's verdicts -----

type StubFacts = { author: Principal; position: number; withdrawnAt?: number; replacedAt?: number };

function effective(state: FoundationState, i: number): boolean {
  return state.verdicts[i]?.effective === true;
}

/** Invariants of sale.md, evaluated on the oracle's state and the recorded entries; they never read the model's state. */
export function saleInvariants(state: FoundationState, frontier: number, entries: readonly Entry[]): string[] {
  const out: string[] = [];
  const stubs = new Map<string, StubFacts>();
  let accepted: number | undefined;
  let closedAt: number | undefined;
  let opened = false;
  for (let i = 0; i <= frontier && i < entries.length; i++) {
    const e = entries[i]!.event;
    if (!e.kind.startsWith(SALE) || !effective(state, i)) continue;
    const p = e.payload as { offer_id?: string; replaces?: string };
    if (closedAt !== undefined) out.push(`effective ${e.kind} at ${i} after close at ${closedAt}`);
    switch (e.kind) {
      case SALE + 'listing':
        opened = true;
        break;
      case SALE + 'offer': {
        if (!opened) out.push(`offer at ${i} before the listing`);
        if (p.offer_id === undefined) break;
        if (stubs.has(p.offer_id)) out.push(`duplicate stub ${p.offer_id} effective at ${i}`);
        if (p.replaces !== undefined) {
          const prev = stubs.get(p.replaces);
          if (!prev) out.push(`replacement at ${i} of unknown stub ${p.replaces}`);
          else if (prev.author !== e.actor) out.push(`replacement at ${i} of ${p.replaces} by ${e.actor}, not its author ${prev.author}`);
          else prev.replacedAt = i;
        }
        stubs.set(p.offer_id, { author: e.actor, position: i });
        break;
      }
      case SALE + 'withdraw': {
        const s = p.offer_id !== undefined ? stubs.get(p.offer_id) : undefined;
        if (!s) out.push(`withdrawal at ${i} of unknown stub ${p.offer_id}`);
        else if (s.author !== e.actor) out.push(`withdrawal at ${i} of ${p.offer_id} by ${e.actor}, not its author ${s.author}`);
        else s.withdrawnAt = i;
        break;
      }
      case SALE + 'accept': {
        if (accepted !== undefined) out.push(`second effective accept at ${i}; first at ${accepted}`);
        accepted = i;
        const s = p.offer_id !== undefined ? stubs.get(p.offer_id) : undefined;
        if (!s) out.push(`accept at ${i} of unknown stub ${p.offer_id}`);
        else {
          if (s.withdrawnAt !== undefined && s.withdrawnAt < i) out.push(`accept at ${i} of withdrawn stub ${p.offer_id}`);
          if (s.replacedAt !== undefined && s.replacedAt < i) out.push(`accept at ${i} of replaced stub ${p.offer_id}`);
        }
        if (!heldAt(state, e.actor, SALE + 'accept_offer', i)) out.push(`accept at ${i} by ${e.actor} without accept_offer`);
        break;
      }
      case SALE + 'close':
        closedAt = i;
        break;
      default:
        break;
    }
  }
  return out;
}

// ----- the privacy budget over observations -----

/** The parties who may read a private Sale event, from recorded facts: the listing's seller, the event's actor, and for a counter the stub's author. */
export function privateParties(view: readonly { position: number; event?: EventBody }[], i: number): Principal[] | undefined {
  const ev = view[i]?.event;
  if (!ev) return undefined;
  const seller = view[1]?.event?.actor ?? ALICE;
  const p = ev.payload as { offer_id?: string; inspector?: string } | null;
  if (ev.kind === SALE + 'offer_terms') return [ev.actor, seller];
  if (ev.kind === SALE + 'counter') {
    const stub = view.find((v) => v.event?.kind === SALE + 'offer' && (v.event.payload as { offer_id?: string })?.offer_id === p?.offer_id);
    return [ev.actor, seller, ...(stub?.event ? [stub.event.actor] : [])];
  }
  if (ev.kind === INSPECTION + 'request') return [ev.actor, seller, ...(typeof p?.inspector === 'string' ? [p.inspector] : [])];
  return undefined;
}

/**
 * Violations of the privacy budget: on what p can actually read, a private
 * event (terms, counter, inspection request) whose parties, from recorded
 * facts, do not include p; and on the projection, amounts or counters of
 * others' offers, or inspection requests p is not party to.
 */
export function saleBudgetViolations(obs: Observation, p: Principal, seller: Principal, view: readonly { position: number; event?: EventBody }[]): string[] {
  const out: string[] = [];
  for (const v of view) {
    if (!v.event) continue;
    const parties = privateParties(view, v.position);
    if (parties && !parties.includes(p)) out.push(`${p} can read the ${v.event.kind.replace(/^com\.example\./, '')} at ${v.position}, whose parties are ${parties.join('+')}`);
  }
  const sale = obs.models['sale'] as { offers?: { id: string; author: string; amount: unknown; counter: unknown }[]; acceptedAmount?: unknown } | undefined;
  for (const o of sale?.offers ?? []) {
    if (o.author === p || p === seller) continue;
    if (o.amount !== null && o.amount !== undefined) out.push(`${p} sees the amount of ${o.id} by ${o.author}`);
    if (o.counter !== null && o.counter !== undefined) out.push(`${p} sees the counter of ${o.id} by ${o.author}`);
  }
  if (sale?.acceptedAmount !== null && sale?.acceptedAmount !== undefined && p !== seller) {
    const winner = sale.offers?.find((o) => (o as { status?: string }).status === 'accepted')?.author;
    if (winner !== p) out.push(`${p} sees the accepted amount without being the seller or the winner`);
  }
  const insp = obs.models['inspection'] as { requests?: { requester: string; seller: string; inspector: string; position: number }[] } | undefined;
  for (const r of insp?.requests ?? []) {
    if (r.requester !== p && r.seller !== p && r.inspector !== p) out.push(`${p} sees the inspection request at ${r.position}`);
  }
  return out;
}

// ----- the generator's payload builders -----

function stubsBy(entries: readonly Entry[], author?: Principal): string[] {
  const ids: string[] = [];
  for (const e of entries) {
    if (e.event.kind !== SALE + 'offer') continue;
    if (author !== undefined && e.event.actor !== author) continue;
    const id = (e.event.payload as { offer_id?: string }).offer_id;
    if (id) ids.push(id);
  }
  return ids;
}

function stubAuthor(entries: readonly Entry[], id: string): Principal | undefined {
  for (const e of entries) if (e.event.kind === SALE + 'offer' && (e.event.payload as { offer_id?: string }).offer_id === id) return e.event.actor;
  return undefined;
}

function pick<T>(r: () => number, xs: T[]): T | undefined {
  return xs.length ? xs[Math.floor(r() * xs.length)] : undefined;
}

/** An unrelated package for the generator's narrow attach: a private note that must not stale any shared act. */
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

/** The generator spec for the Sale campaign over a package under test. */
export function saleGeneratorSpec(pkg: PackageDescriptor): GeneratorSpec {
  return {
    base: saleBase(pkg),
    newcomers: [BOB, CAROL, DANA, ERIN, IVAN],
    newcomerRoles: ['Buyer'],
    payloads: {
      [SALE + 'offer']: (r, { step, actor, entries }) => {
        const own = stubsBy(entries, actor);
        const replaces = r() < 0.3 ? pick(r, own) : undefined;
        return { offer_id: 'o' + step, ...(replaces ? { replaces } : {}) };
      },
      [SALE + 'offer_terms']: (r, { actor, entries }) => ({ offer_id: pick(r, r() < 0.85 ? stubsBy(entries, actor) : stubsBy(entries)) ?? 'none', amount: 500 + Math.floor(r() * 500), seller: ALICE }),
      [SALE + 'withdraw']: (r, { actor, entries }) => ({ offer_id: pick(r, r() < 0.8 ? stubsBy(entries, actor) : stubsBy(entries)) ?? 'none' }),
      [SALE + 'counter']: (r, { entries }) => {
        const id = pick(r, stubsBy(entries)) ?? 'none';
        return { offer_id: id, amount: 600 + Math.floor(r() * 400), author: stubAuthor(entries, id) ?? ALICE };
      },
      [SALE + 'accept']: (r, { entries }) => ({ offer_id: pick(r, stubsBy(entries)) ?? 'none' }),
      [SALE + 'close']: () => ({ outcome: 'sold' }),
      [INSPECTION + 'request']: (r, { members, entries }) => ({ offer_id: pick(r, stubsBy(entries)) ?? 'none', seller: ALICE, inspector: pick(r, members) ?? ALICE }),
      'com.example.side.note': (_r, { step }) => ({ text: 'note ' + step }),
    },
    sidePackage,
    ineffectiveRate: 0.06,
    weights: { [SALE + 'close']: 0.05, [SALE + 'offer']: 2, [SALE + 'offer_terms']: 1.5, [SALE + 'accept']: 0.5, [INSPECTION + 'request']: 0.3, 'com.example.side.note': 0.3 },
    bounds: { maxPositions: saleBounds.maxPositions, maxParticipants: saleBounds.maxParticipants },
  };
}
