// A context: genesis, adopted origins, submission through the append
// operation, the full-series fold, audiences and per-participant
// visibility. The serving party and the sequencer are one process here
// (design note §2, first trusted profile).

import { contentId, nonce, type Json } from './canon.ts';
import type { PackageDescriptor } from './descriptor.ts';
import {
  F0_ID,
  K,
  RUNTIME,
  foldEntry,
  initialFoundationState,
  visibleTo,
  type AcceptInvitePayload,
  type FoundationState,
  type GenesisPayload,
} from './foundation.ts';
import { MemoryBackend, append, appendUnadmitted, type Backend, type TransportCredential } from './append.ts';
import type { Entry, EventBody, Principal, Receipt, Refusal, Verdict } from './types.ts';

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
}

export interface ViewEntry {
  position: number;
  /** present when visible; absent when only the header is */
  event?: EventBody;
  headerHash: string;
}

export class Context {
  readonly backend: Backend;
  readonly genesisId: string;
  readonly packages: Record<string, PackageDescriptor>;
  readonly state: FoundationState;
  private readonly maxPayloadBytes: number;

  private constructor(backend: Backend, genesisId: string, packages: Record<string, PackageDescriptor>, maxPayloadBytes: number) {
    this.backend = backend;
    this.genesisId = genesisId;
    this.packages = packages;
    this.state = initialFoundationState(genesisId);
    this.maxPayloadBytes = maxPayloadBytes;
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
    const genesisEvent: EventBody = { kind: K.genesis, payload: payload as unknown as Json, actor: opts.creator, nonce: nonce() };
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

  /** Build a sequenced intent for this context. */
  intent(actor: Principal, kind: string, payload: Json, opts: { action_id?: string; expected_binding?: string } = {}): EventBody {
    return {
      kind,
      payload,
      actor,
      nonce: nonce(),
      genesis: this.genesisId,
      action_id: opts.action_id ?? 'action:' + nonce(),
      ...(opts.expected_binding ? { expected_binding: opts.expected_binding } : {}),
    };
  }

  /** Submit through the append operation, then fold if newly sequenced. */
  submit(event: EventBody, credential?: TransportCredential): (Receipt & { verdict?: Verdict }) | Refusal {
    const state = this.state;
    const r = append(
      this.backend,
      { event, credential },
      {
        genesis: this.genesisId,
        maxPayloadBytes: this.maxPayloadBytes,
        isParticipant: (p) => state.participants.includes(p),
        issuedInvite: (tokenId) => {
          const rec = state.invites[tokenId];
          return rec ? { invitee: rec.invitee } : undefined;
        },
        tokenOf: (ev) => {
          const p = ev.payload as unknown as AcceptInvitePayload;
          const inv = p?.invite?.event?.payload as unknown as { token_id?: string } | undefined;
          return inv?.token_id;
        },
        acceptKind: K.accept_invite,
      },
    );
    if ('refused' in r) return r;
    if (r.replay) return { ...r, verdict: state.verdicts[r.header.position] };
    const entry = this.entries[r.header.position]!;
    const verdict = this.fold(entry, false);
    return { ...r, verdict };
  }

  /** Convenience: submit as a current participant with the serving party's credential. */
  act(actor: Principal, kind: string, payload: Json, opts: { action_id?: string; expected_binding?: string } = {}) {
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
    return { invite: { event: e.event, header: e.header } };
  }

  /** V(p, n): the view of `p` under basis `n`, positions preserved, headers for hidden positions. */
  view(p: Principal, n: number = this.head): ViewEntry[] {
    const out: ViewEntry[] = [];
    for (let i = 0; i <= n; i++) {
      const e = this.entries[i]!;
      out.push(visibleTo(this.state, p, i, n) ? { position: i, event: e.event, headerHash: e.headerHash } : { position: i, headerHash: e.headerHash });
    }
    return out;
  }

  hiddenCount(p: Principal, n: number = this.head): number {
    return this.view(p, n).filter((v) => !v.event).length;
  }
}
