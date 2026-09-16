import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LifecycleWorld, healthyOperations, buildThrough, keys, packages, principals, type Name, type Person } from '../fixtures/ordering-lifecycle-runner.ts';
import { alternateRelease, laterProof } from '../fixtures/ordering-scope-faults.ts';
import { healthyLifecycle, lifecycleCases, type LifecycleAction } from '../manifests/ordering-lifecycle.ts';
import { envelopeBytes } from '../src/codec.ts';
import { ScopeJournal } from '../src/scope.ts';
import { SCOPE_KINDS } from '../src/scope-profile.ts';
import { K } from '../src/foundation.ts';
import { SQLiteBackend } from '../src/sqlite.ts';

function perform(world: LifecycleWorld, action: LifecycleAction): any {
  const input = action.input as Record<string, any>;
  const context = action.context!; const actor = action.actor as Person;
  switch (action.operation) {
    case 'start-exact-genesis': world.startDestination(); return { verdict: { effective: true } };
    case 'scope.activate': return world.activate(input.proofs.map((alias: string) => {
      const name = alias.startsWith('S-') ? 'S' : 'D';
      if (alias.endsWith('-valid-A')) return world.proof(name);
      if (alias.endsWith('-valid-B')) return laterProof(world, name);
      const actual = alternateRelease(world, alias);
      if (alias === 'S-ordered-but-unauthorized') assert.match(actual.producerRefusal!, /narrower audience/);
      return actual.proof;
    }));
    case 'restart': world.restart(context); return { unchanged: true };
    case 'exact-retry': return world.emit(context, actor, '', {}, world.envelopes.get(input.original.replace('@', '@'))!);
    case 'timeout-recovery-at-source': return world.emit(context, actor, SCOPE_KINDS.recover, input);
    case 'import-result': return world.importInspection();
    case 'import-export': return world.emit(context, actor, SCOPE_KINDS.importExport, { identity: world.exports.S!.identity });
    case 'submit-signed-source-proposal': return world.emit(context, actor, '', {}, world.pendingSourceProposal);
    case 'scope.release': return world.release(context as 'S' | 'D', actor, input.right ?? 'R_fulfil', input.proposedPrefix ? world.contexts.S!.export(['R_fulfil'], 22) : world.exports[context as 'S' | 'D']);
    case 'exercise-right': return world.exercise(context, actor, input.right);
    case 'adopt-origin-at-start': return { verdict: world.contexts.F!.state.verdicts[1] };
    case 'continue-from-nomination': {
      const source = world.contexts.S!; const profile = source.journal.ordering.profile;
      source.close();
      let reason: string | undefined;
      const candidateBackend = new SQLiteBackend(world.paths.S!, { profile, writer: principals.W0 });
      try { ScopeJournal.open({ backend: candidateBackend, writerKey: keys[actor], packages }); }
      catch (error) { reason = (error as Error).message; }
      finally { candidateBackend.close(); }
      // Named error translation only: no decision is inferred from test id.
      assert.match(reason!, /unassigned writer key/);
      world.contexts.S = ScopeJournal.open({ backend: new SQLiteBackend(world.paths.S!, { profile, writer: principals.W0 }), writerKey: keys.W0, packages });
      return { refused: true, reason: 'no_assignment', diagnostic: reason };
    }
    case 'continue-retired-writer': {
      world.restart('S', 'W0'); const result = world.continueWriter(); world.restart('S', 'W1');
      assert.ok('refused' in result); assert.equal(result.reason, 'retired_writer');
      return { ...result, diagnostic: result.reason, reason: 'retired_assignment' };
    }
    default: throw new Error('unimplemented actual operation: ' + action.operation);
  }
}
function outcome(result: any): { verdict: string; reason: string | null } {
  if (result.refused) return { verdict: 'refused', reason: result.reason };
  if (result.replay) return { verdict: 'unchanged', reason: 'original_receipt' };
  if (result.unchanged) return { verdict: 'unchanged', reason: null };
  return { verdict: result.verdict?.effective ? 'effective' : 'ineffective', reason: result.verdict?.reason ?? null };
}
test('O4 actual signed lifecycle matches all 20 predeclared boundaries', () => {
  const world = new LifecycleWorld();
  try {
    assert.equal(healthyOperations.length, healthyLifecycle.length);
    for (const [index, [id, operation]] of healthyOperations.entries()) {
      assert.equal(id, healthyLifecycle[index]!.id);
      operation(world);
      assert.deepEqual(world.snapshot(), healthyLifecycle[index]!.expected, id);
    }
  } finally { world.close(); }
});
for (const scenario of lifecycleCases) test('O4 actual adverse trace: ' + scenario.id, () => {
  const variant = scenario.variant as Record<string, any> | undefined;
  const world = buildThrough(scenario.from, { deliveryBuyer: variant?.deliveryBuyer, originExercise: !!variant?.destinationOrigins });
  try {
    if (scenario.initial) assert.deepEqual(world.snapshot(), scenario.initial);
    for (const step of scenario.steps) {
      const actual = perform(world, step.action);
      assert.deepEqual(outcome(actual), { verdict: step.verdict, reason: step.reason }, JSON.stringify(actual));
      assert.deepEqual(world.snapshot(), step.expected, scenario.id + ':' + step.action.operation);
    }
  } finally { world.close(); }
});
