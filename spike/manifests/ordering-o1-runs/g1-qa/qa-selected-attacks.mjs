// Selected verbatim L1/L1s/L5 blocks; OUT redirected to isolated QA directory.
// Lease attacks at a chosen tree. Usage: node attacks.mjs <spike root>
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
const SRC = process.argv[2].replace(/\/?$/, '/');
const OUT = '/tmp/dap-o1-g1-qa.W6WFtP';
const { MemoryBackend } = await import(SRC + 'src/append.ts');
const C = await import(SRC + 'src/codec.ts');
const { Journal, O1_PROFILE_VERSION } = await import(SRC + 'src/journal.ts');
const { SQLiteBackend } = await import(SRC + 'src/sqlite.ts');
const { Context } = await import(SRC + 'src/context.ts');
const { checkContext } = await import(SRC + 'src/checker.ts');
const { CAP, K } = await import(SRC + 'src/foundation.ts');
const { acceptance, act, createJournal, keys, packages, people } = await import(SRC + 'test/fixtures/o1-fixture.ts');
const N = ps => ps.map(p => Object.keys(people).find(n => people[n] === p));
const opts = { writer: people.writer, profile: O1_PROFILE_VERSION };
const newPath = tag => join(mkdtempSync(join(OUT, 'atk-' + tag + '-')), 'journal.db');
const enc = { prepare(event, proof) { const e = C.verifyEnvelope(proof); return { id: C.envelopeId(e), actorSig: e.sig, committed: C.envelopeBytes(e) }; }, sign: h => C.signHeader(h, keys.writer) };
const T = (label, fn) => { try { const r = fn(); console.log('  ' + label.padEnd(64), r === undefined ? 'ok' : r); } catch (e) { console.log('  ' + label.padEnd(64), 'THREW: ' + e.message); } };
const inviteBob = (ctx, tok, signed = true) => { const ev = ctx.intent(people.alice, K.invite, { invitee: people.bob, grants: { principal: people.bob, roles: ['Buyer'] }, token_id: tok }, { action_id: tok }); const s = C.signEvent(ev, keys.alice); return ctx.submit(ev, ctx.credentialFor(people.alice), signed ? s : undefined); };
const acceptBob = (ctx, pos, id) => { const ev = ctx.intent(people.bob, K.accept_invite, ctx.inviteEnvelope(pos), { action_id: id }); return ctx.submit(ev, undefined, C.signEvent(ev, keys.bob)); };
const show = r => r.refused ? JSON.stringify(r) : 'pos ' + r.header.position + ' ' + JSON.stringify(r.verdict);
const revokeAlice = j => act(j, 'alice', K.revoke, { principal: people.alice, capabilities: [CAP.invite] });
const reopen = (backend) => { try { const j = Journal.open({ backend, writerKey: keys.writer, packages }); const s = 'reopened head ' + j.context.head + ' participants ' + JSON.stringify(N(j.context.state.participants)) + ' checker ' + checkContext(j.context).length; return [j, s]; } catch (e) { return [undefined, 'REOPEN FAILED: ' + e.message]; } };

