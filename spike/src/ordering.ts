// Ordering authority is derived from authenticated control entries, without
// packages, participation, capabilities, or application payloads.
import { publicKeyOf, isCodecValidationError } from './codec.ts';
import { SYSTEM_PREFIX, type Entry, type EventBody, type Refusal } from './types.ts';
export const FIXED_WRITER_PROFILE = 'dap.fixture.single-writer/1';
export const HANDOVER_PROFILE = 'dap.fixture.single-writer/3';
export const SEAL = SYSTEM_PREFIX + 'seq.seal';
export const ASSIGN = SYSTEM_PREFIX + 'seq.assign';
export interface OrderingState {
  profile: string;
  initialWriter: string;
  writer: string;
  control?: string;
  epoch: number;
  writers: readonly string[];
  sealed?: { position: number; headerHash: string };
}
function object(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('ordering: malformed control payload');
  return x as Record<string, unknown>;
}
export function initialOrdering(genesis: EventBody): OrderingState {
  const s = object(object(genesis.payload).sequencing);
  if (s.profile !== FIXED_WRITER_PROFILE && s.profile !== HANDOVER_PROFILE) throw new Error('Journal: unsupported profile');
  publicKeyOf(s.writer as string);
  if (s.profile === HANDOVER_PROFILE) {
    if (Object.keys(s).sort().join(',') !== 'control,profile,writer') throw new Error('ordering: invalid v3 sequencing fields');
    publicKeyOf(s.control as string);
    if (s.control === s.writer) throw new Error('ordering: control key must differ from writer');
  }
  return { profile: s.profile, initialWriter: s.writer as string, writer: s.writer as string,
    ...(s.profile === HANDOVER_PROFILE ? { control: s.control as string } : {}), epoch: 0, writers: [s.writer as string] };
}
/** Validates a new event against the exact committed head. The caller has
 * already authenticated its envelope and must hold the append boundary. */
export function orderingAdmission(state: OrderingState, head: Entry, event: EventBody, signer: string): 'control' | Refusal | undefined {
  if (signer !== state.writer) return { refused: true, reason: 'retired_writer' };
  const control = event.kind === SEAL || event.kind === ASSIGN;
  if (state.profile !== HANDOVER_PROFILE) {
    if (control) return { refused: true, reason: 'handover_not_enabled' };
    return undefined;
  }
  if (state.sealed && event.kind !== ASSIGN) return { refused: true, reason: 'writer_sealed' };
  if (!control) return undefined;
  // Shape refusals are explicit. An exception while inspecting an object or
  // importing a valid key is an implementation fault, not malformed control.
  const malformed: Refusal = { refused: true, reason: 'malformed_control' };
  if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) return malformed;
  const p = event.payload;
  const fields = event.kind === SEAL ? ['epoch', 'predecessor'] : ['epoch', 'predecessor', 'writer'];
  if (Object.keys(p).sort().join(',') !== fields.sort().join(',')) return malformed;
  if (!p.predecessor || typeof p.predecessor !== 'object' || Array.isArray(p.predecessor)) return malformed;
  const predecessor = p.predecessor;
  if (Object.keys(predecessor).sort().join(',') !== 'headerHash,position'
    || !Number.isSafeInteger(predecessor.position) || (predecessor.position as number) < 0
    || typeof predecessor.headerHash !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(predecessor.headerHash)) return malformed;
  if (predecessor.position !== head.position || predecessor.headerHash !== head.headerHash) return { refused: true, reason: 'wrong_control_predecessor' };
  if (event.kind === SEAL) {
    if (p.epoch !== state.epoch) return { refused: true, reason: 'wrong_ordering_epoch' };
    if (event.actor !== state.control) return { refused: true, reason: 'wrong_seal_authority' };
  } else {
    if (!state.sealed || state.sealed.position !== head.position || state.sealed.headerHash !== head.headerHash) return { refused: true, reason: 'assignment_without_seal' };
    if (p.epoch !== state.epoch + 1) return { refused: true, reason: 'wrong_ordering_epoch' };
    if (event.actor !== state.control) return { refused: true, reason: 'wrong_control_authority' };
    try { publicKeyOf(p.writer as string); }
    catch (error) {
      if (isCodecValidationError(error)) return malformed;
      throw error;
    }
    if (p.writer === state.control) return { refused: true, reason: 'control_key_is_writer' };
    if (state.writers.includes(p.writer as string)) return { refused: true, reason: 'writer_already_used' };
  }
  return 'control';
}
/** Advance only after the authenticated entry passed orderingAdmission. */
export function advanceOrdering(state: OrderingState, entry: Entry): OrderingState {
  if (state.profile !== HANDOVER_PROFILE) return state;
  if (entry.event.kind === SEAL) return { ...state, sealed: { position: entry.position, headerHash: entry.headerHash } };
  if (entry.event.kind === ASSIGN) {
    const p = entry.event.payload as unknown as { writer: string; epoch: number };
    const { sealed: _sealed, ...prior } = state;
    return { ...prior, writer: p.writer, epoch: p.epoch, writers: [...prior.writers, p.writer] };
  }
  return state;
}
