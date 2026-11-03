import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root='/Users/inguz/dap-host-h3-20261029', source=root+'/source', home=root+'/client';
const info=lstatSync(home);if(!info.isDirectory()||info.isSymbolicLink()||(info.mode&0o777)!==0o700)throw Error('Existing H3 client home required');
const { contextForCelldSmoke }=await import(pathToFileURL(source+'/scripts/celld-smoke.mjs').href);
const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
let denied=0,sessionRequests=0;const reads=[];
const fetchPort=async (url,init={})=>{
 const u=new URL(url),method=init.method??'GET';
 if(u.origin!=='https://inguz.local'||!(method==='GET'||method==='POST'&&u.pathname.endsWith('/sessions'))){denied++;throw Error('Read-only H3 tripwire');}
 if(method==='POST')sessionRequests++;
 const r=await fetch(url,init);
 if(method==='GET'&&/^\/v1\/scopes\/[^/]+$/.test(u.pathname)){
  const b=await r.clone().json();reads.push({status:r.status,ok:b.ok===true,kind:b.value?.scope?.kind,definition:b.value?.definition,scopeStatus:b.value?.status,head:b.at});
 }
 return r;
};
const ctx=await contextForCelldSmoke({base:'https://inguz.local',home,fetch:fetchPort});
const config=await ctx.store.config();if(config?.service!=='https://inguz.local'||!config.repository)throw Error('Existing H3 room configuration required');
const require=createRequire(pathToFileURL(source+'/packages/cli/bin/dap.js'));
const { tsImport }=await import(pathToFileURL(require.resolve('tsx/esm/api')).href);
const { command }=await tsImport(pathToFileURL(source+'/packages/cli/src/line.ts').href,import.meta.url);
const guarded={...ctx,store:{...ctx.store,save:async()=>{throw Error('H3 config write refused')},keep:async()=>{throw Error('H3 key write refused')},keepPrivate:async()=>{throw Error('H3 private write refused')}}};
const results=[];
for(const kind of ['membership','directory']){
 const r=await command(guarded,['status',kind]);results.push({command:['status',kind],code:r.code,lines:r.lines.length,linesSha256:hash(r.lines)});
}
console.log(JSON.stringify({qualification:'Actual existing H3 client identity and old source over verified HTTPS. CLI status only; configuration/key/private writes and non-read HTTP methods tripwired. No key, session, signature, scope ID, content or journal emitted.',node:process.version,results,reads,sessionRequests,deniedMutations:denied}));
if(results.some(r=>r.code!==0)||denied!==0||!reads.some(r=>r.kind==='membership'&&r.ok&&r.scopeStatus==='active')||!reads.some(r=>r.kind==='directory'&&r.ok&&r.scopeStatus==='active'))process.exitCode=1;
