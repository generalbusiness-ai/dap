import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { canonicalize as legacyCanonicalize, ZERO_HASH, type Json } from '../src/canon.ts';
import {
  canonicalize, parseCanonical, principalOf, publicKeyOf, signEvent, verifyEnvelope,
  envelopeBytes, envelopeId, headerPreimage, headerBytes, headerHash, signHeader,
  verifyHeader, encodeWire, decodeWire, verifyWire, type ActorEnvelope, type SignedHeader,
} from '../src/codec.ts';
import { SYSTEM_PREFIX, type EventBody, type Header } from '../src/types.ts';

interface Vector {
  name: string;
  body: EventBody;
  bodyBytes: string;
  bodyHash: string;
  envelope: ActorEnvelope;
  committed: string;
  commitment: string;
  headerPreimage: Header;
  headerPreimageBytes: string;
  headerHash: string;
  header: SignedHeader;
  headerBytes: string;
  wireLine: string;
}
const fixture = JSON.parse(readFileSync(new URL('./fixtures/codec-vectors.json', import.meta.url), 'utf8')) as {
  keys: Record<'actor' | 'writer' | 'other', { seed: string; principal: string }>;
  positive: Vector[];
  negative: { name: string; wireLine: string; error: string }[];
};
const key = (seed: string) => createPrivateKey({ key: Buffer.from('302e020100300506032b657004220420' + seed, 'hex'), type: 'pkcs8', format: 'der' });
const actor = key(fixture.keys.actor.seed);
const writer = key(fixture.keys.writer.seed);
const writerPrincipal = fixture.keys.writer.principal;
const genesis = fixture.positive.find(v => v.name === 'genesis')!;
const application = fixture.positive.find(v => v.name === 'application')!;
const attach = fixture.positive.find(v => v.name === 'attach')!;
const origin = fixture.positive.find(v => v.name === 'adopted-origin')!;
const expected = (v: Vector) => ({ genesis: v.header.genesis, position: v.header.position, prev: v.header.prev });
const sha = (s: string) => 'sha256:' + createHash('sha256').update(s, 'utf8').digest('hex');
const signedWire = (body: EventBody, hp: Header) => {
  const envelope = signEvent(body, actor);
  return { header: signHeader({ ...hp, commitment: envelopeId(envelope) }, writer), committed: envelopeBytes(envelope) };
};

test('test keys reproduce the independent RFC 8032 Ed25519 vector', () => {
  // https://www.rfc-editor.org/rfc/rfc8032#section-7.1, TEST 1.
  assert.equal(createPublicKey(actor).export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'),
    'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a');
  assert.equal(sign(null, Buffer.alloc(0), actor).toString('hex'),
    'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b');
  for (const item of Object.values(fixture.keys)) {
    assert.equal(principalOf(key(item.seed)), item.principal);
    assert.equal(principalOf(publicKeyOf(item.principal)), item.principal);
  }
});

test('fixed vectors pin each signed object, exact UTF-8 bytes, identity and signature', () => {
  // These expected values are checked in; no test derives them through the implementation.
  for (const v of fixture.positive) {
    assert.equal(canonicalize(v.body), v.bodyBytes, v.name);
    assert.equal(sha(v.bodyBytes), v.bodyHash);
    assert.deepEqual(signEvent(v.body, actor), v.envelope);
    assert.equal(envelopeBytes(v.envelope), v.committed);
    assert.equal(envelopeId(v.envelope), v.commitment);
    assert.equal(sha(v.committed), v.commitment);
    assert.deepEqual(verifyEnvelope(v.envelope), v.envelope);
    assert.deepEqual(verifyEnvelope(Buffer.from(v.committed)), v.envelope);
    assert.deepEqual(headerPreimage(v.header), v.headerPreimage);
    assert.equal(headerBytes(v.header), v.headerPreimageBytes);
    assert.equal(headerHash(v.header), v.headerHash);
    assert.equal(sha(v.headerPreimageBytes), v.headerHash);
    assert.deepEqual(signHeader(v.headerPreimage, writer), v.header);
    assert.equal(canonicalize(v.header), v.headerBytes);
    verifyHeader(v.header, writerPrincipal, expected(v));
    const w = { header: v.header, committed: v.committed };
    assert.equal(encodeWire(w), v.wireLine);
    assert.deepEqual(decodeWire(v.wireLine), w);
    assert.deepEqual(decodeWire(Buffer.from(v.wireLine.slice(0, -1))), w);
    const entry = verifyWire(v.wireLine, writerPrincipal, expected(v), { allowOrigin: v.name === 'adopted-origin' });
    assert.deepEqual(entry, { position: v.header.position, event: v.body, id: v.commitment, header: v.header, headerHash: v.headerHash, actorSig: v.envelope.sig, committed: v.committed });
    assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.event) && Object.isFrozen(entry.header));
  }
  assert.equal(genesis.header.genesis, genesis.commitment);
  assert.equal(genesis.header.prev, ZERO_HASH);
  for (let i = 1; i < fixture.positive.length; i++) {
    assert.equal(fixture.positive[i]!.header.prev, fixture.positive[i - 1]!.headerHash);
  }
});

