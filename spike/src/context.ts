// A context: genesis, adopted origins, submission through the append
// operation, the full-series fold, audiences and per-participant
// visibility. The serving party and the sequencer are one process here
// (design note §2, first trusted profile).

import { contentId, nonce, type Json } from './canon.ts';
import { attachRequires, bindingId, packageIn, type PackageDescriptor } from './descriptor.ts';
import {
  F0_ID,
  K,
  RUNTIME,
  foldEntry,
  initialFoundationState,
  issuanceEvidence,
  originsCount,
  verifyIssuance,
  visibilityOf,
  type Visibility,
  type AcceptInvitePayload,
  type FoundationState,
  type GenesisPayload,
} from './foundation.ts';
import { MemoryBackend, append, appendUnadmitted, type Backend, type AppendEncoding, type TransportCredential } from './append.ts';
import { SYSTEM_PREFIX, type Entry, type EventBody, type Header, type Principal, type Receipt, type Refusal, type Verdict } from './types.ts';

export interface ContextOptions {
  creator: Principal;
  writer?: Principal;
  packages: Record<string, PackageDescriptor>;
  bindings?: GenesisPayload['bindings'];
  grants?: GenesisPayload['grants'];
  origins?: EventBody[];
  referents?: string[];
  route?: string;
  backend?: Backend;
  maxPayloadBytes?: number;
  /** the genesis event's nonce; a script sets it so the context, and every id within it, replays identically */
  nonce?: string;
}

export interface ViewEntry {
  position: number;
  /** present when visible; absent when only the header is */
  event?: EventBody;
  /** O1 original signed envelope bytes, supplied only when the event is readable. */
  committed?: string;
  /** the authenticated header, always present (design note §1: hidden positions carry headers) */
  header: Header;
  headerHash: string;
  /** how the position is visible: by its audience, by a later disclosure, or hidden */
  via: Visibility;
}

export class Context {
  readonly backend: Backend;
  readonly genesisId: string;
  readonly packages: Record<string, PackageDescriptor>;
  readonly state: FoundationState;
  private readonly maxPayloadBytes: number;
  private readonly encoding?: AppendEncoding;

  private constructor(backend: Backend, genesisId: string, packages: Record<string, PackageDescriptor>, maxPayloadBytes: number, encoding?: AppendEncoding) {
    this.backend = backend;
    this.genesisId = genesisId;
    this.packages = packages;
    this.state = initialFoundationState(genesisId);
    this.maxPayloadBytes = maxPayloadBytes;
    this.encoding = encoding;
  }

  /** Sign a genesis adopting the origins, append it at 0 and the origins at 1..k, and fold them. */
  static create(opts: ContextOptions): Context {
    const backend = opts.backend ?? new MemoryBackend();
    const payload: GenesisPayload = {
      foundation: F0_ID,
      runtime: RUNTIME,
      sequencing: { profile: 'single-writer', writer: opts.writer ?? opts.creator },
      grants: opts.grants ?? [],
      bindings: opts.bindings ?? [],
      origins: opts.origins ?? [],
      referents: opts.referents ?? [],
      route: opts.route ?? 'route:' + nonce(),
    };
    const genesisEvent: EventBody = { kind: K.genesis, payload: payload as unknown as Json, actor: opts.creator, nonce: opts.nonce ?? nonce() };
    const genesisId = contentId(genesisEvent as unknown as Json);
    const ctx = new Context(backend, genesisId, opts.packages, opts.maxPayloadBytes ?? 64 * 1024);
    const g = appendUnadmitted(backend, genesisId, genesisEvent);
    ctx.fold(g, false); // throws a GenesisError on a bad genesis
    for (const o of payload.origins) {
      const e = appendUnadmitted(backend, genesisId, o);
      ctx.fold(e, true);
    }
    return ctx;
  }

  /** Trusted replay boundary. O1 verifies every wire entry before calling this. */
  static restore(backend: Backend, packages: Record<string, PackageDescriptor>, maxPayloadBytes = 64 * 1024, encoding?: AppendEncoding): Context {
    const entries = backend.entries();
    if (!entries[0]) throw new Error('Context: empty journal');
    const ctx = new Context(backend, entries[0].id, packages, maxPayloadBytes, encoding);
    const origins = originsCount(entries[0].event);
    for (const entry of entries) ctx.fold(entry, entry.position > 0 && entry.position <= origins);
    return ctx;
  }

  get entries(): readonly Entry[] {
    return this.backend.entries();
  }

  get head(): number {
    return this.entries.length - 1;
  }

  private fold(entry: Entry, origin: boolean): Verdict {
    return foldEntry(this.state, { entry, origin, packages: this.packages, entries: this.entries });
  }

  /** The serving party issues a credential to a current participant. */
  credentialFor(p: Principal): TransportCredential | undefined {
    return this.state.participants.includes(p) ? { principal: p } : undefined;
  }

