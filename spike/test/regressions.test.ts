// Regressions for checker's V1 review (workroom report d74d2ac5), C1 to C10.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nonce } from '../src/canon.ts';
import { Context } from '../src/context.ts';
import { CAP, K, holdsNow } from '../src/foundation.ts';
import { MEMBERS } from '../src/types.ts';
import { SALE, salePackage } from '../fixtures/sale.ts';
import { ALICE, ALICE_CAPS, BOB, CAROL, accept, invite, listing, pkg, saleContext } from './helpers.ts';

test('C1: an ineffective duplicate invitation cannot supply grants; admission and verification use the same issuance object', () => {
  const ctx = saleContext();
  const first = ctx.act(ALICE, K.invite, { invitee: BOB, grants: { principal: BOB }, token_id: 'T' });
  assert.ok(!('refused' in first) && first.verdict?.effective);
  const second = ctx.act(ALICE, K.invite, { invitee: BOB, grants: { principal: BOB, capabilities: [CAP.grant] }, token_id: 'T' });
  assert.ok(!('refused' in second) && second.verdict?.effective); // a second issuance is its own token; it is not the first
  // Redeeming the first issuance grants nothing extra.
  const { result } = accept(ctx, BOB, first.header.position);
  assert.ok(!('refused' in result) && result.verdict?.effective);
  assert.equal(holdsNow(ctx.state, BOB, CAP.grant), false);
  // A tampered envelope is not an issuance: refused at admission, nothing consumed.
  const env = ctx.inviteEnvelope(second.header.position);
  const tampered = { invite: { event: { ...env.invite.event, payload: { ...(env.invite.event.payload as object), grants: { principal: CAROL, capabilities: [CAP.grant] } } }, header: env.invite.header } };
  const forged = ctx.submit(ctx.intent(CAROL, K.accept_invite, tampered as never));
  assert.ok('refused' in forged && forged.reason === 'invitation_not_issued');
  assert.equal(ctx.backend.isConsumed(ctx.entries[second.header.position]!.id), false);
  // The second issuance admits its invitee once, and the fold refuses a second membership; the token is spent.
  const again = accept(ctx, BOB, second.header.position);
  assert.ok(!('refused' in again.result));
  assert.equal(again.result.verdict?.reason, 'already_participant');
  assert.equal(holdsNow(ctx.state, BOB, CAP.grant), false);
  assert.equal(ctx.backend.isConsumed(ctx.entries[second.header.position]!.id), true);
});

test('C1: an unauthorized issuance is never an issued token, at admission or in the fold', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, pos);
  const bad = ctx.act(BOB, K.invite, { invitee: CAROL, grants: { principal: CAROL, capabilities: [CAP.grant] }, token_id: 'x' });
  assert.ok(!('refused' in bad) && bad.verdict?.reason === 'unauthorized');
  const { result } = accept(ctx, CAROL, bad.header.position);
  assert.ok('refused' in result && result.reason === 'invitation_not_issued');
});

test('C3a: a narrow attach caps every kind it declares; a members-audience event of that package is not served beyond the cap', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, pos);
  const secret = pkg('secret', { 'com.example.secret.note': ['secret'] });
  ctx.packages[secret.id] = secret;
  const a = ctx.act(ALICE, K.attach, { package: secret.id, audience: [] }); // Alice alone
  assert.ok(!('refused' in a) && a.verdict?.effective);
  const n = ctx.act(ALICE, 'com.example.secret.note', { text: 'secret' });
  assert.ok(!('refused' in n) && n.verdict?.effective);
  const aud = ctx.state.audiences[n.header.position]!;
  assert.deepEqual(aud, { kind: 'named', principals: [ALICE] });
  assert.equal(ctx.view(BOB)[n.header.position]!.event, undefined);
  assert.equal(ctx.view(ALICE)[n.header.position]!.event?.kind, 'com.example.secret.note');
});

test('C3b: observe honours a declared narrower audience', () => {
  const ctx = saleContext({ grants: [{ principal: ALICE, roles: ['Seller'], capabilities: [...ALICE_CAPS, CAP.observe] }] });
  const pos = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, pos);
  const o = ctx.act(ALICE, K.observe, { fact: { t: 42 }, audience: [] });
  assert.ok(!('refused' in o) && o.verdict?.effective);
  assert.deepEqual(ctx.state.audiences[o.header.position], { kind: 'named', principals: [ALICE] });
  assert.equal(ctx.view(BOB)[o.header.position]!.event, undefined);
  const o2 = ctx.act(ALICE, K.observe, { fact: { t: 43 } });
  assert.ok(!('refused' in o2));
  assert.equal(ctx.state.audiences[o2.header.position]!.kind, 'members');
});

