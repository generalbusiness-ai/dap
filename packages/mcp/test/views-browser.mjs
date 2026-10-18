// Run with pinned scratch Playwright 1.63.0; this script installs nothing and writes evidence only under /tmp.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
if (!process.env.PLAYWRIGHT_CORE || !process.env.CHROMIUM || !process.env.VIEW_CAPTURE_OUT) throw new Error('Set PLAYWRIGHT_CORE, CHROMIUM and VIEW_CAPTURE_OUT to scratch tool/output paths.');
const require = createRequire(join(process.env.PLAYWRIGHT_CORE, 'package.json'));
const { chromium } = require('playwright-core');
assert.equal(require('playwright-core/package.json').version, '1.63.0');
import { startViewsHost } from './support/views-host.ts';
import { mkdir, writeFile } from 'node:fs/promises';
const out=process.env.VIEW_CAPTURE_OUT;
if (!/^\/(?:private\/)?tmp\//.test(out)) throw new Error('Browser evidence belongs in a scratch directory under /tmp.'); await mkdir(out,{recursive:true});
const host=await startViewsHost(); let browser;
const report={browserPlugin:'Browser plugin not available',playwright:'1.63.0',origin:host.url,sandbox:host.sandboxOrigin,cases:[],errors:[]};
async function opened(params={},width=592){
  const page=await browser.newPage({viewport:{width:width+32,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});
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
  const measure=await metrics(app);assert.equal(measure.overflow,false,label+' overflow');
  for(const control of measure.controls){assert.ok(control.width>=43.9&&control.height>=43.9,label+' target '+JSON.stringify(control))}
  const proof=await page.evaluate(()=>window.proof);assert.deepEqual(proof.errors,[],label+' host errors');assert.deepEqual(errors,[],label+' console');
  const context=JSON.stringify(proof.contexts);for(const privateText of ['Choose the first milestone','Review the working terms','Rita','controlled by','A small decision','The proposal keeps'])assert.ok(!context.includes(privateText),label+' private context '+privateText);
  return {measure,proof};
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
  {const {page,app,errors}=await opened({},390);await click(page,app,app.getByRole('link'));await click(page,app,app.getByRole('button',{name:'Ask in chat',exact:true}));const evidence=await verify(page,app,errors,'explicit-handoff');assert.equal(evidence.proof.chat.length,1);report.cases.push({label:'explicit-handoff',chat:evidence.proof.chat});await page.close()}
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({cases:report.cases.length,browser:report.browser,errors:report.errors,output:out}));
}catch(error){for(const context of browser?.contexts()??[])for(const page of context.pages()){try{await page.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure.json',JSON.stringify({url:page.url(),proof:await page.evaluate(()=>window.proof),body:await page.frameLocator('#frame').frameLocator('iframe').locator('body').innerText(),state:await page.evaluate(async()=>fetch('/proof?instance='+window.proof.config.id).then(r=>r.json()))},null,2))}catch(capture){console.error('capture: '+capture)}}report.errors.push(String(error));await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.error(error);process.exitCode=1}
finally{if(browser)await browser.close();await host.close()}