for (const bad of fixture.negative) {
  test('fixed rejection vector: ' + bad.name, () => {
    assert.throws(() => verifyWire(bad.wireLine, writerPrincipal, expected(application)), { message: 'codec: ' + bad.error });
  });
}

test('canonical encoding supports RFC 8785 numbers, UTF-16 ordering and unnormalized strings', () => {
  // https://www.rfc-editor.org/rfc/rfc8785#section-3.2.2
  assert.equal(canonicalize([333333333.33333329, 1e30, 4.50, 2e-3, 1e-27, -0]), '[333333333.3333333,1e+30,4.5,0.002,1e-27,0]');
  assert.equal(canonicalize([Number.MIN_VALUE, Number.MAX_VALUE]), '[5e-324,1.7976931348623157e+308]');
  assert.equal(canonicalize({ '\ufb33': 7, '😀': 6, '€': 5, 'ö': 4, '\u0080': 3, '1': 2, '\r': 1 }), '{"\\r":1,"1":2,"\u0080":3,"ö":4,"€":5,"😀":6,"דּ":7}');
  assert.equal(canonicalize({ '2': false, '10': true }), '{"10":true,"2":false}');
  assert.equal(canonicalize({ b: [{ z: 1, a: 2 }], a: '\u000f\n\t/"\\' }), '{"a":"\\u000f\\n\\t/\\"\\\\","b":[{"a":2,"z":1}]}');
  assert.notEqual(canonicalize('é'), canonicalize('e\u0301'));
  assert.equal(canonicalize(JSON.parse('{"__proto__":{"x":1}}')), '{"__proto__":{"x":1}}');
  // O1 must not change the established visibility fixture's safe-integer rule.
  assert.throws(() => legacyCanonicalize(1.5), /safe integers/);
  assert.equal(legacyCanonicalize({ b: 2, a: 1 }), '{"a":1,"b":2}');
});

test('canonical encoding rejects lossy JS data, invalid Unicode and noncanonical byte inputs', () => {
  const cycle: Record<string, unknown> = {}; cycle.self = cycle;
  let getterRuns = 0;
  const getter = Object.defineProperty({}, 'a', { enumerable: true, get() { getterRuns++; return 1; } });
  const nonenumerable = Object.defineProperty({}, 'a', { value: 1 });
  const extended = [1] as number[] & { extra?: number }; extended.extra = 1;
  for (const value of [undefined, NaN, Infinity, -Infinity, 1n, () => 1, Symbol('x'), new Date(), { a: undefined }, [undefined], new Array(2), extended, { [Symbol('x')]: 1 }, getter, nonenumerable, cycle, '\ud800', '\udfff', { '\ud800': 1 }]) {
    assert.throws(() => canonicalize(value));
  }
  assert.equal(getterRuns, 0);
  for (const source of ['{"a":1,"a":1}', '{"a":1, "b":2}', '{"b":1,"a":2}', '1.0', '-0', '1e0', '1e999', '"\\u0061"', '"\\ud800"', ' {"a":1}', '{}\n', '\ufeff{}', 'null null']) {
    assert.throws(() => parseCanonical(source), source);
  }
  assert.throws(() => parseCanonical(Buffer.from([0x22, 0xff, 0x22])), /encoded data/);
  assert.throws(() => parseCanonical(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])));
  assert.deepEqual(parseCanonical('{"a":[true,null,2.5]}'), { a: [true, null, 2.5] });
});

