import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attach, bindingId, descriptorId, emptyEnvironment, type PackageDescriptor } from '../src/descriptor.ts';
import { K, RUNTIME } from '../src/foundation.ts';
import { MEMBERS, SYSTEM_PREFIX } from '../src/types.ts';
import { SALE, salePackage } from '../fixtures/sale.ts';
import { ALICE, BOB, accept, invite, saleContext } from './helpers.ts';

function pkg(name: string, kinds: Record<string, string[]>, modelId = name): PackageDescriptor {
  const base: Omit<PackageDescriptor, 'id'> = {
    name,
    models: { [modelId]: { id: modelId, init: () => ({}), fold: (s) => ({ effective: true, state: s }) } },
    capabilities: [],
    kinds: Object.fromEntries(Object.entries(kinds).map(([k, handlers]) => [k, { kind: k, handlers, audienceId: 'members', audience: () => MEMBERS }])),
  };
  return { id: descriptorId(base), ...base };
}

test('a package declaring a name under the system prefix is refused', () => {
  const bad = pkg('bad', { [SYSTEM_PREFIX + 'sneaky']: ['bad'] });
  assert.deepEqual(attach(emptyEnvironment(RUNTIME), bad), { ok: false, reason: 'namespace' });
  const ctx = saleContext();
  ctx.packages[bad.id] = bad;
  const r = ctx.act(ALICE, K.attach, { package: bad.id });
  assert.ok(!('refused' in r) && r.verdict?.reason === 'namespace');
});

test('two handlers for one kind without a resolution is ambiguous; with a resolution naming both it is accepted', () => {
  const env0 = attach(emptyEnvironment(RUNTIME), salePackage);
  assert.ok(env0.ok);
  const inspection = pkg('inspection', { [SALE + 'accept']: ['inspection'] });
  assert.deepEqual(attach(env0.env, inspection), { ok: false, reason: 'ambiguous_binding' });
  const partial = attach(env0.env, inspection, { [SALE + 'accept']: { handlers: ['inspection'] } });
  assert.deepEqual(partial, { ok: false, reason: 'ambiguous_binding' });
  const resolved = attach(env0.env, inspection, { [SALE + 'accept']: { handlers: ['sale', 'inspection'] } });
  assert.ok(resolved.ok);
  assert.deepEqual(resolved.env.kinds[SALE + 'accept']!.handlers, ['sale', 'inspection']);
});

test('binding identity is per kind: an unrelated attach does not change it; a relevant change does', () => {
  const env0 = attach(emptyEnvironment(RUNTIME), salePackage);
  assert.ok(env0.ok);
  const before = bindingId(env0.env, SALE + 'offer');
  const unrelated = attach(env0.env, pkg('chat', { 'com.example.chat.post': ['chat'] }));
  assert.ok(unrelated.ok);
  assert.equal(bindingId(unrelated.env, SALE + 'offer'), before);
  const relevant = attach(env0.env, pkg('audit', { [SALE + 'offer']: ['audit'] }), { [SALE + 'offer']: { handlers: ['sale', 'audit'] } });
  assert.ok(relevant.ok);
  assert.notEqual(bindingId(relevant.env, SALE + 'offer'), before);
});

test('stale_binding: an intent whose expected binding changed is refused; an unrelated attach does not stale it', () => {
  const ctx = saleContext();
  const pos = invite(ctx, ALICE, BOB);
  accept(ctx, BOB, pos);
  const expected = bindingId(ctx.state.env, SALE + 'offer')!;
  // unrelated private attach
  const chat = pkg('chat', { 'com.example.chat.post': ['chat'] });
  ctx.packages[chat.id] = chat;
  const a1 = ctx.act(ALICE, K.attach, { package: chat.id, audience: [ALICE] });
  assert.ok(!('refused' in a1) && a1.verdict?.effective);
  assert.equal(ctx.state.audiences[a1.header.position]?.kind, 'named');
  const r1 = ctx.act(BOB, SALE + 'offer', { offer_id: 'o1' }, { expected_binding: expected });
  assert.ok(!('refused' in r1));
  assert.equal(r1.verdict?.authorized, true);
  assert.notEqual(r1.verdict?.reason, 'stale_binding');
  // relevant binding change
  const audit = pkg('audit', { [SALE + 'offer']: ['audit'] });
  ctx.packages[audit.id] = audit;
  const a2 = ctx.act(ALICE, K.attach, { package: audit.id, resolution: { [SALE + 'offer']: { handlers: ['sale', 'audit'] } } });
  assert.ok(!('refused' in a2) && a2.verdict?.effective);
  const r2 = ctx.act(BOB, SALE + 'offer', { offer_id: 'o2' }, { expected_binding: expected });
  assert.ok(!('refused' in r2));
  assert.equal(r2.verdict?.reason, 'stale_binding');
});
