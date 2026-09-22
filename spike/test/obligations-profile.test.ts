import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Context } from '../src/context.ts';
import { CAP, K, F0_ID, F0_OBLIGATIONS_ID, foldEntry, initialFoundationState } from '../src/foundation.ts';
import { saleObligations } from '../fixtures/obligations.ts';
import { saleBase } from '../manifests/sale.ts';

test('T3 obligation foundation is explicitly pinned and cannot attach into baseline F0', () => {
  const pkg = saleObligations();
  const baseline = Context.create({ creator: 'alice', packages: { [pkg.id]: pkg }, grants: [{ principal: 'alice', capabilities: [CAP.attach] }] });
  assert.equal(baseline.state.foundationId, F0_ID);
  const result = baseline.act('alice', K.attach, { package: pkg.id });
  assert.ok(!('refused' in result));
  assert.equal(result.verdict?.reason, 'foundation_mismatch');
  assert.deepEqual(baseline.state.env.packages, []);
  assert.deepEqual(baseline.state.models, {});
  const extension = Context.create(saleBase(pkg));
  assert.equal(extension.state.foundationId, F0_OBLIGATIONS_ID);
  const genesis = structuredClone(extension.entries[0]!);
  (genesis.event.payload as { foundation: string }).foundation = F0_ID;
  assert.throws(() => foldEntry(initialFoundationState(genesis.id), { entry: genesis, origin: false, packages: extension.packages, entries: [genesis] }), { code: 'foundation_mismatch' });
});
