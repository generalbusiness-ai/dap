import type { KeyObject } from 'node:crypto';
// Fixed O4 scope semantics. No expectation-manifest dependency.
import { snapshot } from './append.ts';
import { canonicalize, envelopeId, verifyEnvelope, type ActorEnvelope } from './codec.ts';
import { Journal, type JournalOptions } from './journal.ts';
import { F0_ID, RUNTIME, K, heldAt } from './foundation.ts';
import { interpretView } from './interpret.ts';
import type { PackageDescriptor } from './descriptor.ts';
import type { Entry, EventBody, Receipt, Refusal, Verdict } from './types.ts';
import type { TransportCredential } from './append.ts';
import type { ViewEntry } from './context.ts';
import { publicProof, verifyPublicProof, assertPublicData, ScopeProofError, type PublicProof } from './scope-proof.ts';
import { SCOPE_KINDS, SCOPE_NS, TRANSFORM, JOIN_POLICY_ID, scopeId, scopeSetup, scopeImplementationId, ScopeProfileError, type ScopeSetup } from './scope-profile.ts';
import type { SaleState } from '../fixtures/sale.ts';
import type { InspectionState } from '../fixtures/inspection.ts';

export type RightName = 'R_sell' | 'R_fulfil' | 'R_deliver';
export type RightState = { owner: string; status: 'live' | 'spent' | 'released' | 'dormant' };
export interface SourceExport {
  identity: string;
  genesis: string;
  initialWriter: string;
  prefix: { position: number; headerHash: string; commitment: string };
  rights: { name: RightName; owner: string }[];
  facts: Record<string, string | number>;
  factPositions: number[];
  dependencies: { implementation: string; packages: string[] };
}
export interface Transition {
  identity: string;
  manifest: string;
  sources: SourceExport[];
  transformation: typeof TRANSFORM;
  retainedDependencies: string[];
}
export interface ReleaseProof { source: PublicProof; release: number }
export interface ScopeState {
  genesis: string;
  setup: ScopeSetup;
  rights: Partial<Record<RightName, RightState>>;
  sale: { status: 'open' | 'accepted' | 'closed'; accepted_offer: string | null; winner: string | null };
  inspection: { attached: boolean; requested: boolean; result: string | null; importedResult: string | null; imports: number };
  transition?: Transition;
  active: boolean;
  activations: number;
  releases: { position: number; destination: string; transition: string; exported: SourceExport }[];
  verifiedProofs: string[];
  imports: string[];
  facts: Record<string, string | number>;
  delivered: boolean;
  fulfilled: boolean;
  verdicts: Record<number, Verdict>;
}
const good = (): Verdict => ({ known: true, authorized: true, effective: true });
const bad = (reason: string, authorized = true): Verdict => ({ known: true, authorized, effective: false, reason });
const scopeKinds = new Set<string>([K.scope_release, K.scope_activate, K.admit, ...Object.values(SCOPE_KINDS)]);
class ScopeRefusal extends Error {}
function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ScopeRefusal('malformed');
  return value as Record<string, any>;
}
function identity(exported: Omit<SourceExport, 'identity'>): SourceExport { return { ...exported, identity: scopeId(exported) }; }
function validateExport(value: unknown): SourceExport {
  const fail = (): never => { throw new ScopeProfileError('invalid export'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  const e = value as SourceExport;
  if (Object.keys(e).sort().join(',') !== 'dependencies,factPositions,facts,genesis,identity,initialWriter,prefix,rights' || !e.prefix || typeof e.prefix !== 'object' || Object.keys(e.prefix).sort().join(',') !== 'commitment,headerHash,position' || !Number.isSafeInteger(e.prefix.position) || e.prefix.position < 0 || !Array.isArray(e.rights) || !e.rights.length || !e.dependencies || typeof e.dependencies !== 'object' || Object.keys(e.dependencies).sort().join(',') !== 'implementation,packages' || e.dependencies.implementation !== scopeImplementationId() || !Array.isArray(e.dependencies.packages) || !e.dependencies.packages.every(p => typeof p === 'string') || !Array.isArray(e.factPositions) || !e.factPositions.every(p => Number.isSafeInteger(p) && p >= 0 && p <= e.prefix.position) || !e.facts || typeof e.facts !== 'object' || Array.isArray(e.facts)) fail();
  if (![e.genesis,e.prefix.headerHash,e.prefix.commitment,e.identity].every(v => typeof v === 'string' && /^sha256:[0-9a-f]{64}$/.test(v)) || typeof e.initialWriter !== 'string' || !e.rights.every(r => r && Object.keys(r).sort().join(',') === 'name,owner' && ['R_sell','R_fulfil','R_deliver'].includes(r.name) && typeof r.owner === 'string')) fail();
  const { identity: id, ...preimage } = e;
  if (scopeId(preimage) !== id) fail();
  assertPublicData(e);
  return e;
}
function init(genesis: EventBody, id: string): ScopeState {
  const setup = scopeSetup(genesis);
  if (!setup) throw new ScopeProfileError('scope: genesis does not select scope runtime');
  const state: ScopeState = {
    genesis: id, setup, rights: {}, sale: { status: 'open', accepted_offer: null, winner: null },
    inspection: { attached: false, requested: false, result: null, importedResult: null, imports: 0 },
    active: false, activations: 0, releases: [], verifiedProofs: [], imports: [], facts: {}, delivered: false, fulfilled: false, verdicts: {},
  };
  for (const [name, owner] of Object.entries(setup.owners)) state.rights[name as RightName] = { owner, status: setup.role === 'fulfilment' ? 'dormant' : 'live' };
  if (setup.role === 'delivery') state.facts = { ...setup.facts! };
  if (setup.role === 'fulfilment') {
    const raw = (genesis.payload as Record<string, unknown>).transition;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ScopeProfileError('transition shape');
    const transition = raw as Transition;
    if (transition.transformation !== TRANSFORM || !transition.identity || transition.manifest !== JOIN_POLICY_ID || !Array.isArray(transition.sources) || transition.sources.length !== 2 || !Array.isArray(transition.retainedDependencies)) throw new ScopeProfileError('scope: invalid transition');
    for (const source of transition.sources) validateExport(source);
    if (Object.keys(transition).sort().join(',') !== 'identity,manifest,retainedDependencies,sources,transformation' || transition.identity !== scopeId({ manifest: JOIN_POLICY_ID, sources: transition.sources.map(s => s.identity) })) throw new ScopeProfileError('invalid transition identity or fields');
    const seen = new Set<string>();
    for (const raw of transition.sources) {
      const e = validateExport(raw);
      for (const right of e.rights) {
        if (seen.has(right.name) || setup.owners[right.name] !== right.owner) throw new ScopeProfileError('scope: duplicate or wrong conditional owner');
        seen.add(right.name);
      }
      state.imports.push(e.identity);
    }
    if ([...seen].sort().join(',') !== 'R_deliver,R_fulfil') throw new ScopeProfileError('scope: missing conditional right');
    const retained = [...new Set(transition.sources.flatMap(e => [...e.dependencies.packages, e.dependencies.implementation]))].sort();
    if (canonicalize(retained) !== canonicalize(transition.retainedDependencies)) throw new ScopeProfileError('scope: missing retained dependencies');
    state.transition = transition;
    state.facts = Object.assign({}, ...transition.sources.map(e => e.facts));
  }
  return state;
}

/** Replays the actual authenticated public prefix, then recomputes scope
 * effects from the source models and grants at each position. */
export function replayScope(proof: PublicProof, packages: Record<string, PackageDescriptor>, depth = 0): ScopeState {
  object(proof);
  if (depth > 4) throw new ScopeRefusal('scope: proof nesting bound');
  const { view } = verifyPublicProof(proof, { genesis: proof.genesis, initialWriter: proof.initialWriter }, packages);
  return replayScopeView(view, proof.genesis, packages, depth);
}
function replayScopeView(view: ViewEntry[], genesis: string, packages: Record<string, PackageDescriptor>, depth = 0, limit = view.length - 1): ScopeState {
  const state = init(view[0]!.event!, genesis);
  for (let position = 0; position <= limit; position++) {
    const v = view[position]!;
    if (!v.event) continue;
    const base = interpretView('scope-evidence-reader', view, view.length - 1, packages, position, { throwOnError: true });
    if (base.kind !== 'interpreted') throw new Error('scope: unresolved source semantics');
    const current = base.state;
    const event = v.event;
    const original = current.verdicts[position]!;
    if (state.setup.role === 'sale') {
      const sale = current.models.sale as unknown as SaleState | undefined;
      if (sale && !sale.accepted) state.sale = { status: sale.status === 'closed' ? 'closed' : 'open', accepted_offer: null, winner: null };
      if (sale?.accepted) {
        const offer = sale.offers.find(o => o.id === sale.accepted!.id);
        if (!offer || !sale.seller) throw new Error('scope: incomplete public decision');
        state.sale = { status: sale.status === 'closed' ? 'closed' : 'accepted', accepted_offer: offer.id, winner: offer.author };
        if (state.rights.R_sell?.status === 'live') {
          state.rights.R_sell.status = 'spent';
          state.rights.R_fulfil = { owner: sale.seller, status: 'live' };
        }
      }
      state.inspection.attached = current.env.packages.some(p => Object.hasOwn(p.models, 'inspection'));
      const inspection = current.models.inspection as unknown as InspectionState | undefined;
      state.inspection.requested = (inspection?.requests.length ?? 0) > 0;
    }
    if (!scopeKinds.has(event.kind)) { state.verdicts[position] = original; continue; }
    if (event.kind.startsWith(SCOPE_NS) && !(original.known && original.authorized && original.perModel?.scope?.reason === 'scope_runtime_required' && Object.entries(original.perModel).every(([id, verdict]) => id === 'scope' || verdict.effective))) { state.verdicts[position] = original; continue; }
    const held = (principal: string, cap: string) => heldAt(current, principal, cap, position);
    let result: Verdict;
    try {
      const p = object(event.payload);
      if (event.kind === K.scope_release) {
        if (!held(event.actor, K.scope_release)) result = bad('unauthorized', false);
        else {
          const e = validateExport(p.export);
          const right = state.rights[p.right as RightName];
          if (!right) result = bad('unowned_right');
          else if (right.status === 'released') result = bad('already_released');
          else if (right.status !== 'live') result = bad('spent_right');
          else if (right.owner !== event.actor) result = bad('unauthorized', false);
          else if (e.prefix.position !== position - 1 || e.prefix.headerHash !== view[position - 1]!.headerHash || e.prefix.commitment !== view[position - 1]!.header.commitment) result = bad('stale_export');
          else {
            const expected = exportFrom(state, view, position - 1, [p.right], packages);
            if (canonicalize(e) !== canonicalize(expected)) result = bad('invalid_export');
            else if (typeof p.destination !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(p.destination) || typeof p.transition !== 'string') result = bad('malformed');
            else {
              right.status = 'released';
              state.releases.push({ position, destination: p.destination, transition: p.transition, exported: e });
              result = good();
            }
          }
        }
      } else if (event.kind === K.scope_activate) {
        if (!held(event.actor, K.scope_activate)) result = bad('unauthorized', false);
        else if (!state.transition) result = bad('not_a_destination');
        else if (state.active) result = bad('already_active');
        else if (current.closed) result = bad('closed');
        else {
          if (!Array.isArray(p.proofs)) throw new ScopeRefusal('malformed_release_proofs');
          const proofs = p.proofs as ReleaseProof[];
          const claimedRights: string[] = [];
          for (const item of proofs) {
            if (!item || typeof item !== 'object' || Object.keys(item).sort().join(',') !== 'release,source' || !Number.isSafeInteger(item.release) || item.release < 0 || !item.source || typeof item.source !== 'object' || !Array.isArray(item.source.positions)) throw new ScopeRefusal('malformed_release_proof');
            const release = item.source.positions[item.release];
            if (!release?.committed) throw new ScopeRefusal('ineffective_release');
            let body: EventBody;
            try { body = verifyEnvelope(release.committed).body; }
            catch (error) {
              if (error instanceof TypeError && error.message.startsWith('codec: ')) throw new ScopeRefusal('malformed_release_proof: ' + error.message);
              throw error;
            }
            const exported = validateExport(object(body.payload).export);
            for (const r of exported?.rights ?? []) claimedRights.push(r.name);
          }
          if (new Set(claimedRights).size !== claimedRights.length) result = bad('duplicate_right');
          else {
            const verified: string[] = [];
            for (const item of proofs) {
              const source = state.transition.sources.find(s => s.genesis === item.source.genesis);
              if (!source) throw new ScopeRefusal('wrong_source');
              const r = source.prefix.position + 1;
              if (item.release !== r || item.source.frontier < r) throw new ScopeRefusal('source_binding_mismatch');
              const verifiedSource = verifyPublicProof(item.source, { genesis: source.genesis, initialWriter: source.initialWriter }, packages);
              const prefix = verifiedSource.view[source.prefix.position];
              if (!prefix || prefix.headerHash !== source.prefix.headerHash || prefix.header.commitment !== source.prefix.commitment) throw new ScopeRefusal('source_binding_mismatch');
              if (depth >= 4) throw new ScopeRefusal('scope: proof nesting bound');
              const releaseState = replayScopeView(verifiedSource.view, source.genesis, packages, depth + 1, r);
              const releaseVerdict = releaseState.verdicts[item.release];
              if (!releaseVerdict?.authorized) throw new ScopeRefusal('unauthorized_release');
              if (!releaseVerdict.effective) throw new ScopeRefusal('ineffective_release');
              const release = releaseState.releases.find(r => r.position === item.release);
              if (!release) throw new ScopeRefusal('ineffective_release');
              if (release.destination !== state.genesis || release.transition !== state.transition.identity) throw new ScopeRefusal('destination_mismatch');
              if (canonicalize(release.exported) !== canonicalize(source)) throw new ScopeRefusal('source_binding_mismatch');
              verified.push(source.genesis);
            }
            if (new Set(verified).size !== state.transition.sources.length) {
              state.verifiedProofs = verified; result = bad('missing_release');
            } else {
              const sale = state.transition.sources.find(s => 'winner' in s.facts);
              const delivery = state.transition.sources.find(s => 'buyer' in s.facts);
              if (!sale || !delivery || sale.facts.winner !== delivery.facts.buyer) result = bad('mismatch');
              else {
                state.verifiedProofs = verified;
                for (const right of Object.values(state.rights)) right!.status = 'live';
                state.active = true; state.activations++; result = good();
              }
            }
          }
        }
      } else if (event.kind === K.admit) {
        if (!held(event.actor, K.admit)) result = bad('unauthorized', false);
        else if (state.imports.includes(p.identity)) result = bad('duplicate_import');
        else {
          const external = replayScope(p.proof, packages, depth + 1);
          if (external.setup.role !== 'inspection' || p.proof.frontier !== p.position || !external.inspection.result || p.identity !== external.genesis + ':' + p.position || !external.verdicts[p.position]?.effective || external.setup.mandate?.source !== state.genesis) result = bad('invalid_result');
          else {
            state.inspection.importedResult = external.inspection.result;
            state.inspection.imports++; state.imports.push(p.identity); result = good();
          }
        }
      } else if (event.kind === SCOPE_KINDS.result) {
        if (state.setup.role !== 'inspection' || !held(event.actor, SCOPE_KINDS.result) || state.setup.mandate?.inspector !== event.actor) result = bad('unauthorized', false);
        else if (p.offer !== state.setup.mandate.offer || typeof p.result !== 'string') result = bad('wrong_mandate');
        else { state.inspection.result = p.result; result = good(); }
      } else if (event.kind === SCOPE_KINDS.exercise) {
        const right = state.rights[p.right as RightName];
        if (p.right === 'R_sell') result = bad('invalid_right_operation');
        else if (!right) result = bad('unowned_right');
        else if (right.status === 'released') result = bad('released_right');
        else if (right.status === 'dormant') result = bad('dormant_right');
        else if (right.status === 'spent') result = bad('spent_right');
        else if (right.owner !== event.actor || !held(event.actor, SCOPE_KINDS.exercise)) result = bad('unauthorized', false);
        else {
          right.status = 'spent';
          if (p.right === 'R_deliver') state.delivered = true;
          if (p.right === 'R_fulfil') state.fulfilled = true;
          result = good();
        }
      } else if (event.kind === SCOPE_KINDS.importExport) result = bad(state.imports.includes(p.identity) ? 'duplicate_import' : 'unapproved_import');
      else result = bad('no_safe_recovery_evidence');
    } catch (error) {
      if (!(error instanceof ScopeRefusal || error instanceof ScopeProfileError || error instanceof ScopeProofError)) throw error;
      result = bad(error.message);
    }
    state.verdicts[position] = result;
  }
  return snapshot(state);
}
function exportFrom(state: ScopeState, view: ViewEntry[], prefix: number, names: RightName[], packages: Record<string, PackageDescriptor>): SourceExport {
  const rightList = names.map(name => {
    const right = state.rights[name];
    if (!right || right.status !== 'live') throw new ScopeRefusal('unowned_right');
    return { name, owner: right.owner };
  });
  let facts: SourceExport['facts'];
  let factPositions: number[];
  if (state.setup.role === 'sale' && state.sale.accepted_offer && state.sale.winner) {
    facts = { accepted_offer: state.sale.accepted_offer, winner: state.sale.winner };
    const interpreted = interpretView('scope-evidence-reader', view, view.length - 1, packages, prefix, { throwOnError: true });
    if (interpreted.kind !== 'interpreted') throw new Error('scope: source semantics unavailable');
    const sale = interpreted.state.models.sale as unknown as SaleState;
    factPositions = [sale.offers.find(o => o.id === sale.accepted!.id)!.position, sale.accepted!.position];
  } else if (state.setup.role === 'delivery') { facts = { ...state.facts }; factPositions = [0]; }
  else throw new ScopeRefusal('no_exportable_facts');
  const entry = view[prefix]!;
    const interpreted = interpretView('scope-evidence-reader', view, view.length - 1, packages, prefix, { throwOnError: true });
    if (interpreted.kind !== 'interpreted') throw new Error('scope: source semantics unavailable');
  return identity({ genesis: state.genesis, initialWriter: ((view[0]!.event!.payload as { sequencing: { writer: string } }).sequencing.writer), prefix: { position: prefix, headerHash: viewHash(entry.header), commitment: entry.header.commitment }, rights: rightList, facts, factPositions,
    dependencies: { implementation: scopeImplementationId(), packages: interpreted.state.env.packages.map(p => p.id).sort() } });
}
import { headerHash as viewHash } from './codec.ts';
export class ScopeJournal {
  readonly journal: Journal;
  readonly packages: Record<string, PackageDescriptor>;
  private readonly writerKey: KeyObject;
  private unavailable = false;
  constructor(journal: Journal, packages: Record<string, PackageDescriptor>, writerKey: KeyObject) {
    if (!scopeSetup(journal.context.entries[0]!.event)) throw new Error('scope: profile required');
    this.journal = journal; this.packages = packages; this.writerKey = writerKey;
  }
  static create(opts: JournalOptions, genesis: ActorEnvelope | string, origins: (ActorEnvelope | string)[] = []): ScopeJournal {
    const envelope = verifyEnvelope(genesis);
    validateScopeGenesis(envelope.body, opts.packages);
    init(envelope.body, envelopeId(envelope));
    return new ScopeJournal(Journal.create({ ...opts, throwOnFoldError: true }, envelope, origins), opts.packages, opts.writerKey);
  }
  static open(opts: JournalOptions): ScopeJournal { return new ScopeJournal(Journal.open({ ...opts, throwOnFoldError: true }), opts.packages, opts.writerKey); }
  private assertAvailable(): void { if (this.unavailable) throw new Error('scope: facade unavailable; reopen after replay failure'); }
  private replayFailed(error: unknown): never {
    this.unavailable = true;
    // Keep the original replay failure even if closing storage also fails.
    try { this.journal.close(); } finally { throw error; }
  }
  get state(): ScopeState {
    this.assertAvailable();
    try {
      const state = replayScopeView(this.fullView(), this.journal.context.genesisId, this.packages);
      const inspection = this.journal.context.state.models.inspection as unknown as InspectionState | undefined;
      return snapshot({ ...state, inspection: { ...state.inspection, requested: (inspection?.requests.length ?? 0) > 0 } });
    } catch (error) { return this.replayFailed(error); }
  }
  interpret(principal: string, basis?: number): ScopeState {
    this.assertAvailable();
    const frontier = basis ?? this.journal.context.head;
    return replayScopeView(this.journal.context.view(principal, frontier), this.journal.context.genesisId, this.packages, 0, frontier);
  }
  proof(frontier = this.journal.context.head): PublicProof { return publicProof(this.journal, frontier, this.writerKey); }
  private fullView(): ViewEntry[] { return this.journal.context.entries.map(entry => ({ position: entry.position, event: entry.event, header: entry.header, headerHash: entry.headerHash, committed: entry.committed, via: 'audience' })); }
  export(names: RightName[], frontier?: number): SourceExport {
    this.assertAvailable();
    const limit = frontier ?? this.journal.context.head;
    const view = this.fullView().slice(0, limit + 1);
    return exportFrom(replayScopeView(view, this.journal.context.genesisId, this.packages), view, limit, names, this.packages);
  }
  submit(input: ActorEnvelope | string, credential?: TransportCredential): (Receipt & { verdict?: Verdict; controlVerdict?: Verdict }) | Refusal {
    this.assertAvailable();
    let result: ReturnType<Journal['submit']>;
    try { result = this.journal.submit(input, credential); }
    catch (error) { return this.replayFailed(error); }
    if ('refused' in result) return result;
    // Every accepted append must leave a determinate scope fold, including
    // ordinary application events whose handlers can fail. Known policy
    // refusals are verdicts; an unexpected replay error closes this facade.
    const state = this.state;
    const event = verifyEnvelope(input).body;
    if (result.controlVerdict || !scopeKinds.has(event.kind)) return result;
    return { ...result, verdict: state.verdicts[result.header.position] };
  }
  close(): void { this.journal.close(); }
}

/** Strict genesis surface for the explicitly selected scope fixture. */
function validateScopeGenesis(event: EventBody, packages: Record<string, PackageDescriptor>): void {
  const fail = (message: string): never => { throw new ScopeProfileError(message); };
  if (event.kind !== K.genesis || !event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) fail('expected genesis payload');
  const p = event.payload as Record<string, any>;
  const required = ['foundation','runtime','sequencing','grants','bindings','origins','referents','route','scope'];
  if (required.some(k => !Object.hasOwn(p, k)) || Object.keys(p).some(k => ![...required,'transition'].includes(k))) fail('genesis fields');
  if (p.foundation !== F0_ID || p.runtime !== RUNTIME) fail('unsupported foundation or runtime');
  if (!p.sequencing || typeof p.sequencing !== 'object' || Array.isArray(p.sequencing)) fail('sequencing object');
  if (!Array.isArray(p.grants) || !p.grants.every((g: any) => g && typeof g === 'object' && !Array.isArray(g) && typeof g.principal === 'string' && Object.keys(g).every(k => ['principal','roles','rights','capabilities'].includes(k)) && ['roles','rights','capabilities'].every(k => g[k] === undefined || Array.isArray(g[k]) && g[k].every((v: unknown) => typeof v === 'string')))) fail('grant shape');
  if (!Array.isArray(p.bindings) || !p.bindings.length || !p.bindings.every((b: any) => b && typeof b === 'object' && Object.keys(b).every(k => ['package','resolution'].includes(k)) && typeof b.package === 'string' && !!packages[b.package])) fail('binding shape or missing package');
  if (!Array.isArray(p.origins) || !p.origins.every((o: any) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).sort().join(',') === 'actor,kind,nonce,payload' && typeof o.kind === 'string' && typeof o.actor === 'string' && typeof o.nonce === 'string') || !Array.isArray(p.referents) || !p.referents.every((r: unknown) => typeof r === 'string') || typeof p.route !== 'string' || !p.route) fail('origins, referents or route shape');
  const setup = scopeSetup(event); if (!setup) fail('missing setup');
  if (setup!.role !== 'fulfilment' && p.transition !== undefined) fail('unexpected transition');
}
