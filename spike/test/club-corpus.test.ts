import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { clubPackage as baseline } from '../fixtures/club-baseline.ts';
import { CLUB, clubPackage } from '../fixtures/club.ts';
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
    const replayed = replayLinked(record.steps, base, byName);
    const violations = check(replayed);
    assert.ok(violations.some((v) => v.kind === 'mismatch'));
    // Literal ids/descriptions reproduce at V5 snapshot 772a514. V3's
    // audience-read binding contract changes event ids after integration.
    // Remap only the linked application's id, preserving every other byte
    // of the recorded finding, and check the full id rather than its preview.
    const sourceApplications = record.steps.flatMap((s) => s.entries).filter((e) => e.kind === CLUB + 'apply');
    const applications = replayed.entries.filter((e) => e.event.kind === CLUB + 'apply');
    assert.equal(sourceApplications.length, 1);
    assert.equal(applications.length, 1);
    const sourceId = sourceApplications[0]!.id;
    const applicationId = applications[0]!.id;
    const vote = replayed.entries.find((e) => e.event.kind === CLUB + 'vote')!;
    assert.equal((vote.event.payload as { application_id: string }).application_id, applicationId);
    const first = violations[0]!;
    const projected = first.actual!.models.club as { applications: { id: string }[] };
    assert.equal(projected.applications[0]!.id, applicationId);
    const sourcePreview = JSON.stringify({ id: sourceId }).slice(0, 60);
    assert.equal(record.expected.split(sourcePreview).length, 2, 'exactly one linked-id preview');
    const expected = record.expected.replace(sourcePreview, JSON.stringify({ id: applicationId }).slice(0, 60));
    assert.equal(describeViolation(first), expected);
    for (let i = 0; i < record.steps.length; i++) {
      const smaller = record.steps.filter((_, j) => i !== j);
      assert.equal(check(replayLinked(smaller, base, byName)).some((v) => v.kind === 'mismatch'), false, `seed ${seed} remains failing without step ${i}`);
    }
    const repaired = replayLinked(record.steps, { ...clubBase(clubPackage), nonce: record.nonce }, byName);
    assert.deepEqual(check(repaired), [], `seed ${seed} under the repaired model`);
    t.diagnostic(`seed ${seed}: ${record.originalSteps} -> ${record.steps.length} steps; baseline mismatch, repaired clean; application ${sourceId} -> ${applicationId}`);
  }
  t.diagnostic(`manifest ${CLUB_MANIFEST_ID}; baseline ${baseline.id}; repaired ${clubPackage.id}`);
});
