import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { test } from 'node:test';
import { join } from 'node:path';
import { buildThrough, keys, principals, packages } from '../fixtures/ordering-lifecycle-runner.ts';
import { MemoryBackend, type Backend } from '../src/append.ts';
import { SQLiteBackend } from '../src/sqlite.ts';
import { ScopeJournal } from '../src/scope.ts';
import { verifyPublicProof } from '../src/scope-proof.ts';
import { O1_PROFILE_VERSION } from '../src/journal.ts';
import { K, verifyIssuance, issuanceEvidence } from '../src/foundation.ts';
import { envelopeBytes, signEvent, isCodecValidationError } from '../src/codec.ts';
import { isCanonicalValidationError, type Json } from '../src/canon.ts';
import { ALICE, BOB, invite, saleContext } from './helpers.ts';

// Only crypto reached from verifyIssuance is swept. Hash methods are included
// in the direct verifier matrix; the end-to-end matrix covers hash/key calls.
function probe(includeHashMethods = false, signatures = false) {
  const originals = { createHash: crypto.createHash, createPublicKey: crypto.createPublicKey, verify: crypto.verify, sign: crypto.sign };
  const state = { armed: false, failAt: -1, count: 0, value: undefined as unknown, sites: [] as string[] };
  function hit(name: string) {
    if (!state.armed) return;
    if (signatures ? name !== 'verify' && name !== 'sign' : !/verifyIssuance/.test(new Error().stack ?? '')) return;
    state.sites.push(name);
    if (++state.count === state.failAt) throw state.value;
  }
  crypto.createPublicKey = ((...args: Parameters<typeof crypto.createPublicKey>) => {
    hit('createPublicKey'); return originals.createPublicKey(...args);
  }) as typeof crypto.createPublicKey;
  crypto.createHash = ((...args: Parameters<typeof crypto.createHash>) => {
    hit('createHash'); const hash = originals.createHash(...args);
    if (includeHashMethods) {
      const update = hash.update.bind(hash), digest = hash.digest.bind(hash);
      hash.update = ((...args: Parameters<typeof hash.update>) => { hit('update'); return update(...args); }) as typeof hash.update;
      hash.digest = ((...args: Parameters<typeof hash.digest>) => { hit('digest'); return digest(...args); }) as typeof hash.digest;
    }
    return hash;
  }) as typeof crypto.createHash;
  crypto.verify = ((...args: Parameters<typeof crypto.verify>) => { hit('verify'); return Reflect.apply(originals.verify, crypto, args); }) as typeof crypto.verify;
  crypto.sign = ((...args: Parameters<typeof crypto.sign>) => { hit('sign'); return Reflect.apply(originals.sign, crypto, args); }) as typeof crypto.sign;
  syncBuiltinESMExports();
  return {
    state,
    run<T>(fn: () => T, failAt = -1, value?: unknown): T {
      state.count = 0; state.sites = []; state.failAt = failAt; state.value = value; state.armed = true;
      try { return fn(); } finally { state.armed = false; }
    },
    close() { Object.assign(crypto, originals); syncBuiltinESMExports(); },
  };
}

// This negative type check fails compilation if callers can wrap a legacy,
// non-strict Journal. Runtime construction is through create/open above.
if (false) {
  // @ts-expect-error ScopeJournal constructor is private.
  new ScopeJournal(null as never, packages, keys.W0);
}
function faultValues(): unknown[] {
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  return [new Error('unexpected issuance failure'), new TypeError('codec: invalid actor signature'),
    new TypeError('canonicalize: only safe integers are allowed, got 0.5'),
    { fault: 'unexpected object' }, 'unexpected string', undefined, null, revoked.proxy];
}
function sameThrow(fn: () => unknown, expected: unknown, label?: string) {
  assert.throws(fn, error => Object.is(error, expected), label);
}

