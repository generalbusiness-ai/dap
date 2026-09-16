// An ordinary S member appends one unauthorized or malformed public-kind attempt.
// Question: can Alice still transfer R_fulfil to F afterwards?
import { buildThrough, normalize } from '../o4-proof/spike/fixtures/ordering-lifecycle-runner.ts';
import { K } from '../o4-proof/spike/src/foundation.ts';
import { SALE } from '../o4-proof/spike/fixtures/sale.ts';
const storage = (process.argv[2] ?? 'memory') as 'memory' | 'sqlite';
const attempts: [string, string, string, any][] = [
  ['bob unauthorized sale.accept', 'bob', SALE + 'accept', { offer_id: 'o3' }],
  ['carol malformed grant payload', 'carol', K.grant, { nope: true }],
  ['bob sale.close without capability', 'bob', SALE + 'close', { outcome: 'x' }],
];
for (const [label, actor, kind, payload] of attempts) {
  const w = buildThrough('writer-continued', {}, storage);
  try {
    const r: any = w.emit('S', actor as any, kind, payload);
    const pos = r.header.position;
    console.log(label, '-> S' + pos, 'verdict', JSON.stringify(r.verdict ?? w.contexts.S!.journal.context.state.verdicts[pos]), 'audience', JSON.stringify(normalize(w.contexts.S!.journal.context.state.audiences[pos])));
    w.startDelivery(); w.describeDestination();
    const rel: any = w.release('S'); console.log('  alice release at S' + rel.header.position, JSON.stringify(rel.verdict));
    w.release('D'); w.startDestination();
    try { const p = w.contexts.S!.proof(); console.log('  S proof produced, frontier', p.frontier); }
    catch (e: any) { console.log('  S proof producer:', e.constructor.name, e.message); }
    for (let f = pos - 1; f <= w.contexts.S!.journal.context.head; f++) { try { w.contexts.S!.proof(f); console.log('  frontier', f, 'certifiable'); } catch (e: any) { console.log('  frontier', f, 'refused:', e.message); } }
  } finally { w.close(); }
}
