// V6: one audience fault per model, binding locality, and hidden revocation.
// Every mutation has a clean control and a specific expected mismatch.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Json } from '../src/canon.ts';
import { checkContext, describeViolation, observeInterpreted, withAudience, type CheckOptions } from '../src/checker.ts';
import { Context } from '../src/context.ts';
import type { PackageDescriptor } from '../src/descriptor.ts';
import { K } from '../src/foundation.ts';
import { interpretView } from '../src/interpret.ts';
import { foldPrefix } from '../src/oracle.ts';
import { applyStep, type Pending, type Script, type Step } from '../src/script.ts';
import { named } from '../src/types.ts';
import { linkSteps, replayLinked, shrinkLinked } from '../corpus/club/replay.ts';
import { SALE, salePackage } from '../fixtures/sale.ts';
import { BOOKING, bookingPackage } from '../fixtures/booking.ts';
import { CLUB, clubPackage } from '../fixtures/club.ts';
import { SALE_MANIFEST_ID, saleBase, saleBudgetViolations, saleInvariants } from '../manifests/sale.ts';
import { BOOKING_MANIFEST_ID, bookingBase, bookingBudgetViolations, bookingInvariants } from '../manifests/booking.ts';
import { CLUB_MANIFEST_ID, clubBase, clubBudgetViolations, clubInvariants } from '../manifests/club.ts';
import { pkg } from './helpers.ts';

const ALICE = 'alice', BOB = 'bob', DANA = 'dana';
function join(ctx: Context, principal: string, roles: string[], steps?: Step[]) {
  const pending: Pending = new Map();
  const invite: Step = { type: 'invite', inviter: ALICE, invitee: principal, grants: { roles } };
  const accept: Step = { type: 'accept', invitee: principal };
  steps?.push(invite, accept);
  applyStep(ctx, invite, pending);
  applyStep(ctx, accept, pending);
  assert.ok(ctx.state.participants.includes(principal));
}
function act(ctx: Context, actor: string, kind: string, payload: Json, steps?: Step[]) {
  const step: Step = { type: 'act', actor, kind, payload, nonce: 'v6:' + (ctx.head + 1) };
  steps?.push(step);
  const position = applyStep(ctx, step, new Map());
  assert.ok(position >= 0, kind + ' is recorded');
  return { position, id: ctx.entries[position]!.id, verdict: ctx.state.verdicts[position]! };
}
interface ModelCase {
  name: string;
  package: PackageDescriptor;
  manifest: string;
  base: (pkg: PackageDescriptor) => Script['base'];
  checks: (ctx: Context) => CheckOptions;
  mutation: {
    kind: string; reader: string; expectedEffective: boolean;
    actualReason: string | null; expectedReason: string | null;
    build: (ctx: Context, steps?: Step[]) => { hidden: number; dependent: number };
  };
  binding: { kind: string; actor: string; roles: string[]; first: Json; next: Json };
}
const cases: ModelCase[] = [
  {
    name: 'sale', package: salePackage, manifest: SALE_MANIFEST_ID, base: saleBase,
    checks: () => ({ invariants: saleInvariants, budget: (o, p, _n, view) => saleBudgetViolations(o, p, ALICE, view) }),
    mutation: {
      kind: SALE + 'offer', reader: ALICE, expectedEffective: true, expectedReason: null, actualReason: 'no_such_offer',
      build(ctx, steps) {
        join(ctx, BOB, ['Buyer'], steps);
        const offer = act(ctx, BOB, SALE + 'offer', { offer_id: 'o1' }, steps);
        const accept = act(ctx, ALICE, SALE + 'accept', { offer_id: 'o1' }, steps);
        return { hidden: offer.position, dependent: accept.position };
      },
    },
    binding: { kind: SALE + 'offer', actor: BOB, roles: ['Buyer'], first: { offer_id: 'o1' }, next: { offer_id: 'o2' } },
  },
  {
    name: 'booking', package: bookingPackage, manifest: BOOKING_MANIFEST_ID, base: bookingBase,
    checks: () => ({ invariants: bookingInvariants, budget: (o, p, _n, view) => bookingBudgetViolations(o, p, ALICE, view) }),
    mutation: {
      kind: BOOKING + 'occupancy', reader: BOB, expectedEffective: true, expectedReason: null, actualReason: 'no_such_occupancy',
      build(ctx, steps) {
        join(ctx, BOB, ['Booker'], steps);
        // The frozen fixture permits an opaque occupancy id with no request.
        const occupancy = act(ctx, ALICE, BOOKING + 'occupancy', { booking_id: 'b1', room: 'room-1', start: 1, end: 3 }, steps);
        const free = act(ctx, ALICE, BOOKING + 'free', { booking_id: 'b1' }, steps);
        return { hidden: occupancy.position, dependent: free.position };
      },
    },
    binding: { kind: BOOKING + 'occupancy', actor: ALICE, roles: ['Booker'], first: { booking_id: 'b1', room: 'room-1', start: 1, end: 3 }, next: { booking_id: 'b2', room: 'room-1', start: 4, end: 6 } },
  },
  {
    name: 'club', package: clubPackage, manifest: CLUB_MANIFEST_ID, base: clubBase,
    checks: (ctx) => ({ invariants: clubInvariants, budget: (o, p, n, view) => clubBudgetViolations(o, p, foldPrefix(ctx, n), n, view) }),
    mutation: {
      kind: CLUB + 'standing', reader: BOB, expectedEffective: false, expectedReason: 'lapsed', actualReason: null,
      build(ctx, steps) {
        join(ctx, BOB, ['Committee', 'Member'], steps);
        join(ctx, DANA, [], steps);
        const application = act(ctx, DANA, CLUB + 'apply', { statement: 'please' }, steps);
        const standing = act(ctx, ALICE, CLUB + 'standing', { member: BOB, standing: 'lapsed' }, steps);
        const vote = act(ctx, BOB, CLUB + 'vote', { application_id: application.id, choice: 'yes' }, steps);
        return { hidden: standing.position, dependent: vote.position };
      },
    },
    binding: { kind: CLUB + 'standing', actor: ALICE, roles: ['Member'], first: { member: BOB, standing: 'lapsed' }, next: { member: BOB, standing: 'good' } },
  },
];