for (const storage of ['memory', 'sqlite'] as const) test('O4 R2 every issuance hash/key fault rejects cold open and preserves healthy replay: ' + storage, t => {
  const world = buildThrough('sale-accepted', {}, storage), original = world.contexts.S!;
  const backend = original.journal.context.backend, ordering = original.journal.ordering;
  const accept = original.journal.context.entries.find(e => e.event.kind === K.accept_invite && e.event.actor === principals.bob)!;
  const envelope = world.envelopes.get('S@' + accept.position)!;
  original.close();
  const reopen = () => storage === 'sqlite' ? new SQLiteBackend(world.paths.S!, { writer: ordering.initialWriter, profile: ordering.profile }) : backend;
  const instrumentation = probe();
  try {
    const healthy = instrumentation.run(() => ScopeJournal.open({ backend: reopen(), writerKey: keys.W0, packages }));
    const sites = [...instrumentation.state.sites]; healthy.close();
    assert.ok(sites.includes('createHash') && sites.includes('createPublicKey'));
    const cases: { at: number; value: unknown }[] = sites.map((_, i) => ({ at: i + 1, value: new Error('cold issuance ' + i) }));
    for (const value of faultValues()) cases.push({ at: 1, value });
    for (const { at, value } of cases) {
      const active = reopen();
      try { sameThrow(() => instrumentation.run(() => ScopeJournal.open({ backend: active, writerKey: keys.W0, packages }), at, value), value, 'cold call ' + at); }
      finally { if (active instanceof SQLiteBackend) active.close(); }
      const cold = ScopeJournal.open({ backend: reopen(), writerKey: keys.W0, packages });
      assert.ok(cold.journal.context.state.participants.includes(principals.bob));
      assert.equal(cold.journal.context.state.verdicts[accept.position]!.effective, true);
      const retry = cold.submit(envelope); assert.ok(!('refused' in retry) && retry.replay && retry.verdict?.effective);
      assert.equal(retry.headerHash, accept.headerHash);
      assert.equal(cold.journal.context.entries[accept.position]!.committed, accept.committed);
      cold.close();
    }
    t.diagnostic(JSON.stringify({ storage, phase: 'cold-open', cryptoSites: sites, injectedCases: cases.length, originalExceptions: cases.length, coldExactRetries: cases.length }));
  } finally { instrumentation.close(); world.close(); }
});

for (const storage of ['memory', 'sqlite'] as const) test('O4 R2 every nested issuance hash/key fault disables activation facade without changing durable bytes: ' + storage, t => {
  const world = buildThrough('destination-started', {}, storage);
  const proofs = [world.proof('S'), world.proof('D')], destination = world.destination!, root = world.root;
  world.close();
  const opts = { writer: principals.WF, profile: O1_PROFILE_VERSION };
  let serial = 0;
  function fresh() {
    const path = join(root, 'r2-issuance-' + serial++ + '.db');
    const backend: Backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
    const scope = ScopeJournal.create({ backend, writerKey: keys.WF, packages }, destination);
    const envelope = signEvent(scope.journal.context.intent(principals.alice, K.scope_activate, { proofs } as never, { action_id: 'r2-activate', nonce: 'c1'.repeat(16) }), keys.alice);
    return { path, backend, scope, envelope, bytes: envelopeBytes(envelope), credential: scope.journal.context.credentialFor(principals.alice) };
  }
  const instrumentation = probe();
  try {
    const baseline = fresh();
    const good = instrumentation.run(() => baseline.scope.submit(baseline.bytes, baseline.credential));
    assert.ok(!('refused' in good) && good.verdict?.effective);
    const sites = [...instrumentation.state.sites]; baseline.scope.close();
    assert.ok(sites.includes('createHash') && sites.includes('createPublicKey'));
    const cases: { at: number; value: unknown }[] = sites.map((_, i) => ({ at: i + 1, value: new Error('nested issuance ' + i) }));
    for (const value of faultValues()) cases.push({ at: 1, value }, { at: sites.length, value });
    for (const { at, value } of cases) {
      const { scope, backend, path, envelope, bytes, credential } = fresh();
      sameThrow(() => instrumentation.run(() => scope.submit(bytes, credential), at, value), value, 'activation call ' + at);
      assert.throws(() => scope.submit(bytes, credential), /unavailable|closed|inactive|reopen/);
      assert.throws(() => scope.journal.context.submit(envelope.body, credential, envelope), /closed|inactive/);
      assert.throws(() => scope.interpret(principals.alice), /unavailable/);
      assert.throws(() => scope.export(['R_fulfil']), /unavailable/);
      scope.close();
      const cold = ScopeJournal.open({ backend: storage === 'sqlite' ? new SQLiteBackend(path, opts) : backend, writerKey: keys.WF, packages });
      assert.equal(cold.journal.context.head, 1);
      assert.equal(cold.journal.context.entries[1]!.committed, bytes);
      assert.equal(cold.state.activations, 1);
      const retry = cold.submit(bytes, credential);
      assert.ok(!('refused' in retry) && retry.replay && retry.verdict?.effective);
      assert.equal(retry.headerHash, cold.journal.context.entries[1]!.headerHash);
      assert.equal(cold.journal.context.head, 1); assert.equal(cold.state.activations, 1);
      cold.close();
    }
    t.diagnostic(JSON.stringify({ storage, phase: 'activation', cryptoSites: sites, injectedCases: cases.length, originalExceptions: cases.length, durableExactRetries: cases.length, returnedFaultVerdicts: 0 }));
  } finally { instrumentation.close(); }
});

