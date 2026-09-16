// The Sale manifest's predeclared cases and campaign (spike plan V3, §4.3
// to §4.7). Every expectation here comes from manifests/sale.md and
// manifests/sale.ts, written before the baseline; nothing reads the
// candidate model's state.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkContext, type Violation } from '../src/checker.ts';
import { K } from '../src/foundation.ts';
import { generate } from '../src/generate.ts';
import { oracleObserve } from '../src/oracle.ts';
import { replay, type Script, type Step } from '../src/script.ts';
import { SALE, salePackage } from '../fixtures/sale.ts';
import {
  ALICE,
  BOB,
  CAROL,
  DANA,
  IVAN,
  SALE_MANIFEST_ID,
  proseBounds,
  saleBase,
  saleBounds,
  saleBudgetViolations,
  saleGeneratorSpec,
  saleInvariants,
  saleTraceInspection,
  saleTraceProjections,
  saleTraceReadability,
  saleTraceSteps,
} from '../manifests/sale.ts';

const budget = (obs: Parameters<typeof saleBudgetViolations>[0], p: string) => saleBudgetViolations(obs, p, ALICE);
const fullCheck = (ctx: ReturnType<typeof replay>['ctx'], frontiers?: number[]) => checkContext(ctx, { invariants: saleInvariants, budget, ...(frontiers ? { frontiers } : {}) });
const brief = (vs: Violation[]) => JSON.stringify(vs.slice(0, 5).map((v) => [v.participant, v.frontier, v.kind, v.detail]));

function traceThrough(n: number): Script {
  return { base: saleBase(), steps: saleTraceSteps().slice(0, n - 1) };
}

