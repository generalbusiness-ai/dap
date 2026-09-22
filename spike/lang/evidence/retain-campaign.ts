// Evidence-only extraction after the completed, failed frozen campaign.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { salePackage } from '../generated/sale.ts';
import { checkContext, describeViolation } from '../../src/checker.ts';
import { serializeSteps } from '../../src/corpus.ts';
import { generate } from '../../src/generate.ts';
import { replay } from '../../src/script.ts';
import { ALICE, SALE_MANIFEST_ID, saleBudgetViolations, saleGeneratorSpec, saleInvariants } from '../../manifests/sale.ts';
mkdirSync(new URL('./sale-campaign/', import.meta.url), { recursive: true });
const summary = [];
for (const seed of [35, 56, 105, 110, 135]) {
  const script = generate(saleGeneratorSpec(salePackage), seed);
  const { ctx } = replay(script);
  const findings = checkContext(ctx, { invariants: saleInvariants, budget: (o, p, _n, v) => saleBudgetViolations(o, p, ALICE, v) });
  assert.ok(findings.length > 0);
  const entry = { seed, manifest: SALE_MANIFEST_ID, package: salePackage.id, snapshot: '22444f8536a8932fc758d77bb614a1424635fec3', baseNonce: script.base.nonce, expected: describeViolation(findings[0]!), steps: serializeSteps(script.steps), findings: findings.map(describeViolation), entries: ctx.head + 1 };
  writeFileSync(new URL('./sale-campaign/seed-' + seed + '.json', import.meta.url), JSON.stringify(entry, null, 2) + '\n');
  summary.push({ seed, entries: entry.entries, violations: findings.length, classes: [...new Set(findings.map((v) => v.kind))], first: entry.expected });
}
writeFileSync(new URL('./sale-campaign/summary.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
