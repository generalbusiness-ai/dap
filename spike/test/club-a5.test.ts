// Retrospective evidence for checker #1805 / V5-A5. The original policy
// expectation remains a failing TODO; no model or manifest is changed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkContext, describeViolation, observeInterpreted } from '../src/checker.ts';
import { Context } from '../src/context.ts';
import { K } from '../src/foundation.ts';
import { interpretView } from '../src/interpret.ts';
import { foldPrefix, oracleObserve } from '../src/oracle.ts';
import { applyStep, type Pending, type Script, type Step } from '../src/script.ts';
import { linkSteps, replayLinked, shrinkLinked } from '../corpus/club/replay.ts';
import { CLUB, clubPackage } from '../fixtures/club.ts';
import { BOB, CAROL, DANA, FOUNDER, FRANK, CLUB_MANIFEST_ID, clubBase, clubBudgetViolations, clubInvariants, committeePrelude } from '../manifests/club.ts';

const cases = ['invitation-acceptance', 'malformed-apply', 'standing-reason'] as const;
function checks(ctx: Context) {
  return checkContext(ctx, {
    invariants: clubInvariants,
    budget: (o, p, n, view) => clubBudgetViolations(o, p, foldPrefix(ctx, n), n, view),
  });
}
function build(name: typeof cases[number]) {
  const base = { ...clubBase(), nonce: 'v6-followup:a5:' + name };
  const ctx = Context.create(base);
  const pending: Pending = new Map();
  const steps: Step[] = [];
  function step(s: Step) { steps.push(s); return applyStep(ctx, s, pending); }
  function act(actor: string, kind: string, payload: unknown) {
    return step({ type: 'act', actor, kind, payload: payload as never, nonce: 'a5:' + steps.length });
  }
  for (const s of committeePrelude()) step(s);
  for (const [invitee, roles] of [[DANA, []], [FRANK, ['Member']]] as [string, string[]][]) {
    step({ type: 'invite', inviter: FOUNDER, invitee, grants: { roles } });
    step({ type: 'accept', invitee });
  }
  const target = name === 'invitation-acceptance'
    ? ctx.entries.find((e) => e.event.kind === K.accept_invite && e.event.actor === DANA)!.position
    : name === 'malformed-apply'
      ? act(DANA, CLUB + 'apply', { statement: 17 })
      : act(FOUNDER, CLUB + 'standing_reason', { member: DANA, text: 'private reason, not an application' });
  const id = ctx.entries[target]!.id;
  const votes = [BOB, CAROL].map((p) => act(p, CLUB + 'vote', { application_id: id, choice: 'yes' }));
  const admit = act(FOUNDER, CLUB + 'admit', { application_id: id });
  return { ctx, base, steps, target, votes, admit };
}

for (const name of cases) test(`post-baseline A5: invariants detect votes and admission naming ${name}`, async (t) => {
  const { ctx, base, steps, target, votes, admit } = build(name);
  const targetEntry = ctx.entries[target]!;
  if (name === 'malformed-apply') {
    assert.equal(ctx.state.verdicts[target]?.effective, false);
    assert.equal(ctx.state.verdicts[target]?.perModel?.club?.reason, 'malformed');
  } else assert.notEqual(targetEntry.event.kind, CLUB + 'apply');
  assert.equal((ctx.state.models.club as { applications: unknown[] }).applications.length, 0);
  const violations = checks(ctx);
  for (const at of votes) assert.ok(violations.some((v) => v.kind === 'invariant' && v.detail === `vote at ${at} on unknown application ${targetEntry.id}`));
  assert.ok(violations.some((v) => v.kind === 'invariant' && v.detail === `admit at ${admit} of unknown application ${targetEntry.id}`));
  assert.deepEqual(violations.filter((v) => v.kind !== 'invariant'), [], 'agreement and privacy do not establish application validity');
  const readers = ctx.state.participants.map((reader) => {
    const view = ctx.view(reader);
    const interpreted = interpretView(reader, view, ctx.head, ctx.packages);
    assert.equal(interpreted.kind, 'interpreted');
    if (interpreted.kind !== 'interpreted') throw new Error('unexpected pause');
    const observed = observeInterpreted(interpreted, view);
    assert.deepEqual(observed, oracleObserve(ctx, reader, ctx.head, ctx.head));
    return { reader, votes: votes.map((at) => observed.outcomes[String(at)]?.effective), admit: observed.outcomes[String(admit)]?.effective };
  });
  const grants = ctx.entries.filter((e) => e.position > admit && e.event.kind === K.grant);
  const linked = linkSteps({ base, steps } satisfies Script);
  assert.deepEqual(replayLinked(linked, base, {}).entries, ctx.entries);
  const fails = (candidate: typeof linked) => checks(replayLinked(candidate, base, {})).some((v) => v.kind === 'invariant' && /(?:vote at .* on|admit at .* of) unknown application/.test(v.detail));
  const minimal = shrinkLinked(linked, fails);
  assert.ok(fails(minimal));
  for (let i = 0; i < minimal.length; i++) assert.equal(fails(minimal.filter((_, j) => i !== j)), false);
  t.diagnostic(JSON.stringify({ clubA5: name, manifest: CLUB_MANIFEST_ID, package: clubPackage.id, nonce: base.nonce, target: { position: target, id: targetEntry.id, kind: targetEntry.event.kind, effective: ctx.state.verdicts[target]?.effective }, votes, admit, grants: grants.map((e) => ({ position: e.position, payload: e.event.payload })), readers, findings: violations.map(describeViolation), steps: linked, minimal }));
  await t.test('original policy requires rejection of invalid targets and no admission grant', { todo: 'V5-A5 retained negative result; no policy repair commissioned' }, () => {
    assert.deepEqual({ readers, grants: grants.length }, {
      readers: readers.map(({ reader }) => ({ reader, votes: [false, false], admit: false })), grants: 0,
    }, 'votes and admission must refer to an effective application; invalid targets must not grant Member');
  });
});
