import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ZERO_HASH, contentId } from '../src/canon.ts';
import { MemoryBackend } from '../src/append.ts';
import { K } from '../src/foundation.ts';
import { ALICE, BOB, accept, invite, saleContext } from './helpers.ts';

test('a submission without a credential is refused; a forged credential for a non-participant is refused', () => {
  const ctx = saleContext();
  const ev = ctx.intent(BOB, K.observe, { t: 1 });
  const none = ctx.submit(ev);
  assert.ok('refused' in none && none.reason === 'no_credential');
  const forged = ctx.submit(ev, { principal: BOB });
  assert.ok('refused' in forged && forged.reason === 'not_a_participant');
});

test('stable facts are checked first: wrong genesis, missing action id, envelope bounds', () => {
  const ctx = saleContext();
  const ev = ctx.intent(ALICE, K.observe, { t: 1 });
  const wrong = ctx.submit({ ...ev, genesis: 'sha256:' + 'a'.repeat(64) }, ctx.credentialFor(ALICE));
  assert.ok('refused' in wrong && wrong.reason === 'wrong_genesis');
  const { action_id: _drop, ...noAction } = ev;
  const missing = ctx.submit(noAction, ctx.credentialFor(ALICE));
  assert.ok('refused' in missing && missing.reason === 'no_action_id');
  const big = ctx.submit(ctx.intent(ALICE, K.observe, { blob: 'x'.repeat(70 * 1024) }), ctx.credentialFor(ALICE));
  assert.ok('refused' in big && big.reason === 'envelope_bounds');
});

test('positions are dense and every header binds its predecessor', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, pos);
  const es = ctx.entries;
  assert.equal(es[0]!.header.prev, ZERO_HASH);
  assert.equal(es[0]!.header.commitment, ctx.genesisId);
  for (let i = 0; i < es.length; i++) {
    assert.equal(es[i]!.position, i);
    assert.equal(es[i]!.header.commitment, es[i]!.id);
    assert.equal(es[i]!.headerHash, contentId(es[i]!.header as never));
    if (i > 0) assert.equal(es[i]!.header.prev, es[i - 1]!.headerHash);
  }
});

test('the memory backend refuses re-entrant appends', () => {
  const b = new MemoryBackend();
  assert.throws(() => b.serialized(() => b.serialized(() => 1)), /re-entrant/);
});
