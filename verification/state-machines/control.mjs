// One deliberate control, never a sweep. Do not run alongside edits to its source.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const [name,destination]=process.argv.slice(2);
const controls=JSON.parse(readFileSync(new URL('./controls.json',import.meta.url)));
const control=controls[name];
if(!control || !destination) throw new Error('Pass one subsystem name and a new external evidence directory');
const root=resolve(import.meta.dirname,'../..'),out=resolve(destination);
if(out===root || out.startsWith(root+'/')) throw new Error('Keep raw evidence outside the checkout');
mkdirSync(out,{recursive:false});
const file=join(root,control.source),original=readFileSync(file),text=original.toString();
if(text.split(control.old).length!==2) throw new Error('The control no longer matches exactly once; review correspondence');
const run=phase=>{
 const r=spawnSync(process.execPath,[join(import.meta.dirname,'check.mjs'),name,'--source'],{cwd:root,encoding:'utf8',timeout:150000,maxBuffer:16*1024*1024});
 writeFileSync(join(out,phase+'.log'),(r.stdout??'')+(r.stderr??''));
 if(r.error||r.signal) throw new Error('Inconclusive: source check did not complete');
 return r.status;
};
if(run('baseline')!==0) throw new Error('Inconclusive: baseline failed; source remains unchanged');
let broken, changed = false;
const restore = () => { if (changed) { writeFileSync(file,original); changed = false; } };
process.once('exit',restore);
process.once('SIGINT',() => process.exit(130));
process.once('SIGTERM',() => process.exit(143));
try { changed = true; writeFileSync(file,text.replace(control.old,control.new)); broken=run('broken'); }
finally { restore(); }
const restored=run('restored');
if(broken!==1||restored!==0) throw new Error('Inconclusive: expected broken exit 1 and restored exit 0');
const failure = readFileSync(join(out,'broken.log'),'utf8');
if (!failure.includes('AssertionError') || !failure.includes(control.assertion)) throw new Error('Inconclusive: the expected property assertion did not fail; source restored');
console.log('Read broken.log: require the documented property assertion, not a timeout, thrown guard or missing test. Source restored.');
