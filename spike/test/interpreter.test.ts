// The interpreter against the oracle: the sale trace, a late joiner, a
// disclosure, and the views note's pause example.

import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { test } from 'node:test';
import { checkContext, observeInterpreted } from '../src/checker.ts';
import { K } from '../src/foundation.ts';
import { interpretCached, interpretView } from '../src/interpret.ts';
import { oracleObserve } from '../src/oracle.ts';
import { SALE } from '../fixtures/sale.ts';
import { DISCUSSION, discussionPackage } from '../fixtures/discussion.ts';
import { ALICE, ALICE_CAPS, BOB, CAROL, accept, invite, pkg, saleContext } from './helpers.ts';
import { Context } from '../src/context.ts';

function trace() {
  const ctx = saleContext();
  accept(ctx, BOB, invite(ctx, ALICE, BOB));
  accept(ctx, CAROL, invite(ctx, ALICE, CAROL));
  return ctx;
}

test('the sale trace 0 to 5 interprets to the oracle for every participant at every frontier', () => {
  const ctx = trace();
  for (const p of [ALICE, BOB, CAROL]) {
    for (let n = 0; n <= ctx.head; n++) {
      const view = ctx.view(p, n);
      const r = interpretView(p, view, n, ctx.packages);
      assert.equal(r.kind, 'interpreted');
      if (r.kind !== 'interpreted') continue;
      assert.ok(isDeepStrictEqual(observeInterpreted(r, view), oracleObserve(ctx, p, n, n)), `${p} at ${n}`);
      // hidden positions never enter as payloads
      for (const v of view) if (!v.event) assert.equal(r.outcomes[v.position]?.reason, 'hidden');
    }
  }
  assert.deepEqual(checkContext(ctx), []);
});

test('a late joiner, a members-audience event before they joined, a disclosure and an as-of query keep the property', () => {
  const ctx = trace();
  ctx.act(BOB, SALE + 'offer', { offer_id: 'o1' }); // 6, members
  accept(ctx, 'ivan', invite(ctx, ALICE, 'ivan', ['Inspector'])); // 7, 8
  const d = ctx.act(ALICE, K.disclose, { positions: [6], to: ['ivan'] }); // 9
  assert.ok(!('refused' in d) && d.verdict?.effective);
  assert.deepEqual(checkContext(ctx, { participants: [ALICE, BOB, CAROL, 'ivan'] }), []);
  // as-of 8, before the disclosure, Ivan's view hides 6; at 9 it is disclosed; both agree with the oracle under their basis
  const before = interpretView('ivan', ctx.view('ivan', 8), 8, ctx.packages);
  const after = interpretView('ivan', ctx.view('ivan', 9), 9, ctx.packages);
  assert.ok(before.kind === 'interpreted' && after.kind === 'interpreted');
  assert.equal(before.outcomes[6]?.reason, 'hidden');
  assert.notEqual(after.outcomes[6]?.reason, 'hidden');
});

function discussionContext() {
  return Context.create({
    creator: ALICE,
    packages: { [discussionPackage.id]: discussionPackage },
    bindings: [{ package: discussionPackage.id }],
    grants: [{ principal: ALICE, roles: ['Moderator'], capabilities: ALICE_CAPS }],
  });
}

