import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteBackend } from '../src/sqlite.ts';
import { MemoryBackend } from '../src/append.ts';
import { ScopeJournal } from '../src/scope.ts';
import { O1_PROFILE_VERSION } from '../src/journal.ts';
import { buildThrough, keys, principals, packages } from '../fixtures/ordering-lifecycle-runner.ts';
import { envelopeBytes, signEvent } from '../src/codec.ts';
import { K } from '../src/foundation.ts';

function values(): unknown[] {
  const proxy = Proxy.revocable({}, {}); proxy.revoke();
  return [new Error('original operation'), new TypeError('codec: original operation'), undefined, 'original', { original: true }, proxy.proxy];
}

test('O4 M1 SQLite operational faults survive secondary rollback and close faults', t => {
  const originalExec = DatabaseSync.prototype.exec, originalClose = DatabaseSync.prototype.close;
  const opts = { writer: 'cleanup-fixture', profile: 'cleanup-fixture' }, rows: unknown[] = [];
  for (const scenario of ['constructor-rollback', 'constructor-close', 'constructor-both', 'serialized-rollback'] as const) for (const value of values()) {
    const path = join(mkdtempSync(join(tmpdir(), 'm1-cleanup-test-')), 'journal.db');
    let armed = false, captured: DatabaseSync | undefined, cleanupCalls = 0;
    DatabaseSync.prototype.exec = function (sql: string) {
      captured = this;
      if (armed && scenario.startsWith('constructor') && sql.includes('CREATE TABLE')) throw value;
      if (armed && (scenario.endsWith('rollback') || scenario.endsWith('both')) && sql === 'ROLLBACK') { cleanupCalls++; throw new Error('secondary rollback fault'); }
      return originalExec.call(this, sql);
    };
    DatabaseSync.prototype.close = function () {
      const result = originalClose.call(this);
      if (armed && (scenario.endsWith('close') || scenario.endsWith('both'))) { cleanupCalls++; throw new Error('secondary close fault'); }
      return result;
    };
    let backend: SQLiteBackend | undefined;
    try {
      if (scenario.startsWith('constructor')) armed = true;
      if (armed) assert.throws(() => new SQLiteBackend(path, opts), error => Object.is(error, value));
      else {
        backend = new SQLiteBackend(path, opts); armed = true;
        assert.throws(() => backend!.serialized(() => { throw value; }), error => Object.is(error, value));
      }
      assert.equal(cleanupCalls, scenario === 'constructor-both' ? 2 : 1);
      assert.ok(captured);
      // Failed rollback leaves a transaction until the caller discards this
      // backend. Constructor cleanup additionally attempts close regardless.
      assert.equal(captured.isOpen, scenario === 'serialized-rollback');
      if (captured.isOpen) assert.equal(captured.isTransaction, true);
      rows.push({ scenario, originalIdentity: true, cleanupCalls, residualOpenTransaction: captured.isOpen });
    } finally {
      armed = false; DatabaseSync.prototype.exec = originalExec; DatabaseSync.prototype.close = originalClose;
      if (captured?.isOpen) originalClose.call(captured);
    }
    const cold = new SQLiteBackend(path, opts); assert.deepEqual(cold.entries(), []);
    cold.serialized(() => undefined); cold.close();
  }
  t.diagnostic(JSON.stringify({ backend: 'sqlite only', cleanupCases: rows }));
});

for (const storage of ['memory', 'sqlite'] as const) test('O4 M1 Context, Journal and Scope submit catches preserve committed lost-reply identity: ' + storage, t => {
  const world = buildThrough('destination-started', {}, storage), proofs = [world.proof('S'), world.proof('D')], destination = world.destination!, root = world.root; world.close();
  const opts = { writer: principals.WF, profile: O1_PROFILE_VERSION }; let serial = 0;
  for (const value of values()) {
    const path = join(root, 'lost-' + serial++ + '.db'), backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
    const scope = ScopeJournal.create({ backend, writerKey: keys.WF, packages }, destination);
    const envelope = signEvent(scope.journal.context.intent(principals.alice, K.scope_activate, { proofs } as never), keys.alice), bytes = envelopeBytes(envelope), credential = scope.journal.context.credentialFor(principals.alice);
    const serialize = backend.serialized.bind(backend);
    backend.serialized = fn => { serialize(fn); throw value; };
    assert.throws(() => scope.submit(bytes, credential), error => Object.is(error, value));
    assert.throws(() => scope.journal.context.submit(envelope.body, credential, envelope), /closed|inactive/);
    assert.throws(() => scope.submit(bytes, credential), /unavailable/);
    backend.serialized = serialize; scope.close();
    const cold = ScopeJournal.open({ backend: storage === 'sqlite' ? new SQLiteBackend(path, opts) : backend, writerKey: keys.WF, packages });
    assert.equal(cold.journal.context.entries[1]!.committed, bytes);
    const retry = cold.submit(bytes, credential); assert.ok(!('refused' in retry) && retry.replay && retry.verdict?.effective);
    assert.equal(cold.state.activations, 1); cold.close();
  }
  t.diagnostic(JSON.stringify({ storage, catches: ['context.submit','journal.submit','scope.submit'], injectedValues: serial, exactRetryRecoveries: serial }));
});
