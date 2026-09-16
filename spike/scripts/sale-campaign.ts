// The Sale campaign over the manifest's seeds, grouped by failure
// signature: what the ledger cites for each checker run.
//   node scripts/sale-campaign.ts [seeds]
import { checkContext, describeViolation } from '../src/checker.ts';
import { generate } from '../src/generate.ts';
import { replay } from '../src/script.ts';
import { salePackage } from '../fixtures/sale.ts';
import { ALICE, SALE_MANIFEST_ID, saleBounds, saleBudgetViolations, saleGeneratorSpec, saleInvariants } from '../manifests/sale.ts';

const limit = process.argv[2] ? Number(process.argv[2]) : saleBounds.seeds.length;
const seeds = saleBounds.seeds.slice(0, limit);
const started = Date.now();
const sigs = new Map<string, { seeds: number[]; example: string }>();
const failing: number[] = [];
for (const seed of seeds) {
  const { ctx } = replay(generate(saleGeneratorSpec(salePackage), seed));
  const vs = checkContext(ctx, { invariants: saleInvariants, budget: (o, p) => saleBudgetViolations(o, p, ALICE) });
  if (!vs.length) continue;
  failing.push(seed);
  const seen = new Set<string>();
  for (const v of vs) {
    const d = describeViolation(v);
    const sig = v.kind + ': ' + d.replace(/^[a-z*]+@\d+ [a-z_]+: /, '').replace(/\d+/g, 'N');
    if (seen.has(sig)) continue;
    seen.add(sig);
    const e = sigs.get(sig) ?? { seeds: [], example: `seed ${seed}: ${d}` };
    e.seeds.push(seed);
    sigs.set(sig, e);
  }
}
console.log(`manifest ${SALE_MANIFEST_ID}\npackage ${salePackage.id}\nfailing seeds ${failing.length}/${seeds.length} [${failing.join(', ')}] in ${Date.now() - started} ms`);
for (const [sig, e] of [...sigs].sort((a, b) => b[1].seeds.length - a[1].seeds.length)) console.log(`\n[${e.seeds.length} seeds] ${sig}\n  e.g. ${e.example}`);
