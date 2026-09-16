import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attach, bindingId, emptyEnvironment, type PackageDescriptor } from '../src/descriptor.ts';
import { K, RUNTIME } from '../src/foundation.ts';
import { MEMBERS, SYSTEM_PREFIX, named, type EventBody } from '../src/types.ts';
import { SALE, salePackage } from '../fixtures/sale.ts';
import { ALICE, BOB, accept, invite, pkg, saleContext } from './helpers.ts';

test('a package declaring a name under the system prefix is refused, whatever it claims about itself', () => {
  const bad = pkg('bad', { [SYSTEM_PREFIX + 'sneaky']: ['bad'] });
  assert.deepEqual(attach(emptyEnvironment(RUNTIME), bad), { ok: false, reason: 'namespace' });
  const selfDeclared = { ...bad, foundation: true } as PackageDescriptor;
  assert.equal(attach(emptyEnvironment(RUNTIME), selfDeclared).ok, false);
  const ctx = saleContext();
  ctx.packages[bad.id] = bad;
  const r = ctx.act(ALICE, K.attach, { package: bad.id });
  assert.ok(!('refused' in r) && r.verdict?.reason === 'namespace');
});

test('a descriptor whose id does not match its content is refused', () => {
  const p = pkg('p', { 'com.example.p.x': ['p'] });
  const lying = { ...p, id: 'sha256:' + '0'.repeat(64) };
  assert.deepEqual(attach(emptyEnvironment(RUNTIME), lying), { ok: false, reason: 'descriptor_id_mismatch' });
});

test('two handlers for one kind without a resolution is ambiguous; a resolution naming exactly both is accepted', () => {
  const env0 = attach(emptyEnvironment(RUNTIME), salePackage);
  assert.ok(env0.ok);
  const inspection = pkg('inspection', { [SALE + 'accept']: ['inspection'] });
  assert.deepEqual(attach(env0.env, inspection), { ok: false, reason: 'ambiguous_binding' });
  assert.deepEqual(attach(env0.env, inspection, { resolution: { [SALE + 'accept']: { handlers: ['inspection'] } } }), { ok: false, reason: 'ambiguous_binding' });
  const resolved = attach(env0.env, inspection, { resolution: { [SALE + 'accept']: { handlers: ['sale', 'inspection'] } } });
  assert.ok(resolved.ok);
  assert.deepEqual(resolved.env.kinds[SALE + 'accept']!.handlers, ['sale', 'inspection']);
});

test('resolution retains the capability and the active audience policy: attaching a handler never widens', () => {
  const env0 = attach(emptyEnvironment(RUNTIME), salePackage);
  assert.ok(env0.ok);
  const before = env0.env.kinds[SALE + 'offer_terms']!;
  // a second handler with no capability and a members audience
  const wide = pkg('wide', { [SALE + 'offer_terms']: { handlers: ['wide'], audienceId: 'members', audience: () => MEMBERS } });
  const out = attach(env0.env, wide, { resolution: { [SALE + 'offer_terms']: { handlers: ['sale', 'wide'] } } });
  assert.ok(out.ok);
  const after = out.env.kinds[SALE + 'offer_terms']!;
  assert.equal(after.capability, before.capability);
  assert.equal(after.audienceId, before.audienceId);
  assert.equal(after.audience, before.audience);
  const ev: EventBody = { kind: SALE + 'offer_terms', payload: { seller: ALICE }, actor: BOB, nonce: 'n' };
  assert.deepEqual(after.audience({ position: 9, members: [ALICE, BOB, 'carol'], holders: () => [] }, ev), named(ALICE, BOB));
  // a conflicting capability cannot be resolved
  const conflict = pkg('conflict', { [SALE + 'offer_terms']: { handlers: ['conflict'], capability: 'com.example.other.cap' } });
  assert.deepEqual(attach(env0.env, conflict, { resolution: { [SALE + 'offer_terms']: { handlers: ['sale', 'conflict'] } } }), { ok: false, reason: 'conflicting_capability' });
});

