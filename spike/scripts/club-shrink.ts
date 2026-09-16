// Reconstruct the three recorded run-1 failures, retaining event links while
// shrinking. The exact baseline source stays in fixtures/ to preserve its id.
// Run only after a checker snapshot is committed: node scripts/club-shrink.ts
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { clubPackage as baseline } from '../fixtures/club-baseline.ts';
import { clubPackage } from '../fixtures/club.ts';
import { CLUB_MANIFEST_ID, clubBase, clubBudgetViolations, clubGeneratorSpec, clubInvariants, sidePackage } from '../manifests/club.ts';
import { checkContext, describeViolation } from '../src/checker.ts';
import type { Context } from '../src/context.ts';
import { generate } from '../src/generate.ts';
import { foldPrefix } from '../src/oracle.ts';
import { replay } from '../src/script.ts';
import { linkSteps, replayLinked, shrinkLinked, type ClubCorpus } from '../corpus/club/replay.ts';

const check = (ctx: Context) => checkContext(ctx, {
  invariants: clubInvariants,
  budget: (o, p, n, view) => clubBudgetViolations(o, p, foldPrefix(ctx, n), n, view),
});
const byName = { [sidePackage.name]: sidePackage };
const dir = new URL('../corpus/club/run1/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const seed of [81, 107, 182]) {
  const script = generate(clubGeneratorSpec(baseline), seed);
  const original = replay(script).ctx;
  const steps = linkSteps(script);
  const base = { ...clubBase(baseline), nonce: script.base.nonce! };
  // Evidence that the link representation did not change the generated series.
  assert.deepEqual(replayLinked(steps, base, byName).entries, original.entries);
  const before = check(original);
  assert.ok(before.length, `seed ${seed} must reproduce the recorded baseline failure`);
  const minimal = shrinkLinked(steps, (candidate) => check(replayLinked(candidate, base, byName)).some((v) => v.kind === 'mismatch'));
  const after = check(replayLinked(minimal, base, byName));
  const current = check(replayLinked(minimal, { ...clubBase(clubPackage), nonce: base.nonce }, byName));
  assert.deepEqual(current, [], `seed ${seed} remains broken under the repaired model`);
  const record: ClubCorpus = {
    seed, manifest: CLUB_MANIFEST_ID, package: baseline.id,
    snapshot: 'V5 validation run 3; reconstructed from baseline 8557249 and recorded run-1 seed',
    expected: describeViolation(after[0]!), nonce: base.nonce,
    originalSteps: steps.length, steps: minimal,
  };
  writeFileSync(new URL(`seed-${seed}.json`, dir), JSON.stringify(record, null, 2) + '\n');
  console.log(`seed ${seed}: ${steps.length} -> ${minimal.length} steps; ${record.expected}; repaired model clean`);
}
console.log(`manifest ${CLUB_MANIFEST_ID}; baseline ${baseline.id}; repaired ${clubPackage.id}`);
