// The Sale package, as far as V1 needs it: the listing origin opens the
// sale, the Seller role, and the kinds of the views note's split offer
// declared so that binding identities exist. Folds for offers and accepts
// are V3's, authored by an agent from the manifest; only the listing
// origin rule is implemented here.

import { descriptorId, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
import { MEMBERS, SPINE, named, type EventBody } from '../src/types.ts';

const NS = 'com.example.sale.';

export interface SaleState {
  status: 'unopened' | 'open' | 'decided' | 'closed';
  referent?: string;
  ask?: number;
  seller?: string;
}

export const saleModel: ModelSpec<SaleState> = {
  id: 'sale',
  init: () => ({ status: 'unopened' }),
  roles: {
    Seller: [NS + 'accept_offer', NS + 'counter', NS + 'close'],
    Buyer: [NS + 'make_offer', NS + 'withdraw_own_offer'],
    Inspector: [],
  },
  fold(state, event: EventBody, ctx) {
    switch (event.kind) {
      case NS + 'listing': {
        // Origin rule: a listing origin opens the sale; a listing that is not an origin is refused.
        if (!ctx.origin) return { effective: false, state, reason: 'listing_must_be_origin' };
        if (state.status !== 'unopened') return { effective: false, state, reason: 'already_open' };
        const p = event.payload as { referent: string; ask: number };
        return { effective: true, state: { status: 'open', referent: p.referent, ask: p.ask, seller: event.actor } };
      }
      default:
        return { effective: false, state, reason: 'not_in_v1' };
    }
  },
};

const sellerAndAuthor = { audienceId: 'seller+author', audience: (_: unknown, ev: EventBody) => named(ev.actor, (ev.payload as { seller?: string }).seller ?? ev.actor) };

const base: Omit<PackageDescriptor, 'id'> = {
  name: 'com.example.sale',
  models: { sale: saleModel as unknown as ModelSpec },
  capabilities: [NS + 'accept_offer', NS + 'counter', NS + 'close', NS + 'make_offer', NS + 'withdraw_own_offer'],
  kinds: {
    [NS + 'listing']: { kind: NS + 'listing', handlers: ['sale'], audienceId: 'spine', audience: () => SPINE },
    [NS + 'offer']: { kind: NS + 'offer', handlers: ['sale'], audienceId: 'members', audience: () => MEMBERS, capability: NS + 'make_offer' },
    [NS + 'offer_terms']: { kind: NS + 'offer_terms', handlers: ['sale'], ...sellerAndAuthor, capability: NS + 'make_offer' },
    [NS + 'withdraw']: { kind: NS + 'withdraw', handlers: ['sale'], audienceId: 'members', audience: () => MEMBERS, capability: NS + 'withdraw_own_offer' },
    [NS + 'counter']: { kind: NS + 'counter', handlers: ['sale'], ...sellerAndAuthor, capability: NS + 'counter' },
    [NS + 'accept']: { kind: NS + 'accept', handlers: ['sale'], audienceId: 'members', audience: () => MEMBERS, capability: NS + 'accept_offer' },
    [NS + 'close']: { kind: NS + 'close', handlers: ['sale'], audienceId: 'spine', audience: () => SPINE, capability: NS + 'close' },
  },
};

export const salePackage: PackageDescriptor = { id: descriptorId(base), ...base };
export const SALE = NS;
