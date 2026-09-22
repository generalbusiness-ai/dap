import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkDeclaration, derivations } from '../compiler.ts';
import { sale } from '../declarations/sale.ts';
import { booking } from '../declarations/booking.ts';
import { discussion } from '../declarations/discussion.ts';
import { diagnosed } from '../baselines/shapes.ts';
import { guard, obj, op, privateValue, read } from '../schema.ts';
import { salePackage, evaluate } from '../generated/sale.ts';
import { descriptorId } from '../../src/descriptor.ts';

for (const [name, declaration] of Object.entries({ sale, booking, discussion })) test(name + ' is a checked data declaration', () => assert.deepEqual(checkDeclaration(declaration), []));
for (const [name, code, witness] of [
  ['lateMember', 'containment', 'corpus/sale/run1/seed-158.json'],
  ['payloadAudience', 'audience from payload', 'corpus/sale/run6/seed-172.json'],
  ['assertedReference', 'self-asserted reference', 'lang/test/witnesses.test.ts#V3-F2'],
  ['club', 'unjudgeable reference', 'test/club-a5.test.ts'],
] as const) test(name + ' is refused with its diagnostic and pinned witness', () => {
  const diagnostics = checkDeclaration(diagnosed[name]);
  assert.ok(diagnostics.some((d) => d.code === code && d.witness === witness), JSON.stringify(diagnostics));
});
for (const mode of ['count', 'absent']) for (const site of ['guard', 'effect', 'derived column', 'query', 'affordance'] as const) test(mode + ' cannot read a private relation in a public ' + site, () => {
  const d = structuredClone(sale);
  const x = read('terms', mode);
  const a = d.acts.find((a) => a.kind.endsWith('.offer'))!;
  if (site === 'guard') a.guards.push(guard(op('eq', x, 0), 'private_test'));
  if (site === 'effect') a.writes[0]!.values['total'] = x;
  if (site === 'derived column') d.tables.offers!.columns['total'] = { type: 'integer', derive: x };
  if (site === 'query') d.query = obj({ total: x });
  if (site === 'affordance') a.candidates = x;
  assert.ok(checkDeclaration(d).some((v) => v.site === site && v.dependency === 'terms'), JSON.stringify(checkDeclaration(d)));
});
test('a sibling row projection does not authorize a private aggregate', () => {
  const d = structuredClone(sale);
  d.query = privateValue('sale-parties', obj({ rows: read('terms', 'rows'), total: read('terms', 'count') }));
  assert.ok(checkDeclaration(d).some((v) => v.code === 'incomplete relation'));
});
test('record splitting derives two event kinds and a public linkage prerequisite', () => {
  assert.deepEqual(discussion.acts.map((a) => [a.kind, a.readers, Object.keys(a.schema)]), [
    ['example.discussion.post', 'members', ['id', 'title']], ['example.discussion.post_text', 'author', ['id', 'text']],
  ]);
  assert.ok(discussion.acts[1]!.guards.some((g) => 'table' in g && g.table === 'posts'));
});
test('backlog and disclosure kinds are derived from dependencies and maxima', () => {
  assert.deepEqual(derivations(sale).backlogKinds, ['com.example.sale.offer', 'com.example.sale.withdraw', 'com.example.sale.accept']);
  assert.deepEqual(derivations(booking).backlogKinds, ['ai.generalbusiness.dap.observe', 'com.example.booking.occupancy', 'com.example.booking.free']);
  assert.ok(!derivations(booking).disclosureKinds.includes('com.example.booking.request'));
  assert.equal((salePackage.models.sale!.config as any).disclosurePolicy.authorizedOnly, true);
});
test('emitted fixture loads as a descriptor whose source and runtime are pinned', () => {
  const { id, ...base } = salePackage;
  assert.equal(descriptorId(base), id);
  assert.match((salePackage.models.sale!.config as any).sourceId, /^sha256:/);
  assert.ok(salePackage.module?.endsWith('/lang/generated/sale.ts'));
});
test('latest version is selected by original position, never disclosure arrival', () => {
  const env: Parameters<typeof evaluate>[1] = { declaration: sale, state: { terms: [{ id: 'a', amount: 9, position: 9, _readers: null }, { id: 'a', amount: 3, position: 3, _readers: null }] }, payload: {}, actor: 'alice', principal: 'alice', id: '', position: 10, origin: false, vars: {}, visible: () => true };
  assert.equal((evaluate(read('terms', 'latest', { key: 'a' }), env) as any).amount, 9);
  assert.equal((evaluate(read('terms', 'latest', { key: 'a' }), { ...env, visible: (n) => n === 3 }) as any).amount, 3);
});
test('derived audiences are total over runtime JSON', () => {
  for (const binding of Object.values(salePackage.kinds)) for (const payload of [null, 17, [], 'x', {}, { offer_id: [], author: {} }]) {
    assert.doesNotThrow(() => binding.audience({ position: 1, members: ['a'], holders: () => [], modelState: () => ({}) }, { actor: 'a', kind: binding.kind, payload: payload as import('../../src/canon.ts').Json, nonce: 'n' }));
  }
});
