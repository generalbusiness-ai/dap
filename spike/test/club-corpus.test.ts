import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { clubPackage as baseline } from '../fixtures/club-baseline.ts';
import { clubPackage } from '../fixtures/club.ts';
import { CLUB_MANIFEST_ID, clubBase, clubBudgetViolations, clubInvariants, sidePackage } from '../manifests/club.ts';
import { checkContext, describeViolation } from '../src/checker.ts';
import type { Context } from '../src/context.ts';
import { foldPrefix } from '../src/oracle.ts';
import { replayLinked, type ClubCorpus } from '../corpus/club/replay.ts';

const check = (ctx: Context) => checkContext(ctx, {
  invariants: clubInvariants,
  budget: (o, p, n, view) => clubBudgetViolations(o, p, foldPrefix(ctx, n), n, view),
});
const byName = { [sidePackage.name]: sidePackage };

test('Club baseline corpus: all three recorded seeds reproduce, are deletion-minimal with links preserved, and pass under the repaired model', (t) => {
  assert.equal(baseline.id, 'sha256:6aeac545386d59b2d4645bfa9d951b576ae66119484f723d1fb765ff1a02a08f');
  for (const seed of [81, 107, 182]) {
    const record = JSON.parse(readFileSync(new URL(`../corpus/club/run1/seed-${seed}.json`, import.meta.url), 'utf8')) as ClubCorpus;
    assert.equal(record.seed, seed);
    assert.equal(record.package, baseline.id);
    assert.equal(record.manifest, CLUB_MANIFEST_ID);
    const base = { ...clubBase(baseline), nonce: record.nonce };
    const violations = check(replayLinked(record.steps, base, byName));
    assert.ok(violations.some((v) => v.kind === 'mismatch'));
    assert.equal(describeViolation(violations[0]!), record.expected);
    for (let i = 0; i < record.steps.length; i++) {
      const smaller = record.steps.filter((_, j) => i !== j);
      assert.equal(check(replayLinked(smaller, base, byName)).some((v) => v.kind === 'mismatch'), false, `seed ${seed} remains failing without step ${i}`);
    }
    const repaired = replayLinked(record.steps, { ...clubBase(clubPackage), nonce: record.nonce }, byName);
    assert.deepEqual(check(repaired), [], `seed ${seed} under the repaired model`);
    t.diagnostic(`seed ${seed}: ${record.originalSteps} -> ${record.steps.length} steps; baseline mismatch, repaired clean`);
  }
  t.diagnostic(`manifest ${CLUB_MANIFEST_ID}; baseline ${baseline.id}; repaired ${clubPackage.id}`);
});
