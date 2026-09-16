// (1) File-level rollback: restore an older copy of the SQLite file and reopen (out of the declared scope; informational).
// (2) Per-append cost as the journal grows. Usage: node rollback-bench.mjs <spike root>
import { mkdtempSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
const SRC = process.argv[2].replace(/\/?$/, '/');
const OUT = '/private/tmp/claude-501/-Users-hughpyle-play-dap/55890269-4b7b-4cda-8c2b-ab7134ad403a/scratchpad/o2-repros';
const { Journal, O1_PROFILE_VERSION } = await import(SRC + 'src/journal.ts');
const { SQLiteBackend } = await import(SRC + 'src/sqlite.ts');
const { MemoryBackend } = await import(SRC + 'src/append.ts');
const C = await import(SRC + 'src/codec.ts');
const { SALE } = await import(SRC + 'fixtures/sale.ts');
const { acceptance, createJournal, invite, keys, packages, people } = await import(SRC + 'test/fixtures/o1-fixture.ts');
const offer = (j, id) => j.submit(C.envelopeBytes(C.signEvent(j.context.intent(people.bob, SALE + 'offer', { offer_id: id }, { action_id: id }), keys.bob)), j.context.credentialFor(people.bob));
if (process.argv[3] !== 'bench') {
  const dir = mkdtempSync(join(OUT, 'rollback-')), path = join(dir, 'journal.db'), copy = join(dir, 'old.db');
  const sq = () => new SQLiteBackend(path, { writer: people.writer, profile: O1_PROFILE_VERSION });
  let b = sq(), j = createJournal(b);
  j.submit(C.envelopeBytes(acceptance(j, 'bob', invite(j, 'bob'))));
  offer(j, 'a'); j.close(); copyFileSync(path, copy);
  b = sq(); j = Journal.open({ backend: b, writerKey: keys.writer, packages });
  const bBytes = C.envelopeBytes(C.signEvent(j.context.intent(people.bob, SALE + 'offer', { offer_id: 'b' }, { action_id: 'b' }), keys.bob)); const r = j.submit(bBytes, j.context.credentialFor(people.bob)); const hashB = r.headerHash; j.close();
  copyFileSync(copy, path);
  b = sq();
  try { j = Journal.open({ backend: b, writerKey: keys.writer, packages }); const r2 = offer(j, 'c');
    console.log('file rollback accepted on open; position', r.header.position, 'reused by different entry:', r2.header.position === r.header.position && r2.headerHash !== hashB, '; exact retry of acknowledged b after rollback ->', JSON.stringify((x => x.refused ? x : { position: x.header.position, replay: x.replay, sameHash: x.headerHash === hashB })(j.submit(bBytes, j.context.credentialFor(people.bob))))); j.close(); }
  catch (e) { console.log('file rollback detected:', e.message); }
} else {
  for (const storage of ['memory', 'sqlite']) {
    const dir = mkdtempSync(join(OUT, 'bench-'));
    const b = storage === 'memory' ? new MemoryBackend() : new SQLiteBackend(join(dir, 'j.db'), { writer: people.writer, profile: O1_PROFILE_VERSION });
    const j = createJournal(b); j.submit(C.envelopeBytes(acceptance(j, 'bob', invite(j, 'bob'))));
    const marks = [];
    let n = 0; for (const target of [100, 400, 1000]) { const t0 = performance.now(); let k = 0; while (j.context.entries.length < target) { offer(j, 'o' + n++); k++; } const t1 = performance.now(); for (let i = 0; i < 20; i++) offer(j, 'm' + n++); marks.push(`${target}: ${((performance.now() - t1) / 20).toFixed(2)} ms/append`); }
    console.log(storage, marks.join('; '));
    j.close();
  }
}
