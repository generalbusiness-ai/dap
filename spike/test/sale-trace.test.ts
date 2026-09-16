// The sale trace, positions 0 to 5, as the views note's table gives them,
// checked per participant against the narrative's Alice, Bob and Carol.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { K, holdsNow } from '../src/foundation.ts';
import { SALE } from '../fixtures/sale.ts';
import { ALICE, BOB, CAROL, accept, invite, saleContext } from './helpers.ts';

function build() {
  const ctx = saleContext();
  const iBob = invite(ctx, ALICE, BOB); // 2
  accept(ctx, BOB, iBob); // 3
  const iCarol = invite(ctx, ALICE, CAROL); // 4
  accept(ctx, CAROL, iCarol); // 5
  return ctx;
}

test('positions 0 to 5 carry the kinds and audiences of the trace', () => {
  const ctx = build();
  assert.equal(ctx.head, 5);
  const kinds = ctx.entries.map((e) => e.event.kind);
  assert.deepEqual(kinds, [K.genesis, SALE + 'listing', K.invite, K.accept_invite, K.invite, K.accept_invite]);
  assert.deepEqual(
    ctx.state.audiences.map((a) => (a.kind === 'named' ? a.principals.join('+') : a.kind)),
    ['spine', 'spine', 'alice+bob', 'spine', 'alice+carol', 'spine'],
  );
  assert.ok(ctx.state.verdicts.every((v) => v.effective));
  assert.deepEqual(ctx.state.participants, [ALICE, BOB, CAROL]);
  assert.deepEqual(ctx.state.membersAt[5], [ALICE, BOB, CAROL]);
  assert.equal(holdsNow(ctx.state, BOB, SALE + 'make_offer'), true);
  assert.equal(holdsNow(ctx.state, CAROL, SALE + 'make_offer'), true);
  assert.equal(holdsNow(ctx.state, BOB, SALE + 'accept_offer'), false);
});

test("Alice reads every position; hidden count 0", () => {
  const ctx = build();
  assert.ok(ctx.view(ALICE).every((v) => v.event));
  assert.equal(ctx.hiddenCount(ALICE), 0);
});

test("Bob's view: spine plus his own invitation; Carol's invitation is a header", () => {
  const ctx = build();
  const v = ctx.view(BOB);
  assert.deepEqual(v.map((x) => (x.event ? 'r' : 'h')), ['r', 'r', 'r', 'r', 'h', 'r']);
  assert.equal(ctx.hiddenCount(BOB, 3), 0); // on entry, nothing hidden
  assert.equal(ctx.hiddenCount(BOB, 5), 1);
  assert.equal(v[4]!.headerHash, ctx.entries[4]!.headerHash);
});

test("Carol's view: spine plus her own invitation; Bob's invitation is a header", () => {
  const ctx = build();
  const v = ctx.view(CAROL);
  assert.deepEqual(v.map((x) => (x.event ? 'r' : 'h')), ['r', 'r', 'h', 'r', 'r', 'r']);
  assert.equal(ctx.hiddenCount(CAROL, 5), 1);
});

test('a late joiner receives the whole spine and addressed events, and members audiences are not retroactive', () => {
  const ctx = build();
  // a members-audience application event before Ivan joins
  const r = ctx.act(BOB, SALE + 'offer', { offer_id: 'o1' }); // 6, sequenced; ineffective in V1 (no offer fold yet)
  assert.ok(!('refused' in r));
  assert.equal(ctx.state.audiences[6]?.kind, 'members');
  const iIvan = invite(ctx, ALICE, 'ivan', ['Inspector']); // 7
  accept(ctx, 'ivan', iIvan); // 8
  const v = ctx.view('ivan');
  assert.deepEqual(v.map((x) => (x.event ? 'r' : 'h')), ['r', 'r', 'h', 'r', 'h', 'r', 'h', 'r', 'r']);
  assert.equal(ctx.hiddenCount('ivan'), 3);
  // a disclosure widens the audience of position 6 to Ivan
  const d = ctx.act(ALICE, K.disclose, { positions: [6], to: ['ivan'] }); // 9
  assert.ok(!('refused' in d) && d.verdict?.effective);
  assert.equal(ctx.hiddenCount('ivan'), 2);
  // an as-of query before the disclosure keeps the earlier basis
  assert.equal(ctx.hiddenCount('ivan', 8), 3);
});
