import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildThrough, keys, principals, type LifecycleWorld, type Name, type Person } from '../fixtures/ordering-lifecycle-runner.ts';
import { recordScope } from '../fixtures/ordering-scope-records.ts';
import { envelopeBytes, signEvent, type ActorEnvelope } from '../src/codec.ts';
import { ZERO_HASH, type Json } from '../src/canon.ts';
import { K, CAP, F0_ID, RUNTIME, holdsNow } from '../src/foundation.ts';
import { Journal, O1_PROFILE_VERSION } from '../src/journal.ts';
import { MemoryBackend } from '../src/append.ts';
import { SQLiteBackend } from '../src/sqlite.ts';
import { own, packageIn, setOwn, attach, emptyEnvironment, descriptorId, findModel, type ModelSpec, type PackageDescriptor } from '../src/descriptor.ts';
import { interpretView } from '../src/interpret.ts';
import { observe } from '../src/observe.ts';
import { SPINE, named } from '../src/types.ts';
import { deserializeSteps } from '../src/corpus.ts';

const names = ['constructor', '__proto__', 'toString', 'hasOwnProperty'];
function accepted(result: ReturnType<LifecycleWorld['emit']>) { assert.ok(!('refused' in result), JSON.stringify(result)); return result; }
function effective(result: ReturnType<LifecycleWorld['emit']>) { const r = accepted(result); assert.equal((r.controlVerdict ?? r.verdict)?.effective, true, JSON.stringify(r)); return r; }

for (const storage of ['memory', 'sqlite'] as const) test('O4 L1 property-name attempts retain retries, cold state and completed transfer: ' + storage, () => {
  const world = buildThrough('inspection-attached', {}, storage);
  const saved: { name: Name; actor: Person; envelope: ActorEnvelope; receipt: ReturnType<typeof accepted> }[] = [];
  function remember(name: Name, actor: Person, receipt: ReturnType<typeof accepted>) {
    const envelope = world.envelopes.get(name + '@' + receipt.header.position)!;
    const original = { name, actor, receipt, envelope }; saved.push(original);
    retry(original); world.restart(name); retry(original);
  }
  function retry(original: typeof saved[number]) {
    const { name, actor, envelope, receipt } = original, head = world.contexts[name]!.journal.context.head;
    const r = accepted(world.emit(name, actor, '', {}, envelope));
    assert.equal(r.replay, true); assert.equal(r.headerHash, receipt.headerHash); assert.deepEqual(r.verdict, receipt.verdict);
    assert.equal(world.contexts[name]!.journal.context.head, head);
    assert.equal(world.contexts[name]!.journal.context.entries[receipt.header.position]!.committed, envelopeBytes(envelope));
  }
  function attempts(name: Name, actor: Person) {
    for (const kind of names) {
      const context = world.contexts[name]!.journal.context;
      assert.equal(context.currentBinding(kind), undefined);
      const event = signEvent(context.intent(principals[actor], kind, {}, { expected_binding: ZERO_HASH, action_id: 'l1:' + saved.length, nonce: (saved.length + 1).toString(16).padStart(32, '0') }), keys[actor]);
      const r = accepted(world.emit(name, actor, kind, {}, event));
      assert.deepEqual(r.verdict, { known: false, authorized: false, effective: false, reason: 'unhandled' });
      assert.deepEqual(context.state.audiences[r.header.position], named(principals[actor]));
      remember(name, actor, r);
    }
  }
  try {
    attempts('S', 'carol');
    for (const role of names) for (const kind of [K.grant, K.revoke]) {
      const grants = structuredClone(world.contexts.S!.journal.context.state.grantHistory);
      const r = effective(world.emit('S', 'alice', kind, { principal: principals.bob, roles: [role] }));
      assert.deepEqual(world.contexts.S!.journal.context.state.grantHistory, grants, 'an unknown role adds no capabilities');
      remember('S', 'alice', r);
    }
    const invitation = effective(world.emit('S', 'alice', K.invite, { invitee: principals.kim, grants: { principal: principals.kim, roles: names }, token_id: 'l1-invite' }));
    const joined = effective(world.emit('S', 'kim', K.accept_invite, world.contexts.S!.journal.context.inviteEnvelope(invitation.header.position) as never));
    assert.ok(world.contexts.S!.journal.context.state.participants.includes(principals.kim));
    assert.ok(!world.contexts.S!.journal.context.state.grantHistory.some(g => g.principal === principals.kim));
    remember('S', 'kim', joined);
    for (const packageId of names) {
      const r = accepted(world.emit('S', 'alice', K.attach, { package: packageId }));
      assert.equal(r.verdict?.reason, 'package_unavailable'); remember('S', 'alice', r);
    }
    world.saleThrough14(); world.spawnInspection(); effective(world.inspectionResult());
    effective(world.saleThrough17()); effective(world.saleThrough19()); effective(world.importInspection());
    attempts('I', 'ivan'); // The already admitted I@1 proof stays pinned at its original frontier.
    effective(world.seal()); effective(world.assign()); effective(world.continueWriter());
    world.startDelivery(); attempts('D', 'bob'); world.describeDestination();
    const source = effective(world.release('S')), delivery = effective(world.release('D'));
    world.startDestination(); attempts('F', 'kim');
    for (const right of names) {
      const r = accepted(world.exercise('F', 'kim', right as never));
      assert.equal(r.verdict?.reason, 'unowned_right'); remember('F', 'kim', r);
    }
    const activation = effective(world.activate([world.proof('S', source.header.position), world.proof('D', delivery.header.position)]));
    effective(world.exercise('F', 'kim', 'R_deliver')); effective(world.exercise('F', 'alice', 'R_fulfil'));
    const final = world.snapshot();
    assert.equal(final.activations, 1); assert.equal(final.fulfilled, true); assert.equal(final.deliveryConfirmed, true);
    for (const name of ['S', 'I', 'D', 'F'] as const) world.restart(name);
    assert.deepEqual(world.snapshot(), final);
    for (const original of saved) retry(original);
    assert.deepEqual(world.snapshot(), final);
    assert.equal(Object.getPrototypeOf(world.contexts.S!.journal.context.state.models), Object.prototype);
    recordScope('l1-property-inputs-' + storage, { saved, exactRetries: saved.length * 3, source, delivery, activation, final });
  } finally { world.close(); }
});