for (const c of cases) {
  test(`V6 ${c.name}: the checker detects one narrowed audience rule`, (t) => {
    const mutant = withAudience(c.package, c.mutation.kind, 'v6-actor-only', (_ctx, event) => named(event.actor));
    assert.equal(mutant.models, c.package.models, 'model code and configuration are unchanged');
    for (const kind of Object.keys(c.package.kinds)) {
      if (kind !== c.mutation.kind) assert.equal(mutant.kinds[kind], c.package.kinds[kind]);
      else {
        const { audience: _a, audienceId: _id, ...original } = c.package.kinds[kind]!;
        const { audience: _ma, audienceId: _mid, ...changed } = mutant.kinds[kind]!;
        assert.deepEqual(changed, original, 'only this audience rule differs');
      }
    }
    const base = { ...c.base(c.package), nonce: 'v6:' + c.name };
    const control = Context.create(base);
    const steps: Step[] = [];
    const controlPositions = c.mutation.build(control, steps);
    assert.deepEqual(checkContext(control, c.checks(control)), [], 'unmodified control');
    assert.ok(control.view(c.mutation.reader)[controlPositions.hidden]?.event);
    const broken = Context.create({ ...c.base(mutant), nonce: 'v6:' + c.name });
    const { hidden, dependent } = c.mutation.build(broken);
    assert.equal(broken.view(c.mutation.reader)[hidden]?.event, undefined);
    assert.ok(broken.view(c.mutation.reader)[dependent]?.event, 'dependent event remains shared');
    const violations = checkContext(broken, c.checks(broken));
    const finding = violations.find((v) => v.kind === 'mismatch' && v.participant === c.mutation.reader && v.frontier === dependent);
    assert.ok(finding, violations.map(describeViolation).join('\n'));
    const oracle = finding.expected!.outcomes[String(dependent)]!;
    const view = finding.actual!.outcomes[String(dependent)]!;
    assert.equal(oracle.effective, c.mutation.expectedEffective);
    assert.equal(view.effective, !c.mutation.expectedEffective);
    assert.equal(oracle.perModel?.[c.name]?.reason, c.mutation.expectedReason);
    assert.equal(view.perModel?.[c.name]?.reason, c.mutation.actualReason);
    t.diagnostic(JSON.stringify({ model: c.name, manifest: c.manifest, package: c.package.id, mutant: mutant.id, kind: c.mutation.kind, entries: broken.head + 1, violations: violations.length, first: describeViolation(finding) }));
    const linked = linkSteps({ base, steps });
    const mutantBase = { ...c.base(mutant), nonce: base.nonce };
    assert.deepEqual(replayLinked(linked, mutantBase, {}).entries, broken.entries, 'linked trace reproduces the original mutant history');
    const fails = (candidate: typeof linked) => {
      const replayed = replayLinked(candidate, mutantBase, {});
      return checkContext(replayed, c.checks(replayed)).some((v) => v.kind === 'mismatch');
    };
    const minimal = shrinkLinked(linked, fails);
    assert.ok(fails(minimal));
    for (let i = 0; i < minimal.length; i++) assert.equal(fails(minimal.filter((_, j) => i !== j)), false, `minimal without step ${i}`);
    const repaired = replayLinked(minimal, base, {});
    assert.deepEqual(checkContext(repaired, c.checks(repaired)), [], 'minimal trace has a clean unmutated control');
    t.diagnostic(JSON.stringify({ corpus: 'v6-' + c.name, manifest: c.manifest, package: c.package.id, mutant: mutant.id, nonce: base.nonce, originalSteps: linked.length, steps: minimal }));
  });

  test(`V6 ${c.name}: an unrelated private attach preserves a shared intent; a relevant binding change stales it`, (t) => {
    const ctx = Context.create({ ...c.base(c.package), nonce: 'v6:binding:' + c.name });
    join(ctx, BOB, c.binding.roles);
    // Distinct unsent intents: submitting the second is not an exact retry.
    const first = ctx.intent(c.binding.actor, c.binding.kind, c.binding.first, { nonce: 'saved-first', action_id: 'saved-first' });
    const saved = ctx.intent(c.binding.actor, c.binding.kind, c.binding.next, { nonce: 'saved-next', action_id: 'saved-next' });
    const binding = ctx.currentBinding(c.binding.kind);
    const activation = ctx.currentActivation(c.binding.kind);
    assert.equal(first.expected_binding, binding);
    assert.equal(saved.expected_binding, binding);
    const side = pkg('v6_side', { 'com.example.v6_side.note': ['v6_side'] });
    ctx.packages[side.id] = side;
    const unrelated = act(ctx, ALICE, K.attach, { package: side.id, audience: [] });
    assert.equal(unrelated.verdict.effective, true);
    assert.equal(ctx.view(BOB)[unrelated.position]?.event, undefined);
    assert.equal(ctx.currentBinding(c.binding.kind), binding);
    assert.equal(ctx.currentActivation(c.binding.kind), activation);
    const kept = ctx.submit(first, ctx.credentialFor(c.binding.actor));
    assert.ok(!('refused' in kept));
    assert.equal(kept.verdict?.effective, true);
    assert.ok(ctx.view(BOB)[kept.header.position]?.event, 'the act is still shared');
    const audit = pkg('v6_audit', { [c.binding.kind]: ['v6_audit'] });
    ctx.packages[audit.id] = audit;
    const handlers = [...ctx.state.env.kinds[c.binding.kind]!.handlers, 'v6_audit'];
    const relevant = act(ctx, ALICE, K.attach, { package: audit.id, resolution: { [c.binding.kind]: { handlers } } });
    assert.equal(relevant.verdict.effective, true);
    assert.notEqual(ctx.currentBinding(c.binding.kind), binding);
    assert.equal(ctx.currentActivation(c.binding.kind), relevant.position);
    const stale = ctx.submit(saved, ctx.credentialFor(c.binding.actor));
    assert.ok(!('refused' in stale));
    assert.equal(stale.verdict?.reason, 'stale_binding');
    // Visible relevant attach: stale semantics, not a dependency pause.
    for (const participant of ctx.state.participants) {
      const view = ctx.view(participant);
      assert.ok(view[relevant.position]?.event);
      const interpreted = interpretView(participant, view, ctx.head, ctx.packages);
      assert.equal(interpreted.kind, 'interpreted');
      if (interpreted.kind === 'interpreted') assert.equal(observeInterpreted(interpreted, view).outcomes[String(stale.header.position)]?.reason, 'stale_binding');
    }
    const fresh = act(ctx, c.binding.actor, c.binding.kind, c.binding.next);
    assert.equal(fresh.verdict.effective, true);
    const violations = checkContext(ctx, c.checks(ctx));
    assert.deepEqual(violations, [], violations.map(describeViolation).join('\n'));
    t.diagnostic(JSON.stringify({ model: c.name, manifest: c.manifest, package: c.package.id, unrelated: unrelated.position, shared: kept.header.position, relevant: relevant.position, stale: stale.header.position, fresh: fresh.position, violations: violations.length }));
  });
}

