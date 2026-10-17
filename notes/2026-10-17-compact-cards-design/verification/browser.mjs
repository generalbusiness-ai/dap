import { chromium } from '/Users/hughpyle/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import {createHash} from 'node:crypto';
const root='/tmp/artroom-builder-compact-cards-design-20261017/notes/2026-10-17-compact-cards-design/examples';
const out='/tmp/artroom-compact-cards-reviewed-browser-20261017';
await mkdir(out);
const manifest=JSON.parse(await readFile(root+'/manifest.json','utf8'));
const base='http://127.0.0.1:63462/notes/2026-10-17-compact-cards-design/examples/';
const inputs={};for(const file of ['../build.py','cards.css','preview.js','manifest.json',...manifest.pages.map(p=>p.path)])inputs[file]=createHash('sha256').update(await readFile(root+'/'+file)).digest('hex');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results={browser:browser.version(),browserPlugin:'Browser plugin not available',qualification:'Static examples only: no MCP, host, service, signing, or real write',inputs,pages:[],errors:[]};
try{
for(const width of [592,390,320]){
 const context=await browser.newContext({viewport:{width,height:900}});
 const page=await context.newPage();
 page.on('pageerror',e=>results.errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')results.errors.push(m.text())});
 await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
 for(const item of manifest.pages){
  const response=await page.goto(base+item.path);
  const metrics=await page.evaluate(()=>{
   const root=document.querySelector('[data-content-root]');
   const targets=[...root.querySelectorAll('a,summary')].map(e=>({text:e.textContent.trim(),height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width,href:e.getAttribute('href')}));
   return{title:document.title,text:root.textContent.trim().length,overflow:document.documentElement.scrollWidth>innerWidth,height:window.designHeight,targets};
  });
  const broken=metrics.targets.filter(t=>t.href&&!existsSync(root+'/'+new URL(t.href,base).pathname.split('/').at(-1)));
  const small=metrics.targets.filter(t=>t.height<43.9);
  results.pages.push({path:item.path,width,status:response.status(),...metrics,broken,small});
  if(width!==320&&['carousel-question','question','change-failed','updates','diff','receipt-question'].includes(item.key))await page.screenshot({path:out+'/'+item.key+'-'+item.theme+'-'+width+'.png',fullPage:true});
 }
 await context.close();
}

const c=await browser.newContext({viewport:{width:390,height:900}});
const p=await c.newPage();
const assert=(condition,message)=>{if(!condition)throw Error(message)};
results.flows=[];
await p.goto(base+'carousel-question-light.html');
const short=await p.evaluate(()=>window.designHeight);
await p.locator('.slide-title').click();
assert(await p.locator('h1').textContent()==='Keep completed tasks in history?','Title opens the named question');
assert(await p.locator('h1').evaluate(e=>e===document.activeElement),'Opening focuses heading');
const tall=await p.evaluate(()=>window.designHeight);
await p.locator('.back').click();
assert(await p.locator('.slide-title').evaluate(e=>e===document.activeElement),'Back restores title focus');
assert(await p.locator('.position').textContent()==='1 / 5','Back preserves initial position');
await p.locator('.slide-title').press('ArrowRight');
assert(await p.locator('.position').textContent()==='2 / 5','Arrow pages in carousel');
results.flows.push({kind:'title-detail-back-arrow',pass:true,short,tall,returned:await p.evaluate(()=>window.designHeight)});
await p.goto(base+'question-light.html');
await p.getByRole('link',{name:'Approve text v2',exact:true}).click();
assert((await p.locator('.receipt').textContent()).includes('entry 246'),'Approval retains receipt identity');
const receiptHeight=await p.evaluate(()=>window.designHeight);
await p.locator('.back').click();
assert(p.url().includes('carousel-question-approved'),'Back uses refreshed parent snapshot');
await p.locator('.slide-title').click();
await p.getByRole('link',{name:'Record decision: keep history',exact:true}).click();
await p.locator('.back').click();
assert(await p.locator('.position').textContent()==='1 / 4','Removed item clamps to refreshed first item');
assert((await p.locator('.slide-title').textContent()).includes('Improve empty-list'),'Removed question selects next item');
await p.locator('.slide-title').click();
const before=await p.locator('[data-content-root]').getAttribute('data-revision');
await p.getByRole('link',{name:'Diff',exact:true}).click();
assert((await p.locator('.identity').textContent()).includes(manifest.commits['Change 18 integration']),'Diff keeps exact integration');
await p.locator('.back').click();
assert(await p.locator('[data-content-root]').getAttribute('data-revision')===before,'Diff Back keeps version');
await p.locator('.back').click();
assert(await p.locator('.position').textContent()==='1 / 4','Nested Back keeps refreshed queue position');
results.flows.push({kind:'approve-receipt-refreshed-parent-decision-clamp-diff-back',pass:true,receiptHeight});
await p.goto(base+'change-unknown-dark.html');
assert(await p.locator('[data-static-act]').count()===1,'Unknown outcome has only original-request recovery');
await p.getByRole('link',{name:'Check original request',exact:true}).click();
assert((await p.locator('.failed').textContent()).includes('still unknown'),'Unavailable recovery does not claim publication');
await p.goto(base+'change-failed-light.html');
assert(await p.getByRole('link',{name:/Approve/}).count()===0,'Failed checks offer no approval');
await p.getByRole('link',{name:'Request changes',exact:true}).click();
assert((await p.locator('[data-content-root]').textContent()).includes('Change 23 version 1'),'Failed-change draft keeps its own subject');
await p.goto(base+'updates-dark.html');
assert(await p.locator('.event').count()===7,'Updates retain every listed entry');
assert(await p.locator('.group').count()===3,'Updates retain scope grouping');
assert(await p.locator('[data-static-act]').count()===1,'Updates have one act');
await p.goto(base+'updates-incomplete-light.html');
assert(await p.locator('[data-static-act]').count()===0,'Incomplete ranges cannot be marked reviewed');
results.flows.push({kind:'unknown-failed-subject-updates-completeness',pass:true});
for(const key of ['question','change-review','interdiff','updates','receipt-question']){
 await p.goto(base+key+'-dark.html');
 await p.addStyleTag({content:'html { font-size: 30px !important; }'});
 assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),key+' fits at 200% text');
 await p.screenshot({path:out+'/'+key+'-200pct-dark-390.png',fullPage:true});
}
results.flows.push({kind:'200-percent-text',states:5,pass:true});
await c.close();
for(const [file,sha]of Object.entries(inputs))assert(createHash('sha256').update(await readFile(root+'/'+file)).digest('hex')===sha,'Source stayed frozen: '+file);
}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(results,null,2)+'\n')}
const bad=results.pages.filter(p=>p.status!==200||!p.text||p.overflow||p.broken.length||p.small.length);
console.log(JSON.stringify({out,pages:results.pages.length,errors:results.errors,bad:bad.map(({path,width,overflow,broken,small})=>({path,width,overflow,broken,small}))},null,2));