test('O4 R2 signed and legacy issuance preserve every hash-stage fault value', t => {
  const legacy = saleContext(), legacyPosition = invite(legacy, ALICE, BOB);
  const world = buildThrough('sale-accepted', {}, 'memory'), signed = world.contexts.S!.journal.context;
  const signedPosition = signed.entries.find(e => e.event.kind === K.invite)!.position;
  const inputs = [
    { name: 'legacy', evidence: issuanceEvidence(legacy.state, legacy.entries), payload: legacy.inviteEnvelope(legacyPosition) },
    { name: 'signed', evidence: issuanceEvidence(signed.state, signed.entries), payload: signed.inviteEnvelope(signedPosition) },
  ];
  const instrumentation = probe(true);
  try {
    for (const input of inputs) {
      assert.equal(instrumentation.run(() => verifyIssuance(input.evidence, input.payload)).ok, true);
      const sites = [...instrumentation.state.sites];
      assert.ok(sites.includes('createHash') && sites.includes('update') && sites.includes('digest'));
      for (let at = 1; at <= sites.length; at++) for (const value of faultValues()) {
        sameThrow(() => instrumentation.run(() => verifyIssuance(input.evidence, input.payload), at, value), value, input.name + ' call ' + at);
        assert.equal(isCodecValidationError(value), false); assert.equal(isCanonicalValidationError(value), false);
      }
      t.diagnostic(JSON.stringify({ boundary: input.name, sites, thrownValuesPerSite: faultValues().length }));
    }
  } finally { instrumentation.close(); world.close(); }
});

