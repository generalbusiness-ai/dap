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
import { MEMBERS, named, type EventBody } from '../src/types.ts';
import { descriptorId, type PackageDescriptor } from '../src/descriptor.ts';
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

test('a cached interpretation is reused only for the same principal, view content, basis and packages; a pause is never reused', () => {
  const ctx = discussionContext();
  accept(ctx, BOB, invite(ctx, ALICE, BOB, ['Member']));
  for (let i = 0; i < 19; i++) ctx.act(ALICE, DISCUSSION + 'post', { text: 'p' + i });
  ctx.act(ALICE, K.disclose, { positions: [1], to: [BOB] });
  assert.ok(ctx.head >= 22);
  const first = interpretCached(undefined, BOB, ctx.view(BOB, 21), 21, ctx.packages);
  assert.equal(first.reused, false);
  const again = interpretCached(first.cache, BOB, ctx.view(BOB, 21), 21, ctx.packages);
  assert.equal(again.reused, true);
  // another basis: discarded
  const moved = interpretCached(first.cache, BOB, ctx.view(BOB, 22), 22, ctx.packages);
  assert.equal(moved.reused, false);
  // another principal at the same numbers: discarded, and the result is theirs
  const other = interpretCached(first.cache, ALICE, ctx.view(ALICE, 21), 21, ctx.packages);
  assert.equal(other.reused, false);
  assert.equal(other.result.principal, ALICE);
  // a pause is never reused: once the package arrives, the rebuild interprets
  const side = pkg('side', { 'com.example.side.note': ['side'] });
  ctx.packages[side.id] = side;
  ctx.act(ALICE, K.attach, { package: side.id }); // open attach
  const n = ctx.head;
  const withoutSide = { [discussionPackage.id]: discussionPackage };
  const paused = interpretCached(undefined, BOB, ctx.view(BOB, n), n, withoutSide);
  assert.equal(paused.result.kind, 'paused');
  const arrived = interpretCached(paused.cache, BOB, ctx.view(BOB, n), n, ctx.packages);
  assert.equal(arrived.reused, false);
  assert.equal(arrived.result.kind, 'interpreted');
});

// ----- checker's V2 review (workroom report 06ea1952), F1 and F2 -----

function noopBase() {
  // a no-op base kind whose state never changes, so a contradiction cannot show in displayed state
  return pkg('base', { 'com.example.base.tick': { handlers: ['base'], audienceId: 'members', audience: () => MEMBERS } });
}

test('F2: a disclosed event whose binding the principal cannot resolve pauses with dependency_missing, and resumes once the attach is disclosed', () => {
  const base = noopBase();
  const ctx = Context.create({ creator: ALICE, packages: { [base.id]: base }, bindings: [{ package: base.id }], grants: [{ principal: ALICE, capabilities: ALICE_CAPS }] });
  accept(ctx, BOB, invite(ctx, ALICE, BOB, [])); // 1, 2
  const audit = pkg('audit', { 'com.example.base.tick': ['audit'] });
  ctx.packages[audit.id] = audit;
  const a = ctx.act(ALICE, K.attach, { package: audit.id, resolution: { 'com.example.base.tick': { handlers: ['base', 'audit'] } }, audience: [] }); // 3, Alice alone
  assert.ok(!('refused' in a) && a.verdict?.effective);
  const tick = ctx.act(ALICE, 'com.example.base.tick', {}); // 4, effective under the new binding
  assert.ok(!('refused' in tick) && tick.verdict?.effective);
  const d = ctx.act(ALICE, K.disclose, { positions: [4], to: [BOB] }); // 5: the event, not the attach
  assert.ok(!('refused' in d) && d.verdict?.effective);
  const r = interpretView(BOB, ctx.view(BOB, 5), 5, ctx.packages);
  assert.equal(r.kind, 'paused');
  if (r.kind === 'paused') {
    assert.equal(r.at, 4);
    assert.equal(r.reason, 'dependency_missing');
    assert.ok(isDeepStrictEqual(observeInterpreted(r.last, ctx.view(BOB, 5)), oracleObserve(ctx, BOB, 3, 5)));
  }
  // the checker applies the pause rule without a violation
  assert.deepEqual(checkContext(ctx, { participants: [BOB], frontiers: [5] }), []);
  // disclosing the attach too completes the dependency: interpreted, effective, equal
  const d2 = ctx.act(ALICE, K.disclose, { positions: [3], to: [BOB] }); // 6
  assert.ok(!('refused' in d2) && d2.verdict?.effective);
  const view6 = ctx.view(BOB, 6);
  const r2 = interpretView(BOB, view6, 6, ctx.packages);
  assert.equal(r2.kind, 'interpreted');
  if (r2.kind === 'interpreted') {
    assert.equal(r2.outcomes[4]?.effective, true);
    assert.ok(isDeepStrictEqual(observeInterpreted(r2, view6), oracleObserve(ctx, BOB, 6, 6)));
  }
});

