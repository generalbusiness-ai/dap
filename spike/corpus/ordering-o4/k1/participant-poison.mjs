// Can an ordinary S participant make the scope fold throw (audience_error) with
// a malformed Inspection request, disabling S and any F that replays S?
const R = process.env.WT + '/spike/';
const { buildThrough, keys, principals, packages } = await import(R + 'fixtures/ordering-lifecycle-runner.ts');
const { ScopeJournal } = await import(R + 'src/scope.ts');
const { SQLiteBackend } = await import(R + 'src/sqlite.ts');
const { INSPECTION } = await import(R + 'fixtures/inspection.ts');
const storage = process.argv[2] ?? 'memory';
const w = buildThrough('inspection-attached', {}, storage);
const out = {};
try {
  const s = w.contexts.S;
  const o0 = { initialWriter: s.journal.ordering.initialWriter, profile: s.journal.ordering.profile };
  let r;
  try { r = w.emit('S', 'carol', INSPECTION + 'request', null); out.submit = 'refused' in r ? r : { pos: r.header.position, verdict: r.verdict }; }
  catch (e) { out.submitThrew = e.message; }
  try { out.rawVerdict = s.journal.context.state.verdicts[12]; out.head = s.journal.context.head; } catch (e) { out.rawRead = 'threw: ' + e.message; }
  // cold reopen
  const o = o0; const bk = s.journal.context.backend; try { s.close(); } catch {}
  const backend = storage === 'sqlite' ? new SQLiteBackend(w.paths.S, { writer: o.initialWriter, profile: o.profile }) : bk;
  const cold = ScopeJournal.open({ backend, writerKey: keys.W0, packages }); w.contexts.S = cold; w.backends.S = backend;
  try { cold.state; out.coldState = 'ok'; } catch (e) { out.coldState = 'threw: ' + e.message; }
  // Can Alice still do scope work in S (e.g. a release or export) after this?
  const cold2 = ScopeJournal.open({ backend: storage === 'sqlite' ? new SQLiteBackend(w.paths.S, { writer: o.initialWriter, profile: o.profile }) : bk, writerKey: keys.W0, packages }); w.contexts.S = cold2;
  try { cold2.export(['R_sell']); out.export = 'ok'; } catch (e) { out.export = 'threw: ' + e.message; }
  try { const p = cold2.proof(); out.proof = 'ok frontier ' + p.frontier; } catch (e) { out.proof = 'threw: ' + e.message; }
  try { const r2 = w.emit('S', 'bob', 'com.example.sale.offer', { offer_id: 'o9' }); out.nextSubmit = 'refused' in r2 ? r2 : r2.verdict; } catch (e) { out.nextSubmit = 'threw: ' + e.message; }
  out.headAfter = storage === 'sqlite' ? (() => { const b = new SQLiteBackend(w.paths.S, { writer: o0.initialWriter, profile: o0.profile }); const h = b.entries().length - 1; b.close(); return h; })() : bk.entries().length - 1;
} finally { try { w.close(); } catch {} }
console.log(storage, JSON.stringify(out, null, 1));
