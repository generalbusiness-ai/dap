// Deep K2 sweep: inject faults at every Nth call of a chosen site during one
// F activation submit (which verifies S and D proofs and replays nested
// S/I/D prefixes). Sites: registry, handler (model functions), audience,
// crypto (createHash/verify/sign used by codec), backend reads.
// Throw values: error, string, undefined, object, proxy, revoked, fakeRefusal.
// Usage: node deep-sweep.mjs <memory|sqlite> <site> <value> [stride]
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
const { ScopeProofError } = await import(R + 'src/scope-proof.ts');
const [storage = 'memory', site = 'registry', valueKind = 'error', strideArg = '1'] = process.argv.slice(2);
const stride = Number(strideArg);

function makeValue() {
  switch (valueKind) {
    case 'error': return new Error('injected-fault');
    case 'string': return 'injected-string';
    case 'undefined': return undefined;
    case 'object': return { injected: true };
    case 'proxy': return new Proxy({ injected: 'proxy' }, {});
    case 'revoked': { const r = Proxy.revocable({}, {}); r.revoke(); return r.proxy; }
    case 'fakeRefusal': return new ScopeProofError('ineffective_release');
    default: throw new Error('unknown value kind');
  }
}
const FAULT = makeValue();
let count = 0, failAt = -1, armed = false;
function hit() { if (!armed) return; count++; if (count === failAt) { globalThis.lastStack = new Error("where").stack; throw FAULT; } }

const world = buildThrough('destination-started', {}, storage);
const proofs = [world.proof('S'), world.proof('D')];
const destination = world.destination; const root = world.root;
world.close();

// Registry
let registry = packages;
if (site === 'registry') registry = new Proxy({ ...packages }, { get(t, k, r) { if (typeof k === 'string' && k.startsWith('sha256:')) hit(); return Reflect.get(t, k, r); } });
function wrap(fn) { if (typeof fn !== 'function') return fn; const w = function (...a) { hit(); return fn.apply(this, a); }; w.toString = () => fn.toString(); return w; }
if (site === 'handler' || site === 'audience') {
  registry = {};
  for (const [id, pkg] of Object.entries(packages)) {
    const models = site === 'handler' ? Object.fromEntries(Object.entries(pkg.models).map(([m, spec]) => [m, { ...spec, init: wrap(spec.init), fold: wrap(spec.fold), ...(spec.observe ? { observe: wrap(spec.observe) } : {}), ...(spec.affordances ? { affordances: wrap(spec.affordances) } : {}) }])) : pkg.models;
    const kinds = site === 'audience' ? Object.fromEntries(Object.entries(pkg.kinds).map(([k, spec]) => [k, { ...spec, audience: wrap(spec.audience) }])) : pkg.kinds;
    registry[id] = { ...pkg, models, kinds };
  }
}
if (site === 'crypto') {
  for (const name of ['createHash', 'verify', 'sign']) { const orig = crypto[name]; crypto[name] = function (...a) { hit(); return orig.apply(this, a); }; }
  nodeModule.syncBuiltinESMExports();
}
const opts = { writer: principals.WF, profile: O1_PROFILE_VERSION };
let serial = 0;
function freshF() {
  const path = join(root, `deep-${site}-${valueKind}-${storage}-${serial++}.sqlite`);
  const backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
  const f = ScopeJournal.create({ backend, writerKey: keys.WF, packages }, envelopeBytes(destination)); f.close();
  return { path, backend };
}
function instrument(backend) {
  if (site !== 'backend') return backend;
  for (const name of ['entries', 'head', 'get']) { const orig = backend[name]; if (typeof orig === 'function') backend[name] = function (...a) { hit(); return orig.apply(this, a); }; }
  return backend;
}
function reopen(h, faulty) {
  if (storage === 'sqlite') { const b = new SQLiteBackend(h.path, opts); return faulty ? instrument(b) : b; }
  if (faulty) { instrument(h.backend); return h.backend; }
  // strip instrumentation for cold reopen
  for (const name of ['entries', 'head', 'get']) if (Object.hasOwn(h.backend, name)) delete h.backend[name];
  return h.backend;
}
const envelopeFor = (f) => signEvent(f.journal.context.intent(principals.alice, K.scope_activate, { proofs }, { action_id: 'deep-act', nonce: 'd'.repeat(32) }), keys.alice);
const describe = (e) => { try { return e instanceof Error ? e.constructor.name + ':' + e.message : typeof e + ':' + String(e); } catch (x) { return 'undescribable:' + x.message; } };