function model(id: string): ModelSpec<{ count: number }, Record<string, never>> {
  return { id, config: {}, roles: Object.fromEntries([[id, ['cap:' + id]]]), init: () => ({ count: 0 }), fold: state => ({ effective: true, state: { count: state.count + 1 } }) };
}
function descriptor(ids: string[], kind: string | undefined = undefined): PackageDescriptor {
  const base = { name: 'l1:' + ids.join(','), models: Object.fromEntries(ids.map(id => [id, model(id) as unknown as ModelSpec])), capabilities: ids.map(id => 'cap:' + id),
    kinds: Object.fromEntries((kind ? [kind] : ids).map(k => [k, { kind: k, schema: {}, handlers: [kind ? ids[0]! : k], audienceId: 'spine', audience: () => SPINE, capability: 'cap:' + k }])) };
  return { ...base, id: descriptorId(base) };
}
const propertyPackage = descriptor(names), extraPackage = descriptor(['extra'], '__proto__');
for (const storage of ['memory', 'sqlite'] as const) test('O4 L1 explicitly owned property-name kinds, models, roles and resolutions still work: ' + storage, () => {
  const registry = { [propertyPackage.id]: propertyPackage, [extraPackage.id]: extraPackage };
  const path = join(mkdtempSync(join(tmpdir(), 'dap-l1-')), 'journal.db');
  const opts = { writer: principals.W0, profile: O1_PROFILE_VERSION };
  let backend = storage === 'sqlite' ? new SQLiteBackend(path, opts) : new MemoryBackend();
  const genesis = signEvent({ kind: K.genesis, actor: principals.alice, nonce: 'aa'.repeat(16), payload: { foundation: F0_ID, runtime: RUNTIME, sequencing: opts, grants: [{ principal: principals.alice, roles: names, capabilities: [CAP.attach] }], bindings: [{ package: propertyPackage.id }], origins: [], referents: [], route: 'l1-own-properties' } }, keys.alice);
  let journal = Journal.create({ backend, writerKey: keys.W0, packages: registry }, genesis);
  let serial = 0;
  function emit(kind: string, payload: Json) {
    const envelope = signEvent(journal.context.intent(principals.alice, kind, payload, { nonce: (++serial).toString(16).padStart(32, '0') }), keys.alice);
    const r = journal.submit(envelope, journal.context.credentialFor(principals.alice)); assert.ok(!('refused' in r)); assert.equal(r.verdict?.effective, true); return r;
  }
  try {
    for (const name of names) {
      assert.ok(holdsNow(journal.context.state, principals.alice, 'cap:' + name));
      assert.equal(findModel(journal.context.state.env, name), propertyPackage.models[name]);
      const r = emit(name, {}); assert.equal(own(r.verdict!.perModel, name)?.effective, true);
      assert.deepEqual(own(journal.context.state.models, name), { count: 1 });
    }
    emit(K.attach, { package: extraPackage.id, resolution: Object.fromEntries([['__proto__', { handlers: ['__proto__', 'extra'] }]]) });
    const r = emit('__proto__', {});
    assert.deepEqual(Object.keys(r.verdict!.perModel!).sort(), ['__proto__', 'extra']);
    assert.deepEqual(own(journal.context.state.models, '__proto__'), { count: 2 });
    const before = structuredClone(journal.context.state.models);
    journal.close(); if (storage === 'sqlite') backend = new SQLiteBackend(path, opts);
    journal = Journal.open({ backend, writerKey: keys.W0, packages: registry });
    assert.deepEqual(journal.context.state.models, before);
    const view = journal.context.view(principals.alice), interpreted = interpretView(principals.alice, view, journal.context.head, registry);
    assert.equal(interpreted.kind, 'interpreted');
    if (interpreted.kind !== 'interpreted') assert.fail('available owned models must interpret');
    const projection = observe(interpreted.state, principals.alice, journal.context.head, () => true);
    for (const name of names) {
      assert.ok(Object.hasOwn(interpreted.bindings, name)); assert.ok(Object.hasOwn(projection.bindings, name));
      assert.deepEqual(own(projection.models, name), own(before, name));
      assert.ok(Object.values(projection.outcomes).some(v => own(v.perModel, name)?.effective));
    }
    for (const table of [before, journal.context.state.env.kinds, interpreted.bindings, projection.models, projection.bindings]) assert.equal(Object.getPrototypeOf(table), Object.prototype);
  } finally { journal.close(); }
});

test('O4 L1 registry inheritance is absent while own data keys survive copying and serialization', () => {
  const inherited = Object.create({ constructor: propertyPackage, __proto__: propertyPackage });
  for (const name of names) {
    assert.equal(packageIn(inherited, name), undefined);
    assert.throws(() => deserializeSteps([{ type: 'attach', pkg: name }], inherited), /unknown package/);
    setOwn(inherited, name, propertyPackage); assert.equal(packageIn(inherited, name), propertyPackage);
  }
  const copy = JSON.parse(JSON.stringify(inherited));
  for (const name of names) assert.ok(Object.hasOwn(copy, name));
  assert.equal(Object.getPrototypeOf(copy), Object.prototype);
  const empty = emptyEnvironment(RUNTIME);
  for (const name of names) assert.equal(findModel(empty, name), undefined);
  const base = { name: 'bad-handler', models: {}, capabilities: [], kinds: { action: { kind: 'action', schema: {}, handlers: ['constructor'], audienceId: 'spine', audience: () => SPINE } } };
  assert.deepEqual(attach(empty, { ...base, id: descriptorId(base) }), { ok: false, reason: 'unknown_handler' });
});