test('identities follow executable content: a changed fold changes descriptor and binding ids', () => {
  const a = pkg('m', { 'com.example.m.tick': ['m'] }, { fold: (s) => ({ effective: true, state: { count: (s as { count: number }).count + 1 } }) });
  const b = pkg('m', { 'com.example.m.tick': ['m'] }, { fold: (s) => ({ effective: true, state: { count: (s as { count: number }).count + 100 } }) });
  assert.notEqual(a.id, b.id);
  const ea = attach(emptyEnvironment(RUNTIME), a);
  const eb = attach(emptyEnvironment(RUNTIME), b);
  assert.ok(ea.ok && eb.ok);
  assert.notEqual(bindingId(ea.env, 'com.example.m.tick'), bindingId(eb.env, 'com.example.m.tick'));
});

test('binding identity is per kind: an unrelated attach does not change it; a relevant change does', () => {
  const env0 = attach(emptyEnvironment(RUNTIME), salePackage);
  assert.ok(env0.ok);
  const before = bindingId(env0.env, SALE + 'offer');
  const unrelated = attach(env0.env, pkg('chat', { 'com.example.chat.post': ['chat'] }));
  assert.ok(unrelated.ok);
  assert.equal(bindingId(unrelated.env, SALE + 'offer'), before);
  const relevant = attach(env0.env, pkg('audit', { [SALE + 'offer']: ['audit'] }), { resolution: { [SALE + 'offer']: { handlers: ['sale', 'audit'] } } });
  assert.ok(relevant.ok);
  assert.notEqual(bindingId(relevant.env, SALE + 'offer'), before);
});

test('an application intent captures its binding by default; a relevant attach stales it, an unrelated private attach does not; a missing binding is refused', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, pos);
  // saved before any attach, with the binding captured by the default constructor
  const saved = ctx.intent(BOB, SALE + 'offer', { offer_id: 'o1' });
  assert.equal(saved.expected_binding, ctx.currentBinding(SALE + 'offer'));
  // unrelated private attach
  const chat = pkg('chat', { 'com.example.chat.post': ['chat'] });
  ctx.packages[chat.id] = chat;
  const a1 = ctx.act(ALICE, K.attach, { package: chat.id, audience: [ALICE] });
  assert.ok(!('refused' in a1) && a1.verdict?.effective);
  const r1 = ctx.submit(saved, ctx.credentialFor(BOB));
  assert.ok(!('refused' in r1));
  assert.equal(r1.verdict?.authorized, true);
  assert.notEqual(r1.verdict?.reason, 'stale_binding');
  // relevant binding change
  const audit = pkg('audit', { [SALE + 'offer']: ['audit'] });
  ctx.packages[audit.id] = audit;
  const a2 = ctx.act(ALICE, K.attach, { package: audit.id, resolution: { [SALE + 'offer']: { handlers: ['sale', 'audit'] } } });
  assert.ok(!('refused' in a2) && a2.verdict?.effective);
  const stale = ctx.submit({ ...saved, nonce: 'x', action_id: 'action:stale' }, ctx.credentialFor(BOB));
  assert.ok(!('refused' in stale));
  assert.equal(stale.verdict?.reason, 'stale_binding');
  // a fresh intent carries the new binding and is judged under it
  const fresh = ctx.act(BOB, SALE + 'offer', { offer_id: 'o3' });
  assert.ok(!('refused' in fresh));
  assert.notEqual(fresh.verdict?.reason, 'stale_binding');
  // a missing binding is refused, not executed under whatever is current
  const { expected_binding: _e, ...bare } = ctx.intent(BOB, SALE + 'offer', { offer_id: 'o4' });
  const r3 = ctx.submit(bare, ctx.credentialFor(BOB));
  assert.ok(!('refused' in r3));
  assert.equal(r3.verdict?.reason, 'no_expected_binding');
});
