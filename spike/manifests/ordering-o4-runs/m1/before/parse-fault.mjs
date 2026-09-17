const root = process.env.WT + '/spike/';
const { buildThrough, keys, principals, packages } = await import(root + 'fixtures/ordering-lifecycle-runner.ts');
const { ScopeJournal } = await import(root + 'src/scope.ts');
const { SQLiteBackend } = await import(root + 'src/sqlite.ts');
const { verifyPublicProof } = await import(root + 'src/scope-proof.ts');
const original = JSON.parse, failure = new Error('unexpected parser fault');
let armed = false, consumed = false;
JSON.parse = function (...args) {
  if (armed && /parseCanonical/.test(new Error().stack)) { armed = false; consumed = true; throw failure; }
  return Reflect.apply(original, JSON, args);
};
for (const storage of ['memory', 'sqlite']) {
  const world = buildThrough('writer-continued', {}, storage), s = world.contexts.S;
  const backend = s.journal.context.backend, seq = { writer: s.journal.ordering.initialWriter, profile: s.journal.ordering.profile }, packet = s.proof();
  s.close();
  const reopen = () => storage === 'sqlite' ? new SQLiteBackend(world.paths.S, seq) : backend;
  const b = reopen(); let opened;
  armed = true; consumed = false;
  try { opened = ScopeJournal.open({ backend: b, writerKey: keys.W1, packages }); console.log(storage, 'open returned'); }
  catch (e) { console.log(storage, 'open', e === failure ? 'original' : 'converted ' + String(e), 'consumed', consumed); }
  finally { armed = false; if (opened) opened.close(); else if (storage === 'sqlite') b.close(); }
  armed = true; consumed = false;
  try { verifyPublicProof(packet, { genesis: packet.genesis, initialWriter: packet.initialWriter }, packages); console.log(storage, 'proof returned'); }
  catch (e) { console.log(storage, 'proof', e === failure ? 'original' : 'converted ' + String(e), 'consumed', consumed); }
  finally { armed = false; }
  const cold = ScopeJournal.open({ backend: reopen(), writerKey: keys.W1, packages }); cold.close(); world.close();
}
JSON.parse = original;
