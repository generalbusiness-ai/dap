// The Discussion manifest's deterministic checks (spike plan §4.4, §4.7).

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkContext, withAudience } from '../src/checker.ts';
import { K } from '../src/foundation.ts';
import { generate, type GeneratorSpec } from '../src/generate.ts';
import { replay, shrink, type Script } from '../src/script.ts';
import { named } from '../src/types.ts';
import { DISCUSSION, discussionPackage } from '../fixtures/discussion.ts';
import { DISCUSSION_MANIFEST_ID, discussionBounds, discussionInvariants } from '../manifests/discussion.ts';
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

test('the manifest is frozen and cited by content id', () => {
  assert.match(DISCUSSION_MANIFEST_ID, /^sha256:[0-9a-f]{64}$/);
});

test('normal replay: generated series over the manifest seeds have zero violations, and the corpus exercises joins, a side attach and disclosures', () => {
  let joins = 0;
  let attaches = 0;
  let disclosures = 0;
  for (const seed of discussionBounds.seeds) {
    const script = generate(spec(), seed);
    const { ctx } = replay(script);
    assert.ok(ctx.head <= discussionBounds.maxPositions + 2, `seed ${seed} respects the bound`);
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

test('expected outcomes: closure is seen by a participant who joins after it; a post after closure is ineffective; an unauthorized post is ineffective', () => {
  const { ctx } = replay({
    base: spec().base,
    steps: [
      { type: 'act', actor: ALICE, kind: DISCUSSION + 'post', payload: { text: 'first' } },
      { type: 'act', actor: ALICE, kind: DISCUSSION + 'close', payload: {} },
      { type: 'invite', inviter: ALICE, invitee: BOB, grants: { roles: ['Member'] } },
      { type: 'accept', invitee: BOB },
    ],
  });
  const late = ctx.act(BOB, DISCUSSION + 'post', { text: 'too late' });
  assert.ok(!('refused' in late) && late.verdict?.perModel?.['discussion']?.reason === 'closed');
  assert.deepEqual(checkContext(ctx, { invariants: discussionInvariants }), []);
  const { ctx: open } = replay({ base: spec().base, steps: [{ type: 'invite', inviter: ALICE, invitee: CAROL, grants: { roles: [] } }, { type: 'accept', invitee: CAROL }] });
  const unauthorized = open.act(CAROL, DISCUSSION + 'post', { text: 'no cap' });
  assert.ok(!('refused' in unauthorized) && unauthorized.verdict?.reason === 'unauthorized');
  assert.deepEqual(checkContext(open, { invariants: discussionInvariants }), []);
  assert.equal(typeof K.close, 'string');
});
