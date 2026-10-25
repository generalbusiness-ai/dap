import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import nodeReporter, { summarize, formatSummary } from './test-summary.mjs';

const stages = [{name:'plain',status:'passed',wallMs:5,userMs:null,systemMs:null}];
test('timing reconciles actual identities, missing callbacks and concurrent duration labels', () => {
  const row = {version:1,runner:'vitest',phase:'plain',record:'case',project:'bytes',file:'/a.test.ts',id:'a',name:'same name',state:'passed',durationMs:0,source:'result'};
  const end = {version:1,runner:'vitest',phase:'plain',record:'end',reason:'passed',unhandledErrors:0};
  const observations = [end,row,{...row,source:'final'},{...row,id:'b',file:'/b.test.ts',durationMs:12,source:'final'},
    {...row,id:'unknown-duration',durationMs:null,source:'final'},
    {version:1,runner:'vitest',phase:'plain',record:'module',source:'final',project:'bytes',file:'/a.test.ts',state:'passed',durationMs:0},
    {version:1,runner:'vitest',phase:'plain',record:'module',source:'final',project:'bytes',file:'/b.test.ts',state:'failed',durationMs:null}];
  const summary = summarize({stages,observations});
  assert.equal(summary.cases.length,3); assert.equal(summary.top.length,2); assert.equal(summary.top[1].durationMs,0);
  assert.equal(summary.projects.find(row=>row.project==='bytes').status,'partial');
  assert.equal(summary.projects.find(row=>row.project==='scope').status,'unreached');
  assert.match(formatSummary(summary),/not wall time or CPU/); assert.match(formatSummary(summary),/user unknown/);
  assert.equal(summarize({stages,observations:[end,row,{...row,source:'final',state:'failed'}]}).issues.length,1);
  assert.match(formatSummary(summarize({stages:[],observations:[]})),/No observed cases/);
  const knownModule = {version:1,runner:'vitest',phase:'plain',record:'module',source:'final',project:'bytes',file:'/a.test.ts',state:'passed',durationMs:0};
  const truncated = summarize({stages,observations:[row,knownModule]});
  assert(truncated.issues.some(issue=>issue.includes('terminal reporting')));
  assert.equal(truncated.projects.find(row=>row.project==='bytes').status,'partial');
  const failed = summarize({stages:[{name:'plain',status:'failed'}],observations:[row,knownModule,{...end,reason:'failed'}]});
  assert.equal(failed.projects.find(row=>row.project==='bytes').status,'partial');assert.equal(failed.issues.length,0);
  assert(summarize({stages,observations:[row,{...end,unhandledErrors:1}]}).issues.length>0);
  assert(summarize({stages:[{name:'node',status:'passed'}],observations:[{record:'node-event',phase:'node',event:'test:summary',success:false}]}).issues.length>0);
});

test('Node public events retain duplicates, classify suites separately and map actual generated sources', async () => {
  const prior = process.env.ARTROOM_TEST_PHASE;process.env.ARTROOM_TEST_PHASE='counting';
  try {
    const location={entryFile:'/generated.test.mjs',file:'/generated.test.mjs',nesting:0};
    const events=[{type:'test:enqueue',data:{...location,testId:1,name:'suite',type:'suite'}},
      {type:'test:pass',data:{...location,testId:1,name:'suite',details:{type:'suite',duration_ms:100}}},
      ...[2,3].flatMap(testId=>[{type:'test:enqueue',data:{...location,testId,name:'duplicate',type:'test'}},
        {type:'test:complete',data:{...location,testId,name:'duplicate',details:{passed:true,duration_ms:testId}}},
        {type:'test:pass',data:{...location,testId,name:'duplicate',details:{duration_ms:testId}}}]),
      {type:'test:fail',data:{file:'/loader.mjs',name:'load failure',details:{duration_ms:1,error:new Error('not copied')}}},
      {type:'test:interrupted',data:{tests:[{...location,testId:4,name:'unfinished'}]}},
      {type:'test:summary',data:{success:false,duration_ms:110,counts:{tests:3,suites:1,passed:2}}}];
    const observations=[];for await(const line of nodeReporter(events)) observations.push(JSON.parse(line));
    const summary=summarize({stages:[{name:'counting',status:'failed'}],observations,mappings:[{generated:'/generated.test.mjs',source:'/real.test.ts'}]});
    assert.equal(summary.cases.length,2);assert.equal(summary.top.length,2);assert.equal(summary.top[0].mappedSource,'/real.test.ts');
    assert(summary.unknown.length>0);assert.equal(summary.nodeSummaries[0].success,false);
    assert(!JSON.stringify(observations).includes('not copied'));assert.equal(observations.find(row=>row.event==='test:interrupted').interrupted.length,1);
  } finally {if(prior===undefined)delete process.env.ARTROOM_TEST_PHASE;else process.env.ARTROOM_TEST_PHASE=prior;}
});

test('actual Node reporter integration preserves failed cases and an early empty summary', () => {
  const dir=mkdtempSync(join(tmpdir(),'artroom-node-report-'));
  try {
    const file=join(dir,'fixture.test.mjs'),output=join(dir,'node.jsonl');
    writeFileSync(file,"import test from 'node:test'; import assert from 'node:assert/strict';\ntest('same',()=>{}); test('same',()=>assert.equal(1,2)); test.skip('ordinary skip',()=>{});\n");
    const env={...process.env,ARTROOM_TEST_PHASE:'node'};delete env.NODE_TEST_CONTEXT;
    const child=spawnSync(process.execPath,['--test','--test-reporter=spec','--test-reporter='+pathToFileURL(new URL('./test-summary.mjs',import.meta.url).pathname).href,
      '--test-reporter-destination=stdout','--test-reporter-destination='+output,file],{env,encoding:'utf8'});
    assert.equal(child.signal,null);assert.equal(child.status,1,child.stderr);
    const observations=readFileSync(output,'utf8').trim().split('\n').map(line=>JSON.parse(line));
    const summary=summarize({stages:[{name:'node',status:'failed'}],observations});
    assert.equal(summary.cases.filter(row=>row.name==='same').length,2);
    assert(summary.cases.some(row=>row.name==='same'&&row.state==='failed'));
    assert(summary.cases.some(row=>row.state==='skipped'));assert(summary.top.every(row=>Number.isFinite(row.durationMs)));
    const empty=spawnSync(process.execPath,[new URL('./test-summary.mjs',import.meta.url).pathname,join(dir,'absent')],{encoding:'utf8'});
    assert.equal(empty.status,0,empty.stderr);assert.match(empty.stdout,/No observed cases/);assert.match(empty.stdout,/native: unreached/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