console.log('source', SRC);
console.log('\n== L1 pre-existing raw Context, then Journal owns, then Journal closes (memory)');
for (const withEnc of [false, true]) {
  const m = new MemoryBackend(); createJournal(m).close();
  const raw = withEnc ? Context.restore(m, packages, 65536, enc) : Context.restore(m, packages);
  const J = Journal.open({ backend: m, writerKey: keys.writer, packages });
  console.log(' raw encoding supplied:', withEnc);
  T('J revokes alice invite', () => JSON.stringify(revokeAlice(J).verdict));
  T('raw.submit invite while J owns', () => show(inviteBob(raw, 'l1-owned-' + withEnc)));
  T('raw stale read: raw.head / raw grants for alice at 2', () => 'head ' + raw.head + ' verdictAt(2) ' + JSON.stringify(raw.verdictAt(2)) + ' view(alice)[2].via ' + raw.view(people.alice)[2].via);
  J.close();
  let inv;
  T('after J.close: raw.submit stale invite', () => show(inv = inviteBob(raw, 'l1-after-' + withEnc)));
  if (inv && !inv.refused) T('after J.close: raw accept bob', () => show(acceptBob(raw, inv.header.position, 'l1-acc-' + withEnc)) + ' raw participants ' + JSON.stringify(N(raw.state.participants)));
  const [j2, s] = reopen(m); console.log('  cold Journal.open:', s, j2 && inv && !inv.refused ? 'cold invite verdict ' + JSON.stringify(j2.context.verdictAt(inv.header.position)) : ''); j2?.close();
}
console.log('\n== L1s pre-existing raw Context on SQLite, Journal owns then closes');
{
  const p = newPath('l1s'); let b = new SQLiteBackend(p, opts); createJournal(b).close(); b = new SQLiteBackend(p, opts);
  const raw = Context.restore(b, packages, 65536, enc);
  const J = Journal.open({ backend: b, writerKey: keys.writer, packages }); revokeAlice(J); J.close();
  T('after J.close: raw.submit stale invite (same handle)', () => show(inviteBob(raw, 'l1s')));
  T('raw.head read after close', () => String(raw.head));
}
console.log('\n== L5 fold-phase error (entries() throws once after commit) and lost reply, Journal vs raw Context');
{
  let arm = 0;
  class FoldFault extends MemoryBackend { entries() { if (arm === 1) { arm = 0; throw new Error('injected fold-phase read error'); } return super.entries(); } commit(...a) { super.commit(...a); if (arm === 2) arm = 1; if (arm === 3) { arm = 0; throw new Error('lost reply'); } } }
  for (const via of ['Journal.submit', 'Context.submit']) {
    const m = new FoldFault(); const J = createJournal(m);
    const ev = C.signEvent(J.context.intent(people.alice, K.revoke, { principal: people.alice, capabilities: [CAP.invite] }, { action_id: 'l5-rev' }), keys.alice);
    arm = 2;
    T(via + ': revoke with fold-phase error', () => { const r = via === 'Journal.submit' ? J.submit(ev, J.context.credentialFor(people.alice)) : J.context.submit(ev.body, J.context.credentialFor(people.alice), ev); return 'no error ' + show(r); });
    T(via + ': committed head', () => String(m.head().position));
    T(via + ': stale invite through J.submit', () => show(act(J, 'alice', K.invite, { invitee: people.bob, grants: { principal: people.bob, roles: ['Buyer'] }, token_id: 'l5' }, 'l5-inv')));
    T(via + ': stale invite through J.context.submit', () => show(inviteBob(J.context, 'l5b')));
    T(via + ': Journal.open before close', () => { Journal.open({ backend: m, writerKey: keys.writer, packages }); return 'OPENED'; });
    J.close();
    const cold = Journal.open({ backend: m, writerKey: keys.writer, packages });
    const r = cold.submit(ev); console.log('  ' + via + ': cold retry replay', r.replay, 'hash same', r.headerHash === m.get(2).headerHash, 'verdict', JSON.stringify(r.verdict), 'head', cold.context.head, 'participants', JSON.stringify(N(cold.context.state.participants)));
    console.log('  ' + via + ': cold fresh invite', JSON.stringify(act(cold, 'alice', K.invite, { invitee: people.bob, grants: { principal: people.bob, roles: ['Buyer'] }, token_id: 'l5c' }, 'l5c').verdict)); cold.close();
  }
  // raw (unowned) Context: lost reply then continue
  const m = new FoldFault(); createJournal(m).close();
  const raw = Context.restore(m, packages, 65536, enc);
  const ev = raw.intent(people.alice, K.revoke, { principal: people.alice, capabilities: [CAP.invite] }, { action_id: 'l5raw-rev' });
  arm = 3;
  T('raw unowned Context: revoke with lost reply', () => show(raw.submit(ev, raw.credentialFor(people.alice), C.signEvent(ev, keys.alice))));
  let inv; T('raw unowned Context: stale invite after lost reply', () => show(inv = inviteBob(raw, 'l5raw')));
  if (inv && !inv.refused) T('raw unowned Context: accept', () => show(acceptBob(raw, inv.header.position, 'l5raw-acc')) + ' raw participants ' + JSON.stringify(N(raw.state.participants)));
  const [j2, s] = reopen(m); console.log('  raw unowned cold:', s, j2 && inv && !inv.refused ? 'invite verdict ' + JSON.stringify(j2.context.verdictAt(inv.header.position)) : ''); j2?.close();
}
