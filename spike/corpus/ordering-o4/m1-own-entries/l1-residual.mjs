// L1 residual sites and a positive case of my own. Usage: WT=<worktree> node l1-residual.mjs <memory|sqlite>
const R = process.env.WT + '/spike/';
const { keys, principals: P, packages } = await import(R + 'fixtures/ordering-lifecycle-runner.ts');
const { signEvent, envelopeBytes } = await import(R + 'src/codec.ts');
const { K, CAP, F0_ID, RUNTIME, holdsNow } = await import(R + 'src/foundation.ts');
const { Journal, O1_PROFILE_VERSION } = await import(R + 'src/journal.ts');
const { MemoryBackend } = await import(R + 'src/append.ts');
const { SQLiteBackend } = await import(R + 'src/sqlite.ts');
const { descriptorId } = await import(R + 'src/descriptor.ts');
const { interpretView } = await import(R + 'src/interpret.ts');
const { observe } = await import(R + 'src/observe.ts');
const { SPINE, named } = await import(R + 'src/types.ts');
const { ScopeJournal } = await import(R + 'src/scope.ts');
const { scopePackage } = await import(R + 'src/scope-package.ts');
const { SCOPE_PROFILE, scopeImplementationId } = await import(R + 'src/scope-profile.ts');
const { clubModel } = await import(R + 'fixtures/club.ts');
const { mkdtempSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const storage = process.argv[2] ?? 'memory';
const out = {};
let n = 0;
const nonce = () => (++n).toString(16).padStart(32, '0');
const backend = () => storage === 'sqlite' ? new SQLiteBackend(join(mkdtempSync(join(tmpdir(), 'l1r-')), 'j.db'), { writer: P.W0, profile: O1_PROFILE_VERSION }) : new MemoryBackend();
const seq = { profile: O1_PROFILE_VERSION, writer: P.W0 };

// 1. Positive: model 'valueOf', role 'isPrototypeOf', kind '__defineGetter__', narrow attach ceiling to bob.
{
  const model = { id: 'valueOf', config: {}, roles: { isPrototypeOf: ['cap:x'] }, init: () => ({ n: 0 }), fold: s => ({ effective: true, state: { n: s.n + 1 } }) };
  const base = { name: 'l1-mine', models: { valueOf: model }, capabilities: ['cap:x'], kinds: { __defineGetter__: { kind: '__defineGetter__', schema: {}, handlers: ['valueOf'], audienceId: 'spine', audience: () => SPINE, capability: 'cap:x' } } };
  const pkg = { ...base, id: descriptorId(base) };
  const reg = { [pkg.id]: pkg };
  const g = signEvent({ kind: K.genesis, actor: P.alice, nonce: nonce(), payload: { foundation: F0_ID, runtime: RUNTIME, sequencing: seq, grants: [{ principal: P.alice, roles: ['isPrototypeOf', 'toString'], capabilities: [CAP.grant, CAP.attach] }], bindings: [{ package: pkg.id }], origins: [], referents: [], route: 'r' } }, keys.alice);
  const j = Journal.create({ backend: backend(), writerKey: keys.W0, packages: reg }, g);
  const res = {};
  res.aliceHolds = holdsNow(j.context.state, P.alice, 'cap:x');
  const emit = (actor, kind, payload, extra = {}) => { const ev = signEvent(j.context.intent(P[actor], kind, payload, { nonce: nonce(), ...extra }), keys[actor]); const r = j.submit(ev, j.context.credentialFor(P[actor])); return 'refused' in r ? r : r.verdict; };
  res.aliceEmit = emit('alice', '__defineGetter__', {});
  res.grantUnknownRoleToBob = emit('alice', K.grant, { principal: P.bob, roles: ['toString', 'constructor'] });
  res.bobHoldsAfterUnknownRole = holdsNow(j.context.state, P.bob, 'cap:x');
  res.grantKnownRoleToBob = emit('alice', K.grant, { principal: P.bob, roles: ['isPrototypeOf'] });
  res.bobHolds = holdsNow(j.context.state, P.bob, 'cap:x');
  res.models = j.context.state.models;
  res.modelsOwn = Object.hasOwn(j.context.state.models, 'valueOf');
  const view = j.context.view(P.alice);
  const it = interpretView(P.alice, view, j.context.head, reg);
  res.interpreted = it.kind;
  const ob = observe(it.state, P.alice, j.context.head, () => true);
  res.observedModel = ob.models.valueOf; res.observedBinding = Object.hasOwn(ob.bindings, '__defineGetter__');
  j.close();
  out.positive = res;
}

// 2. Genesis origin whose kind is a property name, on a plain Journal.
{
  const origin = signEvent({ kind: 'constructor', actor: P.alice, nonce: nonce(), payload: {} }, keys.alice);
  const g = signEvent({ kind: K.genesis, actor: P.alice, nonce: nonce(), payload: { foundation: F0_ID, runtime: RUNTIME, sequencing: seq, grants: [{ principal: P.alice, roles: ['__proto__'] }], bindings: [{ package: scopePackage.id, resolution: JSON.parse('{"__proto__":{"handlers":["scope"]}}') }], origins: [origin.body], referents: [], route: 'r' } }, keys.alice);
  try { const j = Journal.create({ backend: backend(), writerKey: keys.W0, packages }, g, [origin]); out.originPropertyKind = { verdict: j.context.state.verdicts[1], head: j.context.head }; j.close(); }
  catch (e) { out.originPropertyKind = 'threw ' + e.constructor.name + ': ' + e.message; }
}

// 3. Scope genesis naming a property-name package.
{
  const setup = { profile: SCOPE_PROFILE, implementation: scopeImplementationId(), role: 'delivery', founders: [P.kim], owners: { R_deliver: P.kim }, facts: { buyer: P.bob, delivery_slot: 1 } };
  for (const name of ['constructor', '__proto__', 'toString']) {
    const g = signEvent({ kind: K.genesis, actor: P.kim, nonce: nonce(), payload: { foundation: F0_ID, runtime: RUNTIME, sequencing: { profile: O1_PROFILE_VERSION, writer: P.WD }, grants: [], bindings: [{ package: name }], origins: [], referents: [], route: 'r', scope: setup } }, keys.kim);
    const b = storage === 'sqlite' ? new SQLiteBackend(join(mkdtempSync(join(tmpdir(), 'l1r-')), 'j.db'), { writer: P.WD, profile: O1_PROFILE_VERSION }) : new MemoryBackend();
    try { const s = ScopeJournal.create({ backend: b, writerKey: keys.WD, packages }, envelopeBytes(g)); out['scopeGenesisPackage_' + name] = 'created head ' + s.journal.context.head; s.close(); }
    catch (e) { out['scopeGenesisPackage_' + name] = 'threw ' + e.constructor.name + ': ' + e.message + ' backendEntries=' + b.entries().length; }
  }
}

// 4. Club observe with a '__proto__' member standing (fixture outside O4).
{
  const state = { ...clubModel.init(clubModel.config), standing: [{ member: '__proto__', standing: 'lapsed', position: 1 }, { member: 'constructor', standing: 'good', position: 2 }] };
  try { const o = clubModel.observe('x', state, { visible: () => true, position: 3 }, clubModel.config); out.clubStanding = { json: JSON.stringify(o.standing), ownProto: Object.hasOwn(o.standing, '__proto__'), keys: Object.keys(o.standing) }; }
  catch (e) { out.clubStanding = 'threw ' + e.message; }
}
console.log(JSON.stringify(out, null, 1));
