// The Sale corpus (spike plan §4.4: every failing series is shrunk and
// committed). Each entry under corpus/sale/<run> is a deletion-minimal
// script that failed under that run's model, kept with the model it
// failed against so the failure is replayable, and replayed here against
// the current model to report what became of it.

import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkContext, describeViolation } from '../src/checker.ts';
import { readCorpus, toScript } from '../src/corpus.ts';
import { replay } from '../src/script.ts';
import { salePackage as run1Package } from '../corpus/sale/run1/model.ts';
import { salePackage as run6Package } from '../corpus/sale/run6/model.ts';
import { salePackage } from '../fixtures/sale.ts';
import { ALICE, saleBase, saleBudgetViolations, saleInvariants, sidePackage } from '../manifests/sale.ts';

const byName = { [sidePackage.name]: sidePackage };
const run1Dir = fileURLToPath(new URL('../corpus/sale/run1/', import.meta.url));

test('run 1 corpus: every shrunk series still fails against the run-1 model with the recorded failure kind, and is reported against the current model', (t) => {
  const entries = readCorpus(run1Dir);
  assert.ok(entries.length >= 17, `run 1 recorded 17 failing seeds; corpus has ${entries.length}`);
  const outcomes: string[] = [];
  for (const { name, entry } of entries) {
    assert.equal(entry.package, run1Package.id, `${name} was recorded against the run-1 model`);
    const then = replay(toScript(entry, saleBase(run1Package), byName));
    // run 1's budget was projection-only: the readable-events check did not exist
    const thenViolations = checkContext(then.ctx, { invariants: saleInvariants, budget: (o, p) => saleBudgetViolations(o, p, ALICE, []) });
    assert.ok(thenViolations.length > 0, `${name} no longer fails against the run-1 model`);
    const recordedKind = entry.expected.split(' ')[1]?.replace(':', '');
    assert.ok(thenViolations.some((v) => v.kind + ':' === recordedKind + ':' || v.kind === recordedKind), `${name}: recorded ${entry.expected}, now ${describeViolation(thenViolations[0]!)}`);
    const now = replay(toScript(entry, saleBase(salePackage), byName));
    const nowViolations = checkContext(now.ctx, { invariants: saleInvariants, budget: (o, p, _n, view) => saleBudgetViolations(o, p, ALICE, view) });
    outcomes.push(`${name}: ${entry.steps.length} steps; run-1 model ${thenViolations[0]!.kind}; current model ${nowViolations.length ? nowViolations[0]!.kind : 'clean'}`);
  }
  for (const line of outcomes) t.diagnostic(line);
});


test('run 6 corpus: the current foundation fixes unauthorized leaks; the repaired audience fixes the remaining authorized leaks', (t) => {
  const entries = readCorpus(fileURLToPath(new URL('../corpus/sale/run6/', import.meta.url)));
  assert.deepEqual(entries.map(({ entry }) => entry.seed).sort((a, b) => Number(a) - Number(b)), [42, 112, 141, 160, 172, 181, 193, 197, 200]);
  for (const { name, entry } of entries) {
    assert.equal(entry.package, run6Package.id, name + ' pins the kept run-6 model');
    const script = toScript(entry, saleBase(run6Package), byName);
    const check = (candidate: typeof script) => checkContext(replay(candidate).ctx, {
      invariants: saleInvariants,
      budget: (o, p, _n, view) => saleBudgetViolations(o, p, ALICE, view),
    });
    // All nine historical failures reproduce at 009b5226 with its old
    // foundation. V4 makes the six unauthorized counters actor-only.
    const then = check(script);
    const authorizedCounter = [172, 181, 200].includes(Number(entry.seed));
    if (authorizedCounter) {
      assert.ok(then.some((v) => v.kind === 'budget'), name + ' still violates privacy under the kept audience');
      assert.equal(describeViolation(then[0]!), entry.expected, name + ' reproduces the recorded finding');
    } else {
      assert.deepEqual(then, [], name + ' is already clean under the repaired foundation');
    }
    for (let i = 0; i < script.steps.length; i++) {
      assert.deepEqual(check({ ...script, steps: script.steps.filter((_, j) => i !== j) }), [], `${name}: deleting step ${i} removes the failure`);
    }
    const now = toScript(entry, saleBase(salePackage), byName);
    assert.deepEqual(check(now), [], name + ' is clean under the repaired audience');
    t.diagnostic(`${name}: ${entry.steps.length} steps; kept model ${authorizedCounter ? 'budget violation' : 'clean under current foundation'}; current model clean`);
  }
});
