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
    assert.equal(observations.at(-1).record,'reporter-end');
    // Official22.0 grammar: ordinary terminals have no IDs/type; Suite alone
    // supplies type='suite'. Later22 typed terminals still have no stable IDs.
    const oldLocation={file:'/old.test.mjs',line:1,column:1,nesting:0};
    for (const typed of [false,true]) {
      const legacy=[...[1,2].flatMap(testNumber=>[
        {type:'test:enqueue',data:{...oldLocation,name:'same',...(typed?{type:'test'}:{})}},
        {type:'test:complete',data:{...oldLocation,name:'same',testNumber,details:{passed:true,duration_ms:0,...(typed?{type:'test'}:{})}}},
        {type:'test:pass',data:{...oldLocation,name:'same',testNumber,details:{duration_ms:0,...(typed?{type:'test'}:{})}}}]),
        {type:'test:pass',data:{...oldLocation,name:'suite',details:{type:'suite',duration_ms:2}}},
        {type:'test:fail',data:{...oldLocation,name:'todo true',todo:true,details:{duration_ms:1,...(typed?{type:'test'}:{})}}},
        {type:'test:pass',data:{...oldLocation,name:'skip true',skip:true,details:{duration_ms:0,...(typed?{type:'test'}:{})}}},
        {type:'test:fail',data:{...oldLocation,name:'todo empty',todo:'',details:{duration_ms:1,...(typed?{type:'test'}:{})}}},
        {type:'test:pass',data:{...oldLocation,name:'skip empty',skip:'',details:{duration_ms:0,...(typed?{type:'test'}:{})}}},
        {type:'test:pass',data:{...oldLocation,name:'false directives',todo:false,skip:false,details:{duration_ms:0,...(typed?{type:'test'}:{})}}}];
      const oldRows=[];for await(const line of nodeReporter(legacy))oldRows.push(JSON.parse(line));
      const oldSummary=summarize({stages:[{name:'counting',status:'passed'}],observations:oldRows});
      assert.equal(oldSummary.cases.length,0);assert.equal(oldSummary.top.length,0);
      const terminal=oldSummary.unknown.filter(row=>row.event==='test:pass'&&row.name==='same');
      assert.equal(terminal.length,2);assert.equal(new Set(terminal.map(row=>row.terminalOrdinal)).size,2);
      assert(terminal.every(row=>row.entryFile===null&&row.testId===null));
      assert.equal(oldSummary.completeness.find(row=>row.phase==='counting').basis,'reporter-eof');
      assert.equal(oldSummary.completeness.find(row=>row.phase==='counting').status,'complete');
      assert.equal(oldSummary.issues.length,0);assert(!oldRows.some(row=>row.event==='test:summary'));
      for (const name of ['todo true','todo empty']) assert.equal(oldRows.find(row=>row.name===name).state,'todo');
      for (const name of ['skip true','skip empty']) assert.equal(oldRows.find(row=>row.name===name).state,'skipped');
      assert.equal(oldRows.find(row=>row.name==='false directives').state,'passed');
      assert.match(formatSummary(oldSummary),/Zero reconciled cases does not mean zero executed tests/);
      const truncated=summarize({stages:[{name:'counting',status:'passed'}],observations:oldRows.slice(0,-1)});
      assert(truncated.issues.some(issue=>issue.includes('terminal reporting')));
      const unsuccessful=summarize({stages:[{name:'counting',status:'passed'}],observations:[...oldRows,{record:'node-event',runner:'node',phase:'counting',event:'test:summary',success:false}]});
      assert(unsuccessful.issues.length>0); // EOF cannot override a real unsuccessful public summary.
      // FileTest can emit a terminal with the same actual type as a test.
      // Keep it unknown, and never let EOF conceal its actual failed outcome.
      const failedRows=[];for await(const line of nodeReporter([...legacy,
        {type:'test:fail',data:{...oldLocation,name:'/old.test.mjs',details:{duration_ms:1,...(typed?{type:'test'}:{})}}},
      ]))failedRows.push(JSON.parse(line));
      const contradiction=summarize({stages:[{name:'counting',status:'passed'}],observations:failedRows});
      assert.equal(contradiction.cases.length,0);assert.equal(contradiction.top.length,0);
      assert(contradiction.unknown.some(row=>row.event==='test:fail'&&row.state==='failed'));
      assert.equal(contradiction.completeness.find(row=>row.phase==='counting').status,'partial');
      assert(contradiction.issues.some(issue=>issue.includes('terminal reporting')));
      const failedStage=summarize({stages:[{name:'counting',status:'failed'}],observations:failedRows});
      assert.equal(failedStage.completeness.find(row=>row.phase==='counting').status,'partial');assert.equal(failedStage.issues.length,0);
    }
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
    const named=observations.filter(row=>['test:pass','test:fail'].includes(row.event)&&(row.name==='same'||row.name==='ordinary skip'));
    assert.equal(named.filter(row=>row.name==='same').length,2);
    assert(named.some(row=>row.name==='same'&&row.state==='failed'));assert(named.some(row=>row.state==='skipped'));
    if (named.every(row=>row.entryFile!==null&&row.testId!==null)) {
      // Preserve all modern verified-identity assertions unchanged.
      assert.equal(summary.cases.filter(row=>row.name==='same').length,2);
      assert(summary.cases.some(row=>row.name==='same'&&row.state==='failed'));
      assert(summary.cases.some(row=>row.state==='skipped'));
    } else {
      assert.equal(summary.cases.length,0);assert.equal(summary.top.length,0);
      assert(summary.unknown.some(row=>row.event==='test:fail'&&row.name==='same'));
    }
    assert.equal(observations.filter(row=>row.record==='reporter-end').length,1);
    assert(summary.top.every(row=>Number.isFinite(row.durationMs)));
    const empty=spawnSync(process.execPath,[new URL('./test-summary.mjs',import.meta.url).pathname,join(dir,'absent')],{encoding:'utf8'});
    assert.equal(empty.status,0,empty.stderr);assert.match(empty.stdout,/No observed cases/);assert.match(empty.stdout,/native: unreached/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