let total;
{ const h = freshF(); const f = ScopeJournal.open({ backend: reopen(h, true), writerKey: keys.WF, packages: registry }); const env = envelopeFor(f); const cred = f.journal.context.credentialFor(principals.alice); count = 0; failAt = -1; armed = true; const r = f.submit(envelopeBytes(env), cred); armed = false; total = count; console.log('site', site, 'value', valueKind, storage, 'calls in one submit', total, 'baseline', JSON.stringify(r.verdict ?? r)); try { f.close(); } catch {} }

const tally = {}; const anomalies = [];
const only = (process.env.ONLY ?? "").split(",").filter(Boolean).map(Number);
for (let n = 1; n <= total; n += stride) { if (only.length && !only.includes(n)) continue;
  const h = freshF();
  const f = ScopeJournal.open({ backend: reopen(h, true), writerKey: keys.WF, packages: registry });
  const env = envelopeFor(f); const bytes = envelopeBytes(env); const cred = f.journal.context.credentialFor(principals.alice);
  const rec = { n };
  count = 0; failAt = n; armed = true; globalThis.lastStack = undefined;
  let returned;
  try { returned = f.submit(bytes, cred); rec.first = 'refused' in returned ? 'refused:' + returned.reason : 'verdict:' + JSON.stringify(returned.verdict); }
  catch (e) { rec.first = Object.is(e, FAULT) ? 'fault' : 'other:' + describe(e); }
  armed = false; failAt = -1;
  if (returned && globalThis.lastStack) rec.stack = globalThis.lastStack.split("\n").slice(2,9).map(s=>s.trim().replace(/.*spike\//,"")).join(" < ");
  if (rec.first !== 'fault' && !rec.first.startsWith('other')) {
    // after an absorbed fault, the facade should still work
  } else {
    try { f.submit(bytes, cred); rec.again = 'no-throw'; } catch (e) { rec.again = /unavailable|closed|inactive|reopen/.test(describe(e)) ? 'blocked' : 'other:' + describe(e); }
  }
  try { f.close(); } catch {}
  const cold = ScopeJournal.open({ backend: reopen(h, false), writerKey: keys.WF, packages });
  rec.coldHead = cold.journal.context.head;
  if (rec.coldHead === 1 && cold.journal.context.entries[1].committed !== bytes) rec.bytes = 'DIFFER';
  const coldState = cold.state;
  rec.coldVerdict = coldState.verdicts[1] ? JSON.stringify(coldState.verdicts[1]) : null;
  if (returned && !('refused' in returned) && JSON.stringify(returned.verdict) !== rec.coldVerdict) rec.disagree = true;
  const retry = cold.submit(bytes, cred);
  rec.retry = 'refused' in retry ? 'refused:' + retry.reason : (retry.replay ? 'replay:' : 'fresh:') + retry.verdict?.effective;
  rec.finalHead = cold.journal.context.head; rec.finalActs = cold.state.activations;
  cold.close();
  const key = [rec.first, rec.again ?? '-', 'coldHead=' + rec.coldHead, rec.retry, 'final=' + rec.finalHead + '/' + rec.finalActs].join(' ');
  tally[key] = (tally[key] ?? 0) + 1;
  if (rec.disagree || rec.bytes || rec.finalActs !== 1 || rec.finalHead !== 1 || rec.again === 'no-throw' || rec.first.startsWith('other') || (rec.first.startsWith('verdict') && !rec.first.includes('"effective":true')) || rec.retry.includes('false')) anomalies.push(rec); if (rec.stack) console.log("STACK", n, rec.first, rec.stack);
}
console.log(JSON.stringify(tally, null, 1));
console.log('anomalies', anomalies.length, JSON.stringify(anomalies.slice(0, 8)));
