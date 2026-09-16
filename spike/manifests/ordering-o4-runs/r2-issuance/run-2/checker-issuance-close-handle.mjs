// A hashing fault inside verifyIssuance (foundation.ts bare catch) becomes an
// ordinary 'malformed' accept verdict under strict ScopeJournal.
// Part A: S cold open with one fault -> opens without throwing, bob missing.
// Part B: F activation with one fault in nested S replay -> returned verdict
//         ineffective_release while cold replay says effective.
// Usage: node k2-issuance.mjs <memory|sqlite>
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
const FAULT = new Error('injected hash fault');
let remaining = 0, skip = 0;
const orig = crypto.createHash;
crypto.createHash = function (...a) {
  if (remaining > 0 && /verifyIssuance/.test(new Error().stack)) { if (skip-- <= 0) { remaining--; throw FAULT; } }
  return orig.apply(this, a);
};
nodeModule.syncBuiltinESMExports();

// Part A
{
  const world = buildThrough('sale-accepted', {}, storage);
  const s = world.contexts.S; const backend = s.journal.context.backend; const ordering = s.journal.ordering;
  const reopen = () => storage === 'sqlite' ? new SQLiteBackend(world.paths.S, { writer: ordering.initialWriter, profile: ordering.profile }) : backend;
  s.close();
  remaining = 1; skip = 0;
  let faulty, attemptedBackend;
  try { faulty = ScopeJournal.open({ backend: (attemptedBackend = reopen()), writerKey: keys.W0, packages }); console.log('A: faulty open returned without throwing; fault consumed =', remaining === 0); }
  catch (e) { if (attemptedBackend instanceof SQLiteBackend) attemptedBackend.close(); console.log('A: faulty open threw', e === FAULT ? 'original fault' : String(e)); }
  remaining = 0;
  if (faulty) {
    const bobIn = faulty.journal.context.state.participants.includes(principals.bob);
    const v2 = faulty.journal.context.state.verdicts[2];
    console.log('A: live participants include bob:', bobIn, ' verdict at 2:', JSON.stringify(v2));
    const ev = signEvent(faulty.journal.context.intent(principals.bob, 'com.example.sale.offer', { offer_id: 'o9' }, { action_id: 'a-bob', nonce: 'e'.repeat(32) }), keys.bob);
    const r = faulty.submit(envelopeBytes(ev), { principal: principals.bob });
    console.log('A: bob submit on faulty-opened facade:', 'refused' in r ? 'refused:' + r.reason : 'accepted verdict ' + JSON.stringify(r.verdict));
    faulty.close();
  }
  const clean = ScopeJournal.open({ backend: reopen(), writerKey: keys.W0, packages });
  console.log('A: clean cold open participants include bob:', clean.journal.context.state.participants.includes(principals.bob), ' verdict at 2:', JSON.stringify(clean.journal.context.state.verdicts[2]));
  clean.close(); world.close();
}
// Part B
{
  const world = buildThrough('destination-started', {}, storage);
  const proofs = [world.proof('S'), world.proof('D')]; const destination = world.destination; const root = world.root;
  world.close();
  const opts = { writer: principals.WF, profile: O1_PROFILE_VERSION };
  for (let k = 0; k < 16; k++) {
    const path = join(root, 'iss-' + k + '.sqlite');
    let backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
    ScopeJournal.create({ backend, writerKey: keys.WF, packages }, envelopeBytes(destination)).close();
    if (storage === 'sqlite') backend = new SQLiteBackend(path, opts);
    const f = ScopeJournal.open({ backend, writerKey: keys.WF, packages });
    const env = signEvent(f.journal.context.intent(principals.alice, K.scope_activate, { proofs }, { action_id: 'iss', nonce: 'f'.repeat(32) }), keys.alice);
    remaining = 1; skip = k;
    let out;
    try { const r = f.submit(envelopeBytes(env), f.journal.context.credentialFor(principals.alice)); out = 'refused' in r ? 'refused:' + r.reason : JSON.stringify(r.verdict); }
    catch (e) { out = e === FAULT ? 'threw original' : 'threw other ' + e; }
    const fired = remaining === 0; remaining = 0;
    try { f.close(); } catch {}
    const cold = ScopeJournal.open({ backend: storage === 'sqlite' ? new SQLiteBackend(path, opts) : backend, writerKey: keys.WF, packages });
    console.log('B: skip', k, 'fired', fired, 'returned', out, '| cold verdict', JSON.stringify(cold.state.verdicts[1]), 'activations', cold.state.activations);
    cold.close();
    if (!fired) break;
  }
}
