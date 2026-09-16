// Recover the run-2 privacy failures with its preserved model and generator.
// The current replay boundary is used; see corpus/booking/run2/README.md.
//   node scripts/booking-shrink.ts
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { checkContext, describeViolation } from '../src/checker.ts';
import { serializeSteps, writeCorpus } from '../src/corpus.ts';
import { replay, shrink } from '../src/script.ts';
import { generate } from '../corpus/booking/run2/generate.ts';
import { bookingPackage } from '../corpus/booking/run2/model.ts';
import { ADMIN, bookingBounds, bookingGeneratorSpec, bookingInvariants } from '../manifests/booking.ts';
import { bookingBudgetViolations } from '../corpus/booking/run2/budget.ts';
import { hasPrivateDisclosure } from '../corpus/booking/privacy-failure.ts';

const manifest = 'sha256:771a9cb82aff7b03bf50b55b490e35710da3e3072bd8877a7b79a13100bfc3f7';
const dir = fileURLToPath(new URL('../corpus/booking/run2/', import.meta.url));
const spec = bookingGeneratorSpec(bookingPackage);
const failing: number[] = [];
const check = (script: Parameters<typeof replay>[0]) => checkContext(replay(script).ctx, {
  invariants: bookingInvariants,
  budget: (o, p, _n, view) => bookingBudgetViolations(o, p, ADMIN, view),
});
for (const seed of bookingBounds.seeds) {
  const script = generate(spec, seed);
  const before = check(script);
  assert.ok(before.every((v) => v.kind === 'budget'), `seed ${seed} has a failure outside the recorded privacy failures`);
  if (!before.length) continue;
  assert.ok(hasPrivateDisclosure(script), `seed ${seed} has a readable private event`);
  const minimal = shrink(script, hasPrivateDisclosure);
  const violation = check(minimal).find((v) => v.kind === 'budget');
  assert.ok(violation, `seed ${seed} retains its privacy failure`);
  writeCorpus(dir, `seed-${seed}`, {
    seed,
    manifest,
    package: bookingPackage.id,
    snapshot: 'spike V4: checker run 5 snapshot: recover the run-2 privacy corpus',
    expected: describeViolation(violation),
    steps: serializeSteps(minimal.steps),
  });
  failing.push(seed);
  console.log(`seed ${seed}: ${script.steps.length} -> ${minimal.steps.length} steps; ${describeViolation(violation)}`);
}
assert.equal(failing.length, 139, 'run 2 recorded 139 failing seeds');
writeFileSync(join(dir, 'seeds.txt'), failing.join('\n') + '\n');
console.log(`manifest ${manifest}\nkept package ${bookingPackage.id}\nrecovered ${failing.length}/${bookingBounds.seeds.length} failing seeds`);
