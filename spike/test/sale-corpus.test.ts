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