for (const storage of ['memory', 'sqlite'] as const) test('O4 R2 malformed signed and legacy issuance stays an admission refusal and leaves Scope usable: ' + storage, t => {
  const world = buildThrough('sale-accepted', {}, storage), scope = world.contexts.S!;
  try {
    const ctx = scope.journal.context, position = ctx.entries.find(e => e.event.kind === K.invite)!.position;
    const original = ctx.inviteEnvelope(position), evidence = issuanceEvidence(ctx.state, ctx.entries);
    const malformed: { name: string; payload: unknown; reason: string }[] = [
      { name: 'null', payload: null, reason: 'malformed' },
      { name: 'short-signature', payload: { invite: { ...original.invite, actorSig: 'x' } }, reason: 'malformed' },
      { name: 'missing-body-fields', payload: { invite: { ...original.invite, event: {} } }, reason: 'malformed' },
      { name: 'bad-principal', payload: { invite: { ...original.invite, event: { ...original.invite.event, actor: 'not-a-key' } } }, reason: 'malformed' },
      { name: 'bad-nonce', payload: { invite: { ...original.invite, event: { ...original.invite.event, nonce: 'x' } } }, reason: 'malformed' },
      { name: 'legacy-fraction', payload: { invite: { event: { ...original.invite.event, payload: { n: 0.5 } }, header: original.invite.header } }, reason: 'malformed' },
      { name: 'untrusted-commitment', payload: { invite: { ...original.invite, event: { ...original.invite.event, nonce: 'ff'.repeat(16) } } }, reason: 'not_in_chain' },
    ];
    const head = ctx.head;
    for (const { name, payload, reason } of malformed) {
      assert.deepEqual(verifyIssuance(evidence, payload), { ok: false, reason }, name);
      const envelope = signEvent(ctx.intent(principals.bob, K.accept_invite, payload as Json), keys.bob);
      assert.deepEqual(scope.submit(envelope), { refused: true, reason: 'invitation_not_issued' }, name);
      assert.deepEqual(scope.submit(envelope), { refused: true, reason: 'invitation_not_issued' }, 'repeat ' + name);
      assert.equal(ctx.head, head); assert.ok(ctx.state.participants.includes(principals.bob));
    }
    const healthy = world.emit('S', 'alice', K.observe, { fact: 'after malformed issuance' });
    assert.ok(!('refused' in healthy) && healthy.verdict?.effective);
    const bytes = world.envelopes.get('S@' + healthy.header.position)!;
    world.restart('S');
    const retry = world.contexts.S!.submit(bytes, world.contexts.S!.journal.context.credentialFor(principals.alice));
    assert.ok(!('refused' in retry) && retry.replay && retry.verdict?.effective);
    assert.equal(retry.headerHash, healthy.headerHash);
    assert.ok(world.contexts.S!.journal.context.state.participants.includes(principals.bob));
    t.diagnostic(JSON.stringify({ storage, malformedCases: malformed.length, newPositions: 0, healthyAppendAndColdRetry: true }));
  } finally { world.close(); }
});

test('O4 R2 codec-looking unexpected TypeError and opaque values remain exceptions in wireInput', () => {
  const world = buildThrough('sale-accepted', {}, 'memory');
  try {
    const packet = world.contexts.S!.proof();
    for (const value of faultValues()) {
      const broken = new Proxy(packet, { ownKeys() { throw value; } });
      sameThrow(() => verifyPublicProof(broken, { genesis: packet.genesis, initialWriter: packet.initialWriter }, packages), value);
    }
  } finally { world.close(); }
});

