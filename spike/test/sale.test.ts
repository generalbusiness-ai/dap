// The Sale manifest's predeclared cases and campaign (spike plan V3, §4.3
// to §4.7). Every expectation here comes from manifests/sale.md and
// manifests/sale.ts, written before the baseline; nothing reads the
// candidate model's state.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkContext, describeViolation, type Violation } from '../src/checker.ts';
import { K } from '../src/foundation.ts';
import { generate } from '../src/generate.ts';
import { foldPrefix, oracleObserve } from '../src/oracle.ts';
import { replay, type Step } from '../src/script.ts';
import { SALE, salePackage } from '../fixtures/sale.ts';
import { INSPECTION, inspectionPackage } from '../fixtures/inspection.ts';
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

const budget = (obs: Parameters<typeof saleBudgetViolations>[0], p: string, _n: number, view: Parameters<typeof saleBudgetViolations>[3]) => saleBudgetViolations(obs, p, ALICE, view);
const fullCheck = (ctx: ReturnType<typeof replay>['ctx'], frontiers?: number[]) => checkContext(ctx, { invariants: saleInvariants, budget, ...(frontiers ? { frontiers } : {}) });
const brief = (vs: Violation[]) => vs.slice(0, 6).map(describeViolation).join('\n') + (vs.length > 6 ? `\n... ${vs.length} violations` : '');

/**
 * The authored model declares a join disclosure (fix 2 in the ledger), so
 * every join in the predeclared cases is followed by one `dap.disclose`
 * from the seller. In the trace, Ivan's join at 13 is followed by the
 * disclosure of the stubs at 6 and 8, at position 14; every later
 * position of the views note's table shifts by one. The expectations
 * below are the manifest's literal ones under that shift.
 */
const IVAN_BACKLOG_AT = 14;
const shiftPos = (i: number) => (i >= IVAN_BACKLOG_AT ? i + 1 : i);

function shiftedReadability(p: string, pattern: string): string {
  const own = p === ALICE || p === IVAN ? 'r' : 'h';
  let out = pattern.slice(0, IVAN_BACKLOG_AT) + own + pattern.slice(IVAN_BACKLOG_AT);
  if (p === IVAN) out = out.slice(0, 6) + 'r' + out.slice(7, 8) + 'r' + out.slice(9);
  return out;
}

type SaleProjection = { offers: { position: number; amount: number | null; counter: number | null }[]; acceptedAmount: number | null } & Record<string, unknown>;

function shiftedProjection(p: string): SaleProjection {
  // Ivan now reads every stub, so his projection is Alice's with the private figures withheld.
  const source = structuredClone(saleTraceProjections[p === IVAN ? ALICE : p]) as SaleProjection;
  source.offers = source.offers.map((o) => ({ ...o, position: shiftPos(o.position), ...(p === IVAN ? { amount: null, counter: null } : {}) }));
  if (p === IVAN) source.acceptedAmount = null;
  return source;
}

