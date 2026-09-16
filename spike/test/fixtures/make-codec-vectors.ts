// Explicit regeneration tool, never imported by tests. Test-only RFC 8032
// seeds; none of these keys may be used for a real participant or writer.
// This small reference encoder deliberately does not import src/codec.ts.
import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const seeds = {
  actor: '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60',
  writer: '4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb',
  other: 'c5aa8df43f9f837bedb7442f31dcb7b166d38535076f094b85ce3a2e0b4458f7',
};
const privateKey = (seed: string) => createPrivateKey({ key: Buffer.from('302e020100300506032b657004220420' + seed, 'hex'), type: 'pkcs8', format: 'der' });
const principal = (seed: string) => 'ed25519:' + createPublicKey(privateKey(seed)).export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64url');
const keys = Object.fromEntries(Object.entries(seeds).map(([role, seed]) => [role, { seed, principal: principal(seed) }]));
function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  const o = v as Record<string, unknown>;
  return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
}
const hash = (s: string) => 'sha256:' + createHash('sha256').update(s).digest('hex');
const signature = (s: string, seed: string) => sign(null, Buffer.from(s), privateKey(seed)).toString('base64url');
const zero = 'sha256:' + '0'.repeat(64);
const vectors: Record<string, any>[] = [];
function add(name: string, body: Record<string, unknown>, evidence: Record<string, unknown> = {}) {
  const bodyBytes = canonical(body);
  const envelope = { body, sig: signature(bodyBytes, seeds.actor) };
  const committed = canonical(envelope);
  const commitment = hash(committed);
  const hp = { genesis: vectors[0]?.commitment ?? commitment, position: vectors.length, prev: vectors.at(-1)?.headerHash ?? zero, commitment, ...evidence };
  const hpBytes = canonical(hp);
  const header = { ...hp, seq_sig: signature(hpBytes, seeds.writer) };
  const wire = { header, committed };
  vectors.push({ name, body, bodyBytes, bodyHash: hash(bodyBytes), envelope, committed, commitment, headerPreimage: hp, headerPreimageBytes: hpBytes, headerHash: hash(hpBytes), header, headerBytes: canonical(header), wireLine: canonical(wire) + '\n' });
}
const originBody = { kind: 'example.origin', payload: { title: 'signed before genesis' }, actor: principal(seeds.actor), nonce: '303132333435363738393a3b3c3d3e3f' };
add('genesis', { kind: 'ai.generalbusiness.dap.genesis', payload: { label: 'codec vector', profile: 'dap.fixture.ts/1', origins: [originBody] }, actor: principal(seeds.actor), nonce: '000102030405060708090a0b0c0d0e0f' });
add('adopted-origin', originBody);
add('application', { kind: 'example.bid', payload: { amount: 12.5, note: 'café\n😀' }, actor: principal(seeds.actor), nonce: '101112131415161718191a1b1c1d1e1f', genesis: vectors[0]!.commitment, action_id: 'bid:1', expected_binding: 'sha256:' + 'a'.repeat(64), expected_activation: 0 }, { activation: 0 });
add('attach', { kind: 'ai.generalbusiness.dap.attach', payload: { package: 'sha256:' + 'b'.repeat(64) }, actor: principal(seeds.actor), nonce: '202122232425262728292a2b2c2d2e2f', genesis: vectors[0]!.commitment, action_id: 'attach:1' }, { requires: [0] });
const application = vectors.find(v => v.name === 'application')!;
const negative: Record<string, unknown>[] = [];
function reject(name: string, wire: unknown, error: string) { negative.push({ name, wireLine: canonical(wire) + '\n', error }); }
const tampered = structuredClone(application.envelope);
tampered.body.payload.amount = 13;
reject('tampered body', { header: application.header, committed: canonical(tampered) }, 'invalid actor signature');
const wrongBytes = structuredClone(application.envelope);
wrongBytes.sig = signature(JSON.stringify(wrongBytes.body, null, 2), seeds.actor);
reject('actor signs noncanonical bytes', { header: application.header, committed: canonical(wrongBytes) }, 'invalid actor signature');
const changedPrev = { ...application.headerPreimage, prev: 'sha256:' + 'c'.repeat(64) };
reject('wrong prev, correctly signed', { header: { ...changedPrev, seq_sig: signature(canonical(changedPrev), seeds.writer) }, committed: application.committed }, 'wrong prev');
const changedCommitment = { ...application.headerPreimage, commitment: 'sha256:' + 'd'.repeat(64) };
reject('wrong commitment, correctly signed', { header: { ...changedCommitment, seq_sig: signature(canonical(changedCommitment), seeds.writer) }, committed: application.committed }, 'wrong commitment');
reject('unassigned sequencer key', { header: { ...application.headerPreimage, seq_sig: signature(application.headerPreimageBytes, seeds.other) }, committed: application.committed }, 'invalid sequencer signature');
reject('sequencer signs full header bytes', { header: { ...application.headerPreimage, seq_sig: signature(application.headerBytes, seeds.writer) }, committed: application.committed }, 'invalid sequencer signature');

writeFileSync(new URL('./codec-vectors.json', import.meta.url), JSON.stringify({ description: 'O1 fixed canonical UTF-8 bytes, SHA-256 identities and unpadded base64url Ed25519 signatures. Public test keys from RFC 8032; regenerate explicitly with make-codec-vectors.ts.', keys, positive: vectors, negative }, null, 2) + '\n');
