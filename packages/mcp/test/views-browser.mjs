// Run with pinned scratch Playwright 1.63.0; this script installs nothing and writes evidence only under /tmp.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
if (!process.env.PLAYWRIGHT_CORE || !process.env.CHROMIUM || !process.env.VIEW_CAPTURE_OUT) throw new Error('Set PLAYWRIGHT_CORE, CHROMIUM and VIEW_CAPTURE_OUT to scratch tool/output paths.');
const require = createRequire(join(process.env.PLAYWRIGHT_CORE, 'package.json'));
const { chromium } = require('playwright-core');
assert.equal(require('playwright-core/package.json').version, '1.63.0');
import { startViewsHost } from './support/views-host.ts';
import { wordsFixture } from './support/card-words.ts';
import { nativeActorCards, recordedActorFixture } from './support/actor-cards.ts';
import { TOOL_WAIT_MS } from '../src/views/waits.ts';
import { assertAppMessages } from './support/mcp-apps-contract.ts';
import { cardHistoriesBrowser } from './support/card-histories-browser.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const out=process.env.VIEW_CAPTURE_OUT;
if (!/^\/(?:private\/)?tmp\//.test(out)) throw new Error('Browser evidence belongs in a scratch directory under /tmp.'); await mkdir(out,{recursive:true});
const nativeActors=nativeActorCards(out);
const host=await startViewsHost({words:scene=>scene.startsWith('native-actor-')?Promise.resolve(recordedActorFixture(nativeActors.scenes.find(row=>row.kind===scene.slice('native-actor-'.length)))):wordsFixture(scene)}); let browser;
const report={browserPlugin:'Browser plugin not available',playwright:'1.63.0',origin:host.url,sandbox:host.sandboxOrigin,cases:[],contracts:[],errors:[]};
async function opened(params={},width=592){
  const page=await browser.newPage({viewport:{width:width+32,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});
  if(params.fixture==='refresh-sections'){
    const time=new Date('2099-01-01T00:00:00Z');
    await page.clock.install({time});await page.clock.pauseAt(time);
  }
  await page.goto(host.url+'/?'+new URLSearchParams(params));
  assert.equal(await page.title(),'S2 card fixture host');
  const app=page.frameLocator('#frame').frameLocator('iframe');
  await app.locator('#card-root').getByText(/Choose the first milestone|updates since your last review|Nothing needs you|result is retained/).first().waitFor();
  await page.waitForFunction(()=>window.proof.contexts.length>0);
  return {page,app,errors};
}
async function metrics(app){return app.locator('#card-root').evaluate(async root=>{
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  return {width:document.documentElement.clientWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,height:root.getBoundingClientRect().height,focus:document.activeElement?.textContent,controls:[...root.querySelectorAll('a,button')].map(e=>({name:e.getAttribute('aria-label')||e.textContent,disabled:e.disabled,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),text:root.textContent};
})}
// Wait for the host's actual resize before hit-testing a control inside the iframe.
async function stable(page,app){
  for(let attempt=0;attempt<3;attempt++){
    const height=(await metrics(app)).height;
    try{await page.waitForFunction(h=>Math.abs(parseFloat(document.querySelector('#frame').style.height)-Math.ceil(h))<=1,height,{timeout:1500});return}catch(error){if(attempt===2)throw error}
  }
}
async function click(page,app,locator){await stable(page,app);await locator.click();await stable(page,app)}

// The approved identities remain visible text plus a decorative shape; an agent also names its controller.
async function actorMark(app,kind,mark,text){
  const actor=app.locator('.actor');
  assert.equal(await actor.getAttribute('class'),'actor '+kind);
  assert.equal(await actor.locator('span').textContent(),mark);
  assert.equal(await actor.locator('span').getAttribute('aria-hidden'),'true');
  assert.equal(await actor.textContent(),mark+' '+text);
  return {kind,mark,text};
}

async function verify(page,app,errors,label){
  const proof=await page.evaluate(()=>window.proof);
  const contract=assertAppMessages(proof.messages,proof.config.uiRevision,proof.hostReplies);
  report.contracts.push({label,...contract});
  const measure=await metrics(app);assert.equal(measure.overflow,false,label+' overflow');
  for(const control of measure.controls){assert.ok(control.width>=43.9&&control.height>=43.9,label+' target '+JSON.stringify(control))}
  assert.deepEqual(proof.errors,[],label+' host errors');assert.deepEqual(errors,[],label+' console');
  const context=JSON.stringify(proof.contexts);for(const privateText of ['Choose the first milestone','Review the working terms','Rita','controlled by','A small decision','The proposal keeps'])assert.ok(!context.includes(privateText),label+' private context '+privateText);
  return {measure,proof,contract};
}
try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM,headless:true}); report.browser=browser.version();
  for(const theme of ['light','dark'])for(const width of [592,390,320]){
    const {page,app,errors}=await opened({theme,wire:width===320?'legacy':'modern'},width),label=theme+'-'+width;
    const actorMarks=[await actorMark(app,'person','●','Rita · person')];
    await app.getByRole('link',{name:'Choose the first milestone'}).focus();
    await app.getByRole('link',{name:'Choose the first milestone'}).press('ArrowRight');
    await app.getByRole('link',{name:'Review the working terms'}).waitFor();
    actorMarks.push(await actorMark(app,'agent','■','Builder · controlled by Rita · agent'));
    assert.equal((await metrics(app)).focus,'Review the working terms');
    await click(page,app,app.getByRole('link',{name:'Review the working terms'}));
    await app.getByRole('button',{name:'Accept',exact:true}).waitFor();
    assert.match((await metrics(app)).focus,/Back/);
    await click(page,app,app.getByRole('button',{name:'View diff',exact:true}));await app.locator('.diff').waitFor();
    assert.equal(await app.getByRole('button').count(),1,'diff only Back');
    await click(page,app,app.getByRole('button',{name:/Back/}));await app.getByRole('button',{name:'Accept',exact:true}).waitFor();
    await click(page,app,app.getByRole('button',{name:/Back/}));await app.getByRole('link',{name:'Review the working terms'}).waitFor();
    assert.match(await app.locator('.position').textContent(),/2 \/ 3/);
    assert.equal((await metrics(app)).focus,'Review the working terms');
    await page.screenshot({path:out+'/'+label+'-carousel.png'});
    await click(page,app,app.getByRole('link',{name:'Review the working terms'}));await click(page,app,app.getByRole('button',{name:'Accept',exact:true}));
    await app.getByRole('link',{name:'Review the proposed change'}).waitFor();
    actorMarks.push(await actorMark(app,'checker','◇','Checker · checker'));
    await page.waitForFunction(()=>window.proof.mode==='inline'&&window.proof.contexts.at(-1)?.structuredContent.page==='summary');
    const evidence=await verify(page,app,errors,label);assert.equal(evidence.measure.width,width);assert.deepEqual(evidence.proof.chat,[]);
    assert.ok(Math.max(...evidence.proof.sizes.map(s=>s.height))>evidence.proof.sizes.at(-1).height+200,'grow/shrink');
    const state=await page.evaluate(async()=>fetch('/proof?instance='+window.proof.config.id).then(r=>r.json()));assert.equal(state.signed.length,1);
    await page.screenshot({path:out+'/'+label+'-receipt.png'});
    report.cases.push({label,measure:evidence.measure,sizes:evidence.proof.sizes,chat:evidence.proof.chat,signatures:state.signed.length,actorMarks});await page.close();
  }
  // Real rendering and refresh timers over scripted projections. Each refresh
  // changes revision/cut, while its item and scope stay the same.
  for(const width of [592,320]){
    const {page,app,errors}=await opened({fixture:'refresh-sections'},width);
    const sized=async()=>{
      for(let frame=0;frame<10;frame++){
        await page.clock.runFor(50);
        const height=await app.locator('#card-root').evaluate(root=>Math.ceil(root.getBoundingClientRect().height));
        if(await page.evaluate(value=>Math.abs(parseFloat(document.querySelector('#frame').style.height)-value)<=1,height))return;
      }
      assert.fail('The controlled animation frames did not resize the fixture host');
    };
    const clickClock=async locator=>{await sized();await locator.click();await sized();};
    await clickClock(app.getByRole('button',{name:'Open',exact:true}));
    const section=app.locator('details[data-section="exact-record"]');
    assert.equal(await section.evaluate(value=>value.open),false,'a new card starts closed');
    await clickClock(section.locator('summary'));
    const refresh=async()=>{
      const prior=await page.evaluate(()=>proof.calls.filter(call=>call.name==='view_read'&&call.arguments.refresh===true).length);
      await page.clock.runFor(2100);
      await page.waitForFunction(count=>proof.calls.filter(call=>call.name==='view_read'&&call.arguments.refresh===true).length>count,prior);
      await app.locator('#card-root[aria-busy="false"]').waitFor();await sized();
    };
    const initial=await app.locator('.revision').innerText();
    await refresh();assert.equal(await section.evaluate(value=>value.open),true,'first refresh keeps the section open');
    await refresh();assert.equal(await section.evaluate(value=>value.open),true,'second refresh keeps the section open');
    assert.notEqual(await app.locator('.revision').innerText(),initial,'refresh changed the displayed revision');
    await page.screenshot({path:out+'/refresh-open-'+width+'.png'});
    await clickClock(section.locator('summary'));await refresh();
    assert.equal(await section.evaluate(value=>value.open),false,'refresh keeps an explicit close');
    await clickClock(section.locator('summary'));
    const instance=await page.evaluate(()=>proof.config.id);
    host.complete(instance,'q7');await refresh();
    await app.getByRole('heading',{name:'Review the working terms',exact:true}).waitFor();
    assert.equal(await section.evaluate(value=>value.open),false,'an item replaced during refresh does not borrow the old item section');
    await clickClock(app.getByRole('button',{name:/Back/}));
    await clickClock(app.getByRole('button',{name:'Next item',exact:true}));
    await clickClock(app.getByRole('button',{name:'Open',exact:true}));
    assert.equal(await section.evaluate(value=>value.open),false,'a different item does not borrow an open section');
    await page.clock.resume();
    await verify(page,app,errors,'refresh-sections-'+width);
    const state=await page.evaluate(async()=>fetch('/proof?instance='+proof.config.id).then(response=>response.json()));
    assert.equal(state.signed.length,0,'disclosure state and refreshes sign no act');
    report.cases.push({label:'refresh-sections-'+width,openAcrossTwoRefreshes:true,closedAcrossRefresh:true,replacedItemStartsClosed:true,differentItemStartsClosed:true,signatures:0});
    await page.close();
  }
  // Actual native-room displays and receipts. This host replays them; the native owner above already judged each act.
  for(const scene of nativeActors.scenes) for(const width of [592,320]) {
    const page=await browser.newPage({viewport:{width:width+32,height:1100}}),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});
    await page.goto(host.url+'/?'+new URLSearchParams({fixture:'words',scene:'native-actor-'+scene.kind,screen:'decision',theme:'light'}));
    const app=page.frameLocator('#frame').frameLocator('iframe');
    await app.locator('.actor').waitFor();
    const actor=await app.locator('.actor').innerText();
    assert.ok(actor.includes('Question text signed by: '+scene.actor.name),'NATIVE ACTOR: exact text author');
    assert.ok(actor.includes(scene.actor.kind),'NATIVE ACTOR: kind');
    if(scene.actor.kind==='agent')assert.ok(actor.includes('controlled by '+scene.actor.controller),'NATIVE ACTOR: controller');
    await stable(page,app);await page.screenshot({path:out+'/native-'+scene.kind+'-'+width+'-card.png',fullPage:true});
    await click(page,app,app.getByRole('button',{name:'Approve',exact:true}));
    await app.locator('.receipt').filter({hasText:scene.receipt}).waitFor();
    const receipt=await app.locator('.receipt').innerText();assert.equal(receipt,scene.receipt,'NATIVE RECEIPT: the other signer');
    await page.waitForFunction(()=>window.proof.contexts.some(c=>c.structuredContent.receipt));
    const measure=await metrics(app);assert.equal(measure.overflow,false,'NATIVE ACTOR: no overflow');
    const proof=await page.evaluate(()=>window.proof);assert.deepEqual(proof.errors,[]);assert.deepEqual(errors,[]);assert.deepEqual(proof.chat,[]);
    await stable(page,app);await page.screenshot({path:out+'/native-'+scene.kind+'-'+width+'-receipt.png',fullPage:true});
    report.cases.push({label:'native-actor-'+scene.kind+'-'+width,qualification:nativeActors.qualification,actor,receipt,measure,console:errors,chat:proof.chat});
    await page.close();
  }
  for(const fixture of ['updates','incomplete','checks-failed','loss','empty','denied','absent','unavailable']){
    const {page,app,errors}=await opened({fixture,theme:'dark'},390);
    if(['empty','denied','absent','unavailable'].includes(fixture)){
      assert.equal(await app.getByRole('link').count(),0);assert.equal((await page.evaluate(()=>window.proof.contexts.at(-1).structuredContent.status)),fixture);
    }else{
      await click(page,app,app.getByRole('link'));await app.getByRole('button',{name:/Back/}).waitFor();
      if(fixture==='updates'||fixture==='incomplete'){
        assert.equal(await app.locator('.entry').count(),6);
        await page.waitForFunction(()=>window.proof.contexts.at(-1)?.structuredContent.page==='updates');
        const context=await page.evaluate(()=>window.proof.contexts.at(-1).structuredContent);assert.equal(context.entriesRead[0].from,1);assert.equal(context.entriesRead[0].to,6);
        assert.equal(await app.getByRole('button',{name:'Mark reviewed',exact:true}).count(),fixture==='updates'?1:0);
        if(fixture==='incomplete'){assert.deepEqual(context.unavailable,[{scope:'change-9',from:9,to:9}]);assert.equal(context.reviewIntended.length,2)}
      }else if(fixture==='checks-failed'){assert.equal(await app.getByRole('button',{name:'Approve',exact:true}).count(),0)}
      else{
        await click(page,app,app.getByRole('button',{name:'Accept',exact:true}));await app.getByRole('button',{name:'Check original request',exact:true}).waitFor();
        assert.equal(await app.getByRole('button',{name:'Ask in chat',exact:true}).count(),0);
        await click(page,app,app.getByRole('button',{name:'Check original request',exact:true}));await app.getByRole('link',{name:'Review the working terms'}).waitFor();
        const state=await page.evaluate(async()=>fetch('/proof?instance='+window.proof.config.id).then(r=>r.json()));assert.equal(state.signed.length,1);
      }
    }
    const evidence=await verify(page,app,errors,fixture);await page.screenshot({path:out+'/'+fixture+'.png'});report.cases.push({label:fixture,measure:evidence.measure,contexts:evidence.proof.contexts});await page.close();
  }
  {
    const {page,app,errors}=await opened({deny:'1','context-fail':'1'},390);
    await click(page,app,app.getByRole('link'));await app.getByText('Full screen was not granted.',{exact:false}).waitFor();
    assert.equal(await page.evaluate(()=>window.proof.mode),'inline');
    await click(page,app,app.getByRole('button',{name:'Accept',exact:true}));await app.getByRole('link',{name:'Review the working terms'}).waitFor();
    await page.waitForFunction(()=>window.proof.contexts.some(c=>c.structuredContent.receipt));
    const state=await page.evaluate(async()=>fetch('/proof?instance='+window.proof.config.id).then(r=>r.json()));assert.equal(state.signed.length,1);
    const evidence=await verify(page,app,errors,'denied-fullscreen/context-retry');report.cases.push({label:'denied-fullscreen/context-retry',contexts:evidence.proof.contexts,signatures:state.signed.length});await page.close();
  }
  {
    const {page,app,errors}=await opened({theme:'dark'},320);
    await page.evaluate(()=>window.sendHost({method:'ui/notifications/host-context-changed',params:{styles:{variables:{'--font-text-md-size':'28px'}}}}));
    await click(page,app,app.getByRole('link'));await app.getByRole('button',{name:'Accept',exact:true}).waitFor();
    const evidence=await verify(page,app,errors,'200-percent-dark-320');await page.screenshot({path:out+'/200-percent-dark-320.png'});report.cases.push({label:'200-percent-dark-320',measure:evidence.measure});await page.close();
  }
  {
    const {page,app,errors}=await opened({},592);await click(page,app,app.getByRole('link'));await app.getByRole('button',{name:'Accept',exact:true}).waitFor();
    await page.evaluate(async()=>window.modelCall('view_needs_you',{view:'newer',subject:'needs-you'}));
    await click(page,app,app.getByRole('button',{name:'Accept',exact:true}));await app.getByText('A newer card replaced this one.',{exact:false}).first().waitFor();
    assert.equal(await app.getByRole('button',{name:'Accept',exact:true}).isDisabled(),true);
    const state=await page.evaluate(async()=>fetch('/proof?instance='+window.proof.config.id).then(r=>r.json()));assert.equal(state.signed.length,0);await verify(page,app,errors,'superseded');report.cases.push({label:'superseded',signatures:0});await page.close();
  }
  {
    const {page,app,errors}=await opened({},592);await click(page,app,app.getByRole('link'));await app.getByRole('button',{name:'Accept',exact:true}).waitFor();
    await page.waitForFunction(()=>window.proof.contexts.at(-1).structuredContent.page==='item');
    const expected=await page.evaluate(async()=>{const context=window.proof.contexts.at(-1).structuredContent;await window.modelCall('rules.publish',{on:0,fields:window.proof.config.fields,at:context.identity.at,idempotencyKey:'model-context'});return context.identity.at});
    const state=await page.evaluate(async()=>fetch('/proof?instance='+window.proof.config.id).then(r=>r.json()));assert.equal(state.signed.length,1);assert.deepEqual(state.signed[0].expected,expected);
    const hidden=await page.evaluate(()=>window.modelCall('view_read',{view:window.proof.config.id}));assert.equal(hidden.error.code,-32601);
    await verify(page,app,errors,'model-context/app-only-filter');report.cases.push({label:'model-context/app-only-filter',expected,signed:state.signed[0].expected});await page.close();
  }
  for(const prototype of [false,true]){
    const {page,app,errors}=await opened(prototype?{prototype:'1'}:{},592);await click(page,app,app.getByRole('link'));await click(page,app,app.getByRole('button',{name:'Accept',exact:true}));await app.getByRole('link',{name:'Review the working terms'}).waitFor();
    const evidence=await verify(page,app,errors,'receipt-rehearsal-'+prototype);assert.equal(evidence.proof.chat.length,prototype?1:0);report.cases.push({label:'receipt-rehearsal-'+prototype,chat:evidence.proof.chat,modelTurns:evidence.proof.modelTurns});await page.close();
  }
  for(const screen of ['work','decision','change']){const {page,app,errors}=await opened({screen},390);await click(page,app,app.getByRole('link'));await app.getByRole('button',{name:'Accept',exact:true}).waitFor();await verify(page,app,errors,'resource-'+screen);report.cases.push({label:'resource-'+screen});await page.close()}
  // The words a person reads, in each theme. The views adapter is real; a stand-in answers its scope reads. The host here shows no Reply box, so the bottom room is measured against that box's size.
  for(const theme of ['light','dark']){
    const words=async(scene,screen)=>{
      const page=await browser.newPage({viewport:{width:624,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});
      await page.goto(host.url+'/?'+new URLSearchParams({fixture:'words',scene,screen,theme}));
      const app=page.frameLocator('#frame').frameLocator('iframe');await page.waitForFunction(()=>window.proof.contexts.length>0);await app.locator('#card-root').first().waitFor();
      return {page,app,errors,text:()=>app.locator('#card-root').innerText(),shot:async name=>{await stable(page,app);await page.waitForTimeout(300);const fit=await app.locator('#card-root').evaluate(root=>({root:root.getBoundingClientRect().height,scroll:document.documentElement.scrollHeight,client:document.documentElement.clientHeight}));report.cases.push({label:'words-fit-'+name+'-'+theme,fit});assert.ok(fit.scroll<=fit.client+1,name+' WHOLE CARD: the frame holds the card: '+JSON.stringify(fit));await page.screenshot({path:out+'/words-'+name+'-'+theme+'.png',fullPage:true})},done:async label=>{assert.deepEqual(errors,[],label+' console');report.cases.push({label:'words-'+label+'-'+theme});await page.close()}};
    };
    const noRaw=(said,label)=>{for(const raw of ['sha256:','items.','acts.','"scope"','manifest 6','approval-request'])assert.ok(!said.includes(raw),label+' A PERSON READS WORDS: '+raw+' in '+said)};
    {const c=await words('merge-waits','needs-you'),first=await c.text();assert.match(first,/Change 2, version 2/,'merge kicker');assert.match(first,/waits on its author, @una\./,'MERGE WAITS: the row says who it waits on');assert.ok(!first.includes('Merge change'),'MERGE WAITS: the row does not say merge');noRaw(first,'merge first');await c.shot('merge-waits-first');
      await c.app.getByRole('link').first().click();await c.app.locator('details.read-points summary').waitFor();
      const disclosure=c.app.locator('details.read-points');assert.equal(await disclosure.locator('summary').innerText(),'Exact record','RAW ROW: the disclosure names what it holds');assert.equal(await disclosure.evaluate(e=>e.open),false,'RAW ROW: the disclosure starts closed');
      noRaw((await c.text()).replace(/Exact record[\s\S]*$/,''),'merge opened');await c.shot('merge-waits-opened');await disclosure.locator('summary').click();assert.match(await disclosure.innerText(),/"category": "merge-attention"/,'NOTHING LOST: the disclosure holds the row');await c.shot('merge-waits-disclosed');
      // The app's Reply box lies over about 40px, with about 25px of margin below it. Nothing the card offers may sit in that band of an expanded card.
      const room=await c.app.locator('#card-root').evaluate(root=>{const mode=document.documentElement.dataset.mode,bottom=root.getBoundingClientRect().bottom,last=[...root.querySelectorAll('a,button,summary')].filter(e=>e.getClientRects().length).at(-1);return {mode,padding:getComputedStyle(root).paddingBottom,gap:bottom-last.getBoundingClientRect().bottom,last:last.textContent}});
      assert.equal(room.mode,'fullscreen','BOTTOM ROOM: the opened card is expanded');assert.ok(room.gap>=65,'BOTTOM ROOM: the last control clears the Reply box: '+JSON.stringify(room));report.cases.push({label:'words-bottom-room-fullscreen-'+theme,room});await c.done('merge-waits')}
    {const c=await words('merge-waits','needs-you'),inline=await c.app.locator('#card-root').evaluate(root=>[document.documentElement.dataset.mode,getComputedStyle(root).paddingBottom]);assert.deepEqual(inline,['inline','16px'],'BOTTOM ROOM: an inline card keeps its padding');report.cases.push({label:'words-bottom-room-inline-'+theme,inline});await c.page.close()}
    {const c=await words('question-row','needs-you'),said=await c.text();assert.match(said,/Question 1/,'question kicker');assert.match(said,/Rule: this lane's rule for an approval request\./,'RULE LINE: words');noRaw(said,'question row');await c.shot('question-row');await c.done('question-row')}
    // The card walks lanes in the order of their canonical references (laneRefs in apps/views/src/needs-you.ts). A reference begins with its genesis digest, so either issue can come first.
    {const c=await words('work','work'),one=await c.text(),issues=[{title:'Issue 1: TEST first import',line:/@una, agent of @vic, accepted this work\./},{title:'Issue 2: TEST second import',line:/@una2, agent of @rita, accepted this work\./}];
      const first=issues.find(issue=>one.includes(issue.title)),second=issues.find(issue=>issue!==first);assert.ok(first,'WORK: the first card names one of the two issues');assert.match(one,first.line,'WORK: the first line');noRaw(one,'work first');await c.shot('work-1');
      await c.app.getByRole('button',{name:'Next item',exact:true}).click();await c.app.getByText(second.title).waitFor();const two=await c.text();assert.match(two,second.line,'WORK: the second line');assert.notEqual(one,two,'WORK: page 2 differs from page 1');await c.shot('work-2');await c.done('work')}
    {const c=await words('decision-short','decision');await c.app.getByRole('button',{name:'Request changes',exact:true}).waitFor();const said=await c.text();assert.match(said,/The import keeps its old row format/,'SHORT TEXT: the first card holds the text');assert.match(said,/Question 1/,'decision kicker');assert.equal(await c.app.getByRole('button',{name:'Approve',exact:true}).count(),1,'SHORT TEXT: the first card offers Approve');await c.shot('decision-short');
      await c.app.getByRole('button',{name:'Request changes',exact:true}).click();await c.app.getByText('Review recorded: changes requested.').waitFor();await c.shot('decision-short-receipt');await c.done('decision-short')}
    {const c=await words('decision-long','decision');await c.app.getByRole('link').first().waitFor();const said=await c.text();assert.ok(!said.includes('The import keeps its old row format'),'LONG TEXT: the first card shows no part of the text');assert.equal(await c.app.getByRole('button',{name:'Approve',exact:true}).count(),0,'LONG TEXT: the first card offers no act');await c.shot('decision-long');
      await c.app.getByRole('link').first().click();await c.app.getByRole('button',{name:'Approve',exact:true}).waitFor();assert.match(await c.text(),/The import keeps its old row format/,'LONG TEXT: Open shows the text');await c.shot('decision-long-opened');await c.done('decision-long')}
    {const c=await words('change','change'),first=await c.text();assert.match(first,/Change 2, version 2/,'change kicker');await c.shot('change-first');await c.app.getByRole('link').first().click();await c.app.getByRole('button',{name:'Request changes',exact:true}).waitFor();await c.shot('change-opened');
      await c.app.getByRole('button',{name:'Request changes',exact:true}).click();await c.app.getByText('Review recorded: changes requested.').waitFor();await c.shot('change-receipt');await c.done('change')}
    {const c=await words('empty','work');await c.app.getByText('No work is open in this room.').waitFor();assert.ok(!(await c.text()).includes('reviewed scope'),'EMPTY: no internal words');await c.shot('empty-work');await c.done('empty')}
  }
  {
    // The host is scripted and strict about MCP Apps content. The button,
    // browser caller and bridge are the generated production card.
    const {page,app,errors}=await opened({},390);
    await click(page,app,app.getByRole('link'));
    await click(page,app,app.getByRole('button',{name:'Ask in chat',exact:true}));
    await page.waitForFunction(()=>window.proof.messages.some(message=>message.method==='ui/message'));
    const evidence=await verify(page,app,errors,'explicit-handoff');
    const messages=evidence.proof.messages.filter(message=>message.method==='ui/message');
    assert.deepEqual(messages.map(message=>message.params),[{role:'user',content:[{type:'text',text:'Help me with question q7, revision v2.'}]}],'EXPLICIT HANDOFF CONTENT ARRAY: the real caller sends one text content block with the exact card identity');
    assert.deepEqual(evidence.proof.messageRefusals,[],'EXPLICIT HANDOFF CONTENT ARRAY: the strict host accepts the real caller');
    assert.deepEqual(evidence.proof.chat,['Help me with question q7, revision v2.']);
    assert.equal(evidence.proof.modelTurns,1,'Only the explicit handoff asks for a model turn');
    await page.screenshot({path:out+'/explicit-handoff.png'});
    report.cases.push({label:'explicit-handoff',messages:messages.map(message=>message.params),chat:evidence.proof.chat,refusals:evidence.proof.messageRefusals});
    await page.close();
  }
  // Bounded identity/text enumeration over the generated production caller.
  // Scope projections and optional host refusals are scripted. No LLM or
  // Native authority follows from a fixture model-turn counter.
  for(const uiRevision of ['2026-01-26','2025-11-21'])for(const noOptional of [false,true])for(const [seed,identity] of [
    {kind:'question',item:'q7',revision:'v2'},
    {kind:'manifest',item:'21',revision:'23'},
    {kind:'question',item:'問"7\n続き',revision:'版é-2'},
  ].entries()){
    const width=noOptional?320:592,label=`contract-${uiRevision}-${noOptional?'refused':'available'}-${seed}`;
    const page=await browser.newPage({viewport:{width:width+32,height:1100}}),errors=[];
    page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(['error','warning'].includes(message.type()))errors.push(message.text())});
    await page.goto(host.url+'/?'+new URLSearchParams({fixture:'contract',identity:JSON.stringify(identity),uiRevision,...(noOptional?{noOptional:'1'}:{})}));
    assert.equal(await page.title(),'S2 card fixture host');
    const app=page.frameLocator('#frame').frameLocator('iframe');
    await app.getByRole('link',{name:'Choose the first milestone',exact:true}).waitFor();
    await click(page,app,app.getByRole('link',{name:'Choose the first milestone',exact:true}));
    assert.equal(await page.evaluate(()=>proof.modelTurns),0,'Context and navigation request no model turn');
    await click(page,app,app.getByRole('button',{name:'Ask in chat',exact:true}));
    await page.waitForFunction(()=>{const message=proof.messages.find(value=>value.method==='ui/message');return message&&proof.hostReplies.some(reply=>reply.id===message.id)});
    // A legacy context extension must have actually refused before the oracle
    // can classify it outside that revision's admitted method set.
    await page.waitForFunction(()=>proof.messages.filter(message=>message.id!==undefined&&message.method).every(message=>proof.hostReplies.some(reply=>reply.id===message.id)));
    const evidence=await verify(page,app,errors,label),said=`Help me with ${identity.kind} ${identity.item}, revision ${identity.revision}.`;
    const messages=evidence.proof.messages.filter(message=>message.method==='ui/message');
    assert.deepEqual(messages.map(message=>message.params),[{role:'user',content:[{type:'text',text:said}]}],'INDEPENDENT HANDOFF: exact generated identity and text');
    assert.equal(evidence.proof.modelTurns,noOptional?0:1,'Only an accepted explicit handoff makes a fixture model turn');
    assert.deepEqual(evidence.proof.chat,noOptional?[]:[said]);
    assert.equal(evidence.contract.refusedExtensions.length>0,uiRevision==='2025-11-21','A refused newer context method is not legacy conformance');
    if(seed===0)await page.screenshot({path:out+'/'+label+'.png'});
    report.cases.push({label,identity,modelTurns:evidence.proof.modelTurns,contract:evidence.contract});
    await page.evaluate(()=>window.sendHost({id:901,method:'ui/resource-teardown',params:{}}));
    await page.waitForFunction(()=>proof.messages.some(message=>message.id===901&&message.result!==undefined));
    const closed=await page.evaluate(()=>window.proof);
    assert.equal(closed.modelTurns,evidence.proof.modelTurns,'Teardown makes no model turn');
    report.contracts.push({label:label+'-teardown',...assertAppMessages(closed.messages,uiRevision,closed.hostReplies)});
    await page.close();
  }
  for(const [malformed,notice] of [['primitive','The host returned a malformed reply.'],['missing-version','This host returned unsupported MCP Apps revision [missing].']]){
    const page=await browser.newPage({viewport:{width:624,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(['error','warning'].includes(message.type()))errors.push(message.text())});await page.goto(host.url+'/?'+new URLSearchParams({malformed}));
    assert.equal(await page.title(),'S2 card fixture host');
    const app=page.frameLocator('#frame').frameLocator('iframe');await app.getByText(notice,{exact:false}).waitFor();
    const proof=await page.evaluate(()=>window.proof),contract=assertAppMessages(proof.messages,'2026-01-26',proof.hostReplies);
    assert.deepEqual(proof.messages.map(message=>message.method),['ui/initialize'],'Malformed initialization sends no follow-up');
    assert.equal(proof.modelTurns,0);assert.deepEqual(proof.chat,[]);assert.deepEqual(proof.errors,[]);assert.deepEqual(errors,[]);
    await page.screenshot({path:out+'/contract-malformed-'+malformed+'.png'});
    report.contracts.push({label:'contract-malformed-'+malformed,...contract});report.cases.push({label:'contract-malformed-'+malformed,contract});await page.close();
  }
  // The desktop AI app's shape: the model's call opens the view on one process, and the card's calls reach another of the same home.
  const proofOf=page=>page.evaluate(async()=>fetch('/proof?instance='+window.proof.config.id).then(r=>r.json()));
  const calledTools=page=>page.evaluate(()=>window.proof.calls.map(call=>call.name));
  {
    const page=await browser.newPage({viewport:{width:624,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});
    await page.goto(host.url+'/?'+new URLSearchParams({processes:'two'}));
    const app=page.frameLocator('#frame').frameLocator('iframe');
    await app.locator('#card-root').getByText(/Choose the first milestone|no view with this key/).first().waitFor();
    assert.equal(await app.getByText('no view with this key',{exact:false}).count(),0,'The card opens its view on the process that its calls reach');
    assert.deepEqual((await calledTools(page)).slice(0,3),['view_read','view_needs_you','view_read']);
    await page.waitForFunction(()=>window.proof.contexts.length>0);
    assert.equal(await app.getByText('process changed',{exact:false}).count(),0,'The first opening shows a person no notice');
    await click(page,app,app.getByRole('link'));await app.getByRole('button',{name:'Accept',exact:true}).waitFor();
    assert.equal((await proofOf(page)).signed.length,0,'Opening on the second process signs nothing');
    await click(page,app,app.getByRole('button',{name:'Accept',exact:true}));await app.getByText('accepted',{exact:false}).first().waitFor();
    assert.equal((await proofOf(page)).signed.length,1);
    await verify(page,app,errors,'two-process');await page.screenshot({path:out+'/two-process.png'});report.cases.push({label:'two-process',calls:await calledTools(page)});await page.close();
  }
  // A process that restarts under a card: the card reopens, and it never repeats the press.
  {
    const {page,app,errors}=await opened({processes:'two'},592);
    await click(page,app,app.getByRole('link'));await app.getByRole('button',{name:'Accept',exact:true}).waitFor();
    await page.evaluate(async()=>fetch('/restart?instance='+window.proof.config.id));
    await click(page,app,app.getByRole('button',{name:'Accept',exact:true}));await app.locator('#card-root').getByText(/so nothing was sent|no view with this key|accepted/).first().waitFor();
    assert.equal((await proofOf(page)).signed.length,0,'The press that met no view signed nothing, and the card did not repeat it');
    assert.equal(await app.getByText('so nothing was sent',{exact:false}).count()>0,true,'The card says that the press sent nothing');
    await click(page,app,app.getByRole('link'));await click(page,app,app.getByRole('button',{name:'Accept',exact:true}));await app.getByText('accepted',{exact:false}).first().waitFor();
    assert.equal((await proofOf(page)).signed.length,1,'The next press signs once');
    await page.screenshot({path:out+'/process-restart.png'});report.cases.push({label:'process-restart',errors});await page.close();
  }
  // A card that cannot reopen says what a person can do, and it does not say to open it again.
  {
    const page=await browser.newPage({viewport:{width:624,height:1000}});await page.goto(host.url+'/?'+new URLSearchParams({processes:'two',denyOpen:'1'}));
    const app=page.frameLocator('#frame').frameLocator('iframe');
    await app.getByText('Ask for a new card in the chat.',{exact:false}).first().waitFor();
    assert.equal(await app.getByText('Open it again',{exact:false}).count(),0);
    assert.equal((await proofOf(page)).signed.length,0);
    await page.screenshot({path:out+'/reopen-refused.png'});report.cases.push({label:'reopen-refused'});await page.close();
  }
  // The Git answers script a bounded stop, then completion. Ordinary presses
  // use the production bridge/service/session, signatures and TEST scope port.
  for(const width of [592,320]){
    const {page,app,errors}=await opened({fixture:'stopped-diff'},width);
    await click(page,app,app.getByRole('button',{name:'Open',exact:true}));
    await click(page,app,app.getByRole('button',{name:'View diff',exact:true}));
    await app.getByText('No changed path was reached.',{exact:false}).waitFor();
    assert.match(await app.locator('#card-root').innerText(),/every changed path, because the read stopped before it reached one/);
    const signatures=async()=>(await proofOf(page)).signed.filter(intent=>intent.kind==='read-token').length;
    assert.equal(await signatures(),1,'The first stopped read signs once');
    const retry=app.getByRole('button',{name:'View diff',exact:true});
    assert.equal(await retry.count(),1,'A lone stopped Diff keeps its ordinary reader control');
    assert.equal(await retry.isEnabled(),true,'The current stopped read can run again');
    assert.equal(await retry.getAttribute('aria-current'),'true');
    await page.screenshot({path:out+'/stopped-diff-'+width+'.png'});
    await click(page,app,retry);
    await app.getByText('the slow read',{exact:false}).waitFor();
    assert.equal(await signatures(),2,'The next ordinary press reads again without reopening the view');
    assert.equal(await app.getByText('No changed path was reached.',{exact:false}).count(),0);
    await click(page,app,app.getByRole('button',{name:/Back/}));
    await click(page,app,app.getByRole('button',{name:'View diff',exact:true}));
    await app.getByText('the slow read',{exact:false}).waitFor();
    assert.equal(await signatures(),2,'The complete held answer replays without a third credential');
    await verify(page,app,errors,'stopped-diff-'+width);
    report.cases.push({label:'stopped-diff-'+width,stoppedBoundsVisible:true,ordinaryRetry:true,completeReplay:true,readTokenSignatures:2});
    await page.close();
  }
  // A signed read of 11.6 s, as the person's press took, against the real service and a fixture Git read. The clock is real.
  {
    const page=await browser.newPage({viewport:{width:624,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});
    await page.goto(host.url+'/?'+new URLSearchParams({fixture:'signed-diff-11600'}));
    const app=page.frameLocator('#frame').frameLocator('iframe');
    await app.locator('#card-root').getByText(/Choose the first milestone/).first().waitFor();
    await page.waitForFunction(()=>window.proof.contexts.length>0);
    await click(page,app,app.getByRole('button',{name:'Open',exact:true}));
    await app.getByRole('button',{name:'View diff',exact:true}).click();
    await app.getByText('the slow read',{exact:false}).waitFor({timeout:30000});
    assert.equal(await app.locator('.notice').count(),0,'A read inside the wait shows the diff and no notice');
    assert.equal((await proofOf(page)).signed.filter(intent=>intent.kind==='read-token').length,1);
    assert.deepEqual(errors,[]);report.cases.push({label:'signed-read-11600'});await page.close();
  }
  // The read outlasts the card's wait, as a stalled request would. SCRIPTED clock: the card's wait is one second, and the read takes three.
  {
    const page=await browser.newPage({viewport:{width:624,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});
    await page.addInitScript(wait=>{const real=window.setTimeout.bind(window);window.setTimeout=(run,ms,...rest)=>real(run,ms===wait?1000:ms,...rest)},TOOL_WAIT_MS);
    await page.goto(host.url+'/?'+new URLSearchParams({fixture:'signed-diff-3000'}));
    const app=page.frameLocator('#frame').frameLocator('iframe');
    await app.locator('#card-root').getByText(/Choose the first milestone/).first().waitFor();
    await page.waitForFunction(()=>window.proof.contexts.length>0);
    assert.equal(await app.getByRole('button',{name:'Open',exact:true}).count(),1,'The summary shows a person that the card opens');
    await click(page,app,app.getByRole('button',{name:'Open',exact:true}));
    await app.getByRole('button',{name:'View diff',exact:true}).click();
    await app.getByText('so the card does not know how it ended',{exact:false}).waitFor();
    assert.match(await app.locator('.notice').first().textContent(),/a permanent read may have been signed/);
    assert.equal(await app.getByText('No action was retried',{exact:false}).count(),0,'The words do not say that nothing happened');
    assert.equal(await page.evaluate(()=>window.proof.calls.at(-1).name),'view_read','After no answer the card reads its view again');
    const reads=()=>proofOf(page).then(proof=>proof.signed.filter(intent=>intent.kind==='read-token').length);
    // The server still works on the first press. A second press finds it busy, and the card offers the read that its words name.
    await click(page,app,app.getByRole('button',{name:'View diff',exact:true}));
    await app.getByText('operation in progress',{exact:false}).waitFor();
    await click(page,app,app.getByRole('button',{name:'Read the card again',exact:true}));
    assert.equal(await app.getByRole('button',{name:'Read the card again',exact:true}).count(),0,'The read answered, so the offer goes');
    for(let tries=0;;tries++){
      const shown=await page.evaluate(()=>window.appCall('view_read',{view:window.proof.config.id}));
      if(shown.result?.structuredContent?.display?.query?.page==='diff')break;
      assert.ok(tries<100,'The late read finished');await page.waitForTimeout(100);
    }
    assert.equal(await reads(),1);
    // The late answer moved the server's cut, and the card holds the old cut. This press finds that out.
    await click(page,app,app.getByRole('button',{name:'View diff',exact:true}));
    await app.getByText('The card had changed, so this press sent nothing',{exact:false}).waitFor();
    assert.equal(await reads(),1,'A press on an old cut signs nothing');
    await app.getByText('the slow read',{exact:false}).waitFor();
    assert.equal(await app.getByText('Read it again',{exact:false}).count(),0,'A person is not told to do what the card offers no way to do');
    await click(page,app,app.getByRole('button',{name:/Back/}));
    await app.getByRole('button',{name:'View diff',exact:true}).waitFor();
    assert.equal(await app.getByText('The card had changed',{exact:false}).count(),0,'After the recovery a press works');
    assert.deepEqual(errors,[]);await page.screenshot({path:out+'/read-outlasts-wait.png'});
    report.cases.push({label:'read-outlasts-wait',calls:(await calledTools(page)).slice(-6)});await page.close();
  }
  // A declared card names its own opening tool, which differs from the built-in screens' tools.
  {
    const page=await browser.newPage({viewport:{width:624,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(host.url+'/?'+new URLSearchParams({fixture:'declared',screen:'board',processes:'two'}));
    const app=page.frameLocator('#frame').frameLocator('iframe');
    await app.locator('#card-root').getByText(/lastNumber: 42|could not open its view/).first().waitFor();
    assert.deepEqual((await calledTools(page)).slice(0,3),['view_read','view_board','view_read'],'A declared card names its own opening tool');
    assert.deepEqual(errors,[]);report.cases.push({label:'declared-two-process'});await page.close();
  }
  await cardHistoriesBrowser({browser,host,out,report,click,verify});
  const covered=new Set(report.contracts.flatMap(row=>Object.keys(row.counts)));
  for(const method of ['ui/initialize','ui/notifications/initialized','ui/notifications/size-changed','ui/update-model-context','ui/request-display-mode','ui/message','tools/call'])assert.ok(covered.has(method),'INDEPENDENT MCP CONTRACT: exercised outbound method '+method);
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({cases:report.cases.length,browser:report.browser,errors:report.errors,output:out}));
}catch(error){for(const context of browser?.contexts()??[])for(const page of context.pages()){try{await page.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure.json',JSON.stringify({url:page.url(),proof:await page.evaluate(()=>window.proof),body:await page.frameLocator('#frame').frameLocator('iframe').locator('body').innerText(),state:await page.evaluate(async()=>fetch('/proof?instance='+window.proof.config.id).then(r=>r.json()))},null,2))}catch(capture){console.error('capture: '+capture)}}report.errors.push(String(error));await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.error(error);process.exitCode=1}
finally{if(browser)await browser.close();await host.close()}