test('V6 serving mutation: hiding a spine revocation is detected without changing the recorded history', (t) => {
  const base = { ...saleBase(), nonce: 'v6:hidden-revocation' };
  const ctx = Context.create(base);
  const steps: Step[] = [];
  join(ctx, BOB, ['Buyer'], steps);
  const revocation = act(ctx, ALICE, K.revoke, { principal: BOB, roles: ['Buyer'] }, steps);
  const attempt = act(ctx, BOB, SALE + 'offer', { offer_id: 'after-revocation' }, steps);
  assert.equal(revocation.verdict.effective, true);
  assert.equal(attempt.verdict.reason, 'unauthorized');
  assert.equal(ctx.state.audiences[revocation.position]?.kind, 'spine');
  assert.deepEqual(checkContext(ctx), []);
  const entries = structuredClone(ctx.entries);
  const originalAudience = ctx.state.audiences[revocation.position]!;
  try {
    // Noncompliant serving only: F0 still requires spine grant/revoke.
    ctx.state.audiences[revocation.position] = named(ALICE);
    assert.deepEqual(ctx.entries, entries, 'entries and authenticated headers are unchanged');
    const violations = checkContext(ctx);
    const finding = violations.find((v) => v.kind === 'mismatch' && v.participant === BOB && v.frontier === attempt.position);
    assert.ok(finding, violations.map(describeViolation).join('\n'));
    assert.equal(finding.expected!.outcomes[String(attempt.position)]?.reason, 'unauthorized');
    assert.equal(finding.actual!.outcomes[String(attempt.position)]?.effective, true);
    t.diagnostic(JSON.stringify({ mutation: 'hidden-spine-revocation', manifest: SALE_MANIFEST_ID, package: salePackage.id, at: revocation.position, violations: violations.length, first: describeViolation(violations[0]!), dependent: describeViolation(finding) }));
  } finally {
    ctx.state.audiences[revocation.position] = originalAudience;
  }
  assert.deepEqual(checkContext(ctx), [], 'restoring compliant serving restores consistency');
  const linked = linkSteps({ base, steps });
  assert.deepEqual(replayLinked(linked, base, {}).entries, ctx.entries);
  const fails = (candidate: typeof linked) => {
    const replayed = replayLinked(candidate, base, {});
    const revoked = replayed.entries.find((e) => e.event.kind === K.revoke);
    if (!revoked || !replayed.state.verdicts[revoked.header.position]?.effective) return false;
    replayed.state.audiences[revoked.header.position] = named(ALICE);
    return checkContext(replayed).some((v) => v.kind === 'mismatch');
  };
  const minimal = shrinkLinked(linked, fails);
  assert.ok(fails(minimal));
  for (let i = 0; i < minimal.length; i++) assert.equal(fails(minimal.filter((_, j) => i !== j)), false, `minimal without step ${i}`);
  assert.deepEqual(checkContext(replayLinked(minimal, base, {})), []);
  t.diagnostic(JSON.stringify({ corpus: 'v6-hidden-revocation', manifest: SALE_MANIFEST_ID, package: salePackage.id, nonce: base.nonce, originalSteps: linked.length, steps: minimal }));
});
