// Compiler plan §4.2: exact historical witnesses, separate from compiler
// diagnostics. These replays use the unchanged checker and foundation.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkContext, describeViolation, type Violation } from '../../src/checker.ts';
import { toScript, type CorpusEntry } from '../../src/corpus.ts';
import type { PackageDescriptor } from '../../src/descriptor.ts';
import { replay, type Step } from '../../src/script.ts';
import { salePackage as run1Package } from '../../corpus/sale/run1/model.ts';
import { salePackage as run6Package } from '../../corpus/sale/run6/model.ts';
import { SALE, salePackage } from '../../fixtures/sale.ts';
import {
  ALICE, BOB, CAROL, DANA, saleBase, saleBudgetViolations,
  saleInvariants, saleTraceReadability, saleTraceSteps, sidePackage,
} from '../../manifests/sale.ts';

const spikeUrl = new URL('../../', import.meta.url);
const digest = (source: string | Buffer) => createHash('sha256').update(source).digest('hex');
const byName = { [sidePackage.name]: sidePackage };
const projectionBudget = (obs: Parameters<typeof saleBudgetViolations>[0], p: string) => saleBudgetViolations(obs, p, ALICE, []);
const readableBudget = (obs: Parameters<typeof saleBudgetViolations>[0], p: string, _n: number, view: Parameters<typeof saleBudgetViolations>[3]) => saleBudgetViolations(obs, p, ALICE, view);

function corpus(run: 'run1' | 'run6', seed: number, pkg: PackageDescriptor) {
  const entry = JSON.parse(readFileSync(new URL(`../../corpus/sale/${run}/seed-${seed}.json`, import.meta.url), 'utf8')) as CorpusEntry;
  assert.equal(entry.seed, seed);
  assert.equal(entry.snapshot, run);
  assert.equal(entry.package, pkg.id, `${run}/${seed} keeps its recorded package`);
  const script = toScript(entry, saleBase(pkg), byName);
  script.joinDisclosure = false;
  return { entry, script };
}

function witness(violations: Violation[], participant: string, frontier: number, kind: Violation['kind']): Violation {
  const matches = violations.filter((v) => v.participant === participant && v.frontier === frontier && v.kind === kind);
  assert.equal(matches.length, 1, `${participant}@${frontier} ${kind}: ${violations.map(describeViolation).join('\n')}`);
  return matches[0]!;
}

test('the historical witnesses pin the unchanged harness, client, manifests and kept models', () => {
  const boundary = JSON.parse(readFileSync(new URL('../evidence/witness-boundary.json', import.meta.url), 'utf8')) as { sourceCommit: string; sha256: Record<string, string> };
  assert.equal(boundary.sourceCommit, '9c4e04e52ca9f16d3014c9d7d79a148bd039123e');
  for (const [path, sha256] of Object.entries(boundary.sha256)) {
    assert.equal(digest(readFileSync(new URL(path, spikeUrl))), sha256, `${path} stays at the predeclared boundary`);
  }
});

test('members-stub witness: run-1 seed 158 is Dana@7, accepted o3 versus null and no_such_offer', () => {
  const { entry, script } = corpus('run1', 158, run1Package);
  const { ctx } = replay(script);
  assert.equal(ctx.head, 7);
  assert.equal(ctx.view(DANA, 7)[4]!.event, undefined, 'Dana has only the original stub header');
  const result = witness(checkContext(ctx, { invariants: saleInvariants, budget: projectionBudget }), DANA, 7, 'mismatch');
  assert.equal(describeViolation(result), entry.expected);
  assert.deepEqual(result.expected?.outcomes['7']?.perModel?.['sale'], { effective: true, reason: null });
  assert.deepEqual(result.actual?.outcomes['7']?.perModel?.['sale'], { effective: false, reason: 'no_such_offer' });
  assert.equal((result.expected?.models['sale'] as { accepted: unknown }).accepted, 'o3');
  assert.equal((result.actual?.models['sale'] as { accepted: unknown }).accepted, null);
});

test('members-stub witness: literal manifest case 3 is Dana@20, already_decided versus no_such_offer', () => {
  const steps: Step[] = [
    ...saleTraceSteps().slice(0, 16),
    { type: 'invite', inviter: ALICE, invitee: DANA, grants: { roles: ['Buyer'] } },
    { type: 'accept', invitee: DANA },
    { type: 'act', actor: ALICE, kind: SALE + 'accept', payload: { offer_id: 'o2' } },
  ];
  const { ctx } = replay({ base: saleBase(run1Package), steps, joinDisclosure: false });
  assert.equal(ctx.head, 20);
  assert.equal(ctx.view(DANA, 20)[8]!.event, undefined);
  assert.equal(ctx.view(DANA, 20)[17]!.event, undefined);
  const result = witness(checkContext(ctx, { invariants: saleInvariants, budget: projectionBudget }), DANA, 20, 'mismatch');
  assert.deepEqual(result.expected?.outcomes['20']?.perModel?.['sale'], { effective: false, reason: 'already_decided' });
  assert.deepEqual(result.actual?.outcomes['20']?.perModel?.['sale'], { effective: false, reason: 'no_such_offer' });
});

