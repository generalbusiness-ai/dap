import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const wt = process.env.WT;
if (!wt) throw new Error('Set WT to a source checkout.');
const source = execFileSync('git', ['rev-parse', 'HEAD'], {cwd:wt, encoding:'utf8'}).trim();
const load = path => import(pathToFileURL(wt + '/spike/' + path));
const {buildThrough, keys, principals} = await load('fixtures/ordering-lifecycle-runner.ts');
const {K,verifyIssuance,issuanceEvidence} = await load('src/foundation.ts');
const {signEvent} = await load('src/codec.ts');
const {ScopeJournal} = await load('src/scope.ts');
const {SQLiteBackend} = await load('src/sqlite.ts');
const {packages} = await load('fixtures/ordering-lifecycle-runner.ts');
for (const storage of ['memory','sqlite']) {
 const world=buildThrough('sale-accepted',{},storage);
 try {
  const scope=world.contexts.S,ctx=scope.journal.context;
  const sequencing=ctx.entries[0].event.payload.sequencing, savedBackend=ctx.backend;
  const pos=ctx.entries.find(e=>e.event.kind===K.invite).position;
  const original=ctx.inviteEnvelope(pos);
  const payload={invite:{...original.invite,header:{...original.invite.header,extra:0.5}}};
  const out={source,storage,headBefore:ctx.head};
  try {out.verify=verifyIssuance(issuanceEvidence(ctx.state,ctx.entries),payload);} catch(e){out.verifyThrew=String(e);}
  const env=signEvent(ctx.intent(principals.bob,K.accept_invite,payload),keys.bob);
  try {out.submit=scope.submit(env);} catch(e){out.submitThrew=String(e);}
  try {out.after=world.emit('S','alice',K.observe,{fact:'healthy'});} catch(e){out.afterThrew=String(e);}
  scope.close();
  const backend=storage==='sqlite'?new SQLiteBackend(world.paths.S,sequencing):savedBackend;
  world.contexts.S=ScopeJournal.open({backend,writerKey:keys.W0,packages});
  out.coldHead=world.contexts.S.journal.context.head;
  out.coldParticipants=world.contexts.S.journal.context.state.participants.length;
  console.log(JSON.stringify(out));
 } finally {world.close();}
}
