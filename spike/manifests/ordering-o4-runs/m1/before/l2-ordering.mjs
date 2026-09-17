// A key-import fault inside orderingAdmission (ordering.ts bare catch) becomes
// 'malformed_control'. Part A: S cold open throws a different error.
// Part B: F activation returns effective:false 'Journal view: malformed_control'
// while cold replay and exact retry say effective. Usage: WT=<root> node l2-ordering.mjs <memory|sqlite>
import crypto from 'node:crypto';
import nodeModule from 'node:module';
import { join } from 'node:path';
const R = process.env.WT + '/spike/';
const { buildThrough, keys, principals, packages } = await import(R + 'fixtures/ordering-lifecycle-runner.ts');
const { ScopeJournal } = await import(R + 'src/scope.ts');
const { SQLiteBackend } = await import(R + 'src/sqlite.ts');
const { MemoryBackend } = await import(R + 'src/append.ts');
const { O1_PROFILE_VERSION } = await import(R + 'src/journal.ts');
const { signEvent, envelopeBytes } = await import(R + 'src/codec.ts');
const { K } = await import(R + 'src/foundation.ts');
const storage = process.argv[2] ?? 'memory';
const FAULT = new Error('injected key-import fault');
let remaining = 0;
const orig = crypto.createPublicKey;
crypto.createPublicKey = function (...a) {
  if (remaining > 0 && /orderingAdmission/.test(new Error().stack)) { remaining--; throw FAULT; }
  return orig.apply(this, a);
};
nodeModule.syncBuiltinESMExports();
{
  const world = buildThrough('writer-continued', {}, storage);
  const s = world.contexts.S; const backend = s.journal.context.backend; const ordering = s.journal.ordering;
  const reopen = () => storage === 'sqlite' ? new SQLiteBackend(world.paths.S, { writer: ordering.initialWriter, profile: ordering.profile }) : backend;
  s.close();
  remaining = 1; const b = reopen();
  try { ScopeJournal.open({ backend: b, writerKey: keys.W1, packages }).close(); console.log('A: faulty open returned'); }
  catch (e) { console.log('A: faulty open threw', e === FAULT ? 'original fault' : 'DIFFERENT value: ' + e.message); if (storage === 'sqlite') b.close(); }
  console.log('A: fault consumed', remaining === 0); remaining = 0;
  const clean = ScopeJournal.open({ backend: reopen(), writerKey: keys.W1, packages });
  console.log('A: clean cold open head', clean.journal.context.head); clean.close(); world.close();
}
{
  const world = buildThrough('destination-started', {}, storage);
  const proofs = [world.proof('S'), world.proof('D')]; const destination = world.destination; const root = world.root;
  world.close();
  const opts = { writer: principals.WF, profile: O1_PROFILE_VERSION };
  const path = join(root, 'l2-ordering.sqlite');
  let backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
  ScopeJournal.create({ backend, writerKey: keys.WF, packages }, envelopeBytes(destination)).close();
  if (storage === 'sqlite') backend = new SQLiteBackend(path, opts);
  const f = ScopeJournal.open({ backend, writerKey: keys.WF, packages });
  const bytes = envelopeBytes(signEvent(f.journal.context.intent(principals.alice, K.scope_activate, { proofs }, { action_id: 'l2o', nonce: 'f'.repeat(32) }), keys.alice));
  const cred = f.journal.context.credentialFor(principals.alice);
  remaining = 1;
  let out;
  try { const r = f.submit(bytes, cred); out = 'refused' in r ? 'refused:' + r.reason : 'returned verdict ' + JSON.stringify(r.verdict); }
  catch (e) { out = e === FAULT ? 'threw original' : 'threw other ' + e; }
  console.log('B: fault consumed', remaining === 0, '|', out); remaining = 0;
  try { f.submit(bytes, cred); console.log('B: facade still usable after returned verdict'); } catch (e) { console.log('B: facade blocked', e.message); }
  f.close();
  const cold = ScopeJournal.open({ backend: storage === 'sqlite' ? new SQLiteBackend(path, opts) : backend, writerKey: keys.WF, packages });
  console.log('B: cold head', cold.journal.context.head, 'cold verdict', JSON.stringify(cold.state.verdicts[1]), 'activations', cold.state.activations);
  const retry = cold.submit(bytes, cred);
  console.log('B: exact retry', retry.replay ? 'replay' : 'fresh', JSON.stringify(retry.verdict));
  cold.close();
}