  /** The binding an application intent for `kind` must expect right now. */
  currentBinding(kind: string): string | undefined {
    return bindingId(this.state.env, kind);
  }

  /** The position of the attach that produced the current binding of `kind`. */
  currentActivation(kind: string): number | undefined {
    return this.state.env.kinds[kind]?.attachedAt;
  }

  /**
   * Build a sequenced intent for this context. An application intent
   * captures the binding active when it is composed, unless one is given.
   */
  intent(actor: Principal, kind: string, payload: Json, opts: { action_id?: string; expected_binding?: string; expected_activation?: number; nonce?: string } = {}): EventBody {
    const application = !kind.startsWith(SYSTEM_PREFIX);
    const expected = opts.expected_binding ?? (application ? this.currentBinding(kind) : undefined);
    const activation = opts.expected_activation ?? (application ? this.currentActivation(kind) : undefined);
    return {
      kind,
      payload,
      actor,
      nonce: opts.nonce ?? nonce(),
      genesis: this.genesisId,
      action_id: opts.action_id ?? 'action:' + (opts.nonce ?? nonce()),
      ...(expected ? { expected_binding: expected } : {}),
      ...(activation !== undefined ? { expected_activation: activation } : {}),
    };
  }

  /** Submit through the append operation, then fold if newly sequenced. */
  submit(event: EventBody, credential?: TransportCredential, proof?: unknown): (Receipt & { verdict?: Verdict }) | Refusal {
    const state = this.state;
    const r = append(
      this.backend,
      { event, credential, proof },
      {
        genesis: this.genesisId,
        encoding: this.encoding,
        maxPayloadBytes: this.maxPayloadBytes,
        isParticipant: (p) => state.participants.includes(p),
        // Admission and the members' verification use the same issuance object: the embedded envelope,
        // checked against the chain and the fold. Nothing is looked up by a caller-chosen label.
        issuedInvite: (ev) => {
          const v = verifyIssuance(issuanceEvidence(state, this.entries), ev.payload);
          return v.ok ? { tokenId: v.tokenId, invitee: v.invite.invitee } : undefined;
        },
        acceptKind: K.accept_invite,
        activationOf: (kind) => state.env.kinds[kind]?.attachedAt,
        requiresOf: (ev) => {
          // Evidence is extracted from runtime JSON before the fold validates it: never throw here.
          if (ev.kind !== K.attach) return undefined;
          const p = ev.payload;
          if (!p || typeof p !== 'object' || Array.isArray(p)) return undefined;
          const { package: pkgId, resolution } = p as { package?: unknown; resolution?: unknown };
          const pkg = packageIn(this.packages, pkgId);
          return pkg ? attachRequires(state.env, pkg, resolution) : undefined;
        },
      },
    );
    if ('refused' in r) return r;
    if (r.replay) return { ...r, verdict: state.verdicts[r.header.position] };
    const entry = this.entries[r.header.position]!;
    const verdict = this.fold(entry, false);
    return { ...r, verdict };
  }

  /** Convenience: submit as a current participant with the serving party's credential. */
  act(actor: Principal, kind: string, payload: Json, opts: { action_id?: string; expected_binding?: string; expected_activation?: number; nonce?: string } = {}) {
    return this.submit(this.intent(actor, kind, payload, opts), this.credentialFor(actor));
  }

  /** Verdict recorded at a position. */
  verdictAt(position: number): Verdict | undefined {
    return this.state.verdicts[position];
  }

  /** The embedded invite an invitee needs to redeem: the invite entry's body and header. */
  inviteEnvelope(position: number): AcceptInvitePayload {
    const e = this.entries[position];
    if (!e) throw new Error(`no entry at ${position}`);
    return { invite: { event: e.event, header: e.header, ...(e.actorSig ? { actorSig: e.actorSig } : {}) } };
  }

  /** The number of adopted origins, from the genesis at position 0. */
  get origins(): number {
    return originsCount(this.entries[0]!.event);
  }

  /** V(p, n): the view of `p` under basis `n`, positions preserved, headers for hidden positions. */
  view(p: Principal, n: number = this.head): ViewEntry[] {
    const out: ViewEntry[] = [];
    for (let i = 0; i <= n; i++) {
      const e = this.entries[i]!;
      const via = visibilityOf(this.state, p, i, n);
      out.push(via === 'hidden' ? { position: i, header: e.header, headerHash: e.headerHash, via } : { position: i, event: e.event, ...(e.committed ? { committed: e.committed } : {}), header: e.header, headerHash: e.headerHash, via });
    }
    return out;
  }

  hiddenCount(p: Principal, n: number = this.head): number {
    return this.view(p, n).filter((v) => !v.event).length;
  }
}
