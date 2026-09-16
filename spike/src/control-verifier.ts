// O5: an independent reader of the ordering profile, not the writer's fold.
// This module deliberately imports no journal, append, package or grant code.
import {
  canonicalize, envelopeId, headerHash, publicKeyOf, verifyEnvelope,
  verifyHeader, verifyWire, type WireEntry,
} from './codec.ts';
import { ZERO_HASH } from './canon.ts';
import { SYSTEM_PREFIX, type Header } from './types.ts';

const FIXED = 'dap.fixture.single-writer/1';
const MOVABLE = 'dap.fixture.single-writer/2';
const SEQ = SYSTEM_PREFIX + 'seq.';

/** Every seq opening must be supplied. Kind-free headers cannot prove this. */
export interface ControlProof {
  pinnedGenesis: string;
  genesis: WireEntry;
  entries: Array<{ header: Header; committed?: string }>;
}
export interface ControlResult {
  genesis: string;
  profile: string;
  control?: string;
  epoch: number;
  writer: string;
  sealed: boolean;
  head: { position: number; headerHash: string; commitment: string };
  /** The successor begins signing the position after its assignment. */
  assignments: Array<{ epoch: number; writer: string; firstPosition: number }>;
  controlEntries: number;
  opaqueEntries: number;
}
export class ControlVerificationError extends Error {
  code: string;
  position?: number;
  constructor(code: string, position?: number) {
    super(`control verifier: ${code}${position === undefined ? '' : ' at ' + position}`);
    this.name = 'ControlVerificationError'; this.code = code; this.position = position;
  }
}
function fail(code: string, position?: number): never { throw new ControlVerificationError(code, position); }
function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return value as Record<string, unknown>;
}
function exact(value: unknown, keys: string[], code: string): Record<string, unknown> {
  const object = record(value, code);
  if (Object.keys(object).sort().join('\0') !== [...keys].sort().join('\0')) fail(code);
  return object;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function check(input: ControlProof): { result: ControlResult; headers: Header[]; writers: string[] } {
  // Canonical copying rejects getters, exotic objects and extra non-JSON data.
  const proof = JSON.parse(canonicalize(input)) as ControlProof;
  exact(proof, ['pinnedGenesis', 'genesis', 'entries'], 'proof_shape');
  exact(proof.genesis, ['header', 'committed'], 'genesis_shape');
  if (!Array.isArray(proof.entries)) fail('entries_shape');
  const genesis = verifyEnvelope(proof.genesis.committed);
  if (envelopeId(genesis) !== proof.pinnedGenesis) fail('wrong_genesis_pin');
  const payload = record(genesis.body.payload, 'genesis_payload');
  const sequencing = record(payload.sequencing, 'sequencing_profile');
  const profile = sequencing.profile;
  if (profile !== FIXED && profile !== MOVABLE) fail('unsupported_profile');
  if (profile === MOVABLE) exact(sequencing, ['profile', 'writer', 'control'], 'sequencing_shape');
  const initialWriter = sequencing.writer as string;
  publicKeyOf(initialWriter);
  const control = profile === MOVABLE ? sequencing.control as string : undefined;
  if (control !== undefined) {
    publicKeyOf(control);
    if (control === initialWriter) fail('control_is_writer');
  }
  const first = verifyWire(proof.genesis, initialWriter, { genesis: proof.pinnedGenesis, position: 0, prev: ZERO_HASH });
  let previous = first.header;
  let writer = initialWriter, epoch = 0, sealed = false;
  let controlEntries = 0, opaqueEntries = 0;
  const usedWriters = new Set([writer]);
  const assignments = [{ epoch, writer, firstPosition: 0 }];
  const headers = [first.header], writers = [writer];

  for (let i = 0; i < proof.entries.length; i++) {
    const item = proof.entries[i]!, position = i + 1;
    const itemFields = Object.hasOwn(item, 'committed') ? ['header', 'committed'] : ['header'];
    exact(item, itemFields, 'entry_shape');
    const expected = { genesis: proof.pinnedGenesis, position, prev: headerHash(previous) };
    // Both seal and assign are still committed by the retiring writer.
    verifyHeader(item.header, writer, expected);
    const signer = writer;
    if (!Object.hasOwn(item, 'committed')) {
      if (sealed) fail('sealed_requires_assign', position);
      opaqueEntries++;
    } else {
      const entry = verifyWire(item as WireEntry, writer, expected);
      const kind = entry.event.kind;
      if (!kind.startsWith(SEQ)) fail('non_control_opening', position);
      controlEntries++;
      if (kind === SEQ + 'request') {
        if (sealed) fail('sealed_requires_assign', position);
        // Even a signed, recorded request supplies no assignment authority.
        // Its application capability is intentionally not evaluated here.
      } else if (kind === SEQ + 'seal' || kind === SEQ + 'assign') {
        if (profile !== MOVABLE) fail('fixed_writer_profile', position);
        if (entry.event.actor !== control) fail('wrong_control_actor', position);
        const seal = kind === SEQ + 'seal';
        const body = exact(entry.event.payload, seal ? ['epoch', 'predecessor'] : ['epoch', 'predecessor', 'writer'], 'control_payload_shape');
        if (!Number.isSafeInteger(body.epoch) || (body.epoch as number) < 0) fail('invalid_epoch', position);
        if (body.predecessor !== previous.commitment) fail('wrong_predecessor_commitment', position);
        if (seal) {
          if (sealed) fail('sealed_requires_assign', position);
          if (body.epoch !== epoch) fail('wrong_seal_epoch', position);
          sealed = true;
        } else {
          if (!sealed) fail('assign_requires_seal', position);
          if (!Number.isSafeInteger(epoch + 1) || body.epoch !== epoch + 1) fail('wrong_assign_epoch', position);
          const successor = body.writer as string;
          publicKeyOf(successor);
          if (successor === control) fail('control_is_writer', position);
          if (usedWriters.has(successor)) fail('writer_reuse', position);
          writer = successor; epoch++; sealed = false;
          usedWriters.add(writer);
          assignments.push({ epoch, writer, firstPosition: position + 1 });
        }
      } else fail('unknown_control_kind', position);
    }
    previous = item.header; headers.push(previous); writers.push(signer);
  }
  return freeze({
    result: {
      genesis: proof.pinnedGenesis, profile, ...(control === undefined ? {} : { control }),
      epoch, writer, sealed,
      head: { position: previous.position, headerHash: headerHash(previous), commitment: previous.commitment },
      assignments, controlEntries, opaqueEntries,
    }, headers, writers,
  });
}

/** Checks ordering only: no application admission, effects, audience or freshness. */
export function verifyControlSpine(proof: ControlProof): ControlResult { return check(proof).result; }

export type Comparison =
  | { compatible: true; commonLength: number }
  | { compatible: false; genesis: string; position: number; writer: string; left: Header; right: Header };

/** Comparing independently valid histories exposes equivocation, not a winner. */
export function compareControlSpines(left: ControlProof, right: ControlProof): Comparison {
  const a = check(left), b = check(right);
  if (a.result.genesis !== b.result.genesis) fail('different_genesis');
  const length = Math.min(a.headers.length, b.headers.length);
  for (let i = 0; i < length; i++) {
    if (headerHash(a.headers[i]!) !== headerHash(b.headers[i]!)) {
      // The first disagreement has one common predecessor and active signer.
      return freeze({ compatible: false, genesis: a.result.genesis, position: i, writer: a.writers[i]!, left: a.headers[i]!, right: b.headers[i]! });
    }
  }
  return { compatible: true, commonLength: length };
}
