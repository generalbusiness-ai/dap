// Optional measurement sink. It records observations, never supplies an oracle.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalize } from '../src/codec.ts';
import { scopeImplementationId } from '../src/scope-profile.ts';
import { PUBLIC_PROOF_RULE_ID } from '../src/scope-proof.ts';
import { packages, type LifecycleWorld } from './ordering-lifecycle-runner.ts';
export function recordScope(name: string, observation: unknown): void {
  const root = process.env.DAP_O4_RECORD_DIR;
  if (!root) return;
  mkdirSync(root,{ recursive:true });
  // API diagnostics may contain optional undefined fields; retain them as a
  // named JSON marker without relaxing the signed codec or dropping evidence.
  const diagnostic = JSON.parse(JSON.stringify(observation, (_key, value) => value === undefined ? { $undefined: true } : value));
  writeFileSync(join(root,name + '.json'),canonicalize({ implementation:scopeImplementationId(),publicProofRule:PUBLIC_PROOF_RULE_ID,packages:Object.keys(packages).sort(),diagnosticEncoding:'undefined is {$undefined:true}',observation:diagnostic }) + '\n');
}
export function recordedIdentities(world: LifecycleWorld) {
  return Object.fromEntries(Object.entries(world.contexts).map(([name,scope])=>[name,{ genesis:scope!.journal.context.genesisId,initialWriter:scope!.journal.ordering.initialWriter,head:scope!.journal.context.head,headHash:scope!.journal.context.entries.at(-1)!.headerHash }]));
}
