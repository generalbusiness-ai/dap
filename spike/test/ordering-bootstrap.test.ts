import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { canonicalize, envelopeBytes, signEvent, verifyEnvelope } from '../src/codec.ts';
import { create, FixtureRouter, inspectPublication, publication, ROUTE, runDemo, type PublishedEnvelope } from './fixtures/o6-bootstrap.ts';
import { keys } from './fixtures/o1-fixture.ts';

function database() { return join(mkdtempSync(join(tmpdir(), 'dap-o6-')), 'journal.db'); }

test('O6: a newcomer reaches the published route, redeems a signed invitation, verifies and retries after reopen', (t) => {
  const result = runDemo(database());
  assert.equal(result.entriesAfterReopen, 4);
  assert.equal(result.pendingPublications, 4);
  assert.equal(result.joined.replay, false);
  assert.equal(result.retry.replay, true);
  assert.equal(result.reopenedRetry.replay, true);
  t.diagnostic(JSON.stringify({ genesis: result.genesis, origin: result.origin, route: result.route,
    positions: result.verifiedView.map(v => v.position), admission: result.interpretation.admission,
    receipt: result.joined.headerHash, retry: result.retry.headerHash, reopenedRetry: result.reopenedRetry.headerHash }));
});

test('O6: malformed, forged, unadopted or mismatched publications cannot resolve a journal', () => {
  const bytes = publication(), journal = create(database(), bytes), router = new FixtureRouter();
  try {
    router.publish(bytes, journal);
    const original = JSON.parse(bytes) as PublishedEnvelope;
    const corrupt = JSON.parse(original.L);
    corrupt.body.payload.ask = 1; // Original signature is deliberately retained.
    const differentL = structuredClone(verifyEnvelope(original.L).body);
    (differentL.payload as { ask: number }).ask = 1;
    const cases = [
      ['noncanonical', bytes + ' '],
      ['missing genesis', canonicalize({ L: original.L, route: original.route })],
      ['extra field', canonicalize({ ...original, unexpected: true })],
      ['forged listing', canonicalize({ ...original, L: canonicalize(corrupt) })],
      ['signed unadopted listing', canonicalize({ ...original, L: envelopeBytes(signEvent(differentL, keys.alice)) })],
      ['outer route mismatch', canonicalize({ ...original, route: ROUTE + '-other' })],
      ['different signed genesis', publication(ROUTE, '65'.repeat(16))],
    ];
    for (const [name, malformed] of cases) assert.throws(() => router.reach(ROUTE, malformed!), name);
    assert.throws(() => router.reach(ROUTE + '-other', bytes), /route mismatch/);
    const unknown = publication(ROUTE + '-unknown');
    assert.throws(() => router.reach(ROUTE + '-unknown', unknown), /route unavailable/);
    assert.throws(() => router.publish(publication(ROUTE, '65'.repeat(16)), journal), /journal does not match/);
    assert.throws(() => router.publish(bytes, journal), /route already published/);
    assert.equal(journal.context.head, 1);
    assert.equal(inspectPublication(bytes).genesis, journal.context.genesisId);
  } finally { journal.close(); }
});
