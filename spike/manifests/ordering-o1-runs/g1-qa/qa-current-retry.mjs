import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryBackend } from './src/append.ts';
import { Context } from './src/context.ts';
import { K } from './src/foundation.ts';
import { SQLiteBackend } from './src/sqlite.ts';
import { Journal, O1_PROFILE_VERSION } from './src/journal.ts';
import { verifyEnvelope, envelopeId, envelopeBytes, signHeader, signEvent } from './src/codec.ts';
import { createJournal, keys, people, packages } from './test/fixtures/o1-fixture.ts';
const encoding={prepare(event,proof){const e=verifyEnvelope(proof);return{id:envelopeId(e),actorSig:e.sig,committed:envelopeBytes(e)};},sign:h=>signHeader(h,keys.writer)};
const results=[];
for(const storage of ['memory','sqlite']){
 const path=join(mkdtempSync(join(tmpdir(),'dap-g1-retry-')),'journal.db');
 const sqlite=()=>new SQLiteBackend(path,{writer:people.writer,profile:O1_PROFILE_VERSION});
 let backend=storage==='memory'?new MemoryBackend():sqlite();
 createJournal(backend).close(); if(storage==='sqlite')backend=sqlite();
 const raw=Context.restore(backend,packages,65536,encoding);
 const event=raw.intent(people.alice,K.observe,{fact:{qa:'current'}},{action_id:'qa-current',nonce:'d1'.repeat(16)});
 const signed=signEvent(event,keys.alice);
 const first=raw.submit(event,raw.credentialFor(people.alice),signed);
 assert.ok(!first.refused && !first.replay);
 const before=backend.entries(),pending=storage==='sqlite'?backend.pending():null;
 let headReads=0,inside=0,track=true;
 const head=backend.head.bind(backend),serialized=backend.serialized.bind(backend);
 backend.head=()=>{if(track){headReads++;assert.ok(inside>0,'head freshness check outside serialization');}return head();};
 backend.serialized=fn=>serialized(()=>{inside++;try{return fn();}finally{inside--;}});
 const retry=raw.submit(event,undefined,signed);
 track=false;
 assert.equal(headReads,1);
 assert.ok(retry.replay);assert.equal(retry.headerHash,first.headerHash);
 assert.deepEqual(backend.entries(),before);
 if(storage==='sqlite')assert.deepEqual(backend.pending(),pending);
 const nextEvent=raw.intent(people.alice,K.observe,{fact:{qa:'next'}},{action_id:'qa-next',nonce:'d2'.repeat(16)});
 const next=raw.submit(nextEvent,raw.credentialFor(people.alice),signEvent(nextEvent,keys.alice));
 assert.ok(!next.refused&&!next.replay);assert.equal(next.header.position,first.header.position+1);
 // Signed raw compatibility path leaves a fully authentic journal for cold open.
 if(storage==='sqlite'){backend.close();backend=sqlite();}
 const cold=Journal.open({backend,writerKey:keys.writer,packages});
 assert.equal(cold.context.head,next.header.position);
 const coldRetry=cold.submit(signed);assert.ok(coldRetry.replay);assert.equal(coldRetry.headerHash,first.headerHash);
 results.push({storage,first:first.header.position,next:next.header.position,retryHash:retry.headerHash,headReadsOnCurrentRetry:headReads,insideSerialization:true,coldRetrySame:true});
 cold.close();
}
console.log(JSON.stringify({source:'10fa069b2e4b4089cbdaf7f577da0feb8db5f3c5',results},null,2));