test('principals and signatures have one exact encoding and must match their signing key', () => {
  assert.throws(() => signEvent(genesis.body, writer), /does not match/);
  assert.throws(() => signEvent(genesis.body, createPublicKey(actor)), /does not match/);
  const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey;
  assert.throws(() => principalOf(ec), /Ed25519/);
  assert.throws(() => signHeader(application.header, ec), /Ed25519/);
  for (const p of ['Alice', 'ed25519:', fixture.keys.actor.principal + '=', 'ed25519:' + 'A'.repeat(42), 'ed25519:' + 'A'.repeat(44), 'ed25519:' + 'A'.repeat(42) + 'B']) {
    assert.throws(() => publicKeyOf(p));
  }
  for (const sig of [application.envelope.sig + '=', application.envelope.sig.slice(1), 'A'.repeat(85) + 'B', '!' + application.envelope.sig.slice(1)]) {
    assert.throws(() => verifyEnvelope({ ...application.envelope, sig }));
  }
  assert.throws(() => verifyEnvelope(JSON.stringify(application.envelope, null, 2)), /noncanonical/);
  assert.throws(() => verifyEnvelope(canonicalize({ ...application.envelope, extra: 1 })), /forbidden field/);
});

test('body profile validates required and forbidden fields without interpreting the payload', () => {
  const bad: unknown[] = [
    { ...application.body, actor: 'alice' }, { ...application.body, nonce: 'short' },
    { ...application.body, nonce: 'A'.repeat(32) }, { ...application.body, genesis: 'elsewhere' },
    { ...application.body, action_id: '' }, { ...application.body, expected_binding: 'binding' },
    { ...application.body, expected_activation: -1 }, { ...application.body, expected_activation: 0.5 },
    { ...genesis.body, action_id: 'g' }, { ...genesis.body, expected_binding: application.body.expected_binding },
    { ...genesis.body, expected_activation: 0 }, { ...genesis.body, genesis: genesis.commitment },
    { ...attach.body, expected_binding: application.body.expected_binding }, { ...attach.body, expected_activation: 0 },
    { ...application.body, unexpected: true }, { ...application.body, kind: '' },
  ];
  for (const required of ['kind', 'payload', 'actor', 'nonce', 'action_id', 'expected_binding']) {
    const copy = { ...application.body } as Record<string, unknown>; delete copy[required]; bad.push(copy);
  }
  for (const body of bad) assert.throws(() => signEvent(body as EventBody, actor));
  // Opaque application fields and finite fractional payload numbers remain supported.
  verifyEnvelope(signEvent({ ...application.body, payload: { amount: 0.1, nested: [null, false] } }, actor));
});

test('header-only verification authenticates disclosure evidence and exposes no private fields', () => {
  const hp = { ...application.headerPreimage, position: 3, activation: 1 };
  const h = signHeader(hp, writer);
  const exp = { ...expected(application), position: 3 };
  verifyHeader(h, writerPrincipal, exp);
  assert.notEqual(headerHash(h), headerHash({ ...h, activation: 0 }));
  assert.throws(() => verifyHeader({ ...h, activation: 0 }, writerPrincipal, exp), /sequencer signature/);
  assert.throws(() => verifyHeader({ ...attach.header, requires: [] }, writerPrincipal, expected(attach)), /sequencer signature/);
  assert.equal(headerHash(h), headerHash({ ...h, seq_sig: genesis.header.seq_sig }));
  assert.throws(() => verifyHeader(application.headerPreimage, writerPrincipal, expected(application)), /missing required field/);
  assert.throws(() => verifyHeader(h, writerPrincipal, { ...exp, position: 4 }), /wrong position/);
  assert.throws(() => verifyHeader(h, writerPrincipal, { ...exp, genesis: ZERO_HASH }), /wrong genesis/);
  for (const field of ['kind', 'actor', 'audience', 'payload', 'nonce', 'recipients', 'expected_binding', 'other']) {
    assert.throws(() => signHeader({ ...hp, [field]: 'private' }, writer), /forbidden field/);
  }
  for (const change of [{ position: -1 }, { position: 1.5 }, { position: Number.MAX_SAFE_INTEGER + 1 }, { activation: 3 }, { activation: -1 }, { activation: 0.5 }, { prev: 'not a hash' }, { requires: [0] }]) {
    assert.throws(() => signHeader({ ...hp, ...change }, writer));
  }
  for (const requires of [[1, 0], [0, 0], [attach.header.position], [-1], [0.5], '0']) {
    assert.throws(() => signHeader({ ...attach.headerPreimage, requires } as Header, writer));
  }
});

