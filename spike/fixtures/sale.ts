// The Sale package: the partition-plus-decision shape of the views note.
//
// A listing origin opens the sale. Buyers make offers as a public stub
// (members) plus private terms (author and seller). The seller may
// counter privately, accept publicly, and close on the spine. One rule
// spans the partitions: at most one offer is accepted.
//
// The fold runs over each participant's own view, so its state holds only
// what that participant could read. The rule this imposes (views note, The
// property): a refusal may depend on a fact only when every reader of the
// refused event necessarily saw that fact. Concretely:
//
// - The listing and the close are spine, so `not_open` is safe everywhere.
// - A withdrawal or a replacement of a stub the viewer never saw is still
//   effective and is recorded against the stub's id, because a member who
//   joined after the stub reads the withdrawal but not the stub (manifest
//   case 4). A later accept of that id is then `withdrawn` in every view.
// - An accept checks stub-specific facts (withdrawn, replaced) before the
//   decision, and the decision before the stub's existence, so a viewer who
//   holds only the header of the stub but sees the decision (Ivan at 18)
//   agrees with everyone else: `already_decided`.
// - Terms and counters refuse on the decision only for the accepted stub
//   itself, because their readers (author and seller) were members at the
//   decision; a withdrawal never consults the decision, because a member
//   who joined after it reads the withdrawal but not the accept.
//
// The projection derives every fact from the position of the event that
// produced it and shows it only when that position is visible to the
// principal; amounts and counters go only to their author and the seller.

