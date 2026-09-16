// Regressions for checker's V1 review (workroom report d74d2ac5), C1 to C10.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nonce } from '../src/canon.ts';
import { Context } from '../src/context.ts';
import { CAP, K, holdsNow, issuanceEvidence, verifyIssuance } from '../src/foundation.ts';
import { attach, bindingId, descriptorId, emptyEnvironment, findModel, type PackageDescriptor } from '../src/descriptor.ts';
import { RUNTIME } from '../src/foundation.ts';
import { MEMBERS } from '../src/types.ts';
import { SALE, salePackage } from '../fixtures/sale.ts';
import { ALICE, ALICE_CAPS, BOB, CAROL, accept, invite, listing, pkg, saleContext } from './helpers.ts';
import { counterPackage as counterAdd1 } from './fixtures/counter-add1.ts';
import { counterPackage as counterAdd100 } from './fixtures/counter-add100.ts';

test('C1: a second issuance with the same label is its own token; admission and verification use the same issuance object and a tampered envelope supplies nothing', () => {
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

// ----- second review (workroom report d2417ad5), D1 to D3 -----

test('D1: a member who never saw the private invitation verifies the acceptance from headers and the spine alone', () => {
  const ctx = saleContext();
  const iBob = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, iBob);
  const iCarol = invite(ctx, ALICE, CAROL); // private to Alice and Carol; Bob holds only its header
  assert.equal(ctx.view(BOB)[iCarol]!.event, undefined);
  const carolAccept = ctx.intent(CAROL, K.accept_invite, ctx.inviteEnvelope(iCarol) as never);
  // Bob's evidence: headers of the chain and the spine grant history. No verdicts, no invite records.
  const bobsEvidence = { headers: ctx.entries.map((e) => ({ id: e.id, headerHash: e.headerHash })), grantHistory: ctx.state.grantHistory };
  const v = verifyIssuance(bobsEvidence, carolAccept.payload);
  assert.ok(v.ok);
  assert.equal(v.tokenId, ctx.entries[iCarol]!.id);
  // negatives from the same evidence: tampered payload, unauthorized issuer, malformed issuance
  const env = ctx.inviteEnvelope(iCarol);
  const tampered = { invite: { event: { ...env.invite.event, payload: { ...(env.invite.event.payload as object), grants: { principal: CAROL, capabilities: [CAP.grant] } } }, header: env.invite.header } };
  assert.equal(verifyIssuance(bobsEvidence, tampered).ok, false);
  const byBob = ctx.act(BOB, K.invite, { invitee: 'dave', grants: { principal: 'dave' }, token_id: 'x' });
  assert.ok(!('refused' in byBob) && byBob.verdict?.reason === 'unauthorized');
  const daveAccept = ctx.intent('dave', K.accept_invite, ctx.inviteEnvelope(byBob.header.position) as never);
  const v2 = verifyIssuance(issuanceEvidence(ctx.state, ctx.entries), daveAccept.payload);
  assert.deepEqual(v2, { ok: false, reason: 'issuer_unauthorized' });
  const malformed = ctx.act(ALICE, K.invite, { invitee: 'erin', token_id: 'y' } as never);
  assert.ok(!('refused' in malformed) && malformed.verdict?.reason === 'malformed');
  const erinAccept = ctx.intent('erin', K.accept_invite, ctx.inviteEnvelope(malformed.header.position) as never);
  assert.deepEqual(verifyIssuance(issuanceEvidence(ctx.state, ctx.entries), erinAccept.payload), { ok: false, reason: 'issuance_ineffective' });
});

test('D2: captured values are outside the identity, so they must live in config, which is inside it', () => {
  const makeFold = (step: number) => (s: { count: number }) => ({ effective: true, state: { count: s.count + step } });
  // Same text, different captures: the fixture rule is that such a value goes in config.
  const a = pkg('m', { 'com.example.m.tick': ['m'] }, { fold: makeFold(1) as never, config: { step: 1 } });
  const b = pkg('m', { 'com.example.m.tick': ['m'] }, { fold: makeFold(100) as never, config: { step: 100 } });
  assert.notEqual(a.id, b.id);
  const ea = attach(emptyEnvironment(RUNTIME), a);
  const eb = attach(emptyEnvironment(RUNTIME), b);
  assert.ok(ea.ok && eb.ok);
  assert.notEqual(bindingId(ea.env, 'com.example.m.tick'), bindingId(eb.env, 'com.example.m.tick'));
  // A fold that reads its step from config is pinned by config alone.
  const c1 = pkg('n', { 'com.example.n.tick': ['n'] }, { fold: ((s: { count: number }, _e: unknown, _c: unknown, cfg: { step: number }) => ({ effective: true, state: { count: s.count + cfg.step } })) as never, config: { step: 1 } });
  const c2 = pkg('n', { 'com.example.n.tick': ['n'] }, { fold: ((s: { count: number }, _e: unknown, _c: unknown, cfg: { step: number }) => ({ effective: true, state: { count: s.count + cfg.step } })) as never, config: { step: 100 } });
  assert.notEqual(c1.id, c2.id);
});

test('D2: an installed descriptor is frozen; replacing a fold after attach throws and changes nothing', () => {
  const p = pkg('frozen', { 'com.example.frozen.tick': ['frozen'] });
  const out = attach(emptyEnvironment(RUNTIME), p);
  assert.ok(out.ok);
  assert.throws(() => {
    (p.models['frozen'] as { fold: unknown }).fold = () => ({ effective: true, state: { count: 999 } });
  }, TypeError);
  assert.equal(findModel(out.env, 'frozen'), p.models['frozen']);
});

test('D2: a second definition under a model name in use is refused unless it is the same definition', () => {
  const a = pkg('pa', { 'com.example.pa.tick': ['counter'] }, { modelId: 'counter', fold: ((s: { count: number }) => ({ effective: true, state: { count: s.count + 1 } })) as never });
  const b = pkg('pb', { 'com.example.pb.tick': ['counter'] }, { modelId: 'counter', fold: ((s: { count: number }) => ({ effective: true, state: { count: s.count + 100 } })) as never });
  const ea = attach(emptyEnvironment(RUNTIME), a);
  assert.ok(ea.ok);
  assert.deepEqual(attach(ea.env, b), { ok: false, reason: 'model_conflict' });
  // the same definition under the same name is fine
  const same = pkg('pc', { 'com.example.pc.tick': ['counter'] }, { modelId: 'counter', fold: a.models['counter']!.fold });
  assert.ok(attach(ea.env, same).ok);
});

test('D3: observe may narrow only to current members; naming a future member is ineffective and read by the actor alone', () => {
  const ctx = saleContext({ grants: [{ principal: ALICE, roles: ['Seller'], capabilities: [...ALICE_CAPS, CAP.observe] }] });
  const iBob = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, iBob);
  const o = ctx.act(ALICE, K.observe, { fact: { t: 7 }, audience: [CAROL] });
  assert.ok(!('refused' in o));
  assert.equal(o.verdict?.reason, 'audience_outside_members');
  assert.deepEqual(ctx.state.audiences[o.header.position], { kind: 'named', principals: [ALICE] });
  const iCarol = invite(ctx, ALICE, CAROL);
  accept(ctx, CAROL, iCarol);
  assert.equal(ctx.view(CAROL)[o.header.position]!.event, undefined);
  const ok = ctx.act(ALICE, K.observe, { fact: { t: 8 }, audience: [BOB] });
  assert.ok(!('refused' in ok) && ok.verdict?.effective);
  assert.deepEqual(ctx.state.audiences[ok.header.position], { kind: 'named', principals: [ALICE, BOB] });
});

