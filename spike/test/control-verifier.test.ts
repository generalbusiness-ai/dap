import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { compareControlSpines, verifyControlSpine, type ControlProof } from '../src/control-verifier.ts';
import { headerHash, verifyHeader } from '../src/codec.ts';

type Case = { name: string; proof: ControlProof; expected: { accept: boolean; code?: string; epoch?: number; writer?: string; sealed?: boolean } };
const fixture = JSON.parse(readFileSync(new URL('./fixtures/control-proofs.json', import.meta.url), 'utf8')) as {
  proofs: Case[];
  comparisons: Array<{ name: string; left: ControlProof; right: ControlProof; conflictAt?: number; commonLength?: number }>;
};
for (const { name, proof, expected } of fixture.proofs) test('O5 spec proof: ' + name, () => {
  if (!expected.accept) {
    assert.throws(() => verifyControlSpine(proof), error => error instanceof Error && error.message.includes(expected.code!), expected.code);
    return;
  }
  const result = verifyControlSpine(proof);
  assert.equal(result.epoch, expected.epoch);
  assert.equal(result.writer, expected.writer);
  assert.equal(result.sealed, expected.sealed);
  assert.equal(result.head.position, proof.entries.length);
  assert.equal(result.head.headerHash, headerHash(proof.entries.at(-1)?.header ?? proof.genesis.header));
  assert.equal(result.assignments.length, result.epoch + 1);
  assert.equal(result.controlEntries + result.opaqueEntries, proof.entries.length);
});
for (const comparison of fixture.comparisons) test('O5 compare: ' + comparison.name, () => {
  const result = compareControlSpines(comparison.left, comparison.right);
  if (comparison.conflictAt === undefined) {
    assert.deepEqual(result, { compatible: true, commonLength: comparison.commonLength });
    return;
  }
  assert.equal(result.compatible, false);
  if (result.compatible) return;
  assert.equal(result.position, comparison.conflictAt);
  assert.equal(result.left.prev, result.right.prev);
  assert.notEqual(headerHash(result.left), headerHash(result.right));
  // Evidence is independently checkable as two signatures by the common writer.
  const expected = { genesis: result.genesis, position: result.position, prev: result.left.prev };
  verifyHeader(result.left, result.writer, expected);
  verifyHeader(result.right, result.writer, expected);
  assert.ok(Object.isFrozen(result.left));
});
test('O5 omission limit uses identical headers and cannot be mistaken for completeness proof', () => {
  const hidden = fixture.proofs.find(p => p.name === 'LIMIT-hidden-seal-and-old-writer-suffix')!;
  const opened = fixture.proofs.find(p => p.name === 'opening-exposes-same-sealed-suffix')!;
  assert.deepEqual(hidden.proof.entries.map(e => e.header), opened.proof.entries.map(e => e.header));
  assert.equal(verifyControlSpine(hidden.proof).sealed, false);
  assert.throws(() => verifyControlSpine(opened.proof), /sealed_requires_assign/);
});
test('O5 proof boundary rejects unrelated inputs and does not mutate callers', () => {
  const proof = structuredClone(fixture.proofs.find(p => p.name === 'valid-handover')!.proof);
  const before = JSON.stringify(proof);
  const result = verifyControlSpine(proof);
  assert.equal(JSON.stringify(proof), before);
  assert.ok(Object.isFrozen(result.assignments));
  assert.throws(() => verifyControlSpine({ ...proof, packages: {} } as ControlProof), /proof_shape/);
  assert.throws(() => verifyControlSpine({ ...proof, entries: [{ ...proof.entries[0]!, payload: {} }] } as unknown as ControlProof), /entry_shape/);
  assert.throws(() => compareControlSpines(proof, fixture.proofs.find(p => p.name === 'v1-fixed-writer')!.proof), /different_genesis/);
});
test('O5 H1 rejects relocated exact control bytes on individually unique histories', () => {
  const original = fixture.proofs.find(p => p.name === 'exact-head-authorized-seal')!.proof;
  assert.equal(verifyControlSpine(original).sealed, true);
  for (const name of ['same-seal-envelope-at-different-position', 'same-seal-position-different-header-hash']) {
    const moved = fixture.proofs.find(p => p.name === name)!.proof;
    assert.equal(moved.entries.at(-1)!.committed, original.entries.at(-1)!.committed);
    const commitments = [moved.genesis.header, ...moved.entries.map(e => e.header)].map(h => h.commitment);
    assert.equal(new Set(commitments).size, commitments.length);
    assert.throws(() => verifyControlSpine(moved), /wrong_predecessor_head/);
  }
});
test('O5 H1 retains historical v2 vectors and unchanged fixed-writer proof bytes', () => {
  const historical = JSON.parse(readFileSync(new URL('../manifests/ordering-o5-runs/h1-before/control-proofs.json', import.meta.url), 'utf8')) as { proofs: Case[] };
  assert.equal(historical.proofs.length, 47);
  assert.throws(() => verifyControlSpine(historical.proofs.find(p => p.name === 'valid-handover')!.proof), /unsupported_profile/);
  for (const name of ['v1-fixed-writer', 'v1-request-does-not-assign']) {
    assert.deepEqual(fixture.proofs.find(p => p.name === name)!.proof, historical.proofs.find(p => p.name === name)!.proof);
  }
});
test('O5 executes with packages, application payloads and grant folds unavailable', t => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'dap-o5-isolated-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'src')); mkdirSync(join(directory, 'test', 'fixtures'), { recursive: true });
  for (const file of ['control-verifier.ts', 'codec.ts', 'canon.ts', 'types.ts']) cpSync(new URL('../src/' + file, import.meta.url), join(directory, 'src', file));
  const driver = join(directory, 'test', 'fixtures', 'o5-isolated.ts');
  cpSync(new URL('./fixtures/o5-isolated.ts', import.meta.url), driver);
  // No application envelope is supplied in valid inputs. Permission mode also
  // denies accidental filesystem imports outside the four-module directory.
  const result = spawnSync(process.execPath, ['--permission', '--allow-fs-read=' + directory, driver], {
    input: JSON.stringify(fixture.proofs.map(p => p.proof)), encoding: 'utf8', cwd: directory, timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  const outcomes = JSON.parse(result.stdout) as Array<{ accept: boolean; result?: unknown; error?: string }>;
  assert.equal(outcomes.length, fixture.proofs.length);
  fixture.proofs.forEach(({ proof, expected }, i) => {
    assert.equal(outcomes[i]!.accept, expected.accept);
    if (expected.accept) assert.deepEqual(outcomes[i]!.result, verifyControlSpine(proof));
    else assert.ok(outcomes[i]!.error?.includes(expected.code!));
  });
});
