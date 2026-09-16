import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildThrough, keys, packages, principals, type LifecycleWorld } from '../fixtures/ordering-lifecycle-runner.ts';
import { recordScope } from '../fixtures/ordering-scope-records.ts';
import { ScopeJournal } from '../src/scope.ts';
import { CAP, K } from '../src/foundation.ts';
import { SCOPE_KINDS } from '../src/scope-profile.ts';
import { envelopeBytes, signEvent, type ActorEnvelope } from '../src/codec.ts';
import { SQLiteBackend } from '../src/sqlite.ts';
import { salePackage } from '../fixtures/sale.ts';

function accepted(result: ReturnType<ScopeJournal['submit']>) { assert.ok(!('refused' in result),JSON.stringify(result)); return result; }
function dormant(world: LifecycleWorld) { assert.equal(world.contexts.F!.state.active,false); assert.ok(Object.values(world.contexts.F!.state.rights).every(right=>right!.status==='dormant')); }
function retry(world: LifecycleWorld, envelope: ActorEnvelope, original: ReturnType<typeof accepted>) {
  const before=world.contexts.F!.journal.context.head;
  const result=accepted(world.emit('F','alice','',{},envelope));
  assert.equal(result.replay,true); assert.equal(result.headerHash,original.headerHash);
  assert.deepEqual(result.verdict,original.verdict); assert.equal(world.contexts.F!.journal.context.head,before);
  return result;
}
for (const storage of ['memory','sqlite'] as const) test('O4 G2 failed activation, dormant exercise and exact retries permit later activation: '+storage,()=>{
  const world=buildThrough('destination-started',{},storage);
  try {
    const first=accepted(world.activate([world.proof('S')])); assert.equal(first.verdict?.reason,'missing_release'); dormant(world);
    const firstEnvelope=world.envelopes.get('F@1')!;
    retry(world,firstEnvelope,first);
    const exercise=accepted(world.exercise('F','alice','R_fulfil')); assert.equal(exercise.verdict?.reason,'dormant_right'); dormant(world);
    retry(world,firstEnvelope,first);
    const success=accepted(world.activate()); assert.equal(success.header.position,3); assert.equal(success.verdict?.effective,true);
    retry(world,world.envelopes.get('F@3')!,success); retry(world,firstEnvelope,first);
    assert.equal(world.contexts.F!.state.activations,1);
    recordScope('g2-intervening-exercise-'+storage,{first,exercise,success,final:world.snapshot()});
  } finally {world.close();}
});
for (const storage of ['memory','sqlite'] as const) test('O4 G2 another participant admitted event cannot block activation: '+storage,()=>{
  const world=buildThrough('destination-started',{},storage);
  try {
    const observation=accepted(world.emit('F','bob',K.observe,{fact:{note:'waiting'}}));
    assert.equal(observation.header.position,1); assert.equal(observation.verdict?.reason,'unauthorized'); dormant(world);
    const success=accepted(world.activate()); assert.equal(success.header.position,2); assert.equal(success.verdict?.effective,true);
    recordScope('g2-participant-event-'+storage,{observation,success,final:world.snapshot()});
  } finally {world.close();}
});
for (const storage of ['memory','sqlite'] as const) for (const gate of ['authorization','closed'] as const) test('O4 G2 keeps current '+gate+' gate: '+storage,()=>{
  const world=buildThrough('destination-described',{},storage);
  try {
    const body=structuredClone(world.destination!.body);
    const payload=body.payload as {grants:{principal:string;capabilities:string[]}[]};
    payload.grants.find(grant=>grant.principal===principals.alice)!.capabilities.push(CAP.grant,CAP.close);
    world.destination=signEvent(body,keys.alice);
    world.release('S');world.release('D');world.startDestination();
    const action=gate==='closed'?world.emit('F','alice',K.close,{}):world.emit('F','alice',K.revoke,{principal:principals.alice,capabilities:[K.scope_activate]});
    assert.equal(accepted(action).verdict?.effective,true);
    const result=accepted(world.activate());assert.equal(result.verdict?.reason,gate==='closed'?'closed':'unauthorized');dormant(world);
    recordScope('g2-current-'+gate+'-'+storage,{action,result,final:world.snapshot()});
  } finally {world.close();}
});
for (const storage of ['memory','sqlite'] as const) test('O4 unexpected post-commit replay error is thrown and disables facade: '+storage,()=>{
  const world=buildThrough('destination-started',{},storage);
  try {
    const original=world.contexts.F!;const backend=original.journal.context.backend;const ordering=original.journal.ordering;original.close();
    const active=storage==='sqlite'?new SQLiteBackend(world.paths.F!,{writer:ordering.initialWriter,profile:ordering.profile}):backend;
    const failure=new Error('ineffective_release'); // A programmer error cannot masquerade as a known reason by matching its text.
    let broken=true;
    const registry=new Proxy({...packages},{get(target,key,receiver){if(broken&&key===salePackage.id)throw failure;return Reflect.get(target,key,receiver);}});
    const scope=ScopeJournal.open({backend:active,writerKey:keys.WF,packages:registry});world.contexts.F=scope;world.backends.F=active;
    const envelope=signEvent(scope.journal.context.intent(principals.alice,K.scope_activate,{proofs:[world.proof('S'),world.proof('D')] as never},{action_id:'post-commit-error',nonce:'b'.repeat(32)}),keys.alice);
    const bytes=envelopeBytes(envelope);const credential=scope.journal.context.credentialFor(principals.alice);
    assert.throws(()=>scope.submit(bytes,credential),error=>error===failure);
    assert.throws(()=>scope.submit(bytes,credential),/closed|unavailable|reopen|inactive/);
    assert.throws(()=>scope.journal.context.submit(envelope.body,credential,envelope),/closed|inactive/);
    broken=false;
    const reopened=storage==='sqlite'?new SQLiteBackend(world.paths.F!,{writer:ordering.initialWriter,profile:ordering.profile}):active;
    const cold=ScopeJournal.open({backend:reopened,writerKey:keys.WF,packages});world.contexts.F=cold;world.backends.F=reopened;
    assert.equal(cold.journal.context.head,1);assert.equal(cold.journal.context.entries[1]!.committed,bytes);
    const recovered=accepted(cold.submit(bytes,credential));assert.equal(recovered.replay,true);assert.equal(recovered.verdict?.effective,true);
    assert.equal(cold.journal.context.head,1);assert.equal(cold.state.activations,1);
    recordScope('unexpected-replay-error-'+storage,{failure:failure.message,committed:bytes,recovered,final:world.snapshot()});
  } finally {world.close();}
});
for (const storage of ['memory','sqlite'] as const) test('O4 malformed release-proof shape has an explicit policy refusal: '+storage,()=>{
  const world=buildThrough('destination-started',{},storage);
  try {
    const result=accepted(world.emit('F','alice',K.scope_activate,{proofs:[null]}));
    assert.equal(result.verdict?.effective,false);assert.match(result.verdict!.reason!,/^malformed/);dormant(world);
  } finally {world.close();}
});

