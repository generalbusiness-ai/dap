// O3 is only a producer here; expected positions/authority are declared below.
// The verifier itself and its isolated subprocess do not import O3 or packages.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { envelopeBytes, headerHash, signEvent, signHeader } from '../src/codec.ts';
import { verifyControlSpine, type ControlProof } from '../src/control-verifier.ts';
import { Journal } from '../src/journal.ts';
import { SYSTEM_PREFIX } from '../src/types.ts';
import { control, controlKey, create, keys, packages, people, sqlite, successor, successorKey } from './fixtures/o3-fixture.ts';

test('O5 isolated reader verifies an actual O3 SQLite handover and successor', t => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'dap-o5-journal-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'journal.db');
  let journal = create(sqlite(path));
  t.after(() => journal.close());
  assert.equal(journal.context.entries.length, 2); // genesis and declared origin
  const genesis = journal.context.genesisId;
  const initial = journal.context.entries;
  const repeatedOrigin: ControlProof = {
    pinnedGenesis: genesis,
    genesis: { header: initial[0]!.header, committed: initial[0]!.committed! },
    entries: [
      { header: initial[1]!.header },
      { header: signHeader({ ...initial[1]!.header, position: 2, prev: headerHash(initial[1]!.header) }, keys.writer) },
    ],
  };
  assert.throws(() => verifyControlSpine(repeatedOrigin), /repeated_commitment/);
  assert.equal(journal.context.entries.length, 2); // only the proof was tampered
  const seal = signEvent(journal.context.intent(control, SYSTEM_PREFIX + 'seq.seal', {
    epoch: 0, predecessor: { position: 1, headerHash: headerHash(journal.context.entries[1]!.header) },
  }, { action_id: 'o5-real-seal', nonce: 'a1'.repeat(16) }), controlKey);
  const sealed = journal.submit(envelopeBytes(seal));
  assert.ok(!('refused' in sealed), JSON.stringify(sealed));
  assert.equal(sealed.header.position, 2);
  const assign = signEvent(journal.context.intent(control, SYSTEM_PREFIX + 'seq.assign', {
    epoch: 1, predecessor: { position: 2, headerHash: sealed.headerHash }, writer: successor,
  }, { action_id: 'o5-real-assign', nonce: 'a2'.repeat(16) }), controlKey);
  const assigned = journal.submit(envelopeBytes(assign));
  assert.ok(!('refused' in assigned), JSON.stringify(assigned));
  assert.equal(assigned.header.position, 3);
  journal.close();
  journal = Journal.open({ backend: sqlite(path), writerKey: successorKey, packages });
  const opaque = signEvent(journal.context.intent(people.alice, SYSTEM_PREFIX + 'observe', {}, {
    action_id: 'o5-real-successor', nonce: 'a3'.repeat(16),
  }), keys.alice);
  const successorReceipt = journal.submit(envelopeBytes(opaque), journal.context.credentialFor(people.alice));
  assert.ok(!('refused' in successorReceipt), JSON.stringify(successorReceipt));
  assert.equal(successorReceipt.header.position, 4);
  const entries = journal.context.entries;
  const proof: ControlProof = {
    pinnedGenesis: genesis,
    genesis: { header: entries[0]!.header, committed: entries[0]!.committed! },
    entries: entries.slice(1).map(e => ({ header: e.header, ...(e.event.kind.startsWith(SYSTEM_PREFIX + 'seq.') ? { committed: e.committed! } : {}) })),
  };
  const expected = verifyControlSpine(proof);
  assert.equal(expected.epoch, 1); assert.equal(expected.writer, successor);
  assert.equal(expected.sealed, false); assert.equal(expected.head.position, 4);
  assert.deepEqual(expected.assignments.map(a => a.firstPosition), [0, 4]);
  assert.equal(expected.opaqueEntries, 2); assert.equal(expected.controlEntries, 2);
  const isolated = join(directory, 'isolated');
  mkdirSync(join(isolated, 'src'), { recursive: true });
  mkdirSync(join(isolated, 'test', 'fixtures'), { recursive: true });
  for (const file of ['control-verifier.ts', 'codec.ts', 'canon.ts', 'types.ts']) cpSync(new URL('../src/' + file, import.meta.url), join(isolated, 'src', file));
  const driver = join(isolated, 'test', 'fixtures', 'o5-isolated.ts');
  cpSync(new URL('./fixtures/o5-isolated.ts', import.meta.url), driver);
  const child = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + isolated, driver], {
    cwd: isolated, input: JSON.stringify(proof), encoding: 'utf8', timeout: 10000,
  });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), expected);
  t.diagnostic('o5-journal-proof:' + JSON.stringify({ proof, result: expected }));
});