test('wire verification enforces genesis identity, destinations, origin opt-in and evidence placement', () => {
  assert.throws(() => signHeader({ ...genesis.headerPreimage, commitment: ZERO_HASH }, writer), /genesis header/);
  assert.throws(() => signHeader({ ...genesis.headerPreimage, prev: genesis.commitment }, writer), /genesis header/);
  assert.throws(() => signHeader({ ...genesis.headerPreimage, requires: [] }, writer), /genesis header/);
  assert.throws(() => verifyWire(origin.wireLine, writerPrincipal, expected(origin)), /explicit adoption/);
  const anotherDestination = signedWire({ ...application.body, genesis: ZERO_HASH }, application.headerPreimage);
  assert.throws(() => verifyWire(anotherDestination, writerPrincipal, expected(application)), /wrong genesis/);
  const laterGenesis = signedWire(genesis.body, attach.headerPreimage);
  assert.throws(() => verifyWire(laterGenesis, writerPrincipal, expected(attach), { allowOrigin: true }), /only occupy position zero/);
  const originEnvelope = signEvent(origin.body, actor);
  const id = envelopeId(originEnvelope);
  const falseGenesis = { header: signHeader({ genesis: id, position: 0, prev: ZERO_HASH, commitment: id }, writer), committed: envelopeBytes(originEnvelope) };
  assert.throws(() => verifyWire(falseGenesis, writerPrincipal, { genesis: id, position: 0, prev: ZERO_HASH }), /must contain genesis/);
  const systemActivation = signedWire(attach.body, { ...application.headerPreimage, activation: 0 });
  assert.throws(() => verifyWire(systemActivation, writerPrincipal, expected(application)), /system header carries activation/);
  const appRequirements = signedWire(application.body, attach.headerPreimage);
  assert.throws(() => verifyWire(appRequirements, writerPrincipal, expected(attach)), /application header carries requirements/);
  const otherSystem = signedWire({ ...attach.body, kind: SYSTEM_PREFIX + 'observe' }, attach.headerPreimage);
  assert.throws(() => verifyWire(otherSystem, writerPrincipal, expected(attach)), /non-attach/);
  const originEvidence = signedWire(origin.body, application.headerPreimage);
  assert.throws(() => verifyWire(originEvidence, writerPrincipal, expected(application), { allowOrigin: true }), /origin header carries/);
  // Missing resolution evidence is a semantic refusal, not malformed wire data.
  const { requires: _requires, ...noRequirements } = attach.headerPreimage;
  verifyWire(signedWire(attach.body, noRequirements), writerPrincipal, expected(attach));
  const { activation: _activation, ...noActivation } = application.headerPreimage;
  verifyWire(signedWire(application.body, noActivation), writerPrincipal, expected(application));
});

test('wire framing is canonical and decoded entries are independent frozen snapshots', () => {
  for (const input of [application.wireLine + '\n', application.wireLine.replace(/\n$/, '\r\n'), application.wireLine + genesis.wireLine, ' ' + application.wireLine]) {
    assert.throws(() => decodeWire(input));
  }
  const badShape = [
    { header: application.header, committed: application.envelope },
    { header: application.header, committed: JSON.stringify(application.envelope, null, 2) },
    { header: application.header, committed: application.committed, extra: 1 },
  ];
  for (const value of badShape) assert.throws(() => decodeWire(canonicalize(value)));
  const copy = structuredClone(application.envelope);
  const verified = verifyEnvelope(copy);
  (copy.body.payload as Record<string, Json>).amount = 99;
  assert.equal((verified.body.payload as Record<string, Json>).amount, 12.5);
  assert.ok(Object.isFrozen(verified.body.payload));
});