import { descriptorId, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
import { MEMBERS, SPINE, named, type EventBody } from '../src/types.ts';

const NS = 'com.example.sale.';

export interface OfferStub {
  id: string;
  author: string;
  position: number;
  /** the stub this one replaces, as named by the offerer, seen or not */
  replaces: string | null;
}

export interface OfferTerms {
  id: string;
  author: string;
  position: number;
  amount: number;
}

export interface OfferCounter {
  id: string;
  position: number;
  amount: number;
}

export interface Withdrawal {
  id: string;
  actor: string;
  position: number;
}

export interface SaleState {
  status: 'unopened' | 'open' | 'decided' | 'closed';
  referent?: string;
  ask?: number;
  seller?: string;
  /** effective stubs, in position order */
  offers: OfferStub[];
  /** effective terms, in position order; the latest visible one is the amount */
  terms: OfferTerms[];
  /** effective counters, in position order; the latest visible one is the counter */
  counters: OfferCounter[];
  /** effective withdrawals, by stub id, including withdrawals of stubs this view never saw */
  withdrawals: Withdrawal[];
  /** the decision: the accepted stub and the position of the accept */
  accepted: { id: string; position: number } | null;
  /** the position of the effective close, once closed */
  closedAt: number | null;
  outcome: string | null;
}

type StubStatus = 'open' | 'withdrawn' | 'replaced' | 'accepted' | 'declined';
type Visible = (position: number) => boolean;

/** In the fold, everything in the state was read; only observe narrows. */
const everything: Visible = () => true;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isId(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0;
}

function stubOf(state: SaleState, id: string): OfferStub | undefined {
  return state.offers.find((o) => o.id === id);
}

/** The first visible withdrawal naming the id, stub seen or not. */
function withdrawalOf(state: SaleState, id: string, visible: Visible): Withdrawal | undefined {
  return state.withdrawals.find((w) => w.id === id && visible(w.position));
}

/** The first visible stub that replaces the id, the replaced stub seen or not. */
function replacementOf(state: SaleState, id: string, visible: Visible): OfferStub | undefined {
  return state.offers.find((o) => o.replaces === id && visible(o.position));
}

/** Whether the principal can read the decision under this visibility. */
function decisionVisible(state: SaleState, visible: Visible): boolean {
  return state.accepted !== null && visible(state.accepted.position);
}

/** An id is taken once any stub, replacement or withdrawal has named it. */
function idTaken(state: SaleState, id: string): boolean {
  return state.offers.some((o) => o.id === id || o.replaces === id) || state.withdrawals.some((w) => w.id === id);
}

function latestTerms(state: SaleState, id: string, visible: Visible): OfferTerms | undefined {
  let found: OfferTerms | undefined;
  for (const t of state.terms) if (t.id === id && visible(t.position)) found = t;
  return found;
}

function latestCounter(state: SaleState, id: string, visible: Visible): OfferCounter | undefined {
  let found: OfferCounter | undefined;
  for (const c of state.counters) if (c.id === id && visible(c.position)) found = c;
  return found;
}

/** A stub's status as derived from the events visible to the principal. The decision stands over a later withdrawal. */
function stubStatus(state: SaleState, stub: OfferStub, visible: Visible): StubStatus {
  const decided = decisionVisible(state, visible);
  if (decided && state.accepted!.id === stub.id) return 'accepted';
  if (withdrawalOf(state, stub.id, visible)) return 'withdrawn';
  if (replacementOf(state, stub.id, visible)) return 'replaced';
  if (decided) return 'declined';
  return 'open';
}

function refuse(state: SaleState, reason: string) {
  return { effective: false, state, reason };
}

export const saleModel: ModelSpec<SaleState, Record<string, never>> = {
  id: 'sale',
  config: {},
  init: () => ({ status: 'unopened', offers: [], terms: [], counters: [], withdrawals: [], accepted: null, closedAt: null, outcome: null }),
  roles: {
    Seller: [NS + 'accept_offer', NS + 'counter', NS + 'close'],
    Buyer: [NS + 'make_offer', NS + 'withdraw_own_offer'],
    Inspector: [],
  },
  fold(state, event: EventBody, ctx) {
    const kind = event.kind;
    if (kind === NS + 'listing') {
      // Origin rule: a listing origin opens the sale; a listing that is not an origin is refused.
      if (!ctx.origin) return refuse(state, 'listing_must_be_origin');
      if (state.status !== 'unopened') return refuse(state, 'already_open');
      const p = event.payload as { referent: string; ask: number };
      return { effective: true, state: { ...state, status: 'open', referent: p.referent, ask: p.ask, seller: event.actor } };
    }
    if (
      kind !== NS + 'offer' &&
      kind !== NS + 'offer_terms' &&
      kind !== NS + 'withdraw' &&
      kind !== NS + 'counter' &&
      kind !== NS + 'accept' &&
      kind !== NS + 'close'
    ) {
      return refuse(state, 'unhandled');
    }
    // The listing and the close are spine, so this refusal reads the same in every view.
    if (state.status === 'unopened' || state.status === 'closed') return refuse(state, 'not_open');
    const p = event.payload;
    if (!isRecord(p)) return refuse(state, 'malformed');

    if (kind === NS + 'close') {
      if (typeof p.outcome !== 'string') return refuse(state, 'malformed');
      return { effective: true, state: { ...state, status: 'closed', closedAt: ctx.position, outcome: p.outcome } };
    }

    const id = p.offer_id;
    if (!isId(id)) return refuse(state, 'malformed');

    switch (kind) {
      case NS + 'offer': {
        const replaces = p.replaces === undefined || p.replaces === null ? null : p.replaces;
        if (replaces !== null && (!isId(replaces) || replaces === id)) return refuse(state, 'malformed');
        if (idTaken(state, id)) return refuse(state, 'duplicate_offer');
        if (replaces !== null) {
          // Facts that later members can read come first; the stub itself may be hidden from them.
          if (withdrawalOf(state, replaces, everything)) return refuse(state, 'withdrawn');
          if (replacementOf(state, replaces, everything)) return refuse(state, 'replaced');
          const old = stubOf(state, replaces);
          if (old && old.author !== event.actor) return refuse(state, 'not_author');
        }
        const stub: OfferStub = { id, author: event.actor, position: ctx.position, replaces };
        return { effective: true, state: { ...state, offers: [...state.offers, stub] } };
      }
      case NS + 'offer_terms': {
        // Terms are addressed to the seller named in the payload; terms addressed elsewhere are malformed.
        if (!Number.isInteger(p.amount) || typeof p.seller !== 'string' || p.seller !== state.seller) return refuse(state, 'malformed');
        if (withdrawalOf(state, id, everything)) return refuse(state, 'withdrawn');
        if (replacementOf(state, id, everything)) return refuse(state, 'replaced');
        const stub = stubOf(state, id);
        if (!stub) return refuse(state, 'no_such_offer');
        if (stub.author !== event.actor) return refuse(state, 'not_author');
        // Author and seller both read the decision, so the accepted amount cannot change under it.
        if (state.accepted !== null && state.accepted.id === id) return refuse(state, 'already_decided');
        const terms: OfferTerms = { id, author: event.actor, position: ctx.position, amount: p.amount as number };
        return { effective: true, state: { ...state, terms: [...state.terms, terms] } };
      }
      case NS + 'counter': {
        // The payload's `author` field is read by the audience rule; its value carries no meaning for the fold.
        if (!Number.isInteger(p.amount) || typeof p.author !== 'string') return refuse(state, 'malformed');
        if (withdrawalOf(state, id, everything)) return refuse(state, 'withdrawn');
        if (replacementOf(state, id, everything)) return refuse(state, 'replaced');
        if (!stubOf(state, id)) return refuse(state, 'no_such_offer');
        if (state.accepted !== null && state.accepted.id === id) return refuse(state, 'already_decided');
        const counter: OfferCounter = { id, position: ctx.position, amount: p.amount as number };
        return { effective: true, state: { ...state, counters: [...state.counters, counter] } };
      }
      case NS + 'withdraw': {
        if (withdrawalOf(state, id, everything)) return refuse(state, 'withdrawn');
        if (replacementOf(state, id, everything)) return refuse(state, 'replaced');
        // A stub this view never read is withdrawn on its author's word; the oracle, which read
        // it, checks authorship. The decision is not consulted: a later member may not see it.
        const stub = stubOf(state, id);
        if (stub && stub.author !== event.actor) return refuse(state, 'not_author');
        const withdrawal: Withdrawal = { id, actor: event.actor, position: ctx.position };
        return { effective: true, state: { ...state, withdrawals: [...state.withdrawals, withdrawal] } };
      }
      case NS + 'accept': {
        if (withdrawalOf(state, id, everything)) return refuse(state, 'withdrawn');
        if (replacementOf(state, id, everything)) return refuse(state, 'replaced');
        // The decision is public among the members who read this accept, the stub may not be.
        if (state.accepted !== null) return refuse(state, 'already_decided');
        if (!stubOf(state, id)) return refuse(state, 'no_such_offer');
        return { effective: true, state: { ...state, status: 'decided', accepted: { id, position: ctx.position } } };
      }
      default:
        return refuse(state, 'unhandled');
    }
  },
  observe(p, state, ctx) {
    const visible = ctx.visible;
    const seller = state.seller ?? null;
    const decided = decisionVisible(state, visible);
    const closed = state.closedAt !== null && visible(state.closedAt);
    const status: SaleState['status'] = state.status === 'unopened' ? 'unopened' : closed ? 'closed' : decided ? 'decided' : 'open';
    const offers = state.offers
      .filter((o) => visible(o.position))
      .map((o) => {
        const party = p === o.author || p === seller;
        const terms = party ? latestTerms(state, o.id, visible) : undefined;
        const counter = party ? latestCounter(state, o.id, visible) : undefined;
        return {
          id: o.id,
          author: o.author,
          position: o.position,
          status: stubStatus(state, o, visible),
          replaces: o.replaces,
          amount: terms ? terms.amount : null,
          counter: counter ? counter.amount : null,
        };
      });
    let acceptedAmount: number | null = null;
    if (decided) {
      const winner = stubOf(state, state.accepted!.id);
      const terms = latestTerms(state, state.accepted!.id, visible);
      if (terms && winner && (p === seller || p === winner.author)) acceptedAmount = terms.amount;
    }
    return {
      status,
      referent: state.referent ?? null,
      ask: state.ask ?? null,
      seller,
      offers,
      accepted: decided ? state.accepted!.id : null,
      acceptedAmount,
    };
  },
  affordances(p, state, ctx) {
    const visible = ctx.visible;
    if (state.status === 'unopened') return [];
    if (state.closedAt !== null && visible(state.closedAt)) return [];
    const decided = decisionVisible(state, visible);
    const open = state.offers.filter((o) => visible(o.position) && stubStatus(state, o, visible) === 'open');
    const mine = open.filter((o) => o.author === p);
    const out: string[] = [];
    if (ctx.holds(NS + 'make_offer')) {
      if (!decided) out.push(NS + 'offer');
      if (mine.length > 0) out.push(NS + 'offer_terms');
    }
    if (ctx.holds(NS + 'withdraw_own_offer') && mine.length > 0) out.push(NS + 'withdraw');
    if (ctx.holds(NS + 'accept_offer') && !decided && open.length > 0) out.push(NS + 'accept');
    if (ctx.holds(NS + 'counter') && !decided && open.length > 0) out.push(NS + 'counter');
    if (ctx.holds(NS + 'close')) out.push(NS + 'close');
    return out.sort();
  },
};

function sellerAndAuthor(_: unknown, ev: EventBody) {
  return named(ev.actor, (ev.payload as { seller?: string }).seller ?? ev.actor);
}
/** A counter is by the seller; the payload names the offer's author so the audience can. */
function counterParties(_: unknown, ev: EventBody) {
  return named(ev.actor, (ev.payload as { author?: string }).author ?? ev.actor);
}
const membersAudience = () => MEMBERS;
const spineAudience = () => SPINE;

const base: Omit<PackageDescriptor, 'id'> = {
  name: 'com.example.sale',
  module: import.meta.url,
  models: { sale: saleModel as unknown as ModelSpec },
  capabilities: [NS + 'accept_offer', NS + 'counter', NS + 'close', NS + 'make_offer', NS + 'withdraw_own_offer'],
  kinds: {
    [NS + 'listing']: { kind: NS + 'listing', schema: { referent: 'string', ask: 'integer' }, handlers: ['sale'], audienceId: 'spine', audience: spineAudience },
    [NS + 'offer']: { kind: NS + 'offer', schema: { offer_id: 'string', replaces: 'string?' }, handlers: ['sale'], audienceId: 'members', audience: membersAudience, capability: NS + 'make_offer' },
    [NS + 'offer_terms']: { kind: NS + 'offer_terms', schema: { offer_id: 'string', amount: 'integer', seller: 'string' }, handlers: ['sale'], audienceId: 'seller+author', audience: sellerAndAuthor, capability: NS + 'make_offer' },
    [NS + 'withdraw']: { kind: NS + 'withdraw', schema: { offer_id: 'string' }, handlers: ['sale'], audienceId: 'members', audience: membersAudience, capability: NS + 'withdraw_own_offer' },
    [NS + 'counter']: { kind: NS + 'counter', schema: { offer_id: 'string', amount: 'integer', author: 'string' }, handlers: ['sale'], audienceId: 'seller+author', audience: counterParties, capability: NS + 'counter' },
    [NS + 'accept']: { kind: NS + 'accept', schema: { offer_id: 'string' }, handlers: ['sale'], audienceId: 'members', audience: membersAudience, capability: NS + 'accept_offer' },
    [NS + 'close']: { kind: NS + 'close', schema: { outcome: 'string' }, handlers: ['sale'], audienceId: 'spine', audience: spineAudience, capability: NS + 'close' },
  },
};

export const salePackage: PackageDescriptor = { id: descriptorId(base), ...base };
export const SALE = NS;
