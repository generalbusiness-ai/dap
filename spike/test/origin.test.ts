import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nonce } from '../src/canon.ts';
import { SALE } from '../fixtures/sale.ts';
import type { SaleState } from '../fixtures/sale.ts';
import { ALICE, listing, saleContext } from './helpers.ts';

test('a listing origin opens the sale; the origin actor needs no grant', () => {
  const ctx = saleContext({ grants: [] });
  assert.equal(ctx.entries.length, 2);
  assert.equal(ctx.verdictAt(1)?.effective, true);
  assert.equal((ctx.state.models['sale'] as unknown as SaleState).status, 'open');
  assert.equal(ctx.state.audiences[1]?.kind, 'spine');
});

test('the same origin adopted twice is a genesis error', () => {
  const l = listing();
  assert.throws(() => saleContext({ origins: [l, l] }), (e: Error & { code?: string }) => e.code === 'duplicate_origin');
});

test('an origin whose kind does not resolve is an unhandled verdict and inert', () => {
  const ctx = saleContext({ origins: [listing(), { kind: 'com.example.other.thing', payload: {}, actor: ALICE, nonce: nonce() }] });
  const v = ctx.verdictAt(2)!;
  assert.equal(v.known, false);
  assert.equal(v.effective, false);
  assert.equal(v.reason, 'unhandled');
  assert.equal((ctx.state.models['sale'] as unknown as SaleState).status, 'open');
  assert.equal(ctx.state.audiences[2]?.kind, 'spine');
});

test('an origin binds no expected binding: a foreign binding on an origin is ignored', () => {
  const foreign = { ...listing(), expected_binding: 'sha256:' + 'f'.repeat(64) };
  const ctx = saleContext({ origins: [foreign] });
  assert.equal(ctx.verdictAt(1)?.effective, true);
});

test('a listing submitted later, not as an origin, is refused by the model', () => {
  const ctx = saleContext();
  const r = ctx.act(ALICE, SALE + 'listing', { referent: 'guitar-2', ask: 1 });
  assert.ok(!('refused' in r));
  assert.equal(r.verdict?.effective, false);
  assert.equal(r.verdict?.perModel?.['sale']?.reason, 'listing_must_be_origin');
});