test('the manifest is one experiment identity over its prose and executable part, and the prose states the same bounds', (t) => {
  assert.match(SALE_MANIFEST_ID, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(proseBounds(), saleBounds);
  t.diagnostic('SALE_MANIFEST_ID ' + SALE_MANIFEST_ID);
  t.diagnostic('sale package ' + salePackage.id);
});

test('case 1, the trace: positions 0 to 19 replay with the readability of the table, the literal projections at 19, and the outcomes at 17 and 18', () => {
  const { ctx, positions } = replay({ base: saleBase(), steps: saleTraceSteps() });
  assert.equal(ctx.head, 19);
  assert.deepEqual(positions, Array.from({ length: 18 }, (_, i) => i + 2));
  for (const [p, pattern] of Object.entries(saleTraceReadability)) {
    assert.equal(ctx.view(p).map((v) => (v.event ? 'r' : 'h')).join(''), pattern, `readability for ${p}`);
  }
  // every position of the table is effective except 18
  for (let i = 0; i <= 19; i++) assert.equal(ctx.state.verdicts[i]?.effective, i !== 18, `verdict at ${i}`);
  for (const p of [ALICE, BOB, CAROL, IVAN]) {
    const obs = oracleObserve(ctx, p, 19, 19);
    assert.deepEqual(obs.models['sale'], saleTraceProjections[p], `sale projection for ${p}`);
    assert.deepEqual(obs.models['inspection'], saleTraceInspection[p], `inspection projection for ${p}`);
    assert.equal(obs.outcomes['17']?.effective, true, `17 for ${p}`);
    assert.equal(obs.outcomes['18']?.effective, false, `18 for ${p}`);
    assert.equal(obs.outcomes['18']?.perModel?.['sale']?.reason, 'already_decided', `18 reason for ${p}`);
  }
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 2, replacement with a hidden predecessor: Ivan sees o3 open with o1 hidden, and a later accept of o1 is ineffective for everyone', () => {
  const steps: Step[] = [...saleTraceSteps().slice(0, 15), { type: 'act', actor: ALICE, kind: SALE + 'accept', payload: { offer_id: 'o1' } }]; // 2..16, then accept o1 at 17
  const { ctx } = replay({ base: saleBase(), steps });
  assert.equal(ctx.head, 17);
  const ivan16 = oracleObserve(ctx, IVAN, 16, 16).models['sale'] as { offers: { id: string; status: string; replaces: string | null }[] };
  assert.deepEqual(ivan16.offers.map((o) => [o.id, o.status, o.replaces]), [['o3', 'open', 'o1']]);
  assert.equal(ctx.state.verdicts[17]?.effective, false);
  for (const p of ctx.state.participants) assert.equal(oracleObserve(ctx, p, 17, 17).outcomes['17']?.effective, false, `17 for ${p}`);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 3, late joiner after the decision: a second accept is ineffective in every view, equality holds at every frontier, and a disclosure of the decision keeps it', () => {
  const steps: Step[] = [
    ...saleTraceSteps().slice(0, 16), // 2..17: the accept of o3 at 17
    { type: 'invite', inviter: ALICE, invitee: DANA, grants: { roles: ['Buyer'] } }, // 18
    { type: 'accept', invitee: DANA }, // 19
    { type: 'act', actor: ALICE, kind: SALE + 'accept', payload: { offer_id: 'o2' } }, // 20
  ];
  const { ctx } = replay({ base: saleBase(), steps });
  assert.equal(ctx.head, 20);
  assert.ok(ctx.state.participants.includes(DANA));
  assert.equal(ctx.state.verdicts[20]?.effective, false);
  for (const p of ctx.state.participants) assert.equal(oracleObserve(ctx, p, 20, 20).outcomes['20']?.effective, false, `20 for ${p}`);
  let violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
  const d = ctx.act(ALICE, K.disclose, { positions: [17], to: [DANA] }); // 21
  assert.ok(!('refused' in d) && d.verdict?.effective);
  violations = fullCheck(ctx, [21]);
  assert.deepEqual(violations, [], brief(violations));
  const dana = oracleObserve(ctx, DANA, 21, 21).models['sale'] as { status: string; accepted: string | null };
  assert.equal(dana.accepted, 'o3');
});

test('case 4, late joiner judging a public event on a hidden fact: a withdrawal of a stub Dana never saw, then an accept of it, are judged the same way in every view', () => {
  const steps: Step[] = [
    ...saleTraceSteps().slice(0, 8), // 2..9: o1, o2 and their terms
    { type: 'invite', inviter: ALICE, invitee: DANA, grants: { roles: ['Buyer'] } }, // 10
    { type: 'accept', invitee: DANA }, // 11
    { type: 'act', actor: CAROL, kind: SALE + 'withdraw', payload: { offer_id: 'o2' } }, // 12
    { type: 'act', actor: ALICE, kind: SALE + 'accept', payload: { offer_id: 'o2' } }, // 13
  ];
  const { ctx } = replay({ base: saleBase(), steps });
  assert.equal(ctx.head, 13);
  assert.equal(ctx.state.verdicts[12]?.effective, true);
  assert.equal(ctx.state.verdicts[13]?.effective, false);
  for (const p of ctx.state.participants) assert.equal(oracleObserve(ctx, p, 13, 13).outcomes['13']?.effective, false, `13 for ${p}`);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 5, the campaign: every manifest seed replays with zero violations of the property, the pause rule, the invariants and the privacy budget', (t) => {
  const limit = process.env['SALE_SEEDS'] ? Number(process.env['SALE_SEEDS']) : saleBounds.seeds.length;
  const seeds = saleBounds.seeds.slice(0, limit);
  const counts = { joins: 0, attaches: 0, disclosures: 0, offers: 0, replacements: 0, withdrawals: 0, counters: 0, accepts: 0, effectiveAccepts: 0, closes: 0, entries: 0 };
  const failures: { seed: number; violations: Violation[] }[] = [];
  const started = Date.now();
  for (const seed of seeds) {
    const script = generate(saleGeneratorSpec(salePackage), seed);
    const { ctx } = replay(script);
    assert.ok(ctx.head + 1 <= saleBounds.maxPositions, `seed ${seed} has ${ctx.head + 1} entries`);
    assert.ok(ctx.state.participants.length <= saleBounds.maxParticipants, `seed ${seed} has ${ctx.state.participants.length} participants`);
    counts.entries += ctx.head + 1;
    for (const s of script.steps) {
      if (s.type === 'accept') counts.joins++;
      if (s.type === 'attach') counts.attaches++;
      if (s.type === 'disclose') counts.disclosures++;
      if (s.type === 'act' && s.kind === SALE + 'offer') {
        counts.offers++;
        if ((s.payload as { replaces?: string }).replaces) counts.replacements++;
      }
      if (s.type === 'act' && s.kind === SALE + 'withdraw') counts.withdrawals++;
      if (s.type === 'act' && s.kind === SALE + 'counter') counts.counters++;
      if (s.type === 'act' && s.kind === SALE + 'accept') counts.accepts++;
      if (s.type === 'act' && s.kind === SALE + 'close') counts.closes++;
    }
    for (let i = 0; i <= ctx.head; i++) if (ctx.entries[i]!.event.kind === SALE + 'accept' && ctx.state.verdicts[i]?.effective) counts.effectiveAccepts++;
    const violations = fullCheck(ctx);
    if (violations.length) failures.push({ seed, violations });
  }
  t.diagnostic(`seeds ${seeds.length}, ${Date.now() - started} ms, coverage ${JSON.stringify(counts)}`);
  assert.ok(counts.joins > 0 && counts.attaches > 0 && counts.disclosures > 0 && counts.replacements > 0 && counts.withdrawals > 0 && counts.effectiveAccepts > 0, 'coverage');
  assert.deepEqual(
    failures.map((f) => f.seed),
    [],
    failures.map((f) => `seed ${f.seed}: ${brief(f.violations)}`).join('\n'),
  );
});

test('the repair ledger exists, its totals agree with its entries, and it states the budget outcome', (t) => {
  const ledger = readFileSync(fileURLToPath(new URL('../manifests/sale.ledger.md', import.meta.url)), 'utf8');
  const fixes = (ledger.match(/^### Fix \d+/gm) ?? []).length;
  const addedKinds = (ledger.match(/^- Added kind: yes/gm) ?? []).length;
  const totals = /^Totals: (\d+) fixes?, (\d+) added kinds?, budget (within|exceeded)/m.exec(ledger);
  assert.ok(totals, 'the ledger states its totals');
  assert.equal(Number(totals[1]), fixes, 'fix total matches the entries');
  assert.equal(Number(totals[2]), addedKinds, 'added-kind total matches the entries');
  const within = fixes <= 2 && addedKinds <= 1;
  assert.equal(totals[3], within ? 'within' : 'exceeded', 'the stated budget outcome matches the counts');
  t.diagnostic(`fixes ${fixes}, added kinds ${addedKinds}, budget ${totals[3]}`);
});
