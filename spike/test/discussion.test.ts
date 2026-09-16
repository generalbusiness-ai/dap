// The Discussion manifest's deterministic checks (spike plan §4.4, §4.7).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkContext, withAudience } from '../src/checker.ts';
import { K } from '../src/foundation.ts';
import { generate, type GeneratorSpec } from '../src/generate.ts';
import { replay, shrink, type Script } from '../src/script.ts';
import { named } from '../src/types.ts';
import { DISCUSSION, discussionPackage } from '../fixtures/discussion.ts';
import { DISCUSSION_MANIFEST_ID, discussionBounds, discussionInvariants, proseBounds } from '../manifests/discussion.ts';
import { oracleObserve } from '../src/oracle.ts';
import { descriptorId, type PackageDescriptor } from '../src/descriptor.ts';
import { CAP, K as KIND } from '../src/foundation.ts';
import { ALICE, ALICE_CAPS, BOB, CAROL, pkg } from './helpers.ts';

const side = pkg('side', { 'com.example.side.note': ['side'] });

function spec(packageUnderTest = discussionPackage): GeneratorSpec {
  return {
    base: {
      creator: ALICE,
      packages: { [packageUnderTest.id]: packageUnderTest },
      bindings: [{ package: packageUnderTest.id }],
      grants: [{ principal: ALICE, roles: ['Moderator'], capabilities: ALICE_CAPS }],
    },
    newcomers: [BOB, CAROL, 'dave'],
    newcomerRoles: ['Member'],
    payloads: {
      [DISCUSSION + 'post']: (r, { step }) => ({ text: 'post ' + step + ' ' + Math.floor(r() * 1000) }),
      [DISCUSSION + 'close']: () => ({}),
    },
    sidePackage: side,
    bounds: { maxPositions: discussionBounds.maxPositions, maxParticipants: discussionBounds.maxParticipants },
  };
}

