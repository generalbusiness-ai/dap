// K1 class: participant submits an application intent whose kind is an
// Object.prototype property name. Usage: node k1-proto-kind2.mjs <memory|sqlite> <kind> <point> <context> <actor>
const R = (process.env.WT ?? '../o4r2-member') + '/spike/';
const { buildThrough, keys, principals, packages } = await import(R + 'fixtures/ordering-lifecycle-runner.ts');
const { signEvent, envelopeBytes } = await import(R + 'src/codec.ts');
const { ScopeJournal } = await import(R + 'src/scope.ts');
const { SQLiteBackend } = await import(R + 'src/sqlite.ts');
const [storage = 'memory', kind = 'constructor', point = 'inspection-attached', name = 'S', actor = 'carol'] = process.argv.slice(2);
const w = buildThrough(point, {}, storage);
const out = { storage, kind, point, context: name, actor };
const c = w.contexts[name];
const genesis = c.journal.context.entries[0].event;
const seq = genesis.payload.sequencing;
const writerKey = keys[w.writerNames[name]];
const memBackend = w.backends[name];
out.headBefore = c.journal.context.head;
const body = { kind, payload: { offer_id: 'o2' }, actor: principals[actor], nonce: 'ab'.repeat(16), genesis: c.journal.context.genesisId, action_id: 'poison-1', expected_binding: 'sha256:' + '0'.repeat(64) };
const env = signEvent(body, keys[actor]);
try { const r = c.submit(envelopeBytes(env), c.journal.context.credentialFor(principals[actor])); out.submit = 'refused' in r ? r : { pos: r.header.position, verdict: r.verdict }; }
catch (e) { out.submitThrew = String(e.message); }
try { c.close(); } catch {}
for (const other of Object.keys(w.contexts)) if (other !== name) w.contexts[other].close();
const fresh = () => storage === 'sqlite' ? new SQLiteBackend(w.paths[name], seq) : memBackend;
for (let attempt = 1; attempt <= 2; attempt++) {
  const backend = fresh();
  out['backendHead' + attempt] = backend.entries().length - 1;
  try {
    const cold = ScopeJournal.open({ backend, writerKey, packages });
    out['cold' + attempt] = 'opened';
    try { cold.state; out['coldState' + attempt] = 'ok'; } catch (e) { out['coldState' + attempt] = 'threw: ' + e.message; }
    try { cold.close(); } catch {}
  } catch (e) { out['cold' + attempt] = 'threw: ' + e.message; if (storage === 'sqlite') try { backend.close(); } catch {} }
}
console.log(JSON.stringify(out));