test('F1: a contradiction that changes no displayed state is caught through outcomes: a shared decision whose fold reads private votes', () => {
  // votes are private to the voter and Alice; the decision is members-visible and effective only with two votes;
  // the projection shows nothing, so only the outcomes can reveal the contradiction (views note, position 18)
  const tallyBase: Omit<PackageDescriptor, 'id'> = {
    name: 'com.example.tally',
    models: {
      tally: {
        id: 'tally',
        config: {},
        init: () => ({ votes: 0, decided: false }),
        fold: (s: { votes: number; decided: boolean }, ev: EventBody) => {
          if (ev.kind === 'com.example.tally.vote') return { effective: true, state: { ...s, votes: s.votes + 1 } };
          if (ev.kind === 'com.example.tally.decide') return s.votes >= 2 ? { effective: true, state: { ...s, decided: true } } : { effective: false, state: s, reason: 'not_enough_votes' };
          return { effective: false, state: s, reason: 'unhandled' };
        },
        observe: () => ({}),
      } as unknown as PackageDescriptor['models'][string],
    },
    capabilities: [],
    kinds: {
      'com.example.tally.vote': { kind: 'com.example.tally.vote', schema: {}, handlers: ['tally'], audienceId: 'voter+alice', audience: (_c, ev) => named(ev.actor, ALICE) },
      'com.example.tally.decide': { kind: 'com.example.tally.decide', schema: {}, handlers: ['tally'], audienceId: 'members', audience: () => MEMBERS },
    },
  };
  const tally: PackageDescriptor = { id: descriptorId(tallyBase), ...tallyBase };
  const ctx = Context.create({ creator: ALICE, packages: { [tally.id]: tally }, bindings: [{ package: tally.id }], grants: [{ principal: ALICE, capabilities: ALICE_CAPS }] });
  accept(ctx, BOB, invite(ctx, ALICE, BOB, [])); // 1, 2
  accept(ctx, CAROL, invite(ctx, ALICE, CAROL, [])); // 3, 4
  ctx.act(BOB, 'com.example.tally.vote', {}); // 5, Bob and Alice
  ctx.act(CAROL, 'com.example.tally.vote', {}); // 6, Carol and Alice
  const decide = ctx.act(ALICE, 'com.example.tally.decide', {}); // 7, members
  assert.ok(!('refused' in decide) && decide.verdict?.effective);
  const violations = checkContext(ctx, { participants: [BOB], frontiers: [7] });
  assert.equal(violations.length, 1, JSON.stringify(violations.map((v) => [v.participant, v.frontier, v.kind])));
  const v = violations[0]!;
  assert.equal(v.kind, 'mismatch');
  assert.equal(v.expected?.outcomes['7']?.effective, true);
  assert.equal(v.actual?.outcomes['7']?.reason, 'ineffective');
  // the displayed state is identical on both sides: only the outcome differs
  assert.deepEqual(v.actual?.models, v.expected?.models);
  // Alice, who sees every vote, agrees with the oracle
  assert.deepEqual(checkContext(ctx, { participants: [ALICE], frontiers: [7] }), []);
});

// ----- checker's second V2 review (workroom report a9020394), G1 to G3 -----

function tallyPackage(): PackageDescriptor {
  const base: Omit<PackageDescriptor, 'id'> = {
    name: 'com.example.tally',
    models: {
      tally: {
        id: 'tally',
        config: {},
        init: () => ({ votes: 0, decided: false }),
        fold: (s: { votes: number; decided: boolean }, ev: EventBody) => {
          if (ev.kind === 'com.example.tally.vote') return { effective: true, state: { ...s, votes: s.votes + 1 } };
          if (ev.kind === 'com.example.tally.decide') return s.votes >= 2 ? { effective: true, state: { ...s, decided: true } } : { effective: false, state: s, reason: 'not_enough_votes' };
          return { effective: false, state: s, reason: 'unhandled' };
        },
        observe: () => ({}),
      } as unknown as PackageDescriptor['models'][string],
    },
    capabilities: [],
    kinds: {
      'com.example.tally.vote': { kind: 'com.example.tally.vote', schema: {}, handlers: ['tally'], audienceId: 'voter+alice', audience: (_c, ev) => named(ev.actor, ALICE) },
      'com.example.tally.decide': { kind: 'com.example.tally.decide', schema: {}, handlers: ['tally'], audienceId: 'members', audience: () => MEMBERS },
    },
  };
  return { id: descriptorId(base), ...base };
}

