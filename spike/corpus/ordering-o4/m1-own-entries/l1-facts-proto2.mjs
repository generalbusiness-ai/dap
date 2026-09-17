// F genesis whose S source export carries an own "__proto__" facts key (genesis-author input).
const R = process.env.WT + '/spike/';
const { buildThrough } = await import(R + 'fixtures/ordering-lifecycle-runner.ts');
const { scopeId } = await import(R + 'src/scope-profile.ts');
const storage = process.argv[2] ?? 'memory';
const w = buildThrough('delivery-started', {}, storage);
const out = {};
try {
  const S = w.contexts.S.export(['R_fulfil']), D = w.contexts.D.export(['R_deliver']);
  const facts = JSON.parse(JSON.stringify(S.facts)); Object.defineProperty(facts, '__proto__', { value: { extra: 'x' }, enumerable: true, writable: true, configurable: true });
  const { identity, ...pre } = { ...S, facts };
  const S2 = { ...pre, identity: scopeId(pre) };
  out.ownProtoKey = Object.hasOwn(S2.facts, '__proto__');
  w.describeDestination({ S: S2, D });
  w.exports.S = S; // release the real export
  const rs = w.release('S', 'alice', 'R_fulfil', S), rd = w.release('D');
  out.releases = [rs.verdict ?? rs, rd.verdict ?? rd];
  try { w.startDestination(); out.started = true; } catch (e) { out.started = 'threw ' + e.message; }
  if (out.started === true) {
    const st = w.contexts.F.state; out.factsState = st.facts;
    const a = w.activate([w.proof('S', rs.header.position), w.proof('D', rd.header.position)]);
    out.activation = a.verdict ?? a;
  }
} catch (e) { out.threw = String(e.stack ?? e); }
finally { try { w.close(); } catch {} }
console.log(JSON.stringify(out));