test('case 1, the trace: positions 0 to 19 replay with the readability of the table, the literal projections and the outcomes at 17 and 18, under the model\'s declared join disclosure', (t) => {
  // Preserve the original dependency failure as well as the repaired trace.
  const literal = replay({ base: saleBase(), steps: saleTraceSteps(), joinDisclosure: false });
  assert.equal(literal.ctx.head, 19);
  const literalViolations = fullCheck(literal.ctx);
  assert.equal(literalViolations.length, 5, 'the literal trace retains its five dependency violations');
  assert.equal(literalViolations[0]!.participant, IVAN);
  assert.equal(literalViolations[0]!.frontier, 15);
  assert.equal(literalViolations[0]!.kind, 'mismatch');
  assert.equal(literalViolations[0]!.expected?.outcomes['15']?.effective, true);
  assert.equal(literalViolations[0]!.actual?.outcomes['15']?.perModel?.['sale']?.reason, 'no_such_offer');
  t.diagnostic(`literal trace without the join disclosure: ${literalViolations.length} violations` + (literalViolations.length ? '; first: ' + describeViolation(literalViolations[0]!) : ''));

  const { ctx } = replay({ base: saleBase(), steps: saleTraceSteps() });
  assert.equal(ctx.head, 20);
  assert.equal(ctx.entries[IVAN_BACKLOG_AT]!.event.kind, K.disclose);
  assert.deepEqual(ctx.entries[IVAN_BACKLOG_AT]!.event.payload, { positions: [6, 8], to: [IVAN] });
  for (const [p, pattern] of Object.entries(saleTraceReadability)) {
    assert.equal(ctx.view(p).map((v) => (v.event ? 'r' : 'h')).join(''), shiftedReadability(p, pattern), `readability for ${p}`);
  }
  for (let i = 0; i <= 20; i++) assert.equal(ctx.state.verdicts[i]?.effective, i !== shiftPos(18), `verdict at ${i}`);
  for (const p of [ALICE, BOB, CAROL, IVAN]) {
    const obs = oracleObserve(ctx, p, 20, 20);
    assert.deepEqual(obs.models['sale'], shiftedProjection(p), `sale projection for ${p}`);
    const insp = structuredClone(saleTraceInspection[p]) as { requests: { position: number }[] };
    insp.requests = insp.requests.map((r) => ({ ...r, position: shiftPos(r.position) }));
    assert.deepEqual(obs.models['inspection'], insp, `inspection projection for ${p}`);
    assert.equal(obs.outcomes[String(shiftPos(17))]?.effective, true, `17 for ${p}`);
    assert.equal(obs.outcomes[String(shiftPos(18))]?.effective, false, `18 for ${p}`);
    assert.equal(obs.outcomes[String(shiftPos(18))]?.perModel?.['sale']?.reason, 'already_decided', `18 reason for ${p}`);
  }
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 2, replacement with a hidden predecessor: Ivan sees o3 open replacing o1, and a later accept of o1 is ineffective for everyone', (t) => {
  const steps: Step[] = [...saleTraceSteps().slice(0, 15), { type: 'act', actor: ALICE, kind: SALE + 'accept', payload: { offer_id: 'o1' } }];
  const literal = replay({ base: saleBase(), steps, joinDisclosure: false });
  const literalViolations = fullCheck(literal.ctx);
  assert.equal(literalViolations.length, 3);
  assert.equal(literalViolations[0]!.participant, IVAN);
  assert.equal(literalViolations[0]!.frontier, 15);
  t.diagnostic(`literal case 2 without the join disclosure: ${literalViolations.length} violations` + (literalViolations.length ? '; first: ' + describeViolation(literalViolations[0]!) : ''));

  const { ctx } = replay({ base: saleBase(), steps }); // 14 backlog, 15 request, 16 o3, 17 terms, 18 accept o1
  assert.equal(ctx.head, 18);
  const ivan17 = oracleObserve(ctx, IVAN, 17, 17).models['sale'] as { offers: { id: string; status: string; replaces: string | null }[] };
  assert.deepEqual(ivan17.offers.map((o) => [o.id, o.status, o.replaces]), [['o1', 'replaced', null], ['o2', 'open', null], ['o3', 'open', 'o1']]);
  assert.equal(ctx.state.verdicts[18]?.effective, false);
  for (const p of ctx.state.participants) assert.equal(oracleObserve(ctx, p, 18, 18).outcomes['18']?.effective, false, `18 for ${p}`);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 3, late joiner after the decision: a second accept is ineffective in every view, equality holds at every frontier, and a disclosure of the decision keeps it', () => {
  const steps: Step[] = [
    ...saleTraceSteps().slice(0, 16), // 2..18 with Ivan's join disclosure at 14: the accept of o3 lands at 18
    { type: 'invite', inviter: ALICE, invitee: DANA, grants: { roles: ['Buyer'] } }, // 19
    { type: 'accept', invitee: DANA }, // 20, then the seller's join disclosure at 21
    { type: 'act', actor: ALICE, kind: SALE + 'accept', payload: { offer_id: 'o2' } }, // 22
  ];
  const { ctx } = replay({ base: saleBase(), steps });
  assert.equal(ctx.head, 22);
  assert.ok(ctx.state.participants.includes(DANA));
  assert.deepEqual(ctx.entries[21]!.event.payload, { positions: [6, 8, 16, 18], to: [DANA] });
  assert.equal(ctx.state.verdicts[22]?.effective, false);
  for (const p of ctx.state.participants) {
    assert.equal(oracleObserve(ctx, p, 22, 22).outcomes['22']?.effective, false, `22 for ${p}`);
    assert.equal(oracleObserve(ctx, p, 22, 22).outcomes['22']?.perModel?.['sale']?.reason, 'already_decided', `22 reason for ${p}`);
  }
  let violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
  const d = ctx.act(ALICE, K.disclose, { positions: [18], to: [DANA] }); // 23: the decision again, by itself
  assert.ok(!('refused' in d) && d.verdict?.effective);
  violations = fullCheck(ctx, [23]);
  assert.deepEqual(violations, [], brief(violations));
  const dana = oracleObserve(ctx, DANA, 23, 23).models['sale'] as { status: string; accepted: string | null };
  assert.equal(dana.accepted, 'o3');
});

