import {chromium}from'/Users/hughpyle/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
import{mkdir,writeFile}from'node:fs/promises';
const out='/tmp/artroom-compact-cards-accessibility-20261017';await mkdir(out);
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const report={kind:'static-design-focused-accessibility',limits:'Local browser only; no host or real act',checks:[],console:[]};
const base='http://127.0.0.1:63462/notes/2026-10-17-compact-cards-design/examples/';
try{
const p=await browser.newPage({viewport:{width:320,height:900}});
p.on('console',m=>{if(['error','warning'].includes(m.type()))report.console.push(m.text())});
p.on('pageerror',e=>report.console.push(String(e)));
for(const theme of['light','dark']){
 await p.goto(base+'carousel-question-'+theme+'.html');
 await p.keyboard.press('Tab');
 await p.screenshot({path:out+'/carousel-focus-'+theme+'-320.png',fullPage:true});
 const contrasts=await p.evaluate(()=>{
  function components(s){const m=s.match(/[\d.]+/g).map(Number);return m.slice(0,3).map(n=>n/255)}
  function luminance(c){return c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0)}
  function bg(e){let next=e;while(next){const c=getComputedStyle(next).backgroundColor;if(!c.endsWith(', 0)')&&c!=='rgba(0, 0, 0, 0)'&&c!=='transparent')return c;next=next.parentElement}return getComputedStyle(document.documentElement).backgroundColor}
  return['.slide-title','.summary','.controller'].map(selector=>{const e=document.querySelector(selector),style=getComputedStyle(e);const a=luminance(components(style.color)),b=luminance(components(bg(e)));return{selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}})
 });
 if(contrasts.some(c=>c.ratio<4.5))throw Error('Low text contrast: '+JSON.stringify(contrasts));
 report.checks.push({kind:'text-contrast',theme,contrasts,pass:true});
 await p.locator('.slide-title').evaluate(e=>{e.textContent='Keep completed tasks and their recoverable history when a long project title uses several meaningful words?'});
 await p.locator('.controller').evaluate(e=>{e.textContent='controlled by Alexandra with a longer display name'});
 if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Long title overflow');
 await p.screenshot({path:out+'/long-title-'+theme+'-320.png',fullPage:true});
 report.checks.push({kind:'long-title-and-controller-stress',theme,pass:true,qualification:'DOM text stress, independent of the canonical fictional record'});
 await p.goto(base+'question-'+theme+'.html');
 const buttonRatio=await p.locator('.primary').evaluate(e=>{const s=getComputedStyle(e);return{color:s.color,background:s.backgroundColor,minHeight:e.getBoundingClientRect().height}});
 report.checks.push({kind:'primary-control',theme,...buttonRatio});
}
await p.goto(base+'receipt-context-pending-light.html');
if(await p.locator('[data-static-act="approve-text"]').count())throw Error('Receipt recovery repeats original act');
await p.getByRole('link',{name:'Retry receipt update',exact:true}).click();
if(!(await p.locator('.receipt').textContent()).includes('entry 246'))throw Error('Retry lost accepted receipt');
report.checks.push({kind:'receipt-context-retry-keeps-original-act',pass:true});
}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n')}
console.log(JSON.stringify({out,...report},null,2));
