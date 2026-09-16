// The Club manifest's predeclared cases and campaign (spike plan V5,
// §4.2, §4.3 to §4.7). Every expectation here comes from
// manifests/club.md and manifests/club.ts, written before the baseline;
// nothing reads the candidate model's state.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkContext, describeViolation, observeInterpreted, type Violation } from '../src/checker.ts';
import { Context } from '../src/context.ts';
import { K, holdsNow } from '../src/foundation.ts';
import { generate } from '../src/generate.ts';
import { interpretView } from '../src/interpret.ts';
import { foldPrefix, oracleObserve } from '../src/oracle.ts';
import { applyStep, replay, type Pending } from '../src/script.ts';
import { CLUB, clubPackage } from '../fixtures/club.ts';
import { pkg } from './helpers.ts';
import {
  BOB,
  CAROL,
  CLUB_MANIFEST_ID,
  DANA,
  ERIN,
  FOUNDER,
  clubBase,
  clubBounds,
  clubBudgetViolations,
  clubGeneratorSpec,
  clubInvariants,
  committeePrelude,
  proseBounds,
} from '../manifests/club.ts';

const fullCheck = (ctx: Context, frontiers?: number[]) =>
  checkContext(ctx, {
    invariants: clubInvariants,
    budget: (obs, p, n, view) => clubBudgetViolations(obs, p, foldPrefix(ctx, n), n, view),
    ...(frontiers ? { frontiers } : {}),
  });
const brief = (vs: Violation[]) => vs.slice(0, 6).map(describeViolation).join('\n') + (vs.length > 6 ? `\n... ${vs.length} violations` : '');

type Proj = { applications: { id: string; status: string; votes: { yes: number; no: number }; applicant: string | null }[]; standing: Record<string, string> };
const proj = (ctx: Context, p: string, n = ctx.head) => oracleObserve(ctx, p, n, n).models['club'] as Proj;
const reasonAt = (ctx: Context, p: string, i: number) => oracleObserve(ctx, p, ctx.head, ctx.head).outcomes[String(i)]?.perModel?.['club']?.reason;

/** The founder, Bob and Carol on the committee, plus the named applicants joined with no roles; effects and join disclosures honoured. */
function club(applicants: string[]): { ctx: Context; pending: Pending } {
  const ctx = Context.create({ ...clubBase(), packages: { ...clubBase().packages } });
  const pending: Pending = new Map();
  for (const s of committeePrelude()) applyStep(ctx, s, pending);
  for (const a of applicants) {
    applyStep(ctx, { type: 'invite', inviter: FOUNDER, invitee: a, grants: { roles: [] } }, pending);
    applyStep(ctx, { type: 'accept', invitee: a }, pending);
  }
  return { ctx, pending };
}

function act(ctx: Context, pending: Pending, actor: string, kind: string, payload: unknown) {
  const before = ctx.head;
  const pos = applyStep(ctx, { type: 'act', actor, kind, payload: payload as never }, pending);
  assert.ok(pos > before, `${kind} by ${actor} was refused`);
  return { position: pos, id: ctx.entries[pos]!.id, verdict: ctx.state.verdicts[pos]! };
}