// ----- third review (workroom report c64636e7), E1 and E2 -----

test('E1: a module-local helper is part of identity; same text and config in different modules bind differently and conflict on a shared model name', () => {
  const a = counterAdd1('com.example.counter.a');
  const b = counterAdd100('com.example.counter.b');
  assert.notEqual(a.id, b.id);
  const ea = attach(emptyEnvironment(RUNTIME), a);
  const eb = attach(emptyEnvironment(RUNTIME), b);
  assert.ok(ea.ok && eb.ok);
  assert.notEqual(bindingId(ea.env, 'com.example.counter.a'), bindingId(eb.env, 'com.example.counter.b'));
  // the +100 module under the same model name, for a new kind, into the +1 environment
  assert.deepEqual(attach(ea.env, b), { ok: false, reason: 'model_conflict' });
  // and the same module for a second kind is fine: identical definition
  const a2 = counterAdd1('com.example.counter.c');
  assert.ok(attach(ea.env, a2).ok);
  // executed semantics follow the module: a context on each package counts differently
  const run = (p: PackageDescriptor, kind: string) => {
    const ctx = Context.create({ creator: ALICE, packages: { [p.id]: p }, bindings: [{ package: p.id }], grants: [{ principal: ALICE, capabilities: [] }] });
    const r = ctx.act(ALICE, kind, {});
    assert.ok(!('refused' in r) && r.verdict?.effective);
    return (ctx.state.models['counter'] as { count: number }).count;
  };
  assert.equal(run(a, 'com.example.counter.a'), 1);
  assert.equal(run(b, 'com.example.counter.b'), 100);
});

test('E2: a shallow-frozen input descriptor is frozen recursively on attach; a nested config cannot change', () => {
  const p = pkg('prefrozen', { 'com.example.prefrozen.tick': ['prefrozen'] }, { config: { step: 1 } });
  Object.freeze(p);
  assert.equal(Object.isFrozen(p.models['prefrozen']!.config), false);
  const out = attach(emptyEnvironment(RUNTIME), p);
  assert.ok(out.ok);
  assert.equal(Object.isFrozen(p.models['prefrozen']!.config), true);
  const before = bindingId(out.env, 'com.example.prefrozen.tick');
  assert.throws(() => {
    (p.models['prefrozen']!.config as { step: number }).step = 100;
  }, TypeError);
  assert.equal(bindingId(out.env, 'com.example.prefrozen.tick'), before);
});
