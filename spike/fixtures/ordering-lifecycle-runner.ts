// Actual signed O4 fixture. This module contains inputs and normalization only;
// it never imports expected lifecycle states or computes transfer verdicts.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPrivateKey, type KeyObject } from 'node:crypto';
import { canonicalize, envelopeBytes, envelopeId, principalOf, signEvent, verifyEnvelope, type ActorEnvelope } from '../src/codec.ts';
import { snapshot, MemoryBackend, type Backend } from '../src/append.ts';
import { SQLiteBackend } from '../src/sqlite.ts';
import { Journal, O1_PROFILE_VERSION } from '../src/journal.ts';
import { HANDOVER_PROFILE, SEAL, ASSIGN } from '../src/ordering.ts';
import { F0_ID, RUNTIME, CAP, K } from '../src/foundation.ts';
import { ScopeJournal, type SourceExport, type Transition, type RightName, type ReleaseProof } from '../src/scope.ts';
import { SCOPE_PROFILE, SCOPE_KINDS, TRANSFORM, JOIN_POLICY_ID, scopeImplementationId, scopeId, type ScopeSetup } from '../src/scope-profile.ts';
import { scopePackage } from '../src/scope-package.ts';
import { publicProofBytes, type PublicProof } from '../src/scope-proof.ts';
import { SALE, salePackage } from './sale.ts';
import { INSPECTION, inspectionPackage } from './inspection.ts';
import type { EventBody, Receipt, Refusal, Verdict } from '../src/types.ts';
import type { Json } from '../src/canon.ts';

