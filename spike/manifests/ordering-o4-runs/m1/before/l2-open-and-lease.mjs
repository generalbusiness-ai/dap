// Part C: F cold open at destination-activated; one key-import fault inside
// orderingAdmission during nested S proof replay changes the opened scope state.
// Part D: one key-import fault inside scopeSetup (ScopeJournal constructor)
// leaks the backend lease; the same memory backend cannot be reopened.
// Usage: WT=<root> node l2-open-and-lease.mjs <memory|sqlite>
import crypto from 'node:crypto';
import nodeModule from 'node:module';
const R = process.env.WT + '/spike/';
const { buildThrough, keys, packages } = await import(R + 'fixtures/ordering-lifecycle-runner.ts');
const { ScopeJournal } = await import(R + 'src/scope.ts');
const { SQLiteBackend } = await import(R + 'src/sqlite.ts');
const storage = process.argv[2] ?? 'memory';
const FAULT = new Error('injected key-import fault');
let remaining = 0, pattern = /orderingAdmission/;
const orig = crypto.createPublicKey;
crypto.createPublicKey = function (...a) {
  if (remaining > 0 && pattern.test(new Error().stack)) { remaining--; throw FAULT; }
  return orig.apply(this, a);
};
nodeModule.syncBuiltinESMExports();
const world = buildThrough('destination-activated', {}, storage);
const f = world.contexts.F; const backend = f.journal.context.backend; const seq = { writer: f.journal.ordering.initialWriter, profile: f.journal.ordering.profile };
const reopen = () => storage === 'sqlite' ? new SQLiteBackend(world.paths.F, seq) : backend;
f.close();
const summary = (sj) => { const st = sj.state; return JSON.stringify({ active: st.active, activations: st.activations, verdict1: st.verdicts[1], rights: st.rights }); };
{
  const clean = ScopeJournal.open({ backend: reopen(), writerKey: keys.WF, packages }); console.log('C: healthy open ', summary(clean)); clean.close();
  pattern = /orderingAdmission/; remaining = 1;
  const b = reopen(); let sj;
  try { sj = ScopeJournal.open({ backend: b, writerKey: keys.WF, packages }); console.log('C: faulty open  ', summary(sj), '| fault consumed', remaining === 0); }
  catch (e) { console.log('C: faulty open threw', e === FAULT ? 'original' : 'other ' + e); }
  remaining = 0; try { sj ? sj.close() : storage === 'sqlite' && b.close(); } catch {}
  const cold = ScopeJournal.open({ backend: reopen(), writerKey: keys.WF, packages }); console.log('C: cold reopen  ', summary(cold)); cold.close();
}
{
  pattern = /new ScopeJournal/; remaining = 1;
  const b = reopen();
  try { ScopeJournal.open({ backend: b, writerKey: keys.WF, packages }).close(); console.log('D: faulty open returned'); }
  catch (e) { console.log('D: faulty open threw', e === FAULT ? 'original fault' : 'other ' + e); }
  remaining = 0;
  if (storage === 'sqlite') b.close();
  try { const again = ScopeJournal.open({ backend: reopen(), writerKey: keys.WF, packages }); console.log('D: reopen ok, head', again.journal.context.head); again.close(); }
  catch (e) { console.log('D: reopen threw', e.message); }
}
world.close();