test('the manifest is one experiment identity over its prose, its executable part and the package, and the prose states the same bounds', (t) => {
  assert.match(DISCUSSION_MANIFEST_ID, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(proseBounds(), discussionBounds);
  t.diagnostic('DISCUSSION_MANIFEST_ID ' + DISCUSSION_MANIFEST_ID);
});

test('normal replay: generated series over the manifest seeds have zero violations, and the corpus exercises joins, a side attach and disclosures', () => {
  let joins = 0;
  let attaches = 0;
  let disclosures = 0;
  for (const seed of discussionBounds.seeds) {
    const script = generate(spec(), seed);
    const { ctx } = replay(script);
    assert.ok(ctx.head + 1 <= discussionBounds.maxPositions, `seed ${seed} has ${ctx.head + 1} entries, bound ${discussionBounds.maxPositions}`);
    const violations = checkContext(ctx, { invariants: discussionInvariants });
    assert.deepEqual(violations, [], `seed ${seed}: ${JSON.stringify(violations.map((v) => [v.participant, v.frontier, v.kind, v.detail]))}`);
    joins += script.steps.filter((s) => s.type === 'accept').length;
    attaches += script.steps.filter((s) => s.type === 'attach').length;
    disclosures += script.steps.filter((s) => s.type === 'disclose').length;
  }
  assert.ok(joins > 0 && attaches > 0 && disclosures > 0, `coverage: joins ${joins}, attaches ${attaches}, disclosures ${disclosures}`);
});

test('pause and resume: a client without the side package pauses at the attach and resumes to equality with it', () => {
  const script = generate(spec(), discussionBounds.seeds[0]!);
  // make sure the side attach is present and visible to a member other than the attacher: attach it openly
  const steps = script.steps.filter((s) => s.type !== 'attach');
  const withOpenAttach: Script = { base: script.base, steps: [...steps.slice(0, 2), { type: 'attach', actor: ALICE, pkg: side }, ...steps.slice(2)] };
  const { ctx } = replay(withOpenAttach);
  const withoutSide = { [discussionPackage.id]: discussionPackage };
  const violations = checkContext(ctx, { available: () => withoutSide, invariants: discussionInvariants });
  assert.deepEqual(violations, []);
});

test('planted fault: closing privately breaks the shared outcome for a late joiner, and the checker finds it', () => {
  const broken = withAudience(discussionPackage, DISCUSSION + 'close', 'actor-only', (_ctx, ev) => named(ev.actor));
  const script: Script = {
    base: spec(broken).base,
    steps: [
      { type: 'act', actor: ALICE, kind: DISCUSSION + 'post', payload: { text: 'first' } },
      { type: 'act', actor: ALICE, kind: DISCUSSION + 'close', payload: {} },
      { type: 'invite', inviter: ALICE, invitee: BOB, grants: { roles: ['Member'] } },
      { type: 'accept', invitee: BOB },
    ],
  };
  const { ctx } = replay(script);
  const violations = checkContext(ctx);
  assert.ok(violations.some((v) => v.participant === BOB && v.kind === 'mismatch'), JSON.stringify(violations.map((v) => [v.participant, v.frontier, v.kind])));
  // the correct package has no such violation on the same series
  const { ctx: good } = replay({ base: spec().base, steps: script.steps });
  assert.deepEqual(checkContext(good), []);
});

test('shrinking: the failing series reduces to a minimal script that still fails', () => {
  const broken = withAudience(discussionPackage, DISCUSSION + 'close', 'actor-only', (_ctx, ev) => named(ev.actor));
  const script: Script = {
    base: spec(broken).base,
    steps: [
      { type: 'act', actor: ALICE, kind: DISCUSSION + 'post', payload: { text: 'first' } },
      { type: 'act', actor: ALICE, kind: DISCUSSION + 'post', payload: { text: 'second' } },
      { type: 'act', actor: ALICE, kind: DISCUSSION + 'close', payload: {} },
      { type: 'invite', inviter: ALICE, invitee: BOB, grants: { roles: ['Member'] } },
      { type: 'accept', invitee: BOB },
      { type: 'act', actor: ALICE, kind: DISCUSSION + 'post', payload: { text: 'after' } },
    ],
  };
  const fails = (s: Script) => checkContext(replay(s).ctx).length > 0;
  assert.ok(fails(script));
  const minimal = shrink(script, fails);
  assert.ok(fails(minimal));
  assert.ok(minimal.steps.length <= 3, `minimal has ${minimal.steps.length} steps`);
  assert.ok(minimal.steps.some((s) => s.type === 'act' && s.kind === DISCUSSION + 'close'));
  assert.ok(minimal.steps.some((s) => s.type === 'accept'));
});

/** The manifest's expected observations, derived from the recorded events, their verdicts, membership at recording and disclosures; it never calls a model's observe. */
function expectedDiscussion(ctx: ReturnType<typeof replay>['ctx'], p: string, n: number) {
  const entries = ctx.entries;
  const memberAt = (i: number) => (ctx.state.membersAt[i] ?? []).includes(p);
  const disclosedTo = (i: number) => ctx.state.disclosures.some((d) => d.position <= n && d.to.includes(p) && d.positions.includes(i));
  let closedAt: number | null = null;
  const posts: { position: number; author: string; text: string }[] = [];
  for (let i = 1; i <= n; i++) {
    const e = entries[i]!.event;
    if (e.kind === DISCUSSION + 'close' && closedAt === null && ctx.state.verdicts[i]?.effective) closedAt = i;
    if (e.kind === DISCUSSION + 'post' && ctx.state.verdicts[i]?.effective && (memberAt(i) || disclosedTo(i))) {
      posts.push({ position: i, author: e.actor, text: (e.payload as { text: string }).text });
    }
  }
  return { closed: closedAt !== null, closedAt, posts };
}

function withBrokenObserve(p: PackageDescriptor): PackageDescriptor {
  const { id: _id, module: _m, ...surface } = p;
  const models = { ...surface.models, discussion: { ...surface.models['discussion']!, observe: () => ({ closed: false, closedAt: null, posts: [] }) } };
  const base: Omit<PackageDescriptor, 'id'> = { ...surface, models };
  return { id: descriptorId(base), ...base };
}

test('expected outcomes, independent of the fold: closure is seen by a late joiner; posts are seen exactly by members at the time and by disclosure; a post after closure and an unauthorized post are ineffective', () => {
  const steps = (): import('../src/script.ts').Step[] => [
    { type: 'act', actor: ALICE, kind: DISCUSSION + 'post', payload: { text: 'first' } }, // 1
    { type: 'invite', inviter: ALICE, invitee: BOB, grants: { roles: ['Member'] } }, // 2
    { type: 'accept', invitee: BOB }, // 3
    { type: 'act', actor: BOB, kind: DISCUSSION + 'post', payload: { text: 'second' } }, // 4
    { type: 'act', actor: ALICE, kind: DISCUSSION + 'close', payload: {} }, // 5
    { type: 'invite', inviter: ALICE, invitee: CAROL, grants: { roles: ['Member'] } }, // 6
    { type: 'accept', invitee: CAROL }, // 7
    { type: 'disclose', actor: ALICE, positions: [1], to: [BOB] }, // 8
  ];
  const { ctx } = replay({ base: spec().base, steps: steps() });
  assert.equal(ctx.head, 8);
  // literal expectations
  const seen = (p: string, n: number) => oracleObserve(ctx, p, n, n).models['discussion'] as { closed: boolean; closedAt: number | null; posts: { position: number }[] };
  assert.deepEqual(seen(CAROL, 8), { closed: true, closedAt: 5, posts: [] }); // late joiner sees closure, no posts
  assert.deepEqual(seen(ALICE, 8).posts.map((x) => x.position), [1, 4]);
  assert.deepEqual(seen(BOB, 7).posts.map((x) => x.position), [4]); // before the disclosure
  assert.deepEqual(seen(BOB, 8).posts.map((x) => x.position), [1, 4]); // after it, original position kept
  // the same expectations, derived from events and membership alone, for every participant and frontier
  for (const p of [ALICE, BOB, CAROL]) for (let n = 0; n <= 8; n++) assert.deepEqual(seen(p, n), expectedDiscussion(ctx, p, n), `${p} at ${n}`);
  assert.deepEqual(checkContext(ctx, { invariants: discussionInvariants }), []);
  // ineffective attempts
  const late = ctx.act(BOB, DISCUSSION + 'post', { text: 'too late' });
  assert.ok(!('refused' in late) && late.verdict?.perModel?.['discussion']?.reason === 'closed');
  const { ctx: open } = replay({ base: spec().base, steps: [{ type: 'invite', inviter: ALICE, invitee: CAROL, grants: { roles: [] } }, { type: 'accept', invitee: CAROL }] });
  const unauthorized = open.act(CAROL, DISCUSSION + 'post', { text: 'no cap' });
  assert.ok(!('refused' in unauthorized) && unauthorized.verdict?.reason === 'unauthorized');
  // a wrong projection passes the checker's equality (both sides use it) but fails the literal expectations
  const broken = withBrokenObserve(discussionPackage);
  const { ctx: bad } = replay({ base: spec(broken).base, steps: steps() });
  assert.deepEqual(checkContext(bad, { invariants: discussionInvariants }), []);
  const badSeen = oracleObserve(bad, CAROL, 8, 8).models['discussion'];
  assert.notDeepEqual(badSeen, expectedDiscussion(bad, CAROL, 8));
  assert.equal(typeof KIND.close, 'string');
  assert.equal(typeof CAP.close, 'string');
});

test('F5: the generator never exceeds its entry bound, even when a compound step would', () => {
  for (const seed of [7, 1, 2, 3]) {
    for (const maxPositions of [1, 2, 3, 5]) {
      const s = spec();
      const script = generate({ ...s, bounds: { maxPositions, maxParticipants: 4 } }, seed);
      const { ctx } = replay(script);
      assert.ok(ctx.head + 1 <= maxPositions, `seed ${seed} bound ${maxPositions}: ${ctx.head + 1} entries`);
    }
  }
});
