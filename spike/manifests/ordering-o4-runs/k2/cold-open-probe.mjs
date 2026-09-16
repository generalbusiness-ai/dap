const R = process.env.WT + '/spike/';
const { buildThrough, keys, packages } = await import(R + 'fixtures/ordering-lifecycle-runner.ts');
const { ScopeJournal } = await import(R + 'src/scope.ts');
const { MemoryBackend } = await import(R + 'src/append.ts');
const world = buildThrough('sale-accepted', {}, 'memory');
const saved = world.contexts.S.journal.context.entries; world.close();
let count = 0, failAt = -1; const FAULT = new Error('cold-registry-fault');
const registry = new Proxy({...packages}, {get(t,k,r) { if(typeof k === 'string' && k.startsWith('sha256:')) {count++; if(count === failAt) throw FAULT;} return Reflect.get(t,k,r); }});
function open() { const backend = new MemoryBackend(); backend.serialized(() => {for(const entry of saved) backend.commit(entry,undefined,undefined);}); return ScopeJournal.open({backend,writerKey:keys.W0,packages:registry}); }
const normal = open(); const total = count; normal.close(); console.log('open lookups',total);
for(let n=1;n<=total;n++) { count=0; failAt=n; let scoped; try { scoped=open(); console.log(JSON.stringify({n,returned:true,foldErrors:Object.values(scoped.journal.context.state.verdicts).filter(v=>v.reason?.startsWith('fold_error:'))})); } catch(error) { console.log(JSON.stringify({n,original:error===FAULT,message:String(error)})); } finally { scoped?.close(); } }