test('the manifest is one experiment identity over its prose and executable part, and the prose states the same bounds', (t) => {
  assert.match(CLUB_MANIFEST_ID, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(proseBounds(), clubBounds);
  t.diagnostic('CLUB_MANIFEST_ID ' + CLUB_MANIFEST_ID);
  t.diagnostic('club package ' + clubPackage.id);
});

test('case 1, quorum: three committee members, two yes votes, admit is effective and the applicant is granted Member', () => {
  const { ctx, pending } = club([DANA]);
  const app = act(ctx, pending, DANA, CLUB + 'apply', { statement: 'please' });
  assert.equal(app.verdict.effective, true);
  assert.equal(act(ctx, pending, BOB, CLUB + 'vote', { application_id: app.id, choice: 'yes' }).verdict.effective, true);
  assert.equal(act(ctx, pending, CAROL, CLUB + 'vote', { application_id: app.id, choice: 'yes' }).verdict.effective, true);
  const admit = act(ctx, pending, FOUNDER, CLUB + 'admit', { application_id: app.id });
  assert.equal(admit.verdict.effective, true);
  assert.equal(holdsNow(ctx.state, DANA, CLUB + 'member'), true, 'the declared effect granted Member');
  assert.equal(ctx.entries[admit.position + 1]?.event.kind, K.grant);
  for (const p of ctx.state.participants) {
    const a = proj(ctx, p).applications.find((x) => x.id === app.id)!;
    assert.deepEqual([a.status, a.votes], ['admitted', { yes: 2, no: 0 }], `projection for ${p}`);
  }
  assert.equal(proj(ctx, BOB).applications[0]?.applicant, DANA); // committee sees the applicant
  assert.equal(typeof ERIN, 'string');
  const again = act(ctx, pending, FOUNDER, CLUB + 'admit', { application_id: app.id });
  assert.equal(again.verdict.perModel?.['club']?.reason, 'already_admitted');
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 2, no quorum: one vote, admit is no_quorum; a no vote and a yes vote is no_majority', () => {
  const { ctx, pending } = club([DANA]);
  const app = act(ctx, pending, DANA, CLUB + 'apply', { statement: 'please' });
  act(ctx, pending, BOB, CLUB + 'vote', { application_id: app.id, choice: 'yes' });
  const admit = act(ctx, pending, FOUNDER, CLUB + 'admit', { application_id: app.id });
  assert.equal(admit.verdict.effective, false);
  assert.equal(admit.verdict.perModel?.['club']?.reason, 'no_quorum');
  for (const p of ctx.state.participants) assert.equal(reasonAt(ctx, p, admit.position), 'no_quorum', `no_quorum for ${p}`);
  act(ctx, pending, CAROL, CLUB + 'vote', { application_id: app.id, choice: 'no' });
  const tie = act(ctx, pending, FOUNDER, CLUB + 'admit', { application_id: app.id });
  assert.equal(tie.verdict.perModel?.['club']?.reason, 'no_majority');
  assert.equal(holdsNow(ctx.state, DANA, CLUB + 'member'), false);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 3, lapsed: a lapsed committee member\'s vote is lapsed, the admit that relied on it is no_quorum, and a second vote by one member is already_voted', () => {
  const { ctx, pending } = club([DANA]);
  const app = act(ctx, pending, DANA, CLUB + 'apply', { statement: 'please' });
  act(ctx, pending, FOUNDER, CLUB + 'standing', { member: CAROL, standing: 'lapsed' });
  act(ctx, pending, FOUNDER, CLUB + 'standing_reason', { member: CAROL, text: 'dues unpaid' });
  assert.equal(act(ctx, pending, BOB, CLUB + 'vote', { application_id: app.id, choice: 'yes' }).verdict.effective, true);
  const lapsed = act(ctx, pending, CAROL, CLUB + 'vote', { application_id: app.id, choice: 'yes' });
  assert.equal(lapsed.verdict.perModel?.['club']?.reason, 'lapsed');
  const admit = act(ctx, pending, FOUNDER, CLUB + 'admit', { application_id: app.id });
  assert.equal(admit.verdict.perModel?.['club']?.reason, 'no_quorum');
  const twice = act(ctx, pending, BOB, CLUB + 'vote', { application_id: app.id, choice: 'yes' });
  assert.equal(twice.verdict.perModel?.['club']?.reason, 'already_voted');
  assert.equal(proj(ctx, DANA).standing[CAROL], 'lapsed');
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 4, late committee member: a vote before any disclosure of the application is unknown_application, after a disclosure it is effective, and every member judges both the same way', () => {
  const { ctx, pending } = club([DANA, ERIN]);
  const app = act(ctx, pending, DANA, CLUB + 'apply', { statement: 'please' });
  const grant = act(ctx, pending, FOUNDER, K.grant, { principal: ERIN, roles: ['Committee', 'Member'] });
  assert.equal(grant.verdict.effective, true);
  const early = act(ctx, pending, ERIN, CLUB + 'vote', { application_id: app.id, choice: 'yes' });
  assert.equal(early.verdict.effective, false);
  assert.equal(early.verdict.perModel?.['club']?.reason, 'unknown_application');
  const d = act(ctx, pending, FOUNDER, K.disclose, { positions: [app.position], to: [ERIN] });
  assert.equal(d.verdict.effective, true);
  const late = act(ctx, pending, ERIN, CLUB + 'vote', { application_id: app.id, choice: 'yes' });
  assert.equal(late.verdict.effective, true);
  for (const p of ctx.state.participants) {
    assert.equal(reasonAt(ctx, p, early.position), 'unknown_application', `early vote for ${p}`);
    assert.equal(oracleObserve(ctx, p, ctx.head, ctx.head).outcomes[String(late.position)]?.effective, true, `late vote for ${p}`);
  }
  act(ctx, pending, BOB, CLUB + 'vote', { application_id: app.id, choice: 'yes' });
  const admit = act(ctx, pending, FOUNDER, CLUB + 'admit', { application_id: app.id });
  assert.equal(admit.verdict.effective, true);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

for (const activationFirst of [false, true]) {
  test(`Club disclosure across activation: ${activationFirst ? 'activation before payload' : 'payload before activation pauses until closure'}`, () => {
    const { ctx, pending } = club([DANA, ERIN]);
    const before = act(ctx, pending, DANA, CLUB + 'apply', { statement: 'before activation' });
    act(ctx, pending, FOUNDER, K.grant, { principal: ERIN, roles: ['Committee', 'Member'] });
    act(ctx, pending, FOUNDER, K.disclose, { positions: [before.position], to: [ERIN] });
    const disclosedBefore = ctx.head;
    assert.equal(ctx.entries[before.position]!.header.activation, 0);
    assert.equal(ctx.view(ERIN)[before.position]?.event?.kind, CLUB + 'apply');

    const audit = pkg('club_audit', { [CLUB + 'apply']: ['club_audit'] });
    ctx.packages[audit.id] = audit;
    const attach = act(ctx, pending, FOUNDER, K.attach, {
      package: audit.id, audience: [], resolution: { [CLUB + 'apply']: { handlers: ['club', 'club_audit'] } },
    });
    assert.equal(attach.verdict.effective, true);
    const after = act(ctx, pending, DANA, CLUB + 'apply', { statement: 'after activation' });
    assert.equal(after.verdict.effective, true);
    assert.equal(ctx.entries[after.position]!.header.activation, attach.position);
    assert.equal(ctx.view(ERIN)[attach.position]?.event, undefined);
    assert.equal(ctx.view(ERIN)[after.position]?.event, undefined);
    const first = activationFirst ? attach.position : after.position;
    const second = activationFirst ? after.position : attach.position;
    act(ctx, pending, FOUNDER, K.disclose, { positions: [first], to: [ERIN] });
    const basis = ctx.head;
    const view = ctx.view(ERIN, basis);
    const partial = interpretView(ERIN, view, basis, ctx.packages);
    if (activationFirst) {
      assert.equal(partial.kind, 'interpreted');
      if (partial.kind === 'interpreted') assert.deepEqual(observeInterpreted(partial, view), oracleObserve(ctx, ERIN, basis, basis));
    } else {
      assert.equal(partial.kind, 'paused');
      if (partial.kind !== 'paused') return;
      assert.equal(partial.at, after.position);
      assert.equal(partial.reason, 'dependency_missing');
      assert.deepEqual(observeInterpreted(partial.last, view), oracleObserve(ctx, ERIN, after.position - 1, basis));
    }
    act(ctx, pending, FOUNDER, K.disclose, { positions: [second], to: [ERIN] });
    const resumedView = ctx.view(ERIN);
    const resumed = interpretView(ERIN, resumedView, ctx.head, ctx.packages);
    assert.equal(resumed.kind, 'interpreted');
    if (resumed.kind === 'interpreted') assert.deepEqual(observeInterpreted(resumed, resumedView), oracleObserve(ctx, ERIN, ctx.head, ctx.head));
    assert.deepEqual(oracleObserve(ctx, ERIN, before.position, disclosedBefore), oracleObserve(ctx, ERIN, before.position, ctx.head), 'later activation preserves the earlier application');
    const violations = fullCheck(ctx);
    assert.deepEqual(violations, [], brief(violations));
  });
}

test('recorded plan mismatch: a second application by an existing Member is admitted under the frozen manifest', (t) => {
  const { ctx, pending } = club([DANA, ERIN]);
  act(ctx, pending, FOUNDER, K.grant, { principal: ERIN, roles: ['Member'] });
  const admissions: number[] = [];
  const applications = ['first application', 'second application'].map((statement) => act(ctx, pending, DANA, CLUB + 'apply', { statement }));
  for (const app of applications) {
    act(ctx, pending, BOB, CLUB + 'vote', { application_id: app.id, choice: 'yes' });
    act(ctx, pending, CAROL, CLUB + 'vote', { application_id: app.id, choice: 'yes' });
    const alreadyMember = holdsNow(ctx.state, DANA, CLUB + 'member');
    const admit = act(ctx, pending, FOUNDER, CLUB + 'admit', { application_id: app.id });
    assert.equal(admit.verdict.effective, true);
    assert.equal(alreadyMember, admissions.length > 0);
    assert.equal(proj(ctx, ERIN).applications.find((a) => a.id === app.id)?.applicant, null);
    admissions.push(admit.position);
  }
  // This proves the acceptance gap; it is not an expected-policy pass.
  t.diagnostic(`plan §4.2 violated: admit at ${admissions[1]} is effective after Dana already received Member at ${admissions[0]! + 1}; frozen-manifest checks still pass`);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 5, the campaign: every manifest seed replays with zero violations of the property, the pause rule, the invariants and the privacy budget', (t) => {
  const limit = process.env['CLUB_SEEDS'] ? Number(process.env['CLUB_SEEDS']) : clubBounds.seeds.length;
  const seeds = clubBounds.seeds.slice(0, limit);
  const counts = { joins: 0, attaches: 0, disclosures: 0, applications: 0, votes: 0, effectiveVotes: 0, admits: 0, effectiveAdmits: 0, standings: 0, grants: 0, entries: 0 };
  const failures: { seed: number; violations: Violation[] }[] = [];
  const started = Date.now();
  for (const seed of seeds) {
    const script = generate(clubGeneratorSpec(clubPackage), seed);
    const { ctx } = replay(script);
    // a declared effect adds one grant after each effective admit, outside the generator's bound
    const effectGrants = ctx.entries.filter((e, i) => e.event.kind === K.grant && i > 0 && ctx.entries[i - 1]!.event.kind === CLUB + 'admit').length;
    assert.ok(ctx.head + 1 <= clubBounds.maxPositions + effectGrants, `seed ${seed} has ${ctx.head + 1} entries with ${effectGrants} effect grants`);
    assert.ok(ctx.state.participants.length <= clubBounds.maxParticipants, `seed ${seed} has ${ctx.state.participants.length} participants`);
    counts.entries += ctx.head + 1;
    for (const s of script.steps) {
      if (s.type === 'accept') counts.joins++;
      if (s.type === 'attach') counts.attaches++;
      if (s.type === 'disclose') counts.disclosures++;
      if (s.type === 'act' && s.kind === CLUB + 'apply') counts.applications++;
      if (s.type === 'act' && s.kind === CLUB + 'vote') counts.votes++;
      if (s.type === 'act' && s.kind === CLUB + 'admit') counts.admits++;
      if (s.type === 'act' && s.kind === CLUB + 'standing') counts.standings++;
      if (s.type === 'act' && s.kind === K.grant) counts.grants++;
    }
    for (let i = 0; i <= ctx.head; i++) {
      const k = ctx.entries[i]!.event.kind;
      if (k === CLUB + 'vote' && ctx.state.verdicts[i]?.effective) counts.effectiveVotes++;
      if (k === CLUB + 'admit' && ctx.state.verdicts[i]?.effective) counts.effectiveAdmits++;
    }
    const violations = fullCheck(ctx);
    if (violations.length) failures.push({ seed, violations });
  }
  t.diagnostic(`seeds ${seeds.length}, ${Date.now() - started} ms, coverage ${JSON.stringify(counts)}`);
  assert.ok(counts.joins > 0 && counts.attaches > 0 && counts.disclosures > 0 && counts.effectiveVotes > 0 && counts.effectiveAdmits > 0 && counts.standings > 0 && counts.grants > 0, 'coverage');
  assert.deepEqual(
    failures.map((f) => f.seed),
    [],
    failures.map((f) => `seed ${f.seed}: ${brief(f.violations)}`).join('\n'),
  );
});

test('the repair ledger exists, its totals agree with its entries, and it states the budget outcome', (t) => {
  const ledger = readFileSync(fileURLToPath(new URL('../manifests/club.ledger.md', import.meta.url)), 'utf8');
  const fixes = (ledger.match(/^### Fix \d+/gm) ?? []).length;
  const addedKinds = (ledger.match(/^- Added kind: yes/gm) ?? []).length;
  const totals = /^Totals: (\d+) fix(?:es)?, (\d+) added kinds?, budget (within|exceeded)/m.exec(ledger);
  assert.ok(totals, 'the ledger states its totals');
  assert.equal(Number(totals[1]), fixes, 'fix total matches the entries');
  assert.equal(Number(totals[2]), addedKinds, 'added-kind total matches the entries');
  const within = fixes <= 4 && addedKinds <= 2;
  assert.equal(totals[3], within ? 'within' : 'exceeded', 'the stated budget outcome matches the counts');
  t.diagnostic(`fixes ${fixes}, added kinds ${addedKinds}, budget ${totals[3]}`);
});
