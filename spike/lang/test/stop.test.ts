// Evidence-only follow-up after T1's stop. No candidate semantics are repaired.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { sale } from '../declarations/sale.ts';
import { checkDeclaration } from '../compiler.ts';
import { salePackage, derivedBudget } from '../generated/sale.ts';
import { salePackage as handwritten, SALE } from '../../fixtures/sale.ts';
import { checkContext, describeViolation, withAudience } from '../../src/checker.ts';
import { toScript, type CorpusEntry } from '../../src/corpus.ts';
import { replay, type Step } from '../../src/script.ts';
import { named } from '../../src/types.ts';
import { K } from '../../src/foundation.ts';
import { oracleObserve } from '../../src/oracle.ts';
import { saleBase, saleBudgetViolations, saleInvariants, saleTraceReadability, saleTraceSteps, ALICE, BOB } from '../../manifests/sale.ts';
const evidence = JSON.parse(readFileSync(new URL('../evidence/stop-witness.json', import.meta.url), 'utf8')) as { steps: Step[]; package: string };
const checks = (ctx: ReturnType<typeof replay>['ctx']) => checkContext(ctx, { invariants: saleInvariants, budget: (o, p, _n, v) => saleBudgetViolations(o, p, ALICE, v) });
const isFailure = (steps: Step[]) => checks(replay({ base: saleBase(salePackage), steps }).ctx).some((v) => v.kind === 'budget' && v.participant === BOB && v.detail.includes('sale.offer_terms'));

test('retained T1 counterexample: accepted declaration delivers refused Carol terms to Bob; derived budget misses it', () => {
  assert.equal(salePackage.id, evidence.package);
  assert.deepEqual(checkDeclaration(sale), []);
  const { ctx } = replay({ base: saleBase(salePackage), steps: evidence.steps });
  assert.equal(ctx.head, 7);
  assert.equal(ctx.state.verdicts[7]?.perModel?.sale?.reason, 'not_author');
  assert.ok(ctx.view(BOB)[7]!.event);
  assert.deepEqual(checks(ctx).map(describeViolation), ['bob@7 budget: bob can read the sale.offer_terms at 7, whose parties are carol+alice']);
  assert.deepEqual(checkContext(ctx, { budget: derivedBudget }), []);
});
test('retained counterexample has a clean hand-written control and is deletion-minimal', () => {
  const control = replay({ base: saleBase(handwritten), steps: evidence.steps }).ctx;
  assert.deepEqual(checks(control), []);
  assert.equal(control.view(BOB)[7]!.event, undefined);
  for (let i = 0; i < evidence.steps.length; i++) assert.equal(isFailure(evidence.steps.filter((_, j) => j !== i)), false, 'deletion ' + i);
});
for (const seed of [72, 96, 172]) test('derived Sale preserves tombstone regression ' + seed, () => {
  const entry = JSON.parse(readFileSync(new URL('../../corpus/sale/run1/seed-' + seed + '.json', import.meta.url), 'utf8')) as CorpusEntry;
  const { ctx } = replay({ ...toScript(entry, saleBase(salePackage), {}), joinDisclosure: false });
  assert.deepEqual(checks(ctx), []);
  assert.equal(ctx.state.verdicts[4]?.perModel?.sale?.reason, 'no_such_offer');
});
test('derived Sale retains literal readership, including Bob at 10', () => {
  const { ctx } = replay({ base: saleBase(salePackage), steps: saleTraceSteps(), joinDisclosure: false });
  for (const [principal, expected] of Object.entries(saleTraceReadability)) assert.equal(ctx.view(principal).map((v) => v.event ? 'r' : 'h').join(''), expected);
  assert.ok(ctx.view(BOB)[10]!.event);
});
test('unchanged checker detects a deliberately narrowed derived offer audience with a clean control', () => {
  const steps: Step[] = [...evidence.steps.slice(0, 5), { type: 'act', actor: ALICE, kind: SALE + 'accept', payload: { offer_id: 'o1' } }];
  const control = replay({ base: saleBase(salePackage), steps }).ctx;
  assert.deepEqual(checks(control), []);
  const broken = withAudience(salePackage, SALE + 'offer', 'deliberately-only-bob', () => named(BOB));
  const mutant = replay({ base: saleBase(broken), steps }).ctx;
  assert.ok(checks(mutant).some((v) => v.kind === 'mismatch' && v.frontier === 7));
});

test('retained V3-F1 projection regression: hostile disclosure shows 700 where the original projection keeps null', () => {
  const steps: Step[] = [...saleTraceSteps().slice(0, 8), { type: 'disclose', actor: ALICE, positions: [7], to: ['carol'] }];
  const candidate = replay({ base: saleBase(salePackage), steps }).ctx;
  const control = replay({ base: saleBase(handwritten), steps }).ctx;
  const amount = (ctx: typeof candidate) => (oracleObserve(ctx, 'carol', ctx.head, ctx.head).models.sale as { offers: { id: string; amount: unknown }[] }).offers.find((o) => o.id === 'o1')!.amount;
  assert.equal(candidate.entries[candidate.head]!.event.kind, K.disclose);
  assert.equal(amount(candidate), 700);
  assert.equal(amount(control), null);
  assert.ok(checks(candidate).some((v) => v.kind === 'budget' && v.participant === 'carol'));
});
