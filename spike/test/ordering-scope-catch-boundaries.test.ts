import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { test } from 'node:test';
import { join } from 'node:path';
import { buildThrough, keys, principals, packages } from '../fixtures/ordering-lifecycle-runner.ts';
import { MemoryBackend, type Backend } from '../src/append.ts';
import { SQLiteBackend } from '../src/sqlite.ts';
import { ScopeJournal } from '../src/scope.ts';
import { ScopeProofError } from '../src/scope-proof.ts';
import { ScopeProfileError } from '../src/scope-profile.ts';
import { Journal, O1_PROFILE_VERSION } from '../src/journal.ts';
import { K } from '../src/foundation.ts';
import { envelopeBytes, parseCanonical, isCodecValidationError, signEvent } from '../src/codec.ts';
import type { PackageDescriptor } from '../src/descriptor.ts';

type Seam = 'journal-precheck' | 'append-prepare' | 'parse-proof' | 'cold-parse' | 'system-fold' | 'audience' | 'issuance-envelope' | 'issuance-header' | 'model-fold' | 'ordering-key' | 'wire-key' | 'release-opening' | 'scope-object' | 'constructor-key' | 'open-key';
function inject(seam: Seam) {
  const state = { armed: false, hits: 0, value: undefined as unknown, stack: '' };
  const originals = { parse: JSON.parse, keys: Object.keys, isArray: Array.isArray, createPublicKey: crypto.createPublicKey, verify: crypto.verify };
  const stackLimit = Error.stackTraceLimit; Error.stackTraceLimit = 60;
  function hit(kind: string, value?: unknown) {
    if (!state.armed) return;
    const stack = new Error().stack ?? '';
    const matches =
      seam === 'journal-precheck' && kind === 'verify' && !stack.includes('prepare (') ||
      seam === 'append-prepare' && kind === 'verify' && /prepare \(/.test(stack) ||
      seam === 'parse-proof' && kind === 'parse' && /parseCanonical/.test(stack) && /wireInput/.test(stack) ||
      seam === 'cold-parse' && kind === 'parse' && /parseCanonical/.test(stack) && /verifyEntries/.test(stack) ||
      seam === 'system-fold' && kind === 'package' && /packageIn/.test(stack) && /foldSystem/.test(stack) ||
      seam === 'issuance-envelope' && kind === 'key' && /verifyIssuance/.test(stack) ||
      seam === 'issuance-header' && kind === 'keys' && /verifyIssuance/.test(stack) && !!value && typeof value === 'object' && Object.hasOwn(value, 'commitment') && Object.hasOwn(value, 'prev') ||
      seam === 'ordering-key' && kind === 'key' && /orderingAdmission/.test(stack) ||
      seam === 'wire-key' && kind === 'key' && /wireInput/.test(stack) ||
      seam === 'release-opening' && kind === 'key' && /verifyEnvelope/.test(stack) && /replayScopeView/.test(stack) && !/wireInput/.test(stack) && !/verifyIssuance/.test(stack) ||
      seam === 'scope-object' && kind === 'array' && /at object .*scope.ts/.test(stack) && !!value && typeof value === 'object' && Object.hasOwn(value, 'proofs') ||
      seam === 'constructor-key' && kind === 'key' && /new ScopeJournal/.test(stack) ||
      seam === 'open-key' && kind === 'key' && /verifyEntries/.test(stack) ||
      seam === 'audience' && kind === 'audience' || seam === 'model-fold' && kind === 'fold';
    if (matches) { state.armed = false; state.hits++; state.stack = stack; throw state.value; }
  }
  JSON.parse = ((...args: Parameters<typeof JSON.parse>) => { hit('parse'); return Reflect.apply(originals.parse, JSON, args); }) as typeof JSON.parse;
  Object.keys = ((value: object) => { hit('keys', value); return originals.keys(value); }) as typeof Object.keys;
  Array.isArray = ((value: unknown) => { hit('array', value); return originals.isArray(value); }) as typeof Array.isArray;
  crypto.createPublicKey = ((...args: Parameters<typeof crypto.createPublicKey>) => { hit('key'); return Reflect.apply(originals.createPublicKey, crypto, args); }) as typeof crypto.createPublicKey;
  crypto.verify = ((...args: Parameters<typeof crypto.verify>) => { hit('verify'); return Reflect.apply(originals.verify, crypto, args); }) as typeof crypto.verify;
  syncBuiltinESMExports();
  function wrapped(fn: (...args: any[]) => any, kind: string) {
    const wrapper = (...args: any[]) => { hit(kind); return fn(...args); };
    wrapper.toString = () => fn.toString();
    return wrapper;
  }
  const wrappedPackages = Object.fromEntries(Object.entries(packages).map(([id, pkg]) => [id, {
    ...pkg,
    models: Object.fromEntries(Object.entries(pkg.models).map(([name, model]) => [name, { ...model, fold: wrapped(model.fold, 'fold') }])),
    kinds: Object.fromEntries(Object.entries(pkg.kinds).map(([kind, binding]) => [kind, { ...binding, audience: wrapped(binding.audience, 'audience') }])),
  }])) as Record<string, PackageDescriptor>;
  const registry = new Proxy(wrappedPackages, { get(target, key, receiver) {
    if (typeof key === 'string' && key.startsWith('sha256:')) hit('package');
    return Reflect.get(target, key, receiver);
  } });
  return {
    state, registry,
    arm(value: unknown) { state.value = value; state.hits = 0; state.stack = ''; state.armed = true; },
    disarm() { state.armed = false; },
    close() {
      state.armed = false; JSON.parse = originals.parse; Object.keys = originals.keys; Array.isArray = originals.isArray;
      crypto.createPublicKey = originals.createPublicKey; crypto.verify = originals.verify; syncBuiltinESMExports(); Error.stackTraceLimit = stackLimit;
    },
  };
}
function sentinels(): { name: string; value: unknown }[] {
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  return [
    { name: 'Error', value: new Error('unexpected injected implementation fault') },
    { name: 'codec-looking TypeError', value: new TypeError('codec: invalid JSON') },
    { name: 'undefined', value: undefined }, { name: 'object', value: { unexpected: true } },
    { name: 'string', value: 'unexpected fault' }, { name: 'revoked Proxy', value: revoked.proxy },
  ];
}
const converting: { id: string; seam: Seam; precommit?: boolean }[] = [
  { id: 'append.prepare', seam: 'append-prepare', precommit: true },
  { id: 'codec.parseCanonical', seam: 'parse-proof' },
  { id: 'foundation.foldSystem', seam: 'system-fold' },
  { id: 'foundation.audience', seam: 'audience' },
  { id: 'foundation.issuanceEnvelope', seam: 'issuance-envelope' },
  { id: 'foundation.issuanceHeader', seam: 'issuance-header' },
  { id: 'foundation.dispatch', seam: 'model-fold' },
  { id: 'journal.precheck', seam: 'journal-precheck', precommit: true },
  { id: 'ordering.admission', seam: 'ordering-key' },
  { id: 'scopeProof.wireInput', seam: 'wire-key' },
  { id: 'scope.releaseOpening', seam: 'release-opening' },
  { id: 'scope.semantic', seam: 'scope-object' },
];

for (const storage of ['memory', 'sqlite'] as const) test('O4 M1 each converting catch try body preserves unexpected values or its documented precommit refusal: ' + storage, t => {
  const world = buildThrough('destination-started', {}, storage);
  const proofs = [world.proof('S'), world.proof('D')], destination = world.destination!, root = world.root; world.close();
  const opts = { writer: principals.WF, profile: O1_PROFILE_VERSION };
  const records: unknown[] = []; let serial = 0;
  for (const row of converting) for (const sentinel of sentinels()) {
    const hook = inject(row.seam), path = join(root, 'matrix-' + serial++ + '.db');
    const backend: Backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
    let scope: ScopeJournal | undefined;
    try {
      scope = ScopeJournal.create({ backend, writerKey: keys.WF, packages: hook.registry }, destination);
      const envelope = signEvent(scope.journal.context.intent(principals.alice, K.scope_activate, { proofs } as never, { action_id: 'catch-matrix', nonce: 'd1'.repeat(16) }), keys.alice);
      const bytes = envelopeBytes(envelope), credential = scope.journal.context.credentialFor(principals.alice);
      hook.arm(sentinel.value);
      if (row.precommit) {
        assert.deepEqual(scope.submit(bytes, credential), { refused: true, reason: 'invalid_envelope' }, row.id + '/' + sentinel.name);
        hook.disarm();
        assert.equal(scope.journal.context.head, 0);
        const healthy = scope.submit(bytes, credential); assert.ok(!('refused' in healthy) && healthy.verdict?.effective);
      } else {
        assert.throws(() => scope!.submit(bytes, credential), error => Object.is(error, sentinel.value), row.id + '/' + sentinel.name);
        hook.disarm();
        assert.throws(() => scope!.submit(bytes, credential), /unavailable|closed|inactive|reopen/);
        assert.throws(() => scope!.journal.context.submit(envelope.body, credential, envelope), /inactive|closed/);
      }
      assert.equal(hook.state.hits, 1, 'injection must hit ' + row.id);
      scope.close();
      const cold = ScopeJournal.open({ backend: storage === 'sqlite' ? new SQLiteBackend(path, opts) : backend, writerKey: keys.WF, packages });
      assert.equal(cold.journal.context.head, 1); assert.equal(cold.journal.context.entries[1]!.committed, bytes);
      const retry = cold.submit(bytes, credential);
      assert.ok(!('refused' in retry) && retry.replay && retry.verdict?.effective); assert.equal(cold.state.activations, 1);
      cold.close();
      records.push({ catch: row.id, sentinel: sentinel.name, outcome: row.precommit ? 'precommit refusal; same-facade recovery' : 'original value; unavailable facade', coldExactRetry: true,
        ...(sentinel.name === 'Error' ? { reachedStack: hook.state.stack.split('\n').filter(line => line.includes('/spike/src/')).map(line => line.trim().replace(/file:\/\/.*?\/spike\//, 'spike/')) } : {}),
      });
    } finally { hook.close(); scope?.close(); if (backend instanceof SQLiteBackend) backend.close(); }
  }
  t.diagnostic(JSON.stringify({ storage, catalogue: '21 original catches; 12 converting try bodies', rows: records }));
});

for (const storage of ['memory', 'sqlite'] as const) test('O4 M1 cold key import and parser faults retain identity and release the Journal lease: ' + storage, t => {
  const world = buildThrough('destination-activated', {}, storage), rows: unknown[] = [];
  try {
    for (const contextName of ['S', 'F'] as const) {
      const original = world.contexts[contextName]!, backend = original.journal.context.backend, order = original.journal.ordering;
      const writerKey = contextName === 'S' ? keys.W1 : keys.WF;
      original.close();
      const reopen = () => storage === 'sqlite' ? new SQLiteBackend(world.paths[contextName]!, { writer: order.initialWriter, profile: order.profile }) : backend;
      for (const seam of ['ordering-key', 'open-key', 'cold-parse'] as const) for (const sentinel of sentinels()) {
        const hook = inject(seam), active = reopen(); let faulty: ScopeJournal | undefined;
        try {
          hook.arm(sentinel.value);
          assert.throws(() => { faulty = ScopeJournal.open({ backend: active, writerKey, packages }); if (contextName === 'F') void faulty.state; }, error => Object.is(error, sentinel.value));
          assert.equal(hook.state.hits, 1);
        } finally { hook.close(); faulty?.close(); if (active instanceof SQLiteBackend) active.close(); }
        const cold = ScopeJournal.open({ backend: reopen(), writerKey, packages });
        if (contextName === 'F') assert.equal(cold.state.activations, 1);
        else assert.equal(cold.journal.context.head, 24);
        cold.close(); rows.push({ context: contextName, seam, sentinel: sentinel.name, recovered: true });
      }
    }
    t.diagnostic(JSON.stringify({ storage, coldOpenCases: rows }));
  } finally { world.close(); }
});

for (const storage of ['memory', 'sqlite'] as const) test('O4 M1 Scope constructor cleanup covers create and open, preserving the original value even if close fails: ' + storage, t => {
  const world = buildThrough('destination-started', {}, storage), destination = world.destination!, root = world.root; world.close();
  const opts = { writer: principals.WF, profile: O1_PROFILE_VERSION }; let serial = 0; const rows: unknown[] = [];
  for (const factory of ['create', 'open'] as const) for (const sentinel of sentinels()) for (const closeFails of [false, true]) {
    const path = join(root, 'constructor-' + serial++ + '.db');
    let backend: Backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
    if (factory === 'open') {
      ScopeJournal.create({ backend, writerKey: keys.WF, packages }, destination).close();
      if (storage === 'sqlite') backend = new SQLiteBackend(path, opts);
    }
    const hook = inject('constructor-key');
    const originalClose = Journal.prototype.close;
    if (closeFails) Journal.prototype.close = function () {
      originalClose.call(this);
      if (hook.state.hits) throw new Error('cleanup failure must not replace the constructor fault');
    };
    try {
      hook.arm(sentinel.value);
      assert.throws(() => factory === 'create' ? ScopeJournal.create({ backend, writerKey: keys.WF, packages }, destination) : ScopeJournal.open({ backend, writerKey: keys.WF, packages }), error => Object.is(error, sentinel.value));
      assert.equal(hook.state.hits, 1);
    } finally { hook.close(); Journal.prototype.close = originalClose; if (backend instanceof SQLiteBackend) backend.close(); }
    // Memory reuses the exact backend object. SQLite takes a fresh handle to
    // the same durable journal; neither depends on garbage collection.
    const cold = ScopeJournal.open({ backend: storage === 'sqlite' ? new SQLiteBackend(path, opts) : backend, writerKey: keys.WF, packages });
    assert.equal(cold.journal.context.head, 0); cold.close();
    rows.push({ factory, sentinel: sentinel.name, closeFailureInjected: closeFails, recovered: true });
  }
  t.diagnostic(JSON.stringify({ storage, constructorCases: rows }));
});

for (const storage of ['memory', 'sqlite'] as const) test('O4 M1 documents intentional policy conversions and guards exception inspection: ' + storage, t => {
  const world = buildThrough('destination-started', {}, storage), proofs = [world.proof('S'), world.proof('D')], destination = world.destination!, root = world.root; world.close();
  const opts = { writer: principals.WF, profile: O1_PROFILE_VERSION }; let serial = 0;
  const inspection = (typed: boolean) => {
    const value = typed ? new ScopeProofError() : new Error(); let hits = 0;
    Object.defineProperty(value, 'message', { get() { hits++; throw new Error('error inspection failed'); } });
    return { value, hits: () => hits };
  };
  const wireInspection = inspection(false), scopeInspection = inspection(true);
  const cases = [
    { name: 'parser nominal SyntaxError', seam: 'parse-proof' as const, value: new SyntaxError('injected parser syntax error'), policy: true },
    { name: 'wire exact message allowlist', seam: 'wire-key' as const, value: new Error('Journal view: malformed_control'), policy: true },
    { name: 'ScopeProofError class', seam: 'scope-object' as const, value: new ScopeProofError('injected policy class'), policy: true },
    { name: 'ScopeProfileError class', seam: 'scope-object' as const, value: new ScopeProfileError('injected policy class'), policy: true },
    { name: 'wire inspection catch', seam: 'wire-key' as const, value: wireInspection.value, policy: false },
    { name: 'scope inspection catch', seam: 'scope-object' as const, value: scopeInspection.value, policy: false },
  ];
  for (const row of cases) {
    const path = join(root, 'policy-' + serial++ + '.db'), backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
    const scope = ScopeJournal.create({ backend, writerKey: keys.WF, packages }, destination), hook = inject(row.seam);
    try {
      const envelope = signEvent(scope.journal.context.intent(principals.alice, K.scope_activate, { proofs } as never), keys.alice), bytes = envelopeBytes(envelope), credential = scope.journal.context.credentialFor(principals.alice);
      hook.arm(row.value);
      if (row.policy) { const result = scope.submit(bytes, credential); assert.ok(!('refused' in result) && result.verdict?.effective === false); }
      else assert.throws(() => scope.submit(bytes, credential), error => Object.is(error, row.value));
      hook.disarm(); assert.equal(hook.state.hits, 1); scope.close();
      const cold = ScopeJournal.open({ backend: storage === 'sqlite' ? new SQLiteBackend(path, opts) : backend, writerKey: keys.WF, packages });
      assert.equal(cold.state.activations, 1); cold.close();
    } finally { hook.close(); scope.close(); }
  }
  assert.ok(wireInspection.hits() > 0 && scopeInspection.hits() > 0);
  t.diagnostic(JSON.stringify({ storage, policyLimits: cases.filter(c => c.policy).map(c => c.name), inspectionCatches: { wire: wireInspection.hits(), scope: scopeInspection.hits() } }));
});

test('O4 M1 native parser SyntaxError stays a declared input refusal', () => {
  for (const value of ['{', '[1,]', '{"a":}', 'undefined']) assert.throws(() => parseCanonical(value), error => isCodecValidationError(error) && error.message === 'codec: invalid JSON');
  assert.deepEqual(parseCanonical('{"a":1}'), { a: 1 });
});

for (const storage of ['memory', 'sqlite'] as const) test('O4 M1 malformed ordering controls remain ordinary refusals and valid handover continues: ' + storage, () => {
  const world = buildThrough('writer-sealed', {}, storage);
  try {
    const scope = world.contexts.S!, head = scope.journal.context.entries.at(-1)!;
    const payload = { epoch: 1, predecessor: { position: head.position, headerHash: head.headerHash }, writer: principals.W1 };
    const malformed = [null, {}, { ...payload, predecessor: {} }, ...[null, 0, [], {}, 'constructor', 'ed25519:!'].map(writer => ({ ...payload, writer }))];
    for (const bad of malformed) {
      const envelope = signEvent(scope.journal.context.intent(principals.control, K.seq_assign, bad as never), keys.control);
      assert.deepEqual(scope.submit(envelope), { refused: true, reason: 'malformed_control' });
      assert.equal(scope.journal.context.head, head.position);
    }
    const assigned = world.assign(); assert.ok(!('refused' in assigned) && assigned.controlVerdict?.effective);
    const continued = world.continueWriter(); assert.ok(!('refused' in continued) && continued.verdict?.effective);
    world.restart('S'); assert.equal(world.contexts.S!.journal.context.head, head.position + 2);
  } finally { world.close(); }
});