import { scopeThrowPackage } from './fixtures/scope-throw.ts';
for (const storage of ['memory','sqlite'] as const) for (const failure of ['fold','audience'] as const) test('O4 thrown '+failure+' handler is a real failure with durable bytes: '+storage,()=>{
  const world=buildThrough('sale-accepted',{},storage);
  const registry={...packages,[scopeThrowPackage.id]:scopeThrowPackage};
  try {
    const original=world.contexts.S!;const backend=original.journal.context.backend;const ordering=original.journal.ordering;original.close();
    const active=storage==='sqlite'?new SQLiteBackend(world.paths.S!,{writer:ordering.initialWriter,profile:ordering.profile}):backend;
    const scope=ScopeJournal.open({backend:active,writerKey:keys.W0,packages:registry});world.contexts.S=scope;world.backends.S=active;
    assert.equal(accepted(world.emit('S','alice',K.attach,{package:scopeThrowPackage.id,resolution:{[SCOPE_KINDS.exercise]:{handlers:['scope','qaFault']}}})).verdict?.effective,true);
    const envelope=signEvent(scope.journal.context.intent(principals.alice,SCOPE_KINDS.exercise,{right:'R_fulfil',failure},{action_id:'handler-failure',nonce:'d'.repeat(32)}),keys.alice);
    const bytes=envelopeBytes(envelope);const credential=scope.journal.context.credentialFor(principals.alice);
    const expected=failure==='fold'?/handler failure at 19: fold_error:qa_handler_exception/:/handler failure at 19: audience_error:qa_audience_exception/;
    assert.throws(()=>scope.submit(bytes,credential),expected);
    assert.throws(()=>scope.submit(bytes,credential),/unavailable/);
    assert.throws(()=>scope.journal.context.submit(envelope.body,credential,envelope),/closed|inactive/);
    const reopened=storage==='sqlite'?new SQLiteBackend(world.paths.S!,{writer:ordering.initialWriter,profile:ordering.profile}):active;
    const cold=ScopeJournal.open({backend:reopened,writerKey:keys.W0,packages:registry});world.contexts.S=cold;world.backends.S=reopened;
    assert.equal(cold.journal.context.head,19);assert.equal(cold.journal.context.entries[19]!.committed,bytes);
    const baseVerdict=cold.journal.context.state.verdicts[19];
    assert.throws(()=>cold.submit(bytes,credential),expected);
    recordScope('unexpected-'+failure+'-handler-'+storage,{committed:bytes,baseVerdict,reopenedHead:19,error:String(expected)});
  } finally {world.close();}
});