test('G1: an always-effective co-handler cannot mask a contradiction; per-handler outcomes are compared', () => {
  const tally = tallyPackage();
  const ctx = Context.create({ creator: ALICE, packages: { [tally.id]: tally }, bindings: [{ package: tally.id }], grants: [{ principal: ALICE, capabilities: ALICE_CAPS }] });
  accept(ctx, BOB, invite(ctx, ALICE, BOB, [])); // 1, 2
  accept(ctx, CAROL, invite(ctx, ALICE, CAROL, [])); // 3, 4
  // a public attach adds a no-op audit handler to decide
  const audit = pkg('audit', { 'com.example.tally.decide': ['audit'] });
  ctx.packages[audit.id] = audit;
  const a = ctx.act(ALICE, K.attach, { package: audit.id, resolution: { 'com.example.tally.decide': { handlers: ['tally', 'audit'] } } }); // 5
  assert.ok(!('refused' in a) && a.verdict?.effective);
  ctx.act(BOB, 'com.example.tally.vote', {}); // 6
  ctx.act(CAROL, 'com.example.tally.vote', {}); // 7
  const decide = ctx.act(ALICE, 'com.example.tally.decide', {}); // 8
  assert.ok(!('refused' in decide) && decide.verdict?.effective);
  const violations = checkContext(ctx, { participants: [BOB], frontiers: [8] });
  assert.equal(violations.length, 1, JSON.stringify(violations.map((v) => [v.participant, v.frontier, v.kind])));
  const v = violations[0]!;
  // the aggregate verdict agrees (audit is effective on both sides); the tally handler does not
  assert.equal(v.expected?.outcomes['8']?.effective, true);
  assert.equal(v.actual?.outcomes['8']?.effective, true);
  assert.equal(v.expected?.outcomes['8']?.perModel?.['tally']?.effective, true);
  assert.equal(v.actual?.outcomes['8']?.perModel?.['tally']?.reason, 'not_enough_votes');
  assert.deepEqual(v.actual?.models, v.expected?.models);
});

test('G2: a disclosed intent that is genuinely stale is a stale_binding verdict, not a permanent pause', () => {
  const base = noopBase();
  const ctx = Context.create({ creator: ALICE, packages: { [base.id]: base }, bindings: [{ package: base.id }], grants: [{ principal: ALICE, capabilities: ALICE_CAPS }] });
  const saved = ctx.intent(ALICE, 'com.example.base.tick', {}); // bound to the genesis binding
  const audit = pkg('audit', { 'com.example.base.tick': ['audit'] });
  ctx.packages[audit.id] = audit;
  const a = ctx.act(ALICE, K.attach, { package: audit.id, resolution: { 'com.example.base.tick': { handlers: ['base', 'audit'] } } }); // 1, public
  assert.ok(!('refused' in a) && a.verdict?.effective);
  const stale = ctx.submit(saved, ctx.credentialFor(ALICE)); // 2
  assert.ok(!('refused' in stale) && stale.verdict?.reason === 'stale_binding');
  accept(ctx, BOB, invite(ctx, ALICE, BOB, [])); // 3, 4
  const d = ctx.act(ALICE, K.disclose, { positions: [2], to: [BOB] }); // 5
  assert.ok(!('refused' in d) && d.verdict?.effective);
  const view = ctx.view(BOB, 5);
  const r = interpretView(BOB, view, 5, ctx.packages);
  assert.equal(r.kind, 'interpreted');
  if (r.kind === 'interpreted') {
    assert.equal(r.outcomes[2]?.reason, 'stale_binding');
    assert.ok(isDeepStrictEqual(observeInterpreted(r, view), oracleObserve(ctx, BOB, 5, 5)));
  }
  assert.deepEqual(checkContext(ctx, { participants: [BOB], frontiers: [5] }), []);
});

test('G3: affordances come from the visible binding, so a hidden attach with its own affordances causes no false mismatch', () => {
  const base = noopBase();
  const ctx = Context.create({ creator: ALICE, packages: { [base.id]: base }, bindings: [{ package: base.id }], grants: [{ principal: ALICE, capabilities: ALICE_CAPS }] });
  accept(ctx, BOB, invite(ctx, ALICE, BOB, [])); // 1, 2
  // a private attach adds a no-op handler to base.tick and its own kind with an affordance function
  const auditBase: Omit<PackageDescriptor, 'id'> = {
    name: 'audit',
    models: { audit: { id: 'audit', config: {}, init: () => ({}), fold: (s: Record<string, never>) => ({ effective: true, state: s }), affordances: () => ['com.example.audit.note'] } as unknown as PackageDescriptor['models'][string] },
    capabilities: [],
    kinds: {
      'com.example.base.tick': { kind: 'com.example.base.tick', schema: { v: 1 }, handlers: ['audit'], audienceId: 'members', audience: () => MEMBERS },
      'com.example.audit.note': { kind: 'com.example.audit.note', schema: {}, handlers: ['audit'], audienceId: 'members', audience: () => MEMBERS },
    },
  };
  const audit: PackageDescriptor = { id: descriptorId(auditBase), ...auditBase };
  ctx.packages[audit.id] = audit;
  const a = ctx.act(ALICE, K.attach, { package: audit.id, resolution: { 'com.example.base.tick': { handlers: ['base', 'audit'] } }, audience: [] }); // 3, Alice alone
  assert.ok(!('refused' in a) && a.verdict?.effective);
  assert.deepEqual(checkContext(ctx, { participants: [BOB, ALICE], frontiers: [3] }), []);
  assert.ok(!oracleObserve(ctx, BOB, 3, 3).affordances.includes('com.example.audit.note'));
  assert.ok(oracleObserve(ctx, ALICE, 3, 3).affordances.includes('com.example.audit.note'));
});
