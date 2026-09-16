// K3 residual: an ordinary D member (Bob, the buyer) submits a listed Sale kind that
// D does not bind. The attempt is actor-only with verdict known:false/unhandled, so D
// can never certify again, while Kim's later release of R_deliver stays effective.
const R = (process.env.WT ?? '../o4r2-member') + '/spike/';
const { buildThrough, keys, principals: P, normalize } = await import(R + 'fixtures/ordering-lifecycle-runner.ts');
const { signEvent, envelopeBytes } = await import(R + 'src/codec.ts');
const storage = process.argv[2] ?? 'memory';
const kind = process.argv[3] ?? 'com.example.sale.offer';
const actor = process.argv[4] ?? 'bob';
const w = buildThrough('delivery-started', {}, storage);
const out = { storage, kind, actor };
try {
  const d = w.contexts.D;
  const body = { kind, payload: { offer_id: 'o9' }, actor: P[actor], nonce: '1'.repeat(32), genesis: d.journal.context.genesisId, action_id: 'strand', expected_binding: 'sha256:' + '0'.repeat(64) };
  const r = d.submit(envelopeBytes(signEvent(body, keys[actor])), d.journal.context.credentialFor(P[actor]));
  out.attempt = { pos: r.header.position, verdict: r.verdict, audience: normalize(d.journal.context.state.audiences[r.header.position]) };
  w.describeDestination();
  const rel = w.release('D'); out.releaseD = { pos: rel.header.position, verdict: rel.verdict };
  w.release('S');
  w.restart('D');
  for (let f = 0; f <= w.contexts.D.journal.context.head; f++) { try { w.contexts.D.proof(f); out['frontier' + f] = 'certifiable'; } catch (e) { out['frontier' + f] = e.message; } }
  w.startDestination();
  try { const a = w.activate([w.proof('S', 24), { source: w.contexts.D.proof(), release: rel.header.position }]); out.activation = a.verdict; } catch (e) { out.activation = 'cannot build D proof: ' + e.message; }
  const snap = w.snapshot(); out.rights = snap.rights.R_deliver;
} catch (e) { out.threw = e.message; } finally { try { w.close(); } catch {} }
console.log(JSON.stringify(out));
