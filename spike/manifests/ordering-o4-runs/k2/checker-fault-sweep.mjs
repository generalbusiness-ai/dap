// Throw from the package registry at every Nth lookup during one activation
// submit; check facade/Journal/Context closure, durable bytes, recovery.
const R = process.env.WT + '/spike/';
const { join } = await import('node:path');
const { buildThrough, keys, principals, packages } = await import(R + 'fixtures/ordering-lifecycle-runner.ts');
const { ScopeJournal } = await import(R + 'src/scope.ts');
const { SQLiteBackend } = await import(R + 'src/sqlite.ts');
const { MemoryBackend } = await import(R + 'src/append.ts');
const { O1_PROFILE_VERSION } = await import(R + 'src/journal.ts');
const { signEvent, envelopeBytes, verifyEnvelope } = await import(R + 'src/codec.ts');
const { K } = await import(R + 'src/foundation.ts');
const storage = process.argv[2] ?? 'memory';
const stride = Number(process.argv[3] ?? 1);
const world = buildThrough('destination-started', {}, storage);
const proofs = [world.proof('S'), world.proof('D')];
const destination = world.destination; const root = world.root;
world.close();
const opts = { writer: principals.WF, profile: O1_PROFILE_VERSION };
let count = 0, failAt = -1; const FAULT = new Error('injected-registry-fault');
const registry = new Proxy({ ...packages }, { get(t, k, r) { if (typeof k === 'string' && k.startsWith('sha256:')) { count++; if (count === failAt) throw FAULT; } return Reflect.get(t, k, r); } });
let serial = 0;
function freshF() {
  const path = join(root, `fault-${storage}-${serial++}.sqlite`);
  const backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
  const f = ScopeJournal.create({ backend, writerKey: keys.WF, packages }, envelopeBytes(destination)); f.close();
  return { path, backend };
}
const reopen = (h) => storage === 'sqlite' ? new SQLiteBackend(h.path, opts) : h.backend;
const envelopeFor = (f) => signEvent(f.journal.context.intent(principals.alice, K.scope_activate, { proofs }, { action_id: 'fault-act', nonce: 'c'.repeat(32) }), keys.alice);
// measure lookups
{ const h = freshF(); const f = ScopeJournal.open({ backend: reopen(h), writerKey: keys.WF, packages: registry }); const env = envelopeFor(f); count = 0; failAt = -1; f.submit(envelopeBytes(env), f.journal.context.credentialFor(principals.alice)); console.log('lookups in one submit', count); var total = count; f.close(); }
const tally = {}; const anomalies = [];
for (let n = 1; n <= total; n += stride) {
  const h = freshF();
  const f = ScopeJournal.open({ backend: reopen(h), writerKey: keys.WF, packages: registry });
  const env = envelopeFor(f); const bytes = envelopeBytes(env); const cred = f.journal.context.credentialFor(principals.alice);
  count = 0; failAt = n;
  const rec = { n };
  try { const r = f.submit(bytes, cred); rec.first = 'refused' in r ? 'refused:' + r.reason : 'ok:' + r.verdict?.effective; if (r.verdict?.effective !== true) console.log('N', n, JSON.stringify(r.verdict)); else console.log('N', n, 'effective'); }
  catch (e) { rec.first = e === FAULT ? 'fault' : 'other:' + e.message; }
  failAt = -1;
  if (rec.first === 'fault') {
    try { f.submit(bytes, cred); rec.again = 'no-throw'; } catch (e) { rec.again = /unavailable|closed|inactive|reopen/.test(e.message) ? 'blocked' : 'other:' + e.message; }
    try { f.journal.context.submit(env.body, cred, env); rec.raw = 'no-throw'; } catch (e) { rec.raw = /closed|inactive|not open|reopen/.test(e.message) ? 'blocked' : 'other:' + e.message; }
  }
  try { f.close(); } catch {}
  const cold = ScopeJournal.open({ backend: reopen(h), writerKey: keys.WF, packages });
  rec.coldHead = cold.journal.context.head;
  if (rec.coldHead === 1 && cold.journal.context.entries[1].committed !== bytes) rec.bytes = 'DIFFER';
  const beforeState = cold.state; rec.coldActs = beforeState.activations;
  const retry = cold.submit(bytes, cred);
  rec.retry = 'refused' in retry ? 'refused:' + retry.reason : (retry.replay ? 'replay:' : 'fresh:') + retry.verdict?.effective;
  rec.finalHead = cold.journal.context.head; rec.finalActs = cold.state.activations;
  cold.close();
  const key = [rec.first, rec.again, rec.raw, 'coldHead=' + rec.coldHead, 'coldActs=' + rec.coldActs, rec.retry, 'final=' + rec.finalHead + '/' + rec.finalActs].join(' ');
  tally[key] = (tally[key] ?? 0) + 1;
  if (rec.bytes || rec.finalActs !== 1 || rec.finalHead !== 1 || (rec.coldHead === 1 && rec.coldActs !== 1) || rec.again === 'no-throw' || rec.raw === 'no-throw' || (rec.first||'').startsWith('other')) anomalies.push(rec);
}
console.log(storage, JSON.stringify(tally, null, 1)); console.log('anomalies', JSON.stringify(anomalies));
