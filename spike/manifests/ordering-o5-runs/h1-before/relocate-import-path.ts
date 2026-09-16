// Can a control-signed seal naming head commitment C (position 2) be accepted at a later position?
// The writer re-sequences C as a header-only entry (duplicate commitment) after inserting D.
import * as cryptoMod from 'node:crypto';
const SRC = "/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/dap-o5-h1-before.yw9rirb4/";
const { envelopeBytes, envelopeId, headerHash, principalOf, signEvent, signHeader } = await import(SRC + 'codec.ts');
const { verifyControlSpine } = await import(SRC + 'control-verifier.ts');
const Z = 'sha256:' + '0'.repeat(64), P = 'ai.generalbusiness.dap.', SEQ = P + 'seq.';
const K = (n: number) => cryptoMod.createPrivateKey({ key: Buffer.from('302e020100300506032b657004220420' + n.toString(16).padStart(2, '0').repeat(32), 'hex'), format: 'der', type: 'pkcs8' });
const W0 = K(0x31), CTL = K(0x32), W1 = K(0x33), APP = K(0x35); const id = principalOf;
const genv = signEvent({ kind: P + 'genesis', payload: { sequencing: { profile: 'dap.fixture.single-writer/2', writer: id(W0), control: id(CTL) } }, actor: id(APP), nonce: 'ff'.repeat(16) }, APP);
const G = envelopeId(genv);
const entries: any[] = []; let prev: any = signHeader({ genesis: G, position: 0, prev: Z, commitment: G }, W0);
const proof = { pinnedGenesis: G, genesis: { header: prev, committed: envelopeBytes(genv) }, entries };
function push(commitment: string, committed?: string) { const h = signHeader({ genesis: G, position: entries.length + 1, prev: headerHash(prev), commitment }, W0); entries.push({ header: h, ...(committed ? { committed } : {}) }); prev = h; }
const hid = (tag: string) => 'sha256:' + cryptoMod.createHash('sha256').update(tag).digest('hex');
push(hid('A'));            // 1
const C = hid('C'); push(C); // 2  -- control observes head C at position 2 and signs a seal
const sealEnv = signEvent({ kind: SEQ + 'seal', payload: { epoch: 0, predecessor: C }, actor: id(CTL), nonce: 'aa'.repeat(16), genesis: G, action_id: 'seal' }, CTL);
push(hid('D'));            // 3  writer inserts D
push(C);                   // 4  writer re-sequences commitment C (duplicate)
push(envelopeId(sealEnv), envelopeBytes(sealEnv)); // 5 seal
const assignEnv = signEvent({ kind: SEQ + 'assign', payload: { epoch: 1, predecessor: envelopeId(sealEnv), writer: id(W1) }, actor: id(CTL), nonce: 'bb'.repeat(16), genesis: G, action_id: 'assign' }, CTL);
push(envelopeId(assignEnv), envelopeBytes(assignEnv)); // 6
try { const r = verifyControlSpine(proof as any); console.log('ACCEPT seal intended after position 2 accepted at position', 5, JSON.stringify({ epoch: r.epoch, sealed: r.sealed, head: r.head.position, assignments: r.assignments.map(a => a.firstPosition), dupCommitmentPositions: [2, 4] })); }
catch (e: any) { console.log('REJECT', e.message); }