for (const storage of ['memory', 'sqlite'] as const) test('O4 L2 signature faults during cold open and representative activation stages preserve recovery: ' + storage, t => {
  const world = buildThrough('destination-started', {}, storage);
  const proofs = [world.proof('S'), world.proof('D')], destination = world.destination!, root = world.root;
  const source = world.contexts.S!, sourceBackend = source.journal.context.backend, ordering = source.journal.ordering;
  source.close();
  const sourceReopen = () => storage === 'sqlite' ? new SQLiteBackend(world.paths.S!, { writer: ordering.initialWriter, profile: ordering.profile }) : sourceBackend;
  const opts = { writer: principals.WF, profile: O1_PROFILE_VERSION };
  let serial = 0;
  function fresh() {
    const path = join(root, 'l2-signature-' + serial++ + '.db');
    const backend: Backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
    const scope = ScopeJournal.create({ backend, writerKey: keys.WF, packages }, destination);
    const envelope = signEvent(scope.journal.context.intent(principals.alice, K.scope_activate, { proofs } as never, { action_id: 'l2-signature', nonce: 'c2'.repeat(16) }), keys.alice);
    return { path, backend, scope, bytes: envelopeBytes(envelope), credential: scope.journal.context.credentialFor(principals.alice) };
  }
  const instrumentation = probe(false, true), failure = new TypeError('codec: unexpected signature failure');
  try {
    const healthy = instrumentation.run(() => ScopeJournal.open({ backend: sourceReopen(), writerKey: keys.W1, packages }));
    const coldSites = [...instrumentation.state.sites]; healthy.close();
    assert.ok(coldSites.length > 0); assert.ok(coldSites.every(s => s === 'verify'));
    for (let at = 1; at <= coldSites.length; at++) {
      const backend = sourceReopen();
      try { sameThrow(() => instrumentation.run(() => ScopeJournal.open({ backend, writerKey: keys.W1, packages }), at, failure), failure, 'cold signature ' + at); }
      finally { if (backend instanceof SQLiteBackend) backend.close(); }
    }
    const recovered = ScopeJournal.open({ backend: sourceReopen(), writerKey: keys.W1, packages });
    assert.ok(recovered.journal.context.state.participants.includes(principals.bob)); recovered.close();
    const baseline = fresh();
    const good = instrumentation.run(() => baseline.scope.submit(baseline.bytes, baseline.credential));
    assert.ok(!('refused' in good) && good.verdict?.effective);
    const sites = [...instrumentation.state.sites]; baseline.scope.close();
    const verification = sites.flatMap((s, i) => s === 'verify' ? [i + 1] : []);
    const signing = sites.flatMap((s, i) => s === 'sign' ? [i + 1] : []);
    const selected = [...new Set([verification[0]!, verification[Math.floor(verification.length / 2)]!, verification.at(-1)!, ...signing])];
    const observations: unknown[] = [];
    for (const at of selected) {
      const { scope, backend, path, bytes, credential } = fresh();
      let returned: ReturnType<ScopeJournal['submit']> | undefined, threw = false;
      try { returned = instrumentation.run(() => scope.submit(bytes, credential), at, failure); }
      catch (error) { assert.equal(error, failure); threw = true; }
      assert.ok(threw || returned && 'refused' in returned && returned.reason === 'invalid_envelope');
      scope.close();
      const cold = ScopeJournal.open({ backend: storage === 'sqlite' ? new SQLiteBackend(path, opts) : backend, writerKey: keys.WF, packages });
      const before = cold.journal.context.head;
      if (returned) assert.equal(before, 0, 'precommit refusal must not store bytes');
      if (before === 1) assert.equal(cold.journal.context.entries[1]!.committed, bytes);
      const retry = cold.submit(bytes, credential);
      assert.ok(!('refused' in retry) && retry.verdict?.effective);
      assert.equal(retry.replay, before === 1);
      assert.equal(cold.journal.context.head, 1); assert.equal(cold.state.activations, 1);
      observations.push({ at, call: sites[at - 1], outcome: threw ? 'original exception' : 'precommit refusal', committedBeforeRetry: before === 1, retry: retry.replay ? 'exact replay' : 'fresh append' });
      cold.close();
    }
    t.diagnostic(JSON.stringify({ storage, phase: 'signatures', coldVerificationCalls: coldSites.length, coldInjectedCases: coldSites.length, activationVerificationCalls: verification.length, activationSigningCalls: signing.length, selectedActivationCases: observations }));
  } finally { instrumentation.close(); world.close(); }
});

for (const storage of ['memory', 'sqlite'] as const) test('O4 L2 declared malformed proof bytes remain policy refusals and permit later activation: ' + storage, () => {
  const world = buildThrough('destination-started', {}, storage);
  try {
    const proofs = [world.proof('S'), world.proof('D')];
    const broken = structuredClone(proofs);
    broken[0]!.source.positions[broken[0]!.release]!.committed = '{}';
    const refused = world.emit('F', 'alice', K.scope_activate, { proofs: broken } as never);
    assert.ok(!('refused' in refused));
    assert.equal(refused.verdict?.effective, false);
    assert.match(refused.verdict!.reason!, /^malformed_release_proof: codec:/);
    const original = world.envelopes.get('F@' + refused.header.position)!;
    const retry = world.contexts.F!.submit(original);
    assert.ok(!('refused' in retry) && retry.replay); assert.deepEqual(retry.verdict, refused.verdict);
    world.restart('F');
    const coldRetry = world.contexts.F!.submit(original);
    assert.ok(!('refused' in coldRetry) && coldRetry.replay); assert.deepEqual(coldRetry.verdict, refused.verdict);
    const packet = structuredClone(proofs[0]!.source);
    packet.positions[0]!.committed = '{}';
    assert.throws(() => verifyPublicProof(packet, { genesis: packet.genesis, initialWriter: packet.initialWriter }, packages), { message: 'codec: envelope missing required field' });
    const healthy = world.emit('F', 'alice', K.scope_activate, { proofs } as never);
    assert.ok(!('refused' in healthy) && healthy.verdict?.effective);
    assert.equal(world.contexts.F!.state.activations, 1);
  } finally { world.close(); }
});
