import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkContext } from '../src/checker.ts';
import { readCorpus, toScript } from '../src/corpus.ts';
import { replay } from '../src/script.ts';
import { bookingPackage as run2Package } from '../corpus/booking/run2/model.ts';
import { hasPrivateDisclosure } from '../corpus/booking/privacy-failure.ts';
import { bookingPackage } from '../fixtures/booking.ts';
import { ADMIN, bookingBase, bookingInvariants, sidePackage } from '../manifests/booking.ts';
import { bookingBudgetViolations } from '../corpus/booking/run2/budget.ts';

test('run 2 corpus: all 139 recovered privacy failures replay and are deletion-minimal', (t) => {
  const dir = fileURLToPath(new URL('../corpus/booking/run2/', import.meta.url));
  const entries = readCorpus(dir);
  const seeds = readFileSync(new URL('../corpus/booking/run2/seeds.txt', import.meta.url), 'utf8').trim().split('\n').map(Number);
  assert.equal(entries.length, 139);
  assert.deepEqual(entries.map(({ entry }) => entry.seed).sort((a, b) => Number(a) - Number(b)), seeds);
  for (const { name, entry } of entries) {
    assert.equal(entry.manifest, 'sha256:771a9cb82aff7b03bf50b55b490e35710da3e3072bd8877a7b79a13100bfc3f7', `${name} historical manifest`);
    assert.equal(entry.package, run2Package.id, `${name} kept model`);
    assert.match(entry.expected, / budget: /);
    const script = toScript(entry, bookingBase(run2Package), { [sidePackage.name]: sidePackage });
    const violations = checkContext(replay(script).ctx, {
      invariants: bookingInvariants,
      budget: (o, p, _n, view) => bookingBudgetViolations(o, p, ADMIN, view),
    });
    assert.ok(violations.some((v) => v.kind === 'budget'), `${name} retains its failure`);
    for (let i = 0; i < script.steps.length; i++) {
      assert.equal(hasPrivateDisclosure({ ...script, steps: script.steps.filter((_, j) => j !== i) }), false, `${name} can delete step ${i}`);
    }
    const current = toScript(entry, bookingBase(bookingPackage), { [sidePackage.name]: sidePackage });
    assert.equal(hasPrivateDisclosure(current), true, `${name}: an explicit private disclosure still violates the budget`);
  }
  t.diagnostic(`${entries.length} recovered failures, all deletion-minimal; explicit private disclosures remain budget violations under the repaired model`);
});