test('case 4, late joiner judging a public event on a hidden fact: a withdrawal of a stub recorded before Dana joined, then an accept of it, are judged the same way in every view', () => {
  const steps: Step[] = [
    ...saleTraceSteps().slice(0, 8), // 2..9: o1, o2 and their terms
    { type: 'invite', inviter: ALICE, invitee: DANA, grants: { roles: ['Buyer'] } }, // 10
    { type: 'accept', invitee: DANA }, // 11, then the seller's join disclosure at 12
    { type: 'act', actor: CAROL, kind: SALE + 'withdraw', payload: { offer_id: 'o2' } }, // 13
    { type: 'act', actor: ALICE, kind: SALE + 'accept', payload: { offer_id: 'o2' } }, // 14
  ];
  const { ctx } = replay({ base: saleBase(), steps });
  assert.equal(ctx.head, 14);
  assert.deepEqual(ctx.entries[12]!.event.payload, { positions: [6, 8], to: [DANA] });
  assert.equal(ctx.state.verdicts[13]?.effective, true);
  assert.equal(ctx.state.verdicts[14]?.effective, false);
  for (const p of ctx.state.participants) assert.equal(oracleObserve(ctx, p, 14, 14).outcomes['14']?.perModel?.['sale']?.reason, 'withdrawn', `14 for ${p}`);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

test('case 5, the campaign: every manifest seed replays with zero violations of the property, the pause rule, the invariants and the privacy budget', (t) => {
  const limit = process.env['SALE_SEEDS'] ? Number(process.env['SALE_SEEDS']) : saleBounds.seeds.length;
  const seeds = saleBounds.seeds.slice(0, limit);
  const counts = { joins: 0, attaches: 0, disclosures: 0, offers: 0, replacements: 0, withdrawals: 0, counters: 0, accepts: 0, effectiveAccepts: 0, closes: 0, entries: 0, privateDisclosures: 0, inspectionAttaches: 0, inspectionRequests: 0, unboundInspectionRequests: 0 };
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
    for (let i = 0; i <= ctx.head; i++) {
      const entry = ctx.entries[i]!;
      if (entry.event.kind === SALE + 'accept' && ctx.state.verdicts[i]?.effective) counts.effectiveAccepts++;
      if (entry.event.kind === INSPECTION + 'request') {
        counts.inspectionRequests++;
        if (ctx.state.verdicts[i]?.reason === 'unhandled') counts.unboundInspectionRequests++;
      }
      if (entry.event.kind === K.attach && ctx.state.verdicts[i]?.effective &&
          (entry.event.payload as { package?: string }).package === inspectionPackage.id) counts.inspectionAttaches++;
      if (entry.event.kind === K.disclose && ctx.state.verdicts[i]?.effective) {
        for (const at of (entry.event.payload as { positions: number[] }).positions) {
          if ([SALE + 'offer_terms', SALE + 'counter', INSPECTION + 'request'].includes(ctx.entries[at]!.event.kind)) counts.privateDisclosures++;
        }
      }
    }
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

// ----- checker's V3 review (workroom report 8c0d324b): reproduced counterexamples kept as tests -----

test('V3-F1: a private payload disclosed to a non-party is a budget violation on what they can read, whatever the projection hides', () => {
  const { ctx } = replay({ base: saleBase(), steps: saleTraceSteps().slice(0, 8) }); // through 9: Bob's terms at 7
  const d = ctx.act(ALICE, K.disclose, { positions: [7], to: [CAROL] });
  assert.ok(!('refused' in d) && d.verdict?.effective);
  const view = ctx.view(CAROL);
  assert.equal((view[7]!.event?.payload as { amount?: number })?.amount, 700); // Carol can read it
  const carol = oracleObserve(ctx, CAROL, ctx.head, ctx.head).models['sale'] as { offers: { id: string; amount: number | null }[] };
  assert.equal(carol.offers.find((o) => o.id === 'o1')?.amount, null); // the projection still hides it
  const violations = fullCheck(ctx, [ctx.head]).filter((v) => v.kind === 'budget' && v.participant === CAROL);
  assert.ok(violations.length > 0, 'the readable terms are reported');
  assert.match(violations[0]!.detail, /carol can read the sale\.offer_terms at 7/);
});

test('V3-F2: a counter naming someone other than the stub\'s author is ineffective, and its delivery to that person is reported by the budget', () => {
  const { ctx } = replay({ base: saleBase(), steps: saleTraceSteps().slice(0, 5) }); // through 6: Bob's stub o1
  const wrong = ctx.act(ALICE, SALE + 'counter', { offer_id: 'o1', amount: 780, author: CAROL });
  assert.ok(!('refused' in wrong));
  assert.equal(wrong.verdict?.effective, false);
  assert.equal(wrong.verdict?.perModel?.['sale']?.reason, 'not_author');
  assert.ok(ctx.view(CAROL)[wrong.header.position]!.event, 'the predeclared audience still delivers it to Carol');
  const violations = fullCheck(ctx, [ctx.head]).filter((v) => v.kind === 'budget' && v.participant === CAROL);
  assert.ok(violations.length > 0, 'the misdirected counter is a budget violation');
  const right = ctx.act(ALICE, SALE + 'counter', { offer_id: 'o1', amount: 780, author: BOB });
  assert.ok(!('refused' in right) && right.verdict?.effective);
  assert.ok(ctx.view(BOB)[right.header.position]!.event && !ctx.view(CAROL)[right.header.position]!.event);
  assert.deepEqual(fullCheck(ctx, [ctx.head]).filter((v) => v.participant !== CAROL), []);
});

test('V3-F3: null private payloads are recorded with a deterministic ineffective verdict, replay cold, retry exactly, and a valid action follows', () => {
  const { ctx } = replay({ base: saleBase(), steps: saleTraceSteps().slice(0, 10) }); // through 11: the inspection attach
  const cases: [string, string][] = [[ALICE, INSPECTION + 'request'], [BOB, SALE + 'offer_terms'], [ALICE, SALE + 'counter']];
  for (const [actor, kind] of cases) {
    const ev = ctx.intent(actor, kind, null);
    const r = ctx.submit(ev, ctx.credentialFor(actor));
    assert.ok(!('refused' in r), kind);
    assert.equal(r.verdict?.effective, false, kind);
    assert.ok(ctx.state.verdicts[r.header.position], kind + ' has a recorded verdict');
    const again = ctx.submit(ev, ctx.credentialFor(actor));
    assert.ok(!('refused' in again) && again.replay && again.header.position === r.header.position, kind + ' retries exactly');
    assert.ok(!('refused' in again) && again.verdict?.effective === false, kind + ' retry carries the verdict');
  }
  assert.doesNotThrow(() => foldPrefix(ctx, ctx.head));
  const ok = ctx.act(BOB, SALE + 'offer_terms', { offer_id: 'o1', amount: 700, seller: ALICE });
  assert.ok(!('refused' in ok) && ok.verdict?.effective);
  const violations = fullCheck(ctx);
  assert.deepEqual(violations, [], brief(violations));
});

// ----- checker's second V3 review (report 796c6510), G1 -----

for (const failed of [
  { actor: CAROL, roles: ['Buyer'], payload: { offer_id: 'o1', replaces: 'zzz' }, reason: 'no_such_offer' },
  { actor: IVAN, roles: ['Inspector'], payload: { offer_id: 'o1' }, reason: 'unauthorized' },
]) {
  test(`V3-G1: an ineffective stub by ${failed.actor} does not make them a counter party`, () => {
    const { ctx } = replay({ base: saleBase(), steps: [
      { type: 'invite', inviter: ALICE, invitee: BOB, grants: { roles: ['Buyer'] } },
      { type: 'accept', invitee: BOB },
      { type: 'invite', inviter: ALICE, invitee: failed.actor, grants: { roles: failed.roles } },
      { type: 'accept', invitee: failed.actor },
      { type: 'act', actor: failed.actor, kind: SALE + 'offer', payload: failed.payload },
    ] });
    assert.equal(ctx.state.verdicts[6]?.effective, false);
    assert.equal(ctx.state.verdicts[6]?.perModel?.['sale']?.reason ?? ctx.state.verdicts[6]?.reason, failed.reason);
    const sendCounter = () => {
      const r = ctx.act(ALICE, SALE + 'counter', { offer_id: 'o1', amount: 777, author: failed.actor });
      assert.ok(!('refused' in r));
      assert.equal(r.verdict?.effective, false);
      assert.equal((ctx.view(failed.actor)[r.header.position]!.event?.payload as { amount: number }).amount, 777);
      return r;
    };
    // With no effective stub, its refused recorder still is not a party.
    const missing = sendCounter();
    assert.equal(missing.verdict?.perModel?.['sale']?.reason, 'no_such_offer');
    let violations = fullCheck(ctx, [ctx.head]).filter((v) => v.kind === 'budget' && v.participant === failed.actor);
    assert.equal(violations.length, 1);
    assert.match(violations[0]!.detail, /whose parties are alice\+alice$/);
    // A later effective stub owns the id, even though the failed one came first.
    const stub = ctx.act(BOB, SALE + 'offer', { offer_id: 'o1' });
    assert.ok(!('refused' in stub) && stub.verdict?.effective);
    const wrong = sendCounter();
    assert.equal(wrong.verdict?.perModel?.['sale']?.reason, 'not_author');
    violations = fullCheck(ctx, [ctx.head]).filter((v) => v.kind === 'budget' && v.participant === failed.actor);
    assert.equal(violations.length, 2);
    assert.match(violations[0]!.detail, /whose parties are alice\+alice$/);
    assert.match(violations[1]!.detail, /whose parties are alice\+alice\+bob$/);
    const right = ctx.act(ALICE, SALE + 'counter', { offer_id: 'o1', amount: 780, author: BOB });
    assert.ok(!('refused' in right) && right.verdict?.effective);
    assert.ok(ctx.view(BOB)[right.header.position]!.event);
    assert.equal(ctx.view(failed.actor)[right.header.position]!.event, undefined);
    assert.deepEqual(fullCheck(ctx, [ctx.head]).filter((v) => v.participant !== failed.actor), []);
  });
}