export type Name = 'S' | 'I' | 'D' | 'F';
export type Person = 'alice' | 'bob' | 'carol' | 'ivan' | 'kim' | 'W0' | 'W1' | 'WI' | 'WD' | 'WF' | 'control' | 'candidate-X' | 'candidate-Y';
function key(seed: number): KeyObject { return createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.alloc(32, seed)]), format: 'der', type: 'pkcs8' }); }
export const names: Person[] = ['alice', 'bob', 'carol', 'ivan', 'kim', 'W0', 'W1', 'WI', 'WD', 'WF', 'control', 'candidate-X', 'candidate-Y'];
export const keys = Object.fromEntries(names.map((name, i) => [name, key(i + 30)])) as Record<Person, KeyObject>;
export const principals = Object.fromEntries(names.map(name => [name, principalOf(keys[name])])) as Record<Person, string>;
export const packages = { [salePackage.id]: salePackage, [inspectionPackage.id]: inspectionPackage, [scopePackage.id]: scopePackage };
const alias = new Map(names.map(name => [principals[name], name]));
export function normalize(value: any): any {
  if (typeof value === 'string') return alias.get(value) ?? value;
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
  return value;
}
export class LifecycleWorld {
  readonly root = mkdtempSync(join(tmpdir(), 'dap-o4-'));
  readonly storage: 'memory' | 'sqlite';
  readonly backends: Partial<Record<Name, Backend>> = {};
  readonly contexts: Partial<Record<Name, ScopeJournal>> = {};
  readonly paths: Partial<Record<Name, string>> = {};
  readonly writerNames: Partial<Record<Name, Person>> = {};
  readonly envelopes = new Map<string, ActorEnvelope>();
  readonly checkpoints = new Map<string, unknown>();
  readonly exports: Partial<Record<'S' | 'D', SourceExport>> = {};
  destination?: ActorEnvelope;
  destinationOrigins: ActorEnvelope[] = [];
  pendingSourceProposal?: ActorEnvelope;
  readonly variant: { deliveryBuyer?: Person; originExercise?: boolean };
  private serial = 0;
  constructor(variant: { deliveryBuyer?: Person; originExercise?: boolean } = {}, storage: 'memory' | 'sqlite' = 'sqlite') { this.variant = variant; this.storage = storage; }
  private nonce(): string { return (++this.serial).toString(16).padStart(32, '0'); }
  private setup(role: ScopeSetup['role'], founderNames: Person[], owners: ScopeSetup['owners'], extra: Partial<ScopeSetup> = {}): ScopeSetup {
    return { profile: SCOPE_PROFILE, implementation: scopeImplementationId(), role, founders: founderNames.map(n => principals[n]), owners, ...extra };
  }
  private create(name: Name, actor: Person, writer: Person, setup: ScopeSetup, grants: Json[], bindings: string[], origins: ActorEnvelope[] = [], extra: Record<string, Json> = {}) {
    const profile = name === 'S' ? HANDOVER_PROFILE : O1_PROFILE_VERSION;
    const body: EventBody = { kind: K.genesis, actor: principals[actor], nonce: this.nonce(), payload: {
      foundation: F0_ID, runtime: RUNTIME, sequencing: { profile, writer: principals[writer], ...(name === 'S' ? { control: principals.control } : {}) },
      grants, bindings: bindings.map(packageId => ({ package: packageId })), origins: origins.map(o => o.body) as never,
      referents: ['guitar-1'], route: 'route:' + name, scope: setup as never, ...extra,
    } };
    const envelope = signEvent(body, keys[actor]);
    this.install(name, envelope, writer, origins);
    return envelope;
  }
  private install(name: Name, genesis: ActorEnvelope, writer: Person, origins: ActorEnvelope[] = []) {
    const path = join(this.root, name + '.sqlite');
    const profile = (genesis.body.payload as { sequencing: { profile: string } }).sequencing.profile;
    const initialWriter = (genesis.body.payload as { sequencing: { writer: string } }).sequencing.writer;
    const backend = this.storage === 'sqlite' ? new SQLiteBackend(path, { writer: initialWriter, profile }) : new MemoryBackend();
    this.backends[name] = backend;
    this.paths[name] = path; this.writerNames[name] = writer;
    this.contexts[name] = ScopeJournal.create({ backend, writerKey: keys[writer], packages }, envelopeBytes(genesis), origins.map(envelopeBytes));
    for (const entry of this.contexts[name]!.journal.context.entries) this.envelopes.set(name + '@' + entry.position, verifyEnvelope(entry.committed!));
  }
  emit(name: Name, actor: Person, kind: string, payload: Json, existing?: ActorEnvelope) {
    const scoped = this.contexts[name]!;
    const event = existing ?? signEvent(scoped.journal.context.intent(principals[actor], kind, payload, { action_id: 'o4:' + this.serial, nonce: this.nonce() }), keys[actor]);
    const result = scoped.submit(envelopeBytes(event), scoped.journal.context.credentialFor(principals[actor]));
    if (!('refused' in result)) this.envelopes.set(name + '@' + result.header.position, event);
    return result;
  }
  private invitation(invitee: 'bob' | 'carol' | 'ivan', roles: string[]) {
    const result = this.emit('S', 'alice', K.invite, { invitee: principals[invitee], grants: { principal: principals[invitee], roles }, token_id: 'invite:' + invitee });
    if ('refused' in result) throw new Error(result.reason);
    return result.header.position;
  }
  private accept(invitee: 'bob' | 'carol' | 'ivan', position: number) { return this.emit('S', invitee, K.accept_invite, this.contexts.S!.journal.context.inviteEnvelope(position) as never); }
  startSale() {
    const origin = signEvent({ kind: SALE + 'listing', actor: principals.alice, nonce: this.nonce(), payload: { referent: 'guitar-1', ask: 800 } }, keys.alice);
    this.create('S', 'alice', 'W0', this.setup('sale', ['alice'], { R_sell: principals.alice }), [
      { principal: principals.alice, roles: ['Seller'], capabilities: [CAP.invite, CAP.attach, CAP.grant, CAP.disclose, CAP.observe, CAP.admit, K.scope_release, SCOPE_KINDS.exercise, SCOPE_KINDS.recover] },
    ], [salePackage.id, scopePackage.id], [origin]);
  }
  saleThrough10() {
    this.accept('bob', this.invitation('bob', ['Buyer']));
    this.accept('carol', this.invitation('carol', ['Buyer']));
    this.emit('S', 'bob', SALE + 'offer', { offer_id: 'o1' });
    this.emit('S', 'bob', SALE + 'offer_terms', { offer_id: 'o1', amount: 700, seller: principals.alice });
    this.emit('S', 'carol', SALE + 'offer', { offer_id: 'o2' });
    this.emit('S', 'carol', SALE + 'offer_terms', { offer_id: 'o2', amount: 750, seller: principals.alice });
    this.emit('S', 'alice', SALE + 'counter', { offer_id: 'o1', amount: 780, author: principals.bob });
  }
  attachInspection() { return this.emit('S', 'alice', K.attach, { package: inspectionPackage.id }); }
  saleThrough14() {
    this.accept('ivan', this.invitation('ivan', ['Inspector']));
    this.emit('S', 'carol', INSPECTION + 'request', { offer_id: 'o2', seller: principals.alice, inspector: principals.ivan });
    this.pendingSourceProposal = signEvent(this.contexts.S!.journal.context.intent(principals.bob, SALE + 'offer', { offer_id: 'o4' }, { action_id: 'old-source-proposal', nonce: this.nonce() }), keys.bob);
  }
  spawnInspection() {
    const s = this.contexts.S!;
    const requests = (s.journal.context.state.models.inspection as unknown as { requests: { offer_id: string; inspector: string }[] }).requests;
    const request = requests.at(-1)!;
    if (!request || request.offer_id !== 'o2') throw new Error('no effective inspection mandate');
    this.create('I', 'ivan', 'WI', this.setup('inspection', ['ivan'], {}, { mandate: { source: s.journal.context.genesisId, prefix: s.journal.context.head, offer: request.offer_id, inspector: request.inspector } }),
      [{ principal: principals.ivan, capabilities: [SCOPE_KINDS.result] }], [scopePackage.id]);
  }
  inspectionResult() { return this.emit('I', 'ivan', SCOPE_KINDS.result, { offer: 'o2', result: 'pass:o2' }); }
  saleThrough17() {
    this.emit('S', 'bob', SALE + 'offer', { offer_id: 'o3', replaces: 'o1' });
    this.emit('S', 'bob', SALE + 'offer_terms', { offer_id: 'o3', amount: 780, seller: principals.alice });
    return this.emit('S', 'alice', SALE + 'accept', { offer_id: 'o3' });
  }
  saleThrough19() { this.emit('S', 'alice', SALE + 'accept', { offer_id: 'o2' }); return this.emit('S', 'alice', SALE + 'close', { outcome: 'sold' }); }
  importInspection() { const proof = this.contexts.I!.proof(); return this.emit('S', 'alice', K.admit, { proof: proof as never, position: 1, identity: proof.genesis + ':1' }); }
  seal() { const s = this.contexts.S!.journal; return this.emit('S', 'control', SEAL, { epoch: s.ordering.epoch, predecessor: s.context.entries.at(-1)!.id }); }
  assign() {
    const s = this.contexts.S!.journal;
    const result = this.emit('S', 'control', ASSIGN, { epoch: s.ordering.epoch + 1, predecessor: s.context.entries.at(-1)!.id, writer: principals.W1 });
    if (!('refused' in result)) this.restart('S', 'W1');
    return result;
  }
  continueWriter() { return this.emit('S', 'alice', K.observe, { fact: { continued: true } }); }
  startDelivery() { this.create('D', 'kim', 'WD', this.setup('delivery', ['kim', 'alice', 'bob'], { R_deliver: principals.kim }, { facts: { buyer: principals[this.variant.deliveryBuyer ?? 'bob'], delivery_slot: 25 } }),
    [{ principal: principals.kim, capabilities: [K.scope_release, SCOPE_KINDS.exercise, SCOPE_KINDS.recover] }], [scopePackage.id]); }
  describeDestination(proposed?: { S: SourceExport; D: SourceExport }) {
    this.exports.S = proposed?.S ?? this.contexts.S!.export(['R_fulfil']); this.exports.D = proposed?.D ?? this.contexts.D!.export(['R_deliver']);
    const sources = [this.exports.S, this.exports.D];
    const transition: Transition = { identity: scopeId({ manifest: JOIN_POLICY_ID, sources: sources.map(s => s.identity) }), manifest: JOIN_POLICY_ID, sources, transformation: TRANSFORM,
      retainedDependencies: [...new Set(sources.flatMap(s => [...s.dependencies.packages, s.dependencies.implementation]))].sort() };
    if (this.variant.originExercise) this.destinationOrigins = [signEvent({ kind: SCOPE_KINDS.exercise, actor: principals.alice, nonce: this.nonce(), payload: { right: 'R_fulfil' } }, keys.alice)];
    const body: EventBody = { kind: K.genesis, actor: principals.alice, nonce: this.nonce(), payload: {
      foundation: F0_ID, runtime: RUNTIME, sequencing: { profile: O1_PROFILE_VERSION, writer: principals.WF },
      scope: this.setup('fulfilment', ['alice', 'bob', 'kim'], { R_fulfil: principals.alice, R_deliver: principals.kim }) as never,
      grants: [{ principal: principals.alice, rights: ['R_fulfil'], capabilities: [K.scope_activate, SCOPE_KINDS.exercise, SCOPE_KINDS.importExport] }, { principal: principals.bob, rights: [], capabilities: [] }, { principal: principals.kim, rights: ['R_deliver'], capabilities: [SCOPE_KINDS.exercise] }],
      bindings: [{ package: scopePackage.id }], origins: this.destinationOrigins.map(e => e.body) as never, referents: ['guitar-1'], route: 'route:F', transition: transition as never,
    } };
    this.destination = signEvent(body, keys.alice);
  }
  release(name: 'S' | 'D', actor: Person = name === 'S' ? 'alice' : 'kim', right: RightName = name === 'S' ? 'R_fulfil' : 'R_deliver', exported = this.exports[name]!, destination = envelopeId(this.destination!)) {
    const transition = (this.destination!.body.payload as unknown as { transition: Transition }).transition;
    return this.emit(name, actor, K.scope_release, { right, destination, transition: transition.identity, export: exported as never });
  }
  startDestination() { this.install('F', this.destination!, 'WF', this.destinationOrigins); }
  proof(name: 'S' | 'D', release = name === 'S' ? 24 : 1): ReleaseProof { return { source: this.contexts[name]!.proof(), release }; }
  activate(proofs: ReleaseProof[] = [this.proof('S'), this.proof('D')]) { return this.emit('F', 'alice', K.scope_activate, { proofs: proofs as never }); }
  exercise(name: Name, actor: Person, right: RightName) { return this.emit(name, actor, SCOPE_KINDS.exercise, { right }); }
  restart(name: Name, writer = this.writerNames[name]!) {
    const old = this.contexts[name]!; const genesis = old.journal.context.entries[0]!.event;
    const sequencing = (genesis.payload as { sequencing: { writer: string; profile: string } }).sequencing;
    old.close();
    const backend = this.storage === 'sqlite' ? new SQLiteBackend(this.paths[name]!, sequencing) : this.backends[name]!;
    this.backends[name] = backend;
    this.contexts[name] = ScopeJournal.open({ backend, writerKey: keys[writer], packages }); this.writerNames[name] = writer;
  }
  snapshot(): any {
    const states = Object.fromEntries(Object.entries(this.contexts).map(([name, scoped]) => [name, scoped!.state]));
    const ids = new Map(Object.entries(this.contexts).map(([name, scoped]) => [scoped!.journal.context.genesisId, name]));
    const rightNames: RightName[] = ['R_sell', 'R_fulfil', 'R_deliver']; const contextNames: Name[] = ['S', 'I', 'D', 'F'];
    const source = states.S;
    return normalize({
      heads: Object.fromEntries(contextNames.map(name => [name, this.contexts[name]?.journal.context.head ?? null])),
      writers: Object.fromEntries(contextNames.map(name => { const ordering = this.contexts[name]?.journal.ordering; return [name, ordering ? ordering.sealed ? null : ordering.writer : null]; })),
      sale: source.sale,
      inspection: { attached: source.inspection.attached, requested: source.inspection.requested, resultInI: states.I?.inspection.result ?? null, resultInS: source.inspection.importedResult, imports: source.inspection.imports },
      rights: Object.fromEntries(rightNames.map(right => [right, Object.fromEntries(contextNames.map(name => [name, states[name]?.rights[right]?.status ?? 'absent']))])),
      owners: Object.fromEntries(rightNames.map(right => [right, contextNames.filter(name => states[name]?.rights[right]?.status === 'live').map(name => ({ context: name, principal: states[name]!.rights[right]!.owner }))])),
      destination: states.F ? states.F.active ? 'active' : 'started' : this.destination ? 'described' : 'undescribed',
      releases: (['S', 'D'] as const).filter(name => states[name]?.releases.length),
      verifiedProofs: (states.F?.verifiedProofs ?? []).map((id: string) => ids.get(id) ?? id), activations: states.F?.activations ?? 0,
      exports: Object.fromEntries((['S', 'D'] as const).map(name => [name, states[name]?.releases.at(-1)?.exported.facts ?? null])),
      imports: (states.F?.imports ?? []).map((id: string) => Object.entries(this.exports).find(([, exp]) => exp?.identity === id)?.[0] + '-export'),
      deliveryConfirmed: states.F?.delivered ?? false, fulfilled: states.F?.fulfilled ?? false,
    });
  }
  close() { for (const scoped of Object.values(this.contexts)) scoped!.close(); }
}
export const healthyOperations: [string, (world: LifecycleWorld) => unknown][] = [
  ['sale-started', w => w.startSale()], ['before-attach', w => w.saleThrough10()], ['inspection-attached', w => w.attachInspection()], ['inspection-requested', w => w.saleThrough14()],
  ['inspection-spawned', w => w.spawnInspection()], ['inspection-result-recorded', w => w.inspectionResult()], ['sale-accepted', w => w.saleThrough17()], ['sale-closed', w => w.saleThrough19()],
  ['inspection-imported', w => w.importInspection()], ['writer-sealed', w => w.seal()], ['writer-assigned', w => w.assign()], ['writer-continued', w => w.continueWriter()],
  ['delivery-started', w => w.startDelivery()], ['destination-described', w => w.describeDestination()], ['sale-released', w => w.release('S')], ['delivery-released', w => w.release('D')],
  ['destination-started', w => w.startDestination()], ['destination-activated', w => w.activate()], ['delivery-confirmed', w => w.exercise('F', 'kim', 'R_deliver')], ['sale-fulfilled', w => w.exercise('F', 'alice', 'R_fulfil')],
];
export function buildThrough(id: string, variant: LifecycleWorld['variant'] = {}, storage: 'memory' | 'sqlite' = 'sqlite'): LifecycleWorld {
  const world = new LifecycleWorld(variant, storage);
  for (const [name, operation] of healthyOperations) { operation(world); world.checkpoints.set(name, world.snapshot()); if (name === id) return world; }
  throw new Error('unknown fixture prefix');
}
