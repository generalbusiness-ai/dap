// Shrink the failing series of a Sale checker run to deletion-minimal
// scripts and save them to the corpus (spike plan §4.4: every failing
// series is shrunk and committed).
//   MANIFEST=<manifest id of the run> node scripts/sale-shrink.ts <run-name> <model-module> [seeds...]
// The model module exports `salePackage`; the run's manifest semantics
// are the current manifest's invariants and, for run 1, the projection
// budget only (the readable-events budget did not exist then). MANIFEST
// records the manifest revision the run used (default: the current one).
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { checkContext, describeViolation, type Violation } from '../src/checker.ts';
import { writeCorpus, serializeSteps } from '../src/corpus.ts';
import { generate } from '../src/generate.ts';
import { replay, shrink, type Script } from '../src/script.ts';
import { ALICE, SALE_MANIFEST_ID, saleBounds, saleBudgetViolations, saleGeneratorSpec, saleInvariants } from '../manifests/sale.ts';

const [runName, modelModule, ...seedArgs] = process.argv.slice(2);
if (!runName || !modelModule) throw new Error('usage: node scripts/sale-shrink.ts <run-name> <model-module> [seeds...]');
const { salePackage } = (await import(modelModule.startsWith('.') ? join(process.cwd(), modelModule) : modelModule)) as { salePackage: import('../src/descriptor.ts').PackageDescriptor };
const readable = runName !== 'run1';
const violations = (s: Script): Violation[] =>
  checkContext(replay(s).ctx, { invariants: saleInvariants, budget: (o, p, _n, view) => saleBudgetViolations(o, p, ALICE, readable ? view : []) });
const fails = (s: Script) => violations(s).length > 0;
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'corpus', 'sale', runName);
const seeds = seedArgs.length ? seedArgs.map(Number) : saleBounds.seeds;
const spec = saleGeneratorSpec(salePackage);
let saved = 0;
for (const seed of seeds) {
  const script = generate(spec, seed);
  const before = violations(script);
  if (!before.length) continue;
  const started = Date.now();
  const minimal = shrink(script, fails);
  const after = violations(minimal);
  writeCorpus(dir, `seed-${seed}`, {
    seed,
    manifest: process.env['MANIFEST'] ?? SALE_MANIFEST_ID,
    package: salePackage.id,
    snapshot: runName,
    expected: describeViolation(after[0]!),
    steps: serializeSteps(minimal.steps),
  });
  saved++;
  console.log(`seed ${seed}: ${script.steps.length} steps -> ${minimal.steps.length}, ${Date.now() - started} ms: ${describeViolation(after[0]!)}`);
}
console.log(`saved ${saved} shrunk series under corpus/sale/${runName}`);
