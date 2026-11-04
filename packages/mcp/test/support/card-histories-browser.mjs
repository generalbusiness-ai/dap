// Four fixed histories over real card resources, bridge, service and fixture
// signing. Parent/native answers and gated Git results remain stand-ins.
// Install the context clock before navigation; it also controls the iframes:
// https://playwright.dev/docs/api/class-clock
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { TOOL_WAIT_MS } from '../../src/views/waits.ts';

// A harness deadline rejects a missing gate. It never drives application time.
async function entered(host,id,ordinal){
  let deadline;
  try{await Promise.race([host.waitHistoryRead(id,ordinal),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('The actual controlled read did not enter.')),30000)})])}
  finally{clearTimeout(deadline)}
}
const calls=page=>page.evaluate(()=>window.proof.calls.filter(call=>call.name==='view_act').length);
const signatures=page=>page.evaluate(async()=>{const state=await fetch('/proof?instance='+window.proof.config.id).then(r=>r.json());return state.signed.filter(intent=>intent.kind==='read-token').length});

export async function cardHistoriesBrowser({browser,host,out,report,click,verify}){
  async function run(label,width,params,body){
    const page=await browser.newPage({viewport:{width:width+32,height:1000}}),errors=[];let id;
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('console',message=>{if(['error','warning'].includes(message.type()))errors.push(message.text())});
    try{
      await page.clock.install({time:new Date('2026-11-04T00:00:00Z')});
      await page.goto(host.url+'/?'+new URLSearchParams({fixture:'history-gated-diff',...params}));
      assert.equal(await page.title(),'S2 card fixture host');
      const app=page.frameLocator('#frame').frameLocator('iframe');
      await app.locator('#card-root').getByText('Choose the first milestone',{exact:true}).first().waitFor();
      await page.waitForFunction(()=>window.proof.contexts.length>0);
      id=await page.evaluate(()=>window.proof.config.id);
      const details=await body({page,app,id,errors});
      await verify(page,app,errors,label);
      await page.screenshot({path:out+'/'+label+'.png'});
      report.cases.push({label,width,clock:'Playwright context clock; no elapsed application wait',...details});
    }catch(error){
      await page.screenshot({path:out+'/'+label+'-failure.png'}).catch(()=>{});
      await writeFile(out+'/'+label+'-failure.json',JSON.stringify({error:String(error),url:page.url(),proof:await page.evaluate(()=>window.proof).catch(()=>null)},null,2));
      throw error;
    }finally{if(id)host.closeHistoryReads(id);await page.close()}
  }
  await run('history-late-original',592,{},async({page,app,id})=>{
    await click(page,app,app.getByRole('button',{name:'Open',exact:true}));
    await app.getByRole('button',{name:'View diff',exact:true}).click();
    await entered(host,id,1);
    assert.equal(await signatures(page),1);
    await page.clock.fastForward(TOOL_WAIT_MS);
    await app.getByText('so the card does not know how it ended',{exact:false}).waitFor();
    assert.equal(await calls(page),1,'The wait never repeats the write');
    host.releaseHistoryRead(id,1,'complete');
    await app.getByText('A late reply arrived.',{exact:false}).waitFor();
    const recovery=app.getByRole('button',{name:'Read the card again',exact:true});
    assert.equal(await recovery.isEnabled(),true,'A late original offers a visible read');
    await page.screenshot({path:out+'/history-late-original-recovery.png'});
    await click(page,app,recovery);
    await app.getByText('the slow read',{exact:false}).waitFor();
    assert.equal(await recovery.count(),0);
    assert.equal(await calls(page),1,'Recovery reads the retained original without another act');
    assert.equal(await signatures(page),1);
    return {viewActCalls:1,readTokenSignatures:1,lateRecoveryVisible:true,secondWrite:false};
  });
  await run('history-truncated-retry',320,{},async({page,app,id})=>{
    await click(page,app,app.getByRole('button',{name:'Open',exact:true}));
    await app.getByRole('button',{name:'View diff',exact:true}).click();
    await entered(host,id,1);host.releaseHistoryRead(id,1,'truncated');
    await app.getByText('No changed path was reached.',{exact:false}).waitFor();
    assert.equal(await signatures(page),1);
    const retry=app.getByRole('button',{name:'View diff',exact:true});
    assert.equal(await retry.isEnabled(),true);
    await retry.click();await entered(host,id,2);
    assert.equal(await signatures(page),2,'Only the explicit retry signs a new read');
    host.releaseHistoryRead(id,2,'complete');
    await app.getByText('the slow read',{exact:false}).waitFor();
    await click(page,app,app.getByRole('button',{name:/Back/}));
    await click(page,app,app.getByRole('button',{name:'View diff',exact:true}));
    await app.getByText('the slow read',{exact:false}).waitFor();
    assert.equal(await signatures(page),2,'The complete retained result replays without signing');
    assert.equal(host.historyReadState(id).calls,2);
    return {readTokenSignatures:2,explicitRetry:true,completeReplay:true};
  });
  await run('history-process-reopen',592,{processes:'two'},async({page,app,id})=>{
    const opening=await page.evaluate(()=>window.proof.calls.slice(0,3).map(call=>call.name));
    assert.deepEqual(opening,['view_read','view_needs_you','view_read']);
    await click(page,app,app.getByRole('button',{name:'Open',exact:true}));
    await page.evaluate(async()=>{const response=await fetch('/restart?instance='+window.proof.config.id);if(!response.ok)throw Error('Fixture process restart failed.')});
    await click(page,app,app.getByRole('button',{name:'View diff',exact:true}));
    await app.getByText('so nothing was sent',{exact:false}).waitFor();
    assert.equal(await signatures(page),0,'The missing receiving view signs nothing');
    assert.equal(await calls(page),1,'Reopening never repeats the stopped press');
    await click(page,app,app.getByRole('button',{name:'Open',exact:true}));
    await app.getByRole('button',{name:'View diff',exact:true}).click();
    await entered(host,id,1);host.releaseHistoryRead(id,1,'complete');
    await app.getByText('the slow read',{exact:false}).waitFor();
    assert.equal(await signatures(page),1,'The next explicit press signs once on the reopened process');
    return {initialCalls:opening,viewActCalls:2,readTokenSignatures:1,automaticRepeat:false};
  });
  await run('history-teardown-after-timeout',592,{},async({page,app,id})=>{
    await click(page,app,app.getByRole('button',{name:'Open',exact:true}));
    await app.getByRole('button',{name:'View diff',exact:true}).click();
    await entered(host,id,1);await page.clock.fastForward(TOOL_WAIT_MS);
    await app.getByText('so the card does not know how it ended',{exact:false}).waitFor();
    const original=await page.evaluate(()=>window.proof.messages.findLast(message=>message.method==='tools/call'&&message.params?.name==='view_act').id);
    const before=await app.locator('#card-root').innerText();
    await page.evaluate(()=>window.sendHost({id:7001,method:'ui/resource-teardown',params:{}}));
    await page.waitForFunction(()=>window.proof.messages.some(message=>message.id===7001&&message.result));
    host.releaseHistoryRead(id,1,'complete');
    await page.waitForFunction(id=>window.proof.hostReplies.some(message=>message.id===id&&message.result),original);
    assert.equal(await app.locator('#card-root').innerText(),before,'The late original cannot revive a closed card');
    assert.equal(await app.getByText('A late reply arrived.',{exact:false}).count(),0);
    assert.equal(await calls(page),1);
    assert.equal(await signatures(page),1);
    assert.equal(await page.evaluate(()=>window.proof.messages.filter(message=>message.id===7001&&message.result).length),1);
    return {viewActCalls:1,readTokenSignatures:1,teardownAcknowledgments:1,lateRecoveryAfterClose:false};
  });
}
