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

// Goal 1's complete matrix uses actual replay results, not the manifest's
// literal projection maps. Historical client/full disagreements are preserved:
// this checks that later events do not rewrite either earlier interpretation.
import type { Audience } from '../src/types.ts';
import type { Context } from '../src/context.ts';
import { foldPrefix } from '../src/oracle.ts';
import { observe, type Observation } from '../src/observe.ts';
import { verifyJournalView } from '../src/journal.ts';
import { recordScope } from '../fixtures/ordering-scope-records.ts';

function historicalSourceQuestion(context: Context, reader: string, frontier: number) {
  const view = context.view(reader,frontier);
  const full = foldPrefix(context,frontier);
  const client = interpretView(reader,view,frontier,context.packages);
  assert.equal(client.kind,'interpreted',`${reader}@${frontier} must be interpretable`);
  if (client.kind !== 'interpreted') throw new Error('unresolved historical source');
  const visible = (position: number) => !!view[position]?.event;
  return {
    reader,frontier,basis:frontier,
    view,
    fullSource:{
      eventIds:context.entries.slice(0,frontier + 1).map(entry=>entry.id),
      verdicts:full.verdicts,audiences:full.audiences,participants:full.participants,
      sale:full.models.sale,
    },
    fullProjection:observe(full,reader,frontier,visible),
    clientOutcomes:client.outcomes,
    clientProjection:observe(client.state,reader,frontier,visible),
  };
}
function normalizedAudiences(audiences: Audience[]): Audience[] {
  return normalize(audiences).map((audience: Audience) => audience.kind === 'named' ? { ...audience,principals:[...audience.principals].sort() } : audience);
}
function saleProjection(observation: Observation) {
  return { participants:observation.participants,closed:observation.closed,models:{ sale:observation.models.sale },outcomes:observation.outcomes };
}
for (const storage of ['memory','sqlite'] as const) test('O4 goal 1: all actual readers and historical frontiers survive attach, handover and completed transfer: ' + storage, () => {
  const original = replay({ base:saleBase(),steps:saleTraceSteps(),joinDisclosure:false }).ctx;
  const world = new LifecycleWorld({},storage);
  // Capture all fixture principals before future memberships are known. After
  // completion, the actual source/destination participant union selects readers.
  const candidates = Object.values(principals);
  const prefix = new Map<string,ReturnType<typeof historicalSourceQuestion>>();
  const sale = new Map<string,ReturnType<typeof historicalSourceQuestion>>();
  const captured = (map: typeof prefix, through: number) => {
    for (const reader of candidates) for (let frontier = 0; frontier <= through; frontier++) {
      map.set(`${reader}@${frontier}`,historicalSourceQuestion(world.contexts.S!.journal.context,reader,frontier));
    }
  };
  const acrossAttach: string[] = [];
  try {
    for (const [name,operation] of healthyOperations) {
      operation(world);
      if (name === 'before-attach') captured(prefix,10);
      if (name === 'inspection-attached') {
        for (const [key,before] of prefix) {
          assert.deepEqual(historicalSourceQuestion(world.contexts.S!.journal.context,before.reader,before.frontier),before,'immediately across attach: ' + key);
          acrossAttach.push(key);
        }
      }
      if (name === 'sale-closed') captured(sale,19);
    }
    const source = world.contexts.S!;
    assert.equal(source.journal.context.head,24);
    assert.equal(source.journal.ordering.writer,principals.W1);
    assert.equal(world.contexts.F!.journal.context.head,3);
    assert.equal(world.contexts.F!.state.fulfilled,true);
    assert.equal(world.contexts.F!.state.delivered,true);
    const readers = [...new Set([...source.journal.context.state.participants,...world.contexts.F!.journal.context.state.participants])];
    // Also prove the fixture really exercised all four original Sale readers
    // and the later destination participant who never joined S.
    assert.deepEqual(new Set(readers),new Set([...original.state.participants.map(name=>principals[name as keyof typeof principals]),principals.kim]));
    assert.equal(source.journal.context.state.participants.includes(principals.kim),false);
    const matrix: unknown[] = [];
    for (const reader of readers) for (let frontier = 0; frontier <= 19; frontier++) {
      const key = `${reader}@${frontier}`;
      const after = historicalSourceQuestion(source.journal.context,reader,frontier);
      verifyJournalView(after.view,{ genesis:source.journal.context.genesisId,writer:principals.W0 });
      assert.deepEqual(after,sale.get(key),'after completed transfer: ' + key);
      if (frontier <= 10) {
        assert.ok(acrossAttach.includes(key));
        assert.deepEqual(after,prefix.get(key),'pre-attach matrix after completed transfer: ' + key);
      }
      const alias = normalize(reader);
      const old = historicalSourceQuestion(original,alias,frontier);
      assert.deepEqual(normalize(after.fullSource.verdicts),old.fullSource.verdicts,'original full-source outcomes: ' + key);
      assert.deepEqual(normalizedAudiences(after.fullSource.audiences),normalizedAudiences(old.fullSource.audiences),'original audiences: ' + key);
      assert.deepEqual(normalize(after.fullSource.sale),old.fullSource.sale,'original full Sale fold: ' + key);
      assert.deepEqual(normalize(saleProjection(after.fullProjection)),saleProjection(old.fullProjection),'original full Sale projection: ' + key);
      assert.deepEqual(normalize(after.clientOutcomes),old.clientOutcomes,'original client outcomes: ' + key);
      assert.deepEqual(normalize(saleProjection(after.clientProjection)),saleProjection(old.clientProjection),'original client Sale projection: ' + key);
      assert.deepEqual(after.view.map(entry=>!!entry.event),old.view.map(entry=>!!entry.event),'original readability: ' + key);
      matrix.push({ reader:alias,frontier,basis:frontier,before:normalize(sale.get(key)),after:normalize(after),original:{ fullProjection:saleProjection(old.fullProjection),clientProjection:saleProjection(old.clientProjection),clientOutcomes:old.clientOutcomes } });
    }
    recordScope('goal-1-history-matrix-' + storage,{
      actualReaders:normalize(readers),sourceGenesis:source.journal.context.genesisId,
      completedHeads:{ S:source.journal.context.head,F:world.contexts.F!.journal.context.head },
      immediatelyAcrossAttachQuestions:acrossAttach.length,
      actualReaderPreAttachQuestions:readers.length * 11,
      completedTransferHistoricalQuestions:readers.length * 20,
      compared:'actual identities, full verdicts/audiences, signed views, client outcomes and original Sale projections at matching original bases',
      matrix,
    });
  } finally { world.close(); }
});
