// Reduction of the first candidate's shared private-reader policy defect.
// The checker, manifest and foundation are unchanged.
import { writeFileSync } from 'node:fs';
import { sale } from '../declarations/sale.ts';
import { checkDeclaration } from '../compiler.ts';
import { salePackage, derivedBudget } from '../generated/sale.ts';
import { saleBase, saleBudgetViolations, saleInvariants, ALICE } from '../../manifests/sale.ts';
import { checkContext, describeViolation } from '../../src/checker.ts';
import { replay, type Step } from '../../src/script.ts';
const steps: Step[] = [
  { type: 'invite', inviter: 'alice', invitee: 'bob', grants: { roles: ['Buyer'] } },
  { type: 'accept', invitee: 'bob' },
  { type: 'invite', inviter: 'alice', invitee: 'carol', grants: { roles: ['Buyer'] } },
  { type: 'accept', invitee: 'carol' },
  { type: 'act', actor: 'bob', kind: 'com.example.sale.offer', payload: { offer_id: 'o1' } },
  { type: 'act', actor: 'carol', kind: 'com.example.sale.offer_terms', payload: { offer_id: 'o1', amount: 777, seller: 'alice' } },
];
const { ctx } = replay({ base: saleBase(salePackage), steps });
const checks = checkContext(ctx, { invariants: saleInvariants, budget: (obs, p, _n, view) => saleBudgetViolations(obs, p, ALICE, view) });
const ownBudget = checkContext(ctx, { budget: derivedBudget });
const result = { candidate: '22444f85', package: salePackage.id, sourceId: (salePackage.models.sale!.config as any).sourceId, checkerDiagnostics: checkDeclaration(sale), steps, verdict: ctx.state.verdicts[7], readership: Object.fromEntries(['alice', 'bob', 'carol'].map((p) => [p, Boolean(ctx.view(p)[7]!.event)])), violations: checks.map(describeViolation), derivedBudgetViolations: ownBudget.map(describeViolation) };
writeFileSync(new URL('./stop-witness.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
