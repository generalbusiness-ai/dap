// Ordering authority is derived from authenticated control entries, without
// packages, participation, capabilities, or application payloads.
import { publicKeyOf } from './codec.ts';
import { SYSTEM_PREFIX, type Entry, type EventBody, type Refusal } from './types.ts';
export const FIXED_WRITER_PROFILE = 'dap.fixture.single-writer/1';
export const HANDOVER_PROFILE = 'dap.fixture.single-writer/2';
export const SEAL = SYSTEM_PREFIX + 'seq.seal';
export const ASSIGN = SYSTEM_PREFIX + 'seq.assign';
export interface OrderingState {
  profile: string;
  initialWriter: string;
  writer: string;
  control?: string;
  epoch: number;
  writers: readonly string[];
  sealed?: { position: number; commitment: string };
}
function object(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('ordering: malformed control payload');
  return x as Record<string, unknown>;
}
export function initialOrdering(genesis: EventBody): OrderingState {
  const s = object(object(genesis.payload).sequencing);
  if (s.profile !== FIXED_WRITER_PROFILE && s.profile !== HANDOVER_PROFILE) throw new Error('Journal: unsupported profile');
  publicKeyOf(s.writer as string);
  if (s.profile === HANDOVER_PROFILE) publicKeyOf(s.control as string);
  else if (s.control !== undefined) throw new Error('ordering: v1 cannot install control authority');
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
  try {
    const p = object(event.payload);
    const fields = event.kind === SEAL ? ['epoch', 'predecessor'] : ['epoch', 'predecessor', 'writer'];
    if (Object.keys(p).sort().join(',') !== fields.sort().join(',')) throw new Error();
    if (p.predecessor !== head.header.commitment) return { refused: true, reason: 'wrong_control_predecessor' };
    if (event.kind === SEAL) {
      if (p.epoch !== state.epoch) return { refused: true, reason: 'wrong_ordering_epoch' };
      if (event.actor !== state.control) return { refused: true, reason: 'wrong_seal_authority' };
    } else {
      if (!state.sealed || state.sealed.position !== head.position || state.sealed.commitment !== head.header.commitment) return { refused: true, reason: 'assignment_without_seal' };
      if (p.epoch !== state.epoch + 1) return { refused: true, reason: 'wrong_ordering_epoch' };
      if (event.actor !== state.control) return { refused: true, reason: 'wrong_control_authority' };
      publicKeyOf(p.writer as string);
      if (state.writers.includes(p.writer as string)) return { refused: true, reason: 'writer_already_used' };
    }
    return 'control';
  } catch { return { refused: true, reason: 'malformed_control' }; }
}
/** Advance only after the authenticated entry passed orderingAdmission. */
export function advanceOrdering(state: OrderingState, entry: Entry): OrderingState {
  if (state.profile !== HANDOVER_PROFILE) return state;
  if (entry.event.kind === SEAL) return { ...state, sealed: { position: entry.position, commitment: entry.header.commitment } };
  if (entry.event.kind === ASSIGN) {
    const p = entry.event.payload as unknown as { writer: string; epoch: number };
    const { sealed: _sealed, ...prior } = state;
    return { ...prior, writer: p.writer, epoch: p.epoch, writers: [...prior.writers, p.writer] };
  }
  return state;
}
