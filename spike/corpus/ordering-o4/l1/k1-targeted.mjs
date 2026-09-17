// Targeted K1-class probes. Usage: node k1-targeted.mjs <memory|sqlite>
const R = (process.env.WT ?? '../o4r2-member') + '/spike/';
const { buildThrough, keys, principals: P, packages } = await import(R + 'fixtures/ordering-lifecycle-runner.ts');
const { K } = await import(R + 'src/foundation.ts');
const { ScopeJournal } = await import(R + 'src/scope.ts');
const { SQLiteBackend } = await import(R + 'src/sqlite.ts');
const storage = process.argv[2] ?? 'memory';
const probes = [
  ['alice grant roles [constructor]', 'inspection-attached', 'S', w => w.emit('S', 'alice', K.grant, { principal: P.bob, roles: ['constructor'] })],
  ['alice grant roles [__proto__]', 'inspection-attached', 'S', w => w.emit('S', 'alice', K.grant, { principal: P.bob, roles: ['__proto__'] })],
  ['alice revoke roles [toString]', 'sale-released', 'S', w => w.emit('S', 'alice', K.revoke, { principal: P.bob, roles: ['toString'] })],
  ['alice invite kim roles [constructor] then kim accepts', 'inspection-attached', 'S', w => { const r = w.emit('S', 'alice', K.invite, { invitee: P.kim, grants: { principal: P.kim, roles: ['constructor'] }, token_id: 'k' }); return w.emit('S', 'kim', K.accept_invite, w.contexts.S.journal.context.inviteEnvelope(r.header.position)); }],
  ['alice grant roles [constructor] at F (no roles in scope pkg)', 'destination-activated', 'F', w => w.emit('F', 'alice', K.grant, { principal: P.bob, roles: ['constructor'] })],
  ['alice attach inspection with resolution {kind:{handlers:5}}', 'before-attach', 'S', w => w.emit('S', 'alice', K.attach, { package: packages ? Object.keys(packages)[1] : '', resolution: { 'com.example.inspection.request': { handlers: 5 } } })],
  ['bob exercise right __proto__ at F', 'destination-activated', 'F', w => w.emit('F', 'bob', 'com.example.scope.exercise', { right: '__proto__' })],
  ['kim exercise right constructor at F', 'destination-activated', 'F', w => w.emit('F', 'kim', 'com.example.scope.exercise', { right: 'constructor' })],
  ['alice release right __proto__ with valid export', 'destination-described', 'S', w => { const e = w.contexts.S.export(['R_fulfil']); return w.release('S', 'alice', '__proto__', e); }],
];
for (const [label, point, name, act] of probes) {
  const w = buildThrough(point, {}, storage);
  const out = { label, storage };
  const seq = w.contexts[name].journal.context.entries[0].event.payload.sequencing;
  try { const r = act(w); out.submit = 'refused' in r ? r : { pos: r.header.position, verdict: r.verdict ?? r.controlVerdict }; }
  catch (e) { out.submitThrew = e.message; }
  const c = w.contexts[name];
  const mem = w.backends[name];
  for (const x of Object.values(w.contexts)) { try { x.close(); } catch {} }
  const backend = storage === 'sqlite' ? new SQLiteBackend(w.paths[name], seq) : mem;
  try { const cold = ScopeJournal.open({ backend, writerKey: keys[w.writerNames[name]], packages }); cold.state; out.cold = 'ok head ' + cold.journal.context.head; cold.close(); }
  catch (e) { out.cold = 'threw: ' + e.message; if (storage === 'sqlite') try { backend.close(); } catch {} }
  console.log(JSON.stringify(out));
}