test("the views note's pause example: a disclosure followed by an unavailable package pauses with last through the position before, under the disclosure's basis, and resumes", () => {
  const ctx = discussionContext();
  accept(ctx, BOB, invite(ctx, ALICE, BOB, ['Member']));
  ctx.act(ALICE, DISCUSSION + 'post', { text: 'hello' }); // 3
  const side = pkg('side', { 'com.example.side.note': ['side'] });
  ctx.packages[side.id] = side;
  const a = ctx.act(ALICE, K.attach, { package: side.id, audience: [] }); // 4, Alice alone
  assert.ok(!('refused' in a) && a.verdict?.effective);
  const note = ctx.act(ALICE, 'com.example.side.note', { text: 'private' }); // 5, capped to Alice
  assert.ok(!('refused' in note) && note.verdict?.effective);
  accept(ctx, CAROL, invite(ctx, ALICE, CAROL, ['Member'])); // 6, 7
  const disc = ctx.act(ALICE, K.disclose, { positions: [3, 4, 5], to: [CAROL] }); // 8
  assert.ok(!('refused' in disc) && disc.verdict?.effective);
  const basis = ctx.head;
  const withoutSide = { [discussionPackage.id]: discussionPackage };
  const view = ctx.view(CAROL, basis);
  const r = interpretView(CAROL, view, basis, withoutSide);
  assert.equal(r.kind, 'paused');
  if (r.kind !== 'paused') return;
  assert.equal(r.at, 4);
  assert.equal(r.reason, 'package_unavailable');
  // last is the rebuild through 3 under basis 8: it includes the post at 3, disclosed at 8
  const last = observeInterpreted(r.last, view);
  assert.ok(isDeepStrictEqual(last, oracleObserve(ctx, CAROL, 3, basis)));
  assert.equal((last.models['discussion'] as { posts: unknown[] }).posts.length, 1);
  // not the historical as-of view at 3, where Carol was not yet a member and saw nothing
  assert.equal((oracleObserve(ctx, CAROL, 3, 3).models['discussion'] as { posts: unknown[] }).posts.length, 0);
  // resume with the package supplied
  const resumed = interpretView(CAROL, view, basis, ctx.packages);
  assert.equal(resumed.kind, 'interpreted');
  if (resumed.kind === 'interpreted') assert.ok(isDeepStrictEqual(observeInterpreted(resumed, view), oracleObserve(ctx, CAROL, basis, basis)));
  // the checker applies the pause rule and the resume check without a violation
  assert.deepEqual(checkContext(ctx, { participants: [CAROL], available: () => withoutSide, frontiers: [basis] }), []);
});

test('a dependency-incomplete disclosure pauses: the event is disclosed but the attach it needs is not', () => {
  const ctx = discussionContext();
  const side = pkg('side', { 'com.example.side.note': ['side'] });
  ctx.packages[side.id] = side;
  ctx.act(ALICE, K.attach, { package: side.id, audience: [] }); // 1
  ctx.act(ALICE, 'com.example.side.note', { text: 'private' }); // 2
  accept(ctx, CAROL, invite(ctx, ALICE, CAROL, ['Member'])); // 3, 4
  ctx.act(ALICE, K.disclose, { positions: [2], to: [CAROL] }); // 5
  const r = interpretView(CAROL, ctx.view(CAROL, 5), 5, ctx.packages);
  assert.equal(r.kind, 'paused');
  if (r.kind === 'paused') {
    assert.equal(r.at, 2);
    assert.equal(r.reason, 'dependency_missing');
    assert.equal(r.last.frontier, 1);
  }
});

test('a cached interpretation is reused under its basis and discarded under another', () => {
  const ctx = discussionContext();
  accept(ctx, BOB, invite(ctx, ALICE, BOB, ['Member']));
  for (let i = 0; i < 19; i++) ctx.act(ALICE, DISCUSSION + 'post', { text: 'p' + i });
  ctx.act(ALICE, K.disclose, { positions: [1], to: [BOB] });
  assert.ok(ctx.head >= 22);
  const first = interpretCached(undefined, BOB, ctx.view(BOB, 21), 21, ctx.packages);
  assert.equal(first.reused, false);
  const again = interpretCached(first.cache, BOB, ctx.view(BOB, 21), 21, ctx.packages);
  assert.equal(again.reused, true);
  const moved = interpretCached(first.cache, BOB, ctx.view(BOB, 22), 22, ctx.packages);
  assert.equal(moved.reused, false);
  assert.equal(moved.cache.basis, 22);
});
