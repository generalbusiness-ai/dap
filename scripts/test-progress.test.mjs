import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import TestProgress from './test-progress.mjs';

test('Vitest timing is separate from original callbacks and terminal state fills actual gaps', () => {
  const dir=mkdtempSync(join(tmpdir(),'artroom-vitest-report-'));
  const keys=['ARTROOM_TEST_PROGRESS','ARTROOM_TEST_TIMING','ARTROOM_TEST_PHASE'],prior=keys.map(key=>process.env[key]);
  try {
    process.env.ARTROOM_TEST_PROGRESS=join(dir,'progress.jsonl');process.env.ARTROOM_TEST_TIMING=join(dir,'timing.jsonl');process.env.ARTROOM_TEST_PHASE='native';
    const make=(id,ms)=>({id,project:{name:'scope'},module:{moduleId:'/native.test.ts'},fullName:'same',result:()=>({state:'passed'}),diagnostic:()=>ms===null?undefined:{duration:ms}});
    const a=make('actual-a',0),b=make('actual-b',null),module={project:{name:'scope'},moduleId:'/native.test.ts',state:()=> 'passed',diagnostic:()=>({duration:0}),children:{allTests:()=>[a,b]}};
    const reporter=new TestProgress();reporter.onTestRunStart([{}]);reporter.onTestCaseReady(a);reporter.onTestCaseResult(a);reporter.onTestRunEnd([module],[],'passed');
    const progress=readFileSync(process.env.ARTROOM_TEST_PROGRESS,'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(progress.map(row=>row.event),['run-start','case-ready','case-result','case-final','case-final','run-end']);
    assert.deepEqual(progress.filter(row=>row.event==='case-final').map(row=>row.id),['actual-a','actual-b']);
    assert(!progress.some(row=>'durationMs'in row));
    const timing=readFileSync(process.env.ARTROOM_TEST_TIMING,'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(timing.find(row=>row.id==='actual-a').durationMs,0);assert.equal(timing.find(row=>row.id==='actual-b').durationMs,null);
    assert.equal(timing.find(row=>row.record==='module').durationMs,0);
    assert.throws(()=>new TestProgress(),/EEXIST/);
  } finally {keys.forEach((key,i)=>prior[i]===undefined?delete process.env[key]:process.env[key]=prior[i]);rmSync(dir,{recursive:true,force:true});}
});
