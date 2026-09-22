// Replay the complete failing series retained after the stop; no regeneration.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { salePackage } from '../generated/sale.ts';
import { checkContext, describeViolation } from '../../src/checker.ts';
import { toScript, type CorpusEntry } from '../../src/corpus.ts';
import { replay } from '../../src/script.ts';
import { ALICE, SALE_MANIFEST_ID, saleBase, saleBudgetViolations, saleInvariants, sidePackage } from '../../manifests/sale.ts';
for (const seed of [35, 56, 105, 110, 135]) test('retained candidate campaign failure seed ' + seed, () => {
  const entry = JSON.parse(readFileSync(new URL('../evidence/sale-campaign/seed-' + seed + '.json', import.meta.url), 'utf8')) as CorpusEntry & { baseNonce: string; findings: string[] };
  assert.equal(entry.package, salePackage.id);
  assert.equal(entry.manifest, SALE_MANIFEST_ID);
  const { ctx } = replay(toScript(entry, { ...saleBase(salePackage), nonce: entry.baseNonce }, { [sidePackage.name]: sidePackage }));
  const findings = checkContext(ctx, { invariants: saleInvariants, budget: (o, p, _n, v) => saleBudgetViolations(o, p, ALICE, v) });
  assert.deepEqual(findings.map(describeViolation), entry.findings);
  assert.ok(findings.every((v) => v.kind === 'budget'));
});
