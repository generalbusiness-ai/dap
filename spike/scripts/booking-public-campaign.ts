// Run the amended V4-F1/F2 guard before the foundation/client repair and
// retain every failing series. Reproduce at the run-7 snapshot commit.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { checkContext, describeViolation } from '../src/checker.ts';
import { serializeSteps, writeCorpus } from '../src/corpus.ts';
import { generate } from '../src/generate.ts';
import { replay, shrink, type Script } from '../src/script.ts';
import { bookingPackage } from '../fixtures/booking.ts';
import { ADMIN, BOOKING_MANIFEST_ID, bookingBounds, bookingBudgetViolations, bookingGeneratorSpec, bookingInvariants, publicBookingLeaks } from '../manifests/booking.ts';

const dir = fileURLToPath(new URL('../corpus/booking/run7/', import.meta.url));
mkdirSync(join(dir, 'full'), { recursive: true });
const check = (s: Script) => checkContext(replay(s).ctx, { invariants: bookingInvariants, budget: (o, p, _n, v) => bookingBudgetViolations(o, p, ADMIN, v) });
const fails = (s: Script) => {
  const { ctx } = replay(s);
  const outcomes = Object.fromEntries(ctx.state.verdicts.map((v, i) => [String(i), { effective: v?.effective === true, reason: null }]));
  return ctx.state.participants.some((p) => publicBookingLeaks({ outcomes }, p, ADMIN, ctx.view(p)).length > 0);
};
const failures: number[] = [];
for (const seed of bookingBounds.seeds) {
  const script = generate(bookingGeneratorSpec(bookingPackage), seed);
  const before = check(script);
  assert.ok(before.every((v) => v.kind === 'budget'), `seed ${seed}: unexpected non-budget failure`);
  if (!before.length) continue;
  assert.ok(fails(script), `seed ${seed}: public-event leak`);
  const minimal = shrink(script, fails);
  const after = check(minimal);
  assert.ok(after.some((v) => v.kind === 'budget'));
  const meta = { seed, manifest: BOOKING_MANIFEST_ID, package: bookingPackage.id, snapshot: 'spike V4: checker run 7 snapshot: preserve public actor and payload leaks' };
  writeCorpus(dir, `seed-${seed}`, { ...meta, expected: describeViolation(after.find((v) => v.kind === 'budget')!), steps: serializeSteps(minimal.steps) });
  writeFileSync(join(dir, 'full', `seed-${seed}.json`), JSON.stringify({ ...meta, genesisNonce: script.base.nonce, steps: serializeSteps(script.steps), violations: before.map(describeViolation) }, null, 2) + '\n');
  failures.push(seed);
  console.log(`seed ${seed}: ${script.steps.length} -> ${minimal.steps.length}; ${describeViolation(after[0]!)}`);
}
writeFileSync(join(dir, 'seeds.txt'), failures.join('\n') + '\n');
console.log(`manifest ${BOOKING_MANIFEST_ID}\npackage ${bookingPackage.id}\nfailing seeds ${failures.length}/200: ${failures.join(', ')}`);
