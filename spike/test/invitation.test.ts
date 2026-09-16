import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nonce } from '../src/canon.ts';
import { CAP, K, holdsNow, verifyEmbeddedInvite } from '../src/foundation.ts';
import { SALE } from '../fixtures/sale.ts';
import { ALICE, BOB, CAROL, accept, invite, saleContext } from './helpers.ts';

test('authorized issue, issuer revoked, then redeemed: effective (authority judged at issuance)', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB); // 2
  const rev = ctx.act(ALICE, K.revoke, { principal: ALICE, capabilities: [CAP.invite] }); // 3
  assert.ok(!('refused' in rev) && rev.verdict?.effective);
  assert.equal(holdsNow(ctx.state, ALICE, CAP.invite), false);
  const { result } = accept(ctx, BOB, pos); // 4
  assert.ok(!('refused' in result));
  assert.equal(result.verdict?.effective, true);
  assert.deepEqual(ctx.state.participants, [ALICE, BOB]);
  assert.equal(holdsNow(ctx.state, BOB, SALE + 'make_offer'), true);
});

test('unissued token: refused at admission, never sequenced', () => {
  const ctx = saleContext();
  const head = ctx.head;
  const forged = {
    invite: {
      event: { kind: K.invite, payload: { invitee: BOB, grants: { principal: BOB, roles: ['Buyer'] }, token_id: 'token:forged' }, actor: ALICE, nonce: nonce(), genesis: ctx.genesisId, action_id: 'a' },
      header: { genesis: ctx.genesisId, position: 1, prev: 'x', commitment: 'y' },
    },
  };
  const r = ctx.submit(ctx.intent(BOB, K.accept_invite, forged as never));
  assert.ok('refused' in r);
  assert.equal(r.reason, 'invitation_not_issued');
  assert.equal(ctx.head, head);
});

test('unauthorized issuer: the invite is sequenced but ineffective, and its token admits nobody', () => {
  const ctx = saleContext();
  const bobInvite = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, bobInvite);
  // Bob holds no dap.invite.
  const r = ctx.act(BOB, K.invite, { invitee: CAROL, grants: { principal: CAROL, roles: ['Buyer'] }, token_id: 'token:' + nonce() });
  assert.ok(!('refused' in r));
  assert.equal(r.verdict?.effective, false);
  assert.equal(r.verdict?.reason, 'unauthorized');
  const { result } = accept(ctx, CAROL, r.header.position);
  assert.ok('refused' in result);
  assert.equal(result.reason, 'invitation_not_issued');
  assert.deepEqual(ctx.state.participants, [ALICE, BOB]);
});

test('member-side verification refuses a header that is not in the chain', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB);
  const env = ctx.inviteEnvelope(pos);
  const tampered = { invite: { event: env.invite.event, header: { ...env.invite.header, prev: 'sha256:' + '1'.repeat(64) } } };
  const v = verifyEmbeddedInvite(ctx.state, ctx.entries, { kind: K.accept_invite, payload: tampered as never, actor: BOB, nonce: nonce() });
  assert.deepEqual(v, { ok: false, reason: 'not_in_chain' });
});

test('wrong invitee cannot redeem', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB);
  const { result } = accept(ctx, CAROL, pos);
  assert.ok('refused' in result);
  assert.equal(result.reason, 'invitation_wrong_invitee');
});

test('exact retry of a committed acceptance after consumption returns the receipt; changed content and reuse are refused', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB);
  const { event, result } = accept(ctx, BOB, pos, 'action:accept-1');
  assert.ok(!('refused' in result));
  assert.equal(result.replay, false);
  assert.equal(ctx.backend.isConsumed((event.payload as { invite: { event: { payload: { token_id: string } } } }).invite.event.payload.token_id), true);
  // exact retry
  const again = ctx.submit(event);
  assert.ok(!('refused' in again));
  assert.equal(again.replay, true);
  assert.equal(again.headerHash, result.headerHash);
  assert.equal(ctx.head, result.header.position);
  // changed content under the same action id
  const changed = ctx.submit({ ...event, nonce: nonce() });
  assert.ok('refused' in changed);
  assert.equal(changed.reason, 'changed_content');
  // a fresh action with the consumed token
  const reuse = ctx.submit(ctx.intent(BOB, K.accept_invite, ctx.inviteEnvelope(pos) as never));
  assert.ok('refused' in reuse);
  assert.equal(reuse.reason, 'invitation_consumed');
});
