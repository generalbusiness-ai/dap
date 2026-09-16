import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildThrough, healthyOperations, keys, packages, principals, normalize, LifecycleWorld } from '../fixtures/ordering-lifecycle-runner.ts';
import { ScopeJournal } from '../src/scope.ts';
import { scopeDenyPackage } from './fixtures/scope-deny.ts';
import { K } from '../src/foundation.ts';
import { SCOPE_KINDS, scopeImplementationId } from '../src/scope-profile.ts';
import { bindingId } from '../src/descriptor.ts';
import { SQLiteBackend } from '../src/sqlite.ts';
import { signEvent } from '../src/codec.ts';
import { interpretView } from '../src/interpret.ts';
import { saleBase, saleTraceSteps } from '../manifests/sale.ts';
import { replay } from '../src/script.ts';

for (const storage of ['memory','sqlite'] as const) test('O4 scope exercise honors attached refusing handler: ' + storage, () => {
  const world = buildThrough('sale-accepted', {}, storage);
  const available = { ...packages,[scopeDenyPackage.id]:scopeDenyPackage };
  try {
    const old = world.contexts.S!; const priorBackend = old.journal.context.backend;
    const sequencing = old.journal.ordering; old.close();
    const backend = storage === 'sqlite' ? new SQLiteBackend(world.paths.S!, { writer:sequencing.initialWriter,profile:sequencing.profile }) : priorBackend;
    world.backends.S = backend;
    world.contexts.S = ScopeJournal.open({ backend,writerKey:keys.W0,packages:available });
    const stale = signEvent(world.contexts.S.journal.context.intent(principals.alice,SCOPE_KINDS.exercise,{ right:'R_fulfil' },{ action_id:'before-guard',nonce:'c'.repeat(32) }),keys.alice);
    const attach = world.emit('S','alice',K.attach,{ package:scopeDenyPackage.id,resolution:{ [SCOPE_KINDS.exercise]:{ handlers:['scope','qaGuard'] } } });
    assert.ok(!('refused' in attach)); assert.equal(attach.verdict?.effective,true);
    const result = world.exercise('S','alice','R_fulfil');
    assert.ok(!('refused' in result));
    assert.equal(result.verdict?.effective,false);
    assert.equal(result.verdict?.perModel?.qaGuard?.reason,'qa_guard_refusal');
    assert.equal(world.contexts.S.state.rights.R_fulfil?.status,'live');
    const staleResult = world.emit('S','alice','',{},stale); assert.ok(!('refused' in staleResult));
    assert.equal(staleResult.verdict?.effective,false); assert.equal(staleResult.verdict?.reason,'stale_binding');
    assert.equal(world.contexts.S.state.rights.R_fulfil?.status,'live');
    world.contexts.S.close();
    const reopened = storage === 'sqlite' ? new SQLiteBackend(world.paths.S!, { writer:sequencing.initialWriter,profile:sequencing.profile }) : backend;
    world.contexts.S = ScopeJournal.open({ backend:reopened,writerKey:keys.W0,packages:available });
    assert.deepEqual(world.contexts.S.state.verdicts[result.header.position],result.verdict);
    assert.equal(world.contexts.S.state.rights.R_fulfil?.status,'live');
  } finally { world.close(); }
});
test('O4 preserves original Sale 0–19 outcomes, model and member readability', () => {
  const original = replay({ base:saleBase(),steps:saleTraceSteps(),joinDisclosure:false }).ctx;
  const world = buildThrough('sale-closed');
  try {
    const signed = world.contexts.S!.journal.context;
    assert.deepEqual(signed.entries.map(e=>e.event.kind),original.entries.map(e=>e.event.kind));
    assert.deepEqual(signed.state.verdicts,original.state.verdicts);
    assert.deepEqual(normalize(signed.state.models.sale),original.state.models.sale);
    assert.deepEqual(normalize(signed.state.participants),original.state.participants);
    for (const reader of ['alice','bob','carol','ivan'] as const) {
      assert.deepEqual(signed.view(principals[reader]).map(e=>!!e.event),original.view(reader).map(e=>!!e.event));
    }
  } finally { world.close(); }
});
test('O4 later attach, handover and transfer preserve actual pre-attach as-of replay', () => {
  const world = new LifecycleWorld();
  let saved: unknown;
  try {
    for (const [name, operation] of healthyOperations) {
      operation(world);
      if (name==='before-attach') saved = world.contexts.S!.journal.context.view(principals.alice,10);
    }
    const current = world.contexts.S!.journal.context.view(principals.alice,10);
    assert.deepEqual(current,saved);
    const before = interpretView(principals.alice,saved as never,10,packages);
    const after = interpretView(principals.alice,current,10,packages);
    assert.deepEqual(after,before); assert.equal(after.kind,'interpreted');
    if (after.kind==='interpreted') { assert.equal(after.state.models.inspection,undefined); assert.equal(after.state.verdicts.length,11); }
  } finally { world.close(); }
});