test('C5: an intent bound to another context cannot be adopted as an origin; a system kind cannot be an origin', () => {
  const a = saleContext();
  const foreignGrant = a.intent(ALICE, K.grant, { principal: BOB, capabilities: [CAP.grant] });
  assert.throws(
    () => Context.create({ creator: ALICE, packages: { [salePackage.id]: salePackage }, bindings: [{ package: salePackage.id }], origins: [listing(), foreignGrant] }),
    (e: Error & { code?: string }) => e.code === 'origin_bound',
  );
  const standaloneGrant = { kind: K.grant, payload: { principal: BOB, capabilities: [CAP.grant] }, actor: ALICE, nonce: nonce() };
  assert.throws(
    () => Context.create({ creator: ALICE, packages: { [salePackage.id]: salePackage }, bindings: [{ package: salePackage.id }], origins: [listing(), standaloneGrant] }),
    (e: Error & { code?: string }) => e.code === 'system_origin',
  );
});

test('C8: committed entries and receipts are snapshots; a caller cannot rewrite them', () => {
  const ctx = saleContext({ grants: [{ principal: ALICE, roles: ['Seller'], capabilities: [...ALICE_CAPS, CAP.observe] }] });
  const payload = { fact: { t: 1 } };
  const ev = ctx.intent(ALICE, K.observe, payload, { action_id: 'action:m' });
  const r = ctx.submit(ev, ctx.credentialFor(ALICE));
  assert.ok(!('refused' in r));
  const stored = ctx.entries[r.header.position]!;
  payload.fact.t = 2;
  (ev as unknown as { payload: { fact: { t: number } } }).payload.fact.t = 2;
  assert.equal((stored.event.payload as { fact: { t: number } }).fact.t, 1);
  assert.throws(() => {
    (stored.event.payload as { fact: { t: number } }).fact.t = 3;
  }, TypeError);
  assert.throws(() => {
    (r.header as { position: number }).position = 99;
  }, TypeError);
  // the original intent replays; the mutated one is changed content
  const original = ctx.intent(ALICE, K.observe, { fact: { t: 1 } }, { action_id: 'action:m' });
  const replay = ctx.submit({ ...original, nonce: ev.nonce }, ctx.credentialFor(ALICE));
  assert.ok(!('refused' in replay) && replay.replay === true);
  const changed = ctx.submit(ev, ctx.credentialFor(ALICE));
  assert.ok('refused' in changed && changed.reason === 'changed_content');
});

test('C9: a malformed system payload is a deterministic ineffective verdict with the actor as its only reader; folding and retry continue', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, pos);
  const bad = ctx.act(ALICE, K.disclose, { positions: null, to: [BOB] } as never, { action_id: 'action:bad' });
  assert.ok(!('refused' in bad));
  assert.equal(bad.verdict?.reason, 'malformed');
  assert.deepEqual(ctx.state.audiences[bad.header.position], { kind: 'named', principals: [ALICE] });
  assert.equal(ctx.view(BOB)[bad.header.position]!.event, undefined);
  const next = invite(ctx, ALICE, CAROL);
  assert.equal(ctx.verdictAt(next)?.effective, true);
  const retry = ctx.submit(ctx.entries[bad.header.position]!.event, ctx.credentialFor(ALICE));
  assert.ok(!('refused' in retry) && retry.replay === true && retry.verdict?.reason === 'malformed');
});

test('C10: close stops application events and leaves foundation administration open', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, pos);
  const c = ctx.act(ALICE, K.close, {});
  assert.ok(!('refused' in c) && c.verdict?.effective);
  const app = ctx.act(BOB, SALE + 'offer', { offer_id: 'o1' });
  assert.ok(!('refused' in app) && app.verdict?.reason === 'closed');
  const rev = ctx.act(ALICE, K.revoke, { principal: BOB, roles: ['Buyer'] });
  assert.ok(!('refused' in rev) && rev.verdict?.effective);
  assert.equal(holdsNow(ctx.state, BOB, SALE + 'make_offer'), false);
  const d = ctx.act(ALICE, K.disclose, { positions: [2], to: [CAROL] });
  assert.ok(!('refused' in d) && d.verdict?.effective);
});

test('a capped package cannot widen through a members policy either', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, pos);
  const p = pkg('cap', { 'com.example.cap.x': { handlers: ['cap'], audienceId: 'members', audience: () => MEMBERS } });
  ctx.packages[p.id] = p;
  const a = ctx.act(ALICE, K.attach, { package: p.id, audience: [BOB] });
  assert.ok(!('refused' in a) && a.verdict?.effective);
  const iCarol = invite(ctx, ALICE, CAROL);
  accept(ctx, CAROL, iCarol);
  const x = ctx.act(ALICE, 'com.example.cap.x', {});
  assert.ok(!('refused' in x) && x.verdict?.effective);
  assert.deepEqual(ctx.state.audiences[x.header.position], { kind: 'named', principals: [ALICE, BOB] });
});
