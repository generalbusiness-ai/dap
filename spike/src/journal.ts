// Authenticated facade over the existing Context and shared append operation.
import type { KeyObject } from 'node:crypto';
import { appendInitial, MemoryBackend, type AppendEncoding, type Backend, type TransportCredential } from './append.ts';
import { canonicalize, envelopeBytes, envelopeId, principalOf, signHeader, verifyEnvelope, verifyWire, type ActorEnvelope } from './codec.ts';
import { ZERO_HASH } from './canon.ts';
import { Context } from './context.ts';
import type { PackageDescriptor } from './descriptor.ts';
import { K, type GenesisPayload } from './foundation.ts';
import { SQLiteBackend } from './sqlite.ts';
import type { Entry, EventBody } from './types.ts';
export const O1_PROFILE_VERSION = 'dap.fixture.single-writer/1';
export const ORDERING_PROFILE = O1_PROFILE_VERSION;
export const MAX_ENVELOPE_BYTES = 64 * 1024;
export interface JournalOptions { backend: Backend; writerKey: KeyObject; packages: Record<string, PackageDescriptor> }
function encoding(key: KeyObject): AppendEncoding {
  return {
    prepare(event, proof) {
      const envelope = verifyEnvelope(proof as ActorEnvelope);
      if (canonicalize(envelope.body) !== canonicalize(event)) throw new Error('Journal: proof body mismatch');
      return { id: envelopeId(envelope), actorSig: envelope.sig, committed: envelopeBytes(envelope) };
    },
    sign: header => signHeader(header, key),
  };
}
function declared(genesis: ActorEnvelope, writer: string): EventBody[] {
  if (genesis.body.kind !== K.genesis) throw new Error('Journal: expected genesis');
  const payload = genesis.body.payload as unknown as GenesisPayload;
  if (payload.sequencing?.profile !== ORDERING_PROFILE || payload.sequencing.writer !== writer) throw new Error('Journal: unsupported profile or wrong writer');
  if (!Array.isArray(payload.origins)) throw new Error('Journal: invalid origins');
  return payload.origins;
}
function verifyEntries(entries: readonly Entry[], writer: string): void {
  if (!entries[0]?.committed) throw new Error('Journal: missing verified genesis');
  const genesis = verifyEnvelope(entries[0].committed);
  const origins = declared(genesis, writer);
  if (entries.length < origins.length + 1) throw new Error('Journal: incomplete initialization');
  let prev = ZERO_HASH;
  for (let position = 0; position < entries.length; position++) {
    const entry = entries[position]!;
    if (!entry.committed) throw new Error('Journal: missing committed bytes');
    if (Buffer.byteLength(entry.committed) > MAX_ENVELOPE_BYTES) throw new Error('Journal: envelope bounds');
    const verified = verifyWire({ header: entry.header, committed: entry.committed }, writer, { genesis: envelopeId(genesis), position, prev }, { allowOrigin: position > 0 && position <= origins.length });
    if (canonicalize(verified) !== canonicalize(entry)) throw new Error('Journal: stored entry disagrees with verified bytes');
    if (position > 0 && position <= origins.length && canonicalize(entry.event) !== canonicalize(origins[position - 1])) throw new Error('Journal: unadopted origin');
    prev = entry.headerHash;
  }
}
export class Journal {
  readonly context: Context;
  private needsReopen = false;
  private constructor(opts: JournalOptions) {
    if (opts.backend instanceof SQLiteBackend && (opts.backend.writer !== principalOf(opts.writerKey) || opts.backend.profile !== O1_PROFILE_VERSION)) throw new Error('Journal: backend assignment mismatch');
    verifyEntries(opts.backend.entries(), principalOf(opts.writerKey));
    this.context = Context.restore(opts.backend, opts.packages, MAX_ENVELOPE_BYTES, encoding(opts.writerKey));
    if (opts.backend instanceof SQLiteBackend) {
      const expected = this.context.entries.filter(e => e.event.kind === K.accept_invite).map(e => (e.event.payload as unknown as { invite: { header: { commitment: string } } }).invite.header.commitment).sort();
      if (canonicalize(expected) !== canonicalize(opts.backend.consumedTokens())) throw new Error('Journal: corrupt invitation consumption index');
    }
  }
  static create(opts: JournalOptions, signedGenesis: ActorEnvelope | string | Uint8Array, signedOrigins: (ActorEnvelope | string | Uint8Array)[] = []): Journal {
    if (opts.backend.entries().length) throw new Error('Journal: already initialized');
    if (opts.backend instanceof SQLiteBackend && (opts.backend.writer !== principalOf(opts.writerKey) || opts.backend.profile !== O1_PROFILE_VERSION)) throw new Error('Journal: backend assignment mismatch');
    const genesis = verifyEnvelope(signedGenesis);
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
    new Journal({ ...opts, backend: preflight });
    appendInitial(opts.backend, envelopeId(genesis), submissions, encoding(opts.writerKey));
    return new Journal(opts);
  }
  static open(opts: JournalOptions): Journal { return new Journal(opts); }
  submit(input: ActorEnvelope | string | Uint8Array, credential?: TransportCredential) {
    if (this.needsReopen) throw new Error('Journal: reopen and reconcile after storage or fold error');
    let envelope: ActorEnvelope;
    try { envelope = verifyEnvelope(input); }
    catch { return { refused: true as const, reason: 'invalid_envelope' }; }
    try { return this.context.submit(envelope.body, credential, envelope); }
    catch (error) { this.needsReopen = true; throw error; }
  }
}