for (const [seed, participant] of [[172, CAROL], [181, BOB], [200, BOB]] as const) {
  test(`payload-audience witness: run-6 seed ${seed} is ${participant}@4 budget`, () => {
    const { entry, script } = corpus('run6', seed, run6Package);
    const { ctx } = replay(script);
    assert.equal(ctx.head, 4);
    assert.equal(ctx.entries[4]!.event.kind, SALE + 'counter');
    assert.ok(ctx.view(participant, 4)[4]!.event, 'the payload addressee reads the refused counter');
    assert.equal(ctx.verdictAt(4)?.perModel?.['sale']?.reason, 'no_such_offer');
    const result = witness(checkContext(ctx, { invariants: saleInvariants, budget: readableBudget }), participant, 4, 'budget');
    assert.equal(describeViolation(result), entry.expected);
    assert.equal(result.detail, `${participant} can read the sale.counter at 4, whose parties are alice+alice`);
    const repaired = replay({ ...script, base: saleBase(salePackage) });
    assert.deepEqual(checkContext(repaired.ctx, { invariants: saleInvariants, budget: readableBudget }), []);
  });
}

test('self-asserted-reference witness: V3-F2 against run 1 is effective, and Carol@7 is budget', () => {
  const { ctx } = replay({ base: saleBase(run1Package), steps: saleTraceSteps().slice(0, 5), joinDisclosure: false });
  const wrong = ctx.act(ALICE, SALE + 'counter', { offer_id: 'o1', amount: 780, author: CAROL });
  assert.ok(!('refused' in wrong));
  assert.equal(wrong.header.position, 7);
  assert.equal(wrong.verdict?.effective, true, 'run 1 accepts the self-asserted party');
  assert.equal(ctx.view(BOB, 7)[7]!.event, undefined, 'the actual offer author misses the counter');
  assert.ok(ctx.view(CAROL, 7)[7]!.event, 'the forged party receives it');
  const result = witness(checkContext(ctx, { invariants: saleInvariants, budget: readableBudget }), CAROL, 7, 'budget');
  assert.equal(result.detail, 'carol can read the sale.counter at 7, whose parties are alice+alice+bob');
});

for (const [seed, detail] of [
  [72, 'replacement at 4 of unknown stub o2'],
  [96, 'withdrawal at 4 of unknown stub none'],
  [172, 'replacement at 4 of unknown stub o10'],
] as const) {
  test(`tombstone regression: run-1 seed ${seed}, three steps ending at 4, ${detail}`, () => {
    const { entry, script } = corpus('run1', seed, run1Package);
    assert.equal(script.steps.length, 3);
    const { ctx } = replay(script);
    assert.equal(ctx.head, 4);
    assert.equal(ctx.verdictAt(4)?.effective, true);
    const result = witness(checkContext(ctx, { invariants: saleInvariants, budget: projectionBudget }), '*', 4, 'invariant');
    assert.equal(result.detail, detail);
    assert.equal(describeViolation(result), entry.expected);
    const repaired = replay({ ...script, base: saleBase(salePackage) });
    assert.equal(repaired.ctx.verdictAt(4)?.effective, false);
    assert.equal(repaired.ctx.verdictAt(4)?.perModel?.['sale']?.reason, 'no_such_offer');
    assert.deepEqual(checkContext(repaired.ctx, { invariants: saleInvariants, budget: readableBudget }), []);
  });
}

test('manifest-only regression: exact fd1e23b model leaves Bob@10 header-only while checker equality is clean', async () => {
  // Preserve exact historical bytes: rewriting relative imports would change
  // the descriptor's module fingerprint. Only the temporary layout is new.
  const historical = JSON.parse(readFileSync(new URL('../evidence/sale-fd1e23b.json', import.meta.url), 'utf8')) as {
    sourceCommit: string; sourceSha256: string; source: string; package: string;
    counterPayloadAt10: { offer_id: string; amount: number; seller: string };
  };
  assert.equal(historical.sourceCommit, 'fd1e23ba29e930f33860588fd530cd6135b14a42');
  assert.equal(digest(historical.source), historical.sourceSha256);
  const directory = mkdtempSync(join(tmpdir(), 'dap-t1-sale-baseline-'));
  try {
    mkdirSync(join(directory, 'fixtures'));
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    symlinkSync(fileURLToPath(new URL('../../src/', import.meta.url)), join(directory, 'src'), 'dir');
    const path = join(directory, 'fixtures/sale.ts');
    writeFileSync(path, historical.source);
    const { salePackage: baseline } = await import(pathToFileURL(path).href) as { salePackage: PackageDescriptor };
    assert.equal(baseline.id, historical.package);
    const steps = saleTraceSteps();
    const counter = steps[8]!;
    assert.ok(counter.type === 'act' && counter.kind === SALE + 'counter');
    counter.payload = historical.counterPayloadAt10;
    const { ctx } = replay({ base: saleBase(baseline), steps, joinDisclosure: false });
    assert.equal(ctx.head, 19);
    assert.equal(ctx.verdictAt(10)?.effective, true);
    assert.equal(ctx.view(BOB, 10)[10]!.event, undefined);
    assert.equal(saleTraceReadability[BOB]![10], 'r', 'the independent manifest requires delivery to Bob');
    assert.deepEqual(checkContext(ctx, { invariants: saleInvariants, budget: projectionBudget }), [], 'the original projection-only checker cannot detect under-delivery');
    assert.deepEqual(checkContext(ctx, { invariants: saleInvariants, budget: readableBudget }), [], 'the readable-events privacy budget also does not demand delivery');
    const repaired = replay({ base: saleBase(salePackage), steps: saleTraceSteps(), joinDisclosure: false });
    assert.ok(repaired.ctx.view(BOB, 10)[10]!.event, 'the repaired fixture preserves required delivery');
    for (const [participant, pattern] of Object.entries(saleTraceReadability)) {
      assert.equal(repaired.ctx.view(participant).map((row) => row.event ? 'r' : 'h').join(''), pattern, participant);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
