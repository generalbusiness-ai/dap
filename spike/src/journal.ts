// Authenticated facade over the existing Context and shared append operation.
import type { KeyObject } from 'node:crypto';
import { acquireBackend, type BackendLease } from './ownership.ts';
import { appendInitial, MemoryBackend, snapshot, type AppendEncoding, type Backend, type TransportCredential } from './append.ts';
import { canonicalize, envelopeBytes, envelopeId, principalOf, signHeader, verifyEnvelope, verifyHeader, headerHash, verifyWire, type ActorEnvelope } from './codec.ts';
import { ZERO_HASH } from './canon.ts';
import { Context, type ViewEntry } from './context.ts';
import type { PackageDescriptor } from './descriptor.ts';
import { K, type GenesisPayload } from './foundation.ts';
import { SQLiteBackend } from './sqlite.ts';
import type { Entry, EventBody, Receipt, Refusal, Verdict } from './types.ts';
import { advanceOrdering, initialOrdering, orderingAdmission, HANDOVER_PROFILE, SEAL, ASSIGN, type OrderingState } from './ordering.ts';
export const O1_PROFILE_VERSION = 'dap.fixture.single-writer/1';
export const ORDERING_PROFILE = O1_PROFILE_VERSION;
export const MAX_ENVELOPE_BYTES = 64 * 1024;
export interface JournalOptions { backend: Backend; writerKey: KeyObject; packages: Record<string, PackageDescriptor> }
interface VerifiedPrefix {
  state: OrderingState;
  head: Entry;
  genesis: string;
  commitments: Set<string>;
  controls: Set<number>;
}
function currentHead(backend: Backend, prefix: VerifiedPrefix): Entry {
  const head = backend.head();
  if (!head || head.position !== prefix.head.position || head.headerHash !== prefix.head.headerHash) {
    throw new Error('Journal: verified prefix is stale; reopen before use');
  }
  return head;
}
function encoding(key: KeyObject, prefix?: VerifiedPrefix, backend?: Backend): AppendEncoding {
  return {
    prepare(event, proof) {
      const envelope = verifyEnvelope(proof as ActorEnvelope);
      if (canonicalize(envelope.body) !== canonicalize(event)) throw new Error('Journal: proof body mismatch');
      return { id: envelopeId(envelope), actorSig: envelope.sig, committed: envelopeBytes(envelope) };
    },
    sign(header) {
      if (prefix) {
        const head = currentHead(backend!, prefix);
        if (header.genesis !== prefix.genesis || header.position !== head.position + 1 || header.prev !== head.headerHash) {
          throw new Error('Journal: new header does not extend verified prefix');
        }
        if (prefix.commitments.has(header.commitment)) throw new Error('Journal: duplicate commitment');
      }
      return signHeader(header, key);
    },
    ...(prefix ? {
      committed(entry: Entry) {
        const head = backend!.head();
        if (!head || head.position !== entry.position || head.headerHash !== entry.headerHash
          || entry.position !== prefix.head.position + 1 || entry.header.prev !== prefix.head.headerHash) {
          throw new Error('Journal: committed entry does not extend verified prefix');
        }
        // prepare authenticated this actor envelope and sign authenticated its
        // new header. Advance only after the storage transaction has returned.
        prefix.state = advanceOrdering(prefix.state, entry);
        prefix.head = entry;
        prefix.commitments.add(entry.header.commitment);
        if (prefix.state.profile === HANDOVER_PROFILE && (entry.event.kind === SEAL || entry.event.kind === ASSIGN)) prefix.controls.add(entry.position);
      },
    } : {}),
    ...(prefix?.state.profile === HANDOVER_PROFILE ? {
      admission(event: EventBody) {
        return orderingAdmission(prefix.state, currentHead(backend!, prefix), event, principalOf(key));
      },
    } : {}),
  };
}
function declared(genesis: ActorEnvelope, writer: string): EventBody[] {
  if (genesis.body.kind !== K.genesis) throw new Error('Journal: expected genesis');
  const payload = genesis.body.payload as unknown as GenesisPayload;
  const state = initialOrdering(genesis.body);
  if (state.initialWriter !== writer) throw new Error('Journal: wrong writer (initial assignment)');
  if (!Array.isArray(payload.origins)) throw new Error('Journal: invalid origins');
  return payload.origins;
}
function verifyEntries(entries: readonly Entry[]): VerifiedPrefix {
  if (!entries[0]?.committed) throw new Error('Journal: missing verified genesis');
  const genesis = verifyEnvelope(entries[0].committed);
  let state = initialOrdering(genesis.body);
  const origins = declared(genesis, state.initialWriter);
  if (entries.length < origins.length + 1) throw new Error('Journal: incomplete initialization');
  let prev = ZERO_HASH;
  const commitments = new Set<string>(), controls = new Set<number>();
  for (let position = 0; position < entries.length; position++) {
    const entry = entries[position]!;
    if (commitments.has(entry.header.commitment)) throw new Error('Journal: duplicate commitment');
    commitments.add(entry.header.commitment);
    if (!entry.committed) throw new Error('Journal: missing committed bytes');
    if (Buffer.byteLength(entry.committed) > MAX_ENVELOPE_BYTES) throw new Error('Journal: envelope bounds');
    const verified = verifyWire({ header: entry.header, committed: entry.committed }, state.writer, { genesis: envelopeId(genesis), position, prev }, { allowOrigin: position > 0 && position <= origins.length });
    if (canonicalize(verified) !== canonicalize(entry)) throw new Error('Journal: stored entry disagrees with verified bytes');
    if (position > 0 && position <= origins.length && canonicalize(entry.event) !== canonicalize(origins[position - 1])) throw new Error('Journal: unadopted origin');
    if (position > origins.length && state.profile === HANDOVER_PROFILE) {
      const admission = orderingAdmission(state, entries[position - 1]!, entry.event, state.writer);
      if (admission && admission !== 'control') throw new Error('Journal: ' + admission.reason);
      state = advanceOrdering(state, entry);
      if (admission === 'control') controls.add(position);
    }
    prev = entry.headerHash;
  }
  return { state, head: entries.at(-1)!, genesis: envelopeId(genesis), commitments, controls };
}
function backendAssignment(opts: JournalOptions, state: OrderingState): void {
  if (opts.backend instanceof SQLiteBackend && (opts.backend.writer !== state.initialWriter || opts.backend.profile !== state.profile)) throw new Error('Journal: backend assignment mismatch');
  if (!state.writers.includes(principalOf(opts.writerKey))) throw new Error('Journal: unassigned writer key');
}
export class Journal {
  readonly context: Context;
  private needsReopen = false;
  private closed = false;
  readonly #lease: BackendLease;
  readonly #prefix: VerifiedPrefix;
  private constructor(opts: JournalOptions) {
    this.#lease = acquireBackend(opts.backend);
    try {
      this.#prefix = verifyEntries(opts.backend.entries());
      backendAssignment(opts, this.#prefix.state);
      this.context = Context.restore(opts.backend, opts.packages, MAX_ENVELOPE_BYTES, encoding(opts.writerKey, this.#prefix, opts.backend), this.#lease);
      if (opts.backend instanceof SQLiteBackend) {
        const expected = this.context.entries.filter(e => e.event.kind === K.accept_invite).map(e => (e.event.payload as unknown as { invite: { header: { commitment: string } } }).invite.header.commitment).sort();
        if (canonicalize(expected) !== canonicalize(opts.backend.consumedTokens())) throw new Error('Journal: corrupt invitation consumption index');
      }
    } catch (error) { this.#lease.release(); throw error; }

  }
  static create(opts: JournalOptions, signedGenesis: ActorEnvelope | string | Uint8Array, signedOrigins: (ActorEnvelope | string | Uint8Array)[] = []): Journal {
    if (opts.backend.entries().length) throw new Error('Journal: already initialized');
    const genesis = verifyEnvelope(signedGenesis);
    backendAssignment(opts, initialOrdering(genesis.body));
    const origins = signedOrigins.map(o => verifyEnvelope(o));
    const adopted = declared(genesis, principalOf(opts.writerKey));
    if (canonicalize(adopted) !== canonicalize(origins.map(o => o.body))) throw new Error('Journal: origin proofs do not match genesis');
    const submissions = [genesis, ...origins].map(proof => {
      if (Buffer.byteLength(envelopeBytes(proof)) > MAX_ENVELOPE_BYTES) throw new Error('Journal: envelope bounds');
      return { event: proof.body, proof };
    });
    // Preflight the initial fold, then persist all initialization entries in one transaction.
    const preflight = new MemoryBackend();
    appendInitial(preflight, envelopeId(genesis), submissions, encoding(opts.writerKey));
    new Journal({ ...opts, backend: preflight }).close();
    appendInitial(opts.backend, envelopeId(genesis), submissions, encoding(opts.writerKey));
    return new Journal(opts);
  }
  static open(opts: JournalOptions): Journal { return new Journal(opts); }
  /** Releases the sole serving fold. SQLite reopen needs a fresh backend handle. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.#lease.release();
    if (this.context.backend instanceof SQLiteBackend) this.context.backend.close();
  }
  /** Ordering state, independently authenticated from the committed chain. */
  get ordering(): OrderingState {
    currentHead(this.context.backend, this.#prefix);
    return snapshot(this.#prefix.state);
  }
  controlVerdictAt(position: number): Verdict | undefined {
    if (!this.#prefix.controls.has(position)) return undefined;
    currentHead(this.context.backend, this.#prefix);
    return { known: true, authorized: true, effective: true };
  }
  submit(input: ActorEnvelope | string | Uint8Array, credential?: TransportCredential): (Receipt & { verdict?: Verdict; controlVerdict?: Verdict }) | Refusal {
    if (this.closed) throw new Error('Journal: facade is closed');
    if (this.needsReopen) throw new Error('Journal: reopen and reconcile after storage or fold error');
    let envelope: ActorEnvelope;
    try { envelope = verifyEnvelope(input); }
    catch { return { refused: true as const, reason: 'invalid_envelope' }; }
    try {
      const result = this.context.submit(envelope.body, credential, envelope);
      if ('refused' in result) return result;
      const controlVerdict = this.controlVerdictAt(result.header.position);
      if (!controlVerdict) return result;
      const { verdict: _applicationPlaceholder, ...receipt } = result;
      return { ...receipt, controlVerdict };
    }
    catch (error) { this.needsReopen = true; this.#lease.invalidate(); throw error; }

  }
}

/** Recipient-side authentication of a complete header prefix. The caller pins
 * genesis and writer independently; visibility policy and freshness remain
 * separate questions for the serving party and semantic interpreter. */
export function verifyJournalView(view: readonly ViewEntry[], expected: { genesis: string; writer: string }): readonly ViewEntry[] {
  if (!view[0]?.event || !view[0].committed) throw new Error('Journal view: genesis must be readable');
  const genesis = verifyEnvelope(view[0].committed);
  const origins = declared(genesis, expected.writer);
  let state = initialOrdering(genesis.body);
  let previousEntry: Entry | undefined;
  let prev = ZERO_HASH;
  const commitments = new Set<string>();
  for (let position = 0; position < view.length; position++) {
    const v = view[position]!;
    if (v.position !== position) throw new Error('Journal view: non-dense positions');
    if (commitments.has(v.header.commitment)) throw new Error('Journal view: duplicate commitment');
    commitments.add(v.header.commitment);
    const chain = { genesis: expected.genesis, position, prev };
    verifyHeader(v.header, state.writer, chain);
    if (v.headerHash !== headerHash(v.header)) throw new Error('Journal view: wrong header hash');
    if (v.event !== undefined) {
      if (!v.committed) throw new Error('Journal view: missing actor proof');
      if (Buffer.byteLength(v.committed) > MAX_ENVELOPE_BYTES) throw new Error('Journal view: envelope bounds');
      const entry = verifyWire({ header: v.header, committed: v.committed }, state.writer, chain, { allowOrigin: position > 0 && position <= origins.length });
      if (canonicalize(entry.event) !== canonicalize(v.event)) throw new Error('Journal view: body disagrees with signed bytes');
      if (position > 0 && position <= origins.length && canonicalize(entry.event) !== canonicalize(origins[position - 1])) throw new Error('Journal view: unadopted origin');
      if (position > origins.length && state.profile === HANDOVER_PROFILE) {
        const admission = orderingAdmission(state, previousEntry!, entry.event, state.writer);
        if (admission && admission !== 'control') throw new Error('Journal view: ' + admission.reason);
        state = advanceOrdering(state, entry);
      }
    } else if (v.committed !== undefined) throw new Error('Journal view: hidden position contains an envelope');
    if (state.sealed && v.event === undefined) throw new Error('Journal view: missing assignment opening after seal');
    // The control actor pins this exact predecessor, even when its body is hidden.
    previousEntry = { position, header: v.header, headerHash: v.headerHash } as Entry;
    prev = v.headerHash;
  }
  return snapshot(view);
}
